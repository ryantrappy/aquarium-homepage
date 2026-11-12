import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  CAUSTIC_TEXTURE_SIZE,
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

describe('cellular caustic texture (AQ-70.6 AC #1)', () => {
  it('generates a tileable Voronoi cellular value in [0, 1] that wraps seamlessly at the tile edges', () => {
    for (const u of [0, 0.13, 0.5, 0.87]) {
      for (const v of [0, 0.29, 0.5, 0.71]) {
        const value = evaluateCausticTextureValue(u, v)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
        expect(evaluateCausticTextureValue(0, v)).toBeCloseTo(evaluateCausticTextureValue(1, v), 12)
        expect(evaluateCausticTextureValue(u, 0)).toBeCloseTo(evaluateCausticTextureValue(u, 1), 12)
      }
    }
    // Cellular network, not stripes or a flat wash: thin bright ridges
    // (F2 - F1 ≈ 0) on a mostly dark field.
    let sum = 0
    let bright = 0
    let dark = 0
    const n = 64
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const value = evaluateCausticTextureValue(x / n, y / n)
        sum += value
        if (value > 0.7) bright++
        if (value < 0.2) dark++
      }
    }
    const mean = sum / (n * n)
    expect(mean).toBeGreaterThan(0.05)
    expect(mean).toBeLessThan(0.35)
    expect(bright / (n * n)).toBeGreaterThan(0.02)
    expect(bright / (n * n)).toBeLessThan(0.25)
    expect(dark / (n * n)).toBeGreaterThan(0.5)
  })

  it('is a cellular field, not the old sine interference web: ridges follow cell borders', () => {
    // At a feature point the value is dark (F2 - F1 is large inside a cell);
    // the value peaks on the border between two neighbouring feature points.
    // Feature points are deterministic, so find one by scanning a coarse grid
    // for a local minimum, then check the midpoint toward its nearest
    // neighbour is brighter.
    const n = 32
    let minValue = Infinity
    let minU = 0
    let minV = 0
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const value = evaluateCausticTextureValue(x / n, y / n)
        if (value < minValue) {
          minValue = value
          minU = x / n
          minV = y / n
        }
      }
    }
    expect(minValue).toBeLessThan(0.05)
    // Somewhere in the tile there is a bright ridge well away from that minimum.
    let maxValue = 0
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        maxValue = Math.max(maxValue, evaluateCausticTextureValue(x / n, y / n))
      }
    }
    expect(maxValue).toBeGreaterThan(0.9)
    expect(minU).toBeGreaterThanOrEqual(0)
    expect(minV).toBeGreaterThanOrEqual(0)
  })

  it('generates a 256x256 repeat-wrapped, non-colour-space texture from the pure value function', () => {
    const texture = generateCausticsTexture()
    expect(texture.image.width).toBe(CAUSTIC_TEXTURE_SIZE)
    expect(texture.image.height).toBe(CAUSTIC_TEXTURE_SIZE)
    expect(texture.wrapS).toBe(THREE.RepeatWrapping)
    expect(texture.wrapT).toBe(THREE.RepeatWrapping)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)
    const data = texture.image.data as Uint8Array
    expect(data.length).toBe(CAUSTIC_TEXTURE_SIZE * CAUSTIC_TEXTURE_SIZE * 4)
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
    // Layers combine by max, not product (visual-check fix): a product of
    // two mostly-dark cellular layers is ~0.027 mean and invisible through
    // the old smoothstep; max keeps the ridge network visible.
    expect(shader.fragmentShader).toContain('max(texture2D(uCausticMap, causticUvA).r, texture2D(uCausticMap, causticUvB).r)')
    // The ridge threshold is a per-material uniform (default 0.35), so
    // the sand can widen its dapple without raising the +0.35 peak.
    // Surface-water pass 2: the smoothstep runs per RGB channel (the
    // Zucconi split fringes the ridges) and the scalar pattern is the
    // channel average.
    expect(shader.fragmentShader).toContain('smoothstep(uCausticThreshold, 0.9, causticRgb.r)')
    expect(shader.fragmentShader).toContain('smoothstep(uCausticThreshold, 0.9, causticRgb.g)')
    expect(shader.fragmentShader).toContain('smoothstep(uCausticThreshold, 0.9, causticRgb.b)')
    expect(shader.fragmentShader).toContain('float causticP = (causticRgbS.r + causticRgbS.g + causticRgbS.b) / 3.0;')
    expect(shader.fragmentShader).not.toContain('smoothstep(uCausticThreshold, 0.9, causticP)')
    expect(shader.fragmentShader).not.toContain('texture2D(uCausticMap, causticUvA).r * texture2D(uCausticMap, causticUvB).r')
    expect(shader.fragmentShader).toContain('causticUvA')
    expect(shader.fragmentShader).toContain('causticUvB')
    expect(shader.fragmentShader).toContain('uCausticMaxAdd')
    expect(shader.fragmentShader).toContain('#include <opaque_fragment>')
    expect(shader.fragmentShader).toContain('#include <aomap_fragment>')
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse +=')
    // Regression guard for the dead-code injection bug (2026-11-11):
    // in three r187 `outgoingLight` is formed from `reflectedLight`
    // before `opaque_fragment`, so the caustic writes must land between
    // `lights_fragment_end` and the `outgoingLight` sum, or they never
    // reach the pixels.
    expect(shader.fragmentShader.indexOf('causticSurf')).toBeGreaterThan(
      shader.fragmentShader.indexOf('#include <lights_fragment_end>'),
    )
    expect(shader.fragmentShader.indexOf('causticSurf')).toBeLessThan(
      shader.fragmentShader.indexOf('vec3 outgoingLight'),
    )
    expect(shader.uniforms.uCausticMap).toBe(caustics.uniforms.uCausticMap)
    expect(shader.uniforms.uCausticTime).toBe(caustics.uniforms.uCausticTime)
    // Sun-slant + focus uniforms are shared with every patched material.
    expect(shader.uniforms.uSunDir).toBe(caustics.uniforms.uSunDir)
    expect(shader.uniforms.uSurfaceY).toBe(caustics.uniforms.uSurfaceY)
    expect(shader.uniforms.uFocusGain).toBe(caustics.uniforms.uFocusGain)
    expect(caustics.uniforms.uSurfaceY.value).toBeCloseTo(2.66)
    expect(caustics.uniforms.uFocusGain.value).toBeCloseTo(0.6)
    expect(Math.hypot(
      caustics.uniforms.uSunDir.value.x,
      caustics.uniforms.uSunDir.value.y,
      caustics.uniforms.uSunDir.value.z,
    )).toBeCloseTo(1, 9)
    // The shader samples UVs at the slanted surface footpoint and
    // modulates the pattern by the shared wave field there.
    // Surface-water pass 2: the focus term is the Wallace/Renou
    // differential-area convergence of the sun ray refracted through
    // the wave normal (dFdx/dFdy area ratio), not the analytic-Laplacian
    // proxy — the A/B verdict. The Laplacian proxy survives in
    // surface-waves.ts and in the TS evaluateCausticPatternUV return.
    expect(shader.fragmentShader).toContain('causticSurf')
    expect(shader.fragmentShader).toContain('refract(-uSunDir, causticSurfN, 0.75)')
    expect(shader.fragmentShader).toContain('dFdx(causticHitFlat)')
    expect(shader.fragmentShader).toContain('dFdy(causticHit)')
    expect(shader.fragmentShader).toContain('float causticFocusD = clamp(causticOldArea / causticNewArea, 0.0, 2.0);')
    expect(shader.fragmentShader).not.toContain('1.0 + uFocusGain * surfaceWaveFocus')
    // Zucconi second scale + RGB split, and the sigmoid glass-junction fade.
    // (min() was tried and rejected: see the chunk comment — with this
    // mostly-dark texture min() thins the web to near-invisibility.)
    expect(shader.fragmentShader).toContain('causticUvC')
    expect(shader.fragmentShader).toContain('max(causticBase, texture2D(uCausticMap, causticUvC')
    expect(shader.fragmentShader).not.toContain('min(causticBase, texture2D(uCausticMap, causticUvC')
    expect(shader.fragmentShader).toContain('causticGlassFade')
    expect(shader.fragmentShader).toContain('smoothstep(-4.6, -3.9, vCausticWorldPos.z)')
    // Light redistribution: the field between ridges is dimmed (the
    // light in the web came from around it), so the dapple reads on
    // bright surfaces instead of clipping away.
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse *= 1.0 - 0.40 * (1.0 - causticP) * causticMask')
    expect(shader.fragmentShader).toContain('surfaceWaveHeight')
    expect(shader.uniforms.uCausticMaxAdd.value).toBeCloseTo(0.35)
    expect(shader.uniforms.uCausticThreshold.value).toBeCloseTo(0.35)
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

  it('accepts a per-material ridge threshold (sand dapple) without moving the +0.35 peak', () => {
    const caustics = createCaustics()
    const material = new THREE.MeshStandardMaterial()
    applyCaustics(material, caustics, { threshold: 0.22 })
    const shader = mockShader()
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    expect(shader.uniforms.uCausticThreshold.value).toBeCloseTo(0.22)
    // The peak add is unchanged: the threshold only widens the network.
    expect(shader.uniforms.uCausticMaxAdd.value).toBeCloseTo(0.35)
    expect(shader.fragmentShader).toContain('smoothstep(uCausticThreshold, 0.9, causticRgb.r)')
    caustics.dispose()
  })

  it('patches skinned fish materials post-skinning, so the pattern stays fixed in world space (AQ-70.6 AC #1)', () => {
    const caustics = createCaustics()
    const material = new THREE.MeshStandardMaterial()
    applyCaustics(material, caustics, { skinned: true })

    const shader = mockShader()
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    // World position is read after project_vertex (post-skinning and
    // post-flex), and the normal after defaultnormal_vertex (post-skinning);
    // the bind-pose begin_vertex / beginnormal_vertex hooks are not used.
    expect(shader.vertexShader).toContain('#include <project_vertex>\nvCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    expect(shader.vertexShader).toContain('#include <defaultnormal_vertex>\nvCausticWorldNormal = normalize(mat3(modelMatrix) * objectNormal);')
    expect(shader.vertexShader).not.toContain('#include <begin_vertex>\nvCausticWorldPos')
    expect(shader.vertexShader).not.toContain('#include <beginnormal_vertex>\nvCausticWorldNormal')
    expect(shader.fragmentShader).toContain('uCausticMap')
    expect(material.customProgramCacheKey()).toContain(':caustics-skinned-v1')
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
