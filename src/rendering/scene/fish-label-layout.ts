// Caption layout only: native links, hit areas and accessibility exposure are
// owned by the scene. An impossible caption placement hides its ink, not its link.
export type LabelRect = Readonly<{ x: number; y: number; width: number; height: number }>
export type FishLabelBodyObstacle = Readonly<{ id: string; body: LabelRect }>
export type FishLabelPlacement = Readonly<{
  id: string
  /** Preferred caption rect, with measured dimensions when available. The caller
   * anchors it tightly below the actual visible body, independently of its hitbox. */
  caption: LabelRect
  /** Visible fish body, not the native link's enlarged 44px target. */
  body: LabelRect
  /** Greater means nearer the camera. Equal depths use stable service-id order. */
  depth: number
  /** Retained for old callers; layout never overrides the supplied caption size. */
  label?: string
}>
export type LabelDeconflictResult = Readonly<{
  id: string
  /** Offsets from the supplied caption.x/y, including side placement at edges. */
  dx: number
  dy: number
  /** Suppress only the caption when no attached, fully clear position fits. */
  faded: boolean
  /** Compatibility marker; actual placement is carried by dx/dy. */
  align: 'center' | 'left' | 'right'
}>

export const FISH_LABEL_CAPTION_HEIGHT_PX = 28
export const FISH_LABEL_CAPTION_MAX_WIDTH_PX = 150
export const FISH_LABEL_CLEARANCE_PX = 8
export const FISH_LABEL_MAX_LIFT_PX = 48
/** Compatibility export: captions no longer search detached downward positions. */
export const FISH_LABEL_MAX_SHIFT_PX = 0
export const FISH_LABEL_CHAR_WIDTH_PX = 6.5
export const FISH_LABEL_TEXT_PADDING_PX = 18
const VIEWPORT_GUTTER_PX = 4
const BODY_CLEARANCE_PX = 1
const MAX_CANDIDATES = 32

/** Legacy estimate only; it is not a measured fish-belly position. New scene
 * callers should supply a caption rect from actual body bounds and DOM size. */
export function labelLiftPx(linkHeightPx: number): number {
  if (!Number.isFinite(linkHeightPx) || linkHeightPx <= 0) return 0
  return Math.min(FISH_LABEL_MAX_LIFT_PX, Math.round(linkHeightPx * 0.25))
}

/** Backwards-compatible estimate, with optional measured caption size. No size
 * estimate replaces explicit measurements (including badges, padding and fonts). */
export function estimateCaptionRect(
  bounds: LabelRect,
  liftPx: number,
  label?: string,
  measuredSize?: Readonly<{ width: number; height: number }>,
): LabelRect {
  const width = measuredSize?.width ?? (label
    ? Math.min(FISH_LABEL_CAPTION_MAX_WIDTH_PX, Math.max(44, Math.ceil(label.length * FISH_LABEL_CHAR_WIDTH_PX) + FISH_LABEL_TEXT_PADDING_PX))
    : Math.min(FISH_LABEL_CAPTION_MAX_WIDTH_PX, Math.max(44, bounds.width)))
  return {
    x: bounds.x + bounds.width / 2 - width / 2,
    y: bounds.y + bounds.height - liftPx,
    width,
    height: measuredSize?.height ?? FISH_LABEL_CAPTION_HEIGHT_PX,
  }
}

