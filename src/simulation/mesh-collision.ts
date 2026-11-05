export type MeshPoint = Readonly<{ x: number; y: number; z: number }>
export type MeshTriangle = Readonly<{ a: MeshPoint; b: MeshPoint; c: MeshPoint }>
export type MeshBounds = Readonly<{ min: MeshPoint; max: MeshPoint }>
export type MeshColliderInput = {
  id: string
  sourceSha256: string
  units: 'meter'
  upAxis: '+Y'
  coordinateSpace: 'world'
  triangles: readonly MeshTriangle[]
}
export type MeshCollider = Readonly<{
  id: string; sourceSha256: string; units: 'meter'; upAxis: '+Y'; coordinateSpace: 'world'
  bounds: MeshBounds; triangleCount: number; componentCount: number
}>
export type MeshBuildDiagnostics = {
  triangles: number; vertices: number; components: number; boundaryEdges: number
  nonManifoldEdges: number; nonManifoldVertices: number; inconsistentEdges: number
  duplicateFaces: number; degenerateFaces: number; buildWork: number; bvhNodes: number
  selfIntersectionCheck: 'not-performed'
  solidInterpretation: 'conditional-closed-oriented-manifold; union-of-components'
  sourceHashVerification: 'caller-provenance-only'
}
export type MeshColliderBuildResult =
  | { status: 'ready'; collider: MeshCollider; diagnostics: MeshBuildDiagnostics }
  | { status: 'unavailable'; reason: string; diagnostics: MeshBuildDiagnostics }
export type MeshQueryBudget = { maxNodeVisits?: number; maxTriangleTests?: number }
export type MeshCapsuleQuery = { start: MeshPoint; end: MeshPoint; radiusM: number; budget?: MeshQueryBudget }
export type MeshCollisionResult = {
  status: 'clear' | 'blocked' | 'indeterminate'
  reason: 'boundary-and-interior-clear' | 'surface-contact' | 'inside-solid' | 'work-budget' | 'ambiguous-inside-classification' | 'numerical-ambiguity' | 'invalid-query' | 'invalid-collider'
  sourceId: string; sourceSha256: string
  work: { nodeVisits: number; triangleTests: number }
}

type Point = { x: number; y: number; z: number }
type Bounds = { min: Point; max: Point }
type Face = { a: Point; b: Point; c: Point; center: Point; bounds: Bounds }
type Bvh = { bounds: Bounds; left?: Bvh; right?: Bvh; faces?: number[] }
type Component = { root: Bvh }
type State = { collider: MeshCollider; faces: Face[]; components: Component[] }
const states = new WeakMap<MeshCollider, State>()
const AXES = ['x', 'y', 'z'] as const
const MAX_TRIANGLES = 100_000, MAX_COMPONENTS = 64, MAX_BUILD_WORK = 20_000_000
const SAFETY_M = 1e-6, PLANE_EPS_M = 1e-9, BARY_EPS = 1e-9
const RAY_DIRECTIONS = [{ x: 1, y: .371, z: .529 }, { x: .217, y: 1, z: .613 }, { x: .419, y: .283, z: 1 }]
const sub = (a: MeshPoint, b: MeshPoint): Point => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const add = (a: MeshPoint, b: MeshPoint): Point => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const scale = (a: MeshPoint, n: number): Point => ({ x: a.x * n, y: a.y * n, z: a.z * n })
const dot = (a: MeshPoint, b: MeshPoint) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: MeshPoint, b: MeshPoint): Point => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const length = (p: MeshPoint) => Math.hypot(p.x, p.y, p.z)
const copy = (p: MeshPoint): Point => ({ x: p.x, y: p.y, z: p.z })
const validPoint = (p: MeshPoint) => p && AXES.every(axis => Number.isFinite(p[axis]) && Math.abs(p[axis]) <= 1000)
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
function emptyBounds(): Bounds { return { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } } }
function include(bounds: Bounds, p: MeshPoint) { for (const axis of AXES) { bounds.min[axis] = Math.min(bounds.min[axis], p[axis]); bounds.max[axis] = Math.max(bounds.max[axis], p[axis]) } }

