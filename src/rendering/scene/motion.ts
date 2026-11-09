import { getSpeciesBehaviorProfile, type HabitatAnchor } from '../../lib/fish-behavior'
import { advanceFishBehavior, createFishBehaviorInstance, dispatchBehaviorEvent, getMotionIntent, getNavigationRequest, reportNavigationOutcome, type FishBehaviorInstance } from '../../simulation/behavior-runtime'
import { evaluateSchoolingSteering, isGroupSchoolingSpecies, type SchoolingPeer } from './schooling-navigation'
import { createFishExtensionRuntime, EMPTY_FISH_EXTENSIONS, type FishExtensionConfig, type FishExtensionSnapshot } from '../../simulation/fish-extensions'
import { findWaterRoute, isWaterSegmentSafe, resolveHabitatRoute, type AxisAlignedBox, type HabitatAnchorLocation, type SolidObstacleVolume, type Vec3 } from '../../simulation/habitat-navigation'
import { findMeshRoute, type CapsuleClearanceQuery, type MeshNavigationBudget, type MeshNavigationWorkBudget, type MeshNavigationWorkReport } from '../../simulation/mesh-navigation'
import { simulationSubsteps } from './clock'
import { fishBodyRadiusM } from './fish-scale'
import {
  SHARP_TURN_THRESHOLD_RAD,
  computeCurvilinearStepVector,
  computeLookaheadTarget,
  evaluateTurnSpeedFactor,
  stepFishTurnKinematics,
  type FishTurnKinematics,
} from './fish-turning'

