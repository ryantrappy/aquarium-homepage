import { describe, expect, it } from 'vitest'
import { FRAME_RATE_WARM_UP_FRAMES, FrameRateSampler, formatFrameRate } from './frame-rate'

function warmSampler(intervalMs = 1000 / 60): FrameRateSampler {
  const sampler = new FrameRateSampler()
  for (let i = 0; i < FRAME_RATE_WARM_UP_FRAMES; i++) sampler.record(intervalMs)
  return sampler
}

describe('FrameRateSampler', () => {
  it('returns null until enough frames have been recorded', () => {
    const sampler = new FrameRateSampler()
    for (let i = 0; i < FRAME_RATE_WARM_UP_FRAMES - 1; i++) sampler.record(1000 / 60)
    expect(sampler.sample()).toBeNull()
    sampler.record(1000 / 60)
    expect(sampler.sample()).not.toBeNull()
  })

  it('reports ~60 FPS and ~16.7 ms for steady 60 Hz frames', () => {
    const sample = warmSampler().sample()!
    expect(sample.fps).toBe(60)
    expect(sample.frameTimeMs).toBeCloseTo(16.7, 1)
  })

  it('reports ~30 FPS for steady 33.3 ms frames', () => {
    const sample = warmSampler(1000 / 30).sample()!
    expect(sample.fps).toBe(30)
    expect(sample.frameTimeMs).toBeCloseTo(33.3, 1)
  })

  it('drops excluded (paused / hidden / reduced-motion) frames instead of averaging them', () => {
    const sampler = warmSampler()
    sampler.record(1000 / 60, true)
    expect(sampler.sample()).toBeNull()
  })

  it('resets on a suspension gap instead of dragging the average down', () => {
    const sampler = warmSampler()
    sampler.record(5000)
    expect(sampler.sample()).toBeNull()
  })

  it('ignores non-finite and non-positive intervals', () => {
    const sampler = new FrameRateSampler()
    sampler.record(Number.NaN)
    sampler.record(0)
    sampler.record(-16)
    expect(sampler.sample()).toBeNull()
  })
})

describe('formatFrameRate', () => {
  it('formats a live sample as FPS and milliseconds', () => {
    expect(formatFrameRate({ fps: 60, frameTimeMs: 16.7 }, { paused: false, hidden: false })).toBe('60 FPS · 16.7 ms')
  })

  it('shows Paused when sampling stopped while paused', () => {
    expect(formatFrameRate(null, { paused: true, hidden: false })).toBe('Paused')
  })

  it('shows Suspended when sampling stopped while the tab is hidden', () => {
    expect(formatFrameRate(null, { paused: false, hidden: true })).toBe('Suspended')
  })

  it('shows a dash while warming up', () => {
    expect(formatFrameRate(null, { paused: false, hidden: false })).toBe('—')
  })
})
