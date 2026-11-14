import * as THREE from 'three'
import { getSpeciesBehaviorProfile, type HabitatAnchor } from '../../lib/fish-behavior'
import { advanceFishBehavior, createFishBehaviorInstance, dispatchBehaviorEvent, getMotionIntent, getNavigationRequest, reportNavigationOutcome, type FishBehaviorInstance } from '../../simulation/behavior-runtime'
import { evaluateSchoolingSteering, isGroupSchoolingSpecies, type SchoolingPeer } from './schooling-navigation'
import { evaluateAnchorInteractionOffset, isSpeciesCompatibleWithAnchor, resolveSafeAnchorInteractionTarget } from './habitat-anchor-interactions'
import { createFishExtensionRuntime, EMPTY_FISH_EXTENSIONS, type FishExtensionConfig, type FishExtensionSnapshot } from '../../simulation/fish-extensions'
import { findWaterRoute, isWaterSegmentSafe, isWithinDepthAwareWaterBounds, orderHabitatAnchorsForRequest, resolveHabitatRoute, type AxisAlignedBox, type HabitatAnchorLocation, type MaxAbsXAtDepth, type SolidObstacleVolume, type Vec3 } from '../../simulation/habitat-navigation'
import { findMeshRoute, type CapsuleClearanceQuery, type MeshNavigationBudget, type MeshNavigationWorkBudget, type MeshNavigationWorkReport } from '../../simulation/mesh-navigation'
import { simulationSubsteps } from './clock'
import { fishBodyRadiusM, ANCHOR_APPROACH_MARGIN_M } from './fish-scale'
import { evaluateTieredVerticalDepthRange } from './fish-spawn'
import {
  computeCurvilinearStepVector,
  computeLookaheadTarget,
  computeMaxBiomechanicalYawRate,
  evaluateTurnSpeedFactor,
  getRigArchetypeForSpecies,
  stepFishTurnKinematics,
  type FishTurnKinematics,
} from './fish-turning'

export type CatmullRomSwimCurveOptions = {
  closed?: boolean
  tension?: number
  samplesPerSegment?: number
}

/**
 * Generates a smooth, continuous 3D swimming spline using `THREE.CatmullRomCurve3`
 * (`AQ-97` AC #1) from a sequence of 3D control waypoints.
 */
export function generateCatmullRomSwimCurve(
  waypoints: readonly Vec3[],
  options: CatmullRomSwimCurveOptions = {},
): { curve: THREE.CatmullRomCurve3; sampledPath: Vec3[] } {
  const validWaypoints = waypoints.filter(
    pt => Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.z),
  )
  if (validWaypoints.length < 2) {
    const fallback = validWaypoints[0] ?? { x: 0, y: 0, z: 0 }
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(fallback.x, fallback.y, fallback.z),
      new THREE.Vector3(fallback.x, fallback.y, fallback.z),
    ])
    return { curve, sampledPath: validWaypoints.map(pt => ({ ...pt })) }
  }
  const tension = Number.isFinite(options.tension) ? Math.min(1, Math.max(0, options.tension!)) : 0.45
  const samplesPerSegment = Number.isSafeInteger(options.samplesPerSegment) && options.samplesPerSegment! >= 2
    ? options.samplesPerSegment!
    : 4
  const points3 = validWaypoints.map(pt => new THREE.Vector3(pt.x, pt.y, pt.z))
  const curve = new THREE.CatmullRomCurve3(points3, Boolean(options.closed), 'catmullrom', tension)
  const totalSamples = Math.max(2, (validWaypoints.length - 1) * samplesPerSegment)
  const sampledPath = curve.getPoints(totalSamples).map(vec => ({
    x: vec.x,
    y: vec.y,
    z: vec.z,
  }))
  return { curve, sampledPath }
}

/**
 * Smooths a multi-waypoint water route with `THREE.CatmullRomCurve3` while verifying
 * that every sampled spline chord remains obstacle-safe inside `waterBounds` (`AQ-97` AC #1).
 * Falls back to the original route if any spline chord would clip rock or glass bounds.
 */
export function smoothWaterRouteWithCatmullRom(
  waypoints: readonly Vec3[],
  waterBounds: AxisAlignedBox,
  obstacles: readonly SolidObstacleVolume[],
  fishClearanceRadius: number,
  options: CatmullRomSwimCurveOptions = {},
): Vec3[] {
  if (waypoints.length < 3) return waypoints.map(pt => ({ ...pt }))
  const { sampledPath } = generateCatmullRomSwimCurve(waypoints, options)
  for (let i = 1; i < sampledPath.length; i++) {
    if (
      !isWaterSegmentSafe({
        start: sampledPath[i - 1]!,
        target: sampledPath[i]!,
        waterBounds,
        obstacles,
        fishClearanceRadius,
      })
    ) {
      return waypoints.map(pt => ({ ...pt }))
    }
  }
  return sampledPath
}

/**
 * Evaluates the swim-speed-synchronized local body flexion rate (`AQ-97` AC #2, #5).
 * Returns 0 synchronously when paused or under `prefers-reduced-motion`.
 */
export function evaluateSwimSpeedSynchronizedFlexRate(
  speedMps: number,
  cruiseSpeedMps: number,
  animationPlaybackRate = 1,
  options: { paused?: boolean; reducedMotion?: boolean } = {},
): number {
  if (options.paused || options.reducedMotion) return 0
  const safeSpeed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0
  const safeCruise = Number.isFinite(cruiseSpeedMps) && cruiseSpeedMps > 0 ? cruiseSpeedMps : 0.35
  const safePlayback = Number.isFinite(animationPlaybackRate) ? Math.max(0, animationPlaybackRate) : 1
  const normalizedSpeed = Math.min(2.5, safeSpeed / safeCruise)
  return (0.55 + Math.min(1.7, normalizedSpeed * 1.15)) * safePlayback
}

export type MeshNavigationConfig = {
  /** World positions, bounds and collider queries share meter units in mesh mode. */
  units: 'meter'
  spacingM: number
  budget: MeshNavigationBudget
  movementBudget: MeshNavigationWorkBudget
  queryCapsule?: CapsuleClearanceQuery
}
export type WaterHabitat = { bounds: AxisAlignedBox; maxAbsXAtDepth?: MaxAbsXAtDepth; obstacles: SolidObstacleVolume[]; anchors: HabitatAnchorLocation[]; meshNavigation?: MeshNavigationConfig }
export type SwimmingFish = {
  id: string; speciesId: string; behavior: FishBehaviorInstance; position: Vec3
  yaw: number; pitch: number; bank: number; speed: number; clearance: number
  route: readonly Vec3[]; waypoint: number; random: number; startleSeconds: number
  routeGeneration: number; targetWait: number; navigationAnchor?: HabitatAnchor
  extensions: ReturnType<typeof createFishExtensionRuntime>; animationPlaybackRate: number
  turnKinematics: FishTurnKinematics
  /** Explicit world-meter query radius; legacy `clearance` is not metric. */
  collisionRadiusM?: number
  /** Cumulative active simulation time in seconds for synchronized school station shifts. */
  simulationSeconds?: number
}
export type SwimmingFishCollisionOptions = { collisionRadiusM?: number; initialYaw?: number }
export const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
/** AQ-49 AC #6: pitch bounds per mode. Legacy/AABB keeps the ±0.28 rad clamp;
 * metric (mesh) mode follows the true rawTarget pitch, bounded to ±π/2 and
 * rate-limited to 1.2 rad/s per substep (AQ-65 Root-approved iteration). */
export const MAX_PITCH_RAD_LEGACY = 0.28
export const MAX_PITCH_RAD_METRIC = Math.PI / 2
export const MAX_PITCH_RATE_RAD_PER_SEC_METRIC = 1.2
export function seedForId(id: string) { let seed = 2166136261; for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619); return seed >>> 0 }

/**
 * Anchor-approach clearance (AQ-82 AC #3): navigation to and holding at a
 * habitat anchor uses the fish's physical body radius plus a small margin,
 * not the legacy 0.5 m habitat clearance. The anchor is a measured point
 * (socket-derived, or a ledge/burrow placed proud of the rock), so the
 * comfort envelope would strand the fish outside the interaction zone it
 * is supposed to enter; the body radius is the true collision size (AQ-85).
 */
