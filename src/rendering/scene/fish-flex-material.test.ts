import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { evaluateLighthillFlexParams } from './fish-body-flex'
import {
  bindFishFlexToModel,
  patchFishFlexShader,
  updateFishFlex,
} from './fish-flex-material'
import { SPECIES_LOCOMOTION_SIGNATURES } from './species-locomotion-extensions'

function makeSkinnedFish(): { root: THREE.Group; mesh: THREE.SkinnedMesh; material: THREE.MeshStandardMaterial } {
  // Minimal skinned fish: long axis Z (snout +Z → tail −Z), lateral X.
  const geometry = new THREE.BoxGeometry(0.4, 0.6, 2)
  const material = new THREE.MeshStandardMaterial({ color: '#ff8800' })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  const bones: THREE.Bone[] = []
  let parent: THREE.Object3D = mesh
  for (let i = 0; i < 6; i++) {
    const bone = new THREE.Bone()
    bone.name = `spine_${i}`
    bone.position.set(0, i === 0 ? 0 : 0.3, i === 0 ? 1 : 0)
    parent.add(bone)
    bones.push(bone)
    parent = bone
  }
  const skeleton = new THREE.Skeleton(bones)
  mesh.add(bones[0])
  mesh.bind(skeleton)
  const root = new THREE.Group()
  root.add(mesh)
  return { root, mesh, material }
}

const swimInput = {
  speedNorm: 1,
  state: 'swim' as const,
  maneuverStage: 'none' as const,
  startleSeconds: 0,
}

