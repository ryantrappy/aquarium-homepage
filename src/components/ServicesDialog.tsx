import { useEffect, useRef } from 'react'
import type { ServiceConfig } from '../lib/services'
import { ServiceDock } from './ServiceDock'
import { CloseIcon } from './Icons'

type ServicesDialogProps = {
  services: ServiceConfig[]
  onClose: () => void
  onManage: () => void
}

export function ServicesDialog({ services, onClose, onManage }: ServicesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  return (
    <dialog ref={dialogRef} className="services-dialog" aria-labelledby="services-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <header className="services-dialog-header">
        <div><p>Find a shortcut</p><h2 id="services-title">On the reef</h2><span>{services.length} {services.length === 1 ? 'service' : 'services'}</span></div>
        <div className="services-dialog-actions">
          <button className="dialog-manage-button" type="button" onClick={onManage}>Manage</button>
          <button className="icon-button close-button" type="button" onClick={onClose} aria-label="Close services"><CloseIcon /></button>
        </div>
      </header>
      <ServiceDock services={services} />
    </dialog>
  )
}
