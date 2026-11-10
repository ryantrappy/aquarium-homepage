import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getFishById, REEF_FISH } from './fish'

describe('reef fish catalog', () => {
  it('contains the complete roster with stable unique IDs and matching thumbnail files', () => {
    expect(REEF_FISH).toHaveLength(16)
    expect(new Set(REEF_FISH.map((fish) => fish.id)).size).toBe(REEF_FISH.length)

    for (const fish of REEF_FISH) {
      expect(fish.commonName).not.toBe('')
      expect(fish.scientificName).not.toBe('')
      expect(fish.thumbnail).toMatch(/^\/fish\/[\w-]+\.webp$/)
      expect(existsSync(resolve(process.cwd(), 'public', fish.thumbnail.slice(1)))).toBe(true)
      expect(statSync(resolve(process.cwd(), 'public', fish.thumbnail.slice(1))).size).toBeLessThan(75 * 1024)
      expect(getFishById(fish.id)).toBe(fish)
    }
  })

  it('returns no fish for an unknown stable ID', () => {
    expect(getFishById('not-a-reef-fish')).toBeUndefined()
  })
})
