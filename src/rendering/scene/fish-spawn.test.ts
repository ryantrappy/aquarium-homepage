import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { isWaterSegmentSafe, type AxisAlignedBox, type Vec3 } from '../../simulation/habitat-navigation'
import { REEF_FISH } from '../../lib/fish'
import { getSpeciesBehaviorProfile } from '../../lib/fish-behavior'
import { EXAMPLE_SERVICES } from '../../lib/services'
import { EMPTY_FISH_EXTENSIONS } from '../../simulation/fish-extensions'
import { fishBodyRadiusM, fishClearanceRadius, fishRenderLength } from './fish-scale'
import { projectFishLinkBounds } from './fish-link-projection'
import { overviewHalfWidthAtDepth } from './camera-zoom'
import { createSwimmingFish, stepSwimmingFish } from './motion'
import { canRunFishSceneLoop, classifySpeciesVerticalTier, evaluateTieredVerticalDepthRange, findSafeFishHeading, findSafeFishSpawn, fishSceneStatus, fishSpawnPreference, fishSpawnSlotsForServices, isSafeFishPosition, FISH_SPAWN_DEPTH_PLANES, FISH_SPAWN_DEPTH_PLANE_JITTER, TIERED_VERTICAL_DEPTH_ZONES, type OccupiedFishSpawn } from './fish-spawn'
import { instantiateModularReefHabitat } from './reef-assembly'
import { reefPlacementsForViewport } from './reef-layout'

