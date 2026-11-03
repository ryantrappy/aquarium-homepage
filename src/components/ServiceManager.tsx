import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ZodError } from 'zod'
import { REEF_FISH, getFishById } from '../lib/fish'
import type { ServiceConfig, ServiceDraft } from '../lib/services'
import { CloseIcon } from './Icons'

type ServiceManagerProps = {
  services: ServiceConfig[]
  onClose: () => void
  onAdd: (draft: ServiceDraft) => void
  onUpdate: (id: string, patch: Partial<ServiceDraft>) => void
  onDelete: (id: string) => void
  onImport: (json: string) => void
  onExport: () => void
  loadError?: string
  onReset: () => void
}

const blankDraft: ServiceDraft = { name: '', url: '', fishId: REEF_FISH[0].id }

function readableError(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    const field = issue?.path.at(-1)
    const row = typeof issue?.path[0] === 'number' ? `Service ${Number(issue.path[0]) + 1}: ` : ''
    const message = issue?.message
    if (message === 'Service IDs must be unique.') return `${row}Each service needs a unique id.`
    if (field === 'name') return `${row}Add a service name of 80 characters or fewer.`
    if (field === 'url') return `${row}Enter a complete http:// or https:// address without a username or password.`
    if (field === 'fishId') return `${row}Choose a fish from the catalog.`
    if (field === 'id') return `${row}Add an id to every imported service.`
    return 'Use a list of service objects with a name, web address, fish, and id.'
  }
  if (error instanceof SyntaxError) return 'Paste a valid JSON service list.'
  return error instanceof Error ? error.message : 'The service list could not be saved.'
}

export function ServiceManager({ services, onClose, onAdd, onUpdate, onDelete, onImport, onExport, loadError, onReset }: ServiceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ServiceDraft>(blankDraft)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])
  useEffect(() => { nameInput.current?.focus() }, [editingId])

  function resetForm() { setEditingId(null); setDraft(blankDraft); setFormError('') }
  function beginEdit(service: ServiceConfig) {
    setEditingId(service.id)
    setDraft({ name: service.name, url: service.url, fishId: service.fishId })
    setFormError('')
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      if (editingId) onUpdate(editingId, draft)
      else onAdd(draft)
      resetForm()
      setNotice(editingId ? 'Service updated.' : 'Service added.')
    } catch (error) {
      setFormError(readableError(error))
    }
  }
  function removeService(id: string) {
    try { onDelete(id); setConfirmDelete(null); setNotice('Service removed.') }
    catch (error) { setFormError(readableError(error)) }
  }
  function importList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try { onImport(importText); setImportText(''); setShowImport(false); setNotice('Service list imported.') }
    catch (error) { setFormError(readableError(error)) }
  }

  return (
    <dialog ref={dialogRef} className="service-manager-dialog" aria-labelledby="manager-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="service-manager" aria-labelledby="manager-title">
        <header className="manager-header">
          <div><p className="manager-kicker">Reef keeper</p><h2 id="manager-title">Your services</h2></div>
          <button className="icon-button close-button" onClick={onClose} type="button" aria-label="Close service settings"><CloseIcon /></button>
        </header>
        <p className="manager-intro">Choose a fish for every shortcut. Your list lives in this browser.</p>
        {loadError && <div className="load-warning" role="alert"><div><strong>Saved settings need attention.</strong><span>{loadError}</span></div><button type="button" onClick={() => { try { onReset(); setNotice('Example services restored.') } catch (error) { setFormError(readableError(error)) } }}>Restore examples</button></div>}
        {notice && <p className="manager-notice" role="status">{notice}</p>}
        <div className="manager-list">
          {services.map((service) => {
            const fish = getFishById(service.fishId)
            return <article className="managed-service" key={service.id}>
              <span className={`managed-fish managed-${service.fishId}`}><img src={`/fish/${service.fishId}.webp`} alt="" /></span>
              <div className="managed-details"><strong>{service.name}{service.isExample && <small>example</small>}</strong><span>{service.url}</span><em>{fish?.commonName}</em></div>
              <div className="row-actions"><button type="button" onClick={() => beginEdit(service)} disabled={Boolean(loadError)}>Edit</button><button type="button" className="remove-action" onClick={() => setConfirmDelete(service.id)} disabled={Boolean(loadError)}>Remove</button></div>
              {confirmDelete === service.id && <div className="delete-confirm"><span>Remove {service.name}?</span><button type="button" onClick={() => removeService(service.id)}>Remove</button><button type="button" onClick={() => setConfirmDelete(null)}>Keep</button></div>}
            </article>
          })}
          {!services.length && <p className="manager-empty">The reef is quiet. Add a service to give a fish somewhere to swim.</p>}
        </div>
        <form className="service-form" onSubmit={submit}>
          <h3>{editingId ? 'Edit service' : 'Add a service'}</h3>
          <label>Service name<input ref={nameInput} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} placeholder="e.g. Home Assistant" required disabled={Boolean(loadError)} /></label>
          <label>Web address<input type="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="http://trappserv.er:8123" required disabled={Boolean(loadError)} /></label>
          <label>Fish<select value={draft.fishId} onChange={(e) => setDraft({ ...draft, fishId: e.target.value })} disabled={Boolean(loadError)}>{REEF_FISH.map((fish) => <option value={fish.id} key={fish.id}>{fish.commonName}</option>)}</select></label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="form-actions"><button type="button" className="quiet-button" onClick={resetForm}>{editingId ? 'Cancel edit' : 'Clear'}</button><button className="save-button" type="submit" disabled={Boolean(loadError)}>{editingId ? 'Save changes' : 'Add to the reef'}</button></div>
        </form>
        <footer className="manager-footer">
          <button type="button" className="text-action" onClick={() => { try { onExport(); setNotice('Service list downloaded.') } catch (error) { setFormError(readableError(error)) } }}>Export list</button>
          <button type="button" className="text-action" onClick={() => { setShowImport(!showImport); setFormError('') }}>{showImport ? 'Close import' : 'Import list'}</button>
        </footer>
        {showImport && <form className="import-form" onSubmit={importList}><label htmlFor="import-services">Paste a service list (JSON)</label><textarea id="import-services" value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} placeholder='[{"id":"home-assistant","name":"Home Assistant","url":"http://trappserv.er:8123","fishId":"yellow-tang","isExample":false}]' required /><button type="submit" className="save-button">Import services</button></form>}
      </section>
    </dialog>
  )
}
