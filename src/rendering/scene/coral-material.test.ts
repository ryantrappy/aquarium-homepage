import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  CORAL_DEFAULT_PALETTE,
  CORAL_DEFAULT_REGRADE,
  CORAL_FLEXIBILITY_EXPONENT,
  CORAL_RAW_MASK_SCHEMA,
  CORAL_TISSUE_HIGHLIGHT_CEILING,
  applyCoralRawMaskMaterial,
  applyLiveRockMaterial,
  evaluateCoralContactAoFactor,
  evaluateCoralFlexibilityWeight,
  evaluateCoralTissueColor,
  evaluateCoralVertexDisplacement,
  evaluateLiveRockSurfaceSample,
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
    expect(mockShader.fragmentShader).toContain('float coralContactAo = mix(0.28, 1.0, coralMaskAlpha);')
    expect(mockShader.fragmentShader).toContain('reflectedLight.indirectDiffuse *= coralContactAo;')
    expect(mockShader.fragmentShader).toContain('reflectedLight.directDiffuse *= coralContactAo;')
    expect(mockShader.fragmentShader).not.toContain('diffuseColor.rgb *= mix(0.62, 1.0')
    expect(mockShader.fragmentShader).not.toContain('reflectedLight.directDiffuse *= mix(0.72, 1.0, coralContactAo)')
    for (const [name, uniform] of Object.entries(binding.uniforms)) {
      expect(mockShader.uniforms[name]).toBe(uniform)
    }

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

  it('keeps baked-PBR coral on the shared raw-mask/depth motion clock and preserves authored maps', () => {
    const sourceMap = new THREE.Texture()
    const sourceNormalMap = new THREE.Texture()
    const sourceRoughnessMap = new THREE.Texture()
    const legacyMaterial = new THREE.MeshStandardMaterial({ map: sourceMap, normalMap: sourceNormalMap, roughnessMap: sourceRoughnessMap })
    const bakedMaterial = new THREE.MeshStandardMaterial({ map: sourceMap, normalMap: sourceNormalMap, roughnessMap: sourceRoughnessMap })
    const legacy = applyCoralRawMaskMaterial(legacyMaterial, { role: 'coral-soft' })
    const baked = applyCoralRawMaskMaterial(bakedMaterial, {
      role: 'coral-soft',
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#98766a', tipColor: '#c49b84', creviceColor: '#49342f',
      },
    })

    expect(baked.material.map).toBe(sourceMap)
    expect(baked.material.normalMap).toBe(sourceNormalMap)
    expect(baked.material.roughnessMap).toBe(sourceRoughnessMap)
    expect(baked.uniforms.uRoughnessOverride.value).toBe(1)
    expect(baked.uniforms.uSubsurfaceStrength.value).toBe(0)
    expect(baked.material.customProgramCacheKey()).not.toBe(legacy.material.customProgramCacheKey())
    expect(baked.depthMaterial.customProgramCacheKey()).not.toBe(legacy.depthMaterial.customProgramCacheKey())

    const compile = (material: THREE.MeshStandardMaterial) => {
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      } as unknown as THREE.WebGLProgramParametersWithUniforms
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
      return shader
    }
    const compileDepth = (material: THREE.MeshDepthMaterial) => {
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.depth.vertexShader,
        fragmentShader: THREE.ShaderLib.depth.fragmentShader,
      } as unknown as THREE.WebGLProgramParametersWithUniforms
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
      return shader
    }
    const legacyShader = compile(legacy.material)
    const bakedShader = compile(baked.material)
    const legacyDepth = compileDepth(legacy.depthMaterial)
    const bakedDepth = compileDepth(baked.depthMaterial)
    expect(bakedShader.vertexShader).toBe(legacyShader.vertexShader)
    expect(bakedDepth.vertexShader).toBe(legacyDepth.vertexShader)
    expect(bakedShader.vertexShader).toContain('transformed.x += coralSwayX * coralFlex;')
    expect(bakedShader.vertexShader).toContain('transformed.z += coralSwayZ * coralFlex;')
    expect(bakedDepth.vertexShader).toContain('transformed.x += coralSwayX * coralFlex;')
    expect(bakedDepth.vertexShader).toContain('transformed.z += coralSwayZ * coralFlex;')
    legacy.update(3.25)
    baked.update(3.25)
    expect(baked.uniforms.uTime.value).toBe(legacy.uniforms.uTime.value)
    expect(baked.uniforms.uMotionScale.value).toBe(legacy.uniforms.uMotionScale.value)
    legacy.update(4.5, true)
    baked.update(4.5, true)
    expect(baked.uniforms.uTime.value).toBe(legacy.uniforms.uTime.value)
    expect(baked.uniforms.uMotionScale.value).toBe(0)
    legacy.update(5.5, false, true)
    baked.update(5.5, false, true)
    expect(baked.uniforms.uTime.value).toBe(legacy.uniforms.uTime.value)
    expect(baked.uniforms.uMotionScale.value).toBe(0)
  })

  it('uses authored PBR roughness and G-only fluorescence in baked mode while retaining legacy grading once', () => {
    const baked = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial({ roughness: 0.63 }), {
      role: 'coral-soft',
      paletteOverride: {
        surfaceMode: 'baked-pbr',
        baseColor: '#98766a', tipColor: '#c49b84', creviceColor: '#49342f',
      },
    })
    const legacy = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), {
      role: 'coral-soft',
      paletteOverride: { baseColor: '#98766a', tipColor: '#c49b84', creviceColor: '#49342f' },
    })
    const compile = (binding: ReturnType<typeof applyCoralRawMaskMaterial>) => {
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      } as unknown as THREE.WebGLProgramParametersWithUniforms
      binding.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
      return shader.fragmentShader
    }
    const bakedShader = compile(baked)
    const legacyShader = compile(legacy)

    expect(bakedShader.match(/#include <roughnessmap_fragment>/g)).toHaveLength(1)
    expect(bakedShader).toContain('roughnessFactor = clamp(roughnessFactor * uRoughnessOverride, 0.04, 1.0);')
    expect(bakedShader).not.toContain('roughnessFactor = uRoughnessOverride;')
    expect(bakedShader).not.toContain('float pEps = 0.0025;')
    expect(bakedShader).not.toContain('float coralTopExposure =')
    expect(bakedShader).not.toContain('reflectedLight.directDiffuse *= coralContactAo;')
    expect(bakedShader).not.toContain('reflectedLight.directSpecular *= 0.28;')
    expect(bakedShader.match(/reflectedLight\.indirectDiffuse \*= coralContactAo;/g)).toHaveLength(1)
    expect(bakedShader.match(/reflectedLight\.indirectSpecular \*= coralContactAo;/g)).toHaveLength(1)
    expect(bakedShader).toContain('float coralTipMask = clamp(vCoralMask.g, 0.0, 1.0);')
    expect(bakedShader).toContain('pow(coralTipMask, 1.35)')
    expect(bakedShader).not.toContain('max(coralTipMask, polypHighlight * 0.65)')

    expect(legacyShader.match(/#include <roughnessmap_fragment>/g)).toHaveLength(1)
    expect(legacyShader).toContain('roughnessFactor = uRoughnessOverride;')
    expect(legacyShader.match(/float pEps = 0\.0025;/g)).toHaveLength(1)
    expect(legacyShader.match(/float coralTopExposure =/g)).toHaveLength(1)
    expect(legacyShader.match(/reflectedLight\.directDiffuse \*= coralContactAo;/g)).toHaveLength(1)
    expect(legacyShader.match(/reflectedLight\.directSpecular \*= 0\.28;/g)).toHaveLength(1)
    expect(legacyShader.match(/float polypHighlight = smoothstep\(0\.46, 0\.78, polypDots\);/g)).toHaveLength(1)
    expect(legacyShader.match(/naturalGrad \*= \(0\.86 \+ 0\.22 \* texLuma \+ 0\.16 \* \(polypHighlight - 0\.4\)\);/g)).toHaveLength(1)
    expect(legacyShader.match(/max\(coralTipMask, polypHighlight \* 0\.65\)/g)).toHaveLength(1)
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
    expect(evaluateCoralContactAoFactor(0.5)).toBeCloseTo(0.64, 6)
    expect(evaluateCoralContactAoFactor(1)).toBeCloseTo(1.0, 6)
  })

  it('matches the shader vertical flex-squared response at partial raw R', () => {
    const position = { x: 0.03, y: 0.12, z: -0.02 }
    const mask = { r: 0.44, g: 0.4, b: 0.67, a: 0.25 }
    const time = 2.5
    const amplitude = 0.014
    const flexibility = Math.pow(mask.r, 1.8)
    const phaseSeed = mask.b * Math.PI * 2
    const spatialPhase = position.x * 11.5 + position.z * 9.2
    const phase1 = time * Math.PI * 2 * 0.28 + phaseSeed + spatialPhase
    const phase2 = time * Math.PI * 2 * 0.61 - phaseSeed * 1.37 + (position.z * 13 - position.x * 7.5)
    const swayX = Math.sin(phase1) + 0.38 * Math.cos(phase2)
    const swayZ = 0.76 * Math.cos(phase1 * 0.92 + 0.65) + 0.34 * Math.sin(phase2)
    const expected = {
      dx: swayX * amplitude * flexibility,
      dy: -0.18 * (Math.abs(swayX) + Math.abs(swayZ)) * amplitude * flexibility * flexibility,
      dz: swayZ * amplitude * flexibility,
      flexibilityWeight: flexibility,
    }
    expect(evaluateCoralVertexDisplacement(position, mask, 'coral-soft', time)).toMatchObject(expected)
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

  it('shades live-rock foundations in 3D isotropic meter space with upward-normal coralline plaques and zero UV stretching', () => {    const rockMat = new THREE.MeshStandardMaterial({
      map: new THREE.Texture(),
      normalMap: new THREE.Texture(),
    })
    applyLiveRockMaterial(rockMat)
    expect(rockMat.map).toBeNull()
    expect(rockMat.normalMap).toBeNull()
    expect(rockMat.userData.liveRockShader).toBe('live-rock-3d-aragonite-v1')

    const mockShader: THREE.WebGLProgramParametersWithUniforms = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    } as unknown as THREE.WebGLProgramParametersWithUniforms
    rockMat.onBeforeCompile(mockShader, {} as THREE.WebGLRenderer)
    expect(mockShader.vertexShader).toContain('vRockObjPos = position.xyz;')
    expect(mockShader.fragmentShader).toContain('finalRockColor')
    expect(mockShader.fragmentShader).toContain('roughnessFactor = mix(0.90, 0.65, corMask * 0.85);')

    const upwardCrest = evaluateLiveRockSurfaceSample({ x: 0.12, y: 0.34, z: -0.08 }, { x: 0, y: 1, z: 0 })
    const verticalWall = evaluateLiveRockSurfaceSample({ x: 0.12, y: 0.34, z: -0.08 }, { x: 1, y: 0, z: 0 })
    expect(upwardCrest.corallineMask).toBeGreaterThan(verticalWall.corallineMask)
    expect(verticalWall.corallineMask).toBe(0)
    expect(upwardCrest.roughness).toBeLessThan(verticalWall.roughness)
  })

  it('grades corals without an explicit override toward a saturated healthy palette (AQ-88 AC #1/#2)', () => {
    const binding = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-soft' })
    const hex = (color: THREE.Color) => `#${color.getHexString()}`
    expect(hex(binding.uniforms.uPaletteBase.value)).toBe(CORAL_DEFAULT_PALETTE.baseColor)
    expect(hex(binding.uniforms.uPaletteTip.value)).toBe(CORAL_DEFAULT_PALETTE.tipColor)
    expect(hex(binding.uniforms.uPaletteCrevice.value)).toBe(CORAL_DEFAULT_PALETTE.creviceColor)
    // The regrade is on by default now: the raw bleached texture no longer shows through.
    expect(binding.uniforms.uPaletteRegrade.value).toBe(CORAL_DEFAULT_REGRADE)
    expect(binding.uniforms.uPaletteRegrade.value).toBeGreaterThan(0.9)
    // Fluorescence stays mask-driven and unchanged: no blanket emissive.
    expect(binding.uniforms.uFluorescenceStrength.value).toBe(0.16)
    const rigid = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-rigid' })
    expect(rigid.uniforms.uFluorescenceStrength.value).toBe(0.10)
    expect(rigid.uniforms.uPaletteRegrade.value).toBe(CORAL_DEFAULT_REGRADE)
  })

  it('injects the AQ-88 saturation boost, pale-tip pull, and highlight ceiling into the tissue shader', () => {
    const material = new THREE.MeshStandardMaterial()
    const binding = applyCoralRawMaskMaterial(material, { role: 'coral-soft' })
    const mockShader: THREE.WebGLProgramParametersWithUniforms = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    } as unknown as THREE.WebGLProgramParametersWithUniforms
    binding.material.onBeforeCompile(mockShader, {} as THREE.WebGLRenderer)
    expect(mockShader.fragmentShader).toContain('vec3 coralTip = mix(uPaletteTip, uPaletteBase, 0.25);')
    expect(mockShader.fragmentShader).toContain('float coralLuma = dot(naturalGrad, vec3(0.299, 0.587, 0.114));')
    expect(mockShader.fragmentShader).toContain('naturalGrad = mix(vec3(coralLuma), naturalGrad, 1.18);')
    expect(mockShader.fragmentShader).toContain('naturalGrad = min(naturalGrad, vec3(0.92));')
    // Still mask-driven only: no unconditional emissive term is added.
    expect(mockShader.fragmentShader).toContain('totalEmissiveRadiance += coralSss + coralGlow;')
    expect(mockShader.fragmentShader).not.toContain('totalEmissiveRadiance += uPaletteBase')
  })

  it('scales mask-driven fluorescence with the fixture actinic level and removes the sine caustic shimmer (AQ-70.6 AC #1/#3)', () => {
    const binding = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-soft' })
    expect(binding.uniforms.uActinicLevel.value).toBe(1)
    const dimmed = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-soft', actinicLevel: 0.5 })
    expect(dimmed.uniforms.uActinicLevel.value).toBe(0.5)
    const clamped = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-soft', actinicLevel: 4 })
    expect(clamped.uniforms.uActinicLevel.value).toBe(2)
    const nonFinite = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-soft', actinicLevel: Number.NaN })
    expect(nonFinite.uniforms.uActinicLevel.value).toBe(1)

    const material = new THREE.MeshStandardMaterial()
    const shaderBinding = applyCoralRawMaskMaterial(material, { role: 'coral-soft' })
    const mockShader: THREE.WebGLProgramParametersWithUniforms = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    } as unknown as THREE.WebGLProgramParametersWithUniforms
    shaderBinding.material.onBeforeCompile(mockShader, {} as THREE.WebGLRenderer)
    expect(mockShader.fragmentShader).toContain('uFluorescenceStrength * uActinicLevel')
    // The old sine caustic shimmer is gone: the shared cellular caustic
    // chunk is the one caustic system on coral now.
    expect(mockShader.fragmentShader).not.toContain('causticBand')
    expect(mockShader.fragmentShader).not.toContain('cWave1')
    expect(mockShader.fragmentShader).not.toContain('cWave2')
    expect(mockShader.fragmentShader).not.toContain('vCoralWorldPos')
  })

  it('grades the healthy default palette saturated and the old pale palette better than the pre-AQ-88 grade (AQ-88 AC #1)', () => {
    const saturation = (c: { r: number; g: number; b: number }) =>
      (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / Math.max(c.r, c.g, c.b)
    const hex = (value: string) => {
      const n = parseInt(value.slice(1), 16)
      return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 }
    }
    // Healthy defaults stay saturated through a mid-tissue grade, capped below white.
    const healthy = evaluateCoralTissueColor({
      baseColor: hex(CORAL_DEFAULT_PALETTE.baseColor),
      tipColor: hex(CORAL_DEFAULT_PALETTE.tipColor),
      creviceColor: hex(CORAL_DEFAULT_PALETTE.creviceColor),
      heightTerm: 0.6,
      tipTerm: 0.5,
      texLuma: 0.5,
      polypHighlight: 0.5,
    })
    expect(saturation(healthy)).toBeGreaterThan(0.3)
    expect(healthy.r).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)
    expect(healthy.g).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)
    expect(healthy.b).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)

    // The old pale lavender palette grades more saturated than the pre-AQ-88
    // formula (tip unpulled, no saturation boost, no ceiling) on the same input.
    const input = {
      baseColor: hex('#c490ab'),
      tipColor: hex('#f2dce8'),
      creviceColor: hex('#4a3048'),
      heightTerm: 0.6,
      tipTerm: 0.5,
      texLuma: 0.8,
      polypHighlight: 0.6,
    }
    const graded = evaluateCoralTissueColor(input)
    const smoothstep = (e0: number, e1: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
      return t * t * (3 - 2 * t)
    }
    const mix = (a: number, b: number, t: number) => a + (b - a) * t
    const oldGrade = { r: 0, g: 0, b: 0 }
    for (const channel of ['r', 'g', 'b'] as const) {
      const grad = mix(
        mix(input.creviceColor[channel], input.baseColor[channel], smoothstep(0.02, 0.34, input.heightTerm)),
        input.tipColor[channel],
        smoothstep(0.22, 0.92, input.tipTerm),
      )
      oldGrade[channel] = grad * (0.86 + 0.22 * input.texLuma + 0.16 * (input.polypHighlight - 0.4))
    }
    expect(saturation(graded)).toBeGreaterThan(saturation(oldGrade))
    expect(graded.r).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)
    expect(graded.g).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)
    expect(graded.b).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)
  })

  it('matches GLSL saturation extrapolation above 1 and applies only its upper highlight ceiling', () => {
    const vivid = { r: 0.98, g: 0.2, b: 0.1 }
    const graded = evaluateCoralTissueColor({
      baseColor: vivid,
      tipColor: vivid,
      creviceColor: vivid,
      heightTerm: 0.6,
      tipTerm: 0.5,
      texLuma: 0.5,
      polypHighlight: 0.5,
    })

    // With identical palette endpoints, the brightness factor is 0.986,
    // giving [0.96628, 0.1972, 0.0986]. Its weighted luma is 0.41591452.
    // GLSL mix(luma, channel, 1.18) extrapolates to [1.065..., 0.1578313864,
    // 0.0414833864], then min(..., 0.92) caps only the red highlight.
    expect(graded.r).toBeCloseTo(0.92, 10)
    expect(graded.g).toBeCloseTo(0.1578313864, 10)
    expect(graded.b).toBeCloseTo(0.0414833864, 10)
    for (const channel of Object.values(graded)) {
      expect(channel).toBeLessThanOrEqual(CORAL_TISSUE_HIGHLIGHT_CEILING)
    }
  })
})