export function anchorApproachClearanceM(fish: SwimmingFish): number {
  return fishBodyRadiusM(fish.speciesId) + ANCHOR_APPROACH_MARGIN_M
}
/** A fish within this distance of a compatible anchor counts as "at" it. */
export const ANCHOR_HOLD_RADIUS_M = 0.8
/** How often a fish holding at an anchor re-checks that it should stay. */
export const ANCHOR_HOLD_REFRESH_SECONDS = 0.25

/**
 * Nearest compatible anchor location of `anchor` within holding range, or
 * undefined. Compatibility is the profile check from AQ-45 (never a
 * substituted anchor type), plus the location's own species list.
 */
function nearestCompatibleAnchor(fish: SwimmingFish, habitat: WaterHabitat, anchor: HabitatAnchor): HabitatAnchorLocation | undefined {
  let best: HabitatAnchorLocation | undefined
  let bestDistance = Infinity
  for (const location of habitat.anchors) {
    if (location.anchor !== anchor || !isSpeciesCompatibleWithAnchor(fish.speciesId, location)) continue
    const dist = distance(location.position, fish.position)
    if (dist < bestDistance) { best = location; bestDistance = dist }
  }
  return bestDistance <= ANCHOR_HOLD_RADIUS_M ? best : undefined
}
function hasCompatibleAnchor(fish: SwimmingFish, habitat: WaterHabitat, anchor: HabitatAnchor): boolean {
  return habitat.anchors.some(location => location.anchor === anchor && isSpeciesCompatibleWithAnchor(fish.speciesId, location))
}

/**
 * Clearance for this fish's navigation right now (AABB mode only; mesh mode
 * already navigates with the physical capsule radius). Reduced while the
 * fish is en route to an anchor, while it is holding at one, and while it
 * is already inside the legacy envelope (escape rule: a fish that nestled
 * close to the rock must be able to swim back out with body clearance
 * instead of being stranded by its own comfort envelope).
 */
function effectiveClearanceM(fish: SwimmingFish, habitat: WaterHabitat): number {
  if (habitat.meshNavigation !== undefined) return fish.clearance
  if (fish.navigationAnchor) return anchorApproachClearanceM(fish)
  if (fish.behavior.targetAnchor && nearestCompatibleAnchor(fish, habitat, fish.behavior.targetAnchor)) {
    return anchorApproachClearanceM(fish)
  }
  if (!isWaterSegmentSafe({ start: fish.position, target: fish.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: fish.clearance, maxAbsXAtDepth: habitat.maxAbsXAtDepth })) {
    return anchorApproachClearanceM(fish)
  }
  return fish.clearance
}

/**
 * Applies the species-specific anchor-interaction pose (AQ-82 AC #4) when a
 * fish is holding at a compatible anchor: nestling in a host anemone,
 * sheltering among branching coral, perching on a rock ledge, grazing near
 * a coral base, or hovering at a sand burrow. The fish drifts toward the
 * collision-checked interaction target in small bounded steps (never a snap,
 * never forced through rock), its pitch blends toward the interaction pose,
 * and a burrow lookout yaw-locks facing the open water in front of the tank
 * (yaw 0 = +z, toward the viewer). Runs only with no active route and no
 * startle: a travelling or fleeing fish is not mid-interaction. Reduced
 * motion freezes the interaction cycle (a fixed pose, not travel).
 */
function applyAnchorInteraction(fish: SwimmingFish, habitat: WaterHabitat, dt: number, reducedMotion = false): void {
  if (fish.startleSeconds > 0) return
  if (fish.route.length > 0 && fish.waypoint < fish.route.length) return
  const targetAnchor = fish.behavior.targetAnchor
  if (!targetAnchor) return
  const location = nearestCompatibleAnchor(fish, habitat, targetAnchor)
  if (!location) return
  const offset = evaluateAnchorInteractionOffset({
    speciesId: fish.speciesId,
    location,
    state: fish.behavior.state,
    elapsedSeconds: fish.behavior.stateElapsedSeconds,
    paused: false,
    reducedMotion,
  })
  if (!offset) return
  const clearance = anchorApproachClearanceM(fish)
  const target = resolveSafeAnchorInteractionTarget({
    currentPosition: fish.position,
    location,
    offset,
    waterBounds: habitat.bounds,
    obstacles: habitat.obstacles,
    fishClearanceRadius: fish.clearance,
    interactionClearanceRadius: clearance,
  })
  if (!target) return
  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  const cruise = fish.behavior.variation.cruiseSpeedTankWidthsPerSecond * (habitat.bounds.max.x - habitat.bounds.min.x)
  const maxStep = Math.max(0.005, cruise * dt * 0.5)
  const dx = target.x - fish.position.x, dy = target.y - fish.position.y, dz = target.z - fish.position.z
  const dist = Math.hypot(dx, dy, dz)
  if (dist > 1e-9) {
    const step = Math.min(dist, maxStep)
    const candidate = {
      x: fish.position.x + (dx / dist) * step,
      y: fish.position.y + (dy / dist) * step,
      z: fish.position.z + (dz / dist) * step,
    }
    if (movementSafety(fish, habitat, candidate, clearance) === 'clear') fish.position = candidate
  }
  fish.pitch += (offset.pitchOffsetRad - fish.pitch) * Math.min(1, dt * 2)
  if (offset.yawLockToEntrance) {
    const delta = Math.atan2(Math.sin(0 - fish.yaw), Math.cos(0 - fish.yaw))
    const maxTurn = fish.behavior.variation.turnDegreesPerSecond * Math.PI / 180 * dt
    fish.yaw += clamp(delta, -maxTurn, maxTurn)
  }
}
function random(fish: SwimmingFish) { fish.random = (Math.imul(fish.random, 1664525) + 1013904223) >>> 0; return fish.random / 4294967296 }
type LateralSector = -1 | 0 | 1
const IDLE_LOCAL_RADIUS_M = 1.1
const SCHOOL_STATION_EPOCH_SECONDS = 25

function leadServiceId(fishId: string): string {
  const separator = fishId.indexOf('::schoolmate-')
  return separator >= 0 ? fishId.slice(0, separator) : fishId
}

function defaultHomeAnchorSeed(fish: SwimmingFish): number {
  if (isGroupSchoolingSpecies(fish.speciesId)) {
    // All conspecific schooling peers steer toward each other in Boids, so sharing
    // one species-wide home station prevents members from pulling against each
    // other into the center gap while keeping distinct schooling species on
    // balanced sides.
    return seedForId(fish.speciesId)
  }
  return seedForId(leadServiceId(fish.id))
}

function schoolStationState(fish: SwimmingFish): {
  seed: number
  side: LateralSector
  xFraction: number
  yFraction: number
  zFraction: number
} {
  const simulationSeconds = fish.simulationSeconds ?? 0
  const epoch = Math.max(0, Math.floor(simulationSeconds / SCHOOL_STATION_EPOCH_SECONDS))
  const flankEpoch = Math.max(0, Math.floor(simulationSeconds / 90))
  const baseSeed = defaultHomeAnchorSeed(fish)
  const seed = (baseSeed ^ Math.imul(epoch, 0x9e3779b1)) >>> 0
  const initialSideBit = baseSeed & 1
  const shiftBit = flankEpoch === 0 ? 0 : (Math.imul(flankEpoch, 0x85ebca6b) ^ (baseSeed >>> 16)) & 1
  const side: LateralSector = (initialSideBit ^ shiftBit) === 0 ? -1 : 1
  const unit1 = ((seed >>> 8) & 0xff) / 255
  const unit2 = ((seed >>> 16) & 0xff) / 255
  const unit3 = ((seed >>> 24) & 0xff) / 255
  // Keep a school's default station anchored on a tank flank (left or right)
  // rather than the middle open gap, and well forward of the reef islands'
  // collision envelope (z <= 0.25 + clearance).
  const xFraction = side === -1 ? 0.10 + unit1 * 0.16 : 0.74 + unit1 * 0.16
  const yFraction = 0.25 + unit2 * 0.5
  const zFraction = 0.78 + unit3 * 0.16
  return { seed, side, xFraction, yFraction, zFraction }
}

