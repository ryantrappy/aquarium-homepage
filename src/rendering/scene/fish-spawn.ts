import { isWaterSegmentSafe, type AxisAlignedBox, type SolidObstacleVolume, type Vec3 } from '../../simulation/habitat-navigation'
import { getSpeciesBehaviorProfile } from '../../lib/fish-behavior'

const SPAWN_SEARCH_DIVISIONS = 4
const INITIAL_HEADING_ALTERNATIVES = 8
const TWO_PI = Math.PI * 2

export type OccupiedFishSpawn = { position: Vec3; clearance: number }
export type FishSpawnPreference = { position: Vec3; yaw: number }

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

/** Try a bounded ring of headings with a short clear forward segment. */
export function findSafeFishHeading(
  position: Vec3,
  preferredYaw: number,
  waterBounds: AxisAlignedBox,
  obstacles: readonly SolidObstacleVolume[],
  clearance: number,
): number | undefined {
  if (![position.x, position.y, position.z, preferredYaw, clearance].every(Number.isFinite) || clearance < 0) return undefined
  const segmentLength = Math.max(.25, Math.min(.6, clearance * .75))
  for (let i = 0; i < INITIAL_HEADING_ALTERNATIVES; i++) {
    const yaw = preferredYaw + i * TWO_PI / INITIAL_HEADING_ALTERNATIVES
    const target = { x: position.x + Math.sin(yaw) * segmentLength, y: position.y, z: position.z + Math.cos(yaw) * segmentLength }
    try {
      if (isWaterSegmentSafe({ start: position, target, waterBounds, obstacles, fishClearanceRadius: clearance })) return yaw
    } catch {
      // A malformed/unsupported segment is not a clear heading.
    }
  }
  return preferredYaw
}

