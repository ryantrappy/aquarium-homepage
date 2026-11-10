import * as THREE from 'three'
import type { CoralSocket } from '../assets/contract'
import type { HabitatAnchor, SpeciesBehaviorId } from '../../lib/fish-behavior'
import type { AxisAlignedBox, HabitatAnchorLocation, SolidObstacleVolume, Vec3 } from '../../simulation/habitat-navigation'
import { ANCHOR_APPROACH_MARGIN_M, MAX_FISH_BODY_RADIUS_M, MIN_FISH_CLEARANCE, fishClearanceRadius } from './fish-scale'
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
  columnPaletteOverride?: CoralPaletteOverride
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

// Cohesive, velvety actinic-daylight reef palettes for branching SPS, plating Montipora, and GSP carpets:
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

// Realistic, lifelike Sea Anemone color morphs (creamy-ivory fluted tentacle roots,
// translucent hydrostat shafts, glowing rounded acrosphere tips, and terracotta/crimson verrucose pedal columns):
const PALETTE_ANEMONE_COLUMN_TERRACOTTA: CoralPaletteOverride = {
  baseColor: '#d8481c',
  tipColor: '#f7ead8',
  creviceColor: '#5c1210',
  regradeStrength: 0.22,
  roughness: 0.52,
  subsurfaceStrength: 0.44,
  fluorescenceStrength: 0.14,
}
const PALETTE_ANEMONE_COLUMN_CRIMSON: CoralPaletteOverride = {
  baseColor: '#a81c2e',
  tipColor: '#f2e0c8',
  creviceColor: '#480a14',
  regradeStrength: 0.28,
  roughness: 0.52,
  subsurfaceStrength: 0.44,
  fluorescenceStrength: 0.14,
}
const PALETTE_ANEMONE_COLUMN_SIENNA: CoralPaletteOverride = {
  baseColor: '#cc461e',
  tipColor: '#f5e8d2',
  creviceColor: '#52160c',
  regradeStrength: 0.25,
  roughness: 0.52,
  subsurfaceStrength: 0.44,
  fluorescenceStrength: 0.14,
}

// 1. Rose-Magenta / Lavender Magnificent Anemone (matches user reference photos 1 & 2)
const PALETTE_ROSE_MAUVE_ANEMONE: CoralPaletteOverride = {
  baseColor: '#e85298',
  tipColor: '#ff3888',
  creviceColor: '#f5e8d0',
  regradeStrength: 0.22,
  roughness: 0.30,
  subsurfaceStrength: 0.56,
  fluorescenceStrength: 0.24,
}
// 2. Sunburst / Rainbow Host Anemone (emerald-jade base -> fiery tangerine shaft -> neon rose-coral tip)
const PALETTE_TERRACOTTA_SUNBURST_BTA: CoralPaletteOverride = {
  baseColor: '#f25c28',
  tipColor: '#ff2e58',
  creviceColor: '#a8e898',
  regradeStrength: 0.78,
  roughness: 0.30,
  subsurfaceStrength: 0.56,
  fluorescenceStrength: 0.26,
}
// 3. Electric Mint-Green / Chartreuse-Tip Ritteri Anemone (creamy-jade base -> seafoam-emerald shaft -> chartreuse tip)
const PALETTE_MINT_GREEN_ANEMONE: CoralPaletteOverride = {
  baseColor: '#38c86e',
  tipColor: '#c8ff4d',
  creviceColor: '#e6f2d4',
  regradeStrength: 0.78,
  roughness: 0.30,
  subsurfaceStrength: 0.56,
  fluorescenceStrength: 0.24,
}
// 4. Royal Purple / Lavender-Tip Sebae Anemone (champagne-ivory base -> amethyst-lavender shaft -> glowing violet tip)
const PALETTE_PURPLE_LAVENDER_ANEMONE: CoralPaletteOverride = {
  baseColor: '#9462dc',
  tipColor: '#df52ff',
  creviceColor: '#f4e8d6',
  regradeStrength: 0.76,
  roughness: 0.30,
  subsurfaceStrength: 0.56,
  fluorescenceStrength: 0.24,
}
// 5. Golden-Peach / Rose-Gold Long-Tentacle Anemone (vanilla-ivory base -> warm apricot-peach shaft -> rose-gold tip)
const PALETTE_GOLDEN_PEACH_ANEMONE: CoralPaletteOverride = {
  baseColor: '#f07c4e',
  tipColor: '#ff98c4',
  creviceColor: '#f8eed8',
  regradeStrength: 0.74,
  roughness: 0.30,
  subsurfaceStrength: 0.56,
  fluorescenceStrength: 0.22,
}
// 6. Aquamarine / Violet-Tip Reef Anemone (creamy-aqua base -> translucent turquoise shaft -> glowing violet-pink tip)
const PALETTE_SEAFOAM_CYAN_CORAL: CoralPaletteOverride = {
  baseColor: '#32b8c4',
  tipColor: '#f068d8',
  creviceColor: '#e4f5ee',
  regradeStrength: 0.76,
  roughness: 0.30,
  subsurfaceStrength: 0.56,
  fluorescenceStrength: 0.24,
}

