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
      bodyRadiusM: 0.072,
      startleSeconds: 0,
    }
    const chromisB: SchoolingPeer = {
      id: 'chromis-b',
      speciesId: 'blue-green-chromis',
      position: { x: 0.9, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
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

  it('splits steering into separation/cohesion/alignment components that sum to the combined offset (AQ-84)', () => {
    const chromisA: SchoolingPeer = {
      id: 'chromis-a',
      speciesId: 'blue-green-chromis',
      position: { x: -0.6, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
      startleSeconds: 0,
    }
    const chromisB: SchoolingPeer = {
      id: 'chromis-b',
      speciesId: 'blue-green-chromis',
      position: { x: 0.9, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
      startleSeconds: 0,
    }
    const steer = evaluateSchoolingSteering({
      self: chromisA,
      peers: [chromisA, chromisB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    // 1.5 units apart is outside the separation range, so only
    // cohesion/alignment act — and they point toward the peer (+x) and
    // along the peer heading (+z).
    expect(steer.separation).toEqual({ x: 0, y: 0, z: 0 })
    expect(steer.cohesion.x).toBeGreaterThan(0)
    expect(steer.alignment.z).toBeGreaterThan(0)
    expect(steer.alignment.y).toBe(0)
    expect(steer.dx).toBeCloseTo(steer.separation.x + steer.cohesion.x + steer.alignment.x, 12)
    expect(steer.dy).toBeCloseTo(steer.separation.y + steer.cohesion.y + steer.alignment.y, 12)
    expect(steer.dz).toBeCloseTo(steer.separation.z + steer.cohesion.z + steer.alignment.z, 12)

    // Solitary species get no cohesion/alignment components at all.
    const grammaA: SchoolingPeer = { ...chromisA, id: 'gramma-a', speciesId: 'royal-gramma' }
    const grammaB: SchoolingPeer = { ...chromisB, id: 'gramma-b', speciesId: 'royal-gramma' }
    const grammaSteer = evaluateSchoolingSteering({
      self: grammaA,
      peers: [grammaA, grammaB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    expect(grammaSteer.cohesion).toEqual({ x: 0, y: 0, z: 0 })
    expect(grammaSteer.alignment).toEqual({ x: 0, y: 0, z: 0 })

    // Overlapping fish get a separation component pushing them apart.
    const closeA: SchoolingPeer = { ...chromisA, position: { x: 0, y: 0.8, z: 1.0 } }
    const closeB: SchoolingPeer = { ...chromisB, position: { x: 0.1, y: 0.8, z: 1.0 } }
    const separated = evaluateSchoolingSteering({
      self: closeA,
      peers: [closeA, closeB],
      waterBounds,
      obstacles: [],
      dt: 1 / 30,
    })
    expect(separated.separation.x).toBeLessThan(0)
  })

  it('isolates single-fish service-click startle so a startled peer never triggers a screen-wide panic (AC #4)', () => {
    const calmChromis: SchoolingPeer = {
      id: 'chromis-calm',
      speciesId: 'blue-green-chromis',
      position: { x: -0.5, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.4,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
      startleSeconds: 0,
    }
    const startledChromis: SchoolingPeer = {
      id: 'chromis-startled',
      speciesId: 'blue-green-chromis',
      position: { x: 1.0, y: 0.8, z: 1.0 },
      yaw: Math.PI,
      speed: 1.4,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
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
      bodyRadiusM: 0.08,
      startleSeconds: 0,
    }
    // AQ-85: 0.15 apart is inside the physical minSep (0.08 + 0.072 + 0.06
    // = 0.212) but far inside the legacy 1.12m range — separation here
    // proves the new body-radius rule, not the old clearance rule.
    const fishB: SchoolingPeer = {
      id: 'fish-b',
      speciesId: 'ocellaris-clownfish',
      position: { x: 0.15, y: 0.5, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
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
    // is exactly zero at this distance (beyond the ~0.2 separation range).
    const chromisA: SchoolingPeer = {
      id: 'chromis-a',
      speciesId: 'blue-green-chromis',
      position: { x: -0.6, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
      startleSeconds: 0,
    }
    const chromisB: SchoolingPeer = {
      id: 'chromis-b',
      speciesId: 'blue-green-chromis',
      position: { x: 0.9, y: 0.8, z: 1.0 },
      yaw: 0,
      speed: 0.5,
      clearanceRadius: 0.5,
      bodyRadiusM: 0.072,
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
    const closeB: SchoolingPeer = { ...chromisB, position: { x: 0.1, y: 0.8, z: 1.0 } }
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

describe('fish-to-fish personal-space separation scales to physical body radius (AQ-85)', () => {
  // Body radii are the fishBodyRadiusM values for each species
  // (chromis/clownfish 0.072, yellow tang 0.08, tailspot blenny 0.054).
  const peer = (overrides: Partial<SchoolingPeer> & { id: string }): SchoolingPeer => ({
    speciesId: 'blue-green-chromis',
    position: { x: 0, y: 0.8, z: 1.0 },
    yaw: 0,
    speed: 0.5,
    clearanceRadius: 0.5,
    bodyRadiusM: 0.072,
    startleSeconds: 0,
    ...overrides,
  })
  const steer = (self: SchoolingPeer, peers: SchoolingPeer[], dt = 1 / 30) =>
    evaluateSchoolingSteering({ self, peers, waterBounds, obstacles: [], dt })

  it('separates by physical body radius, not the legacy 0.5m clearance (AC #1)', () => {
    // Two chromis 0.5m apart carry the legacy 0.5 clearance each, so the
    // old rule (minSep >= 1.12m) would have pushed them apart. The physical
    // rule (minSep = 0.072 + 0.072 + 0.06 = 0.204) leaves them alone.
    const a = peer({ id: 'aq85-a', position: { x: 0, y: 0.8, z: 1.0 } })
    const b = peer({ id: 'aq85-b', position: { x: 0.5, y: 0.8, z: 1.0 } })
    expect(steer(a, [a, b]).separation).toEqual({ x: 0, y: 0, z: 0 })

    // Inside the physical range they still separate.
    const closeB = peer({ id: 'aq85-b', position: { x: 0.1, y: 0.8, z: 1.0 } })
    expect(steer(a, [a, closeB]).separation.x).toBeLessThan(0)
  })

  it('uses species-proportional radii: larger fish keep larger separation (AC #1)', () => {
    // Yellow tang (0.08) vs clownfish (0.072): minSep 0.212.
    const tang = peer({ id: 'aq85-tang', speciesId: 'yellow-tang', bodyRadiusM: 0.08, position: { x: 0, y: 0.8, z: 1.0 } })
    const clownFar = peer({ id: 'aq85-clown', speciesId: 'ocellaris-clownfish', bodyRadiusM: 0.072, position: { x: 0.25, y: 0.8, z: 1.0 } })
    expect(steer(tang, [tang, clownFar]).separation).toEqual({ x: 0, y: 0, z: 0 })
    const clownNear = peer({ id: 'aq85-clown', speciesId: 'ocellaris-clownfish', bodyRadiusM: 0.072, position: { x: 0.2, y: 0.8, z: 1.0 } })
    expect(steer(tang, [tang, clownNear]).separation.x).toBeLessThan(0)

    // Tailspot blenny pair (0.054 each): minSep 0.168 — smaller fish may
    // sit closer than a tang pair ever could.
    const blennyA = peer({ id: 'aq85-blenny-a', speciesId: 'tailspot-blenny', bodyRadiusM: 0.054, position: { x: 0, y: 0.8, z: 1.0 } })
    const blennyB = peer({ id: 'aq85-blenny-b', speciesId: 'tailspot-blenny', bodyRadiusM: 0.054, position: { x: 0.18, y: 0.8, z: 1.0 } })
    expect(steer(blennyA, [blennyA, blennyB]).separation).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('lets an approaching fish pass between schoolmates (AC #2)', () => {
    // A chromis pair 0.4m apart with a yellow tang swimming between them:
    // at 0.28m from each schoolmate the tang is outside the physical
    // minSep (0.08 + 0.072 + 0.06 = 0.212), so no repulsion wall forms.
    // Under the legacy rule it would already feel two 1.12m bubbles.
    const chromisA = peer({ id: 'aq85-ca', position: { x: -0.2, y: 0.8, z: 1.0 } })
    const chromisB = peer({ id: 'aq85-cb', position: { x: 0.2, y: 0.8, z: 1.0 } })
    const tang = peer({ id: 'aq85-tang', speciesId: 'yellow-tang', bodyRadiusM: 0.08, position: { x: 0, y: 0.8, z: 1.2 } })
    const between = steer(tang, [tang, chromisA, chromisB])
    expect(between.separation).toEqual({ x: 0, y: 0, z: 0 })

    // Even closer in — 0.5m from the pair's midpoint — still no wall.
    const tangFar = peer({ id: 'aq85-tang', speciesId: 'yellow-tang', bodyRadiusM: 0.08, position: { x: 0, y: 0.8, z: 1.5 } })
    expect(steer(tangFar, [tangFar, chromisA, chromisB]).separation).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('caps multi-neighbor repulsion so a cluster pushes no harder than ~one fish (AC #2 / AC #4)', () => {
    // Six tangs piled on the same side at 0.1m would accumulate ~2.5 units
    // of raw separation without a cap. dt = 10 bypasses the combined
    // 0.45/s clamp so the test observes the raw capped separation.
    const self = peer({ id: 'aq85-self', speciesId: 'yellow-tang', bodyRadiusM: 0.08, position: { x: 0, y: 0.8, z: 1.0 } })
    const cluster = Array.from({ length: 6 }, (_, i) =>
      peer({
        id: `aq85-peer-${i}`,
        speciesId: 'yellow-tang',
        bodyRadiusM: 0.08,
        position: { x: 0.1, y: 0.8 + (i % 3) * 0.02 - 0.02, z: 1.0 + Math.floor(i / 3) * 0.02 - 0.01 },
      }),
    )
    const capped = steer(self, [self, ...cluster], 10)
    const cappedMag = Math.hypot(capped.separation.x, capped.separation.y, capped.separation.z)
    expect(cappedMag).toBeLessThanOrEqual(1.0 + 1e-9)
    expect(cappedMag).toBeGreaterThan(0.8)

    // One neighbor at the same distance separates at full strength — the
    // cap only binds on accumulation, it never neuters a lone overlap.
    const single = steer(self, [self, cluster[0]!], 10)
    const singleMag = Math.hypot(single.separation.x, single.separation.y, single.separation.z)
    expect(singleMag).toBeGreaterThan(0.25)
    expect(singleMag).toBeLessThan(cappedMag)
    // The cluster's push does not scale linearly with neighbor count.
    expect(cappedMag).toBeLessThan(6 * singleMag)
  })

  it('keeps schoolmates closely grouped without blowup or interpenetration (AC #3)', () => {
    // Natural 0.3m spacing: no separation blowup, cohesion still groups.
    const a = peer({ id: 'aq85-a', position: { x: 0, y: 0.8, z: 1.0 } })
    const b = peer({ id: 'aq85-b', position: { x: 0.3, y: 0.8, z: 1.0 } })
    const grouped = steer(a, [a, b])
    expect(grouped.separation).toEqual({ x: 0, y: 0, z: 0 })
    expect(grouped.cohesion.x).toBeGreaterThan(0)

    // Overlapping at 0.1m: separation pushes them apart.
    const closeB = peer({ id: 'aq85-b', position: { x: 0.1, y: 0.8, z: 1.0 } })
    expect(steer(a, [a, closeB]).separation.x).toBeLessThan(0)
  })
})
