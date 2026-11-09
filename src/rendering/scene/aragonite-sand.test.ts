import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  createAragoniteSandBed,
  createAragoniteSandPbrTextures,
  evaluateAragoniteSandElevation,
  evaluateRockBaseContactFactor,
} from './aragonite-sand'

function expandShaderIncludes(source: string, depth = 0): string {
  if (depth > 32) throw new Error('Three shader chunk include expansion exceeded 32 levels')
  return source.replace(/#include <([\w\d_]+)>/g, (_match, chunkName: string) => {
    const chunk = THREE.ShaderChunk[chunkName as keyof typeof THREE.ShaderChunk]
    if (typeof chunk !== 'string') throw new Error(`Unknown Three shader chunk: ${chunkName}`)
    return expandShaderIncludes(chunk, depth + 1)
  })
}

function compileSandShader(bed: ReturnType<typeof createAragoniteSandBed>) {
  const shader = {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  }

  bed.sandMesh.material.onBeforeCompile(
    shader as unknown as THREE.WebGLProgramParametersWithUniforms,
    {} as THREE.WebGLRenderer,
  )

  return shader
}

describe('photoreal aragonite sand bed (AQ-70.12)', () => {
  it('generates warm cream/ivory aragonite PBR textures with correct color spaces and unit normals (AC #1 & #4)', () => {
    const { albedoTexture, normalTexture, roughnessTexture } = createAragoniteSandPbrTextures(128)

    expect(albedoTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(normalTexture.colorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(roughnessTexture.colorSpace).toBe(THREE.LinearSRGBColorSpace)

    const albedo = albedoTexture.image.data as Uint8Array
    const normals = normalTexture.image.data as Uint8Array
    const roughness = roughnessTexture.image.data as Uint8Array
    const pixelCount = 128 * 128

    let rSum = 0
    let gSum = 0
    let bSum = 0
    for (let i = 0; i < pixelCount; i++) {
      const p4 = i * 4
      rSum += albedo[p4]
      gSum += albedo[p4 + 1]
      bSum += albedo[p4 + 2]

      // Normal Z must remain positive (pointing out of the surface)
      expect(normals[p4 + 2]).toBeGreaterThan(128)
      // Roughness stays in porous carbonate / shell range [0.70, 0.96] -> [178, 245]
      expect(roughness[p4]).toBeGreaterThanOrEqual(175)
      expect(roughness[p4]).toBeLessThanOrEqual(246)
    }

    const rAvg = rSum / pixelCount
    const gAvg = gSum / pixelCount
    const bAvg = bSum / pixelCount

    // Warm cream/ivory aragonite rubric: R > G > B (never cold blue-grey where B > R)
    expect(rAvg).toBeGreaterThan(215)
    expect(rAvg).toBeGreaterThan(gAvg)
    expect(gAvg).toBeGreaterThan(bAvg + 10)

    albedoTexture.dispose()
    normalTexture.dispose()
    roughnessTexture.dispose()
  })

  it('uses one world-space UV blend for all PBR maps in the real Three shader structure (AC #1)', () => {
    const bed = createAragoniteSandBed({ textureSize: 64, narrow: false })
    const shader = compileSandShader(bed)
    const expandedVertex = expandShaderIncludes(shader.vertexShader)
    const expandedFragment = expandShaderIncludes(shader.fragmentShader)

    // All replacements are anchored in the installed MeshStandard shader's actual chunks.
    expect(THREE.ShaderLib.standard.fragmentShader).toContain('#include <clipping_planes_fragment>')
    expect(THREE.ShaderLib.standard.fragmentShader).toContain('#include <map_fragment>')
    expect(THREE.ShaderLib.standard.fragmentShader).toContain('#include <normal_fragment_maps>')
    expect(THREE.ShaderLib.standard.fragmentShader).toContain('#include <roughnessmap_fragment>')
    expect(shader.fragmentShader).toContain('uvPrimary')
    expect(shader.fragmentShader).toContain('uvSecondary')
    expect(shader.fragmentShader).toContain('sandMacroBlend')
    expect(shader.fragmentShader).toContain('getTangentFrame(-vViewPosition, normal, uvPrimary)')
    expect(shader.fragmentShader).toContain('getTangentFrame(-vViewPosition, normal, uvSecondary)')
    expect(expandedFragment).not.toContain('#include <')
    expect(expandedVertex).not.toContain('#include <')
    expect(bed.sandMesh.geometry.hasAttribute('tangent')).toBe(false)
    expect(expandedFragment).toContain('mat3 getTangentFrame')
    expect(expandedVertex).toContain('vSandWorldPos = sandWp.xyz')
    expect(expandedFragment).toContain('texture2D(map, uvPrimary)')
    expect(expandedFragment).toContain('texture2D(map, uvSecondary)')
    expect(expandedFragment).toContain('texture2D(normalMap, uvPrimary)')
    expect(expandedFragment).toContain('texture2D(normalMap, uvSecondary)')
    expect(expandedFragment).toContain('texture2D(roughnessMap, uvPrimary)')
    expect(expandedFragment).toContain('texture2D(roughnessMap, uvSecondary)')
    expect(expandedFragment).toContain('normalize(mix(sandNormalPrimary, sandNormalSecondary, sandMacroBlend))')

    bed.dispose()
  })

  it('keeps the albedo mean warm cream but with a wide enough tonal swing to read as granular sand, not flat white (visual-check fix)', () => {
    const { albedoTexture } = createAragoniteSandPbrTextures(64)
    const data = albedoTexture.image.data as Uint8Array
    let sum = 0
    let min = 255
    let max = 0
    const n = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      sum += r
      if (r < min) min = r
      if (r > max) max = r
    }
    const mean = sum / n
    expect(mean).toBeGreaterThan(210)
    expect(mean).toBeLessThan(245)
    expect(max - min).toBeGreaterThan(35)
    albedoTexture.dispose()
  })

  it('keeps CPU contact factors in parity with shader footprint strengths and removes indigo tint (AC #2)', () => {
    const bed = createAragoniteSandBed({ textureSize: 64, narrow: false })
    const shader = compileSandShader(bed)

    // Old hand-painted indigo shadowTint blob (vec3(0.16, 0.17, 0.34)) is removed
    expect(shader.fragmentShader).not.toContain('vec3(0.16, 0.17, 0.34)')
    expect(shader.fragmentShader).toContain('warmDetritus')
    expect(shader.fragmentShader).toContain('rockContactAo')
    expect(shader.fragmentShader).toContain('1.0 - 0.55 * (1.0 - smoothstep(0.55, 1.55, rLeft))')
    expect(shader.fragmentShader).toContain('1.0 - 0.52 * (1.0 - smoothstep(0.55, 1.55, rRight))')
    // The macro luminance modulation survives mipmapping at overview distance (visual-check fix)
    expect(shader.fragmentShader).toContain('0.90 + 0.20 * sandMacroBlend')

    // Contact factor darkens tightly at rock footprints and stays 1.0 in open foreground sand
    expect(evaluateRockBaseContactFactor(0, 1.5, false)).toBe(1.0)
    expect(evaluateRockBaseContactFactor(-2.35, -1.35, false)).toBeCloseTo(0.45, 2)
    expect(evaluateRockBaseContactFactor(2.65, -1.20, false)).toBeCloseTo(0.48, 2)
    expect(evaluateRockBaseContactFactor(-0.15, -1.35, true)).toBeCloseTo(0.45, 2)
    // The wider fade (0.55..1.55) extends the grounding ring beyond the rock edge: at r 1.45 the
    // factor is still darkened, where the old 1.30 fade had already returned to 1.0.
    expect(evaluateRockBaseContactFactor(-2.35 + 1.45 * 1.85 * 0.92, -1.35, false)).toBeLessThan(1.0)

    bed.dispose()
  })

  it('carries no private caustic clock or ridge network: the shared cellular caustic chunk is the one caustic system (AQ-70.6 AC #1)', () => {
    const bed = createAragoniteSandBed({ textureSize: 64, narrow: false })
    const shader = compileSandShader(bed)
    expect(shader.uniforms.uSandTime).toBeUndefined()
    expect(shader.fragmentShader).not.toContain('uSandTime')
    expect(shader.fragmentShader).not.toContain('causticNet')
    expect(shader.fragmentShader).not.toContain('ridge1')
    // update() is a no-op for time now (the shared caustics chunk freezes
    // at t=0 on pause/reduced-motion); it must not throw or reintroduce a clock.
    expect(() => bed.update(12.5, false, false)).not.toThrow()
    expect(shader.uniforms.uSandTime).toBeUndefined()

    bed.dispose()
  })

  it('sculpts a back-rising aquascaping slope and rock talus mounding without encroaching on fish navigation bounds (AC #3)', () => {
    const frontOpen = evaluateAragoniteSandElevation(0, 2.5, false)
    const rearOpen = evaluateAragoniteSandElevation(0, -4.5, false)
    expect(rearOpen).toBeGreaterThan(frontOpen + 0.15)

    // Talus berm near left rock perimeter is higher than adjacent open sand at the same Z depth
    const atRockPerimeter = evaluateAragoniteSandElevation(-2.35 + 1.35, -1.35, false)
    const atCenterChannel = evaluateAragoniteSandElevation(0.15, -1.35, false)
    expect(atRockPerimeter).toBeGreaterThan(atCenterChannel)

    // Every vertex on the sand bed stays strictly below habitat.bounds.min.y = -2.25
    const bed = createAragoniteSandBed({ textureSize: 64, narrow: false })
    const pos = bed.sandMesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const worldY = bed.sandMesh.position.y + pos.getZ(i)
      expect(worldY).toBeLessThan(-2.35)
    }
    bed.dispose()
  })

  it('scatters instanced rubble, shells, and coralline chips plus a front-glass sand edge with raycasting disabled (AC #3)', () => {
    const bed = createAragoniteSandBed({ textureSize: 64, narrow: false })

    expect(bed.rubbleInstances.count).toBe(48)
    expect(bed.shellInstances.count).toBe(36)
    expect(bed.corallineInstances.count).toBe(28)
    expect(bed.frontEdgeMesh.geometry.getAttribute('position').count).toBeGreaterThan(100)

    // Raycast against the group only hits sandMesh if tested directly; scatter & front edge never intercept fish clicks
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 9),
      new THREE.Vector3(0, -0.3, -1).normalize(),
    )
    const scatterHits: THREE.Intersection[] = []
    bed.frontEdgeMesh.raycast(raycaster, scatterHits)
    bed.rubbleInstances.raycast(raycaster, scatterHits)
    bed.shellInstances.raycast(raycaster, scatterHits)
    bed.corallineInstances.raycast(raycaster, scatterHits)
    expect(scatterHits).toHaveLength(0)

    // Responsive layout switch updates footprint uniforms and geometry cleanly
    bed.setLayout(true)
    bed.update(12.5, false, false)
    bed.update(12.5, true, false)
    bed.dispose()
  })

  it('shares the deterministic pixel bytes across calls so scene rebuilds stay cheap (AQ-73)', () => {
    const first = createAragoniteSandPbrTextures(128)
    const second = createAragoniteSandPbrTextures(128)
    // Fresh wrappers per call, identical pixels: the ~180 ms 512²
    // generation runs once per size, not once per createAquarium call.
    expect(second.albedoTexture).not.toBe(first.albedoTexture)
    expect(second.normalTexture).not.toBe(first.normalTexture)
    expect(second.roughnessTexture).not.toBe(first.roughnessTexture)
    expect(second.albedoTexture.image.data).toBe(first.albedoTexture.image.data)
    expect(second.normalTexture.image.data).toBe(first.normalTexture.image.data)
    expect(second.roughnessTexture.image.data).toBe(first.roughnessTexture.image.data)
    // A different size still generates its own pixels.
    const other = createAragoniteSandPbrTextures(64)
    expect(other.albedoTexture.image.width).toBe(64)
    expect(other.albedoTexture.image.data).not.toBe(first.albedoTexture.image.data)
  })
})
