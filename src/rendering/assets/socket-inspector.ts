import { createHash } from 'node:crypto'

type Vec3 = [number, number, number]
type Quat = [number, number, number, number]
type Mat4 = number[]
type Triangle = { meshId: string; role: string | null; nodeIndex: number; index: number; a: Vec3; b: Vec3; c: Vec3; normal: Vec3; min: Vec3; max: Vec3; center: Vec3 }
type AabbNode = { min: Vec3; max: Vec3; left?: AabbNode; right?: AabbNode; triangles?: Triangle[] }
type ReefSocketIntent = { role?: unknown; parentMesh?: unknown; archetype?: unknown; footprintRadiusM?: unknown; clearanceRadiusM?: unknown; [key: string]: unknown }
type RawTransform = { matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }
type SocketNode = { nodeIndex: number; name: string; intent?: ReefSocketIntent; rawTransform: RawTransform; transformError?: string; position?: Vec3; up?: Vec3; rotation?: Quat }

export type VerifiedSocket = {
  name: string; role: 'coral-mount'; parentMesh: string; archetype: string
  positionM: Vec3; normal: Vec3; rotation: Quat; footprintRadiusM: number; clearanceRadiusM: number
  support: { pointM: Vec3; normal: Vec3; supportedRadiusM: number; freeRadiusM: number; evidence: { method: 'surface-probes-v1'; geometrySha256: string; report: string } }
}

export type RockCollisionGeometry = {
  assetId: string
  sourceSha256: string
  boundsM: { min: Vec3; max: Vec3 }
  triangles: Array<{ meshId: string; index: number; a: Vec3; b: Vec3; c: Vec3 }>
}

export type SocketInspectionReport = {
  schema: 'socket-support-inspection-v1'
  assetId: string | null
  sourceSha256: string
  method: {
    contactToleranceM: number
    upNormalVectorTolerance: number
    footprintSampleSpacingM: number
    footprintSampleCount: number
    footprintNormalMaxAngleDeg: number
    clearanceEnvelope: { shape: 'oriented-cylinder'; radiusM: string; heightM: string; baseOffsetM: number }
    limitations: string[]
  }
  supportedSockets: VerifiedSocket[]
  measurements: Array<{ nodeIndex: number; name: string; supported: boolean; data: Record<string, unknown> }>
  rejectedSockets: Array<{ nodeIndex: number; name: string; intent: ReefSocketIntent | null; rawTransform: RawTransform; worldPositionM?: Vec3; worldUp?: Vec3; reasons: string[]; measurements?: Record<string, unknown> }>
}

const CONTACT_TOLERANCE = 0.002
const UP_NORMAL_TOLERANCE = 0.002
const FOOTPRINT_SPACING = 0.005
const FOOTPRINT_MAX_ANGLE_DEG = 30
const CLEARANCE_BASE_OFFSET = CONTACT_TOLERANCE
const EPS = 1e-10

function fail(message: string): never { throw new Error(`GLB inspection failed: ${message}`) }
function finiteNumber(v: unknown): v is number { return typeof v === 'number' && Number.isFinite(v) }
function vec(a: readonly number[], b: readonly number[]): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function add(a: readonly number[], b: readonly number[]): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }
function mul(a: readonly number[], k: number): Vec3 { return [a[0] * k, a[1] * k, a[2] * k] }
function dot(a: readonly number[], b: readonly number[]): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function cross(a: readonly number[], b: readonly number[]): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function norm(a: readonly number[]): number { return Math.hypot(a[0], a[1], a[2]) }
function unit(a: readonly number[]): Vec3 { const n = norm(a); if (!(n > EPS)) fail('zero-length vector'); return [a[0] / n, a[1] / n, a[2] / n] }
function dist(a: readonly number[], b: readonly number[]): number { return norm(vec(a, b)) }
function finiteVec(value: unknown, size: number): value is number[] { return Array.isArray(value) && value.length === size && value.every(finiteNumber) }