function solitaryHomeSector(fish: SwimmingFish): LateralSector {
  const unit = (Math.imul(defaultHomeAnchorSeed(fish), 0x85ebca6b) >>> 0) / 4294967296
  return unit < 0.28 ? -1 : unit < 0.60 ? 0 : 1
}

function chooseLateralSector(fish: SwimmingFish, habitat: WaterHabitat): LateralSector {
  if (isGroupSchoolingSpecies(fish.speciesId)) {
    return schoolStationState(fish).side
  }
  const homeSector = solitaryHomeSector(fish)
  const leftCutoff = homeSector === -1 ? 0.46 : homeSector === 1 ? 0.34 : 0.38
  const centerCutoff = homeSector === -1 ? 0.66 : homeSector === 1 ? 0.54 : 0.62
  const draw = random(fish)
  let sector: LateralSector = draw < leftCutoff ? -1 : draw < centerCutoff ? 0 : 1
  const centerX = (habitat.bounds.min.x + habitat.bounds.max.x) * .5
  const sideThreshold = (habitat.bounds.max.x - habitat.bounds.min.x) * .08
  const currentSide: LateralSector = fish.position.x < centerX - sideThreshold ? -1 : fish.position.x > centerX + sideThreshold ? 1 : 0
  if (currentSide !== 0 && sector === -currentSide && random(fish) < .6) sector = currentSide
  return sector
}

function safeLateralRange(habitat: WaterHabitat, z: number, clearance: number): [number, number] | undefined {
  let maxAbsX = Math.max(Math.abs(habitat.bounds.min.x), Math.abs(habitat.bounds.max.x))
  if (habitat.maxAbsXAtDepth) {
    try { maxAbsX = habitat.maxAbsXAtDepth(z) } catch { return undefined }
  }
  if (!Number.isFinite(maxAbsX) || maxAbsX < clearance) return undefined
  const min = Math.max(habitat.bounds.min.x + clearance, -maxAbsX + clearance)
  const max = Math.min(habitat.bounds.max.x - clearance, maxAbsX - clearance)
  return min <= max ? [min, max] : undefined
}

function lateralClearanceForFish(fish: SwimmingFish, habitat: WaterHabitat, collisionClearance: number): number {
  return habitat.maxAbsXAtDepth ? Math.max(fish.clearance, collisionClearance) : collisionClearance
}

function sampleFreeWaterTarget(
  fish: SwimmingFish,
  habitat: WaterHabitat,
  clearance: number,
  depthRange: readonly [number, number],
  sector: LateralSector,
  localLoiter: boolean,
): Vec3 | undefined {
  const { min, max } = habitat.bounds
  const isSchool = isGroupSchoolingSpecies(fish.speciesId)
  const preferForeReefZ = isSchool || habitat.obstacles.length > 0 || (max.z - min.z) > 3.5
  const zSpan = max.z - min.z - 2 * clearance
  if (zSpan < 0) return undefined

  let y: number
  let z: number
  if (isSchool) {
    const station = schoolStationState(fish)
    const bandSpan = depthRange[1] - depthRange[0]
    const bandCenter = depthRange[0] + (0.3 + 0.4 * station.yFraction) * bandSpan
    const jitter = (random(fish) - 0.5) * Math.min(0.18, bandSpan * 0.6)
    const depth = clamp(bandCenter + jitter, depthRange[0], depthRange[1])
    y = clamp(max.y - depth * (max.y - min.y), min.y + clearance, max.y - clearance)
    const zFraction = clamp(station.zFraction + (random(fish) - 0.5) * 0.12, 0.75, 0.96)
    z = min.z + clearance + zFraction * zSpan
  } else {
    const depth = depthRange[0] + random(fish) * (depthRange[1] - depthRange[0])
    y = clamp(max.y - depth * (max.y - min.y), min.y + clearance, max.y - clearance)
    const zDraw = random(fish)
    const zFraction = preferForeReefZ
      ? zDraw < 0.25
        ? 0.14 + zDraw * 1.1
        : 0.68 + (zDraw - 0.25) * 0.36
      : zDraw
    z = min.z + clearance + zFraction * zSpan
  }

  const safeRange = safeLateralRange(habitat, z, lateralClearanceForFish(fish, habitat, clearance))
  if (!safeRange) return undefined
  let [xMin, xMax] = safeRange

  if (isSchool) {
    const station = schoolStationState(fish)
    const width = xMax - xMin
    const sectorCenterFraction = sector === -1 ? 0.19 : sector === 0 ? 0.5 : 0.81
    const baseFraction = sector === station.side ? station.xFraction : sectorCenterFraction
    const schoolAnchorX = xMin + width * baseFraction
    const halfSpread = localLoiter ? Math.min(0.45, width * 0.08) : Math.min(0.7, width * 0.12)
    const memberBias = fish.behavior.variation.homeOffsetTankWidths * width * 0.4
      * Math.cos(fish.behavior.variation.phaseOffsetRadians)
    const centerX = clamp(schoolAnchorX + memberBias, xMin, xMax)
    const minWindow = Math.max(xMin, centerX - halfSpread)
    const maxWindow = Math.min(xMax, centerX + halfSpread)
    if (minWindow > maxWindow) return undefined
    return { x: minWindow + random(fish) * (maxWindow - minWindow), y, z }
  }

  if (localLoiter) {
    xMin = Math.max(xMin, fish.position.x - IDLE_LOCAL_RADIUS_M)
    xMax = Math.min(xMax, fish.position.x + IDLE_LOCAL_RADIUS_M)
  } else {
    const width = xMax - xMin
    const lower = sector === -1 ? 0 : sector === 0 ? 1 / 3 : 2 / 3
    const upper = sector === -1 ? 1 / 3 : sector === 0 ? 2 / 3 : 1
    xMin = xMin + width * lower
    xMax = xMin + width * (upper - lower)
  }
  if (xMin > xMax) return undefined
  return { x: xMin + random(fish) * (xMax - xMin), y, z }
}

