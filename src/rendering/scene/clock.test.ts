import { describe, expect, it } from 'vitest'
import { consumeFrameSteps, createFrameClock, MAX_FRAME_SECONDS, SIMULATION_STEP_SECONDS, suspendFrameClock } from './clock'
import { createSwimmingFish, startleFish, stepSwimmingFish, type WaterHabitat } from './motion'

const water: WaterHabitat = { bounds: { min: { x: -5, y: -2, z: -4 }, max: { x: 5, y: 3, z: 3 } }, obstacles: [], anchors: [] }

describe('scene simulation clock', () => {
  it('accepts first rAF older than a synchronous performance.now and ignores invalid/backward samples', () => {
    const clock = createFrameClock()
    const synchronousNow = 900
    expect(consumeFrameSteps(clock, synchronousNow - 12)).toBe(0)
    expect(consumeFrameSteps(clock, synchronousNow + 5)).toBe(1)
    for (const timestamp of [NaN, Infinity, -Infinity, 880, 900]) expect(consumeFrameSteps(clock, timestamp)).toBe(0)
    expect(consumeFrameSteps(clock, synchronousNow + 22)).toBe(1)
    expect(Number.isFinite(clock.accumulatorSeconds)).toBe(true)
  })
  it('manual draws/resize advance zero time and resume preserves state and fractional time', () => {
    const clock = createFrameClock(), fish = createSwimmingFish('resize-resume', 'yellow-tang', { x: 0, y: 1, z: 2 })
    consumeFrameSteps(clock, 1000)
    expect(consumeFrameSteps(clock, 1010)).toBe(0)
    const before = structuredClone(fish)
    stepSwimmingFish(fish, water, 0) // resize/manual draw
    expect(fish).toEqual(before)
    suspendFrameClock(clock)
    stepSwimmingFish(fish, water, 50, true)
    expect(fish).toEqual(before)
    expect(clock.accumulatorSeconds).toBeCloseTo(.01)
    expect(consumeFrameSteps(clock, 900000)).toBe(0)
    expect(consumeFrameSteps(clock, 900010)).toBe(1)
    expect(clock.accumulatorSeconds).toBeCloseTo(.02 - SIMULATION_STEP_SECONDS)
  })
  it('caps a long frame once for behavior, travel and startle, with no later time debt', () => {
    const clock = createFrameClock()
    consumeFrameSteps(clock, 1000)
    const count = consumeFrameSteps(clock, 11000)
    expect(count * SIMULATION_STEP_SECONDS).toBeCloseTo(MAX_FRAME_SECONDS)
    expect(consumeFrameSteps(clock, 11017)).toBe(1)
    const long = createSwimmingFish('long-frame', 'yellow-tang', { x: 0, y: 1, z: 2 })
    const fixed = structuredClone(long)
    startleFish(long, water); startleFish(fixed, water)
    stepSwimmingFish(long, water, 10)
    for (let i = 0; i < count; i++) stepSwimmingFish(fixed, water, SIMULATION_STEP_SECONDS)
    expect(long).toEqual(fixed)
    expect(long.startleSeconds).toBeCloseTo(.95 - MAX_FRAME_SECONDS)
    const before = structuredClone(long)
    for (const elapsed of [-.01, NaN, Infinity]) stepSwimmingFish(long, water, elapsed)
    expect(long).toEqual(before)
  })
})
