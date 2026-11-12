import * as THREE from 'three'
import { evaluateSurfaceFocus, evaluateSurfaceHeight } from './surface-waves'

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
  /** Resolved white key intensity (AQ-70.6): equals
   * `fixtureTotalIntensity * fixtureWhiteBalance`. Kept as a field so
   * existing consumers (caustic controller, tests) keep working; the
   * tunable knobs are `fixtureWhiteBalance` / `fixtureTotalIntensity`,
   * and a test asserts the resolved fields equal the derivation. */
  keyLightIntensity: number
  /** Resolved royal-blue actinic fill intensity (AQ-70.6): equals
   * `fixtureTotalIntensity * (1 - fixtureWhiteBalance)`. */
  fillLightIntensity: number
  /**
   * Overhead LED fixture white/blue balance (AQ-70.6 AC #2): fraction of
   * total fixture output that is white (14,000K daylight key); the rest is
   * royal-blue actinic fill. Tunable; the chosen default matches the
   * current scene intensities exactly (2.1 white / 0.95 blue).
   */
  fixtureWhiteBalance: number
  /** Total overhead LED fixture output (AQ-70.6 AC #2): white + blue. */
  fixtureTotalIntensity: number
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
  /** Maximum alpha of the restrained rear depth-haze plane (AQ-86): haze
   * starts behind the fish volume (z < -1.5) and never veils foreground
   * fish. This is not open-ocean fog (forbidden by AQ-39 §1.1). */
  depthHazeMaxAlpha: number
  /** Maximum alpha of the volumetric light-shaft plane (AQ-86): soft
   * additive shafts from the surface, weakening with depth. */
  lightShaftMaxAlpha: number
  /** Height of the water surface plane (AQ-14.2): the y the surface
   * shader, the shaft roots, and the caustic sun-slant projection share. */
  surfaceY: number
  /** Unit direction from the water toward the overhead fixture (the key
   * light at (1.2, 6.8, 4.6), normalised): the sun-slant direction for
   * caustic projection and the shaft slant axis. */
  sunDirection: Readonly<{ x: number; y: number; z: number }>
  /** Gain of the shared wave-field focus term on caustics (AQ-70.6 /
   * AQ-96): the caustic pattern is multiplied by
   * `1 + surfaceFocusGain * focus`, so the sand dapple breathes with
   * the surface instead of scrolling on an independent clock. */
  surfaceFocusGain: number
  /** Ridge smoothstep threshold for the sand caustic layer (AQ-70.12):
   * re-tuned from the 0.22 visual-check workaround back toward the
   * 0.35 default now that the focus term does the work; the +0.35 cap
   * (causticMaxAdd) is untouched. */
  causticSandThreshold: number
  /** Raymarched shaft pass (AQ-98, High tier only): steps per pixel
   * along the view ray at `shaftRenderScale` resolution. */
  shaftRaymarchSteps: number
  /** Peak additive alpha of the raymarched shaft pass (High tier).
   * Higher than the shaft plane's 0.16 cap: the raymarch is
   * depth-occluded light, not a flat overlay, so the same alpha reads
   * weaker — look-dev (2026-11-11) set 0.28 so the columns read as
   * volumetric shafts against the mid-water, not a faint haze. */
  shaftRaymarchAlpha: number
  /** Render scale of the raymarched shaft buffer (0.5 = half resolution;
   * shafts are low-frequency light, so half-res is visually lossless). */
  shaftRenderScale: number
  /** Exponential soft-clamp on the accumulated shaft light
   * (`1 - exp(-accum * shaftSoftClamp)`), so overlapping beams blend
   * instead of spiking. */
  shaftSoftClamp: number
}>

/**
 * Canonical scene values (AQ-39): these were aligned with the values
 * `createAquarium` in aquarium.ts actually uses, so the optics config is the
 * single source of truth for background, fog, light intensities, and ripple
 * amplitude instead of a second, divergent set of literals. The previous
 * defaults ('#155c73', fog 15-32, key 3.0, fill 1.0, ripple 0.008 m) matched
 * the stale AQ-39 plan's line references, not the scene.
 */