function identity(): Mat4 { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }
function multiplyMat(a: readonly number[], b: readonly number[]): Mat4 {
  const out = Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return out
}
function localMatrix(node: any): Mat4 {
  if (node.matrix !== undefined) {
    if (node.translation !== undefined || node.rotation !== undefined || node.scale !== undefined) fail(`node ${node.name ?? '?'} declares matrix and TRS`)
    if (!finiteVec(node.matrix, 16)) fail(`node ${node.name ?? '?'} has an invalid matrix`)
    const m = [...node.matrix]
    if (Math.abs(m[3]) > EPS || Math.abs(m[7]) > EPS || Math.abs(m[11]) > EPS || Math.abs(m[15] - 1) > EPS) fail(`node ${node.name ?? '?'} matrix is not affine`)
    return m
  }
  const t = node.translation ?? [0, 0, 0], r = node.rotation ?? [0, 0, 0, 1], s = node.scale ?? [1, 1, 1]
  if (!finiteVec(t, 3) || !finiteVec(r, 4) || !finiteVec(s, 3) || s.some(x => Math.abs(x) <= EPS)) fail(`node ${node.name ?? '?'} has invalid TRS`)
  const qLen = Math.hypot(...r)
  if (Math.abs(qLen - 1) > 1e-5) fail(`node ${node.name ?? '?'} quaternion is not unit length`)
  const [x, y, z, w] = r
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ]
}
function transformPoint(m: readonly number[], p: readonly number[]): Vec3 { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]] }
function transformVector(m: readonly number[], v: readonly number[]): Vec3 { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]] }
function orientationQuaternion(m: readonly number[]): Quat {
  const x0 = transformVector(m, [1, 0, 0]), y0 = transformVector(m, [0, 1, 0]), z0 = transformVector(m, [0, 0, 1])
  if ([x0, y0, z0].some(axis => Math.abs(norm(axis) - 1) > 1e-5) || Math.abs(dot(x0, y0)) > 1e-5 || Math.abs(dot(x0, z0)) > 1e-5 || Math.abs(dot(y0, z0)) > 1e-5) fail('socket world transform has scale or shear; socket radii require unit-scale meters')
  let y = unit(y0)
  let x = unit(vec(x0, mul(y, dot(x0, y))))
  let z = unit(cross(x, y))
  if (dot(z, z0) < 0) fail('socket transform is mirrored')
  x = unit(cross(y, z)); y = unit(y)
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2]
  const trace = m00 + m11 + m22
  let q: Quat
  if (trace > 0) { const s = Math.sqrt(trace + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4] }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s] }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s] }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s] }
  const length = Math.hypot(...q)
  if (!(length > EPS) || !Number.isFinite(length)) fail('socket world rotation cannot be measured')
  return q.map(x => x / length) as Quat
}

