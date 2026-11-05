import * as THREE from 'three'

export const CORAL_RAW_MASK_SCHEMA = 'coral-raw-masks-v1' as const
export const CORAL_FLEXIBILITY_EXPONENT = 1.8 as const

export type CoralPrimitiveRole = 'coral-rigid' | 'coral-soft'

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
}

export type CoralMaterialOptions = {
  role: CoralPrimitiveRole
  flowAmplitudeM?: number
  primaryFrequencyHz?: number
  secondaryFrequencyHz?: number
  subsurfaceStrength?: number
  fluorescenceStrength?: number
  fluorescenceTint?: THREE.ColorRepresentation
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

/**
 * Deterministic CPU reference for 3D isotropic live-rock surface shading (`applyLiveRockMaterial`).
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

  const macro =
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
  const corallineField = 0.55 * macro + 0.45 * upwardExposure
  const corallineMask = smoothstep(0.52, 0.74, corallineField) * upwardExposure * smoothstep(0.3, 0.65, cavityAo)

  // Warm porous cured Fiji/Marco aragonite limestone vs crustose coralline algae plaques
  const carbR = (0.34 + 0.36 * macro) * cavityAo
  const carbG = (0.30 + 0.33 * macro) * cavityAo
  const carbB = (0.25 + 0.27 * macro) * cavityAo

  const corR = 0.46 + 0.22 * macro
  const corG = 0.16 + 0.14 * macro
  const corB = 0.36 + 0.18 * macro

  const r = Math.min(1, Math.max(0, carbR * (1 - corallineMask) + corR * corallineMask))
  const g = Math.min(1, Math.max(0, carbG * (1 - corallineMask) + corG * corallineMask))
  const b = Math.min(1, Math.max(0, carbB * (1 - corallineMask) + corB * corallineMask))
  const roughness = 0.90 * (1 - corallineMask * 0.85) + 0.65 * (corallineMask * 0.85)

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
  const swayY = -0.18 * (Math.abs(swayX) + Math.abs(swayZ)) * flexibilityWeight

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
uniform float uSubsurfaceStrength;
uniform float uFluorescenceStrength;
uniform vec3 uFluorescenceTint;
varying vec4 vCoralMask;
varying vec3 vCoralViewDir;
` + shader.fragmentShader

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `#include <color_fragment>
// COLOR_0 is a raw 4-channel mask (coral-raw-masks-v1), never display RGB or opacity.
diffuseColor.a = 1.0;
float coralContactAo = mix(0.28, 1.0, clamp(vCoralMask.a, 0.0, 1.0));
diffuseColor.rgb *= mix(0.62, 1.0, clamp(vCoralMask.a, 0.0, 1.0));
`,
  )

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <aomap_fragment>',
    `#include <aomap_fragment>
reflectedLight.indirectDiffuse *= coralContactAo;
reflectedLight.indirectSpecular *= coralContactAo;
reflectedLight.directDiffuse *= mix(0.75, 1.0, coralContactAo);
float coralRim = pow(1.0 - clamp(dot(normal, normalize(vCoralViewDir)), 0.0, 1.0), 2.1);
float coralTipMask = clamp(vCoralMask.g, 0.0, 1.0);
vec3 coralSss = diffuseColor.rgb * (0.35 + 0.65 * coralTipMask) * coralRim * uSubsurfaceStrength * coralContactAo;
vec3 coralGlow = uFluorescenceTint * pow(coralTipMask, 1.35) * (0.4 + 0.6 * coralRim) * uFluorescenceStrength * coralContactAo;
totalEmissiveRadiance += coralSss + coralGlow;
`,
  )
}

/**
 * Configures a Three.js `MeshStandardMaterial` for bare aragonite live-rock foundations
 * (`live-rock-island-left.glb`, `live-rock-island-right.glb`).
 * Evaluates porous calcium carbonate rock, vug/fissure cavities, 3D micro-bump normals,
 * and upward-facing crustose coralline algae plaques directly in 3D canonical meter space
 * `(vRockObjPos, vRockObjNormal)` so steep vertical cliffs have zero UV stretching or vertical streaks.
 */
export function applyLiveRockMaterial(
  material: THREE.MeshStandardMaterial,
): THREE.MeshStandardMaterial {
  material.vertexColors = false
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.roughness = 0.88
  material.metalness = 0.0

  // Detach any stretched 2D UV maps so the 3D object-space shader controls surface detail cleanly
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
` + shader.vertexShader

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vRockObjPos = position.xyz;
vRockObjNormal = normalize(objectNormal.xyz);
`,
    )

    shader.fragmentShader =
      `
varying vec3 vRockObjPos;
varying vec3 vRockObjNormal;

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

float rockFbm3D(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * rockNoise3D(p); p = p * 2.07 + vec3(17.3, -9.1, 13.7); a *= 0.5;
  v += a * rockNoise3D(p); p = p * 2.11 + vec3(-11.4, 23.5, -7.9); a *= 0.5;
  v += a * rockNoise3D(p);
  return v / 0.875;
}
` + shader.fragmentShader

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
vec3 rPos = vRockObjPos;
vec3 rNorm = normalize(vRockObjNormal);
vec3 warp = vec3(
  rockNoise3D(rPos * 7.5 + vec3(1.3, 4.7, -2.1)) - 0.5,
  rockNoise3D(rPos * 7.5 + vec3(-3.8, 2.2, 5.4)) - 0.5,
  rockNoise3D(rPos * 7.5 + vec3(6.1, -1.9, 3.3)) - 0.5
) * 0.024;
vec3 wPos = rPos + warp;

float macroCrag = rockFbm3D(wPos * 9.5);
float medGrain = rockFbm3D(wPos * 26.0);
float finePores = rockNoise3D(rPos * 88.0);
float vugPit = smoothstep(0.24, 0.62, rockNoise3D(wPos * 38.0) * 0.65 + finePores * 0.35);
float fissure = smoothstep(0.03, 0.20, abs(rockNoise3D(wPos * 18.0) - 0.5));
float rockCavityAo = clamp(vugPit * (0.65 + 0.35 * fissure) * (0.76 + 0.24 * smoothstep(-0.3, 0.65, rNorm.y)), 0.34, 1.0);

// Warm porous cured aragonite carbonate palette (no black/magenta zebra streaks)
vec3 cPoreShadow = vec3(0.27, 0.24, 0.19);
vec3 cCarbonateMid = vec3(0.52, 0.47, 0.39);
vec3 cAragoniteSun = vec3(0.74, 0.69, 0.59);
vec3 cBenthicFilm = vec3(0.39, 0.40, 0.28);

vec3 carbColor = mix(cPoreShadow, cCarbonateMid, smoothstep(0.30, 0.64, rockCavityAo));
carbColor = mix(carbColor, cAragoniteSun, smoothstep(0.42, 0.84, macroCrag * 0.6 + medGrain * 0.4) * rockCavityAo);
float oliveFilm = (1.0 - smoothstep(0.04, 0.22, rPos.y)) * smoothstep(0.25, 0.78, medGrain) * 0.30;
carbColor = mix(carbColor, cBenthicFilm, oliveFilm);

// Crustose coralline algae plaques weighted by upward surface normal (rNorm.y) and elevation
float upwardExp = smoothstep(0.18, 0.68, rNorm.y) * smoothstep(0.03, 0.22, rPos.y);
float corPatchField = 0.50 * medGrain + 0.50 * rockNoise3D(wPos * 15.5 + vec3(4.2)) + 0.26 * upwardExp;
float corMask = smoothstep(0.50, 0.68, corPatchField) * smoothstep(0.34, 0.62, rockCavityAo);

vec3 cCorDeep = vec3(0.35, 0.12, 0.28);
vec3 cCorMagenta = vec3(0.56, 0.21, 0.43);
vec3 cCorLavender = vec3(0.72, 0.39, 0.59);
vec3 cCorMargin = vec3(0.87, 0.71, 0.81);

vec3 corColor = mix(cCorDeep, cCorMagenta, smoothstep(0.28, 0.66, medGrain));
corColor = mix(corColor, cCorLavender, smoothstep(0.58, 0.85, macroCrag));
float plaqueRim = exp(-pow((corPatchField - 0.56) / 0.028, 2.0)) * upwardExp;
corColor = mix(corColor, cCorMargin, plaqueRim * 0.60);

vec3 finalRockColor = mix(carbColor, corColor, corMask * 0.85) * (0.90 + 0.20 * finePores);
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
vec3 rockBumpGrad = vec3(
  rockNoise3D(rPos * 68.0 + vec3(0.01, 0.0, 0.0)) - rockNoise3D(rPos * 68.0 - vec3(0.01, 0.0, 0.0)),
  rockNoise3D(rPos * 68.0 + vec3(0.0, 0.01, 0.0)) - rockNoise3D(rPos * 68.0 - vec3(0.0, 0.01, 0.0)),
  rockNoise3D(rPos * 68.0 + vec3(0.0, 0.0, 0.01)) - rockNoise3D(rPos * 68.0 - vec3(0.0, 0.0, 0.01))
);
normal = normalize(normal + rockBumpGrad * 0.22);
`,
    )
  }

  material.userData.liveRockShader = cacheKey
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

  const uniforms: CoralFlowUniforms = {
    uTime: { value: 0 },
    uMotionScale: { value: paused || reducedMotion ? 0 : roleIsSoft },
    uFlowAmplitudeM: { value: options.flowAmplitudeM ?? DEFAULT_FLOW_AMPLITUDE_M },
    uPrimaryFrequencyHz: { value: options.primaryFrequencyHz ?? DEFAULT_PRIMARY_FREQ_HZ },
    uSecondaryFrequencyHz: { value: options.secondaryFrequencyHz ?? DEFAULT_SECONDARY_FREQ_HZ },
    uRoleIsSoft: { value: roleIsSoft },
    uSubsurfaceStrength: { value: options.subsurfaceStrength ?? (options.role === 'coral-soft' ? 0.34 : 0.24) },
    uFluorescenceStrength: { value: options.fluorescenceStrength ?? (options.role === 'coral-soft' ? 0.18 : 0.08) },
    uFluorescenceTint: {
      value: new THREE.Color(options.fluorescenceTint ?? (options.role === 'coral-soft' ? '#4df5a5' : '#9be8ff')),
    },
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
