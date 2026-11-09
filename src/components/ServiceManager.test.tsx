// @vitest-environment happy-dom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REEF_FISH } from '../lib/fish'
import type { ServiceConfig, ServiceDraft } from '../lib/services'
import { ServiceManager } from './ServiceManager'

const existingService: ServiceConfig = {
  id: 'existing-home-assistant',
  name: 'Home Assistant',
  url: 'https://home.example.test',
  fishId: 'blue-tang',
  isExample: false,
}

function props(overrides: Partial<ComponentProps<typeof ServiceManager>> = {}) {
  return {
    services: [],
    onClose: vi.fn(),
    onAdd: vi.fn<(draft: ServiceDraft) => Promise<void>>().mockResolvedValue(undefined),
    onUpdate: vi.fn<(id: string, patch: Partial<ServiceDraft>) => Promise<void>>().mockResolvedValue(undefined),
    onDelete: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
    onImport: vi.fn<(json: string) => Promise<void>>().mockResolvedValue(undefined),
    onExport: vi.fn(),
    onRetryLoad: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onReset: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    fpsCounterEnabled: false,
    onToggleFpsCounter: vi.fn<(enabled: boolean) => void>(),
    ...overrides,
  }
}

let root: Root | undefined
let container: HTMLDivElement | undefined

async function renderManager(managerProps: ComponentProps<typeof ServiceManager>) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<ServiceManager {...managerProps} />) })
  return container
}

async function unmountManager() {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = undefined
  container = undefined
}

function changeTextInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

