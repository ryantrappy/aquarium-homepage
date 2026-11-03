import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_SERVICES,
  SERVICE_STORAGE_KEY,
  exportServices,
  importServices,
  readServices,
  saveServices,
  loadSharedConfig,
  resetSharedConfig,
  addService,
  deleteService,
  updateService,
  type StorageLike,
} from './services'
import { serviceConfigSchema, serviceUrlSchema } from './validation'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('service configuration', () => {
  it('uses clearly marked example entries when storage has no saved list', () => {
    expect(readServices(new MemoryStorage())).toEqual(EXAMPLE_SERVICES)
    expect(EXAMPLE_SERVICES.every((service) => service.isExample)).toBe(true)
    expect(EXAMPLE_SERVICES.every((service) => service.url.includes('trappserv.er:'))).toBe(true)
  })

  it('accepts absolute http and https URLs and rejects unsafe schemes and credentials', () => {
    expect(serviceUrlSchema.safeParse('https://aquarium.example/reef').success).toBe(true)
    expect(serviceUrlSchema.safeParse('http://trappserv.er:8080').success).toBe(true)
    expect(serviceUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
    expect(serviceUrlSchema.safeParse('https://user:password@reef.example').success).toBe(false)
    expect(serviceUrlSchema.safeParse('/relative/path').success).toBe(false)
  })

  it('rejects unknown fish and duplicate service IDs', () => {
    expect(serviceConfigSchema.safeParse({
      id: 'test', name: 'Test app', url: 'http://trappserv.er:3000', fishId: 'freshwater-guppy',
    }).success).toBe(false)

    const duplicated = [{ ...EXAMPLE_SERVICES[0] }, { ...EXAMPLE_SERVICES[0] }]
    expect(() => saveServices(duplicated, new MemoryStorage())).toThrow(/unique/)
  })

  it('round-trips valid settings and rejects malformed imports without changing saved settings', () => {
    const storage = new MemoryStorage()
    const services = [...EXAMPLE_SERVICES]
    saveServices(services, storage)
    expect(JSON.parse(storage.getItem(SERVICE_STORAGE_KEY) ?? 'null')).toEqual(services)
    expect(importServices(exportServices(services), storage)).toEqual(services)

    expect(() => importServices('{"bad": true}', storage)).toThrow()
    expect(readServices(storage)).toEqual(services)
  })

  it('supports a saved add, update, and delete sequence including an intentionally empty list', () => {
    const storage = new MemoryStorage()
    saveServices([], storage)
    expect(readServices(storage)).toEqual([])

    const afterAdd = addService({
      name: 'Reef notes',
      url: 'https://notes.example/reef',
      fishId: 'royal-gramma',
    }, readServices(storage), storage)
    expect(afterAdd).toHaveLength(1)
    expect(afterAdd[0]).toMatchObject({ name: 'Reef notes', isExample: false })

    const afterUpdate = updateService(afterAdd[0].id, { name: 'Reef log' }, afterAdd, storage)
    expect(afterUpdate[0].name).toBe('Reef log')

    expect(deleteService(afterUpdate[0].id, afterUpdate, storage)).toEqual([])
    expect(readServices(storage)).toEqual([])
  })

  it('preserves invalid saved data until the user explicitly imports or resets', () => {
    const storage = new MemoryStorage()
    storage.setItem(SERVICE_STORAGE_KEY, '{"unreadable": true}')

    expect(() => readServices(storage)).toThrow(/invalid/)
    expect(storage.getItem(SERVICE_STORAGE_KEY)).toBe('{"unreadable": true}')
    expect(() => importServices('{"alsoBad": true}', storage)).toThrow()
    expect(storage.getItem(SERVICE_STORAGE_KEY)).toBe('{"unreadable": true}')
  })

  it('reports when browser storage cannot save settings', () => {
    const failingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
    }
    expect(() => saveServices(EXAMPLE_SERVICES, failingStorage)).toThrow(/could not save/)
  })

  it('reports a shared-server network failure without pretending a save succeeded', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => { throw new TypeError('offline') }
    try {
      await expect(loadSharedConfig()).rejects.toThrow(/draft stays on this screen/)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('sends invalid-file recovery only as an explicit reset request', async () => {
    const originalFetch = globalThis.fetch
    let requestBody: unknown
    let requestHeaders: Headers | undefined
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body))
      requestHeaders = new Headers(init?.headers)
      return Response.json({
        config: { version: 1, mode: 'reef', services: EXAMPLE_SERVICES },
        revision: 'reset-revision',
      })
    }
    try {
      const saved = await resetSharedConfig(undefined, true)
      expect(saved.revision).toBe('reset-revision')
      expect(requestBody).toEqual({ reset: true, repairInvalid: true })
      expect(requestHeaders?.has('If-Match')).toBe(false)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
