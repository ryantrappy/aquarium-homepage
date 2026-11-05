import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry } from 'three'
import { createSwimmingFish, distance, startleFish, stepSwimmingFish, type WaterHabitat } from './motion'
import { findWaterRoute, isWaterSegmentSafe } from '../../simulation/habitat-navigation'
import { buildMeshCollider } from '../../simulation/mesh-collision'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import { findMeshRoute, type CapsuleClearanceQuery, type MeshNavigationBudget } from '../../simulation/mesh-navigation'
import { dispatchBehaviorEvent } from '../../simulation/behavior-runtime'
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
    for (let i = 0; i < 2400 && fish.position.x < .5; i++) stepSwimmingFish(fish, meshHabitat(checked), 1 / 30)
    expect(fish.position.x).toBeGreaterThan(.4)
    expect(Math.min(...calls.map(call => Math.min(call.start.y, call.end.y)))).toBeLessThan(-.05)
    expect(calls.every(call => call.radius === .04)).toBe(true)
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
})
