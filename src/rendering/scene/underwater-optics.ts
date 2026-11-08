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
  /** World-space UV scale (UV per metre) of the two scrolling caustic texture layers. */
  causticTextureScaleA: number
  causticTextureScaleB: number
  /** Maximum additive caustic brightness added to direct diffuse light (0..1). */
  causticMaxAdd: number
  surfaceRippleAmplitudeM: number
  maxSuspendedParticles: number
  /** Depth-graded mote split (AQ-43 as amended 2026-11-08): foreground band
   * (z -1.5..+2.8, the fish volume) is faintest; background band
   * (z -4.6..-1.5, behind the fish volume) carries the density. The two
   * bands sum to maxSuspendedParticles. */
  foregroundSuspendedParticles: number
  backgroundSuspendedParticles: number
  /** Bubble budget (AQ-43 as amended 2026-11-08): two sparse streams of at
   * most 16 bubbles each, 32 total. */
  maxBubbles: number
  bubbleRiseSpeedMinMPerSec: number
  bubbleRiseSpeedMaxMPerSec: number
  bubbleWobbleAmplitudeM: number
  /** Bubble spawn height, just above the sand bed (y = -2.8). */
  bubbleEmitterBaseY: number
  /** Bubbles recycle to their emitter above this height, below the water
   * surface plane (y = 2.66). */
  bubbleRecycleTopY: number
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
  causticTextureScaleA: 0.35,
  causticTextureScaleB: 0.55,
  causticMaxAdd: 0.35,
  surfaceRippleAmplitudeM: 0.032,
  // AQ-43 as amended 2026-11-08 (Ryan-approved): 48 depth-graded motes
  // (16 faint foreground + 32 background) and two sparse bubble streams
  // of at most 16 bubbles each (32 total).
  maxSuspendedParticles: 48,
  foregroundSuspendedParticles: 16,
  backgroundSuspendedParticles: 32,
  maxBubbles: 32,
  bubbleRiseSpeedMinMPerSec: 0.25,
  bubbleRiseSpeedMaxMPerSec: 0.45,
  bubbleWobbleAmplitudeM: 0.05,
  bubbleEmitterBaseY: -2.5,
  bubbleRecycleTopY: 2.5,
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
 * Shared caustic surface mask: caustics only fall on upward-facing surfaces
 * and fade with depth, from the top of the tank (+2.8) down to the sand
 * (-2.8). Used by both the scalar light modulation below and the spatial
 * caustic texture pattern (`evaluateCausticPatternUV` / `caustics.ts`), so
 * the two channels can never disagree about where caustics may appear.
 */
export function evaluateCausticSurfaceMask(
  position: Readonly<{ x: number; y: number; z: number }>,
  normalY: number,
): number {
  const upwardFactor = clamp(normalY, 0, 1)
  if (upwardFactor <= 0) return 0
  // Depth attenuation of surface caustics from top of tank (+2.8) down to sand (-2.8)
  const depthFromTop = clamp((2.8 - position.y) / 5.6, 0, 1)
  const depthEnvelope = 1 - 0.35 * depthFromTop
  return upwardFactor * depthEnvelope
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
  const surfaceMask = evaluateCausticSurfaceMask(position, normalY)
  if (surfaceMask <= 0) return 0

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

  return surfaceMask * (1 + cfg.causticModulationAmplitude * waveInterference)
}

/**
 * Evaluates the two scrolled world-space UV pairs that sample the caustic
 * texture in `caustics.ts` (`AQ-14.2` AC #2). The layers scroll in opposite
 * directions at the existing optics frequencies (0.22 Hz and 0.37 Hz); the
 * 0.10 / 0.06 and 0.08 / 0.05 factors are the UV drift per cycle, so the
 * pattern moves slowly rather than panning across the tank. Freezes at the
 * static t=0 UVs when `paused` or `reducedMotion` is active, exactly like
 * `evaluateCausticIntensity`. The GLSL in `caustics.ts` mirrors these
 * constants; keep the two in sync.
 */
