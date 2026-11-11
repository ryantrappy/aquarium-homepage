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

/**
 * What the nearest opaque raycast hit at one label-visibility sample
 * point was. `serviceId` is the `userData.serviceId` of the foremost hit
 * mesh, when that mesh belongs to a service fish; `ambientFish` marks a
 * foremost hit on a no-service ambient schoolmate (sailfin, chromis,
 * anthias). A hit with neither is reef, rock, or sand.
 */
export type LabelSampleHit = Readonly<{
  serviceId?: string
  ambientFish?: boolean
}> | undefined

/**
 * Whether one raycast sample exposes a service fish's label (PR #37
 * visual check, mobile zoom). The label hangs below the fish in open
 * water, so the sample counts as exposed whenever the foremost hit is any
 * fish — the fish itself, another service fish, or an ambient schoolmate.
 * The old rule required the hit to be the fish itself, so a plainly
 * visible fish partly covered by the sailfin (which carries no serviceId)
 * or by another fish lost its pill even though most of its body was on
 * screen. Only a reef/sand hit — the fish genuinely behind rock — or no
 * hit at all keeps the label hidden, so occlusion for hidden fish is
 * preserved (AQ-89 AC #3). Trade-off, stated plainly: a fish entirely
 * behind another fish now shows its label at its true projected position
 * rather than losing it; the label still anchors to the right fish.
 */
export function isLabelSampleExposed(hit: LabelSampleHit): boolean {
  if (!hit) return false
  if (hit.serviceId !== undefined) return true
  return hit.ambientFish === true
}