function validRect(rect: LabelRect): boolean {
  return [rect.x, rect.y, rect.width, rect.height, rect.x + rect.width, rect.y + rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0
}
function overlaps(a: LabelRect, b: LabelRect, gap: number): boolean {
  return a.x < b.x + b.width + gap && b.x - gap < a.x + a.width
    && a.y < b.y + b.height + gap && b.y - gap < a.y + a.height
}
function compareIds(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }
function hidden(id: string): LabelDeconflictResult { return { id, dx: 0, dy: 0, faded: true, align: 'center' } }

/**
 * Near-first, bounded caption placement. The supplied caption is the preferred
 * tight anchor. Search its horizontal body column without adding a vertical gap;
 * at frame edges also try immediately beside the body. At most 32 candidates are
 * checked against ALL foreign bodies and previously accepted captions. If none
 * fits, hide the caption instead of claiming unresolved overlap is clear.
 *
 * additionalBodies includes ambient/non-service fish without inventing links.
 * Returned dx/dy are always relative to each input caption.x/y, not its hitbox.
 * Results retain input order, with stable id priority for equal camera depths.
 */
export function resolveLabelDeconflicts(
  placements: readonly FishLabelPlacement[],
  viewport: Readonly<{ width: number; height: number }>,
  additionalBodies: readonly FishLabelBodyObstacle[] = [],
): LabelDeconflictResult[] {
  const bodies = [...placements.map(({ id, body }) => ({ id, body })), ...additionalBodies]
    .sort((a, b) => compareIds(a.id, b.id) || a.body.x - b.body.x || a.body.y - b.body.y)
  if (![viewport.width, viewport.height].every(Number.isFinite)
    || viewport.width <= 2 * VIEWPORT_GUTTER_PX || viewport.height <= 2 * VIEWPORT_GUTTER_PX
    || bodies.some(entry => !validRect(entry.body))) return placements.map(item => hidden(item.id))

  const idCounts = new Map<string, number>()
  for (const item of placements) idCounts.set(item.id, (idCounts.get(item.id) ?? 0) + 1)
  const ordered = placements.map((item, index) => ({ item, index }))
    .sort((a, b) => (Number.isFinite(b.item.depth) ? b.item.depth : -Infinity)
      - (Number.isFinite(a.item.depth) ? a.item.depth : -Infinity) || compareIds(a.item.id, b.item.id))
  const results = placements.map(item => hidden(item.id))
  const visibleCaptions: LabelRect[] = []

  for (const { item, index } of ordered) {
    if (!validRect(item.caption) || !Number.isFinite(item.depth) || idCounts.get(item.id) !== 1) continue
    const { body, caption } = item
    const maxX = viewport.width - VIEWPORT_GUTTER_PX - caption.width
    const maxY = viewport.height - VIEWPORT_GUTTER_PX - caption.height
    if (maxX < VIEWPORT_GUTTER_PX || maxY < VIEWPORT_GUTTER_PX) continue
    const foreignBodies = bodies.filter(entry => entry.id !== item.id).map(entry => entry.body)
    const candidates: LabelRect[] = []
    const seen = new Set<string>()
    const add = (x: number, y: number) => {
      if (candidates.length >= MAX_CANDIDATES || !Number.isFinite(x) || !Number.isFinite(y)) return
      if (x < VIEWPORT_GUTTER_PX || x > maxX || y < VIEWPORT_GUTTER_PX || y > maxY) return
      const key = `${x}:${y}`
      if (!seen.has(key)) { seen.add(key); candidates.push({ x, y, width: caption.width, height: caption.height }) }
    }
    const addBelow = (x: number) => {
      const clamped = Math.min(maxX, Math.max(VIEWPORT_GUTTER_PX, x))
      const center = clamped + caption.width / 2
      // Keep the pill's centre beneath its own body, rather than allowing a
      // one-pixel corner overlap to masquerade as an attached label.
      if (center >= body.x && center <= body.x + body.width) add(clamped, caption.y)
    }
    addBelow(caption.x)
    addBelow(body.x + body.width / 2 - caption.width / 2)
    addBelow(body.x)
    addBelow(body.x + body.width - caption.width)

    const atFrameEdge = caption.x < VIEWPORT_GUTTER_PX || caption.x + caption.width > viewport.width - VIEWPORT_GUTTER_PX
      || caption.y < VIEWPORT_GUTTER_PX || caption.y + caption.height > viewport.height - VIEWPORT_GUTTER_PX
    if (atFrameEdge) {
      const sides: Array<{ x: number; y: number }> = []
      for (const x of [body.x - BODY_CLEARANCE_PX - caption.width, body.x + body.width + BODY_CLEARANCE_PX]) {
        for (const rawY of [body.y + body.height - caption.height, body.y + (body.height - caption.height) / 2, body.y]) {
          const y = Math.min(maxY, Math.max(VIEWPORT_GUTTER_PX, rawY))
          if (y < body.y + body.height && body.y < y + caption.height) sides.push({ x, y })
        }
      }
      sides.sort((a, b) => Math.hypot(a.x - caption.x, a.y - caption.y) - Math.hypot(b.x - caption.x, b.y - caption.y)
        || a.x - b.x || a.y - b.y)
      for (const side of sides) add(side.x, side.y)
    }
    // Obstacle edges supply bounded horizontal escape candidates. Every escape
    // still keeps the caption under its own body and is checked against all
    // obstacles, so clearing one obstacle cannot introduce an unchecked overlap.
    for (const [obstacles, gap] of [[foreignBodies, BODY_CLEARANCE_PX], [visibleCaptions, FISH_LABEL_CLEARANCE_PX]] as const) {
      for (const obstacle of obstacles) {
        if (candidates.length >= MAX_CANDIDATES) break
        addBelow(obstacle.x - gap - caption.width)
        addBelow(obstacle.x + obstacle.width + gap)
      }
    }
    // Validate the same offset arithmetic the caller applies. A huge finite
    // preferred origin must not lose the chosen position to cancellation.
    const chosen = candidates.map(candidate => {
      const dx = candidate.x - caption.x, dy = candidate.y - caption.y
      return { dx, dy, rect: { ...candidate, x: caption.x + dx, y: caption.y + dy } }
    }).find(({ rect }) => validRect(rect) && rect.x >= VIEWPORT_GUTTER_PX && rect.x <= maxX
      && rect.y >= VIEWPORT_GUTTER_PX && rect.y <= maxY
      && !foreignBodies.some(obstacle => overlaps(rect, obstacle, BODY_CLEARANCE_PX))
      && !visibleCaptions.some(obstacle => overlaps(rect, obstacle, FISH_LABEL_CLEARANCE_PX)))
    if (!chosen) continue
    const { dx, dy } = chosen
    results[index] = { id: item.id, dx, dy, faded: false, align: dx < 0 ? 'right' : dx > 0 ? 'left' : 'center' }
    visibleCaptions.push(chosen.rect)
  }
  return results
}
