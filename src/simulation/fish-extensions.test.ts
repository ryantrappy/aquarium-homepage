import { describe, expect, it, vi } from 'vitest'
import {
  createFishExtensionRuntime,
  resolveFishExtensions,
  type FishAnimationExtension,
  type FishBehaviorExtension,
  type FishExtensionConfig,
  type FishExtensionSnapshot,
} from './fish-extensions'

const snapshot = (instanceId = 'fish-a'): FishExtensionSnapshot => Object.freeze({
  instanceId,
  speciesId: 'yellow-tang',
  state: 'swim',
  position: Object.freeze({ x: 0, y: 1, z: 2 }),
  yaw: 0,
  pitch: 0,
  bank: 0,
  speed: 0.2,
})

function behavior(id: string, mark: string, seen: string[]): FishBehaviorExtension {
  return {
    kind: 'behavior', id,
    create: () => ({
      step: () => { seen.push(mark) },
    }),
  }
}

describe('per-fish extension scaffold', () => {
  it('resolves add, replace, and disable in default → species → instance order', () => {
    const seen: string[] = []
    const config = {
      defaults: {
        shared: { operation: 'add', extension: behavior('shared', 'default', seen) },
        removed: { operation: 'add', extension: behavior('removed', 'default', seen) },
      },
      species: {
        'yellow-tang': {
          shared: { operation: 'replace', extension: behavior('shared', 'species', seen) },
          speciesOnly: { operation: 'add', extension: behavior('speciesOnly', 'species', seen) },
        },
      },
      instances: {
        'fish-a': {
          shared: { operation: 'replace', extension: behavior('shared', 'instance', seen) },
          removed: { operation: 'disable' },
          instanceOnly: { operation: 'add', extension: behavior('instanceOnly', 'instance', seen) },
        },
      },
    } as const
    const resolved = resolveFishExtensions(config, 'yellow-tang', 'fish-a')
    expect(resolved.map(extension => extension.id)).toEqual(['instanceOnly', 'shared', 'speciesOnly'])
    const runtime = createFishExtensionRuntime(config, snapshot())
    runtime.step(snapshot(), 1 / 60, true)
    expect(seen).toEqual(['instance', 'instance', 'species'])
  })

  it('rejects implicit replacement and implicit addition', () => {
    const seen: string[] = []
    const base = behavior('named', 'base', seen)
    expect(() => resolveFishExtensions({
      defaults: { named: { operation: 'add', extension: base } },
      species: { 'yellow-tang': { named: { operation: 'add', extension: base } } },
    }, 'yellow-tang', 'fish-a')).toThrow(/use replace/)
    expect(() => resolveFishExtensions({
      defaults: { named: { operation: 'replace', extension: base } },
    }, 'yellow-tang', 'fish-a')).toThrow(/use add/)
  })

  it('uses locale-independent name ordering', () => {
    const seen: string[] = []
    const resolved = resolveFishExtensions({ defaults: {
      'ä': { operation: 'add', extension: behavior('ä', 'accented', seen) },
      z: { operation: 'add', extension: behavior('z', 'ascii', seen) },
    } }, 'yellow-tang', 'fish-a')
    expect(resolved.map(extension => extension.id)).toEqual(['z', 'ä'])
  })

  it('creates isolated private state and calls cleanup once per fish', () => {
    const stateCounts = new Map<string, number[]>()
    const cleanup = vi.fn()
    const extension: FishBehaviorExtension = {
      kind: 'behavior',
      id: 'counter',
      create: fish => {
        const counts: number[] = []
        stateCounts.set(fish.instanceId, counts)
        let count = 0
        return {
          step: () => { counts.push(++count) },
          dispose: cleanup,
        }
      },
    }
    const config = { defaults: { counter: { operation: 'add', extension } } } as const satisfies FishExtensionConfig
    const first = createFishExtensionRuntime(config, snapshot('fish-a'))
    const second = createFishExtensionRuntime(config, snapshot('fish-b'))
    first.step(snapshot('fish-a'), 1 / 60, true)
    first.step(snapshot('fish-a'), 1 / 60, true)
    second.step(snapshot('fish-b'), 1 / 60, true)
    first.dispose()
    first.dispose()
    second.dispose()
    expect(stateCounts.get('fish-a')).toEqual([1, 2])
    expect(stateCounts.get('fish-b')).toEqual([1])
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it('detaches and freezes caller-owned initial and step snapshots', () => {
    let factorySnapshot: FishExtensionSnapshot | undefined
    let stepSnapshot: FishExtensionSnapshot | undefined
    const extension: FishBehaviorExtension = {
      kind: 'behavior', id: 'snapshot',
      create: fish => {
        factorySnapshot = fish
        return { step: fishAtStep => { stepSnapshot = fishAtStep } }
      },
    }
    const config = { defaults: { snapshot: { operation: 'add', extension } } } as const satisfies FishExtensionConfig
    const initial = { ...snapshot(), position: { x: 1, y: 2, z: 3 } }
    const runtime = createFishExtensionRuntime(config, initial)
    initial.instanceId = 'changed-after-create'
    initial.position.x = 99
    expect(factorySnapshot?.instanceId).toBe('fish-a')
    expect(factorySnapshot?.position.x).toBe(1)
    expect(Object.isFrozen(factorySnapshot)).toBe(true)
    expect(Object.isFrozen(factorySnapshot?.position)).toBe(true)

    const current = { ...snapshot(), position: { x: 4, y: 5, z: 6 } }
    runtime.step(current, 1 / 60, true)
    current.instanceId = 'changed-after-step'
    current.position.x = 100
    expect(stepSnapshot?.instanceId).toBe('fish-a')
    expect(stepSnapshot?.position.x).toBe(4)
    expect(Object.isFrozen(stepSnapshot)).toBe(true)
    expect(Object.isFrozen(stepSnapshot?.position)).toBe(true)
  })

  it('binds the runtime to its initial fish and species', () => {
    const step = vi.fn()
    const extension: FishBehaviorExtension = { kind: 'behavior', id: 'identity', create: () => ({ step }) }
    const runtime = createFishExtensionRuntime({ defaults: { identity: { operation: 'add', extension } } }, snapshot())
    expect(() => runtime.step(snapshot('another-fish'), 1 / 60, true)).toThrow(/match its initial instance ID and species ID/)
    expect(() => runtime.step({ ...snapshot(), speciesId: 'blue-tang' }, 1 / 60, true)).toThrow(/match its initial instance ID and species ID/)
    expect(step).not.toHaveBeenCalled()
  })

  it('cleans already-created controllers when a later factory throws', () => {
    const firstCleanup = vi.fn(() => { throw new Error('first cleanup failed') })
    const secondCleanup = vi.fn()
    const first: FishBehaviorExtension = { kind: 'behavior', id: 'a-created', create: () => ({ step: () => [], dispose: firstCleanup }) }
    const second: FishBehaviorExtension = { kind: 'behavior', id: 'b-created', create: () => ({ step: () => [], dispose: secondCleanup }) }
    const factoryError = new Error('factory failed')
    const third: FishBehaviorExtension = { kind: 'behavior', id: 'c-fails', create: () => { throw factoryError } }
    let observedError: unknown
    try {
      createFishExtensionRuntime({ defaults: {
        'a-created': { operation: 'add', extension: first },
        'b-created': { operation: 'add', extension: second },
        'c-fails': { operation: 'add', extension: third },
      } }, snapshot())
    } catch (error) { observedError = error }
    expect(observedError).toBeInstanceOf(AggregateError)
    expect((observedError as AggregateError).cause).toBe(factoryError)
    expect(firstCleanup).toHaveBeenCalledOnce()
    expect(secondCleanup).toHaveBeenCalledOnce()
  })

  it('continues disposal after errors and keeps disposal idempotent', () => {
    const firstDispose = vi.fn(() => { throw new Error('dispose failed') })
    const secondDispose = vi.fn()
    const first: FishBehaviorExtension = { kind: 'behavior', id: 'a-throws', create: () => ({ step: () => [], dispose: firstDispose }) }
    const second: FishBehaviorExtension = { kind: 'behavior', id: 'b-cleans', create: () => ({ step: () => [], dispose: secondDispose }) }
    const runtime = createFishExtensionRuntime({ defaults: {
      'a-throws': { operation: 'add', extension: first },
      'b-cleans': { operation: 'add', extension: second },
    } }, snapshot())
    expect(() => runtime.dispose()).toThrow(AggregateError)
    expect(firstDispose).toHaveBeenCalledOnce()
    expect(secondDispose).toHaveBeenCalledOnce()
    expect(() => runtime.dispose()).not.toThrow()
    expect(firstDispose).toHaveBeenCalledOnce()
    expect(secondDispose).toHaveBeenCalledOnce()
  })

  it('skips hooks when motion is stopped and validates animation parameters', () => {
    const behaviorStep = vi.fn()
    const animationStep = vi.fn(() => ({ playbackRate: 1.25 }))
    const animation: FishAnimationExtension = {
      kind: 'animation', id: 'pace',
      create: () => ({ step: animationStep }),
    }
    const runtime = createFishExtensionRuntime({
      defaults: {
        behavior: { operation: 'add', extension: { kind: 'behavior', id: 'behavior', create: () => ({ step: behaviorStep }) } },
        pace: { operation: 'add', extension: animation },
      },
    }, snapshot())
    expect(runtime.step(snapshot(), 1 / 60, false)).toEqual({ behaviorIntents: [], playbackRate: 1 })
    expect(behaviorStep).not.toHaveBeenCalled()
    expect(animationStep).not.toHaveBeenCalled()
    expect(runtime.step(snapshot(), 1 / 60, true).playbackRate).toBe(1.25)
    const invalid: FishAnimationExtension = {
      kind: 'animation', id: 'invalid',
      create: () => ({ step: () => ({ playbackRate: Number.NaN }) }),
    }
    expect(() => createFishExtensionRuntime({ defaults: { invalid: { operation: 'add', extension: invalid } } }, snapshot())
      .step(snapshot(), 1 / 60, true)).toThrow(/must be finite/)
  })
})
