import { describe, expect, it } from 'vitest'
import { EXAMPLE_SERVICES, exportServices, loadSharedConfig, parseImportedServices, resetSharedConfig } from './services'
import { serviceConfigSchema, serviceListSchema, serviceUrlSchema, sharedConfigSchema } from './validation'

describe('service configuration', () => {
  it('uses the confirmed starter roster', () => {
    expect(EXAMPLE_SERVICES.every((service) => !service.isExample)).toBe(true)
    expect(EXAMPLE_SERVICES.map(({ name, url, fishId }) => ({ name, url, fishId }))).toEqual([
      { name: 'Komodo', url: 'https://komodo.ryantr.app', fishId: 'yellow-tang' },
      { name: 'WatchMyBirds', url: 'https://watchmybirds.ryantr.app', fishId: 'banggai-cardinalfish' },
      { name: 'Paperless', url: 'https://paperless.ryantr.app', fishId: 'royal-gramma' },
      { name: 'Home Assistant', url: 'https://ha.ryantr.app', fishId: 'ocellaris-clownfish' },
      { name: 'Ombi', url: 'https://ombi.ryantr.app', fishId: 'blue-tang' },
    ])
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
    expect(() => serviceListSchema.parse(duplicated)).toThrow(/unique/)
  })

  it('imports legacy arrays and shared envelopes and exports the current list', () => {
    const services = [...EXAMPLE_SERVICES]
    expect(parseImportedServices(JSON.stringify(services))).toEqual(services)
    const config = sharedConfigSchema.parse({ version: 1, mode: 'reef', services })
    expect(parseImportedServices(JSON.stringify(config))).toEqual(services)
    expect(JSON.parse(exportServices(services))).toEqual(services)
    expect(() => parseImportedServices('{"bad": true}')).toThrow()
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
