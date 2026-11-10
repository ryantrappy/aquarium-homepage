import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry } from 'three'
import { MAX_PITCH_RAD_LEGACY, MAX_PITCH_RAD_METRIC, MAX_PITCH_RATE_RAD_PER_SEC_METRIC, anchorApproachClearanceM, createSwimmingFish, distance, disturbSchool, startleFish, stepSwimmingFish, stepSwimmingSchool, type WaterHabitat } from './motion'
import { instantiateModularReefHabitat } from './reef-assembly'
import { fishClearanceRadius } from './fish-scale'
import { findSafeFishSpawn } from './fish-spawn'
import { EXAMPLE_SERVICES } from '../../lib/services'
import { findWaterRoute, isWaterSegmentSafe, resolveHabitatRoute } from '../../simulation/habitat-navigation'
import { buildMeshCollider } from '../../simulation/mesh-collision'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import { findMeshRoute, type CapsuleClearanceQuery, type MeshNavigationBudget } from '../../simulation/mesh-navigation'
import { advanceFishBehavior, dispatchBehaviorEvent } from '../../simulation/behavior-runtime'
import type { FishExtensionConfig } from '../../simulation/fish-extensions'

const habitat: WaterHabitat = { bounds: { min: { x: -5, y: -2.4, z: -3 }, max: { x: 5, y: 2.8, z: 2.8 } }, obstacles: [{ id: 'real-reef-envelope', bounds: { min: { x: -1.2, y: -2.8, z: -.8 }, max: { x: 1.2, y: .1, z: .8 } } }], anchors: [] }
const meshWater = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } }
const meshBudget: MeshNavigationBudget = { maxLatticeNodes: 2_000, maxExpandedNodes: 2_000, maxCollisionQueries: 40_000, maxNodeVisits: 200_000, maxTriangleTests: 1_000_000 }
const movementBudget = { maxNodeVisits: 4096, maxTriangleTests: 8192 }

function overhangCollider() {
  const geometry = new BoxGeometry(.8, 1, 2)
  geometry.translate(0, .5, 0)
  const positions = geometry.getAttribute('position'), indices = geometry.index!
  const triangles = []
  for (let i = 0; i < indices.count; i += 3) {
    const points = [0, 1, 2].map(j => {
      const index = indices.getX(i + j)
      return { x: positions.getX(index), y: positions.getY(index), z: positions.getZ(index) }
    })
    triangles.push({ a: points[0], b: points[1], c: points[2] })
  }
  geometry.dispose()
  const result = buildMeshCollider({ id: 'motion-overhang', sourceSha256: 'c'.repeat(64), units: 'meter', upAxis: '+Y', coordinateSpace: 'world', triangles })
  if (result.status !== 'ready') throw new Error(result.reason)
  return result.collider
}

function meshHabitat(queryCapsule?: CapsuleClearanceQuery, anchors: WaterHabitat['anchors'] = [], budget: MeshNavigationBudget = meshBudget): WaterHabitat {
  return { bounds: meshWater, obstacles: [], anchors, meshNavigation: { units: 'meter', spacingM: .25, budget: { ...budget }, movementBudget: { ...movementBudget }, queryCapsule } }
}
function collisionQuery() { return createMeshClearanceQuery([overhangCollider()]) }

