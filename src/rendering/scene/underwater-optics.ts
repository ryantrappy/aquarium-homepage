import * as THREE from 'three'

/**
 * Pure-water absorption coefficients (m^-1) from Pope & Fry (1997) at representative
 * visible wavelengths (Red ~650 nm, Green ~530 nm, Blue ~460 nm), bounded for a
 * home reef aquarium path length (0..3.5 m) so foreground fish stay crisp and
 * un-veiled while background water gains subtle depth separation (AQ-39).
 */
export const POPE_FRY_ABSORPTION_PER_METER = Object.freeze({
  r: 0.43,
  g: 0.055,
  b: 0.015,
})

export type AquariumOpticsConfig = Readonly<{
  backgroundHex: string
  fogNear: number
  fogFar: number
  keyLightIntensity: number
  fillLightIntensity: number
  causticBaseIntensity: number
  causticModulationAmplitude: number
  causticPrimaryHz: number
  causticSecondaryHz: number
  surfaceRippleAmplitudeM: number
  maxSuspendedParticles: number
}>

/**
 * Canonical scene values (AQ-39): these were aligned with the values
 * `createAquarium` in aquarium.ts actually uses, so the optics config is the
 * single source of truth for background, fog, light intensities, and ripple
 * amplitude instead of a second, divergent set of literals. The previous
 * defaults ('#155c73', fog 15-32, key 3.0, fill 1.0, ripple 0.008 m) matched
 * the stale AQ-39 plan's line references, not the scene.
 */
export const DEFAULT_AQUARIUM_OPTICS_CONFIG: AquariumOpticsConfig = Object.freeze({
  backgroundHex: '#183654',
  fogNear: 18,
  fogFar: 36,
  // AQ-71: re-tuned down to compensate for the added PMREM/IBL ambient
  // light. aquarium.ts reads these via the optics config, so the key/fill
  // constructors and the caustic-controller bases all follow.
  keyLightIntensity: 2.1,
  fillLightIntensity: 0.95,
  causticBaseIntensity: 2.45,
  causticModulationAmplitude: 0.18,
  causticPrimaryHz: 0.22,
  causticSecondaryHz: 0.37,
  surfaceRippleAmplitudeM: 0.032,
  maxSuspendedParticles: 24,
})

const TWO_PI = Math.PI * 2

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Evaluates aquarium-scale Beer-Lambert spectral transmittance `T(d) = exp(-alpha * d)`
 * clamped to aquarium-safe minimum floor values so foreground and mid-tank fish
 * never suffer from an artificial open-ocean blue veil (`AQ-39` AC #1 & #2).
 */
export function evaluateDepthTransmittance(depthMeters: number): {
  r: number
  g: number
  b: number
} {
  const d = clamp(depthMeters, 0, 3.5)
  const r = Math.max(0.35, Math.exp(-POPE_FRY_ABSORPTION_PER_METER.r * d))
  const g = Math.max(0.78, Math.exp(-POPE_FRY_ABSORPTION_PER_METER.g * d))
  const b = Math.max(0.90, Math.exp(-POPE_FRY_ABSORPTION_PER_METER.b * d))
  return { r, g, b }
}

/**
 * Applies Beer-Lambert depth transmittance to a background colour (`AQ-39`
 * AC #2): returns the colour of `backgroundHex` after travelling
 * `depthMeters` through the water column. At depth 0 the colour is unchanged,
 * so foreground fish are never veiled; at the rear-wall path depth red is
 * attenuated most, giving the fog/background a restrained depth tint.
 * A malformed hex is returned unchanged.
 */
export function evaluateDepthTintedColor(backgroundHex: string, depthMeters: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(backgroundHex.trim())
  if (!match) return backgroundHex
  const t = evaluateDepthTransmittance(depthMeters)
  const n = parseInt(match[1], 16)
  const r = Math.round(((n >> 16) & 0xff) * t.r)
  const g = Math.round(((n >> 8) & 0xff) * t.g)
  const b = Math.round((n & 0xff) * t.b)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/**
 * Evaluates coherent dual-wave caustic light intensity on upward-facing reef/sand
 * surfaces (`AQ-14.2` AC #2 & #5). Freezes at the static t=0 phase when `paused`
 * or `reducedMotion` is active, and never flickers.
 */
export function evaluateCausticIntensity(
  position: Readonly<{ x: number; y: number; z: number }>,
  normalY: number,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
    config?: Partial<AquariumOpticsConfig>
  },
): number {
  const cfg = { ...DEFAULT_AQUARIUM_OPTICS_CONFIG, ...options?.config }
  const upwardFactor = clamp(normalY, 0, 1)
  if (upwardFactor <= 0) return 0

  const effectiveTime =
    options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)
      ? 0
      : timeSeconds % 3600

  const phase1 =
    effectiveTime * TWO_PI * cfg.causticPrimaryHz +
    position.x * 1.85 +
    position.z * 1.45
  const phase2 =
    effectiveTime * TWO_PI * cfg.causticSecondaryHz -
    position.x * 1.35 +
    position.z * 2.05

  const waveInterference = 0.5 * (Math.sin(phase1) + Math.cos(phase2))
  // Depth attenuation of surface caustics from top of tank (+2.8) down to sand (-2.8)
  const depthFromTop = clamp((2.8 - position.y) / 5.6, 0, 1)
  const depthEnvelope = 1 - 0.35 * depthFromTop

  return (
    upwardFactor *
    depthEnvelope *
    (1 + cfg.causticModulationAmplitude * waveInterference)
  )
}

