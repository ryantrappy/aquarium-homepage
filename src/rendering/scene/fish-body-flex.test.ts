import { describe, expect, it } from 'vitest'
import { SPECIES_BEHAVIOR_IDS } from '../../lib/fish-behavior'
import {
  BALISTIFORM_FLEX_GAIT,
  MAX_FLEX_TAIL_OFFSET_BL,
  advanceFishFlexTime,
  evaluateLighthillFlexParams,
  flexLateralOffsetBL,
  flexPhaseForInstance,
  lighthillEnvelope,
  lighthillFrequencyHz,
  lighthillGaitBlend,
  lighthillTailAmplitudeBL,
} from './fish-body-flex'
import { MAX_SUMMED_SPINE_BEND_RAD } from './fish-turning'
import { SPECIES_LOCOMOTION_SIGNATURES } from './species-locomotion-extensions'

const subcarangiform = SPECIES_LOCOMOTION_SIGNATURES['ocellaris-clownfish'].gait
const yellowTang = SPECIES_LOCOMOTION_SIGNATURES['yellow-tang'].gait
const cardinalfish = SPECIES_LOCOMOTION_SIGNATURES['banggai-cardinalfish'].gait
const dragonet = SPECIES_LOCOMOTION_SIGNATURES['mandarin-dragonet'].gait

const swimInput = {
  speedNorm: 1,
  state: 'swim' as const,
  maneuverStage: 'none' as const,
  startleSeconds: 0,
}

