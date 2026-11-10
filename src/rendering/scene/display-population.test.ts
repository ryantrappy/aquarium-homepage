import { describe, expect, it } from 'vitest'
import { getFishById } from '../../lib/fish'
import {
  DISPLAY_FISH_ID,
  DISPLAY_SPECIES_ID,
  isDisplayFishId,
  resolveDisplayPopulation,
} from './display-population'

describe('display population (visual-only non-service fish)', () => {
  it('is empty: no display fish spawns by default (Ryan 2026-11-09)', () => {
    // The sailfin was removed from the default scene ("take it out of the
    // tank"): a hero fish with no link reads as a missing link. The
    // resolver stays as the AQ-93 ambiance-fish seam.
    expect(resolveDisplayPopulation()).toEqual([])
  })

  it('names a real roster species, and only display ids match the prefix', () => {
    expect(getFishById(DISPLAY_SPECIES_ID)?.commonName).toBe('Desjardins’ sailfin tang')
    expect(isDisplayFishId(DISPLAY_FISH_ID)).toBe(true)
    expect(isDisplayFishId('komodo::schoolmate-1')).toBe(false)
    expect(isDisplayFishId('komodo')).toBe(false)
  })
})
