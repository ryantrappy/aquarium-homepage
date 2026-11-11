import * as THREE from 'three'

export const CORAL_RAW_MASK_SCHEMA = 'coral-raw-masks-v1' as const
export const CORAL_FLEXIBILITY_EXPONENT = 1.8 as const

/**
 * Interim healthy-tissue grade (AQ-88): the shared saturation boost applied
 * to the regraded coral tissue colour, pulling bleached lavender/white
 * toward saturated tissue without touching any asset. The GLSL in
 * `injectCoralRawMaskShader` interpolates this constant; the CPU reference
 * `evaluateCoralTissueColor` mirrors it exactly.
 */
export const CORAL_TISSUE_SATURATION_BOOST = 1.18 as const
/** How far a pale tip colour is pulled toward its base colour (AQ-88), so
 * near-white tips stop washing the colony out. */
export const CORAL_TIP_BASE_PULL = 0.25 as const
/** Per-channel ceiling on graded tissue colour (AQ-88): no channel may blow
 * out to near-white, however bright the raw texture underneath is. */
export const CORAL_TISSUE_HIGHLIGHT_CEILING = 0.92 as const
/** Default regrade strength (AQ-88): corals without an explicit palette
 * override are graded toward the healthy default palette instead of
 * showing the raw bleached texture (the old default was 0.0). */
export const CORAL_DEFAULT_REGRADE = 0.92 as const
/** Saturated healthy-tissue default palette (AQ-88): deep rose base and tip
 * over a dark crevice, replacing the old pale lavender defaults
 * (#c490ab / #f2dce8 / #4a3048). Per-mount overrides in reef-assembly.ts
 * still win wherever they are supplied. */
export const CORAL_DEFAULT_PALETTE = Object.freeze({
  baseColor: '#a84a72',
  tipColor: '#cf6f9e',
  creviceColor: '#3d2233',
})

export type CoralPrimitiveRole = 'coral-rigid' | 'coral-soft'

export type CoralPaletteOverride = {
  baseColor: THREE.ColorRepresentation
  tipColor: THREE.ColorRepresentation
  creviceColor?: THREE.ColorRepresentation
  /** How strongly to re-grade the raw texture toward the target reef palette (0..1). */
  regradeStrength?: number
  roughness?: number
  subsurfaceStrength?: number
  fluorescenceStrength?: number
}

export type CoralFlowUniforms = {
  uTime: { value: number }
  uMotionScale: { value: number }
  uFlowAmplitudeM: { value: number }
  uPrimaryFrequencyHz: { value: number }
  uSecondaryFrequencyHz: { value: number }
  uRoleIsSoft: { value: number }
  uSubsurfaceStrength: { value: number }
  uFluorescenceStrength: { value: number }
  uFluorescenceTint: { value: THREE.Color }
  /** Actinic scaling of the mask-driven fluorescence (AQ-70.6 AC #3):
   * 1.0 at the default fixture white balance; the aquarium passes
   * `evaluateFluorescenceActinicFactor(fixtureWhiteBalance)` here. */
  uActinicLevel: { value: number }
  uPaletteBase: { value: THREE.Color }
  uPaletteTip: { value: THREE.Color }
  uPaletteCrevice: { value: THREE.Color }
  uPaletteRegrade: { value: number }
  uRoughnessOverride: { value: number }
  /** 0 = standard coral, 1 = anemone verrucose column & striated oral disc, 2 = anemone hydrostat tentacle crown */
  uAnemoneMode: { value: number }
}

export type CoralMaterialOptions = {
  role: CoralPrimitiveRole
  flowAmplitudeM?: number
  primaryFrequencyHz?: number
  secondaryFrequencyHz?: number
  subsurfaceStrength?: number
  fluorescenceStrength?: number
  fluorescenceTint?: THREE.ColorRepresentation
  /** Actinic scaling of the mask-driven fluorescence (AQ-70.6 AC #3);
   * 1.0 preserves the current glow at the default fixture balance. */
  actinicLevel?: number
  paletteOverride?: CoralPaletteOverride
  anemoneMode?: 'column' | 'tentacles'
  paused?: boolean
  reducedMotion?: boolean
}

export type CoralMaskSample = Readonly<{
  r: number
  g: number
  b: number
  a: number
}>

const TWO_PI = Math.PI * 2
const DEFAULT_FLOW_AMPLITUDE_M = 0.014
const DEFAULT_PRIMARY_FREQ_HZ = 0.28
const DEFAULT_SECONDARY_FREQ_HZ = 0.61

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Applies the `coral-raw-masks-v1` flexibility curve (`pow(clamp(r, 0, 1), 1.8)`)
 * exactly once at runtime. Rigid coral primitives always evaluate to 0.
 */
