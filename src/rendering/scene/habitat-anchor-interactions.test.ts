import { describe, expect, it } from 'vitest'
import type { HabitatAnchorLocation } from '../../simulation/habitat-navigation'
import {
  classifyAnchorInteraction,
  evaluateAnchorInteractionOffset,
  filterCompatibleAnchorLocations,
  isSpeciesCompatibleWithAnchor,
  resolveSafeAnchorInteractionTarget,
} from './habitat-anchor-interactions'

const sampleLocations: readonly HabitatAnchorLocation[] = [
  { id: 'anemone-01', anchor: 'hostAnemone', position: { x: -1.2, y: 0.4, z: 0.8 }, compatibleSpecies: ['ocellaris-clownfish'] },
  { id: 'acropora-01', anchor: 'branchingCoralShelter', position: { x: -1.4, y: 0.9, z: 0.4 }, compatibleSpecies: ['blue-green-chromis'] },
  { id: 'burrow-01', anchor: 'sandBurrowEntrance', position: { x: -0.5, y: -1.8, z: 0.6 }, compatibleSpecies: ['firefish', 'yellow-watchman-goby'] },
  { id: 'perch-01', anchor: 'rockPerch', position: { x: 1.1, y: -0.2, z: 0.3 }, compatibleSpecies: ['tailspot-blenny'] },
  { id: 'grazing-01', anchor: 'grazingSurface', position: { x: 1.5, y: 0.2, z: 0.5 }, compatibleSpecies: ['yellow-tang', 'flame-angelfish'] },
  { id: 'forage-01', anchor: 'foragingPatch', position: { x: 0.4, y: -1.9, z: 0.9 }, compatibleSpecies: ['mandarin-dragonet'] },
]

describe('species-compatible reef habitat anchor interactions (AQ-45)', () => {
  it('accepts only profile-compatible anchors and never substitutes Acropora (branchingCoralShelter) for hostAnemone (AC #1 & #2)', () => {
    expect(isSpeciesCompatibleWithAnchor('ocellaris-clownfish', sampleLocations[0])).toBe(true)
    expect(isSpeciesCompatibleWithAnchor('ocellaris-clownfish', sampleLocations[1])).toBe(false)
    expect(isSpeciesCompatibleWithAnchor('yellow-tang', sampleLocations[0])).toBe(false)
    expect(isSpeciesCompatibleWithAnchor('yellow-tang', sampleLocations[4])).toBe(true)
    // Blue tang is open-water / coralOutcrop / branchingCoralRefuge and not compatible with yellow-tang grazingSurface
    expect(isSpeciesCompatibleWithAnchor('blue-tang', sampleLocations[4])).toBe(false)

    const clownAnchors = filterCompatibleAnchorLocations('ocellaris-clownfish', sampleLocations)
    expect(clownAnchors.map(a => a.id)).toEqual(['anemone-01'])

    const clownSymbiosis = evaluateAnchorInteractionOffset({
      speciesId: 'ocellaris-clownfish',
      location: sampleLocations[0],
      state: 'swim',
      elapsedSeconds: 1.8,
      softHomeRadius: 0.24,
    })
    expect(clownSymbiosis).toBeDefined()
    expect(clownSymbiosis?.category).toBe('host-anemone-symbiosis')
    expect(clownSymbiosis?.softTentacleOverlapAllowed).toBe(true)
    expect(clownSymbiosis?.softHomeRadius).toBeCloseTo(0.24, 6)
    expect(Math.hypot(clownSymbiosis!.positionOffset.x, clownSymbiosis!.positionOffset.z)).toBeLessThanOrEqual(0.24)
  })

  it('distinguishes firefish burrow hovering/head-first bolt from yellow-watchman-goby benthic lookout/backward retreat (AC #3)', () => {
    const firefishHover = evaluateAnchorInteractionOffset({
      speciesId: 'firefish',
      location: sampleLocations[2],
      state: 'idle',
      elapsedSeconds: 1.2,
    })!
    const gobyLookout = evaluateAnchorInteractionOffset({
      speciesId: 'yellow-watchman-goby',
      location: sampleLocations[2],
      state: 'idle',
      elapsedSeconds: 1.2,
    })!

    expect(firefishHover.category).toBe('sand-burrow-hover-bolt')
    expect(gobyLookout.category).toBe('sand-burrow-lookout-back-in')
    expect(firefishHover.positionOffset.y).toBeGreaterThan(0.15)
    expect(gobyLookout.positionOffset.y).toBeLessThanOrEqual(0.04)
    expect(gobyLookout.yawLockToEntrance).toBe(true)

    const firefishRetreat = evaluateAnchorInteractionOffset({
      speciesId: 'firefish',
      location: sampleLocations[2],
      state: 'retreat',
      elapsedSeconds: 1.2,
    })!
    const gobyRetreat = evaluateAnchorInteractionOffset({
      speciesId: 'yellow-watchman-goby',
      location: sampleLocations[2],
      state: 'retreat',
      elapsedSeconds: 1.2,
    })!
    expect(firefishRetreat.reverseRetreat).toBe(false)
    expect(gobyRetreat.reverseRetreat).toBe(true)
  })

  it('supports tailspot-blenny rock perching and substrate grazing/foraging categories with collision-aware target resolution and pause gating (AC #4, #5, #6, #7)', () => {
    expect(classifyAnchorInteraction('tailspot-blenny', 'rockPerch')).toBe('rock-perch-station')
    expect(classifyAnchorInteraction('yellow-tang', 'grazingSurface')).toBe('substrate-grazing-forage')
    expect(classifyAnchorInteraction('mandarin-dragonet', 'foragingPatch')).toBe('substrate-grazing-forage')

    const blennyPerch = evaluateAnchorInteractionOffset({
      speciesId: 'tailspot-blenny',
      location: sampleLocations[3],
      state: 'idle',
      elapsedSeconds: 2.0,
    })!
    expect(blennyPerch.pitchOffsetRad).toBeGreaterThan(0)
    expect(blennyPerch.positionOffset.x).toBe(0)

    const tangGraze1 = evaluateAnchorInteractionOffset({
      speciesId: 'yellow-tang',
      location: sampleLocations[4],
      state: 'forage',
      elapsedSeconds: 1.1,
    })!
    const tangGrazePaused1 = evaluateAnchorInteractionOffset({
      speciesId: 'yellow-tang',
      location: sampleLocations[4],
      state: 'forage',
      elapsedSeconds: 1.1,
      paused: true,
    })!
    const tangGrazePaused2 = evaluateAnchorInteractionOffset({
      speciesId: 'yellow-tang',
      location: sampleLocations[4],
      state: 'forage',
      elapsedSeconds: 9.5,
      paused: true,
    })!
    expect(tangGraze1.pitchOffsetRad).toBeGreaterThan(-0.3)
    expect(tangGraze1.pitchOffsetRad).toBeLessThan(0)
    expect(tangGrazePaused1).toEqual(tangGrazePaused2)

    const safeTarget = resolveSafeAnchorInteractionTarget({
      currentPosition: { x: 1.2, y: 0.6, z: 1.2 },
      location: sampleLocations[4],
      offset: tangGraze1,
      waterBounds: { min: { x: -4, y: -2.2, z: -4 }, max: { x: 4, y: 2.8, z: 2.8 } },
      obstacles: [],
      fishClearanceRadius: 0.57,
    })
    expect(safeTarget).toBeDefined()
  })
})
