import * as THREE from 'three'
import type { EncrustingFaceSite, ModularCoralMountEntry } from './reef-assembly'

export const CENTER_ARCH_URL = new URL('../assets/corals/custom-rocks/reef-center-arch.glb', import.meta.url).href
export const CENTER_ARCH_PLACEMENT = Object.freeze({ x: 0.2, y: -2.73, z: -3.0, scale: 5.2 })
// Shallow mat on the front shoulder above the swim-through.
export const CENTER_ARCH_FACE_SITES: readonly EncrustingFaceSite[] = [[0.65, 0.70, 0.30]]

export const CENTER_ARCH_MOUNTS: readonly ModularCoralMountEntry[] = Object.freeze([
  {
    socketName: 'socket_soft_mat_11',
    coralAssetId: 'reef-zoanthid-colonial-mat',
    archetype: 'zoanthid-mat',
    yawRad: 0.3,
    scale: 0.42,
    paletteOverride: {
      surfaceMode: 'baked-pbr',
      baseColor: '#d45a2a',
      tipColor: '#7ef564',
      creviceColor: '#381c18',
      regradeStrength: 0.34,
      roughness: 1,
      fluorescenceStrength: 0.12,
    },
    rigidPaletteOverride: {
      surfaceMode: 'baked-pbr',
      baseColor: '#6e5864',
      tipColor: '#96828c',
      creviceColor: '#2e2229',
      regradeStrength: 0.20,
      roughness: 1,
      fluorescenceStrength: 0,
    },
    preserveSkeletonShape: true,
  },
  {
    socketName: 'socket_plate_ledge_11',
    coralAssetId: 'reef-montipora-whorled-plate',
    archetype: 'plating-sps',
    yawRad: -0.4,
    scale: 0.78,
    paletteOverride: {
      surfaceMode: 'baked-pbr',
      baseColor: '#c2604e',
      tipColor: '#f5dcd0',
      creviceColor: '#4c1e16',
      regradeStrength: 0.38,
      roughness: 1,
      fluorescenceStrength: 0.06,
    },
  },
  {
    socketName: 'socket_soft_mat_12',
    coralAssetId: 'reef-zoanthid-palythoa-cluster',
    archetype: 'zoanthid-mat',
    yawRad: -0.7,
    scale: 0.42,
    paletteOverride: {
      surfaceMode: 'baked-pbr',
      baseColor: '#2ea888',
      tipColor: '#9cf264',
      creviceColor: '#163830',
      regradeStrength: 0.34,
      roughness: 1,
      fluorescenceStrength: 0.10,
    },
    rigidPaletteOverride: {
      surfaceMode: 'baked-pbr',
      baseColor: '#6b5e54',
      tipColor: '#94867a',
      creviceColor: '#2e2722',
      regradeStrength: 0.20,
      roughness: 1,
      fluorescenceStrength: 0,
    },
    preserveSkeletonShape: true,
  },
  {
    socketName: 'socket_sps_crest_11',
    coralAssetId: 'reef-acropora-violet-millepora',
    archetype: 'branching-sps',
    yawRad: 0.8,
    scale: 0.76,
    paletteOverride: {
      surfaceMode: 'baked-pbr',
      baseColor: '#7a52a8',
      tipColor: '#d4b8f0',
      creviceColor: '#2d1844',
      regradeStrength: 0.36,
      roughness: 1,
      fluorescenceStrength: 0.08,
    },
  },
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
