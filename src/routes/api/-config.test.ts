import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConfigAnyHandler, Route, validateWriteOrigin } from './config'

afterEach(() => vi.unstubAllEnvs())

describe('config write origin guard', () => {
  it('allows matching-origin and non-browser requests in development', () => {
    expect(validateWriteOrigin(new Request('https://reef.example/api/config', {
      method: 'PUT', headers: { Origin: 'https://reef.example', 'Sec-Fetch-Site': 'same-origin' },
    }))).toBeUndefined()
    expect(validateWriteOrigin(new Request('https://reef.example/api/config', { method: 'PUT' }))).toBeUndefined()
  })

  it('matches the configured external HTTPS origin behind Caddy without trusting proxy headers', () => {
    expect(validateWriteOrigin(new Request('http://reef-control:3000/api/config', {
      method: 'PUT',
      headers: {
        Origin: 'https://aquarium.ryantr.app',
        Host: 'reef-control:3000',
        'Sec-Fetch-Site': 'same-origin',
      },
    }), 'https://aquarium.ryantr.app')).toBeUndefined()
  })

  it('still rejects an origin that differs from the configured public origin', () => {
    expect(validateWriteOrigin(new Request('http://reef-control:3000/api/config', {
      method: 'PUT',
      headers: { Origin: 'https://attacker.example' },
    }), 'https://aquarium.ryantr.app')).toMatch(/Cross-origin/)
  })

  it('uses the request URL in local development when no public origin is configured', () => {
    expect(validateWriteOrigin(new Request('http://localhost:3000/api/config', {
      method: 'PUT', headers: { Origin: 'http://localhost:3000' },
    }), '')).toBeUndefined()
  })

  it('rejects cross-origin and cross-site writes', () => {
    expect(validateWriteOrigin(new Request('https://reef.example/api/config', {
      method: 'PUT', headers: { Origin: 'https://attacker.example' },
    }))).toMatch(/Cross-origin/)
    expect(validateWriteOrigin(new Request('https://reef.example/api/config', {
      method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' },
    }))).toMatch(/Cross-origin/)
  })

  it('requires same-origin evidence for production writes when browser headers are omitted', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('REEF_PUBLIC_ORIGIN', 'https://reef.example')

    expect(validateWriteOrigin(new Request('https://reef.example/api/config', { method: 'PUT' }))).toMatch(/same-origin/)
    expect(validateWriteOrigin(new Request('https://reef.example/api/config', {
      method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin' },
    }))).toBeUndefined()
    expect(validateWriteOrigin(new Request('http://reef-control:3000/api/config', {
      method: 'PUT', headers: { Origin: 'https://reef.example' },
    }))).toBeUndefined()
  })
})

describe('config unsupported method handler', () => {
  it('registers ANY and returns a standard 405 response without invoking config handlers', async () => {
    const handlers = Route.options.server?.handlers ?? {}
    expect(Object.keys(handlers).sort()).toEqual(['ANY', 'GET', 'POST', 'PUT'])

    const response = await createConfigAnyHandler()({
      request: new Request('https://reef.example/api/config', { method: 'PATCH' }),
    })
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, HEAD, PUT, POST')
    await expect(response.json()).resolves.toEqual({ error: 'Method not allowed.' })
  })
})
