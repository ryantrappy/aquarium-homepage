import {
  getSpeciesBehaviorProfile,
  sampleFishBehavior,
  type BehaviorState,
  type BehaviorTrigger,
  type HabitatAnchor,
  type SpeciesBehaviorProfile,
} from '../lib/fish-behavior'

export type NavigationOutcome = 'arrived' | 'blocked' | 'unavailable'
export type MotionIntent = 'hold' | 'travel' | 'forage' | 'display' | 'flee' | 'burst'
export type FishLifeStage = 'adult' | 'subadult' | 'juvenile'

export type FishBehaviorInstance = {
  readonly instanceId: string
  readonly speciesId: string
  readonly seed: number
  readonly lifeStage: FishLifeStage
  readonly variation: ReturnType<typeof sampleFishBehavior>
  readonly state: BehaviorState
  readonly stateElapsedSeconds: number
  readonly stateDurationSeconds: number
  readonly stateEntryIndex: number
  readonly simulationAccumulatorSeconds: number
  readonly suspended: boolean
  readonly navigationGeneration: number
  readonly targetAnchor?: HabitatAnchor
  readonly navigationOutcome?: NavigationOutcome
}

export type BehaviorRuntimeEvent =
  | { type: 'fish-activation'; instanceId: string; trigger: 'threat-cue' | 'high-effort-cue' }
  | { type: 'behavior-opportunity'; instanceId: string; trigger: 'foraging-opportunity' | 'display-opportunity' }
  | { type: 'group-disturbance'; instanceIds?: readonly string[]; trigger: 'threat-cue' | 'high-effort-cue' }
  | { type: 'environment-disturbance'; instanceIds?: readonly string[]; trigger: 'threat-cue' | 'high-effort-cue' }

export type NavigationRequest = {
  instanceId: string
  generation: number
  speciesId: string
  state: BehaviorState
  anchor: HabitatAnchor
  cue: string
}

export type NavigationAdapter = {
  /** Resolves a semantic anchor to a route; it must never teleport the fish. */
  request: (target: NavigationRequest) => NavigationOutcome
}

export type AdvanceOptions = {
  paused?: boolean
  pageHidden?: boolean
  fixedStepSeconds?: number
  maxCatchUpSeconds?: number
}

const DEFAULT_FIXED_STEP = 1 / 30
const DEFAULT_MAX_CATCH_UP = 0.25
const MAX_STEPS_PER_ADVANCE = 120

