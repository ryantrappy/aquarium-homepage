import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  createAragoniteSandBed,
  createAragoniteSandPbrTextures,
  evaluateAragoniteSandElevation,
  evaluateRockBaseContactFactor,
} from './aragonite-sand'

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

  it('compiles dual-scale aperiodic UV sampling and removes hand-painted indigo AO blobs (AC #1 & #2)', () => {
    const bed = createAragoniteSandBed({ textureSize: 64, narrow: false })
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: 'void main() {\n#include <begin_vertex>\n}',
      fragmentShader: 'void main() {\n#include <map_fragment>\n#include <color_fragment>\n}',
    }

    bed.sandMesh.material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)

    // Dual-scale rotated aperiodic UV sampling present
    expect(shader.fragmentShader).toContain('uvPrimary')
    expect(shader.fragmentShader).toContain('uvSecondary')
    expect(shader.fragmentShader).toContain('rot37')
    // Old hand-painted indigo shadowTint blob (vec3(0.16, 0.17, 0.34)) is removed
    expect(shader.fragmentShader).not.toContain('vec3(0.16, 0.17, 0.34)')
    expect(shader.fragmentShader).toContain('warmDetritus')
    expect(shader.fragmentShader).toContain('rockContactAo')

    // Contact factor darkens tightly at rock footprints and stays 1.0 in open foreground sand
    expect(evaluateRockBaseContactFactor(0, 1.5, false)).toBe(1.0)
    expect(evaluateRockBaseContactFactor(-2.35, -1.35, false)).toBeCloseTo(0.56, 2)

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
})
