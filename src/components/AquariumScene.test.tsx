// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AquariumScene } from './AquariumScene'
import type { ServiceConfig } from '../lib/services'
import type { Window as HappyWindow } from 'happy-dom'
import { applyFishLinkVisibility } from '../rendering/scene/fish-link-focus'

const mock = vi.hoisted(() => ({
  update: vi.fn(), activate: vi.fn(), serviceAt: vi.fn<(x: number, y: number) => string | undefined>(), canActivate: vi.fn(() => true), dispose: vi.fn(),
}))
const focusHandoff = vi.hoisted(() => ({ get: undefined as (() => HTMLElement | null) | undefined, status: undefined as ((value: string) => void) | undefined }))
const frameRateHandoff = vi.hoisted(() => ({ onFrameRate: undefined as ((sample: { fps: number; frameTimeMs: number } | null) => void) | undefined }))
vi.mock('../rendering/scene/aquarium', () => ({ createAquarium: (_canvas: unknown, _overlay: unknown, _services: unknown, _paused: unknown, status: (value: string) => void, fallback: () => HTMLElement | null, _extensions: unknown, onFrameRate?: (sample: { fps: number; frameTimeMs: number } | null) => void) => { focusHandoff.get = fallback; focusHandoff.status = status; frameRateHandoff.onFrameRate = onFrameRate; status('ready'); return mock } }))
const services: ServiceConfig[] = [
  { id: 'clown', fishId: 'ocellaris-clownfish', name: 'Home', url: 'https://home.example.test', isExample: false },
  { id: 'tang', fishId: 'yellow-tang', name: 'Photos', url: 'https://photos.example.test', isExample: false },
]
let container: HTMLDivElement, root: Root, previousChildNavigation: boolean
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks(); mock.canActivate.mockReturnValue(true); mock.serviceAt.mockReturnValue(undefined)
  // Happy DOM has no layout hit testing; supply the browser's measured stack.
  Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: vi.fn(() => []) })
  const navigation = (window as unknown as HappyWindow).happyDOM.settings.navigation
  previousChildNavigation = navigation.disableChildPageNavigation
  navigation.disableChildPageNavigation = true
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root.render(<AquariumScene services={services} paused={false} />) })
  await vi.waitFor(() => expect(container.querySelector('.is-rendered')).not.toBeNull())
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); (window as unknown as HappyWindow).happyDOM.settings.navigation.disableChildPageNavigation = previousChildNavigation; delete (document as Partial<Document>).elementsFromPoint; vi.restoreAllMocks(); vi.unstubAllGlobals() })
function anchor(id: string) { return container.querySelector<HTMLAnchorElement>(`a[data-service-id="${id}"]`)! }
function visibleCaption(id: string, rect = new DOMRect(130, 190, 80, 24)) {
  const caption = anchor(id).querySelector<HTMLElement>('.fish-name')!
  caption.style.visibility = 'visible'; caption.style.display = 'inline-flex'; caption.style.opacity = '1'
  vi.spyOn(caption, 'getBoundingClientRect').mockReturnValue(rect)
  return caption
}
function pointerClick(target: Element, button = 0) {
  const event = new MouseEvent(button === 1 ? 'auxclick' : 'click', { bubbles: true, cancelable: true, detail: 1, button, clientX: 150, clientY: 200 })
  target.dispatchEvent(event); return event
}
describe('native fish links with geometry picking', () => {
  it('resolves the current real Services control for a renderer focus handoff', async () => {
    const getFallback = focusHandoff.get!
    expect(getFallback()).toBeNull()
    const servicesControl = document.createElement('button'); servicesControl.textContent = 'Services'; document.body.append(servicesControl)
    try {
      const ref = { current: servicesControl }
      await act(async () => { root.render(<AquariumScene services={services} paused focusFallbackRef={ref} />) })
      expect(getFallback()).toBe(servicesControl)
      anchor('clown').focus()
      applyFishLinkVisibility(anchor('clown'), false, getFallback())
      expect(document.activeElement).toBe(servicesControl)
      expect(anchor('clown').getAttribute('aria-hidden')).toBe('true')
    } finally { servicesControl.remove() }
  })
  it('keeps a retained focused label keyboard-activatable when no fallback can receive focus', async () => {
    anchor('clown').focus()
    mock.canActivate.mockImplementation(() => applyFishLinkVisibility(anchor('clown'), false, null))
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
    await act(async () => { anchor('clown').dispatchEvent(event) })
    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(anchor('clown'))
    expect(anchor('clown').getAttribute('aria-hidden')).toBe('false')
    expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
    expect(anchor('clown').href).toBe(services[0].url + '/')
    expect(anchor('clown').target).toBe('_blank')
  })
  it('retains the visible fish URL and native default action when DOM rectangles overlap', async () => {
    mock.serviceAt.mockReturnValue('tang')
    let event!: MouseEvent, hrefAtDefault = ''
    await act(async () => { event = pointerClick(anchor('clown')); hrefAtDefault = anchor('clown').href })
    expect(event.defaultPrevented).toBe(false)
    expect(hrefAtDefault).toBe(services[1].url + '/')
    expect(anchor('clown').target).toBe('_blank')
    expect(anchor('clown').rel).toBe('noreferrer')
    expect(mock.activate).toHaveBeenCalledExactlyOnceWith('tang')
    expect(document.activeElement).toBe(anchor('tang'))
    expect(anchor('tang').classList.contains('is-acknowledged')).toBe(true)
    expect(anchor('clown').href).toBe(services[1].url + '/')
  })
  it('blocks covered body points even though a transparent target rectangle is present', async () => {
    mock.serviceAt.mockReturnValue(undefined)
    let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown')) })
    expect(event.defaultPrevented).toBe(true); expect(mock.activate).not.toHaveBeenCalled()
    expect(anchor('clown').href).toBe(services[0].url + '/')
  })
  it.each(['click', 'auxclick', 'contextmenu'])('routes an intercepted caption %s to its native service before body picking', async type => {
    const caption = visibleCaption('tang')
    vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), caption.firstElementChild!, caption, anchor('tang')])
    mock.serviceAt.mockReturnValue(undefined)
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, detail: type === 'contextmenu' ? 0 : 1, button: type === 'auxclick' ? 1 : type === 'contextmenu' ? 2 : 0, clientX: 150, clientY: 200, ctrlKey: true })
    await act(async () => { anchor('clown').dispatchEvent(event) })
    expect(document.elementsFromPoint).toHaveBeenCalledExactlyOnceWith(150, 200)
    expect(mock.canActivate).toHaveBeenCalledExactlyOnceWith('tang')
    expect(mock.serviceAt).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false); expect(event.ctrlKey).toBe(true)
    expect(anchor('clown').href).toBe(services[1].url + '/')
    expect(anchor('clown').target).toBe('_blank'); expect(anchor('clown').rel).toBe('noreferrer')
    if (type === 'contextmenu') expect(mock.activate).not.toHaveBeenCalled()
    else expect(mock.activate).toHaveBeenCalledExactlyOnceWith('tang')
  })
  it('uses native caption paint order rather than service order when captions overlap', async () => {
    const first = visibleCaption('clown'), top = visibleCaption('tang')
    vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), top, first])
    mock.serviceAt.mockReturnValue('clown')
    await act(async () => { pointerClick(anchor('clown')) })
    expect(mock.activate).toHaveBeenCalledExactlyOnceWith('tang')
    expect(mock.serviceAt).not.toHaveBeenCalled()
  })
  it.each(['hidden', 'display-none', 'transparent', 'owner-transparent', 'occluded', 'aria-hidden', 'inert', 'hidden-attribute', 'outside-rect', 'empty-rect', 'nonfinite-rect'])('ignores a %s caption and preserves ordinary body picking', async state => {
    const caption = visibleCaption('tang', state === 'outside-rect' ? new DOMRect(300, 300, 80, 24)
      : state === 'empty-rect' ? new DOMRect(150, 200, 0, 0)
        : state === 'nonfinite-rect' ? new DOMRect(Number.NaN, 190, 80, 24) : undefined)
    if (state === 'hidden') caption.style.visibility = 'hidden'
    if (state === 'display-none') caption.style.display = 'none'
    if (state === 'transparent') caption.style.opacity = '0'
    if (state === 'owner-transparent') anchor('tang').style.opacity = '0'
    if (state === 'occluded') anchor('tang').dataset.occluded = 'true'
    if (state === 'aria-hidden') anchor('tang').setAttribute('aria-hidden', 'true')
    if (state === 'inert') anchor('tang').setAttribute('inert', '')
    if (state === 'hidden-attribute') anchor('tang').hidden = true
    vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), caption])
    mock.serviceAt.mockReturnValue('clown')
    let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown')) })
    expect(event.defaultPrevented).toBe(false)
    expect(mock.canActivate).not.toHaveBeenCalled()
    expect(mock.serviceAt).toHaveBeenCalledExactlyOnceWith(150, 200)
    expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
  })
  it('rejects a visible caption invalidated at activation instead of selecting the body below', async () => {
    const caption = visibleCaption('tang')
    vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), caption])
    mock.canActivate.mockReturnValue(false); mock.serviceAt.mockReturnValue('clown')
    let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown')) })
    expect(event.defaultPrevented).toBe(true)
    expect(mock.canActivate).toHaveBeenCalledExactlyOnceWith('tang')
    expect(mock.serviceAt).not.toHaveBeenCalled(); expect(mock.activate).not.toHaveBeenCalled()
    expect(anchor('clown').href).toBe(services[0].url + '/')
  })
  it('ignores foreign and no-longer-configured caption owners', async () => {
    const caption = visibleCaption('tang')
    const foreign = anchor('tang').cloneNode(true) as HTMLAnchorElement
    document.body.append(foreign)
    const stale = anchor('tang').cloneNode(true) as HTMLAnchorElement
    stale.dataset.serviceId = 'removed-service'; anchor('tang').parentElement!.append(stale)
    try {
      vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), foreign.querySelector('.fish-name')!, stale.querySelector('.fish-name')!, caption])
      await act(async () => { pointerClick(anchor('clown')) })
      expect(mock.canActivate).toHaveBeenCalledExactlyOnceWith('tang')
      expect(mock.activate).toHaveBeenCalledExactlyOnceWith('tang')
    } finally { foreign.remove(); stale.remove() }
  })
  it('preserves fallback pointer and keyboard links without consulting stale scene captions', async () => {
    const caption = visibleCaption('tang')
    vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), caption])
    mock.canActivate.mockReturnValue(false)
    await act(async () => { focusHandoff.status!('failed') })
    let pointer!: MouseEvent
    const keyboard = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
    await act(async () => { pointer = pointerClick(anchor('clown')); anchor('clown').dispatchEvent(keyboard) })
    expect(pointer.defaultPrevented).toBe(false); expect(keyboard.defaultPrevented).toBe(false)
    expect(anchor('clown').href).toBe(services[0].url + '/')
    expect(document.elementsFromPoint).not.toHaveBeenCalled()
    expect(mock.canActivate).not.toHaveBeenCalled(); expect(mock.serviceAt).not.toHaveBeenCalled()
  })
  it('rechecks label visibility at activation and keeps keyboard activation native', async () => {
    mock.canActivate.mockReturnValue(false)
    let covered!: MouseEvent
    await act(async () => { covered = pointerClick(anchor('clown').querySelector('.fish-name')!) })
    expect(covered.defaultPrevented).toBe(true); expect(mock.activate).not.toHaveBeenCalled()
    mock.canActivate.mockReturnValue(true)
    const keyboard = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
    await act(async () => { anchor('clown').dispatchEvent(keyboard) })
    expect(keyboard.defaultPrevented).toBe(false); expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
    expect(mock.serviceAt).not.toHaveBeenCalled()
    expect(document.elementsFromPoint).not.toHaveBeenCalled()
  })
  it('preserves middle-click native behavior and selects only its nearest visible fish', async () => {
    mock.serviceAt.mockReturnValue('tang'); let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown'), 1) })
    expect(event.defaultPrevented).toBe(false); expect(mock.activate).toHaveBeenCalledExactlyOnceWith('tang')
  })
  it('keeps a native context-menu URL stable after timers and resolves the next keyboard action afresh', async () => {
    vi.useFakeTimers()
    try {
      mock.serviceAt.mockReturnValue('tang')
      const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 150, clientY: 200 })
      await act(async () => { anchor('clown').dispatchEvent(context) })
      expect(context.defaultPrevented).toBe(false)
      expect(anchor('clown').href).toBe(services[1].url + '/')
      await act(async () => { vi.advanceTimersByTime(30_000) })
      expect(anchor('clown').href).toBe(services[1].url + '/')
      expect(mock.activate).not.toHaveBeenCalled()
      const keyboard = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
      await act(async () => { anchor('clown').dispatchEvent(keyboard) })
      expect(keyboard.defaultPrevented).toBe(false)
      expect(anchor('clown').href).toBe(services[0].url + '/')
      expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
    } finally { vi.useRealTimers() }
  })
  it('re-picks the target after a context menu instead of reusing its borrowed URL', async () => {
    mock.serviceAt.mockReturnValue('tang')
    await act(async () => { anchor('clown').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 150, clientY: 200 })) })
    mock.serviceAt.mockReturnValue('clown')
    let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown')) })
    expect(event.defaultPrevented).toBe(false)
    expect(anchor('clown').href).toBe(services[0].url + '/')
    expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
  })
  it('keeps an intercepted caption context URL stable and resolves the next keyboard action afresh', async () => {
    const caption = visibleCaption('tang')
    vi.mocked(document.elementsFromPoint).mockReturnValue([anchor('clown'), caption])
    vi.useFakeTimers()
    try {
      const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 150, clientY: 200 })
      await act(async () => { anchor('clown').dispatchEvent(context) })
      expect(context.defaultPrevented).toBe(false)
      expect(anchor('clown').href).toBe(services[1].url + '/')
      await act(async () => { vi.advanceTimersByTime(30_000) })
      expect(anchor('clown').href).toBe(services[1].url + '/')
      expect(mock.activate).not.toHaveBeenCalled()
      const keyboard = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
      await act(async () => { anchor('clown').dispatchEvent(keyboard) })
      expect(keyboard.defaultPrevented).toBe(false)
      expect(anchor('clown').href).toBe(services[0].url + '/')
      expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
      expect(document.elementsFromPoint).toHaveBeenCalledOnce()
    } finally { vi.useRealTimers() }
  })
  it('does not expose a native link context menu through foreground reef', async () => {
    mock.serviceAt.mockReturnValue(undefined)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, detail: 0, clientX: 150, clientY: 200 })
    await act(async () => { anchor('clown').dispatchEvent(event) })
    expect(event.defaultPrevented).toBe(true); expect(mock.activate).not.toHaveBeenCalled()
  })
})

