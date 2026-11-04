import type { BehaviorState, SpeciesBehaviorId } from '../lib/fish-behavior'

export type FishExtensionSnapshot = Readonly<{
  instanceId: string
  speciesId: string
  state: BehaviorState
  position: Readonly<{ x: number; y: number; z: number }>
  yaw: number
  pitch: number
  bank: number
  speed: number
}>

export type FishBehaviorIntent =
  | { type: 'fish-activation'; trigger: 'threat-cue' | 'high-effort-cue' }
  | { type: 'behavior-opportunity'; trigger: 'foraging-opportunity' | 'display-opportunity' }

export type FishAnimationIntent = Readonly<{ playbackRate?: number }>

export type FishBehaviorExtensionInstance = {
  step(snapshot: FishExtensionSnapshot, elapsedSeconds: number): readonly FishBehaviorIntent[] | void
  dispose?(): void
}

export type FishAnimationExtensionInstance = {
  step(snapshot: FishExtensionSnapshot, elapsedSeconds: number): FishAnimationIntent | void
  dispose?(): void
}

export type FishBehaviorExtension = {
  readonly kind: 'behavior'
  readonly id: string
  create(snapshot: FishExtensionSnapshot): FishBehaviorExtensionInstance
}

export type FishAnimationExtension = {
  readonly kind: 'animation'
  readonly id: string
  create(snapshot: FishExtensionSnapshot): FishAnimationExtensionInstance
}

export type FishExtension = FishBehaviorExtension | FishAnimationExtension
export type FishExtensionOperation =
  | { readonly operation: 'add' | 'replace'; readonly extension: FishExtension }
  | { readonly operation: 'disable' }

export type FishExtensionLayer = Readonly<Record<string, FishExtensionOperation>>

export type FishExtensionConfig = Readonly<{
  defaults?: FishExtensionLayer
  species?: Partial<Readonly<Record<SpeciesBehaviorId, FishExtensionLayer>>>
  instances?: Readonly<Record<string, FishExtensionLayer>>
}>

export const EMPTY_FISH_EXTENSIONS: FishExtensionConfig = Object.freeze({})

export const MAX_EXTENSION_PLAYBACK_RATE = 2
const MIN_EXTENSION_PLAYBACK_RATE = 0.25
const allowedBehaviorIntents = new Set([
  'fish-activation:threat-cue',
  'fish-activation:high-effort-cue',
  'behavior-opportunity:foraging-opportunity',
  'behavior-opportunity:display-opportunity',
])

function applyLayer(
  resolved: Map<string, FishExtension>,
  layer: FishExtensionLayer | undefined,
  layerName: string,
) {
  for (const [name, operation] of Object.entries(layer ?? {})) {
    if (!name.trim()) throw new TypeError(`${layerName} extension names must be non-empty.`)
    if (operation.operation === 'disable') {
      resolved.delete(name)
      continue
    }
    if (operation.extension.id !== name) throw new TypeError(`${layerName} extension key "${name}" must match its definition ID.`)
    if (operation.operation === 'add') {
      if (resolved.has(name)) throw new TypeError(`${layerName} cannot add existing extension "${name}"; use replace.`)
      resolved.set(name, operation.extension)
    } else {
      if (!resolved.has(name)) throw new TypeError(`${layerName} cannot replace missing extension "${name}"; use add.`)
      resolved.set(name, operation.extension)
    }
  }
}