function parseGlb(bytes: Uint8Array) {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (b.length < 20 || b.toString('ascii', 0, 4) !== 'glTF') fail('not a GLB file')
  if (b.readUInt32LE(4) !== 2) fail('only glTF 2 is supported')
  if (b.readUInt32LE(8) !== b.length) fail('declared GLB length does not match file length')
  let offset = 12, doc: any, bin: Buffer | undefined, seenJson = false, seenBin = false
  while (offset < b.length) {
    if (offset + 8 > b.length) fail('truncated GLB chunk header')
    const length = b.readUInt32LE(offset), type = b.readUInt32LE(offset + 4); offset += 8
    if (length % 4 !== 0 || offset + length > b.length) fail('invalid GLB chunk length')
    const chunk = b.subarray(offset, offset + length); offset += length
    if (type === 0x4e4f534a) { if (seenJson) fail('multiple JSON chunks'); doc = JSON.parse(chunk.toString('utf8').trim()); seenJson = true }
    else if (type === 0x004e4942) { if (seenBin) fail('multiple BIN chunks'); bin = chunk; seenBin = true }
  }
  if (!seenJson || !doc) fail('missing JSON chunk')
  if (!Array.isArray(doc.buffers) || doc.buffers.length !== 1 || doc.buffers[0].uri !== undefined || !bin) fail('expected one embedded GLB buffer')
  const declaredBufferLength = doc.buffers[0].byteLength
  if (!Number.isInteger(declaredBufferLength) || declaredBufferLength < 0 || declaredBufferLength > bin.length || bin.length - declaredBufferLength > 3) fail('embedded buffer length mismatch')
  if (!Array.isArray(doc.bufferViews) || !Array.isArray(doc.accessors) || !Array.isArray(doc.nodes) || !Array.isArray(doc.meshes) || !Array.isArray(doc.scenes) || !doc.scenes.length) fail('missing required glTF arrays/default scene')
  const sceneIndex = doc.scene ?? 0
  if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex >= doc.scenes.length) fail('invalid default scene index')
  const checkView = (index: number, accessorName: string) => {
    const view = doc.bufferViews[index]
    if (!view || view.buffer !== 0 || !Number.isInteger(view.byteLength) || view.byteLength < 0) fail(`${accessorName} has invalid bufferView`)
    const start = view.byteOffset ?? 0, end = start + view.byteLength
    if (!Number.isInteger(start) || start < 0 || end > declaredBufferLength) fail(`${accessorName} bufferView lies outside embedded buffer`)
    if (view.extensions?.EXT_meshopt_compression) fail(`${accessorName} uses unsupported EXT_meshopt_compression`)
    return view
  }
  const readAccessor = (index: number, expectedType: string, allowedTypes: number[]) => {
    const a = doc.accessors[index]
    if (!a || a.type !== expectedType || !allowedTypes.includes(a.componentType) || !Number.isInteger(a.count) || a.count < 0) fail(`unsupported accessor ${index}`)
    if (a.sparse) fail(`sparse accessor ${index} is unsupported`)
    if (a.normalized && a.componentType === 5126) fail(`accessor ${index} illegally marks float values normalized`)
    const view = checkView(a.bufferView, `accessor ${index}`)
    const size = ({ 5121: 1, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[a.componentType]
    const components = ({ SCALAR: 1, VEC3: 3 } as Record<string, number>)[a.type]
    const stride = view.byteStride ?? size * components, start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0)
    if (!Number.isInteger(start) || start < (view.byteOffset ?? 0) || start + Math.max(0, a.count - 1) * stride + size * components > (view.byteOffset ?? 0) + view.byteLength) fail(`accessor ${index} exceeds bufferView`)
    if (stride < size * components || stride % size !== 0 || start % size !== 0) fail(`accessor ${index} has invalid stride/alignment`)
    const values = new Array<number>(a.count * components)
    for (let i = 0; i < a.count; i++) for (let j = 0; j < components; j++) {
      const p = start + i * stride + j * size
      const value = a.componentType === 5126 ? bin!.readFloatLE(p) : a.componentType === 5123 ? bin!.readUInt16LE(p) : a.componentType === 5121 ? bin!.readUInt8(p) : bin!.readUInt32LE(p)
      if (!Number.isFinite(value)) fail(`accessor ${index} has non-finite values`)
      values[i * components + j] = value
    }
    return { accessor: a, values }
  }
  const nodes = doc.nodes as any[]
  const parents = new Array<number | undefined>(nodes.length)
  for (const [parent, node] of nodes.entries()) for (const child of node.children ?? []) {
    if (!Number.isInteger(child) || child < 0 || child >= nodes.length || parents[child] !== undefined) fail('node hierarchy has invalid child or multiple parents')
    parents[child] = parent
  }
  const allSockets: SocketNode[] = [], triangles: Triangle[] = [], visited = new Set<number>(), active = new Set<number>()
  let triangleIndex = 0, rootAsset: any = null
  const sceneNodes = doc.scenes[sceneIndex].nodes
  if (!Array.isArray(sceneNodes)) fail('default scene has no root node list')
  const visit = (nodeIndex: number, parentWorld: Mat4) => {
    if (active.has(nodeIndex) || visited.has(nodeIndex)) fail('default scene contains a cycle or multiply-instanced node')
    const node = nodes[nodeIndex]
    if (!node) fail(`default scene references missing node ${nodeIndex}`)
    active.add(nodeIndex); visited.add(nodeIndex)
    let local: Mat4
    try { local = localMatrix(node) } catch (error) {
      const isSocket = node.name?.startsWith('socket_') || node.extras?.reefSocket
      if (!isSocket) throw error
      allSockets.push({ nodeIndex, name: node.name ?? `node-${nodeIndex}`, intent: node.extras?.reefSocket, rawTransform: rawTransform(node), transformError: error instanceof Error ? error.message : String(error) })
      active.delete(nodeIndex); return
    }
    const world = multiplyMat(parentWorld, local)
    if (node.extras?.reefAsset) rootAsset = node.extras.reefAsset
    const isSocket = node.name?.startsWith('socket_') || node.extras?.reefSocket
    if (isSocket) {
      try {
        const position = transformPoint(world, [0, 0, 0]), up = unit(transformVector(world, [0, 1, 0])), rotation = orientationQuaternion(world)
        allSockets.push({ nodeIndex, name: node.name ?? `node-${nodeIndex}`, intent: node.extras?.reefSocket, rawTransform: rawTransform(node), position, up, rotation })
      } catch (error) {
        allSockets.push({ nodeIndex, name: node.name ?? `node-${nodeIndex}`, intent: node.extras?.reefSocket, rawTransform: rawTransform(node), transformError: error instanceof Error ? error.message : String(error) })
      }
    }
    if (node.mesh !== undefined) {
      if (node.skin !== undefined || node.weights !== undefined) fail(`node ${node.name ?? nodeIndex} is skinned or morphed`)
      const mesh = doc.meshes[node.mesh]
      if (!mesh || !Array.isArray(mesh.primitives)) fail(`node ${node.name ?? nodeIndex} references invalid mesh`)
      if (mesh.weights !== undefined) fail(`mesh ${node.mesh} has morph weights`)
      for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
        if (primitive.extensions?.KHR_draco_mesh_compression || primitive.extensions?.EXT_meshopt_compression) fail(`mesh ${node.mesh} primitive ${primitiveIndex} is compressed`)
        if ((primitive.mode ?? 4) !== 4) fail(`mesh ${node.mesh} primitive ${primitiveIndex} is not TRIANGLES`)
        if (primitive.targets !== undefined) fail(`mesh ${node.mesh} primitive ${primitiveIndex} has morph targets`)
        if (!primitive.attributes || !Number.isInteger(primitive.attributes.POSITION)) fail(`mesh ${node.mesh} primitive ${primitiveIndex} has no POSITION`)
        const pos = readAccessor(primitive.attributes.POSITION, 'VEC3', [5126])
        const xyz: Vec3[] = []
        for (let i = 0; i < pos.values.length; i += 3) xyz.push(transformPoint(world, [pos.values[i], pos.values[i + 1], pos.values[i + 2]]))
        let indexValues: number[]
        if (primitive.indices === undefined) indexValues = xyz.map((_, i) => i)
        else {
          const index = readAccessor(primitive.indices, 'SCALAR', [5121, 5123, 5125])
          if (index.accessor.normalized) fail(`mesh ${node.mesh} indices are normalized`)
          indexValues = index.values
        }
        if (indexValues.length % 3 !== 0) fail(`mesh ${node.mesh} primitive ${primitiveIndex} index count is not divisible by three`)
        const nodeRole = node.extras?.reefPrimitive ?? mesh.extras?.reefPrimitive
        const primitiveRole = primitive.extras?.reefPrimitive ?? nodeRole
        const meshId = typeof primitiveRole?.id === 'string' ? primitiveRole.id : typeof mesh.name === 'string' ? mesh.name : `mesh-${node.mesh}`
        for (let i = 0; i < indexValues.length; i += 3) {
          const ia = indexValues[i], ib = indexValues[i + 1], ic = indexValues[i + 2]
          if (![ia, ib, ic].every(x => Number.isInteger(x) && x >= 0 && x < xyz.length)) fail(`mesh ${node.mesh} has out-of-range index`)
          const a = xyz[ia], b = xyz[ib], c = xyz[ic], rawNormal = cross(vec(b, a), vec(c, a))
          const magnitude = norm(rawNormal)
          if (!(magnitude > EPS)) continue
          const normal = mul(rawNormal, 1 / magnitude)
          const min: Vec3 = [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.min(a[2], b[2], c[2])]
          const max: Vec3 = [Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1]), Math.max(a[2], b[2], c[2])]
          const center = mul(add(add(a, b), c), 1 / 3)
          triangles.push({ meshId, role: typeof primitiveRole?.role === 'string' ? primitiveRole.role : null, nodeIndex, index: triangleIndex++, a, b, c, normal, min, max, center })
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world)
    active.delete(nodeIndex)
  }
  for (const nodeIndex of sceneNodes) visit(nodeIndex, identity())
  if (!rootAsset || rootAsset.kind !== 'rock') fail('default scene has no rock reefAsset metadata')
  return { allSockets, triangles, rootAsset }
}

