import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AquariumScene } from '../components/AquariumScene'
import { PauseIcon, ServicesIcon, SettingsIcon } from '../components/Icons'
import { ServicesDialog } from '../components/ServicesDialog'
import { ServiceManager } from '../components/ServiceManager'
import { exportServices } from '../lib/services'
import { readFpsCounterEnabled, writeFpsCounterEnabled } from '../lib/debug-settings'
import { useServices } from '../lib/useServices'

export const Route = createFileRoute('/')({ component: ReefHome })

function ReefHome() {
  const { services, loadError, retryLoad, addService, updateService, deleteService, importServices, resetServices } = useServices()
  const [managerOpen, setManagerOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  // Debug FPS counter (AQ-83 AC #1): opt-in, default off, persisted locally.
  const [fpsCounterEnabled, setFpsCounterEnabled] = useState(() => readFpsCounterEnabled())
  const [reducedBySystem, setReducedBySystem] = useState(false)
  const servicesTrigger = useRef<HTMLButtonElement | null>(null)
  const managerTrigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedBySystem(preference.matches)
    sync()
    preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])

  function downloadServices() {
    const blob = new Blob([exportServices(services)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'reef-control-services.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function openServices(event: MouseEvent<HTMLButtonElement>) {
    servicesTrigger.current = event.currentTarget
    setServicesOpen(true)
  }

  function closeServices(restoreFocus = true) {
    setServicesOpen(false)
    if (restoreFocus) window.requestAnimationFrame(() => servicesTrigger.current?.focus())
  }

  function openManager(event: MouseEvent<HTMLButtonElement>) {
    managerTrigger.current = event.currentTarget
    setManagerOpen(true)
  }

  function manageFromServices() {
    managerTrigger.current = servicesTrigger.current
    closeServices(false)
    window.requestAnimationFrame(() => setManagerOpen(true))
  }

  function closeManager() {
    setManagerOpen(false)
    window.requestAnimationFrame(() => managerTrigger.current?.focus())
  }

  const motionStopped = paused || reducedBySystem

  function toggleFpsCounter(enabled: boolean) {
    setFpsCounterEnabled(enabled)
    writeFpsCounterEnabled(enabled)
  }

  return (
    <main className="page-shell">
      <AquariumScene services={services} paused={motionStopped} focusFallbackRef={servicesTrigger} fpsCounterEnabled={fpsCounterEnabled} />
      <div className="aquarium-controls" role="group" aria-label="Aquarium controls">
        <button ref={servicesTrigger} className="scene-control services-control" type="button" onClick={openServices} aria-haspopup="dialog" aria-expanded={servicesOpen} title="Open service shortcuts"><ServicesIcon /><span>Services</span></button>
        <button className="scene-control icon-control" type="button" onClick={() => setPaused(!paused)} aria-pressed={motionStopped} disabled={reducedBySystem} aria-label={reducedBySystem ? 'Reduced motion enabled by system' : paused ? 'Resume fish movement' : 'Pause fish movement'} title={reducedBySystem ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion'}><PauseIcon paused={paused && !reducedBySystem} /></button>
        <button className="scene-control icon-control" type="button" onClick={openManager} aria-label="Service settings" aria-haspopup="dialog" title="Manage services"><SettingsIcon /></button>
      </div>
      {servicesOpen && <ServicesDialog services={services} onClose={() => closeServices()} onManage={manageFromServices} />}
      {managerOpen && <ServiceManager
        services={services}
        onClose={closeManager}
        onAdd={addService}
        onUpdate={updateService}
        onDelete={deleteService}
        onImport={importServices}
        onExport={downloadServices}
        loadError={loadError}
        onRetryLoad={retryLoad}
        onReset={resetServices}
        fpsCounterEnabled={fpsCounterEnabled}
        onToggleFpsCounter={toggleFpsCounter}
      />}
    </main>
  )
}