export function evaluateCoralFlexibilityWeight(rawR: number, role: CoralPrimitiveRole): number {
  if (role === 'coral-rigid') return 0
  const clamped = clamp01(rawR)
  if (clamped === 0) return 0
  return Math.pow(clamped, CORAL_FLEXIBILITY_EXPONENT)
}

/**
 * Evaluates the contact ambient-occlusion multiplier from `COLOR_0.a` without
 * altering surface opacity (`diffuseColor.a` remains 1.0).
 */
export function evaluateCoralContactAoFactor(rawA: number): number {
  const ao = clamp01(rawA)
  return 0.28 + 0.72 * ao
}

export type CoralTissueGradeInput = Readonly<{
  baseColor: Readonly<{ r: number; g: number; b: number }>
  tipColor: Readonly<{ r: number; g: number; b: number }>
  creviceColor: Readonly<{ r: number; g: number; b: number }>
  /** `coralHeightMask * 0.55 + coralMaskAlpha * 0.45` in the shader. */
  heightTerm: number
  /** `coralTipMask * 0.65 + polypHighlight * 0.35` in the shader. */
  tipTerm: number
  /** Luminance of the raw texture texel. */
  texLuma: number
  /** Micro-polyp stipple highlight (0..1) from the shader noise field. */
  polypHighlight: number
}>

/**
 * Deterministic CPU reference for the coral tissue grade in
 * `injectCoralRawMaskShader` (AQ-88). Mirrors the GLSL exactly: crevice →
 * base → (tip pulled toward base) gradient, brightness factor, saturation
 * boost, and highlight ceiling. Used for unit verification that pale
 * lavender/white inputs grade toward saturated healthy tissue; the shader
 * remains the runtime path. Fluorescence and subsurface terms are
 * deliberately not part of this grade — they stay mask-driven, and no
 * blanket emissive is added anywhere.
 */
export function evaluateCoralTissueColor(input: CoralTissueGradeInput): { r: number; g: number; b: number } {
  const mix = (a: number, b: number, t: number) => a + (b - a) * clamp01(t)
  const mix3 = (a: Readonly<{ r: number; g: number; b: number }>, b: Readonly<{ r: number; g: number; b: number }>, t: number) => ({
    r: mix(a.r, b.r, t),
    g: mix(a.g, b.g, t),
    b: mix(a.b, b.b, t),
  })
  let grad = mix3(input.creviceColor, input.baseColor, smoothstep(0.02, 0.34, input.heightTerm))
  const pulledTip = mix3(input.tipColor, input.baseColor, CORAL_TIP_BASE_PULL)
  grad = mix3(grad, pulledTip, smoothstep(0.22, 0.92, input.tipTerm))
  const brightness = 0.86 + 0.22 * input.texLuma + 0.16 * (input.polypHighlight - 0.4)
  grad = { r: grad.r * brightness, g: grad.g * brightness, b: grad.b * brightness }
  const luma = 0.299 * grad.r + 0.587 * grad.g + 0.114 * grad.b
  grad = mix3({ r: luma, g: luma, b: luma }, grad, CORAL_TISSUE_SATURATION_BOOST)
  return {
    r: Math.min(grad.r, CORAL_TISSUE_HIGHLIGHT_CEILING),
    g: Math.min(grad.g, CORAL_TISSUE_HIGHLIGHT_CEILING),
    b: Math.min(grad.b, CORAL_TISSUE_HIGHLIGHT_CEILING),
  }
}

/**
 * Deterministic CPU reference for 3D coralline-encrusted reef live-rock shading (`applyLiveRockMaterial`).
 * Evaluates purely in 3D canonical meter space `(x, y, z)` and 3D object normal `(nx, ny, nz)` so
 * steep vertical rock walls (`normal.y ~ 0`) have zero UV stretching or vertical streaking.
 */
