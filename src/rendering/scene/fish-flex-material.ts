import * as THREE from 'three'
import {
  advanceFishFlexTime,
  evaluateLighthillFlexParams,
  flexPhaseForInstance,
  type FishFlexGaitParams,
  type FishFlexInput,
  type FishFlexValues,
} from './fish-body-flex'
import { SPECIES_BEHAVIOR_IDS, type SpeciesBehaviorId } from '../../lib/fish-behavior'
import { SPECIES_LOCOMOTION_SIGNATURES } from './species-locomotion-extensions'

/**
 * GPU vertex flex & buccal-opercular articulation for fish (AQ-12 / AQ-49 / AQ-74).
 *
 * A post-skinning `onBeforeCompile` patch on each fish's `SkinnedMesh`
 * material displaces vertices laterally (object-space X) with the
 * Lighthill travelling wave from `fish-body-flex.ts`, plus natural
 * swim-synchronized operculum (gill-cover) abduction and mandibular
 * lower-jaw hinge opening (AQ-74 AC #2 & #3).
 */

export type FishFlexUniforms = {
  uFlexTime: { value: number }
  uFlexFrequencyHz: { value: number }
  uFlexWaveNumber: { value: number }
  uFlexTailAmplitude: { value: number }
  uFlexEnvelopeA: { value: number }
  uFlexEnvelopeP: { value: number }
  uFlexPhase: { value: number }
  uFlexSnoutZ: { value: number }
  uFlexTailZ: { value: number }
  uFlexBodyLength: { value: number }
  uFlexBodyHalfHeight: { value: number }
  uFlexFinRippleAmp: { value: number }
  uFlexGillAmplitude: { value: number }
  uFlexMouthAmplitude: { value: number }
  uFlexEnabled: { value: number }
}

export type FishFlexBinding = Readonly<{
  /** Object-space body length (z-extent) the amplitudes are scaled by. */
  bodyLength: number
  /** Deterministic per-instance wave phase, in [0, 2π). */
  phaseRad: number
  /** Current accumulated simulation time driving the wave. */
  flexTimeSeconds: number
  /**
   * Updates uniforms from the evaluated gait values. `dtSeconds` is raw
   * simulation time (1/60 s per step); `dt <= 0` freezes the phase, and
   * `reducedMotion` neutralises the amplitude to zero.
   */
  update(values: FishFlexValues, dtSeconds: number, reducedMotion: boolean): void
  /** Sets a deterministic absolute scene time while preserving the base phase. */
  seek(timeSeconds: number): void
  /** Prepare the current post-skinning shader displacement once per mesh/frame
   * for caption projection. Unbound meshes need no deformation callback. */
  vertexDeformerFor(mesh: THREE.Mesh): ((position: THREE.Vector3) => void) | undefined
  /** Disposes the cloned materials and restores the originals. */
  dispose(): void
}>

const FLEX_PROGRAM_CACHE_KEY = 'fish-flex-v1'

/** CPU counterpart of FLEX_VERTEX_DISPLACEMENT. Preparing once per mesh keeps
 * uniform reads and the frame-constant respiratory trig out of the vertex loop.
 * This is screen geometry, not a navigation/body-envelope proof. */
function prepareFishFlexVertex(u: FishFlexUniforms): ((position: THREE.Vector3) => void) | undefined {
  const enabled = u.uFlexEnabled.value
  if (!enabled) return undefined
  const smooth = THREE.MathUtils.smoothstep
  const snout = u.uFlexSnoutZ.value, length = u.uFlexBodyLength.value, halfHeight = u.uFlexBodyHalfHeight.value
  const tail = u.uFlexTailAmplitude.value, envelopeA = u.uFlexEnvelopeA.value, envelopeP = u.uFlexEnvelopeP.value
  const waveNumber = u.uFlexWaveNumber.value, finAmplitude = u.uFlexFinRippleAmp.value
  const resp = 2 * Math.PI * u.uFlexFrequencyHz.value * u.uFlexTime.value - u.uFlexPhase.value
  const gillPulse = u.uFlexGillAmplitude.value * (.5 - .5 * Math.cos(resp - 1.57079632679))
  const mouthPulse = u.uFlexMouthAmplitude.value * (.5 - .5 * Math.cos(resp))
  return position => {
    const s = THREE.MathUtils.clamp((snout - position.z) / length, 0, 1)
    const env = tail * (envelopeA + (1 - envelopeA) * Math.pow(s, envelopeP))
    const phase = waveNumber * s - resp
    const yNorm = position.y / halfHeight
    // These are exact zero regions of the shader masks, not vertex sampling.
    const fin = finAmplitude && Math.abs(yNorm) > .55
      ? finAmplitude * smooth(Math.abs(yNorm), .55, .95) * Math.sin(phase - 1.57079632679) : 0
    const gill = gillPulse && s > .14 && s < .29 && Math.abs(yNorm + .10) < .52
      ? (position.x >= 0 ? 1 : -1) * gillPulse * smooth(s, .14, .20) * (1 - smooth(s, .23, .29)) * (1 - smooth(Math.abs(yNorm + .10), .20, .52)) : 0
    const mouth = mouthPulse && s < .075 && yNorm > -.48 && yNorm < .02
      ? mouthPulse * (1 - smooth(s, .015, .075)) * smooth(yNorm, -.48, -.06) * (1 - smooth(yNorm, -.03, .02)) : 0
    position.x += ((env ? env * Math.sin(phase) : 0) + fin + gill) * enabled
    position.y -= mouth * enabled
    position.z -= mouth * .35 * enabled
  }
}

