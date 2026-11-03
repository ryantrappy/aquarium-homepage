import { serviceConfigSchema, serviceDraftSchema, serviceListSchema } from './validation'

export type ServiceConfig = ReturnType<typeof serviceConfigSchema.parse>
export type ServiceDraft = ReturnType<typeof serviceDraftSchema.parse>

export const SERVICE_STORAGE_KEY = 'reef-control.services.v1'

// These sample links are placeholders on the user's homelab, not health checks.
export const EXAMPLE_SERVICES: ServiceConfig[] = [
  {
    id: 'example-home-assistant',
    name: 'Home Assistant',
    url: 'http://trappserv.er:8123',
    fishId: 'ocellaris-clownfish',
    isExample: true,
  },
  {
    id: 'example-jellyfin',
    name: 'Jellyfin',
    url: 'http://trappserv.er:8096',
    fishId: 'blue-tang',
    isExample: true,
  },
  {
    id: 'example-immich',
    name: 'Immich',
    url: 'http://trappserv.er:2283',
    fishId: 'yellow-tang',
    isExample: true,
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
