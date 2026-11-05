import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  CORAL_FLEXIBILITY_EXPONENT,
  CORAL_RAW_MASK_SCHEMA,
  applyCoralRawMaskMaterial,
  evaluateCoralContactAoFactor,
  evaluateCoralFlexibilityWeight,
  evaluateCoralVertexDisplacement,
  type CoralPrimitiveRole,
} from './coral-material'

describe('coral-raw-masks-v1 material and shader adapter (AQ-53 / AQ-42)', () => {
  it('applies the 1.8 flexibility exponent exactly once for soft coral and forces rigid coral to 0', () => {
    expect(evaluateCoralFlexibilityWeight(0, 'coral-soft')).toBe(0)
    expect(evaluateCoralFlexibilityWeight(1, 'coral-soft')).toBe(1)
    expect(evaluateCoralFlexibilityWeight(0.5, 'coral-soft')).toBeCloseTo(Math.pow(0.5, CORAL_FLEXIBILITY_EXPONENT), 8)
    expect(evaluateCoralFlexibilityWeight(0.44, 'coral-soft')).toBeCloseTo(Math.pow(0.44, 1.8), 8)
    expect(evaluateCoralFlexibilityWeight(1, 'coral-rigid')).toBe(0)
    expect(evaluateCoralFlexibilityWeight(0.75, 'coral-rigid')).toBe(0)
  })

  it('disables standard Three.js vertexColors and transparency so COLOR_0 is never used as display RGB or opacity', () => {
    const baseMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
    })
    const binding = applyCoralRawMaskMaterial(baseMaterial, { role: 'coral-soft' })

    expect(binding.material.vertexColors).toBe(false)
    expect(binding.material.transparent).toBe(false)
    expect(binding.material.opacity).toBe(1)
    expect(binding.material.depthWrite).toBe(true)
    expect(binding.material.userData.coralRawMasks).toMatchObject({
      schema: CORAL_RAW_MASK_SCHEMA,
      role: 'coral-soft',
      flexibilityExponent: 1.8,
    })
  })

  it('injects the single pow(coralRawR, 1.8) curve, phase offset, and contact AO into vertex/fragment shaders and matching depth material', () => {
    const material = new THREE.MeshStandardMaterial()
    const binding = applyCoralRawMaskMaterial(material, { role: 'coral-soft' })

    const mockShader: THREE.WebGLProgramParametersWithUniforms = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    } as unknown as THREE.WebGLProgramParametersWithUniforms

    binding.material.onBeforeCompile(mockShader, {} as THREE.WebGLRenderer)
    expect(mockShader.vertexShader).toContain('pow(coralRawR, 1.8)')
    expect(mockShader.vertexShader.match(/pow\s*\(\s*coralRawR\s*,\s*1\.8\s*\)/g)).toHaveLength(1)
    expect(mockShader.fragmentShader).toContain('diffuseColor.a = 1.0;')
    expect(mockShader.fragmentShader).toContain('coralContactAo')

    const mockDepthShader: THREE.WebGLProgramParametersWithUniforms = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.depth.vertexShader,
      fragmentShader: THREE.ShaderLib.depth.fragmentShader,
    } as unknown as THREE.WebGLProgramParametersWithUniforms

    binding.depthMaterial.onBeforeCompile(mockDepthShader, {} as THREE.WebGLRenderer)
    expect(mockDepthShader.vertexShader).toContain('pow(coralRawR, 1.8)')
    expect(mockDepthShader.vertexShader).toContain('transformed.x += coralSwayX * coralFlex;')
    // No displacementMap is assigned by the adapter. The real depth template
    // conditionally compiles its normal chunk, so sway must precede that block.
    expect(mockDepthShader.vertexShader.indexOf('float coralSwayX')).toBeLessThan(mockDepthShader.vertexShader.indexOf('#ifdef USE_DISPLACEMENTMAP'))
    expect(mockDepthShader.vertexShader).not.toContain('objectNormal = normalize(objectNormal +')
  })

  it('pins proximal bases (R=0), keeps rigid skeletons immobile, de-synchronizes tentacles by B phaseSeed, and zeroes motion when paused or reduced-motion is active', () => {
    const tipPos = { x: 0.03, y: 0.12, z: -0.02 }
    const pinnedBase = evaluateCoralVertexDisplacement(
      tipPos,
      { r: 0, g: 0.2, b: 0.4, a: 0.5 },
      'coral-soft',
      2.5,
    )
    expect(pinnedBase).toEqual({ dx: 0, dy: 0, dz: 0, flexibilityWeight: 0 })

    const rigidBranch = evaluateCoralVertexDisplacement(
      tipPos,
      { r: 0, g: 0.9, b: 0.3, a: 0.8 },
      'coral-rigid',
      2.5,
    )
    expect(rigidBranch).toEqual({ dx: 0, dy: 0, dz: 0, flexibilityWeight: 0 })

    const tentacleA = evaluateCoralVertexDisplacement(
      tipPos,
      { r: 0.85, g: 0.9, b: 0.1, a: 0.9 },
      'coral-soft',
      2.5,
    )
    const tentacleB = evaluateCoralVertexDisplacement(
      tipPos,
      { r: 0.85, g: 0.9, b: 0.65, a: 0.9 },
      'coral-soft',
      2.5,
    )
    expect(Math.hypot(tentacleA.dx, tentacleA.dz)).toBeGreaterThan(0)
    expect(tentacleA.dx).not.toBeCloseTo(tentacleB.dx, 5)

    const pausedDisp = evaluateCoralVertexDisplacement(
      tipPos,
      { r: 0.85, g: 0.9, b: 0.1, a: 0.9 },
      'coral-soft',
      2.5,
      { paused: true },
    )
    expect(pausedDisp.dx).toBe(0)
    expect(pausedDisp.dy).toBe(0)
    expect(pausedDisp.dz).toBe(0)

    const reducedMotionDisp = evaluateCoralVertexDisplacement(
      tipPos,
      { r: 0.85, g: 0.9, b: 0.1, a: 0.9 },
      'coral-soft',
      2.5,
      { reducedMotion: true },
    )
    expect(reducedMotionDisp.dx).toBe(0)
    expect(reducedMotionDisp.dy).toBe(0)
    expect(reducedMotionDisp.dz).toBe(0)

    expect(evaluateCoralContactAoFactor(0)).toBeCloseTo(0.28, 6)
    expect(evaluateCoralContactAoFactor(1)).toBeCloseTo(1.0, 6)
  })

  it('consumes all 8 packaged coral inspection records with single-exponent soft crowns and zero-displacement rigid skeletons', () => {
    const coralIds = [
      'coral-euphyllia-torch',
      'coral-euphyllia-hammer',
      'coral-anemone-bta',
      'coral-acropora-table',
      'coral-acropora-staghorn',
      'coral-montipora-plate',
      'coral-brain-diploria',
      'coral-zoanthid-mat',
    ]

    for (const id of coralIds) {
      const inspection = JSON.parse(
        readFileSync(new URL(`../assets/corals/${id}-inspection.json`, import.meta.url), 'utf8'),
      )
      expect(inspection.extras.reefAsset.maskSchema).toBe(CORAL_RAW_MASK_SCHEMA)

      for (const primitive of inspection.primitives) {
        const role = primitive.role as CoralPrimitiveRole
        const values: number[] = primitive.color0.values
        expect(values.length).toBe(primitive.vertexCount * 4)

        let pinnedZeroCount = 0
        let maxFlexWeight = 0
        for (let v = 0; v < primitive.vertexCount; v++) {
          const r = values[v * 4]
          const w = evaluateCoralFlexibilityWeight(r, role)
          if (w === 0) pinnedZeroCount++
          if (w > maxFlexWeight) maxFlexWeight = w
        }

        if (role === 'coral-rigid') {
          expect(pinnedZeroCount).toBe(primitive.vertexCount)
          expect(maxFlexWeight).toBe(0)
        } else {
          expect(pinnedZeroCount).toBeGreaterThan(0)
          expect(maxFlexWeight).toBeGreaterThan(0)
          expect(maxFlexWeight).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})
