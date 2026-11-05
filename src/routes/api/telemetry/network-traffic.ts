import { createFileRoute } from '@tanstack/react-router'
import { createNetworkTrafficStore, type NetworkTrafficReading } from '../../../server/network-traffic'

const sourceId = process.env.REEF_NETWORK_SOURCE_ID
const sourceLabel = process.env.REEF_NETWORK_SOURCE_LABEL
const statsRootPath = process.env.REEF_NETWORK_STATS_ROOT
const configuredSources = sourceId && sourceLabel && statsRootPath
  ? [{ id: sourceId, label: sourceLabel, statsRootPath }]
  : []
const store = createNetworkTrafficStore({ sources: configuredSources })

const unconfiguredReading: NetworkTrafficReading = {
  status: 'unavailable',
  sourceId: 'unconfigured',
  unit: 'B/s',
  message: 'No network traffic source is configured.',
}

export function createNetworkTrafficGetHandler(
  source: ReturnType<typeof createNetworkTrafficStore> = store,
) {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const sources = source.getSources()
    const requestedSourceId = url.searchParams.has('sourceId')
      ? url.searchParams.get('sourceId')!
      : sources[0]?.id
    const reading = requestedSourceId === undefined
      ? { ...unconfiguredReading }
      : await source.read(requestedSourceId)
    return Response.json({ sources, reading }, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export function createNetworkTrafficAnyHandler() {
  return async (_context: { request: Request }) => Response.json(
    { message: 'Method not allowed.' },
    { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } },
  )
}

export function createNetworkTrafficHandlers(
  source: ReturnType<typeof createNetworkTrafficStore> = store,
) {
  return {
    GET: createNetworkTrafficGetHandler(source),
    ANY: createNetworkTrafficAnyHandler(),
  }
}

export const Route = createFileRoute('/api/telemetry/network-traffic')({
  server: {
    handlers: createNetworkTrafficHandlers(),
  },
})
