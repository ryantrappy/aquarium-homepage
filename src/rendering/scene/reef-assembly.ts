import * as THREE from 'three'
import type { CoralSocket } from '../assets/contract'
import type { HabitatAnchorLocation, SolidObstacleVolume, Vec3 } from '../../simulation/habitat-navigation'
import { MIN_FISH_CLEARANCE, fishClearanceRadius } from './fish-scale'
import { applyCoralRawMaskMaterial, applyLiveRockMaterial, type CoralPrimitiveRole } from './coral-material'

export type CoralArchetype = CoralSocket['archetype']

export type ModularCoralMountEntry = {
  socketName: string
  coralAssetId: string
  archetype: CoralArchetype
  yawRad: number
  scale: number
}

export type AssembledCoralBinding = {
  socketName: string
  coralAssetId: string
  root: THREE.Group
  materialControllers: Array<ReturnType<typeof applyCoralRawMaskMaterial>>
}

export const LIVE_ROCK_ISLAND_URLS: Readonly<Record<'left' | 'right', string>> = Object.freeze({
  left: new URL('../assets/corals/live-rock-island-left.glb', import.meta.url).href,
  right: new URL('../assets/corals/live-rock-island-right.glb', import.meta.url).href,
})

export const MODULAR_CORAL_ASSET_URLS: Readonly<Record<string, string>> = Object.freeze({
  'coral-acropora-staghorn': new URL('../assets/corals/coral-acropora-staghorn.glb', import.meta.url).href,
  'coral-acropora-table': new URL('../assets/corals/coral-acropora-table.glb', import.meta.url).href,
  'coral-montipora-plate': new URL('../assets/corals/coral-montipora-plate.glb', import.meta.url).href,
  'coral-euphyllia-torch': new URL('../assets/corals/coral-euphyllia-torch.glb', import.meta.url).href,
  'coral-euphyllia-hammer': new URL('../assets/corals/coral-euphyllia-hammer.glb', import.meta.url).href,
  'coral-anemone-bta': new URL('../assets/corals/coral-anemone-bta.glb', import.meta.url).href,
  'coral-brain-diploria': new URL('../assets/corals/coral-brain-diploria.glb', import.meta.url).href,
  'coral-zoanthid-mat': new URL('../assets/corals/coral-zoanthid-mat.glb', import.meta.url).href,
})

const SOCKET_PREFIX_TO_ARCHETYPE: Record<string, CoralArchetype> = {
  sps_crest: 'branching-sps',
  plate_ledge: 'plating-sps',
  lps_mid: 'tentaculate-lps',
  brain_apron: 'mounded-lps',
  anemone_crevice: 'host-anemone',
  soft_mat: 'zoanthid-mat',
}

export const DEFAULT_LEFT_ISLAND_MOUNTS: readonly ModularCoralMountEntry[] = [
  { socketName: 'socket_sps_crest_01', coralAssetId: 'coral-acropora-staghorn', archetype: 'branching-sps', yawRad: 0.35, scale: 1.0 },
  { socketName: 'socket_sps_crest_02', coralAssetId: 'coral-acropora-table', archetype: 'branching-sps', yawRad: -0.25, scale: 1.0 },
  { socketName: 'socket_sps_crest_03', coralAssetId: 'coral-acropora-staghorn', archetype: 'branching-sps', yawRad: 1.4, scale: 0.94 },
  { socketName: 'socket_plate_ledge_01', coralAssetId: 'coral-montipora-plate', archetype: 'plating-sps', yawRad: 0.2, scale: 1.0 },
  { socketName: 'socket_plate_ledge_02', coralAssetId: 'coral-montipora-plate', archetype: 'plating-sps', yawRad: -0.45, scale: 0.95 },
  { socketName: 'socket_lps_mid_01', coralAssetId: 'coral-euphyllia-torch', archetype: 'tentaculate-lps', yawRad: 0.15, scale: 1.0 },
  { socketName: 'socket_lps_mid_02', coralAssetId: 'coral-euphyllia-hammer', archetype: 'tentaculate-lps', yawRad: -0.4, scale: 1.0 },
  { socketName: 'socket_lps_mid_03', coralAssetId: 'coral-euphyllia-torch', archetype: 'tentaculate-lps', yawRad: 0.85, scale: 0.92 },
  { socketName: 'socket_anemone_crevice_01', coralAssetId: 'coral-anemone-bta', archetype: 'host-anemone', yawRad: 0.1, scale: 1.0 },
  { socketName: 'socket_brain_apron_01', coralAssetId: 'coral-brain-diploria', archetype: 'mounded-lps', yawRad: 0.3, scale: 1.0 },
  { socketName: 'socket_brain_apron_02', coralAssetId: 'coral-brain-diploria', archetype: 'mounded-lps', yawRad: -0.55, scale: 0.96 },
  { socketName: 'socket_soft_mat_01', coralAssetId: 'coral-zoanthid-mat', archetype: 'zoanthid-mat', yawRad: 0.25, scale: 1.0 },
] as const

