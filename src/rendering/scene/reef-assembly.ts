import * as THREE from 'three'
import type { CoralSocket } from '../assets/contract'
import type { HabitatAnchorLocation, SolidObstacleVolume, Vec3 } from '../../simulation/habitat-navigation'
import { MIN_FISH_CLEARANCE, fishClearanceRadius } from './fish-scale'
import {
  applyCoralRawMaskMaterial,
  applyLiveRockMaterial,
  type CoralPaletteOverride,
  type CoralPrimitiveRole,
} from './coral-material'

export type CoralArchetype = CoralSocket['archetype']

export type ModularCoralMountEntry = {
  socketName: string
  coralAssetId: string
  archetype: CoralArchetype
  yawRad: number
  scale: number
  tiltXRad?: number
  tiltZRad?: number
  offsetM?: readonly [number, number, number]
  paletteOverride?: CoralPaletteOverride
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

type CoralGeometryBoundState = {
  baseSphere: THREE.Sphere
  maxMargin: number
  maxSoftAmplitudeM: number
  rigidMarginRecorded: boolean
  invalid: boolean
}

type CoralMaterialBoundBinding = {
  geometry: THREE.BufferGeometry
  role: CoralPrimitiveRole
  binding: ReturnType<typeof applyCoralRawMaskMaterial>
}

// Coral templates are cached and cloned with shared BufferGeometry. Keep the
// original sphere once per geometry and grow it monotonically as more bindings
// are attached; repeated socket rebuilds must not accumulate padding.
const coralGeometryBoundStates = new WeakMap<THREE.BufferGeometry, CoralGeometryBoundState>()
const CORAL_SKIRT_SMOOTHSTEP_MIN_M = -0.006
const CORAL_SKIRT_SMOOTHSTEP_MAX_M = 0.018
const CORAL_SKIRT_XZ_SCALE_MIN = 0.55
const CORAL_SKIRT_Y_DROP_M = 0.008
const CORAL_SWAY_X_GAIN = 1.38
const CORAL_SWAY_Z_GAIN = 1.10
const CORAL_SWAY_Y_GAIN = 0.18
const CORAL_BOUNDS_NUMERIC_PAD_M = 1e-5

function coralSmoothstep(edge0: number, edge1: number, value: number): number {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function measureCoralShaderMargin(
  geometry: THREE.BufferGeometry,
  role: CoralPrimitiveRole,
  amplitude: number,
): number | null {
  const position = geometry.getAttribute('position')
  const color = geometry.getAttribute('color')
  if (!position || position.count === 0 || !color || color.itemSize !== 4 || color.count !== position.count) return null

  let margin = 0
  let numericScale = 1
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const r = color.getX(i), g = color.getY(i), b = color.getZ(i), a = color.getW(i)
    if (![x, y, z, r, g, b, a].every(Number.isFinite)) return null

    const tuck = 1 - coralSmoothstep(CORAL_SKIRT_SMOOTHSTEP_MIN_M, CORAL_SKIRT_SMOOTHSTEP_MAX_M, y)
    const flex = role === 'coral-soft' ? Math.pow(THREE.MathUtils.clamp(r, 0, 1), 1.8) : 0
    const maxX = (1 - CORAL_SKIRT_XZ_SCALE_MIN) * tuck * Math.abs(x)
      + CORAL_SWAY_X_GAIN * amplitude * flex
    const maxZ = (1 - CORAL_SKIRT_XZ_SCALE_MIN) * tuck * Math.abs(z)
      + CORAL_SWAY_Z_GAIN * amplitude * flex
    const maxY = CORAL_SKIRT_Y_DROP_M * tuck
      + CORAL_SWAY_Y_GAIN * (CORAL_SWAY_X_GAIN + CORAL_SWAY_Z_GAIN) * amplitude * flex * flex
    const maxAbsX = Math.abs(x) + maxX
    const maxAbsY = Math.abs(y) + maxY
    const maxAbsZ = Math.abs(z) + maxZ
    if (![maxX, maxY, maxZ, maxAbsX, maxAbsY, maxAbsZ].every(value => Number.isFinite(Math.fround(value)))) {
      return null
    }
    margin = Math.max(margin, Math.hypot(maxX, maxY, maxZ))
    numericScale = Math.max(numericScale, maxAbsX, maxAbsY, maxAbsZ)
  }
  return margin + CORAL_BOUNDS_NUMERIC_PAD_M * numericScale
}

/**
 * Extends a shared coral geometry sphere for every vertex position the shader
 * can reach within the assembly contract: immutable POSITION/COLOR_0 data, a
 * fixed role uniform, and motion scale owned by assemble.update(). The envelope
 * covers the basal skirt tuck for both roles and the absolute sine/cosine flow
 * limits for soft tissue, using the binding's actual amplitude uniform. Three
 * applies this local sphere through each mesh transform for camera and shadow
 * culling. Arbitrary direct geometry or role/motion-uniform mutation is unsupported.
 */
function ensureCoralShaderBounds(
  geometry: THREE.BufferGeometry,
  role: CoralPrimitiveRole,
  flowAmplitudeM: number,
): void {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return

  if (geometry.boundingSphere === null) geometry.computeBoundingSphere()
  let state = coralGeometryBoundStates.get(geometry)
  if (!state) {
    const invalid = !Number.isFinite(geometry.boundingSphere!.radius)
      || !Number.isFinite(geometry.boundingSphere!.center.x)
      || !Number.isFinite(geometry.boundingSphere!.center.y)
      || !Number.isFinite(geometry.boundingSphere!.center.z)
    state = {
      baseSphere: geometry.boundingSphere!.clone(),
      maxMargin: 0,
      maxSoftAmplitudeM: -1,
      rigidMarginRecorded: false,
      invalid,
    }
    coralGeometryBoundStates.set(geometry, state)
  }

  const flowMagnitude = Math.abs(flowAmplitudeM)
  const flowOverflowsShaderFloat = !Number.isFinite(flowAmplitudeM)
    || !Number.isFinite(Math.fround(flowMagnitude))
    || !Number.isFinite(Math.fround(flowMagnitude * CORAL_SWAY_X_GAIN))
    || !Number.isFinite(Math.fround(flowMagnitude * CORAL_SWAY_Z_GAIN))
    || !Number.isFinite(Math.fround(flowMagnitude * (CORAL_SWAY_X_GAIN + CORAL_SWAY_Z_GAIN)))
  if (state.invalid || flowOverflowsShaderFloat) {
    state.invalid = true
    geometry.boundingSphere!.copy(state.baseSphere)
    geometry.boundingSphere!.radius = Infinity
    return
  }

  const soft = role === 'coral-soft'
  const amplitude = soft ? Math.abs(flowAmplitudeM) : 0
  const alreadyCovered = soft
    ? amplitude <= state.maxSoftAmplitudeM
    : state.rigidMarginRecorded
  if (!alreadyCovered) {
    const margin = measureCoralShaderMargin(geometry, role, amplitude)
    if (margin === null) {
      state.invalid = true
      geometry.boundingSphere!.copy(state.baseSphere)
      geometry.boundingSphere!.radius = Infinity
      return
    }
    state.maxMargin = Math.max(state.maxMargin, margin)
    if (soft) state.maxSoftAmplitudeM = amplitude
    else state.rigidMarginRecorded = true
  }

  geometry.boundingSphere!.copy(state.baseSphere)
  geometry.boundingSphere!.radius += state.maxMargin
}

// Cohesive, velvety actinic-daylight reef palettes matching 12.23.52 PM & 12.23.09 PM:
// High regradeStrength (0.90..0.95) and matte-velvety roughness (0.76..0.86) eliminate glossy plastic stripes.
const PALETTE_MAUVE_GORGONIAN_PLUME: CoralPaletteOverride = {
  baseColor: '#c48ca8',
  tipColor: '#f2d8e6',
  creviceColor: '#5c3b52',
  regradeStrength: 0.92,
  roughness: 0.82,
  subsurfaceStrength: 0.38,
  fluorescenceStrength: 0.14,
}
const PALETTE_CREAM_BLUSH_LEATHER: CoralPaletteOverride = {
  baseColor: '#cbb0be',
  tipColor: '#f7ebf0',
  creviceColor: '#5e4858',
  regradeStrength: 0.93,
  roughness: 0.84,
  subsurfaceStrength: 0.42,
  fluorescenceStrength: 0.14,
}
const PALETTE_DUSTY_LAVENDER_SPS: CoralPaletteOverride = {
  baseColor: '#9876b8',
  tipColor: '#e4d4f5',
  creviceColor: '#432d5e',
  regradeStrength: 0.92,
  roughness: 0.80,
  subsurfaceStrength: 0.34,
  fluorescenceStrength: 0.15,
}
const PALETTE_POWDER_BLUE_TOADSTOOL: CoralPaletteOverride = {
  baseColor: '#5a98c8',
  tipColor: '#c2e8fc',
  creviceColor: '#284568',
  regradeStrength: 0.92,
  roughness: 0.80,
  subsurfaceStrength: 0.40,
  fluorescenceStrength: 0.18,
}
const PALETTE_ROYAL_PLUM_MONTIPORA: CoralPaletteOverride = {
  baseColor: '#784888',
  tipColor: '#cfa8dc',
  creviceColor: '#361c42',
  regradeStrength: 0.92,
  roughness: 0.82,
}
const PALETTE_SEAFOAM_CYAN_CORAL: CoralPaletteOverride = {
  baseColor: '#3d98a8',
  tipColor: '#a2eef5',
  creviceColor: '#1b4552',
  regradeStrength: 0.92,
  roughness: 0.78,
  subsurfaceStrength: 0.38,
  fluorescenceStrength: 0.18,
}
const PALETTE_ROSE_MAUVE_ANEMONE: CoralPaletteOverride = {
  baseColor: '#b86888',
  tipColor: '#f0bcd2',
  creviceColor: '#4f2438',
  regradeStrength: 0.92,
  roughness: 0.74,
  subsurfaceStrength: 0.44,
  fluorescenceStrength: 0.18,
}
const PALETTE_TERRACOTTA_SUNBURST_BTA: CoralPaletteOverride = {
  baseColor: '#d46858',
  tipColor: '#f7b8a2',
  creviceColor: '#592620',
  regradeStrength: 0.90,
  roughness: 0.72,
  subsurfaceStrength: 0.44,
  fluorescenceStrength: 0.20,
}
const PALETTE_GSP_GREEN_CARPET: CoralPaletteOverride = {
  baseColor: '#48b838',
  tipColor: '#92f56c',
  creviceColor: '#1e4f18',
  regradeStrength: 0.95,
  roughness: 0.86,
  subsurfaceStrength: 0.42,
  fluorescenceStrength: 0.24,
}
const PALETTE_DEEP_VIOLET_POLYP_MAT: CoralPaletteOverride = {
  baseColor: '#5c4678',
  tipColor: '#a892c8',
  creviceColor: '#281d38',
  regradeStrength: 0.94,
  roughness: 0.84,
}

/**
 * Large, lush, mature reef coral mounts (`scale: 1.35..1.85`) with cohesive velvety
 * mauve-pink, cream-blush, dusty-lavender, powder-blue, and lower green star-polyp (GSP)
 * coloration matching the user's reference reef tanks (12.23.52 PM & 12.23.09 PM).
 */
export const DEFAULT_LEFT_ISLAND_MOUNTS: readonly ModularCoralMountEntry[] = [
  // Giant sweeping upper-crest branching & gorgonian plumes (Mauve-Pink, Dusty Lavender, Cream-Blush)
  {
    socketName: 'socket_sps_crest_01',
    coralAssetId: 'coral-acropora-staghorn',
    archetype: 'branching-sps',
    yawRad: 0.35,
    scale: 1.75,
    tiltXRad: 0.16,
    tiltZRad: 0.24,
    offsetM: [-0.03, 0.01, 0.0],
    paletteOverride: PALETTE_DUSTY_LAVENDER_SPS,
  },
  {
    socketName: 'socket_sps_crest_02',
    coralAssetId: 'coral-acropora-table',
    archetype: 'branching-sps',
    yawRad: -0.25,
    scale: 1.70,
    tiltXRad: 0.20,
    tiltZRad: -0.10,
    offsetM: [0.01, 0.02, 0.02],
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  {
    socketName: 'socket_sps_crest_03',
    coralAssetId: 'coral-acropora-staghorn',
    archetype: 'branching-sps',
    yawRad: 1.4,
    scale: 1.85,
    tiltXRad: 0.18,
    tiltZRad: -0.26,
    offsetM: [0.04, 0.02, 0.01],
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  // Broad scrolling Montipora whorl ledges jutting out from the mid-reef shelves
  {
    socketName: 'socket_plate_ledge_01',
    coralAssetId: 'coral-montipora-plate',
    archetype: 'plating-sps',
    yawRad: 0.2,
    scale: 1.50,
    tiltXRad: 0.14,
    tiltZRad: 0.20,
    offsetM: [-0.03, 0.01, 0.02],
    paletteOverride: PALETTE_ROYAL_PLUM_MONTIPORA,
  },
  {
    socketName: 'socket_plate_ledge_02',
    coralAssetId: 'coral-montipora-plate',
    archetype: 'plating-sps',
    yawRad: -0.45,
    scale: 1.48,
    tiltXRad: 0.14,
    tiltZRad: -0.18,
    offsetM: [0.03, 0.01, 0.02],
    paletteOverride: PALETTE_CREAM_BLUSH_LEATHER,
  },
  // Large billowing mid-slope Cream-Blush Leather, Mauve-Rose, and Seafoam colonies
  {
    socketName: 'socket_lps_mid_01',
    coralAssetId: 'coral-euphyllia-hammer',
    archetype: 'tentaculate-lps',
    yawRad: 0.15,
    scale: 1.55,
    tiltXRad: 0.24,
    tiltZRad: 0.18,
    offsetM: [-0.03, 0.01, 0.03],
    paletteOverride: PALETTE_CREAM_BLUSH_LEATHER,
  },
  {
    socketName: 'socket_lps_mid_02',
    coralAssetId: 'coral-euphyllia-hammer',
    archetype: 'tentaculate-lps',
    yawRad: -0.4,
    scale: 1.52,
    tiltXRad: 0.22,
    tiltZRad: -0.16,
    offsetM: [0.03, 0.01, 0.03],
    paletteOverride: PALETTE_POWDER_BLUE_TOADSTOOL,
  },
  {
    socketName: 'socket_lps_mid_03',
    coralAssetId: 'coral-euphyllia-torch',
    archetype: 'tentaculate-lps',
    yawRad: 0.85,
    scale: 1.45,
    tiltXRad: 0.20,
    tiltZRad: 0.08,
    offsetM: [0.0, 0.02, 0.03],
    paletteOverride: PALETTE_CREAM_BLUSH_LEATHER,
  },
  {
    socketName: 'socket_anemone_crevice_01',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'host-anemone',
    yawRad: 0.1,
    scale: 1.38,
    tiltXRad: 0.24,
    tiltZRad: -0.10,
    offsetM: [-0.06, -0.02, 0.04],
    paletteOverride: PALETTE_ROSE_MAUVE_ANEMONE,
  },
  // Lush fuzzy Green Star-Polyp (GSP) carpets along the lower rock apron (matching bottom of 12.23.52 PM!)
  {
    socketName: 'socket_brain_apron_01',
    coralAssetId: 'coral-brain-diploria',
    archetype: 'mounded-lps',
    yawRad: 0.3,
    scale: 1.45,
    tiltXRad: 0.12,
    tiltZRad: 0.10,
    offsetM: [-0.04, 0.0, 0.03],
    paletteOverride: PALETTE_GSP_GREEN_CARPET,
  },
  {
    socketName: 'socket_brain_apron_02',
    coralAssetId: 'coral-brain-diploria',
    archetype: 'mounded-lps',
    yawRad: -0.55,
    scale: 1.50,
    tiltXRad: 0.14,
    tiltZRad: -0.10,
    offsetM: [0.03, 0.0, 0.04],
    paletteOverride: PALETTE_GSP_GREEN_CARPET,
  },
  {
    socketName: 'socket_soft_mat_01',
    coralAssetId: 'coral-zoanthid-mat',
    archetype: 'zoanthid-mat',
    yawRad: 0.25,
    scale: 1.42,
    tiltXRad: 0.16,
    tiltZRad: 0.08,
    offsetM: [-0.02, 0.01, 0.04],
    paletteOverride: PALETTE_ROSE_MAUVE_ANEMONE,
  },
] as const

export const DEFAULT_RIGHT_ISLAND_MOUNTS: readonly ModularCoralMountEntry[] = [
  // Giant upper-right branching Mauve-Pink, Powder-Blue, and Dusty-Lavender colonies
  {
    socketName: 'socket_sps_crest_04',
    coralAssetId: 'coral-acropora-staghorn',
    archetype: 'branching-sps',
    yawRad: 0.18,
    scale: 1.82,
    tiltXRad: 0.16,
    tiltZRad: 0.10,
    offsetM: [0.0, 0.02, 0.01],
    paletteOverride: PALETTE_POWDER_BLUE_TOADSTOOL,
  },
  {
    socketName: 'socket_sps_crest_05',
    coralAssetId: 'coral-acropora-staghorn',
    archetype: 'branching-sps',
    yawRad: -0.6,
    scale: 1.75,
    tiltXRad: 0.16,
    tiltZRad: -0.22,
    offsetM: [0.04, 0.02, 0.01],
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  {
    socketName: 'socket_sps_crest_06',
    coralAssetId: 'coral-acropora-table',
    archetype: 'branching-sps',
    yawRad: 1.1,
    scale: 1.62,
    tiltXRad: 0.20,
    tiltZRad: 0.18,
    offsetM: [-0.04, 0.01, 0.02],
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  // Scrolling Montipora & leather folds on the left and right flanks
  {
    socketName: 'socket_plate_ledge_03',
    coralAssetId: 'coral-montipora-plate',
    archetype: 'plating-sps',
    yawRad: 0.4,
    scale: 1.52,
    tiltXRad: 0.16,
    tiltZRad: 0.20,
    offsetM: [-0.03, 0.01, 0.02],
    paletteOverride: PALETTE_POWDER_BLUE_TOADSTOOL,
  },
  {
    socketName: 'socket_plate_ledge_04',
    coralAssetId: 'coral-montipora-plate',
    archetype: 'plating-sps',
    yawRad: -0.3,
    scale: 1.48,
    tiltXRad: 0.15,
    tiltZRad: -0.20,
    offsetM: [0.04, 0.01, 0.02],
    paletteOverride: PALETTE_ROYAL_PLUM_MONTIPORA,
  },
  // Large billowing Powder-Blue Toadstool, Cream-Blush Leather, and Terracotta-Rose BTA on mid-right
  {
    socketName: 'socket_lps_mid_04',
    coralAssetId: 'coral-euphyllia-hammer',
    archetype: 'tentaculate-lps',
    yawRad: 0.22,
    scale: 1.58,
    tiltXRad: 0.24,
    tiltZRad: 0.20,
    offsetM: [-0.04, 0.01, 0.04],
    paletteOverride: PALETTE_SEAFOAM_CYAN_CORAL,
  },
  {
    socketName: 'socket_lps_mid_05',
    coralAssetId: 'coral-euphyllia-torch',
    archetype: 'tentaculate-lps',
    yawRad: -0.5,
    scale: 1.48,
    tiltXRad: 0.24,
    tiltZRad: -0.18,
    offsetM: [0.04, 0.01, 0.03],
    paletteOverride: PALETTE_TERRACOTTA_SUNBURST_BTA,
  },
  {
    socketName: 'socket_lps_mid_06',
    coralAssetId: 'coral-euphyllia-hammer',
    archetype: 'tentaculate-lps',
    yawRad: 0.75,
    scale: 1.56,
    tiltXRad: 0.22,
    tiltZRad: 0.10,
    offsetM: [0.0, 0.02, 0.04],
    paletteOverride: PALETTE_POWDER_BLUE_TOADSTOOL,
  },
  // Lower right apron: lush Green Star-Polyp (GSP) carpet & deep violet-blue polyp mounds (matching 12.23.52 PM)
  {
    socketName: 'socket_brain_apron_03',
    coralAssetId: 'coral-brain-diploria',
    archetype: 'mounded-lps',
    yawRad: -0.2,
    scale: 1.46,
    tiltXRad: 0.14,
    tiltZRad: 0.12,
    offsetM: [-0.04, 0.0, 0.04],
    paletteOverride: PALETTE_GSP_GREEN_CARPET,
  },
  {
    socketName: 'socket_brain_apron_04',
    coralAssetId: 'coral-brain-diploria',
    archetype: 'mounded-lps',
    yawRad: 0.65,
    scale: 1.44,
    tiltXRad: 0.14,
    tiltZRad: -0.12,
    offsetM: [0.04, 0.0, 0.04],
    paletteOverride: PALETTE_POWDER_BLUE_TOADSTOOL,
  },
  {
    socketName: 'socket_soft_mat_02',
    coralAssetId: 'coral-zoanthid-mat',
    archetype: 'zoanthid-mat',
    yawRad: -0.15,
    scale: 1.42,
    tiltXRad: 0.16,
    tiltZRad: 0.08,
    offsetM: [0.0, 0.01, 0.04],
    paletteOverride: PALETTE_DEEP_VIOLET_POLYP_MAT,
  },
] as const

const EXTRA_COMPANION_CLUSTERS_LEFT: ReadonlyArray<{
  parentSocket: string
  coralAssetId: string
  localOffsetM: [number, number, number]
  yawRad: number
  tiltXRad: number
  tiltZRad: number
  scale: number
  paletteOverride: CoralPaletteOverride
}> = [
  {
    parentSocket: 'socket_sps_crest_01',
    coralAssetId: 'coral-acropora-staghorn',
    localOffsetM: [-0.09, -0.02, -0.02],
    yawRad: -0.8,
    tiltXRad: 0.12,
    tiltZRad: 0.32,
    scale: 0.90,
    paletteOverride: PALETTE_CREAM_BLUSH_LEATHER,
  },
  {
    parentSocket: 'socket_plate_ledge_01',
    coralAssetId: 'coral-euphyllia-hammer',
    localOffsetM: [-0.04, -0.02, 0.06],
    yawRad: 0.5,
    tiltXRad: 0.26,
    tiltZRad: 0.22,
    scale: 0.94,
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  {
    parentSocket: 'socket_soft_mat_01',
    coralAssetId: 'coral-euphyllia-torch',
    localOffsetM: [0.04, 0.01, 0.03],
    yawRad: 0.4,
    tiltXRad: 0.22,
    tiltZRad: 0.14,
    scale: 0.95,
    paletteOverride: PALETTE_ROSE_MAUVE_ANEMONE,
  },
  {
    parentSocket: 'socket_plate_ledge_02',
    coralAssetId: 'coral-acropora-table',
    localOffsetM: [0.05, 0.02, 0.04],
    yawRad: -0.7,
    tiltXRad: 0.22,
    tiltZRad: -0.28,
    scale: 0.88,
    paletteOverride: PALETTE_DUSTY_LAVENDER_SPS,
  },
]

const EXTRA_COMPANION_CLUSTERS_RIGHT: ReadonlyArray<{
  parentSocket: string
  coralAssetId: string
  localOffsetM: [number, number, number]
  yawRad: number
  tiltXRad: number
  tiltZRad: number
  scale: number
  paletteOverride: CoralPaletteOverride
}> = [
  {
    parentSocket: 'socket_sps_crest_04',
    coralAssetId: 'coral-acropora-table',
    localOffsetM: [-0.07, -0.01, 0.02],
    yawRad: 0.9,
    tiltXRad: 0.18,
    tiltZRad: 0.16,
    scale: 0.92,
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  {
    parentSocket: 'socket_plate_ledge_04',
    coralAssetId: 'coral-acropora-staghorn',
    localOffsetM: [0.05, -0.02, 0.05],
    yawRad: -0.4,
    tiltXRad: 0.22,
    tiltZRad: -0.28,
    scale: 0.92,
    paletteOverride: PALETTE_MAUVE_GORGONIAN_PLUME,
  },
  {
    parentSocket: 'socket_lps_mid_05',
    coralAssetId: 'coral-acropora-table',
    localOffsetM: [0.02, -0.02, 0.06],
    yawRad: 0.3,
    tiltXRad: 0.26,
    tiltZRad: -0.15,
    scale: 0.90,
    paletteOverride: PALETTE_CREAM_BLUSH_LEATHER,
  },
  {
    parentSocket: 'socket_brain_apron_03',
    coralAssetId: 'coral-euphyllia-hammer',
    localOffsetM: [-0.05, 0.02, 0.04],
    yawRad: 0.2,
    tiltXRad: 0.22,
    tiltZRad: 0.16,
    scale: 0.94,
    paletteOverride: PALETTE_SEAFOAM_CYAN_CORAL,
  },
]

const LEFT_ISLAND_LOCAL_OBSTACLES_M: ReadonlyArray<{ id: string; min: [number, number, number]; max: [number, number, number] }> = [
  { id: 'rock-part-01', min: [-0.495452, -0.012, -0.271264], max: [-0.09066, 0.03775, 0.265537] },
  { id: 'rock-part-02', min: [0.090822, -0.012, -0.271264], max: [0.515826, 0.03775, 0.265537] },
  { id: 'rock-part-03', min: [-0.495452, 0.03775, -0.271264], max: [-0.070696, 0.0875, 0.265537] },
  { id: 'rock-part-04', min: [0.070938, 0.03775, -0.271264], max: [0.515826, 0.0875, 0.265537] },
  { id: 'rock-part-05', min: [-0.495452, 0.0875, -0.271264], max: [-0.046669, 0.13725, 0.265537] },
  { id: 'rock-part-06', min: [0.047677, 0.0875, -0.271264], max: [0.515826, 0.13725, 0.265537] },
  { id: 'rock-part-07', min: [-0.495452, 0.13725, -0.271264], max: [0.515826, 0.386, 0.265537] },
  { id: 'coral-canopy-crest', min: [-0.32, 0.34, -0.28], max: [0.32, 0.68, -0.02] },
]

const RIGHT_ISLAND_LOCAL_OBSTACLES_M: ReadonlyArray<{ id: string; min: [number, number, number]; max: [number, number, number] }> = [
  { id: 'rock-part-01', min: [-0.467889, -0.012, -0.251368], max: [0.49856, 0.336, 0.260176] },
  { id: 'coral-canopy-crest', min: [-0.30, 0.29, -0.26], max: [0.32, 0.62, -0.02] },
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
 * Gently sculpts the rock foundation mesh to tuck the bottom perimeter skirt inward
 * and add organic reef-rock contour relief WITHOUT burying any socket nodes.
 */
function sculptOrganicRockContour(rockRoot: THREE.Object3D) {
  rockRoot.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    const reefPrim = node.userData?.reefPrimitive ?? node.parent?.userData?.reefPrimitive
    if (reefPrim?.role !== 'rock' && !node.name.toLowerCase().includes('live_rock')) return

    node.castShadow = true
    node.receiveShadow = true
    const geom = node.geometry.clone()
    const pos = geom.getAttribute('position')
    if (pos && pos.count > 0) {
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i)
        const y = pos.getY(i)
        let z = pos.getZ(i)

        // Tuck lower outer skirt inward so there is no vertical ribbon cliff around the bottom
        const rHoriz = Math.hypot(x / 0.48, z / 0.26)
        if (rHoriz > 0.76 && y < 0.09) {
          const tuck = Math.min(1, (rHoriz - 0.76) / 0.26) * (1 - Math.max(0, y) / 0.09)
          x *= 1 - 0.18 * tuck
          z *= 1 - 0.18 * tuck
        }

        // Subtle organic horizontal rock-strata undulation on vertical flanks (leaving top socket pads untouched)
        if (y > 0.02 && y < 0.34) {
          const waveX = Math.sin(y * 28.0 + z * 14.0) * 0.012
          const waveZ = Math.cos(y * 24.0 - x * 15.0) * 0.010
          x += waveX
          z += waveZ
        }

        pos.setXYZ(i, x, y, z)
      }
      pos.needsUpdate = true
      geom.computeVertexNormals()
      node.geometry = geom
    }
  })
}

function bindCoralInstanceMaterials(
  instance: THREE.Object3D,
  paletteOverride: CoralPaletteOverride | undefined,
  options: { paused?: boolean; reducedMotion?: boolean } | undefined,
  materialControllers: Array<ReturnType<typeof applyCoralRawMaskMaterial>>,
  geometryBindings: CoralMaterialBoundBinding[],
) {
  instance.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow = true
    child.receiveShadow = true
    const reefPrimitive = child.userData?.reefPrimitive ?? child.parent?.userData?.reefPrimitive
    const isSkeleton = child.name.toLowerCase().includes('skeleton')
    if (isSkeleton) {
      // Sink rigid Euphyllia stalks into the rock pocket so the lush tentacle crown sits naturally on the reef
      child.position.y -= 0.032
      child.scale.set(0.62, 0.48, 0.62)
    }
    const role: CoralPrimitiveRole =
      reefPrimitive?.role === 'coral-soft' || child.name.includes('crown') || child.name.includes('anemone') || child.name.includes('zoanthid') || child.name.includes('brain')
        ? 'coral-soft'
        : 'coral-rigid'

    const clonedMaterials = (Array.isArray(child.material) ? child.material : [child.material]).map(mat => {
      const stdMat = mat instanceof THREE.MeshStandardMaterial ? mat.clone() : new THREE.MeshStandardMaterial()
      const binding = applyCoralRawMaskMaterial(stdMat, {
        role,
        paletteOverride,
        paused: options?.paused,
        reducedMotion: options?.reducedMotion,
      })
      ensureCoralShaderBounds(child.geometry, role, binding.uniforms.uFlowAmplitudeM.value)
      geometryBindings.push({ geometry: child.geometry, role, binding })
      child.customDepthMaterial = binding.depthMaterial
      materialControllers.push(binding)
      return binding.material
    })
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0]
  })
}

/**
 * Mounts modular coral templates onto named `socket_*` nodes of a live-rock island scene graph,
 * applies the 3D coralline/aragonite shader (`applyLiveRockMaterial`) to the rock foundation,
 * and binds `applyCoralRawMaskMaterial` with large, lush mature-reef colony proportions.
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
  let hasRockGeometry = false
  rockRoot.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    const reefPrim = node.userData?.reefPrimitive ?? node.parent?.userData?.reefPrimitive
    if (reefPrim?.role === 'rock' || node.name.toLowerCase().includes('live_rock')) {
      if ((node.geometry.getAttribute('position')?.count ?? 0) > 100) {
        hasRockGeometry = true
      }
      const rockMats = (Array.isArray(node.material) ? node.material : [node.material]).map(mat => {
        const stdMat = mat instanceof THREE.MeshStandardMaterial ? mat.clone() : new THREE.MeshStandardMaterial()
        return applyLiveRockMaterial(stdMat)
      })
      node.material = Array.isArray(node.material) ? rockMats : rockMats[0]
    }
  })

  if (hasRockGeometry) {
    sculptOrganicRockContour(rockRoot)
  }

  const socketNodes = new Map<string, THREE.Object3D>()
  rockRoot.traverse(node => {
    if (/^socket_[a-z_]+_\d{2}$/.test(node.name)) {
      socketNodes.set(node.name, node)
    }
  })

  const mountedCorals: AssembledCoralBinding[] = []
  const geometryBindings: CoralMaterialBoundBinding[] = []
  const isLeftIsland = socketNodes.has('socket_sps_crest_01')
  const companionSpecs = hasRockGeometry
    ? isLeftIsland
      ? EXTRA_COMPANION_CLUSTERS_LEFT
      : EXTRA_COMPANION_CLUSTERS_RIGHT
    : []

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
    if (mount.offsetM) {
      cloneRoot.position.x += mount.offsetM[0]
      cloneRoot.position.y += mount.offsetM[1]
      cloneRoot.position.z += mount.offsetM[2]
    }
    cloneRoot.quaternion.copy(socketNode.quaternion)
    cloneRoot.rotateY(mount.yawRad)
    if (mount.tiltXRad) cloneRoot.rotateX(mount.tiltXRad)
    if (mount.tiltZRad) cloneRoot.rotateZ(mount.tiltZRad)
    cloneRoot.scale.setScalar(mount.scale)

    const materialControllers: Array<ReturnType<typeof applyCoralRawMaskMaterial>> = []
    bindCoralInstanceMaterials(instance, mount.paletteOverride, options, materialControllers, geometryBindings)

    // Attach lush companion reef-garden sub-colonies when mounting onto the live aquarium rock
    for (const comp of companionSpecs) {
      if (comp.parentSocket !== mount.socketName) continue
      const compTemplate = coralTemplates.get(comp.coralAssetId)
      if (!compTemplate) continue
      const compGroup = new THREE.Group()
      const compInstance = compTemplate.clone(true)
      compGroup.add(compInstance)
      compGroup.position.set(comp.localOffsetM[0], comp.localOffsetM[1], comp.localOffsetM[2])
      compGroup.rotateY(comp.yawRad)
      compGroup.rotateX(comp.tiltXRad)
      compGroup.rotateZ(comp.tiltZRad)
      compGroup.scale.setScalar(comp.scale)
      bindCoralInstanceMaterials(compInstance, comp.paletteOverride, options, materialControllers, geometryBindings)
      cloneRoot.add(compGroup)
    }

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
      // Controllers expose their uniforms. If a caller raises the amplitude,
      // extend the shared local sphere before this frame's camera/shadow cull.
      for (const item of geometryBindings) {
        ensureCoralShaderBounds(item.geometry, item.role, item.binding.uniforms.uFlowAmplitudeM.value)
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
