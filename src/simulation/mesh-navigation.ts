import type { AxisAlignedBox, MaxAbsXAtDepth, Vec3 } from './habitat-navigation'

export type MeshNavigationWork = Readonly<{ nodeVisits: number; triangleTests: number }>
export type MeshNavigationWorkBudget = Readonly<{ maxNodeVisits: number; maxTriangleTests: number }>
export type CapsuleQueryResult = Readonly<{
  status: 'clear' | 'blocked' | 'indeterminate'
  reason?: string
  work: MeshNavigationWork
}>
export type CapsuleClearanceQuery = (
  start: Vec3,
  end: Vec3,
  radiusM: number,
  remainingWork: MeshNavigationWorkBudget,
) => CapsuleQueryResult

export type MeshNavigationBudget = Readonly<{
  maxLatticeNodes: number
  maxExpandedNodes: number
  maxCollisionQueries: number
  maxNodeVisits: number
  maxTriangleTests: number
}>

export type MeshNavigationInput = {
  start: Vec3
  target: Vec3
  waterBounds: AxisAlignedBox
  fishClearanceRadius: number
  spacingM: number
  queryCapsule: CapsuleClearanceQuery
  budget?: Partial<MeshNavigationBudget>
  maxAbsXAtDepth?: MaxAbsXAtDepth
  lateralClearanceRadius?: number
}

export type MeshNavigationWorkReport = MeshNavigationWork & Readonly<{
  collisionQueries: number
  expandedNodes: number
  latticeNodes: number
  latticeDimensions: readonly [number, number, number]
}>

export type MeshNavigationResult =
  | { status: 'route'; path: readonly Vec3[]; length: number; resolutionM: number; work: MeshNavigationWorkReport }
  | { status: 'blocked'; reason: 'start-blocked' | 'target-blocked' | 'resolution-limited-lattice-exhausted'; resolutionM: number; work: MeshNavigationWorkReport }
  | { status: 'unavailable'; reason: string; resolutionM: number; work: MeshNavigationWorkReport }
  | { status: 'work-limit'; reason: string; resolutionM: number; work: MeshNavigationWorkReport }

const DEFAULT_BUDGET: MeshNavigationBudget = {
  maxLatticeNodes: 4096,
  maxExpandedNodes: 4096,
  maxCollisionQueries: 50_000,
  maxNodeVisits: 250_000,
  maxTriangleTests: 2_000_000,
}
// Hard request ceilings keep caller-supplied values from disabling the planner's work bounds.
const MAX_BUDGET: MeshNavigationBudget = {
  maxLatticeNodes: 16_384,
  maxExpandedNodes: 16_384,
  maxCollisionQueries: 100_000,
  maxNodeVisits: 2_000_000,
  maxTriangleTests: 10_000_000,
}
const AXES = ['x', 'y', 'z'] as const
const OFFSETS: readonly (readonly [number, number, number])[] = (() => {
  const values: Array<readonly [number, number, number]> = []
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x || y || z) values.push([x, y, z])
  }
  return values
})()

type GridNode = { id: number; index: readonly [number, number, number]; position: Vec3; checked: boolean; clear: boolean }
type HeapEntry = { node: number; cost: number; estimate: number }

function finiteVec(point: Vec3): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

function pointKey(point: Vec3): string {
  return `${point.x === 0 ? 0 : point.x},${point.y === 0 ? 0 : point.y},${point.z === 0 ? 0 : point.z}`
}

function axisCount(minimum: number, maximum: number, spacing: number): number | undefined {
  const intervals = Math.ceil((maximum - minimum) / spacing)
  const count = intervals + 1
  return Number.isSafeInteger(count) && count >= 2 ? count : undefined
}

function axisCoordinates(minimum: number, maximum: number, spacing: number, count: number): number[] {
  const last = count - 1
  return Array.from({ length: count }, (_, index) => index === last ? maximum : minimum + index * spacing)
}

function coordinateNeighbors(values: readonly number[], coordinate: number): number[] {
  let insertion = values.findIndex((value) => value >= coordinate)
  if (insertion < 0) insertion = values.length - 1
  const selected = new Set<number>()
  for (let index = Math.max(0, insertion - 1); index <= Math.min(values.length - 1, insertion + 1); index++) selected.add(index)
  return [...selected].sort((a, b) => a - b)
}

