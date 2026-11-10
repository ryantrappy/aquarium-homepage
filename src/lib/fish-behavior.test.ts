import { describe, expect, it } from 'vitest'
import { REEF_FISH } from './fish'
import {
  getSpeciesBehaviorProfile,
  sampleFishBehavior,
  SPECIES_BEHAVIOR_IDS,
  SPECIES_BEHAVIOR_PROFILES,
  validateSpeciesBehaviorProfiles,
} from './fish-behavior'

describe('reef fish behavior profiles', () => {
  it('covers every catalog stable ID with a distinct profile', () => {
    expect([...SPECIES_BEHAVIOR_IDS].sort()).toEqual(REEF_FISH.map(({ id }) => id).sort())
    expect(Object.keys(SPECIES_BEHAVIOR_PROFILES).sort()).toEqual(REEF_FISH.map(({ id }) => id).sort())
    expect(new Set(Object.values(SPECIES_BEHAVIOR_PROFILES).map((profile) => JSON.stringify(profile))).size).toBe(16)
    expect(validateSpeciesBehaviorProfiles()).toEqual({ success: true })
  })

  it('freezes the shared profile map and nested profile data at runtime', () => {
    const profile = SPECIES_BEHAVIOR_PROFILES['yellow-tang']

    expect(Object.isFrozen(SPECIES_BEHAVIOR_PROFILES)).toBe(true)
    expect(Object.isFrozen(profile)).toBe(true)
    expect(Object.isFrozen(profile.locomotion.speedTankWidthsPerSecond)).toBe(true)
    expect(Object.isFrozen(profile.transitions[0])).toBe(true)
  })

  it('keeps unsupported states and anchors out of profiles', () => {
    const cardinalfish = getSpeciesBehaviorProfile('banggai-cardinalfish')
    const dragonet = getSpeciesBehaviorProfile('mandarin-dragonet')
    const chromis = getSpeciesBehaviorProfile('blue-green-chromis')

    expect(cardinalfish?.states.forage?.anchor).toBe('foragingPatch')
    expect(cardinalfish?.states).not.toHaveProperty('retreat')
    expect(cardinalfish?.states).not.toHaveProperty('burst')
    expect(dragonet?.states).not.toHaveProperty('retreat')
    expect(chromis?.anchors).toContain('branchingCoralRefuge')
    expect(getSpeciesBehaviorProfile('freshwater-guppy')).toBeUndefined()
  })

  it('rejects identical behavior even when stable ID and evidence differ', () => {
    const duplicateBehavior = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    duplicateBehavior['royal-gramma'] = {
      ...duplicateBehavior['yellow-tang'],
      speciesId: 'royal-gramma',
      evidence: duplicateBehavior['royal-gramma'].evidence,
    }

    expect(validateSpeciesBehaviorProfiles(duplicateBehavior)).toMatchObject({
      success: false,
      errors: expect.arrayContaining(['royal-gramma: species profile must be distinct.']),
    })
  })

  it('rejects missing coverage, invalid bounds, and incompatible transition targets', () => {
    const missingProfile = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, unknown>
    delete missingProfile['firefish']
    expect(validateSpeciesBehaviorProfiles(missingProfile)).toMatchObject({ success: false })

    const invalidRange = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    invalidRange['yellow-tang'].depthRange = [0.9, 0.2]
    expect(validateSpeciesBehaviorProfiles(invalidRange)).toMatchObject({ success: false })

    const unsafeSpeed = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    unsafeSpeed['yellow-tang'].locomotion.speedTankWidthsPerSecond = [0.04, 100]
    expect(validateSpeciesBehaviorProfiles(unsafeSpeed)).toMatchObject({ success: false })

    const invalidAnchor = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    invalidAnchor['firefish'].states.retreat.destination = 'hostAnemone'
    expect(validateSpeciesBehaviorProfiles(invalidAnchor)).toMatchObject({ success: false })

    const invalidForageTarget = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    invalidForageTarget['yellow-tang'].states.forage.anchor = 'hostAnemone'
    expect(validateSpeciesBehaviorProfiles(invalidForageTarget)).toMatchObject({ success: false })

    const invalidStateTransition = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    invalidStateTransition['tailspot-blenny'].transitions.push({
      from: 'swim', to: 'forage', trigger: 'foraging-opportunity', selectionWeight: 0.5,
    })
    expect(validateSpeciesBehaviorProfiles(invalidStateTransition)).toMatchObject({ success: false })

    const unsupportedBurst = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    unsupportedBurst['banggai-cardinalfish'].transitions.push({
      from: 'swim', to: 'burst', trigger: 'high-effort-cue', selectionWeight: 0.5,
    })
    expect(validateSpeciesBehaviorProfiles(unsupportedBurst)).toMatchObject({ success: false })

    const invalidTransition = JSON.parse(JSON.stringify(SPECIES_BEHAVIOR_PROFILES)) as Record<string, any>
    invalidTransition['yellow-tang'].transitions.push({
      from: 'forage', to: 'idle', trigger: 'threat-cue', selectionWeight: 0.5,
    })
    expect(validateSpeciesBehaviorProfiles(invalidTransition)).toMatchObject({ success: false })
  })

  it('samples deterministic, independent per-fish tuning within each species range', () => {
    const profile = getSpeciesBehaviorProfile('yellow-tang')!
    const first = sampleFishBehavior(profile.speciesId, 101)
    const repeat = sampleFishBehavior(profile.speciesId, 101)
    const second = sampleFishBehavior(profile.speciesId, 202)

    expect(first).toEqual(repeat)
    expect(first).not.toEqual(second)
    expect(first.cruiseSpeedTankWidthsPerSecond).toBeGreaterThanOrEqual(profile.locomotion.speedTankWidthsPerSecond[0])
    expect(first.cruiseSpeedTankWidthsPerSecond).toBeLessThanOrEqual(profile.locomotion.speedTankWidthsPerSecond[1])
    expect(first.turnDegreesPerSecond).toBeGreaterThanOrEqual(profile.locomotion.turnDegreesPerSecond[0])
    expect(first.turnDegreesPerSecond).toBeLessThanOrEqual(profile.locomotion.turnDegreesPerSecond[1])
    expect(sampleFishBehavior('yellow-tang', 101)).not.toEqual(sampleFishBehavior('mandarin-dragonet', 101))
    expect(() => sampleFishBehavior('not-a-species', 1)).toThrow(/No reef behavior profile/)
    expect(() => sampleFishBehavior('yellow-tang', -1)).toThrow(/non-negative safe integer/)
  })

  it('demonstrates distinct open-water, hovering, burrow, and substrate behaviors', () => {
    expect(getSpeciesBehaviorProfile('yellow-tang')?.locomotion.gait).toBe('pectoral-cruise')
    expect(getSpeciesBehaviorProfile('banggai-cardinalfish')?.locomotion.gait).toBe('fin-hover')
    expect(getSpeciesBehaviorProfile('firefish')?.states.retreat?.destination).toBe('sandBurrowEntrance')
    expect(getSpeciesBehaviorProfile('mandarin-dragonet')?.locomotion.gait).toBe('substrate-stop-start')
    expect(getSpeciesBehaviorProfile('six-line-wrasse')?.locomotion.gait).toBe('sinuous-cover-search')
  })
})