function waterBounds(width: number, height: number): AxisAlignedBox {
  const halfWidth = overviewHalfWidthAtDepth(width / height, -1.35)
  return { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
}

function maxAbsXAtDepth(width: number, height: number) {
  const aspect = width / height
  const habitatHalfWidth = overviewHalfWidthAtDepth(aspect, -1.35)
  return (z: number) => Math.min(habitatHalfWidth, overviewHalfWidthAtDepth(aspect, z))
}

function obstaclesFor(narrow: boolean) {
  return reefPlacementsForViewport(narrow).flatMap((placement, index) =>
    instantiateModularReefHabitat(
      placement.islandKind,
      placement.uniformScale,
      placement.position,
      `reef-${index}`,
      placement.yaw,
    ).obstacles,
  )
}

function oldTwoRowFrontPlane(index: number, narrow: boolean, bounds: AxisAlignedBox): Vec3 {
  const span = bounds.max.x - bounds.min.x
  const x = narrow ? [-.3, .3, 0][index % 3] : ((index % 3) - 1) * Math.min(span * .26, 2.7)
  const y = (narrow ? [1.25, .55, 1.95][index % 3] : 1.45) - Math.floor(index / 3) * .7
  return { x, y: Math.max(.3, y), z: 1.8 + (index % 2) * .2 }
}

function spread(points: readonly Vec3[], axis: keyof Vec3) {
  return Math.max(...points.map(point => point[axis])) - Math.min(...points.map(point => point[axis]))
}

function planStarters(width: number, height: number, stratified = true) {
  const bounds = waterBounds(width, height), narrow = width < 600, obstacles = obstaclesFor(narrow)
  const lateralLimit = maxAbsXAtDepth(width, height)
  const occupied: OccupiedFishSpawn[] = []
  const slots = fishSpawnSlotsForServices(EXAMPLE_SERVICES)
  const placements = EXAMPLE_SERVICES.map(service => {
    const clearance = fishClearanceRadius(service.fishId)
    const bodyRadiusM = fishBodyRadiusM(service.fishId)
    const preference = fishSpawnPreference(service.id, service.fishId, bounds, clearance, stratified ? slots.get(service.id) : undefined, lateralLimit)
    expect(preference, service.fishId).toBeDefined()
    const verticalRange = evaluateTieredVerticalDepthRange(service.fishId, bounds, clearance)
    expect(verticalRange, service.fishId).toBeDefined()
    const position = findSafeFishSpawn(preference!.position, bounds, obstacles, clearance, occupied, undefined, bodyRadiusM, verticalRange!.worldYRange, lateralLimit)
    expect(position, service.fishId).toBeDefined()
    const yaw = findSafeFishHeading(position!, preference!.yaw, bounds, obstacles, clearance, lateralLimit)
    expect(yaw, service.fishId).toBeDefined()
    occupied.push({ position: position!, clearance, bodyRadiusM })
    return { service, clearance, bodyRadiusM, verticalRange: verticalRange!, preference: preference!, position: position!, yaw: yaw! }
  })
  return { bounds, obstacles, placements }
}

describe('safe aquarium fish spawning', () => {
  it('uses the wider reef-plane spawn spread while keeping each depth inside the overview frustum', () => {
    for (const [width, height] of [[1440, 900], [402, 874]]) {
      const bounds = waterBounds(width, height)
      const lateralLimit = maxAbsXAtDepth(width, height)
      const clearance = fishClearanceRadius('yellow-tang')
      const left = fishSpawnPreference('left-side-slot', 'yellow-tang', bounds, clearance, { index: 0, count: 2 }, lateralLimit)!
      const right = fishSpawnPreference('right-side-slot', 'yellow-tang', bounds, clearance, { index: 1, count: 2 }, lateralLimit)!
      const leftSpawn = findSafeFishSpawn(left.position, bounds, [], clearance, [], undefined, undefined, undefined, lateralLimit)!
      const rightSpawn = findSafeFishSpawn(right.position, bounds, [], clearance, [], undefined, undefined, undefined, lateralLimit)!

      expect(Math.abs(leftSpawn.x)).toBeLessThanOrEqual(lateralLimit(leftSpawn.z) - clearance + 1e-9)
      expect(Math.abs(rightSpawn.x)).toBeLessThanOrEqual(lateralLimit(rightSpawn.z) - clearance + 1e-9)
      if (width > 600) {
        expect(leftSpawn.x).toBeLessThan(-3.1)
        expect(rightSpawn.x).toBeGreaterThan(3.1)
      } else {
        expect(Math.abs(leftSpawn.x)).toBeGreaterThan(.5)
        expect(Math.abs(rightSpawn.x)).toBeGreaterThan(.5)
      }
    }
  })

  it('relocates a front-depth fish that would be outside the resized overview frustum', () => {
    const bounds = waterBounds(1440, 900)
    const lateralLimit = maxAbsXAtDepth(1440, 900)
    const clearance = .2
    const back = { x: 4.3, y: 0, z: -1.35 }
    const front = { x: 4.3, y: 0, z: 2.4 }
    expect(isSafeFishPosition(back, clearance, bounds, [], lateralLimit)).toBe(true)
    expect(isSafeFishPosition(front, clearance, bounds, [], lateralLimit)).toBe(false)
    const relocated = findSafeFishSpawn(front, bounds, [], clearance, [], undefined, undefined, undefined, lateralLimit)!
    expect(isSafeFishPosition(relocated, clearance, bounds, [], lateralLimit)).toBe(true)
    expect(Math.abs(relocated.x)).toBeLessThanOrEqual(lateralLimit(relocated.z) - clearance + 1e-9)

    const edge = { x: lateralLimit(2.4) - clearance - .01, y: 0, z: 2.4 }
    expect(findSafeFishHeading(edge, Math.PI / 2, bounds, [], clearance, lateralLimit)).not.toBe(Math.PI / 2)
    expect(isSafeFishPosition(back, clearance, bounds, [], () => Number.NaN)).toBe(false)
    expect(findSafeFishSpawn(back, bounds, [], clearance, [], undefined, undefined, undefined, () => { throw new Error('frustum unavailable') })).toBeUndefined()
  })

  it('searches wider back-depth water when the preferred front-depth lane is unavailable', () => {
    const bounds: AxisAlignedBox = { min: { x: -5, y: -2, z: -2 }, max: { x: 5, y: 2, z: 2 } }
    const lateralLimit = (z: number) => z > 0 ? 1 : 5
    const spawn = findSafeFishSpawn({ x: 0, y: 0, z: 1.5 }, bounds, [], .1, [],
      candidate => candidate.z < 0 && candidate.x > 3, undefined, undefined, lateralLimit)
    expect(spawn).toBeDefined()
    expect(spawn!.x).toBeGreaterThan(3)
    expect(spawn!.z).toBeLessThan(0)
    expect(isSafeFishPosition(spawn!, .1, bounds, [], lateralLimit)).toBe(true)
  })

  it.each([
    ['phone 402x874', 402, 874, true],
    ['laptop 1440x900', 1440, 900, false],
  ])('stages all five starter fish across the current modular habitat at %s', (_label, width, height) => {
    const { bounds, obstacles, placements } = planStarters(Number(width), Number(height))
    expect(EXAMPLE_SERVICES).toHaveLength(5)

    for (const item of placements) {
      const { service, clearance, position, preference } = item
      expect(isSafeFishPosition(position, clearance, bounds, obstacles), service.name).toBe(true)
      expect(position.x).toBeGreaterThanOrEqual(bounds.min.x + clearance - 1e-9)
      expect(position.x).toBeLessThanOrEqual(bounds.max.x - clearance + 1e-9)
      expect(position.y).toBeGreaterThanOrEqual(bounds.min.y + clearance - 1e-9)
      expect(position.y).toBeLessThanOrEqual(bounds.max.y - clearance + 1e-9)
      expect(position.z).toBeGreaterThanOrEqual(bounds.min.z + clearance - 1e-9)
      expect(position.z).toBeLessThanOrEqual(bounds.max.z - clearance + 1e-9)
      const profile = getSpeciesBehaviorProfile(service.fishId)!
      const depth = (bounds.max.y - position.y) / (bounds.max.y - bounds.min.y)
      const preferredDepth = (bounds.max.y - preference.position.y) / (bounds.max.y - bounds.min.y)
      expect(preferredDepth).toBeGreaterThanOrEqual(profile.depthRange[0] - 1e-9)
      expect(preferredDepth).toBeLessThanOrEqual(profile.depthRange[1] + 1e-9)
      expect(depth).toBeGreaterThanOrEqual(profile.depthRange[0] - .1)
      expect(depth).toBeLessThanOrEqual(profile.depthRange[1] + .1)
      expect(preference.yaw).toBeGreaterThanOrEqual(0)
      expect(preference.yaw).toBeLessThan(2 * Math.PI)
      const headingTarget = { x: position.x + Math.sin(item.yaw) * Math.max(.25, Math.min(.6, clearance * .75)), y: position.y, z: position.z + Math.cos(item.yaw) * Math.max(.25, Math.min(.6, clearance * .75)) }
      expect(isWaterSegmentSafe({ start: position, target: headingTarget, waterBounds: bounds, obstacles, fishClearanceRadius: clearance })).toBe(true)
    }

    const blueTang = placements.find(item => item.service.fishId === 'blue-tang')!
    expect(blueTang.clearance).toBeCloseTo(.77, 6) // existing legacy scene units, not meters
    for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i], b = placements[j]
      const distance = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z)
      expect(distance, `${a.service.id}/${b.service.id} should respect body-radius separation when a safe candidate exists`)
        .toBeGreaterThanOrEqual(a.bodyRadiusM + b.bodyRadiusM + 0.06)
    }

    const previous = EXAMPLE_SERVICES.map((_, index) => oldTwoRowFrontPlane(index, Number(width) < 600, bounds))
    expect(spread(placements.map(item => item.position), 'z')).toBeGreaterThan(spread(previous, 'z'))
    expect(spread(placements.map(item => item.position), 'x')).toBeGreaterThan(spread(previous, 'x') * .8)
    expect(spread(placements.map(item => item.position), 'y')).toBeGreaterThan(spread(previous, 'y') * .8)
  })

  it.each([['phone', 402, 874], ['laptop', 1440, 900]])('spreads initial fish visibly across the actual %s camera', (_label, width, height) => {
    const { bounds, placements } = planStarters(Number(width), Number(height))
    const hashed = planStarters(Number(width), Number(height), false).placements
    const camera = new PerspectiveCamera(42, Number(width) / Number(height), .1, 60)
    camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0); camera.updateMatrixWorld()
    const screenCenter = (item: { service: typeof EXAMPLE_SERVICES[number]; position: Vec3 }) => {
      const projected = projectFishLinkBounds(new Vector3(item.position.x, item.position.y, item.position.z), camera, Number(width), Number(height), fishRenderLength(item.service.fishId), new Vector3())
      expect(projected, item.service.id).toBeDefined()
      return projected!.x + projected!.width / 2
    }
    const pixels = placements.map(screenCenter)
    const hashedPixels = hashed.map(screenCenter)
    const oldPixels = EXAMPLE_SERVICES.map((service, i) => screenCenter({ service, position: oldTwoRowFrontPlane(i, Number(width) < 600, bounds) }))
    const span = Math.max(...pixels) - Math.min(...pixels)
    const hashSpan = Math.max(...hashedPixels) - Math.min(...hashedPixels)
    const oldSpan = Math.max(...oldPixels) - Math.min(...oldPixels)
    expect(span, JSON.stringify({ pixels, hashedPixels, oldPixels })).toBeGreaterThan(hashSpan)
    expect(span).toBeGreaterThan(oldSpan)
    expect(span / Number(width)).toBeGreaterThan(Number(width) < 600 ? .35 : .55)
    expect(Math.min(...pixels)).toBeGreaterThan(0)
    expect(Math.max(...pixels)).toBeLessThan(Number(width))
  })

  it('assigns order-independent horizontal identity slots and independent ecological height strata', () => {
    const bounds = waterBounds(1440, 900), clearance = .3
    const slots = fishSpawnSlotsForServices(EXAMPLE_SERVICES)
    const reversedSlots = fishSpawnSlotsForServices([...EXAMPLE_SERVICES].reverse())
    expect([...slots]).toEqual([...reversedSlots])

    const horizontalOrder = [...EXAMPLE_SERVICES].sort((a, b) => a.id.localeCompare(b.id))
    const verticalOrder = [...EXAMPLE_SERVICES].sort((a, b) => {
      const aDepth = getSpeciesBehaviorProfile(a.fishId)!.depthRange
      const bDepth = getSpeciesBehaviorProfile(b.fishId)!.depthRange
      return (aDepth[0] + aDepth[1]) / 2 - (bDepth[0] + bDepth[1]) / 2 || a.id.localeCompare(b.id)
    })
    horizontalOrder.forEach((service, index) => {
      expect(slots.get(service.id)).toEqual({ index, count: EXAMPLE_SERVICES.length, heightIndex: verticalOrder.findIndex(item => item.id === service.id) })
    })
    expect(horizontalOrder.map(service => service.id)).not.toEqual(verticalOrder.map(service => service.id))

    for (const service of EXAMPLE_SERVICES) {
      const slot = slots.get(service.id)!
      const preference = fishSpawnPreference(service.id, service.fishId, bounds, fishClearanceRadius(service.fishId), slot)!
      const range = evaluateTieredVerticalDepthRange(service.fishId, bounds, fishClearanceRadius(service.fishId))!
      const normalizedDepth = (bounds.max.y - preference.position.y) / (bounds.max.y - bounds.min.y)
      expect(slot.index).toBe(horizontalOrder.findIndex(item => item.id === service.id))
      expect(slot.heightIndex).toBe(verticalOrder.findIndex(item => item.id === service.id))
      expect(normalizedDepth).toBeGreaterThanOrEqual(range.normalizedDepthRange[0] - 1e-12)
      expect(normalizedDepth).toBeLessThanOrEqual(range.normalizedDepthRange[1] + 1e-12)
    }

    expect(fishSpawnPreference('invalid', 'yellow-tang', bounds, clearance, { index: 1, count: 1 })).toBeUndefined()
    expect(fishSpawnPreference('invalid', 'yellow-tang', bounds, clearance, { index: 0, count: 0 })).toBeUndefined()
    expect(fishSpawnPreference('invalid', 'yellow-tang', bounds, clearance, { index: 0, count: 2, heightIndex: -1 })).toBeUndefined()
    expect(fishSpawnPreference('invalid', 'yellow-tang', bounds, clearance, { index: 0, count: 2, heightIndex: 2 })).toBeUndefined()
    expect(fishSpawnPreference('invalid', 'yellow-tang', bounds, clearance, { index: 0, count: 2, heightIndex: 0.5 })).toBeUndefined()
  })

  it('keeps edge-ranked slot targets finite and inside clearance-safe bounds for small and large cohorts', () => {
    const bounds = waterBounds(402, 874)
    const edgeCases: Array<{ id: string; index: number; expectedMinimum?: number; expectedMaximum?: number }> = [
      { id: 'edge-review-1', index: 0, expectedMinimum: .02 },
      { id: 'edge-review-5', index: 1, expectedMaximum: .98 },
    ]
    const clearance = fishClearanceRadius('yellow-tang')
    const safeWidth = bounds.max.x - bounds.min.x - clearance * 2
    for (const edge of edgeCases) {
      const preference = fishSpawnPreference(edge.id, 'yellow-tang', bounds, clearance, { index: edge.index, count: 2 })!
      const xFraction = (preference.position.x - bounds.min.x - clearance) / safeWidth
      expect(Number.isFinite(xFraction), edge.id).toBe(true)
      if (edge.expectedMinimum !== undefined) expect(xFraction, edge.id).toBeGreaterThanOrEqual(edge.expectedMinimum - 1e-12)
      if (edge.expectedMaximum !== undefined) expect(xFraction, edge.id).toBeLessThanOrEqual(edge.expectedMaximum + 1e-12)
    }

    for (const count of [1, 2, 3, 5, 15, 64]) for (let index = 0; index < count; index++) {
      const serviceId = `slot-${count}-${index}`
      const preference = fishSpawnPreference(serviceId, 'yellow-tang', bounds, clearance, { index, count })
      expect(preference, serviceId).toBeDefined()
      expect([preference!.position.x, preference!.position.y, preference!.position.z, preference!.yaw].every(Number.isFinite), serviceId).toBe(true)
      expect(preference!.position.x).toBeGreaterThanOrEqual(bounds.min.x + clearance)
      expect(preference!.position.x).toBeLessThanOrEqual(bounds.max.x - clearance)
      expect(preference!.position.y).toBeGreaterThanOrEqual(bounds.min.y + clearance)
      expect(preference!.position.y).toBeLessThanOrEqual(bounds.max.y - clearance)
      expect(preference!.position.z).toBeGreaterThanOrEqual(bounds.min.z + clearance)
      expect(preference!.position.z).toBeLessThanOrEqual(bounds.max.z - clearance)
    }
  })

  it('repeats identity-seeded position and heading exactly, with different seeds spreading candidates', () => {
    const bounds = waterBounds(1440, 900)
    const first = fishSpawnPreference('komodo', 'yellow-tang', bounds, fishClearanceRadius('yellow-tang'))
    expect(first).toEqual(fishSpawnPreference('komodo', 'yellow-tang', bounds, fishClearanceRadius('yellow-tang')))
    const others = EXAMPLE_SERVICES.map(service => fishSpawnPreference(service.id, service.fishId, bounds, fishClearanceRadius(service.fishId))!)
    expect(new Set(others.map(item => item.yaw)).size).toBe(others.length)
    expect(new Set(others.map(item => `${item.position.x},${item.position.y},${item.position.z}`)).size).toBe(others.length)
  })

  it('keeps yaw zero valid, picks a clear alternative around a blocked seed direction, and uses the seed if all are blocked', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    expect(findSafeFishHeading({ x: 0, y: 0, z: 0 }, 0, bounds, [], .5)).toBe(0)
    const wall = [{ id: 'front-wall', bounds: { min: { x: -.3, y: -.3, z: .15 }, max: { x: .3, y: .3, z: 1 } } }]
    const around = findSafeFishHeading({ x: 0, y: 0, z: 0 }, 0, bounds, wall, .1)
    expect(around).toBeDefined()
    expect(around).not.toBe(0)
    const sealed = [{ id: 'sealed', bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } } }]
    expect(findSafeFishHeading({ x: 0, y: 0, z: 0 }, .37, bounds, sealed, .1)).toBe(.37)
    expect(findSafeFishHeading({ x: 0, y: 0, z: 0 }, Number.NaN, bounds, [], .1)).toBeUndefined()
  })

  it('moves a blocked preferred spawn to the nearest deterministic solid-clear candidate without changing its radius', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const obstacles = [{ id: 'center-rock', bounds: { min: { x: -.2, y: -.2, z: -.2 }, max: { x: .2, y: .2, z: .2 } } }]
    const preferred = { x: 0, y: 0, z: 0 }
    const clearance = .77
    const first = findSafeFishSpawn(preferred, bounds, obstacles, clearance)
    expect(first).toBeDefined()
    expect(first).not.toEqual(preferred)
    expect(isSafeFishPosition(first!, clearance, bounds, obstacles)).toBe(true)
    expect(findSafeFishSpawn(preferred, bounds, obstacles, clearance)).toEqual(first)
    expect(clearance).toBe(.77)
  })

  it('applies an extra mesh check to spawns and fails closed when it rejects everything', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const preferred = { x: 0, y: 0, z: 0 }
    // Reject the preferred point only: the spawn moves to the next candidate.
    const moved = findSafeFishSpawn(preferred, bounds, [], 0.5, [], (candidate) => !(candidate.x === 0 && candidate.y === 0 && candidate.z === 0))
    expect(moved).toBeDefined()
    expect(moved).not.toEqual(preferred)
    // Reject everything: no spawn, rather than an unchecked one.
    expect(findSafeFishSpawn(preferred, bounds, [], 0.5, [], () => false)).toBeUndefined()
    // A throwing check fails closed for that candidate only.
    const throwing = findSafeFishSpawn(preferred, bounds, [], 0.5, [], (candidate) => {
      if (candidate.x === 0 && candidate.y === 0 && candidate.z === 0) throw new Error('mesh query failed')
      return true
    })
    expect(throwing).toBeDefined()
    expect(throwing).not.toEqual(preferred)
  })

  it('uses a best safe fallback rather than declaring no fit when only the fish-to-fish spacing is infeasible', () => {
    const bounds: AxisAlignedBox = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } }
    const occupied = [{ position: { x: 0, y: 0, z: 0 }, clearance: .77 }]
    const position = findSafeFishSpawn({ x: 0, y: 0, z: 0 }, bounds, [], .77, occupied)
    expect(position).toBeDefined()
    expect(isSafeFishPosition(position!, .77, bounds, [])).toBe(true)
    expect(Math.hypot(position!.x, position!.y, position!.z)).toBeGreaterThan(0)
  })

  it('keeps a blocked low preferred spawn inside its safe height band while searching another depth plane', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const preferred = { x: 0, y: -1.5, z: 0 }
    const band = [-1.7, -1.3] as const
    const obstacles = [{ id: 'low-center-rock', bounds: { min: { x: -0.6, y: -2, z: -0.6 }, max: { x: 0.6, y: -1.3, z: 0.6 } } }]
    // Model the extra mesh query accepting only the same X lane. Without a Y
    // bound, the nearest safe point escapes upward; with the band it must use
    // a different front/depth position inside the intended low water layer.
    const sameLane = (candidate: Vec3) => Math.abs(candidate.x) < 1e-9
    const unconstrained = findSafeFishSpawn(preferred, bounds, obstacles, 0.1, [], sameLane)
    const constrained = findSafeFishSpawn(preferred, bounds, obstacles, 0.1, [], sameLane, undefined, band)

    expect(unconstrained).toBeDefined()
    expect(unconstrained!.y).toBeGreaterThan(band[1])
    expect(constrained).toBeDefined()
    expect(constrained!.x).toBe(preferred.x)
    expect(constrained!.y).toBeGreaterThanOrEqual(band[0])
    expect(constrained!.y).toBeLessThanOrEqual(band[1])
    expect(constrained!.z).not.toBe(preferred.z)
    expect(isSafeFishPosition(constrained!, 0.1, bounds, obstacles)).toBe(true)
  })

  it('preserves preferred height before forward distance when constrained, while omitted range keeps nearest-point ranking', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const preferred = { x: 0, y: -0.45, z: 0 }
    const obstacles = [{ id: 'preferred-point-rock', bounds: { min: { x: -0.3, y: -0.55, z: -0.3 }, max: { x: 0.3, y: -0.35, z: 0.3 } } }]
    const band = [-0.6, -0.3] as const
    const near = (actual: number, expected: number) => Math.abs(actual - expected) < 1e-9
    const onlyTwoAlternatives = (candidate: Vec3) =>
      near(candidate.x, 0) && ((near(candidate.y, 0) && near(candidate.z, 0))
        || (near(candidate.y, preferred.y) && near(candidate.z, 0.95)))

    const legacyNearest = findSafeFishSpawn(preferred, bounds, obstacles, 0.1, [], onlyTwoAlternatives)
    const constrained = findSafeFishSpawn(preferred, bounds, obstacles, 0.1, [], onlyTwoAlternatives, undefined, band)

    expect(legacyNearest).toEqual({ x: 0, y: 0, z: 0 })
    expect(constrained!.x).toBeCloseTo(0)
    expect(constrained!.y).toBeCloseTo(preferred.y)
    expect(constrained!.z).toBeCloseTo(0.95)
    expect(isSafeFishPosition(legacyNearest!, 0.1, bounds, obstacles)).toBe(true)
    expect(isSafeFishPosition(constrained!, 0.1, bounds, obstacles)).toBe(true)
  })

  it('fails closed when a height band has no clearance-safe fit or is malformed', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const preferred = { x: 0, y: -1.2, z: 0 }
    const bandBlock = [{ id: 'whole-band-rock', bounds: { min: { x: -2, y: -1.6, z: -2 }, max: { x: 2, y: -0.9, z: 2 } } }]

    expect(findSafeFishSpawn(preferred, bounds, [], 0.1, [], undefined, undefined, [4, 5])).toBeUndefined()
    expect(findSafeFishSpawn(preferred, bounds, bandBlock, 0.1, [], undefined, undefined, [-1.5, -1])).toBeUndefined()
    for (const invalid of [
      [] as unknown as readonly [number, number],
      [0] as unknown as readonly [number, number],
      [0, 1, 2] as unknown as readonly [number, number],
      [Number.NaN, 1] as const,
      [0, Number.POSITIVE_INFINITY] as const,
      [1, -1] as const,
    ]) {
      expect(findSafeFishSpawn(preferred, bounds, [], 0.1, [], undefined, undefined, invalid)).toBeUndefined()
    }
  })

  it('leaves omitted height bounds unchanged for an already safe preferred spawn', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const preferred = { x: 0.2, y: 0.4, z: -0.7 }
    expect(findSafeFishSpawn(preferred, bounds, [], 0.5)).toEqual(preferred)
  })

  it('spaces spawns by body radius when both sides supply one, instead of the legacy clearance sum (PR #28 follow-up)', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const clearance = 0.56 // legacy clearance sum would demand 1.12 m
    const occupied: OccupiedFishSpawn[] = [{ position: { x: 0, y: 0, z: 0 }, clearance, bodyRadiusM: 0.07 }]
    // 0.3 m from the occupant: blocked under the legacy sum, clear under
    // body radii (0.07 + 0.07 + 0.06 = 0.20 m), so the preferred point stands.
    expect(findSafeFishSpawn({ x: 0.3, y: 0, z: 0 }, bounds, [], clearance, occupied, undefined, 0.07)).toEqual({ x: 0.3, y: 0, z: 0 })
    // A 0.1 m overlap still pushes apart under body radii.
    expect(findSafeFishSpawn({ x: 0.1, y: 0, z: 0 }, bounds, [], clearance, occupied, undefined, 0.07)).not.toEqual({ x: 0.1, y: 0, z: 0 })
    // Same geometry without body radii keeps the legacy behaviour.
    expect(findSafeFishSpawn({ x: 0.3, y: 0, z: 0 }, bounds, [], clearance, [{ position: { x: 0, y: 0, z: 0 }, clearance }])).not.toEqual({ x: 0.3, y: 0, z: 0 })
    // One-sided radii fall back to the legacy sum.
    expect(findSafeFishSpawn({ x: 0.3, y: 0, z: 0 }, bounds, [], clearance, occupied)).not.toEqual({ x: 0.3, y: 0, z: 0 })
  })

  it('ignores invalid crowding hints when a solid-clear water point exists', () => {
    const bounds: AxisAlignedBox = { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } }
    const invalid = [{ position: { x: Number.NaN, y: 0, z: 0 }, clearance: .5 }]
    expect(findSafeFishSpawn({ x: 0, y: 0, z: 0 }, bounds, [], .5, invalid)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('returns unavailable when the fish envelope cannot fit instead of shrinking it', () => {
    const bounds: AxisAlignedBox = { min: { x: -.1, y: -.1, z: -.1 }, max: { x: .1, y: .1, z: .1 } }
    expect(findSafeFishSpawn({ x: 0, y: 0, z: 0 }, bounds, [], .77)).toBeUndefined()
  })

  it('keeps an unavailable initial spawn in fallback and restarts eligibility only after recovery', () => {
    let spawnUnavailable = true
    expect(fishSceneStatus(spawnUnavailable)).toBe('failed')
    expect(canRunFishSceneLoop(false, false, spawnUnavailable)).toBe(false)
    expect(canRunFishSceneLoop(false, true, false)).toBe(false)
    expect(canRunFishSceneLoop(true, false, false)).toBe(false)

    spawnUnavailable = false
    expect(fishSceneStatus(spawnUnavailable)).toBe('ready')
    expect(canRunFishSceneLoop(false, false, spawnUnavailable)).toBe(true)
  })

  it.each([['phone 402x874', 402, 874], ['laptop 1440x900', 1440, 900]])('moves the actual five starter fish from their staged positions at %s', (_label, width, height) => {
    const { bounds, obstacles, placements } = planStarters(Number(width), Number(height))
    const fish = placements.map(item => createSwimmingFish(item.service.id, item.service.fishId, item.position, item.clearance, EMPTY_FISH_EXTENSIONS, { initialYaw: item.yaw }))
    const initial = fish.map(item => ({ ...item.position }))
    for (let i = 0; i < 100; i++) fish.forEach(item => stepSwimmingFish(item, { bounds, obstacles, anchors: [] }, .05))
    fish.forEach((item, index) => {
      expect(Math.hypot(item.position.x - initial[index].x, item.position.y - initial[index].y, item.position.z - initial[index].z), item.id).toBeGreaterThan(.01)
      expect(isSafeFishPosition(item.position, item.clearance, bounds, obstacles), item.id).toBe(true)
    })
  })

  it.each([['phone 402x874', 402, 874], ['laptop 1440x900', 1440, 900]])('quantizes starter spawns onto distinct depth planes spanning the water column at %s (AQ-87 AC #1/#2)', (_label, width, height) => {
    const { bounds, placements } = planStarters(Number(width), Number(height))
    const columnHeight = bounds.max.y - bounds.min.y

    // Spawn intent sits on one of the AQ-87 depth planes (outer lanes on the
    // near plane), not on a continuous front-plane draw.
    const planeOf = (preference: { position: Vec3 }, clearance: number) => {
      const safeMinZ = bounds.min.z + clearance
      const safeMaxZ = bounds.max.z - clearance
      const fraction = (preference.position.z - safeMinZ) / (safeMaxZ - safeMinZ)
      let nearest = 0
      for (let i = 1; i < FISH_SPAWN_DEPTH_PLANES.length; i++) {
        if (Math.abs(FISH_SPAWN_DEPTH_PLANES[i]! - fraction) < Math.abs(FISH_SPAWN_DEPTH_PLANES[nearest]! - fraction)) nearest = i
      }
      expect(Math.abs(fraction - FISH_SPAWN_DEPTH_PLANES[nearest]!), `spawn z fraction ${fraction}`).toBeLessThanOrEqual(FISH_SPAWN_DEPTH_PLANE_JITTER + 0.02)
      return nearest
    }
    const planes = new Set(placements.map(item => planeOf(item.preference, item.clearance)))
    expect(planes.size).toBeGreaterThanOrEqual(2)

    // The five starters' spawn depths span most of the water column
    // (their declared depthRanges cover 0.18..0.88); no species is
    // confined to the top half by default.
    const depths = placements.map(item => (bounds.max.y - item.preference.position.y) / columnHeight)
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThanOrEqual(0.45)
    expect(Math.min(...depths)).toBeLessThanOrEqual(0.3)
    expect(Math.max(...depths)).toBeGreaterThanOrEqual(0.6)

    // The safe positions actually staged keep the depth separation: the
    // bounded grid search may nudge a fish off its plane, but the school
    // must not collapse back onto one plane.
    const zs = placements.map(item => item.position.z)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(1.5)
  })

  it('configures tiered vertical swimming depth zones for surface schoolers, mid-water cruisers, and benthic perchers (AQ-99 AC #1–#5)', () => {
    const bounds = waterBounds(1440, 900)
    expect(TIERED_VERTICAL_DEPTH_ZONES.surface.speciesIds).toEqual(['blue-green-chromis', 'lyretail-anthias'])
    expect(TIERED_VERTICAL_DEPTH_ZONES['mid-water'].speciesIds).toEqual(expect.arrayContaining([
      'blue-tang',
      'yellow-tang',
      'copperband-butterflyfish',
      'flame-angelfish',
    ]))
    expect(TIERED_VERTICAL_DEPTH_ZONES.benthic.speciesIds).toEqual(expect.arrayContaining([
      'tailspot-blenny',
      'yellow-watchman-goby',
      'mandarin-dragonet',
    ]))

    const chromisZone = evaluateTieredVerticalDepthRange('blue-green-chromis', bounds, fishClearanceRadius('blue-green-chromis'))!
    const tangZone = evaluateTieredVerticalDepthRange('blue-tang', bounds, fishClearanceRadius('blue-tang'))!
    const gobyZone = evaluateTieredVerticalDepthRange('yellow-watchman-goby', bounds, fishClearanceRadius('yellow-watchman-goby'))!

    expect(classifySpeciesVerticalTier('blue-green-chromis')).toBe('surface')
    expect(classifySpeciesVerticalTier('blue-tang')).toBe('mid-water')
    expect(classifySpeciesVerticalTier('yellow-watchman-goby')).toBe('benthic')

    // Surface schoolers sit higher in the water column than benthic perchers
    expect(chromisZone.worldYRange[1]).toBeGreaterThan(gobyZone.worldYRange[1])
    expect(tangZone.worldYRange[1]).toBeGreaterThan(gobyZone.worldYRange[0])
  })

  it.each([['phone 402x874', 402, 874], ['laptop 1440x900', 1440, 900]])('stages every catalog species inside its ecological vertical interval at %s', (_label, width, height) => {
    const bounds = waterBounds(Number(width), Number(height))
    const columnHeight = bounds.max.y - bounds.min.y
    expect(REEF_FISH.length).toBeGreaterThanOrEqual(15)

    for (const fish of REEF_FISH) {
      const clearance = fishClearanceRadius(fish.id)
      const ecologicalRange = evaluateTieredVerticalDepthRange(fish.id, bounds, clearance)
      const preference = fishSpawnPreference(fish.id, fish.id, bounds, clearance)
      expect(ecologicalRange, fish.id).toBeDefined()
      expect(preference, fish.id).toBeDefined()
      expect(preference!.position.y).toBeGreaterThanOrEqual(ecologicalRange!.worldYRange[0] - 1e-12)
      expect(preference!.position.y).toBeLessThanOrEqual(ecologicalRange!.worldYRange[1] + 1e-12)
      const normalizedDepth = (bounds.max.y - preference!.position.y) / columnHeight
      expect(normalizedDepth, fish.id).toBeGreaterThanOrEqual(ecologicalRange!.normalizedDepthRange[0] - 1e-12)
      expect(normalizedDepth, fish.id).toBeLessThanOrEqual(ecologicalRange!.normalizedDepthRange[1] + 1e-12)
    }
  })
})

