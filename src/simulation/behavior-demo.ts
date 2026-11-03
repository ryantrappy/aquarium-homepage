import { getSpeciesBehaviorProfile } from '../lib/fish-behavior'
import {
  advanceFishBehavior,
  createFishBehaviorInstance,
  dispatchBehaviorEvent,
  getNavigationRequest,
  reportNavigationOutcome,
  type BehaviorRuntimeEvent,
  type FishBehaviorInstance,
} from './behavior-runtime'

type DemoEventKind = 'fish-activation' | 'behavior-opportunity' | 'group-disturbance' | 'environment-disturbance'

type DemoFish = {
  instanceId: string
  speciesId: string
  seed: number
} & (
  | { eventKind: 'fish-activation'; trigger: 'threat-cue' }
  | { eventKind: 'behavior-opportunity'; trigger: 'foraging-opportunity' }
  | { eventKind: 'group-disturbance' | 'environment-disturbance'; trigger: 'threat-cue' }
)

export type BehaviorDemoRecord = {
  atSeconds: number
  instanceId: string
  speciesId: string
  event: string
  state: FishBehaviorInstance['state']
  anchor?: string
  cue: string
  cruiseSpeedTankWidthsPerSecond: number
  stateTunedSpeedTankWidthsPerSecond: number
}

const DEMO_FISH: readonly DemoFish[] = [
  { instanceId: 'demo-clownfish', speciesId: 'ocellaris-clownfish', seed: 101, eventKind: 'fish-activation', trigger: 'threat-cue' },
  { instanceId: 'demo-watchman', speciesId: 'yellow-watchman-goby', seed: 202, eventKind: 'environment-disturbance', trigger: 'threat-cue' },
  { instanceId: 'demo-mandarin', speciesId: 'mandarin-dragonet', seed: 303, eventKind: 'behavior-opportunity', trigger: 'foraging-opportunity' },
  { instanceId: 'demo-chromis', speciesId: 'blue-green-chromis', seed: 404, eventKind: 'group-disturbance', trigger: 'threat-cue' },
  { instanceId: 'demo-tang', speciesId: 'yellow-tang', seed: 505, eventKind: 'behavior-opportunity', trigger: 'foraging-opportunity' },
]

function makeEvent(fish: DemoFish): BehaviorRuntimeEvent {
  if (fish.eventKind === 'fish-activation') {
    return { type: fish.eventKind, instanceId: fish.instanceId, trigger: fish.trigger }
  }
  if (fish.eventKind === 'behavior-opportunity') {
    return { type: fish.eventKind, instanceId: fish.instanceId, trigger: fish.trigger }
  }
  return { type: fish.eventKind, instanceIds: [fish.instanceId], trigger: fish.trigger }
}

/** Deterministic state/event trace for profile review; it does not create or move rendered fish. */
export function runBehaviorRuntimeDemo(): BehaviorDemoRecord[] {
  const rows: BehaviorDemoRecord[] = []

  for (const fish of DEMO_FISH) {
    const profile = getSpeciesBehaviorProfile(fish.speciesId)
    if (!profile) throw new Error(`Missing demo profile for ${fish.speciesId}.`)
    let instance = createFishBehaviorInstance(fish.instanceId, fish.speciesId, fish.seed)
    let elapsed = 0
    let eventFired = false
    let retreatStartedAt: number | undefined

    function record(event: string) {
      const currentProfile = getSpeciesBehaviorProfile(instance.speciesId)
      const stateConfig = currentProfile?.states[instance.state]
      if (!stateConfig) throw new Error(`Missing ${instance.state} state config for ${instance.speciesId}.`)
      const request = getNavigationRequest(instance)
      rows.push({
        atSeconds: Number(elapsed.toFixed(2)),
        instanceId: instance.instanceId,
        speciesId: instance.speciesId,
        event,
        state: instance.state,
        anchor: request?.anchor,
        cue: stateConfig.cue,
        cruiseSpeedTankWidthsPerSecond: Number(instance.variation.cruiseSpeedTankWidthsPerSecond.toFixed(4)),
        stateTunedSpeedTankWidthsPerSecond: Number((instance.variation.cruiseSpeedTankWidthsPerSecond * stateConfig.speedMultiplier).toFixed(4)),
      })
    }

    record('initial')
    while (elapsed < 20) {
      elapsed = Number((elapsed + 0.1).toFixed(2))
      const priorEntryIndex = instance.stateEntryIndex
      instance = advanceFishBehavior(instance, 0.1)
      if (instance.stateEntryIndex !== priorEntryIndex) {
        record('profile-timer')
        if (instance.state === 'retreat') retreatStartedAt = elapsed
      }

      const hasEventTransition = profile.transitions.some((transition) =>
        transition.from === instance.state && transition.trigger === fish.trigger)
      if (!eventFired && hasEventTransition) {
        const next = dispatchBehaviorEvent(instance, makeEvent(fish))
        if (next !== instance) {
          instance = next
          eventFired = true
          record(fish.eventKind)
          if (instance.state === 'retreat') retreatStartedAt = elapsed
        }
      }

      if (instance.state === 'retreat' && retreatStartedAt !== undefined && elapsed - retreatStartedAt >= 0.6) {
        const request = getNavigationRequest(instance)
        if (request) {
          instance = reportNavigationOutcome(instance, request.generation, request.anchor, 'arrived')
          record('demo-navigation-arrival')
        }
        retreatStartedAt = undefined
      }
    }
  }

  return rows
}
