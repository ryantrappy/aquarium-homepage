import * as THREE from 'three'
import { evaluateAragoniteSandTilt, evaluateAragoniteSandWorldY, type RockFootprint } from './aragonite-sand'
import { glassEnclosureLayout } from './glass-enclosure'
import type { EncrustingFaceSite, ModularCoralMountEntry } from './reef-assembly'

export type NsaRockId =
  | 'reef-nsa-pinnacle-spire'
  | 'reef-nsa-cantilever-shelf'
  | 'reef-nsa-cave-buttress'
  | 'reef-nsa-bommie-mound'
  | 'reef-nsa-rubble-talus'
  | 'reef-nsa-high-arch-span'
  | 'reef-nsa-encrusting-ledge'

export const NSA_ROCK_URLS: Readonly<Record<NsaRockId, string>> = Object.freeze({
  'reef-nsa-pinnacle-spire': new URL('../assets/corals/custom-rocks/reef-nsa-pinnacle-spire.glb', import.meta.url).href,
  'reef-nsa-cantilever-shelf': new URL('../assets/corals/custom-rocks/reef-nsa-cantilever-shelf.glb', import.meta.url).href,
  'reef-nsa-cave-buttress': new URL('../assets/corals/custom-rocks/reef-nsa-cave-buttress.glb', import.meta.url).href,
  'reef-nsa-bommie-mound': new URL('../assets/corals/custom-rocks/reef-nsa-bommie-mound.glb', import.meta.url).href,
  'reef-nsa-rubble-talus': new URL('../assets/corals/custom-rocks/reef-nsa-rubble-talus.glb', import.meta.url).href,
  'reef-nsa-high-arch-span': new URL('../assets/corals/custom-rocks/reef-nsa-high-arch-span.glb', import.meta.url).href,
  'reef-nsa-encrusting-ledge': new URL('../assets/corals/custom-rocks/reef-nsa-encrusting-ledge.glb', import.meta.url).href,
})

export const RUBBLE_TALUS_URL = NSA_ROCK_URLS['reef-nsa-rubble-talus']
export const NSA_KIT_URL = new URL('../assets/corals/custom-rocks/reef-nsa-kit.glb', import.meta.url).href