export function evaluateCausticPatternUV(
  worldX: number,
  worldZ: number,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
    config?: Partial<AquariumOpticsConfig>
  },
): { a: { u: number; v: number }; b: { u: number; v: number } } {
  const cfg = { ...DEFAULT_AQUARIUM_OPTICS_CONFIG, ...options?.config }
  const effectiveTime =
    options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)
      ? 0
      : timeSeconds % 3600
  return {
    a: {
      u: worldX * cfg.causticTextureScaleA + effectiveTime * cfg.causticPrimaryHz * 0.1,
      v: worldZ * cfg.causticTextureScaleA - effectiveTime * cfg.causticPrimaryHz * 0.06,
    },
    b: {
      u: worldX * cfg.causticTextureScaleB - effectiveTime * cfg.causticSecondaryHz * 0.08,
      v: worldZ * cfg.causticTextureScaleB + effectiveTime * cfg.causticSecondaryHz * 0.05,
    },
  }
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
    /** Depth band the mote's base depth is drawn from (AQ-43 as amended:
     * foreground z -1.5..+2.8, background z -4.6..-1.5). Without it the
     * mote is drawn from the full bounds, as before. */
    zBand?: Readonly<{ min: number; max: number }>
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
  const baseZ = options?.zBand
    ? options.zBand.min + uZ * (options.zBand.max - options.zBand.min)
    : bounds.min.z + 0.08 * spanZ + uZ * 0.84 * spanZ

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
 * Evaluates one bubble in a sparse, emitter-anchored stream (`AQ-43` as
 * amended 2026-11-08): rises from its emitter at a deterministic,
 * size-hashed speed (larger bubbles rise faster), wobbles sinusoidally in
 * X/Z, and recycles to the emitter once it passes `bubbleRecycleTopY`
 * (below the water surface plane at y = 2.66). Freezes at the static
 * emitter position when `paused` or `reducedMotion` is active; X/Z never
 * leave the water column bounds and Y never leaves [emitter.y,
 * recycleTopY]. Per-bubble size growth with height is
 * not modelled: `THREE.PointsMaterial` has a single size, and a custom
 * shader for per-point size was out of scope for this restrained design;
 * the size/speed hash correlation (faster bubbles are the larger ones)
 * carries the size cue instead.
 */
export function evaluateBubblePosition(
  seedIndex: number,
  emitter: Readonly<{ x: number; y: number; z: number }>,
  bounds: Readonly<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }>,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
    config?: Partial<AquariumOpticsConfig>
  },
): { x: number; y: number; z: number } {
  const cfg = { ...DEFAULT_AQUARIUM_OPTICS_CONFIG, ...options?.config }
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
    return x - Math.floor(x)
  }
  const sizeHash = hash(seedIndex * 3 + 1)
  const phase = hash(seedIndex * 3 + 2) * TWO_PI
  const cycleOffset = hash(seedIndex * 3 + 3)
  const wobble = cfg.bubbleWobbleAmplitudeM

  // Frozen bubbles rest at the emitter with their t=0 wobble offset, so
  // each bubble keeps a distinct static position instead of stacking.
  // Note y is clamped to [emitter.y, recycleTopY], not to bounds: the
  // emitter sits at y = -2.5, just above the sand bed (-2.8) but below
  // the fish-navigation bounds' min y (-2.25); clamping to bounds would
  // lift every bubble off its emitter.
  if (options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)) {
    return {
      x: clamp(emitter.x + wobble * Math.sin(phase), bounds.min.x, bounds.max.x),
      y: emitter.y,
      z: clamp(emitter.z + wobble * Math.cos(phase), bounds.min.z, bounds.max.z),
    }
  }

  const riseSpeed =
    cfg.bubbleRiseSpeedMinMPerSec +
    sizeHash * (cfg.bubbleRiseSpeedMaxMPerSec - cfg.bubbleRiseSpeedMinMPerSec)
  const span = cfg.bubbleRecycleTopY - emitter.y
  const t = timeSeconds % 3600
  const progress = (cycleOffset + (t * riseSpeed) / span) % 1
  const wobblePhase = t * TWO_PI * 0.6 + phase
  return {
    x: clamp(emitter.x + wobble * Math.sin(wobblePhase), bounds.min.x, bounds.max.x),
    y: clamp(emitter.y + progress * span, emitter.y, cfg.bubbleRecycleTopY),
    z: clamp(emitter.z + wobble * Math.cos(wobblePhase), bounds.min.z, bounds.max.z),
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