/** Default overhead LED fixture white share (AQ-70.6 AC #2): 2.1 / 3.05,
 * so the resolved key/fill intensities are exactly the long-standing
 * scene values (white 2.1, royal-blue actinic 0.95). */
export const DEFAULT_FIXTURE_WHITE_BALANCE = 2.1 / 3.05
/** Default total overhead LED fixture output (AQ-70.6 AC #2). */
export const DEFAULT_FIXTURE_TOTAL_INTENSITY = 3.05

/** Overhead key-light position (aquarium.ts): the sun direction is the
 * normalised vector from the origin toward this position. */
export const KEY_LIGHT_POSITION = Object.freeze({ x: 1.2, y: 6.8, z: 4.6 })
/** Unit sun direction toward the key light: (0.1446, 0.8196, 0.5544). */
export const SUN_DIRECTION: Readonly<{ x: number; y: number; z: number }> = Object.freeze(
  (() => {
    const len = Math.hypot(KEY_LIGHT_POSITION.x, KEY_LIGHT_POSITION.y, KEY_LIGHT_POSITION.z)
    return {
      x: KEY_LIGHT_POSITION.x / len,
      y: KEY_LIGHT_POSITION.y / len,
      z: KEY_LIGHT_POSITION.z / len,
    }
  })(),
)
/** Height of the water surface plane (AQ-14.2). */
export const WATER_SURFACE_Y = 2.66

export const DEFAULT_AQUARIUM_OPTICS_CONFIG: AquariumOpticsConfig = Object.freeze({
  backgroundHex: '#183654',
  fogNear: 18,
  fogFar: 36,
  // AQ-71: re-tuned down to compensate for the added PMREM/IBL ambient
  // light. aquarium.ts reads these via the optics config, so the key/fill
  // constructors and the caustic-controller bases all follow.
  // AQ-70.6: these are the resolved values of fixtureTotalIntensity (3.05)
  // split by fixtureWhiteBalance (2.1/3.05 white, the rest actinic blue).
  keyLightIntensity: 2.1,
  fillLightIntensity: 0.95,
  fixtureWhiteBalance: DEFAULT_FIXTURE_WHITE_BALANCE,
  fixtureTotalIntensity: DEFAULT_FIXTURE_TOTAL_INTENSITY,
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
  // AQ-86: restrained rear depth haze + volumetric shafts. Both stay well
  // below full opacity so the tank keeps crisp deep focus (AQ-14.2 AC #4).
  depthHazeMaxAlpha: 0.22,
  lightShaftMaxAlpha: 0.16,
  // Lighting + water surface (AQ-96 / AQ-98 / AQ-70.6): the surface-driven
  // lighting work adds no assets, so no budget cap moves — these are
  // shader/tier parameters only, governed by the adaptive quality tiers.
  surfaceY: 2.66,
  sunDirection: SUN_DIRECTION,
  surfaceFocusGain: 0.6,
  // Sand caustic threshold restored to 9d0418a's 0.18 in the
  // surface-water pass (PR #43's merge had overwritten it with 0.30);
  // the sand call site passes its own maxAdd/scales alongside this.
  causticSandThreshold: 0.18,
  shaftRaymarchSteps: 14,
  shaftRaymarchAlpha: 0.28,
  shaftRenderScale: 0.5,
  shaftSoftClamp: 1.8,
})

/**
 * Resolves the overhead LED fixture white/blue split (AQ-70.6 AC #2) from
 * the tunable balance and total output: white key = total * balance,
 * royal-blue actinic fill = total * (1 - balance). Non-finite or
 * out-of-range inputs fall back to the defaults, so a bad config can never
 * produce a negative light or a NaN intensity.
 */
export function evaluateFixtureIntensities(
  whiteBalance: number,
  totalIntensity: number,
): { keyLightIntensity: number; fillLightIntensity: number } {
  const balance = Number.isFinite(whiteBalance)
    ? clamp(whiteBalance, 0, 1)
    : DEFAULT_FIXTURE_WHITE_BALANCE
  const total = Number.isFinite(totalIntensity)
    ? Math.max(0, totalIntensity)
    : DEFAULT_FIXTURE_TOTAL_INTENSITY
  return {
    keyLightIntensity: total * balance,
    fillLightIntensity: total * (1 - balance),
  }
}

