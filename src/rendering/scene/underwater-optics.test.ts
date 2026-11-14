import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_AQUARIUM_OPTICS_CONFIG,
  LIGHT_SHAFT_BAND_CENTERS,
  LIGHT_SHAFT_SLANT_PER_M,
  LIGHT_SHAFT_SWAY_AMPLITUDE_M,
  REEF_SPECTRUM_KELVIN_RANGE,
  SUN_DIRECTION,
  WATER_SURFACE_Y,
  createMarineSnowPointsSystem,
  createReefFogExp2,
  createRestrainedCausticLightController,
  createParticleSprite,
  PARTICLE_SPRITE_SIZE_PX,
  bubbleEmitterForRockFootprint,
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
  lightShaftBandReach,
} from './underwater-optics'
import { evaluateSurfaceFocus, evaluateSurfaceHeight } from './surface-waves'

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
    // height (below the water surface plane at y = 4.4).
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

  it('places bubble emitters on the islands front faces, clear of the rock (visual-check fix)', () => {
    const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
    // Desktop left island: centre z -1.35 + radiusZ 1.15 + 0.15 clearance.
    const left = bubbleEmitterForRockFootprint({ x: -2.35, z: -1.35, radiusZ: 1.15 })
    expect(left.x).toBe(-2.35)
    expect(left.y).toBe(cfg.bubbleEmitterBaseY)
    expect(left.z).toBeCloseTo(-0.05, 9)
    // Desktop right island.
    const right = bubbleEmitterForRockFootprint({ x: 2.65, z: -1.2, radiusZ: 1.1 })
    expect(right.x).toBe(2.65)
    expect(right.y).toBe(cfg.bubbleEmitterBaseY)
    expect(right.z).toBeCloseTo(0.05, 9)
    // Narrow single island.
    const narrow = bubbleEmitterForRockFootprint({ x: -0.15, z: -1.35, radiusZ: 0.95 })
    expect(narrow.x).toBe(-0.15)
    expect(narrow.y).toBe(cfg.bubbleEmitterBaseY)
    expect(narrow.z).toBeCloseTo(-0.25, 9)
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
    // On a band centre at the surface: strong. The band centre at t=0
    // includes the wave-driven sway (shared field height at the band
    // root, scaled), not the old independent 0.05 Hz sine.
    const surfaceCenter =
      firstBand + LIGHT_SHAFT_SWAY_AMPLITUDE_M * evaluateSurfaceHeight(firstBand, -1.8, 0)
    const onBand = evaluateLightShaftIntensity(surfaceCenter, 2.8, 0)
    expect(onBand).toBeGreaterThan(0.5)
    // Far from every band: ~0.
    expect(evaluateLightShaftIntensity(5.5, 2.8, 0)).toBeLessThan(0.05)
    // The same band at the sand is 15% of its surface strength (slant included).
    const sandCenter =
      firstBand +
      5.6 * LIGHT_SHAFT_SLANT_PER_M +
      LIGHT_SHAFT_SWAY_AMPLITUDE_M * evaluateSurfaceHeight(firstBand, -1.8, 0)
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
    // Per-band depth stagger: reaches are hashed, in (0.55, 1.0), and
    // differ between bands, so most beams stop above the sand.
    const reaches = LIGHT_SHAFT_BAND_CENTERS.map(lightShaftBandReach)
    for (const reach of reaches) {
      expect(reach).toBeGreaterThan(0.55)
      expect(reach).toBeLessThan(1)
    }
    expect(new Set(reaches).size).toBe(reaches.length)
  })

  it('carries the surface-driven lighting config: sun direction, surface height, focus gain, raymarch tiers', () => {
    const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
    expect(cfg.surfaceY).toBe(WATER_SURFACE_Y)
    expect(cfg.surfaceY).toBe(4.4)
    expect(Math.hypot(cfg.sunDirection.x, cfg.sunDirection.y, cfg.sunDirection.z)).toBeCloseTo(1, 9)
    expect(cfg.sunDirection).toEqual(SUN_DIRECTION)
    expect(cfg.sunDirection.y).toBeGreaterThan(0.8)
    expect(cfg.surfaceFocusGain).toBe(0.6)
    expect(cfg.causticSandThreshold).toBe(0.3)
    expect(cfg.causticMaxAdd).toBe(0.35)
    expect(cfg.shaftRaymarchSteps).toBe(14)
    expect(cfg.shaftRaymarchAlpha).toBe(0.28)
    expect(cfg.shaftRenderScale).toBe(0.5)
    expect(cfg.shaftSoftClamp).toBe(1.8)
    // Every existing default is untouched by the extension.
    expect(cfg.causticPrimaryHz).toBe(0.22)
    expect(cfg.causticSecondaryHz).toBe(0.37)
    expect(cfg.lightShaftMaxAlpha).toBe(0.16)
  })

  it('slant-projects caustic UVs from the surface footpoint and reports the wave-field focus there', () => {
    // A fragment on the sand (y = -2.8) under a slanted sun: the
    // footpoint shifts along +sunDir.xz by (surfaceY - (-2.8)) / sunDir.y.
    const slanted = evaluateCausticPatternUV(0, 0, 0, { slant: { worldY: -2.8 } })
    const dist = (WATER_SURFACE_Y - -2.8) / SUN_DIRECTION.y
    expect(slanted.surfacePoint.x).toBeCloseTo(SUN_DIRECTION.x * dist, 9)
    expect(slanted.surfacePoint.z).toBeCloseTo(SUN_DIRECTION.z * dist, 9)
    expect(slanted.a.u).toBeCloseTo(
      slanted.surfacePoint.x * DEFAULT_AQUARIUM_OPTICS_CONFIG.causticTextureScaleA,
      9,
    )
    // The focus is the shared wave-field focus at the footpoint, not at
    // the fragment: it agrees with the field evaluated there.
    expect(slanted.focus).toBeCloseTo(
      evaluateSurfaceFocus(slanted.surfacePoint.x, slanted.surfacePoint.z, 0),
      9,
    )
    expect(slanted.focus).toBeGreaterThanOrEqual(-1)
    expect(slanted.focus).toBeLessThanOrEqual(1)
    // At the surface itself the slant vanishes: footpoint == fragment.
    const atSurface = evaluateCausticPatternUV(1.2, -0.8, 0, { slant: { worldY: WATER_SURFACE_Y } })
    expect(atSurface.surfacePoint).toEqual({ x: 1.2, z: -0.8 })
    // Without slant the legacy vertical projection is unchanged.
    const legacy = evaluateCausticPatternUV(1.2, -0.8, 0)
    expect(legacy.surfacePoint).toEqual({ x: 1.2, z: -0.8 })
    // Slant + pause freezes at the t=0 footpoint/focus.
    const paused = evaluateCausticPatternUV(0, 0, 5, { paused: true, slant: { worldY: -2.8 } })
    expect(paused).toEqual(slanted)
  })
  it('renders motes as a soft round disc, not a hard square (AQ-43 visual-check fix)', () => {
    const sprite = createParticleSprite('mote')
    expect(sprite.image.width).toBe(PARTICLE_SPRITE_SIZE_PX)
    expect(sprite.image.height).toBe(PARTICLE_SPRITE_SIZE_PX)
    expect(sprite.format).toBe(THREE.RGBAFormat)
    // Setting needsUpdate bumps the upload version (three.js resets the
    // flag itself); version > 0 proves the texture is queued for upload.
    expect(sprite.version).toBeGreaterThan(0)
    // Full alpha at the centre, ~half at mid-radius, transparent at the rim and corners.
    expect(spriteAlphaAt(sprite, 0, 0)).toBe(255)
    const mid = spriteAlphaAt(sprite, 0.65, 0)
    expect(mid).toBeGreaterThan(80)
    expect(mid).toBeLessThan(180)
    expect(spriteAlphaAt(sprite, 0.99, 0)).toBe(0)
    expect(spriteAlphaAt(sprite, 0.99, 0.99)).toBe(0)
    // RGB is white so the material colour tints it; alpha carries the shape.
    const image = sprite.image as { width: number; height: number; data: Uint8Array }
    const centre = (Math.floor(image.height / 2) * image.width + Math.floor(image.width / 2)) * 4
    expect(image.data[centre]).toBe(255)
    expect(image.data[centre + 1]).toBe(255)
    expect(image.data[centre + 2]).toBe(255)
    // Deterministic: two builds are byte-identical, so the scene looks the same every load.
    const again = createParticleSprite('mote')
    expect(Array.from((again.image as { data: Uint8Array }).data)).toEqual(Array.from(image.data))
  })
  it('renders bubbles as a thin bright ring, distinct from a mote disc (AQ-43 visual-check fix)', () => {
    const sprite = createParticleSprite('bubble')
    expect(sprite.image.width).toBe(PARTICLE_SPRITE_SIZE_PX)
    expect(sprite.image.height).toBe(PARTICLE_SPRITE_SIZE_PX)
    expect(sprite.format).toBe(THREE.RGBAFormat)
    // Transparent centre, bright rim at ~0.7 radius, transparent outer edge and corners.
    expect(spriteAlphaAt(sprite, 0, 0)).toBeLessThan(10)
    expect(spriteAlphaAt(sprite, 0.68, 0)).toBeGreaterThan(200)
    expect(spriteAlphaAt(sprite, 0.99, 0)).toBeLessThan(15)
    expect(spriteAlphaAt(sprite, 0.99, 0.99)).toBe(0)
    // The ring differs from the disc at the centre: a bubble is hollow, a mote is solid.
    expect(spriteAlphaAt(createParticleSprite('mote'), 0, 0)).toBe(255)
  })

  it('builds a 300-500 particle THREE.Points marine snow system, 14,000K-20,000K spectrum range, and FogExp2 that freeze on pause and reduced motion (AQ-96)', () => {
    expect(REEF_SPECTRUM_KELVIN_RANGE.minK).toBe(14000)
    expect(REEF_SPECTRUM_KELVIN_RANGE.maxK).toBe(20000)

    const fog = createReefFogExp2('#0b2e4f', 0.028)
    expect(fog).toBeInstanceOf(THREE.FogExp2)
    expect(fog.density).toBeCloseTo(0.028, 6)

    const snow = createMarineSnowPointsSystem(380)
    expect(snow.points).toBeInstanceOf(THREE.Points)
    expect(snow.count).toBeGreaterThanOrEqual(300)
    expect(snow.count).toBeLessThanOrEqual(500)

    const frozenBaseline = Array.from(snow.positions.slice(0, 18))
    snow.update(4.5, { paused: false, reducedMotion: false })
    const movingSnapshot = Array.from(snow.positions.slice(0, 18))
    expect(movingSnapshot).not.toEqual(frozenBaseline)

    snow.update(9.2, { paused: true })
    expect(Array.from(snow.positions.slice(0, 18))).toEqual(frozenBaseline)

    snow.update(14.7, { reducedMotion: true })
    expect(Array.from(snow.positions.slice(0, 18))).toEqual(frozenBaseline)
    snow.dispose()
  })
})

function spriteAlphaAt(texture: THREE.DataTexture, fx: number, fy: number): number {
  const image = texture.image as { width: number; height: number; data: Uint8Array }
  const x = Math.min(image.width - 1, Math.max(0, Math.floor((fx * 0.5 + 0.5) * image.width)))
  const y = Math.min(image.height - 1, Math.max(0, Math.floor((fy * 0.5 + 0.5) * image.height)))
  return image.data[(y * image.width + x) * 4 + 3]!
}