describe('AQ-13 hover/focus affordances', () => {
  it('renders one aria-hidden tooltip per fish link with the same service name as its caption', () => {
    for (const service of services) {
      const link = anchor(service.id)
      const tooltip = link.querySelector<HTMLElement>('.fish-link-tooltip')
      expect(tooltip).not.toBeNull()
      expect(tooltip!.textContent).toBe(service.name)
      expect(tooltip!.getAttribute('aria-hidden')).toBe('true')
      expect(link.querySelector('.fish-name')!.textContent).toContain(service.name)
      // The tooltip is a visual duplicate, not a second accessible name.
      expect(link.getAttribute('aria-label')).toBe(`Open ${service.name} in a new tab`)
    }
  })
  it('leaves the tooltip untouched when a fish is occluded — suppression is CSS-only', () => {
    const link = anchor('clown')
    const tooltip = link.querySelector<HTMLElement>('.fish-link-tooltip')!
    applyFishLinkVisibility(link, false, null)
    expect(link.dataset.occluded).toBe('true')
    expect(link.getAttribute('aria-hidden')).toBe('true')
    expect(link.tabIndex).toBe(-1)
    expect(tooltip.textContent).toBe('Home')
    expect(tooltip.style.visibility).toBe('')
    expect(tooltip.style.display).toBe('')
  })
  it('keeps the native anchor contract with the tooltip present', () => {
    const link = anchor('tang')
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noreferrer')
    expect(link.href).toBe(services[1].url + '/')
    expect(link.querySelectorAll('.fish-link-tooltip')).toHaveLength(1)
  })
})