describe('Lighthill travelling-wave body flex (AQ-12 / AQ-49)', () => {
  it('grows the amplitude envelope posteriorly, from a small head amplitude to full tail amplitude', () => {
    expect(lighthillEnvelope(0, subcarangiform)).toBeCloseTo(subcarangiform.envelopeA, 10)
    expect(lighthillEnvelope(1, subcarangiform)).toBeCloseTo(1, 10)
    expect(lighthillEnvelope(0.5, subcarangiform)).toBeGreaterThan(lighthillEnvelope(0, subcarangiform))
    expect(lighthillEnvelope(0.5, subcarangiform)).toBeLessThan(lighthillEnvelope(1, subcarangiform))
    // Envelope is monotonic snout → tail.
    let previous = -Infinity
    for (let i = 0; i <= 10; i++) {
      const value = lighthillEnvelope(i / 10, subcarangiform)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  it('raises tail-beat frequency with speed and saturates at the gait maximum', () => {
    const atRest = lighthillFrequencyHz(0, subcarangiform)
    const atCruise = lighthillFrequencyHz(1, subcarangiform)
    const atBurst = lighthillFrequencyHz(2.5, subcarangiform)
    expect(atRest).toBeCloseTo(subcarangiform.fCruiseHz, 10)
    expect(atCruise).toBeGreaterThan(atRest)
    expect(atBurst).toBeLessThanOrEqual(subcarangiform.fMaxHz)
    expect(lighthillFrequencyHz(10, subcarangiform)).toBeCloseTo(subcarangiform.fMaxHz, 10)
    expect(lighthillFrequencyHz(-1, subcarangiform)).toBeCloseTo(subcarangiform.fCruiseHz, 10)
  })

  it('grows tail amplitude with speed from a small residual, then saturates below the hard bound', () => {
    const atRest = lighthillTailAmplitudeBL(0, subcarangiform)
    const atCruise = lighthillTailAmplitudeBL(1, subcarangiform)
    const atBurst = lighthillTailAmplitudeBL(2.5, subcarangiform)
    expect(atRest).toBeGreaterThan(0)
    expect(atRest).toBeLessThan(atCruise)
    expect(atCruise).toBeCloseTo(subcarangiform.tailAmplitudeCruiseBL, 10)
    expect(atBurst).toBeLessThanOrEqual(subcarangiform.tailAmplitudeMaxBL)
    expect(atBurst).toBeLessThanOrEqual(MAX_FLEX_TAIL_OFFSET_BL)
  })

  it('keeps yellow/blue tangs near-rigid at cruise and blends to body-caudal above the gait-transition speed', () => {
    expect(lighthillGaitBlend(0.5, yellowTang)).toBe(0)
    expect(lighthillGaitBlend(1.0, yellowTang)).toBeGreaterThanOrEqual(0)
    expect(lighthillGaitBlend(1.0, yellowTang)).toBeLessThan(0.5)
    expect(lighthillGaitBlend(1.3, yellowTang)).toBeGreaterThan(0.5)
    expect(lighthillGaitBlend(2.5, yellowTang)).toBe(1)
    const cruise = evaluateLighthillFlexParams(yellowTang, swimInput)
    expect(cruise.tailAmplitudeBL).toBeLessThanOrEqual(0.025)
    expect(cruise.gaitBlend).toBeLessThan(0.5)
    const fast = evaluateLighthillFlexParams(yellowTang, { ...swimInput, speedNorm: 2 })
    expect(fast.gaitBlend).toBe(1)
    expect(fast.tailAmplitudeBL).toBeGreaterThan(cruise.tailAmplitudeBL)
    // Subcarangiform schoolers are always fully body-caudal.
    expect(lighthillGaitBlend(0, subcarangiform)).toBe(1)
    expect(lighthillGaitBlend(2.5, subcarangiform)).toBe(1)
  })

  it('holds hoverers near still and gates benthic perchers by movement', () => {
    const hover = evaluateLighthillFlexParams(cardinalfish, swimInput)
    expect(hover.tailAmplitudeBL).toBeLessThanOrEqual(0.015)
    expect(hover.frequencyHz).toBeLessThanOrEqual(1.2)
    const perched = evaluateLighthillFlexParams(dragonet, {
      speedNorm: 0,
      state: 'idle',
      maneuverStage: 'none',
      startleSeconds: 0,
    })
    expect(perched.amplitudeScale).toBe(0)
    const moving = evaluateLighthillFlexParams(dragonet, swimInput)
    expect(moving.amplitudeScale).toBe(1)
  })

  it('drops frequency to its floor at idle instead of freezing mid-sine', () => {
    const idle = evaluateLighthillFlexParams(subcarangiform, { ...swimInput, state: 'idle', speedNorm: 0 })
    expect(idle.frequencyHz).toBeCloseTo(subcarangiform.fMinHz, 10)
    expect(idle.tailAmplitudeBL).toBeGreaterThan(0)
  })

  it('maps all 15 species to a gait and leaves balistiform unwired', () => {
    expect(Object.keys(SPECIES_LOCOMOTION_SIGNATURES).sort()).toEqual([...SPECIES_BEHAVIOR_IDS].sort())
    for (const speciesId of SPECIES_BEHAVIOR_IDS) {
      const gait = SPECIES_LOCOMOTION_SIGNATURES[speciesId].gait
      expect(gait.gaitMode).not.toBe('balistiform')
      expect(gait.fCruiseHz).toBeGreaterThan(0)
      expect(gait.fMinHz).toBeLessThanOrEqual(gait.fCruiseHz)
      expect(gait.fCruiseHz).toBeLessThanOrEqual(gait.fMaxHz)
      expect(gait.tailAmplitudeCruiseBL).toBeGreaterThanOrEqual(0)
      expect(gait.tailAmplitudeMaxBL).toBeGreaterThanOrEqual(gait.tailAmplitudeCruiseBL)
      expect(gait.tailAmplitudeMaxBL).toBeLessThanOrEqual(MAX_FLEX_TAIL_OFFSET_BL)
      expect(gait.wavelengthBL).toBeGreaterThan(0)
      expect(gait.envelopeA).toBeGreaterThanOrEqual(0)
      expect(gait.envelopeA).toBeLessThanOrEqual(1)
    }
    expect(BALISTIFORM_FLEX_GAIT.gaitMode).toBe('balistiform')
    expect(BALISTIFORM_FLEX_GAIT.tailAmplitudeCruiseBL).toBe(0)
    expect(Object.values(SPECIES_LOCOMOTION_SIGNATURES).some(s => s.gait === BALISTIFORM_FLEX_GAIT)).toBe(false)
  })

  it('gives every instance a deterministic, distinct phase in [0, 2π)', () => {
    const a = flexPhaseForInstance(12345)
    expect(flexPhaseForInstance(12345)).toBe(a)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(Math.PI * 2)
    const phases = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(seed => flexPhaseForInstance(seed)))
    expect(phases.size).toBeGreaterThan(1)
  })

  it('freezes flex time on dt = 0 and advances it by dt otherwise', () => {
    expect(advanceFishFlexTime(1.5, 0)).toBe(1.5)
    expect(advanceFishFlexTime(1.5, -1 / 60)).toBe(1.5)
    expect(advanceFishFlexTime(1.5, 1 / 60)).toBeCloseTo(1.5 + 1 / 60, 10)
    expect(advanceFishFlexTime(Number.NaN, 1 / 60)).toBe(0)
  })

  it('produces a zero-mean travelling wave that travels snout → tail', () => {
    const values = evaluateLighthillFlexParams(subcarangiform, swimInput)
    const phase = 0.7
    // Zero-mean over one full period at any body station.
    const period = 1 / values.frequencyHz
    let sum = 0
    const samples = 64
    for (let i = 0; i < samples; i++) {
      sum += flexLateralOffsetBL(0.8, (i / samples) * period, values, subcarangiform, phase)
    }
    expect(Math.abs(sum / samples)).toBeLessThan(1e-9)
    // The wave crest moves toward the tail as time advances: the pattern at
    // a posterior station later equals the pattern at an anterior station
    // earlier, once the envelope difference is divided out (travelling,
    // not standing). Wave speed is f * λ body lengths per second.
    const shift = values.frequencyHz * subcarangiform.wavelengthBL * (0.25 * period)
    const sPosterior = 0.6
    const sAnterior = sPosterior - shift
    const later =
      flexLateralOffsetBL(sPosterior, 0.25 * period, values, subcarangiform, phase) /
      lighthillEnvelope(sPosterior, subcarangiform)
    const earlier =
      flexLateralOffsetBL(sAnterior, 0, values, subcarangiform, phase) /
      lighthillEnvelope(sAnterior, subcarangiform)
    expect(later).toBeCloseTo(earlier, 9)
    // Peak tail offset never exceeds the table maximum.
    let maxOffset = 0
    for (let i = 0; i <= 100; i++) {
      maxOffset = Math.max(maxOffset, Math.abs(flexLateralOffsetBL(1, (i / 100) * period, values, subcarangiform, phase)))
    }
    expect(maxOffset).toBeLessThanOrEqual(MAX_FLEX_TAIL_OFFSET_BL + 1e-9)
    expect(maxOffset).toBeGreaterThan(0)
  })

  it('keeps the bone-overlay turning cap unchanged at 1.275 rad (no double-bend by redefinition)', () => {
    // The shader term is zero-mean, so it cannot add to the overlay's mean
    // bend; this pins the cap the overlay still enforces.
    expect(MAX_SUMMED_SPINE_BEND_RAD).toBeCloseTo(1.275, 3)
  })
})
