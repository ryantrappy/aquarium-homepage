import type { RockCollisionGeometry } from './socket-inspector.ts'

type Point = [number, number, number]
type Triangle = RockCollisionGeometry['triangles'][number]
export type CollisionBox = { id: string; boundsM: { min: Point; max: Point } }
type Polygon = Point[]
type Band = { low: number; high: number }
const EPS = 1e-12
const GAP_INSET_M = 1e-6
export const COLLISION_PROBE_RADII_M = [.02, .04, .06] as const
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: Point, n: number): Point => [a[0] * n, a[1] * n, a[2] * n]
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Point, b: Point): Point => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Point) => Math.hypot(...a)
const vertices = (t: Triangle): Polygon => [t.a, t.b, t.c]

function clipPlane(polygon: Polygon, axis: number, bound: number, less: boolean, strict = false): Polygon {
  if (!polygon.length) return []
  const inside = (p: Point) => less ? strict ? p[axis] < bound : p[axis] <= bound : strict ? p[axis] > bound : p[axis] >= bound
  const out: Polygon = []
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], ia = inside(a), ib = inside(b)
    if (ia) out.push(a)
    if (ia !== ib && a[axis] !== b[axis]) {
      const fraction = (bound - a[axis]) / (b[axis] - a[axis])
      const p = add(a, mul(sub(b, a), fraction)); p[axis] = bound
      out.push(p)
    }
  }
  return out
}

function polygonArea(polygon: Polygon) {
  if (polygon.length < 3) return 0
  let area: Point = [0, 0, 0]
  for (let i = 1; i + 1 < polygon.length; i++) area = add(area, cross(sub(polygon[i], polygon[0]), sub(polygon[i + 1], polygon[0])))
  return norm(area) / 2
}

function clipBox(polygon: Polygon, bounds: CollisionBox['boundsM']) {
  let result = polygon
  for (let axis = 0; axis < 3; axis++) {
    result = clipPlane(result, axis, bounds.min[axis], false)
    result = clipPlane(result, axis, bounds.max[axis], true)
  }
  return result
}

function intersectsBoxInterior(triangle: Triangle, bounds: CollisionBox['boundsM']) {
  const polygon = clipBox(vertices(triangle), bounds)
  // A convex clipped polygon enters the open box iff it is not entirely on
  // any of its six boundary planes. This also detects edge/point contacts inside.
  return polygon.length > 0 && [0, 1, 2].every(axis => polygon.some(p => p[axis] > bounds.min[axis]) && polygon.some(p => p[axis] < bounds.max[axis]))
}

function intersectsClosedBox(triangle: Triangle, bounds: CollisionBox['boundsM']) {
  // Clearance requires separation: a face, edge or point touching the swept
  // cube is unsafe even though the existing navigation predicate allows it.
  return clipBox(vertices(triangle), bounds).length > 0
}

function subtractBox(polygon: Polygon, bounds: CollisionBox['boundsM']): Polygon[] {
  let remaining = polygon
  const outside: Polygon[] = []
  for (let axis = 0; axis < 3; axis++) {
    for (const [bound, less] of [[bounds.min[axis], false], [bounds.max[axis], true]] as const) {
      const piece = clipPlane(remaining, axis, bound, !less, true)
      if (polygonArea(piece) > 1e-24) outside.push(piece)
      remaining = clipPlane(remaining, axis, bound, less)
      if (!remaining.length) return outside
    }
  }
  return outside
}