describe('debug FPS counter badge (AQ-83 AC #2/#3/#4)', () => {
  function badge() { return container.querySelector<HTMLElement>('.fps-counter-badge') }

  it('renders no badge when the counter is disabled', () => {
    expect(badge()).toBeNull()
  })

  it('renders no badge in server HTML even when the counter is enabled (hydration #418)', async () => {
    // SSR runs no effects, so `mounted` stays false and the badge is
    // absent — exactly what the first client render must produce, or React
    // hydration fails (badge present on the client, absent in SSR HTML).
    const { renderToString } = await import('react-dom/server')
    const html = renderToString(<AquariumScene services={services} paused={false} fpsCounterEnabled />)
    expect(html).not.toContain('fps-counter-badge')
  })

  it('renders a compact badge with a dash before the first sample', async () => {
    await act(async () => { root.render(<AquariumScene services={services} paused={false} fpsCounterEnabled />) })
    expect(badge()).not.toBeNull()
    expect(badge()!.textContent).toBe('—')
    expect(badge()!.getAttribute('aria-hidden')).toBe('true')
  })

  it('updates the badge text from renderer samples without a React re-render', async () => {
    await act(async () => { root.render(<AquariumScene services={services} paused={false} fpsCounterEnabled />) })
    const push = frameRateHandoff.onFrameRate!
    expect(push).toBeDefined()
    act(() => { push({ fps: 60, frameTimeMs: 16.7 }) })
    expect(badge()!.textContent).toBe('60 FPS · 16.7 ms')
    act(() => { push({ fps: 30, frameTimeMs: 33.3 }) })
    expect(badge()!.textContent).toBe('30 FPS · 33.3 ms')
  })

  it('shows Paused when sampling stops while paused', async () => {
    await act(async () => { root.render(<AquariumScene services={services} paused fpsCounterEnabled />) })
    act(() => { frameRateHandoff.onFrameRate!(null) })
    expect(badge()!.textContent).toBe('Paused')
  })

  it('shows Suspended when sampling stops while the tab is hidden', async () => {
    await act(async () => { root.render(<AquariumScene services={services} paused={false} fpsCounterEnabled />) })
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    try {
      act(() => { frameRateHandoff.onFrameRate!(null) })
      expect(badge()!.textContent).toBe('Suspended')
    } finally {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    }
  })

  it('does not interfere with fish-link activation while the badge is mounted', async () => {
    await act(async () => { root.render(<AquariumScene services={services} paused={false} fpsCounterEnabled />) })
    act(() => { frameRateHandoff.onFrameRate!({ fps: 60, frameTimeMs: 16.7 }) })
    mock.serviceAt.mockReturnValue('clown')
    const event = pointerClick(anchor('clown'))
    expect(event.defaultPrevented).toBe(false)
    expect(mock.activate).toHaveBeenCalledExactlyOnceWith('clown')
    expect(badge()!.textContent).toBe('60 FPS · 16.7 ms')
  })
})
