// Tight service-label anchoring and overlap de-conflict (AQ-89).
//
// The visible caption (`.fish-name`) hangs below its fish's link box, which
// is centred on the fish and taller than the fish body, so a caption at
// `top: 100%` floats with a visible gap. The lift below tucks the caption
// tight under the fish's belly, and the de-conflict pass keeps a caption
// from ever visually covering another fish or its caption. All geometry is
// pure and viewport-relative, so it is unit-testable without a DOM; the
// scene applies the results as CSS custom properties and classes.

export type LabelRect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type FishLabelPlacement = Readonly<{
  /** Stable id of the fish / service, echoed back in the result. */
  id: string
  /** Caption rectangle before de-conflict (after the anchoring lift). */
  caption: LabelRect
  /** Screen rectangle of the fish itself (its link box). */
  body: LabelRect
  /** World z of the fish: larger is nearer the camera (camera sits at z=9). */
  depth: number
}>

export type LabelDeconflictResult = Readonly<{
  id: string
  /** Extra downward shift in px to apply to this caption (0 = no shift). */
  dy: number
  /** Horizontal shift in px from the caption's CSS-centred position
   * (centred under the link box). The scene applies it as
   * `--fish-label-dx`; without it the layout's horizontal decisions
   * never reach the page, because the align classes can only anchor the
   * caption to the link box — and a box near (or partly past) the frame
   * edge can still leave the caption hanging off-screen. */
  dx: number
  /** True when no shift can clear the overlap: the caption is faded out
   * (the native link and its 44px target stay usable). Fading also
   * applies when clearing would need a shift past
   * FISH_LABEL_MAX_SHIFT_PX — a caption that far from its fish is
   * detached, not anchored. */
  faded: boolean
  /** Horizontal alignment of the caption relative to its anchor box
   * (a layout decision; the placement itself is carried by `dx`). */
  align: 'center' | 'left' | 'right'
}>

/** Rendered caption height used for overlap math (min-height 24px + padding). */
export const FISH_LABEL_CAPTION_HEIGHT_PX = 28
/** Rendered caption width cap (`.aquarium-fish-link .fish-name` max-width). */
export const FISH_LABEL_CAPTION_MAX_WIDTH_PX = 150
/** Minimum gap kept between a de-conflicted caption and what it cleared. */
export const FISH_LABEL_CLEARANCE_PX = 2
/** Largest anchoring lift: the caption never climbs onto the fish body. */
export const FISH_LABEL_MAX_LIFT_PX = 48
/** A caption shifted further than this from its fish is detached, not
 * anchored — fade it instead (AQ-89's existing fallback), exactly as
 * for a caption that cannot clear before the viewport bottom edge. */
export const FISH_LABEL_MAX_SHIFT_PX = 3 * FISH_LABEL_CAPTION_HEIGHT_PX

/**
 * Anchoring lift in px for a caption under a link box of `linkHeightPx`
 * (AQ-89 AC #1). The link box is centred on the fish and ~25% taller than
 * the fish's projected belly-to-box-bottom gap, so lifting the caption by
 * a quarter of the box height tucks it tight under the belly for every
 * species, from a 44px minimum target to a close-range yellow tang.
 */
export function labelLiftPx(linkHeightPx: number): number {
  if (!Number.isFinite(linkHeightPx) || linkHeightPx <= 0) return 0
  return Math.min(FISH_LABEL_MAX_LIFT_PX, Math.round(linkHeightPx * 0.25))
}

/**
 * Estimates the caption rectangle for a link box once the anchoring lift
 * is applied: centred under the box, `FISH_LABEL_CAPTION_HEIGHT_PX` tall,
 * starting at the box bottom minus the lift.
 */
