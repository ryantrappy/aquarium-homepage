import { describe, expect, it } from 'vitest'
import {
  estimateCaptionRect,
  labelLiftPx,
  resolveLabelDeconflicts,
  type FishLabelBodyObstacle,
  type FishLabelPlacement,
  type LabelDeconflictResult,
  type LabelRect,
} from './before-fish-label-layout'

const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 402, height: 874 }]
function placement(id: string, body: LabelRect, depth = 0, width = 100, height = 24): FishLabelPlacement {
  return { id, body, depth, caption: { x: body.x + (body.width - width) / 2, y: body.y + body.height + 1, width, height } }
}
function resolved(item: FishLabelPlacement, result: LabelDeconflictResult): LabelRect {
  return { ...item.caption, x: item.caption.x + result.dx, y: item.caption.y + result.dy }
}
function overlaps(a: LabelRect, b: LabelRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}
function verifyVisible(
  items: readonly FishLabelPlacement[], results: readonly LabelDeconflictResult[],
  viewport: { width: number; height: number }, extras: readonly FishLabelBodyObstacle[] = [],
) {
  expect(results.map(result => result.id)).toEqual(items.map(item => item.id))
  const bodies = [...items.map(({ id, body }) => ({ id, body })), ...extras]
  const visible = results.flatMap((result, i) => result.faded ? [] : [{ id: result.id, rect: resolved(items[i], result) }])
  for (let i = 0; i < visible.length; i++) {
    const { id, rect } = visible[i]
    expect(rect.x).toBeGreaterThanOrEqual(4); expect(rect.y).toBeGreaterThanOrEqual(4)
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width - 4)
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height - 4)
    for (const other of bodies) if (other.id !== id) expect(overlaps(rect, other.body), `${id} covers body ${other.id}`).toBe(false)
    for (const other of visible.slice(i + 1)) expect(overlaps(rect, other.rect), `${id} covers caption ${other.id}`).toBe(false)
  }
}

describe('caption measurements and legacy caller compatibility', () => {
  it('retains the old estimate while accepting measured width and height verbatim', () => {
    const box = { x: 100, y: 200, width: 120, height: 80 }
    expect(labelLiftPx(80)).toBe(20)
    expect(labelLiftPx(0)).toBe(0); expect(labelLiftPx(NaN)).toBe(0)
    expect(estimateCaptionRect(box, 20)).toEqual({ x: 100, y: 260, width: 120, height: 28 })
    expect(estimateCaptionRect(box, 20, 'a long name with an example badge', { width: 123, height: 37 }))
      .toEqual({ x: 98.5, y: 260, width: 123, height: 37 })
  })
  it('returns offsets from the supplied caption origin, never from the native hitbox centre', () => {
    const initial = placement('measured', { x: 200, y: 100, width: 200, height: 70 }, 0, 80, 31)
    const item = { ...initial, caption: { ...initial.caption, x: 230 } }
    const result = resolveLabelDeconflicts([item], VIEWPORTS[0])[0]
    expect(result).toEqual({ id: 'measured', dx: 0, dy: 0, faded: false, align: 'center' })
    expect(resolved(item, result)).toEqual(item.caption)
  })
  it('still accepts estimated captions and the original two-argument call', () => {
    const body = { x: 100, y: 200, width: 120, height: 80 }
    const item = { id: 'legacy', body, depth: 1, caption: estimateCaptionRect(body, labelLiftPx(body.height), 'Home') }
    expect(resolveLabelDeconflicts([item], VIEWPORTS[0])[0].faded).toBe(false)
  })
})