async function submitForm(form: HTMLFormElement) {
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(async () => {
  await unmountManager()
  vi.unstubAllGlobals()
})

describe('ServiceManager fish picker', () => {
  it('updates the selected preview and radio assignment when another species is chosen', async () => {
    const view = await renderManager(props())
    const radio = view.querySelector<HTMLInputElement>('input[type="radio"][value="flame-angelfish"]')!

    await act(async () => { radio.click() })

    expect(radio.checked).toBe(true)
    expect(view.querySelector('.fish-picker-selected strong')?.textContent).toBe('Flame angelfish')
    expect(view.querySelector('.fish-picker-selected em')?.textContent).toBe('Centropyge loricula')
    expect(view.querySelector<HTMLImageElement>('.fish-picker-selected img')?.getAttribute('src')).toBe('/fish/flame-angelfish.webp')
    expect(radio.closest('label')?.textContent).toContain('Flame angelfish')
    expect(radio.closest('label')?.textContent).toContain('Centropyge loricula')
  })

  it('restores the existing service assignment when editing', async () => {
    const view = await renderManager(props({ services: [existingService] }))

    await act(async () => { view.querySelector<HTMLButtonElement>('button[aria-label="Edit Home Assistant"]')!.click() })
    expect(view.querySelector('h3')?.textContent).toBe('Edit service')
    expect(view.querySelector<HTMLInputElement>('input[type="radio"][value="blue-tang"]')?.checked).toBe(true)
    expect(view.querySelector('.fish-picker-selected strong')?.textContent).toBe('Blue tang')
    expect(view.querySelector<HTMLImageElement>('.fish-picker-selected img')?.getAttribute('src')).toBe('/fish/blue-tang.webp')
  })

  it('keeps the chosen species name when its thumbnail fails instead of showing another fish', async () => {
    const view = await renderManager(props())
    const firefish = view.querySelector<HTMLInputElement>('input[type="radio"][value="firefish"]')!
    await act(async () => { firefish.click() })

    const preview = view.querySelector<HTMLImageElement>('.fish-picker-selected img')!
    await act(async () => { preview.dispatchEvent(new Event('error')) })

    expect(preview.hidden).toBe(true)
    expect(preview.getAttribute('src')).toBe('/fish/firefish.webp')
    expect(view.querySelector('.fish-picker-selected strong')?.textContent).toBe('Firefish')
    expect(view.querySelector<HTMLInputElement>('input[type="radio"][value="firefish"]')?.checked).toBe(true)
  })
})

describe('ServiceManager async persistence', () => {
  it('keeps the selected fish and draft fields and reports a rejected save without a success notice', async () => {
    const onAdd = vi.fn<(draft: ServiceDraft) => Promise<void>>().mockRejectedValue(new Error('Shared settings could not be saved.'))
    const view = await renderManager(props({ onAdd }))
    const name = view.querySelector<HTMLInputElement>('input[placeholder="e.g. Home Assistant"]')!
    const url = view.querySelector<HTMLInputElement>('input[type="url"]')!

    await act(async () => {
      changeTextInput(name, 'Dashboard')
      changeTextInput(url, 'https://dashboard.example.test')
      view.querySelector<HTMLInputElement>('input[type="radio"][value="six-line-wrasse"]')!.click()
    })
    await submitForm(view.querySelector('form.service-form')!)

    expect(onAdd).toHaveBeenCalledWith({ name: 'Dashboard', url: 'https://dashboard.example.test', fishId: 'six-line-wrasse' })
    expect(name.value).toBe('Dashboard')
    expect(url.value).toBe('https://dashboard.example.test')
    expect(view.querySelector<HTMLInputElement>('input[type="radio"][value="six-line-wrasse"]')?.checked).toBe(true)
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('Shared settings could not be saved.')
    expect(view.querySelector('[role="status"]')).toBeNull()
  })

  it('retains the draft while saving and clears it only after persistence resolves', async () => {
    let resolveSave!: () => void
    const onAdd = vi.fn<(draft: ServiceDraft) => Promise<void>>(() => new Promise<void>((resolve) => { resolveSave = resolve }))
    const view = await renderManager(props({ onAdd }))
    const name = view.querySelector<HTMLInputElement>('input[placeholder="e.g. Home Assistant"]')!
    const url = view.querySelector<HTMLInputElement>('input[type="url"]')!

    await act(async () => {
      changeTextInput(name, 'Media')
      changeTextInput(url, 'https://media.example.test')
      view.querySelector<HTMLInputElement>('input[type="radio"][value="copperband-butterflyfish"]')!.click()
    })
    await submitForm(view.querySelector('form.service-form')!)

    expect(onAdd).toHaveBeenCalledWith({ name: 'Media', url: 'https://media.example.test', fishId: 'copperband-butterflyfish' })
    expect(name.value).toBe('Media')
    expect(url.value).toBe('https://media.example.test')
    expect(view.querySelector('.save-button')?.textContent).toBe('Saving…')
    expect(view.querySelector<HTMLInputElement>('input[type="radio"][value="copperband-butterflyfish"]')?.checked).toBe(true)
    expect(view.querySelector('[role="status"]')).toBeNull()

    await act(async () => { resolveSave() })

    expect(name.value).toBe('')
    expect(url.value).toBe('')
    expect(view.querySelector<HTMLInputElement>(`input[type="radio"][value="${REEF_FISH[0].id}"]`)?.checked).toBe(true)
    expect(view.querySelector('[role="status"]')?.textContent).toBe('Service added.')
  })
})

describe('ServiceManager FPS counter toggle (AQ-83 AC #1)', () => {
  function fpsToggle(view: HTMLDivElement) {
    return view.querySelector<HTMLInputElement>('input[type="checkbox"]')
  }

  it('shows the toggle unchecked by default', async () => {
    const view = await renderManager(props())
    const toggle = fpsToggle(view)
    expect(toggle).not.toBeNull()
    expect(toggle!.checked).toBe(false)
    expect(toggle!.closest('label')?.textContent).toContain('Show FPS and frame-time counter')
  })

  it('reflects an enabled counter from props', async () => {
    const view = await renderManager(props({ fpsCounterEnabled: true }))
    expect(fpsToggle(view)!.checked).toBe(true)
  })

  it('reports enabling the counter through the toggle callback', async () => {
    const onToggleFpsCounter = vi.fn<(enabled: boolean) => void>()
    const view = await renderManager(props({ onToggleFpsCounter }))
    await act(async () => { fpsToggle(view)!.click() })
    expect(onToggleFpsCounter).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('reports disabling the counter through the toggle callback', async () => {
    const onToggleFpsCounter = vi.fn<(enabled: boolean) => void>()
    const view = await renderManager(props({ fpsCounterEnabled: true, onToggleFpsCounter }))
    await act(async () => { fpsToggle(view)!.click() })
    expect(onToggleFpsCounter).toHaveBeenCalledExactlyOnceWith(false)
  })
})
