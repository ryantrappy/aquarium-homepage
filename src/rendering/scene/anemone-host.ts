import * as THREE from 'three'
import type { HabitatAnchorLocation } from '../../simulation/habitat-navigation'
import type { AssembledCoralBinding } from './reef-assembly'

/** Host points come from the displayed crown, including all mount/reef transforms.
 * Never project an absent or out-of-water host onto a detached safe plane. */
export function mountedAnemoneHosts(bindings: readonly AssembledCoralBinding[], prefix: string): HabitatAnchorLocation[] {
  return bindings.filter(binding => binding.coralAssetId === 'coral-anemone-bta').map(binding => {
    binding.root.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3()
    let crownMeshes = 0
    binding.root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return
      const primitive = node.userData.reefPrimitive ?? node.parent?.userData.reefPrimitive
      if (primitive?.id !== 'anemone_tentacle_crown' || primitive.role !== 'coral-soft') return
      const positions = node.geometry.getAttribute('position')
      if (!positions?.count || !node.matrixWorld.elements.every(Number.isFinite)) throw new Error('Invalid mounted anemone crown.')
      const vertex = new THREE.Vector3()
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld)
        if (![vertex.x, vertex.y, vertex.z].every(Number.isFinite)) throw new Error('Nonfinite mounted anemone crown.')
        bounds.expandByPoint(vertex)
      }
      crownMeshes++
    })
    const size = bounds.getSize(new THREE.Vector3())
    if (!crownMeshes || ![size.x, size.y, size.z].every(v => Number.isFinite(v) && v > 0)) throw new Error('Mounted anemone tentacle crown unavailable.')
    const center = bounds.getCenter(new THREE.Vector3())
    return {
      id: `${prefix}-anchor-${binding.socketName}-hostAnemone`,
      anchor: 'hostAnemone',
      compatibleSpecies: ['ocellaris-clownfish'],
      // Upper, viewer-facing tentacles, rather than the buried pedal disc.
      position: { x: center.x, y: bounds.min.y + size.y * .65, z: bounds.max.z - size.z * .08 },
      softHomeRadius: Math.min(.35, Math.max(.08, Math.min(size.x, size.z) * .24)),
    }
  })
}
