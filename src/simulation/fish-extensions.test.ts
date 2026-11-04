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