describe('rendered fish travel adapter', () => {
  it('moves and turns both rigged species, retaining collision clearance on every step', () => {
    for (const species of ['ocellaris-clownfish', 'yellow-tang']) {
      const fish = createSwimmingFish(`travel-${species}`, species, { x: -3, y: 1.4, z: 1.8 }, .5)
      const initial = { ...fish.position }; let traveled = 0; let turn = 0
      for (let frame = 0; frame < 1200; frame++) {
        const previous = { ...fish.position }, yaw = fish.yaw
        stepSwimmingFish(fish, habitat, 1 / 30)
        expect(isWaterSegmentSafe({ start: previous, target: fish.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: .5 })).toBe(true)
        traveled += distance(previous, fish.position); turn += Math.abs(yaw - fish.yaw)
      }
      expect(traveled).toBeGreaterThan(1.5); expect(distance(initial, fish.position)).toBeGreaterThan(.4); expect(turn).toBeGreaterThan(.5)
    }
  })
  it('pivots at a boundary until the heading-locked step is safe, then progresses without a yaw snap', () => {
    const bounded: WaterHabitat = {
      bounds: { min: { x: -5, y: -2.4, z: -3 }, max: { x: 5, y: 2.8, z: 2.8 } },
      obstacles: [],
      anchors: [],
    }
    const fish = createSwimmingFish('boundary-chord', 'ocellaris-clownfish', { x: 4.695, y: .7, z: 1 }, .3)
    fish.yaw = Math.PI / 2
    fish.speed = .6
    fish.routeGeneration = fish.behavior.navigationGeneration
    fish.route = [fish.position, { x: 4.2, y: .7, z: 1 }]
    fish.waypoint = 1
    const start = { ...fish.position }
    const yawBefore = fish.yaw
    const dt = 1 / 60

    stepSwimmingFish(fish, bounded, dt)

    const yawDelta = Math.atan2(Math.sin(fish.yaw - yawBefore), Math.cos(fish.yaw - yawBefore))
    const maxTurn = fish.behavior.variation.turnDegreesPerSecond * Math.PI / 180 * 1.65 * 2.2 * dt
    expect(Math.abs(yawDelta)).toBeGreaterThan(0)
    expect(Math.abs(yawDelta)).toBeLessThanOrEqual(maxTurn + 1e-9)
    expect(fish.position).toEqual(start)
    expect(fish.speed).toBe(0)
    expect(fish.route).toHaveLength(2)
    expect(isWaterSegmentSafe({ start, target: fish.position, waterBounds: bounded.bounds, obstacles: bounded.obstacles, fishClearanceRadius: fish.clearance })).toBe(true)

    let traveled = 0
    for (let frame = 0; frame < 600; frame++) {
      const before = { ...fish.position }, yawBeforeFrame = fish.yaw
      stepSwimmingFish(fish, bounded, dt)
      const step = distance(before, fish.position)
      traveled += step
      expect(isWaterSegmentSafe({ start: before, target: fish.position, waterBounds: bounded.bounds, obstacles: bounded.obstacles, fishClearanceRadius: fish.clearance })).toBe(true)
      const frameYawDelta = Math.atan2(Math.sin(fish.yaw - yawBeforeFrame), Math.cos(fish.yaw - yawBeforeFrame))
      expect(Math.abs(frameYawDelta)).toBeLessThanOrEqual(maxTurn + 1e-9)
    }
    expect(traveled).toBeGreaterThan(0.1)
  })
  it('freezes position and orientation while stopped, without a resume catch-up jump', () => {
    const fish = createSwimmingFish('paused', 'yellow-tang', { x: -2, y: 1, z: 2 })
    stepSwimmingFish(fish, habitat, .03)
    const before = { position: { ...fish.position }, yaw: fish.yaw, pitch: fish.pitch }
    stepSwimmingFish(fish, habitat, 50, true)
    expect({ position: fish.position, yaw: fish.yaw, pitch: fish.pitch }).toEqual(before)
    stepSwimmingFish(fish, habitat, 50)
    expect(distance(before.position, fish.position)).toBeLessThan(.15)
  })
  it('keeps empty extensions identical and skips behavior/animation hooks while stopped', () => {
    const empty = createSwimmingFish('empty', 'yellow-tang', { x: -2, y: 1, z: 2 })
    const explicitEmpty = createSwimmingFish('empty', 'yellow-tang', { x: -2, y: 1, z: 2 }, .42, {})
    for (let i = 0; i < 20; i++) {
      stepSwimmingFish(empty, habitat, 1 / 60)
      stepSwimmingFish(explicitEmpty, habitat, 1 / 60)
    }
    expect({ behavior: empty.behavior, position: empty.position, yaw: empty.yaw, speed: empty.speed, animationPlaybackRate: empty.animationPlaybackRate })
      .toEqual({ behavior: explicitEmpty.behavior, position: explicitEmpty.position, yaw: explicitEmpty.yaw, speed: explicitEmpty.speed, animationPlaybackRate: explicitEmpty.animationPlaybackRate })

    const behaviorStep = vi.fn()
    const animationStep = vi.fn(() => ({ playbackRate: 1.2 }))
    const extensions: FishExtensionConfig = { defaults: {
      behavior: { operation: 'add', extension: { kind: 'behavior', id: 'behavior', create: () => ({ step: behaviorStep }) } },
      animation: { operation: 'add', extension: { kind: 'animation', id: 'animation', create: () => ({ step: animationStep }) } },
    } }
    const fish = createSwimmingFish('stopped', 'yellow-tang', { x: -2, y: 1, z: 2 }, .42, extensions)
    stepSwimmingFish(fish, habitat, .03, true)
    expect(behaviorStep).not.toHaveBeenCalled()
    expect(animationStep).not.toHaveBeenCalled()
    stepSwimmingFish(fish, habitat, 1 / 60)
    expect(behaviorStep).toHaveBeenCalled()
    expect(animationStep).toHaveBeenCalled()
    expect(fish.animationPlaybackRate).toBe(1.2)
  })
  it('stamps behavior intents with only their owning fish ID before core FSM dispatch', () => {
    const extension: FishExtensionConfig = { instances: { 'target-fish': {
      forage: { operation: 'add', extension: {
        kind: 'behavior', id: 'forage',
        create: () => { let sent = false; return { step: () => sent ? [] : (sent = true, [{ type: 'behavior-opportunity' as const, trigger: 'foraging-opportunity' as const }]) } },
      } },
    } } }
    const target = createSwimmingFish('target-fish', 'yellow-tang', { x: -2, y: 1, z: 2 }, .42, extension)
    const other = createSwimmingFish('other-fish', 'yellow-tang', { x: 2, y: 1, z: 2 }, .42, extension)
    stepSwimmingFish(target, habitat, 1 / 60)
    stepSwimmingFish(other, habitat, 1 / 60)
    expect(target.behavior.state).toBe('forage')
    expect(other.behavior.state).toBe('swim')
  })
  it('scopes activation to one fish and recovers without fabricating an absent refuge', () => {
    const first = createSwimmingFish('first', 'ocellaris-clownfish', { x: -2, y: 1, z: 2 })
    const second = createSwimmingFish('second', 'yellow-tang', { x: 2, y: 1, z: 2 })
    const other = { behavior: second.behavior, position: { ...second.position }, startleSeconds: second.startleSeconds }
    startleFish(first, habitat)
    expect({ behavior: second.behavior, position: second.position, startleSeconds: second.startleSeconds }).toEqual(other); expect(first.startleSeconds).toBeGreaterThan(0)
    expect(first.behavior.state).not.toBe('retreat')
    for (let i = 0; i < 100; i++) stepSwimmingFish(first, habitat, .03)
    expect(first.startleSeconds).toBe(0); expect(first.behavior.state).not.toBe('retreat')
  })
  it('routes free-water targets around solid reef via depth, without semantic anchor substitution', () => {
    const input = { start: { x: -3, y: -.5, z: 0 }, target: { x: 3, y: -.5, z: 0 }, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: .5 }
    const route = findWaterRoute(input)!
    expect(route.length).toBeGreaterThan(2)
    for (let i = 1; i < route.length; i++) expect(isWaterSegmentSafe({ ...input, start: route[i - 1], target: route[i] })).toBe(true)
    expect(findWaterRoute({ ...input, start: { x: 0, y: -1, z: 0 } })).toBeUndefined()
  })
  it('backs off after failed narrow-tank target searches and retries after the wait', () => {
    const narrowBounds = { min: { x: -1.05, y: -2.4, z: -3 }, max: { x: 1.05, y: 2.8, z: 2.8 } }
    const blocked: WaterHabitat = {
      bounds: narrowBounds,
      obstacles: [{ id: 'wedged-rock', bounds: { min: { x: -.2, y: .8, z: .5 }, max: { x: .2, y: 1.8, z: 1.5 } } }],
      anchors: [],
    }
    const fish = createSwimmingFish('narrow-backoff', 'blue-tang', { x: 0, y: 1.25, z: 1 }, .77)
    stepSwimmingFish(fish, blocked, 1 / 60)
    expect(fish.route).toEqual([])
    expect(fish.targetWait).toBeGreaterThan(0.5)

    const randomAfterFailure = fish.random
    for (let frame = 0; frame < 20; frame++) stepSwimmingFish(fish, blocked, 1 / 60)
    expect(fish.random).toBe(randomAfterFailure)
    expect(fish.targetWait).toBeGreaterThan(0.2)

    for (let frame = 0; frame < 30; frame++) stepSwimmingFish(fish, blocked, 1 / 60)
    expect(fish.random).not.toBe(randomAfterFailure)
    expect(fish.targetWait).toBeGreaterThan(0.5)
  })
  it('keeps an adult blue tang moving through the open upper lane at the 402px proxy width', () => {
    const narrow: WaterHabitat = {
      bounds: { min: { x: -1.05, y: -2.4, z: -3 }, max: { x: 1.05, y: 2.8, z: 2.8 } },
      obstacles: [{ id: 'central-rock', bounds: { min: { x: -.35, y: -2.8, z: -3 }, max: { x: .35, y: .18, z: 2.8 } } }],
      anchors: [],
    }
    const fish = createSwimmingFish('narrow-blue-tang', 'blue-tang', { x: 0, y: 1.45, z: 1.8 }, .77)
    let traveled = 0
    for (let frame = 0; frame < 1200; frame++) {
      const before = { ...fish.position }
      stepSwimmingFish(fish, narrow, 1 / 30)
      expect(isWaterSegmentSafe({ start: before, target: fish.position, waterBounds: narrow.bounds, obstacles: narrow.obstacles, fishClearanceRadius: fish.clearance })).toBe(true)
      traveled += distance(before, fish.position)
    }
    expect(traveled).toBeGreaterThan(1.5)
    expect(fish.speed).toBeGreaterThan(0)
  })
  it('keeps all five configured services safe and moving in the exact 402px modular habitat', () => {
    const aspect = 402 / 874
    const halfWidth = (9 - 2.8) * Math.tan(21 * Math.PI / 180) * aspect * .96
    const bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
    const reef = instantiateModularReefHabitat('left', 3.4, { x: -.15, y: -2.70, z: -1.35 }, 'reef-0', .06)
    const narrow: WaterHabitat = { bounds, obstacles: reef.obstacles, anchors: reef.anchors }

    EXAMPLE_SERVICES.forEach((service, index) => {
      const preferredX = [-.3, .3, 0][index % 3]
      const preferredY = Math.max(.3, [1.25, .55, 1.95][index % 3] - Math.floor(index / 3) * .7)
      const preferred = { x: preferredX, y: preferredY, z: 1.8 + (index % 2) * .2 }
      const clearance = fishClearanceRadius(service.fishId)
      const spawn = findSafeFishSpawn(preferred, bounds, reef.obstacles, clearance)
      expect(spawn, `${service.name} must get a collision-safe mobile spawn`).toBeDefined()
      const fish = createSwimmingFish(service.id, service.fishId, spawn!, clearance)
      let traveled = 0
      for (let frame = 0; frame < 1200; frame++) {
        const before = { ...fish.position }
        stepSwimmingFish(fish, narrow, 1 / 30)
        expect(isWaterSegmentSafe({ start: before, target: fish.position, waterBounds: bounds, obstacles: reef.obstacles, fishClearanceRadius: clearance }), `${service.name} frame ${frame}`).toBe(true)
        traveled += distance(before, fish.position)
      }
      expect(traveled, `${service.name} should keep navigating instead of wedging`).toBeGreaterThan(.5)
    })
  })
  it('uses the exact 3D capsule query to route below an overhang and guards every movement segment', () => {
    const query = collisionQuery(), calls: Array<{ start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; radius: number }> = []
    const checked: CapsuleClearanceQuery = (start, end, radius, budget) => {
      calls.push({ start: { ...start }, end: { ...end }, radius })
      return query(start, end, radius, budget)
    }
    const start = { x: -.7, y: .25, z: 0 }, target = { x: .7, y: .25, z: 0 }
    const route = findMeshRoute({ start, target, waterBounds: meshWater, fishClearanceRadius: .04, spacingM: .2, queryCapsule: checked, budget: meshBudget })
    expect(route.status).toBe('route')
    if (route.status !== 'route') return
    expect(route.path.some(point => point.y < -.05)).toBe(true)
    const fish = createSwimmingFish('mesh-overhang', 'yellow-tang', start, .5, undefined, { collisionRadiusM: .04 })
    fish.route = route.path; fish.waypoint = 1
    for (let i = 0; i < 2400 && fish.position.x < .5; i++) {
      const previousPitch = fish.pitch
      stepSwimmingFish(fish, meshHabitat(checked), 1 / 30)
      expect(Math.abs(fish.pitch - previousPitch)).toBeLessThanOrEqual(1.2 / 30 + 1e-9)
    }
    expect(fish.position.x).toBeGreaterThan(.4)
    expect(Math.min(...calls.map(call => Math.min(call.start.y, call.end.y)))).toBeLessThan(-.05)
    expect(calls.every(call => call.radius === .04)).toBe(true)
  })
  it('follows upward and downward vertical metric routes with rate-limited pitch and safe bounds', () => {
    const verticalOnly: CapsuleClearanceQuery = (start, end) => ({
      status: Math.hypot(end.x - start.x, end.z - start.z) <= 1e-5 ? 'clear' : 'blocked',
      work: { nodeVisits: 0, triangleTests: 0 },
    })
    for (const targetY of [-.65, .65]) {
      const fish = createSwimmingFish(`vertical-${targetY}`, 'ocellaris-clownfish', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
      fish.yaw = 0
      // Keep this route test inside a stable open-water state so an unrelated
      // behavior transition cannot replace the hand-authored metric path.
      fish.behavior = { ...fish.behavior, state: 'swim', stateElapsedSeconds: 0, stateDurationSeconds: 100, targetAnchor: undefined }
      fish.routeGeneration = fish.behavior.navigationGeneration
      fish.route = [fish.position, { x: 0, y: targetY, z: 0 }]
      fish.waypoint = 1
      const habitat = meshHabitat(verticalOnly)
      let progress = 0
      for (let frame = 0; frame < 3600 && fish.waypoint < fish.route.length; frame++) {
        const before = { ...fish.position }, beforePitch = fish.pitch
        fish.routeGeneration = fish.behavior.navigationGeneration
        stepSwimmingFish(fish, habitat, 1 / 60)
        expect(Math.abs(fish.pitch - beforePitch)).toBeLessThanOrEqual(1.2 / 60 + 1e-9)
        expect(fish.position.x).toBeGreaterThanOrEqual(meshWater.min.x + .04)
        expect(fish.position.x).toBeLessThanOrEqual(meshWater.max.x - .04)
        expect(fish.position.y).toBeGreaterThanOrEqual(meshWater.min.y + .04)
        expect(fish.position.y).toBeLessThanOrEqual(meshWater.max.y - .04)
        expect(fish.position.z).toBeGreaterThanOrEqual(meshWater.min.z + .04)
        expect(fish.position.z).toBeLessThanOrEqual(meshWater.max.z - .04)
        progress += targetY > 0 ? fish.position.y - before.y : before.y - fish.position.y
      }
      expect(fish.waypoint).toBe(fish.route.length)
      expect(progress).toBeGreaterThan(.4)
      expect(targetY > 0 ? -fish.pitch : fish.pitch).toBeGreaterThan(.4)
    }
  })
  it('clamps pitch to ±0.28 rad in AABB/legacy mode on a steep route (AQ-49 AC #6)', () => {
    const openWater: WaterHabitat = { bounds: habitat.bounds, obstacles: [], anchors: [] }
    const fish = createSwimmingFish('aabb-steep-pitch', 'ocellaris-clownfish', { x: 0, y: 0, z: 0 }, .5)
    fish.behavior = { ...fish.behavior, state: 'swim', stateElapsedSeconds: 0, stateDurationSeconds: 100, targetAnchor: undefined }
    fish.routeGeneration = fish.behavior.navigationGeneration
    // Vertical target demands far more than 0.28 rad of pitch.
    fish.route = [fish.position, { x: 0, y: .65, z: 0 }]
    fish.waypoint = 1
    let maxAbsPitch = 0
    for (let frame = 0; frame < 600; frame++) {
      stepSwimmingFish(fish, openWater, 1 / 60)
      expect(Math.abs(fish.pitch)).toBeLessThanOrEqual(MAX_PITCH_RAD_LEGACY + 1e-9)
      maxAbsPitch = Math.max(maxAbsPitch, Math.abs(fish.pitch))
    }
    // Pitch must have actually approached the legacy cap, not stayed level.
    expect(maxAbsPitch).toBeGreaterThan(.2)
  })
  it('bounds metric pitch to ±π/2, rate-limits it, and follows a ~0.53 rad route (AQ-49 AC #6)', () => {
    const alwaysClear: CapsuleClearanceQuery = () => ({ status: 'clear', work: { nodeVisits: 0, triangleTests: 0 } })
    const fish = createSwimmingFish('metric-diagonal-pitch', 'ocellaris-clownfish', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    fish.yaw = 0
    fish.behavior = { ...fish.behavior, state: 'swim', stateElapsedSeconds: 0, stateDurationSeconds: 100, targetAnchor: undefined }
    fish.routeGeneration = fish.behavior.navigationGeneration
    // Required pitch atan2(0.48, 0.8) ≈ 0.54 rad — beyond the legacy ±0.28 rad clamp.
    // Target stays inside the clearance-shrunk water bounds (x, y ≤ 0.96).
    fish.route = [fish.position, { x: .8, y: .48, z: 0 }]
    fish.waypoint = 1
    const metricHabitat = meshHabitat(alwaysClear)
    let progress = 0
    for (let frame = 0; frame < 3600 && fish.waypoint < fish.route.length; frame++) {
      const before = { ...fish.position }, beforePitch = fish.pitch
      fish.routeGeneration = fish.behavior.navigationGeneration
      stepSwimmingFish(fish, metricHabitat, 1 / 60)
      expect(Math.abs(fish.pitch)).toBeLessThanOrEqual(MAX_PITCH_RAD_METRIC + 1e-9)
      expect(Math.abs(fish.pitch - beforePitch)).toBeLessThanOrEqual(MAX_PITCH_RATE_RAD_PER_SEC_METRIC / 60 + 1e-9)
      progress += Math.hypot(fish.position.x - before.x, fish.position.y - before.y, fish.position.z - before.z)
    }
    expect(fish.waypoint).toBe(fish.route.length)
    expect(progress).toBeGreaterThan(.4)
    expect(-fish.pitch).toBeGreaterThan(.4)
  })
  it('holds at a rock face when a stale direct route is no longer capsule-clear', () => {
    const exact = collisionQuery(), blocked: number[] = []
    const query: CapsuleClearanceQuery = (start, end, radius, budget) => {
      const result = exact(start, end, radius, budget)
      if (result.status === 'blocked') blocked.push(1)
      return result
    }
    const fish = createSwimmingFish('mesh-surface-block', 'yellow-tang', { x: -.7, y: .5, z: 0 }, .5, undefined, { collisionRadiusM: .05 })
    fish.route = [fish.position, { x: .7, y: .5, z: 0 }]; fish.waypoint = 1
    for (let i = 0; i < 200 && !blocked.length; i++) stepSwimmingFish(fish, meshHabitat(query), 1 / 30)
    expect(blocked.length).toBeGreaterThan(0)
    expect(fish.position.x).toBeLessThan(-.44)
    expect(fish.speed).toBe(0)
  })
  it('fails closed on missing metric configuration before stale near-waypoint arrival', () => {
    const query = vi.fn(() => ({ status: 'clear' as const, work: { nodeVisits: 0, triangleTests: 0 } }))
    const fish = createSwimmingFish('mesh-missing-radius', 'yellow-tang', { x: 0, y: 0, z: 0 })
    fish.route = [fish.position, { x: .01, y: 0, z: 0 }]; fish.waypoint = 1; fish.navigationAnchor = 'grazingSurface'
    stepSwimmingFish(fish, meshHabitat(query), 1 / 30)
    expect(fish.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(fish.route).toEqual([])
    expect(fish.navigationAnchor).toBeUndefined()
    expect(query).not.toHaveBeenCalled()
  })
  it('reports unavailable for an active anchored route if mesh configuration becomes invalid', () => {
    const fish = createSwimmingFish('mesh-invalid-mid-route', 'yellow-tang', { x: -.7, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'behavior-opportunity', instanceId: fish.id, trigger: 'foraging-opportunity' })
    fish.routeGeneration = fish.behavior.navigationGeneration
    fish.navigationAnchor = 'grazingSurface'
    fish.route = [fish.position, { x: .7, y: 0, z: 0 }]; fish.waypoint = 1
    const invalidated = meshHabitat(collisionQuery())
    invalidated.meshNavigation!.queryCapsule = undefined
    stepSwimmingFish(fish, invalidated, 1 / 30)
    expect(fish.position).toEqual({ x: -.7, y: 0, z: 0 })
    expect(fish.route).toEqual([])
    expect(fish.behavior.navigationOutcome).toBe('unavailable')
    expect(fish.routeGeneration).toBe(fish.behavior.navigationGeneration)
  })
  it('keeps anchor alternatives inside one cumulative collision-query budget', () => {
    let queryCount = 0
    const query: CapsuleClearanceQuery = (start, end) => {
      queryCount++
      const blockedFirstAnchor = distance(start, end) > 0 && end.x < 0
      return { status: blockedFirstAnchor ? 'blocked' : 'clear', work: { nodeVisits: 0, triangleTests: 0 } }
    }
    const anchors: NonNullable<WaterHabitat['anchors']> = [
      { id: 'z-anchor', anchor: 'grazingSurface', position: { x: .5, y: 0, z: 0 }, compatibleSpecies: ['yellow-tang'] },
      { id: 'a-anchor', anchor: 'grazingSurface', position: { x: -.2, y: 0, z: 0 }, compatibleSpecies: ['yellow-tang'] },
    ]
    const budget = { ...meshBudget, maxCollisionQueries: 4 }
    const fish = createSwimmingFish('mesh-anchor-budget', 'yellow-tang', { x: -.7, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .02 })
    fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'behavior-opportunity', instanceId: fish.id, trigger: 'foraging-opportunity' })
    expect(fish.behavior.state).toBe('forage')
    stepSwimmingFish(fish, meshHabitat(query, anchors, budget), .25)
    expect(queryCount).toBe(4)
    expect(fish.route).toEqual([])
    expect(fish.behavior.navigationOutcome).toBe('unavailable')
    expect(fish.routeGeneration).toBe(fish.behavior.navigationGeneration)
  })
  it('holds safely if configured mesh budget objects are absent', () => {
    const fish = createSwimmingFish('mesh-missing-budget', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    fish.route = [fish.position, { x: .1, y: 0, z: 0 }]; fish.waypoint = 1
    const habitatWithoutBudget = meshHabitat(collisionQuery())
    ;(habitatWithoutBudget.meshNavigation as { budget?: MeshNavigationBudget }).budget = undefined
    expect(() => stepSwimmingFish(fish, habitatWithoutBudget, 1 / 30)).not.toThrow()
    expect(fish.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(fish.route).toEqual([])

    const partial = createSwimmingFish('mesh-partial-budget', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    partial.route = [partial.position, { x: .1, y: 0, z: 0 }]; partial.waypoint = 1
    const partialHabitat = meshHabitat(collisionQuery())
    partialHabitat.meshNavigation!.budget = { ...meshBudget, maxTriangleTests: undefined } as unknown as MeshNavigationBudget
    expect(() => stepSwimmingFish(partial, partialHabitat, 1 / 30)).not.toThrow()
    expect(partial.route).toEqual([])

    const infiniteBounds = createSwimmingFish('mesh-infinite-bounds', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    infiniteBounds.route = [infiniteBounds.position, { x: .1, y: 0, z: 0 }]; infiniteBounds.waypoint = 1
    const invalidBoundsHabitat = meshHabitat(collisionQuery())
    invalidBoundsHabitat.bounds = { min: { x: -Infinity, y: -1, z: -1 }, max: { x: Infinity, y: 1, z: 1 } }
    expect(() => stepSwimmingFish(infiniteBounds, invalidBoundsHabitat, 1 / 30)).not.toThrow()
    expect(infiniteBounds.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(infiniteBounds.route).toEqual([])
  })
  it('does not query or mutate mesh-mode state while paused', () => {
    const query = vi.fn(collisionQuery()), fish = createSwimmingFish('mesh-paused', 'yellow-tang', { x: -.7, y: .5, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    fish.route = [fish.position, { x: -.4, y: .5, z: 0 }]; fish.waypoint = 1
    const before = { position: { ...fish.position }, yaw: fish.yaw, pitch: fish.pitch, speed: fish.speed, route: fish.route, waypoint: fish.waypoint, generation: fish.routeGeneration, behavior: fish.behavior }
    stepSwimmingFish(fish, meshHabitat(query), 2, true)
    expect({ position: fish.position, yaw: fish.yaw, pitch: fish.pitch, speed: fish.speed, route: fish.route, waypoint: fish.waypoint, generation: fish.routeGeneration, behavior: fish.behavior }).toEqual(before)
    expect(query).not.toHaveBeenCalled()
  })
  it('keeps mesh-mode intermediate and final waypoints within actual substep travel', () => {
    const clear: CapsuleClearanceQuery = () => ({ status: 'clear', work: { nodeVisits: 0, triangleTests: 0 } })
    const dt = 1 / 30
    const intermediate = createSwimmingFish('mesh-intermediate-bound', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    intermediate.speed = 0
    intermediate.route = [intermediate.position, { x: .1, y: 0, z: 0 }, { x: .6, y: 0, z: .25 }]
    intermediate.waypoint = 1
    stepSwimmingFish(intermediate, meshHabitat(clear), dt)
    const intermediateTravel = distance({ x: 0, y: 0, z: 0 }, intermediate.position)
    expect(intermediateTravel).toBeLessThanOrEqual(Math.max(.015, intermediate.speed) * dt + 1e-9)
    expect(intermediateTravel).toBeLessThan(.02)

    const final = createSwimmingFish('mesh-final-bound', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    final.behavior = dispatchBehaviorEvent(final.behavior, { type: 'behavior-opportunity', instanceId: final.id, trigger: 'foraging-opportunity' })
    final.routeGeneration = final.behavior.navigationGeneration
    final.navigationAnchor = 'grazingSurface'
    final.speed = 0
    final.route = [final.position, { x: .01, y: 0, z: 0 }]
    final.waypoint = 1
    stepSwimmingFish(final, meshHabitat(clear), dt)
    const finalTravel = distance({ x: 0, y: 0, z: 0 }, final.position)
    expect(finalTravel).toBeLessThanOrEqual(Math.max(.015, final.speed) * dt + 1e-9)
    expect(finalTravel).toBeLessThan(.01)
    expect(final.navigationAnchor).toBe('grazingSurface')
    expect(final.behavior.navigationOutcome).toBeUndefined()
  })
  it('acknowledges close intermediate mesh points only after safe forward and point checks', () => {
    const target = { x: .02, y: 0, z: 0 }
    const clear: CapsuleClearanceQuery = () => ({ status: 'clear', work: { nodeVisits: 0, triangleTests: 0 } })
    const fish = createSwimmingFish('mesh-close-intermediate', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    fish.yaw = Math.PI / 2
    fish.speed = .4
    fish.routeGeneration = fish.behavior.navigationGeneration
    fish.route = [fish.position, target, { x: .4, y: 0, z: 0 }]
    fish.waypoint = 1
    const before = { ...fish.position }
    stepSwimmingFish(fish, meshHabitat(clear), 1 / 30)
    expect(fish.waypoint).toBe(2)
    expect(fish.position.x).toBeGreaterThan(before.x)
    expect(fish.position.x).toBeLessThan(target.x)

    const blockedAtPoint: CapsuleClearanceQuery = (_start, end) => ({
      status: end.x === target.x && end.y === target.y && end.z === target.z ? 'blocked' : 'clear',
      work: { nodeVisits: 0, triangleTests: 0 },
    })
    const blocked = createSwimmingFish('mesh-close-blocked-point', 'yellow-tang', { x: 0, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .04 })
    blocked.yaw = Math.PI / 2
    blocked.speed = .4
    blocked.routeGeneration = blocked.behavior.navigationGeneration
    blocked.route = [blocked.position, target, { x: .4, y: 0, z: 0 }]
    blocked.waypoint = 1
    stepSwimmingFish(blocked, meshHabitat(blockedAtPoint), 1 / 30)
    expect(blocked.waypoint).toBe(1)
    expect(blocked.position.x).toBeGreaterThan(0)
    expect(blocked.position.x).toBeLessThan(target.x)
  })
  it('rejects stale out-of-water arrival and isolates query inputs from callback mutation', () => {
    const query = vi.fn((start, end, _radius, budget) => {
      start.x = 100; end.x = 100; budget.maxNodeVisits = 0
      return { status: 'clear' as const, work: { nodeVisits: 4097, triangleTests: 0 } }
    })
    const habitatWithQuery = meshHabitat(query)
    const outside = createSwimmingFish('mesh-stale-bounds', 'yellow-tang', { x: .97, y: 0, z: 0 }, .5, undefined, { collisionRadiusM: .05 })
    outside.route = [outside.position, { x: .97, y: 0, z: 0 }]; outside.waypoint = 1
    stepSwimmingFish(outside, habitatWithQuery, 1 / 30)
    expect(outside.route).toEqual([])
    expect(outside.position.x).toBe(.97)
    expect(query).not.toHaveBeenCalled()

    const fish = createSwimmingFish('mesh-query-mutation', 'yellow-tang', { x: -.7, y: .6, z: 0 }, .5, undefined, { collisionRadiusM: .05 })
    fish.route = [fish.position, { x: -.6, y: .6, z: 0 }]; fish.waypoint = 1
    stepSwimmingFish(fish, habitatWithQuery, 1 / 30)
    expect(query).toHaveBeenCalled()
    expect(fish.position).toEqual({ x: -.7, y: .6, z: 0 })
    expect(fish.route).toEqual([])
  })
  it('does not spiral around a waypoint it approaches at an angle (AQ-49)', () => {
    // A slow-turning, fast-cruising fish that meets its waypoint 90° off its
    // heading used to orbit it in a slowly tightening spiral (~650° of turning
    // and ~4.3 s per waypoint) because its turn radius at approach speed
    // dwarfs the 0.025 m arrival radius. The passed-waypoint rule completes
    // the waypoint once it sits abeam inside the approach corridor instead,
    // so the fish swims on after a normal ~90° turn.
    const openWater: WaterHabitat = { bounds: { min: { x: -5, y: -2.4, z: -3 }, max: { x: 5, y: 2.8, z: 2.8 } }, obstacles: [], anchors: [] }
    const approach = (habitat: WaterHabitat) => {
      const fish = createSwimmingFish('spiral-blue-tang', 'blue-tang', { x: 0, y: 0, z: 0 }, .5, {}, { collisionRadiusM: 0.04 })
      fish.yaw = Math.PI / 2
      fish.speed = 1
      fish.behavior.variation.turnDegreesPerSecond = 58
      fish.behavior.variation.cruiseSpeedTankWidthsPerSecond = 0.14
      fish.route = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]
      fish.waypoint = 1
      fish.targetWait = 0
      let totalTurn = 0
      let previousYaw = fish.yaw
      let completedAt = -1
      for (let step = 0; step < 3 * 60; step++) {
        stepSwimmingFish(fish, habitat, 1 / 60)
        totalTurn += Math.abs(Math.atan2(Math.sin(fish.yaw - previousYaw), Math.cos(fish.yaw - previousYaw)))
        previousYaw = fish.yaw
        if (fish.waypoint >= fish.route.length) { completedAt = step / 60; break }
      }
      return { completedAt, totalTurnDeg: totalTurn * 180 / Math.PI }
    }
    const aabb = approach(openWater)
    expect(aabb.completedAt).toBeGreaterThanOrEqual(0)
    expect(aabb.completedAt).toBeLessThan(3)
    expect(aabb.totalTurnDeg).toBeLessThan(270)
    // The same arrival in mesh mode, where the final-waypoint gate is 0.25 mm
    // instead of 0.025 m, so the passed rule is the only way an angled
    // approach completes at all.
    const mesh = { ...openWater, meshNavigation: { units: 'meter' as const, spacingM: 0.5, budget: { ...meshBudget }, movementBudget: { ...movementBudget }, queryCapsule: (() => ({ status: 'clear' as const, work: { nodeVisits: 0, triangleTests: 0 } })) } }
    const meshResult = approach(mesh)
    expect(meshResult.completedAt).toBeGreaterThanOrEqual(0)
    expect(meshResult.completedAt).toBeLessThan(3)
    expect(meshResult.totalTurnDeg).toBeLessThan(270)
  })
})

describe('school stepping and group disturbance (AQ-41/AQ-44)', () => {
  function chromisPair() {
    return [
      createSwimmingFish('school-chromis-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5),
      createSwimmingFish('school-chromis-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5),
    ]
  }
  function toSwim(fish: ReturnType<typeof createSwimmingFish>) {
    for (let i = 0; i < 400 && fish.behavior.state !== 'swim'; i++) {
      fish.behavior = advanceFishBehavior(fish.behavior, .25)
    }
    if (fish.behavior.state !== 'swim') throw new Error(`fish ${fish.id} never reached swim (state ${fish.behavior.state})`)
  }

  it('applies cohesion to conspecific grouping species and none to solitary species (AC #1)', () => {
    // AQ-84: cohesion now steers heading instead of translating the body,
    // so the school pair's positions diverge from the identical-seed solo
    // pair's over a second of swimming, rather than by a one-substep nudge.
    const soloA = createSwimmingFish('school-chromis-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const soloB = createSwimmingFish('school-chromis-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    for (let frame = 0; frame < 30; frame++) {
      stepSwimmingFish(soloA, habitat, 1 / 30)
      stepSwimmingFish(soloB, habitat, 1 / 30)
    }
    const [schoolA, schoolB] = chromisPair()
    for (let frame = 0; frame < 30; frame++) stepSwimmingSchool([schoolA, schoolB], habitat, 1 / 30)
    expect(distance(schoolA.position, soloA.position) + distance(schoolB.position, soloB.position)).toBeGreaterThan(0.01)

    // Solitary royal grammas at the same distance: steering is exactly zero,
    // so the school step matches the solo step bit for bit.
    const soloGrammaA = createSwimmingFish('school-gramma-a', 'royal-gramma', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const soloGrammaB = createSwimmingFish('school-gramma-b', 'royal-gramma', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    stepSwimmingFish(soloGrammaA, habitat, 1 / 60)
    stepSwimmingFish(soloGrammaB, habitat, 1 / 60)
    const schoolGrammaA = createSwimmingFish('school-gramma-a', 'royal-gramma', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const schoolGrammaB = createSwimmingFish('school-gramma-b', 'royal-gramma', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    stepSwimmingSchool([schoolGrammaA, schoolGrammaB], habitat, 1 / 60)
    expect(schoolGrammaA.position).toEqual(soloGrammaA.position)
    expect(schoolGrammaB.position).toEqual(soloGrammaB.position)
  })

  it('freezes steering under reduced motion while route motion continues (AC #3)', () => {
    const soloA = createSwimmingFish('school-chromis-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const soloB = createSwimmingFish('school-chromis-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    stepSwimmingFish(soloA, habitat, 1 / 60)
    stepSwimmingFish(soloB, habitat, 1 / 60)
    const [reducedA, reducedB] = chromisPair()
    stepSwimmingSchool([reducedA, reducedB], habitat, 1 / 60, false, { reducedMotion: true })
    expect(reducedA.position).toEqual(soloA.position)
    expect(reducedB.position).toEqual(soloB.position)
  })

  it('separates overlapping schoolmates without ever moving through the reef (AC #3)', () => {
    // AQ-85: 0.1 apart is inside the physical minSep for a chromis pair
    // (0.072 + 0.072 + 0.06 = 0.204); the legacy 1.12m range would have
    // separated fish 0.3m apart, which is now ordinary school spacing.
    const closeA = createSwimmingFish('school-close-a', 'blue-green-chromis', { x: 0, y: 0.8, z: 1.0 }, .5)
    const closeB = createSwimmingFish('school-close-b', 'blue-green-chromis', { x: 0.1, y: 0.8, z: 1.0 }, .5)
    const initial = distance(closeA.position, closeB.position)
    for (let frame = 0; frame < 60; frame++) {
      const previousA = { ...closeA.position }, previousB = { ...closeB.position }
      stepSwimmingSchool([closeA, closeB], habitat, 1 / 30)
      expect(isWaterSegmentSafe({ start: previousA, target: closeA.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: .5 })).toBe(true)
      expect(isWaterSegmentSafe({ start: previousB, target: closeB.position, waterBounds: habitat.bounds, obstacles: habitat.obstacles, fishClearanceRadius: .5 })).toBe(true)
    }
    expect(distance(closeA.position, closeB.position)).toBeGreaterThan(initial)
  })

  it('keeps a chromis pair within schooling range over time (AC #1)', () => {
    const [a, b] = chromisPair()
    for (let frame = 0; frame < 300; frame++) stepSwimmingSchool([a, b], habitat, 1 / 30)
    expect(distance(a.position, b.position)).toBeLessThan(2.2)
    // AQ-85: schoolmates may group down to ~their 0.2 physical minSep, so
    // the floor guards against collapse/interpenetration, not close grouping.
    expect(distance(a.position, b.position)).toBeGreaterThan(0.15)
  })

  it('holds a stopped fish still while it still counts as a peer (AQ-44 AC #4)', () => {
    const [a, b] = chromisPair()
    const held = { ...a.position }
    stepSwimmingSchool([a, b], habitat, 1 / 60, [true, false])
    expect(a.position).toEqual(held)
    expect(b.position).not.toEqual({ x: 0.9, y: 0.8, z: 1.0 })
  })

  it('retreats only the chromis school on an explicit group disturbance, never the whole tank (AC #4)', () => {
    const chromisA = createSwimmingFish('disturb-chromis-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const chromisB = createSwimmingFish('disturb-chromis-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    const anthias = createSwimmingFish('disturb-anthias', 'lyretail-anthias', { x: 2, y: 0.5, z: 1.0 }, .5)
    const tang = createSwimmingFish('disturb-tang', 'yellow-tang', { x: -2, y: 0.5, z: 1.0 }, .5)
    for (const fish of [chromisA, chromisB, anthias, tang]) toSwim(fish)
    const anthiasBefore = anthias.behavior
    const tangBefore = tang.behavior

    disturbSchool([chromisA, chromisB, anthias, tang], 'blue-green-chromis')

    for (const fish of [chromisA, chromisB]) {
      expect(fish.behavior.state).toBe('retreat')
      expect(fish.behavior.targetAnchor).toBe('branchingCoralRefuge')
    }
    expect(anthias.behavior).toBe(anthiasBefore)
    expect(tang.behavior).toBe(tangBefore)

    // Anthias has no retreat state: a disturbance aimed at anthias changes nothing.
    disturbSchool([chromisA, chromisB, anthias, tang], 'lyretail-anthias')
    expect(anthias.behavior.state).toBe('swim')
  })

  it('never panics the school from a single-fish service click (AC #4)', () => {
    const chromisA = createSwimmingFish('click-chromis-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const chromisB = createSwimmingFish('click-chromis-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    const beforeB = chromisB.behavior
    startleFish(chromisA, habitat)
    expect(chromisA.startleSeconds).toBeGreaterThan(0)
    expect(chromisB.behavior).toBe(beforeB)
    expect(chromisB.startleSeconds).toBe(0)
  })
})

describe('schooling steering through heading kinematics (AQ-84)', () => {
  const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  // An outer fish with no route to follow: the only turn it can make is the
  // schooling turn, so yaw and turn kinematics isolate the AQ-84 path. The
  // peer is stopped (still counts as a peer) so the school heading is fixed.
  function outerFishNoRoute() {
    // 1.5 units apart: inside the shoal neighbor radius (2.2) and outside
    // the separation range (~0.2, AQ-85), so only cohesion/alignment act.
    const outer = createSwimmingFish('aq84-outer', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    outer.yaw = 0
    outer.route = []
    outer.targetWait = 5
    const peer = createSwimmingFish('aq84-peer', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    peer.yaw = 0
    return { outer, peer }
  }

  it('turns an outer fish yaw toward the school center without moving it sideways (AC #1/#4)', () => {
    const { outer, peer } = outerFishNoRoute()
    const start = { ...outer.position }
    // School heading for the outer fish: cohesion toward the peer (+x) plus
    // alignment with the peer's +z heading — about 1.02 rad from yaw 0.
    const schoolHeading = Math.atan2(0.36, 0.22)
    stepSwimmingSchool([outer, peer], habitat, 1 / 60, [false, true])
    expect(outer.yaw).toBeGreaterThan(0)
    expect(Math.abs(angleDiff(outer.yaw, schoolHeading))).toBeLessThan(Math.abs(angleDiff(0, schoolHeading)))
    // No decoupled sideways drift: with no route and no speed the fish turns
    // in place — its position is bit-identical.
    expect(outer.position).toEqual(start)
    // The turn kinematics record the school turn (AQ-84 AC #2).
    expect(outer.turnKinematics.yawRateRadPerSec).toBeGreaterThan(0)
    expect(outer.turnKinematics.smoothedYawRate).toBeGreaterThan(0)
  })

  it('respects the species turn limit on every substep and never overshoots the school heading (AC #2)', () => {
    const { outer, peer } = outerFishNoRoute()
    const turnRateRad = outer.behavior.variation.turnDegreesPerSecond * Math.PI / 180
    const schoolHeading = Math.atan2(0.36, 0.22)
    let previousYaw = outer.yaw
    for (let frame = 0; frame < 60; frame++) {
      stepSwimmingSchool([outer, peer], habitat, 1 / 30, [false, true])
      const step = Math.abs(angleDiff(outer.yaw, previousYaw))
      expect(step).toBeLessThanOrEqual(turnRateRad * (1 / 30) + 1e-9)
      previousYaw = outer.yaw
    }
    expect(outer.yaw).toBeGreaterThan(0.5)
    expect(Math.abs(angleDiff(outer.yaw, schoolHeading))).toBeLessThan(0.5)
  })

  it('advances curvilinearly with heading-locked displacement, not sideways drift (AC #4)', () => {
    const outer = createSwimmingFish('aq84-advance-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const peer = createSwimmingFish('aq84-advance-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    let lateral = 0
    let forward = 0
    for (let frame = 0; frame < 30; frame++) {
      const before = { ...outer.position }
      stepSwimmingSchool([outer, peer], habitat, 1 / 30)
      const dx = outer.position.x - before.x
      const dz = outer.position.z - before.z
      // Displacement measured against the heading the fish swam along this
      // substep: heading-locked travel has (near-)zero lateral component.
      const forwardX = Math.sin(outer.yaw)
      const forwardZ = Math.cos(outer.yaw)
      lateral += Math.abs(dx * forwardZ - dz * forwardX)
      forward += dx * forwardX + dz * forwardZ
    }
    expect(outer.yaw).not.toBe(Math.PI / 2)
    expect(forward).toBeGreaterThan(0.05)
    expect(lateral).toBeLessThan(0.05)
    expect(lateral).toBeLessThan(forward * 0.5)
  })

  it('freezes schooling heading under reduced motion while route motion continues (AC #3)', () => {
    const soloA = createSwimmingFish('aq84-frozen-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const soloB = createSwimmingFish('aq84-frozen-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    stepSwimmingFish(soloA, habitat, 1 / 60)
    stepSwimmingFish(soloB, habitat, 1 / 60)
    const schoolA = createSwimmingFish('aq84-frozen-a', 'blue-green-chromis', { x: -0.6, y: 0.8, z: 1.0 }, .5)
    const schoolB = createSwimmingFish('aq84-frozen-b', 'blue-green-chromis', { x: 0.9, y: 0.8, z: 1.0 }, .5)
    stepSwimmingSchool([schoolA, schoolB], habitat, 1 / 60, false, { reducedMotion: true })
    expect(schoolA.yaw).toBe(soloA.yaw)
    expect(schoolB.yaw).toBe(soloB.yaw)
    expect(schoolA.position).toEqual(soloA.position)
    expect(schoolB.position).toEqual(soloB.position)
  })
})

describe('socket-derived anchor interactions (AQ-82)', () => {
  const reefBounds: WaterHabitat['bounds'] = { min: { x: -4, y: -2.25, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }
  function reefHabitat() {
    const left = instantiateModularReefHabitat('left', 4.5, { x: -2.35, y: -2.7, z: -1.35 }, 'reef-0', 0.08)
    const right = instantiateModularReefHabitat('right', 4.3, { x: 2.65, y: -2.7, z: -1.2 }, 'reef-1', -0.1)
    return {
      left,
      right,
      habitat: {
        bounds: reefBounds,
        obstacles: [...left.obstacles, ...right.obstacles],
        anchors: [...left.anchors, ...right.anchors],
      } satisfies WaterHabitat,
    }
  }

  it('routes a clownfish to its host anemone with body-radius clearance where the legacy clearance blocks it (AC #3)', () => {
    const { habitat, left } = reefHabitat()
    const anemone = left.anchors.find(anchor => anchor.anchor === 'hostAnemone')!
    const request = { instanceId: 'aq82-clown-route', speciesId: 'ocellaris-clownfish', state: 'idle' as const, anchor: 'hostAnemone' as const, cue: 'Hold and bob within the host tentacles.', generation: 1 }
    const start = { x: 0, y: 1.0, z: 1.5 }
    const blocked = resolveHabitatRoute({ request, start, waterBounds: reefBounds, obstacles: habitat.obstacles, anchorLocations: habitat.anchors, fishClearanceRadius: 0.5 })
    expect(blocked.status).toBe('blocked')
    const fish = createSwimmingFish('aq82-clown-route', 'ocellaris-clownfish', start, 0.5)
    const routed = resolveHabitatRoute({ request, start, waterBounds: reefBounds, obstacles: habitat.obstacles, anchorLocations: habitat.anchors, fishClearanceRadius: anchorApproachClearanceM(fish) })
    expect(routed.status).toBe('route')
    if (routed.status === 'route') expect(routed.locationId).toBe(anemone.id)
  })

  it('holds a clownfish at its host anemone instead of wandering off mid-state (AC #4)', () => {
    const { habitat, left } = reefHabitat()
    const anemone = left.anchors.find(anchor => anchor.anchor === 'hostAnemone')!
    const fish = createSwimmingFish('aq82-clown-hold', 'ocellaris-clownfish', { x: anemone.position.x, y: anemone.position.y + 1.2, z: anemone.position.z + 1 }, 0.5)
    let minDistance = Infinity
    for (let frame = 0; frame < 1200; frame++) {
      stepSwimmingFish(fish, habitat, 1 / 30)
      expect(Number.isFinite(fish.position.x + fish.position.y + fish.position.z)).toBe(true)
      minDistance = Math.min(minDistance, distance(fish.position, anemone.position))
    }
    expect(minDistance).toBeLessThan(0.5)
    expect(distance(fish.position, anemone.position)).toBeLessThan(0.8)
  })

  it('grazes nose-down at a foraging anchor without penetrating rigid rock (AC #4)', () => {
    // The ledge grazing anchors sit inside the coral envelope (and the
    // expanded rock AABB) by design, so this uses a socket-derived
    // foraging patch — same nose-down interaction (-0.22 rad) as grazing.
    const { habitat, left } = reefHabitat()
    const forage = left.anchors.find(anchor => anchor.anchor === 'foragingPatch')!
    const fish = createSwimmingFish('aq82-gramma-graze', 'royal-gramma', { x: forage.position.x, y: forage.position.y + 0.03, z: forage.position.z + 0.04 }, 0.57)
    // Drive the FSM to forage deterministically: advance through idle, then
    // take the foraging opportunity once swimming near the anchor.
    for (let i = 0; i < 200 && fish.behavior.state !== 'forage'; i++) {
      fish.behavior = advanceFishBehavior(fish.behavior, 0.5)
      if (fish.behavior.state === 'swim') {
        fish.behavior = dispatchBehaviorEvent(fish.behavior, { type: 'behavior-opportunity', instanceId: fish.id, trigger: 'foraging-opportunity' })
      }
    }
    expect(fish.behavior.state).toBe('forage')
    expect(fish.behavior.targetAnchor).toBe('foragingPatch')
    let forageMinDistance = Infinity
    // The forage bout is short (~2.5 s) and the route to the anchor eats
    // most of it, so the nose-down pose lands while the fish HOLDS at the
    // patch (its idle state targets the same anchor) rather than mid-bout.
    let holdMinPitch = 0
    for (let frame = 0; frame < 600; frame++) {
      const previous = { ...fish.position }
      stepSwimmingFish(fish, habitat, 1 / 30)
      const dist = distance(fish.position, forage.position)
      if (fish.behavior.state === 'forage') {
        forageMinDistance = Math.min(forageMinDistance, dist)
      }
      if (fish.behavior.targetAnchor === 'foragingPatch' && dist < 0.8) {
        holdMinPitch = Math.min(holdMinPitch, fish.pitch)
      }
      // Never penetrates rigid rock, even at body-radius clearance.
      expect(isWaterSegmentSafe({ start: previous, target: fish.position, waterBounds: reefBounds, obstacles: habitat.obstacles, fishClearanceRadius: anchorApproachClearanceM(fish) })).toBe(true)
    }
    expect(forageMinDistance).toBeLessThan(0.35)
    expect(holdMinPitch).toBeLessThan(-0.15)
  })

  it('escapes the legacy envelope after nestling at an anchor instead of stalling (AC #3)', () => {
    // A blue tang placed at a foraging patch (its own refuge is the
    // branching coral, so it has no reason to stay) must wander off.
    const { habitat, left } = reefHabitat()
    const forage = left.anchors.find(anchor => anchor.anchor === 'foragingPatch')!
    const fish = createSwimmingFish('aq82-tang-escape', 'blue-tang', { ...forage.position }, 0.57)
    let maxDistance = 0
    for (let frame = 0; frame < 600; frame++) {
      const previous = { ...fish.position }
      stepSwimmingFish(fish, habitat, 1 / 30)
      maxDistance = Math.max(maxDistance, distance(fish.position, forage.position))
      expect(isWaterSegmentSafe({ start: previous, target: fish.position, waterBounds: reefBounds, obstacles: habitat.obstacles, fishClearanceRadius: anchorApproachClearanceM(fish) })).toBe(true)
    }
    expect(maxDistance).toBeGreaterThan(1)
  })
})
