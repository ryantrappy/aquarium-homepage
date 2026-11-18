import { describe, expect, it } from 'vitest'
import { fishModelScale, fishRenderLength, SNOWFLAKE_MORAY_FOREBODY_BOUNDS, SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION, TANK_UNITS_PER_INCH } from './fish-scale'
import { hasReadyRightIslandCollider, resolveAvailableSnowflakeMorayResidence, resolveSnowflakeMorayResidence, SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL, SNOWFLAKE_MORAY_CAVE_COLLISION_RADIUS_M, SNOWFLAKE_MORAY_HEAD_COLLISION_RADIUS_M } from './moray-residence'
import { reefPlacementsForViewport, type ReefPlacement } from './reef-layout'

describe('snowflake moray residence', () => {
  it('derives one forward-facing 9-inch forebody pose from the laptop right-cave transform', () => {
    const placements = reefPlacementsForViewport(false)
    const right = placements.find(placement => placement.islandKind === 'right')!
    const residence = resolveSnowflakeMorayResidence(placements)!
    const dx = residence.headPosition.x - residence.bodyCenter.x
    const dz = residence.headPosition.z - residence.bodyCenter.z

    expect(residence.yaw).toBe(right.yaw)
    const modelCenterZ = (0 + 2.0055999755859375) / 2
    expect(Math.hypot(dx, dz)).toBeCloseTo((SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION.z - modelCenterZ) * fishModelScale('snowflake-moray-eel'), 4)
    expect(dx * Math.sin(right.yaw) + dz * Math.cos(right.yaw)).toBeGreaterThan(0)
    expect(fishRenderLength('snowflake-moray-eel')).toBeCloseTo(9 * TANK_UNITS_PER_INCH, 8)
    expect(residence.position.x).toBeGreaterThan(right.position.x - .25)
    expect(residence.position.x).toBeLessThan(right.position.x + .25)
    expect(SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL).toEqual({ x: 0.02, y: 0.02, z: 0.18 })
    const halfWidth = (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.x - SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.x) / 2
    const halfHeight = (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.y - SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.y) / 2
    expect(SNOWFLAKE_MORAY_CAVE_COLLISION_RADIUS_M).toBeGreaterThanOrEqual(Math.hypot(halfWidth, halfHeight) * fishModelScale('snowflake-moray-eel'))
  })

  it('fails closed when the right cave is absent, duplicated, or has invalid transforms', () => {
    const leftOnly = reefPlacementsForViewport(true)
    const right = reefPlacementsForViewport(false).find(placement => placement.islandKind === 'right')!
    const duplicate = [...reefPlacementsForViewport(false), right]
    const invalid: ReefPlacement = { ...right, uniformScale: Number.NaN }

    expect(resolveSnowflakeMorayResidence(leftOnly)).toBeUndefined()
    expect(resolveSnowflakeMorayResidence(duplicate)).toBeUndefined()
    expect(resolveSnowflakeMorayResidence([invalid])).toBeUndefined()
  })

  it('requires an authored model, a ready right-cave collider, and a clear head capsule', () => {
    const placements = reefPlacementsForViewport(false)
    const capsuleClear = (_start: { x: number; y: number; z: number }, _end: { x: number; y: number; z: number }, radius: number) => radius === SNOWFLAKE_MORAY_HEAD_COLLISION_RADIUS_M

    expect(resolveAvailableSnowflakeMorayResidence(placements, false, capsuleClear)).toBeUndefined()
    expect(resolveAvailableSnowflakeMorayResidence(placements, true)).toBeUndefined()
    expect(resolveAvailableSnowflakeMorayResidence(reefPlacementsForViewport(true), true, capsuleClear)).toBeUndefined()
    expect(resolveAvailableSnowflakeMorayResidence(placements, true, () => false)).toBeUndefined()
    expect(resolveAvailableSnowflakeMorayResidence(placements, true, capsuleClear)).toBeDefined()
  })

  it('requires the actual right-island collider produced by the current layout', () => {
    expect(hasReadyRightIslandCollider(reefPlacementsForViewport(false), new Set(['reef-0']))).toBe(false)
    expect(hasReadyRightIslandCollider(reefPlacementsForViewport(false), new Set(['reef-0', 'reef-1']))).toBe(true)
    expect(hasReadyRightIslandCollider(reefPlacementsForViewport(true), new Set(['reef-0']))).toBe(false)
  })
})