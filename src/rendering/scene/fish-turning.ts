import * as THREE from 'three'
import type { Vec3 } from '../../simulation/habitat-navigation'

export type FishRigArchetype =
  | 'subcarangiform_schooler'
  | 'labriform_rigid_disc'
  | 'labriform_cruiser'
  | 'banner_hoverer'
  | 'benthic_percher_dragonet'

export type TurnManeuverStage = 'none' | 'brake-pivot' | 'exit-stroke'

export type FishTurningRig = {
  archetype: FishRigArchetype
  spineJoints: THREE.Object3D[]
  pectoralLeft?: THREE.Object3D
  pectoralRight?: THREE.Object3D
}

export type FishTurnKinematics = {
  yawRateRadPerSec: number
  smoothedYawRate: number
  turnCurvature: number
  turnCurvatureDelayed: number
  turnPhase: number
  maneuverStage: TurnManeuverStage
  exitStrokeSeconds: number
  speed: number
  startleSeconds: number
}

/** Exact 65-degree threshold (in radians) for two-stage brake-pivot / exit-stroke maneuvers (AQ-49 AC #2). */
export const SHARP_TURN_THRESHOLD_RAD = (65 * Math.PI) / 180
const EXIT_STROKE_RELEASE_RAD = (28 * Math.PI) / 180
const MAX_YAW_RATE_RAD_PER_SEC = 4.5
const BASE_SPINE_BEND_SCALE_RAD = 0.68
const STARTLE_SPINE_BEND_GAIN = 1.25
const SPINE_SEGMENT_CLAMP_GAIN = 1.25
const MAX_TRAVELING_WAVE_GAIN = 1.2
const MAX_SUMMED_SPINE_BEND_RAD = BASE_SPINE_BEND_SCALE_RAD * STARTLE_SPINE_BEND_GAIN * SPINE_SEGMENT_CLAMP_GAIN * MAX_TRAVELING_WAVE_GAIN
const MAX_PECTORAL_BRAKE_RAD = 0.42
const MAX_PECTORAL_GAIN = 1.15
const MAX_PECTORAL_FLARE_RAD = MAX_PECTORAL_BRAKE_RAD * MAX_PECTORAL_GAIN
const MAX_PECTORAL_PITCH_RAD = 0.24
const MAX_TURNING_SPINE_JOINTS = 32

const tempDeltaQuat = new THREE.Quaternion()
const LOCAL_BEND_AXIS = new THREE.Vector3(0, 0, 1)
const LOCAL_PECTORAL_FLARE_AXIS = new THREE.Vector3(0, 0, 1)
const LOCAL_PECTORAL_PITCH_AXIS = new THREE.Vector3(1, 0, 0)
const tempPectoralPitchQuat = new THREE.Quaternion()

export type FishTurningEnvelopeContract = Readonly<{
  schema: 'fish-turning-envelope-v1'
  composition: 'procedural-overlay'
  verification: 'unverified-until-root-asset-and-reset-review'
  sourceIdentity: 'unbound'
  angleUnit: 'radian'
  archetype: FishRigArchetype
  jointNames: readonly string[]
  spineJointCount: number
  perJointSpineAngleAbsRad: readonly number[]
  spineJointCaps: readonly Readonly<{ jointName: string; maxAbsAngleRad: number }>[]
  maxSummedSpineAngleAbsRad: number
  maxPectoralFlareAbsRad: number
  maxPectoralPitchAbsRad: number
  quaternionComposition: 'mixerQuaternion-times-localAxisAngle'
  resetPolicy: 'every-listed-joint-must-be-reset-by-active-clip-before-each-overlay'
  rootMustVerifyAssetIdentityAndReset: true
}>

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(min, value))
}

function boundedSpineJointCount(spineJointCount: number): number {
  return Number.isSafeInteger(spineJointCount) && spineJointCount >= 0 && spineJointCount <= MAX_TURNING_SPINE_JOINTS
    ? spineJointCount
    : 0
}

