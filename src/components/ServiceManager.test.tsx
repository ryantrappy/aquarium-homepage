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
const morayService: ServiceConfig = {
  id: 'existing-moray-service',
  name: 'Reef monitor',
  url: 'https://reef.example.test',
  fishId: 'snowflake-moray-eel',
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
    expect(view.querySelector<HTMLInputElement>('input[type="url"]')?.value).toBe('https://home.example.test')
  })

  it('keeps one moray assignment, restores it while editing, and exposes the service link in the modal', async () => {
    const view = await renderManager(props({ services: [morayService] }))
    const radio = view.querySelector<HTMLInputElement>('input[type="radio"][value="snowflake-moray-eel"]')!
    const managedLink = view.querySelector<HTMLAnchorElement>('.managed-open')!

    expect(radio.disabled).toBe(true)
    expect(radio.closest('label')?.textContent).toContain('Already assigned to another service')
    expect(managedLink.getAttribute('href')).toBe(morayService.url)
    expect(managedLink.target).toBe('_blank')

    await act(async () => { view.querySelector<HTMLButtonElement>('button[aria-label="Edit Reef monitor"]')!.click() })

    expect(radio.disabled).toBe(false)
    expect(radio.checked).toBe(true)
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

  it('exposes all four reef clean-up-crew invertebrate species as selectable service options', async () => {
    const view = await renderManager(props())
    for (const [id, commonName] of [
      ['banded-trochus-snail', 'Banded trochus snail'],
      ['scarlet-reef-hermit-crab', 'Scarlet reef hermit crab'],
      ['emerald-mithrax-crab', 'Emerald mithrax crab'],
      ['scarlet-skunk-cleaner-shrimp', 'Scarlet skunk cleaner shrimp'],
    ] as const) {
      const radio = view.querySelector<HTMLInputElement>(`input[type="radio"][value="${id}"]`)
      expect(radio, id).toBeTruthy()
      await act(async () => { radio!.click() })
      expect(radio!.checked, id).toBe(true)
      expect(view.querySelector('.fish-picker-selected strong')?.textContent).toBe(commonName)
    }
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

    expect(url.value).toBe('https://')

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
    expect(url.value).toBe('https://')
    expect(view.querySelector<HTMLInputElement>(`input[type="radio"][value="${REEF_FISH[0].id}"]`)?.checked).toBe(true)
    expect(view.querySelector('[role="status"]')?.textContent).toBe('Service added.')
  })

  it('preserves an existing service URL when editing and resets to https:// after a successful add', async () => {
    const onUpdate = vi.fn<(id: string, patch: Partial<ServiceDraft>) => Promise<void>>().mockResolvedValue(undefined)
    const onAdd = vi.fn<(draft: ServiceDraft) => Promise<void>>().mockResolvedValue(undefined)
    const view = await renderManager(props({ services: [existingService], onUpdate, onAdd }))

    await act(async () => { view.querySelector<HTMLButtonElement>('button[aria-label="Edit Home Assistant"]')!.click() })
    const name = view.querySelector<HTMLInputElement>('input[placeholder="e.g. Home Assistant"]')!
    const url = view.querySelector<HTMLInputElement>('input[type="url"]')!
    expect(url.value).toBe(existingService.url)
    await act(async () => { changeTextInput(name, 'Renamed dashboard') })
    await submitForm(view.querySelector('form.service-form')!)

    expect(onUpdate).toHaveBeenCalledWith(existingService.id, {
      name: 'Renamed dashboard', url: existingService.url, fishId: existingService.fishId,
    })
    expect(url.value).toBe('https://')

    await act(async () => {
      changeTextInput(name, 'Docs')
      changeTextInput(url, 'https://www.wikipedia.org')
    })
    await submitForm(view.querySelector('form.service-form')!)
    expect(onAdd).toHaveBeenCalledWith({ name: 'Docs', url: 'https://www.wikipedia.org', fishId: REEF_FISH[0].id })
    expect(url.value).toBe('https://')
  })

  it('allows adding a display fish with no URL (either blank or untouched https://) and shows a no-link badge in the list', async () => {
    const onAdd = vi.fn<(draft: ServiceDraft) => Promise<void>>().mockResolvedValue(undefined)
    const unlinkedFish: ServiceConfig = {
      id: 'display-sailfin',
      name: 'Sailfin',
      url: '',
      fishId: 'desjardins-sailfin-tang',
      isExample: false,
    }
    const view = await renderManager(props({ services: [unlinkedFish], onAdd }))
    expect(view.querySelector('.managed-service.is-unlinked .no-link-badge')?.textContent).toBe('no link')
    expect(view.querySelector('.managed-service.is-unlinked')?.textContent).toContain('No link · Display fish')
    expect(view.querySelector('a.managed-open')).toBeNull()

    const name = view.querySelector<HTMLInputElement>('input[placeholder="e.g. Home Assistant"]')!
    // Leaving the prefilled 'https://' untouched normalizes to '' (no link)
    await act(async () => {
      changeTextInput(name, 'Reef Cruiser')
      view.querySelector<HTMLInputElement>('input[type="radio"][value="desjardins-sailfin-tang"]')!.click()
    })
    await submitForm(view.querySelector('form.service-form')!)
    expect(onAdd).toHaveBeenCalledWith({
      name: 'Reef Cruiser',
      url: '',
      fishId: 'desjardins-sailfin-tang',
    })
  })

  it('supports the display-only fish checkbox with optional name and hides the URL input', async () => {
    const onAdd = vi.fn<(draft: ServiceDraft) => Promise<void>>().mockResolvedValue(undefined)
    const view = await renderManager(props({ onAdd }))
    const toggle = view.querySelector<HTMLInputElement>('.display-only-toggle input[type="checkbox"]')!
    expect(toggle.checked).toBe(false)
    expect(view.querySelector('input[type="url"]')).not.toBeNull()

    await act(async () => { toggle.click() })
    expect(toggle.checked).toBe(true)
    expect(view.querySelector('input[type="url"]')).toBeNull()

    const nameInput = view.querySelector<HTMLInputElement>('form.service-form input:not([type="checkbox"]):not([type="radio"])')!
    expect(nameInput.required).toBe(false)

    await act(async () => {
      view.querySelector<HTMLInputElement>('input[type="radio"][value="desjardins-sailfin-tang"]')!.click()
    })
    await submitForm(view.querySelector('form.service-form')!)
    expect(onAdd).toHaveBeenCalledWith({
      name: 'Desjardins’ sailfin tang',
      url: '',
      fishId: 'desjardins-sailfin-tang',
    })
    expect(toggle.checked).toBe(false)

    await act(async () => { toggle.click() })
    const customNameInput = view.querySelector<HTMLInputElement>('form.service-form input:not([type="checkbox"]):not([type="radio"])')!
    await act(async () => {
      changeTextInput(customNameInput, 'Tank Mascot')
      view.querySelector<HTMLInputElement>('input[type="radio"][value="flame-angelfish"]')!.click()
    })
    await submitForm(view.querySelector('form.service-form')!)
    expect(onAdd).toHaveBeenCalledWith({
      name: 'Tank Mascot',
      url: '',
      fishId: 'flame-angelfish',
    })
  })
})

