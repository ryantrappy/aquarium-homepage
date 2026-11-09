import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ZodError } from 'zod'
import { REEF_FISH, getFishById } from '../lib/fish'
import type { ServiceConfig, ServiceDraft } from '../lib/services'
import { CloseIcon } from './Icons'
import assetCreditsUrl from '../rendering/proof/ASSET_NOTICES.md?url'

type ServiceManagerProps = {
  services: ServiceConfig[]
  onClose: () => void
  onAdd: (draft: ServiceDraft) => Promise<void>
  onUpdate: (id: string, patch: Partial<ServiceDraft>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport: (json: string) => Promise<void>
  onExport: () => void
  loadError?: string
  onRetryLoad: () => Promise<void>
  onReset: () => Promise<void>
  fpsCounterEnabled: boolean
  onToggleFpsCounter: (enabled: boolean) => void
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

export function ServiceManager({ services, onClose, onAdd, onUpdate, onDelete, onImport, onExport, loadError, onRetryLoad, onReset, fpsCounterEnabled, onToggleFpsCounter }: ServiceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ServiceDraft>(blankDraft)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [busy, setBusy] = useState<'save' | 'delete' | 'import' | 'reset' | 'retry' | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const formErrorRef = useRef<HTMLParagraphElement>(null)
  const focusAfterSaveRef = useRef<(() => HTMLElement | null) | null>(null)
  const importTriggerRef = useRef<HTMLButtonElement>(null)
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    nameInput.current?.focus()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  useLayoutEffect(() => {
    if (busy !== null || !focusAfterSaveRef.current) return
    const target = focusAfterSaveRef.current
    focusAfterSaveRef.current = null
    const element = target()
    if (!element) return
    element.scrollIntoView({ block: 'nearest' })
    element.focus({ preventScroll: true })
  }, [busy])

  function scheduleFocus(target: () => HTMLElement | null) {
    window.requestAnimationFrame(() => {
      const element = target()
      if (!element) return
      element.scrollIntoView({ block: 'nearest' })
      element.focus({ preventScroll: true })
    })
  }
  function focusNameInput() { scheduleFocus(() => nameInput.current) }
  function focusFormError() { scheduleFocus(() => formErrorRef.current) }

  function resetForm() { setEditingId(null); setDraft(blankDraft); setFormError('') }
  function beginEdit(service: ServiceConfig) {
    setEditingId(service.id)
    setDraft({ name: service.name, url: service.url, fishId: service.fishId })
    setFormError('')
    focusNameInput()
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const wasEditing = Boolean(editingId)
    let succeeded = false
    setBusy('save')
    try {
      if (editingId) await onUpdate(editingId, draft)
      else await onAdd(draft)
      resetForm()
      succeeded = true
      setNotice(wasEditing ? 'Service updated.' : 'Service added.')
    } catch (error) {
      setFormError(readableError(error))
    } finally {
      focusAfterSaveRef.current = () => succeeded ? nameInput.current : formErrorRef.current
      setBusy(null)
    }
  }
  async function removeService(id: string) {
    setFormError('')
    let succeeded = false
    setBusy('delete')
    try {
      await onDelete(id)
      setConfirmDelete(null)
      succeeded = true
      setNotice('Service removed.')
    } catch (error) {
      setFormError(readableError(error))
    } finally {
      setBusy(null)
      scheduleFocus(() => succeeded ? nameInput.current : formErrorRef.current)
    }
  }
  async function importList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    let succeeded = false
    setBusy('import')
    try {
      await onImport(importText)
      setImportText('')
      setShowImport(false)
      succeeded = true
      setNotice('Service list imported.')
    } catch (error) {
      setFormError(readableError(error))
    } finally {
      setBusy(null)
      scheduleFocus(() => succeeded ? importTriggerRef.current : formErrorRef.current)
    }
  }
  async function retryLoad() {
    setFormError('')
    let succeeded = false
    setBusy('retry')
    try {
      await onRetryLoad()
      succeeded = true
    } catch (error) {
      setFormError(readableError(error))
    } finally {
      setBusy(null)
      scheduleFocus(() => succeeded ? nameInput.current : formErrorRef.current)
    }
  }
  async function restoreExamples() {
    setFormError('')
    let succeeded = false
    setBusy('reset')
    try {
      await onReset()
      succeeded = true
      setNotice('Example services restored.')
    } catch (error) {
      setFormError(readableError(error))
    } finally {
      setBusy(null)
      scheduleFocus(() => succeeded ? nameInput.current : formErrorRef.current)
    }
  }

  const formDisabled = Boolean(loadError) || busy !== null
  const selectedFish = getFishById(draft.fishId) ?? REEF_FISH[0]

  return (
    <dialog ref={dialogRef} className="service-manager-dialog" aria-labelledby="manager-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="service-manager" aria-labelledby="manager-title">
        <header className="manager-header">
          <div><p className="manager-kicker">Reef keeper</p><h2 id="manager-title">Your services</h2></div>
          <button className="icon-button close-button" onClick={onClose} type="button" aria-label="Close service settings"><CloseIcon /></button>
        </header>
        <p className="manager-intro">Choose a fish for every shortcut. Your list is shared across your devices.</p>
        {loadError && <div className="load-warning" role="alert"><div><strong>Shared settings need attention.</strong><span>{loadError}</span></div><div className="load-actions"><button type="button" onClick={() => { void retryLoad() }} disabled={busy !== null}>{busy === 'retry' ? 'Retrying…' : 'Retry loading'}</button><button type="button" onClick={() => { void restoreExamples() }} disabled={busy !== null}>{busy === 'reset' ? 'Restoring…' : 'Restore examples'}</button></div></div>}
        <div className="manager-list">
          {services.map((service) => {
            const fish = getFishById(service.fishId)
            return <article className="managed-service" key={service.id}>
              <span className={`managed-fish managed-${service.fishId}`}><img src={fish?.thumbnail} alt="" /></span>
              <div className="managed-details"><strong>{service.name}{service.isExample && <small>example</small>}</strong><span>{service.url}</span><em>{fish?.commonName}</em></div>
              <div className="row-actions"><button type="button" onClick={() => beginEdit(service)} disabled={formDisabled} aria-label={`Edit ${service.name}`}>Edit</button><button ref={(element) => { if (element) removeButtonRefs.current.set(service.id, element); else removeButtonRefs.current.delete(service.id) }} type="button" className="remove-action" onClick={() => setConfirmDelete(service.id)} disabled={formDisabled} aria-label={`Remove ${service.name}`}>Remove</button></div>
              {confirmDelete === service.id && <div className="delete-confirm"><span>Remove {service.name}?</span><button type="button" onClick={() => { void removeService(service.id) }} disabled={busy !== null}>{busy === 'delete' ? 'Removing…' : 'Remove'}</button><button type="button" onClick={() => { setConfirmDelete(null); scheduleFocus(() => removeButtonRefs.current.get(service.id) ?? null) }} disabled={busy !== null}>Keep</button></div>}
            </article>
          })}
          {!services.length && <p className="manager-empty">The reef is quiet. Add a service to give a fish somewhere to swim.</p>}
        </div>
        <form className="service-form" onSubmit={(event) => { void submit(event) }}>
          <h3>{editingId ? 'Edit service' : 'Add a service'}</h3>
          {notice && <p className="manager-notice" role="status" aria-live="polite">{notice}</p>}
          {formError && <p ref={formErrorRef} className="form-error" role="alert" aria-live="assertive" tabIndex={-1}>{formError}</p>}
          <label>Service name<input ref={nameInput} value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setFormError('') }} maxLength={80} placeholder="e.g. Home Assistant" required disabled={formDisabled} /></label>
          <label>Web address<input type="url" value={draft.url} onChange={(e) => { setDraft({ ...draft, url: e.target.value }); setFormError('') }} placeholder="http://trappserv.er:8123" required disabled={formDisabled} /></label>
          <fieldset className="fish-picker" disabled={formDisabled}>
            <legend>Choose a fish</legend>
            <div className="fish-picker-selected" aria-live="polite">
              <img
                src={selectedFish.thumbnail}
                alt=""
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.hidden = true
                }}
                onLoad={(event) => { event.currentTarget.hidden = false }}
              />
              <span><strong>{selectedFish.commonName}</strong><em>{selectedFish.scientificName}</em></span>
            </div>
            <div className="fish-picker-options">
              {REEF_FISH.map((fish) => <label className={`fish-picker-option${draft.fishId === fish.id ? ' is-selected' : ''}`} key={fish.id}>
                <input type="radio" name="service-fish" value={fish.id} checked={draft.fishId === fish.id} required onChange={() => { setDraft({ ...draft, fishId: fish.id }); setFormError('') }} />
                <img
                  src={fish.thumbnail}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => {
                    event.currentTarget.hidden = true
                  }}
                  onLoad={(event) => { event.currentTarget.hidden = false }}
                />
                <span><strong>{fish.commonName}</strong><em>{fish.scientificName}</em></span>
              </label>)}
            </div>
          </fieldset>
          <div className="form-actions"><button type="button" className="quiet-button" onClick={() => { resetForm(); focusNameInput() }} disabled={busy !== null}>{editingId ? 'Cancel edit' : 'Clear'}</button><button className="save-button" type="submit" disabled={formDisabled}>{busy === 'save' ? 'Saving…' : editingId ? 'Save changes' : 'Add to the reef'}</button></div>
        </form>
        <section className="debug-settings" aria-labelledby="debug-settings-title">
          <h3 id="debug-settings-title">Debug</h3>
          <label className="debug-setting">
            <input type="checkbox" checked={fpsCounterEnabled} onChange={(event) => onToggleFpsCounter(event.target.checked)} />
            <span>Show FPS and frame-time counter</span>
          </label>
          <p>Shows a small FPS and frame-time badge on the aquarium. Off by default; your choice is saved on this device.</p>
        </section>
        <footer className="manager-footer">
          <a className="text-action" href={assetCreditsUrl} target="_blank" rel="noreferrer">Asset credits</a>
          <button type="button" className="text-action" onClick={() => { try { onExport(); setNotice('Service list downloaded.') } catch (error) { setFormError(readableError(error)); focusFormError() } }} disabled={busy !== null}>Export list</button>
          <button ref={importTriggerRef} type="button" className="text-action" onClick={() => { setShowImport(!showImport); setFormError('') }} disabled={busy !== null}>{showImport ? 'Close import' : 'Import list'}</button>
        </footer>
        {showImport && <form className="import-form" onSubmit={(event) => { void importList(event) }}><label htmlFor="import-services">Paste a service list (JSON)</label><textarea id="import-services" value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} placeholder='[{"id":"home-assistant","name":"Home Assistant","url":"http://trappserv.er:8123","fishId":"yellow-tang","isExample":false}]' required disabled={busy !== null} /><button type="submit" className="save-button" disabled={busy !== null}>{busy === 'import' ? 'Importing…' : 'Import services'}</button></form>}
      </section>
    </dialog>
  )
}