function normalizedSpineWeights(spineJointCount: number, archetype: FishRigArchetype): number[] {
  const count = boundedSpineJointCount(spineJointCount)
  const weights = new Array<number>(count).fill(0)
  if (count <= 1) return weights
  const firstFlexIndex = archetype === 'labriform_rigid_disc' ? Math.min(3, count - 1) : 1
  let sum = 0
  for (let i = firstFlexIndex; i < count; i++) {
    const s = (i - firstFlexIndex + 1) / Math.max(1, count - firstFlexIndex)
    weights[i] = 0.35 + 0.65 * Math.pow(s, 1.35)
    sum += weights[i]
  }
  if (sum > 0) for (let i = firstFlexIndex; i < count; i++) weights[i] /= sum
  return weights
}

/**
 * Bounded math contract for the local-axis post-mixer overlay. It deliberately
 * remains unverified until a caller pins the exact asset and proves that its
 * active clips reset every listed joint before each overlay application.
 */
export function fishTurningEnvelopeContract(rig: FishTurningRig): FishTurningEnvelopeContract {
  const count = boundedSpineJointCount(rig.spineJoints.length)
  const weights = normalizedSpineWeights(count, rig.archetype)
  const perJointSpineAngleAbsRad = Object.freeze(weights.map(weight => MAX_SUMMED_SPINE_BEND_RAD * weight))
  const spineJointCaps = Object.freeze(rig.spineJoints.slice(0, count).map((joint, index) => Object.freeze({
    jointName: joint.name,
    maxAbsAngleRad: perJointSpineAngleAbsRad[index] ?? 0,
  })))
  const modifiedSpineNames = spineJointCaps.filter(cap => cap.maxAbsAngleRad > 0).map(cap => cap.jointName)
  return Object.freeze({
    schema: 'fish-turning-envelope-v1',
    composition: 'procedural-overlay',
    verification: 'unverified-until-root-asset-and-reset-review',
    sourceIdentity: 'unbound',
    angleUnit: 'radian',
    archetype: rig.archetype,
    jointNames: Object.freeze([
      ...modifiedSpineNames,
      ...(rig.pectoralLeft ? [rig.pectoralLeft.name] : []),
      ...(rig.pectoralRight ? [rig.pectoralRight.name] : []),
    ]),
    spineJointCount: count,
    perJointSpineAngleAbsRad,
    spineJointCaps,
    maxSummedSpineAngleAbsRad: perJointSpineAngleAbsRad.reduce((sum, cap) => sum + cap, 0),
    maxPectoralFlareAbsRad: MAX_PECTORAL_FLARE_RAD,
    maxPectoralPitchAbsRad: MAX_PECTORAL_PITCH_RAD,
    quaternionComposition: 'mixerQuaternion-times-localAxisAngle',
    resetPolicy: 'every-listed-joint-must-be-reset-by-active-clip-before-each-overlay',
    rootMustVerifyAssetIdentityAndReset: true,
  })
}

export function getRigArchetypeForSpecies(speciesId: string): FishRigArchetype {
  switch (speciesId) {
    case 'yellow-tang':
      return 'labriform_rigid_disc'
    case 'blue-tang':
      return 'labriform_cruiser'
    case 'banggai-cardinalfish':
      return 'banner_hoverer'
    case 'mandarin-dragonet':
      return 'benthic_percher_dragonet'
    default:
      return 'subcarangiform_schooler'
  }
}

/**
 * Evaluates the two-stage maneuver state (`none` | `brake-pivot` | `exit-stroke`)
 * for large direction changes (`|delta| >= 65°` or startle turns).
 */
export function resolveTurnManeuverStage(
  previousStage: TurnManeuverStage,
  exitStrokeSeconds: number,
  headingDeltaRad: number,
  startleSeconds = 0,
): { stage: TurnManeuverStage; nextExitStrokeSeconds: number } {
  const absDelta = Math.abs(headingDeltaRad)
  if (absDelta >= SHARP_TURN_THRESHOLD_RAD || startleSeconds > 0.35) {
    return { stage: 'brake-pivot', nextExitStrokeSeconds: 0.38 }
  }
  if (previousStage === 'brake-pivot' && absDelta < SHARP_TURN_THRESHOLD_RAD) {
    return { stage: 'exit-stroke', nextExitStrokeSeconds: Math.max(0.28, exitStrokeSeconds) }
  }
  if (previousStage === 'exit-stroke') {
    if (exitStrokeSeconds > 0 && absDelta > 0.04) {
      return { stage: 'exit-stroke', nextExitStrokeSeconds: exitStrokeSeconds }
    }
    if (absDelta <= EXIT_STROKE_RELEASE_RAD && exitStrokeSeconds <= 0) {
      return { stage: 'none', nextExitStrokeSeconds: 0 }
    }
  }
  return { stage: 'none', nextExitStrokeSeconds: 0 }
}

