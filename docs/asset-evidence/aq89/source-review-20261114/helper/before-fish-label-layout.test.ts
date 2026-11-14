import { describe, expect, it } from 'vitest'
import {
  FISH_LABEL_CAPTION_HEIGHT_PX,
  estimateCaptionRect,
  labelLiftPx,
  resolveLabelDeconflicts,
  type FishLabelPlacement,
  type LabelRect,
} from './fish-label-layout'

const VIEWPORT = { width: 1440, height: 900 }

function placement(
  id: string,
  body: { x: number; y: number; width: number; height: number },
  depth: number,
): FishLabelPlacement {
  return {
    id,
    caption: estimateCaptionRect(body, labelLiftPx(body.height)),
    body,
    depth,
  }
}

describe('tight service-label anchoring and overlap de-conflict (AQ-89)', () => {
  it('lifts the caption by a quarter of the link height, capped so it never climbs onto the fish', () => {
    expect(labelLiftPx(0)).toBe(0)
    expect(labelLiftPx(-5)).toBe(0)
    expect(labelLiftPx(NaN)).toBe(0)
    expect(labelLiftPx(44)).toBe(11)
    expect(labelLiftPx(120)).toBe(30)
    // A close-range yellow tang box would ask for more; the cap holds the caption below the belly.
    expect(labelLiftPx(200)).toBe(48)
  })

  it('estimates the caption directly under the link box after the lift', () => {
    const caption = estimateCaptionRect({ x: 100, y: 200, width: 120, height: 80 }, 20)
    expect(caption.y).toBe(260)
    expect(caption.height).toBe(FISH_LABEL_CAPTION_HEIGHT_PX)
    expect(caption.x + caption.width / 2).toBeCloseTo(160)
    expect(caption.width).toBe(120)
    // Narrow boxes keep the 44px minimum caption width.
    expect(estimateCaptionRect({ x: 0, y: 0, width: 30, height: 44 }, 11).width).toBe(44)
  })

  it('leaves separated labels untouched', () => {
    const results = resolveLabelDeconflicts(
      [
        placement('a', { x: 100, y: 100, width: 120, height: 80 }, 1.0),
        placement('b', { x: 800, y: 500, width: 120, height: 80 }, 0.0),
      ],
      VIEWPORT,
    )
    expect(results).toEqual([
      { id: 'a', dy: 0, dx: 0, faded: false, align: 'center' },
      { id: 'b', dy: 0, dx: 0, faded: false, align: 'center' },
    ])
  })

  it('shifts the farther caption below a nearer caption and fish body, never moving the nearer one', () => {
    const near = placement('near', { x: 500, y: 300, width: 160, height: 100 }, 1.0)
    // The far fish swims just above the near one: its caption (y 355..383)
    // overlaps the near caption (y 375..403) and the near fish body
    // (y 300..400), while the near caption only touches the far body edge.
    const far = placement('far', { x: 520, y: 295, width: 140, height: 80 }, 0.0)
    expect(near.caption.y).toBe(375)
    expect(far.caption.y).toBe(355)
    const results = resolveLabelDeconflicts([far, near], VIEWPORT)
    const nearResult = results.find(result => result.id === 'near')!
    const farResult = results.find(result => result.id === 'far')!
    expect(nearResult).toEqual({ id: 'near', dy: 0, dx: 0, faded: false, align: 'center' })
    // Shifted below the near body (bottom 400 + 8px) and then below the
    // near caption (bottom 403 + 8px): 355 + 53 = 408.
    expect(farResult.dy).toBe(53)
    expect(farResult.faded).toBe(false)
    expect(far.caption.y + farResult.dy).toBe(408)
  })

  it('keeps a caption visible instead of fading it when it cannot clear before the viewport bottom edge', () => {
    const near = placement('near', { x: 500, y: 780, width: 160, height: 100 }, 1.0)
    const far = placement('far', { x: 520, y: 775, width: 140, height: 80 }, 0.0)
    const results = resolveLabelDeconflicts([near, far], VIEWPORT)
    const farResult = results.find(result => result.id === 'far')!
    // The old code faded this caption; a pill that vanishes for a frame
    // reads as a missing link (PR #37 bubble frames), so it stays visible
    // at its anchored position instead — sliding sideways cannot keep it
    // attached to its own fish here, so it does not move at all.
    expect(farResult.faded).toBe(false)
    expect(farResult.dy).toBe(0)
    expect(results.find(result => result.id === 'near')!.faded).toBe(false)
    expect(results.find(result => result.id === 'near')!.dy).toBe(0)
  })

  it('aligns captions inward at the frame edges instead of clipping', () => {
    const results = resolveLabelDeconflicts(
      [
        placement('left', { x: 0, y: 100, width: 60, height: 60 }, 1.0),
        placement('right', { x: 1400, y: 100, width: 60, height: 60 }, 0.5),
        placement('mid', { x: 700, y: 100, width: 60, height: 60 }, 0.0),
      ],
      VIEWPORT,
    )
    expect(results.find(result => result.id === 'left')!.align).toBe('left')
    expect(results.find(result => result.id === 'right')!.align).toBe('right')
    expect(results.find(result => result.id === 'mid')!.align).toBe('center')
    expect(results.every(result => !result.faded)).toBe(true)
    // The clamped positions reach the DOM as dx, measured from the
    // centred position: left nudges +4 (gutter), right pulls back -24.
    expect(results.find(result => result.id === 'left')!.dx).toBe(4)
    expect(results.find(result => result.id === 'right')!.dx).toBe(-24)
    expect(results.find(result => result.id === 'mid')!.dx).toBe(0)
  })

  it('clamps a lone caption inside the frame when its fish sits partly past the right edge (mobile zoomed WatchMyBirds)', () => {
    const mobile = { width: 402, height: 874 }
    const results = resolveLabelDeconflicts(
      [placement('watch', { x: 390, y: 300, width: 60, height: 80 }, 1.0)],
      mobile,
    )
    const result = results[0]!
    expect(result.align).toBe('right')
    expect(result.faded).toBe(false)
    expect(result.dy).toBe(0)
    // Centred it would sit at x 390..450, hanging 48px past the 402px
    // frame; clamped to the 4px gutter it sits at 338..398, a -52px dx.
    expect(result.dx).toBe(-52)
  })

  it('keeps a caption visible instead of fading it when clearing would need a shift past the detachment cap', () => {
    // A tall nearer body (y 300..440): clearing it needs +93px, past the
    // 84px cap, even though the viewport bottom (900) would allow it. The
    // old code faded the caption; it now stays visible at its anchored
    // position (sliding sideways cannot keep it attached to its own fish
    // here, so it does not move at all).
    const near = placement('near', { x: 500, y: 300, width: 160, height: 140 }, 1.0)
    const far = placement('far', { x: 520, y: 295, width: 140, height: 80 }, 0.0)
    const results = resolveLabelDeconflicts([far, near], VIEWPORT)
    const farResult = results.find(result => result.id === 'far')!
    expect(farResult.faded).toBe(false)
    expect(farResult.dy).toBe(0)
    expect(results.find(result => result.id === 'near')!.faded).toBe(false)
  })

  it('returns results in input order with the nearer fish winning every conflict', () => {
    const far = placement('far', { x: 520, y: 295, width: 140, height: 80 }, 0.0)
    const near = placement('near', { x: 500, y: 300, width: 160, height: 100 }, 1.0)
    const results = resolveLabelDeconflicts([far, near], VIEWPORT)
    expect(results.map(result => result.id)).toEqual(['far', 'near'])
    expect(results[1]!.dy).toBe(0)
    expect(results[0]!.dy).toBeGreaterThan(0)
  })
})