function spawnSeed(instanceId: string, speciesId: string): number {
  let seed = 2166136261
  for (const char of `${speciesId}\0${instanceId}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619)
  return seed >>> 0
}

function seededUnit(seed: number, salt: number): number {
  let value = (seed ^ salt) >>> 0
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

/**
 * Deterministic first-load staging across the tank volume. The species profile
 * supplies only its declared normalized depth preference; this does not invent
 * an anchor or claim a real habitat position.
 */
export function fishSpawnPreference(instanceId: string, speciesId: string, waterBounds: AxisAlignedBox, clearance: number, horizontalSlot?: { index: number; count: number }): FishSpawnPreference | undefined {
  const values = [waterBounds.min.x, waterBounds.min.y, waterBounds.min.z, waterBounds.max.x, waterBounds.max.y, waterBounds.max.z, clearance]
  if (!instanceId.trim() || !values.every(Number.isFinite) || clearance < 0) return undefined
  if (horizontalSlot && (!Number.isSafeInteger(horizontalSlot.index) || !Number.isSafeInteger(horizontalSlot.count)
    || horizontalSlot.count < 1 || horizontalSlot.index < 0 || horizontalSlot.index >= horizontalSlot.count)) return undefined
  if (!(waterBounds.min.x < waterBounds.max.x && waterBounds.min.y < waterBounds.max.y && waterBounds.min.z < waterBounds.max.z)) return undefined
  const profile = getSpeciesBehaviorProfile(speciesId)
  if (!profile) return undefined

  const safeMin = { x: waterBounds.min.x + clearance, y: waterBounds.min.y + clearance, z: waterBounds.min.z + clearance }
  const safeMax = { x: waterBounds.max.x - clearance, y: waterBounds.max.y - clearance, z: waterBounds.max.z - clearance }
  if (safeMin.x > safeMax.x || safeMin.y > safeMax.y || safeMin.z > safeMax.z) return undefined

  const seed = spawnSeed(instanceId, speciesId)
  const depth = profile.depthRange[0] + seededUnit(seed, 0x9e3779b9) * (profile.depthRange[1] - profile.depthRange[0])
  const height = waterBounds.max.y - waterBounds.min.y
  const preferredY = waterBounds.max.y - depth * height
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  // Edge-normalized strata use more of each fish's clearance-safe X range.
  // Small identity jitter avoids a mechanically regular lineup.
  const horizontalNoise = seededUnit(seed, 0xc2b2ae35)
  const horizontalFraction = horizontalSlot
    ? horizontalSlot.count === 1
      ? horizontalNoise
      : (horizontalSlot.index + (horizontalNoise - .5) * .08) / (horizontalSlot.count - 1)
    : horizontalNoise
  const xFraction = horizontalSlot ? .02 + .96 * clamp(horizontalFraction, 0, 1) : .04 + .92 * horizontalFraction
  const preferredX = safeMin.x + (safeMax.x - safeMin.x) * xFraction
  const zNoise = seededUnit(seed, 0x85ebca6b)
  // Put only the outer fish lanes nearer the camera so projected X
  // spread survives perspective. Interior lanes retain varied depth.
  const zFraction = horizontalSlot && horizontalSlot.count > 1 && horizontalSlot.index === 0
    ? .8 + .05 * zNoise
    : horizontalSlot && horizontalSlot.count > 1 && horizontalSlot.index === horizontalSlot.count - 1
      ? .91 + .04 * zNoise
      : .4 + .6 * zNoise
  const preferredZ = safeMin.z + (safeMax.z - safeMin.z) * zFraction
  const safeYForProfile = clamp(preferredY, safeMin.y, safeMax.y)
  const profileLowY = clamp(waterBounds.max.y - profile.depthRange[1] * height, safeMin.y, safeMax.y)
  const profileHighY = clamp(waterBounds.max.y - profile.depthRange[0] * height, safeMin.y, safeMax.y)
  const y = clamp(safeYForProfile, Math.min(profileLowY, profileHighY), Math.max(profileLowY, profileHighY))

  return {
    position: {
      x: preferredX,
      y,
      z: preferredZ,
    },
    yaw: seededUnit(seed, 0x27d4eb2f) * TWO_PI,
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
  occupied: readonly OccupiedFishSpawn[] = [],
): Vec3 | undefined {
  const coordinates = [preferred.x, preferred.y, preferred.z,
    waterBounds.min.x, waterBounds.min.y, waterBounds.min.z,
    waterBounds.max.x, waterBounds.max.y, waterBounds.max.z]
  if (!coordinates.every(Number.isFinite) || !Number.isFinite(clearance) || clearance < 0) return undefined
  const validOccupied = occupied.filter(item => [item.position.x, item.position.y, item.position.z, item.clearance].every(Number.isFinite) && item.clearance >= 0)
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

  const safeCandidates = candidates.filter(candidate => isSafeFishPosition(candidate, clearance, waterBounds, obstacles))
  if (!safeCandidates.length) return undefined
  const targetDistance = (candidate: Vec3) => (candidate.x - clamped.x) ** 2 + (candidate.y - clamped.y) ** 2 + (candidate.z - clamped.z) ** 2
  const isClearOfFish = (candidate: Vec3) => validOccupied.every(other => {
    const minimumDistance = clearance + other.clearance
    return Math.hypot(candidate.x - other.position.x, candidate.y - other.position.y, candidate.z - other.position.z) >= minimumDistance
  })
  const unoccupied = safeCandidates.filter(isClearOfFish)
  const ranked = unoccupied.length ? unoccupied : safeCandidates
  ranked.sort((a, b) => {
    if (!unoccupied.length) {
      const crowding = (candidate: Vec3) => validOccupied.reduce((total, other) => {
        const minimumDistance = clearance + other.clearance
        const distance = Math.hypot(candidate.x - other.position.x, candidate.y - other.position.y, candidate.z - other.position.z)
        return total + Math.max(0, minimumDistance - distance)
      }, 0)
      const crowdingDifference = crowding(a) - crowding(b)
      if (crowdingDifference) return crowdingDifference
    }
    return targetDistance(a) - targetDistance(b) || a.x - b.x || a.y - b.y || a.z - b.z
  })
  return ranked[0]
}