export function inspectRockTopology(triangles: readonly Triangle[]) {
  const ids = new Map<string, number>(), edges = new Map<string, Array<[number, number, number]>>()
  const faces: number[][] = [], links = new Map<number, Array<[number, number]>>()
  let degenerateTriangles = 0, duplicateFaces = 0
  const faceKeys = new Set<string>()
  const idFor = (p: Point) => {
    const key = p.join(',')
    if (!ids.has(key)) ids.set(key, ids.size)
    return ids.get(key)!
  }
  for (const [index, triangle] of triangles.entries()) {
    const points = vertices(triangle)
    if (points.some(p => p.length !== 3 || p.some(v => !Number.isFinite(v))) || norm(cross(sub(triangle.b, triangle.a), sub(triangle.c, triangle.a))) <= EPS) degenerateTriangles++
    const face = points.map(idFor); faces.push(face)
    const faceKey = [...face].sort((a, b) => a - b).join(',')
    if (faceKeys.has(faceKey)) duplicateFaces++
    faceKeys.add(faceKey)
    for (let i = 0; i < 3; i++) {
      const a = face[i], b = face[(i + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`
      const edge = edges.get(key) ?? []; edge.push([a, b, index]); edges.set(key, edge)
      const link = links.get(a) ?? []; link.push([b, face[(i + 2) % 3]]); links.set(a, link)
    }
  }
  let boundaryEdges = 0, nonManifoldEdges = 0, inconsistentEdges = 0, nonManifoldVertices = 0
  const adjacent = faces.map(() => [] as number[])
  for (const edge of edges.values()) {
    if (edge.length === 1) boundaryEdges++
    else if (edge.length !== 2) nonManifoldEdges++
    else {
      if (edge[0][0] !== edge[1][1] || edge[0][1] !== edge[1][0]) inconsistentEdges++
      adjacent[edge[0][2]].push(edge[1][2]); adjacent[edge[1][2]].push(edge[0][2])
    }
  }
  for (const link of links.values()) {
    const graph = new Map<number, number[]>()
    for (const [a, b] of link) {
      graph.set(a, [...(graph.get(a) ?? []), b]); graph.set(b, [...(graph.get(b) ?? []), a])
    }
    const seen = new Set<number>(), pending = [graph.keys().next().value!]
    while (pending.length) { const v = pending.pop()!; if (!seen.has(v)) { seen.add(v); pending.push(...graph.get(v)!) } }
    if (seen.size !== graph.size || [...graph.values()].some(neighbors => neighbors.length !== 2)) nonManifoldVertices++
  }
  const seenFaces = new Set<number>(); let connectedComponents = 0
  for (let i = 0; i < faces.length; i++) if (!seenFaces.has(i)) {
    connectedComponents++; const pending = [i]
    while (pending.length) { const f = pending.pop()!; if (!seenFaces.has(f)) { seenFaces.add(f); pending.push(...adjacent[f]) } }
  }
  return {
    exactPositionWeld: true, vertices: ids.size, triangles: triangles.length, boundaryEdges, nonManifoldEdges, inconsistentEdges, nonManifoldVertices, degenerateTriangles, duplicateFaces, connectedComponents,
    valid: triangles.length > 0 && !boundaryEdges && !nonManifoldEdges && !inconsistentEdges && !nonManifoldVertices && !degenerateTriangles && !duplicateFaces,
    exhaustiveSelfIntersectionCheck: false,
  }
}

/** Independent union subtraction, not the constructor's per-band extrema test. */
export function verifyCollisionCoverage(source: RockCollisionGeometry, boxes: readonly CollisionBox[]) {
  const envelope = source.boundsM
  for (const box of boxes) for (let axis = 0; axis < 3; axis++) {
    if (!Number.isFinite(box.boundsM.min[axis]) || !Number.isFinite(box.boundsM.max[axis]) || box.boundsM.min[axis] >= box.boundsM.max[axis]
      || box.boundsM.min[axis] < envelope.min[axis] || box.boundsM.max[axis] > envelope.max[axis]) throw new RangeError('Collision boxes must be finite, positive and contained in the source envelope')
  }
  const uncoveredExamples: number[] = []; let uncoveredTriangles = 0
  for (const triangle of source.triangles) {
    if (boxes.some(box => vertices(triangle).every(p => p.every((value, axis) => value >= box.boundsM.min[axis] && value <= box.boundsM.max[axis])))) continue
    let remainder: Polygon[] = [vertices(triangle)]
    for (const box of boxes) {
      remainder = remainder.flatMap(polygon => subtractBox(polygon, box.boundsM))
      if (remainder.length > 4096) throw new RangeError('Coverage subtraction exceeded its conservative fragment budget')
      if (!remainder.length) break
    }
    if (remainder.some(p => polygonArea(p) > 1e-24)) { uncoveredTriangles++; if (uncoveredExamples.length < 8) uncoveredExamples.push(triangle.index) }
  }
  const allFullDepth = boxes.every(box => box.boundsM.min[2] === envelope.min[2] && box.boundsM.max[2] === envelope.max[2])
  const levels = [...new Set([envelope.min[1], envelope.max[1], ...boxes.flatMap(box => [box.boundsM.min[1], box.boundsM.max[1]])])].sort((a, b) => a - b)
  let omittedPrisms = 0, boundaryCrossingPrisms = 0
  if (allFullDepth) for (let i = 0; i + 1 < levels.length; i++) {
    const low = levels[i], high = levels[i + 1]
    const intervals = boxes.filter(box => box.boundsM.min[1] <= low && box.boundsM.max[1] >= high)
      .map(box => [box.boundsM.min[0], box.boundsM.max[0]]).sort((a, b) => a[0] - b[0])
    let end = envelope.min[0]
    const gaps: Array<[number, number]> = []
    for (const [a, b] of intervals) { if (a > end) gaps.push([end, a]); end = Math.max(end, b) }
    if (end < envelope.max[0]) gaps.push([end, envelope.max[0]])
    for (const [a, b] of gaps) {
      omittedPrisms++
      // Include both entrance/exit planes inside the checked prism. Checking
      // only the source's open Z interval would miss caps sealing a solid box.
      const bounds = { min: [a, low, envelope.min[2] - GAP_INSET_M] as Point, max: [b, high, envelope.max[2] + GAP_INSET_M] as Point }
      if (source.triangles.some(triangle => intersectsBoxInterior(triangle, bounds))) boundaryCrossingPrisms++
    }
  }
  return {
    surfaceCovered: uncoveredTriangles === 0, uncoveredTriangles, uncoveredExamples,
    fullDepthPrismComplement: allFullDepth, omittedPrisms, boundaryCrossingPrisms,
    exteriorPrismEndExtensionM: GAP_INSET_M,
    exteriorConnectedComplement: allFullDepth && boundaryCrossingPrisms === 0,
    solidCoverageArgument: 'Within the measured envelope, every omitted open prism continues along Z to known exterior beyond both source bounds. No boundary triangle enters its interior; a bounded closed-solid interpretation therefore cannot occupy it. This is conditional on the reported topology and does not certify absence of mesh self-intersections.',
  }
}

function bandBoxes(source: RockCollisionGeometry, band: Band, axisX: number): CollisionBox[] {
  let left = source.boundsM.min[0], right = source.boundsM.max[0], hasLeft = false, hasRight = false, bridged = false
  for (const triangle of source.triangles) {
    let polygon = clipPlane(vertices(triangle), 1, band.low - GAP_INSET_M, false)
    polygon = clipPlane(polygon, 1, band.high + GAP_INSET_M, true)
    if (!polygon.length) continue
    const xs = polygon.map(p => p[0]), low = Math.min(...xs), high = Math.max(...xs)
    if (low <= axisX && high >= axisX) { bridged = true; break }
    if (high < axisX) { hasLeft = true; left = Math.max(left, high + GAP_INSET_M) }
    if (low > axisX) { hasRight = true; right = Math.min(right, low - GAP_INSET_M) }
  }
  const make = (low: number, high: number): CollisionBox => ({ id: '', boundsM: { min: [low, band.low, source.boundsM.min[2]], max: [high, band.high, source.boundsM.max[2]] } })
  if (bridged || left >= right) return [make(source.boundsM.min[0], source.boundsM.max[0])]
  const boxes: CollisionBox[] = []
  if (hasLeft) boxes.push(make(source.boundsM.min[0], Math.min(left, source.boundsM.max[0])))
  if (hasRight) boxes.push(make(Math.max(right, source.boundsM.min[0]), source.boundsM.max[0]))
  return boxes
}

function compileBands(source: RockCollisionGeometry, bands: Band[], axisX: number) {
  const boxes: CollisionBox[] = []
  for (const band of bands) for (const box of bandBoxes(source, band, axisX)) {
    const adjacent = boxes.find(previous => previous.boundsM.max[1] === box.boundsM.min[1]
      && previous.boundsM.min[0] === box.boundsM.min[0] && previous.boundsM.max[0] === box.boundsM.max[0])
    if (adjacent) adjacent.boundsM.max[1] = box.boundsM.max[1]
    else boxes.push(box)
  }
  boxes.forEach((box, i) => { box.id = `rock-part-${String(i + 1).padStart(2, '0')}` })
  return boxes
}

function closestTrianglePoint(p: Point, t: Triangle): Point {
  const ab = sub(t.b, t.a), ac = sub(t.c, t.a), ap = sub(p, t.a), d1 = dot(ab, ap), d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return t.a
  const bp = sub(p, t.b), d3 = dot(ab, bp), d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return t.b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(t.a, mul(ab, d1 / (d1 - d3)))
  const cp = sub(p, t.c), d5 = dot(ab, cp), d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return t.c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(t.a, mul(ac, d2 / (d2 - d6)))
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(t.b, mul(sub(t.c, t.b), (d4 - d3) / (d4 - d3 + d5 - d6)))
  return add(t.a, add(mul(ab, vb / (va + vb + vc)), mul(ac, vc / (va + vb + vc))))
}

function segmentDistance(a: Point, b: Point, c: Point, d: Point) {
  const u = sub(b, a), v = sub(d, c), w = sub(a, c), aa = dot(u, u), bb = dot(u, v), cc = dot(v, v), dd = dot(u, w), ee = dot(v, w)
  const normal = cross(u, v), denominator = dot(normal, normal)
  // Cross products avoid cancellation in aa*cc-bb*bb for nearly parallel edges.
  let s = denominator > 0 ? Math.max(0, Math.min(1, dot(cross(v, w), normal) / denominator)) : 0
  let t = (bb * s + ee) / cc
  if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -dd / aa)) }
  else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (bb - dd) / aa)) }
  return norm(sub(add(a, mul(u, s)), add(c, mul(v, t))))
}

/** Continuous segment/triangle feature distance; no frame or path sampling. */
export function segmentTriangleDistance(a: Point, b: Point, triangle: Triangle) {
  const normal = cross(sub(triangle.b, triangle.a), sub(triangle.c, triangle.a)), direction = sub(b, a), denominator = dot(normal, direction)
  if (norm(normal) <= EPS) throw new RangeError('Segment distance requires a nondegenerate triangle')
  if (dot(direction, direction) === 0) return norm(sub(a, closestTrianglePoint(a, triangle)))
  if (denominator !== 0) {
    const fraction = dot(normal, sub(triangle.a, a)) / denominator
    if (fraction >= 0 && fraction <= 1) {
      const point = add(a, mul(direction, fraction))
      if (norm(sub(point, closestTrianglePoint(point, triangle))) <= EPS) return 0
    }
  }
  return Math.min(norm(sub(a, closestTrianglePoint(a, triangle))), norm(sub(b, closestTrianglePoint(b, triangle))),
    segmentDistance(a, b, triangle.a, triangle.b), segmentDistance(a, b, triangle.b, triangle.c), segmentDistance(a, b, triangle.c, triangle.a))
}

/** Matches the existing route predicate for this full-depth, Z-parallel probe. */
export function cubeInflatedProbeSafe(boxes: readonly CollisionBox[], axisX: number, heightM: number, radiusM: number) {
  return boxes.every(box => axisX <= box.boundsM.min[0] - radiusM || axisX >= box.boundsM.max[0] + radiusM
    || heightM <= box.boundsM.min[1] - radiusM || heightM >= box.boundsM.max[1] + radiusM)
}

export function buildRockCollisionReport(source: RockCollisionGeometry, options: { maxParts: number; requirePassage: boolean; minBandHeightM?: number; axisX?: number; heightM?: number }) {
  const maxParts = options.maxParts, minBandHeightM = options.minBandHeightM ?? .002, axisX = options.axisX ?? 0, heightM = options.heightM ?? .08
  if (!Number.isInteger(maxParts) || maxParts < 1 || maxParts > 16 || !Number.isFinite(minBandHeightM) || minBandHeightM <= 0 || !Number.isFinite(axisX) || !Number.isFinite(heightM) || Math.abs(axisX) > 1000 || Math.abs(heightM) > 1000) throw new RangeError('Invalid collision part budget, resolution or probe axis')
  if (source.triangles.length > 100_000 || !/^[a-f0-9]{64}$/.test(source.sourceSha256)) throw new RangeError('Invalid collision source hash or triangle budget')
  if (source.boundsM.min.some((v, i) => !Number.isFinite(v) || !Number.isFinite(source.boundsM.max[i]) || v >= source.boundsM.max[i])) throw new RangeError('Invalid source bounds')
  if ([...source.boundsM.min, ...source.boundsM.max].some(v => Math.abs(v) > 1000)) throw new RangeError('Collision inspection supports coordinates within 1000 meters of the local origin')
  if (source.triangles.some(t => vertices(t).some(p => p.some((v, i) => v < source.boundsM.min[i] || v > source.boundsM.max[i])))) throw new RangeError('Source bounds must contain every triangle')
  const topology = inspectRockTopology(source.triangles)
  const probeAxisWithinSourceXY = axisX > source.boundsM.min[0] && axisX < source.boundsM.max[0] && heightM > source.boundsM.min[1] && heightM < source.boundsM.max[1]
  const method = {
    name: 'horizontal-band-exterior-prisms-v1', maxParts, globalAssembledPartLimit: 32, minBandHeightM, gapInsetM: GAP_INSET_M,
    axisX, heightM, probeAxisWithinSourceXY, probeRadiiM: COLLISION_PROBE_RADII_M, probeInterpretation: 'Fixed technical probes, not species or animated-fish envelopes',
    numericalAreaFloorM2: 1e-24, capsuleSafetyMarginM: GAP_INSET_M, sweptCubeContact: 'closed-contact-is-unsafe; capsule-margin-also-required', maximumSourceTriangles: 100_000, maximumCoordinateMagnitudeM: 1000, exhaustiveSelfIntersectionCheck: false,
  }
  const base = { schema: 'rock-collision-review-v1', assetId: source.assetId, sourceSha256: source.sourceSha256, boundsM: source.boundsM, method, topology, promotionStatus: 'unavailable-pending-root-and-scene-review' }
  if (!topology.valid) return { ...base, status: 'unavailable', reason: 'Source topology is not closed, oriented and nondegenerate', stoppedBy: 'invalid-source-topology', bands: [] as Band[], candidateParts: [] as CollisionBox[], coverage: null, probes: [] }
  const start: Point = [axisX, heightM, source.boundsM.min[2] - .1], end: Point = [axisX, heightM, source.boundsM.max[2] + .1]
  let minimumMeshDistanceM = Infinity
  for (const triangle of source.triangles) minimumMeshDistanceM = Math.min(minimumMeshDistanceM, segmentTriangleDistance(start, end, triangle))
  const capsuleSafe = (radius: number) => minimumMeshDistanceM > radius + GAP_INSET_M
  const exactCube = (radius: number) => capsuleSafe(radius) && !source.triangles.some(t => intersectsClosedBox(t, { min: [axisX - radius, heightM - radius, start[2] - radius], max: [axisX + radius, heightM + radius, end[2] + radius] }))
  const targetRadii = COLLISION_PROBE_RADII_M.filter(exactCube)
  let bands: Band[] = [{ low: source.boundsM.min[1], high: source.boundsM.max[1] }], boxes = compileBands(source, bands, axisX)
  let stoppedBy = 'probe-targets-satisfied'
  if (options.requirePassage) for (let iteration = 0; iteration < 64; iteration++) {
    const blockedRadii = targetRadii.filter(radius => !cubeInflatedProbeSafe(boxes, axisX, heightM, radius))
    if (!blockedRadii.length) break
    const radius = Math.max(...blockedRadii)
    const candidates = bands.filter(band => band.low < heightM + radius && band.high > heightM - radius && (band.high - band.low) / 2 >= minBandHeightM)
      .sort((a, b) => (b.high - b.low) - (a.high - a.low) || a.low - b.low)
    let accepted = false
    for (const band of candidates) {
      const middle = (band.low + band.high) / 2
      const next = bands.flatMap(value => value === band ? [{ low: band.low, high: middle }, { low: middle, high: band.high }] : [value])
      const parts = compileBands(source, next, axisX)
      if (parts.length <= maxParts) { bands = next; boxes = parts; accepted = true; break }
    }
    if (!accepted) { stoppedBy = 'part-budget-or-minimum-band-height'; break }
    if (iteration === 63) stoppedBy = 'refinement-iteration-limit'
  }
  const coverage = verifyCollisionCoverage(source, boxes)
  const probes = COLLISION_PROBE_RADII_M.map(radiusM => ({
    radiusM, startM: start, endM: end, minimumMeshDistanceM,
    exactMeshCapsuleSafe: capsuleSafe(radiusM),
    exactMeshSweptCubeSafe: exactCube(radiusM),
    currentCubeInflatedAabbRouteSafe: cubeInflatedProbeSafe(boxes, axisX, heightM, radiusM),
  }))
  const passageValid = !options.requirePassage || probeAxisWithinSourceXY && targetRadii.length > 0 && targetRadii.every(radius => cubeInflatedProbeSafe(boxes, axisX, heightM, radius))
  const valid = coverage.surfaceCovered && coverage.exteriorConnectedComplement && passageValid && boxes.length <= maxParts
  return {
    ...base, status: valid ? 'validated-offline' : 'unavailable',
    reason: valid ? 'Independent surface/prism checks pass; Root and actual-scene review remain required' : !passageValid ? 'No required fixed-probe passage within the part/resolution budget' : 'Independent coverage or exterior-prism verification failed',
    stoppedBy, bands, candidateParts: boxes, coverage, probes,
  }
}