/**
 * Large, lush, mature reef coral mounts (`scale: 1.35..1.85`) featuring the new Blender
 * Host Sea Anemone (`coral-anemone-bta`) across the tentaculate & anemone sockets in realistic,
 * lifelike biological color morphs (Rose-Magenta, Mint-Chartreuse, Golden-Peach, Sunburst-Rainbow,
 * Royal-Lavender, and Aquamarine-Violet).
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
  // Mid-slope Sea Anemones in realistic Mint-Chartreuse, Golden-Peach, and Rose-Magenta morphs
  {
    socketName: 'socket_lps_mid_01',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'tentaculate-lps',
    yawRad: 0.15,
    scale: 1.42,
    tiltXRad: 0.24,
    tiltZRad: 0.18,
    offsetM: [-0.03, 0.01, 0.03],
    paletteOverride: PALETTE_MINT_GREEN_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_SIENNA,
  },
  {
    socketName: 'socket_lps_mid_02',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'tentaculate-lps',
    yawRad: -0.4,
    scale: 1.40,
    tiltXRad: 0.22,
    tiltZRad: -0.16,
    offsetM: [0.03, 0.01, 0.03],
    paletteOverride: PALETTE_GOLDEN_PEACH_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_CRIMSON,
  },
  {
    socketName: 'socket_lps_mid_03',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'tentaculate-lps',
    yawRad: 0.85,
    scale: 1.45,
    tiltXRad: 0.22,
    tiltZRad: 0.08,
    offsetM: [0.0, 0.02, 0.03],
    paletteOverride: PALETTE_PURPLE_LAVENDER_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_TERRACOTTA,
  },
  {
    socketName: 'socket_anemone_crevice_01',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'host-anemone',
    yawRad: 0.1,
    scale: 1.45,
    tiltXRad: 0.24,
    tiltZRad: -0.10,
    offsetM: [-0.06, -0.02, 0.04],
    paletteOverride: PALETTE_ROSE_MAUVE_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_TERRACOTTA,
  },
  // Lush fuzzy Green Star-Polyp (GSP) carpets along the lower rock apron
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
  // Mid-right Sea Anemones in Aquamarine-Violet, Sunburst-Rainbow, and Royal-Lavender morphs
  {
    socketName: 'socket_lps_mid_04',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'tentaculate-lps',
    yawRad: 0.22,
    scale: 1.44,
    tiltXRad: 0.24,
    tiltZRad: 0.20,
    offsetM: [-0.04, 0.01, 0.04],
    paletteOverride: PALETTE_SEAFOAM_CYAN_CORAL,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_CRIMSON,
  },
  {
    socketName: 'socket_lps_mid_05',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'tentaculate-lps',
    yawRad: -0.5,
    scale: 1.46,
    tiltXRad: 0.24,
    tiltZRad: -0.18,
    offsetM: [0.04, 0.01, 0.03],
    paletteOverride: PALETTE_TERRACOTTA_SUNBURST_BTA,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_TERRACOTTA,
  },
  {
    socketName: 'socket_lps_mid_06',
    coralAssetId: 'coral-anemone-bta',
    archetype: 'tentaculate-lps',
    yawRad: 0.75,
    scale: 1.42,
    tiltXRad: 0.22,
    tiltZRad: 0.10,
    offsetM: [0.0, 0.02, 0.04],
    paletteOverride: PALETTE_PURPLE_LAVENDER_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_SIENNA,
  },
  // Lower right apron: lush Green Star-Polyp (GSP) carpet & deep violet-blue polyp mounds
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
  columnPaletteOverride?: CoralPaletteOverride
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
    coralAssetId: 'coral-anemone-bta',
    localOffsetM: [-0.04, -0.02, 0.06],
    yawRad: 0.5,
    tiltXRad: 0.26,
    tiltZRad: 0.22,
    scale: 0.94,
    paletteOverride: PALETTE_PURPLE_LAVENDER_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_TERRACOTTA,
  },
  {
    parentSocket: 'socket_soft_mat_01',
    coralAssetId: 'coral-anemone-bta',
    localOffsetM: [0.04, 0.01, 0.03],
    yawRad: 0.4,
    tiltXRad: 0.22,
    tiltZRad: 0.14,
    scale: 0.95,
    paletteOverride: PALETTE_TERRACOTTA_SUNBURST_BTA,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_CRIMSON,
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
  columnPaletteOverride?: CoralPaletteOverride
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
    coralAssetId: 'coral-anemone-bta',
    localOffsetM: [-0.05, 0.02, 0.04],
    yawRad: 0.2,
    tiltXRad: 0.22,
    tiltZRad: 0.16,
    scale: 0.94,
    paletteOverride: PALETTE_ROSE_MAUVE_ANEMONE,
    columnPaletteOverride: PALETTE_ANEMONE_COLUMN_TERRACOTTA,
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
]

const RIGHT_ISLAND_LOCAL_OBSTACLES_M: ReadonlyArray<{ id: string; min: [number, number, number]; max: [number, number, number] }> = [
  { id: 'rock-part-01', min: [-0.467889, -0.012, -0.251368], max: [0.49856, 0.336, 0.260176] },
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

/**
 * Socket-derived habitat anchors (AQ-82 AC #1/#2). The monolithic
 * `coral-canopy-crest` obstacle boxes are gone: the rigid geometry is now
 * only the measured rock parts above plus one tight calcified-base box per
 * branching-SPS crest mount (see `CORAL_BASE_*_M`), so fish can swim close
 * to — and shelter among — the permeable coral crowns without clipping
 * solid rock. Soft coral crowns, tentacles and branch envelopes are never
 * obstacles; only rock and calcified stalks are.
 *
 * Socket positions are measured, not invented: they are copied verbatim
 * from the socket-support inspection reports
 * `src/rendering/assets/corals/live-rock-island-left-socket-report.json`
 * (source SHA ac2ed1793d16e84f264ac19017935f7daa4f158ebac116cddde57a53653c34d5)
 * and `...-right-socket-report.json`
 * (source SHA ab7b756344c6a0a879d254b6ca06a20c63c4246b0a19b76394cc532c61abfbee).
 * `reef-assembly.test.ts` asserts this table still matches those reports,
 * so a rock re-export that moves a socket fails loudly instead of silently
 * misplacing an anchor. Mount `offsetM` values are applied at derivation
 * time from the mounts actually assembled (see
 * `instantiateModularReefHabitat`); the table below holds socket positions
 * only.
 *
 * Anchor placement (island-local metres, before the island transform):
 * - Front-face anchors (host anemone, foraging patches) sit proud of the
 *   rock front face (`FRONT_PROUD_Z_LOCAL_M` = 0.40 — past the yaw-grown
 *   rotated rock AABB front plus the reduced anchor-approach clearance).
 *   The AABB rock slab cannot represent the anemone crevice, so the
 *   clownfish hovers at the tentacle fringe rather than inside the slab;
 *   the true rock surface (mesh navigation, when ready) lets it closer.
 * - Grazing/perch ledge anchors hover ABOVE their ledge (ledge world y
 *   + legacy clearance + 0.03, world units), inside the coral canopy — the
 *   established geometry pinned by reef-mesh-navigation.test.ts. A point
 *   just above the rock face cannot be AABB-safe, and the front plane
 *   would put the grazer ~1.3 m world in front of the ledge.
 * - Branching-coral shelter/refuge anchors sit above the crest sockets,
 *   inside the measured staghorn crown envelope (template height 0.221 m
 *   x mount scale 1.70-1.85 = 0.38-0.41 m above the socket). Shelter rides
 *   0.05 m above refuge so the two are distinct locations; refuge is
 *   tucked 0.03 m deeper among the branches.
 * - Sand-burrow anchors sit on open sand in front of each island at the
 *   lowest swimmable plane (`SAND_BURROW_WORLD_Y_M`); no burrow mesh
 *   exists yet, so the entrance is a notional sand feature, not a hole.
 * `rockCrevice` is deliberately NOT derived here: the left island's
 * pass-through cave has no measured mouth coordinates, and socket names
 * alone never create habitat anchors (AQ-14.3 AC #3).
 */