export function evaluateLiveRockSurfaceSample(
  positionM: Readonly<{ x: number; y: number; z: number }>,
  normal: Readonly<{ x: number; y: number; z: number }>,
): {
  rgb: { r: number; g: number; b: number }
  roughness: number
  corallineMask: number
  cavityAo: number
} {
  const px = positionM.x
  const py = positionM.y
  const pz = positionM.z
  const nLen = Math.hypot(normal.x, normal.y, normal.z) || 1
  const ny = normal.y / nLen

  const hash3 = (x: number, y: number, z: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
    return s - Math.floor(s)
  }

  const ridge =
    0.5 +
    0.28 * Math.sin(px * 13.5 + pz * 11.2 + Math.cos(py * 15.0)) +
    0.22 * Math.cos(pz * 19.4 - px * 16.8 + py * 12.3)
  const pores =
    0.5 +
    0.3 * Math.sin(px * 48.0 + py * 52.0 - pz * 44.0) +
    0.2 * Math.cos(px * 92.0 - py * 84.0 + pz * 78.0) +
    0.15 * (hash3(Math.floor(px * 64), Math.floor(py * 64), Math.floor(pz * 64)) - 0.5)

  const cavityAo = Math.max(0.38, Math.min(1.0, smoothstep(0.18, 0.72, pores) * (0.78 + 0.22 * smoothstep(-0.3, 0.6, ny))))
  const upwardExposure = smoothstep(0.18, 0.72, ny) * smoothstep(0.03, 0.22, py)
  const corallineField = 0.55 * ridge + 0.45 * upwardExposure
  const corallineMask = smoothstep(0.52, 0.74, corallineField) * upwardExposure * smoothstep(0.3, 0.65, cavityAo)

  const carbR = (0.20 + 0.34 * ridge) * cavityAo
  const carbG = (0.18 + 0.31 * ridge) * cavityAo
  const carbB = (0.24 + 0.35 * ridge) * cavityAo

  const corR = (0.42 + 0.26 * ridge) * (0.6 + 0.4 * cavityAo)
  const corG = (0.18 + 0.16 * ridge) * (0.6 + 0.4 * cavityAo)
  const corB = (0.46 + 0.24 * ridge) * (0.6 + 0.4 * cavityAo)

  const r = Math.min(1, Math.max(0, carbR * (1 - corallineMask) + corR * corallineMask))
  const g = Math.min(1, Math.max(0, carbG * (1 - corallineMask) + corG * corallineMask))
  const b = Math.min(1, Math.max(0, carbB * (1 - corallineMask) + corB * corallineMask))
  const roughness = 0.90 * (1 - corallineMask * 0.8) + 0.66 * (corallineMask * 0.8)

  return { rgb: { r, g, b }, roughness, corallineMask, cavityAo }
}

/**
 * Deterministic CPU reference for the vertex shader displacement on a coral vertex.
 * Matches the GLSL displacement injected by `applyCoralRawMaskMaterial` and is used
 * for unit verification of pinned bases (`R = 0`), rigid skeletons, and pause/reduced-motion gating.
 */
export function evaluateCoralVertexDisplacement(
  position: Readonly<{ x: number; y: number; z: number }>,
  mask: CoralMaskSample,
  role: CoralPrimitiveRole,
  timeSeconds: number,
  options?: {
    paused?: boolean
    reducedMotion?: boolean
    flowAmplitudeM?: number
    primaryFrequencyHz?: number
    secondaryFrequencyHz?: number
  },
): { dx: number; dy: number; dz: number; flexibilityWeight: number } {
  const flexibilityWeight = evaluateCoralFlexibilityWeight(mask.r, role)
  if (
    flexibilityWeight === 0 ||
    options?.paused ||
    options?.reducedMotion ||
    !Number.isFinite(timeSeconds)
  ) {
    return { dx: 0, dy: 0, dz: 0, flexibilityWeight }
  }

  const amplitude = options?.flowAmplitudeM ?? DEFAULT_FLOW_AMPLITUDE_M
  if (!Number.isFinite(amplitude) || amplitude <= 0) {
    return { dx: 0, dy: 0, dz: 0, flexibilityWeight }
  }

  const f1 = options?.primaryFrequencyHz ?? DEFAULT_PRIMARY_FREQ_HZ
  const f2 = options?.secondaryFrequencyHz ?? DEFAULT_SECONDARY_FREQ_HZ
  const phaseSeed = clamp01(mask.b) * TWO_PI
  const spatialPhase = position.x * 11.5 + position.z * 9.2
  const primaryPhase = timeSeconds * TWO_PI * f1 + phaseSeed + spatialPhase
  const secondaryPhase = timeSeconds * TWO_PI * f2 - phaseSeed * 1.37 + (position.z * 13.0 - position.x * 7.5)

  const swayX = Math.sin(primaryPhase) + 0.38 * Math.cos(secondaryPhase)
  const swayZ = 0.76 * Math.cos(primaryPhase * 0.92 + 0.65) + 0.34 * Math.sin(secondaryPhase)
  const swayY = -0.18 * (Math.abs(swayX) + Math.abs(swayZ)) * flexibilityWeight * flexibilityWeight

  return {
    dx: swayX * amplitude * flexibilityWeight,
    dy: swayY * amplitude,
    dz: swayZ * amplitude * flexibilityWeight,
    flexibilityWeight,
  }
}

