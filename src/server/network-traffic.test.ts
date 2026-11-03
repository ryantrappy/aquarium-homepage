import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createNetworkTrafficStore, type NetworkTrafficSourceConfig } from './network-traffic'

const roots: string[] = []

async function makeSource(id = 'host-enp4s0', rxBytes = '1000', txBytes = '2000') {
  const statsRootPath = await mkdtemp(join(tmpdir(), 'reef-network-traffic-'))
  roots.push(statsRootPath)
  await writeFile(join(statsRootPath, 'rx_bytes'), `${rxBytes}\n`)
  await writeFile(join(statsRootPath, 'tx_bytes'), `${txBytes}\n`)
  const source: NetworkTrafficSourceConfig = { id, label: 'Host NIC (enp4s0)', statsRootPath }
  return { source, statsRootPath }
}

async function setCounters(statsRootPath: string, rxBytes: string, txBytes: string) {
  await Promise.all([
    writeFile(join(statsRootPath, 'rx_bytes'), `${rxBytes}\n`),
    writeFile(join(statsRootPath, 'tx_bytes'), `${txBytes}\n`),
  ])
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((rootPath) => rm(rootPath, { recursive: true, force: true })))
})

describe('network traffic source', () => {
  it('exposes trusted source labels without paths and rejects unknown IDs', async () => {
    const { source } = await makeSource()
    const store = createNetworkTrafficStore({ sources: [source] })

    expect(store.getSources()).toEqual([{ id: source.id, label: source.label }])
    expect(await store.read('../../etc/passwd')).toMatchObject({
      status: 'unavailable',
      sourceId: 'unsupported',
      unit: 'B/s',
    })
  })

  it('requires unique stable IDs and absolute trusted statistics roots', async () => {
    const { source } = await makeSource()
    expect(() => createNetworkTrafficStore({ sources: [{ ...source, statsRootPath: 'relative/path' }] })).toThrow(/absolute statistics path/)
    expect(() => createNetworkTrafficStore({ sources: [source, source] })).toThrow(/Duplicate network traffic source ID/)
    expect(() => createNetworkTrafficStore({ sources: [source], staleAfterMs: 1_000, minimumSampleIntervalMs: 501 })).toThrow(/half staleAfterMs/)
  })

  it('waits for two samples, then calculates separate RX and TX rates', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 1_000
    let wall = 1_800_000_000_000
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed, wallNow: () => wall })

    expect(await store.read(source.id)).toMatchObject({
      status: 'unavailable',
      message: 'Waiting for a second counter sample to calculate traffic rates.',
    })

    await setCounters(statsRootPath, '2000', '2500')
    elapsed += 2_000
    wall += 2_000
    expect(await store.read(source.id)).toMatchObject({
      status: 'fresh',
      ingressBytesPerSecond: 500,
      egressBytesPerSecond: 250,
      unit: 'B/s',
      observedAt: new Date(wall).toISOString(),
      ageMs: 0,
    })
  })

  it('preserves the warm-up baseline and returns a cached rate with truthful age', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })

    expect((await store.read(source.id)).status).toBe('unavailable')
    await setCounters(statsRootPath, '1100', '2100')
    elapsed = 100
    expect(await store.read(source.id)).toMatchObject({ status: 'unavailable', message: /Waiting for a second counter sample/ })

    await setCounters(statsRootPath, '1200', '2200')
    elapsed = 250
    const fresh = await store.read(source.id)
    expect(fresh).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 800, egressBytesPerSecond: 800, ageMs: 0 })

    await setCounters(statsRootPath, '1300', '2300')
    elapsed = 400
    expect(await store.read(source.id)).toMatchObject({
      status: 'fresh',
      ingressBytesPerSecond: 800,
      egressBytesPerSecond: 800,
      ageMs: 150,
    })
  })

  it('subtracts large integer counters exactly before converting the rate to a number', async () => {
    const start = 9_007_199_254_740_993_000n
    const { source, statsRootPath } = await makeSource('host-enp4s0', `${start}`, `${start}`)
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    await store.read(source.id)

    await setCounters(statsRootPath, `${start + 128n}`, `${start + 64n}`)
    elapsed = 1_000
    expect(await store.read(source.id)).toMatchObject({
      status: 'fresh',
      ingressBytesPerSecond: 128,
      egressBytesPerSecond: 64,
    })
  })

  it('reports a reset as stale and re-establishes the baseline', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    await store.read(source.id)

    await setCounters(statsRootPath, '1100', '2100')
    elapsed = 1_000
    const fresh = await store.read(source.id)
    expect(fresh).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 100, egressBytesPerSecond: 100 })

    await setCounters(statsRootPath, '12', '2200')
    elapsed = 2_000
    expect(await store.read(source.id)).toMatchObject({
      status: 'stale',
      ingressBytesPerSecond: 100,
      egressBytesPerSecond: 100,
      ageMs: 1_000,
      message: 'A network byte counter reset; a new baseline was recorded.',
    })

    await setCounters(statsRootPath, '32', '2220')
    elapsed = 3_000
    expect(await store.read(source.id)).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 20, egressBytesPerSecond: 20 })
  })

  it('keeps the last successful reading stale when a counter becomes unreadable', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    await store.read(source.id)

    await setCounters(statsRootPath, '1300', '2400')
    elapsed = 1_000
    await store.read(source.id)
    elapsed = 3_500
    await rm(join(statsRootPath, 'tx_bytes'))

    expect(await store.read(source.id)).toMatchObject({
      status: 'stale',
      ingressBytesPerSecond: 300,
      egressBytesPerSecond: 400,
      ageMs: 2_500,
      message: 'The selected network traffic source could not be read.',
    })

    elapsed = 3_600
    expect(await store.read(source.id)).toMatchObject({
      status: 'stale',
      ingressBytesPerSecond: 300,
      egressBytesPerSecond: 400,
      ageMs: 2_600,
      message: 'The selected network traffic source could not be read.',
    })
  })

  it('keeps cached stale age correct when the last successful sample is already past the stale window', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed, staleAfterMs: 2_000 })
    await store.read(source.id)

    await setCounters(statsRootPath, '1100', '2100')
    elapsed = 1_000
    await store.read(source.id)
    await rm(join(statsRootPath, 'tx_bytes'))

    elapsed = 4_000
    expect(await store.read(source.id)).toMatchObject({ status: 'stale', ageMs: 3_000 })
    elapsed = 4_100
    expect(await store.read(source.id)).toMatchObject({ status: 'stale', ageMs: 3_100 })
  })

  it('rebases after an overlong interval and never publishes a stale-window rate as fresh', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed, staleAfterMs: 2_000 })
    await store.read(source.id)

    await setCounters(statsRootPath, '1200', '2300')
    elapsed = 1_000
    await store.read(source.id)
    await setCounters(statsRootPath, '8200', '9300')
    elapsed = 5_000
    expect(await store.read(source.id)).toMatchObject({
      status: 'stale',
      ingressBytesPerSecond: 200,
      egressBytesPerSecond: 300,
      ageMs: 4_000,
    })

    await setCounters(statsRootPath, '8300', '9500')
    elapsed = 6_000
    expect(await store.read(source.id)).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 100, egressBytesPerSecond: 200 })
  })

  it('rejects malformed counters and nonpositive elapsed intervals without fabricating a rate', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 10
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed, minimumSampleIntervalMs: 1 })
    await store.read(source.id)

    elapsed = 9
    expect(await store.read(source.id)).toMatchObject({ status: 'unavailable', message: /interval is invalid/ })
    await writeFile(join(statsRootPath, 'rx_bytes'), 'not-a-counter\n')
    elapsed = 20
    expect(await store.read(source.id)).toMatchObject({ status: 'unavailable', message: /could not be read/ })
    expect((await store.read(source.id)) as object).not.toHaveProperty('ingressBytesPerSecond')

    await writeFile(join(statsRootPath, 'rx_bytes'), '18446744073709551616\n')
    elapsed = 30
    expect(await store.read(source.id)).toMatchObject({ status: 'unavailable', message: /could not be read/ })
  })

  it('does not compute a rate from a nonfinite monotonic clock sample', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    await store.read(source.id)

    await setCounters(statsRootPath, '1100', '2100')
    elapsed = Number.NaN
    expect(await store.read(source.id)).toMatchObject({ status: 'unavailable', message: /clock is invalid/ })

    elapsed = 1_000
    expect(await store.read(source.id)).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 100, egressBytesPerSecond: 100 })
  })

  it('serializes concurrent reads so the next baseline remains coherent', async () => {
    const { source, statsRootPath } = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    await store.read(source.id)
    await setCounters(statsRootPath, '1100', '2100')
    elapsed = 1_000

    const [first, second] = await Promise.all([store.read(source.id), store.read(source.id)])
    expect(first).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 100, egressBytesPerSecond: 100 })
    expect(second).toEqual(first)

    await setCounters(statsRootPath, '1200', '2200')
    elapsed = 2_000
    expect(await store.read(source.id)).toMatchObject({ status: 'fresh', ingressBytesPerSecond: 100, egressBytesPerSecond: 100 })
  })

  it('defensively copies source configuration, descriptors, and returned readings', async () => {
    const { source, statsRootPath } = await makeSource()
    const sources = [source]
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources, elapsedNow: () => elapsed })

    source.label = 'Mutated label'
    source.statsRootPath = join(statsRootPath, 'missing')
    sources.length = 0
    const descriptors = store.getSources()
    descriptors[0]!.label = 'Mutated descriptor'
    expect(store.getSources()).toEqual([{ id: 'host-enp4s0', label: 'Host NIC (enp4s0)' }])

    expect((await store.read('host-enp4s0')).status).toBe('unavailable')
    await setCounters(statsRootPath, '1100', '2200')
    elapsed = 1_000
    const result = await store.read('host-enp4s0')
    expect(result).toMatchObject({ status: 'fresh', label: 'Host NIC (enp4s0)', ingressBytesPerSecond: 100, egressBytesPerSecond: 200 })
    expect(result).not.toHaveProperty('sampledElapsedAt')
    expect(result).not.toHaveProperty('elapsedAt')

    if (result.status === 'fresh') result.ingressBytesPerSecond = 999_999
    expect(await store.read('host-enp4s0')).toMatchObject({
      status: 'fresh',
      label: 'Host NIC (enp4s0)',
      ingressBytesPerSecond: 100,
      egressBytesPerSecond: 200,
    })
  })
})
