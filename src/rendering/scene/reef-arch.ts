import * as THREE from 'three'

export const CENTER_ARCH_URL = new URL('../assets/corals/custom-rocks/reef-center-arch.glb', import.meta.url).href
export const CENTER_ARCH_PLACEMENT = Object.freeze({ x: 0.2, y: -2.73, z: -3.0, scale: 5.2 })

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
    if (node instanceof THREE.Mesh) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material)
  })
  materials.forEach(material => material.dispose())
}
