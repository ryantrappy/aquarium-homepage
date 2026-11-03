import { describe, expect, it, vi } from 'vitest'
import { EXAMPLE_SERVICES, type SharedConfigSnapshot } from './services'
import { createServicesState, resetRequestForSnapshot, resetSharedConfigForSnapshot, updateServiceById } from './services-state'

describe('shared services React snapshot state', () => {
  it('publishes error-only updates as a new snapshot so subscribers rerender', () => {
    const state = createServicesState([...EXAMPLE_SERVICES])
    const listener = vi.fn()
    const unsubscribe = state.subscribe(listener)
    const before = state.getSnapshot()

    state.setError(new Error('Shared settings are offline.'))

    expect(state.getSnapshot()).not.toBe(before)
    expect(state.getSnapshot()).toMatchObject({
      services: EXAMPLE_SERVICES,
      isLoaded: false,
      loadError: 'Shared settings are offline.',
    })
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('clears the error after a successful shared read and keeps a stable snapshot between notifications', () => {
    const state = createServicesState([...EXAMPLE_SERVICES])
    state.setError(new Error('offline'))
    const failed = state.getSnapshot()
    const services = [EXAMPLE_SERVICES[0]]

    state.setServices(services, 'rev-1')
    const loaded = state.getSnapshot()

    expect(loaded).not.toBe(failed)
    expect(loaded).toEqual({ services, revision: 'rev-1', isLoaded: true })
    expect(state.getSnapshot()).toBe(loaded)
  })
})

describe('concurrent service edits', () => {
  it('rejects an edit target removed by another browser instead of reporting a no-op save', () => {
    const patch = { name: 'My unfinished edit' }
    expect(() => updateServiceById([], 'removed-service', patch)).toThrow(/removed in another browser/)
    expect(patch).toEqual({ name: 'My unfinished edit' })
  })
})

describe('initial configuration recovery request', () => {
  it('allows an explicit reset action after the initial shared read failed', () => {
    const state = createServicesState([...EXAMPLE_SERVICES])
    state.setError(new Error('The shared configuration file is invalid.'))

    expect(resetRequestForSnapshot(state.getSnapshot())).toEqual({ revision: undefined, repairInvalid: true })
  })

  it('requires a loaded revision before resetting a readable configuration', () => {
    const state = createServicesState([...EXAMPLE_SERVICES])
    state.setServices([...EXAMPLE_SERVICES], 'revision-1')

    expect(resetRequestForSnapshot(state.getSnapshot(), 'revision-1')).toEqual({
      revision: 'revision-1', repairInvalid: false,
    })
  })

  it('sends the explicit repair reset selected from the hook snapshot after initial corruption', async () => {
    const state = createServicesState([...EXAMPLE_SERVICES])
    state.setError(new Error('The shared configuration file is invalid.'))
    const originalFetch = globalThis.fetch
    let requestBody: unknown
    let requestHeaders: Headers | undefined
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body))
      requestHeaders = new Headers(init?.headers)
      const config = { version: 1 as const, mode: 'reef' as const, services: EXAMPLE_SERVICES }
      return Response.json({ config, revision: 'repaired-revision' } satisfies SharedConfigSnapshot)
    }

    try {
      const repaired = await resetSharedConfigForSnapshot(state.getSnapshot())
      expect(repaired.revision).toBe('repaired-revision')
      expect(requestBody).toEqual({ reset: true, repairInvalid: true })
      expect(requestHeaders?.has('If-Match')).toBe(false)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
