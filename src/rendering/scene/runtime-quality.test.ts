import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_COOLDOWN_MS,
  ADAPTIVE_WINDOW_FRAMES,
  AdaptiveQualityController,
  LAZY_PHASE0_MAX_SPECIES,
  LOD_DEPTH_HYSTERESIS_M,
  LOD_FAR_DEPTH_M,
  LOD_MIN_PROJECTED_PX,
  LOD_NEAR_DEPTH_M,
  LOD_SPRITE_PROJECTED_PX,
  QUALITY_TIERS,
  lodAnimationFrameSkip,
  orderLazyLoadQueue,
  phase0SpeciesIds,
  projectedFishLengthPx,
  selectFishLod,
} from './runtime-quality'

describe('projectedFishLengthPx (AQ-76)', () => {
  it('matches the projectFishLinkBounds pixels-per-unit formula', () => {
    // 900 px viewport, 42-degree fov, 6.2 depth: ~189 px per world unit.
    const px = projectedFishLengthPx(1, 900, 42, 6.2)
    expect(px).toBeGreaterThan(180)
    expect(px).toBeLessThan(200)
    // A 1.44-unit blue-tang up close is ~272 px; a 0.36-unit blenny far is ~24 px.
    expect(projectedFishLengthPx(1.44, 900, 42, 6.2)).toBeGreaterThan(LOD_MIN_PROJECTED_PX)
    expect(projectedFishLengthPx(0.36, 900, 42, 13.6)).toBeLessThan(LOD_SPRITE_PROJECTED_PX)
  })

  it('returns 0 for invalid depth', () => {
    expect(projectedFishLengthPx(1, 900, 42, 0)).toBe(0)
    expect(projectedFishLengthPx(1, 900, 42, -3)).toBe(0)
    expect(projectedFishLengthPx(1, 900, 42, Number.NaN)).toBe(0)
  })
})

describe('selectFishLod (AQ-76 AC #1)', () => {
  it('uses the 6.2-13.6 depth bands, not generic 10/20/50 distances', () => {
    expect(selectFishLod(7, 100, 0)).toBe(0)
    expect(selectFishLod(9.5, 100, 0)).toBe(1)
    expect(selectFishLod(12.5, 100, 0)).toBe(2)
    // Mid-range depths are the common case for this tank, not "far".
    expect(selectFishLod(LOD_NEAR_DEPTH_M, 100, 0)).toBe(0)
    expect(selectFishLod(LOD_FAR_DEPTH_M, 100, 1)).toBe(1)
  })

  it('does not flicker at a band boundary (hysteresis)', () => {
    const justPastNear = LOD_NEAR_DEPTH_M + LOD_DEPTH_HYSTERESIS_M + 0.01
    expect(selectFishLod(justPastNear, 100, 0)).toBe(1)
    // Same depth coming back from LOD1 does not immediately step back up.
    expect(selectFishLod(justPastNear, 100, 1)).toBe(1)
    expect(selectFishLod(LOD_NEAR_DEPTH_M - LOD_DEPTH_HYSTERESIS_M - 0.01, 100, 1)).toBe(0)
    const justPastFar = LOD_FAR_DEPTH_M + LOD_DEPTH_HYSTERESIS_M + 0.01
    expect(selectFishLod(justPastFar, 100, 1)).toBe(2)
    expect(selectFishLod(justPastFar, 100, 2)).toBe(2)
    expect(selectFishLod(LOD_FAR_DEPTH_M - LOD_DEPTH_HYSTERESIS_M - 0.01, 100, 2)).toBe(1)
  })

  it('lets projected screen size override depth', () => {
    // A big fish at far depth still reads large on screen.
    expect(selectFishLod(13, 200, 2)).toBe(0)
    // A tiny fish up close still drops to the sprite.
    expect(selectFishLod(6.5, 40, 0)).toBe(2)
  })

  it('tightens both bands under the Low-tier bias', () => {
    expect(selectFishLod(9.5, 100, 0, 0.15)).toBe(1)
    expect(selectFishLod(9.5, 100, 0, 0)).toBe(1)
    // 7.5 m is LOD0 at rest but LOD1 when the Low tier tightens the near band to ~7.2 m + hysteresis.
    expect(selectFishLod(8.2, 100, 0, 0.15)).toBe(1)
    expect(selectFishLod(8.2, 100, 0, 0)).toBe(0)
  })
})