function compareHeap(a: HeapEntry, b: HeapEntry): number {
  return a.estimate - b.estimate || a.cost - b.cost || a.node - b.node
}

function heapPush(heap: HeapEntry[], value: HeapEntry): void {
  let index = heap.length
  heap.push(value)
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2)
    if (compareHeap(heap[parent], value) <= 0) break
    heap[index] = heap[parent]
    index = parent
  }
  heap[index] = value
}

function heapPop(heap: HeapEntry[]): HeapEntry | undefined {
  const first = heap[0]
  const last = heap.pop()
  if (!first || !last || !heap.length) return first
  let index = 0
  while (true) {
    const left = index * 2 + 1, right = left + 1
    if (left >= heap.length) break
    const child = right < heap.length && compareHeap(heap[right], heap[left]) < 0 ? right : left
    if (compareHeap(last, heap[child]) <= 0) break
    heap[index] = heap[child]
    index = child
  }
  heap[index] = last
  return first
}

function pointAt(index: readonly [number, number, number], axes: readonly [number[], number[], number[]]): Vec3 {
  return { x: axes[0][index[0]], y: axes[1][index[1]], z: axes[2][index[2]] }
}

function validBudget(budget: MeshNavigationBudget): boolean {
  return Object.entries(budget).every(([key, value]) => Number.isSafeInteger(value) && value > 0
    && value <= MAX_BUDGET[key as keyof MeshNavigationBudget])
}

/**
 * Searches a finite, deterministic 3D lattice. Every accepted node and edge
 * has a clear continuous capsule-query result; an exhausted lattice is only a
 * resolution-limited failure, not a proof that continuous water has no route.
 */
