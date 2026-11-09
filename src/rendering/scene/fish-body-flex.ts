import type { BehaviorState } from '../../lib/fish-behavior'
import type { FishTurnKinematics } from './fish-turning'

/**
 * Lighthill travelling-wave body flex — pure gait math (AQ-12 / AQ-49,
 * tracker #8). No Three.js imports: every function here is unit-testable
 * without a renderer.
 *
 * Core equation (object space, applied after skinning, lateral axis only):
 *   y(x, t) = A(x) * sin(k*x - ω*t + φ)
 *   A(x)    = A_tail * (a + (1 - a) * x^p)      (amplitude envelope, grows posteriorly)
 *   ω       = 2π * f,  k = 2π / λ               (λ in body lengths)
 *   x ∈ [0, 1] is the normalised body coordinate, snout 0 → tail 1.
 *
 * The shader term is a zero-mean oscillation only. The mean C/S-bend from
 * turning stays in the bone-quaternion overlay (`applyFishTurningRigOverlay`),
 * so the two channels cannot double-count: the wave adds no mean bend and
 * the overlay caps (max summed spine bend 1.275 rad) are untouched.
 *
 * All frequencies / amplitudes below are visual-tuning starting points
 * seeded from the existing `SPECIES_LOCOMOTION_SIGNATURES`
 * (`pulseFrequencyHz`, `basePlaybackByState.swim`) — they are NOT measured
 * kinematics (see docs/fish-behavior-design.md). Root must confirm the
 * per-species table before this is treated as biological fact, in
 * particular every non-tang row and the blue-tang gait, which is
 * morphology-based rather than a measured recording.
 */

export type FishGaitMode =
  | 'subcarangiform'
  | 'labriform'
  | 'banner_hoverer'
  | 'benthic_percher'
  | 'balistiform'

/** Per-species Lighthill gait parameters, in fractions of body length (BL). */
export type FishFlexGaitParams = Readonly<{
  gaitMode: FishGaitMode
  /** Tail-beat frequency at cruise (Hz). */
  fCruiseHz: number
  fMinHz: number
  fMaxHz: number
  /** Extra Hz per unit normalised speed. */
  fSpeedGainHz: number
  /** Tail amplitude at cruise, as a fraction of body length. */
  tailAmplitudeCruiseBL: number
  /** Saturated tail amplitude at high speed, as a fraction of body length. */
  tailAmplitudeMaxBL: number
  /** Envelope shape: A(x) = A_tail * (a + (1 - a) * x^p). */
  envelopeA: number
  envelopeP: number
  /** Travelling-wave wavelength, in body lengths. */
  wavelengthBL: number
  /**
   * Normalised speed at which a labriform fish blends from pectoral cruise
   * to body-caudal undulation. Ignored for other gait modes.
   */
  gaitTransitionSpeedNorm: number
  /** Width of the gait-transition blend, in normalised speed. */
  gaitTransitionWidthNorm: number
  /**
   * Median-fin (dorsal/anal) ripple amplitude, as a fraction of body length.
   * 0 disables it. Shader-mask fallback only: no dorsal/anal fin bones are
   * bound anywhere in the repo, so no fin bone names are invented here.
   */
  finRippleAmpBL: number
}>

/**
 * Balistiform (dorsal/anal-fin propulsion) is parameterised so the mode
 * exists for a future roster decision, but it is UNWIRED: no species in the
 * 15-species roster uses it. Do not assign it to a species without a roster
 * decision — do not invent a balistiform fish.
 */
export const BALISTIFORM_FLEX_GAIT: FishFlexGaitParams = Object.freeze({
  gaitMode: 'balistiform',
  fCruiseHz: 1.0,
  fMinHz: 0.3,
  fMaxHz: 2.0,
  fSpeedGainHz: 0.6,
  tailAmplitudeCruiseBL: 0,
  tailAmplitudeMaxBL: 0.01,
  envelopeA: 0.1,
  envelopeP: 2.0,
  wavelengthBL: 0.9,
  gaitTransitionSpeedNorm: 1.0,
  gaitTransitionWidthNorm: 0.3,
  finRippleAmpBL: 0.02,
})

/** Hard bound on the travelling-wave tail offset, as a fraction of body length. */
export const MAX_FLEX_TAIL_OFFSET_BL = 0.1

const TWO_PI = Math.PI * 2

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export type FishFlexInput = Readonly<{
  /** Speed divided by the species cruise speed; 1 is cruise. Clamped to [0, 2.5]. */
  speedNorm: number
  state: BehaviorState
  maneuverStage: FishTurnKinematics['maneuverStage']
  startleSeconds: number
}>