describe('ServiceManager FPS counter toggle (AQ-83 AC #1)', () => {
  function fpsToggle(view: HTMLDivElement) {
    return view.querySelector<HTMLInputElement>('.debug-setting input[type="checkbox"]')
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

describe('ServiceManager aquarium thermometer configuration (AQ-15 AC #1/#2/#4/#5)', () => {
  function placementRadio(view: HTMLDivElement, value: 'front' | 'side' | 'hidden') {
    return view.querySelector<HTMLInputElement>(
      `input[type="radio"][name="thermometer-placement"][value="${value}"]`,
    )
  }

  function sensorSelect(view: HTMLDivElement) {
    return view.querySelector<HTMLSelectElement>('#thermometer-sensor-select')
  }

  it('exposes front glass, side glass, and hidden placement radios with explicit labels', async () => {
    const onChangeThermometerPlacement = vi.fn()
    const view = await renderManager(
      props({ thermometerPlacement: 'front', onChangeThermometerPlacement }),
    )

    expect(view.querySelector('[role="status"]')).toBeNull()
    expect(placementRadio(view, 'front')?.checked).toBe(true)
    expect(placementRadio(view, 'side')?.checked).toBe(false)
    expect(placementRadio(view, 'hidden')?.checked).toBe(false)

    const sideRadio = placementRadio(view, 'side')!
    const sideLabel = view.querySelector<HTMLLabelElement>(`label[for="${sideRadio.id}"]`)
    expect(sideLabel?.textContent).toContain('Side glass')

    await act(async () => { sideRadio.click() })
    expect(onChangeThermometerPlacement).toHaveBeenCalledWith('side')

    const hiddenRadio = placementRadio(view, 'hidden')!
    await act(async () => { hiddenRadio.click() })
    expect(onChangeThermometerPlacement).toHaveBeenCalledWith('hidden')
  })

  it('allows selecting among discovered CPU temperature sensors and includes unavailable fallback', async () => {
    const onChangeThermometerSensorId = vi.fn()
    const view = await renderManager(
      props({
        thermometerSensorId: 'k10temp.0:tctl',
        thermometerSensors: [
          { id: 'coretemp.0:package-id-0', chip: 'coretemp', label: 'Package id 0', unit: '°C' },
        ],
        thermometerReading: {
          status: 'unavailable',
          sensorId: 'k10temp.0:tctl',
          unit: '°C',
          message: 'No Linux hwmon CPU temperature sensor was found.',
        },
        onChangeThermometerSensorId,
      }),
    )

    const select = sensorSelect(view)!
    expect(view.querySelector(`label[for="${select.id}"]`)?.textContent).toContain('CPU temperature sensor')
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'k10temp.0:tctl',
      'coretemp.0:package-id-0',
    ])
    expect(select.value).toBe('k10temp.0:tctl')
    expect(view.querySelector('.thermometer-status-summary')?.textContent).toContain('--.-°C')

    await act(async () => {
      select.value = 'coretemp.0:package-id-0'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChangeThermometerSensorId).toHaveBeenCalledWith('coretemp.0:package-id-0')
  })
})
