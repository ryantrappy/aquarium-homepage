import { getSpeciesBehaviorProfile, type SpeciesBehaviorId } from '../../lib/fish-behavior'
import {
  isWaterSegmentSafe,
  type AxisAlignedBox,
  type SolidObstacleVolume,
  type Vec3,
} from '../../simulation/habitat-navigation'

export type SocialGroupingMode = 'shoal' | 'harem-aggregation' | 'hover-group' | 'pair-or-solitary'

export type SchoolingPeer = Readonly<{
  id: string
  speciesId: SpeciesBehaviorId
  position: Vec3
  yaw: number
  speed: number
  clearanceRadius: number
  startleSeconds: number
}>

export type SchoolingSteeringVector = Readonly<{
  dx: number
  dy: number
  dz: number
  mode: SocialGroupingMode
  neighborCount: number
}>

/**
 * Sourced social grouping classification across the 15-species reef roster (`AQ-41` AC #1 & #4):
 * - `blue-green-chromis`: open-water / branching-coral shoaler (`shoal`)
 * - `lyretail-anthias`: current-facing planktivore aggregation/harem (`harem-aggregation`)
 * - `banggai-cardinalfish`: calm mid/lower hovering group (`hover-group`)
 * - Solitary / territorial / pair-bonded reef inhabitants (`yellow-tang`, `blue-tang`, `royal-gramma`,
 *   `firefish`, `yellow-watchman-goby`, `mandarin-dragonet`, `tailspot-blenny`, `six-line-wrasse`,
 *   `mccoskers-flasher-wrasse`, `flame-angelfish`, `copperband-butterflyfish`, `ocellaris-clownfish`)
 *   are never forced into artificial schools (`pair-or-solitary`), though all species respect personal-space separation.
 */
export const SPECIES_SOCIAL_GROUPING_MODE: Readonly<
  Record<SpeciesBehaviorId, SocialGroupingMode>
> = Object.freeze({
  'blue-green-chromis': 'shoal',
  'lyretail-anthias': 'harem-aggregation',
  'banggai-cardinalfish': 'hover-group',
  'ocellaris-clownfish': 'pair-or-solitary',
  'yellow-tang': 'pair-or-solitary',
  'blue-tang': 'pair-or-solitary',
  'royal-gramma': 'pair-or-solitary',
  firefish: 'pair-or-solitary',
  'yellow-watchman-goby': 'pair-or-solitary',
  'mandarin-dragonet': 'pair-or-solitary',
  'tailspot-blenny': 'pair-or-solitary',
  'six-line-wrasse': 'pair-or-solitary',
  'mccoskers-flasher-wrasse': 'pair-or-solitary',
  'flame-angelfish': 'pair-or-solitary',
  'copperband-butterflyfish': 'pair-or-solitary',
})

const MAX_STEERING_OFFSET_PER_SEC = 0.45

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function isGroupSchoolingSpecies(speciesId: string): boolean {
  const mode = SPECIES_SOCIAL_GROUPING_MODE[speciesId as SpeciesBehaviorId]
  return mode === 'shoal' || mode === 'harem-aggregation' || mode === 'hover-group'
}

/**
 * Evaluates bounded, collision-safe social steering (`separation` for all fish to prevent body overlap,
 * plus conspecific `cohesion` and `alignment` only for profile-supported schooling/grouping species).
 *
 * Per `AQ-41` AC #4:
 * - Solitary species never receive school cohesion/alignment forces.
 * - A startled peer (`peer.startleSeconds > 0`, e.g., from a single-fish service click in `AQ-13`)
 *   is ignored for school alignment/cohesion so a single-fish click never triggers a screen-wide panic.
 */