/**
 * Computes the biomechanical speed multiplier during a heading change:
 * - `brake-pivot` (`|delta| >= 65°`): decelerates into the pivot (`0.38..0.55` cruise) while angular turn rate boosts.
 * - `exit-stroke`: applies a propulsive tail burst (`1.18×` cruise) accelerating out of the apex.
 * - Normal cruise (`none`): smooth cosine modulation.
 */
export function evaluateTurnSpeedFactor(
  headingDeltaRad: number,
  startleSeconds = 0,
  maneuverStage: TurnManeuverStage = 'none',
): number {
  const absDelta = Math.min(Math.PI, Math.abs(headingDeltaRad))
  const raisedCosine = 0.5 + 0.5 * Math.cos(absDelta)
  if (startleSeconds > 0) {
    return 0.72 + 0.28 * raisedCosine
  }
  if (maneuverStage === 'brake-pivot' || absDelta >= SHARP_TURN_THRESHOLD_RAD) {
    return 0.38 + 0.24 * raisedCosine
  }
  if (maneuverStage === 'exit-stroke') {
    return 1.16
  }
  return 0.55 + 0.45 * raisedCosine
}

/**
 * Computes lookahead corner filleting between the current waypoint and the next waypoint
 * within 0.45 units of an intermediate waypoint so fish carve smooth continuous arcs.
 */
export function computeLookaheadTarget(
  position: Readonly<Vec3>,
  route: readonly Vec3[],
  waypointIndex: number,
): Vec3 | undefined {
  const current = route[waypointIndex]
  if (!current) return undefined
  const next = route[waypointIndex + 1]
  if (!next) return current

  const distToCurrent = Math.hypot(
    current.x - position.x,
    current.y - position.y,
    current.z - position.z,
  )
  const filletRadius = 0.45
  if (distToCurrent >= filletRadius) return current

  const blend = clamp((1 - distToCurrent / filletRadius) * 0.48, 0, 0.48)
  return {
    x: current.x * (1 - blend) + next.x * blend,
    y: current.y * (1 - blend) + next.y * blend,
    z: current.z * (1 - blend) + next.z * blend,
  }
}

/**
 * Locks forward translation strictly to the fish's actual body heading axis (`yaw`/`pitch`)
 * so the velocity-heading dot product is 1.0 (zero sideways/backward crab-sliding).
 */
export function computeHeadingLockedStepVector(
  yaw: number,
  pitch: number,
  travelDistance: number,
): Vec3 {
  if (travelDistance <= 0 || !Number.isFinite(travelDistance)) {
    return { x: 0, y: 0, z: 0 }
  }
  const cosPitch = Math.cos(pitch)
  const forwardX = Math.sin(yaw) * cosPitch
  const forwardY = -Math.sin(pitch)
  const forwardZ = Math.cos(yaw) * cosPitch
  return {
    x: forwardX * travelDistance,
    y: forwardY * travelDistance,
    z: forwardZ * travelDistance,
  }
}

/**
 * Backwards-compatible alias that locks translation to the fish's heading axis
 * except when snapping the final sub-step (`remainingDistance <= travelDistance`) onto an exact waypoint.
 */
export function computeCurvilinearStepVector(
  yaw: number,
  pitch: number,
  chordDirection: Readonly<Vec3>,
  _headingDeltaRad: number,
  travelDistance: number,
  remainingDistance: number,
): Vec3 {
  if (travelDistance <= 0 || remainingDistance <= 0) {
    return { x: 0, y: 0, z: 0 }
  }
  if (remainingDistance <= travelDistance) {
    return {
      x: chordDirection.x * remainingDistance,
      y: chordDirection.y * remainingDistance,
      z: chordDirection.z * remainingDistance,
    }
  }
  return computeHeadingLockedStepVector(yaw, pitch, travelDistance)
}