function routeInput(fish: SwimmingFish, habitat: WaterHabitat, target: Vec3, clearanceOverride?: number) {
  const collisionClearance = clearanceOverride ?? fish.clearance
  return {
    start: fish.position,
    target,
    waterBounds: habitat.bounds,
    obstacles: habitat.obstacles,
    fishClearanceRadius: collisionClearance,
    maxAbsXAtDepth: habitat.maxAbsXAtDepth,
    lateralClearanceRadius: lateralClearanceForFish(fish, habitat, collisionClearance),
  }
}
function validMeshNavigation(fish: SwimmingFish, habitat: WaterHabitat): habitat is WaterHabitat & { meshNavigation: MeshNavigationConfig } {
  const config = habitat.meshNavigation
  const budgetKeys: readonly (keyof MeshNavigationBudget)[] = ['maxLatticeNodes', 'maxExpandedNodes', 'maxCollisionQueries', 'maxNodeVisits', 'maxTriangleTests']
  const finiteBounds = [habitat.bounds.min.x, habitat.bounds.min.y, habitat.bounds.min.z, habitat.bounds.max.x, habitat.bounds.max.y, habitat.bounds.max.z].every(Number.isFinite)
  return Boolean(config && config.units === 'meter' && typeof config.queryCapsule === 'function'
    && Number.isFinite(config.spacingM) && config.spacingM > 0
    && Number.isFinite(fish.collisionRadiusM) && fish.collisionRadiusM! >= 0
    && config.budget && typeof config.budget === 'object'
    && budgetKeys.every(key => Number.isSafeInteger(config.budget[key]) && config.budget[key] > 0)
    && config.movementBudget && typeof config.movementBudget === 'object'
    && Number.isSafeInteger(config.movementBudget.maxNodeVisits) && config.movementBudget.maxNodeVisits > 0
    && Number.isSafeInteger(config.movementBudget.maxTriangleTests) && config.movementBudget.maxTriangleTests > 0
    && finiteBounds
    && habitat.bounds.min.x < habitat.bounds.max.x && habitat.bounds.min.y < habitat.bounds.max.y && habitat.bounds.min.z < habitat.bounds.max.z
    && habitat.bounds.max.x - habitat.bounds.min.x > 2 * fish.collisionRadiusM!
    && habitat.bounds.max.y - habitat.bounds.min.y > 2 * fish.collisionRadiusM!
    && habitat.bounds.max.z - habitat.bounds.min.z > 2 * fish.collisionRadiusM!)
}
type MutableMeshNavigationBudget = { -readonly [Key in keyof MeshNavigationBudget]: number }
type PlanBudget = { remaining: MutableMeshNavigationBudget }
function newPlanBudget(config: MeshNavigationConfig): PlanBudget { return { remaining: { ...config.budget } } }
function budgetAvailable(budget: PlanBudget): boolean { return Object.values(budget.remaining).every(value => value > 0) }
function spendPlanBudget(budget: PlanBudget, work: MeshNavigationWorkReport): boolean {
  const withinPerSearchLatticeCap = work.latticeNodes <= budget.remaining.maxLatticeNodes
  budget.remaining.maxExpandedNodes = Math.max(0, budget.remaining.maxExpandedNodes - work.expandedNodes)
  budget.remaining.maxCollisionQueries = Math.max(0, budget.remaining.maxCollisionQueries - work.collisionQueries)
  budget.remaining.maxNodeVisits = Math.max(0, budget.remaining.maxNodeVisits - work.nodeVisits)
  budget.remaining.maxTriangleTests = Math.max(0, budget.remaining.maxTriangleTests - work.triangleTests)
  return withinPerSearchLatticeCap
}
function validMeshRequest(fish: SwimmingFish, request: NonNullable<ReturnType<typeof getNavigationRequest>>) {
  const profile = getSpeciesBehaviorProfile(request.speciesId)
  const stateConfig = profile?.states[request.state]
  const declaredAnchor = stateConfig ? ('destination' in stateConfig ? stateConfig.destination : stateConfig.anchor) : undefined
  return request.instanceId === fish.id && request.speciesId === fish.speciesId && Boolean(profile && profile.anchors.includes(request.anchor) && declaredAnchor === request.anchor)
}
function extensionSnapshot(fish: SwimmingFish): FishExtensionSnapshot {
  return Object.freeze({
    instanceId: fish.id, speciesId: fish.speciesId, state: fish.behavior.state,
    position: Object.freeze({ ...fish.position }), yaw: fish.yaw, pitch: fish.pitch, bank: fish.bank, speed: fish.speed,
  })
}
export function createSwimmingFish(id: string, speciesId: string, position: Vec3, clearance = .42, extensions: FishExtensionConfig = EMPTY_FISH_EXTENSIONS, collision: SwimmingFishCollisionOptions = {}): SwimmingFish {
  const initialYaw = collision.initialYaw ?? Math.PI / 2
  if (!Number.isFinite(initialYaw)) throw new RangeError('Fish initial yaw must be finite.')
  let behavior = createFishBehaviorInstance(id, speciesId, seedForId(id))
  // Begin at a cruising phase of the existing state machine, rather than making
  // every newly loaded service wait through the same idle window.
  for (let i = 0; behavior.state === 'idle' && i < 130; i++) behavior = advanceFishBehavior(behavior, .25)
  const initialSnapshot: FishExtensionSnapshot = Object.freeze({
    instanceId: id, speciesId, state: behavior.state, position: Object.freeze({ ...position }),
    yaw: initialYaw, pitch: 0, bank: 0, speed: 0,
  })
  return {
    id, speciesId, behavior, position: { ...position }, yaw: initialYaw, pitch: 0, bank: 0, speed: 0, clearance,
    route: [], waypoint: 1, random: seedForId(id), startleSeconds: 0, routeGeneration: -1, targetWait: 0,
    extensions: createFishExtensionRuntime(extensions, initialSnapshot), animationPlaybackRate: 1,
    collisionRadiusM: collision.collisionRadiusM,
    simulationSeconds: 0,
    turnKinematics: {
      yawRateRadPerSec: 0,
      smoothedYawRate: 0,
      turnCurvature: 0,
      turnCurvatureDelayed: 0,
      turnPhase: 0,
      maneuverStage: 'none',
      exitStrokeSeconds: 0,
      speed: 0,
      startleSeconds: 0,
    },
  }
}
export function startleFish(fish: SwimmingFish, habitat: WaterHabitat) {
  const candidate = dispatchBehaviorEvent(fish.behavior, { type: 'fish-activation', instanceId: fish.id, trigger: fish.speciesId === 'yellow-tang' ? 'high-effort-cue' : 'threat-cue' })
  // A local evasive acceleration does not invent an absent anemone/refuge or
  // strand the runtime in an anchored retreat which can never report arrival.
  if (!candidate.targetAnchor || habitat.anchors.some(anchor => anchor.anchor === candidate.targetAnchor && (!anchor.compatibleSpecies || anchor.compatibleSpecies.some(id => id === fish.speciesId)))) fish.behavior = candidate
  fish.startleSeconds = .95; fish.route = []; fish.targetWait = 0
}
function installMeshRoute(fish: SwimmingFish, path: readonly Vec3[], anchor?: HabitatAnchor) {
  fish.route = path
  fish.waypoint = 1
  fish.navigationAnchor = anchor
}
function completeRouteWaypoint(fish: SwimmingFish) {
  fish.waypoint++
  if (fish.waypoint >= fish.route.length && fish.navigationAnchor) {
    fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, 'arrived')
    fish.navigationAnchor = undefined
    fish.targetWait = 1.2
  }
}
function reportMeshNavigationFailure(fish: SwimmingFish, request: NonNullable<ReturnType<typeof getNavigationRequest>>, outcome: 'blocked' | 'unavailable') {
  fish.routeGeneration = request.generation
  fish.navigationAnchor = undefined
  fish.route = []
  fish.behavior = reportNavigationOutcome(fish.behavior, request.generation, request.anchor, outcome)
  fish.targetWait = .7
}
function insideMeshWater(fish: SwimmingFish, habitat: WaterHabitat, point: Vec3): boolean {
  const radiusM = fish.collisionRadiusM!
  return isWithinDepthAwareWaterBounds(point, habitat.bounds, radiusM, habitat.maxAbsXAtDepth, lateralClearanceForFish(fish, habitat, radiusM))
}
function selectFreeWaterAttemptTarget(
  fish: SwimmingFish,
  habitat: WaterHabitat,
  clearance: number,
  lateralClearance: number,
  depthRange: readonly [number, number],
  sector: LateralSector,
  fallbackSectors: readonly LateralSector[],
  localLoiter: boolean,
  minTargetDistance: number,
  attempt: number,
): Vec3 | undefined {
  const { min, max } = habitat.bounds
  const isSchool = isGroupSchoolingSpecies(fish.speciesId)
  // Prefer the station, but let a blocked school use another safe sector.
  const targetSector = attempt < 8
    ? sector
    : fallbackSectors[(attempt - 8) % fallbackSectors.length]!
  const effectiveLoiter = localLoiter && !(isSchool && attempt >= 6)
  let target: Vec3 | undefined
  if (fish.startleSeconds > 0) {
    const evasiveYaw = fish.yaw + (attempt % 2 ? -1 : 1) * (.7 + random(fish) * .4)
    const z = clamp(fish.position.z + Math.cos(evasiveYaw) * 1.4, min.z + clearance, max.z - clearance)
    const safeRange = safeLateralRange(habitat, z, lateralClearance)
    if (safeRange) target = {
      x: clamp(fish.position.x + Math.sin(evasiveYaw) * 1.4, safeRange[0], safeRange[1]),
      y: clamp(fish.position.y + .15, min.y + clearance, max.y - clearance),
      z,
    }
  } else {
    target = sampleFreeWaterTarget(fish, habitat, clearance, depthRange, targetSector, effectiveLoiter)
  }
  if (!target || distance(fish.position, target) < minTargetDistance) return undefined
  const forwardCheckAttempts = isSchool ? 2 : 6
  if (fish.startleSeconds <= 0 && attempt < forwardCheckAttempts && fish.speed > 0.05) {
    const toDx = target.x - fish.position.x
    const toDz = target.z - fish.position.z
    const toHoriz = Math.hypot(toDx, toDz)
    const forwardDot = toHoriz > 1e-6 ? (toDx * Math.sin(fish.yaw) + toDz * Math.cos(fish.yaw)) / toHoriz : 1
    if (forwardDot < 0.25) return undefined
  }
  return target
}