function hashUnit(seed: number) {
  let value = seed >>> 0
  value += 0x6d2b79f5
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

function durationFor(profile: SpeciesBehaviorProfile, state: BehaviorState, seed: number, entryIndex: number) {
  const range = profile.states[state]?.durationSeconds
  if (!range) throw new Error(`Behavior state ${state} is not enabled for ${profile.speciesId}.`)
  return range[0] + (range[1] - range[0]) * hashUnit(seed ^ Math.imul(entryIndex + 1, 0x9e3779b1))
}

function stateAnchor(profile: SpeciesBehaviorProfile, state: BehaviorState): HabitatAnchor | undefined {
  const config = profile.states[state]
  if (!config) return undefined
  const anchor = 'destination' in config ? config.destination : config.anchor
  return anchor && profile.anchors.includes(anchor) ? anchor : undefined
}

function canEnterState(profile: SpeciesBehaviorProfile, state: BehaviorState, lifeStage: FishLifeStage) {
  if (state !== 'retreat') return Boolean(profile.states[state])
  const config = profile.states.retreat
  if (!config) return false
  return config.eligibility !== 'juvenile-or-subadult' || lifeStage !== 'adult'
}

function transitionFor(
  profile: SpeciesBehaviorProfile,
  state: BehaviorState,
  trigger: BehaviorTrigger,
  seed: number,
  entryIndex: number,
  lifeStage: FishLifeStage,
) {
  const candidates = profile.transitions.filter((transition) =>
    transition.from === state && transition.trigger === trigger && canEnterState(profile, transition.to, lifeStage))
  if (candidates.length === 0) return undefined
  const weightTotal = candidates.reduce((total, candidate) => total + candidate.selectionWeight, 0)
  let choice = hashUnit(seed ^ Math.imul(entryIndex + 17, 0x85ebca6b)) * weightTotal
  return candidates.find((candidate) => (choice -= candidate.selectionWeight) <= 0) ?? candidates[candidates.length - 1]
}

function withTransition(instance: FishBehaviorInstance, profile: SpeciesBehaviorProfile, trigger: BehaviorTrigger): FishBehaviorInstance {
  const transition = transitionFor(profile, instance.state, trigger, instance.seed, instance.stateEntryIndex, instance.lifeStage)
  if (!transition) return instance
  const stateEntryIndex = instance.stateEntryIndex + 1
  const targetAnchor = stateAnchor(profile, transition.to)
  return {
    ...instance,
    state: transition.to,
    stateElapsedSeconds: 0,
    stateDurationSeconds: durationFor(profile, transition.to, instance.seed, stateEntryIndex),
    stateEntryIndex,
    navigationGeneration: instance.navigationGeneration + 1,
    targetAnchor,
    navigationOutcome: undefined,
  }
}

function completedWindowTrigger(state: BehaviorState): BehaviorTrigger | undefined {
  switch (state) {
    case 'idle': return 'idle-window-complete'
    case 'swim': return 'swim-segment-complete'
    case 'forage': return 'foraging-window-complete'
    case 'display': return 'display-window-complete'
    case 'burst': return 'effort-window-complete'
    case 'retreat': return undefined
  }
}

export function createFishBehaviorInstance(
  instanceId: string,
  speciesId: string,
  seed: number,
  lifeStage: FishLifeStage = 'adult',
): FishBehaviorInstance {
  if (!instanceId.trim()) throw new TypeError('Fish instance ID must be a non-empty string.')
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError('Fish instance seed must be a non-negative safe integer.')
  if (!['adult', 'subadult', 'juvenile'].includes(lifeStage)) throw new RangeError('Fish life stage must be adult, subadult, or juvenile.')
  const profile = getSpeciesBehaviorProfile(speciesId)
  if (!profile) throw new RangeError(`No reef behavior profile exists for species ID: ${speciesId}`)
  const state: BehaviorState = 'idle'
  const stateEntryIndex = 0
  return {
    instanceId,
    speciesId,
    seed,
    lifeStage,
    variation: sampleFishBehavior(speciesId, seed),
    state,
    stateElapsedSeconds: 0,
    stateDurationSeconds: durationFor(profile, state, seed, stateEntryIndex),
    stateEntryIndex,
    simulationAccumulatorSeconds: 0,
    suspended: false,
    navigationGeneration: 0,
    targetAnchor: stateAnchor(profile, state),
  }
}

/** Advance a single fish using bounded fixed steps. Hidden/paused time is not accumulated. */
export function advanceFishBehavior(
  instance: FishBehaviorInstance,
  elapsedSeconds: number,
  options: AdvanceOptions = {},
): FishBehaviorInstance {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new RangeError('Elapsed simulation time must be finite and non-negative.')
  const fixedStepSeconds = options.fixedStepSeconds ?? DEFAULT_FIXED_STEP
  const maxCatchUpSeconds = options.maxCatchUpSeconds ?? DEFAULT_MAX_CATCH_UP
  if (!Number.isFinite(fixedStepSeconds) || !(fixedStepSeconds > 0)) throw new RangeError('Simulation fixed step must be finite and positive.')
  if (!Number.isFinite(maxCatchUpSeconds) || !(maxCatchUpSeconds >= fixedStepSeconds)) throw new RangeError('Simulation catch-up bound must be finite and at least one fixed step.')
  if (Math.ceil(maxCatchUpSeconds / fixedStepSeconds) > MAX_STEPS_PER_ADVANCE) throw new RangeError(`Simulation advance cannot exceed ${MAX_STEPS_PER_ADVANCE} fixed steps.`)
  if (options.paused || options.pageHidden) return instance.suspended ? instance : { ...instance, suspended: true }
  if (instance.suspended) return { ...instance, suspended: false, simulationAccumulatorSeconds: 0 }
  if (elapsedSeconds === 0) return instance
  const profile = getSpeciesBehaviorProfile(instance.speciesId)
  if (!profile) throw new RangeError(`No reef behavior profile exists for species ID: ${instance.speciesId}`)
  let next = {
    ...instance,
    simulationAccumulatorSeconds: instance.simulationAccumulatorSeconds + Math.min(elapsedSeconds, maxCatchUpSeconds),
  }
  while (next.simulationAccumulatorSeconds + Number.EPSILON >= fixedStepSeconds) {
    next = { ...next, simulationAccumulatorSeconds: Math.max(0, next.simulationAccumulatorSeconds - fixedStepSeconds) }
    const elapsed = Math.min(next.stateElapsedSeconds + fixedStepSeconds, next.stateDurationSeconds)
    next = { ...next, stateElapsedSeconds: elapsed }
    if (elapsed >= next.stateDurationSeconds) {
      const trigger = completedWindowTrigger(next.state)
      if (trigger) next = withTransition(next, profile as SpeciesBehaviorProfile, trigger)
    }
  }
  return next
}

/** Events are scoped to one fish unless their type explicitly requests a group/environment audience. */
export function dispatchBehaviorEvent(
  instance: FishBehaviorInstance,
  event: BehaviorRuntimeEvent,
): FishBehaviorInstance {
  const applies = event.type === 'fish-activation' || event.type === 'behavior-opportunity'
    ? event.instanceId === instance.instanceId
    : event.instanceIds === undefined || event.instanceIds.includes(instance.instanceId)
  if (!applies) return instance
  const profile = getSpeciesBehaviorProfile(instance.speciesId)
  if (!profile) return instance
  return withTransition(instance, profile as SpeciesBehaviorProfile, event.trigger)
}

/** Report route progress for the requested anchor; stale responses cannot transition the fish. */
export function reportNavigationOutcome(
  instance: FishBehaviorInstance,
  generation: number,
  anchor: HabitatAnchor,
  outcome: NavigationOutcome,
): FishBehaviorInstance {
  const profile = getSpeciesBehaviorProfile(instance.speciesId)
  if (!profile || instance.navigationGeneration !== generation || instance.targetAnchor !== anchor) return instance
  if (outcome === 'arrived') {
    const arrived = { ...instance, navigationOutcome: outcome }
    const isRefugeArrival = instance.state === 'retreat' && stateAnchor(profile, 'retreat') === anchor
    return isRefugeArrival ? withTransition(arrived, profile as SpeciesBehaviorProfile, 'refuge-reached') : arrived
  }
  return {
    ...instance,
    targetAnchor: undefined,
    navigationOutcome: outcome,
  }
}

/** Replan only toward the current state's declared compatible target; never substitutes a generic species anchor. */
export function replanNavigation(instance: FishBehaviorInstance): FishBehaviorInstance {
  const profile = getSpeciesBehaviorProfile(instance.speciesId)
  if (!profile) return instance
  return {
    ...instance,
    navigationGeneration: instance.navigationGeneration + 1,
    targetAnchor: stateAnchor(profile, instance.state),
    navigationOutcome: undefined,
  }
}

export function getNavigationRequest(instance: FishBehaviorInstance): NavigationRequest | undefined {
  if (!instance.targetAnchor) return undefined
  const profile = getSpeciesBehaviorProfile(instance.speciesId)
  const config = profile?.states[instance.state]
  if (!profile || !config) return undefined
  return {
    instanceId: instance.instanceId,
    generation: instance.navigationGeneration,
    speciesId: instance.speciesId,
    state: instance.state,
    anchor: instance.targetAnchor,
    cue: config.cue,
  }
}

export function getMotionIntent(state: BehaviorState): MotionIntent {
  switch (state) {
    case 'idle': return 'hold'
    case 'swim': return 'travel'
    case 'forage': return 'forage'
    case 'display': return 'display'
    case 'retreat': return 'flee'
    case 'burst': return 'burst'
  }
}

/** The adapter owns actual routing/deformation. This helper only asks it for a compatible semantic target. */
export function requestNavigation(instance: FishBehaviorInstance, adapter: NavigationAdapter): NavigationOutcome | undefined {
  const request = getNavigationRequest(instance)
  return request ? adapter.request(request) : undefined
}
