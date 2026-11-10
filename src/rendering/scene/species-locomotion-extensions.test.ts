import { describe, expect, it } from 'vitest'
import { SPECIES_BEHAVIOR_IDS } from '../../lib/fish-behavior'
import {
  SPECIES_LOCOMOTION_EXTENSIONS,
  SPECIES_LOCOMOTION_SIGNATURES,
} from './species-locomotion-extensions'
import { createSwimmingFish, stepSwimmingFish, type WaterHabitat } from './motion'

const openHabitat: WaterHabitat = {
  bounds: { min: { x: -4, y: -2.2, z: -4 }, max: { x: 4, y: 2.8, z: 2.8 } },
  obstacles: [],
  anchors: [],
}

describe('species-specific reef locomotion and behavior extensions (AQ-18..AQ-32)', () => {
  it('registers distinct, bounded locomotion cadences and opportunity triggers for all 16 reef fish species', () => {
    expect(Object.keys(SPECIES_LOCOMOTION_SIGNATURES).sort()).toEqual([...SPECIES_BEHAVIOR_IDS].sort())

    const playbackSamples = new Map<string, number>()
    for (const speciesId of SPECIES_BEHAVIOR_IDS) {
      const fish = createSwimmingFish(
        `ext-${speciesId}`,
        speciesId,
        { x: 0, y: 0.5, z: 0 },
        0.42,
        SPECIES_LOCOMOTION_EXTENSIONS,
      )
      try {
        for (let i = 0; i < 15; i++) {
          stepSwimmingFish(fish, openHabitat, 1 / 30)
        }
        expect(fish.animationPlaybackRate).toBeGreaterThanOrEqual(0.25)
        expect(fish.animationPlaybackRate).toBeLessThanOrEqual(2.0)
        playbackSamples.set(speciesId, fish.animationPlaybackRate)
      } finally {
        fish.extensions.dispose()
      }
    }

    // Verify species have contrasting cadences (e.g. humming mandarin dragonet vs calm banggai cardinalfish)
    expect(playbackSamples.get('mandarin-dragonet')!).toBeGreaterThan(
      playbackSamples.get('banggai-cardinalfish')!,
    )
    expect(playbackSamples.get('blue-green-chromis')!).toBeGreaterThan(
      playbackSamples.get('copperband-butterflyfish')!,
    )
  })

  it('freezes playbackRate modulation at 1.0 when stopped/paused and fires species opportunity intents over time', () => {
    const tang = createSwimmingFish(
      'ext-tang-paused',
      'yellow-tang',
      { x: -1, y: 0.4, z: 0.5 },
      0.42,
      SPECIES_LOCOMOTION_EXTENSIONS,
    )
    try {
      stepSwimmingFish(tang, openHabitat, 5.0, true)
      expect(tang.animationPlaybackRate).toBe(1)

      // Advance active simulation past the 6.0s foraging-opportunity interval
      for (let i = 0; i < 200; i++) {
        stepSwimmingFish(tang, openHabitat, 1 / 30, false)
      }
      expect(tang.animationPlaybackRate).not.toBe(1)
    } finally {
      tang.extensions.dispose()
    }
  })
})