function planMesh(fish: SwimmingFish, habitat: WaterHabitat) {
  const mesh = habitat.meshNavigation!
  const request = getNavigationRequest(fish.behavior)
  if (!validMeshNavigation(fish, habitat)) {
    fish.route = []
    fish.targetWait = .7
    if (request && fish.routeGeneration !== request.generation && fish.startleSeconds <= 0) reportMeshNavigationFailure(fish, request, 'unavailable')
    return
  }

  const radiusM = fish.collisionRadiusM!, planBudget = newPlanBudget(mesh)
  const lateralClearanceRadius = lateralClearanceForFish(fish, habitat, radiusM)
  if (request && fish.routeGeneration !== request.generation && fish.startleSeconds <= 0) {
    const profile = getSpeciesBehaviorProfile(request.speciesId)
    const candidates = validMeshRequest(fish, request) && profile
      ? orderHabitatAnchorsForRequest(request, habitat.bounds, habitat.anchors.filter(location => location.anchor === request.anchor
        && (!location.compatibleSpecies || location.compatibleSpecies.includes(profile.speciesId))
        && insideMeshWater(fish, habitat, location.position)))
      : []
    let failure: 'blocked' | 'unavailable' = candidates.length ? 'blocked' : 'unavailable'
    for (const candidate of candidates) {
      if (!budgetAvailable(planBudget)) { failure = 'unavailable'; break }
      const result = findMeshRoute({ start: fish.position, target: candidate.position, waterBounds: habitat.bounds,
        fishClearanceRadius: radiusM, spacingM: mesh.spacingM, queryCapsule: mesh.queryCapsule!, budget: planBudget.remaining,
        maxAbsXAtDepth: habitat.maxAbsXAtDepth, lateralClearanceRadius })
      const withinBudget = spendPlanBudget(planBudget, result.work)
      if (!withinBudget) { failure = 'unavailable'; break }
      if (result.status === 'route') {
        fish.routeGeneration = request.generation
        installMeshRoute(fish, result.path, request.anchor)
        return
      }
      if (result.status !== 'blocked') failure = 'unavailable'
      if (result.status === 'work-limit' && result.reason.startsWith('lattice-')) break
    }
    fish.routeGeneration = request.generation
    fish.navigationAnchor = undefined
    fish.behavior = reportNavigationOutcome(fish.behavior, request.generation, request.anchor, failure)
  }

  // AQ-82 AC #4 (mesh mode): same hold-at-anchor rule as the AABB planner —
  // a fish that arrived at its state's anchor stays there until the state
  // changes, with the interaction pose applied per substep.
  if (request && fish.routeGeneration === request.generation && fish.startleSeconds <= 0
    && fish.behavior.targetAnchor === request.anchor
    && nearestCompatibleAnchor(fish, habitat, request.anchor)) {
    fish.route = []
    fish.targetWait = ANCHOR_HOLD_REFRESH_SECONDS
    return
  }

  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  const { min, max } = habitat.bounds, r = radiusM
  const depthRange = evaluateTieredVerticalDepthRange(fish.speciesId, habitat.bounds, r)?.normalizedDepthRange ?? profile.depthRange
  const sector = chooseLateralSector(fish, habitat)
  const fallbackSectors = ([-1, 0, 1] as const).filter(candidate => candidate !== sector)
  const localLoiter = fish.behavior.state === 'idle' && (!fish.behavior.targetAnchor || !hasCompatibleAnchor(fish, habitat, fish.behavior.targetAnchor))
  const minTargetDistance = isGroupSchoolingSpecies(fish.speciesId)
    ? Math.min(0.35, Math.max(0.18, (max.x - min.x) * 0.08))
    : 0.7
  for (let attempt = 0; attempt < 12; attempt++) {
    if (!budgetAvailable(planBudget)) break
    const target = selectFreeWaterAttemptTarget(
      fish,
      habitat,
      r,
      lateralClearanceRadius,
      depthRange,
      sector,
      fallbackSectors,
      localLoiter,
      minTargetDistance,
      attempt,
    )
    if (!target) continue
    const result = findMeshRoute({ start: fish.position, target, waterBounds: habitat.bounds,
      fishClearanceRadius: r, spacingM: mesh.spacingM, queryCapsule: mesh.queryCapsule!, budget: planBudget.remaining,
      maxAbsXAtDepth: habitat.maxAbsXAtDepth, lateralClearanceRadius })
    const withinBudget = spendPlanBudget(planBudget, result.work)
    if (!withinBudget) break
    if (result.status === 'route') { installMeshRoute(fish, result.path); return }
    if (result.status === 'work-limit' && result.reason.startsWith('lattice-')) break
  }
  fish.targetWait = .7
}
function plan(fish: SwimmingFish, habitat: WaterHabitat) {
  if (habitat.meshNavigation !== undefined) { planMesh(fish, habitat); return }
  const request = getNavigationRequest(fish.behavior)
  if (request && fish.routeGeneration !== request.generation && fish.startleSeconds <= 0) {
    // AQ-82 AC #3: anchor routes use body-radius clearance — the anchor is a
    // measured point, and the legacy 0.5 m envelope would strand the fish
    // outside the interaction zone it is supposed to enter.
    const approachClearance = anchorApproachClearanceM(fish)
    const result = resolveHabitatRoute({ request, start: fish.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, anchorLocations: habitat.anchors, fishClearanceRadius: approachClearance, maxAbsXAtDepth: habitat.maxAbsXAtDepth, lateralClearanceRadius: lateralClearanceForFish(fish, habitat, approachClearance) })
    fish.routeGeneration = request.generation
    if (result.status === 'route') { fish.route = result.path; fish.waypoint = 1; fish.navigationAnchor = request.anchor; return }
    fish.behavior = reportNavigationOutcome(fish.behavior, request.generation, request.anchor, result.status)
  }
  // AQ-82 AC #4: a fish that has already arrived at its state's anchor stays
  // there — holding, with the interaction pose applied per substep — instead
  // of wandering off to a random target mid-state. The hold refreshes on a
  // short timer so a state change re-routes promptly.
  if (request && fish.routeGeneration === request.generation && fish.startleSeconds <= 0
    && fish.behavior.targetAnchor === request.anchor
    && nearestCompatibleAnchor(fish, habitat, request.anchor)) {
    fish.route = []
    fish.targetWait = ANCHOR_HOLD_REFRESH_SECONDS
    return
  }
  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  const { min, max } = habitat.bounds, r = fish.clearance + .08
  const depthRange = evaluateTieredVerticalDepthRange(fish.speciesId, habitat.bounds, r)?.normalizedDepthRange ?? profile.depthRange
  const sector = chooseLateralSector(fish, habitat)
  const fallbackSectors = ([-1, 0, 1] as const).filter(candidate => candidate !== sector)
  const localLoiter = fish.behavior.state === 'idle' && (!fish.behavior.targetAnchor || !hasCompatibleAnchor(fish, habitat, fish.behavior.targetAnchor))
  const minTargetDistance = isGroupSchoolingSpecies(fish.speciesId)
    ? Math.min(0.35, Math.max(0.18, (max.x - min.x) * 0.08))
    : 0.7
  for (let attempt = 0; attempt < 12; attempt++) {
    const target = selectFreeWaterAttemptTarget(
      fish,
      habitat,
      r,
      r,
      depthRange,
      sector,
      fallbackSectors,
      localLoiter,
      minTargetDistance,
      attempt,
    )
    if (!target) continue
    // AQ-82: a fish leaving an anchor zone it nestled into routes out with
    // the same body-radius clearance it arrived with (escape rule); open
    // water keeps the legacy envelope.
    const path = findWaterRoute(routeInput(fish, habitat, target, effectiveClearanceM(fish, habitat)))
    if (path) { fish.route = path; fish.waypoint = 1; fish.navigationAnchor = undefined; return }
  }
  fish.targetWait = .7
}
function movementSafety(fish: SwimmingFish, habitat: WaterHabitat, target: Vec3, clearanceOverride?: number): 'clear' | 'blocked' | 'unavailable' {
  if (habitat.meshNavigation === undefined) return isWaterSegmentSafe(routeInput(fish, habitat, target, clearanceOverride)) ? 'clear' : 'blocked'
  if (!validMeshNavigation(fish, habitat)) return 'unavailable'
  const start = { ...fish.position }, end = { ...target }, radiusM = fish.collisionRadiusM!
  // The mesh oracle checks rock geometry; the glass boundary remains a separate constraint.
  if (!insideMeshWater(fish, habitat, start) || !insideMeshWater(fish, habitat, end)) return 'blocked'
  const query = habitat.meshNavigation.queryCapsule
  const queryBudget = { ...habitat.meshNavigation.movementBudget }
  try {
    const result = query!({ ...start }, { ...end }, radiusM, { ...queryBudget })
    const validWork = result?.work && Number.isSafeInteger(result.work.nodeVisits) && result.work.nodeVisits >= 0
      && Number.isSafeInteger(result.work.triangleTests) && result.work.triangleTests >= 0
      && result.work.nodeVisits <= queryBudget.maxNodeVisits && result.work.triangleTests <= queryBudget.maxTriangleTests
    if (!validWork) return 'unavailable'
    return result.status === 'clear' || result.status === 'blocked' ? result.status : 'unavailable'
  } catch {
    return 'unavailable'
  }
}
function stepFishExtensions(fish: SwimmingFish, dt: number) {
  const result = fish.extensions.step(extensionSnapshot(fish), dt, true)
  fish.animationPlaybackRate = result.playbackRate
  for (const intent of result.behaviorIntents) fish.behavior = dispatchBehaviorEvent(fish.behavior, { ...intent, instanceId: fish.id })
}