export function evaluateFishFlexVertex(position: THREE.Vector3, uniforms: FishFlexUniforms): void {
  prepareFishFlexVertex(uniforms)?.(position)
}

const FLEX_VERTEX_PRELUDE = `
uniform float uFlexTime;
uniform float uFlexFrequencyHz;
uniform float uFlexWaveNumber;
uniform float uFlexTailAmplitude;
uniform float uFlexEnvelopeA;
uniform float uFlexEnvelopeP;
uniform float uFlexPhase;
uniform float uFlexSnoutZ;
uniform float uFlexTailZ;
uniform float uFlexBodyLength;
uniform float uFlexBodyHalfHeight;
uniform float uFlexFinRippleAmp;
uniform float uFlexGillAmplitude;
uniform float uFlexMouthAmplitude;
uniform float uFlexEnabled;
`

const FLEX_VERTEX_DISPLACEMENT = `
{
  float flexS = clamp((uFlexSnoutZ - transformed.z) / uFlexBodyLength, 0.0, 1.0);
  float flexEnv = uFlexTailAmplitude * (uFlexEnvelopeA + (1.0 - uFlexEnvelopeA) * pow(flexS, uFlexEnvelopeP));
  float flexPhase = uFlexWaveNumber * flexS - 6.283185307179586 * uFlexFrequencyHz * uFlexTime + uFlexPhase;
  float flexWave = flexEnv * sin(flexPhase);
  float flexYNorm = transformed.y / uFlexBodyHalfHeight;
  float flexFinMask = smoothstep(0.55, 0.95, abs(flexYNorm));
  float flexFin = uFlexFinRippleAmp * flexFinMask * sin(flexPhase - 1.57079632679);

  // AQ-74 buccal-opercular ventilation synchronized to the swim cycle:
  // Mouth inhalation (mandibular hinge opening) leads operculum lateral abduction by 90 deg (pi/2).
  float flexRespPhase = 6.283185307179586 * uFlexFrequencyHz * uFlexTime - uFlexPhase;
  float flexGillMask = smoothstep(0.14, 0.20, flexS) * (1.0 - smoothstep(0.23, 0.29, flexS))
    * (1.0 - smoothstep(0.20, 0.52, abs(flexYNorm + 0.10)));
  float flexGillPulse = 0.5 - 0.5 * cos(flexRespPhase - 1.57079632679);
  float flexSideSign = transformed.x >= 0.0 ? 1.0 : -1.0;
  float flexGill = flexSideSign * uFlexGillAmplitude * flexGillMask * flexGillPulse;

  float flexMouthMask = (1.0 - smoothstep(0.015, 0.075, flexS))
    * smoothstep(-0.48, -0.06, flexYNorm) * (1.0 - smoothstep(-0.03, 0.02, flexYNorm));
  float flexMouthPulse = 0.5 - 0.5 * cos(flexRespPhase);
  float flexMouth = uFlexMouthAmplitude * flexMouthMask * flexMouthPulse;

  transformed.x += (flexWave + flexFin + flexGill) * uFlexEnabled;
  transformed.y -= flexMouth * uFlexEnabled;
  transformed.z -= flexMouth * 0.35 * uFlexEnabled;
}
`