/**
 * Scales coral fluorescence with the actinic (blue) share of the fixture
 * (AQ-70.6 AC #3): 1.0 at the default white balance, 0 when the fixture is
 * all white, 2.0 (capped) when the blue share is twice the default. The
 * coral shader multiplies its mask-driven glow by this factor, so
 * fluorescence follows the fixture instead of being a fixed constant.
 */
export function evaluateFluorescenceActinicFactor(whiteBalance: number): number {
  const balance = Number.isFinite(whiteBalance)
    ? clamp(whiteBalance, 0, 1)
    : DEFAULT_FIXTURE_WHITE_BALANCE
  const defaultActinicShare = 1 - DEFAULT_FIXTURE_WHITE_BALANCE
  return clamp((1 - balance) / defaultActinicShare, 0, 2)
}

const TWO_PI = Math.PI * 2

/** Rear boundary of the primary fish swimming volume (AQ-43 zBand, AQ-86):
 * depth haze starts behind this plane and never veils foreground fish. */
export const DEPTH_HAZE_START_Z = -1.5
/** Rear wall of the water column; haze reaches full strength here. */
export const DEPTH_HAZE_END_Z = -4.6
/** World-space x centres of the three volumetric light-shaft bands at the surface (AQ-86). */
export const LIGHT_SHAFT_BAND_CENTERS: readonly number[] = Object.freeze([-2.2, 0.2, 2.4])
/** Gaussian half-width of one shaft band, in metres. */
export const LIGHT_SHAFT_BAND_WIDTH_M = 0.42
/** How far a shaft band slants sideways per metre of depth (slanting away from the surface). */
export const LIGHT_SHAFT_SLANT_PER_M = 0.08
/** Slow lateral sway amplitude of a shaft band, in metres. Now the
 * scale applied to the shared wave-field height sampled at the band
 * root (surface-waves.ts): the bands drift with the surface instead of
 * on an independent 0.05 Hz sine. */
export const LIGHT_SHAFT_SWAY_AMPLITUDE_M = 2.5
/** Depth (as a fraction of the 5.6 m water column) over which a shaft
 * band fades out past its per-band reach. */
export const LIGHT_SHAFT_REACH_FADE_M = 0.35

/**
 * Per-band depth reach (fraction of the water column, 0..1) from a
 * deterministic hash of the band centre: most beams stop well above
 * the sand and only the longest reach the bed. The +1.3 hash offset is
 * chosen so the CENTRE band (x = 0.2, over the open centre arch of the
 * aquascape) has the longest reach (0.85) and the left/right bands stop
 * higher (0.56 / 0.79) — the longest shaft belongs over the open arch,
 * not over rock. The GLSL in `aquarium.ts` mirrors this formula
 * exactly; keep the two in sync.
 */
