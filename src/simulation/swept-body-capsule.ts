import type { Vec3 } from './habitat-navigation'
import type { CapsuleClearanceQuery, CapsuleQueryResult, MeshNavigationWorkBudget } from './mesh-navigation'

export type BodyCapsuleAxis = Readonly<{ tail: Vec3; nose: Vec3 }>
export type BodyCapsulePose = Readonly<{ center: Vec3; forward: Vec3 }>

const MAX_SLICE_DEPTH = 5

function interpolate(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: (1 - t) * a.x + t * b.x, y: (1 - t) * a.y + t * b.y, z: (1 - t) * a.z + t * b.z }
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

function offset(a: Vec3, b: Vec3, scale: number): Vec3 {
  return { x: a.x + b.x * scale, y: a.y + b.y * scale, z: a.z + b.z * scale }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
}

function normalized(vector: Vec3): Vec3 | undefined {
  const length = Math.hypot(vector.x, vector.y, vector.z)
  if (!Number.isFinite(length) || length === 0) return undefined
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

function invalidSweep(reason = 'invalid-body-sweep'): CapsuleQueryResult {
  return { status: 'indeterminate', reason, work: { nodeVisits: 0, triangleTests: 0 } }
}

function querySweep(
  query: CapsuleClearanceQuery,
  radiusM: number,
  budget: MeshNavigationWorkBudget,
  poseAt: (time: number) => BodyCapsuleAxis,
  paddingAt: (halfInterval: number) => number,
): CapsuleQueryResult {
  if (!Number.isFinite(radiusM) || radiusM < 0
    || !Number.isSafeInteger(budget.maxNodeVisits) || budget.maxNodeVisits <= 0
    || !Number.isSafeInteger(budget.maxTriangleTests) || budget.maxTriangleTests <= 0) {
    return invalidSweep()
  }
  const work = { nodeVisits: 0, triangleTests: 0 }
  const indeterminate = (reason: string) => ({ status: 'indeterminate' as const, reason, work })

  function check({ tail, nose }: BodyCapsuleAxis, radius: number): CapsuleQueryResult {
    if (![tail.x, tail.y, tail.z, nose.x, nose.y, nose.z, radius].every(Number.isFinite)) {
      return indeterminate('invalid-body-sweep')
    }
    const maxNodeVisits = budget.maxNodeVisits - work.nodeVisits
    const maxTriangleTests = budget.maxTriangleTests - work.triangleTests
    if (maxNodeVisits <= 0 || maxTriangleTests <= 0) return indeterminate('work-budget')
    let result: CapsuleQueryResult
    try {
      result = query({ ...tail }, { ...nose }, radius, { maxNodeVisits, maxTriangleTests })
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
    const axis = poseAt(mid)
    const padding = paddingAt((high - low) / 2)
    const padded = check(axis, radiusM + padding)
    if (padding === 0 || padded.status !== 'blocked') return padded
    const midpoint = check(axis, radiusM)
    if (midpoint.status !== 'clear') return midpoint
    if (depth === MAX_SLICE_DEPTH) return indeterminate('body-sweep-resolution')
    const first = slice(low, mid, depth + 1)
    if (first.status === 'blocked' || (first.status === 'indeterminate' && first.reason !== 'body-sweep-resolution')) return first
    const second = slice(mid, high, depth + 1)
    return second.status === 'clear' ? first : second
  }

  return slice(0, 1, 0)
}

/** Sweep a capsule with linearly moving endpoints. A padded, clear slice
 * certifies clearance. Only a real body pose can certify contact. */
export function querySweptBodyCapsule(
  query: CapsuleClearanceQuery,
  from: BodyCapsuleAxis,
  to: BodyCapsuleAxis,
  radiusM: number,
  budget: MeshNavigationWorkBudget,
): CapsuleQueryResult {
  const fromAxisLength = distance(from.tail, from.nose)
  const toAxisLength = distance(to.tail, to.nose)
  const endpointTravel = Math.max(distance(from.tail, to.tail), distance(from.nose, to.nose))
  if (![fromAxisLength, toAxisLength, endpointTravel].every(Number.isFinite)) return invalidSweep()
  if (endpointTravel === 0) return querySweep(query, radiusM, budget, () => from, () => 0)
  // The linear sweep of a sphere is exactly one capsule, including its ends.
  if (fromAxisLength === 0 && toAxisLength === 0) {
    return querySweep(query, radiusM, budget, () => ({ tail: from.tail, nose: to.tail }), () => 0)
  }
  // Displacement at any fixed fraction of the axis is a convex combination
  // of the endpoint displacements, so the greater travel bounds the slice.
  return querySweep(query, radiusM, budget, time => ({
    tail: interpolate(from.tail, to.tail, time),
    nose: interpolate(from.nose, to.nose, time),
  }), halfInterval => endpointTravel * halfInterval)
}

/** Sweep a fixed-size capsule along a linearly moving center and a
 * constant-rate shortest arc of its forward direction. The input radius
 * must already cover any internal skeletal or shader deformation. */
export function querySweptRigidBodyCapsule(
  query: CapsuleClearanceQuery,
  from: BodyCapsulePose,
  to: BodyCapsulePose,
  halfAxisM: number,
  radiusM: number,
  budget: MeshNavigationWorkBudget,
): CapsuleQueryResult {
  const fromDirection = normalized(from.forward), toDirection = normalized(to.forward)
  const centerTravel = distance(from.center, to.center)
  if (!fromDirection || !toDirection || !Number.isFinite(centerTravel) || !Number.isFinite(halfAxisM) || halfAxisM < 0) {
    return invalidSweep()
  }
  const centerAt = (time: number) => interpolate(from.center, to.center, time)
  if (halfAxisM === 0) {
    return querySweptBodyCapsule(query, { tail: from.center, nose: from.center }, { tail: to.center, nose: to.center }, radiusM, budget)
  }

  const cosine = fromDirection.x * toDirection.x + fromDirection.y * toDirection.y + fromDirection.z * toDirection.z
  const axis = cross(fromDirection, toDirection)
  const sine = Math.hypot(axis.x, axis.y, axis.z)
  if (cosine < 0 && sine < 1e-9) return invalidSweep('ambiguous-body-turn')
  const tangentDirection = normalized(cross(axis, fromDirection))
  const angle = Math.atan2(sine, cosine)
  return querySweep(query, radiusM, budget, time => {
    const phase = angle * time
    const c = Math.cos(phase), s = Math.sin(phase)
    const direction = tangentDirection ? {
      x: c * fromDirection.x + s * tangentDirection.x,
      y: c * fromDirection.y + s * tangentDirection.y,
      z: c * fromDirection.z + s * tangentDirection.z,
    } : fromDirection
    const center = centerAt(time)
    return { tail: offset(center, direction, -halfAxisM), nose: offset(center, direction, halfAxisM) }
  }, halfInterval => centerTravel * halfInterval + 2 * halfAxisM * Math.sin(angle * halfInterval / 2))
}
