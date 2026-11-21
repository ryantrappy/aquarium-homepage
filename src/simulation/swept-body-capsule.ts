import type { Vec3 } from './habitat-navigation'
import type { CapsuleClearanceQuery, CapsuleQueryResult, MeshNavigationWorkBudget } from './mesh-navigation'

export type BodyCapsuleAxis = Readonly<{ tail: Vec3; nose: Vec3 }>

const MAX_SLICE_DEPTH = 5

function interpolate(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: (1 - t) * a.x + t * b.x, y: (1 - t) * a.y + t * b.y, z: (1 - t) * a.z + t * b.z }
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

/** Sweeps the full body capsule while each axis endpoint moves linearly.
 * Actual articulated or curved motion needs a separately established margin.
 * A padded slice may prove clearance. Only contact on an unpadded capsule
 * within the sweep can prove blockage. Both consume the same work budget.
 */
export function querySweptBodyCapsule(
  query: CapsuleClearanceQuery,
  from: BodyCapsuleAxis,
  to: BodyCapsuleAxis,
  radiusM: number,
  budget: MeshNavigationWorkBudget,
): CapsuleQueryResult {
  const work = { nodeVisits: 0, triangleTests: 0 }
  const indeterminate = (reason: string) => ({ status: 'indeterminate' as const, reason, work })
  const longestAxis = Math.max(distance(from.tail, from.nose), distance(to.tail, to.nose))
  if (!Number.isFinite(longestAxis) || !Number.isFinite(radiusM) || radiusM < 0
    || !Number.isSafeInteger(budget.maxNodeVisits) || budget.maxNodeVisits <= 0
    || !Number.isSafeInteger(budget.maxTriangleTests) || budget.maxTriangleTests <= 0) {
    return indeterminate('invalid-body-sweep')
  }

  function check(start: Vec3, end: Vec3, radius: number): CapsuleQueryResult {
    if (!Number.isFinite(radius)) return indeterminate('invalid-body-sweep')
    const maxNodeVisits = budget.maxNodeVisits - work.nodeVisits
    const maxTriangleTests = budget.maxTriangleTests - work.triangleTests
    if (maxNodeVisits <= 0 || maxTriangleTests <= 0) return indeterminate('work-budget')
    let result: CapsuleQueryResult
    try {
      result = query({ ...start }, { ...end }, radius, { maxNodeVisits, maxTriangleTests })
    } catch {
      return indeterminate('body-sweep-query-failed')
    }
    const counts = result?.work
    if (!counts || !Number.isSafeInteger(counts.nodeVisits) || counts.nodeVisits < 0 || counts.nodeVisits > maxNodeVisits
      || !Number.isSafeInteger(counts.triangleTests) || counts.triangleTests < 0 || counts.triangleTests > maxTriangleTests
      || !['clear', 'blocked', 'indeterminate'].includes(result.status)) return indeterminate('invalid-body-sweep-query-result')
    work.nodeVisits += counts.nodeVisits
    work.triangleTests += counts.triangleTests
    return { ...result, work }
  }

  function slice(low: number, high: number, depth: number): CapsuleQueryResult {
    const mid = (low + high) / 2
    const start = interpolate(from.tail, from.nose, mid)
    const end = interpolate(to.tail, to.nose, mid)
    // At intermediate times the axis length cannot exceed the longer endpoint
    // length. Thus every point in the slice stays within this midpoint padding.
    const padding = longestAxis * ((high - low) / 2)
    const padded = check(start, end, radiusM + padding)
    if (padding === 0 || padded.status !== 'blocked') return padded
    const midpoint = check(start, end, radiusM)
    if (midpoint.status !== 'clear') return midpoint
    if (depth === MAX_SLICE_DEPTH) return indeterminate('body-sweep-resolution')
    const first = slice(low, mid, depth + 1)
    if (first.status !== 'clear') return first
    return slice(mid, high, depth + 1)
  }

  if (distance(from.tail, to.tail) === 0 && distance(from.nose, to.nose) === 0) {
    return check(from.tail, from.nose, radiusM)
  }

  return slice(0, 1, 0)
}