// Candidate faces in module-local normalized bounds. The assembly rejects
// candidates whose exported surface cannot support the instance footprint.
export const NSA_ENCRUSTING_FACE_SITES: Readonly<Partial<Record<string, readonly EncrustingFaceSite[]>>> = {
  'reef-nsa-pinnacle-spire': [
    [.645, .745, .47], [.495, .52, .40], [.67, .395, .47],
  ],
  'reef-nsa-cave-buttress': [
    [.295, .47, .47], [.72, .245, .40],
  ],
  'reef-nsa-high-arch-span': [
    [.295, .87, .28], [.295, .62, .40], [.77, .495, .34], [.37, .42, .47],
  ],
  'reef-nsa-encrusting-ledge': [
    [.595, .495, .34],
  ],
}

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
      coralAssetId: 'coral-anemone-bta',
      archetype: 'tentaculate-lps',
      yawRad: 0,
      scale: 0.56,
      offsetM: [0, -0.008, 0.015],
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#e85298',
        tipColor: '#ff3888',
        creviceColor: '#f5e8d0',
        regradeStrength: 0.24,
        roughness: 1,
        fluorescenceStrength: 0.24,
      },
      columnPaletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#d8481c',
        tipColor: '#f7ead8',
        creviceColor: '#5c1210',
        regradeStrength: 0.22,
        roughness: 1,
        fluorescenceStrength: 0.14,
      },
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
  'reef-nsa-high-arch-span': Object.freeze<readonly ModularCoralMountEntry[]>([
    {
      socketName: 'socket_sps_crest_22',
      coralAssetId: 'reef-acropora-violet-millepora',
      archetype: 'branching-sps',
      yawRad: 0.35,
      scale: 0.58,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#764e9e',
        tipColor: '#d9c6f5',
        creviceColor: '#27173b',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.08,
      },
    },
    {
      socketName: 'socket_plate_ledge_23',
      coralAssetId: 'reef-montipora-undata-cap',
      archetype: 'plating-sps',
      yawRad: -0.42,
      scale: 0.62,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#4e7e68',
        tipColor: '#d4eed8',
        creviceColor: '#1b3127',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.06,
      },
    },
  ]),
  'reef-nsa-encrusting-ledge': Object.freeze<readonly ModularCoralMountEntry[]>([
    {
      socketName: 'socket_brain_apron_22',
      coralAssetId: 'reef-favia-war-coral',
      archetype: 'mounded-lps',
      yawRad: 0.28,
      scale: 0.54,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#a23b32',
        tipColor: '#93e288',
        creviceColor: '#37120e',
        regradeStrength: 0.34,
        roughness: 1,
        fluorescenceStrength: 0.1,
      },
    },
    {
      socketName: 'socket_soft_mat_22',
      coralAssetId: 'reef-zoanthid-colonial-mat',
      archetype: 'zoanthid-mat',
      yawRad: -0.5,
      scale: 0.26,
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#3699b0',
        tipColor: '#f5b858',
        creviceColor: '#14333d',
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

const NSA_REVIEW_PLACEMENTS = [
  { id: 'reef-nsa-cave-buttress', x: -3.48, y: -2.8, z: -1.55, yaw: .12, scale: 5.25 },
  { id: 'reef-nsa-pinnacle-spire', x: -3.57, y: -1.8, z: -1.6, yaw: -.16, scale: 6.25 },
  { id: 'reef-nsa-cantilever-shelf', x: -3.55, y: -.72, z: -.97, yaw: -.08, scale: 4.05 },
  { id: 'reef-nsa-high-arch-span', x: -.45, y: -2.76, z: -2.1, yaw: .06, scale: 4.65 },
  { id: 'reef-nsa-bommie-mound', x: 2.83, y: -2.8, z: -1.65, yaw: -.16, scale: 6.1 },
  { id: 'reef-nsa-pinnacle-spire', x: 3.36, y: -1.85, z: -1.88, yaw: .58, scale: 3.98 },
  { id: 'reef-nsa-encrusting-ledge', x: 3.34, y: -2.75, z: -.17, yaw: .24, scale: 4.95 },
] as const satisfies readonly ({ id: Exclude<NsaRockId, 'reef-nsa-rubble-talus'> } & RubbleTalusPlacement & { y: number })[]

// Fitted to the mounted mesh sections below y = -2.55. Keep the two arch
// piers separate so the sand berm and contact shadow leave the canyon open.
export const NSA_SUBSTRATE_CONTACTS: readonly RockFootprint[] = [
  { x: -3.49, z: -1.48, radiusX: 2.16, radiusZ: .81 }, // cave buttress
  { x: -1.44, z: -2.21, radiusX: .87, radiusZ: .68 }, // left pier
  { x: .85, z: -2.26, radiusX: .69, radiusZ: .59 }, // right pier
  { x: 2.64, z: -1.77, radiusX: 1.57, radiusZ: 1.01 }, // bommie
  { x: 3.38, z: -.24, radiusX: 1.39, radiusZ: .81 }, // encrusting ledge
]

/** Assembles the saved modules at the calibration poses used in the full-tank review. */
export function createNsaReviewReef(source: THREE.Object3D) {
  return NSA_REVIEW_PLACEMENTS.map(({ id, x, y, z, yaw, scale }) => {
    const template = source.children.find(node => node.name === id)
    if (!template) throw new Error(`Missing reef kit module ${id}`)
    const reef = template.clone(true)
    reef.position.set(x, y, z)
    reef.rotation.y = yaw
    reef.scale.setScalar(scale)
    reef.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return
      const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(material => {
        const graded = material.clone()
        if (graded instanceof THREE.MeshStandardMaterial) {
          graded.color.multiply(new THREE.Color(1.52, 1.6, 1.2))
          graded.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
              float rockLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.08, 1.02, 0.91) * rockLuminance, 0.4);`)
          }
          graded.customProgramCacheKey = () => 'nsa-rock-color-review'
        }
        return graded
      })
      node.material = Array.isArray(node.material) ? materials : materials[0]
      node.castShadow = true
      node.receiveShadow = true
    })
    const secondarySpire = id === 'reef-nsa-pinnacle-spire' && x > 0
    const mounts = NSA_MODULE_MOUNTS[id].map(mount => ({
      ...mount,
      coralAssetId: secondarySpire && mount.archetype === 'branching-sps' ? 'reef-acropora-corymbose' : mount.coralAssetId,
      // The cap at the arch mouth needs clearance for the measured swim lane.
      scale: mount.scale * (mount.socketName === 'socket_plate_ledge_23' ? 1 : 1.8),
    }))
    return { reef, islandId: secondarySpire ? `${id}-right` : id, mounts }
  })
}

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

const NSA_RUBBLE_PLACEMENTS: readonly RubbleTalusPlacement[] = [
  { x: -4.83, z: -.76, yaw: .42, scale: 1.05 },
  { x: -4.45, z: -.67, yaw: -.35, scale: .84 },
  { x: -1.79, z: -.69, yaw: -.58, scale: 1.15 },
  { x: -1.32, z: -1.54, yaw: .25, scale: .92 },
  { x: 3.58, z: .62, yaw: -.48, scale: 1.2 },
  { x: 4.38, z: .44, yaw: .7, scale: .82 },
]

export function rubbleTalusPlacementsForViewport(narrow: boolean): readonly RubbleTalusPlacement[] {
  return narrow ? PHONE_RUBBLE_PLACEMENTS : LAPTOP_RUBBLE_PLACEMENTS
}

/**
 * Clones `reef-nsa-rubble-talus.glb` around the island and arch footprints to
 * soften hard rock-to-sand intersections (AQ-94 AC #5). Clones materials only so
 * shared geometry/maps stay owned by loadedAssets; marks meshes non-pickable.
 */
export function createRubbleTalusGroundingAprons(source: THREE.Object3D, narrow: boolean, modular = false): THREE.Group {
  const group = new THREE.Group()
  group.name = 'reef-nsa-rubble-talus-grounding'
  const placements = modular
    ? NSA_RUBBLE_PLACEMENTS.filter(({ x, scale }) => Math.abs(x) + .26 * scale < glassEnclosureLayout(narrow, 2.6).halfWidth)
    : rubbleTalusPlacementsForViewport(narrow)
  const footprints = modular ? NSA_SUBSTRATE_CONTACTS : undefined
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
    const sandY = evaluateAragoniteSandWorldY(placement.x, placement.z, narrow, footprints) - (modular ? .014 : .025)
    const tilt = evaluateAragoniteSandTilt(placement.x, placement.z, placement.yaw, narrow, footprints)
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