export const DEFAULT_RIGHT_ISLAND_MOUNTS: readonly ModularCoralMountEntry[] = [
  { socketName: 'socket_sps_crest_04', coralAssetId: 'coral-acropora-table', archetype: 'branching-sps', yawRad: 0.18, scale: 1.0 },
  { socketName: 'socket_sps_crest_05', coralAssetId: 'coral-acropora-staghorn', archetype: 'branching-sps', yawRad: -0.6, scale: 0.96 },
  { socketName: 'socket_sps_crest_06', coralAssetId: 'coral-acropora-table', archetype: 'branching-sps', yawRad: 1.1, scale: 0.94 },
  { socketName: 'socket_plate_ledge_03', coralAssetId: 'coral-montipora-plate', archetype: 'plating-sps', yawRad: 0.4, scale: 1.0 },
  { socketName: 'socket_plate_ledge_04', coralAssetId: 'coral-montipora-plate', archetype: 'plating-sps', yawRad: -0.3, scale: 0.95 },
  { socketName: 'socket_lps_mid_04', coralAssetId: 'coral-euphyllia-hammer', archetype: 'tentaculate-lps', yawRad: 0.22, scale: 1.0 },
  { socketName: 'socket_lps_mid_05', coralAssetId: 'coral-euphyllia-torch', archetype: 'tentaculate-lps', yawRad: -0.5, scale: 0.95 },
  { socketName: 'socket_lps_mid_06', coralAssetId: 'coral-euphyllia-hammer', archetype: 'tentaculate-lps', yawRad: 0.75, scale: 0.92 },
  { socketName: 'socket_brain_apron_03', coralAssetId: 'coral-brain-diploria', archetype: 'mounded-lps', yawRad: -0.2, scale: 1.0 },
  { socketName: 'socket_brain_apron_04', coralAssetId: 'coral-brain-diploria', archetype: 'mounded-lps', yawRad: 0.65, scale: 0.95 },
  { socketName: 'socket_soft_mat_02', coralAssetId: 'coral-zoanthid-mat', archetype: 'zoanthid-mat', yawRad: -0.15, scale: 1.0 },
] as const

/**
 * Validated conservative 3D rock collision bands from `docs/asset-evidence/aq59/left-collision-report.json`
 * (preserving the central pass-through cave arch at x in [-0.047, +0.048], y in [-0.012, 0.137]) plus
 * upper mounted-coral canopy envelope.
 */
const LEFT_ISLAND_LOCAL_OBSTACLES_M: ReadonlyArray<{ id: string; min: [number, number, number]; max: [number, number, number] }> = [
  { id: 'rock-part-01', min: [-0.495452, -0.012, -0.271264], max: [-0.09066, 0.03775, 0.265537] },
  { id: 'rock-part-02', min: [0.090822, -0.012, -0.271264], max: [0.515826, 0.03775, 0.265537] },
  { id: 'rock-part-03', min: [-0.495452, 0.03775, -0.271264], max: [-0.070696, 0.0875, 0.265537] },
  { id: 'rock-part-04', min: [0.070938, 0.03775, -0.271264], max: [0.515826, 0.0875, 0.265537] },
  { id: 'rock-part-05', min: [-0.495452, 0.0875, -0.271264], max: [-0.046669, 0.13725, 0.265537] },
  { id: 'rock-part-06', min: [0.047677, 0.0875, -0.271264], max: [0.515826, 0.13725, 0.265537] },
  { id: 'rock-part-07', min: [-0.495452, 0.13725, -0.271264], max: [0.515826, 0.386, 0.265537] },
  { id: 'coral-canopy-crest', min: [-0.26, 0.34, -0.25], max: [0.27, 0.59, -0.04] },
]