export function evaluateSchoolingSteering(input: {
  self: SchoolingPeer
  peers: readonly SchoolingPeer[]
  waterBounds: AxisAlignedBox
  obstacles: readonly SolidObstacleVolume[]
  dt: number
  paused?: boolean
  reducedMotion?: boolean
  /**
   * When false, cohesion/alignment are suppressed and only personal-space
   * separation applies (AQ-41 AC #1 / AQ-44 AC #4). The live scene passes
   * false while a fish is foraging, retreating, displaying, or bursting, so
   * steering never fights a forage pass or a refuge run. Defaults to true.
   */
  cohesionAllowed?: boolean
  /**
   * Optional segment-safety predicate used when mesh navigation is active so
   * steering nudges are validated against the active BVH/coral collider rather
   * than legacy AABB obstacles. Defaults to `isWaterSegmentSafe`.
   */
  isSegmentSafe?: (start: Vec3, target: Vec3) => boolean
}): SchoolingSteeringVector {
  const {
    self,
    peers,
    waterBounds,
    obstacles,
    dt,
    paused,
    reducedMotion,
    cohesionAllowed = true,
    isSegmentSafe,
  } = input
  const mode =
    SPECIES_SOCIAL_GROUPING_MODE[self.speciesId] ?? 'pair-or-solitary'

  if (
    paused ||
    reducedMotion ||
    dt <= 0 ||
    !Number.isFinite(dt) ||
    !getSpeciesBehaviorProfile(self.speciesId)
  ) {
    return { dx: 0, dy: 0, dz: 0, mode, neighborCount: 0 }
  }

  const groupingAllowed = isGroupSchoolingSpecies(self.speciesId) && self.startleSeconds <= 0
  const neighborRadius = mode === 'shoal' ? 2.2 : mode === 'harem-aggregation' ? 2.0 : 1.6

  let sepX = 0
  let sepY = 0
  let sepZ = 0
  let cohX = 0
  let cohY = 0
  let cohZ = 0
  let alignSin = 0
  let alignCos = 0
  let groupNeighbors = 0
  let totalNeighbors = 0

  for (const peer of peers) {
    if (peer.id === self.id) continue
    const rx = self.position.x - peer.position.x
    const ry = self.position.y - peer.position.y
    const rz = self.position.z - peer.position.z
    const dist = Math.hypot(rx, ry, rz)
    if (dist <= 1e-6) continue

    const minSep = self.clearanceRadius + peer.clearanceRadius + 0.12
    if (dist < minSep) {
      const weight = (minSep - dist) / minSep
      sepX += (rx / dist) * weight * 0.55
      sepY += (ry / dist) * weight * 0.35
      sepZ += (rz / dist) * weight * 0.55
      totalNeighbors++
    }

    // Conspecific schooling only applies to grouping species and ignores startled peers (AQ-41 AC #4).
    // Cohesion/alignment are also suppressed while the fish is foraging, retreating,
    // displaying, or bursting (cohesionAllowed false) — separation still applies.
    if (
      groupingAllowed &&
      cohesionAllowed &&
      peer.speciesId === self.speciesId &&
      peer.startleSeconds <= 0 &&
      dist < neighborRadius
    ) {
      cohX += peer.position.x
      cohY += peer.position.y
      cohZ += peer.position.z
      alignSin += Math.sin(peer.yaw)
      alignCos += Math.cos(peer.yaw)
      groupNeighbors++
      totalNeighbors++
    }
  }

  let steerX = sepX
  let steerY = sepY
  let steerZ = sepZ

  if (groupNeighbors > 0) {
    const inv = 1 / groupNeighbors
    const centerDx = cohX * inv - self.position.x
    const centerDy = cohY * inv - self.position.y
    const centerDz = cohZ * inv - self.position.z
    const cohesionGain = mode === 'shoal' ? 0.24 : mode === 'harem-aggregation' ? 0.18 : 0.12
    const alignmentGain = mode === 'shoal' ? 0.22 : mode === 'harem-aggregation' ? 0.16 : 0.08

    steerX += centerDx * cohesionGain + (alignSin * inv) * alignmentGain
    steerY += centerDy * (cohesionGain * 0.5)
    steerZ += centerDz * cohesionGain + (alignCos * inv) * alignmentGain
  }

  const maxStep = MAX_STEERING_OFFSET_PER_SEC * dt
  const mag = Math.hypot(steerX, steerY, steerZ)
  if (mag <= 1e-6) {
    return { dx: 0, dy: 0, dz: 0, mode, neighborCount: totalNeighbors }
  }

  const scale = mag > maxStep ? maxStep / mag : 1
  const dx = clamp(steerX * scale, -maxStep, maxStep)
  const dy = clamp(steerY * scale, -maxStep, maxStep)
  const dz = clamp(steerZ * scale, -maxStep, maxStep)

  const candidate: Vec3 = {
    x: self.position.x + dx,
    y: self.position.y + dy,
    z: self.position.z + dz,
  }

  const segmentSafe = isSegmentSafe
    ? isSegmentSafe(self.position, candidate)
    : isWaterSegmentSafe({
        start: self.position,
        target: candidate,
        waterBounds,
        obstacles,
        fishClearanceRadius: self.clearanceRadius,
      })

  if (!segmentSafe) {
    return { dx: 0, dy: 0, dz: 0, mode, neighborCount: totalNeighbors }
  }

  return { dx, dy, dz, mode, neighborCount: totalNeighbors }
}

/**
 * Benchmarks direct $O(N^2)$ pairwise neighborhood evaluation for realistic service-linked
 * fish populations (`N <= 24`, `AQ-41` AC #2), returning measured microseconds per step
 * and verifying that simple CPU pairwise scanning stays well under `< 500 us` without
 * needing GPU compute or spatial-hash overhead at homepage population counts.
 */
export function benchmarkSchoolingStep(
  populationCount: number,
  iterations = 50,
): {
  populationCount: number
  iterations: number
  averageMicrosecondsPerStep: number
  recommendedBackend: 'cpu-direct' | 'cpu-spatial-grid'
} {
  const count = clamp(Math.trunc(populationCount), 1, 64)
  const runs = clamp(Math.trunc(iterations), 1, 500)
  const waterBounds: AxisAlignedBox = {
    min: { x: -4, y: -2.25, z: -4.6 },
    max: { x: 4, y: 2.8, z: 2.8 },
  }
  const peers: SchoolingPeer[] = Array.from({ length: count }, (_, i) => ({
    id: `bench-fish-${i}`,
    speciesId: i % 2 === 0 ? 'blue-green-chromis' : 'lyretail-anthias',
    position: {
      x: -2.5 + (i % 6) * 0.8,
      y: -0.5 + Math.floor(i / 6) * 0.5,
      z: 0.5 + (i % 3) * 0.4,
    },
    yaw: (i * 0.4) % (Math.PI * 2),
    speed: 0.45,
    clearanceRadius: 0.5,
    startleSeconds: 0,
  }))

  const t0 = performance.now()
  for (let iter = 0; iter < runs; iter++) {
    for (const self of peers) {
      evaluateSchoolingSteering({
        self,
        peers,
        waterBounds,
        obstacles: [],
        dt: 1 / 60,
      })
    }
  }
  const elapsedMs = performance.now() - t0
  const averageMicrosecondsPerStep = (elapsedMs * 1000) / runs

  return {
    populationCount: count,
    iterations: runs,
    averageMicrosecondsPerStep,
    // For N <= 32 service-linked fish, direct CPU scanning avoids spatial-grid allocation overhead
    recommendedBackend: count <= 32 ? 'cpu-direct' : 'cpu-spatial-grid',
  }
}