/**
 * Advances the smoothed yaw-rate, primary & delayed spine curvature, and two-stage
 * maneuver state (`brake-pivot` -> `exit-stroke`) for a turning fish.
 */
export function stepFishTurnKinematics(
  current: FishTurnKinematics,
  yawDeltaRad: number,
  dt: number,
  speed: number,
  startleSeconds = 0,
  headingDeltaRad = 0,
): FishTurnKinematics {
  if (dt <= 0 || !Number.isFinite(dt)) return current

  const rawYawRate = clamp(yawDeltaRad / dt, -MAX_YAW_RATE_RAD_PER_SEC * 2, MAX_YAW_RATE_RAD_PER_SEC * 2)
  const smoothing = Math.min(1, dt * (startleSeconds > 0 ? 16 : 10))
  const smoothedYawRate = current.smoothedYawRate + (rawYawRate - current.smoothedYawRate) * smoothing
  const normalizedTurn = clamp(smoothedYawRate / MAX_YAW_RATE_RAD_PER_SEC, -1, 1)
  const curvatureSmoothing = Math.min(1, dt * 8.5)
  const turnCurvature = current.turnCurvature + (normalizedTurn - current.turnCurvature) * curvatureSmoothing

  // Posterior delayed curvature lags anterior curvature to create a traveling S-wave on exit
  const delayedSmoothing = Math.min(1, dt * 4.2)
  const turnCurvatureDelayed =
    current.turnCurvatureDelayed + (turnCurvature - current.turnCurvatureDelayed) * delayedSmoothing

  const { stage, nextExitStrokeSeconds } = resolveTurnManeuverStage(
    current.maneuverStage,
    Math.max(0, current.exitStrokeSeconds - dt),
    headingDeltaRad,
    startleSeconds,
  )

  const phaseRate = 4.5 + Math.min(8.5, Math.abs(smoothedYawRate) * 1.8 + speed * 2.2)
  const turnPhase = (current.turnPhase + dt * phaseRate) % (Math.PI * 2)

  return {
    yawRateRadPerSec: rawYawRate,
    smoothedYawRate,
    turnCurvature,
    turnCurvatureDelayed,
    turnPhase,
    maneuverStage: stage,
    exitStrokeSeconds: nextExitStrokeSeconds,
    speed,
    startleSeconds,
  }
}

/**
 * Discovers the literal skin joints verified by `AQ-49.1` (`spine_0` .. `spine_5`,
 * `pectoral_L`, `pectoral_R`) on a cloned Three.js fish model hierarchy.
 */
export function bindFishTurningRig(
  root: THREE.Object3D,
  speciesId = 'ocellaris-clownfish',
): FishTurningRig {
  const indexedSpine = new Map<number, THREE.Object3D>()
  let pectoralLeft: THREE.Object3D | undefined
  let pectoralRight: THREE.Object3D | undefined

  root.traverse(node => {
    const spineMatch = /^spine_(\d+)$/.exec(node.name)
    if (spineMatch) {
      const idx = Number(spineMatch[1])
      if (!indexedSpine.has(idx)) indexedSpine.set(idx, node)
      return
    }
    if (node.name === 'pectoral_L' && !pectoralLeft) {
      pectoralLeft = node
    } else if (node.name === 'pectoral_R' && !pectoralRight) {
      pectoralRight = node
    }
  })

  const spineJoints = [...indexedSpine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, node]) => node)

  return {
    archetype: getRigArchetypeForSpecies(speciesId),
    spineJoints,
    pectoralLeft,
    pectoralRight,
  }
}