function overlaps(a: LabelRect, b: LabelRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

function labelled(
  id: string,
  label: string,
  body: { x: number; y: number; width: number; height: number },
  depth: number,
): FishLabelPlacement {
  return {
    id,
    caption: estimateCaptionRect(body, labelLiftPx(body.height), label),
    body,
    depth,
  }
}

function resolvedRect(item: FishLabelPlacement, result: { dy: number; dx: number }): LabelRect {
  return { ...item.caption, x: item.caption.x + result.dx, y: item.caption.y + result.dy }
}

describe('PR #37 visual-check label fixes: stacked pills, cross-frame visibility, occlusion', () => {
  it('keeps two stacked pills visible and non-overlapping in a narrow viewport (mobile overview)', () => {
    const mobile = { width: 402, height: 874 }
    // Royal gramma (Paperless) swimming just above the banggai cardinalfish
    // (WatchMyBirds) sheltering in the staghorn: the gramma caption grazes
    // the banggai body, and clearing the body plus the banggai caption needs
    // a shift past the detachment cap — the old code faded the Paperless
    // pill instead of showing it.
    const banggai = labelled('watchmybirds', 'WatchMyBirds', { x: 250, y: 450, width: 90, height: 60 }, 1.0)
    const gramma = labelled('paperless', 'Paperless', { x: 255, y: 395, width: 60, height: 44 }, 0.0)
    const results = resolveLabelDeconflicts([gramma, banggai], mobile)
    expect(results.every(result => !result.faded)).toBe(true)
    const banggaiResult = results.find(result => result.id === 'watchmybirds')!
    const grammaResult = results.find(result => result.id === 'paperless')!
    expect(overlaps(resolvedRect(gramma, grammaResult), resolvedRect(banggai, banggaiResult))).toBe(false)
  })

  it('keeps a pill visible — and in the same place — across frames when its fish drifts a few pixels', () => {
    const mobile = { width: 402, height: 874 }
    const frame = (banggaiBottom: number) => {
      const banggaiBody = { x: 250, y: 450, width: 90, height: banggaiBottom - 450 }
      const banggai = labelled('watchmybirds', 'WatchMyBirds', banggaiBody, 1.0)
      const gramma = labelled('paperless', 'Paperless', { x: 255, y: 395, width: 60, height: 44 }, 0.0)
      return resolveLabelDeconflicts([gramma, banggai], mobile)
    }
    // The banggai drifts 4px down between the two bubble frames; the old
    // code showed Paperless in one frame and faded it in the next.
    const first = frame(508).find(result => result.id === 'paperless')!
    const second = frame(512).find(result => result.id === 'paperless')!
    expect(first.faded).toBe(false)
    expect(second.faded).toBe(false)
    expect(second.dy).toBe(first.dy)
    expect(second.dx).toBe(first.dx)
  })

  it('separates side-by-side pills whose names are wider than their fish', () => {
    const mobile = { width: 402, height: 874 }
    // Two small fish side by side: 44px link boxes, but "WatchMyBirds" and
    // "Paperless" render ~96px and ~77px wide. The body-width estimate said
    // the centred pills were clear; the rendered pills overlapped.
    const a = labelled('a', 'WatchMyBirds', { x: 100, y: 300, width: 44, height: 44 }, 1.0)
    const b = labelled('b', 'Paperless', { x: 150, y: 300, width: 44, height: 44 }, 0.0)
    const results = resolveLabelDeconflicts([a, b], mobile)
    expect(results.every(result => !result.faded)).toBe(true)
    const aResult = results.find(result => result.id === 'a')!
    const bResult = results.find(result => result.id === 'b')!
    expect(bResult.dy).toBeGreaterThan(0)
    expect(overlaps(resolvedRect(a, aResult), resolvedRect(b, bResult))).toBe(false)
  })

  it('slides a caption sideways instead of fading it when clearing a tall body needs more than the down-shift cap', () => {
    // The far fish is wide, so its caption can slide left past the tall
    // nearer body and still hang under its own fish — the old code faded
    // it (mobile zoom: a plainly visible fish with no pill).
    const near = labelled('near', 'Komodo', { x: 210, y: 280, width: 60, height: 200 }, 1.0)
    const far = labelled('far', 'Paperless', { x: 100, y: 200, width: 260, height: 80 }, 0.0)
    const results = resolveLabelDeconflicts([far, near], VIEWPORT)
    const farResult = results.find(result => result.id === 'far')!
    expect(farResult.faded).toBe(false)
    // Shifted sideways (not down past its fish), still overlapping its own
    // body horizontally so it reads as that fish's label.
    expect(farResult.dx).toBeLessThan(0)
    expect(farResult.dy).toBe(0)
    const farRect = resolvedRect(far, farResult)
    expect(overlaps(farRect, near.body)).toBe(false)
    expect(farRect.x < far.body.x + far.body.width && far.body.x < farRect.x + farRect.width).toBe(true)
  })

  it('estimates the caption width from the service name, not just the link box', () => {
    // A 44px link box with a long name renders a ~96px pill.
    expect(estimateCaptionRect({ x: 100, y: 300, width: 44, height: 44 }, 11, 'WatchMyBirds').width).toBe(96)
    expect(estimateCaptionRect({ x: 100, y: 300, width: 44, height: 44 }, 11, 'Paperless').width).toBe(77)
    // No name: the body-width proxy is unchanged.
    expect(estimateCaptionRect({ x: 100, y: 300, width: 120, height: 44 }, 11).width).toBe(120)
  })
})