/** Inputs must already have explicit world transforms applied in meter/+Y space.
 * A supplied source hash is provenance, not a cryptographic geometry check. */
export function buildMeshCollider(input: MeshColliderInput): MeshColliderBuildResult {
  const diagnostics: MeshBuildDiagnostics = {
    triangles: 0, vertices: 0, components: 0, boundaryEdges: 0, nonManifoldEdges: 0, nonManifoldVertices: 0,
    inconsistentEdges: 0, duplicateFaces: 0, degenerateFaces: 0, buildWork: 0, bvhNodes: 0,
    selfIntersectionCheck: 'not-performed', solidInterpretation: 'conditional-closed-oriented-manifold; union-of-components', sourceHashVerification: 'caller-provenance-only',
  }
  const unavailable = (reason: string): MeshColliderBuildResult => ({ status: 'unavailable', reason, diagnostics })
  if (!input || typeof input.id !== 'string' || !input.id.trim() || typeof input.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.sourceSha256)
    || input.units !== 'meter' || input.upAxis !== '+Y' || input.coordinateSpace !== 'world') return unavailable('Require an ID, caller source hash and already-applied world-space meter/+Y coordinates')
  if (!Array.isArray(input.triangles) || !input.triangles.length || input.triangles.length > MAX_TRIANGLES) return unavailable('Require 1..100000 triangles')
  const faces: Face[] = [], vertexIds = new Map<string, number>(), faceKeys = new Set<string>()
  const edges = new Map<string, { count: number; direction: number; face: number }>()
  const links = new Map<number, Array<[number, number]>>()
  const parent = input.triangles.map((_, i) => i), rank = parent.map(() => 0)
  const allBounds = emptyBounds()
  const spend = (amount = 1) => { diagnostics.buildWork += amount; if (diagnostics.buildWork > MAX_BUILD_WORK) throw new Error('Build work budget exceeded') }
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] } return i }
  const unite = (a: number, b: number) => { a = find(a); b = find(b); if (a === b) return; if (rank[a] < rank[b]) [a, b] = [b, a]; parent[b] = a; if (rank[a] === rank[b]) rank[a]++ }
  try {
    for (const [index, source] of input.triangles.entries()) {
      spend()
      if (!source || !validPoint(source.a) || !validPoint(source.b) || !validPoint(source.c)) return unavailable('Triangle coordinates must be finite and within 1000 meters of the world origin')
      const a = copy(source.a), b = copy(source.b), c = copy(source.c)
      if (length(cross(sub(b, a), sub(c, a))) <= 1e-12) { diagnostics.degenerateFaces++; return unavailable('Degenerate triangle') }
      const bounds = emptyBounds(); for (const p of [a, b, c]) { include(bounds, p); include(allBounds, p) }
      faces.push({ a, b, c, bounds, center: scale(add(add(a, b), c), 1 / 3) })
      const ids = [a, b, c].map(p => {
        spend(); const key = `${p.x},${p.y},${p.z}`
        if (!vertexIds.has(key)) vertexIds.set(key, vertexIds.size)
        return vertexIds.get(key)!
      })
      const faceKey = [...ids].sort((x, y) => x - y).join(',')
      if (faceKeys.has(faceKey)) diagnostics.duplicateFaces++
      faceKeys.add(faceKey)
      for (let i = 0; i < 3; i++) {
        spend(); const x = ids[i], y = ids[(i + 1) % 3], key = `${Math.min(x, y)},${Math.max(x, y)}`
        const edge = edges.get(key), direction = x < y ? 1 : -1
        if (edge) { edge.count++; edge.direction += direction; unite(index, edge.face) }
        else edges.set(key, { count: 1, direction, face: index })
        const link = links.get(x) ?? []; link.push([y, ids[(i + 2) % 3]]); links.set(x, link)
      }
    }
    diagnostics.triangles = faces.length; diagnostics.vertices = vertexIds.size
    for (const edge of edges.values()) {
      spend()
      if (edge.count === 1) diagnostics.boundaryEdges++
      else if (edge.count !== 2) diagnostics.nonManifoldEdges++
      else if (edge.direction !== 0) diagnostics.inconsistentEdges++
    }
    for (const link of links.values()) {
      const graph = new Map<number, number[]>()
      for (const [a, b] of link) {
        spend(); const aa = graph.get(a) ?? [], bb = graph.get(b) ?? []; aa.push(b); bb.push(a); graph.set(a, aa); graph.set(b, bb)
      }
      const pending = [graph.keys().next().value!], seen = new Set<number>()
      while (pending.length) {
        spend(); const v = pending.pop()!
        if (!seen.has(v)) { seen.add(v); for (const neighbor of graph.get(v)!) pending.push(neighbor) }
      }
      if (seen.size !== graph.size || [...graph.values()].some(v => v.length !== 2)) diagnostics.nonManifoldVertices++
    }
    if (diagnostics.boundaryEdges || diagnostics.nonManifoldEdges || diagnostics.nonManifoldVertices || diagnostics.inconsistentEdges || diagnostics.duplicateFaces) return unavailable('Require a closed, consistently oriented manifold without duplicate faces')
    const components = new Map<number, number[]>()
    for (let i = 0; i < faces.length; i++) { spend(); const root = find(i), list = components.get(root) ?? []; list.push(i); components.set(root, list) }
    diagnostics.components = components.size
    if (components.size > MAX_COMPONENTS) return unavailable('At most 64 closed components are supported')
    const build = (ordered: number[][]): Bvh => {
      diagnostics.bvhNodes++
      const bounds = emptyBounds()
      for (const index of ordered[0]) { spend(); include(bounds, faces[index].bounds.min); include(bounds, faces[index].bounds.max) }
      if (ordered[0].length <= 8) return { bounds, faces: [...ordered[0]] }
      let axis = 0, widest = -Infinity
      for (let i = 0; i < 3; i++) {
        const order = ordered[i], span = faces[order[order.length - 1]].center[AXES[i]] - faces[order[0]].center[AXES[i]]
        if (span > widest) { widest = span; axis = i }
      }
      const leftIds = new Set(ordered[axis].slice(0, Math.floor(ordered[axis].length / 2)))
      const left: number[][] = [], right: number[][] = []
      for (const order of ordered) {
        const a: number[] = [], b: number[] = []
        for (const index of order) { spend(); (leftIds.has(index) ? a : b).push(index) }
        left.push(a); right.push(b)
      }
      return { bounds, left: build(left), right: build(right) }
    }
    const indexed: Component[] = []
    for (const indices of components.values()) {
      const ordered = AXES.map(axis => [...indices].sort((a, b) => { spend(); return faces[a].center[axis] - faces[b].center[axis] || a - b }))
      indexed.push({ root: build(ordered) })
    }
    const collider: MeshCollider = Object.freeze({
      id: input.id, sourceSha256: input.sourceSha256, units: 'meter', upAxis: '+Y', coordinateSpace: 'world',
      bounds: Object.freeze({ min: Object.freeze(copy(allBounds.min)), max: Object.freeze(copy(allBounds.max)) }), triangleCount: faces.length, componentCount: indexed.length,
    })
    states.set(collider, { collider, faces, components: indexed })
    return { status: 'ready', collider, diagnostics }
  } catch (error) { return unavailable(error instanceof Error ? error.message : 'Collider build unavailable') }
}