export const SOCKET_ANCHOR_POSITIONS_M: Readonly<Record<'left' | 'right', Readonly<Record<string, readonly [number, number, number]>>>> = {
  left: {
    socket_anemone_crevice_01: [0.0359, 0.236, 0.0147],
    socket_brain_apron_01: [-0.3121, 0.118, 0.156],
    socket_brain_apron_02: [0.2777, 0.096, 0.1576],
    socket_lps_mid_01: [-0.2432, 0.216, 0.0146],
    socket_lps_mid_02: [0.2467, 0.256, 0.0094],
    socket_lps_mid_03: [-0.0952, 0.236, 0.0227],
    socket_plate_ledge_01: [-0.3457, 0.268, -0.0948],
    socket_plate_ledge_02: [0.3433, 0.204, -0.096],
    socket_soft_mat_01: [-0.1817, 0.118, 0.1687],
    socket_sps_crest_01: [-0.1516, 0.386, -0.1455],
    socket_sps_crest_02: [0.0172, 0.348, -0.1651],
    socket_sps_crest_03: [0.1666, 0.372, -0.1369],
  },
  right: {
    socket_brain_apron_03: [-0.2635, 0.114, 0.1557],
    socket_brain_apron_04: [0.2658, 0.102, 0.1545],
    socket_lps_mid_04: [-0.2159, 0.184, 0.0142],
    socket_lps_mid_05: [0.2164, 0.174, 0.0091],
    socket_lps_mid_06: [0.0075, 0.212, 0.022],
    socket_plate_ledge_03: [-0.3258, 0.226, -0.0881],
    socket_plate_ledge_04: [0.3243, 0.206, -0.0878],
    socket_soft_mat_02: [0.0015, 0.084, 0.1672],
    socket_sps_crest_04: [0.0103, 0.294, -0.1594],
    socket_sps_crest_05: [0.153, 0.318, -0.1382],
    socket_sps_crest_06: [-0.1505, 0.336, -0.1464],
  },
}

