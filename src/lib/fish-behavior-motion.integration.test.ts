import { describe, expect, it } from 'vitest'
import {
  getSpeciesBehaviorProfile,
  SPECIES_BEHAVIOR_IDS,
} from './fish-behavior'
import {
  createSwimmingFish,
  distance,
  stepSwimmingFish,
  type SwimmingFish,
  type WaterHabitat,
} from '../rendering/scene/motion'

// Explicit safe-water fixture: wide, open bounds with no authored reef anchors
// or obstacles. The test exercises the real motion adapter without simulating
// route-arrival callbacks or claiming habitat/art acceptance.
const safeWaterFixture: WaterHabitat = {
  bounds: { min: { x: -5, y: -5, z: -5 }, max: { x: 5, y: 5, z: 5 } },
  obstacles: [],
  anchors: [],
}
const start = { x: -3, y: 0, z: -2 }
const fixedStepSeconds = 1 / 30
const traceSeconds = 12
// Trace t=0 is sampled immediately after this first planning/integration step;
// later labels measure elapsed simulated seconds from that sample.
const contrastSpecies = [
  'yellow-tang',
  'banggai-cardinalfish',
  'firefish',
  'mandarin-dragonet',
  'mccoskers-flasher-wrasse',
] as const

type MotionTrace = {
  instanceId: string
  speciesId: string
  seconds: number
  state: SwimmingFish['behavior']['state']
  position: { x: number; y: number; z: number }
  speed: number
  sampledCruiseSpeedTankWidthsPerSecond: number
  routeTargetDepth: number
}

function recordAt(instanceId: string, fish: SwimmingFish, seconds: number, routeTargetDepth: number): MotionTrace {
  return {
    instanceId,
    speciesId: fish.speciesId,
    seconds,
    state: fish.behavior.state,
    position: { ...fish.position },
    speed: fish.speed,
    sampledCruiseSpeedTankWidthsPerSecond: fish.behavior.variation.cruiseSpeedTankWidthsPerSecond,
    routeTargetDepth,
  }
}

function createTrace(instanceId: string, speciesId: string) {
  const fish = createSwimmingFish(instanceId, speciesId, start, 0.1)
  const profile = getSpeciesBehaviorProfile(speciesId)
  if (!profile) throw new Error(`Missing profile for ${speciesId}`)

  const trace: MotionTrace[] = []
  try {
    stepSwimmingFish(fish, safeWaterFixture, fixedStepSeconds)
    const target = fish.route.at(-1)
    if (!target) throw new Error(`Motion adapter did not create a free-water route for ${speciesId}`)
    const routeTargetDepth = (safeWaterFixture.bounds.max.y - target.y)
      / (safeWaterFixture.bounds.max.y - safeWaterFixture.bounds.min.y)

    trace.push(recordAt(instanceId, fish, 0, routeTargetDepth))
    for (let second = 1; second <= traceSeconds; second++) {
      for (let step = 0; step < 30; step++) {
        stepSwimmingFish(fish, safeWaterFixture, fixedStepSeconds)
      }
      trace.push(recordAt(instanceId, fish, second, routeTargetDepth))
    }

    return { trace, fish, profile, routeTargetDepth }
  } catch (error) {
    fish.extensions.dispose()
    throw error
  }
}

