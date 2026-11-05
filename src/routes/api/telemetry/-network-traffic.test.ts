import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNetworkTrafficStore } from '../../../server/network-traffic'
import { createNetworkTrafficGetHandler, createNetworkTrafficHandlers, Route } from './network-traffic'

const roots: string[] = []

async function makeSource() {
  const statsRootPath = await mkdtemp(join(tmpdir(), 'reef-network-traffic-route-'))
  roots.push(statsRootPath)
  await writeFile(join(statsRootPath, 'rx_bytes'), '1000\n')
  await writeFile(join(statsRootPath, 'tx_bytes'), '2000\n')
  return { id: 'host-enp4s0', label: 'Homelab network', statsRootPath }
}

async function setCounters(statsRootPath: string, rxBytes: string, txBytes: string) {
  await Promise.all([
    writeFile(join(statsRootPath, 'rx_bytes'), `${rxBytes}\n`),
    writeFile(join(statsRootPath, 'tx_bytes'), `${txBytes}\n`),
  ])
}

function request(sourceId?: string) {
  const url = new URL('http://reef-control/api/telemetry/network-traffic')
  if (sourceId !== undefined) url.searchParams.set('sourceId', sourceId)
  return new Request(url)
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((rootPath) => rm(rootPath, { recursive: true, force: true })))
})

describe('network traffic API handler', () => {
  it('registers GET with ANY fallback while leaving HEAD to the framework GET fallback', () => {
    const handlers = Route.options.server?.handlers ?? {}
    expect(Object.keys(handlers).sort()).toEqual(['ANY', 'GET'])
    expect(handlers).not.toHaveProperty('HEAD')
  })

  it.each(['POST', 'PUT', 'DELETE'])('rejects %s with 405 without sampling', async (method) => {
    const store = createNetworkTrafficStore({ sources: [] })
    const read = vi.spyOn(store, 'read')
    const handlers = createNetworkTrafficHandlers(store)
    const response = await handlers.ANY({ request: new Request('http://reef-control/api/telemetry/network-traffic', { method }) })

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, HEAD')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ message: 'Method not allowed.' })
    expect(read).not.toHaveBeenCalled()
  })

  it('lists configured sources without paths and forwards warm-up then fresh readings', async () => {
    const source = await makeSource()
    let elapsed = 1_000
    let wall = 1_800_000_000_000
    const store = createNetworkTrafficStore({
      sources: [source], elapsedNow: () => elapsed, wallNow: () => wall,
    })
    const trustedSourcesBefore = store.getSources()
    const handler = createNetworkTrafficGetHandler(store)

    const warmupResponse = await handler({ request: request() })
    expect(warmupResponse.status).toBe(200)
    expect(warmupResponse.headers.get('Cache-Control')).toBe('no-store')
    await expect(warmupResponse.json()).resolves.toEqual({
      sources: [{ id: source.id, label: source.label }],
      reading: {
        status: 'unavailable', sourceId: source.id, label: source.label, unit: 'B/s',
        message: 'Waiting for a second counter sample to calculate traffic rates.',
      },
    })

    await setCounters(source.statsRootPath, '2000', '2500')
    elapsed += 2_000
    wall += 2_000
    const freshResponse = await handler({ request: request(source.id) })
    expect(freshResponse.headers.get('Cache-Control')).toBe('no-store')
    await expect(freshResponse.json()).resolves.toMatchObject({
      sources: [{ id: source.id, label: source.label }],
      reading: {
        status: 'fresh', sourceId: source.id, label: source.label,
        ingressBytesPerSecond: 500, egressBytesPerSecond: 250, unit: 'B/s',
        observedAt: new Date(wall).toISOString(), ageMs: 0,
      },
    })
    expect(store.getSources()).toEqual(trustedSourcesBefore)
  })

  it('forwards a fresh reading when client polling pauses for 60.25 seconds', async () => {
    const source = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    const handler = createNetworkTrafficGetHandler(store)
    await handler({ request: request(source.id) })

    await setCounters(source.statsRootPath, '7025', '14050')
    elapsed = 60_250
    const response = await handler({ request: request(source.id) })
    await expect(response.json()).resolves.toMatchObject({
      reading: {
        status: 'fresh', ingressBytesPerSecond: 100, egressBytesPerSecond: 200, unit: 'B/s', ageMs: 0,
      },
    })
  })

  it('returns stale sampler data honestly after the configured source becomes unreadable', async () => {
    const source = await makeSource()
    let elapsed = 0
    const store = createNetworkTrafficStore({ sources: [source], elapsedNow: () => elapsed })
    const handler = createNetworkTrafficGetHandler(store)
    await handler({ request: request(source.id) })
    await setCounters(source.statsRootPath, '1200', '2200')
    elapsed = 1_000
    await handler({ request: request(source.id) })

    await rm(join(source.statsRootPath, 'rx_bytes'))
    elapsed = 2_000
    const response = await handler({ request: request(source.id) })

    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      reading: {
        status: 'stale', sourceId: source.id, label: source.label,
        ingressBytesPerSecond: 200, egressBytesPerSecond: 200,
        unit: 'B/s', ageMs: 1_000,
        message: 'The selected network traffic source could not be read.',
      },
    })
  })

  it('returns unavailable for unknown IDs without treating them as paths', async () => {
    const source = await makeSource()
    const store = createNetworkTrafficStore({ sources: [source] })
    const response = await createNetworkTrafficGetHandler(store)({ request: request('../../etc/passwd') })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      sources: [{ id: source.id, label: source.label }],
      reading: {
        status: 'unavailable', sourceId: 'unsupported', unit: 'B/s',
        message: 'The selected network traffic source is unavailable.',
      },
    })

    const emptyIdResponse = await createNetworkTrafficGetHandler(store)({ request: request('') })
    await expect(emptyIdResponse.json()).resolves.toMatchObject({
      reading: { status: 'unavailable', sourceId: 'unsupported' },
    })
  })

  it('reports an unconfigured source as unavailable', async () => {
    const response = await createNetworkTrafficGetHandler(createNetworkTrafficStore({ sources: [] }))({
      request: request(),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      sources: [],
      reading: {
        status: 'unavailable', sourceId: 'unconfigured', unit: 'B/s',
        message: 'No network traffic source is configured.',
      },
    })
  })

  it('forwards an unavailable sampler result when configured counters cannot be read initially', async () => {
    const source = await makeSource()
    await rm(join(source.statsRootPath, 'rx_bytes'))
    const store = createNetworkTrafficStore({ sources: [source] })
    const response = await createNetworkTrafficGetHandler(store)({ request: request(source.id) })

    await expect(response.json()).resolves.toMatchObject({
      sources: [{ id: source.id, label: source.label }],
      reading: {
        status: 'unavailable', sourceId: source.id, label: source.label,
        unit: 'B/s', message: 'The selected network traffic source could not be read.',
      },
    })
  })
})