function injectCoralRawMaskShader(
  shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: CoralFlowUniforms,
  isDepthPass: boolean,
) {
  Object.assign(shader.uniforms, uniforms)

  shader.vertexShader =
    `
attribute vec4 color;
uniform float uTime;
uniform float uMotionScale;
uniform float uFlowAmplitudeM;
uniform float uPrimaryFrequencyHz;
uniform float uSecondaryFrequencyHz;
uniform float uRoleIsSoft;
varying vec4 vCoralMask;
varying vec3 vCoralViewDir;
varying vec3 vCoralLocalPos;
` + shader.vertexShader

  // Depth shaders put <beginnormal_vertex> inside USE_DISPLACEMENTMAP.
  // Our displacement must also exist when no displacement texture is bound.
  shader.vertexShader = shader.vertexShader.replace(
    'void main() {',
    `void main() {
float coralRawR = clamp(color.r, 0.0, 1.0);
float coralFlex = uRoleIsSoft * pow(coralRawR, 1.8);
float coralPhaseSeed = clamp(color.b, 0.0, 1.0) * 6.28318530718;
float coralSpatialPhase = position.x * 11.5 + position.z * 9.2;
float coralPhase1 = uTime * 6.28318530718 * uPrimaryFrequencyHz + coralPhaseSeed + coralSpatialPhase;
float coralPhase2 = uTime * 6.28318530718 * uSecondaryFrequencyHz - coralPhaseSeed * 1.37 + (position.z * 13.0 - position.x * 7.5);
float coralSwayX = (sin(coralPhase1) + 0.38 * cos(coralPhase2)) * uFlowAmplitudeM * uMotionScale;
float coralSwayZ = (0.76 * cos(coralPhase1 * 0.92 + 0.65) + 0.34 * sin(coralPhase2)) * uFlowAmplitudeM * uMotionScale;
`,
  )

  if (!isDepthPass) shader.vertexShader = shader.vertexShader.replace(
    '#include <beginnormal_vertex>',
    `#include <beginnormal_vertex>
objectNormal = normalize(objectNormal + vec3(-coralSwayX * 2.4 * coralFlex, 0.0, -coralSwayZ * 2.4 * coralFlex));
`,
  )

  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
vCoralMask = clamp(color, 0.0, 1.0);
vCoralLocalPos = position.xyz;
// Tuck flared basal skirt vertices inward so no dark pancake disc protrudes on the rock
float skirtTuck = smoothstep(-0.006, 0.018, position.y);
transformed.xz *= mix(0.55, 1.0, skirtTuck);
transformed.y -= (1.0 - skirtTuck) * 0.008;
transformed.x += coralSwayX * coralFlex;
transformed.z += coralSwayZ * coralFlex;
transformed.y += -0.18 * (abs(coralSwayX) + abs(coralSwayZ)) * coralFlex * coralFlex;
`,
  )

  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `#include <project_vertex>
vCoralViewDir = normalize(-mvPosition.xyz);
`,
  )

  if (isDepthPass) return

  shader.fragmentShader =
    `
uniform float uTime;
uniform float uMotionScale;
uniform float uSubsurfaceStrength;
uniform float uFluorescenceStrength;
uniform vec3 uFluorescenceTint;
uniform float uActinicLevel;
uniform vec3 uPaletteBase;
uniform vec3 uPaletteTip;
uniform vec3 uPaletteCrevice;
uniform float uPaletteRegrade;
uniform float uRoughnessOverride;
uniform float uAnemoneMode;
varying vec4 vCoralMask;
varying vec3 vCoralViewDir;
varying vec3 vCoralLocalPos;

float coralHash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

float coralNoise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(coralHash31(i + vec3(0.0, 0.0, 0.0)), coralHash31(i + vec3(1.0, 0.0, 0.0)), u.x),
      mix(coralHash31(i + vec3(0.0, 1.0, 0.0)), coralHash31(i + vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(coralHash31(i + vec3(0.0, 0.0, 1.0)), coralHash31(i + vec3(1.0, 0.0, 1.0)), u.x),
      mix(coralHash31(i + vec3(0.0, 1.0, 1.0)), coralHash31(i + vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}
` + shader.fragmentShader

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `#include <color_fragment>
// COLOR_0 is a raw 4-channel mask (coral-raw-masks-v1), never display RGB or opacity.
diffuseColor.a = 1.0;
float coralMaskAlpha = clamp(vCoralMask.a, 0.0, 1.0);
float coralContactAo = mix(0.28, 1.0, coralMaskAlpha);
float coralTipMask = clamp(vCoralMask.g, 0.0, 1.0);
float coralHeightMask = clamp(max(vCoralMask.r, smoothstep(0.005, 0.12, vCoralLocalPos.y)), 0.0, 1.0);

// High-frequency 3D micro-polyp / corallite stipple eliminates smooth plastic-toy look (matches velvety polyps in 12.23.52 PM)
float polypDots = coralNoise3D(vCoralLocalPos * 195.0) * 0.6 + coralNoise3D(vCoralLocalPos * 380.0) * 0.4;
float polypHighlight = smoothstep(0.46, 0.78, polypDots);

// Soft, cohesive tissue gradient (avoids harsh dark-bottom/white-tip crayon contrast)
// AQ-88: pull pale tips toward the base, boost tissue saturation, and cap
// highlights so bleached lavender/white grades toward healthy saturated
// tissue instead of washing out. Fluorescence stays mask-driven below.
float texLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 naturalGrad = mix(uPaletteCrevice, uPaletteBase, smoothstep(0.02, 0.34, coralHeightMask * 0.55 + coralMaskAlpha * 0.45));
vec3 coralTip = mix(uPaletteTip, uPaletteBase, ${CORAL_TIP_BASE_PULL.toFixed(2)});
naturalGrad = mix(naturalGrad, coralTip, smoothstep(0.22, 0.92, coralTipMask * 0.65 + polypHighlight * 0.35));
naturalGrad *= (0.86 + 0.22 * texLuma + 0.16 * (polypHighlight - 0.4));
float coralLuma = dot(naturalGrad, vec3(0.299, 0.587, 0.114));
naturalGrad = mix(vec3(coralLuma), naturalGrad, ${CORAL_TISSUE_SATURATION_BOOST.toFixed(2)});
naturalGrad = min(naturalGrad, vec3(${CORAL_TISSUE_HIGHLIGHT_CEILING.toFixed(2)}));

if (uAnemoneMode > 1.5) {
  // Anemone_Tentacle_Crown: preserve the Blender 4-band PBR texture detail (longitudinal basal flutes,
  // per-tentacle hue/luminance variation, and sub-terminal ring) while grading along true tentacle
  // arc-length h = vCoralMask.r (0 = creamy-ivory fluted root on oral disc -> mid hydrostat shaft -> 1 = glowing acrosphere tip).
  float hTent = clamp(vCoralMask.r, 0.0, 1.0);
  float phaseVar = clamp(vCoralMask.b, 0.0, 1.0);
  vec3 rootCol = uPaletteCrevice * (0.90 + 0.20 * texLuma);
  vec3 shaftTint = mix(uPaletteBase, uPaletteTip, 0.22 * phaseVar);
  vec3 shaftCol = mix(diffuseColor.rgb, shaftTint * (0.76 + 0.44 * texLuma), clamp(uPaletteRegrade, 0.0, 1.0));
  vec3 ringCol = mix(uPaletteCrevice, uPaletteTip, 0.35);
  float ringBand = exp(-pow((hTent - 0.885) / 0.038, 2.0));
  vec3 tentCol = mix(rootCol, shaftCol, smoothstep(0.04, 0.32, hTent));
  tentCol = mix(tentCol, ringCol, ringBand * 0.32);
  tentCol = mix(tentCol, uPaletteTip, smoothstep(0.86, 0.97, hTent));
  diffuseColor.rgb = tentCol;
} else if (uAnemoneMode > 0.5) {
  // Anemone_Column_Disc: preserve the Blender-baked micro-pebbled verrucae on the 5-lobed pedal column
  // and the 54 creamy-ivory radial mesentery striations on the oral disc, lightly tinting the column morph.
  float discMask = smoothstep(0.10, 0.36, coralTipMask);
  vec3 colTarget = mix(uPaletteCrevice, uPaletteBase, smoothstep(0.18, 0.68, texLuma)) * (0.78 + 0.45 * texLuma);
  vec3 discTarget = mix(diffuseColor.rgb, uPaletteTip * (0.75 + 0.35 * texLuma), 0.25);
  vec3 target = mix(colTarget, discTarget, discMask);
  diffuseColor.rgb = mix(diffuseColor.rgb, target, clamp(uPaletteRegrade, 0.0, 1.0));
  float footBlend = smoothstep(-0.024, -0.014, vCoralLocalPos.y);
  diffuseColor.rgb = mix(vec3(0.14, 0.12, 0.24), diffuseColor.rgb, footBlend);
} else {
  diffuseColor.rgb = mix(diffuseColor.rgb, naturalGrad, clamp(uPaletteRegrade, 0.0, 1.0));
  // Blend basal attachment seamlessly into deep actinic indigo rock shadow so no dark saucer rim is visible
  float rockBaseBlend = smoothstep(0.001, 0.018, vCoralLocalPos.y);
  diffuseColor.rgb = mix(vec3(0.14, 0.12, 0.24), diffuseColor.rgb, rockBaseBlend);
}
`,
  )

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>
if (uRoughnessOverride > 0.0) {
  roughnessFactor = uRoughnessOverride;
}
`,
  )

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <normal_fragment_maps>',
    `#include <normal_fragment_maps>
// Velvety micro-polyp normal bump breaks up smooth specular reflections on domes & branches
// (skipped on smooth hydrostat anemone tentacles & verrucose column which carry dedicated Blender normal maps)
float pEps = 0.0025;
float p0 = coralNoise3D(vCoralLocalPos * 210.0);
float px = coralNoise3D((vCoralLocalPos + vec3(pEps, 0.0, 0.0)) * 210.0);
float py = coralNoise3D((vCoralLocalPos + vec3(0.0, pEps, 0.0)) * 210.0);
float pz = coralNoise3D((vCoralLocalPos + vec3(0.0, 0.0, pEps)) * 210.0);
float bumpScale = uAnemoneMode > 0.5 ? 0.03 : 0.28;
normal = normalize(normal - vec3(px - p0, py - p0, pz - p0) * bumpScale);
`,
  )

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <aomap_fragment>',
    `#include <aomap_fragment>
reflectedLight.indirectDiffuse *= coralContactAo;
reflectedLight.indirectSpecular *= coralContactAo * 0.35;
reflectedLight.directSpecular *= 0.28;
reflectedLight.directDiffuse *= coralContactAo;

// Restrained upward-facing reef caustic shimmer (AQ-14.2) was removed in
// AQ-70.6: the shared cellular caustic chunk (caustics.ts, applied to
// coral materials in rebuildHabitat) is now the one caustic system, so the
// scene can never show two disagreeing caustic patterns on the same coral.
float coralRim = pow(1.0 - clamp(dot(normal, normalize(vCoralViewDir)), 0.0, 1.0), 1.85);
vec3 coralSss = diffuseColor.rgb * (0.45 + 0.55 * coralTipMask) * coralRim * uSubsurfaceStrength * coralContactAo;
// AQ-70.6 AC #3: fluorescence stays mask-driven (COLOR_0.g tip mask +
// polyp highlight) and now scales with the fixture's actinic share via
// uActinicLevel; no blanket emissive is added anywhere.
vec3 coralGlow = uFluorescenceTint * pow(max(coralTipMask, polypHighlight * 0.65), 1.35) * (0.40 + 0.60 * coralRim) * uFluorescenceStrength * uActinicLevel * coralContactAo;
totalEmissiveRadiance += coralSss + coralGlow;
`,
  )
}