export function lightShaftBandReach(center: number): number {
  const hash = Math.sin((center + 1.3) * 12.9898) * 43758.5453
  const fract = hash - Math.floor(hash)
  return 0.55 + 0.45 * fract
}

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
 * Evaluates the restrained rear depth-haze factor at a water-column point
 * (`AQ-86` AC #1): 0 everywhere inside the primary fish volume
 * (z >= -1.5), ramping to 1 at the rear wall (z = -4.6), and stronger with
 * depth (0.55 at the surface, 1.0 at the sand). The haze is a rear-water
 * depth cue only — it never veils foreground or mid-tank fish, and it is
 * not open-ocean fog (forbidden by AQ-39 §1.1) or a blue veil.
 */
export function evaluateDepthHazeFactor(z: number, y: number): number {
  if (!Number.isFinite(z) || !Number.isFinite(y)) return 0
  const zFactor = clamp((DEPTH_HAZE_START_Z - z) / (DEPTH_HAZE_START_Z - DEPTH_HAZE_END_Z), 0, 1)
  const depthFactor = 0.55 + 0.45 * clamp((2.8 - y) / 5.6, 0, 1)
  return zFactor * depthFactor
}

/**
 * Evaluates soft volumetric light-shaft intensity at a water-column point
 * (`AQ-86` AC #2, upgraded AQ-96/AQ-98): three slanted Gaussian bands
 * descending from the surface, weakening with depth (15% of surface
 * strength at the sand), each band fading out past its own hashed depth
 * reach so most beams stop above the sand and only the longest reach
 * the bed. Band sway is driven by the shared surface wave field sampled
 * at the band root — the bands drift because the surface moves, not on
 * an independent clock. Freezes at the static t=0 phase when `paused`
 * or `reducedMotion` is active, and never flickers. The GLSL in
 * `aquarium.ts` mirrors these constants; keep the two in sync.
 */
export function evaluateLightShaftIntensity(
  x: number,
  y: number,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
  },
): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0
  const effectiveTime =
    options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)
      ? 0
      : timeSeconds % 3600
  const depthFromTop = clamp((2.8 - y) / 5.6, 0, 1)
  const depthEnvelope = 1 - 0.85 * depthFromTop
  let total = 0
  for (const center of LIGHT_SHAFT_BAND_CENTERS) {
    // Wave-driven sway: the shared field height at the band root on the
    // shaft plane (z = -1.8), scaled to the old ±0.15 m sway range.
    const sway = LIGHT_SHAFT_SWAY_AMPLITUDE_M * evaluateSurfaceHeight(center, -1.8, effectiveTime)
    const bandCenter = center + (2.8 - y) * LIGHT_SHAFT_SLANT_PER_M + sway
    const d = (x - bandCenter) / LIGHT_SHAFT_BAND_WIDTH_M
    const reach = lightShaftBandReach(center)
    const reachFade = clamp(1 - (depthFromTop - reach) / LIGHT_SHAFT_REACH_FADE_M, 0, 1)
    total += Math.exp(-(d * d)) * reachFade
  }
  return Math.min(1, total) * depthEnvelope
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
 *
 * With `options.slant` (worldY of the fragment + sun direction), the UVs
 * are projected from the surface point the light actually passed through:
 * `surfacePoint = xz + sunDir.xz * (surfaceY - y) / sunDir.y`, so the
 * dapple on tall rock and high coral shifts along the light direction
 * and lines up with the shafts above it. The return also carries the
 * shared wave-field focus at that surface point (`focus`, in [-1, 1]),
 * which the shader multiplies the pattern by — this is the coupling
 * that makes the dapple breathe with the surface. Without `slant` the
 * legacy vertical projection is returned (UVs from world XZ directly),
 * which is what the existing tests cover.
 *
 * Note on the two clocks: the caustic scroll rates (0.22 / 0.37 Hz) are
 * deliberately NOT equated to the wave field's dispersion frequencies
 * (0.66–1.49 Hz) — equating them would make the dapple scroll visibly
 * too fast. The scroll is the slow envelope; the coupling to the surface
 * is the shared frozen clock plus the focus term, not a shared frequency.
 */