/** Rock-front proud plane (local m): past the rock AABB front face (0.266).
 * 0.40, not 0.31: the island yaw grows the rotated rock AABB's front past
 * the unrotated face (up to |x| * sin(yaw)), so a 0.31 plane still sits
 * inside the yaw-grown AABB at the outer sockets. 0.40 clears it at every
 * production placement with margin; the standoff (~0.6 m world) is the
 * price of AABB navigation — mesh navigation uses the true rock surface. */
export const FRONT_PROUD_Z_LOCAL_M = 0.4
/** Tight calcified-base box around each branching-SPS crest stalk (local m). */
export const CORAL_BASE_HALF_EXTENT_M = 0.07
export const CORAL_BASE_HEIGHT_M = 0.06
/** Sand-burrow anchor plane (world m): lowest swimmable plane, bounds min y + margin. */
export const SAND_BURROW_WORLD_Y_M = -2.13
/** Sand-burrow anchor offset in front of the rock front face (local m). */
export const SAND_BURROW_FRONT_Z_LOCAL_M = 0.45

/** Production swimming volume; must match the habitat bounds in aquarium.ts. */
export const AQUARIUM_WATER_BOUNDS: AxisAlignedBox = {
  min: { x: -4, y: -2.25, z: -4.6 },
  max: { x: 4, y: 2.8, z: 2.8 },
}