export function stepSwimmingFish(fish: SwimmingFish, habitat: WaterHabitat, elapsed: number, stopped = false, options: { reducedMotion?: boolean } = {}) {
  if (stopped) return
  for (const dt of simulationSubsteps(elapsed)) {
    integrateSwimmingFish(fish, habitat, dt)
    stepFishExtensions(fish, dt)
    // AQ-82 AC #4: nestle/shelter/perch/graze while holding at an anchor.
    applyAnchorInteraction(fish, habitat, dt, options.reducedMotion)
  }
}

export type SchoolStepOptions = {
  /** Pause/reduced-motion freeze the steering nudge (the FSM route still advances, as in stepSwimmingFish). */
  paused?: boolean
  reducedMotion?: boolean
}

/**
 * Schooling heading influence (AQ-84): the horizontal cohesion + alignment
 * steering direction for one fish, fed into `integrateSwimmingFish` so the
 * fish turns toward the school under its own yaw/turn kinematics instead of
 * being translated sideways. `cruiseSpeed` is the mean speed of conspecific
 * peers (m/s); the integrator blends the fish's cruise toward it so a
 * lagging outer fish accelerates forward along its heading to catch up.
 */
export type SchoolingHeadingInfluence = {
  dx: number
  dz: number
  cruiseSpeed?: number
}

function schoolingPeer(fish: SwimmingFish): SchoolingPeer {
  return {
    id: fish.id,
    speciesId: fish.speciesId as SchoolingPeer['speciesId'],
    position: { ...fish.position },
    yaw: fish.yaw,
    speed: fish.speed,
    clearanceRadius: fish.clearance,
    // AQ-85: fish-to-fish separation uses the species-proportional physical
    // body radius; `clearance` stays the habitat-obstacle envelope and is
    // only used for segment safety against rocks/walls.
    bodyRadiusM: fishBodyRadiusM(fish.speciesId),
    startleSeconds: fish.startleSeconds,
  }
}

/**
 * Steps a whole school together (AQ-41 AC #1/#3/#4, AQ-44 AC #4/#5): the same
 * per-fish FSM + route integration as `stepSwimmingFish`, plus species-aware
 * Boids steering (`evaluateSchoolingSteering`) folded into the fish's own
 * locomotion (AQ-84). Steering is computed from a pre-move peer snapshot
 * taken once per substep, so results are order-independent and deterministic
 * for a given seed/frame. Cohesion/alignment steer the fish's heading: the
 * horizontal cohesion + alignment direction is passed into
 * `integrateSwimmingFish`, which rotates yaw toward it within the species
 * turn limit and drives the turn kinematics (bank, spine bend, body flex),
 * so outer fish turn and swim into the school instead of sliding sideways.
 * Only personal-space separation still translates the body, as a small
 * bounded nudge applied only when `movementSafety()` reports `clear` for
 * the resulting segment, and dropped — never forced — otherwise.
 * Cohesion/alignment apply only while the fish's motion intent is `hold` or
 * `travel` (idle/swim); separation applies in every state to every species.
 * A stopped fish (e.g. keyboard-focused) does not move but still counts as
 * a peer. `stopped` is either one flag for the whole school or one flag per
 * fish.
 */
export function stepSwimmingSchool(
  fishes: readonly SwimmingFish[],
  habitat: WaterHabitat,
  elapsed: number,
  stopped: readonly boolean[] | boolean = false,
  options: SchoolStepOptions = {},
) {
  const isStopped = (index: number) => Array.isArray(stopped) ? Boolean(stopped[index]) : stopped
  for (const dt of simulationSubsteps(elapsed)) {
    const peers = fishes.map(schoolingPeer)
    fishes.forEach((fish, index) => {
      if (isStopped(index)) return
      const intent = getMotionIntent(fish.behavior.state)
      const steering = evaluateSchoolingSteering({
        self: peers[index],
        peers,
        waterBounds: habitat.bounds,
        obstacles: habitat.obstacles,
        dt,
        paused: options.paused,
        reducedMotion: options.reducedMotion,
        cohesionAllowed: intent === 'hold' || intent === 'travel',
        isSegmentSafe: (_start, target) => movementSafety(fish, habitat, target) === 'clear',
      })
      // AQ-84: cohesion/alignment become a heading influence for the
      // integrator; the fish turns toward the school and closes the
      // distance by swimming forward along its new heading.
      const schoolDx = steering.cohesion.x + steering.alignment.x
      const schoolDz = steering.cohesion.z + steering.alignment.z
      const schooling: SchoolingHeadingInfluence | undefined =
        Math.hypot(schoolDx, schoolDz) > 1e-9
          ? { dx: schoolDx, dz: schoolDz, cruiseSpeed: meanConspecificPeerSpeed(peers, fish) }
          : undefined
      integrateSwimmingFish(fish, habitat, dt, schooling)
      // AQ-84: only separation still moves the body directly, as a small
      // bounded nudge while fish overlap; regular cohesion/alignment never
      // translate the fish.
      if (steering.separation.x || steering.separation.y || steering.separation.z) {
        const candidate = {
          x: fish.position.x + steering.separation.x,
          y: fish.position.y + steering.separation.y,
          z: fish.position.z + steering.separation.z,
        }
        if (movementSafety(fish, habitat, candidate) === 'clear') fish.position = candidate
      }
      stepFishExtensions(fish, dt)
      // AQ-82 AC #4: school members holding at an anchor get the same
      // interaction pose as solitary fish (nestle/shelter/perch/graze).
      applyAnchorInteraction(fish, habitat, dt, options.reducedMotion)
    })
  }
}