function rawTransform(node: any): RawTransform { return node.matrix ? { matrix: [...node.matrix] } : { translation: [...(node.translation ?? [0, 0, 0])], rotation: [...(node.rotation ?? [0, 0, 0, 1])], scale: [...(node.scale ?? [1, 1, 1]) ] } }

/** Narrow read-only collision scope. Parsing, transforms and socket behavior stay unchanged. */
export function readRockCollisionGeometry(bytes: Uint8Array): RockCollisionGeometry {
  const parsed = parseGlb(bytes)
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) fail('collision inspection requires the JSON chunk first')
  const doc = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)).trim())
  const roots = doc.scenes[doc.scene ?? 0].nodes
  if (roots.length !== 1) fail('collision inspection requires one canonical rock root')
  const root = doc.nodes[roots[0]], metadata = root.extras?.reefAsset
  if (metadata?.schema !== 'reef-asset-v1' || metadata.kind !== 'rock' || typeof metadata.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(metadata.id)
    || metadata.units !== 'meter' || metadata.upAxis !== '+Y' || metadata.origin !== 'local') fail('collision root must declare reef-asset-v1 rock, meter, +Y and local origin')
  let meshCount = 0, assetCount = 0, expectedTriangles = 0
  const visit = (index: number, socketAncestor = false) => {
    const node = doc.nodes[index]
    if (node.extensions?.EXT_mesh_gpu_instancing) fail('collision inspection does not support GPU-instanced geometry')
    if (node.extras?.reefAsset) assetCount++
    const socket = node.name?.startsWith('socket_') || node.extras?.reefSocket
    if (!socket && localMatrix(node).some((value, i) => value !== identity()[i])) fail('collision inspection does not support transformed geometry scopes')
    if (node.mesh !== undefined) {
      if (socket || socketAncestor) fail('collision inspection does not support geometry inside socket hierarchies')
      meshCount++
      for (const primitive of doc.meshes[node.mesh].primitives) {
        if (primitive.extensions && Object.keys(primitive.extensions).length) fail('collision inspection does not support primitive extensions')
        expectedTriangles += doc.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3
      }
    }
    for (const child of node.children ?? []) visit(child, socketAncestor || Boolean(socket))
  }
  visit(roots[0])
  if (assetCount !== 1 || meshCount !== 1) fail('collision inspection requires one asset and one active mesh; instances are unsupported')
  if (expectedTriangles !== parsed.triangles.length) fail('collision inspection rejects skipped degenerate triangles')
  if (!parsed.triangles.length || parsed.triangles.some(triangle => triangle.role !== 'rock')) fail('collision inspection requires nonempty rock-only triangles')
  if (new Set(parsed.triangles.map(triangle => triangle.meshId)).size !== 1) fail('collision inspection requires one rock primitive identity')
  const boundsM = boundsFor(parsed.triangles)
  if (!finiteVec(metadata.dimensionsM, 3) || metadata.dimensionsM.some((value: number, i: number) => value <= 0 || Math.abs(value - (boundsM.max[i] - boundsM.min[i])) > 1e-5)) fail('collision root dimensions differ from actual meter geometry')
  return {
    assetId: metadata.id, sourceSha256: createHash('sha256').update(bytes).digest('hex'), boundsM,
    triangles: parsed.triangles.map(({ meshId, index, a, b, c }) => ({ meshId, index, a: [...a], b: [...b], c: [...c] })),
  }
}