export function evaluateCausticPatternUV(
  worldX: number,
  worldZ: number,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
    config?: Partial<AquariumOpticsConfig>
    slant?: {
      worldY: number
      sunDir?: Readonly<{ x: number; y: number; z: number }>
      surfaceY?: number
    }
  },
): {
  a: { u: number; v: number }
  b: { u: number; v: number }
  /** Zucconi second scale (mid scale of A/B) for the min() blend. */
  c: { u: number; v: number }
  /** Surface point the light passed through (the slanted footpoint). */
  surfacePoint: { x: number; z: number }
  /** Shared wave-field focus at the surface point, in [-1, 1]. */
  focus: number
} {
  const cfg = { ...DEFAULT_AQUARIUM_OPTICS_CONFIG, ...options?.config }
  const effectiveTime =
    options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds)
      ? 0
      : timeSeconds % 3600
  let surfacePoint = { x: worldX, z: worldZ }
  if (options?.slant) {
    const sunDir = options.slant.sunDir ?? cfg.sunDirection
    const surfaceY = options.slant.surfaceY ?? cfg.surfaceY
    const dist = (surfaceY - options.slant.worldY) / Math.max(sunDir.y, 0.2)
    surfacePoint = {
      x: worldX + sunDir.x * dist,
      z: worldZ + sunDir.z * dist,
    }
  }
  const focus = evaluateSurfaceFocus(surfacePoint.x, surfacePoint.z, effectiveTime)
  // Layer C (surface-water pass 2, Zucconi second scale): the mid scale
  // of A/B, drifting at 0.17 / 0.11 Hz-equivalent so the GLSL min()
  // blend has a TS mirror. Like A/B it carries no warp term here — the
  // warp is a shader-side slope offset, not part of the UV contract.
  const scaleC = (cfg.causticTextureScaleA + cfg.causticTextureScaleB) / 2
  return {
    a: {
      u: surfacePoint.x * cfg.causticTextureScaleA + effectiveTime * cfg.causticPrimaryHz * 0.1,
      v: surfacePoint.z * cfg.causticTextureScaleA - effectiveTime * cfg.causticPrimaryHz * 0.06,
    },
    b: {
      u: surfacePoint.x * cfg.causticTextureScaleB - effectiveTime * cfg.causticSecondaryHz * 0.08,
      v: surfacePoint.z * cfg.causticTextureScaleB + effectiveTime * cfg.causticSecondaryHz * 0.05,
    },
    c: {
      u: surfacePoint.x * scaleC + effectiveTime * 0.017,
      v: surfacePoint.z * scaleC + effectiveTime * 0.011,
    },
    surfacePoint,
    focus,
  }
}

/**
 * Evaluates subtle water-surface ripple vertical displacement (`AQ-14.2` AC #1 & #5).
 * Returns 0 when `paused` or `reducedMotion` is active.
 *
 * SUPERSEDED by the shared wave field in `surface-waves.ts` (AQ-96):
 * the surface shader now displaces on the GPU from that field, and this
 * two-sine function is kept only as the tested legacy mirror — no call
 * site remains in `aquarium.ts`. Do not build new behaviour on it.
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
 * Clearance in front of a live-rock island's front face for a bubble
 * emitter (visual-check fix): an emitter at the island centre sits
 * inside the rock mass, so most of the rise is hidden and no stream is
 * discernible. Placing the emitter just off the front face keeps the
 * whole rise in open water; the ±0.05 m wobble can never push a bubble
 * back into the rock.
 */
export const BUBBLE_EMITTER_FACE_CLEARANCE_M = 0.15

/**
 * Derives a bubble-stream emitter from a live-rock island's sand
 * footprint: centred on the island's front face (the +z face toward the
 * camera), `BUBBLE_EMITTER_FACE_CLEARANCE_M` clear of the rock, at the
 * configured emitter height just above the sand bed. The footprint is
 * the same ellipse the sand bed uses for its talus mounding, so the
 * emitter tracks the island if the aquascape moves.
 */