describe('fish flex material (AQ-12 / AQ-49)', () => {
  it('injects the travelling-wave displacement after skinning, never before it', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      uniforms: {},
    }
    const uniforms = {
      uFlexTime: { value: 0 },
      uFlexFrequencyHz: { value: 1.6 },
      uFlexWaveNumber: { value: 6.98 },
      uFlexTailAmplitude: { value: 0.1 },
      uFlexEnvelopeA: { value: 0.1 },
      uFlexEnvelopeP: { value: 2 },
      uFlexPhase: { value: 0.5 },
      uFlexSnoutZ: { value: 1 },
      uFlexTailZ: { value: -1 },
      uFlexBodyLength: { value: 2 },
      uFlexBodyHalfHeight: { value: 0.3 },
      uFlexFinRippleAmp: { value: 0 },
      uFlexEnabled: { value: 1 },
    }
    expect(patchFishFlexShader(shader, uniforms)).toBe(true)
    expect(shader.vertexShader).toContain('uniform float uFlexTime;')
    expect(shader.vertexShader).toContain('transformed.x += (flexWave + flexFin) * uFlexEnabled;')
    const skinningIndex = shader.vertexShader.indexOf('#include <skinning_vertex>')
    const displacementIndex = shader.vertexShader.indexOf('flexS = clamp((uFlexSnoutZ - transformed.z)')
    expect(skinningIndex).toBeGreaterThan(-1)
    expect(displacementIndex).toBeGreaterThan(skinningIndex)
    // The wave is lateral (X) and posterior-weighted; it never moves the snout.
    expect(shader.vertexShader).toContain('uFlexSnoutZ - transformed.z')
  })

  it('leaves a shader without a skinning include unchanged', () => {
    const shader = { vertexShader: 'void main() {}', uniforms: {} }
    expect(patchFishFlexShader(shader, { uFlexTime: { value: 0 } } as never)).toBe(false)
    expect(shader.vertexShader).toBe('void main() {}')
  })

  it('clones the material per fish, measures the body, and restores the original on dispose', () => {
    const { root, mesh, material } = makeSkinnedFish()
    const binding = bindFishFlexToModel(root, 'ocellaris-clownfish', 42)
    expect(binding).toBeDefined()
    expect(binding!.bodyLength).toBeCloseTo(2, 6)
    expect(binding!.phaseRad).toBeGreaterThanOrEqual(0)
    expect(binding!.phaseRad).toBeLessThan(Math.PI * 2)
    // The mesh now uses a clone; the shared original is untouched.
    expect(mesh.material).not.toBe(material)
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(material.color.getHex())
    expect((mesh.material as THREE.MeshStandardMaterial).customProgramCacheKey()).toBe('fish-flex-v1')
    binding!.dispose()
    expect(mesh.material).toBe(material)
  })

  it('returns undefined for a model with no skinned mesh or an unknown species', () => {
    const plain = new THREE.Group()
    plain.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()))
    expect(bindFishFlexToModel(plain, 'ocellaris-clownfish', 1)).toBeUndefined()
    const { root } = makeSkinnedFish()
    expect(bindFishFlexToModel(root, 'not-a-species', 1)).toBeUndefined()
  })

  it('advances flex time with dt, freezes it on dt = 0, and neutralises amplitude under reduced motion', () => {
    const { root } = makeSkinnedFish()
    const binding = bindFishFlexToModel(root, 'ocellaris-clownfish', 7)!
    const gait = SPECIES_LOCOMOTION_SIGNATURES['ocellaris-clownfish'].gait
    const values = evaluateLighthillFlexParams(gait, swimInput)
    updateFishFlex(binding, 'ocellaris-clownfish', swimInput, 1 / 60, false)
    expect(binding.flexTimeSeconds).toBeCloseTo(1 / 60, 10)
    updateFishFlex(binding, 'ocellaris-clownfish', swimInput, 0, false)
    expect(binding.flexTimeSeconds).toBeCloseTo(1 / 60, 10)
    // Reduced motion: time frozen and amplitude neutralised, without throwing.
    updateFishFlex(binding, 'ocellaris-clownfish', swimInput, 1 / 60, true)
    expect(binding.flexTimeSeconds).toBeCloseTo(1 / 60, 10)
    // The uniforms object is shared, so patching a scratch shader exposes
    // the live values the renderer would see.
    const mesh = root.children[0] as THREE.SkinnedMesh
    const material = mesh.material as THREE.MeshStandardMaterial
    const scratch = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      uniforms: {} as Record<string, { value: number }>,
    }
    material.onBeforeCompile(scratch as never, undefined as never)
    expect(scratch.uniforms.uFlexTime.value).toBeCloseTo(1 / 60, 10)
    expect(scratch.uniforms.uFlexEnabled.value).toBe(0)
    expect(scratch.uniforms.uFlexTailAmplitude.value).toBe(0)

    // Verify uFlexTime advances on the uniform and frequency changes remain phase-continuous.
    for (let i = 0; i < 60; i++) {
      updateFishFlex(binding, 'ocellaris-clownfish', swimInput, 1 / 60, false)
    }
    expect(scratch.uniforms.uFlexTime.value).toBeCloseTo(61 / 60, 6)
    const evalWavePhase = () =>
      -Math.PI * 2 * scratch.uniforms.uFlexFrequencyHz.value * scratch.uniforms.uFlexTime.value +
      scratch.uniforms.uFlexPhase.value
    const phaseBeforeSpeedChange = evalWavePhase()
    const slowInput = { ...swimInput, speedNorm: 0.2 }
    // Updating at dt = 0 with a new speed/frequency must not jump the shader wave phase.
    updateFishFlex(binding, 'ocellaris-clownfish', slowInput, 0, false)
    const phaseAfterSpeedChange = evalWavePhase()
    const phaseDelta = Math.atan2(
      Math.sin(phaseAfterSpeedChange - phaseBeforeSpeedChange),
      Math.cos(phaseAfterSpeedChange - phaseBeforeSpeedChange),
    )
    expect(Math.abs(phaseDelta)).toBeLessThan(1e-6)

    binding.dispose()
    expect(values.frequencyHz).toBeGreaterThan(0)
  })
})