export type MeshNavigationConfig = {
  /** World positions, bounds and collider queries share meter units in mesh mode. */
  units: 'meter'
  spacingM: number
  budget: MeshNavigationBudget
  movementBudget: MeshNavigationWorkBudget
  queryCapsule?: CapsuleClearanceQuery
}
export type WaterHabitat = { bounds: AxisAlignedBox; obstacles: SolidObstacleVolume[]; anchors: HabitatAnchorLocation[]; meshNavigation?: MeshNavigationConfig }
export type SwimmingFish = {
  id: string; speciesId: string; behavior: FishBehaviorInstance; position: Vec3
  yaw: number; pitch: number; bank: number; speed: number; clearance: number
  route: readonly Vec3[]; waypoint: number; random: number; startleSeconds: number
  routeGeneration: number; targetWait: number; navigationAnchor?: HabitatAnchor
  extensions: ReturnType<typeof createFishExtensionRuntime>; animationPlaybackRate: number
  turnKinematics: FishTurnKinematics
  /** Explicit world-meter query radius; legacy `clearance` is not metric. */
  collisionRadiusM?: number
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
function random(fish: SwimmingFish) { fish.random = (Math.imul(fish.random, 1664525) + 1013904223) >>> 0; return fish.random / 4294967296 }
function routeInput(fish: SwimmingFish, habitat: WaterHabitat, target: Vec3) { return { start: fish.position, target, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: fish.clearance } }
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
function spendPlanBudget(budget: PlanBudget, work: MeshNavigationWorkReport) {
  budget.remaining.maxLatticeNodes = Math.max(0, budget.remaining.maxLatticeNodes - work.latticeNodes)
  budget.remaining.maxExpandedNodes = Math.max(0, budget.remaining.maxExpandedNodes - work.expandedNodes)
  budget.remaining.maxCollisionQueries = Math.max(0, budget.remaining.maxCollisionQueries - work.collisionQueries)
  budget.remaining.maxNodeVisits = Math.max(0, budget.remaining.maxNodeVisits - work.nodeVisits)
  budget.remaining.maxTriangleTests = Math.max(0, budget.remaining.maxTriangleTests - work.triangleTests)
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
  return point.x >= habitat.bounds.min.x + radiusM && point.x <= habitat.bounds.max.x - radiusM
    && point.y >= habitat.bounds.min.y + radiusM && point.y <= habitat.bounds.max.y - radiusM
    && point.z >= habitat.bounds.min.z + radiusM && point.z <= habitat.bounds.max.z - radiusM
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
  if (request && fish.routeGeneration !== request.generation && fish.startleSeconds <= 0) {
    if (!validMeshRequest(fish, request)) {
      reportMeshNavigationFailure(fish, request, 'unavailable')
      return
    }
    const profile = getSpeciesBehaviorProfile(request.speciesId)!
    const candidates = habitat.anchors
      .filter(location => location.anchor === request.anchor
        && (!location.compatibleSpecies || location.compatibleSpecies.includes(profile.speciesId)))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
    let failure: 'blocked' | 'unavailable' = candidates.length ? 'blocked' : 'unavailable'
    for (const candidate of candidates) {
      if (!budgetAvailable(planBudget)) { failure = 'unavailable'; break }
      const result = findMeshRoute({ start: fish.position, target: candidate.position, waterBounds: habitat.bounds,
        fishClearanceRadius: radiusM, spacingM: mesh.spacingM, queryCapsule: mesh.queryCapsule!, budget: planBudget.remaining })
      spendPlanBudget(planBudget, result.work)
      if (result.status === 'route') {
        fish.routeGeneration = request.generation
        installMeshRoute(fish, result.path, request.anchor)
        return
      }
      if (result.status !== 'blocked') failure = 'unavailable'
      if (result.status === 'work-limit' && result.reason.startsWith('lattice-')) break
    }
    reportMeshNavigationFailure(fish, request, failure)
    return
  }

  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  const { min, max } = habitat.bounds, r = radiusM
  for (let attempt = 0; attempt < 12; attempt++) {
    if (!budgetAvailable(planBudget)) break
    const depth = profile.depthRange[0] + random(fish) * (profile.depthRange[1] - profile.depthRange[0])
    const evasiveYaw = fish.yaw + (attempt % 2 ? -1 : 1) * (.7 + random(fish) * .4)
    const target = fish.startleSeconds > 0
      ? { x: clamp(fish.position.x + Math.sin(evasiveYaw) * 1.4, min.x + r, max.x - r), y: clamp(fish.position.y + .15, min.y + r, max.y - r), z: clamp(fish.position.z + Math.cos(evasiveYaw) * 1.4, min.z + r, max.z - r) }
      : { x: min.x + r + random(fish) * (max.x - min.x - 2 * r), y: clamp(max.y - depth * (max.y - min.y), min.y + r, max.y - r), z: min.z + r + random(fish) * (max.z - min.z - 2 * r) }
    if (distance(fish.position, target) < .7) continue
    const result = findMeshRoute({ start: fish.position, target, waterBounds: habitat.bounds,
      fishClearanceRadius: r, spacingM: mesh.spacingM, queryCapsule: mesh.queryCapsule!, budget: planBudget.remaining })
    spendPlanBudget(planBudget, result.work)
    if (result.status === 'route') { installMeshRoute(fish, result.path); return }
    if (result.status === 'work-limit' && result.reason.startsWith('lattice-')) break
  }
  fish.targetWait = .7
}
function plan(fish: SwimmingFish, habitat: WaterHabitat) {
  if (habitat.meshNavigation !== undefined) { planMesh(fish, habitat); return }
  const request = getNavigationRequest(fish.behavior)
  if (request && fish.routeGeneration !== request.generation && fish.startleSeconds <= 0) {
    const result = resolveHabitatRoute({ request, start: fish.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, anchorLocations: habitat.anchors, fishClearanceRadius: fish.clearance })
    fish.routeGeneration = request.generation
    if (result.status === 'route') { fish.route = result.path; fish.waypoint = 1; fish.navigationAnchor = request.anchor; return }
    fish.behavior = reportNavigationOutcome(fish.behavior, request.generation, request.anchor, result.status)
  }
  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  const { min, max } = habitat.bounds, r = fish.clearance + .08
  for (let attempt = 0; attempt < 12; attempt++) {
    const depth = profile.depthRange[0] + random(fish) * (profile.depthRange[1] - profile.depthRange[0])
    const evasiveYaw = fish.yaw + (attempt % 2 ? -1 : 1) * (.7 + random(fish) * .4)
    const target = fish.startleSeconds > 0
      ? { x: clamp(fish.position.x + Math.sin(evasiveYaw) * 1.4, min.x + r, max.x - r), y: clamp(fish.position.y + .15, min.y + r, max.y - r), z: clamp(fish.position.z + Math.cos(evasiveYaw) * 1.4, min.z + r, max.z - r) }
      : { x: min.x + r + random(fish) * (max.x - min.x - 2 * r), y: clamp(max.y - depth * (max.y - min.y), min.y + r, max.y - r), z: min.z + r + random(fish) * (max.z - min.z - 2 * r) }
    if (distance(fish.position, target) < .7) continue
    const path = findWaterRoute(routeInput(fish, habitat, target))
    if (path) { fish.route = path; fish.waypoint = 1; fish.navigationAnchor = undefined; return }
  }
  fish.targetWait = .7
}
function movementSafety(fish: SwimmingFish, habitat: WaterHabitat, target: Vec3): 'clear' | 'blocked' | 'unavailable' {
  if (habitat.meshNavigation === undefined) return isWaterSegmentSafe(routeInput(fish, habitat, target)) ? 'clear' : 'blocked'
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

export function stepSwimmingFish(fish: SwimmingFish, habitat: WaterHabitat, elapsed: number, stopped = false) {
  if (stopped) return
  for (const dt of simulationSubsteps(elapsed)) {
    integrateSwimmingFish(fish, habitat, dt)
    stepFishExtensions(fish, dt)
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
  fish.behavior = advanceFishBehavior(fish.behavior, dt)
  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  // AQ-84: rotate the heading toward the schooling direction first, within
  // the species turn limit for this substep. The route turn below is then
  // capped by the remaining budget, so the total turn in one substep never
  // exceeds the species limit. Forward motion along the updated yaw (in the
  // main path) closes the distance to the school — no sideways translation.
  const schoolHeadingMag = schooling ? Math.hypot(schooling.dx, schooling.dz) : 0
  const schoolHeading = schoolHeadingMag > 1e-9 ? Math.atan2(schooling!.dx, schooling!.dz) : fish.yaw
  const schoolDelta = Math.atan2(Math.sin(schoolHeading - fish.yaw), Math.cos(schoolHeading - fish.yaw))
  const schoolMaxTurn = fish.behavior.variation.turnDegreesPerSecond * Math.PI / 180 * dt
  const schoolTurn = clamp(schoolDelta, -schoolMaxTurn, schoolMaxTurn)
  fish.yaw += schoolTurn
  fish.startleSeconds = Math.max(0, fish.startleSeconds - dt); fish.targetWait -= dt
  if (fish.behavior.state === 'swim' && fish.speciesId === 'yellow-tang' && fish.behavior.stateElapsedSeconds > 2 && habitat.anchors.some(anchor => distance(anchor.position, fish.position) < .9) && fish.routeGeneration !== fish.behavior.navigationGeneration) {
    fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'behavior-opportunity', instanceId: fish.id, trigger: 'foraging-opportunity' })
  }
  const request = getNavigationRequest(fish.behavior)
  if (request && request.generation !== fish.routeGeneration && fish.startleSeconds <= 0) fish.route = []
  if ((!fish.route.length || fish.waypoint >= fish.route.length) && fish.targetWait <= 0) plan(fish, habitat)
  const rawTarget = fish.route[fish.waypoint]
  if (!rawTarget) {
    fish.speed *= Math.exp(-dt * 4)
    // AQ-84: with no route to follow the fish still turns in place toward
    // the school, and the turn kinematics record that turn.
    fish.turnKinematics = stepFishTurnKinematics(fish.turnKinematics, schoolTurn, dt, fish.speed, fish.startleSeconds, schoolDelta)
    return
  }
  const rawDx = rawTarget.x - fish.position.x, rawDy = rawTarget.y - fish.position.y, rawDz = rawTarget.z - fish.position.z, rawRemaining = Math.hypot(rawDx, rawDy, rawDz)
  const turnWaypointReady = rawRemaining < .025 || (fish.waypoint + 1 < fish.route.length && rawRemaining < .18)
  const meshWaypointWithinSubstep = habitat.meshNavigation === undefined || rawRemaining <= .015 * dt + 1e-12
  if (turnWaypointReady && meshWaypointWithinSubstep) {
    if (habitat.meshNavigation !== undefined) {
      const clearance = movementSafety(fish, habitat, rawTarget)
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
    return
  }
  const steerTarget = habitat.meshNavigation !== undefined
    ? rawTarget
    : computeLookaheadTarget(fish.position, fish.route, fish.waypoint) ?? rawTarget
  const dx = steerTarget.x - fish.position.x, dy = steerTarget.y - fish.position.y, dz = steerTarget.z - fish.position.z, remaining = Math.hypot(dx, dy, dz)
  const heading = Math.atan2(dx, dz), delta = Math.atan2(Math.sin(heading - fish.yaw), Math.cos(heading - fish.yaw))
  const sharpTurnBoost = Math.abs(delta) >= SHARP_TURN_THRESHOLD_RAD ? 1.65 : 1.0
  const proximityTurnBoost = rawRemaining < 0.35 ? 2.2 : 1.0
  const maxTurn = fish.behavior.variation.turnDegreesPerSecond * Math.PI / 180 * (fish.startleSeconds > 0 ? 3 : sharpTurnBoost * proximityTurnBoost) * dt
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
  // AQ-84: banking and the turning rig reflect the total turn (schooling +
  // route) in this substep, so the spine bends and banks into school turns.
  fish.bank += (clamp(-(turn + schoolTurn) / dt * .12, -.18, .18) - fish.bank) * Math.min(1, dt * 4)

  fish.turnKinematics = stepFishTurnKinematics(fish.turnKinematics, turn + schoolTurn, dt, fish.speed, fish.startleSeconds, delta)
  const multiplier = profile.states[fish.behavior.state]?.speedMultiplier ?? 1
  const cruise = fish.behavior.variation.cruiseSpeedTankWidthsPerSecond * (habitat.bounds.max.x - habitat.bounds.min.x)
  // AQ-84: a lagging outer fish accelerates forward along its heading toward
  // the schoolmates' cruise speed (blended 25%, capped at +20% of its own
  // cruise) instead of being dragged sideways to catch up.
  const schoolCruise = schooling?.cruiseSpeed
  const effectiveCruise = schoolCruise !== undefined && Number.isFinite(schoolCruise)
    ? cruise * 0.75 + Math.min(Math.max(0, schoolCruise), cruise * 1.2) * 0.25
    : cruise
  const effort = fish.startleSeconds > 0 ? 2.8 : multiplier
  const turnSpeedFactor = evaluateTurnSpeedFactor(delta, fish.startleSeconds, fish.turnKinematics.maneuverStage)
  const wanted = effectiveCruise * effort * turnSpeedFactor * Math.min(1, rawRemaining / .22)
  fish.speed += (wanted - fish.speed) * Math.min(1, dt * (fish.startleSeconds > 0 ? 8 : 3.2))

  const travel = Math.min(rawRemaining, Math.max(.015, fish.speed) * dt)
  const chordDir = { x: rawDx / rawRemaining, y: rawDy / rawRemaining, z: rawDz / rawRemaining }
  const stepVec = computeCurvilinearStepVector(fish.yaw, fish.pitch, chordDir, delta, travel, rawRemaining)
  const headingNext = { x: fish.position.x + stepVec.x, y: fish.position.y + stepVec.y, z: fish.position.z + stepVec.z }
  const chordNext = { x: fish.position.x + chordDir.x * travel, y: fish.position.y + chordDir.y * travel, z: fish.position.z + chordDir.z * travel }
  const headingSafety = movementSafety(fish, habitat, headingNext)
  const chordSafety = movementSafety(fish, habitat, chordNext)
  if (habitat.meshNavigation !== undefined && fish.waypoint + 1 < fish.route.length
    && turnWaypointReady && rawRemaining <= .025 && headingSafety === 'clear'
    && movementSafety(fish, habitat, rawTarget) === 'clear') {
    // A close metric waypoint may be acknowledged after a verified forward
    // proposal clears, without snapping the fish sideways onto the node.
    completeRouteWaypoint(fish)
    return
  }
  if (headingSafety === 'clear') fish.position = headingNext
  else if (chordSafety === 'clear') {
    // Keep the route and pivot in place until the body-heading step clears.
    // Moving along the chord here would turn a safe recovery into crab-sliding.
    fish.speed = 0
  } else {
    const failure = headingSafety === 'unavailable' || chordSafety === 'unavailable' ? 'unavailable' : 'blocked'
    fish.route = []; fish.speed = 0; fish.targetWait = failure === 'blocked' ? .2 : .7
    if (fish.navigationAnchor) {
      fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, failure)
      fish.navigationAnchor = undefined
    }
  }
}
