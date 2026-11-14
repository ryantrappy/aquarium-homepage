import { describe, expect, it } from 'vitest'
import {
  createFishBehaviorInstance,
  getNavigationRequest,
  replanNavigation,
  reportNavigationOutcome,
} from './behavior-runtime'
import {
  getClearanceExpandedObstacles,
  isWaterSegmentSafe,
  resolveHabitatRoute,
  type AxisAlignedBox,
  type HabitatAnchorLocation,
  type Vec3,
} from './habitat-navigation'

const bounds: AxisAlignedBox = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } }
const start: Vec3 = { x: 1, y: 5, z: 5 }
const host: HabitatAnchorLocation = { id: 'anemone-host-1', anchor: 'hostAnemone', position: { x: 9, y: 5, z: 5 } }

function request() {
  return getNavigationRequest(createFishBehaviorInstance('clown-1', 'ocellaris-clownfish', 42))!
}

describe('3D habitat navigation core', () => {
  it('reuses inflated obstacle geometry per habitat and clearance, invalidating changed inputs', () => {
    const obstacles = [{ id: 'rock', bounds: { min: { x: 2, y: 2, z: 2 }, max: { x: 3, y: 3, z: 3 } } }]
    const first = getClearanceExpandedObstacles(obstacles, 0.5)

    expect(getClearanceExpandedObstacles(obstacles, 0.5)).toBe(first)
    expect(first[0].min).toEqual({ x: 1.5, y: 1.5, z: 1.5 })
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first[0].min)).toBe(true)
    const otherClearance = getClearanceExpandedObstacles(obstacles, 0.75)
    expect(otherClearance).not.toBe(first)
    expect(getClearanceExpandedObstacles(obstacles, 0.75)).toBe(otherClearance)

    obstacles[0].bounds.min.x = 2.2
    const afterMutation = getClearanceExpandedObstacles(obstacles, 0.5)
    expect(afterMutation).not.toBe(first)
    expect(afterMutation[0].min.x).toBeCloseTo(1.7, 12)
    expect(getClearanceExpandedObstacles(obstacles, 0.5)).toBe(afterMutation)

    const replacement = [{ id: 'replacement', bounds: { min: { x: 6, y: 2, z: 2 }, max: { x: 7, y: 3, z: 3 } } }]
    expect(getClearanceExpandedObstacles(replacement, 0.5)).not.toBe(afterMutation)
    expect(() => isWaterSegmentSafe({
      start, target: host.position, waterBounds: bounds,
      obstacles: [{ id: 'invalid', bounds: { min: { x: 4, y: 2, z: 2 }, max: { x: 3, y: 3, z: 3 } } }],
      fishClearanceRadius: 0.5,
    })).toThrow(RangeError)
  })

  it('routes around an inflated 3D obstacle with fish clearance', () => {
    const result = resolveHabitatRoute({
      request: request(),
      start,
      waterBounds: bounds,
      obstacles: [{ id: 'reef-rock', bounds: { min: { x: 4, y: 4, z: 4 }, max: { x: 6, y: 6, z: 6 } } }],
      anchorLocations: [host],
      fishClearanceRadius: 0.5,
    })

    expect(result.status).toBe('route')
    if (result.status !== 'route') return
    expect(result.path[0]).toEqual(start)
    expect(result.path[result.path.length - 1]).toEqual(host.position)
    expect(result.path.length).toBeGreaterThan(2)
    expect(result.length).toBeGreaterThan(8)
    expect(result.path.some((point) => point.z < 3.5 || point.z > 6.5 || point.y < 3.5 || point.y > 6.5)).toBe(true)
    for (let segment = 0; segment < result.path.length - 1; segment += 1) {
      const from = result.path[segment]
      const to = result.path[segment + 1]
      for (let step = 1; step < 100; step += 1) {
        const t = step / 100
        const point = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          z: from.z + (to.z - from.z) * t,
        }
        expect(point.x > 3.5 && point.x < 6.5 && point.y > 3.5 && point.y < 6.5 && point.z > 3.5 && point.z < 6.5).toBe(false)
      }
    }
  })

  it('blocks paths through a full-depth wall and when fish clearance leaves the tank', () => {
    const wall = { id: 'reef-wall', bounds: { min: { x: 4.9, y: 0, z: 0 }, max: { x: 5.1, y: 10, z: 10 } } }
    const separated = resolveHabitatRoute({
      request: request(), start, waterBounds: bounds, obstacles: [wall], anchorLocations: [host], fishClearanceRadius: 0.2,
    })
    const unsafeStart = resolveHabitatRoute({
      request: request(), start: { x: 0.1, y: 5, z: 5 }, waterBounds: bounds, obstacles: [], anchorLocations: [host], fishClearanceRadius: 0.2,
    })

    expect(separated.status).toBe('blocked')
    expect(unsafeStart.status).toBe('blocked')
  })

  it('clips boundary-spanning obstacle candidates and routes through the remaining depth axis', () => {
    const ySpanningRock = {
      id: 'y-spanning-rock',
      bounds: { min: { x: 4, y: 0, z: 4 }, max: { x: 6, y: 10, z: 6 } },
    }
    const result = resolveHabitatRoute({
      request: request(),
      start,
      waterBounds: bounds,
      obstacles: [ySpanningRock],
      anchorLocations: [host],
      fishClearanceRadius: 0.2,
    })

    expect(result.status).toBe('route')
    if (result.status !== 'route') return
    expect(result.path.some((point) => point.z < 3.8 || point.z > 6.2)).toBe(true)
    expect(result.path.every((point) => point.y >= 0.2 && point.y <= 9.8)).toBe(true)
    for (let segment = 0; segment < result.path.length - 1; segment += 1) {
      const from = result.path[segment]
      const to = result.path[segment + 1]
      for (let step = 1; step < 100; step += 1) {
        const t = step / 100
        const point = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          z: from.z + (to.z - from.z) * t,
        }
        expect(point.x > 3.8 && point.x < 6.2 && point.y > -0.2 && point.y < 10.2 && point.z > 3.8 && point.z < 6.2).toBe(false)
      }
    }
  })

  it('returns unavailable when no supplied compatible location exists', () => {
    const none = resolveHabitatRoute({
      request: request(), start, waterBounds: bounds, obstacles: [], anchorLocations: [], fishClearanceRadius: 0.2,
    })
    const wrongSpecies = resolveHabitatRoute({
      request: request(), start, waterBounds: bounds, obstacles: [],
      anchorLocations: [{ ...host, compatibleSpecies: ['blue-tang'] }], fishClearanceRadius: 0.2,
    })
    const wrongType = resolveHabitatRoute({
      request: request(), start, waterBounds: bounds, obstacles: [],
      anchorLocations: [{ ...host, anchor: 'rockCrevice' }], fishClearanceRadius: 0.2,
    })

    expect(none.status).toBe('unavailable')
    expect(wrongSpecies.status).toBe('unavailable')
    expect(wrongType.status).toBe('unavailable')

    const mandarinRequest = getNavigationRequest(createFishBehaviorInstance('mandarin-1', 'mandarin-dragonet', 9))!
    const wrongStateTarget = resolveHabitatRoute({
      request: { ...mandarinRequest, anchor: 'rockCrevice' },
      start,
      waterBounds: bounds,
      obstacles: [],
      anchorLocations: [{ id: 'crevice-1', anchor: 'rockCrevice', position: { x: 8, y: 5, z: 5 } }],
      fishClearanceRadius: 0.2,
    })
    expect(wrongStateTarget.status).toBe('unavailable')
  })

  it('chooses the shortest reachable anchor within the selected reef flank', () => {
    const farther: HabitatAnchorLocation = { id: 'z-host', anchor: 'hostAnemone', position: { x: 9, y: 5, z: 5 } }
    const nearer: HabitatAnchorLocation = { id: 'a-host', anchor: 'hostAnemone', position: { x: 7, y: 5, z: 5 } }
    const result = resolveHabitatRoute({
      request: request(), start, waterBounds: bounds, obstacles: [], anchorLocations: [farther, nearer], fishClearanceRadius: 0,
    })

    expect(result.status).toBe('route')
    if (result.status === 'route') expect(result.locationId).toBe('a-host')
  })

  it('balances equidistant anchors across reef flanks by fish and request generation', () => {
    const anchors: HabitatAnchorLocation[] = [
      { id: 'left-host', anchor: 'hostAnemone', position: { x: 2, y: 5, z: 5 } },
      { id: 'right-host', anchor: 'hostAnemone', position: { x: 8, y: 5, z: 5 } },
    ]
    const select = (instanceId: string, generation: number) => {
      const result = resolveHabitatRoute({
        request: { ...request(), instanceId, generation },
        start: { x: 5, y: 5, z: 5 },
        waterBounds: bounds,
        obstacles: [],
        anchorLocations: anchors,
        fishClearanceRadius: 0,
      })
      expect(result.status).toBe('route')
      return result.status === 'route' ? result.locationId : undefined
    }
    const firstSelections = Array.from({ length: 32 }, (_, index) => select(`balanced-fish-${index}`, 0))
    const repeatedSelections = Array.from({ length: 32 }, (_, index) => select(`balanced-fish-${index}`, 0))
    const leftCount = firstSelections.filter(id => id === 'left-host').length
    const rightCount = firstSelections.filter(id => id === 'right-host').length

    expect(firstSelections).toEqual(repeatedSelections)
    expect(leftCount).toBeGreaterThanOrEqual(12)
    expect(rightCount).toBeGreaterThanOrEqual(12)
    expect(select('generation-rotation', 0)).not.toBe(select('generation-rotation', 1))
  })

  it('carries request generations through routes and ignores a stale same-instance completion', () => {
    const fish = createFishBehaviorInstance('clown-1', 'ocellaris-clownfish', 42)
    const firstRequest = getNavigationRequest(fish)!
    const firstRoute = resolveHabitatRoute({
      request: firstRequest, start, waterBounds: bounds, obstacles: [], anchorLocations: [host], fishClearanceRadius: 0.2,
    })
    expect(firstRoute.status).toBe('route')
    expect(firstRoute.generation).toBe(firstRequest.generation)

    const replanned = replanNavigation(fish)
    expect(replanned.navigationGeneration).not.toBe(firstRequest.generation)
    expect(reportNavigationOutcome(replanned, firstRoute.generation, firstRoute.anchor, 'arrived')).toBe(replanned)

    const currentRequest = getNavigationRequest(replanned)!
    const currentRoute = resolveHabitatRoute({
      request: currentRequest, start, waterBounds: bounds, obstacles: [], anchorLocations: [host], fishClearanceRadius: 0.2,
    })
    expect(currentRoute.status).toBe('route')
    expect(currentRoute.generation).toBe(currentRequest.generation)
    const accepted = reportNavigationOutcome(replanned, currentRoute.generation, currentRoute.anchor, 'arrived')
    expect(accepted.navigationOutcome).toBe('arrived')
  })

  it('rejects malformed geometry and bounded-work overages', () => {
    expect(() => resolveHabitatRoute({
      request: request(), start, waterBounds: bounds, obstacles: [], anchorLocations: [host], fishClearanceRadius: Number.NaN,
    })).toThrow(RangeError)
    expect(() => resolveHabitatRoute({
      request: request(), start, waterBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 10, z: 10 } },
      obstacles: [], anchorLocations: [host], fishClearanceRadius: 0,
    })).toThrow(RangeError)
    expect(() => resolveHabitatRoute({
      request: request(), start, waterBounds: bounds,
      obstacles: Array.from({ length: 33 }, (_, index) => ({
        id: `box-${index}`, bounds: { min: { x: 2, y: 2, z: 2 }, max: { x: 3, y: 3, z: 3 } },
      })),
      anchorLocations: [host], fishClearanceRadius: 0,
    })).toThrow(RangeError)
  })
})