describe('lodAnimationFrameSkip (AQ-76 AC #1)', () => {
  it('halves the clip rate at LOD1 and stops it at LOD2', () => {
    expect(lodAnimationFrameSkip(0)).toBe(1)
    expect(lodAnimationFrameSkip(1)).toBe(2)
    expect(lodAnimationFrameSkip(2)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('lazy-load queue (AQ-76 AC #2)', () => {
  it('blocks first paint on at most the first 3 configured species', () => {
    expect(phase0SpeciesIds(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c'])
    expect(phase0SpeciesIds(['a', 'b'])).toEqual(['a', 'b'])
    expect(phase0SpeciesIds([])).toEqual([])
    expect(LAZY_PHASE0_MAX_SPECIES).toBe(3)
  })

  it('orders background loads in configured-service order, focused first', () => {
    expect(orderLazyLoadQueue(['e', 'd'], ['a', 'b', 'c', 'd', 'e'])).toEqual(['d', 'e'])
    expect(orderLazyLoadQueue(['e', 'd'], ['a', 'b', 'c', 'd', 'e'], 'e')).toEqual(['e', 'd'])
    expect(orderLazyLoadQueue(['x', 'd'], ['a', 'b', 'c', 'd', 'e'])).toEqual(['d', 'x'])
    expect(orderLazyLoadQueue(['a', 'a', 'b'], ['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('AdaptiveQualityController (AQ-76 AC #3)', () => {
  const feedWindow = (controller: AdaptiveQualityController, ms: number, now: number) => {
    for (let i = 0; i < ADAPTIVE_WINDOW_FRAMES; i++) controller.recordFrameInterval(ms, now + i)
    return controller.evaluate(now + ADAPTIVE_WINDOW_FRAMES)
  }

  it('stays High on fast frames and ignores partial windows', () => {
    const controller = new AdaptiveQualityController()
    for (let i = 0; i < ADAPTIVE_WINDOW_FRAMES - 1; i++) controller.recordFrameInterval(10, i)
    expect(controller.evaluate(1000)).toBe('high')
    expect(feedWindow(controller, 10, 2000)).toBe('high')
  })

  it('steps down after 2 consecutive slow windows, not one', () => {
    const controller = new AdaptiveQualityController()
    expect(feedWindow(controller, 25, 0)).toBe('high')
    expect(feedWindow(controller, 25, 10000)).toBe('balanced')
    expect(feedWindow(controller, 25, 20000)).toBe('balanced')
    expect(feedWindow(controller, 25, 30000)).toBe('low')
  })

  it('steps down on a slow p95 even when the EMA looks fine', () => {
    const controller = new AdaptiveQualityController()
    // 114 fast frames + 6 frames at 25 ms: p95 is 25 ms (slow) while the
    // EMA stays under 19 ms (25 - 15 * 0.9^6 ~= 17 ms).
    const feedMixed = (now: number) => {
      for (let i = 0; i < ADAPTIVE_WINDOW_FRAMES; i++) controller.recordFrameInterval(i < 114 ? 10 : 25, now + i)
      return controller.evaluate(now + ADAPTIVE_WINDOW_FRAMES)
    }
    expect(feedMixed(0)).toBe('high')
    expect(feedMixed(10000)).toBe('balanced')
  })

  it('steps back up after 3 consecutive fast windows', () => {
    const controller = new AdaptiveQualityController('low')
    expect(feedWindow(controller, 10, 0)).toBe('low')
    expect(feedWindow(controller, 10, 10000)).toBe('low')
    expect(feedWindow(controller, 10, 20000)).toBe('balanced')
    expect(feedWindow(controller, 10, 30000)).toBe('balanced')
    expect(feedWindow(controller, 10, 40000)).toBe('balanced')
    expect(feedWindow(controller, 10, 50000)).toBe('high')
  })

  it('does not oscillate: cooldown blocks a change within 5 s of the last one', () => {
    const controller = new AdaptiveQualityController()
    expect(feedWindow(controller, 25, 0)).toBe('high')
    expect(feedWindow(controller, 25, 1000)).toBe('balanced')
    // Two more slow windows inside the cooldown must not step down again.
    expect(feedWindow(controller, 25, 2000)).toBe('balanced')
    expect(feedWindow(controller, 25, 3000)).toBe('balanced')
    // After the cooldown, the next sustained slow window steps down to Low.
    expect(feedWindow(controller, 25, 10000)).toBe('low')
    expect(ADAPTIVE_COOLDOWN_MS).toBe(5000)
  })

  it('ignores hidden/paused/reduced-motion frames and clears the window', () => {
    const controller = new AdaptiveQualityController()
    for (let i = 0; i < ADAPTIVE_WINDOW_FRAMES - 1; i++) controller.recordFrameInterval(25, i)
    controller.recordFrameInterval(25, 1000, true)
    expect(controller.evaluate(2000)).toBe('high')
    expect(feedWindow(controller, 25, 3000)).toBe('high')
  })

  it('tiers apply the documented pixel-ratio and shadow settings', () => {
    expect(QUALITY_TIERS.high).toEqual({ pixelRatioCap: 1.5, shadows: true, lodBias: 0 })
    expect(QUALITY_TIERS.balanced).toEqual({ pixelRatioCap: 1.0, shadows: true, lodBias: 0 })
    expect(QUALITY_TIERS.low.shadows).toBe(false)
    expect(QUALITY_TIERS.low.pixelRatioCap).toBe(1.0)
    expect(QUALITY_TIERS.low.lodBias).toBeGreaterThan(0)
  })
})
