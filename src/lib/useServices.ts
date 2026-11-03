import { useEffect, useSyncExternalStore } from 'react'
import { EXAMPLE_SERVICES, loadSharedConfig, parseImportedServices, saveSharedConfig, type ServiceConfig, type ServiceDraft } from './services'
import { createServicesState, resetSharedConfigForSnapshot, type ServicesSnapshot, updateServiceById } from './services-state'
import { serviceConfigSchema, sharedConfigSchema } from './validation'

const state = createServicesState([...EXAMPLE_SERVICES])
const serverSnapshot: ServicesSnapshot = { services: EXAMPLE_SERVICES, isLoaded: false }
let revision: string | undefined
let loadStarted = false

function getServerSnapshot() {
  return serverSnapshot
}

function notify(services: ServiceConfig[], nextRevision?: string) {
  if (nextRevision) revision = nextRevision
  state.setServices(services, revision)
}

function notifyError(error: unknown) {
  state.setError(error)
}

function ensureLoaded() {
  const current = state.getSnapshot()
  if (current.loadError) throw new Error(current.loadError)
  if (!current.isLoaded || !revision) throw new Error('Shared settings are still loading. Your draft stays on this screen; wait for the connection or retry.')
}

async function reloadSharedConfig() {
  try {
    const shared = await loadSharedConfig()
    notify(shared.config.services, shared.revision)
  } catch (error) {
    notifyError(error)
    throw error
  }
}

async function persist(services: unknown): Promise<void> {
  ensureLoaded()
  const config = sharedConfigSchema.parse({ version: 1, mode: 'reef', services })
  try {
    const saved = await saveSharedConfig(config, revision!)
    notify(saved.config.services, saved.revision)
  } catch (error) {
    if (error instanceof Error && error.name === 'ConfigConflictError') {
      try {
        const latest = await loadSharedConfig()
        notify(latest.config.services, latest.revision)
      } catch (reloadError) {
        notifyError(reloadError)
      }
    }
    throw error
  }
}

export function useServices() {
  const current = useSyncExternalStore(state.subscribe, state.getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (loadStarted) return
    loadStarted = true
    void reloadSharedConfig().catch(() => undefined)
  }, [])

  return {
    services: current.services,
    loadError: current.loadError,
    isLoaded: current.isLoaded,
    retryLoad(): Promise<void> {
      return reloadSharedConfig()
    },
    addService(draft: ServiceDraft): Promise<void> {
      ensureLoaded()
      const service = serviceConfigSchema.parse({ ...draft, id: makeId(), isExample: false })
      return persist([...state.getSnapshot().services, service])
    },
    updateService(id: string, patch: Partial<ServiceDraft>): Promise<void> {
      ensureLoaded()
      const services = state.getSnapshot().services
      return persist(updateServiceById(services, id, patch))
    },
    deleteService(id: string): Promise<void> {
      ensureLoaded()
      return persist(state.getSnapshot().services.filter((service) => service.id !== id))
    },
    importServices(json: string): Promise<void> {
      const imported = parseImportedServices(json)
      return persist(imported)
    },
    resetServices(): Promise<void> {
      return resetSharedConfigForSnapshot(state.getSnapshot(), revision).then((saved) => {
        notify(saved.config.services, saved.revision)
      }).catch(async (error: unknown) => {
        if (error instanceof Error && error.name === 'ConfigConflictError') {
          try {
            const latest = await loadSharedConfig()
            notify(latest.config.services, latest.revision)
          } catch (reloadError) {
            notifyError(reloadError)
          }
        }
        throw error
      })
    },
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `service-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