function boundsFor(tris: Triangle[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const t of tris) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], t.min[k]); max[k] = Math.max(max[k], t.max[k]) }
  return { min, max }
}
function buildBvh(tris: Triangle[], leafSize = 8): AabbNode {
  if (!tris.length) return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], triangles: [] }
  const bounds = boundsFor(tris)
  if (tris.length <= leafSize) return { ...bounds, triangles: tris }
  const ext = bounds.max.map((x, i) => x - bounds.min[i])
  const axis = ext.indexOf(Math.max(...ext))
  const sorted = [...tris].sort((a, b) => a.center[axis] - b.center[axis])
  const mid = Math.floor(sorted.length / 2)
  return { ...bounds, left: buildBvh(sorted.slice(0, mid), leafSize), right: buildBvh(sorted.slice(mid), leafSize) }
}
function boxDistanceSq(p: readonly number[], box: AabbNode): number {
  let total = 0
  for (let i = 0; i < 3; i++) { const d = p[i] < box.min[i] ? box.min[i] - p[i] : p[i] > box.max[i] ? p[i] - box.max[i] : 0; total += d * d }
  return total
}
function closestPointTriangle(p: readonly number[], t: Triangle): Vec3 {
  const ab = vec(t.b, t.a), ac = vec(t.c, t.a), ap = vec(p, t.a), d1 = dot(ab, ap), d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return t.a
  const bp = vec(p, t.b), d3 = dot(ab, bp), d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return t.b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(t.a, mul(ab, d1 / (d1 - d3)))
  const cp = vec(p, t.c), d5 = dot(ab, cp), d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return t.c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(t.a, mul(ac, d2 / (d2 - d6)))
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(t.b, mul(vec(t.c, t.b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))
  const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom
  return add(add(t.a, mul(ab, v)), mul(ac, w))
}
function nearestPoint(p: Vec3, root: AabbNode): { point: Vec3; triangle: Triangle; distance: number } | undefined {
  let best: { point: Vec3; triangle: Triangle; distanceSq: number } | undefined
  const visit = (node: AabbNode) => {
    if (best && boxDistanceSq(p, node) > best.distanceSq) return
    if (node.triangles) for (const triangle of node.triangles) {
      const point = closestPointTriangle(p, triangle), d2 = dot(vec(p, point), vec(p, point))
      if (!best || d2 < best.distanceSq) best = { point, triangle, distanceSq: d2 }
    }
    else if (node.left && node.right) {
      const dl = boxDistanceSq(p, node.left), dr = boxDistanceSq(p, node.right)
      if (dl <= dr) { visit(node.left); visit(node.right) } else { visit(node.right); visit(node.left) }
    }
  }
  visit(root)
  return best ? { point: best.point, triangle: best.triangle, distance: Math.sqrt(best.distanceSq) } : undefined
}

function radialSamples(center: Vec3, up: Vec3, radius: number, spacing: number): Vec3[] {
  const seed: Vec3 = Math.abs(up[0]) < 0.75 ? [1, 0, 0] : [0, 0, 1]
  const tangent = unit(cross(seed, up)), bitangent = unit(cross(up, tangent))
  const rings = Math.max(1, Math.ceil(radius / spacing)), samples: Vec3[] = [center]
  for (let ring = 1; ring <= rings; ring++) {
    const r = radius * ring / rings, around = Math.max(8, Math.ceil(2 * Math.PI * r / spacing))
    for (let i = 0; i < around; i++) {
      const angle = 2 * Math.PI * i / around
      samples.push(add(center, add(mul(tangent, r * Math.cos(angle)), mul(bitangent, r * Math.sin(angle)))))
    }
  }
  return samples
}

type LocalPoint = { x: number; y: number; z: number }
function cylinderIntersectsTriangle(points: LocalPoint[], radius: number, bottom: number, top: number): boolean {
  let polygon = points
  const clip = (input: LocalPoint[], plane: number, keepAbove: boolean): LocalPoint[] => {
    const out: LocalPoint[] = []
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length], da = keepAbove ? a.z - plane : plane - a.z, db = keepAbove ? b.z - plane : plane - b.z
      if (da >= -EPS) out.push(a)
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) { const f = da / (da - db); out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: plane }) }
    }
    return out
  }
  polygon = clip(polygon, bottom, true); if (!polygon.length) return false
  polygon = clip(polygon, top, false); if (!polygon.length) return false
  if (polygon.some(p => p.x * p.x + p.y * p.y <= radius * radius + EPS)) return true
  const areaTwice = polygon.reduce((sum, a, i) => { const b = polygon[(i + 1) % polygon.length]; return sum + a.x * b.y - b.x * a.y }, 0)
  const inside = Math.abs(areaTwice) > EPS && (() => {
    let sign = 0
    for (let i = 0; i < polygon.length; i++) { const a = polygon[i], b = polygon[(i + 1) % polygon.length], c = a.x * b.y - b.x * a.y; if (Math.abs(c) <= EPS) continue; if (!sign) sign = Math.sign(c); else if (Math.sign(c) !== sign) return false }
    return true
  })()
  if (inside) return true
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / (dx * dx + dy * dy || 1)))
    if ((a.x + dx * t) ** 2 + (a.y + dy * t) ** 2 <= radius * radius + EPS) return true
  }
  return false
}

