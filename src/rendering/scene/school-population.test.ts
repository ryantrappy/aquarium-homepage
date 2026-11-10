import { describe, expect, it } from 'vitest'
import { EXAMPLE_SERVICES, type ServiceConfig } from '../../lib/services'
import { benchmarkSchoolingStep } from './schooling-navigation'
import {
  SCHOOL_TOTAL_COUNT,
  isSchoolSpecies,
  isSchoolmateId,
  resolveSchoolPopulation,
  schoolmateId,
  schoolmateSpawnOffset,
} from './school-population'

function service(id: string, fishId: string): ServiceConfig {
  return { id, name: id, url: `https://${id}.example`, fishId, isExample: false }
}

describe('school population (AQ-41/AQ-44/AQ-45)', () => {
  it('spawns 5 chromis schoolmates (6 total) and 3 anthias schoolmates (4 total) per configured service', () => {
    expect(SCHOOL_TOTAL_COUNT['blue-green-chromis']).toBe(6)
    expect(SCHOOL_TOTAL_COUNT['lyretail-anthias']).toBe(4)

    const mates = resolveSchoolPopulation([
      service('chromis-link', 'blue-green-chromis'),
      service('anthias-link', 'lyretail-anthias'),
      service('tang-link', 'yellow-tang'),
      service('gramma-link', 'royal-gramma'),
    ])
    expect(mates.filter(mate => mate.speciesId === 'blue-green-chromis')).toHaveLength(5)
    expect(mates.filter(mate => mate.speciesId === 'lyretail-anthias')).toHaveLength(3)
    expect(mates).toHaveLength(8)
    expect(new Set(mates.map(mate => mate.id)).size).toBe(8)
  })

  it('adds no schoolmates for solitary species or for the default service list', () => {
    expect(isSchoolSpecies('yellow-tang')).toBe(false)
    expect(isSchoolSpecies('banggai-cardinalfish')).toBe(false)
    // The default services include a banggai cardinalfish (hover-group) but
    // no chromis/anthias service, so no schoolmates are spawned by default.
    expect(resolveSchoolPopulation(EXAMPLE_SERVICES)).toHaveLength(0)
    expect(resolveSchoolPopulation([service('tang', 'yellow-tang')])).toHaveLength(0)
  })

  it('gives schoolmates deterministic, non-link identities', () => {
    expect(schoolmateId('komodo', 2)).toBe('komodo::schoolmate-2')
    expect(isSchoolmateId('komodo::schoolmate-2')).toBe(true)
    expect(isSchoolmateId('komodo')).toBe(false)
    const mates = resolveSchoolPopulation([service('chromis-link', 'blue-green-chromis')])
    // Descriptors carry no URL, anchor, or focus target by construction.
    for (const mate of mates) {
      expect(Object.keys(mate).sort()).toEqual(['id', 'index', 'serviceId', 'speciesId'])
      expect(mate.serviceId).toBe('chromis-link')
    }
  })

  it('offsets schoolmates deterministically around the lead fish with visible per-instance spacing', () => {
    const tankWidth = 10
    const chromisOffsets = Array.from({ length: 5 }, (_, i) =>
      schoolmateSpawnOffset(schoolmateId('chromis-link', i + 1), 'blue-green-chromis', tankWidth, i + 1, 5))
    const anthiasOffsets = Array.from({ length: 3 }, (_, i) =>
      schoolmateSpawnOffset(schoolmateId('anthias-link', i + 1), 'lyretail-anthias', tankWidth, i + 1, 3))

    // Deterministic for a given id/seed.
    expect(schoolmateSpawnOffset('chromis-link::schoolmate-1', 'blue-green-chromis', tankWidth, 1, 5))
      .toEqual(chromisOffsets[0])
    // Within the profile's home-offset range (chromis ≤ 0.06 tank widths,
    // anthias ≤ 0.078) and non-zero, so mates cluster near the lead fish
    // without stacking on it. (The 3D length can reach ~1.12× the radius
    // because the Y component adds a half-amplitude second harmonic.)
    for (const offset of [...chromisOffsets, ...anthiasOffsets]) {
      const length = Math.hypot(offset.x, offset.y, offset.z)
      expect(length).toBeGreaterThan(0.01)
      expect(length).toBeLessThanOrEqual(0.078 * tankWidth * 1.12 + 1e-9)
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.078 * tankWidth + 1e-9)
      expect(Math.abs(offset.z)).toBeLessThanOrEqual(0.078 * tankWidth + 1e-9)
    }
    // Distinct offsets: no two chromis mates share a spawn point, so the
    // school does not read as clones. The even angular spread guarantees
    // this even when two mates sample nearly the same phase/radius.
    for (let i = 0; i < chromisOffsets.length; i++) {
      for (let j = i + 1; j < chromisOffsets.length; j++) {
        const gap = Math.hypot(
          chromisOffsets[i].x - chromisOffsets[j].x,
          chromisOffsets[i].y - chromisOffsets[j].y,
          chromisOffsets[i].z - chromisOffsets[j].z,
        )
        expect(gap).toBeGreaterThan(0.05)
      }
    }
    // Same guarantee at a narrow (mobile) tank width.
    const narrowOffsets = Array.from({ length: 5 }, (_, i) =>
      schoolmateSpawnOffset(schoolmateId('chromis-link', i + 1), 'blue-green-chromis', 5, i + 1, 5))
    for (let i = 0; i < narrowOffsets.length; i++) {
      for (let j = i + 1; j < narrowOffsets.length; j++) {
        const gap = Math.hypot(
          narrowOffsets[i].x - narrowOffsets[j].x,
          narrowOffsets[i].y - narrowOffsets[j].y,
          narrowOffsets[i].z - narrowOffsets[j].z,
        )
        expect(gap).toBeGreaterThan(0.03)
      }
    }
  })

  it('benchmarks the real school population and the worst case, keeping direct CPU evaluation (AQ-41 AC #2)', () => {
    // Default 5 services + a full chromis school (5 mates) + a full anthias
    // school (3 mates) = 13 fish.
    // Wall-clock bounds are deliberately load-tolerant: under the full
    // suite's 52 parallel workers this measures ~3.2 ms/step for N=13
    // (vs < 2 ms/step in isolation), so the bound guards against a real
    // regression, not scheduling noise. The decision that matters — direct
    // CPU evaluation, no spatial grid at these populations — is exact.
    const bench13 = benchmarkSchoolingStep(13, 100)
    expect(bench13.populationCount).toBe(13)
    expect(bench13.recommendedBackend).toBe('cpu-direct')
    expect(bench13.averageMicrosecondsPerStep).toBeLessThan(5000)
    // Worst case: 5 chromis services × 6 fish = 30.
    const bench30 = benchmarkSchoolingStep(30, 100)
    expect(bench30.populationCount).toBe(30)
    expect(bench30.recommendedBackend).toBe('cpu-direct')
    expect(bench30.averageMicrosecondsPerStep).toBeLessThan(10000)
  })
})