export type FishFlexValues = Readonly<{
  gaitMode: FishGaitMode
  /** Tail-beat frequency (Hz) for the current speed/state. */
  frequencyHz: number
  /** Effective tail amplitude (fraction of body length). */
  tailAmplitudeBL: number
  /** Wave number in body-coordinate units (rad per unit x, x ∈ [0, 1]). */
  waveNumber: number
  /**
   * Body-caudal blend: 0 = pectoral cruise (near-rigid body), 1 = full
   * body-caudal undulation. Only labriform fish blend; every other mode is
   * fixed at 0 (hoverer/percher) or 1 (subcarangiform).
   */
  gaitBlend: number
  /** Median-fin ripple amplitude (fraction of body length). */
  finRippleAmpBL: number
  /**
   * 0 while a benthic percher is perched (idle/forage at ~zero speed);
   * 1 whenever it is actually moving. Other modes are always 1.
   */
  amplitudeScale: number
}>

/** Amplitude envelope A(x) / A_tail for normalised body coordinate x ∈ [0, 1]. */
export function lighthillEnvelope(x: number, gait: FishFlexGaitParams): number {
  const s = clamp(x, 0, 1)
  return gait.envelopeA + (1 - gait.envelopeA) * Math.pow(s, gait.envelopeP)
}

/** Tail-beat frequency f(U), growing with normalised speed and saturating. */
export function lighthillFrequencyHz(speedNorm: number, gait: FishFlexGaitParams): number {
  const u = clamp(speedNorm, 0, 2.5)
  return clamp(gait.fCruiseHz + gait.fSpeedGainHz * u, gait.fMinHz, gait.fMaxHz)
}

/** Tail amplitude A_tail(U), growing from a ~35% residual at rest, then saturating. */
export function lighthillTailAmplitudeBL(speedNorm: number, gait: FishFlexGaitParams): number {
  const u = clamp(speedNorm, 0, 2.5)
  const growth = 0.35 + 0.65 * smoothstep(0, 1, u)
  return Math.min(gait.tailAmplitudeMaxBL, gait.tailAmplitudeCruiseBL * growth)
}

/**
 * Body-caudal blend for labriform fish: 0 below the gait-transition speed,
 * 1 above it, smooth in between. All other gait modes return a fixed blend
 * (1 for subcarangiform, 0 otherwise).
 */
export function lighthillGaitBlend(speedNorm: number, gait: FishFlexGaitParams): number {
  if (gait.gaitMode !== 'labriform') {
    return gait.gaitMode === 'subcarangiform' ? 1 : 0
  }
  const half = gait.gaitTransitionWidthNorm / 2
  return smoothstep(
    gait.gaitTransitionSpeedNorm - half,
    gait.gaitTransitionSpeedNorm + half,
    clamp(speedNorm, 0, 2.5),
  )
}

/** Deterministic per-instance wave phase in [0, 2π), from an integer seed. */
export function flexPhaseForInstance(seed: number): number {
  let value = (seed >>> 0) || 1
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return (((value ^ (value >>> 14)) >>> 0) / 4294967296) * TWO_PI
}

/**
 * Advances accumulated simulation time for the flex wave. `dt <= 0`
 * (paused frame) freezes the phase exactly, matching `FishClipPlayer`.
 */
export function advanceFishFlexTime(flexTimeSeconds: number, dtSeconds: number): number {
  if (!Number.isFinite(flexTimeSeconds)) return 0
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return flexTimeSeconds
  return flexTimeSeconds + dtSeconds
}

/**
 * Evaluates the per-frame flex values for one fish. Speed is already the
 * travel speed, so exit-stroke / brake-pivot speed changes are reflected
 * through it — no second burst factor is invented here.
 */