function segmentBox(a: MeshPoint, b: MeshPoint, box: Bounds, expansion = 0) {
  let first = 0, last = 1
  for (const axis of AXES) {
    const low = box.min[axis] - expansion, high = box.max[axis] + expansion, delta = b[axis] - a[axis]
    if (delta === 0) { if (a[axis] < low || a[axis] > high) return false; continue }
    const t1 = (low - a[axis]) / delta, t2 = (high - a[axis]) / delta
    first = Math.max(first, Math.min(t1, t2)); last = Math.min(last, Math.max(t1, t2))
    if (first > last) return false
  }
  return true
}

function closestTrianglePoint(p: MeshPoint, t: Face): Point {
  const ab = sub(t.b, t.a), ac = sub(t.c, t.a), ap = sub(p, t.a), d1 = dot(ab, ap), d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return t.a
  const bp = sub(p, t.b), d3 = dot(ab, bp), d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return t.b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(t.a, scale(ab, d1 / (d1 - d3)))
  const cp = sub(p, t.c), d5 = dot(ab, cp), d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return t.c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(t.a, scale(ac, d2 / (d2 - d6)))
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(t.b, scale(sub(t.c, t.b), (d4 - d3) / (d4 - d3 + d5 - d6)))
  return add(t.a, add(scale(ab, vb / (va + vb + vc)), scale(ac, vc / (va + vb + vc))))
}

