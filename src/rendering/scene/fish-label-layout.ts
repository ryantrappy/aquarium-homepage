// Tight service-label anchoring and overlap de-conflict (AQ-89).
//
// The visible caption (`.fish-name`) hangs below its fish's link box, which
// is centred on the fish and taller than the fish body, so a caption at
// `top: 100%` floats with a visible gap. The lift below tucks the caption
// tight under the fish's belly, and the de-conflict pass keeps a caption
// from ever visually covering another fish or its caption. All geometry is
// pure and viewport-relative, so it is unit-testable without a DOM; the
// scene applies the results as CSS custom properties and classes.
//
// PR #37 post-merge visual check (2026-11-09, mobile 402x874): two pills
// stacked with only a 2px gap read as one overlapping blob, and a pill
// whose caption needed a shift past the detachment cap faded out entirely
// in one frame and reappeared in the next. Captions are therefore never
// faded any more: a caption that cannot shift down within its budget
// slides sideways past the obstacle instead, and if even that cannot keep
// it attached to its own fish it stays visible at its anchored position.
// A visible pill that grazes another fish beats an invisible pill.

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
  /** Display name rendered in the pill. When present the caption width is
   * estimated from the text: the rendered pill is text-wide
   * (`white-space: nowrap`, min 44px, max 150px), not link-box-wide, so a
   * long name on a small fish renders much wider than its box. */
  label?: string
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
  /** Retained for API compatibility: always false now. The layout never
   * fades a caption — a pill that cannot clear stays visible at its
   * anchored position (or slid sideways) instead of vanishing for a
   * frame, because a vanished label reads as a missing link. */
  faded: boolean
  /** Horizontal alignment of the caption relative to its anchor box
   * (a layout decision; the placement itself is carried by `dx`). */
  align: 'center' | 'left' | 'right'
}>

/** Rendered caption height used for overlap math (min-height 24px + padding). */
export const FISH_LABEL_CAPTION_HEIGHT_PX = 28
/** Rendered caption width cap (`.aquarium-fish-link .fish-name` max-width). */
export const FISH_LABEL_CAPTION_MAX_WIDTH_PX = 150
/** Minimum gap kept between a de-conflicted caption and what it cleared.
 * Two stacked pills separated by the old 2px read as one overlapping blob
 * in the 402px mobile overview (PR #37 visual check); 8px reads as two
 * separate pills. */
export const FISH_LABEL_CLEARANCE_PX = 8
/** Largest anchoring lift: the caption never climbs onto the fish body. */
export const FISH_LABEL_MAX_LIFT_PX = 48
/** Largest downward shift before the caption escapes sideways instead:
 * a caption shifted further than this from its fish reads as detached,
 * not anchored. It is a budget for the down-shift, not a fade trigger —
 * past it the caption slides sideways past the obstacle, or stays
 * visible where it is. */
export const FISH_LABEL_MAX_SHIFT_PX = 3 * FISH_LABEL_CAPTION_HEIGHT_PX
/** Average rendered width of one character of the 10px pill font, in px.
 * Measured against the live pills: "WatchMyBirds" renders ~90px and
 * "Paperless" ~75px including padding and border. */
export const FISH_LABEL_CHAR_WIDTH_PX = 6.5
/** Horizontal padding + border inside the rendered pill (border-box:
 * 8px padding each side + 2px border). */
export const FISH_LABEL_TEXT_PADDING_PX = 18

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
 * starting at the box bottom minus the lift. With a service name the width
 * comes from the text (the rendered pill is text-wide); without one it
 * falls back to the link-box width, as before.
 */