export function evaluateLighthillFlexParams(
  gait: FishFlexGaitParams,
  input: FishFlexInput,
): FishFlexValues {
  const u = clamp(input.speedNorm, 0, 2.5)
  const blend = lighthillGaitBlend(u, gait)
  // A labriform fish at cruise is near-rigid (small cruise amplitude) and
  // only reaches its saturated body-caudal amplitude once the gait blend
  // has carried it past the transition speed.
  const baseAmplitude = lighthillTailAmplitudeBL(u, gait)
  const tailAmplitudeBL =
    gait.gaitMode === 'labriform'
      ? baseAmplitude * (1 - blend) + gait.tailAmplitudeMaxBL * blend
      : baseAmplitude
  const amplitudeScale =
    gait.gaitMode === 'benthic_percher' && !isMoving(input) ? 0 : 1
  // Idle/hover: frequency falls to its floor; the residual amplitude above
  // keeps subcarangiform fish from freezing mid-sine at rest.
  const frequencyHz =
    input.state === 'idle' ? gait.fMinHz : lighthillFrequencyHz(u, gait)
  return Object.freeze({
    gaitMode: gait.gaitMode,
    frequencyHz,
    tailAmplitudeBL: clamp(tailAmplitudeBL, 0, MAX_FLEX_TAIL_OFFSET_BL),
    waveNumber: TWO_PI / Math.max(0.1, gait.wavelengthBL),
    gaitBlend: blend,
    finRippleAmpBL: gait.finRippleAmpBL,
    amplitudeScale,
  })
}

function isMoving(input: FishFlexInput): boolean {
  return (
    input.speedNorm > 0.25 ||
    input.state === 'swim' ||
    input.state === 'burst' ||
    input.state === 'retreat' ||
    input.startleSeconds > 0
  )
}

/**
 * Lateral wave offset at normalised body coordinate x and simulation time t,
 * in fractions of body length. Pure reference implementation of the shader
 * term, used by tests to pin the envelope / phase / zero-mean behaviour.
 */
export function flexLateralOffsetBL(
  x: number,
  flexTimeSeconds: number,
  values: FishFlexValues,
  gait: FishFlexGaitParams,
  phaseRad: number,
): number {
  const s = clamp(x, 0, 1)
  const amplitude = values.tailAmplitudeBL * values.amplitudeScale
  return (
    amplitude *
    lighthillEnvelope(s, gait) *
    Math.sin(values.waveNumber * s - TWO_PI * values.frequencyHz * flexTimeSeconds + phaseRad)
  )
}

/**
 * Buccal-opercular (gill-cover) lateral flare offset (AQ-74 AC #2) at normalised
 * longitudinal coordinate `x ∈ [0, 1]` (snout 0 -> tail 1) and dorsoventral coordinate
 * `yNorm ∈ [-1, 1]`, in fractions of body length.
 *
 * Lags mouth inhalation by 90 deg (pi/2) at the active swim frequency (`values.frequencyHz`).
 */
export function evaluateOperculumArticulationBL(
  x: number,
  yNorm: number,
  flexTimeSeconds: number,
  values: FishFlexValues,
  phaseRad: number,
): number {
  const s = clamp(x, 0, 1)
  const gillMask =
    smoothstep(0.16, 0.21, s) *
    (1 - smoothstep(0.23, 0.28, s)) *
    (1 - smoothstep(0.18, 0.46, Math.abs(yNorm + 0.08)))
  if (gillMask <= 0) return 0
  const respPhase = TWO_PI * values.frequencyHz * flexTimeSeconds - phaseRad
  const pulse = 0.5 - 0.5 * Math.cos(respPhase - Math.PI * 0.5)
  const effort = 0.45 + 0.55 * clamp(values.frequencyHz / 2.2, 0, 1)
  const gillAmplitudeBL = 0.0022 * effort * values.amplitudeScale
  return gillAmplitudeBL * gillMask * pulse
}

/**
 * Lower-jaw mouth ventilation vertical drop (AQ-74 AC #3) at normalised longitudinal
 * coordinate `x ∈ [0, 1]` (snout 0 -> tail 1) and dorsoventral coordinate `yNorm ∈ [-1, 1]`,
 * in fractions of body length.
 *
 * Leads operculum exhalation by 90 deg at the active swim frequency (`values.frequencyHz`).
 */
export function evaluateMouthArticulationBL(
  x: number,
  yNorm: number,
  flexTimeSeconds: number,
  values: FishFlexValues,
  phaseRad: number,
): number {
  const s = clamp(x, 0, 1)
  const mouthMask =
    (1 - smoothstep(0.015, 0.068, s)) *
    smoothstep(-0.28, -0.06, yNorm) *
    (1 - smoothstep(-0.03, 0.02, yNorm))
  if (mouthMask <= 0) return 0
  const respPhase = TWO_PI * values.frequencyHz * flexTimeSeconds - phaseRad
  const pulse = 0.5 - 0.5 * Math.cos(respPhase)
  const effort = 0.45 + 0.55 * clamp(values.frequencyHz / 2.2, 0, 1)
  const mouthAmplitudeBL = 0.0018 * effort * values.amplitudeScale
  return mouthAmplitudeBL * mouthMask * pulse
}
