import type { ServiceConfig, ServiceDraft } from './services'
import { EXAMPLE_SERVICES, resetSharedConfig } from './services'
import { serviceConfigSchema } from './validation'

export type ServicesSnapshot = {
  services: ServiceConfig[]
  revision?: string
  loadError?: string
  isLoaded: boolean
}

export function resetRequestForSnapshot(snapshot: ServicesSnapshot, revision?: string) {
  if (!snapshot.loadError && (!snapshot.isLoaded || !revision)) {
    throw new Error('Shared settings are still loading. Wait for the connection or retry.')
  }
  return { revision, repairInvalid: Boolean(snapshot.loadError) }
}

export function resetSharedConfigForSnapshot(snapshot: ServicesSnapshot, revision?: string) {
  const request = resetRequestForSnapshot(snapshot, revision)
  return resetSharedConfig(request.revision, request.repairInvalid)
}

export function updateServiceById(services: ServiceConfig[], id: string, patch: Partial<ServiceDraft>): ServiceConfig[] {
  if (!services.some((service) => service.id === id)) {
    throw new Error('This service was removed in another browser. Your edit stays in the form; copy its details before canceling.')
  }
  return services.map((service) => service.id === id
    ? serviceConfigSchema.parse({ ...service, ...patch, isExample: false })
    : service)
}

export function createServicesState(initialServices: ServiceConfig[] = [...EXAMPLE_SERVICES]) {
  let snapshot: ServicesSnapshot = { services: initialServices, isLoaded: false }
  const listeners = new Set<() => void>()

  function publish(next: ServicesSnapshot) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setServices(services: ServiceConfig[], revision?: string) {
      publish({ services, revision, isLoaded: true })
    },
    setError(error: unknown) {
      publish({
        ...snapshot,
        loadError: error instanceof Error ? error.message : 'The shared configuration could not be loaded.',
      })
    },
  }
}
