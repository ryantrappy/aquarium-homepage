import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  SHAFT_BEAM_CELL_M,
  SHAFT_BEAM_GLSL,
  SHAFT_DEPTH_FADE_PER_M,
  SHAFT_WARP_STRENGTH,
  VERIFIED_PINNACLE_CAMERA_FRAMING,
  createVolumetricGodRayCones,
  evaluateGodRayEdgeFade,
  evaluateShaftBeamPattern,
  evaluateVoronoiF1,
} from './light-shafts'

describe('raymarched shaft beam pattern (AQ-98 / AQ-86)', () => {
  it('returns inverted-Voronoi-F1 columns: bright at cell centres, dark far from them', () => {
    // Find a cell centre by scanning for the pattern maximum, then check
    // the pattern falls off away from it.
    let maxValue = 0
    let maxU = 0
    let maxV = 0
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const value = evaluateShaftBeamPattern((x / 40) * 6, (y / 40) * 6, 0)
        if (value > maxValue) {
          maxValue = value
          maxU = (x / 40) * 6
          maxV = (y / 40) * 6
        }
      }
    }
    expect(maxValue).toBeGreaterThan(0.9)
    expect(evaluateShaftBeamPattern(maxU + SHAFT_BEAM_CELL_M, maxV, 0)).toBeLessThan(maxValue)
    // The field is genuinely patterned, not flat: min and max differ.
    let minValue = 1
    for (let i = 0; i < 200; i++) {
      minValue = Math.min(minValue, evaluateShaftBeamPattern(i * 0.37, i * 0.61, 0))
    }
    expect(minValue).toBeLessThan(0.3)
  })

  it('stays in [0, 1], is deterministic, and is a beam (centre-bright), not a caustic web', () => {
    for (let i = 0; i < 100; i++) {
      const value = evaluateShaftBeamPattern(i * 0.53, i * 0.29, 2.5)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
      expect(evaluateShaftBeamPattern(i * 0.53, i * 0.29, 2.5)).toBe(value)
    }
    // F1 itself is a distance: 0 at a feature point, growing away from it.
    expect(evaluateVoronoiF1(0, 0)).toBeGreaterThanOrEqual(0)
    expect(evaluateVoronoiF1(0, 0)).toBeLessThan(2)
  })

  it('drifts with time via the warp (roots stay anchored) and freezes on pause/reduced-motion', () => {
    const atT0 = evaluateShaftBeamPattern(1.3, 2.1, 0)
    const atT1 = evaluateShaftBeamPattern(1.3, 2.1, 1.2)
    const atT2 = evaluateShaftBeamPattern(1.3, 2.1, 2.7)
    expect(atT1).not.toBe(atT0)
    expect(atT2).not.toBe(atT1)
    expect(evaluateShaftBeamPattern(1.3, 2.1, 5, { paused: true })).toBe(atT0)
    expect(evaluateShaftBeamPattern(1.3, 2.1, 9, { reducedMotion: true })).toBe(atT0)
  })

  it('exports a GLSL mirror with the same beam constants', () => {
    expect(SHAFT_BEAM_GLSL).toContain('shaftBeamPattern')
    expect(SHAFT_BEAM_GLSL).toContain('shaftVoronoiF1')
    expect(SHAFT_BEAM_GLSL).toContain(SHAFT_BEAM_CELL_M.toFixed(2))
    expect(SHAFT_BEAM_GLSL).toContain(SHAFT_WARP_STRENGTH.toFixed(2))
    expect(SHAFT_DEPTH_FADE_PER_M).toBe(0.55)
  })

  it('builds 4-5 volumetric god ray cones with AdditiveBlending, view-dot-normal edge fade, upward pinnacle camera framing, and synchronous freeze (AQ-98)', () => {
    expect(evaluateGodRayEdgeFade({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 })).toBeCloseTo(1, 6)
    expect(evaluateGodRayEdgeFade({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })).toBe(0)
    expect(evaluateGodRayEdgeFade({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 })).toBe(0)
    const oblique = evaluateGodRayEdgeFade({ x: 0.7, y: 0, z: 0.7 }, { x: 0, y: 0, z: 1 })
    expect(oblique).toBeGreaterThan(0.2)
    expect(oblique).toBeLessThan(0.8)

    expect(VERIFIED_PINNACLE_CAMERA_FRAMING.fovDeg).toBeGreaterThanOrEqual(45)
    expect(VERIFIED_PINNACLE_CAMERA_FRAMING.fovDeg).toBeLessThanOrEqual(50)
    expect(VERIFIED_PINNACLE_CAMERA_FRAMING.upwardTiltRad).toBeGreaterThan(0)
    expect(VERIFIED_PINNACLE_CAMERA_FRAMING.position.z).toBeGreaterThan(VERIFIED_PINNACLE_CAMERA_FRAMING.foregroundFishMaxZ)

    const rig = createVolumetricGodRayCones(5)
    expect(rig.cones).toHaveLength(5)
    for (const cone of rig.cones) {
      const mat = cone.material as THREE.ShaderMaterial
      expect(mat.blending).toBe(THREE.AdditiveBlending)
      expect(mat.depthWrite).toBe(false)
      expect(mat.fragmentShader).toContain('clamp(dot(viewDirection, faceNormal), 0.0, 1.0)')
    }

    rig.update(3.4)
    expect(rig.uniforms.uTime.value).toBeCloseTo(3.4, 5)
    rig.update(8.2, { paused: true })
    expect(rig.uniforms.uTime.value).toBe(0)
    rig.update(8.2, { reducedMotion: true })
    expect(rig.uniforms.uTime.value).toBe(0)
    rig.update(8.2, { hidden: true })
    expect(rig.uniforms.uTime.value).toBe(0)
    rig.dispose()
  })
})

