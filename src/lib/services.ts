import { serviceConfigSchema, serviceDraftSchema, serviceListSchema, sharedConfigSchema, type SharedConfig } from './validation'

export type ServiceConfig = ReturnType<typeof serviceConfigSchema.parse>
export type ServiceDraft = ReturnType<typeof serviceDraftSchema.parse>
export type { SharedConfig }

export function hasServiceUrl(service: Pick<ServiceConfig, 'url'>): boolean {
  return service.url.trim().length > 0
}

// Public showcase examples. Inclusion does not indicate reachability or health.
export const EXAMPLE_SERVICES: ServiceConfig[] = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com',
    fishId: 'yellow-tang',
    isExample: true,
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    fishId: 'banggai-cardinalfish',
    isExample: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    fishId: 'royal-gramma',
    isExample: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com',
    fishId: 'ocellaris-clownfish',
    isExample: true,
  },
  {
    id: 'internet-archive',
    name: 'Internet Archive',
    url: 'https://archive.org',
    fishId: 'blue-tang',
    isExample: true,
  },
]

export function exportServices(services: ServiceConfig[]) {
  return JSON.stringify(services, null, 2)
}

async function responseError(response: Response) {
  let message = 'The shared configuration is unavailable. Your changes were not saved.'
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') message = body.error
  } catch {
    // Keep the safe default when the server did not return a JSON error.
  }
  const error = new Error(message)
  if (response.status === 409) error.name = 'ConfigConflictError'
  throw error
}

export type SharedConfigSnapshot = { config: SharedConfig; revision: string }

export async function loadSharedConfig(): Promise<SharedConfigSnapshot> {
  let response: Response
  try {
    response = await fetch('/api/config', { headers: { Accept: 'application/json' }, cache: 'no-store' })
  } catch {
    throw new Error('Could not reach the shared settings service. Your draft stays on this screen; check the connection and retry.')
  }
  if (!response.ok) await responseError(response)
  try {
    const value: unknown = await response.json()
    const parsed = value && typeof value === 'object' && 'config' in value
      ? value as { config: unknown; revision: unknown }
      : undefined
    if (!parsed || typeof parsed.revision !== 'string') throw new Error()
    return { config: sharedConfigSchema.parse(parsed.config), revision: parsed.revision }
  } catch {
    throw new Error('The shared settings service returned an invalid configuration. It was not changed.')
  }
}

export async function saveSharedConfig(config: SharedConfig, revision: string): Promise<SharedConfigSnapshot> {
  let response: Response
  try {
    response = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'If-Match': `"${revision}"` },
      body: JSON.stringify({ config }),
    })
  } catch {
    throw new Error('Could not reach the shared settings service. Your draft stays on this screen; check the connection and retry.')
  }
  if (!response.ok) await responseError(response)
  try {
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object' || !('config' in value) || !('revision' in value) || typeof value.revision !== 'string') throw new Error()
    return { config: sharedConfigSchema.parse(value.config), revision: value.revision }
  } catch {
    throw new Error('The shared settings service returned an invalid save response. Your changes were not confirmed.')
  }
}

export async function resetSharedConfig(revision?: string, repairInvalid = false): Promise<SharedConfigSnapshot> {
  let response: Response
  try {
    response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(revision ? { 'If-Match': `"${revision}"` } : {}),
      },
      body: JSON.stringify({ reset: true, ...(repairInvalid ? { repairInvalid: true } : {}) }),
    })
  } catch {
    throw new Error('Could not reach the shared settings service. Example settings were not restored.')
  }
  if (!response.ok) await responseError(response)
  try {
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object' || !('config' in value) || !('revision' in value) || typeof value.revision !== 'string') throw new Error()
    return { config: sharedConfigSchema.parse(value.config), revision: value.revision }
  } catch {
    throw new Error('The shared settings service returned an invalid reset response. Example settings were not confirmed.')
  }
}

export function parseImportedServices(json: string): ServiceConfig[] {
  const value: unknown = JSON.parse(json)
  if (Array.isArray(value)) return serviceListSchema.parse(value)
  return sharedConfigSchema.parse(value).services
}