for (const viewport of VIEWPORTS) describe(`${viewport.width}x${viewport.height} bounded caption layout`, () => {
  it('keeps separated measured captions at their tight supplied anchors', () => {
    const items = [placement('first', { x: 40, y: 120, width: 110, height: 70 }, 2),
      placement('second', { x: viewport.width - 150, y: 350, width: 110, height: 70 }, 1)]
    const before = structuredClone(items)
    const results = resolveLabelDeconflicts(items, viewport)
    expect(results.every(result => !result.faded && result.dx === 0 && result.dy === 0)).toBe(true)
    expect(items).toEqual(before)
    verifyVisible(items, results, viewport)
  })
  it('hides an impossible crowded caption instead of leaving it over another fish or detaching it downward', () => {
    const near = placement('near', { x: viewport.width * .35, y: viewport.height * .4, width: viewport.width * .3, height: viewport.height * .16 }, 2)
    const far = placement('far', { x: viewport.width * .4, y: viewport.height * .42, width: viewport.width * .18, height: viewport.height * .08 }, 1)
    const items = [far, near], results = resolveLabelDeconflicts(items, viewport)
    expect(results[0].faded).toBe(true)
    expect(results[1].faded).toBe(false)
    verifyVisible(items, results, viewport)
  })
  it('separates overlapping wide captions horizontally while staying under their own bodies', () => {
    const items = [placement('a', { x: 100, y: 200, width: 80, height: 50 }, 2, 120),
      placement('b', { x: 220, y: 200, width: 80, height: 50 }, 1, 120)]
    const results = resolveLabelDeconflicts(items, viewport)
    expect(results.every(result => !result.faded && result.dy === 0)).toBe(true)
    expect(results[1].dx).toBeGreaterThan(0)
    verifyVisible(items, results, viewport)
  })
  it('moves a bottom-edge caption immediately beside its fish and keeps the full measured pill in frame', () => {
    const item = placement('bottom', { x: 100, y: viewport.height - 70, width: 80, height: 60 }, 1, 90, 28)
    const result = resolveLabelDeconflicts([item], viewport)[0], rect = resolved(item, result)
    expect(result.faded).toBe(false)
    expect(result.dy).toBeLessThan(0)
    expect(rect.x + rect.width === item.body.x - 1 || rect.x === item.body.x + item.body.width + 1).toBe(true)
    expect(rect.y < item.body.y + item.body.height && item.body.y < rect.y + rect.height).toBe(true)
    verifyVisible([item], [result], viewport)
  })
  it('places a long right-edge pill beside the body when clamping below would detach its centre', () => {
    const item = placement('edge', { x: viewport.width - 42, y: 200, width: 38, height: 50 }, 1, 120)
    const result = resolveLabelDeconflicts([item], viewport)[0], rect = resolved(item, result)
    expect(result.faded).toBe(false)
    expect(rect.x + rect.width).toBe(item.body.x - 1)
    verifyVisible([item], [result], viewport)
  })
  it('treats an ambient body as an obstacle without adding a caption or a native link', () => {
    const item = placement('service', { x: 100, y: 100, width: 120, height: 70 }, 1)
    const ambient = [{ id: 'ambient-anthias', body: { x: 90, y: 165, width: 150, height: 100 } }]
    const results = resolveLabelDeconflicts([item], viewport, ambient)
    expect(results).toHaveLength(1); expect(results[0].id).toBe('service'); expect(results[0].faded).toBe(true)
    verifyVisible([item], results, viewport, ambient)
  })
  it('checks every obstacle after an escape rather than clearing one and covering the next', () => {
    const item = placement('service', { x: 80, y: 100, width: 240, height: 60 }, 1, 120)
    const obstacles = [
      { id: 'middle', body: { x: 170, y: 160, width: 80, height: 100 } },
      { id: 'left', body: { x: 40, y: 160, width: 100, height: 100 } },
      { id: 'right', body: { x: 290, y: 160, width: 110, height: 100 } },
    ]
    const results = resolveLabelDeconflicts([item], viewport, obstacles)
    expect(results[0].faded).toBe(true)
    verifyVisible([item], results, viewport, obstacles)
  })
  it('finds a safe attached horizontal escape around a local body obstacle', () => {
    const item = placement('service', { x: 80, y: 100, width: 240, height: 60 }, 1, 90)
    const obstacles = [{ id: 'other-fish', body: { x: 170, y: 155, width: 60, height: 90 } }]
    const result = resolveLabelDeconflicts([item], viewport, obstacles)[0]
    expect(result.faded).toBe(false); expect(result.dy).toBe(0); expect(result.dx).not.toBe(0)
    verifyVisible([item], [result], viewport, obstacles)
  })
  it('hides a caption when a zoomed fish leaves no in-frame attached position', () => {
    const item = placement('fills-view', { x: 4, y: 4, width: viewport.width - 8, height: viewport.height - 8 }, 1, 110)
    expect(resolveLabelDeconflicts([item], viewport)[0].faded).toBe(true)
  })
  it('keeps all visible results clear across deterministic mixed-size clusters', () => {
    let seed = 89014
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 0x1_0000_0000 }
    let visibleCount = 0
    for (let frame = 0; frame < 16; frame++) {
      const items = Array.from({ length: 12 }, (_, index) => placement(`fish-${index}`, {
        x: random() * (viewport.width - 70), y: random() * (viewport.height - 70),
        width: 25 + random() * 100, height: 15 + random() * 75,
      }, random(), 44 + random() * 110, 24 + random() * 14))
      const extras = Array.from({ length: 3 }, (_, index) => ({ id: `ambient-${index}`, body: {
        x: random() * (viewport.width - 70), y: random() * (viewport.height - 70), width: 60, height: 50,
      } }))
      const results = resolveLabelDeconflicts(items, viewport, extras)
      visibleCount += results.filter(result => !result.faded).length
      verifyVisible(items, results, viewport, extras)
      expect(resolveLabelDeconflicts(items, viewport, extras)).toEqual(results)
    }
    expect(visibleCount).toBeGreaterThan(16)
  })
})