export function estimateCaptionRect(bounds: LabelRect, liftPx: number, label?: string): LabelRect {
  const textWidth = label
    ? Math.min(
      FISH_LABEL_CAPTION_MAX_WIDTH_PX,
      Math.max(44, Math.ceil(label.length * FISH_LABEL_CHAR_WIDTH_PX) + FISH_LABEL_TEXT_PADDING_PX),
    )
    : undefined
  const width = textWidth ?? Math.min(FISH_LABEL_CAPTION_MAX_WIDTH_PX, Math.max(44, bounds.width))
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
 * Horizontal escape for a caption that cannot shift down within its
 * budget: slide it fully to the left or the right of the obstacle (the
 * nearer side wins), staying inside the viewport and still overlapping
 * its own fish's body column horizontally — otherwise the pill reads as
 * another fish's label. Returns the new caption x, or undefined when
 * neither side can do that; the caller then leaves the caption visible
 * where it is instead of fading it.
 */
function escapeSideways(
  caption: LabelRect,
  obstacle: LabelRect,
  ownBody: LabelRect,
  viewport: Readonly<{ width: number; height: number }>,
): number | undefined {
  const candidates = [
    obstacle.x - FISH_LABEL_CLEARANCE_PX - caption.width,
    obstacle.x + obstacle.width + FISH_LABEL_CLEARANCE_PX,
  ]
  let best: number | undefined
  for (const x of candidates) {
    if (x < 4 || x + caption.width > viewport.width - 4) continue
    if (x >= ownBody.x + ownBody.width || ownBody.x >= x + caption.width) continue
    if (best === undefined || Math.abs(x - caption.x) < Math.abs(best - caption.x)) best = x
  }
  return best
}

/**
 * De-conflicts one frame of captions (AQ-89 AC #2). Nearer fish win: their
 * captions are placed first and never move for a farther fish. A caption
 * that would cover another fish's body or an already-placed caption shifts
 * down until it clears; when the needed down-shift would pass
 * FISH_LABEL_MAX_SHIFT_PX or the viewport bottom edge, the caption slides
 * sideways past the obstacle instead — and when even that cannot keep it
 * attached to its own fish, it stays visible at its anchored position.
 * Captions are never faded: the old fade fallback made pills vanish for a
 * frame whenever a fish drifted a few pixels (PR #37 bubble frames), and a
 * plainly visible fish with no label reads as a missing link. Captions
 * that would clip past a frame edge align inward (left / right) instead of
 * centring, and are then clamped inside the viewport; the horizontal shift
 * from the centred position is reported as `dx` so the scene can apply it
 * as `--fish-label-dx`. Results are returned in input order.
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
    // A caption must clear every other fish body (near or far) and every
    // already-placed (nearer) caption. At most one shift per obstacle is
    // needed per pass because each shift moves the caption fully below it;
    // a sideways escape likewise moves it fully past the obstacle, so the
    // pass loop converges or stops after 8 passes with the caption still
    // visible where it is.
    for (let pass = 0; pass < 8; pass++) {
      const shifted: LabelRect = { ...caption, y: caption.y + dy }
      const blockingBody = placements.find(
        other => other.id !== item.id && rectsOverlap(shifted, other.body),
      )
      const blockingCaption = placed.find(entry => rectsOverlap(shifted, entry.caption))
      const obstacle = blockingBody?.body ?? blockingCaption?.caption
      if (!obstacle) break
      const nextDy = dy + shiftBelow(shifted, obstacle)
      if (
        nextDy <= FISH_LABEL_MAX_SHIFT_PX &&
        caption.y + nextDy + caption.height <= viewport.height - 4
      ) {
        dy = nextDy
        continue
      }
      const escapedX = escapeSideways(shifted, obstacle, item.body, viewport)
      if (escapedX === undefined) break
      caption = { ...caption, x: escapedX }
    }

    const resolved: LabelRect = { ...caption, y: caption.y + dy }
    placed.push({ caption: resolved, body: item.body })
    // Horizontal shift from the CSS-centred position (centred under the
    // link box) to the clamped, aligned position.
    const centredX = item.body.x + item.body.width / 2 - caption.width / 2
    results.set(item.id, { id: item.id, dy, dx: caption.x - centredX, faded: false, align })
  }

  return placements.map(item => results.get(item.id)!)
}