const RIGHT_ISLAND_LOCAL_OBSTACLES_M: ReadonlyArray<{ id: string; min: [number, number, number]; max: [number, number, number] }> = [
  { id: 'rock-part-01', min: [-0.467889, -0.012, -0.251368], max: [0.49856, 0.336, 0.260176] },
  { id: 'coral-canopy-crest', min: [-0.25, 0.29, -0.24], max: [0.26, 0.53, -0.04] },
]

const LEFT_ISLAND_LOCAL_GRAZING_LEDGES_M: ReadonlyArray<{ id: string; pos: [number, number, number] }> = [
  { id: 'ledge-left-apron', pos: [-0.28, 0.14, 0.12] },
  { id: 'ledge-right-apron', pos: [0.28, 0.13, 0.12] },
  { id: 'ledge-bridge-crest', pos: [0.0, 0.26, 0.04] },
]

const RIGHT_ISLAND_LOCAL_GRAZING_LEDGES_M: ReadonlyArray<{ id: string; pos: [number, number, number] }> = [
  { id: 'ledge-left-mid', pos: [-0.24, 0.20, 0.06] },
  { id: 'ledge-center-mid', pos: [0.01, 0.22, 0.05] },
  { id: 'ledge-right-mid', pos: [0.24, 0.19, 0.06] },
]

export function inferSocketArchetype(socketName: string): CoralArchetype | undefined {
  const match = /^socket_([a-z_]+)_\d{2}$/.exec(socketName)
  if (!match) return undefined
  return SOCKET_PREFIX_TO_ARCHETYPE[match[1]]
}

/**
 * Mounts modular coral templates onto named `socket_*` nodes of a live-rock island scene graph,
 * applies the 3D isotropic aragonite/coralline shader (`applyLiveRockMaterial`) to bare rock meshes,
 * and binds `applyCoralRawMaskMaterial` to every mounted coral primitive.
 */
export function assembleCoralsOnRockSockets(
  rockRoot: THREE.Object3D,
  coralTemplates: ReadonlyMap<string, THREE.Object3D>,
  mounts: readonly ModularCoralMountEntry[],
  options?: { paused?: boolean; reducedMotion?: boolean },
): {
  mountedCorals: AssembledCoralBinding[]
  update(timeSeconds: number, paused?: boolean, reducedMotion?: boolean): void
} {
  // Apply 3D object-space porous aragonite + coralline shader to the bare rock foundation meshes
  rockRoot.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    const reefPrim = node.userData?.reefPrimitive ?? node.parent?.userData?.reefPrimitive
    if (reefPrim?.role === 'rock' || node.name.toLowerCase().includes('live_rock')) {
      const rockMats = (Array.isArray(node.material) ? node.material : [node.material]).map(mat => {
        const stdMat = mat instanceof THREE.MeshStandardMaterial ? mat.clone() : new THREE.MeshStandardMaterial()
        return applyLiveRockMaterial(stdMat)
      })
      node.material = Array.isArray(node.material) ? rockMats : rockMats[0]
    }
  })

  const socketNodes = new Map<string, THREE.Object3D>()
  rockRoot.traverse(node => {
    if (/^socket_[a-z_]+_\d{2}$/.test(node.name)) {
      socketNodes.set(node.name, node)
    }
  })

  const mountedCorals: AssembledCoralBinding[] = []

  for (const mount of mounts) {
    const expectedArchetype = inferSocketArchetype(mount.socketName)
    if (!expectedArchetype || expectedArchetype !== mount.archetype) {
      throw new Error(`Socket "${mount.socketName}" archetype "${expectedArchetype ?? 'unknown'}" does not match mount archetype "${mount.archetype}".`)
    }

    const socketNode = socketNodes.get(mount.socketName)
    if (!socketNode) {
      throw new Error(`Socket node "${mount.socketName}" not found on rock foundation.`)
    }

    const template = coralTemplates.get(mount.coralAssetId)
    if (!template) {
      throw new Error(`Coral template "${mount.coralAssetId}" not found for socket "${mount.socketName}".`)
    }

    const cloneRoot = new THREE.Group()
    cloneRoot.name = `mounted_${mount.socketName}_${mount.coralAssetId}`
    const instance = template.clone(true)
    cloneRoot.add(instance)
    cloneRoot.position.copy(socketNode.position)
    cloneRoot.quaternion.copy(socketNode.quaternion)
    cloneRoot.rotateY(mount.yawRad)
    cloneRoot.scale.setScalar(mount.scale)

    const materialControllers: Array<ReturnType<typeof applyCoralRawMaskMaterial>> = []
    instance.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      const reefPrimitive = child.userData?.reefPrimitive ?? child.parent?.userData?.reefPrimitive
      const role: CoralPrimitiveRole =
        reefPrimitive?.role === 'coral-soft' || child.name.includes('crown') || child.name.includes('anemone') || child.name.includes('zoanthid') || child.name.includes('brain')
          ? 'coral-soft'
          : 'coral-rigid'

      const clonedMaterials = (Array.isArray(child.material) ? child.material : [child.material]).map(mat => {
        const stdMat = mat instanceof THREE.MeshStandardMaterial ? mat.clone() : new THREE.MeshStandardMaterial()
        const binding = applyCoralRawMaskMaterial(stdMat, {
          role,
          paused: options?.paused,
          reducedMotion: options?.reducedMotion,
        })
        child.customDepthMaterial = binding.depthMaterial
        materialControllers.push(binding)
        return binding.material
      })
      child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0]
    })

    rockRoot.add(cloneRoot)
    mountedCorals.push({
      socketName: mount.socketName,
      coralAssetId: mount.coralAssetId,
      root: cloneRoot,
      materialControllers,
    })
  }

  return {
    mountedCorals,
    update(timeSeconds: number, paused = false, reducedMotion = false) {
      for (const mounted of mountedCorals) {
        for (const controller of mounted.materialControllers) {
          controller.update(timeSeconds, paused, reducedMotion)
        }
      }
    },
  }
}