function edgeDistance(a: MeshPoint, b: MeshPoint, c: MeshPoint, d: MeshPoint) {
  const u = sub(b, a), v = sub(d, c), w = sub(a, c), aa = dot(u, u), bb = dot(u, v), cc = dot(v, v), dd = dot(u, w), ee = dot(v, w)
  const normal = cross(u, v), denominator = dot(normal, normal)
  let s = denominator > 0 ? clamp01(dot(cross(v, w), normal) / denominator) : 0
  let t = (bb * s + ee) / cc
  if (t < 0) { t = 0; s = clamp01(-dd / aa) }
  else if (t > 1) { t = 1; s = clamp01((bb - dd) / aa) }
  return length(sub(add(a, scale(u, s)), add(c, scale(v, t))))
}

function capsuleDistance(a: MeshPoint, b: MeshPoint, face: Face) {
  const direction = sub(b, a)
  if (dot(direction, direction) === 0) return length(sub(a, closestTrianglePoint(a, face)))
  const normal = cross(sub(face.b, face.a), sub(face.c, face.a)), denominator = dot(normal, direction)
  if (denominator !== 0) {
    const fraction = dot(normal, sub(face.a, a)) / denominator
    if (fraction >= 0 && fraction <= 1) {
      const point = add(a, scale(direction, fraction))
      if (length(sub(point, closestTrianglePoint(point, face))) <= 1e-12) return 0
    }
  }
  return Math.min(length(sub(a, closestTrianglePoint(a, face))), length(sub(b, closestTrianglePoint(b, face))), edgeDistance(a, b, face.a, face.b), edgeDistance(a, b, face.b, face.c), edgeDistance(a, b, face.c, face.a))
}

function rayFace(a: MeshPoint, b: MeshPoint, face: Face): 'hit' | 'miss' | 'ambiguous' {
  const ab = sub(face.b, face.a), ac = sub(face.c, face.a), rawNormal = cross(ab, ac), normal = scale(rawNormal, 1 / length(rawNormal))
  const from = dot(normal, sub(a, face.a)), to = dot(normal, sub(b, face.a))
  if (from > PLANE_EPS_M && to > PLANE_EPS_M || from < -PLANE_EPS_M && to < -PLANE_EPS_M) return 'miss'
  if (Math.abs(from - to) <= PLANE_EPS_M) return 'ambiguous'
  const fraction = from / (from - to)
  if (fraction < 0 || fraction > 1) return 'miss'
  const point = add(a, scale(sub(b, a), fraction)), ap = sub(point, face.a), area = dot(rawNormal, rawNormal)
  const u = dot(cross(ap, ac), rawNormal) / area, v = dot(cross(ab, ap), rawNormal) / area
  if (u < -BARY_EPS || v < -BARY_EPS || u + v > 1 + BARY_EPS) return 'miss'
  if (u <= BARY_EPS || v <= BARY_EPS || 1 - u - v <= BARY_EPS || fraction <= BARY_EPS || 1 - fraction <= BARY_EPS) return 'ambiguous'
  return 'hit'
}

/** Continuous capsule query. Only `clear` permits movement. Work exhaustion,
 * unresolved parity and invalid inputs never masquerade as empty water. */
