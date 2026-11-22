import { describe, expect, it } from 'vitest'
import { SNOWFLAKE_MORAY_EEL_ID } from './fish'
import { EXAMPLE_SERVICES, exportServices, loadSharedConfig, parseImportedServices, resetSharedConfig } from './services'
import { serviceConfigSchema, serviceListSchema, serviceUrlSchema, sharedConfigSchema } from './validation'

describe('service configuration', () => {
  it('uses public showcase services for the starter roster', () => {
    expect(EXAMPLE_SERVICES.every((service) => service.isExample)).toBe(true)
    expect(EXAMPLE_SERVICES.map(({ name, url, fishId }) => ({ name, url, fishId }))).toEqual([
      { name: 'Google', url: 'https://www.google.com', fishId: 'yellow-tang' },
      { name: 'Wikipedia', url: 'https://www.wikipedia.org', fishId: 'banggai-cardinalfish' },
      { name: 'GitHub', url: 'https://github.com', fishId: 'royal-gramma' },
      { name: 'YouTube', url: 'https://www.youtube.com', fishId: 'ocellaris-clownfish' },
      { name: 'Internet Archive', url: 'https://archive.org', fishId: 'blue-tang' },
    ])
  })

  it('accepts absolute http and https URLs, allows blank URLs for link-less display fish, and rejects unsafe schemes and credentials', () => {
    expect(serviceUrlSchema.safeParse('').success).toBe(true)
    expect(serviceUrlSchema.safeParse('   ').success).toBe(true)
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

  it('allows the cave-resident moray for one service and rejects duplicate assignments', () => {
    const first = { ...EXAMPLE_SERVICES[0], id: 'moray-one', fishId: SNOWFLAKE_MORAY_EEL_ID }
    const second = { ...EXAMPLE_SERVICES[1], id: 'moray-two', fishId: SNOWFLAKE_MORAY_EEL_ID }

    expect(serviceListSchema.safeParse([first]).success).toBe(true)
    expect(() => serviceListSchema.parse([first, second])).toThrow(/only one service/)
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

  it('loads existing saved services without replacing their URLs with the examples', async () => {
    const personalConfig = {
      version: 1 as const,
      mode: 'reef' as const,
      services: [{
        id: 'private-dashboard',
        name: 'Private dashboard',
        url: 'http://trappserv.er:8123',
        fishId: 'ocellaris-clownfish',
        isExample: false,
      }],
    }
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => Response.json({ config: personalConfig, revision: 'saved-revision' })
    try {
      await expect(loadSharedConfig()).resolves.toEqual({ config: personalConfig, revision: 'saved-revision' })
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
