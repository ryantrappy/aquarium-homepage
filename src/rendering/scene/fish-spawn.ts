import { isWaterSegmentSafe, type AxisAlignedBox, type SolidObstacleVolume, type Vec3 } from '../../simulation/habitat-navigation'
import { getSpeciesBehaviorProfile } from '../../lib/fish-behavior'

const SPAWN_SEARCH_DIVISIONS = 4
const INITIAL_HEADING_ALTERNATIVES = 8
const TWO_PI = Math.PI * 2

/**
 * Distinct spawn depth planes as fractions of the clearance-safe z range
 * (AQ-87): far / mid / near. Spawn depth is quantized onto these planes
 * instead of drawn continuously, so the school reads on multiple visibly
 * distinct depth planes instead of one front plane. The outer horizontal
 * lanes stay on the near plane so projected X spread survives perspective.
 */
export const FISH_SPAWN_DEPTH_PLANES: readonly number[] = Object.freeze([0.28, 0.55, 0.85])
/** Small deterministic jitter around a depth plane, as a z-range fraction. */
export const FISH_SPAWN_DEPTH_PLANE_JITTER = 0.03

/**
 * An occupied spawn point. `clearance` is the legacy AABB/segment safety
 * radius (still used for wall and obstacle safety). `bodyRadiusM` is the
 * AQ-85 physical body radius (15% of nose-to-tail length); when both the
 * spawning fish and the occupant supply it, fish-vs-fish spacing uses the
 * body-radius separation (`self + other + 0.06`) instead of the legacy
 * clearance sum (≥1.0 m), so a tight school region no longer reads as
 * blocked water. Omit it to keep the legacy behaviour.
 */
export type OccupiedFishSpawn = { position: Vec3; clearance: number; bodyRadiusM?: number }

/** Gap added to the two body radii for fish-vs-fish spawn separation (AQ-85: minSep = self + peer + 0.06). */
export const SPAWN_BODY_RADIUS_GAP_M = 0.06
export type FishSpawnPreference = { position: Vec3; yaw: number }

export type VerticalDepthZoneTier = 'surface' | 'mid-water' | 'benthic'

export type TieredVerticalDepthZoneSpec = Readonly<{
  tier: VerticalDepthZoneTier
  label: string
  normalizedDepthBand: readonly [number, number]
  speciesIds: readonly string[]
}>

/**
 * Ecological vertical swimming depth zones (AQ-99 AC #1–#3):
 * 1. Surface swimmers: schooling Chromis & Anthias in upper open water and light shafts.
 * 2. Mid-water cruisers: Tangs, Butterflyfish, Angelfish, Wrasses, Cardinalfish, Clownfish around the spire and swim-through channels.
 * 3. Benthic / perching dwellers: Blennies, Watchman Gobies, Dragonets, Firefish, Royal Gramma on lower rock ledges, crevices, and substrate sand zones.
 */
export const TIERED_VERTICAL_DEPTH_ZONES: Readonly<Record<VerticalDepthZoneTier, TieredVerticalDepthZoneSpec>> = Object.freeze({
  surface: Object.freeze({
    tier: 'surface',
    label: 'Upper water column and illuminated light shafts',
    normalizedDepthBand: Object.freeze([0.12, 0.66] as const),
    speciesIds: Object.freeze(['blue-green-chromis', 'lyretail-anthias']),
  }),
  'mid-water': Object.freeze({
    tier: 'mid-water',
    label: 'Mid-water reef spire and swim-through channels',
    normalizedDepthBand: Object.freeze([0.18, 0.84] as const),
    speciesIds: Object.freeze([
      'blue-tang',
      'yellow-tang',
      'desjardins-sailfin-tang',
      'copperband-butterflyfish',
      'flame-angelfish',
      'mccoskers-flasher-wrasse',
      'six-line-wrasse',
      'banggai-cardinalfish',
      'ocellaris-clownfish',
    ]),
  }),
  benthic: Object.freeze({
    tier: 'benthic',
    label: 'Lower rock ledges, caves, and substrate sand zones',
    normalizedDepthBand: Object.freeze([0.48, 0.98] as const),
    speciesIds: Object.freeze([
      'tailspot-blenny',
      'yellow-watchman-goby',
      'mandarin-dragonet',
      'firefish',
      'royal-gramma',
    ]),
  }),
})

export function classifySpeciesVerticalTier(speciesId: string): VerticalDepthZoneTier | undefined {
  for (const spec of Object.values(TIERED_VERTICAL_DEPTH_ZONES)) {
    if (spec.speciesIds.includes(speciesId)) return spec.tier
  }
  return undefined
}