/** Resolve shared, species, then instance layers. Operation errors are explicit. */
export function resolveFishExtensions(
  config: FishExtensionConfig,
  speciesId: SpeciesBehaviorId,
  instanceId: string,
): readonly FishExtension[] {
  const resolved = new Map<string, FishExtension>()
  applyLayer(resolved, config.defaults, 'default')
  applyLayer(resolved, config.species?.[speciesId], `species ${speciesId}`)
  applyLayer(resolved, config.instances?.[instanceId], `instance ${instanceId}`)
  return [...resolved.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

function detachSnapshot(snapshot: FishExtensionSnapshot): FishExtensionSnapshot {
  if (typeof snapshot.instanceId !== 'string' || !snapshot.instanceId.trim()) throw new TypeError('Fish extension instance ID must be non-empty.')
  if (typeof snapshot.speciesId !== 'string' || !snapshot.speciesId.trim()) throw new TypeError('Fish extension species ID must be non-empty.')
  if (!Number.isFinite(snapshot.position.x) || !Number.isFinite(snapshot.position.y) || !Number.isFinite(snapshot.position.z) ||
      !Number.isFinite(snapshot.yaw) || !Number.isFinite(snapshot.pitch) || !Number.isFinite(snapshot.bank) || !Number.isFinite(snapshot.speed)) {
    throw new RangeError('Fish extension snapshot values must be finite.')
  }
  return Object.freeze({
    instanceId: snapshot.instanceId,
    speciesId: snapshot.speciesId,
    state: snapshot.state,
    position: Object.freeze({ x: snapshot.position.x, y: snapshot.position.y, z: snapshot.position.z }),
    yaw: snapshot.yaw,
    pitch: snapshot.pitch,
    bank: snapshot.bank,
    speed: snapshot.speed,
  })
}

type DisposableController = { dispose?(): void }

function disposeControllers(controllers: readonly DisposableController[]) {
  const errors: unknown[] = []
  for (const controller of controllers) {
    try { controller.dispose?.() }
    catch (error) { errors.push(error) }
  }
  return errors
}

function validateBehaviorIntent(intent: FishBehaviorIntent) {
  if (!allowedBehaviorIntents.has(`${intent.type}:${intent.trigger}`)) {
    throw new TypeError('Fish behavior extensions may only request supported, fish-scoped behavior events.')
  }
}

function validatePlaybackRate(playbackRate: number) {
  if (!Number.isFinite(playbackRate) || playbackRate < MIN_EXTENSION_PLAYBACK_RATE || playbackRate > MAX_EXTENSION_PLAYBACK_RATE) {
    throw new RangeError(`Fish animation playbackRate must be finite and between ${MIN_EXTENSION_PLAYBACK_RATE} and ${MAX_EXTENSION_PLAYBACK_RATE}.`)
  }
}

/** Owns private extension instances for one fish and disposes them at most once. */
export function createFishExtensionRuntime(
  config: FishExtensionConfig,
  initialSnapshot: FishExtensionSnapshot,
) {
  const fish = detachSnapshot(initialSnapshot)
  const extensions = resolveFishExtensions(config, fish.speciesId as SpeciesBehaviorId, fish.instanceId)
  const behaviorInstances: FishBehaviorExtensionInstance[] = []
  const animationInstances: FishAnimationExtensionInstance[] = []
  const controllers: DisposableController[] = []
  try {
    for (const extension of extensions) {
      if (extension.kind === 'behavior') {
        const instance = extension.create(fish)
        behaviorInstances.push(instance)
        controllers.push(instance)
      } else {
        const instance = extension.create(fish)
        animationInstances.push(instance)
        controllers.push(instance)
      }
    }
  } catch (error) {
    const cleanupErrors = disposeControllers(controllers)
    if (cleanupErrors.length) {
      throw new AggregateError([error, ...cleanupErrors], 'Fish extension setup failed and controller cleanup also failed.', { cause: error })
    }
    throw error
  }
  let disposed = false

  return {
    step(snapshot: FishExtensionSnapshot, elapsedSeconds: number, motionAllowed: boolean) {
      if (disposed) throw new Error('Fish extension runtime has been disposed.')
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new RangeError('Extension elapsed time must be finite and non-negative.')
      const currentFish = detachSnapshot(snapshot)
      if (currentFish.instanceId !== fish.instanceId || currentFish.speciesId !== fish.speciesId) {
        throw new TypeError('Fish extension step snapshot must match its initial instance ID and species ID.')
      }
      if (!motionAllowed || elapsedSeconds === 0) return { behaviorIntents: [] as FishBehaviorIntent[], playbackRate: 1 }
      const behaviorIntents: FishBehaviorIntent[] = []
      for (const instance of behaviorInstances) {
        for (const intent of instance.step(currentFish, elapsedSeconds) ?? []) {
          validateBehaviorIntent(intent)
          behaviorIntents.push(intent)
        }
      }
      let playbackRate = 1
      for (const instance of animationInstances) {
        const intent = instance.step(currentFish, elapsedSeconds)
        if (intent?.playbackRate !== undefined) {
          validatePlaybackRate(intent.playbackRate)
          playbackRate *= intent.playbackRate
        }
      }
      return { behaviorIntents, playbackRate: Math.min(MAX_EXTENSION_PLAYBACK_RATE, Math.max(MIN_EXTENSION_PLAYBACK_RATE, playbackRate)) }
    },
    dispose() {
      if (disposed) return
      disposed = true
      const errors = disposeControllers(controllers)
      if (errors.length) throw new AggregateError(errors, 'One or more fish extension controllers failed to dispose.')
    },
  }
}

export type FishExtensionRuntime = ReturnType<typeof createFishExtensionRuntime>