export function bubbleEmitterForRockFootprint(footprint: Readonly<{
  x: number
  z: number
  radiusZ: number
}>): { x: number; y: number; z: number } {
  return {
    x: footprint.x,
    y: DEFAULT_AQUARIUM_OPTICS_CONFIG.bubbleEmitterBaseY,
    z: footprint.z + footprint.radiusZ + BUBBLE_EMITTER_FACE_CLEARANCE_M,
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
 * Pixel size of the generated particle sprites (AQ-43). 64x64 is plenty
 * for a point sprite that renders a few pixels across at overview
 * distance, and the texture is generated once at startup — no asset,
 * no network, no budget cost.
 */
export const PARTICLE_SPRITE_SIZE_PX = 64

export type ParticleSpriteKind = 'mote' | 'bubble'

function spriteSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Builds a soft round point sprite for the suspended-particle systems
 * (AQ-43 visual-check fix, PR #37 check section 6a/6b and "Other notes"):
 * `THREE.PointsMaterial` without a map renders every point as a hard
 * square, so the 48 marine-snow motes read as "tiny white squares up
 * close" and the 0.06 m bubbles as "pale squares, indistinguishable
 * from the motes" — the size/opacity bump in the PR #32 round only made
 * bigger squares. A generated radial sprite makes each point a soft
 * round shape instead, with no asset and no new dependency:
 * - `mote`: a soft disc — full alpha at the centre, smooth falloff to
 *   transparent at the rim, so marine snow reads as a faint round speck.
 * - `bubble`: a thin bright ring — transparent at the centre, peak
 *   alpha at ~0.7 radius, transparent at the rim — so a bubble reads as
 *   a rising ring, distinct from a mote at a glance.
 * Returns a `THREE.DataTexture` (generated RGBA pixels, white RGB so
 * the material colour tints it) so the profile is unit-testable in node
 * with no DOM canvas. Counts, sizes, opacities and blending are
 * unchanged; only the point shape changes.
 */
export function createParticleSprite(kind: ParticleSpriteKind): THREE.DataTexture {
  const size = PARTICLE_SPRITE_SIZE_PX
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1
      const ny = ((y + 0.5) / size) * 2 - 1
      const r = Math.hypot(nx, ny)
      let alpha: number
      if (kind === 'bubble') {
        // Gaussian ring centred at r = 0.68, sigma 0.16: ~0 at the
        // centre, 1 at the rim, ~0.02 at the outer edge.
        const d = (r - 0.68) / 0.16
        alpha = Math.exp(-d * d)
      } else {
        // Soft disc: full alpha inside r = 0.3, smooth falloff to 0 at r = 1.
        alpha = 1 - spriteSmoothstep(0.3, 1, r)
      }
      const i = (y * size + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(clamp(alpha, 0, 1) * 255)
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
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

/** High-Kelvin reef spectrum specification (AQ-96 AC #1: 14,000K–20,000K). */
export const REEF_SPECTRUM_KELVIN_RANGE = Object.freeze({
  minK: 14000,
  maxK: 20000,
  defaultK: 16000,
})

/** Deep aquatic exponential fog helper (AQ-96: #0a2239 to #0d3b66). */
export function createReefFogExp2(hex = '#0b2e4f', density = 0.028): THREE.FogExp2 {
  return new THREE.FogExp2(hex, Math.max(0.001, Math.min(0.15, density)))
}

/**
 * Single `THREE.Points` marine-snow particle system (AQ-96 AC #4 & #5: 300–500 particles)
 * that slowly drifts through the water column and freezes synchronously on pause or reduced motion.
 */
export function createMarineSnowPointsSystem(
  requestedCount = 360,
  bounds: Readonly<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }> = {
    min: { x: -4, y: -2.25, z: -4.6 },
    max: { x: 4, y: 2.8, z: 2.8 },
  },
): {
  points: THREE.Points
  count: number
  positions: Float32Array
  update(timeSeconds: number, options?: { paused?: boolean; reducedMotion?: boolean; hidden?: boolean }): void
  dispose(): void
} {
  const count = Math.min(500, Math.max(300, Math.round(Number.isFinite(requestedCount) ? requestedCount : 360)))
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(positions, 3)
  geometry.setAttribute('position', posAttr)
  const sprite = createParticleSprite('mote')
  const material = new THREE.PointsMaterial({
    color: '#d8f0ff',
    size: 0.022,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    map: sprite,
    alphaTest: 0.01,
  })
  const points = new THREE.Points(geometry, material)
  points.name = 'Marine_Snow_Points'
  points.raycast = () => {}

  const writePositions = (timeSeconds: number, frozen: boolean) => {
    for (let i = 0; i < count; i++) {
      const pt = evaluateSuspendedParticlePosition(i, bounds, timeSeconds, {
        paused: frozen,
        reducedMotion: frozen,
      })
      positions[i * 3] = pt.x
      positions[i * 3 + 1] = pt.y
      positions[i * 3 + 2] = pt.z
    }
    posAttr.needsUpdate = true
  }
  writePositions(0, true)

  return {
    points,
    count,
    positions,
    update(timeSeconds: number, options?: { paused?: boolean; reducedMotion?: boolean; hidden?: boolean }) {
      const frozen = Boolean(options?.paused || options?.reducedMotion || options?.hidden || !Number.isFinite(timeSeconds))
      writePositions(frozen ? 0 : timeSeconds, frozen)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      sprite.dispose()
    },
  }
}

