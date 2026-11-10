import { describe, expect, it } from 'vitest'
import {
  FISH_LABEL_CAPTION_HEIGHT_PX,
  estimateCaptionRect,
  labelLiftPx,
  resolveLabelDeconflicts,
  type FishLabelPlacement,
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
    // Shifted below the near body (bottom 400 + 2px) and then below the
    // near caption (bottom 403 + 2px): 355 + 50 = 405.
    expect(farResult.dy).toBe(50)
    expect(farResult.faded).toBe(false)
    expect(far.caption.y + farResult.dy).toBe(405)
  })

  it('fades a caption that cannot clear before the viewport bottom edge', () => {
    const near = placement('near', { x: 500, y: 780, width: 160, height: 100 }, 1.0)
    const far = placement('far', { x: 520, y: 775, width: 140, height: 80 }, 0.0)
    const results = resolveLabelDeconflicts([near, far], VIEWPORT)
    const farResult = results.find(result => result.id === 'far')!
    expect(farResult.faded).toBe(true)
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

  it('fades a caption that would need a shift past the detachment cap instead of letting it drift from its fish', () => {
    // A tall nearer body (y 300..440): clearing it needs +87px, past the
    // 84px cap, even though the viewport bottom (900) would allow it.
    const near = placement('near', { x: 500, y: 300, width: 160, height: 140 }, 1.0)
    const far = placement('far', { x: 520, y: 295, width: 140, height: 80 }, 0.0)
    const results = resolveLabelDeconflicts([far, near], VIEWPORT)
    const farResult = results.find(result => result.id === 'far')!
    expect(farResult.faded).toBe(true)
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