export function queryMeshCapsule(collider: MeshCollider, query: MeshCapsuleQuery): MeshCollisionResult {
  const state = states.get(collider), work = { nodeVisits: 0, triangleTests: 0 }
  const result = (status: MeshCollisionResult['status'], reason: MeshCollisionResult['reason']): MeshCollisionResult => ({ status, reason, sourceId: state?.collider.id ?? 'unknown', sourceSha256: state?.collider.sourceSha256 ?? '', work })
  if (!state) return result('indeterminate', 'invalid-collider')
  let start: Point, end: Point, radiusM: number, maxNodeVisits: number, maxTriangleTests: number
  try {
    start = copy(query.start); end = copy(query.end); radiusM = query.radiusM
    const budget = query.budget
    if (budget !== undefined && (!budget || typeof budget !== 'object' || Array.isArray(budget))) return result('indeterminate', 'invalid-query')
    const requestedNodes = budget?.maxNodeVisits, requestedTriangles = budget?.maxTriangleTests
    maxNodeVisits = requestedNodes === undefined ? 4096 : requestedNodes
    maxTriangleTests = requestedTriangles === undefined ? 8192 : requestedTriangles
    if (!validPoint(start) || !validPoint(end) || !Number.isFinite(radiusM) || radiusM < 0 || radiusM > 1000
      || !Number.isSafeInteger(maxNodeVisits) || maxNodeVisits < 1 || maxNodeVisits > 100_000 || !Number.isSafeInteger(maxTriangleTests) || maxTriangleTests < 1 || maxTriangleTests > 100_000) return result('indeterminate', 'invalid-query')
  } catch { return result('indeterminate', 'invalid-query') }
  const exhausted = new Error('query budget')
  const nodeVisit = () => { if (work.nodeVisits >= maxNodeVisits) throw exhausted; work.nodeVisits++ }
  const triangleTest = () => { if (work.triangleTests >= maxTriangleTests) throw exhausted; work.triangleTests++ }
  try {
    const radius = radiusM + SAFETY_M
    for (const component of state.components) {
      const pending = [component.root]
      while (pending.length) {
        nodeVisit(); const node = pending.pop()!
        if (!segmentBox(start, end, node.bounds, radius)) continue
        if (node.faces) for (const index of node.faces) {
          triangleTest()
          const distance = capsuleDistance(start, end, state.faces[index])
          if (!Number.isFinite(distance)) return result('indeterminate', 'numerical-ambiguity')
          if (distance <= radius) return result('blocked', 'surface-contact')
        }
        else { pending.push(node.right!, node.left!) }
      }
    }
    // A boundary-free segment cannot change components' inside/outside state.
    // Classifying its start also handles wholly enclosed and zero-length paths.
    for (const component of state.components) {
      const bounds = component.root.bounds
      if (AXES.some(axis => start[axis] <= bounds.min[axis] || start[axis] >= bounds.max[axis])) continue
      const rayLength = length(sub(bounds.max, bounds.min)) * 4 + 1
      let agreed: boolean | undefined, agreements = 0
      for (const direction of RAY_DIRECTIONS) {
        const end = add(start, scale(direction, rayLength / length(direction))), pending = [component.root]
        let crossings = 0, ambiguous = false
        while (pending.length && !ambiguous) {
          nodeVisit(); const node = pending.pop()!
          if (!segmentBox(start, end, node.bounds, PLANE_EPS_M)) continue
          if (node.faces) for (const index of node.faces) {
            triangleTest(); const hit = rayFace(start, end, state.faces[index])
            if (hit === 'ambiguous') { ambiguous = true; break }
            if (hit === 'hit') crossings++
          }
          else pending.push(node.right!, node.left!)
        }
        if (ambiguous) continue
        const inside = crossings % 2 === 1
        if (agreed !== undefined && agreed !== inside) return result('indeterminate', 'ambiguous-inside-classification')
        agreed = inside; agreements++
        if (agreements >= 2) break
      }
      if (agreements < 2) return result('indeterminate', 'ambiguous-inside-classification')
      if (agreed) return result('blocked', 'inside-solid')
    }
    return result('clear', 'boundary-and-interior-clear')
  } catch (error) { if (error === exhausted) return result('indeterminate', 'work-budget'); throw error }
}
