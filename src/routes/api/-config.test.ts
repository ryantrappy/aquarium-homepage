import { describe, expect, it } from 'vitest'
import { validateWriteOrigin } from './config'

describe('config write origin guard', () => {
  it('allows same-origin and non-browser requests without an Origin header', () => {
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
})
