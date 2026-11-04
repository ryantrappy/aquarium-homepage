// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AquariumScene } from './AquariumScene'
import type { ServiceConfig } from '../lib/services'
import type { Window as HappyWindow } from 'happy-dom'

const mock = vi.hoisted(() => ({
  update: vi.fn(), activate: vi.fn(), serviceAt: vi.fn<(x: number, y: number) => string | undefined>(), canActivate: vi.fn(() => true), dispose: vi.fn(),
}))
vi.mock('../rendering/scene/aquarium', () => ({ createAquarium: (_canvas: unknown, _overlay: unknown, _services: unknown, _paused: unknown, status: (value: string) => void) => { status('ready'); return mock } }))
const services: ServiceConfig[] = [
  { id: 'clown', fishId: 'ocellaris-clownfish', name: 'Home', url: 'https://home.example.test', isExample: false },
  { id: 'tang', fishId: 'yellow-tang', name: 'Photos', url: 'https://photos.example.test', isExample: false },
]
let container: HTMLDivElement, root: Root, previousChildNavigation: boolean
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks(); mock.canActivate.mockReturnValue(true)
  const navigation = (window as unknown as HappyWindow).happyDOM.settings.navigation
  previousChildNavigation = navigation.disableChildPageNavigation
  navigation.disableChildPageNavigation = true
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root.render(<AquariumScene services={services} paused={false} />) })
  await vi.waitFor(() => expect(container.querySelector('.is-rendered')).not.toBeNull())
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); (window as unknown as HappyWindow).happyDOM.settings.navigation.disableChildPageNavigation = previousChildNavigation; vi.unstubAllGlobals() })
function anchor(id: string) { return container.querySelector<HTMLAnchorElement>(`a[data-service-id="${id}"]`)! }
function pointerClick(target: Element, button = 0) {
  const event = new MouseEvent(button === 1 ? 'auxclick' : 'click', { bubbles: true, cancelable: true, detail: 1, button, clientX: 150, clientY: 200 })
  target.dispatchEvent(event); return event
}
describe('native fish links with geometry picking', () => {
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
    await vi.waitFor(() => expect(anchor('clown').href).toBe(services[0].url + '/'))
  })
  it('blocks covered body points even though a transparent target rectangle is present', async () => {
    mock.serviceAt.mockReturnValue(undefined)
    let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown')) })
    expect(event.defaultPrevented).toBe(true); expect(mock.activate).not.toHaveBeenCalled()
    expect(anchor('clown').href).toBe(services[0].url + '/')
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
  })
  it('preserves middle-click native behavior and selects only its nearest visible fish', async () => {
    mock.serviceAt.mockReturnValue('tang'); let event!: MouseEvent
    await act(async () => { event = pointerClick(anchor('clown'), 1) })
    expect(event.defaultPrevented).toBe(false); expect(mock.activate).toHaveBeenCalledExactlyOnceWith('tang')
  })
  it('does not expose a native link context menu through foreground reef', async () => {
    mock.serviceAt.mockReturnValue(undefined)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, detail: 0, clientX: 150, clientY: 200 })
    await act(async () => { anchor('clown').dispatchEvent(event) })
    expect(event.defaultPrevented).toBe(true); expect(mock.activate).not.toHaveBeenCalled()
  })
})