/**
 * Evaluates subtle water-surface ripple vertical displacement (`AQ-14.2` AC #1 & #5).
 * Returns 0 when `paused` or `reducedMotion` is active.
 */
export function evaluateSurfaceRippleOffset(
  x: number,
  z: number,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
    amplitudeM?: number
  },
): number {
  if (options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)) {
    return 0
  }
  const amp = options?.amplitudeM ?? DEFAULT_AQUARIUM_OPTICS_CONFIG.surfaceRippleAmplitudeM
  if (!Number.isFinite(amp) || amp <= 0) return 0

  const t = timeSeconds % 3600
  const waveA = Math.sin(x * 1.4 + t * TWO_PI * 0.24)
  const waveB = Math.cos(z * 1.9 - t * TWO_PI * 0.31 + x * 0.5)
  return amp * (0.6 * waveA + 0.4 * waveB)
}

/**
 * Evaluates a restrained suspended marine-snow / microbubble particle position (`AQ-43`)
 * that drifts gently with water circulation, freezes when `paused` or `reducedMotion`
 * is active, and stays strictly inside the water column bounds.
 */
export function evaluateSuspendedParticlePosition(
  seedIndex: number,
  bounds: Readonly<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }>,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
  },
): { x: number; y: number; z: number } {
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
    return x - Math.floor(x)
  }
  const uX = hash(seedIndex * 3 + 1)
  const uY = hash(seedIndex * 3 + 2)
  const uZ = hash(seedIndex * 3 + 3)

  const spanX = bounds.max.x - bounds.min.x
  const spanY = bounds.max.y - bounds.min.y
  const spanZ = bounds.max.z - bounds.min.z

  const baseX = bounds.min.x + 0.08 * spanX + uX * 0.84 * spanX
  const baseY = bounds.min.y + 0.08 * spanY + uY * 0.84 * spanY
  const baseZ = bounds.min.z + 0.08 * spanZ + uZ * 0.84 * spanZ

  if (options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)) {
    return { x: baseX, y: baseY, z: baseZ }
  }

  const t = timeSeconds % 3600
  const phase = uX * TWO_PI
  const driftX = 0.06 * Math.sin(t * 0.35 + phase)
  const driftY = ((uY + t * 0.012) % 0.84) * spanY + bounds.min.y + 0.08 * spanY - baseY
  const driftZ = 0.04 * Math.cos(t * 0.29 - phase)

  return {
    x: clamp(baseX + driftX, bounds.min.x, bounds.max.x),
    y: clamp(baseY + driftY, bounds.min.y, bounds.max.y),
    z: clamp(baseZ + driftZ, bounds.min.z, bounds.max.z),
  }
}

/**
 * Controller that modulates key and fill directional lights with restrained,
 * physically coherent caustic shimmer while freezing cleanly on pause or reduced-motion.
 */
export function createRestrainedCausticLightController(
  keyLight: THREE.Light,
  fillLight?: THREE.Light,
  config: Partial<AquariumOpticsConfig> = {},
) {
  const cfg = { ...DEFAULT_AQUARIUM_OPTICS_CONFIG, ...config }
  const baseKeyPos = keyLight.position.clone()

  return {
    update(timeSeconds: number, paused = false, reducedMotion = false) {
      if (paused || reducedMotion || !Number.isFinite(timeSeconds)) {
        keyLight.intensity = cfg.keyLightIntensity
        keyLight.position.copy(baseKeyPos)
        if (fillLight) fillLight.intensity = cfg.fillLightIntensity
        return
      }
      const shimmer = evaluateCausticIntensity(
        { x: 0, y: 0, z: 0 },
        1,
        timeSeconds,
        { paused, reducedMotion, config: cfg },
      )
      keyLight.intensity = cfg.keyLightIntensity * shimmer
      const t = timeSeconds % 3600
      keyLight.position.set(
        baseKeyPos.x + 0.12 * Math.sin(t * TWO_PI * cfg.causticPrimaryHz),
        baseKeyPos.y,
        baseKeyPos.z + 0.08 * Math.cos(t * TWO_PI * cfg.causticSecondaryHz),
      )
      if (fillLight) {
        fillLight.intensity =
          cfg.fillLightIntensity * (1 + 0.06 * Math.cos(t * TWO_PI * cfg.causticPrimaryHz))
      }
    },
  }
}
