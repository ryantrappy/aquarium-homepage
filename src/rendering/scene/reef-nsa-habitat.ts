import * as THREE from 'three'
import { getSpeciesBehaviorProfile, SPECIES_BEHAVIOR_IDS, type HabitatAnchor } from '../../lib/fish-behavior'
import type { AxisAlignedBox, HabitatAnchorLocation, MaxAbsXAtDepth, Vec3 } from '../../simulation/habitat-navigation'
import type { CapsuleClearanceQuery } from '../../simulation/mesh-navigation'
import { evaluateTieredVerticalDepthRange, isSafeFishPosition } from './fish-spawn'
import { SAND_BURROW_WORLD_Y_M } from './reef-assembly'
import { MESH_NAVIGATION_COLLISION_RADIUS_M, MESH_NAVIGATION_MOVEMENT_BUDGET, type ReefMeshIslandInput } from './reef-mesh-navigation'

const BRANCH_SOCKETS = new Set(['socket_sps_crest_21', 'socket_sps_crest_22'])
const LEDGE_SOCKETS = new Set(['socket_plate_ledge_21', 'socket_plate_ledge_22', 'socket_plate_ledge_23'])
const FORAGE_SOCKETS = new Set(['socket_brain_apron_21', 'socket_brain_apron_22', 'socket_soft_mat_21', 'socket_soft_mat_22'])

/** Build destinations from the placed reef. Publish only sites with a clear
 * frontal approach in the same solid geometry that the movement solver uses. */
export function createNsaHabitatAnchors(
  islands: readonly ReefMeshIslandInput[],
  bounds: AxisAlignedBox,
  maxAbsXAtDepth: MaxAbsXAtDepth | undefined,
  query: CapsuleClearanceQuery,
): HabitatAnchorLocation[] {
  const anchors: HabitatAnchorLocation[] = []
  const radius = MESH_NAVIGATION_COLLISION_RADIUS_M
  const inWater = (position: Vec3) => isSafeFishPosition(position, radius, bounds, [], maxAbsXAtDepth)

  function addSite(id: string, types: readonly HabitatAnchor[], site: Vec3, offsets: readonly number[]) {
    const compatible = types.map(anchor => ({
      anchor,
      compatibleSpecies: SPECIES_BEHAVIOR_IDS.filter(species => {
        if (!getSpeciesBehaviorProfile(species)?.anchors.includes(anchor)) return false
        const band = evaluateTieredVerticalDepthRange(species, bounds)?.worldYRange
        return band && site.y >= band[0] && site.y <= band[1]
      }),
    })).filter(({ compatibleSpecies }) => compatibleSpecies.length)
    if (!compatible.length) return
    for (const offset of offsets) {
      const position = { ...site, z: site.z + offset }
      const approach = { ...position, z: position.z + .3 }
      if (!inWater(position) || !inWater(approach)) continue
      if (query(approach, position, radius, MESH_NAVIGATION_MOVEMENT_BUDGET).status !== 'clear') continue
      for (const { anchor, compatibleSpecies } of compatible) {
        anchors.push({ id: `${id}-${anchor}`, anchor, position, compatibleSpecies })
      }
      return
    }
  }

  const box = new THREE.Box3()
  const center = new THREE.Vector3()
  for (const { islandId, mountedCorals } of islands) {
    for (const { socketName, root } of mountedCorals) {
      const branch = BRANCH_SOCKETS.has(socketName)
      const ledge = LEDGE_SOCKETS.has(socketName)
      if (!branch && !ledge && !FORAGE_SOCKETS.has(socketName)) continue
      root.updateWorldMatrix(true, true)
      box.setFromObject(root)
      if (box.isEmpty()) continue
      box.getCenter(center)
      const id = `${islandId}-${socketName}`
      if (branch) {
        addSite(id, ['branchingCoralShelter', 'branchingCoralRefuge', 'coralOutcrop'],
          { x: center.x, y: center.y, z: box.max.z }, [.10, .26, .44])
      } else if (ledge) {
        addSite(id, ['foragingPatch', 'grazingSurface', 'rockPerch'],
          { x: center.x, y: box.max.y + .14, z: box.max.z }, [.08, .22, .38])
      } else {
        addSite(id, ['foragingPatch'], { x: center.x, y: center.y + .05, z: box.max.z }, [.10, .26, .44])
      }
    }
  }

  // These sites use the assembled preview's through-arch, sand in front
  // of the left buttress, and outer slope in front of the right rubble.
  addSite('nsa-arch-mouth-lower', ['rockCrevice'], { x: -.2, y: -1.95, z: -.7 }, [0])
  addSite('nsa-arch-mouth-upper', ['rockCrevice'], { x: -.2, y: -1.08, z: -.7 }, [0, .18, .34])
  addSite('nsa-buttress-sand', ['sandBurrowEntrance'], { x: -2.73, y: SAND_BURROW_WORLD_Y_M, z: .5 }, [0])
  addSite('nsa-ledge-slope', ['reefSlopeRubble'], { x: 3.12, y: -.84, z: .64 }, [0])
  return anchors
}
