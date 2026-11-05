import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

const sourceIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const decimalCounterPattern = /^\d+$/
const maxCounterValue = (1n << 64n) - 1n

export type NetworkTrafficSourceConfig = {
  id: string
  label: string
  statsRootPath: string
}

export type NetworkTrafficSource = Pick<NetworkTrafficSourceConfig, 'id' | 'label'>

export type NetworkTrafficReading =
  | {
      status: 'fresh'
      sourceId: string
      label: string
      ingressBytesPerSecond: number
      egressBytesPerSecond: number
      unit: 'B/s'
      observedAt: string
      ageMs: number
    }
  | {
      status: 'stale'
      sourceId: string
      label: string
      ingressBytesPerSecond: number
      egressBytesPerSecond: number
      unit: 'B/s'
      observedAt: string
      ageMs: number | null
      message: string
    }
  | {
      status: 'unavailable'
      sourceId: string
      label?: string
      unit: 'B/s'
      message: string
    }

type FreshReading = Extract<NetworkTrafficReading, { status: 'fresh' }>

type NetworkTrafficStoreOptions = {
  sources: readonly NetworkTrafficSourceConfig[]
  elapsedNow?: () => number
  wallNow?: () => number
  staleAfterMs?: number
  minimumSampleIntervalMs?: number
}

type CounterSample = {
  rxBytes: bigint
  txBytes: bigint
}

type Baseline = CounterSample & {
  elapsedAt: number
}

type LastGoodReading = {
  reading: FreshReading
  sampledElapsedAt: number
}

type CachedResponse = {
  cachedAt: number
  reading: NetworkTrafficReading
}

