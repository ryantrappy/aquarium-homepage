export const LOOKDEV_PRESETS = [
  'full-scene',
  'fish-macro',
  'coral-macro',
  'rock-sand-contact',
] as const

export type LookDevPreset = typeof LOOKDEV_PRESETS[number]
export type LookDevConfig = Readonly<{
  enabled: true
  seed: number
  timeSeconds: number
  preset: LookDevPreset
  subjectId?: string
  labelsVisible: boolean
}>

export type LookDevPercentiles = Readonly<{
  sampleCount: number
  p50Ms: number
  p95Ms: number
}>

/** Keep browser presentation cadence, CPU submission time, and frozen draw cost distinct. */
export type LookDevFrameTimeStats = Readonly<{
  rafInterval: LookDevPercentiles
  cpuRenderCall: LookDevPercentiles
  frozenPoseRenderCall: LookDevPercentiles
}>

export type LookDevRendererStats = Readonly<{
  render: Readonly<{ calls: number; triangles: number; points: number; lines: number }>
  memory: Readonly<{ geometries: number; textures: number }>
}>

export type LookDevAssetByteStats = Readonly<{
  assetResourceCount: number
  encodedAssetBytes: number
  transferBytes: number
  encodedBytesUnavailableCount: number
  transferBytesUnavailableCount: number
  encodedZeroByteCount: number
  transferZeroByteCount: number
}>

const PRESET_SET: ReadonlySet<string> = new Set(LOOKDEV_PRESETS)
const DEFAULT_SEED = 0x5eed
const MAX_LOOKDEV_TIME_SECONDS = 3600
const ASSET_SUFFIXES = ['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.ktx2', '.hdr', '.exr']

/**
 * Parse the opt-in query only in a development build. Invalid opted-in
 * configuration is inert instead of silently producing a different capture.
 */
export function resolveLookDevConfig(search: string, isDevelopment: boolean): LookDevConfig | undefined {
  if (!isDevelopment) return undefined
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (query.get('lookdev') !== '1') return undefined

  const seedText = query.get('seed')
  if (seedText !== null && seedText.trim() === '') return undefined
  const seed = seedText === null ? DEFAULT_SEED : Number(seedText)
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) return undefined

  const timeText = query.get('time')
  if (timeText !== null && timeText.trim() === '') return undefined
  const timeSeconds = timeText === null ? 0 : Number(timeText)
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0 || timeSeconds > MAX_LOOKDEV_TIME_SECONDS) return undefined

  const presetText = query.get('preset') ?? 'full-scene'
  if (!PRESET_SET.has(presetText)) return undefined
  const labels = query.get('labels') ?? 'on'
  if (labels !== 'on' && labels !== 'off') return undefined

  const subjectId = query.get('subject') ?? undefined
  if (subjectId !== undefined && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(subjectId)) return undefined

  return {
    enabled: true,
    seed,
    timeSeconds,
    preset: presetText as LookDevPreset,
    ...(subjectId === undefined ? {} : { subjectId }),
    labelsVisible: labels === 'on',
  }
}

function validMeasurements(samples: readonly number[]): number[] {
  return samples.filter(value => Number.isFinite(value) && value >= 0).slice().sort((a, b) => a - b)
}

/** Linear-interpolated percentile of finite, nonnegative millisecond samples. */
export function percentileMs(samples: readonly number[], quantile: number): number | undefined {
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) return undefined
  const sorted = validMeasurements(samples)
  if (sorted.length === 0) return undefined
  const position = (sorted.length - 1) * quantile
  const lower = Math.floor(position), upper = Math.ceil(position)
  const fraction = position - lower
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction
}

export function summarizeLookDevTiming(samples: readonly number[]): LookDevPercentiles | undefined {
  const valid = validMeasurements(samples)
  if (valid.length === 0) return undefined
  return {
    sampleCount: valid.length,
    p50Ms: percentileMs(valid, 0.5)!,
    p95Ms: percentileMs(valid, 0.95)!,
  }
}

export type LookDevResourceTiming = Readonly<{
  name: string
  encodedBodySize: number
  transferSize: number
}>

function isLookDevAssetResource(name: string): boolean {
  try {
    const pathname = new URL(name, 'http://lookdev.invalid').pathname.toLowerCase()
    return ASSET_SUFFIXES.some(suffix => pathname.endsWith(suffix))
  } catch {
    return false
  }
}

/**
 * Summarize only the supplied suffix-matching Resource Timing response entries.
 * Repeated URLs count as repeated responses, not unique assets, and this helper
 * cannot establish that the supplied list contains every scene download. Encoded
 * body bytes are retained for cached resources; zero sizes may also reflect
 * timing restrictions, so they are reported separately from invalid/missing sizes.
 */
export function summarizeLookDevAssetBytes(entries: readonly LookDevResourceTiming[]): LookDevAssetByteStats {
  const assets = entries.filter(entry => isLookDevAssetResource(entry.name))
  let encodedAssetBytes = 0, transferBytes = 0
  let encodedBytesUnavailableCount = 0, transferBytesUnavailableCount = 0
  let encodedZeroByteCount = 0, transferZeroByteCount = 0

  for (const entry of assets) {
    if (Number.isFinite(entry.encodedBodySize) && entry.encodedBodySize >= 0) {
      encodedAssetBytes += entry.encodedBodySize
      if (entry.encodedBodySize === 0) encodedZeroByteCount++
    } else encodedBytesUnavailableCount++

    if (Number.isFinite(entry.transferSize) && entry.transferSize >= 0) {
      transferBytes += entry.transferSize
      if (entry.transferSize === 0) transferZeroByteCount++
    } else transferBytesUnavailableCount++
  }

  return {
    assetResourceCount: assets.length,
    encodedAssetBytes,
    transferBytes,
    encodedBytesUnavailableCount,
    transferBytesUnavailableCount,
    encodedZeroByteCount,
    transferZeroByteCount,
  }
}
