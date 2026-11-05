import { describe, expect, it } from 'vitest'
import type { AxisAlignedBox, Vec3 } from './habitat-navigation'
import { findMeshRoute, type CapsuleClearanceQuery, type CapsuleQueryResult, type MeshNavigationInput } from './mesh-navigation'

type Box = AxisAlignedBox
const bounds: Box = { min: { x: 0, y: 0, z: 0 }, max: { x: 4, y: 4, z: 4 } }
const clear: CapsuleQueryResult = { status: 'clear', work: { nodeVisits: 0, triangleTests: 0 } }
const blocked: CapsuleQueryResult = { status: 'blocked', work: { nodeVisits: 0, triangleTests: 0 } }
const inside = (point: Vec3, box: Box) => ['x', 'y', 'z'].every((axis) => point[axis as keyof Vec3] > box.min[axis as keyof Vec3] && point[axis as keyof Vec3] < box.max[axis as keyof Vec3])

function segmentIntersectsClosedBox(start: Vec3, end: Vec3, box: Box): boolean {
  let enter = 0, leave = 1
  for (const axis of ['x', 'y', 'z'] as const) {
    const delta = end[axis] - start[axis]
    if (delta === 0) {
      if (start[axis] < box.min[axis] || start[axis] > box.max[axis]) return false
      continue
    }
    const a = (box.min[axis] - start[axis]) / delta
    const b = (box.max[axis] - start[axis]) / delta
    enter = Math.max(enter, Math.min(a, b))
    leave = Math.min(leave, Math.max(a, b))
    if (enter > leave) return false
  }
  return leave >= 0 && enter <= 1
}

function boxOracle(boxes: readonly Box[], calls: Array<readonly [Vec3, Vec3]> = []): CapsuleClearanceQuery {
  return (start, end, radiusM) => {
    calls.push([start, end])
    const expanded = boxes.map((box) => ({
      min: { x: box.min.x - radiusM, y: box.min.y - radiusM, z: box.min.z - radiusM },
      max: { x: box.max.x + radiusM, y: box.max.y + radiusM, z: box.max.z + radiusM },
    }))
    return expanded.some((box) => inside(start, box) || segmentIntersectsClosedBox(start, end, box)) ? blocked : clear
  }
}

function plan(input: Partial<Parameters<typeof findMeshRoute>[0]> & Pick<Parameters<typeof findMeshRoute>[0], 'start' | 'target' | 'queryCapsule'>) {
  return findMeshRoute({ start: input.start, target: input.target, queryCapsule: input.queryCapsule, waterBounds: input.waterBounds ?? bounds,
    fishClearanceRadius: input.fishClearanceRadius ?? .1, spacingM: input.spacingM ?? .5, budget: input.budget })
}

function pathHas(path: readonly Vec3[], predicate: (point: Vec3) => boolean) { return path.some(predicate) }