function validIntent(intent: ReefSocketIntent | undefined, socketName: string): string[] {
  if (!intent) return ['missing-reefSocket-intent']
  const reasons: string[] = []
  if (intent.role !== 'coral-mount') reasons.push('invalid-role')
  if (!/^socket_[a-z_]+_\d{2}$/.test(socketName)) reasons.push('invalid-socket-name')
  if (typeof intent.parentMesh !== 'string' || !intent.parentMesh) reasons.push('missing-parent-mesh')
  const classes: Record<string, string> = { sps_crest: 'branching-sps', plate_ledge: 'plating-sps', lps_mid: 'tentaculate-lps', brain_apron: 'mounded-lps', anemone_crevice: 'host-anemone', soft_mat: 'zoanthid-mat' }
  const match = /^socket_([a-z_]+)_\d{2}$/.exec(socketName)
  if (typeof intent.archetype !== 'string' || !intent.archetype || !match || classes[match[1]] !== intent.archetype) reasons.push('socket-name-archetype-mismatch')
  if (!finiteNumber(intent.footprintRadiusM) || intent.footprintRadiusM <= 0) reasons.push('invalid-footprint-radius')
  if (!finiteNumber(intent.clearanceRadiusM) || intent.clearanceRadiusM <= CLEARANCE_BASE_OFFSET) reasons.push('invalid-clearance-radius')
  return reasons
}

