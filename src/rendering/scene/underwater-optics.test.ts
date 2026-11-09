import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_AQUARIUM_OPTICS_CONFIG,
  LIGHT_SHAFT_BAND_CENTERS,
  LIGHT_SHAFT_SLANT_PER_M,
  LIGHT_SHAFT_SWAY_AMPLITUDE_M,
  createRestrainedCausticLightController,
  evaluateBubblePosition,
  evaluateCausticIntensity,
  evaluateCausticPatternUV,
  evaluateCausticSurfaceMask,
  evaluateDepthHazeFactor,
  evaluateDepthTintedColor,
  evaluateDepthTransmittance,
  evaluateFixtureIntensities,
  evaluateFluorescenceActinicFactor,
  evaluateLightShaftIntensity,
  evaluateSurfaceRippleOffset,
  evaluateSuspendedParticlePosition,
} from './underwater-optics'

describe('aquarium-scale underwater optics, restrained caustics, and suspended particles (AQ-39 / AQ-14.2 / AQ-43)', () => {
  it('computes Pope & Fry (1997) spectral transmittance bounded to home-aquarium depth without an artificial blue veil', () => {
    const surface = evaluateDepthTransmittance(0)
    expect(surface).toEqual({ r: 1, g: 1, b: 1 })

    const midTank = evaluateDepthTransmittance(1.2)
    // Red attenuates fastest, followed by green, then blue
    expect(midTank.r).toBeLessThan(midTank.g)
    expect(midTank.g).toBeLessThan(midTank.b)
    // Never drops below aquarium-safe visibility floors
    const rearWall = evaluateDepthTransmittance(10)
    expect(rearWall.r).toBeGreaterThanOrEqual(0.35)
    expect(rearWall.g).toBeGreaterThanOrEqual(0.78)
    expect(rearWall.b).toBeGreaterThanOrEqual(0.90)
  })

  it('tints a background colour by Beer-Lambert transmittance without veiling the foreground (AQ-39)', () => {
    expect(evaluateDepthTintedColor('#183654', 0)).toBe('#183654')
    // At the rear-wall path depth the scene background '#183654' becomes '#082d50'
    expect(evaluateDepthTintedColor(DEFAULT_AQUARIUM_OPTICS_CONFIG.backgroundHex, 3.5)).toBe('#082d50')
    const tinted = evaluateDepthTintedColor('#ffffff', 3.5)
    const channels = [1, 3, 5].map(i => parseInt(tinted.slice(i, i + 2), 16))
    // Red attenuates most, blue least — the depth tint is a blue shift, not a grey veil
    expect(channels[0]).toBeLessThan(channels[1])
    expect(channels[1]).toBeLessThan(channels[2])
    expect(tinted).toMatch(/^#[0-9a-f]{6}$/)
    expect(evaluateDepthTintedColor('not-a-colour', 3.5)).toBe('not-a-colour')
  })

  it('projects coherent dual-wave caustics onto upward-facing surfaces and freezes when paused or reduced-motion is active', () => {
    const underside = evaluateCausticIntensity({ x: 0.5, y: 0, z: 0.2 }, -0.6, 2.0)
    expect(underside).toBe(0)

    const t1 = evaluateCausticIntensity({ x: 0.5, y: 1.0, z: 0.2 }, 1.0, 1.2)
    const t2 = evaluateCausticIntensity({ x: 0.5, y: 1.0, z: 0.2 }, 1.0, 2.7)
    expect(t1).toBeGreaterThan(0.5)
    expect(t1).not.toBeCloseTo(t2, 4)

    const pausedA = evaluateCausticIntensity({ x: 0.5, y: 1.0, z: 0.2 }, 1.0, 1.2, { paused: true })
    const pausedB = evaluateCausticIntensity({ x: 0.5, y: 1.0, z: 0.2 }, 1.0, 9.8, { paused: true })
    expect(pausedA).toEqual(pausedB)

    const reducedA = evaluateCausticIntensity({ x: 0.5, y: 1.0, z: 0.2 }, 1.0, 1.2, { reducedMotion: true })
    expect(reducedA).toEqual(pausedA)
  })

  it('masks caustics to upward-facing surfaces and fades them with depth, shared by the scalar and texture channels', () => {
    expect(evaluateCausticSurfaceMask({ x: 0, y: 0, z: 0 }, -0.6)).toBe(0)
    expect(evaluateCausticSurfaceMask({ x: 0, y: 0, z: 0 }, 0)).toBe(0)
    // Top of tank, fully upward: full mask
    expect(evaluateCausticSurfaceMask({ x: 0, y: 2.8, z: 0 }, 1)).toBeCloseTo(1)
    // Sand bed: faded to 0.65, never zero
    expect(evaluateCausticSurfaceMask({ x: 0, y: -2.8, z: 0 }, 1)).toBeCloseTo(0.65)
    // Half-upward normal halves the mask
    expect(evaluateCausticSurfaceMask({ x: 0, y: 2.8, z: 0 }, 0.5)).toBeCloseTo(0.5)
  })

  it('returns two scrolled caustic-texture UV pairs that freeze at t=0 on pause or reduced-motion', () => {
    const atZero = evaluateCausticPatternUV(1.2, -0.8, 0)
    expect(atZero.a.u).toBeCloseTo(1.2 * DEFAULT_AQUARIUM_OPTICS_CONFIG.causticTextureScaleA)
    expect(atZero.a.v).toBeCloseTo(-0.8 * DEFAULT_AQUARIUM_OPTICS_CONFIG.causticTextureScaleA)
    expect(atZero.b.u).toBeCloseTo(1.2 * DEFAULT_AQUARIUM_OPTICS_CONFIG.causticTextureScaleB)
    expect(atZero.b.v).toBeCloseTo(-0.8 * DEFAULT_AQUARIUM_OPTICS_CONFIG.causticTextureScaleB)

    const active = evaluateCausticPatternUV(1.2, -0.8, 5)
    // Layers scroll in opposite directions and at different rates
    expect(active.a.u).toBeGreaterThan(atZero.a.u)
    expect(active.b.u).toBeLessThan(atZero.b.u)
    expect(active.a).not.toEqual(active.b)

    const paused = evaluateCausticPatternUV(1.2, -0.8, 5, { paused: true })
    expect(paused).toEqual(atZero)
    const reduced = evaluateCausticPatternUV(1.2, -0.8, 5, { reducedMotion: true })
    expect(reduced).toEqual(atZero)
  })

  it('evaluates subtle water-surface ripples and suspended particle drift that freeze cleanly under pause and reduced-motion', () => {
    expect(evaluateSurfaceRippleOffset(1.2, -0.4, 3.5, { paused: true })).toBe(0)
    expect(evaluateSurfaceRippleOffset(1.2, -0.4, 3.5, { reducedMotion: true })).toBe(0)
    const activeRipple = evaluateSurfaceRippleOffset(1.2, -0.4, 3.5)
    expect(Math.abs(activeRipple)).toBeLessThanOrEqual(DEFAULT_AQUARIUM_OPTICS_CONFIG.surfaceRippleAmplitudeM)

    const bounds = { min: { x: -4, y: -2.2, z: -4 }, max: { x: 4, y: 2.8, z: 2.8 } }
    const pPaused1 = evaluateSuspendedParticlePosition(3, bounds, 1.0, { paused: true })
    const pPaused2 = evaluateSuspendedParticlePosition(3, bounds, 15.0, { paused: true })
    expect(pPaused1).toEqual(pPaused2)

    const pActive = evaluateSuspendedParticlePosition(3, bounds, 4.2)
    expect(pActive.x).toBeGreaterThanOrEqual(bounds.min.x)
    expect(pActive.x).toBeLessThanOrEqual(bounds.max.x)
    expect(pActive.y).toBeGreaterThanOrEqual(bounds.min.y)
    expect(pActive.y).toBeLessThanOrEqual(bounds.max.y)
    expect(pActive.z).toBeGreaterThanOrEqual(bounds.min.z)
    expect(pActive.z).toBeLessThanOrEqual(bounds.max.z)
  })

  it('keeps depth-graded motes inside their z-band and bounds, and freezes them on pause', () => {
    const bounds = { min: { x: -4, y: -2.2, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }
    // The two amended bands sum to the configured total.
    expect(
      DEFAULT_AQUARIUM_OPTICS_CONFIG.foregroundSuspendedParticles +
        DEFAULT_AQUARIUM_OPTICS_CONFIG.backgroundSuspendedParticles,
    ).toBe(DEFAULT_AQUARIUM_OPTICS_CONFIG.maxSuspendedParticles)
    for (let i = 0; i < 48; i++) {
      const fg = evaluateSuspendedParticlePosition(i, bounds, 3.7, { zBand: { min: -1.5, max: 2.8 } })
      const bg = evaluateSuspendedParticlePosition(i, bounds, 3.7, { zBand: { min: -4.6, max: -1.5 } })
      // ±0.04 m Z drift may carry a mote just past its band edge; it must
      // never leave the water column itself.
      expect(fg.z).toBeGreaterThanOrEqual(-1.5 - 0.05)
      expect(fg.z).toBeLessThanOrEqual(2.8 + 0.05)
      expect(bg.z).toBeGreaterThanOrEqual(-4.6 - 0.05)
      expect(bg.z).toBeLessThanOrEqual(-1.5 + 0.05)
      for (const p of [fg, bg]) {
        expect(p.x).toBeGreaterThanOrEqual(bounds.min.x)
        expect(p.x).toBeLessThanOrEqual(bounds.max.x)
        expect(p.y).toBeGreaterThanOrEqual(bounds.min.y)
        expect(p.y).toBeLessThanOrEqual(bounds.max.y)
      }
    }
    const frozen1 = evaluateSuspendedParticlePosition(5, bounds, 1.0, { paused: true, zBand: { min: -1.5, max: 2.8 } })
    const frozen2 = evaluateSuspendedParticlePosition(5, bounds, 9.0, { paused: true, zBand: { min: -1.5, max: 2.8 } })
    expect(frozen1).toEqual(frozen2)
  })

  it('rises sparse emitter-anchored bubbles, recycles them below the surface, and freezes them on pause (AQ-43 as amended)', () => {
    const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
    expect(cfg.maxBubbles).toBe(32)
    const bounds = { min: { x: -4, y: -2.25, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }
    const emitter = { x: -2.35, y: cfg.bubbleEmitterBaseY, z: -1.35 }

    // Deterministic: same seed and time always give the same position.
    const a = evaluateBubblePosition(2, emitter, bounds, 4.2)
    expect(a).toEqual(evaluateBubblePosition(2, emitter, bounds, 4.2))

    // Rises monotonically between recycles and never passes the recycle
    // height (below the water surface plane at y = 2.66).
    let previousY = -Infinity
    let sawRecycle = false
    for (let t = 0; t <= 30; t += 0.25) {
      const p = evaluateBubblePosition(2, emitter, bounds, t)
      expect(p.y).toBeLessThanOrEqual(cfg.bubbleRecycleTopY)
      expect(p.y).toBeGreaterThanOrEqual(emitter.y)
      expect(p.x).toBeGreaterThanOrEqual(bounds.min.x)
      expect(p.x).toBeLessThanOrEqual(bounds.max.x)
      expect(p.z).toBeGreaterThanOrEqual(bounds.min.z)
      expect(p.z).toBeLessThanOrEqual(bounds.max.z)
      // Wobble is bounded by the configured amplitude.
      expect(Math.abs(p.x - emitter.x)).toBeLessThanOrEqual(cfg.bubbleWobbleAmplitudeM + 1e-9)
      expect(Math.abs(p.z - emitter.z)).toBeLessThanOrEqual(cfg.bubbleWobbleAmplitudeM + 1e-9)
      if (p.y < previousY) sawRecycle = true
      else expect(p.y).toBeGreaterThanOrEqual(previousY)
      previousY = p.y
    }
    expect(sawRecycle).toBe(true)

    // Larger bubbles (higher size hash) rise faster: compare two seeds
    // over the same interval and expect the faster one higher, or equal
    // only if both recycled — so compare shortly after t=0 instead.
    const slow = evaluateBubblePosition(0, emitter, bounds, 1.0)
    const fast = evaluateBubblePosition(7, emitter, bounds, 1.0)
    expect(slow.y).not.toBe(fast.y)

    // Pause and reduced-motion freeze at the static emitter position,
    // identical at different times.
    const frozen1 = evaluateBubblePosition(2, emitter, bounds, 1.0, { paused: true })
    const frozen2 = evaluateBubblePosition(2, emitter, bounds, 15.0, { paused: true })
    expect(frozen1).toEqual(frozen2)
    expect(frozen1.y).toBe(emitter.y)
    expect(evaluateBubblePosition(2, emitter, bounds, 15.0, { reducedMotion: true })).toEqual(frozen1)
  })

  it('modulates directional key/fill lights and restores exact base intensity and position when paused', () => {
    const key = new THREE.DirectionalLight(0xffffff, 3)
    key.position.set(1, 6, 5)
    const fill = new THREE.DirectionalLight(0xffffff, 1)
    const controller = createRestrainedCausticLightController(key, fill)

    controller.update(2.1, false, false)
    expect(key.position.x).not.toBeCloseTo(1, 3)

    controller.update(2.1, true, false)
    expect(key.intensity).toBe(DEFAULT_AQUARIUM_OPTICS_CONFIG.keyLightIntensity)
    expect(key.position.toArray()).toEqual([1, 6, 5])
    expect(fill.intensity).toBe(DEFAULT_AQUARIUM_OPTICS_CONFIG.fillLightIntensity)
  })

  it('keeps restrained depth haze behind the fish volume and out of the foreground (AQ-86 AC #1)', () => {
    // Inside the primary fish volume (z >= -1.5): no haze at any height.
    expect(evaluateDepthHazeFactor(2.0, 0)).toBe(0)
    expect(evaluateDepthHazeFactor(-1.5, 0)).toBe(0)
    expect(evaluateDepthHazeFactor(-1.4, -2.8)).toBe(0)
    // Behind the volume the haze ramps in, reaching full strength at the rear wall.
    expect(evaluateDepthHazeFactor(-3.0, 0)).toBeGreaterThan(0)
    expect(evaluateDepthHazeFactor(-3.0, 0)).toBeLessThan(1)
    expect(evaluateDepthHazeFactor(-4.6, -2.8)).toBeCloseTo(1)
    // Stronger with depth at the same z: 0.55 at the surface, 1.0 at the sand.
    expect(evaluateDepthHazeFactor(-4.6, 2.8)).toBeCloseTo(0.55)
    expect(evaluateDepthHazeFactor(-3.0, -2.8)).toBeGreaterThan(evaluateDepthHazeFactor(-3.0, 2.8))
    // The rendered haze stays well below full opacity: crisp deep focus, no veil.
    expect(DEFAULT_AQUARIUM_OPTICS_CONFIG.depthHazeMaxAlpha).toBeLessThanOrEqual(0.25)
    expect(DEFAULT_AQUARIUM_OPTICS_CONFIG.lightShaftMaxAlpha).toBeLessThanOrEqual(0.2)
    expect(evaluateDepthHazeFactor(NaN, 0)).toBe(0)
  })

  it('derives key/fill intensities from the fixture white/blue balance, preserving the current scene values at the default (AQ-70.6 AC #2)', () => {
    const defaults = evaluateFixtureIntensities(
      DEFAULT_AQUARIUM_OPTICS_CONFIG.fixtureWhiteBalance,
      DEFAULT_AQUARIUM_OPTICS_CONFIG.fixtureTotalIntensity,
    )
    expect(defaults.keyLightIntensity).toBeCloseTo(DEFAULT_AQUARIUM_OPTICS_CONFIG.keyLightIntensity, 6)
    expect(defaults.fillLightIntensity).toBeCloseTo(DEFAULT_AQUARIUM_OPTICS_CONFIG.fillLightIntensity, 6)
    expect(defaults.keyLightIntensity).toBeCloseTo(2.1, 6)
    expect(defaults.fillLightIntensity).toBeCloseTo(0.95, 6)
    // All white / all actinic endpoints split the same total.
    expect(evaluateFixtureIntensities(1, 3)).toEqual({ keyLightIntensity: 3, fillLightIntensity: 0 })
    expect(evaluateFixtureIntensities(0, 3)).toEqual({ keyLightIntensity: 0, fillLightIntensity: 3 })
    expect(evaluateFixtureIntensities(0.5, 4)).toEqual({ keyLightIntensity: 2, fillLightIntensity: 2 })
    // Out-of-range and non-finite inputs fall back instead of producing
    // negative or NaN light.
    const clamped = evaluateFixtureIntensities(1.5, 3)
    expect(clamped.keyLightIntensity).toBe(3)
    expect(clamped.fillLightIntensity).toBe(0)
    const fallback = evaluateFixtureIntensities(Number.NaN, Number.NaN)
    expect(fallback.keyLightIntensity).toBeCloseTo(2.1, 6)
    expect(fallback.fillLightIntensity).toBeCloseTo(0.95, 6)
  })

  it('scales coral fluorescence with the fixture actinic share: 1 at the default balance, 0 all-white, capped at 2 (AQ-70.6 AC #3)', () => {
    expect(evaluateFluorescenceActinicFactor(DEFAULT_AQUARIUM_OPTICS_CONFIG.fixtureWhiteBalance)).toBeCloseTo(1, 6)
    expect(evaluateFluorescenceActinicFactor(1)).toBe(0)
    expect(evaluateFluorescenceActinicFactor(0)).toBe(2)
    // A lower white balance raises the blue share: at balance 0.5 the
    // actinic share is 0.5 vs the default ~0.31, so the factor is ~1.6.
    const moreActinic = evaluateFluorescenceActinicFactor(0.5)
    expect(moreActinic).toBeGreaterThan(1)
    expect(moreActinic).toBeLessThan(2)
    expect(evaluateFluorescenceActinicFactor(Number.NaN)).toBeCloseTo(1, 6)
  })

  it('projects soft volumetric shafts that weaken with depth and freeze on pause (AQ-86 AC #2)', () => {
    const firstBand = LIGHT_SHAFT_BAND_CENTERS[0]!
    // On a band centre at the surface: strong.
    const surfaceCenter = firstBand + LIGHT_SHAFT_SWAY_AMPLITUDE_M * Math.sin(firstBand)
    const onBand = evaluateLightShaftIntensity(surfaceCenter, 2.8, 0)
    expect(onBand).toBeGreaterThan(0.5)
    // Far from every band: ~0.
    expect(evaluateLightShaftIntensity(5.5, 2.8, 0)).toBeLessThan(0.05)
    // The same band at the sand is 15% of its surface strength (slant included).
    const sandCenter = firstBand + 5.6 * LIGHT_SHAFT_SLANT_PER_M + LIGHT_SHAFT_SWAY_AMPLITUDE_M * Math.sin(firstBand)
    const atSand = evaluateLightShaftIntensity(sandCenter, -2.8, 0)
    expect(atSand).toBeGreaterThan(0)
    expect(atSand).toBeLessThanOrEqual(onBand * 0.2)
    // Slow sway, never flicker-fast.
    const t1 = evaluateLightShaftIntensity(0.2, 1.0, 1.2)
    const t2 = evaluateLightShaftIntensity(0.2, 1.0, 2.7)
    expect(t1).not.toBeCloseTo(t2, 4)
    // Pause and reduced-motion freeze at the static t=0 phase.
    const pausedA = evaluateLightShaftIntensity(0.2, 1.0, 1.2, { paused: true })
    const pausedB = evaluateLightShaftIntensity(0.2, 1.0, 9.8, { paused: true })
    expect(pausedA).toEqual(pausedB)
    expect(evaluateLightShaftIntensity(0.2, 1.0, 5, { reducedMotion: true })).toEqual(pausedA)
    // Bounded 0..1 everywhere in the tank.
    for (const [x, y] of [[-4, -2.8], [0, 0], [4, 2.8], [-2.2, 2.8]] as const) {
      const value = evaluateLightShaftIntensity(x, y, 3.3)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})