export function estimateCaptionRect(bounds: LabelRect, liftPx: number): LabelRect {
  const width = Math.min(FISH_LABEL_CAPTION_MAX_WIDTH_PX, Math.max(44, bounds.width))
  return {
    x: bounds.x + bounds.width / 2 - width / 2,
    y: bounds.y + bounds.height - liftPx,
    width,
    height: FISH_LABEL_CAPTION_HEIGHT_PX,
  }
}

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

function shiftBelow(caption: LabelRect, obstacle: LabelRect): number {
  return obstacle.y + obstacle.height - caption.y + FISH_LABEL_CLEARANCE_PX
}

/**
 * De-conflicts one frame of captions (AQ-89 AC #2). Nearer fish win: their
 * captions are placed first and never move for a farther fish. A caption
 * that would cover another fish's body or an already-placed caption shifts
 * down until it clears; if it cannot clear before the viewport bottom edge
 * — or without shifting further than FISH_LABEL_MAX_SHIFT_PX, past which
 * the caption reads as detached from its fish — it fades out instead (the
 * link itself is untouched). Captions that would clip past a frame edge
 * align inward (left / right) instead of centring, and are then clamped
 * inside the viewport; the horizontal shift from the centred position is
 * reported as `dx` so the scene can apply it as `--fish-label-dx`.
 * Results are returned in input order.
 */
export function resolveLabelDeconflicts(
  placements: readonly FishLabelPlacement[],
  viewport: Readonly<{ width: number; height: number }>,
): LabelDeconflictResult[] {
  const ordered = [...placements].sort((a, b) => b.depth - a.depth)
  const placed: Array<{ caption: LabelRect; body: LabelRect }> = []
  const results = new Map<string, LabelDeconflictResult>()

  for (const item of ordered) {
    let align: LabelDeconflictResult['align'] = 'center'
    let caption = item.caption
    if (caption.x < 4) {
      align = 'left'
      caption = { ...caption, x: item.body.x }
    } else if (caption.x + caption.width > viewport.width - 4) {
      align = 'right'
      caption = { ...caption, x: item.body.x + item.body.width - caption.width }
    }
    // Clamp the caption inside the viewport: aligning to the link box is
    // not enough when the box itself sits near (or partly past) the frame
    // edge — the caption would still hang off-screen (mobile zoomed
    // WatchMyBirds). The clamp runs before the overlap pass so the shift
    // math sees the rect that will actually render.
    const maxCaptionX = Math.max(4, viewport.width - 4 - caption.width)
    caption = { ...caption, x: Math.min(Math.max(caption.x, 4), maxCaptionX) }

    let dy = 0
    let faded = false
    // A caption must clear every other fish body (near or far) and every
    // already-placed (nearer) caption. At most one shift per obstacle is
    // needed per pass because each shift moves the caption fully below it.
    for (let pass = 0; pass < 8 && !faded; pass++) {
      const shifted: LabelRect = { ...caption, y: caption.y + dy }
      const blockingBody = placements.find(
        other => other.id !== item.id && rectsOverlap(shifted, other.body),
      )
      const blockingCaption = placed.find(entry => rectsOverlap(shifted, entry.caption))
      const obstacle = blockingBody?.body ?? blockingCaption?.caption
      if (!obstacle) break
      const nextDy = dy + shiftBelow(shifted, obstacle)
      if (
        nextDy > FISH_LABEL_MAX_SHIFT_PX ||
        caption.y + nextDy + caption.height > viewport.height - 4
      ) {
        faded = true
        dy = 0
        break
      }
      dy = nextDy
    }

    const resolved: LabelRect = faded ? caption : { ...caption, y: caption.y + dy }
    placed.push({ caption: resolved, body: item.body })
    // Horizontal shift from the CSS-centred position (centred under the
    // link box) to the clamped, aligned position.
    const centredX = item.body.x + item.body.width / 2 - caption.width / 2
    results.set(item.id, { id: item.id, dy: faded ? 0 : dy, dx: caption.x - centredX, faded, align })
  }

  return placements.map(item => results.get(item.id)!)
}