function measureSocket(socket: SocketNode, intent: ReefSocketIntent, ownTriangles: Triangle[], allTriangles: Triangle[], hash: string, reportPath: string) {
  const reasons = validIntent(intent, socket.name)
  if (socket.transformError) reasons.push('invalid-socket-transform')
  if (!socket.position || !socket.up || !socket.rotation) reasons.push('socket-world-transform-unavailable')
  if (reasons.length) return { rejected: { nodeIndex: socket.nodeIndex, name: socket.name, intent, rawTransform: socket.rawTransform, worldPositionM: socket.position, worldUp: socket.up, reasons } }
  const position = socket.position!, up = socket.up!, rotation = socket.rotation!, footprint = intent.footprintRadiusM as number, clearance = intent.clearanceRadiusM as number
  if (!ownTriangles.length) return { rejected: { nodeIndex: socket.nodeIndex, name: socket.name, intent, rawTransform: socket.rawTransform, worldPositionM: position, worldUp: up, reasons: ['parent-mesh-has-no-triangle-geometry'] } }
  const ownTree = buildBvh(ownTriangles), nearest = nearestPoint(position, ownTree)
  if (!nearest) return { rejected: { nodeIndex: socket.nodeIndex, name: socket.name, intent, rawTransform: socket.rawTransform, worldPositionM: position, worldUp: up, reasons: ['no-measurable-parent-surface'] } }
  const normalDiff = dist(up, nearest.triangle.normal)
  const measurements: Record<string, unknown> = { sourceNode: socket.nodeIndex, socketToSurfaceDistanceM: nearest.distance, measuredPointM: nearest.point, measuredSurfaceNormal: nearest.triangle.normal, nearestTriangleIndex: nearest.triangle.index, upNormalVectorDifference: normalDiff, footprintSampleSpacingM: FOOTPRINT_SPACING }
  measurements.originalIntent = intent
  measurements.rawSocketTransform = socket.rawTransform
  measurements.worldSocketUp = up
  const failures: string[] = []
  if (nearest.distance > CONTACT_TOLERANCE) failures.push('socket-not-in-contact-with-parent-surface')
  if (normalDiff > UP_NORMAL_TOLERANCE) failures.push('socket-up-does-not-match-measured-surface-normal')
  const maxDot = Math.cos(FOOTPRINT_MAX_ANGLE_DEG * Math.PI / 180)
  const samples = radialSamples(nearest.point, up, footprint, FOOTPRINT_SPACING), failedSamples: Array<{ index: number; distanceM: number; normalDot: number }> = []
  for (let i = 0; i < samples.length; i++) {
    const result = nearestPoint(samples[i], ownTree)
    if (!result) { failedSamples.push({ index: i, distanceM: Infinity, normalDot: -1 }); continue }
    const normalDot = dot(result.triangle.normal, up)
    if (result.distance > CONTACT_TOLERANCE || normalDot < maxDot) failedSamples.push({ index: i, distanceM: result.distance, normalDot })
  }
  measurements.footprintSamples = samples.length; measurements.footprintFailedSamples = failedSamples.length; measurements.footprintMaxSlopeDeg = FOOTPRINT_MAX_ANGLE_DEG
  if (failedSamples.length) failures.push('footprint-not-supported-at-all-radial-samples')

  const seed: Vec3 = Math.abs(up[0]) < 0.75 ? [1, 0, 0] : [0, 0, 1]
  const tangent = unit(cross(seed, up)), bitangent = unit(cross(up, tangent)), blockers: Array<{ meshId: string; triangleIndex: number }> = []
  for (const triangle of allTriangles) {
    const supportSkin = dot(triangle.normal, up) >= maxDot && [triangle.a, triangle.b, triangle.c].every(p => Math.abs(dot(vec(p, nearest.point), up)) <= CONTACT_TOLERANCE)
    if (supportSkin) continue
    const local = [triangle.a, triangle.b, triangle.c].map(p => { const rel = vec(p, nearest.point); return { x: dot(rel, tangent), y: dot(rel, bitangent), z: dot(rel, up) } })
    if (cylinderIntersectsTriangle(local, clearance, CLEARANCE_BASE_OFFSET, clearance)) blockers.push({ meshId: triangle.meshId, triangleIndex: triangle.index })
  }
  measurements.clearanceEnvelope = { shape: 'oriented-cylinder', radiusM: clearance, heightM: clearance, baseOffsetM: CLEARANCE_BASE_OFFSET, blockerTriangleCount: blockers.length, blockers: blockers.slice(0, 8) }
  if (blockers.length) failures.push('clearance-cylinder-intersects-rock-geometry')
  if (failures.length) return { rejected: { nodeIndex: socket.nodeIndex, name: socket.name, intent, rawTransform: socket.rawTransform, worldPositionM: position, worldUp: up, reasons: failures, measurements } }
  return { supported: {
    name: socket.name, role: 'coral-mount' as const, parentMesh: intent.parentMesh as string, archetype: intent.archetype as string,
    positionM: position, normal: nearest.triangle.normal, rotation,
    footprintRadiusM: footprint, clearanceRadiusM: clearance,
    support: { pointM: nearest.point, normal: nearest.triangle.normal, supportedRadiusM: footprint, freeRadiusM: clearance, evidence: { method: 'surface-probes-v1' as const, geometrySha256: hash, report: reportPath } },
  }, measurements }
}

