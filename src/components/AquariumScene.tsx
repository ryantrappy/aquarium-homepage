import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import type { ServiceConfig } from '../lib/services'
import { getFishById } from '../lib/fish'
import { FishFigure } from './FishFigure'
import type { AquariumController, SceneStatus } from '../rendering/scene/aquarium'

type AquariumSceneProps = { services: ServiceConfig[]; paused: boolean; focusFallbackRef?: RefObject<HTMLElement | null> }

export function AquariumScene({ services, paused, focusFallbackRef }: AquariumSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null), overlayRef = useRef<HTMLDivElement>(null)
  const controller = useRef<AquariumController | undefined>(undefined)
  const current = useRef({ services, paused, focusFallbackRef }); current.current = { services, paused, focusFallbackRef }
  const [status, setStatus] = useState<SceneStatus>('loading')
  const acknowledgments = useRef(new Set<ReturnType<typeof setTimeout>>())
  useEffect(() => {
    let cancelled = false
    void import('../rendering/scene/aquarium').then(({ createAquarium }) => {
      if (cancelled || !canvasRef.current || !overlayRef.current) return
      controller.current = createAquarium(canvasRef.current, overlayRef.current, current.current.services, current.current.paused, value => { if (!cancelled) setStatus(value) }, () => current.current.focusFallbackRef?.current ?? null)
    }).catch(error => { console.error('Aquarium renderer unavailable', error); if (!cancelled) setStatus('failed') })
    return () => { cancelled = true; controller.current?.dispose(); controller.current = undefined; acknowledgments.current.forEach(clearTimeout); acknowledgments.current.clear() }
  }, [])
  useEffect(() => { controller.current?.update(services, paused) }, [services, paused])
  useEffect(() => { if (status !== 'ready') overlayRef.current?.querySelectorAll<HTMLAnchorElement>('a').forEach(anchor => { anchor.tabIndex = 0; anchor.removeAttribute('aria-hidden'); delete anchor.dataset.occluded }) }, [status])

  function nativeTarget(event: MouseEvent<HTMLAnchorElement>, service: ServiceConfig) {
    // Every new action resolves its own target. A previous native context menu
    // may have borrowed this overlapping rectangle for a different fish.
    event.currentTarget.href = service.url
    const keyboard = event.type === 'contextmenu' ? event.clientX === 0 && event.clientY === 0 : event.detail === 0
    const keyboardOrLabel = keyboard || (event.target instanceof Element && Boolean(event.target.closest('.fish-name')))
    let selected = service
    if (status === 'ready') {
      if (keyboardOrLabel) {
        if (!controller.current?.canActivate(service.id)) { event.preventDefault(); return undefined }
      } else {
        const picked = controller.current?.serviceAt(event.clientX, event.clientY)
        const visible = services.find(candidate => candidate.id === picked)
        if (!visible) { event.preventDefault(); return undefined }
        selected = visible
      }
    }
    const clickedAnchor = event.currentTarget
    if (selected.id !== service.id) {
      // An overlapping rectangle may belong to another fish. Let this same
      // native click open the visible fish's actual URL, retaining modifiers
      // and target behavior; no synthetic click/window.open or animation wait.
      // The native menu can read the live href after this event returns. Keep
      // it stable until the next action resolves a fresh target; a timer would
      // race Open Link / Copy Link while the menu is still open.
      clickedAnchor.href = selected.url
    }
    return selected
  }
  function activate(event: MouseEvent<HTMLAnchorElement>, service: ServiceConfig) {
    const selected = nativeTarget(event, service)
    if (!selected) return
    // Preserve the native anchor's immediate new-tab navigation. Animation is
    // only a synchronous per-fish signal and never waits before launching.
    const anchor = Array.from(overlayRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-service-id]') ?? []).find(candidate => candidate.dataset.serviceId === selected.id) ?? event.currentTarget
    if (selected.id !== service.id) anchor.focus({ preventScroll: true })
    controller.current?.activate(selected.id)
    anchor.classList.add('is-acknowledged')
    const timer = setTimeout(() => { anchor.classList.remove('is-acknowledged'); acknowledgments.current.delete(timer) }, 1000)
    acknowledgments.current.add(timer)
  }
  return (
    <section className={`aquarium-scene aquarium-three ${status === 'ready' ? 'is-rendered' : 'is-fallback'}${paused ? ' is-paused' : ''}`} aria-label="Aquarium with clickable service fish">
      <canvas ref={canvasRef} className="aquarium-canvas" aria-hidden="true" />
      <div ref={overlayRef} className="aquarium-link-layer">
        {services.map(service => {
          const species = getFishById(service.fishId)
          if (!species) return null
          return <a key={service.id} data-service-id={service.id} className="aquarium-fish-link" href={service.url} target="_blank" rel="noreferrer" aria-label={`Open ${service.name} in a new tab`} title={`${service.name} · ${species.commonName}`} onClick={event => activate(event, service)} onAuxClick={event => { if (event.button === 1) activate(event, service) }} onContextMenu={event => { nativeTarget(event, service) }}>
            <FishFigure fish={species} />
            <span className="fish-name"><span>{service.name}</span>{service.isExample && <small>example</small>}</span>
          </a>
        })}
      </div>
      {status === 'failed' && <p className="aquarium-load-notice" role="status">Aquarium visuals unavailable. Your service links and Settings still work.</p>}
    </section>
  )
}