describe('bounded 3D mesh navigation lattice', () => {
  it('routes through a depth gap that a full-depth wall would hide', () => {
    const wall: Box = { min: { x: 1.8, y: 0, z: 0 }, max: { x: 2.2, y: 4, z: 1.2 } }
    const result = plan({ start: { x: .5, y: 2, z: .8 }, target: { x: 3.5, y: 2, z: .8 }, queryCapsule: boxOracle([wall]) })
    expect(result.status).toBe('route')
    if (result.status !== 'route') return
    expect(pathHas(result.path, (point) => point.z > 1.3)).toBe(true)
    expect(result.work.latticeDimensions).toEqual([9, 9, 9])
  })

  it('uses vertical free water under an overhang', () => {
    const overhang: Box = { min: { x: 1.8, y: 1.5, z: 0 }, max: { x: 2.2, y: 4, z: 4 } }
    const result = plan({ start: { x: .5, y: 2, z: 2 }, target: { x: 3.5, y: 2, z: 2 }, queryCapsule: boxOracle([overhang]) })
    expect(result.status).toBe('route')
    if (result.status !== 'route') return
    expect(pathHas(result.path, (point) => point.y < 1.4)).toBe(true)
  })

  it('preserves equivalent paths under a cyclic axis permutation', () => {
    const sourceWall: Box = { min: { x: 1.8, y: 0, z: 0 }, max: { x: 2.2, y: 4, z: 1.2 } }
    const start = { x: .5, y: 2, z: .8 }, target = { x: 3.5, y: 2, z: .8 }
    const original = plan({ start, target, queryCapsule: boxOracle([sourceWall]) })
    const permute = (point: Vec3): Vec3 => ({ x: point.z, y: point.x, z: point.y })
    const rotatedBounds = { min: permute(bounds.min), max: permute(bounds.max) }
    const rotatedWall = { min: permute(sourceWall.min), max: permute(sourceWall.max) }
    const rotated = plan({ start: permute(start), target: permute(target), waterBounds: rotatedBounds, queryCapsule: boxOracle([rotatedWall]) })
    expect(original.status).toBe('route')
    expect(rotated.status).toBe('route')
    if (original.status === 'route' && rotated.status === 'route') expect(rotated.length).toBeCloseTo(original.length, 10)
  })

  it('rejects a diagonal corner shortcut and returns only oracle-clear path edges', () => {
    const calls: Array<readonly [Vec3, Vec3]> = []
    const obstacle: Box = { min: { x: .8, y: .8, z: .8 }, max: { x: 1.2, y: 1.2, z: 1.2 } }
    const result = plan({ start: { x: .2, y: .2, z: .2 }, target: { x: 1.8, y: 1.8, z: 1.8 }, queryCapsule: boxOracle([obstacle], calls), fishClearanceRadius: 0, spacingM: .4 })
    expect(result.status).toBe('route')
    if (result.status !== 'route') return
    expect(result.path.length).toBeGreaterThan(2)
    expect(calls.some(([a, b]) => a.x === .2 && b.x === 1.8)).toBe(true)
    expect(result.work.collisionQueries).toBeGreaterThan(0)
  })

  it('treats query tangency as blocked and keeps an alternate verified route', () => {
    const direct: Array<readonly [Vec3, Vec3]> = []
    const query: CapsuleClearanceQuery = (start, end) => {
      direct.push([start, end])
      return start.x === .2 && end.x === 3.8 && start.y === end.y && start.z === end.z ? blocked : clear
    }
    const result = plan({ start: { x: .2, y: 2, z: 2 }, target: { x: 3.8, y: 2, z: 2 }, queryCapsule: query })
    expect(result.status).toBe('route')
    if (result.status === 'route') expect(result.path.length).toBeGreaterThan(2)
    expect(direct.some(([a, b]) => a.x === .2 && b.x === 3.8)).toBe(true)
  })

  it('returns blocked for a solid start or target', () => {
    const solid: Box = { min: { x: .4, y: .4, z: .4 }, max: { x: 1.4, y: 1.4, z: 1.4 } }
    expect(plan({ start: { x: .8, y: .8, z: .8 }, target: { x: 3, y: 3, z: 3 }, queryCapsule: boxOracle([solid]) })).toMatchObject({ status: 'blocked', reason: 'start-blocked' })
    expect(plan({ start: { x: 3, y: 3, z: 3 }, target: { x: .8, y: .8, z: .8 }, queryCapsule: boxOracle([solid]) })).toMatchObject({ status: 'blocked', reason: 'target-blocked' })
  })

  it('reports cumulative oracle work exhaustion distinctly', () => {
    const query: CapsuleClearanceQuery = (_start, _end, _radius, remaining) => remaining.maxNodeVisits > 0
      ? { status: 'clear', work: { nodeVisits: 1, triangleTests: 1 } }
      : { status: 'indeterminate', reason: 'query work budget exhausted', work: { nodeVisits: 0, triangleTests: 0 } }
    const result = plan({ start: { x: .5, y: .5, z: .5 }, target: { x: 3.5, y: 3.5, z: 3.5 }, queryCapsule: query,
      budget: { maxNodeVisits: 2, maxTriangleTests: 20 } })
    expect(result).toMatchObject({ status: 'work-limit', reason: 'collision-query-work-limit' })
    expect(result.work.nodeVisits).toBe(2)
  })

  it('continues past a locally exhausted edge query when another verified route exists', () => {
    const start = { x: .5, y: .5, z: .5 }, target = { x: 3.5, y: 3.5, z: 3.5 }
    const query: CapsuleClearanceQuery = (a, b) => {
      if (a.x === start.x && a.y === start.y && a.z === start.z && b.x === .1 && b.y === .1 && b.z === .1)
        return { status: 'indeterminate', reason: 'work-budget', work: { nodeVisits: 1, triangleTests: 1 } }
      if (a.x === start.x && a.y === start.y && a.z === start.z && b.x === target.x && b.y === target.y && b.z === target.z) return blocked
      return clear
    }
    const result = plan({ start, target, queryCapsule: query })
    expect(result.status).toBe('route')
    if (result.status === 'route') expect(result.path.length).toBeGreaterThan(2)
  })

  it('distinguishes indeterminate collision data from a fully exhausted lattice', () => {
    const query: CapsuleClearanceQuery = () => ({ status: 'indeterminate', reason: 'inside parity ambiguous', work: { nodeVisits: 1, triangleTests: 1 } })
    expect(plan({ start: { x: .5, y: .5, z: .5 }, target: { x: 3.5, y: 3.5, z: 3.5 }, queryCapsule: query })).toMatchObject({ status: 'unavailable', reason: 'inside parity ambiguous' })
  })

  it('reports a lattice size beyond budget without partial paths', () => {
    const query: CapsuleClearanceQuery = (start, end) => start.x === end.x && start.y === end.y && start.z === end.z ? clear : blocked
    const result = plan({ start: { x: .5, y: .5, z: .5 }, target: { x: 3.5, y: 3.5, z: 3.5 }, queryCapsule: query,
      spacingM: .1, budget: { maxLatticeNodes: 100 } })
    expect(result).toMatchObject({ status: 'work-limit', reason: 'lattice-node-budget-exceeded' })
  })

  it('checks an exact direct route before refusing an oversized fallback lattice', () => {
    const result = plan({ start: { x: .5, y: .5, z: .5 }, target: { x: 3.5, y: 3.5, z: 3.5 }, queryCapsule: () => clear,
      spacingM: .1, budget: { maxLatticeNodes: 100 } })
    expect(result).toMatchObject({ status: 'route', path: [{ x: .5, y: .5, z: .5 }, { x: 3.5, y: 3.5, z: 3.5 }] })
  })

  it('preflights tiny spacing without allocating a huge lattice', () => {
    const query: CapsuleClearanceQuery = (start, end) => start.x === end.x && start.y === end.y && start.z === end.z ? clear : blocked
    const result = findMeshRoute({ start: { x: .2, y: .2, z: .2 }, target: { x: .8, y: .8, z: .8 }, waterBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      fishClearanceRadius: 0, spacingM: 1e-300, queryCapsule: query })
    expect(result).toMatchObject({ status: 'work-limit', reason: 'lattice-dimension-budget-exceeded' })
  })

  it('enforces hard planner ceilings before querying or allocating caller-sized work', () => {
    let calls = 0
    const result = findMeshRoute({ start: { x: .2, y: .2, z: .2 }, target: { x: .8, y: .8, z: .8 }, waterBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      fishClearanceRadius: 0, spacingM: 1e-300, queryCapsule: () => { calls++; return clear },
      budget: { maxLatticeNodes: Number.MAX_SAFE_INTEGER } })
    expect(result).toMatchObject({ status: 'unavailable', reason: 'invalid-search-budget' })
    expect(calls).toBe(0)
  })

  it('isolates caller points from a mutating clearance callback', () => {
    const start = { x: .5, y: 1, z: 1 }, target = { x: 3.5, y: 1, z: 1 }
    const query = ((a: Vec3, b: Vec3) => {
      ;(a as { x: number }).x = 1000
      ;(b as { x: number }).x = -1000
      return clear
    }) as CapsuleClearanceQuery
    const result = plan({ start, target, queryCapsule: query })
    expect(start.x).toBe(.5)
    expect(target.x).toBe(3.5)
    expect(result).toMatchObject({ status: 'route', path: [{ x: .5, y: 1, z: 1 }, { x: 3.5, y: 1, z: 1 }] })
  })

  it('snapshots radius, spacing, bounds, and callback before invoking external code', () => {
    const radii: number[] = []
    let input!: MeshNavigationInput
    const replacement: CapsuleClearanceQuery = () => blocked
    const query: CapsuleClearanceQuery = (_start, _end, radiusM) => {
      radii.push(radiusM)
      input.fishClearanceRadius = 5
      input.spacingM = 3
      ;(input.waterBounds.max as unknown as { x: number; y: number; z: number }).x = 0
      input.queryCapsule = replacement
      return clear
    }
    input = { start: { x: .5, y: 1, z: 1 }, target: { x: 3.5, y: 1, z: 1 }, waterBounds: { min: { ...bounds.min }, max: { ...bounds.max } },
      fishClearanceRadius: .1, spacingM: .5, queryCapsule: query }
    const result = findMeshRoute(input)
    expect(result).toMatchObject({ status: 'route', resolutionM: .5, path: [{ x: .5, y: 1, z: 1 }, { x: 3.5, y: 1, z: 1 }] })
    expect(radii).toEqual([.1, .1, .1])
  })

  it('returns unavailable for a null runtime input instead of throwing', () => {
    expect(findMeshRoute(null as unknown as MeshNavigationInput)).toMatchObject({ status: 'unavailable', reason: 'invalid-navigation-input' })
  })

  it('rejects finite coordinates whose spans or route length overflow before invoking the oracle', () => {
    let calls = 0
    const queryCapsule: CapsuleClearanceQuery = () => { calls++; return clear }
    const overflowBounds = { min: { x: -Number.MAX_VALUE, y: -1, z: -1 }, max: { x: Number.MAX_VALUE, y: 1, z: 1 } }
    expect(findMeshRoute({ start: { x: 0, y: 0, z: 0 }, target: { x: 1, y: 0, z: 0 }, waterBounds: overflowBounds,
      fishClearanceRadius: 0, spacingM: 1, queryCapsule })).toMatchObject({ status: 'unavailable', reason: 'invalid-water-bounds' })
    const large = 1.1e308
    expect(findMeshRoute({ start: { x: 0, y: 0, z: 0 }, target: { x: large, y: large, z: large },
      waterBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: large, y: large, z: large } },
      fishClearanceRadius: 0, spacingM: 1, queryCapsule })).toMatchObject({ status: 'unavailable', reason: 'nonfinite-route-distance' })
    expect(calls).toBe(0)
  })

  it('returns unavailable for malformed query responses instead of certifying a route', () => {
    const malformed = (() => undefined) as unknown as CapsuleClearanceQuery
    expect(plan({ start: { x: .5, y: .5, z: .5 }, target: { x: 3, y: 3, z: 3 }, queryCapsule: malformed })).toMatchObject({
      status: 'unavailable', reason: 'collision-query-returned-invalid-response',
    })
  })

  it('returns a deterministic path for identical inputs', () => {
    const wall: Box = { min: { x: 1.8, y: 0, z: 0 }, max: { x: 2.2, y: 4, z: 1.2 } }
    const input = { start: { x: .5, y: 2, z: .8 }, target: { x: 3.5, y: 2, z: .8 }, queryCapsule: boxOracle([wall]) }
    expect(plan(input)).toEqual(plan(input))
  })
})