/**
 * Evaluates per-segment axial bend angles (in radians) and asymmetric pectoral fin
 * braking/rowing offsets according to the species rig archetype (`AQ-49` AC #3):
 * - `labriform_rigid_disc` (`yellow-tang`): keeps anterior disc/sail joints (`spine_0`, `spine_1`, `spine_2`)
 *   at 0 rad so dorsal/anal sails never shear, concentrating bend in the caudal peduncle (`spine_3+`).
 * - `subcarangiform_schooler` (`ocellaris-clownfish`, `royal-gramma`, etc.): ramps progressively across
 *   `spine_1 .. spine_N` with a traveling wave delay between `turnCurvature` and `turnCurvatureDelayed`.
 */
export function evaluateSpineTurnAngles(
  spineJointCount: number,
  kinematics: FishTurnKinematics,
  archetype: FishRigArchetype = 'subcarangiform_schooler',
): {
  spineBendRad: number[]
  pectoralLeftFlareRad: number
  pectoralRightFlareRad: number
  pectoralLeftPitchRad: number
  pectoralRightPitchRad: number
} {
  const count = boundedSpineJointCount(spineJointCount)
  const spineBendRad = new Array<number>(count).fill(0)
  const state = kinematics && typeof kinematics === 'object' ? kinematics : undefined
  const curvature = Number.isFinite(state?.turnCurvature) ? clamp(state!.turnCurvature, -1, 1) : 0
  const delayed = Number.isFinite(state?.turnCurvatureDelayed) ? clamp(state!.turnCurvatureDelayed, -1, 1) : curvature
  const phase = Number.isFinite(state?.turnPhase) ? state!.turnPhase : 0
  const startle = Number.isFinite(state?.startleSeconds) && state!.startleSeconds > 0

  if (count <= 1 || (Math.abs(curvature) <= 1e-4 && Math.abs(delayed) <= 1e-4)) {
    return {
      spineBendRad,
      pectoralLeftFlareRad: 0,
      pectoralRightFlareRad: 0,
      pectoralLeftPitchRad: 0,
      pectoralRightPitchRad: 0,
    }
  }

  const startleBoost = startle ? STARTLE_SPINE_BEND_GAIN : 1.0
  const exitPulse =
    state!.maneuverStage === 'exit-stroke' ? 0.18 * Math.sin(phase) : 0
  const maxBend = BASE_SPINE_BEND_SCALE_RAD * startleBoost

  // For laterally compressed disc tangs (`labriform_rigid_disc`), lock spine_0..spine_2 (0 rad)
  // so the tall dorsal and anal sail fins never shear; bend only posterior peduncle/caudal joints (spine_3+).
  const firstFlexIndex = archetype === 'labriform_rigid_disc' ? Math.min(3, count - 1) : 1
  const normalizedWeights = normalizedSpineWeights(count, archetype)
  const caps = normalizedWeights.map(weight => MAX_SUMMED_SPINE_BEND_RAD * weight)

  for (let i = firstFlexIndex; i < count; i++) {
    const s = (i - firstFlexIndex + 1) / Math.max(1, count - firstFlexIndex)
    const normalizedWeight = normalizedWeights[i]
    // Anterior segments track immediate turnCurvature; posterior caudal segments blend toward turnCurvatureDelayed
    const segmentCurvature = curvature * (1 - s * 0.55) + delayed * (s * 0.55) + exitPulse * s
    const travelingWave = 1 + (MAX_TRAVELING_WAVE_GAIN - 1) * Math.sin(phase - s * 1.85) * Math.abs(curvature)
    const angle = clamp(segmentCurvature * maxBend, -maxBend * SPINE_SEGMENT_CLAMP_GAIN, maxBend * SPINE_SEGMENT_CLAMP_GAIN) * normalizedWeight * travelingWave
    spineBendRad[i] = clamp(angle, -caps[i], caps[i])
  }

  // Inside pectoral flares outward to act as a pivot brake; outside pectoral rows/sweeps.
  const turnLeft = Math.max(0, curvature)
  const turnRight = Math.max(0, -curvature)
  const pectoralGain =
    archetype === 'labriform_rigid_disc' || archetype === 'labriform_cruiser' ? MAX_PECTORAL_GAIN : 1.0
  const pectoralLeftFlareRad = clamp(
    (turnLeft * 1.0 - turnRight * 0.35) * MAX_PECTORAL_BRAKE_RAD * pectoralGain,
    -MAX_PECTORAL_FLARE_RAD,
    MAX_PECTORAL_FLARE_RAD,
  )
  const pectoralRightFlareRad = clamp(
    (turnRight * 1.0 - turnLeft * 0.35) * MAX_PECTORAL_BRAKE_RAD * pectoralGain,
    -MAX_PECTORAL_FLARE_RAD,
    MAX_PECTORAL_FLARE_RAD,
  )
  const pectoralLeftPitchRad = clamp(turnLeft * MAX_PECTORAL_PITCH_RAD, -MAX_PECTORAL_PITCH_RAD, MAX_PECTORAL_PITCH_RAD)
  const pectoralRightPitchRad = clamp(turnRight * MAX_PECTORAL_PITCH_RAD, -MAX_PECTORAL_PITCH_RAD, MAX_PECTORAL_PITCH_RAD)

  return {
    spineBendRad,
    pectoralLeftFlareRad,
    pectoralRightFlareRad,
    pectoralLeftPitchRad,
    pectoralRightPitchRad,
  }
}

