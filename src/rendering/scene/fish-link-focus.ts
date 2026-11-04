/** Apply exposure only after moving focus off an unavailable fish. A missing
 * or unusable control must not turn the focused link into a hidden target.
 * Returns native-label availability, which may outlast raw mesh exposure. */
export function applyFishLinkVisibility(anchor: HTMLAnchorElement, visible: boolean, fallback: HTMLElement | null) {
  const document = anchor.ownerDocument
  if (!visible && anchor.contains(document.activeElement)) {
    if (fallback?.isConnected && !anchor.contains(fallback) && !fallback.matches(':disabled') && !fallback.closest('[hidden], [inert], [aria-hidden="true"]')) {
      fallback.focus({ preventScroll: true })
    }
    if (anchor.contains(document.activeElement)) visible = true
  }
  // The body rectangle remains available for exact alpha/geometry picking;
  // exposure controls its label, tab stop and accessibility-tree presence.
  anchor.style.visibility = 'visible'
  anchor.tabIndex = visible ? 0 : -1
  anchor.dataset.occluded = String(!visible)
  anchor.setAttribute('aria-hidden', String(!visible))
  const label = anchor.querySelector<HTMLElement>('.fish-name')
  if (label) label.style.visibility = visible ? 'visible' : 'hidden'
  return visible
}