type SocketAnchorSpec = Readonly<{
  socket: string
  anchor: HabitatAnchor
  compatibleSpecies: readonly SpeciesBehaviorId[]
  /** Local lift above the mounted socket (island metres). */
  liftM: number
  /** 'front' pins local z to FRONT_PROUD_Z_LOCAL_M; 'socket' keeps socket z. */
  zMode: 'front' | 'socket'
  /** Extra local z shift applied after the z mode (refuge tucks deeper). */
  zShiftM?: number
}>

const FORAGING_SPECIES: readonly SpeciesBehaviorId[] = [
  'royal-gramma',
  'banggai-cardinalfish',
  'six-line-wrasse',
  'mandarin-dragonet',
  'lyretail-anthias',
  'copperband-butterflyfish',
]

const SOCKET_ANCHOR_SPECS: Readonly<Record<'left' | 'right', readonly SocketAnchorSpec[]>> = {
  left: [
    { socket: 'socket_anemone_crevice_01', anchor: 'hostAnemone', compatibleSpecies: ['ocellaris-clownfish'], liftM: 0.06, zMode: 'front' },
    { socket: 'socket_sps_crest_01', anchor: 'branchingCoralShelter', compatibleSpecies: ['banggai-cardinalfish', 'six-line-wrasse'], liftM: 0.17, zMode: 'socket' },
    { socket: 'socket_sps_crest_01', anchor: 'branchingCoralRefuge', compatibleSpecies: ['blue-tang', 'blue-green-chromis'], liftM: 0.12, zMode: 'socket', zShiftM: -0.03 },
    { socket: 'socket_sps_crest_02', anchor: 'branchingCoralShelter', compatibleSpecies: ['banggai-cardinalfish', 'six-line-wrasse'], liftM: 0.17, zMode: 'socket' },
    { socket: 'socket_sps_crest_02', anchor: 'branchingCoralRefuge', compatibleSpecies: ['blue-tang', 'blue-green-chromis'], liftM: 0.12, zMode: 'socket', zShiftM: -0.03 },
    { socket: 'socket_sps_crest_03', anchor: 'branchingCoralShelter', compatibleSpecies: ['banggai-cardinalfish', 'six-line-wrasse'], liftM: 0.17, zMode: 'socket' },
    { socket: 'socket_sps_crest_03', anchor: 'branchingCoralRefuge', compatibleSpecies: ['blue-tang', 'blue-green-chromis'], liftM: 0.12, zMode: 'socket', zShiftM: -0.03 },
    { socket: 'socket_plate_ledge_01', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_plate_ledge_02', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_soft_mat_01', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_brain_apron_01', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_brain_apron_02', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
  ],
  right: [
    { socket: 'socket_sps_crest_04', anchor: 'branchingCoralShelter', compatibleSpecies: ['banggai-cardinalfish', 'six-line-wrasse'], liftM: 0.17, zMode: 'socket' },
    { socket: 'socket_sps_crest_04', anchor: 'branchingCoralRefuge', compatibleSpecies: ['blue-tang', 'blue-green-chromis'], liftM: 0.12, zMode: 'socket', zShiftM: -0.03 },
    { socket: 'socket_sps_crest_05', anchor: 'branchingCoralShelter', compatibleSpecies: ['banggai-cardinalfish', 'six-line-wrasse'], liftM: 0.17, zMode: 'socket' },
    { socket: 'socket_sps_crest_05', anchor: 'branchingCoralRefuge', compatibleSpecies: ['blue-tang', 'blue-green-chromis'], liftM: 0.12, zMode: 'socket', zShiftM: -0.03 },
    { socket: 'socket_sps_crest_06', anchor: 'branchingCoralShelter', compatibleSpecies: ['banggai-cardinalfish', 'six-line-wrasse'], liftM: 0.17, zMode: 'socket' },
    { socket: 'socket_sps_crest_06', anchor: 'branchingCoralRefuge', compatibleSpecies: ['blue-tang', 'blue-green-chromis'], liftM: 0.12, zMode: 'socket', zShiftM: -0.03 },
    { socket: 'socket_plate_ledge_03', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_plate_ledge_04', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_soft_mat_02', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_brain_apron_03', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
    { socket: 'socket_brain_apron_04', anchor: 'foragingPatch', compatibleSpecies: FORAGING_SPECIES, liftM: 0.06, zMode: 'front' },
  ],
}

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
  columnPaletteOverride: CoralPaletteOverride | undefined,
  options: { paused?: boolean; reducedMotion?: boolean; actinicLevel?: number } | undefined,
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

    // Keep the fleshy verrucose terracotta/crimson pedal column & creamy radially-striated oral disc
    // distinct from the translucent tentacle crown on every coral-anemone-bta instance.
    const childNameLower = child.name.toLowerCase()
    const primIdLower = (reefPrimitive?.id ?? '').toLowerCase()
    const isAnemoneColumn = childNameLower.includes('anemone_column_disc') || primIdLower === 'anemone_column_disc'
    const isAnemoneTentacles = childNameLower.includes('anemone_tentacle_crown') || primIdLower === 'anemone_tentacle_crown'
    const effectivePalette = isAnemoneColumn
      ? (columnPaletteOverride ?? PALETTE_ANEMONE_COLUMN_TERRACOTTA)
      : paletteOverride
    const anemoneMode = isAnemoneColumn ? 'column' : isAnemoneTentacles ? 'tentacles' : undefined

    const clonedMaterials = (Array.isArray(child.material) ? child.material : [child.material]).map(mat => {
      const stdMat = mat instanceof THREE.MeshStandardMaterial ? mat.clone() : new THREE.MeshStandardMaterial()
      const binding = applyCoralRawMaskMaterial(stdMat, {
        role,
        paletteOverride: effectivePalette,
        anemoneMode,
        paused: options?.paused,
        reducedMotion: options?.reducedMotion,
        actinicLevel: options?.actinicLevel,
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
  options?: { paused?: boolean; reducedMotion?: boolean; actinicLevel?: number },
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
    bindCoralInstanceMaterials(
      instance,
      mount.paletteOverride,
      mount.columnPaletteOverride,
      options,
      materialControllers,
      geometryBindings,
    )

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
      bindCoralInstanceMaterials(
        compInstance,
        comp.paletteOverride,
        comp.columnPaletteOverride,
        options,
        materialControllers,
        geometryBindings,
      )
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
 * Instantiates rigid 3D obstacle volumes and socket-derived species-compatible
 * habitat anchors for an assembled modular live-rock + coral island at
 * uniform proportion-preserving scale (`uniformScale`).
 *
 * AQ-82: the rigid volumes are the measured rock parts plus one tight
 * calcified-base box per branching-SPS crest mount — the old monolithic
 * `coral-canopy-crest` boxes are gone, so fish can swim close to and shelter
 * among the permeable coral crowns. Anchors are derived from the measured
 * socket positions (`SOCKET_ANCHOR_POSITIONS_M`) plus the mount offsets of
 * the `mounts` actually assembled (defaults to the island's default mounts),
 * the rock ledges, and one sand burrow per island. An anchor is emitted
 * only when its socket has a mount: an unmounted socket is a bare rock
 * feature, not a coral interaction. `rockCrevice` is not derived (no
 * measured cave-mouth coordinates; AQ-14.3 AC #3).
 */
export function instantiateModularReefHabitat(
  islandKind: 'left' | 'right',
  uniformScale: number,
  position: Vec3,
  prefix: string,
  yaw = 0,
  mounts: readonly ModularCoralMountEntry[] = islandKind === 'left' ? DEFAULT_LEFT_ISLAND_MOUNTS : DEFAULT_RIGHT_ISLAND_MOUNTS,
  waterBounds: AxisAlignedBox = AQUARIUM_WATER_BOUNDS,
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

  const mountBySocket = new Map(mounts.map(mount => [mount.socketName, mount]))
  // The islands extend past the swimming volume at the tank edges, so an
  // anchor derived from an outer socket can land outside swimmable water.
  // Clamp every anchor into the bounds shrunk by the largest
  // anchor-approach clearance (0.08 body radius + 0.03 margin), so every
  // emitted anchor is a safe point for every species under AQ-82's reduced
  // clearance. The clamp moves an outer anchor at most ~0.2 m inward along
  // one axis; height and depth stay at the socket.
  const anchorMargin = MAX_FISH_BODY_RADIUS_M + ANCHOR_APPROACH_MARGIN_M
  const clampAnchor = (pt: Vec3): Vec3 => ({
    x: Math.min(Math.max(pt.x, waterBounds.min.x + anchorMargin), waterBounds.max.x - anchorMargin),
    y: Math.min(Math.max(pt.y, waterBounds.min.y + anchorMargin), waterBounds.max.y - anchorMargin),
    z: Math.min(Math.max(pt.z, waterBounds.min.z + anchorMargin), waterBounds.max.z - anchorMargin),
  })
  const rawObstacles = islandKind === 'left' ? LEFT_ISLAND_LOCAL_OBSTACLES_M : RIGHT_ISLAND_LOCAL_OBSTACLES_M
  const localObstacles: Array<{ id: string; min: [number, number, number]; max: [number, number, number] }> = [...rawObstacles]
  // Tight calcified-base boxes for the branching-SPS crest stalks: the only
  // rigid coral geometry. Each protrudes above the rock top (crest sockets
  // sit at/above it); plate/brain stalks sit inside the rock AABB already
  // and need no separate box. Soft anemone/Euphyllia columns are not rigid.
  for (const socket of Object.keys(SOCKET_ANCHOR_POSITIONS_M[islandKind])) {
    if (!socket.startsWith('socket_sps_crest_')) continue
    if (!mountBySocket.has(socket)) continue
    const [sx, sy, sz] = SOCKET_ANCHOR_POSITIONS_M[islandKind][socket]!
    localObstacles.push({
      id: `coral-base-${socket}`,
      min: [sx - CORAL_BASE_HALF_EXTENT_M, sy, sz - CORAL_BASE_HALF_EXTENT_M],
      max: [sx + CORAL_BASE_HALF_EXTENT_M, sy + CORAL_BASE_HEIGHT_M, sz + CORAL_BASE_HALF_EXTENT_M],
    })
  }
  const obstacles: SolidObstacleVolume[] = localObstacles.map(part => {
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

  const anchors: HabitatAnchorLocation[] = []
  const socketPositions = SOCKET_ANCHOR_POSITIONS_M[islandKind]
  for (const spec of SOCKET_ANCHOR_SPECS[islandKind]) {
    const mount = mountBySocket.get(spec.socket)
    if (!mount) continue
    const socketPos = socketPositions[spec.socket]
    if (!socketPos) continue
    const offset = mount.offsetM ?? [0, 0, 0]
    const local: Vec3 = {
      x: socketPos[0] + offset[0],
      y: socketPos[1] + offset[1] + spec.liftM,
      z: (spec.zMode === 'front' ? FRONT_PROUD_Z_LOCAL_M : socketPos[2] + offset[2]) + (spec.zShiftM ?? 0),
    }
    anchors.push({
      id: `${prefix}-anchor-${spec.socket}-${spec.anchor}`,
      anchor: spec.anchor,
      compatibleSpecies: [...spec.compatibleSpecies],
      position: clampAnchor(transform(local)),
    })
  }

  // Rock ledges serve two roles: grazing surfaces (tang, angelfish) and
  // perches (blenny). Both hover ABOVE the ledge, not in front of it:
  // the established grazing geometry is the ledge position raised by the
  // legacy clearance plus a small margin, in WORLD units (0.60 m above
  // the ledge — inside the coral canopy, clear of the rock alone; pinned
  // by reef-mesh-navigation.test.ts, which expects the grazing anchor
  // inside the coral envelope). A point just above the rock face cannot
  // be AABB-safe — the rock slab AABB fills it — so the front plane used
  // for socket anchors would put the grazer ~1.3 m world in front of the
  // ledge instead of above it. The grazing anchor keeps its historical
  // id (`${prefix}-${ledge.id}`); the perch shares the same hover point
  // with its own id. NOTE: these two anchors are the documented
  // exception to the "every anchor is an AABB safe point" rule — they sit
  // inside the expanded rock AABB (and inside the coral envelope) by
  // design, so AABB routing approaches them via the interaction offset
  // rather than onto them; the safe-point test below skips them.
  const rawLedges = islandKind === 'left' ? LEFT_ISLAND_LOCAL_GRAZING_LEDGES_M : RIGHT_ISLAND_LOCAL_GRAZING_LEDGES_M
  const grazeClearanceOffsetM = Math.max(MIN_FISH_CLEARANCE, fishClearanceRadius('yellow-tang')) + 0.03
  for (const ledge of rawLedges) {
    const worldPt = transform({ x: ledge.pos[0], y: ledge.pos[1], z: ledge.pos[2] })
    const hover = clampAnchor({ x: worldPt.x, y: worldPt.y + grazeClearanceOffsetM, z: worldPt.z })
    anchors.push({
      id: `${prefix}-${ledge.id}`,
      anchor: 'grazingSurface',
      compatibleSpecies: ['yellow-tang', 'flame-angelfish'],
      position: hover,
    })
    anchors.push({
      id: `${prefix}-anchor-${ledge.id}-rockPerch`,
      anchor: 'rockPerch',
      compatibleSpecies: ['tailspot-blenny'],
      position: hover,
    })
  }

  // Sand burrow entrance on open sand in front of the island, at the lowest
  // swimmable plane. Local y is derived from the world target so the anchor
  // lands on the same plane at every island scale.
  const burrowLocalY = (SAND_BURROW_WORLD_Y_M - position.y) / uniformScale
  anchors.push({
    id: `${prefix}-anchor-sand-burrow`,
    anchor: 'sandBurrowEntrance',
    compatibleSpecies: ['firefish', 'yellow-watchman-goby'],
    position: clampAnchor(transform({ x: 0, y: burrowLocalY, z: SAND_BURROW_FRONT_Z_LOCAL_M })),
  })

  return { obstacles, anchors }
}
