import * as THREE from 'three'
import type { ModularCoralMountEntry } from './reef-assembly'

export const CENTER_ARCH_URL = new URL('../assets/corals/custom-rocks/reef-center-arch.glb', import.meta.url).href
export const CENTER_ARCH_PLACEMENT = Object.freeze({ x: 0.2, y: -2.73, z: -3.0, scale: 5.2 })
export const CENTER_ARCH_MOUNTS: readonly ModularCoralMountEntry[] = Object.freeze([
  { socketName: 'socket_soft_mat_11', coralAssetId: 'coral-zoanthid-mat', archetype: 'zoanthid-mat', yawRad: 0.3, scale: 0.16,
    paletteOverride: { baseColor: '#bd783c', tipColor: '#9dac57', creviceColor: '#3d4828', fluorescenceStrength: 0.16 } },
  { socketName: 'socket_plate_ledge_11', coralAssetId: 'coral-montipora-plate', archetype: 'plating-sps', yawRad: -0.4, scale: 0.65,
    paletteOverride: { baseColor: '#a76661', tipColor: '#cb9e85', creviceColor: '#513e4e', fluorescenceStrength: 0.06 } },
  { socketName: 'socket_soft_mat_12', coralAssetId: 'coral-zoanthid-mat', archetype: 'zoanthid-mat', yawRad: -0.7, scale: 0.16,
    paletteOverride: { baseColor: '#93884c', tipColor: '#bd9b64', creviceColor: '#3e4830', fluorescenceStrength: 0.12 } },
  { socketName: 'socket_sps_crest_11', coralAssetId: 'coral-acropora-table', archetype: 'branching-sps', yawRad: 0.8, scale: 0.65,
    paletteOverride: { baseColor: '#5d784b', tipColor: '#a7bc78', creviceColor: '#35412e', fluorescenceStrength: 0.12 } },
])

/** Additive background bridge. Phone retains the taller single-island composition.
 * Preserve the authored carbonate maps and geometry; the older foundation sculpt
 * and map-replacing live-rock shader must not run on this separate module.
 */
export function createCenterArch(source: THREE.Object3D): THREE.Object3D {
  const arch = source.clone(true)
  arch.name = 'reef-center-arch'
  arch.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(material => material.clone())
    node.material = Array.isArray(node.material) ? materials : materials[0]
    node.castShadow = true
    node.receiveShadow = true
  })
  arch.position.set(CENTER_ARCH_PLACEMENT.x, CENTER_ARCH_PLACEMENT.y, CENTER_ARCH_PLACEMENT.z)
  arch.scale.setScalar(CENTER_ARCH_PLACEMENT.scale)
  return arch
}

/** Placement owns cloned materials only; geometry/maps belong to loadedAssets. */
export function disposeCenterArchMaterials(arch: THREE.Object3D): void {
  const materials = new Set<THREE.Material>()
  arch.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material)
    if (node.customDepthMaterial) materials.add(node.customDepthMaterial)
    if (node.customDistanceMaterial) materials.add(node.customDistanceMaterial)
  })
  materials.forEach(material => material.dispose())
}
