import { serviceConfigSchema, serviceDraftSchema, serviceListSchema, sharedConfigSchema, type SharedConfig } from './validation'

export type ServiceConfig = ReturnType<typeof serviceConfigSchema.parse>
export type ServiceDraft = ReturnType<typeof serviceDraftSchema.parse>
export type { SharedConfig }

export const SERVICE_STORAGE_KEY = 'reef-control.services.v1'

// User-confirmed starter links. Inclusion does not indicate reachability or health.
export const EXAMPLE_SERVICES: ServiceConfig[] = [
  {
    id: 'komodo',
    name: 'Komodo',
    url: 'https://komodo.ryantr.app',
    fishId: 'yellow-tang',
    isExample: false,
  },
  {
    id: 'watchmybirds',
    name: 'WatchMyBirds',
    url: 'https://watchmybirds.ryantr.app',
    fishId: 'banggai-cardinalfish',
    isExample: false,
  },
  {
    id: 'paperless',
    name: 'Paperless',
    url: 'https://paperless.ryantr.app',
    fishId: 'royal-gramma',
    isExample: false,
  },
  {
    id: 'home-assistant',
    name: 'Home Assistant',
    url: 'https://ha.ryantr.app',
    fishId: 'ocellaris-clownfish',
    isExample: false,
  },
  {
    id: 'ombi',
    name: 'Ombi',
    url: 'https://ombi.ryantr.app',
    fishId: 'blue-tang',
    isExample: false,
  },
]

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readServices(storage = browserStorage()): ServiceConfig[] {
  if (!storage) return [...EXAMPLE_SERVICES]

  let saved: string | null
  try {
    saved = storage.getItem(SERVICE_STORAGE_KEY)
  } catch {
    return [...EXAMPLE_SERVICES]
  }

  if (saved === null) return [...EXAMPLE_SERVICES]

  try {
    return serviceListSchema.parse(JSON.parse(saved))
  } catch {
    throw new Error('Saved service settings are invalid. Fix or remove the saved configuration before making changes.')
  }
}

export function saveServices(services: unknown, storage = browserStorage()): ServiceConfig[] {
  const validServices = serviceListSchema.parse(services)
  if (!storage) {
    throw new Error('This browser cannot access local storage. Your changes were not saved.')
  }

  try {
    storage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(validServices))
  } catch {
    throw new Error('The browser could not save these settings to local storage. Check available storage and try again.')
  }
  return validServices
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `service-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function addService(draft: ServiceDraft, services = readServices(), storage = browserStorage()) {
  const service = serviceConfigSchema.parse({ ...draft, id: makeId(), isExample: false })
  return saveServices([...services, service], storage)
}

export function updateService(id: string, patch: Partial<ServiceDraft>, services = readServices(), storage = browserStorage()) {
  const updated = services.map((service) =>
    service.id === id ? serviceConfigSchema.parse({ ...service, ...patch, isExample: false }) : service,
  )
  return saveServices(updated, storage)
}

export function deleteService(id: string, services = readServices(), storage = browserStorage()) {
  return saveServices(services.filter((service) => service.id !== id), storage)
}

export function importServices(json: string, storage = browserStorage()) {
  return saveServices(JSON.parse(json), storage)
}

export function exportServices(services = readServices()) {
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