describe('determinism and conservative invalid input handling', () => {
  it('uses near-first then stable-id priority independently of input/ambient ordering', () => {
    const a = placement('a', { x: 120, y: 100, width: 90, height: 50 }, 2, 100)
    const b = placement('b', { x: 120, y: 100, width: 90, height: 50 }, 2, 100)
    const far = placement('far', { x: 500, y: 400, width: 90, height: 50 }, 1)
    const extras = [{ id: 'x', body: { x: 700, y: 20, width: 30, height: 30 } }, { id: 'y', body: { x: 900, y: 20, width: 30, height: 30 } }]
    const first = resolveLabelDeconflicts([b, far, a], VIEWPORTS[0], extras)
    const second = resolveLabelDeconflicts([a, b, far], VIEWPORTS[0], [...extras].reverse())
    expect(first.find(result => result.id === 'a')!.faded).toBe(false)
    expect(first.find(result => result.id === 'b')!.faded).toBe(true)
    for (const result of first) expect(second.find(other => other.id === result.id)).toEqual(result)
    verifyVisible([b, far, a], first, VIEWPORTS[0], extras)
  })
  it('ignores its own duplicate body obstacle but not a different fish with the same rectangle', () => {
    const item = placement('own', { x: 100, y: 100, width: 100, height: 50 }, 1)
    expect(resolveLabelDeconflicts([item], VIEWPORTS[0], [{ id: 'own', body: item.body }])[0].faded).toBe(false)
    const foreign = { id: 'foreign', body: { ...item.caption } }
    const result = resolveLabelDeconflicts([item], VIEWPORTS[0], [foreign])[0]
    expect(result.faded).toBe(true)
  })
  it('does not emit visible captions for invalid viewports, metrics, identities or unknown body bounds', () => {
    const item = placement('valid', { x: 100, y: 100, width: 100, height: 50 }, 1)
    expect(resolveLabelDeconflicts([item], { width: NaN, height: 900 })[0].faded).toBe(true)
    expect(resolveLabelDeconflicts([{ ...item, caption: { ...item.caption, width: Infinity } }], VIEWPORTS[0])[0].faded).toBe(true)
    expect(resolveLabelDeconflicts([item, item], VIEWPORTS[0]).every(result => result.faded)).toBe(true)
    expect(resolveLabelDeconflicts([item], VIEWPORTS[0], [{ id: 'unknown', body: { x: NaN, y: 0, width: 30, height: 30 } }])[0].faded).toBe(true)
  })
  it('does not accept a position lost by finite offset cancellation', () => {
    const initial = placement('overflowed-projection', { x: 100, y: 100, width: 100, height: 50 }, 1)
    const item = { ...initial, caption: { ...initial.caption, x: Number.MAX_VALUE } }
    expect(resolveLabelDeconflicts([item], VIEWPORTS[0])[0].faded).toBe(true)
  })
})
