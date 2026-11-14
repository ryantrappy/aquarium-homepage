import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { createWaterSurface } from './water-surface'
import { glassEnclosureLayout } from './glass-enclosure'
import { SURFACE_WAVE_GLSL } from './surface-waves'

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
    expect(material.fragmentShader).toContain('vec2 capillarySlope(vec2 p, float t)')
    expect(material.fragmentShader).toContain('vec3(totalSlope.x, -1.0, totalSlope.y)')
    expect(material.fragmentShader).toContain('smoothstep(0.53, 0.76, NoV')
    expect(material.fragmentShader).toContain('coralZoneZ * tirFactor')
    expect(material.fragmentShader).toContain('smoothstep(uBackZ, uBackZ + 1.95, p.y)')
    expect(material.fragmentShader).toContain('frontMeniscus')
    expect(material.fragmentShader).toContain('uHalfWidth')
    expect(material.fragmentShader).not.toContain('ovalRippleLens')
    expect(material.fragmentShader).not.toContain('ribbonWave')
    expect(material.fragmentShader).not.toContain('p.y * 24.0')

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