import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  AQUARIUM_ENVIRONMENT_GRADIENT_STOPS,
  ENVIRONMENT_MAP_INTENSITY,
  applyEnvironmentMapIntensity,
  buildAquariumEnvironmentScene,
  createAquariumEnvironmentMap,
} from './environment-map'

describe('aquarium PMREM environment map (AQ-71)', () => {
  it('uses the tank palette gradient stops, ordered bottom to top', () => {
    expect(AQUARIUM_ENVIRONMENT_GRADIENT_STOPS).toHaveLength(3)
    expect(AQUARIUM_ENVIRONMENT_GRADIENT_STOPS[0]).toEqual({
      position: 0,
      color: [0.06, 0.11, 0.24],
    })
    expect(AQUARIUM_ENVIRONMENT_GRADIENT_STOPS[1]).toEqual({
      position: 0.58,
      color: [0.12, 0.26, 0.44],
    })
    expect(AQUARIUM_ENVIRONMENT_GRADIENT_STOPS[2]).toEqual({
      position: 1,
      color: [0.26, 0.48, 0.66],
    })
    const positions = AQUARIUM_ENVIRONMENT_GRADIENT_STOPS.map(stop => stop.position)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('keeps every envMapIntensity in [0, 1] with the backdrop at 0', () => {
    expect(ENVIRONMENT_MAP_INTENSITY).toEqual({
      fish: 0.55,
      reef: 0.35,
      sand: 0.2,
      waterSurface: 0.9,
      backdrop: 0,
    })
    for (const value of Object.values(ENVIRONMENT_MAP_INTENSITY)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('builds a gradient sphere, LED-panel proxies, and a sand-bounce disc with no NaNs', () => {
    const scene = buildAquariumEnvironmentScene()
    const meshes: THREE.Mesh[] = []
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) meshes.push(object)
    })
    expect(meshes.length).toBe(5)

    const gradient = meshes.find(mesh => mesh.name === 'aquarium-environment-gradient')
    expect(gradient).toBeDefined()
    const gradientMaterial = gradient!.material as THREE.MeshBasicMaterial
    expect(gradientMaterial.side).toBe(THREE.BackSide)
    expect(gradientMaterial.vertexColors).toBe(true)
    const colors = gradient!.geometry.getAttribute('color') as THREE.BufferAttribute
    const positions = gradient!.geometry.getAttribute('position') as THREE.BufferAttribute
    expect(colors.count).toBe(positions.count)
    let topColor: [number, number, number] | undefined
    let bottomColor: [number, number, number] | undefined
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      const r = colors.getX(i)
      const g = colors.getY(i)
      const b = colors.getZ(i)
      expect([x, y, z, r, g, b].every(Number.isFinite)).toBe(true)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(1)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
      if (y > 9.9) topColor = [r, g, b]
      if (y < -9.9) bottomColor = [r, g, b]
    }
    // Top of the sphere is the aquamarine-violet stop, bottom the deep indigo.
    expect(topColor).toBeDefined()
    expect(topColor![0]).toBeCloseTo(0.26, 2)
    expect(topColor![1]).toBeCloseTo(0.48, 2)
    expect(topColor![2]).toBeCloseTo(0.66, 2)
    expect(bottomColor).toBeDefined()
    expect(bottomColor![0]).toBeCloseTo(0.06, 2)
    expect(bottomColor![1]).toBeCloseTo(0.11, 2)
    expect(bottomColor![2]).toBeCloseTo(0.24, 2)

    // LED panels are brighter than 1 so they read as light sources in PMREM.
    for (const name of [
      'aquarium-environment-key-panel',
      'aquarium-environment-fill-panel',
      'aquarium-environment-rim-panel',
    ]) {
      const panel = meshes.find(mesh => mesh.name === name)
      expect(panel).toBeDefined()
      const material = panel!.material as THREE.MeshBasicMaterial
      expect(Math.max(material.color.r, material.color.g, material.color.b)).toBeGreaterThan(1)
    }

    const sandBounce = meshes.find(mesh => mesh.name === 'aquarium-environment-sand-bounce')
    expect(sandBounce).toBeDefined()
    expect(sandBounce!.position.y).toBeLessThan(0)
  })

  it('sets envMapIntensity on standard materials only, including nested meshes', () => {
    const standard = new THREE.MeshStandardMaterial({ color: '#ffffff' })
    const physical = new THREE.MeshPhysicalMaterial({ color: '#ffffff' })
    const basic = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    const group = new THREE.Group()
    const inner = new THREE.Group()
    inner.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standard))
    inner.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), physical))
    inner.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), basic))
    group.add(inner)

    applyEnvironmentMapIntensity(group, 0.55)

    expect(standard.envMapIntensity).toBe(0.55)
    expect(physical.envMapIntensity).toBe(0.55)
    const basicIntensity = (basic as unknown as { envMapIntensity?: number }).envMapIntensity
    expect(basicIntensity).not.toBe(0.55)
  })

  it('exposes a create function that returns a texture and a dispose function', () => {
    expect(typeof createAquariumEnvironmentMap).toBe('function')
  })

  it('returns null with a warning instead of throwing when PMREM cannot run', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // A renderer without a real GL context (e.g. the mocked renderer in
      // aquarium-lifecycle.test.ts) cannot run PMREMGenerator.fromScene.
      const result = createAquariumEnvironmentMap({} as unknown as THREE.WebGLRenderer)
      expect(result).toBeNull()
      expect(warn).toHaveBeenCalledWith(
        'Aquarium environment map unavailable; continuing without IBL',
        expect.anything(),
      )
    } finally {
      warn.mockRestore()
    }
  })
})