export function patchFishFlexShader(
  shader: { vertexShader: string; uniforms: Record<string, unknown> },
  uniforms: FishFlexUniforms,
): boolean {
  if (!shader.vertexShader.includes('#include <skinning_vertex>')) return false
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = FLEX_VERTEX_PRELUDE + shader.vertexShader
  shader.vertexShader = shader.vertexShader.replace(
    '#include <skinning_vertex>',
    `#include <skinning_vertex>\n${FLEX_VERTEX_DISPLACEMENT}`,
  )
  return true
}

function getFlexGait(speciesId: string): FishFlexGaitParams | undefined {
  if (!(SPECIES_BEHAVIOR_IDS as readonly string[]).includes(speciesId)) return undefined
  return SPECIES_LOCOMOTION_SIGNATURES[speciesId as SpeciesBehaviorId].gait
}

function createFlexUniforms(
  gait: FishFlexGaitParams,
  snoutZ: number,
  tailZ: number,
  bodyLength: number,
  bodyHalfHeight: number,
  phaseRad: number,
): FishFlexUniforms {
  return {
    uFlexTime: { value: 0 },
    uFlexFrequencyHz: { value: gait.fCruiseHz },
    uFlexWaveNumber: { value: (Math.PI * 2) / Math.max(0.1, gait.wavelengthBL) },
    uFlexTailAmplitude: { value: 0 },
    uFlexEnvelopeA: { value: gait.envelopeA },
    uFlexEnvelopeP: { value: gait.envelopeP },
    uFlexPhase: { value: phaseRad },
    uFlexSnoutZ: { value: snoutZ },
    uFlexTailZ: { value: tailZ },
    uFlexBodyLength: { value: bodyLength },
    uFlexBodyHalfHeight: { value: Math.max(1e-6, bodyHalfHeight) },
    uFlexFinRippleAmp: { value: 0 },
    uFlexGillAmplitude: { value: 0 },
    uFlexMouthAmplitude: { value: 0 },
    uFlexEnabled: { value: 1 },
  }
}

type FlexMeshRecord = {
  mesh: THREE.SkinnedMesh
  originalMaterial: THREE.Material | THREE.Material[]
  clonedMaterial: THREE.MeshStandardMaterial
}