/**
 * Computes the smoothed horizontal foreshortening scale (`scale.x` in `[-1, -0.28] U [0.28, 1]`)
 * for fallback 2D sprite planes so they turn smoothly without a single-frame binary pop (`AQ-49` AC #4).
 */
export function evaluateSpriteTurnScaleX(yaw: number): number {
  const facing = Math.sin(yaw)
  const sign = facing < 0 ? -1 : 1
  return sign * (0.28 + 0.72 * Math.abs(facing))
}

/**
 * Applies the procedural C/S-bend and pectoral braking overlay onto a rigged fish model.
 * Call immediately after `mixer.update(dt)` when not paused/stopped so the additive
 * rotation layers cleanly over the keyframed swim clip without accumulating frame drift.
 */
export function applyFishTurningRigOverlay(
  rig: FishTurningRig,
  kinematics: FishTurnKinematics,
  stopped = false,
): void {
  if (stopped || rig.spineJoints.length <= 1 || rig.spineJoints.length > MAX_TURNING_SPINE_JOINTS) return

  const angles = evaluateSpineTurnAngles(rig.spineJoints.length, kinematics, rig.archetype)
  if (angles.spineBendRad.every(angle => Math.abs(angle) <= 1e-5)) return

  for (let i = 1; i < rig.spineJoints.length; i++) {
    const angle = angles.spineBendRad[i]
    if (Math.abs(angle) <= 1e-5) continue
    tempDeltaQuat.setFromAxisAngle(LOCAL_BEND_AXIS, angle)
    normalizeFiniteQuaternion(rig.spineJoints[i].quaternion.multiply(tempDeltaQuat))
  }

  if (rig.pectoralLeft && Math.abs(angles.pectoralLeftFlareRad) > 1e-5) {
    tempDeltaQuat.setFromAxisAngle(LOCAL_PECTORAL_FLARE_AXIS, -angles.pectoralLeftFlareRad)
    tempPectoralPitchQuat.setFromAxisAngle(LOCAL_PECTORAL_PITCH_AXIS, angles.pectoralLeftPitchRad)
    normalizeFiniteQuaternion(rig.pectoralLeft.quaternion.multiply(tempDeltaQuat).multiply(tempPectoralPitchQuat))
  }

  if (rig.pectoralRight && Math.abs(angles.pectoralRightFlareRad) > 1e-5) {
    tempDeltaQuat.setFromAxisAngle(LOCAL_PECTORAL_FLARE_AXIS, angles.pectoralRightFlareRad)
    tempPectoralPitchQuat.setFromAxisAngle(LOCAL_PECTORAL_PITCH_AXIS, angles.pectoralRightPitchRad)
    normalizeFiniteQuaternion(rig.pectoralRight.quaternion.multiply(tempDeltaQuat).multiply(tempPectoralPitchQuat))
  }
}

function normalizeFiniteQuaternion(quaternion: THREE.Quaternion): void {
  const lengthSq = quaternion.lengthSq()
  if (!Number.isFinite(lengthSq) || lengthSq <= 1e-20) {
    quaternion.set(0, 0, 0, 1)
    return
  }
  quaternion.normalize()
}
