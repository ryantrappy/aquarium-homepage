import { describe, expect, it } from 'vitest'
import { reefContactFootprints, reefPlacementsForViewport } from './reef-layout'

describe('shared reef layout', () => {
  it('reuses stable immutable placements and contact footprints per viewport', () => {
    const laptopPlacements = reefPlacementsForViewport(false)
    const phonePlacements = reefPlacementsForViewport(true)
    const laptopFootprints = reefContactFootprints(false)
    const phoneFootprints = reefContactFootprints(true)

    expect(reefPlacementsForViewport(false)).toBe(laptopPlacements)
    expect(reefPlacementsForViewport(true)).toBe(phonePlacements)
    expect(reefContactFootprints(false)).toBe(laptopFootprints)
    expect(reefContactFootprints(true)).toBe(phoneFootprints)
    expect(Object.isFrozen(laptopPlacements)).toBe(true)
    expect(Object.isFrozen(phonePlacements)).toBe(true)
    expect(Object.isFrozen(laptopFootprints)).toBe(true)
    expect(Object.isFrozen(phoneFootprints)).toBe(true)
    expect(laptopFootprints).toHaveLength(laptopPlacements.length)
    expect(phoneFootprints).toHaveLength(phonePlacements.length)
  })

  it('preserves each placement center and scales yaw-rotated contact extents uniformly', () => {
    for (const narrow of [false, true]) {
      const placements = reefPlacementsForViewport(narrow)
      const footprints = reefContactFootprints(narrow)

      for (const [index, placement] of placements.entries()) {
        const footprint = footprints[index]
        const localX = placement.islandKind === 'left' ? 1.85 / 4.5 : 1.75 / 4.3
        const localZ = placement.islandKind === 'left' ? 1.15 / 4.5 : 1.1 / 4.3
        const cos = Math.cos(placement.yaw)
        const sin = Math.sin(placement.yaw)

        expect(placement.uniformScale).toBeGreaterThan(0)
        expect(footprint.x).toBe(placement.position.x)
        expect(footprint.z).toBe(placement.position.z)
        expect(footprint.radiusX).toBeCloseTo(
          Math.hypot(localX * cos, localZ * sin) * placement.uniformScale,
          12,
        )
        expect(footprint.radiusZ).toBeCloseTo(
          Math.hypot(localX * sin, localZ * cos) * placement.uniformScale,
          12,
        )
      }
    }
  })
})
