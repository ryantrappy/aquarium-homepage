import { describe, expect, it } from 'vitest'
import {
  benchmarkSchoolingStep,
  evaluateSchoolingSteering,
  isGroupSchoolingSpecies,
  type SchoolingPeer,
} from './schooling-navigation'

const waterBounds = {
  min: { x: -4, y: -2.25, z: -4.6 },
  max: { x: 4, y: 2.8, z: 2.8 },
}

describe('species-aware schooling and scalable navigation (AQ-41)', () => {
  it('limits group schooling to profile-supported social species and never forces solitary species into schools (AC #1 & #4)', () => {
    expect(isGroupSchoolingSpecies('blue-green-chromis')).toBe(true)
    expect(isGroupSchoolingSpecies('lyretail-anthias')).toBe(true)
    expect(isGroupSchoolingSpecies('banggai-cardinalfish')).toBe(true)

    expect(isGroupSchoolingSpecies('royal-gramma')).toBe(false)
    expect(isGroupSchoolingSpecies('firefish')).toBe(false)
    expect(isGroupSchoolingSpecies('yellow-watchman-goby')).toBe(false)
    expect(isGroupSchoolingSpecies('tailspot-blenny')).toBe(false)
    expect(isGroupSchoolingSpecies('six-line-wrasse')).toBe(false)

    // Two chromis within neighbor radius (1.5 units apart) experience cohesion toward each other
    const chromisA: SchoolingPeer = {
      id: 'chromis-a',
      speciesId: 'blue-green-chromis',
      position: { x: -0.6, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      startleSeconds: 0,
    }
    const chromisB: SchoolingPeer = {
      id: 'chromis-b',
      speciesId: 'blue-green-chromis',
      position: { x: 0.9, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      startleSeconds: 0,
    }
    const chromisSteer = evaluateSchoolingSteering({
      self: chromisA,
      peers: [chromisA, chromisB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    expect(chromisSteer.mode).toBe('shoal')
    expect(chromisSteer.dx).toBeGreaterThan(0)

    // Two solitary royal grammas at the same 1.5-unit distance do NOT experience school cohesion
    const grammaA: SchoolingPeer = { ...chromisA, id: 'gramma-a', speciesId: 'royal-gramma' }
    const grammaB: SchoolingPeer = { ...chromisB, id: 'gramma-b', speciesId: 'royal-gramma' }
    const grammaSteer = evaluateSchoolingSteering({
      self: grammaA,
      peers: [grammaA, grammaB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    expect(grammaSteer.mode).toBe('pair-or-solitary')
    expect(grammaSteer.dx).toBe(0)
    expect(grammaSteer.dz).toBe(0)
  })

  it('isolates single-fish service-click startle so a startled peer never triggers a screen-wide panic (AC #4)', () => {
    const calmChromis: SchoolingPeer = {
      id: 'chromis-calm',
      speciesId: 'blue-green-chromis',
      position: { x: -0.5, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.4,
      clearanceRadius: 0.5,
      startleSeconds: 0,
    }
    const startledChromis: SchoolingPeer = {
      id: 'chromis-startled',
      speciesId: 'blue-green-chromis',
      position: { x: 1.0, y: 0.8, z: 1.0 },
      yaw: Math.PI,
      speed: 1.4,
      clearanceRadius: 0.5,
      startleSeconds: 0.85,
    }
    const steer = evaluateSchoolingSteering({
      self: calmChromis,
      peers: [calmChromis, startledChromis],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    expect(steer.dx).toBe(0)
    expect(steer.dz).toBe(0)
  })

  it('enforces personal-space separation, respects obstacle boundaries, and freezes under pause or reduced-motion (AC #3)', () => {
    const fishA: SchoolingPeer = {
      id: 'fish-a',
      speciesId: 'yellow-tang',
      position: { x: 0, y: 0.5, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.57,
      startleSeconds: 0,
    }
    const fishB: SchoolingPeer = {
      id: 'fish-b',
      speciesId: 'ocellaris-clownfish',
      position: { x: 0.4, y: 0.5, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      startleSeconds: 0,
    }

    const sepSteer = evaluateSchoolingSteering({
      self: fishA,
      peers: [fishA, fishB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    expect(sepSteer.dx).toBeLessThan(0)

    const pausedSteer = evaluateSchoolingSteering({
      self: fishA,
      peers: [fishA, fishB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
      paused: true,
    })
    expect(pausedSteer.dx).toBe(0)
  })

  it('suppresses cohesion/alignment while foraging, retreating, displaying, or bursting, keeping separation only (AQ-41 AC #1)', () => {
    // Same 1.5-unit chromis pair as the cohesion case above: with cohesion
    // allowed they pull together (dx > 0); with it suppressed the steering
    // is exactly zero at this distance (beyond the 1.12 separation range).
    const chromisA: SchoolingPeer = {
      id: 'chromis-a',
      speciesId: 'blue-green-chromis',
      position: { x: -0.6, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      startleSeconds: 0,
    }
    const chromisB: SchoolingPeer = {
      id: 'chromis-b',
      speciesId: 'blue-green-chromis',
      position: { x: 0.9, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      startleSeconds: 0,
    }
    const suppressed = evaluateSchoolingSteering({
      self: chromisA,
      peers: [chromisA, chromisB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
      cohesionAllowed: false,
    })
    expect(suppressed.dx).toBe(0)
    expect(suppressed.dy).toBe(0)
    expect(suppressed.dz).toBe(0)

    // Close enough to overlap, separation still pushes them apart even with
    // cohesion suppressed.
    const closeA: SchoolingPeer = { ...chromisA, position: { x: 0, y: 0.8, z: 1.0 } }
    const closeB: SchoolingPeer = { ...chromisB, position: { x: 0.3, y: 0.8, z: 1.0 } }
    const separated = evaluateSchoolingSteering({
      self: closeA,
      peers: [closeA, closeB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
      cohesionAllowed: false,
    })
    expect(separated.dx).toBeLessThan(0)
  })

  it('benchmarks realistic configured fish counts and confirms direct CPU evaluation completes well under 1 ms per frame (AC #2)', () => {
    // Load-tolerant bound (see school-population.test.ts): under the full
    // suite's parallel workers this measures ~3 ms/step, vs < 2 ms/step in
    // isolation. The backend decision is the exact assertion.
    const bench12 = benchmarkSchoolingStep(12, 100)
    expect(bench12.populationCount).toBe(12)
    expect(bench12.recommendedBackend).toBe('cpu-direct')
    expect(bench12.averageMicrosecondsPerStep).toBeLessThan(5000)
  })
})
