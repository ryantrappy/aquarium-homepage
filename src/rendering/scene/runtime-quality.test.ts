import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_COOLDOWN_MS,
  ADAPTIVE_MIN_WINDOW_FRAMES,
  ADAPTIVE_STEP_DOWN_EMA_MS,
  ADAPTIVE_STEP_DOWN_P95_MS,
  ADAPTIVE_STEP_UP_EMA_MS,
  ADAPTIVE_WINDOW_DURATION_MS,
  ADAPTIVE_WINDOW_FRAMES,
  AdaptiveQualityController,
  consumeLodAnimationDelta,
  createLodAnimationDeltaState,
  LAZY_PHASE0_MAX_SPECIES,
  LOD_DEPTH_HYSTERESIS_M,
  LOD_MIN_PROJECTED_PX,
  LOD_NEAR_DEPTH_M,
  QUALITY_TIERS,
  lodAnimationFrameSkip,
  orderLazyLoadQueue,
  phase0SpeciesIds,
  projectedFishLengthPx,
  selectFishLod,
  shaftModeForTier,
} from './runtime-quality'
import { FRAME_TIME_BUDGET } from '../assets/budgets'

describe('projectedFishLengthPx (AQ-76)', () => {
  it('matches the projectFishLinkBounds pixels-per-unit formula', () => {
    // 900 px viewport, 42-degree fov, 6.2 depth: ~189 px per world unit.
    const px = projectedFishLengthPx(1, 900, 42, 6.2)
    expect(px).toBeGreaterThan(180)
    expect(px).toBeLessThan(200)
    // A 1.44-unit blue-tang up close is ~272 px; a 0.36-unit blenny far is ~24 px.
    expect(projectedFishLengthPx(1.44, 900, 42, 6.2)).toBeGreaterThan(LOD_MIN_PROJECTED_PX)
    expect(projectedFishLengthPx(0.36, 900, 42, 13.6)).toBeLessThan(LOD_MIN_PROJECTED_PX)
  })

  it('returns 0 for invalid depth', () => {
    expect(projectedFishLengthPx(1, 900, 42, 0)).toBe(0)
    expect(projectedFishLengthPx(1, 900, 42, -3)).toBe(0)
    expect(projectedFishLengthPx(1, 900, 42, Number.NaN)).toBe(0)
  })
})

describe('selectFishLod (AQ-76 AC #1)', () => {
  it('uses the 6.2-13.6 depth band, not generic 10/20/50 distances', () => {
    expect(selectFishLod(7, 100, 0)).toBe(0)
    expect(selectFishLod(9.5, 100, 0)).toBe(1)
    // There is no sprite tier any more: the farthest fish only ever drops
    // to LOD1 (full GLB, half clip rate), never to a flat sprite.
    expect(selectFishLod(12.5, 100, 0)).toBe(1)
    expect(selectFishLod(13.6, 100, 1)).toBe(1)
    // Mid-range depths are the common case for this tank, not "far".
    expect(selectFishLod(LOD_NEAR_DEPTH_M, 100, 0)).toBe(0)
  })

  it('does not flicker at the band boundary (hysteresis)', () => {
    const justPastNear = LOD_NEAR_DEPTH_M + LOD_DEPTH_HYSTERESIS_M + 0.01
    expect(selectFishLod(justPastNear, 100, 0)).toBe(1)
    // Same depth coming back from LOD1 does not immediately step back up.
    expect(selectFishLod(justPastNear, 100, 1)).toBe(1)
    expect(selectFishLod(LOD_NEAR_DEPTH_M - LOD_DEPTH_HYSTERESIS_M - 0.01, 100, 1)).toBe(0)
  })

  it('lets projected screen size override depth', () => {
    // A big fish at far depth still reads large on screen.
    expect(selectFishLod(13, 200, 1)).toBe(0)
    // A tiny fish at far depth only halves its clip rate now — it never
    // becomes a sprite, however small it projects.
    expect(selectFishLod(13.6, 40, 1)).toBe(1)
    expect(selectFishLod(13.6, 1, 1)).toBe(1)
  })

  it('tightens the near band under the Low-tier bias', () => {
    expect(selectFishLod(9.5, 100, 0, 0.15)).toBe(1)
    expect(selectFishLod(9.5, 100, 0, 0)).toBe(1)
    // 7.5 m is LOD0 at rest but LOD1 when the Low tier tightens the near band to ~7.2 m + hysteresis.
    expect(selectFishLod(8.2, 100, 0, 0.15)).toBe(1)
    expect(selectFishLod(8.2, 100, 0, 0)).toBe(0)
  })
})

describe('lodAnimationFrameSkip (AQ-76 AC #1)', () => {
  it('halves the clip rate at LOD1 and never stops it outright', () => {
    expect(lodAnimationFrameSkip(0)).toBe(1)
    expect(lodAnimationFrameSkip(1)).toBe(2)
  })
})

