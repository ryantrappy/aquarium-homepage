import {
  getSpeciesBehaviorProfile,
  type BehaviorState,
  type HabitatAnchor,
  type SpeciesBehaviorId,
} from '../../lib/fish-behavior'
import {
  isWaterSegmentSafe,
  type AxisAlignedBox,
  type HabitatAnchorLocation,
  type SolidObstacleVolume,
  type Vec3,
} from '../../simulation/habitat-navigation'

export type AnchorInteractionCategory =
  | 'host-anemone-symbiosis'
  | 'sand-burrow-hover-bolt'
  | 'sand-burrow-lookout-back-in'
  | 'rock-perch-station'
  | 'substrate-grazing-forage'
  | 'crevice-refuge-hold'

export type AnchorInteractionPoseOffset = Readonly<{
  category: AnchorInteractionCategory
  anchor: HabitatAnchor
  speciesId: SpeciesBehaviorId
  positionOffset: Vec3
  pitchOffsetRad: number
  yawLockToEntrance: boolean
  reverseRetreat: boolean
  softTentacleOverlapAllowed: boolean
  softHomeRadius: number
}>

const TWO_PI = Math.PI * 2

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Verifies whether a candidate `HabitatAnchorLocation` is profile-compatible with
 * a given `speciesId` and optional `BehaviorState` (`AQ-45` AC #1).
 * Never substitutes incompatible anchors (e.g., never treats `branchingCoralShelter` as `hostAnemone`).
 */
export function isSpeciesCompatibleWithAnchor(
  speciesId: string,
  location: HabitatAnchorLocation,
  state?: BehaviorState,
): boolean {
  const profile = getSpeciesBehaviorProfile(speciesId)
  if (!profile) return false
  if (!profile.anchors.includes(location.anchor)) return false
  if (
    location.compatibleSpecies &&
    location.compatibleSpecies.length > 0 &&
    !location.compatibleSpecies.includes(profile.speciesId)
  ) {
    return false
  }
  if (state) {
    const stateSpec = profile.states[state]
    if (!stateSpec) return false
    const expectedAnchor =
      'destination' in stateSpec ? stateSpec.destination : stateSpec.anchor
    if (expectedAnchor && expectedAnchor !== location.anchor) return false
  }
  return true
}

/**
 * Filters a list of habitat anchor locations down to those strictly compatible
 * with `speciesId` (and optional `state`), rejecting incompatible combinations (`AQ-45` AC #1).
 */
export function filterCompatibleAnchorLocations(
  speciesId: string,
  locations: readonly HabitatAnchorLocation[],
  state?: BehaviorState,
): HabitatAnchorLocation[] {
  return locations.filter(loc => isSpeciesCompatibleWithAnchor(speciesId, loc, state))
}

/**
 * Resolves the species-specific interaction category for a validated `(speciesId, anchor)` pair (`AQ-45` AC #2–#4, #6).
 */
export function classifyAnchorInteraction(
  speciesId: string,
  anchor: HabitatAnchor,
): AnchorInteractionCategory | undefined {
  const profile = getSpeciesBehaviorProfile(speciesId)
  if (!profile || !profile.anchors.includes(anchor)) return undefined

  if (anchor === 'hostAnemone' && speciesId === 'ocellaris-clownfish') {
    return 'host-anemone-symbiosis'
  }
  if (anchor === 'sandBurrowEntrance') {
    if (speciesId === 'yellow-watchman-goby') {
      return 'sand-burrow-lookout-back-in'
    }
    return 'sand-burrow-hover-bolt'
  }
  if (anchor === 'rockPerch') {
    return 'rock-perch-station'
  }
  if (
    anchor === 'grazingSurface' ||
    anchor === 'foragingPatch' ||
    anchor === 'reefSlopeRubble' ||
    anchor === 'seagrassEdge'
  ) {
    return 'substrate-grazing-forage'
  }
  if (
    anchor === 'rockCrevice' ||
    anchor === 'branchingCoralRefuge' ||
    anchor === 'branchingCoralShelter' ||
    anchor === 'coralOutcrop' ||
    anchor === 'schoolCenter'
  ) {
    return 'crevice-refuge-hold'
  }
  return undefined
}

/**
 * Evaluates deterministic, collision-aware station-keeping, foraging, perching,
 * or retreat kinematics around a compatible habitat anchor (`AQ-45` AC #2–#7):
 * - `ocellaris-clownfish` at `hostAnemone`: soft home region (`softHomeRadius`, default `0.22`),
 *   gentle bobbing figure-eight loops among soft tentacles (`softTentacleOverlapAllowed = true`),
 *   brief peeks out, and return to the host zone.
 * - `firefish` at `sandBurrowEntrance`: hovers above the burrow entrance (`+0.18` elevation) with dorsal flicks
 *   and darts head-first (`reverseRetreat = false`) into the entrance on `retreat`.
 * - `yellow-watchman-goby` at `sandBurrowEntrance`: holds low benthic lookout at the burrow entrance (`+0.03` elevation)
 *   facing outward (`yawLockToEntrance = true`) and retreats **backward** (`reverseRetreat = true`) into the burrow.
 * - `tailspot-blenny` at `rockPerch`: perches stably with slight head-up pitch (`+0.12 rad`).
 * - Grazing/foraging species (`yellow-tang`, `flame-angelfish`, `mandarin-dragonet`, `copperband-butterflyfish`) at
 *   `grazingSurface`/`foragingPatch`/`reefSlopeRubble`: nose-down grazing pitch (`-0.22 rad`) with small lateral inspection sweeps.
 */
export function evaluateAnchorInteractionOffset(input: {
  speciesId: string
  location: HabitatAnchorLocation
  state: BehaviorState
  elapsedSeconds: number
  softHomeRadius?: number
  paused?: boolean
  reducedMotion?: boolean
}): AnchorInteractionPoseOffset | undefined {
  const { speciesId, location, state, elapsedSeconds, paused, reducedMotion } = input
  if (!isSpeciesCompatibleWithAnchor(speciesId, location)) return undefined
  const category = classifyAnchorInteraction(speciesId, location.anchor)
  if (!category) return undefined

  const profile = getSpeciesBehaviorProfile(speciesId)!
  const t = paused || reducedMotion || !Number.isFinite(elapsedSeconds) ? 0 : elapsedSeconds % 3600
  const homeRadius = clamp(input.softHomeRadius ?? 0.22, 0.08, 0.45)

  switch (category) {
    case 'host-anemone-symbiosis': {
      const cycle = t * TWO_PI * 0.28
      const peekEnvelope = state === 'display' ? 1.0 : state === 'retreat' ? 0.35 : 0.75
      const r = homeRadius * peekEnvelope
      return {
        category,
        anchor: location.anchor,
        speciesId: profile.speciesId,
        positionOffset: {
          x: Math.sin(cycle) * r,
          y: 0.04 * Math.sin(cycle * 2.0),
          z: Math.cos(cycle * 0.5) * r * 0.65,
        },
        pitchOffsetRad: 0.08 * Math.sin(cycle * 2.0),
        yawLockToEntrance: false,
        reverseRetreat: false,
        softTentacleOverlapAllowed: true,
        softHomeRadius: homeRadius,
      }
    }

    case 'sand-burrow-hover-bolt': {
      const isRetreat = state === 'retreat'
      const hoverHeight = isRetreat ? 0.02 : 0.18 + 0.025 * Math.sin(t * TWO_PI * 0.35)
      const driftX = isRetreat ? 0 : 0.04 * Math.sin(t * TWO_PI * 0.22)
      return {
        category,
        anchor: location.anchor,
        speciesId: profile.speciesId,
        positionOffset: { x: driftX, y: hoverHeight, z: isRetreat ? -0.04 : 0.05 },
        pitchOffsetRad: isRetreat ? -0.24 : 0.05,
        yawLockToEntrance: false,
        reverseRetreat: false,
        softTentacleOverlapAllowed: false,
        softHomeRadius: 0.14,
      }
    }

    case 'sand-burrow-lookout-back-in': {
      const isRetreat = state === 'retreat'
      return {
        category,
        anchor: location.anchor,
        speciesId: profile.speciesId,
        positionOffset: {
          x: 0,
          y: isRetreat ? 0.01 : 0.03,
          z: isRetreat ? -0.08 : 0.06,
        },
        pitchOffsetRad: 0.09,
        yawLockToEntrance: true,
        reverseRetreat: isRetreat,
        softTentacleOverlapAllowed: false,
        softHomeRadius: 0.1,
      }
    }

    case 'rock-perch-station': {
      const isForaging = state === 'forage'
      return {
        category,
        anchor: location.anchor,
        speciesId: profile.speciesId,
        positionOffset: {
          x: isForaging ? 0.03 * Math.sin(t * TWO_PI * 0.45) : 0,
          y: 0.02,
          z: isForaging ? 0.02 * Math.cos(t * TWO_PI * 0.45) : 0,
        },
        pitchOffsetRad: isForaging ? -0.14 : 0.12,
        yawLockToEntrance: false,
        reverseRetreat: false,
        softTentacleOverlapAllowed: false,
        softHomeRadius: 0.09,
      }
    }

    case 'substrate-grazing-forage': {
      const sweep = t * TWO_PI * 0.32
      return {
        category,
        anchor: location.anchor,
        speciesId: profile.speciesId,
        positionOffset: {
          x: 0.06 * Math.sin(sweep),
          y: 0.015 * Math.cos(sweep * 2),
          z: 0.05 * Math.cos(sweep),
        },
        pitchOffsetRad: -0.22,
        yawLockToEntrance: false,
        reverseRetreat: false,
        softTentacleOverlapAllowed: false,
        softHomeRadius: 0.15,
      }
    }

    case 'crevice-refuge-hold': {
      return {
        category,
        anchor: location.anchor,
        speciesId: profile.speciesId,
        positionOffset: {
          x: 0.02 * Math.sin(t * TWO_PI * 0.2),
          y: 0,
          z: 0,
        },
        pitchOffsetRad: 0,
        yawLockToEntrance: false,
        reverseRetreat: false,
        softTentacleOverlapAllowed: false,
        softHomeRadius: 0.12,
      }
    }
  }
}

/**
 * Computes a collision-checked target position for an anchor interaction, falling back
 * to the base anchor coordinate if the offset would intersect an obstacle (`AQ-45` AC #5).
 *
 * AQ-82 AC #3: anchor interactions use a reduced clearance
 * (`interactionClearanceRadius`, normally the fish's physical body radius
 * plus a small margin) instead of the legacy 0.5 m habitat clearance, so a
 * compatible fish can enter a permeable coral interaction zone — the
 * clownfish nestling into its host anemone's tentacles
 * (`softTentacleOverlapAllowed`), or a damselfish/cardinalfish/wrasse
 * sheltering among branching SPS — while the segment check still prevents
 * penetration into rigid rock or stony bases. When the caller omits
 * `interactionClearanceRadius` the legacy `fishClearanceRadius` applies.
 */
export function resolveSafeAnchorInteractionTarget(input: {
  currentPosition: Vec3
  location: HabitatAnchorLocation
  offset: AnchorInteractionPoseOffset
  waterBounds: AxisAlignedBox
  obstacles: readonly SolidObstacleVolume[]
  fishClearanceRadius: number
  interactionClearanceRadius?: number
}): Vec3 | undefined {
  const { currentPosition, location, offset, waterBounds, obstacles, fishClearanceRadius } = input
  const interactionClearance = input.interactionClearanceRadius ?? fishClearanceRadius
  const candidate: Vec3 = {
    x: location.position.x + offset.positionOffset.x,
    y: location.position.y + offset.positionOffset.y,
    z: location.position.z + offset.positionOffset.z,
  }
  if (
    isWaterSegmentSafe({
      start: currentPosition,
      target: candidate,
      waterBounds,
      obstacles,
      fishClearanceRadius: interactionClearance,
    })
  ) {
    return candidate
  }
  if (
    isWaterSegmentSafe({
      start: currentPosition,
      target: location.position,
      waterBounds,
      obstacles,
      fishClearanceRadius: interactionClearance,
    })
  ) {
    return { ...location.position }
  }
  return undefined
}
