import * as THREE from 'three'
import { evaluateAragoniteSandTilt, evaluateAragoniteSandWorldY } from './aragonite-sand'
import type { ModularCoralMountEntry } from './reef-assembly'

export type NsaRockId =
  | 'reef-nsa-pinnacle-spire'
  | 'reef-nsa-cantilever-shelf'
  | 'reef-nsa-cave-buttress'
  | 'reef-nsa-bommie-mound'
  | 'reef-nsa-rubble-talus'

export const NSA_ROCK_URLS: Readonly<Record<NsaRockId, string>> = Object.freeze({
  'reef-nsa-pinnacle-spire': new URL('../assets/corals/custom-rocks/reef-nsa-pinnacle-spire.glb', import.meta.url).href,
  'reef-nsa-cantilever-shelf': new URL('../assets/corals/custom-rocks/reef-nsa-cantilever-shelf.glb', import.meta.url).href,
  'reef-nsa-cave-buttress': new URL('../assets/corals/custom-rocks/reef-nsa-cave-buttress.glb', import.meta.url).href,
  'reef-nsa-bommie-mound': new URL('../assets/corals/custom-rocks/reef-nsa-bommie-mound.glb', import.meta.url).href,
  'reef-nsa-rubble-talus': new URL('../assets/corals/custom-rocks/reef-nsa-rubble-talus.glb', import.meta.url).href,
})

export const RUBBLE_TALUS_URL = NSA_ROCK_URLS['reef-nsa-rubble-talus']

/** Verified custom-coral mount presets matching AQ-94 sculpted rock sockets. */
export const NSA_MODULE_MOUNTS: Readonly<
  Record<Exclude<NsaRockId, 'reef-nsa-rubble-talus'>, readonly ModularCoralMountEntry[]>
> = Object.freeze({
  'reef-nsa-pinnacle-spire': Object.freeze<readonly ModularCoralMountEntry[]>([
    {
      socketName: 'socket_sps_crest_21',
      coralAssetId: 'reef-acropora-antler',
      archetype: 'branching-sps',
      yawRad: 0.45,
      scale: 0.62,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#5d7a98',
        tipColor: '#b7d4ee',
        creviceColor: '#1f2b3a',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.08,
      },
    },
    {
      socketName: 'socket_plate_ledge_21',
      coralAssetId: 'reef-montipora-tier-shelf',
      archetype: 'plating-sps',
      yawRad: -0.35,
      scale: 0.64,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#bf6554',
        tipColor: '#f3dbd1',
        creviceColor: '#4c1d16',
        regradeStrength: 0.36,
        roughness: 1,
        fluorescenceStrength: 0.06,
      },
    },
  ]),
  'reef-nsa-cantilever-shelf': Object.freeze<readonly ModularCoralMountEntry[]>([
    {
      socketName: 'socket_lps_mid_21',
      coralAssetId: 'reef-euphyllia-gold-torch',
      archetype: 'tentaculate-lps',
      yawRad: 0.25,
      scale: 0.56,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#c87e34',
        tipColor: '#ffe078',
        creviceColor: '#42240e',
        regradeStrength: 0.32,
        roughness: 1,
        fluorescenceStrength: 0.14,
      },
      rigidPaletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#6d6259',
        tipColor: '#96897e',
        creviceColor: '#302924',
        regradeStrength: 0.2,
        roughness: 1,
        fluorescenceStrength: 0,
      },
      preserveSkeletonShape: true,
    },
    {
      socketName: 'socket_plate_ledge_22',
      coralAssetId: 'reef-montipora-whorled-plate',
      archetype: 'plating-sps',
      yawRad: -0.55,
      scale: 0.62,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#7b5ca2',
        tipColor: '#d3c2ee',
        creviceColor: '#2d1c42',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.06,
      },
    },
  ]),
  'reef-nsa-cave-buttress': Object.freeze<readonly ModularCoralMountEntry[]>([
    {
      socketName: 'socket_lps_mid_22',
      coralAssetId: 'reef-euphyllia-branching-frogspawn',
      archetype: 'tentaculate-lps',
      yawRad: -0.2,
      scale: 0.54,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#4da072',
        tipColor: '#b7f598',
        creviceColor: '#1a3827',
        regradeStrength: 0.32,
        roughness: 1,
        fluorescenceStrength: 0.12,
      },
      rigidPaletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#6e6058',
        tipColor: '#98887e',
        creviceColor: '#2f2823',
        regradeStrength: 0.2,
        roughness: 1,
        fluorescenceStrength: 0,
      },
      preserveSkeletonShape: true,
    },
  ]),
  'reef-nsa-bommie-mound': Object.freeze<readonly ModularCoralMountEntry[]>([
    {
      socketName: 'socket_brain_apron_21',
      coralAssetId: 'reef-acanthastrea-lordhowensis',
      archetype: 'mounded-lps',
      yawRad: 0.4,
      scale: 0.56,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#b6463a',
        tipColor: '#f29f7e',
        creviceColor: '#3f1512',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.08,
      },
    },
    {
      socketName: 'socket_soft_mat_21',
      coralAssetId: 'reef-zoanthid-palythoa-cluster',
      archetype: 'zoanthid-mat',
      yawRad: -0.6,
      scale: 0.26,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#2ea888',
        tipColor: '#9cf264',
        creviceColor: '#163830',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.1,
      },
      rigidPaletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#6b5e54',
        tipColor: '#94867a',
        creviceColor: '#2e2722',
        regradeStrength: 0.2,
        roughness: 1,
        fluorescenceStrength: 0,
      },
      preserveSkeletonShape: true,
    },
  ]),
})