export function findMeshRoute(input: MeshNavigationInput): MeshNavigationResult {
  const budget = { ...DEFAULT_BUDGET, ...(input && typeof input === 'object' ? input.budget : undefined) }
  const spacingM = input?.spacingM ?? 0
  const fishClearanceRadius = input?.fishClearanceRadius ?? Number.NaN
  const lateralClearanceRadius = input?.lateralClearanceRadius ?? fishClearanceRadius
  const queryCapsule = input?.queryCapsule
  const invalidPoint = { x: Number.NaN, y: Number.NaN, z: Number.NaN }
  const start = input?.start && typeof input.start === 'object' ? { ...input.start } : invalidPoint
  const target = input?.target && typeof input.target === 'object' ? { ...input.target } : invalidPoint
  const waterBounds = input?.waterBounds && typeof input.waterBounds === 'object'
    ? { min: input.waterBounds.min && typeof input.waterBounds.min === 'object' ? { ...input.waterBounds.min } : invalidPoint,
      max: input.waterBounds.max && typeof input.waterBounds.max === 'object' ? { ...input.waterBounds.max } : invalidPoint }
    : { min: invalidPoint, max: invalidPoint }
  const work = { nodeVisits: 0, triangleTests: 0, collisionQueries: 0, expandedNodes: 0 }
  let latticeNodeCount = 0
  let latticeDimensions: readonly [number, number, number] = [0, 0, 0]
  const report = (): MeshNavigationWorkReport => ({ ...work, latticeNodes: latticeNodeCount, latticeDimensions })
  const unavailable = (reason: string, workReport = report()): MeshNavigationResult => ({ status: 'unavailable', reason, resolutionM: spacingM, work: workReport })
  const resultBlocked = (reason: Extract<MeshNavigationResult, { status: 'blocked' }>['reason']): MeshNavigationResult => ({ status: 'blocked', reason, resolutionM: spacingM, work: report() })
  const resultWorkLimit = (reason: string): MeshNavigationResult => ({ status: 'work-limit', reason, resolutionM: spacingM, work: report() })
  if (!validBudget(budget)) return unavailable('invalid-search-budget')
  if (typeof queryCapsule !== 'function' || !finiteVec(start) || !finiteVec(target)
    || !finiteVec(waterBounds.min) || !finiteVec(waterBounds.max)
    || !Number.isFinite(fishClearanceRadius) || fishClearanceRadius < 0
    || !Number.isFinite(lateralClearanceRadius) || lateralClearanceRadius < 0
    || !Number.isFinite(spacingM) || spacingM <= 0) return unavailable('invalid-navigation-input')
  for (const axis of AXES) if (!(waterBounds.min[axis] < waterBounds.max[axis])
    || !Number.isFinite(waterBounds.max[axis] - waterBounds.min[axis])) return unavailable('invalid-water-bounds')
  if (!Number.isFinite(distance(start, target))) return unavailable('nonfinite-route-distance')

  const safeBounds = {
    min: {
      x: waterBounds.min.x + lateralClearanceRadius,
      y: waterBounds.min.y + fishClearanceRadius,
      z: waterBounds.min.z + fishClearanceRadius,
    },
    max: {
      x: waterBounds.max.x - lateralClearanceRadius,
      y: waterBounds.max.y - fishClearanceRadius,
      z: waterBounds.max.z - fishClearanceRadius,
    },
  }
  for (const axis of AXES) if (!(safeBounds.min[axis] < safeBounds.max[axis])) return unavailable('clearance-collapses-water-bounds')
  const insideSafeWater = (point: Vec3) => {
    if (!AXES.every((axis) => point[axis] >= safeBounds.min[axis] && point[axis] <= safeBounds.max[axis])) return false
    if (!input.maxAbsXAtDepth) return true
    try {
      const maxAbsX = input.maxAbsXAtDepth(point.z)
      return Number.isFinite(maxAbsX) && maxAbsX >= lateralClearanceRadius && Math.abs(point.x) <= maxAbsX - lateralClearanceRadius
    } catch {
      return false
    }
  }
  if (!insideSafeWater(start) || !insideSafeWater(target)) return unavailable('endpoint-outside-clearance-shrunk-water-bounds')

  let sawIndeterminate = false
  let sawQueryWorkLimit = false
  let queryError: string | undefined
  let requestWorkLimit: string | undefined
  let lastIndeterminateReason: string | undefined
  const queryCache = new Map<string, 'clear' | 'blocked' | 'indeterminate'>()
  const query = (start: Vec3, end: Vec3): 'clear' | 'blocked' | 'indeterminate' => {
    const startKey = pointKey(start), endKey = pointKey(end)
    const key = startKey <= endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`
    const cached = queryCache.get(key)
    if (cached) return cached
    if (work.collisionQueries >= budget.maxCollisionQueries) {
      requestWorkLimit = 'collision-query-work-limit'
      sawIndeterminate = true
      return 'indeterminate'
    }
    const remaining = { maxNodeVisits: budget.maxNodeVisits - work.nodeVisits, maxTriangleTests: budget.maxTriangleTests - work.triangleTests }
    if (remaining.maxNodeVisits <= 0 || remaining.maxTriangleTests <= 0) {
      requestWorkLimit = 'collision-query-work-limit'
      sawIndeterminate = true
      return 'indeterminate'
    }
    work.collisionQueries++
    let answer: CapsuleQueryResult
    try {
      answer = queryCapsule!({ ...start }, { ...end }, fishClearanceRadius, { ...remaining })
    } catch (error) {
      queryError = error instanceof Error ? error.message : String(error)
      sawIndeterminate = true
      queryCache.set(key, 'indeterminate')
      return 'indeterminate'
    }
    if (!answer || typeof answer !== 'object' || !['clear', 'blocked', 'indeterminate'].includes(answer.status)) {
      queryError = 'collision-query-returned-invalid-response'
      sawIndeterminate = true
      queryCache.set(key, 'indeterminate')
      return 'indeterminate'
    }
    const { nodeVisits, triangleTests } = answer.work ?? { nodeVisits: -1, triangleTests: -1 }
    if (!Number.isSafeInteger(nodeVisits) || nodeVisits < 0 || !Number.isSafeInteger(triangleTests) || triangleTests < 0) {
      queryError = 'collision-query-returned-invalid-work-counts'
      sawIndeterminate = true
      queryCache.set(key, 'indeterminate')
      return 'indeterminate'
    }
    work.nodeVisits += nodeVisits
    work.triangleTests += triangleTests
    if (work.nodeVisits > budget.maxNodeVisits || work.triangleTests > budget.maxTriangleTests) {
      requestWorkLimit = 'collision-query-exceeded-remaining-work-budget'
      sawIndeterminate = true
      queryCache.set(key, 'indeterminate')
      return 'indeterminate'
    }
    if (answer.status === 'indeterminate') {
      sawIndeterminate = true
      if (typeof answer.reason === 'string' && answer.reason) lastIndeterminateReason = answer.reason
      if (/budget|work-limit|exhaust/i.test(answer.reason ?? '')) sawQueryWorkLimit = true
      if (work.nodeVisits >= budget.maxNodeVisits || work.triangleTests >= budget.maxTriangleTests) requestWorkLimit = 'collision-query-work-limit'
    }
    const status = answer.status === 'clear' || answer.status === 'blocked' || answer.status === 'indeterminate' ? answer.status : 'indeterminate'
    queryCache.set(key, status)
    return status
  }
  const testPoint = (node: GridNode): boolean => {
    if (node.checked) return node.clear
    node.checked = true
    if (!insideSafeWater(node.position)) return false
    const result = query(node.position, node.position)
    node.clear = result === 'clear'
    return node.clear
  }

  const startStatus = query(start, start)
  if (startStatus === 'blocked') return resultBlocked('start-blocked')
  if (startStatus === 'indeterminate') return requestWorkLimit || sawQueryWorkLimit ? resultWorkLimit(requestWorkLimit ?? 'per-query-work-limit') : unavailable(queryError ?? lastIndeterminateReason ?? 'start-clearance-unavailable')
  const targetStatus = query(target, target)
  if (targetStatus === 'blocked') return resultBlocked('target-blocked')
  if (targetStatus === 'indeterminate') return requestWorkLimit || sawQueryWorkLimit ? resultWorkLimit(requestWorkLimit ?? 'per-query-work-limit') : unavailable(queryError ?? lastIndeterminateReason ?? 'target-clearance-unavailable')
  if (pointKey(start) === pointKey(target)) return { status: 'route', path: [{ ...start }], length: 0, resolutionM: spacingM, work: report() }
  const directStatus = query(start, target)
  if (directStatus === 'clear') return { status: 'route', path: [{ ...start }, { ...target }], length: distance(start, target), resolutionM: spacingM, work: report() }
  if (queryError) return unavailable(queryError)
  if (requestWorkLimit) return resultWorkLimit(requestWorkLimit)
  if (work.collisionQueries >= budget.maxCollisionQueries || work.nodeVisits >= budget.maxNodeVisits || work.triangleTests >= budget.maxTriangleTests) return resultWorkLimit('collision-query-budget-exceeded')
  sawIndeterminate = directStatus === 'indeterminate'

  const countValues = AXES.map((axis) => axisCount(safeBounds.min[axis], safeBounds.max[axis], spacingM))
  if (countValues.some((count) => count === undefined)) return resultWorkLimit('lattice-dimension-budget-exceeded')
  const dimensions = countValues as [number, number, number]
  latticeDimensions = dimensions
  let product = 1
  for (const count of dimensions) {
    if (product > Math.floor(budget.maxLatticeNodes / count)) return resultWorkLimit('lattice-node-budget-exceeded')
    product *= count
  }
  latticeNodeCount = product
  const axes = AXES.map((axis, index) => axisCoordinates(safeBounds.min[axis], safeBounds.max[axis], spacingM, dimensions[index])) as [number[], number[], number[]]
  if (axes.some((values) => values.some((value, index) => index > 0 && !(value > values[index - 1])))) return unavailable('lattice-resolution-below-coordinate-precision')

  const latticeNodes: GridNode[] = []
  const grid = new Map<string, number>()
  for (let ix = 0; ix < dimensions[0]; ix++) for (let iy = 0; iy < dimensions[1]; iy++) for (let iz = 0; iz < dimensions[2]; iz++) {
    const index = [ix, iy, iz] as const
    const id = latticeNodes.length + 2
    const node = { id, index, position: pointAt(index, axes), checked: false, clear: false }
    latticeNodes.push(node)
    grid.set(`${ix},${iy},${iz}`, id)
  }

  const startConnectors = new Set<number>()
  const targetConnectors = new Set<number>()
  const connectorsFor = (point: Vec3, destination: Set<number>) => {
    const neighbors = AXES.map((axis, dimension) => coordinateNeighbors(axes[dimension], point[axis])) as [number[], number[], number[]]
    for (const ix of neighbors[0]) for (const iy of neighbors[1]) for (const iz of neighbors[2]) destination.add(grid.get(`${ix},${iy},${iz}`)!)
  }
  connectorsFor(start, startConnectors)
  connectorsFor(target, targetConnectors)
  const points = new Map<number, Vec3>([[0, start], [1, target], ...latticeNodes.map((node) => [node.id, node.position] as const)])
  const edgeCache = new Map<string, boolean>()
  const edgeClear = (a: number, b: number): boolean => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    if (edgeCache.has(key)) return edgeCache.get(key)!
    const answer = query(points.get(a)!, points.get(b)!)
    const clear = answer === 'clear'
    edgeCache.set(key, clear)
    return clear
  }
  const neighborIds = (id: number): number[] => {
    if (id === 0) return [1, ...startConnectors].sort((a, b) => a - b)
    if (id === 1) return []
    const node = latticeNodes[id - 2]
    const [ix, iy, iz] = node.index
    const neighbors = new Set<number>()
    for (const [dx, dy, dz] of OFFSETS) {
      const x = ix + dx, y = iy + dy, z = iz + dz
      if (x < 0 || y < 0 || z < 0 || x >= dimensions[0] || y >= dimensions[1] || z >= dimensions[2]) continue
      neighbors.add(grid.get(`${x},${y},${z}`)!)
    }
    if (targetConnectors.has(id)) neighbors.add(1)
    return [...neighbors].sort((a, b) => a - b)
  }

  const distances = new Map<number, number>([[0, 0]])
  const previous = new Map<number, number>()
  const closed = new Set<number>()
  const heap: HeapEntry[] = [{ node: 0, cost: 0, estimate: distance(start, target) }]
  let routeNode = -1
  while (heap.length) {
    const current = heapPop(heap)!
    if (closed.has(current.node) || current.cost !== distances.get(current.node)) continue
    if (current.node === 1) { routeNode = 1; break }
    if (work.expandedNodes >= budget.maxExpandedNodes) return resultWorkLimit('expanded-node-budget-exceeded')
    closed.add(current.node)
    work.expandedNodes++
    if (current.node >= 2 && !testPoint(latticeNodes[current.node - 2])) continue
    for (const candidate of neighborIds(current.node)) {
      if (closed.has(candidate)) continue
      if (candidate >= 2 && !testPoint(latticeNodes[candidate - 2])) continue
      if (!edgeClear(current.node, candidate)) {
        if (requestWorkLimit || work.collisionQueries >= budget.maxCollisionQueries || work.nodeVisits >= budget.maxNodeVisits || work.triangleTests >= budget.maxTriangleTests) return resultWorkLimit(requestWorkLimit ?? 'collision-query-budget-exceeded')
        continue
      }
      const nextCost = current.cost + distance(points.get(current.node)!, points.get(candidate)!)
      if (nextCost < (distances.get(candidate) ?? Number.POSITIVE_INFINITY)) {
        distances.set(candidate, nextCost)
        previous.set(candidate, current.node)
        heapPush(heap, { node: candidate, cost: nextCost, estimate: nextCost + distance(points.get(candidate)!, target) })
      }
    }
    if (queryError) return unavailable(queryError, report())
  }
  if (routeNode < 0) {
    if (queryError) return unavailable(queryError, report())
    if (requestWorkLimit || work.collisionQueries >= budget.maxCollisionQueries || work.nodeVisits >= budget.maxNodeVisits || work.triangleTests >= budget.maxTriangleTests) return resultWorkLimit(requestWorkLimit ?? 'collision-query-budget-exceeded')
    if (sawQueryWorkLimit) return resultWorkLimit('per-query-work-limit')
    if (work.collisionQueries >= budget.maxCollisionQueries || work.nodeVisits >= budget.maxNodeVisits || work.triangleTests >= budget.maxTriangleTests) return resultWorkLimit('collision-query-budget-exceeded')
    return sawIndeterminate
      ? unavailable(lastIndeterminateReason ?? 'collision-query-indeterminate', report())
      : { status: 'blocked', reason: 'resolution-limited-lattice-exhausted', resolutionM: spacingM, work: report() }
  }
  const indices = [routeNode]
  while (indices[0] !== 0) {
    const parent = previous.get(indices[0])
    if (parent === undefined) return unavailable('route-parent-chain-incomplete', report())
    indices.unshift(parent)
  }
  const path = indices.map((index) => ({ ...points.get(index)! }))
  return { status: 'route', path, length: distances.get(routeNode)!, resolutionM: spacingM, work: report() }
}
