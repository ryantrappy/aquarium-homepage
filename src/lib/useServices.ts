import { useSyncExternalStore } from 'react'
import {
  addService as addServiceToStorage,
  deleteService as deleteServiceFromStorage,
  EXAMPLE_SERVICES,
  importServices as importServicesToStorage,
  readServices,
  saveServices,
  updateService as updateServiceInStorage,
  type ServiceConfig,
  type ServiceDraft,
} from './services'

let snapshot: ReturnType<typeof readServices> | undefined
let snapshotError: string | undefined
const listeners = new Set<() => void>()

function getSnapshot() {
  if (!snapshot) {
    try {
      snapshot = readServices()
    } catch (error) {
      snapshotError = error instanceof Error ? error.message : 'Saved service settings could not be read.'
      snapshot = [...EXAMPLE_SERVICES]
    }
  }
  return snapshot
}

function getServerSnapshot() {
  return EXAMPLE_SERVICES
}

function notify(services: ServiceConfig[]) {
  snapshot = services
  snapshotError = undefined
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function refreshFromStorage() {
  snapshot = undefined
  snapshotError = undefined
  getSnapshot()
  listeners.forEach((listener) => listener())
}

function ensureWritable() {
  if (snapshotError) {
    throw new Error('Import a valid JSON configuration or reset settings before editing the saved services.')
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', refreshFromStorage)
}

export function useServices() {
  const services = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    services,
    loadError: snapshotError,
    addService(draft: ServiceDraft) {
      ensureWritable()
      notify(addServiceToStorage(draft, services))
    },
    updateService(id: string, patch: Partial<ServiceDraft>) {
      ensureWritable()
      notify(updateServiceInStorage(id, patch, services))
    },
    deleteService(id: string) {
      ensureWritable()
      notify(deleteServiceFromStorage(id, services))
    },
    importServices(json: string) {
      notify(importServicesToStorage(json))
    },
    resetServices() {
      notify(saveServices(EXAMPLE_SERVICES))
    },
  }
}
