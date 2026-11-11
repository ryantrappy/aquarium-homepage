// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyFishLinkVisibility, isLabelSampleExposed, type LabelSampleHit } from './fish-link-focus'

function fixture() {
  const anchor = document.createElement('a')
  anchor.href = 'https://service.example.test'; anchor.target = '_blank'; anchor.rel = 'noreferrer'
  const label = document.createElement('span'); label.className = 'fish-name'; label.textContent = 'Photos'; anchor.append(label)
  const services = document.createElement('button'); services.textContent = 'Services'
  document.body.append(anchor, services)
  return { anchor, label, services }
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

describe('focused fish exposure', () => {
  it('focuses Services before the aria-hidden mutation, then hides the label without changing the native URL', () => {
    const { anchor, label, services } = fixture(); anchor.focus()
    expect(document.activeElement).toBe(anchor)
    const original = anchor.setAttribute.bind(anchor)
    let observed = false
    vi.spyOn(anchor, 'setAttribute').mockImplementation((name, value) => {
      if (name === 'aria-hidden' && value === 'true') {
        observed = true
        // Observed inside the mutation, not later in a MutationObserver.
        expect(document.activeElement).toBe(services)
      }
      original(name, value)
    })
    applyFishLinkVisibility(anchor, false, services)
    expect(observed).toBe(true)
    expect(anchor.getAttribute('aria-hidden')).toBe('true')
    expect(anchor.tabIndex).toBe(-1); expect(label.style.visibility).toBe('hidden')
    expect(anchor.href).toBe('https://service.example.test/'); expect(anchor.target).toBe('_blank'); expect(anchor.rel).toBe('noreferrer')
  })
  it('also moves focus from a focused descendant before hiding its ancestor link', () => {
    const { anchor, label, services } = fixture(); label.tabIndex = 0; label.focus()
    expect(document.activeElement).toBe(label)
    applyFishLinkVisibility(anchor, false, services)
    expect(document.activeElement).toBe(services); expect(anchor.getAttribute('aria-hidden')).toBe('true')
  })
  it('retains focus when the fish remains visible', () => {
    const { anchor, label, services } = fixture(); anchor.focus()
    applyFishLinkVisibility(anchor, true, services)
    expect(document.activeElement).toBe(anchor); expect(anchor.tabIndex).toBe(0)
    expect(anchor.getAttribute('aria-hidden')).toBe('false'); expect(label.style.visibility).toBe('visible')
  })
  it('does not steal unrelated dialog/control focus or reclaim it when a fish becomes visible again', () => {
    const { anchor, services } = fixture()
    const dialog = document.createElement('dialog'), control = document.createElement('button')
    dialog.open = true; dialog.append(control); document.body.append(dialog); control.focus()
    applyFishLinkVisibility(anchor, false, services)
    expect(document.activeElement).toBe(control); expect(anchor.getAttribute('aria-hidden')).toBe('true')
    applyFishLinkVisibility(anchor, true, services)
    expect(document.activeElement).toBe(control)
  })
  it('preserves the focused target if the fallback is absent, disabled, detached, hidden or inert', () => {
    const { anchor, label, services } = fixture()
    const disabled = document.createElement('button'); disabled.disabled = true
    const detached = document.createElement('button')
    const hidden = document.createElement('button'); hidden.hidden = true
    const inert = document.createElement('div'); inert.setAttribute('inert', ''); inert.append(services)
    document.body.append(disabled, hidden, inert)
    for (const fallback of [null, disabled, detached, hidden, services]) {
      anchor.focus()
      expect(applyFishLinkVisibility(anchor, false, fallback)).toBe(true)
      expect(document.activeElement).toBe(anchor)
      expect(anchor.getAttribute('aria-hidden')).toBe('false'); expect(anchor.tabIndex).toBe(0)
      expect(label.style.visibility).toBe('visible')
    }
  })
})

describe('label exposure from one raycast sample (PR #37 visual check)', () => {
  const self: LabelSampleHit = { serviceId: 'ombi' }
  const otherFish: LabelSampleHit = { serviceId: 'komodo' }
  const ambientFish: LabelSampleHit = { ambientFish: true }
  const reef: LabelSampleHit = {}
  const noHit: LabelSampleHit = undefined

  it('exposes the label when the nearest hit is the fish itself', () => {
    expect(isLabelSampleExposed(self)).toBe(true)
  })

  it('exposes the label when another service fish is foremost — a partly covered fish stays labelled', () => {
    // Mobile zoom: the yellow tang sits partly behind the blue tang, yet
    // is plainly visible; the old rule hid its pill because no sample
    // resolved to the tang itself.
    expect(isLabelSampleExposed(otherFish)).toBe(true)
  })

  it('exposes the label when a no-service ambient fish is foremost — the sailfin never hides a service label', () => {
    // Schoolmates carry no serviceId, so nearest() returned undefined for
    // every sample covered by the sailfin and the blue tang lost its pill.
    expect(isLabelSampleExposed(ambientFish)).toBe(true)
  })

  it('keeps the label hidden when reef or sand is foremost — a fish genuinely behind rock stays unlabelled', () => {
    expect(isLabelSampleExposed(reef)).toBe(false)
  })

  it('keeps the label hidden when the sample ray hits nothing', () => {
    expect(isLabelSampleExposed(noHit)).toBe(false)
  })
})
