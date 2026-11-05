import type { ServiceConfig } from '../../lib/services'
import { getFishById } from '../../lib/fish'

export type FishLinkInhabitant = {
  service: ServiceConfig
  anchor?: HTMLAnchorElement
  fallback: boolean
  artworkUnavailable?: boolean
}

/** React owns label content; refresh the current native target and renderer-owned
 * metadata without replacing its anchor or any swimming/animation state. */
export function refreshFishLink(item: FishLinkInhabitant, service: ServiceConfig, anchor?: HTMLAnchorElement): void {
  item.service = service; item.anchor = anchor
  if (!anchor) return
  const species = getFishById(service.fishId)
  const suffix = item.artworkUnavailable ? ' · thumbnail unavailable' : item.fallback ? ' · artwork preview' : ''
  anchor.href = service.url
  anchor.title = `${service.name} · ${species?.commonName ?? 'reef fish'}${suffix}`
  anchor.setAttribute('aria-label', `Open ${service.name} in a new tab${item.artworkUnavailable ? '; fish thumbnail unavailable' : ''}`)
  if (item.artworkUnavailable) anchor.dataset.artworkError = 'true'
  else anchor.removeAttribute('data-artwork-error')
}

/** Reuse stable service/species identities. Finish all new creation before
 * retiring old instances; a failed creation rolls back only new resources. */
export function reconcileFishInhabitants<T extends { service: ServiceConfig }>(
  current: readonly T[], services: readonly ServiceConfig[],
  hooks: { create(service: ServiceConfig, index: number): T; refresh(item: T, service: ServiceConfig): void; dispose(item: T): void },
): T[] {
  const previous = new Map(current.map(item => [item.service.id, item]))
  const created: T[] = [], next: T[] = []
  try {
    for (const [index, service] of services.entries()) {
      const old = previous.get(service.id)
      if (old && old.service.fishId === service.fishId) next.push(old)
      else { const item = hooks.create(service, index); created.push(item); next.push(item) }
    }
  } catch (error) {
    for (const item of created) hooks.dispose(item)
    throw error
  }
  const retained = new Set(next)
  for (const item of current) if (!retained.has(item)) hooks.dispose(item)
  next.forEach((item, index) => hooks.refresh(item, services[index]))
  return next
}