/**
 * Configures a Three.js `MeshStandardMaterial` for coralline-encrusted porous reef live rock
 * matching the deep actinic indigo/plum/violet reef-rock foundations in the reference photos.
 * Evaluates in 3D meter space `(vRockObjPos, vRockObjNormal)` with zero UV stretching.
 */
export function applyLiveRockMaterial(
  material: THREE.MeshStandardMaterial,
): THREE.MeshStandardMaterial {
  material.vertexColors = false
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.roughness = 0.90
  material.metalness = 0.0

  material.map = null
  material.normalMap = null
  material.roughnessMap = null
  material.metalnessMap = null
  material.aoMap = null
  material.color.set('#ffffff')

  const cacheKey = 'live-rock-3d-aragonite-v1'
  material.customProgramCacheKey = () => cacheKey
  material.onBeforeCompile = shader => {
    shader.vertexShader =
      `
varying vec3 vRockObjPos;
varying vec3 vRockObjNormal;
varying vec3 vRockWorldPos;
` + shader.vertexShader

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vRockObjPos = position.xyz;
vRockObjNormal = normalize(objectNormal.xyz);
vec4 rockWp = modelMatrix * vec4(transformed, 1.0);
vRockWorldPos = rockWp.xyz;
`,
    )

    shader.fragmentShader =
      `
varying vec3 vRockObjPos;
varying vec3 vRockObjNormal;
varying vec3 vRockWorldPos;

float rockHash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

float rockNoise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(rockHash31(i + vec3(0.0, 0.0, 0.0)), rockHash31(i + vec3(1.0, 0.0, 0.0)), u.x),
      mix(rockHash31(i + vec3(0.0, 1.0, 0.0)), rockHash31(i + vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(rockHash31(i + vec3(0.0, 0.0, 1.0)), rockHash31(i + vec3(1.0, 0.0, 1.0)), u.x),
      mix(rockHash31(i + vec3(0.0, 1.0, 1.0)), rockHash31(i + vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

float rockRidged3D(vec3 p) {
  float v = 0.0;
  float a = 0.52;
  float w = 1.0;
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - 2.0 * abs(rockNoise3D(p) - 0.5);
    n = n * n * w;
    w = clamp(n * 1.45, 0.2, 1.0);
    v += a * n;
    p = p * 2.12 + vec3(13.7, -19.3, 27.1);
    a *= 0.5;
  }
  return v / 0.96;
}
` + shader.fragmentShader

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
vec3 rPos = vRockWorldPos * 0.30;
vec3 rNorm = normalize(vRockObjNormal);
vec3 warp = vec3(
  rockNoise3D(rPos * 14.0 + vec3(1.3, 4.7, -2.1)) - 0.5,
  rockNoise3D(rPos * 14.0 + vec3(-3.8, 2.2, 5.4)) - 0.5,
  rockNoise3D(rPos * 14.0 + vec3(6.1, -1.9, 3.3)) - 0.5
) * 0.020;
vec3 wPos = rPos + warp;

float cragRidge = rockRidged3D(wPos * 18.0);
float medCrag = rockRidged3D(wPos * 44.0);
float finePores = rockNoise3D(rPos * 115.0);
float microGrain = rockNoise3D(rPos * 220.0);

float holeField = rockNoise3D(wPos * 34.0) * 0.55 + rockNoise3D(wPos * 78.0) * 0.45;
float vugPit = smoothstep(0.26, 0.58, holeField);
float fissure = smoothstep(0.04, 0.22, abs(rockNoise3D(wPos * 26.0) - 0.5));
float overhangShade = smoothstep(-0.55, 0.48, rNorm.y);
float rockCavityAo = clamp(vugPit * (0.58 + 0.42 * fissure) * (0.42 + 0.58 * overhangShade), 0.12, 1.0);

// Deep actinic-indigo reef shadow + coralline plum/lavender rock (matching 12.23.52 PM)
vec3 cDeepShadow = vec3(0.07, 0.07, 0.16);
vec3 cIndigoCrevice = vec3(0.16, 0.15, 0.30);
vec3 cCarbonateMid = vec3(0.36, 0.33, 0.44);
vec3 cCalcifiedHighlight = vec3(0.66, 0.64, 0.72);

vec3 carbColor = mix(cDeepShadow, cIndigoCrevice, smoothstep(0.12, 0.42, rockCavityAo));
carbColor = mix(carbColor, cCarbonateMid, smoothstep(0.36, 0.72, rockCavityAo * (0.52 + 0.48 * cragRidge)));
float ridgeHighlight = smoothstep(0.58, 0.86, cragRidge * 0.60 + medCrag * 0.40) * smoothstep(0.48, 0.85, rockCavityAo) * smoothstep(0.0, 0.75, rNorm.y);
carbColor = mix(carbColor, cCalcifiedHighlight, ridgeHighlight * 0.68);

float upwardExp = smoothstep(0.05, 0.68, rNorm.y);
float corPatch = rockNoise3D(wPos * 28.0 + vec3(4.2)) * 0.55 + medCrag * 0.45;
float corMask = smoothstep(0.40, 0.66, corPatch) * (0.35 + 0.65 * upwardExp) * smoothstep(0.24, 0.64, rockCavityAo);

vec3 cCorDeepViolet = vec3(0.24, 0.12, 0.34);
vec3 cCorPlumMagenta = vec3(0.44, 0.22, 0.48);
vec3 cCorRosePink = vec3(0.64, 0.40, 0.62);
vec3 corColor = mix(cCorDeepViolet, cCorPlumMagenta, smoothstep(0.30, 0.68, medCrag));
corColor = mix(corColor, cCorRosePink, smoothstep(0.62, 0.88, cragRidge) * 0.70);

// Direct encrusting coral & Ricordea mushroom rock patches on sunlit mid-slope shelves (AQ-95 AC #2 & AQ-101 AC #2)
float encCell = rockNoise3D(wPos * 22.0 + vec3(-3.1, 5.4, 1.8));
float polypBead = smoothstep(0.42, 0.82, rockNoise3D(rPos * 165.0));
float shelfZone = smoothstep(0.36, 0.78, rNorm.y) * smoothstep(0.32, 0.72, rockCavityAo);
float encTealMask = smoothstep(0.65, 0.78, encCell) * shelfZone;
float encGoldMask = smoothstep(0.67, 0.80, 1.0 - encCell) * shelfZone;
vec3 cEncTeal = mix(vec3(0.08, 0.38, 0.36), vec3(0.18, 0.72, 0.58), polypBead);
vec3 cEncGold = mix(vec3(0.48, 0.18, 0.08), vec3(0.86, 0.42, 0.14), polypBead);

vec3 finalRockColor = mix(carbColor, corColor, corMask * 0.82);
finalRockColor = mix(finalRockColor, cEncTeal, encTealMask * 0.76);
finalRockColor = mix(finalRockColor, cEncGold, encGoldMask * 0.74);
finalRockColor *= (0.88 + 0.24 * (0.6 * finePores + 0.4 * microGrain));

diffuseColor.rgb = finalRockColor;
diffuseColor.a = 1.0;
`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
roughnessFactor = mix(0.90, 0.65, corMask * 0.85);
`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
float eps = 0.005;
float h0 = rockRidged3D(wPos * 44.0) * 0.65 + rockNoise3D(rPos * 115.0) * 0.35;
float hx = rockRidged3D((wPos + vec3(eps, 0.0, 0.0)) * 44.0) * 0.65 + rockNoise3D((rPos + vec3(eps, 0.0, 0.0)) * 115.0) * 0.35;
float hy = rockRidged3D((wPos + vec3(0.0, eps, 0.0)) * 44.0) * 0.65 + rockNoise3D((rPos + vec3(0.0, eps, 0.0)) * 115.0) * 0.35;
float hz = rockRidged3D((wPos + vec3(0.0, 0.0, eps)) * 44.0) * 0.65 + rockNoise3D((rPos + vec3(0.0, 0.0, eps)) * 115.0) * 0.35;
vec3 rockBumpGrad = vec3(hx - h0, hy - h0, hz - h0) / eps;
normal = normalize(normal - rockBumpGrad * 0.015);
`,
    )
  }

  material.userData.liveRockShader = 'live-rock-3d-aragonite-v1'
  material.needsUpdate = true
  return material
}

/**
 * Configures a Three.js `MeshStandardMaterial` to consume `COLOR_0` under the
 * `coral-raw-masks-v1` contract without multiplying vertex RGB/alpha into display color.
 */
export function applyCoralRawMaskMaterial(
  material: THREE.MeshStandardMaterial,
  options: CoralMaterialOptions,
): {
  material: THREE.MeshStandardMaterial
  depthMaterial: THREE.MeshDepthMaterial
  uniforms: CoralFlowUniforms
  update(timeSeconds: number, paused?: boolean, reducedMotion?: boolean): void
} {
  const paused = Boolean(options.paused)
  const reducedMotion = Boolean(options.reducedMotion)
  const roleIsSoft = options.role === 'coral-soft' ? 1 : 0

  // Prevent Three.js from treating COLOR_0 as display RGB or vertex opacity.
  material.vertexColors = false
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true

  const pal = options.paletteOverride
  const uniforms: CoralFlowUniforms = {
    uTime: { value: 0 },
    uMotionScale: { value: paused || reducedMotion ? 0 : roleIsSoft },
    uFlowAmplitudeM: { value: options.flowAmplitudeM ?? DEFAULT_FLOW_AMPLITUDE_M },
    uPrimaryFrequencyHz: { value: options.primaryFrequencyHz ?? DEFAULT_PRIMARY_FREQ_HZ },
    uSecondaryFrequencyHz: { value: options.secondaryFrequencyHz ?? DEFAULT_SECONDARY_FREQ_HZ },
    uRoleIsSoft: { value: roleIsSoft },
    uSubsurfaceStrength: { value: pal?.subsurfaceStrength ?? options.subsurfaceStrength ?? (options.role === 'coral-soft' ? 0.38 : 0.28) },
    uFluorescenceStrength: { value: pal?.fluorescenceStrength ?? options.fluorescenceStrength ?? (options.role === 'coral-soft' ? 0.16 : 0.10) },
    uActinicLevel: {
      value:
        options.actinicLevel !== undefined && Number.isFinite(options.actinicLevel)
          ? Math.min(2, Math.max(0, options.actinicLevel))
          : 1,
    },
    uFluorescenceTint: {
      value: new THREE.Color(options.fluorescenceTint ?? (pal?.tipColor ?? (options.role === 'coral-soft' ? '#f0d5e4' : '#e2d4f0'))),
    },
    // AQ-88: saturated healthy-tissue defaults with the regrade on, so a
    // coral without an explicit palette override no longer shows the raw
    // bleached texture. Fluorescence strengths are unchanged (mask-driven).
    uPaletteBase: { value: new THREE.Color(pal?.baseColor ?? CORAL_DEFAULT_PALETTE.baseColor) },
    uPaletteTip: { value: new THREE.Color(pal?.tipColor ?? CORAL_DEFAULT_PALETTE.tipColor) },
    uPaletteCrevice: { value: new THREE.Color(pal?.creviceColor ?? CORAL_DEFAULT_PALETTE.creviceColor) },
    uPaletteRegrade: { value: pal?.regradeStrength ?? CORAL_DEFAULT_REGRADE },
    uRoughnessOverride: { value: pal?.roughness ?? (options.role === 'coral-soft' ? 0.74 : 0.78) },
    uAnemoneMode: { value: options.anemoneMode === 'tentacles' ? 2 : options.anemoneMode === 'column' ? 1 : 0 },
  }

  const cacheKey = `coral-raw-masks-v1:${options.role}`
  material.customProgramCacheKey = () => cacheKey
  material.onBeforeCompile = shader => {
    injectCoralRawMaskShader(shader, uniforms, false)
  }
  material.userData.coralRawMasks = {
    schema: CORAL_RAW_MASK_SCHEMA,
    role: options.role,
    flexibilityExponent: CORAL_FLEXIBILITY_EXPONENT,
    uniforms,
  }
  material.needsUpdate = true

  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
  })
  depthMaterial.customProgramCacheKey = () => `${cacheKey}:depth`
  depthMaterial.onBeforeCompile = shader => {
    injectCoralRawMaskShader(shader, uniforms, true)
  }

  return {
    material,
    depthMaterial,
    uniforms,
    update(timeSeconds: number, isPaused = false, isReducedMotion = false) {
      if (Number.isFinite(timeSeconds) && timeSeconds >= 0) {
        uniforms.uTime.value = timeSeconds % 3600
      }
      uniforms.uMotionScale.value = isPaused || isReducedMotion ? 0 : roleIsSoft
    },
  }
}