function meanConspecificPeerSpeed(peers: readonly SchoolingPeer[], fish: SwimmingFish): number | undefined {
  let total = 0
  let count = 0
  for (const peer of peers) {
    if (peer.id === fish.id || peer.speciesId !== fish.speciesId || peer.startleSeconds > 0) continue
    total += peer.speed
    count++
  }
  return count > 0 ? total / count : undefined
}

/**
 * Explicit, scoped group disturbance (AQ-41 AC #4 / AQ-44 AC #4): dispatches
 * a `group-disturbance` event with `instanceIds` set to exactly the
 * conspecific grouping-species members of this school — never the omitted
 * (all-fish) form, and never to solitary species. A chromis in `swim` retreats
 * to `branchingCoralRefuge` at ×1.7 per its profile; anthias has no retreat
 * state, so a disturbance leaves it on its existing idle/swim/forage cycle
 * (no retreat is invented). There is currently no live UI trigger for this —
 * a single service click must stay a single-fish `fish-activation` — so the
 * helper is the scoped event path for a future disturbance source, proven in
 * tests. It does not set `startleSeconds`: fleeing fish are already excluded
 * from cohesion/alignment by their `flee` motion intent.
 */
export function disturbSchool(fishes: readonly SwimmingFish[], speciesId: string, trigger: 'threat-cue' | 'high-effort-cue' = 'threat-cue'): void {
  const members = fishes.filter(fish => fish.speciesId === speciesId && isGroupSchoolingSpecies(fish.speciesId))
  if (!members.length) return
  const instanceIds = members.map(fish => fish.id)
  for (const fish of members) {
    fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'group-disturbance', instanceIds, trigger })
  }
}
function integrateSwimmingFish(fish: SwimmingFish, habitat: WaterHabitat, dt: number, schooling?: SchoolingHeadingInfluence) {
  // Configured mesh mode is fail-closed. Invalidate stale routes before they
  // can trigger arrival or movement through a legacy AABB fallback.
  if (habitat.meshNavigation !== undefined && !validMeshNavigation(fish, habitat)) {
    if (fish.navigationAnchor) fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, 'unavailable')
    fish.route = []; fish.speed = 0; fish.targetWait = .7; fish.navigationAnchor = undefined
  }
  if (habitat.meshNavigation !== undefined && validMeshNavigation(fish, habitat) && !insideMeshWater(fish, habitat, fish.position)) {
    if (fish.navigationAnchor) fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, 'blocked')
    fish.route = []; fish.speed = 0; fish.targetWait = .7; fish.navigationAnchor = undefined
  }
  fish.simulationSeconds = (fish.simulationSeconds ?? 0) + dt
  fish.behavior = advanceFishBehavior(fish.behavior, dt)
  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  // AQ-82 AC #3: while en route to an anchor, holding at one, or escaping
  // the legacy envelope after nestling close to the rock, this fish navigates
  // with body-radius clearance instead of the 0.5 m comfort envelope.
  const effectiveClearance = effectiveClearanceM(fish, habitat)
  // AQ-84: rotate the heading toward the schooling direction first, within
  // the species turn limit for this substep. The route turn below is then
  // capped by the remaining budget, so the total turn in one substep never
  // exceeds the species limit. Forward motion along the updated yaw (in the
  // main path) closes the distance to the school — no sideways translation.
  const schoolHeadingMag = schooling ? Math.hypot(schooling.dx, schooling.dz) : 0
  const schoolHeading = schoolHeadingMag > 1e-9 ? Math.atan2(schooling!.dx, schooling!.dz) : fish.yaw
  const schoolDelta = Math.atan2(Math.sin(schoolHeading - fish.yaw), Math.cos(schoolHeading - fish.yaw))
  const baseTurnRateRad = (fish.behavior.variation.turnDegreesPerSecond * Math.PI) / 180
  const minTurnRadiusM = Math.max(0.14, fishBodyRadiusM(fish.speciesId) * 4.5)
  const hasActiveRoute = fish.route.length > 0 && fish.waypoint < fish.route.length
  const schoolTurnShare = hasActiveRoute ? 0.42 : 1
  const schoolMaxTurn = computeMaxBiomechanicalYawRate(
    fish.speed,
    baseTurnRateRad,
    minTurnRadiusM,
    fish.startleSeconds,
    schoolDelta,
  ) * dt * schoolTurnShare
  const schoolTurn = clamp(schoolDelta, -schoolMaxTurn, schoolMaxTurn)
  fish.yaw += schoolTurn
  fish.startleSeconds = Math.max(0, fish.startleSeconds - dt); fish.targetWait -= dt
  if (fish.behavior.state === 'swim' && fish.speciesId === 'yellow-tang' && fish.behavior.stateElapsedSeconds > 2 && habitat.anchors.some(anchor => distance(anchor.position, fish.position) < .9) && fish.routeGeneration !== fish.behavior.navigationGeneration) {
    fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'behavior-opportunity', instanceId: fish.id, trigger: 'foraging-opportunity' })
  }
  const request = getNavigationRequest(fish.behavior)
  const urgentTransition = fish.behavior.state === 'retreat' || fish.behavior.state === 'burst'
  if (fish.startleSeconds <= 0 && fish.behavior.navigationGeneration !== fish.routeGeneration && (
    urgentTransition || (request && hasCompatibleAnchor(fish, habitat, request.anchor))
  )) {
    if (fish.route.length > 0) fish.targetWait = 0
    fish.route = []
    fish.navigationAnchor = undefined
    if (!request) fish.routeGeneration = fish.behavior.navigationGeneration
  }
  if ((!fish.route.length || fish.waypoint >= fish.route.length) && fish.targetWait <= 0) plan(fish, habitat)
  const rawTarget = fish.route[fish.waypoint]
  if (!rawTarget) {
    fish.speed *= Math.exp(-dt * 1.8)
    // Level out after a traveling turn; stationary school pivots do not
    // sustain the bank inherited from the preceding route.
    fish.bank *= Math.exp(-dt * 3.5)
    // AQ-84: with no route to follow the fish still turns in place toward
    // the school, and the turn kinematics record that turn.
    fish.turnKinematics = stepFishTurnKinematics(fish.turnKinematics, schoolTurn, dt, fish.speed, fish.startleSeconds, schoolDelta)
    return
  }
  const rawDx = rawTarget.x - fish.position.x, rawDy = rawTarget.y - fish.position.y, rawDz = rawTarget.z - fish.position.z, rawRemaining = Math.hypot(rawDx, rawDy, rawDz)
  // A fish that arrives at its waypoint at an angle flies past it: its turn
  // radius at approach speed (v/ω ≈ 0.2–0.6 m) dwarfs the arrival radius
  // (0.025 m; 0.00025 m for a mesh-mode final waypoint), so without a
  // "passed" rule it orbits the waypoint in a slowly tightening spiral —
  // ~600° of turning and 3–4 s per waypoint — the "stuck in a spiral" a
  // viewer sees as the fish circling one patch of water, turning head-on to
  // the camera on every orbit. While orbiting, the waypoint sits ~90° off
  // the fish's heading (tangent vs. radial); on a normal approach it sits
  // within ~45°. So a waypoint more than 60° off the heading, inside the
  // approach corridor (0.35 m, the radius that already triggers the
  // proximity turn boost), while the fish is actually travelling, counts as
  // arrived; the fish swims on instead of circling back. The rule is
  // horizontal-plane only: a waypoint mostly above or below the fish
  // (horizontal distance < half the total distance) is a climb/dive, not an
  // orbit, so it is never passed early. The speed floor keeps a fish
  // pivoting in place from skipping a waypoint it is about to turn toward.
  // The per-substep movement-safety checks stay the collision guard in both
  // modes, so passing a waypoint early can only cut a corner the fish could
  // already cut via the lookahead fillet, never an obstacle.
  const isFinalWaypoint = fish.waypoint + 1 >= fish.route.length
  const horizontalRemaining = Math.hypot(rawDx, rawDz)
  const waypointAbeam = horizontalRemaining > 0.4 * rawRemaining
    && (rawDx * Math.sin(fish.yaw) + rawDz * Math.cos(fish.yaw)) / Math.max(horizontalRemaining, 1e-9) < 0.7
  const passRadius = Math.max(0.35, Math.min(0.6, fish.speed * 0.55))
  const passedWaypoint = rawRemaining < passRadius && waypointAbeam && fish.speed > .04
  const turnWaypointReady = rawRemaining < .025 || (!isFinalWaypoint && rawRemaining < .28) || passedWaypoint
  const meshWaypointWithinSubstep = habitat.meshNavigation === undefined || rawRemaining <= .015 * dt + 1e-12 || passedWaypoint
  if (turnWaypointReady && meshWaypointWithinSubstep) {
    if (habitat.meshNavigation !== undefined) {
      const clearance = movementSafety(fish, habitat, rawTarget, effectiveClearance)
      if (clearance !== 'clear') {
        fish.route = []; fish.speed = 0; fish.targetWait = clearance === 'blocked' ? .2 : .7
        if (fish.navigationAnchor) {
          fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, clearance)
          fish.navigationAnchor = undefined
        }
        fish.turnKinematics = stepFishTurnKinematics(fish.turnKinematics, schoolTurn, dt, fish.speed, fish.startleSeconds, schoolDelta)
        return
      }
      // Close route points may be acknowledged within a small tolerance when
      // the heading step is clear; only snap position when it fits this substep.
      if (rawRemaining <= .015 * dt + 1e-12) fish.position = { ...rawTarget }
    }
    completeRouteWaypoint(fish)
    fish.turnKinematics = stepFishTurnKinematics(fish.turnKinematics, schoolTurn, dt, fish.speed, fish.startleSeconds, schoolDelta)
    const targetBank = clamp(-fish.turnKinematics.smoothedYawRate * 0.12, -0.18, 0.18)
    fish.bank += (targetBank - fish.bank) * Math.min(1, dt * 5.5)
    return
  }
  const cruise = fish.behavior.variation.cruiseSpeedTankWidthsPerSecond * (habitat.bounds.max.x - habitat.bounds.min.x)
  const candidateLookahead = computeLookaheadTarget(
    fish.position,
    fish.route,
    fish.waypoint,
    cruise,
    getRigArchetypeForSpecies(fish.speciesId),
  )
  const steerTarget =
    candidateLookahead &&
    movementSafety(fish, habitat, candidateLookahead, effectiveClearance) === 'clear'
      ? candidateLookahead
      : rawTarget
  const dx = steerTarget.x - fish.position.x, dy = steerTarget.y - fish.position.y, dz = steerTarget.z - fish.position.z, remaining = Math.hypot(dx, dy, dz)
  const heading = Math.atan2(dx, dz), delta = Math.atan2(Math.sin(heading - fish.yaw), Math.cos(heading - fish.yaw))
  const bioMaxTurn = computeMaxBiomechanicalYawRate(
    fish.speed,
    baseTurnRateRad,
    minTurnRadiusM,
    fish.startleSeconds,
    delta,
  )
  const anchorDocking = fish.navigationAnchor !== undefined && rawRemaining < 0.35
  const maxTurn = (anchorDocking ? Math.max(bioMaxTurn, baseTurnRateRad * 1.4) : bioMaxTurn) * dt
  // AQ-84: the route turn shares the species turn budget with the schooling
  // turn already applied above, so the total turn in one substep never
  // exceeds the species limit.
  const routeMaxTurn = Math.max(0, maxTurn - Math.abs(schoolTurn))
  const turn = clamp(delta, -routeMaxTurn, routeMaxTurn); fish.yaw += turn
  const desiredPitch = habitat.meshNavigation !== undefined
    ? clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -MAX_PITCH_RAD_METRIC, MAX_PITCH_RAD_METRIC)
    : clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -MAX_PITCH_RAD_LEGACY, MAX_PITCH_RAD_LEGACY)
  if (habitat.meshNavigation !== undefined) {
    const maxPitchStep = MAX_PITCH_RATE_RAD_PER_SEC_METRIC * dt
    fish.pitch += clamp(desiredPitch - fish.pitch, -maxPitchStep, maxPitchStep)
  } else {
    fish.pitch += (desiredPitch - fish.pitch) * Math.min(1, dt * (rawRemaining < 0.45 ? 10 : 4))
  }
  // AQ-84: banking and the turning rig reflect the smoothed total turn rate
  // (schooling + route) so bank never jerks on single-substep target switches.
  fish.turnKinematics = stepFishTurnKinematics(fish.turnKinematics, turn + schoolTurn, dt, fish.speed, fish.startleSeconds, delta)
  const targetBank = clamp(-fish.turnKinematics.smoothedYawRate * 0.12, -0.18, 0.18)
  fish.bank += (targetBank - fish.bank) * Math.min(1, dt * 5.5)
  const multiplier = profile.states[fish.behavior.state]?.speedMultiplier ?? 1
  // AQ-84: a lagging outer fish accelerates forward along its heading toward
  // the schoolmates' cruise speed (blended 25%, capped at +20% of its own
  // cruise) instead of being dragged sideways to catch up.
  const schoolCruise = schooling?.cruiseSpeed
  const effectiveCruise = schoolCruise !== undefined && Number.isFinite(schoolCruise)
    ? cruise * 0.75 + Math.min(Math.max(0, schoolCruise), cruise * 1.2) * 0.25
    : cruise
  const effort = fish.startleSeconds > 0 ? 2.8 : multiplier
  const turnSpeedFactor = evaluateTurnSpeedFactor(delta, fish.startleSeconds, fish.turnKinematics.maneuverStage)
  const arrivalSlowdown = isFinalWaypoint ? Math.min(1, rawRemaining / 0.18) : 1.0
  const wanted = effectiveCruise * effort * turnSpeedFactor * arrivalSlowdown
  fish.speed += (wanted - fish.speed) * Math.min(1, dt * (fish.startleSeconds > 0 ? 8 : 3.2))

  const travel = Math.min(rawRemaining, Math.max(.015, fish.speed) * dt)
  const chordDir = { x: rawDx / rawRemaining, y: rawDy / rawRemaining, z: rawDz / rawRemaining }
  const stepVec = computeCurvilinearStepVector(fish.yaw, fish.pitch, chordDir, delta, travel, rawRemaining, isFinalWaypoint)
  const headingNext = { x: fish.position.x + stepVec.x, y: fish.position.y + stepVec.y, z: fish.position.z + stepVec.z }
  const chordNext = { x: fish.position.x + chordDir.x * travel, y: fish.position.y + chordDir.y * travel, z: fish.position.z + chordDir.z * travel }
  const headingSafety = movementSafety(fish, habitat, headingNext, effectiveClearance)
  const chordSafety = movementSafety(fish, habitat, chordNext, effectiveClearance)
  if (habitat.meshNavigation !== undefined && fish.waypoint + 1 < fish.route.length
    && turnWaypointReady && rawRemaining <= .025 && headingSafety === 'clear'
    && movementSafety(fish, habitat, rawTarget, effectiveClearance) === 'clear') {
    // A close metric waypoint may be acknowledged after a verified forward
    // proposal clears, without snapping the fish sideways onto the node.
    completeRouteWaypoint(fish)
    return
  }
  if (headingSafety === 'clear') fish.position = headingNext
  else if (chordSafety === 'clear') {
    // Keep the route, decay speed smoothly, and steer toward the safe chord instead of freezing.
    fish.speed *= Math.exp(-dt * 5)
    const chordYaw = Math.atan2(chordDir.x, chordDir.z)
    const recoveryDelta = Math.atan2(Math.sin(chordYaw - fish.yaw), Math.cos(chordYaw - fish.yaw))
    fish.yaw += clamp(recoveryDelta, -maxTurn * 0.35, maxTurn * 0.35)
  } else {
    const failure = headingSafety === 'unavailable' || chordSafety === 'unavailable' ? 'unavailable' : 'blocked'
    fish.route = []; fish.speed = 0; fish.targetWait = failure === 'blocked' ? .2 : .7
    if (fish.navigationAnchor) {
      fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, failure)
      fish.navigationAnchor = undefined
    }
  }
}