export function createNetworkTrafficStore({
  sources,
  elapsedNow = () => performance.now(),
  wallNow = Date.now,
  // Leave 30 seconds of scheduling/wakeup jitter beyond a one-minute poll interval.
  staleAfterMs = 90_000,
  minimumSampleIntervalMs = Math.min(250, staleAfterMs / 2),
}: NetworkTrafficStoreOptions) {
  if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) {
    throw new Error('staleAfterMs must be a positive finite number')
  }
  if (
    !Number.isFinite(minimumSampleIntervalMs) ||
    minimumSampleIntervalMs <= 0 ||
    minimumSampleIntervalMs > staleAfterMs / 2
  ) {
    throw new Error('minimumSampleIntervalMs must be positive and no greater than half staleAfterMs')
  }

  const sourceById = new Map<string, NetworkTrafficSourceConfig>()
  for (const candidate of sources) {
    const source = { id: candidate.id, label: candidate.label, statsRootPath: candidate.statsRootPath }
    if (!sourceIdPattern.test(source.id) || source.label.trim() === '' || !isAbsolute(source.statsRootPath)) {
      throw new Error('Each network traffic source needs a stable ID, label, and absolute statistics path')
    }
    if (sourceById.has(source.id)) throw new Error(`Duplicate network traffic source ID: ${source.id}`)
    sourceById.set(source.id, source)
  }

  const baselines = new Map<string, Baseline>()
  const lastGood = new Map<string, LastGoodReading>()
  const cachedResponses = new Map<string, CachedResponse>()
  const inFlight = new Map<string, Promise<NetworkTrafficReading>>()

  function cloneReading(reading: NetworkTrafficReading): NetworkTrafficReading {
    return { ...reading }
  }

  async function readCounter(path: string): Promise<bigint> {
    const value = (await readFile(path, 'utf8')).trim()
    if (!decimalCounterPattern.test(value)) throw new Error('Invalid byte counter')
    const counter = BigInt(value)
    if (counter > maxCounterValue) throw new Error('Byte counter is outside the supported range')
    return counter
  }

  async function readCounters(statsRootPath: string): Promise<CounterSample> {
    const [rxBytes, txBytes] = await Promise.all([
      readCounter(join(statsRootPath, 'rx_bytes')),
      readCounter(join(statsRootPath, 'tx_bytes')),
    ])
    return { rxBytes, txBytes }
  }

  function unavailable(sourceId: string, source: NetworkTrafficSourceConfig | undefined, message: string): NetworkTrafficReading {
    return {
      status: 'unavailable',
      sourceId,
      ...(source ? { label: source.label } : {}),
      unit: 'B/s',
      message,
    }
  }

  function elapsedAge(lastSampleAt: number, now: number | null): number | null {
    if (now === null || !Number.isFinite(now) || now < lastSampleAt) return null
    const age = now - lastSampleAt
    return Number.isFinite(age) ? age : null
  }

  function staleFromLastGood(last: LastGoodReading, ageAt: number | null, message: string): NetworkTrafficReading {
    const ageMs = elapsedAge(last.sampledElapsedAt, ageAt)
    return {
      status: 'stale',
      sourceId: last.reading.sourceId,
      label: last.reading.label,
      ingressBytesPerSecond: last.reading.ingressBytesPerSecond,
      egressBytesPerSecond: last.reading.egressBytesPerSecond,
      unit: 'B/s',
      observedAt: last.reading.observedAt,
      ageMs,
      message,
    }
  }

  function staleOrUnavailable(
    sourceId: string,
    source: NetworkTrafficSourceConfig,
    message: string,
    ageAt: number | null = null,
  ): NetworkTrafficReading {
    const previous = lastGood.get(sourceId)
    return previous ? staleFromLastGood(previous, ageAt, message) : unavailable(sourceId, source, message)
  }

  function readCache(sourceId: string, elapsedAt: number): NetworkTrafficReading | undefined {
    const cached = cachedResponses.get(sourceId)
    if (!cached) return undefined
    const cacheAge = elapsedAt - cached.cachedAt
    if (!Number.isFinite(cacheAge) || cacheAge < 0 || cacheAge >= minimumSampleIntervalMs) return undefined

    const last = lastGood.get(sourceId)
    if (!last) return cloneReading(cached.reading)
    const ageMs = elapsedAge(last.sampledElapsedAt, elapsedAt)
    if (ageMs === null || ageMs >= staleAfterMs) {
      return staleFromLastGood(last, elapsedAt, 'The last successful network traffic sample is stale.')
    }
    if (cached.reading.status === 'stale') {
      return staleFromLastGood(last, elapsedAt, cached.reading.message)
    }
    return {
      ...last.reading,
      ageMs,
    }
  }

  async function sample(
    sourceId: string,
    source: NetworkTrafficSourceConfig,
    elapsedAt: number,
  ): Promise<NetworkTrafficReading> {
    let wallAt: number
    try {
      wallAt = wallNow()
    } catch {
      return staleOrUnavailable(sourceId, source, 'The traffic sample clock is unavailable.', elapsedAt)
    }
    if (!Number.isFinite(wallAt) || Math.abs(wallAt) > 8.64e15) {
      return staleOrUnavailable(sourceId, source, 'The traffic sample clock is invalid.', elapsedAt)
    }

    let counters: CounterSample
    try {
      counters = await readCounters(source.statsRootPath)
    } catch {
      return staleOrUnavailable(sourceId, source, 'The selected network traffic source could not be read.', elapsedAt)
    }

    const baseline = baselines.get(sourceId)
    if (!baseline) {
      baselines.set(sourceId, { ...counters, elapsedAt })
      return unavailable(sourceId, source, 'Waiting for a second counter sample to calculate traffic rates.')
    }

    const elapsedMs = elapsedAt - baseline.elapsedAt
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
      baselines.set(sourceId, { ...counters, elapsedAt })
      return staleOrUnavailable(sourceId, source, 'The traffic sample interval is invalid; a new baseline was recorded.', elapsedAt)
    }
    if (elapsedMs > staleAfterMs) {
      baselines.set(sourceId, { ...counters, elapsedAt })
      return staleOrUnavailable(sourceId, source, 'The traffic sample interval was too long; a new baseline was recorded.', elapsedAt)
    }
    if (counters.rxBytes < baseline.rxBytes || counters.txBytes < baseline.txBytes) {
      baselines.set(sourceId, { ...counters, elapsedAt })
      return staleOrUnavailable(sourceId, source, 'A network byte counter reset; a new baseline was recorded.', elapsedAt)
    }

    const elapsedSeconds = elapsedMs / 1000
    const ingressBytesPerSecond = Number(counters.rxBytes - baseline.rxBytes) / elapsedSeconds
    const egressBytesPerSecond = Number(counters.txBytes - baseline.txBytes) / elapsedSeconds
    if (!Number.isFinite(ingressBytesPerSecond) || !Number.isFinite(egressBytesPerSecond)) {
      baselines.set(sourceId, { ...counters, elapsedAt })
      return staleOrUnavailable(sourceId, source, 'The traffic rate is outside the supported range; a new baseline was recorded.', elapsedAt)
    }

    baselines.set(sourceId, { ...counters, elapsedAt })
    const reading: FreshReading = {
      status: 'fresh',
      sourceId,
      label: source.label,
      ingressBytesPerSecond,
      egressBytesPerSecond,
      unit: 'B/s',
      observedAt: new Date(wallAt).toISOString(),
      ageMs: 0,
    }
    lastGood.set(sourceId, { reading, sampledElapsedAt: elapsedAt })
    return reading
  }

  return {
    getSources(): NetworkTrafficSource[] {
      return [...sourceById.values()].map(({ id, label }) => ({ id, label }))
    },
    read(sourceId: string): Promise<NetworkTrafficReading> {
      const source = sourceById.get(sourceId)
      if (!source) {
        return Promise.resolve(unavailable('unsupported', undefined, 'The selected network traffic source is unavailable.'))
      }

      const pending = inFlight.get(sourceId)
      if (pending) return pending.then(cloneReading)

      let elapsedAt: number
      try {
        elapsedAt = elapsedNow()
      } catch {
        return Promise.resolve(staleOrUnavailable(sourceId, source, 'The traffic sample clock is unavailable.'))
      }
      if (!Number.isFinite(elapsedAt)) {
        return Promise.resolve(staleOrUnavailable(sourceId, source, 'The traffic sample clock is invalid.'))
      }

      const cached = readCache(sourceId, elapsedAt)
      if (cached) return Promise.resolve(cached)

      const current = sample(sourceId, source, elapsedAt)
        .then((reading) => {
          cachedResponses.set(sourceId, { cachedAt: elapsedAt, reading: cloneReading(reading) })
          return reading
        })
        .finally(() => inFlight.delete(sourceId))
      inFlight.set(sourceId, current)
      return current.then(cloneReading)
    },
  }
}