describe('LOD animation delta accrual (AQ-76)', () => {
  const step = 1 / 60

  it('preserves total animation time while LOD1 updates on alternating steps', () => {
    const state = createLodAnimationDeltaState(1)
    const emitted: number[] = []
    for (let frame = 0; frame < 60; frame++) {
      emitted.push(consumeLodAnimationDelta(state, step, 1))
    }

    expect(emitted[0]).toBe(0)
    expect(emitted[1]).toBeCloseTo(2 * step)
    expect(emitted[2]).toBe(0)
    expect(emitted[3]).toBeCloseTo(2 * step)
    expect(emitted.filter((delta) => delta > 0)).toHaveLength(30)
    expect(emitted.reduce((total, delta) => total + delta, 0)).toBeCloseTo(1)
  })

  it('emits every LOD0 fixed step and does not accrue paused time', () => {
    const state = createLodAnimationDeltaState(0)
    expect(consumeLodAnimationDelta(state, step, 0)).toBeCloseTo(step)
    expect(consumeLodAnimationDelta(state, 10, 0, true)).toBe(0)
    expect(consumeLodAnimationDelta(state, step, 0)).toBeCloseTo(step)
  })

  it('retains partial active time across pause and resumes on a fresh LOD cadence', () => {
    const state = createLodAnimationDeltaState(1)
    expect(consumeLodAnimationDelta(state, step, 1)).toBe(0)
    expect(consumeLodAnimationDelta(state, 5, 1, true)).toBe(0)
    expect(consumeLodAnimationDelta(state, step, 1)).toBe(0)
    expect(consumeLodAnimationDelta(state, step, 1)).toBeCloseTo(3 * step)
  })

  it('keeps accrued time when LOD changes and restarts the new cadence', () => {
    const state = createLodAnimationDeltaState(1)
    expect(consumeLodAnimationDelta(state, step, 1)).toBe(0)
    // Moving to LOD0 consumes its current step plus the pending LOD1 step.
    expect(consumeLodAnimationDelta(state, step, 0)).toBeCloseTo(2 * step)
    expect(consumeLodAnimationDelta(state, step, 1)).toBe(0)
    expect(consumeLodAnimationDelta(state, step, 1)).toBeCloseTo(2 * step)
  })

  it('ignores invalid deltas without corrupting the cadence', () => {
    const state = createLodAnimationDeltaState(1)
    expect(consumeLodAnimationDelta(state, Number.NaN, 1)).toBe(0)
    expect(consumeLodAnimationDelta(state, step, 1)).toBe(0)
    expect(consumeLodAnimationDelta(state, step, 1)).toBeCloseTo(2 * step)
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

  it('steps down at 15 FPS after two elapsed 2-second windows', () => {
    const controller = new AdaptiveQualityController()
    const intervalMs = 1000 / 15
    const feedElapsedWindow = (startAtMs: number) => {
      let tier = controller.currentTier
      // 31 samples span exactly 2 seconds at 15 FPS. Thirty samples alone
      // span only 1.93 seconds and are intentionally insufficient.
      for (let frame = 0; frame <= ADAPTIVE_MIN_WINDOW_FRAMES; frame++) {
        const nowMs = startAtMs + frame * intervalMs
        controller.recordFrameInterval(intervalMs, nowMs)
        tier = controller.evaluate(nowMs)
      }
      return tier
    }

    expect(feedElapsedWindow(0)).toBe('high')
    expect(feedElapsedWindow(ADAPTIVE_WINDOW_DURATION_MS + intervalMs)).toBe('balanced')
    expect(ADAPTIVE_WINDOW_DURATION_MS).toBe(2000)
  })

  it('restarts the elapsed window and slow-window count after excluded samples', () => {
    const controller = new AdaptiveQualityController()
    const intervalMs = 1000 / 15

    // A partial old window must not contribute samples or elapsed time.
    for (let frame = 0; frame < ADAPTIVE_MIN_WINDOW_FRAMES; frame++) {
      const nowMs = frame * intervalMs
      controller.recordFrameInterval(25, nowMs)
      controller.evaluate(nowMs)
    }
    controller.recordFrameInterval(25, 5000, true)
    expect(controller.evaluate(5000)).toBe('high')

    // The first fresh window starts at 10s and evaluates at 12s. The next
    // window must then span another full 2s, rather than using the old start.
    for (let frame = 0; frame <= ADAPTIVE_MIN_WINDOW_FRAMES; frame++) {
      const nowMs = 10000 + frame * intervalMs
      controller.recordFrameInterval(25, nowMs)
      expect(controller.evaluate(nowMs)).toBe('high')
    }
    for (let frame = 1; frame <= ADAPTIVE_MIN_WINDOW_FRAMES; frame++) {
      const nowMs = 10000 + ADAPTIVE_WINDOW_DURATION_MS + frame * intervalMs
      controller.recordFrameInterval(25, nowMs)
      expect(controller.evaluate(nowMs)).toBe('high')
    }
    const secondWindowEnd = 10000 + ADAPTIVE_WINDOW_DURATION_MS + (ADAPTIVE_MIN_WINDOW_FRAMES + 1) * intervalMs
    controller.recordFrameInterval(25, secondWindowEnd)
    expect(controller.evaluate(secondWindowEnd)).toBe('balanced')
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

  it('restores Low all the way to High on healthy 60 Hz RAF intervals', () => {
    const controller = new AdaptiveQualityController('low')
    const intervalMs = 1000 / 60
    const feed60HzWindow = (startAtMs: number) => {
      for (let frame = 0; frame < ADAPTIVE_WINDOW_FRAMES; frame++) {
        controller.recordFrameInterval(intervalMs, startAtMs + frame * intervalMs)
      }
      return controller.evaluate(startAtMs + ADAPTIVE_WINDOW_FRAMES * intervalMs)
    }

    expect(feed60HzWindow(0)).toBe('low')
    expect(feed60HzWindow(10000)).toBe('low')
    expect(feed60HzWindow(20000)).toBe('balanced')
    expect(feed60HzWindow(30000)).toBe('balanced')
    expect(feed60HzWindow(40000)).toBe('balanced')
    expect(feed60HzWindow(50000)).toBe('high')
    expect(ADAPTIVE_STEP_UP_EMA_MS).toBe(17.5)
  })

  it('does not restore on a stable 18 ms deadband', () => {
    const controller = new AdaptiveQualityController('low')
    expect(feedWindow(controller, 18, 0)).toBe('low')
    expect(feedWindow(controller, 18, 10000)).toBe('low')
    expect(feedWindow(controller, 18, 20000)).toBe('low')
  })

  it('does not restore when a fast EMA hides a p95-spiky window', () => {
    const controller = new AdaptiveQualityController('low')
    const feedSpikyWindow = (now: number) => {
      // Put six slow intervals first so EMA settles back near 60 Hz, while
      // more than five percent of samples still push p95 over the budget.
      for (let i = 0; i < ADAPTIVE_WINDOW_FRAMES; i++) {
        controller.recordFrameInterval(i < 6 ? 25 : 1000 / 60, now + i)
      }
      return controller.evaluate(now + ADAPTIVE_WINDOW_FRAMES)
    }

    expect(feedSpikyWindow(0)).toBe('low')
    expect(feedSpikyWindow(10000)).toBe('low')
    expect(feedSpikyWindow(20000)).toBe('low')
  })

  it('keeps recovery streaks separated by exclusions and honors cooldown after repeated tier changes', () => {
    const controller = new AdaptiveQualityController('low')
    expect(feedWindow(controller, 1000 / 60, 0)).toBe('low')
    expect(feedWindow(controller, 1000 / 60, 10000)).toBe('low')
    controller.recordFrameInterval(1000 / 60, 21000, true)
    expect(controller.evaluate(21000)).toBe('low')
    expect(feedWindow(controller, 1000 / 60, 30000)).toBe('low')
    expect(feedWindow(controller, 1000 / 60, 40000)).toBe('low')
    expect(feedWindow(controller, 1000 / 60, 50000)).toBe('balanced')

    expect(feedWindow(controller, 1000 / 60, 60000)).toBe('balanced')
    expect(feedWindow(controller, 1000 / 60, 70000)).toBe('balanced')
    expect(feedWindow(controller, 1000 / 60, 80000)).toBe('high')
    // Further tier changes keep requiring sustained windows; after the last
    // recovery, sustained overload still steps back down once cooldown clears.
    expect(feedWindow(controller, 25, 82000)).toBe('high')
    expect(feedWindow(controller, 25, 83000)).toBe('high')
    expect(feedWindow(controller, 25, 84000)).toBe('high')
    expect(feedWindow(controller, 25, 85000)).toBe('balanced')
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
    expect(QUALITY_TIERS.high).toEqual({ pixelRatioCap: 1.5, shadows: true, lodBias: 0, shafts: 'raymarch' })
    expect(QUALITY_TIERS.balanced).toEqual({ pixelRatioCap: 1.0, shadows: true, lodBias: 0, shafts: 'plane' })
    expect(QUALITY_TIERS.low.shadows).toBe(false)
    expect(QUALITY_TIERS.low.pixelRatioCap).toBe(1.0)
    expect(QUALITY_TIERS.low.lodBias).toBeGreaterThan(0)
    expect(QUALITY_TIERS.low.shafts).toBe('reduced')
  })

  it('gates the shaft pass by tier: raymarch on High, plane on Balanced, reduced plane on Low', () => {
    expect(shaftModeForTier('high')).toBe('raymarch')
    expect(shaftModeForTier('balanced')).toBe('plane')
    expect(shaftModeForTier('low')).toBe('reduced')
    // The tier thresholds that govern the shaft step-down are still the
    // frame-time budget — the shaft pass never gets its own governor.
    expect(ADAPTIVE_STEP_DOWN_EMA_MS).toBe(FRAME_TIME_BUDGET.stepDownEmaMs)
    expect(ADAPTIVE_STEP_DOWN_P95_MS).toBe(FRAME_TIME_BUDGET.p95MaxMs)
  })
})