export function inspectRockSockets(bytes: Uint8Array, reportPath: string): SocketInspectionReport {
  const sourceSha256 = createHash('sha256').update(bytes).digest('hex')
  const parsed = parseGlb(bytes)
  const supportedSockets: VerifiedSocket[] = [], rejectedSockets: SocketInspectionReport['rejectedSockets'] = []
  const measurements: SocketInspectionReport['measurements'] = []
  let footprintSampleCount = 0
  if (parsed.rootAsset.units !== 'meter' || parsed.rootAsset.upAxis !== '+Y' || parsed.rootAsset.origin !== 'local') fail('reefAsset must declare units=meter, upAxis=+Y, origin=local')
  const nameCounts = new Map<string, number>()
  for (const socket of parsed.allSockets) nameCounts.set(socket.name, (nameCounts.get(socket.name) ?? 0) + 1)
  for (const socket of parsed.allSockets) {
    const intent = socket.intent
    const reasons = validIntent(intent, socket.name)
    if ((nameCounts.get(socket.name) ?? 0) > 1) reasons.push('duplicate-socket-name')
    const parentMesh = typeof intent?.parentMesh === 'string' ? intent.parentMesh : ''
    const parentRoleInvalid = parsed.triangles.some(t => t.meshId === parentMesh && t.role !== 'rock')
    if (parentRoleInvalid) reasons.push('parent-mesh-role-is-not-rock')
    if (reasons.length) {
      rejectedSockets.push({ nodeIndex: socket.nodeIndex, name: socket.name, intent: intent ?? null, rawTransform: socket.rawTransform, worldPositionM: socket.position, worldUp: socket.up, reasons })
      continue
    }
    const own = parsed.triangles.filter(t => t.meshId === parentMesh && t.role === 'rock')
    const result = intent ? measureSocket(socket, intent, own, parsed.triangles, sourceSha256, reportPath) : undefined
    const measuredCount = Number(result?.measurements?.footprintSamples ?? result?.rejected?.measurements?.footprintSamples ?? 0)
    footprintSampleCount += Number.isFinite(measuredCount) ? measuredCount : 0
    if (result?.supported) { supportedSockets.push(result.supported); measurements.push({ nodeIndex: socket.nodeIndex, name: socket.name, supported: true, data: result.measurements }) }
    else if (result?.rejected) { rejectedSockets.push(result.rejected); measurements.push({ nodeIndex: socket.nodeIndex, name: socket.name, supported: false, data: result.rejected.measurements ?? { reasons: result.rejected.reasons } }) }
    else rejectedSockets.push({ nodeIndex: socket.nodeIndex, name: socket.name, intent: intent ?? null, rawTransform: socket.rawTransform, worldPositionM: socket.position, worldUp: socket.up, reasons: reasons.length ? reasons : ['unsupported-socket'] })
  }
  return {
    schema: 'socket-support-inspection-v1', assetId: typeof parsed.rootAsset.id === 'string' ? parsed.rootAsset.id : null, sourceSha256,
    method: {
      contactToleranceM: CONTACT_TOLERANCE, upNormalVectorTolerance: UP_NORMAL_TOLERANCE, footprintSampleSpacingM: FOOTPRINT_SPACING,
      footprintSampleCount,
      footprintNormalMaxAngleDeg: FOOTPRINT_MAX_ANGLE_DEG,
      clearanceEnvelope: { shape: 'oriented-cylinder', radiusM: 'requested reefSocket.clearanceRadiusM', heightM: 'same as radius', baseOffsetM: CLEARANCE_BASE_OFFSET },
      limitations: [
        'Socket local/world basis must remain unit-scale and orthogonal; footprint and clearance radii are interpreted in exported asset meters.',
        'Contact normal uses the geometric normal of the nearest triangle; at shared-vertex ties it is facet-sensitive and may select one of several incident faces.',
        'Footprint support is a finite radial sample lattice at the reported spacing, not a continuous disk certificate.',
        'Clearance checks only intersection with an oriented rock-space cylinder; it does not prove whole-colony fit, fish passage or biological suitability.',
        'Only the default glTF scene and embedded, uncompressed TRIANGLES geometry are inspected.',
      ],
    },
    supportedSockets, measurements, rejectedSockets,
  }
}