export type RubbleTalusPlacement = Readonly<{
  x: number
  z: number
  yaw: number
  scale: number
}>

const LAPTOP_RUBBLE_PLACEMENTS: readonly RubbleTalusPlacement[] = Object.freeze([
  // Frame left island rock-to-sand edges cleanly while keeping the front cave clear
  Object.freeze({ x: -3.75, z: -0.35, yaw: 0.42, scale: 2.25 }),
  Object.freeze({ x: -1.35, z: -0.25, yaw: -0.58, scale: 2.05 }),
  // Frame right island rock-to-sand edges cleanly while keeping the moray crevice clear
  Object.freeze({ x: 1.95, z: -0.28, yaw: 0.65, scale: 2.05 }),
  Object.freeze({ x: 4.25, z: -0.45, yaw: -0.48, scale: 2.20 }),
  // Anchor background center arch piers into sand slope
  Object.freeze({ x: -1.80, z: -2.75, yaw: 0.25, scale: 2.10 }),
  Object.freeze({ x: 2.20, z: -2.75, yaw: -0.30, scale: 2.10 }),
])

const PHONE_RUBBLE_PLACEMENTS: readonly RubbleTalusPlacement[] = Object.freeze([
  Object.freeze({ x: -1.35, z: -0.45, yaw: 0.38, scale: 1.95 }),
  Object.freeze({ x: 1.05, z: -0.40, yaw: -0.52, scale: 1.95 }),
])

export function rubbleTalusPlacementsForViewport(narrow: boolean): readonly RubbleTalusPlacement[] {
  return narrow ? PHONE_RUBBLE_PLACEMENTS : LAPTOP_RUBBLE_PLACEMENTS
}

/**
 * Clones `reef-nsa-rubble-talus.glb` around the island and arch footprints to
 * soften hard rock-to-sand intersections (AQ-94 AC #5). Clones materials only so
 * shared geometry/maps stay owned by loadedAssets; marks meshes non-pickable.
 */
export function createRubbleTalusGroundingAprons(source: THREE.Object3D, narrow: boolean): THREE.Group {
  const group = new THREE.Group()
  group.name = 'reef-nsa-rubble-talus-grounding'
  const placements = rubbleTalusPlacementsForViewport(narrow)
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i]!
    const apron = source.clone(true)
    apron.name = `reef-nsa-rubble-talus-${i}`
    apron.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      const materials = (Array.isArray(node.material) ? node.material : [node.material]).map((material) =>
        material.clone(),
      )
      node.material = Array.isArray(node.material) ? materials : materials[0]
      node.castShadow = true
      node.receiveShadow = true
      node.raycast = () => {}
    })
    const sandY = evaluateAragoniteSandWorldY(placement.x, placement.z, narrow) - 0.025
    const tilt = evaluateAragoniteSandTilt(placement.x, placement.z, placement.yaw, narrow)
    apron.position.set(placement.x, sandY, placement.z)
    apron.rotation.order = 'YXZ'
    apron.rotation.set(tilt.pitch, placement.yaw, tilt.roll)
    apron.scale.setScalar(placement.scale)
    group.add(apron)
  }
  return group
}

/** Disposes cloned materials only; shared geometry/textures remain owned by loadedAssets. */
export function disposeRubbleTalusMaterials(group: THREE.Object3D): void {
  const materials = new Set<THREE.Material>()
  group.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material) materials.add(material)
    }
    if (node.customDepthMaterial) materials.add(node.customDepthMaterial)
    if (node.customDistanceMaterial) materials.add(node.customDistanceMaterial)
  })
  materials.forEach((material) => material.dispose())
}
