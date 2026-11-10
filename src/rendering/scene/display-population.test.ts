import { describe, expect, it } from 'vitest'
import { getFishById } from '../../lib/fish'
import {
  DISPLAY_FISH_ID,
  DISPLAY_SPECIES_ID,
  isDisplayFishId,
  resolveDisplayPopulation,
} from './display-population'

describe('display population (visual-only non-service fish)', () => {
  it('describes exactly the Desjardins’ sailfin tang, with no service fields', () => {
    const population = resolveDisplayPopulation()
    expect(population).toHaveLength(1)
    expect(population[0]).toEqual({ id: DISPLAY_FISH_ID, speciesId: DISPLAY_SPECIES_ID })
    expect(population[0].id).toBe('display-desjardins-sailfin-tang')
    // A display descriptor carries no link by construction: no service id,
    // no URL, no name — it can never gain a clickable label by accident.
    expect(population[0]).not.toHaveProperty('serviceId')
    expect(population[0]).not.toHaveProperty('url')
    expect(population[0]).not.toHaveProperty('name')
  })

  it('names a real roster species, and only display ids match the prefix', () => {
    expect(getFishById(DISPLAY_SPECIES_ID)?.commonName).toBe('Desjardins’ sailfin tang')
    expect(isDisplayFishId(DISPLAY_FISH_ID)).toBe(true)
    expect(isDisplayFishId('komodo::schoolmate-1')).toBe(false)
    expect(isDisplayFishId('komodo')).toBe(false)
  })
})
