import { createFileRoute } from '@tanstack/react-router'
import { ConfigConflictError, ConfigUnavailableError, readSharedConfig, resetSharedConfig, writeSharedConfig } from '../../server/shared-config'

export const Route = createFileRoute('/api/config')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const current = await readSharedConfig()
          return Response.json(current, { headers: { ETag: `"${current.revision}"`, 'Cache-Control': 'no-store' } })
        } catch (error) {
          return Response.json({ error: messageFor(error) }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
        }
      },
      PUT: async ({ request }) => {
        const originError = validateWriteOrigin(request)
        if (originError) return Response.json({ error: originError }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
        const expectedRevision = request.headers.get('If-Match')?.replace(/^"|"$/g, '')
        if (!expectedRevision) {
          return Response.json({ error: 'Reload the shared configuration before saving.' }, { status: 428 })
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'The configuration request must contain valid JSON.' }, { status: 400 })
        }

        if (!body || typeof body !== 'object' || !('config' in body)) {
          return Response.json({ error: 'The configuration request is missing its config object.' }, { status: 400 })
        }

        try {
          const saved = await writeSharedConfig(body.config, expectedRevision)
          return Response.json(saved, { headers: { ETag: `"${saved.revision}"`, 'Cache-Control': 'no-store' } })
        } catch (error) {
          if (error instanceof ConfigConflictError) {
            return Response.json({ error: error.message, current: error.current }, {
              status: 409,
              headers: { ETag: `"${error.current.revision}"`, 'Cache-Control': 'no-store' },
            })
          }
          const status = error instanceof TypeError ? 400 : 503
          return Response.json({ error: messageFor(error) }, { status, headers: { 'Cache-Control': 'no-store' } })
        }
      },
      POST: async ({ request }) => {
        const originError = validateWriteOrigin(request)
        if (originError) return Response.json({ error: originError }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'The reset request must contain valid JSON.' }, { status: 400 })
        }
        if (!body || typeof body !== 'object' || !('reset' in body) || body.reset !== true) {
          return Response.json({ error: 'Confirm the explicit example reset before continuing.' }, { status: 400 })
        }
        const repairInvalid = 'repairInvalid' in body && body.repairInvalid === true
        const expectedRevision = request.headers.get('If-Match')?.replace(/^"|"$/g, '')
        if (!expectedRevision && !repairInvalid) {
          return Response.json({ error: 'Reload the shared configuration before resetting it.' }, { status: 428 })
        }
        try {
          const reset = await resetSharedConfig(expectedRevision, repairInvalid)
          return Response.json(reset, { headers: { ETag: `"${reset.revision}"`, 'Cache-Control': 'no-store' } })
        } catch (error) {
          if (error instanceof ConfigConflictError) {
            return Response.json({ error: error.message, current: error.current }, {
              status: 409,
              headers: { ETag: `"${error.current.revision}"`, 'Cache-Control': 'no-store' },
            })
          }
          return Response.json({ error: messageFor(error) }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
        }
      },
    },
  },
})

export function validateWriteOrigin(request: Request, configuredPublicOrigin = process.env.REEF_PUBLIC_ORIGIN): string | undefined {
  const fetchSite = request.headers.get('Sec-Fetch-Site')?.toLowerCase()
  if (fetchSite === 'cross-site') return 'Cross-origin configuration writes are not allowed.'

  const origin = request.headers.get('Origin')
  if (origin) {
    try {
      const expectedOrigin = new URL(configuredPublicOrigin || request.url).origin
      if (new URL(origin).origin !== expectedOrigin) {
        return 'Cross-origin configuration writes are not allowed.'
      }
    } catch {
      return 'The configuration request has an invalid origin.'
    }
  }
}

function messageFor(error: unknown) {
  if (error instanceof ConfigUnavailableError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'The shared configuration is unavailable. Your changes were not saved.'
}
