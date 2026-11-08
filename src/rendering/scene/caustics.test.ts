import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  applyCaustics,
  createCaustics,
  disposeCaustics,
  evaluateCausticTextureValue,
  generateCausticsTexture,
} from './caustics'

function mockShader(): THREE.WebGLProgramParametersWithUniforms {
  return {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  } as unknown as THREE.WebGLProgramParametersWithUniforms
}

describe('real caustic texture (AQ-14.2 AC #2)', () => {
  it('generates a tileable web value in [0, 1] that wraps seamlessly at the tile edges', () => {
    for (const u of [0, 0.13, 0.5, 0.87]) {
      for (const v of [0, 0.29, 0.5, 0.71]) {
        const value = evaluateCausticTextureValue(u, v)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
        expect(evaluateCausticTextureValue(0, v)).toBeCloseTo(evaluateCausticTextureValue(1, v), 12)
        expect(evaluateCausticTextureValue(u, 0)).toBeCloseTo(evaluateCausticTextureValue(u, 1), 12)
      }
    }
    // Mostly dark field with bright ridges, not a flat wash
    let sum = 0
    const n = 32
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) sum += evaluateCausticTextureValue(x / n, y / n)
    }
    const mean = sum / (n * n)
    expect(mean).toBeGreaterThan(0.02)
    expect(mean).toBeLessThan(0.45)
  })

  it('generates a 512x512 repeat-wrapped, non-colour-space texture from the pure value function', () => {
    const texture = generateCausticsTexture()
    expect(texture.image.width).toBe(512)
    expect(texture.image.height).toBe(512)
    expect(texture.wrapS).toBe(THREE.RepeatWrapping)
    expect(texture.wrapT).toBe(THREE.RepeatWrapping)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)
    const data = texture.image.data as Uint8Array
    expect(data.length).toBe(512 * 512 * 4)
    // Sampled range check (a per-byte expect() over 1M entries is too slow)
    let min = 255
    let max = 0
    for (let i = 0; i < data.length; i += 997) {
      if (data[i] < min) min = data[i]
      if (data[i] > max) max = data[i]
    }
    expect(min).toBeGreaterThanOrEqual(0)
    expect(max).toBeLessThanOrEqual(255)
    expect(max).toBeGreaterThan(200)
    // First pixel matches the pure function exactly
    expect(data[0]).toBe(Math.round(evaluateCausticTextureValue(0, 0) * 255))
  })

  it('freezes the shared caustic time at 0 on pause or reduced-motion and advances it otherwise', () => {
    const caustics = createCaustics()
    caustics.update(12.5)
    expect(caustics.uniforms.uCausticTime.value).toBeCloseTo(12.5)
    caustics.update(12.5, true)
    expect(caustics.uniforms.uCausticTime.value).toBe(0)
    caustics.update(12.5, false, true)
    expect(caustics.uniforms.uCausticTime.value).toBe(0)
    caustics.update(3610)
    expect(caustics.uniforms.uCausticTime.value).toBeCloseTo(10)
    caustics.dispose()
  })

  it('patches a standard material with the caustic shader, shares the time uniform, and preserves the previous onBeforeCompile', () => {
    const caustics = createCaustics()
    const material = new THREE.MeshStandardMaterial()
    let previousCalled = false
    material.onBeforeCompile = () => {
      previousCalled = true
    }
    applyCaustics(material, caustics)

    const shader = mockShader()
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    expect(previousCalled).toBe(true)
    expect(shader.vertexShader).toContain('vCausticWorldPos')
    expect(shader.vertexShader).toContain('vCausticWorldNormal')
    expect(shader.fragmentShader).toContain('uCausticMap')
    expect(shader.fragmentShader).toContain('causticUvA')
    expect(shader.fragmentShader).toContain('causticUvB')
    expect(shader.fragmentShader).toContain('uCausticMaxAdd')
    expect(shader.fragmentShader).toContain('#include <opaque_fragment>')
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse +=')
    expect(shader.uniforms.uCausticMap).toBe(caustics.uniforms.uCausticMap)
    expect(shader.uniforms.uCausticTime).toBe(caustics.uniforms.uCausticTime)
    expect(shader.uniforms.uCausticMaxAdd.value).toBeCloseTo(0.35)
    expect(shader.uniforms.uCausticScaleA.value).toBeCloseTo(0.35)
    expect(shader.uniforms.uCausticScaleB.value).toBeCloseTo(0.55)
    expect(material.customProgramCacheKey()).toContain(':caustics-v1')

    // A second material shares the same time uniform object
    const other = new THREE.MeshStandardMaterial()
    applyCaustics(other, caustics, { scaleA: 0.25, scaleB: 0.4 })
    const otherShader = mockShader()
    other.onBeforeCompile(otherShader, {} as THREE.WebGLRenderer)
    expect(otherShader.uniforms.uCausticTime).toBe(caustics.uniforms.uCausticTime)
    expect(otherShader.uniforms.uCausticScaleA.value).toBeCloseTo(0.25)
    expect(otherShader.uniforms.uCausticScaleB.value).toBeCloseTo(0.4)
    caustics.dispose()
  })

  it('does not double-patch a material and restores the previous shader on disposeCaustics', () => {
    const caustics = createCaustics()
    const material = new THREE.MeshStandardMaterial()
    const previous = material.onBeforeCompile
    applyCaustics(material, caustics)
    applyCaustics(material, caustics)
    const shader = mockShader()
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    // One declaration each (each name is then used once in a texture sample)
    expect(shader.fragmentShader.match(/vec2 causticUvA/g)?.length).toBe(1)
    expect(shader.fragmentShader.match(/vec2 causticUvB/g)?.length).toBe(1)

    disposeCaustics(material)
    expect(material.onBeforeCompile).toBe(previous)
    expect(material.userData.causticsApplied).toBeUndefined()
    caustics.dispose()
  })

  it('chains onto a material that already has its own onBeforeCompile (sand / coral / rock pattern)', () => {
    const caustics = createCaustics()
    const material = new THREE.MeshStandardMaterial()
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n// existing sand shader',
      )
    }
    applyCaustics(material, caustics)
    const shader = mockShader()
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    expect(shader.fragmentShader).toContain('// existing sand shader')
    expect(shader.fragmentShader).toContain('causticUvA')
    caustics.dispose()
  })
})
