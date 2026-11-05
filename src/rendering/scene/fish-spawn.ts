import { isWaterSegmentSafe, type AxisAlignedBox, type SolidObstacleVolume, type Vec3 } from '../../simulation/habitat-navigation'

const SPAWN_SEARCH_DIVISIONS = 4

export function fishSceneStatus(spawnUnavailable: boolean): 'ready' | 'failed' {
  return spawnUnavailable ? 'failed' : 'ready'
}

export function canRunFishSceneLoop(paused: boolean, hidden: boolean, spawnUnavailable: boolean): boolean {
  return !paused && !hidden && !spawnUnavailable
}

/** Point occupancy uses the existing legacy scene-unit clearance query. */
export function isSafeFishPosition(position: Vec3, clearance: number, waterBounds: AxisAlignedBox, obstacles: readonly SolidObstacleVolume[]): boolean {
  try {
    return isWaterSegmentSafe({ start: position, target: position, waterBounds, obstacles, fishClearanceRadius: clearance })
  } catch {
    return false
  }
}

/**
 * Find a deterministic safe point close to a preferred spawn. The bounded
 * grid has at most 6^3 candidates and never reduces the fish clearance.
 */
export function findSafeFishSpawn(
  preferred: Vec3,
  waterBounds: AxisAlignedBox,
  obstacles: readonly SolidObstacleVolume[],
  clearance: number,
): Vec3 | undefined {
  const coordinates = [preferred.x, preferred.y, preferred.z,
    waterBounds.min.x, waterBounds.min.y, waterBounds.min.z,
    waterBounds.max.x, waterBounds.max.y, waterBounds.max.z]
  if (!coordinates.every(Number.isFinite) || !Number.isFinite(clearance) || clearance < 0) return undefined
  if (!(waterBounds.min.x < waterBounds.max.x && waterBounds.min.y < waterBounds.max.y && waterBounds.min.z < waterBounds.max.z)) return undefined

  const safeMin = { x: waterBounds.min.x + clearance, y: waterBounds.min.y + clearance, z: waterBounds.min.z + clearance }
  const safeMax = { x: waterBounds.max.x - clearance, y: waterBounds.max.y - clearance, z: waterBounds.max.z - clearance }
  if (safeMin.x > safeMax.x || safeMin.y > safeMax.y || safeMin.z > safeMax.z) return undefined

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const clamped = {
    x: clamp(preferred.x, safeMin.x, safeMax.x),
    y: clamp(preferred.y, safeMin.y, safeMax.y),
    z: clamp(preferred.z, safeMin.z, safeMax.z),
  }
  const candidatesOnAxis = (axis: 'x' | 'y' | 'z') => {
    const values = [clamped[axis]]
    for (let division = 0; division <= SPAWN_SEARCH_DIVISIONS; division++) {
      const fraction = division / SPAWN_SEARCH_DIVISIONS
      values.push(safeMin[axis] + (safeMax[axis] - safeMin[axis]) * fraction)
    }
    return [...new Set(values)].sort((a, b) => a - b)
  }

  const candidates: Vec3[] = []
  for (const x of candidatesOnAxis('x')) for (const y of candidatesOnAxis('y')) for (const z of candidatesOnAxis('z')) candidates.push({ x, y, z })
  candidates.sort((a, b) => {
    const distanceA = (a.x - clamped.x) ** 2 + (a.y - clamped.y) ** 2 + (a.z - clamped.z) ** 2
    const distanceB = (b.x - clamped.x) ** 2 + (b.y - clamped.y) ** 2 + (b.z - clamped.z) ** 2
    return distanceA - distanceB || a.x - b.x || a.y - b.y || a.z - b.z
  })

  return candidates.find(candidate => isSafeFishPosition(candidate, clearance, waterBounds, obstacles))
}
