import { describe, expect, it } from 'vitest'
import type { AxisAlignedBox, Vec3 } from '../../simulation/habitat-navigation'
import { EXAMPLE_SERVICES } from '../../lib/services'
import { fishClearanceRadius } from './fish-scale'
import { canRunFishSceneLoop, findSafeFishSpawn, fishSceneStatus, isSafeFishPosition } from './fish-spawn'
import { instantiateReefHabitat } from './habitat'
import reefHabitat from './reef-habitat.json'

function waterBounds(width: number, height: number): AxisAlignedBox {
  const halfWidth = Math.min(5, (9 - 2.8) * Math.tan(21 * Math.PI / 180) * (width / height) * .96)
  return { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
}

function placements(narrow: boolean) {
  return narrow
    ? [{ position: { x: -.4, y: -1.65, z: -1.1 }, scale: { x: 3.6, y: 5, z: 1.4 }, yaw: .08 }]
    : [
      { position: { x: -3.2, y: -1.62, z: -1.1 }, scale: { x: 4.6, y: 6.2, z: 1.8 }, yaw: .1 },
      { position: { x: 3.4, y: -2.09, z: -.9 }, scale: { x: 3.4, y: 4.6, z: 1.5 }, yaw: -.18 },
    ]
}

function obstaclesFor(narrow: boolean) {
  return placements(narrow).flatMap(({ position, scale, yaw }, index) => instantiateReefHabitat(
    reefHabitat as Parameters<typeof instantiateReefHabitat>[0], scale, position, -2.74, `reef-${index}`, yaw,
  ).obstacles)
}

function preferredSpawn(index: number, narrow: boolean, bounds: AxisAlignedBox): Vec3 {
  const span = bounds.max.x - bounds.min.x
  const x = narrow ? [-.3, .3, 0][index % 3] : ((index % 3) - 1) * Math.min(span * .26, 2.7)
  const y = (narrow ? [1.25, .55, 1.95][index % 3] : 1.45) - Math.floor(index / 3) * .7
  return { x, y: Math.max(.3, y), z: 1.8 + (index % 2) * .2 }
}

describe('safe aquarium fish spawning', () => {
  it.each([
    ['phone 402x874', 402, 874, true],
    ['laptop 1440x900', 1440, 900, false],
  ])('places all five starter fish within their individual tank and reef clearances at %s', (_label, width, height, narrow) => {
    const bounds = waterBounds(Number(width), Number(height))
    const obstacles = obstaclesFor(Boolean(narrow))
    expect(EXAMPLE_SERVICES).toHaveLength(5)

    const placements = EXAMPLE_SERVICES.map((service, index) => {
      const clearance = fishClearanceRadius(service.fishId)
      const preferred = preferredSpawn(index, Boolean(narrow), bounds)
      const position = findSafeFishSpawn(preferred, bounds, obstacles, clearance)
      expect(position, `${service.name} (${service.fishId})`).toBeDefined()
      expect(isSafeFishPosition(position!, clearance, bounds, obstacles), service.name).toBe(true)
      expect(position!.x).toBeGreaterThanOrEqual(bounds.min.x + clearance - 1e-9)
      expect(position!.x).toBeLessThanOrEqual(bounds.max.x - clearance + 1e-9)
      expect(position!.y).toBeGreaterThanOrEqual(bounds.min.y + clearance - 1e-9)
      expect(position!.y).toBeLessThanOrEqual(bounds.max.y - clearance + 1e-9)
      expect(position!.z).toBeGreaterThanOrEqual(bounds.min.z + clearance - 1e-9)
      expect(position!.z).toBeLessThanOrEqual(bounds.max.z - clearance + 1e-9)
      return { service, clearance, preferred, position: position! }
    })

    const blueTang = placements.find(item => item.service.fishId === 'blue-tang')!
    expect(blueTang.clearance).toBeCloseTo(.77, 6) // existing legacy scene units, not meters
    if (Boolean(narrow)) {
      expect(blueTang.preferred.x).toBe(.3)
      expect(blueTang.position.x).not.toBe(blueTang.preferred.x)
      expect(Math.abs(blueTang.position.x)).toBeLessThanOrEqual(bounds.max.x - blueTang.clearance + 1e-9)
    }
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
})
