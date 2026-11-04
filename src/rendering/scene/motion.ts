import { getSpeciesBehaviorProfile, type HabitatAnchor } from '../../lib/fish-behavior'
import { advanceFishBehavior, createFishBehaviorInstance, dispatchBehaviorEvent, getNavigationRequest, reportNavigationOutcome, type FishBehaviorInstance } from '../../simulation/behavior-runtime'
import { createFishExtensionRuntime, EMPTY_FISH_EXTENSIONS, type FishExtensionConfig, type FishExtensionSnapshot } from '../../simulation/fish-extensions'
import { findWaterRoute, isWaterSegmentSafe, resolveHabitatRoute, type AxisAlignedBox, type HabitatAnchorLocation, type SolidObstacleVolume, type Vec3 } from '../../simulation/habitat-navigation'
import { simulationSubsteps } from './clock'

export type WaterHabitat = { bounds: AxisAlignedBox; obstacles: SolidObstacleVolume[]; anchors: HabitatAnchorLocation[] }
export type SwimmingFish = {
  id: string; speciesId: string; behavior: FishBehaviorInstance; position: Vec3
  yaw: number; pitch: number; bank: number; speed: number; clearance: number
  route: readonly Vec3[]; waypoint: number; random: number; startleSeconds: number
  routeGeneration: number; targetWait: number; navigationAnchor?: HabitatAnchor
  extensions: ReturnType<typeof createFishExtensionRuntime>; animationPlaybackRate: number
}
export const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export function seedForId(id: string) { let seed = 2166136261; for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619); return seed >>> 0 }
function random(fish: SwimmingFish) { fish.random = (Math.imul(fish.random, 1664525) + 1013904223) >>> 0; return fish.random / 4294967296 }
function routeInput(fish: SwimmingFish, habitat: WaterHabitat, target: Vec3) { return { start: fish.position, target, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: fish.clearance } }
function extensionSnapshot(fish: SwimmingFish): FishExtensionSnapshot {
  return Object.freeze({
    instanceId: fish.id, speciesId: fish.speciesId, state: fish.behavior.state,
    position: Object.freeze({ ...fish.position }), yaw: fish.yaw, pitch: fish.pitch, bank: fish.bank, speed: fish.speed,
  })
}
export function createSwimmingFish(id: string, speciesId: string, position: Vec3, clearance = .42, extensions: FishExtensionConfig = EMPTY_FISH_EXTENSIONS): SwimmingFish {
  let behavior = createFishBehaviorInstance(id, speciesId, seedForId(id))
  // Begin at a cruising phase of the existing state machine, rather than making
  // every newly loaded service wait through the same idle window.
  for (let i = 0; behavior.state === 'idle' && i < 130; i++) behavior = advanceFishBehavior(behavior, .25)
  const initialSnapshot: FishExtensionSnapshot = Object.freeze({
    instanceId: id, speciesId, state: behavior.state, position: Object.freeze({ ...position }),
    yaw: Math.PI / 2, pitch: 0, bank: 0, speed: 0,
  })
  return { id, speciesId, behavior, position: { ...position }, yaw: Math.PI / 2, pitch: 0, bank: 0, speed: 0, clearance, route: [], waypoint: 1, random: seedForId(id), startleSeconds: 0, routeGeneration: -1, targetWait: 0, extensions: createFishExtensionRuntime(extensions, initialSnapshot), animationPlaybackRate: 1 }
}
export function startleFish(fish: SwimmingFish, habitat: WaterHabitat) {
  const candidate = dispatchBehaviorEvent(fish.behavior, { type: 'fish-activation', instanceId: fish.id, trigger: fish.speciesId === 'yellow-tang' ? 'high-effort-cue' : 'threat-cue' })
  // A local evasive acceleration does not invent an absent anemone/refuge or
  // strand the runtime in an anchored retreat which can never report arrival.
  if (!candidate.targetAnchor || habitat.anchors.some(anchor => anchor.anchor === candidate.targetAnchor && (!anchor.compatibleSpecies || anchor.compatibleSpecies.some(id => id === fish.speciesId)))) fish.behavior = candidate
  fish.startleSeconds = .95; fish.route = []; fish.targetWait = 0
}
function plan(fish: SwimmingFish, habitat: WaterHabitat) {
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
export function stepSwimmingFish(fish: SwimmingFish, habitat: WaterHabitat, elapsed: number, stopped = false) {
  if (stopped) return
  for (const dt of simulationSubsteps(elapsed)) {
    integrateSwimmingFish(fish, habitat, dt)
    const result = fish.extensions.step(extensionSnapshot(fish), dt, true)
    fish.animationPlaybackRate = result.playbackRate
    for (const intent of result.behaviorIntents) fish.behavior = dispatchBehaviorEvent(fish.behavior, { ...intent, instanceId: fish.id })
  }
}
function integrateSwimmingFish(fish: SwimmingFish, habitat: WaterHabitat, dt: number) {
  fish.behavior = advanceFishBehavior(fish.behavior, dt)
  const profile = getSpeciesBehaviorProfile(fish.speciesId)!
  fish.startleSeconds = Math.max(0, fish.startleSeconds - dt); fish.targetWait -= dt
  if (fish.behavior.state === 'swim' && fish.speciesId === 'yellow-tang' && fish.behavior.stateElapsedSeconds > 2 && habitat.anchors.some(anchor => distance(anchor.position, fish.position) < .9) && fish.routeGeneration !== fish.behavior.navigationGeneration) {
    fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'behavior-opportunity', instanceId: fish.id, trigger: 'foraging-opportunity' })
  }
  const request = getNavigationRequest(fish.behavior)
  if (request && request.generation !== fish.routeGeneration && fish.startleSeconds <= 0) fish.route = []
  if ((!fish.route.length || fish.waypoint >= fish.route.length) && fish.targetWait <= 0) plan(fish, habitat)
  const target = fish.route[fish.waypoint]
  if (!target) { fish.speed *= Math.exp(-dt * 4); return }
  const dx = target.x - fish.position.x, dy = target.y - fish.position.y, dz = target.z - fish.position.z, remaining = Math.hypot(dx, dy, dz)
  if (remaining < .025) {
    fish.waypoint++
    if (fish.waypoint >= fish.route.length && fish.navigationAnchor) {
      fish.behavior = reportNavigationOutcome(fish.behavior, fish.routeGeneration, fish.navigationAnchor, 'arrived'); fish.navigationAnchor = undefined; fish.targetWait = 1.2
    }
    return
  }
  const heading = Math.atan2(dx, dz), delta = Math.atan2(Math.sin(heading - fish.yaw), Math.cos(heading - fish.yaw))
  const maxTurn = fish.behavior.variation.turnDegreesPerSecond * Math.PI / 180 * (fish.startleSeconds > 0 ? 3 : 1) * dt
  const turn = clamp(delta, -maxTurn, maxTurn); fish.yaw += turn
  fish.pitch += (clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -.28, .28) - fish.pitch) * Math.min(1, dt * 3)
  fish.bank += (clamp(-turn / dt * .12, -.18, .18) - fish.bank) * Math.min(1, dt * 4)
  const multiplier = profile.states[fish.behavior.state]?.speedMultiplier ?? 1
  const cruise = fish.behavior.variation.cruiseSpeedTankWidthsPerSecond * (habitat.bounds.max.x - habitat.bounds.min.x)
  const effort = fish.startleSeconds > 0 ? 2.8 : multiplier
  const wanted = cruise * effort * Math.max(.08, Math.cos(delta)) * Math.min(1, remaining / .22)
  fish.speed += (wanted - fish.speed) * Math.min(1, dt * (fish.startleSeconds > 0 ? 8 : 2.5))
  const travel = Math.min(remaining, Math.max(.015, fish.speed) * dt)
  const next = { x: fish.position.x + dx / remaining * travel, y: fish.position.y + dy / remaining * travel, z: fish.position.z + dz / remaining * travel }
  if (isWaterSegmentSafe(routeInput(fish, habitat, next))) fish.position = next
  else { fish.route = []; fish.speed = 0; fish.targetWait = .2 }
}