export function bindFishFlexToModel(
  root: THREE.Object3D,
  speciesId: string,
  instanceSeed: number,
): FishFlexBinding | undefined {
  const gait = getFlexGait(speciesId)
  if (!gait) return undefined
  const skinned: THREE.SkinnedMesh[] = []
  root.traverse(object => {
    if (object instanceof THREE.SkinnedMesh) skinned.push(object)
  })
  if (skinned.length === 0) return undefined

  let minZ = Infinity
  let maxZ = -Infinity
  let maxAbsY = 0
  for (const mesh of skinned) {
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    if (!box) return undefined
    minZ = Math.min(minZ, box.min.z)
    maxZ = Math.max(maxZ, box.max.z)
    maxAbsY = Math.max(maxAbsY, Math.abs(box.min.y), Math.abs(box.max.y))
  }
  const bodyLength = maxZ - minZ
  if (!Number.isFinite(bodyLength) || bodyLength <= 0) return undefined

  const phaseRad = flexPhaseForInstance(instanceSeed)
  const uniforms = createFlexUniforms(gait, maxZ, minZ, bodyLength, maxAbsY, phaseRad)
  const records: FlexMeshRecord[] = []
  for (const mesh of skinned) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const standardIndex = materials.findIndex(
      (material): material is THREE.MeshStandardMaterial =>
        material instanceof THREE.MeshStandardMaterial,
    )
    if (standardIndex < 0) continue
    const standard = materials[standardIndex] as THREE.MeshStandardMaterial
    const cloned = standard.clone()
    cloned.customProgramCacheKey = () => FLEX_PROGRAM_CACHE_KEY
    cloned.onBeforeCompile = shader => {
      patchFishFlexShader(shader, uniforms)
    }
    const originalMaterial = mesh.material
    mesh.material = Array.isArray(mesh.material)
      ? materials.map((material, index) => (index === standardIndex ? cloned : material))
      : cloned
    records.push({ mesh, originalMaterial, clonedMaterial: cloned })
  }
  if (records.length === 0) return undefined
  const boundMeshes = new Set<THREE.Mesh>(records.map(record => record.mesh))

  const TWO_PI = Math.PI * 2
  let flexTimeSeconds = 0
  let accumulatedWavePhaseRad = 0
  let currentTailAmp = 0
  let currentFinAmp = 0
  let currentGillAmp = 0
  let currentMouthAmp = 0
  let disposed = false
  return Object.freeze({
    bodyLength,
    phaseRad,
    get flexTimeSeconds() {
      return flexTimeSeconds
    },
    update(values: FishFlexValues, dtSeconds: number, reducedMotion: boolean): void {
      if (disposed) return
      const prevTimeSeconds = flexTimeSeconds
      flexTimeSeconds = advanceFishFlexTime(flexTimeSeconds, reducedMotion ? 0 : dtSeconds)
      const stepDt = flexTimeSeconds - prevTimeSeconds
      accumulatedWavePhaseRad =
        (accumulatedWavePhaseRad + TWO_PI * values.frequencyHz * stepDt) % TWO_PI
      uniforms.uFlexTime.value = flexTimeSeconds
      uniforms.uFlexFrequencyHz.value = values.frequencyHz
      uniforms.uFlexWaveNumber.value = values.waveNumber
      const targetPhase =
        phaseRad +
        ((TWO_PI * values.frequencyHz * flexTimeSeconds - accumulatedWavePhaseRad) % TWO_PI)
      uniforms.uFlexPhase.value = ((targetPhase % TWO_PI) + TWO_PI) % TWO_PI
      const ampBlend = reducedMotion ? 1 : Math.min(1, stepDt * 6.0)
      const amplitudeScale = reducedMotion ? 0 : values.amplitudeScale
      const targetTailAmp = values.tailAmplitudeBL * amplitudeScale * bodyLength
      const targetFinAmp = reducedMotion ? 0 : values.finRippleAmpBL * amplitudeScale * bodyLength
      const respEffort =
        0.45 + 0.55 * Math.min(1, Math.max(0, values.frequencyHz / 2.2))
      const targetGillAmp = reducedMotion ? 0 : 0.0042 * respEffort * amplitudeScale * bodyLength
      const targetMouthAmp = reducedMotion ? 0 : 0.0038 * respEffort * amplitudeScale * bodyLength
      currentTailAmp += (targetTailAmp - currentTailAmp) * ampBlend
      currentFinAmp += (targetFinAmp - currentFinAmp) * ampBlend
      currentGillAmp += (targetGillAmp - currentGillAmp) * ampBlend
      currentMouthAmp += (targetMouthAmp - currentMouthAmp) * ampBlend
      uniforms.uFlexTailAmplitude.value = currentTailAmp
      uniforms.uFlexFinRippleAmp.value = currentFinAmp
      uniforms.uFlexGillAmplitude.value = currentGillAmp
      uniforms.uFlexMouthAmplitude.value = currentMouthAmp
      uniforms.uFlexEnabled.value = reducedMotion ? 0 : 1
    },
    seek(timeSeconds: number): void {
      if (disposed) return
      if (!Number.isFinite(timeSeconds) || timeSeconds < 0) throw new RangeError('Fish flex seek time must be finite and nonnegative.')
      flexTimeSeconds = timeSeconds
      accumulatedWavePhaseRad = (TWO_PI * uniforms.uFlexFrequencyHz.value * timeSeconds) % TWO_PI
      uniforms.uFlexTime.value = timeSeconds
      uniforms.uFlexPhase.value = phaseRad
      currentTailAmp = uniforms.uFlexTailAmplitude.value
      currentFinAmp = uniforms.uFlexFinRippleAmp.value
      currentGillAmp = uniforms.uFlexGillAmplitude.value
      currentMouthAmp = uniforms.uFlexMouthAmplitude.value
    },
    vertexDeformerFor(mesh: THREE.Mesh): ((position: THREE.Vector3) => void) | undefined {
      return !disposed && boundMeshes.has(mesh) ? prepareFishFlexVertex(uniforms) : undefined
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      for (const record of records) {
        record.mesh.material = record.originalMaterial
        record.clonedMaterial.dispose()
      }
    },
  })
}

export function updateFishFlex(
  binding: FishFlexBinding,
  speciesId: string,
  input: FishFlexInput,
  dtSeconds: number,
  reducedMotion: boolean,
): void {
  const gait = getFlexGait(speciesId)
  if (!gait) return
  binding.update(evaluateLighthillFlexParams(gait, input), dtSeconds, reducedMotion)
}
