import { describe, expect, it } from 'vitest'
import { runBehaviorRuntimeDemo } from './behavior-demo'
import {
  advanceFishBehavior,
  createFishBehaviorInstance,
  dispatchBehaviorEvent,
  getMotionIntent,
  getNavigationRequest,
  replanNavigation,
  reportNavigationOutcome,
} from './behavior-runtime'

function advanceFor(instance: ReturnType<typeof createFishBehaviorInstance>, seconds: number, frameDelta = 0.1) {
  let next = instance
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameDelta) {
    next = advanceFishBehavior(next, Math.min(frameDelta, seconds - elapsed))
  }
  return next
}

describe('per-fish behavior runtime', () => {
  it('keeps deterministic state and variation separate for each fish instance', () => {
    const first = createFishBehaviorInstance('tang-left', 'yellow-tang', 12)
    const second = createFishBehaviorInstance('tang-right', 'yellow-tang', 34)

    expect(first.state).toBe('idle')
    expect(first.seed).not.toBe(second.seed)
    expect(first.variation).not.toEqual(second.variation)
    expect(first.stateDurationSeconds).not.toBe(second.stateDurationSeconds)
  })

  it('produces the same state progression for different frame rates over equal elapsed time', () => {
    const seeds = [1, 7, 1234, 0xdeadbeef]
    for (const seed of seeds) {
      const start = createFishBehaviorInstance(`tang-${seed}`, 'yellow-tang', seed)
      const tenHz = advanceFor(start, 6, 0.1)
      let mixedRate = start
      for (let frame = 0; frame < 60; frame += 1) {
        for (const delta of [1 / 60, 1 / 30, 1 / 20]) mixedRate = advanceFishBehavior(mixedRate, delta)
      }

      expect(tenHz.state).toBe(mixedRate.state)
      expect(tenHz.stateEntryIndex).toBe(mixedRate.stateEntryIndex)
      expect(tenHz.stateElapsedSeconds).toBeCloseTo(mixedRate.stateElapsedSeconds, 8)
    }
  })

  it('does not accumulate paused or page-hidden time and bounds long-frame catch-up', () => {
    const start = createFishBehaviorInstance('tang', 'yellow-tang', 7)
    const paused = advanceFishBehavior(start, 10, { paused: true })
    const hidden = advanceFishBehavior(start, 10, { pageHidden: true })
    expect(paused.stateElapsedSeconds).toBe(start.stateElapsedSeconds)
    expect(hidden.stateElapsedSeconds).toBe(start.stateElapsedSeconds)
    expect(advanceFishBehavior(paused, 10).stateElapsedSeconds).toBe(start.stateElapsedSeconds)
    expect(advanceFishBehavior(hidden, 10).stateElapsedSeconds).toBe(start.stateElapsedSeconds)
    expect(advanceFishBehavior(hidden, 10).suspended).toBe(false)
    expect(advanceFishBehavior(start, 10)).toEqual(advanceFishBehavior(start, 0.25))
  })

  it('exposes scoped opportunity hooks for profile-enabled optional states', () => {
    const tang = advanceFor(createFishBehaviorInstance('tang-a', 'yellow-tang', 1), 5)
    const gramma = advanceFor(createFishBehaviorInstance('gramma', 'royal-gramma', 2), 5)
    const wrasse = advanceFor(createFishBehaviorInstance('wrasse', 'mccoskers-flasher-wrasse', 3), 5)
    expect(tang.state).toBe('swim')
    expect(gramma.state).toBe('swim')
    expect(wrasse.state).toBe('swim')

    expect(dispatchBehaviorEvent(tang, {
      type: 'behavior-opportunity', instanceId: 'tang-a', trigger: 'foraging-opportunity',
    }).state).toBe('forage')
    expect(dispatchBehaviorEvent(wrasse, {
      type: 'behavior-opportunity', instanceId: 'wrasse', trigger: 'display-opportunity',
    }).state).toBe('display')
    expect(dispatchBehaviorEvent(gramma, {
      type: 'behavior-opportunity', instanceId: 'gramma', trigger: 'display-opportunity',
    })).toBe(gramma)
  })

  it('scopes individual activation to its fish and only follows enabled profile transitions', () => {
    const activated = advanceFor(createFishBehaviorInstance('tang-a', 'yellow-tang', 1), 5)
    const other = advanceFor(createFishBehaviorInstance('tang-b', 'yellow-tang', 2), 5)
    expect(activated.state).toBe('swim')

    const nextActivated = dispatchBehaviorEvent(activated, {
      type: 'fish-activation', instanceId: 'tang-a', trigger: 'high-effort-cue',
    })
    const untouched = dispatchBehaviorEvent(other, {
      type: 'fish-activation', instanceId: 'tang-a', trigger: 'high-effort-cue',
    })

    expect(nextActivated.state).toBe('burst')
    expect(untouched).toBe(other)
    expect(getMotionIntent(nextActivated.state)).toBe('burst')
  })

  it('requires an explicit group disturbance to affect multiple instances', () => {
    const first = advanceFor(createFishBehaviorInstance('tang-a', 'yellow-tang', 1), 5)
    const second = advanceFor(createFishBehaviorInstance('tang-b', 'yellow-tang', 2), 5)
    const event = { type: 'group-disturbance', instanceIds: ['tang-a', 'tang-b'], trigger: 'high-effort-cue' } as const

    expect(dispatchBehaviorEvent(first, event).state).toBe('burst')
    expect(dispatchBehaviorEvent(second, event).state).toBe('burst')
    expect(dispatchBehaviorEvent(second, { ...event, instanceIds: ['tang-a'] })).toBe(second)
  })

  it('limits retreat targets to the declared refuge and replans without false arrival', () => {
    const adultTang = advanceFor(createFishBehaviorInstance('adult-tang', 'blue-tang', 1), 5)
    const juvenileTang = advanceFor(createFishBehaviorInstance('juvenile-tang', 'blue-tang', 1, 'juvenile'), 5)
    expect(adultTang.state).toBe('swim')
    expect(dispatchBehaviorEvent(adultTang, {
      type: 'group-disturbance', instanceIds: ['adult-tang'], trigger: 'threat-cue',
    }).state).toBe('swim')
    const juvenileRetreat = dispatchBehaviorEvent(juvenileTang, {
      type: 'group-disturbance', instanceIds: ['juvenile-tang'], trigger: 'threat-cue',
    })
    expect(juvenileRetreat.state).toBe('retreat')
    expect(juvenileRetreat.targetAnchor).toBe('branchingCoralRefuge')

    const firstRequest = getNavigationRequest(juvenileRetreat)!
    const failedRoute = reportNavigationOutcome(juvenileRetreat, firstRequest.generation, firstRequest.anchor, 'blocked')
    expect(failedRoute.state).toBe('retreat')
    expect(failedRoute.targetAnchor).toBeUndefined()
    expect(reportNavigationOutcome(failedRoute, firstRequest.generation, firstRequest.anchor, 'arrived')).toBe(failedRoute)
    const retry = replanNavigation(failedRoute)
    expect(retry.targetAnchor).toBe('branchingCoralRefuge')
    const retryRequest = getNavigationRequest(retry)!
    expect(retryRequest.generation).not.toBe(firstRequest.generation)
    expect(reportNavigationOutcome(retry, firstRequest.generation, firstRequest.anchor, 'arrived')).toBe(retry)
    expect(reportNavigationOutcome(retry, retryRequest.generation, 'schoolCenter', 'arrived')).toBe(retry)
    const recovered = reportNavigationOutcome(retry, retryRequest.generation, retryRequest.anchor, 'arrived')
    expect(recovered.state).toBe('idle')
    const swimmingAgain = advanceFor(recovered, 5)
    const secondRetreat = dispatchBehaviorEvent(swimmingAgain, {
      type: 'group-disturbance', instanceIds: ['juvenile-tang'], trigger: 'threat-cue',
    })
    const secondRequest = getNavigationRequest(secondRetreat)!
    expect(secondRequest.anchor).toBe(firstRequest.anchor)
    expect(reportNavigationOutcome(secondRetreat, firstRequest.generation, firstRequest.anchor, 'arrived')).toBe(secondRetreat)
    expect(reportNavigationOutcome(secondRetreat, secondRequest.generation, secondRequest.anchor, 'arrived').state).toBe('idle')
  })

  it('does not route a blocked retreat through another state anchor', () => {
    const gramma = createFishBehaviorInstance('gramma', 'royal-gramma', 90)
    expect(getNavigationRequest(gramma)?.anchor).toBe('rockCrevice')

    const swimming = advanceFor(gramma, 5)
    const retreat = dispatchBehaviorEvent(swimming, {
      type: 'environment-disturbance', instanceIds: ['gramma'], trigger: 'threat-cue',
    })
    expect(retreat.state).toBe('retreat')
    expect(retreat.targetAnchor).toBe('rockCrevice')

    const request = getNavigationRequest(retreat)!
    const blocked = reportNavigationOutcome(retreat, request.generation, request.anchor, 'blocked')
    expect(blocked.targetAnchor).toBeUndefined()
    expect(blocked.state).toBe('retreat')
    expect(getNavigationRequest(blocked)).toBeUndefined()
    expect(replanNavigation(blocked).targetAnchor).toBe('rockCrevice')
  })

  it('rejects invalid or unbounded fixed-step options', () => {
    const fish = createFishBehaviorInstance('tang', 'yellow-tang', 7)
    expect(() => advanceFishBehavior(fish, 0.1, { fixedStepSeconds: Number.NaN })).toThrow(RangeError)
    expect(() => advanceFishBehavior(fish, 0.1, { maxCatchUpSeconds: Number.POSITIVE_INFINITY })).toThrow(RangeError)
    expect(() => advanceFishBehavior(fish, 0.1, { fixedStepSeconds: 1e-6 })).toThrow(RangeError)
    expect(() => createFishBehaviorInstance('unknown-stage', 'yellow-tang', 1, 'larval' as never)).toThrow(RangeError)
  })

  it('demonstrates contrasting profile states, events, anchors, and speeds without scene integration', () => {
    const records = runBehaviorRuntimeDemo()
    const species = new Set(records.map((record) => record.speciesId))
    expect(species).toEqual(new Set([
      'ocellaris-clownfish', 'yellow-watchman-goby', 'mandarin-dragonet', 'blue-green-chromis', 'yellow-tang',
    ]))
    expect(records.some((record) => record.state === 'retreat' && record.anchor === 'branchingCoralRefuge')).toBe(true)
    expect(records.some((record) => record.state === 'forage' && record.anchor === 'grazingSurface')).toBe(true)
    expect(records.every((record) => record.cruiseSpeedTankWidthsPerSecond > 0 && record.stateTunedSpeedTankWidthsPerSecond > 0)).toBe(true)
  })
})
