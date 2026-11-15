import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import {
  createWaterSurface,
  evaluateTirCoralRadianceWeight,
  evaluateWaterToAirRefraction,
  TIR_CORAL_GRAZING_NOV_END,
  TIR_CORAL_GRAZING_NOV_START,
  TIR_CORAL_REAR_END_OFFSET,
  TIR_CORAL_REAR_START_OFFSET,
  projectTirRadianceProbe,
  TIR_RADIANCE_PROXY_MAX_TRAVEL,
  WATER_TO_AIR_ETA,
} from './water-surface'
import { glassEnclosureLayout } from './glass-enclosure'
import { SURFACE_WAVE_GLSL } from './surface-waves'
import { SUN_DIRECTION } from './underwater-optics'

describe('underwater water-surface interface', () => {
  it.each([false, true])('matches the glass bounds and stays level (narrow: %s)', narrow => {
    const layout = glassEnclosureLayout(narrow, 4.4)
    const surface = createWaterSurface(layout)
    const geometry = surface.mesh.geometry as THREE.PlaneGeometry

    expect(geometry.parameters.width).toBeCloseTo(layout.halfWidth * 2)
    expect(geometry.parameters.height).toBeCloseTo(layout.frontZ - layout.backZ)
    expect(geometry.parameters.widthSegments).toBe(96)
    expect(geometry.parameters.heightSegments).toBe(48)
    expect(surface.mesh.rotation.x).toBeCloseTo(Math.PI / 2)
    expect(surface.mesh.position.y).toBe(layout.surfaceY)
    expect(surface.mesh.position.z).toBeCloseTo((layout.frontZ + layout.backZ) / 2)
    expect(surface.uniforms.uFrontZ.value).toBe(layout.frontZ)
    expect(surface.uniforms.uBackZ.value).toBe(layout.backZ)
    expect(surface.uniforms.uHalfWidth.value).toBe(layout.halfWidth)

    const intersections: THREE.Intersection[] = []
    surface.mesh.raycast(new THREE.Raycaster(), intersections)
    expect(intersections).toHaveLength(0)
    surface.dispose()
  })

  it('updates both layout geometry and shader bounds, disposing replaced geometry', () => {
    const desktop = glassEnclosureLayout(false, 4.4)
    const phone = glassEnclosureLayout(true, 4.4)
    const surface = createWaterSurface(desktop)
    const oldGeometry = surface.mesh.geometry
    const dispose = vi.fn()
    oldGeometry.addEventListener('dispose', dispose)

    surface.setLayout(phone)

    const geometry = surface.mesh.geometry as THREE.PlaneGeometry
    expect(dispose).toHaveBeenCalledOnce()
    expect(geometry.parameters.width).toBeCloseTo(phone.halfWidth * 2)
    expect(geometry.parameters.height).toBeCloseTo(phone.frontZ - phone.backZ)
    expect(surface.mesh.position.y).toBe(phone.surfaceY)
    expect(surface.mesh.position.z).toBeCloseTo((phone.frontZ + phone.backZ) / 2)
    expect(surface.uniforms.uFrontZ.value).toBe(phone.frontZ)
    expect(surface.uniforms.uBackZ.value).toBe(phone.backZ)
    expect(surface.uniforms.uHalfWidth.value).toBe(phone.halfWidth)

    surface.dispose()
  })

  it('uses continuous shared wave facets and bounded interface shading without static-like patterns', () => {
    const surface = createWaterSurface(glassEnclosureLayout(false, 4.4))
    const material = surface.mesh.material as THREE.ShaderMaterial

    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(material.side).toBe(THREE.DoubleSide)
    expect(material.fragmentShader).toContain(SURFACE_WAVE_GLSL)
    expect(material.vertexShader).toContain('surfaceWaveHeight(worldPos.xz, uTime)')
    expect(material.fragmentShader).toContain('surfaceWaveSlope(p, uTime) * 2.6')
    expect(material.fragmentShader).toContain('vec2 screenFilteredMicrofacetSlope(vec2 p, float t)')
    expect(material.fragmentShader).toContain('fwidth(phase1)')
    expect(material.fragmentShader).toContain('vec2 microfacetCoord = vec2(p.x * 0.32, p.y)')
    expect(material.fragmentShader).toContain('float macroHeight = surfaceWaveHeight(p, t)')
    expect(material.fragmentShader).toContain('vec2 macroGradient = surfaceWaveSlope(p, t)')
    expect(material.fragmentShader).toContain('k1 * vec2(0.32, 0.0) + warp1 * macroGradient')
    expect(material.fragmentShader).toContain('k2 * vec2(0.6 * 0.32, 0.8) + warp2 * macroGradient')
    expect(material.fragmentShader).toContain('0.0035 * cos(phase1) * phaseGradient1')
    expect(material.fragmentShader).toContain('vec3(totalSlope.x, -1.0, totalSlope.y)')
    expect(material.fragmentShader).toContain('refract(-V, N,')
    expect(material.fragmentShader).toContain('transmissionWindow = snellWindow * refractionValid')
    expect(material.fragmentShader).toContain('transmittedRay / max(transmittedRayLength, 0.0001)')
    expect(material.fragmentShader).toContain('reflect(-V, N)')
    expect(material.fragmentShader).toContain('lateralRadianceRow')
    expect(material.fragmentShader).toContain('textureCube(uRadianceProbe, reflectedRay)')
    expect(material.fragmentShader).toContain('mix(analyticTirRadiance, capturedTirRadiance, uUseRadianceProbe)')
    expect(material.fragmentShader).toContain('uniform samplerCube uRadianceProbe;')
    expect(material.fragmentShader).toContain('uniform float uUseRadianceProbe;')
    expect(material.fragmentShader).toContain('uniform vec3 uKeyLightDirection;')
    expect(material.fragmentShader).toContain('vec3 keyRay = normalize(uKeyLightDirection)')
    expect(material.vertexShader).not.toContain('uniform samplerCube uRadianceProbe;')
    expect(material.vertexShader).not.toContain('uniform float uUseRadianceProbe;')
    expect(material.vertexShader).not.toContain('uniform vec3 uKeyLightDirection;')
    expect(material.fragmentShader).not.toContain('vec3(1.2, 6.8, 4.6) - vSurfaceWorldPos')
    expect(surface.uniforms.uKeyLightDirection.value.toArray()).toEqual([
      SUN_DIRECTION.x,
      SUN_DIRECTION.y,
      SUN_DIRECTION.z,
    ])
    expect(material.fragmentShader).toContain('smoothstep(0.53, 0.76, NoV')
    expect(material.fragmentShader).not.toContain('coralZoneZ * tirFactor')
    expect(material.fragmentShader).toContain('smoothstep(uBackZ, uBackZ + 1.95, p.y)')
    expect(material.fragmentShader).toContain('frontMeniscus')
    expect(material.fragmentShader).toContain('uHalfWidth')
    expect(material.fragmentShader).not.toContain('ovalRippleLens')
    expect(material.fragmentShader).not.toContain('ribbonWave')
    expect(material.fragmentShader).not.toContain('p.y * 24.0')
    // Both halves interpolate through the same center tone, avoiding a seam at x=0.5.
    expect(material.fragmentShader).toContain('mix(left, center, smoothstep(0.0, 0.5, x01))')
    expect(material.fragmentShader).toContain('mix(center, right, smoothstep(0.5, 1.0, x01))')

    surface.dispose()
  })

  it('borrows an optional radiance cube and leaves its lifecycle to the caller', () => {
    const surface = createWaterSurface(glassEnclosureLayout(false, 4.4))
    const texture = new THREE.CubeTexture()
    const textureDisposal = vi.fn()
    texture.addEventListener('dispose', textureDisposal)

    expect(surface.uniforms.uRadianceProbe.value).toBeNull()
    expect(surface.uniforms.uUseRadianceProbe.value).toBe(0)
    surface.setRadianceProbe(texture)
    expect(surface.uniforms.uRadianceProbe.value).toBe(texture)
    expect(surface.uniforms.uUseRadianceProbe.value).toBe(1)
    surface.setRadianceProbe(null)
    expect(surface.uniforms.uUseRadianceProbe.value).toBe(0)
    surface.dispose()

    expect(textureDisposal).not.toHaveBeenCalled()
    texture.dispose()
    expect(textureDisposal).toHaveBeenCalledOnce()
  })

  it('matches water-to-air GLSL refraction at normal incidence and around the critical angle', () => {
    const normal = new THREE.Vector3(0, -1, 0)
    const normalIncidence = evaluateWaterToAirRefraction(new THREE.Vector3(0, 1, 0), normal)
    expect(normalIncidence).toBeDefined()
    expect(normalIncidence!.x).toBeCloseTo(0)
    expect(normalIncidence!.y).toBeCloseTo(1)
    expect(normalIncidence!.z).toBeCloseTo(0)

    const criticalSine = 1 / WATER_TO_AIR_ETA
    const belowCritical = new THREE.Vector3(criticalSine - 1e-4, 0, 0)
      .setY(Math.sqrt(1 - (criticalSine - 1e-4) ** 2))
    const aboveCritical = new THREE.Vector3(criticalSine + 1e-4, 0, 0)
      .setY(Math.sqrt(1 - (criticalSine + 1e-4) ** 2))
    expect(evaluateWaterToAirRefraction(belowCritical, normal)).toBeDefined()
    expect(evaluateWaterToAirRefraction(aboveCritical, normal)).toBeUndefined()
    expect(evaluateWaterToAirRefraction(new THREE.Vector3(1, 0, 0), normal)).toBeUndefined()
  })

  it('bounds TIR proxy travel without clamping the projected ray back into the tank', () => {
    const layout = glassEnclosureLayout(false, 4.4)
    const start = new THREE.Vector2(0, layout.backZ)
    const projected = projectTirRadianceProbe(start, new THREE.Vector3(0.4, 0.3, -0.7), layout)
    expect(projected.distanceTo(start)).toBeLessThanOrEqual(TIR_RADIANCE_PROXY_MAX_TRAVEL)
    expect(projected.y).toBeLessThan(layout.backZ)

    expect(() => projectTirRadianceProbe(start, new THREE.Vector3(), layout)).toThrow(RangeError)
  })

  it('limits analytic and captured reef radiance to rear/mid grazing TIR views', () => {
    const backZ = glassEnclosureLayout(false, 4.4).backZ
    const rearStart = backZ + TIR_CORAL_REAR_START_OFFSET
    const rearEnd = backZ + TIR_CORAL_REAR_END_OFFSET
    const grazingMidpoint = (TIR_CORAL_GRAZING_NOV_START + TIR_CORAL_GRAZING_NOV_END) / 2

    // The overview's visible rear strip remains fully eligible for coral color.
    expect(evaluateTirCoralRadianceWeight(backZ + 1, 0.3, backZ)).toBeCloseTo(1)
    expect(evaluateTirCoralRadianceWeight(rearStart, 0.3, backZ)).toBeCloseTo(1)

    // Both masks fade independently and combine multiplicatively at their midpoint.
    expect(evaluateTirCoralRadianceWeight((rearStart + rearEnd) / 2, 0.3, backZ)).toBeCloseTo(0.5)
    expect(evaluateTirCoralRadianceWeight(backZ + 1, grazingMidpoint, backZ)).toBeCloseTo(0.5)
    expect(evaluateTirCoralRadianceWeight((rearStart + rearEnd) / 2, grazingMidpoint, backZ)).toBeCloseTo(0.25)

    // Reef color vanishes at the front edge and above the grazing-angle range.
    expect(evaluateTirCoralRadianceWeight(rearEnd, 0.3, backZ)).toBe(0)
    expect(evaluateTirCoralRadianceWeight(backZ + 1, TIR_CORAL_GRAZING_NOV_END, backZ)).toBe(0)
    expect(evaluateTirCoralRadianceWeight(backZ + 1, 0.9, backZ)).toBe(0)
    expect(evaluateTirCoralRadianceWeight(Number.NaN, 0.3, backZ)).toBe(0)

    const surface = createWaterSurface(glassEnclosureLayout(false, 4.4))
    const fragmentShader = (surface.mesh.material as THREE.ShaderMaterial).fragmentShader
    expect(fragmentShader).toContain('vec3 tirRadianceSource = mix(analyticTirRadiance, capturedTirRadiance, uUseRadianceProbe)')
    expect(fragmentShader).toContain('float tirCoralWeight = rearMidCoralWeight * grazingCoralWeight')
    expect(fragmentShader).toContain('vec3 tirBase = mix(vec3(0.005, 0.024, 0.068), tirRadianceSource, tirCoralWeight)')
    surface.dispose()
  })

  it('shares finite time updates and disposes resources exactly once', () => {
    const surface = createWaterSurface(glassEnclosureLayout(false, 4.4))
    const geometryDisposal = vi.fn()
    const materialDisposal = vi.fn()
    const material = surface.mesh.material as THREE.Material
    surface.mesh.geometry.addEventListener('dispose', geometryDisposal)
    material.addEventListener('dispose', materialDisposal)

    surface.updateTime(7.25)
    expect(surface.uniforms.uTime.value).toBe(7.25)
    surface.updateTime(Number.NaN)
    expect(surface.uniforms.uTime.value).toBe(0)
    surface.updateTime(0)
    expect(surface.uniforms.uTime.value).toBe(0)

    surface.dispose()
    surface.dispose()
    expect(geometryDisposal).toHaveBeenCalledOnce()
    expect(materialDisposal).toHaveBeenCalledOnce()
  })
})
