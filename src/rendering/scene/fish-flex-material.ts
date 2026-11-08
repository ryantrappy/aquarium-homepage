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
 * GPU vertex flex for fish (AQ-12 / AQ-49, tracker #8).
 *
 * A post-skinning `onBeforeCompile` patch on each fish's `SkinnedMesh`
 * material displaces vertices laterally (object-space X) with the
 * Lighthill travelling wave from `fish-body-flex.ts`:
 *
 *   y(s, t) = A_tail * (a + (1-a) * s^p) * sin(k*s - ω*t + φ)
 *
 * where s ∈ [0, 1] is the normalised body coordinate, snout (object-space
 * +Z, measured from the mesh bounding box) → tail (−Z). The long axis is Z
 * and the lateral axis is X on every runtime asset: the spine chain runs
 * spine_0 (z ≈ +1) → spine_5 (z ≈ −0.8) and the mesh z-extent is ≈ 2.0
 * units, versus ≈ 0.3–0.6 in X and ≈ 0.9–1.4 in Y. Root must still verify
 * the axis/sign on the real assets at visual review — a wrong axis would
 * read as roll instead of lateral undulation.
 *
 * Vertex density is the known risk: the proof clownfish has only ~950
 * vertices (~35–165 per 0.2-body-length slice), so its wave is coarse;
 * the splat-fish GLBs are denser (3.6k–9.8k verts). The displacement is
 * continuous in s, so a coarse mesh reads as a smooth bend rather than a
 * kink, but a subdivision / re-export decision is out of scope here.
 *
 * Dorsal/anal fins: NO dorsal/anal fin bones are bound anywhere in the
 * repo (only spine_* and pectoral_L/R), so no fin bone names are invented.
 * The median-fin ripple below is a shader-mask FALLBACK: vertices above /
 * below the body midline ripple with a quarter-cycle lag, amplitude
 * falling to zero at the fin base so the fin cannot detach from the body.
 * It is off (amplitude 0) for every species except the angelfish /
 * butterflyfish, whose gait table enables a small ripple.
 *
 * One cloned material per fish instance (uniforms are per-fish: phase,
 * frequency, amplitude). The shared program is reused via a fixed
 * `customProgramCacheKey`. The original shared materials from the model
 * bases are never mutated and are restored on dispose.
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
  /** Disposes the cloned materials and restores the originals. */
  dispose(): void
}>

const FLEX_PROGRAM_CACHE_KEY = 'fish-flex-v1'

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
uniform float uFlexEnabled;
`

const FLEX_VERTEX_DISPLACEMENT = `
{
  float flexS = clamp((uFlexSnoutZ - transformed.z) / uFlexBodyLength, 0.0, 1.0);
  float flexEnv = uFlexTailAmplitude * (uFlexEnvelopeA + (1.0 - uFlexEnvelopeA) * pow(flexS, uFlexEnvelopeP));
  float flexPhase = uFlexWaveNumber * flexS - 6.283185307179586 * uFlexFrequencyHz * uFlexTime + uFlexPhase;
  float flexWave = flexEnv * sin(flexPhase);
  float flexFinMask = smoothstep(0.55, 0.95, abs(transformed.y) / uFlexBodyHalfHeight);
  float flexFin = uFlexFinRippleAmp * flexFinMask * sin(flexPhase - 1.57079632679);
  transformed.x += (flexWave + flexFin) * uFlexEnabled;
}
`

/**
 * Applies the flex patch to a compiled shader. Exported for tests: feeds
 * it `THREE.ShaderLib.standard.vertexShader` and asserts the injection
 * lands after `#include <skinning_vertex>`. Returns false (shader left
 * unchanged) when the skinning include is absent — displacement must never
 * be applied before skinning, where the bone matrices would rotate it.
 */
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
    uFlexEnabled: { value: 1 },
  }
}

type FlexMeshRecord = {
  mesh: THREE.SkinnedMesh
  originalMaterial: THREE.Material | THREE.Material[]
  clonedMaterial: THREE.MeshStandardMaterial
}

/**
 * Binds body flex to a cloned fish model root. Clones every
 * `MeshStandardMaterial` on its skinned meshes (one per fish instance),
 * measures the body from the mesh bounding boxes, and returns a binding
 * whose `update` drives the shared per-fish uniforms.
 *
 * Returns undefined (fish keeps its bone-only animation) when the model
 * has no skinned mesh with a standard material, or when the measured body
 * length is degenerate. Never throws for a missing/odd model — the caller
 * logs and continues without flex.
 */
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
    // Clone only the standard material; any other material slots on the
    // mesh are preserved untouched.
    const originalMaterial = mesh.material
    mesh.material = Array.isArray(mesh.material)
      ? materials.map((material, index) => (index === standardIndex ? cloned : material))
      : cloned
    records.push({ mesh, originalMaterial, clonedMaterial: cloned })
  }
  if (records.length === 0) return undefined

  const TWO_PI = Math.PI * 2
  let flexTimeSeconds = 0
  let accumulatedWavePhaseRad = 0
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
      // Compensate uFlexPhase so that `2π * uFlexFrequencyHz * uFlexTime - uFlexPhase`
      // equals `accumulatedWavePhaseRad - phaseRad`, preserving C0 phase continuity
      // whenever `values.frequencyHz` changes with speed or swim state.
      const targetPhase =
        phaseRad +
        ((TWO_PI * values.frequencyHz * flexTimeSeconds - accumulatedWavePhaseRad) % TWO_PI)
      uniforms.uFlexPhase.value = ((targetPhase % TWO_PI) + TWO_PI) % TWO_PI
      const amplitudeScale = reducedMotion ? 0 : values.amplitudeScale
      uniforms.uFlexTailAmplitude.value =
        values.tailAmplitudeBL * amplitudeScale * bodyLength
      uniforms.uFlexFinRippleAmp.value = reducedMotion
        ? 0
        : values.finRippleAmpBL * amplitudeScale * bodyLength
      uniforms.uFlexEnabled.value = reducedMotion ? 0 : 1
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

/** Convenience: evaluates the gait and updates a binding for one frame. */
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