/**
 * Instantiates 3D obstacle volumes (preserving the left island's pass-through cave arch)
 * and species-compatible grazing anchors for an assembled modular live-rock + coral island
 * at uniform proportion-preserving scale (`uniformScale`).
 */
export function instantiateModularReefHabitat(
  islandKind: 'left' | 'right',
  uniformScale: number,
  position: Vec3,
  prefix: string,
  yaw = 0,
): {
  obstacles: SolidObstacleVolume[]
  anchors: HabitatAnchorLocation[]
} {
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)
  const transform = (pt: Vec3): Vec3 => ({
    x: (pt.x * cosY + pt.z * sinY) * uniformScale + position.x,
    y: pt.y * uniformScale + position.y,
    z: (-pt.x * sinY + pt.z * cosY) * uniformScale + position.z,
  })

  const rawObstacles = islandKind === 'left' ? LEFT_ISLAND_LOCAL_OBSTACLES_M : RIGHT_ISLAND_LOCAL_OBSTACLES_M
  const obstacles: SolidObstacleVolume[] = rawObstacles.map(part => {
    const corners: Vec3[] = []
    for (const x of [part.min[0], part.max[0]]) {
      for (const y of [part.min[1], part.max[1]]) {
        for (const z of [part.min[2], part.max[2]]) {
          corners.push(transform({ x, y, z }))
        }
      }
    }
    return {
      id: `${prefix}-${part.id}`,
      bounds: {
        min: {
          x: Math.min(...corners.map(c => c.x)),
          y: Math.min(...corners.map(c => c.y)),
          z: Math.min(...corners.map(c => c.z)),
        },
        max: {
          x: Math.max(...corners.map(c => c.x)),
          y: Math.max(...corners.map(c => c.y)),
          z: Math.max(...corners.map(c => c.z)),
        },
      },
    }
  })

  const compatibleSpecies = ['yellow-tang'] as const
  const clearanceOffset = Math.max(MIN_FISH_CLEARANCE, fishClearanceRadius('yellow-tang')) + 0.03
  const rawLedges = islandKind === 'left' ? LEFT_ISLAND_LOCAL_GRAZING_LEDGES_M : RIGHT_ISLAND_LOCAL_GRAZING_LEDGES_M
  const anchors: HabitatAnchorLocation[] = rawLedges.map(ledge => {
    const worldPt = transform({ x: ledge.pos[0], y: ledge.pos[1], z: ledge.pos[2] })
    return {
      id: `${prefix}-${ledge.id}`,
      anchor: 'grazingSurface',
      compatibleSpecies: [...compatibleSpecies],
      position: {
        x: worldPt.x,
        y: worldPt.y + clearanceOffset,
        z: worldPt.z,
      },
    }
  })

  return { obstacles, anchors }
}