export function evaluateTieredVerticalDepthRange(
  speciesId: string,
  waterBounds: AxisAlignedBox,
  clearance = 0,
): {
  tier: VerticalDepthZoneTier
  normalizedDepthRange: readonly [number, number]
  worldYRange: readonly [number, number]
} | undefined {
  const profile = getSpeciesBehaviorProfile(speciesId)
  const tier = classifySpeciesVerticalTier(speciesId)
  if (!profile || !tier) return undefined
  const zoneSpec = TIERED_VERTICAL_DEPTH_ZONES[tier]
  const minDepth = Math.max(profile.depthRange[0], zoneSpec.normalizedDepthBand[0])
  const maxDepth = Math.min(profile.depthRange[1], zoneSpec.normalizedDepthBand[1])
  const normalizedDepthRange: readonly [number, number] = minDepth < maxDepth
    ? [minDepth, maxDepth]
    : [profile.depthRange[0], profile.depthRange[1]]
  const height = waterBounds.max.y - waterBounds.min.y
  const safeMinY = waterBounds.min.y + Math.max(0, clearance)
  const safeMaxY = waterBounds.max.y - Math.max(0, clearance)
  const clampY = (y: number) => Math.min(safeMaxY, Math.max(safeMinY, y))
  const lowY = clampY(waterBounds.max.y - normalizedDepthRange[1] * height)
  const highY = clampY(waterBounds.max.y - normalizedDepthRange[0] * height)
  return {
    tier,
    normalizedDepthRange,
    worldYRange: [Math.min(lowY, highY), Math.max(lowY, highY)],
  }
}

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
  // AQ-87: a plain seeded draw inside each species' depthRange clusters the
  // whole school in the middle of the column (the five starters' draws
  // spanned only ~0.27 of the depth). Stratify the draw by horizontal slot
  // — the same cohort index already stratifies X — so each fish takes a
  // different fifth of its own declared band and the ensemble spans the
  // full column. The draw never leaves the species' depthRange.
  const depthUnit = seededUnit(seed, 0x9e3779b9)
  const depthFraction = horizontalSlot
    ? (horizontalSlot.index + depthUnit) / horizontalSlot.count
    : depthUnit
  const depth = profile.depthRange[0] + depthFraction * (profile.depthRange[1] - profile.depthRange[0])
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
  // AQ-87: quantize spawn depth onto the three distinct depth planes
  // (far / mid / near) instead of a continuous z draw. The outer
  // horizontal lanes stay on the near plane so projected X spread survives
  // perspective; interior lanes take a seeded plane with small jitter.
  const isOuterLane = horizontalSlot && horizontalSlot.count > 1
    && (horizontalSlot.index === 0 || horizontalSlot.index === horizontalSlot.count - 1)
  const planeIndex = isOuterLane
    ? FISH_SPAWN_DEPTH_PLANES.length - 1
    : Math.min(FISH_SPAWN_DEPTH_PLANES.length - 1, Math.floor(zNoise * FISH_SPAWN_DEPTH_PLANES.length))
  const zFraction = FISH_SPAWN_DEPTH_PLANES[planeIndex]! + (zNoise * 2 - 1) * FISH_SPAWN_DEPTH_PLANE_JITTER
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
  /**
   * Optional extra clearance check (e.g. the mesh-navigation capsule query).
   * Applied lazily to ranked candidates; a candidate passes only when it
   * returns true. A throwing check fails closed for that candidate.
   */
  isSafe?: (position: Vec3) => boolean,
  /**
   * The spawning fish's AQ-85 body radius. When given (and the occupant
   * supplies one too), fish-vs-fish spacing uses `self + other + 0.06`
   * instead of the legacy `clearance + other.clearance` sum.
   */
  spawningBodyRadiusM?: number,
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
  // Fish-vs-fish separation (PR #28 follow-up): body radii when both sides
  // supply them, otherwise the legacy clearance sum. `clearance` itself is
  // untouched — it still governs wall/obstacle safety above.
  const spawningRadius = Number.isFinite(spawningBodyRadiusM) && (spawningBodyRadiusM as number) >= 0 ? (spawningBodyRadiusM as number) : undefined
  const minimumSeparation = (other: OccupiedFishSpawn) =>
    spawningRadius !== undefined && other.bodyRadiusM !== undefined && Number.isFinite(other.bodyRadiusM) && other.bodyRadiusM >= 0
      ? spawningRadius + other.bodyRadiusM + SPAWN_BODY_RADIUS_GAP_M
      : clearance + other.clearance
  const isClearOfFish = (candidate: Vec3) => validOccupied.every(other => {
    const minimumDistance = minimumSeparation(other)
    return Math.hypot(candidate.x - other.position.x, candidate.y - other.position.y, candidate.z - other.position.z) >= minimumDistance
  })
  const unoccupied = safeCandidates.filter(isClearOfFish)
  const ranked = unoccupied.length ? unoccupied : safeCandidates
  ranked.sort((a, b) => {
    if (!unoccupied.length) {
      const crowding = (candidate: Vec3) => validOccupied.reduce((total, other) => {
        const minimumDistance = minimumSeparation(other)
        const distance = Math.hypot(candidate.x - other.position.x, candidate.y - other.position.y, candidate.z - other.position.z)
        return total + Math.max(0, minimumDistance - distance)
      }, 0)
      const crowdingDifference = crowding(a) - crowding(b)
      if (crowdingDifference) return crowdingDifference
    }
    return targetDistance(a) - targetDistance(b) || a.x - b.x || a.y - b.y || a.z - b.z
  })
  return ranked.find(candidate => {
    if (!isSafe) return true
    try {
      return isSafe(candidate)
    } catch {
      return false
    }
  })
}
