import type { Vec3 } from '../../simulation/habitat-navigation'

export type ReefPlacement = Readonly<{
  islandKind: 'left' | 'right'
  position: Vec3
  uniformScale: number
  foundationHeightScale: number
  yaw: number
}>

// AQ-70.13: one placement source for the visible reef, navigation and
// substrate contact. Uniform scaling preserves the supplied model shapes.
const LAPTOP_REEF: readonly ReefPlacement[] = Object.freeze([
  { islandKind: 'left', position: { x: -2.5, y: -2.7, z: -1.35 }, uniformScale: 6.0, foundationHeightScale: 2.0, yaw: 0.08 },
  { islandKind: 'right', position: { x: 3.1, y: -2.7, z: -1.2 }, uniformScale: 5.0, foundationHeightScale: 3.1, yaw: -0.1 },
])
const PHONE_REEF: readonly ReefPlacement[] = Object.freeze([
  { islandKind: 'left', position: { x: -0.15, y: -2.7, z: -1.35 }, uniformScale: 4.6, foundationHeightScale: 2.8, yaw: 0.06 },
])

export function reefPlacementsForViewport(narrow: boolean): readonly ReefPlacement[] {
  return narrow ? PHONE_REEF : LAPTOP_REEF
}

/** Approximate contact ellipses, scaled with the same island transforms.
 * These shade the substrate; actual collision remains geometry-derived.
 */
export type ReefContactFootprint = Readonly<{
  x: number
  z: number
  radiusX: number
  radiusZ: number
}>

function makeContactFootprints(placements: readonly ReefPlacement[]): readonly ReefContactFootprint[] {
  return Object.freeze(placements.map(placement => {
    const localX = placement.islandKind === 'left' ? 1.85 / 4.5 : 1.75 / 4.3
    const localZ = placement.islandKind === 'left' ? 1.15 / 4.5 : 1.1 / 4.3
    const c = Math.cos(placement.yaw), s = Math.sin(placement.yaw)
    return Object.freeze({
      x: placement.position.x,
      z: placement.position.z,
      radiusX: Math.hypot(localX * c, localZ * s) * placement.uniformScale,
      radiusZ: Math.hypot(localX * s, localZ * c) * placement.uniformScale,
    })
  }))
}

const LAPTOP_CONTACT_FOOTPRINTS = makeContactFootprints(LAPTOP_REEF)
const PHONE_CONTACT_FOOTPRINTS = makeContactFootprints(PHONE_REEF)

export function reefContactFootprints(narrow: boolean): readonly ReefContactFootprint[] {
  return narrow ? PHONE_CONTACT_FOOTPRINTS : LAPTOP_CONTACT_FOOTPRINTS
}
