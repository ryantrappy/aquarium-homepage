import { queryMeshCapsule, type MeshCollider } from './mesh-collision'
import type { CapsuleClearanceQuery, MeshNavigationWorkBudget } from './mesh-navigation'

const PER_QUERY_NODE_VISITS = 4096
const PER_QUERY_TRIANGLE_TESTS = 8192
const MAX_COLLIDERS = 64

/** Bind one static, immutable collision snapshot to both planning and movement.
 * An empty registry means unavailable geometry, not certified empty water. */
export function createMeshClearanceQuery(colliders: readonly MeshCollider[]): CapsuleClearanceQuery {
  const snapshot = Object.freeze(Array.isArray(colliders) ? [...colliders] : [])
  return (start, end, radiusM, remainingWork) => {
    const work = { nodeVisits: 0, triangleTests: 0 }
    const indeterminate = (reason: string) => ({ status: 'indeterminate' as const, reason, work })
    if (!snapshot.length || snapshot.length > MAX_COLLIDERS) return indeterminate('collision-source-unavailable')
    if (!validBudget(remainingWork)) return indeterminate('invalid-or-exhausted-work-budget')
    for (const collider of snapshot) {
      const nodes = remainingWork.maxNodeVisits - work.nodeVisits
      const triangles = remainingWork.maxTriangleTests - work.triangleTests
      if (nodes <= 0 || triangles <= 0) return indeterminate('work-budget')
      const answer = queryMeshCapsule(collider, {
        start, end, radiusM,
        budget: {
          maxNodeVisits: Math.min(PER_QUERY_NODE_VISITS, nodes),
          maxTriangleTests: Math.min(PER_QUERY_TRIANGLE_TESTS, triangles),
        },
      })
      work.nodeVisits += answer.work.nodeVisits
      work.triangleTests += answer.work.triangleTests
      if (answer.status !== 'clear') return { status: answer.status, reason: answer.reason, work }
    }
    return { status: 'clear', reason: 'all-static-meshes-clear', work }
  }
}

function validBudget(budget: MeshNavigationWorkBudget): boolean {
  return Boolean(budget) && Number.isSafeInteger(budget.maxNodeVisits) && budget.maxNodeVisits > 0
    && Number.isSafeInteger(budget.maxTriangleTests) && budget.maxTriangleTests > 0
}