describe('species profiles consumed by the real swimming adapter', () => {
  it('covers all stable IDs with timed profile-backed routes and state/speed trajectories', () => {
    const created: SwimmingFish[] = []
    const traces = new Map<string, MotionTrace[]>()
    try {
      for (const speciesId of SPECIES_BEHAVIOR_IDS) {
        const result = createTrace(`coverage-${speciesId}`, speciesId)
        created.push(result.fish)
        traces.set(speciesId, result.trace)

        const [minimumSpeed, maximumSpeed] = result.profile.locomotion.speedTankWidthsPerSecond
        expect(result.fish.behavior.variation.cruiseSpeedTankWidthsPerSecond).toBeGreaterThanOrEqual(minimumSpeed)
        expect(result.fish.behavior.variation.cruiseSpeedTankWidthsPerSecond).toBeLessThanOrEqual(maximumSpeed)
        expect(result.routeTargetDepth).toBeGreaterThanOrEqual(result.profile.depthRange[0] - 1e-9)
        expect(result.routeTargetDepth).toBeLessThanOrEqual(result.profile.depthRange[1] + 1e-9)
        expect(result.trace).toHaveLength(traceSeconds + 1)
        expect(result.trace.at(-1)?.seconds).toBe(traceSeconds)
        expect(result.trace.some(({ position }) => distance(position, start) > 0.01)).toBe(true)
        for (const sample of result.trace) {
          expect(Number.isFinite(sample.speed)).toBe(true)
          expect(Object.values(sample.position).every(Number.isFinite)).toBe(true)
          expect(sample.position.x).toBeGreaterThanOrEqual(safeWaterFixture.bounds.min.x)
          expect(sample.position.x).toBeLessThanOrEqual(safeWaterFixture.bounds.max.x)
          expect(sample.position.y).toBeGreaterThanOrEqual(safeWaterFixture.bounds.min.y)
          expect(sample.position.y).toBeLessThanOrEqual(safeWaterFixture.bounds.max.y)
          expect(sample.position.z).toBeGreaterThanOrEqual(safeWaterFixture.bounds.min.z)
          expect(sample.position.z).toBeLessThanOrEqual(safeWaterFixture.bounds.max.z)
        }
      }

      expect([...traces.keys()].sort()).toEqual([...SPECIES_BEHAVIOR_IDS].sort())
      const selected = contrastSpecies.map((speciesId) => ({
        speciesId,
        trace: traces.get(speciesId)!,
      }))
      expect(new Set(selected.map(({ trace }) => trace[0].sampledCruiseSpeedTankWidthsPerSecond)).size).toBeGreaterThan(1)
      expect(new Set(selected.map(({ trace }) => trace.map(({ state }) => state).join(','))).size).toBeGreaterThan(1)
      expect(selected.every(({ trace }) => trace.some(({ speed }) => speed > 0))).toBe(true)

      // This concise record is the repeatable demonstration artifact: it
      // includes actual timed positions, states, adapter speeds, and profile
      // target depths for contrasting species, without exact-float snapshots.
      console.info('AQ-35_PROFILE_MOTION_TRACE', JSON.stringify({
        coveredSpecies: traces.size,
        safeWaterFixture: true,
        traceClock: 'seconds since the first planning/integration step',
        contrasts: selected.map(({ speciesId, trace }) => ({
          speciesId,
          routeTargetDepth: trace[0].routeTargetDepth,
          sampledCruiseSpeedTankWidthsPerSecond: trace[0].sampledCruiseSpeedTankWidthsPerSecond,
          samples: trace.filter(({ seconds }) => [0, 6, 12].includes(seconds))
            .map(({ seconds, state, position, speed }) => ({ seconds, state, position, speed })),
        })),
      }))
    } finally {
      for (const fish of created) fish.extensions.dispose()
    }
  })

  it('gives same-species instances independent deterministic samples and trajectories', () => {
    const created: SwimmingFish[] = []
    try {
      const first = createTrace('independent-yellow-tang-a', 'yellow-tang')
      created.push(first.fish)
      const second = createTrace('independent-yellow-tang-b', 'yellow-tang')
      created.push(second.fish)
      const repeatedFirst = createTrace('independent-yellow-tang-a', 'yellow-tang')
      created.push(repeatedFirst.fish)

      expect(first.fish.behavior.seed).not.toBe(second.fish.behavior.seed)
      expect(first.fish.behavior.variation).not.toEqual(second.fish.behavior.variation)
      expect(first.trace).toEqual(repeatedFirst.trace)
      expect(first.trace.map(({ position }) => position)).not.toEqual(second.trace.map(({ position }) => position))
      expect(first.trace.at(-1)?.speed).not.toBe(second.trace.at(-1)?.speed)
    } finally {
      for (const fish of created) fish.extensions.dispose()
    }
  })
})
