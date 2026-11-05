import { createHash } from 'node:crypto'
import { Matrix4, Quaternion, Vector3 } from 'three'

export type FishClipEnvelopeOptions = {
  expectedSha256: string
  clipName: string
  sourceReference: { lengthAxis: '+Z'; lengthM: number; authority: string }
  adultLengthM: number
  composition: 'single-clip' | 'procedural-overlay' | 'clip-blend'
  boundedOverlay?: BoundedFishOverlayInput
}
export type BoundedFishOverlayInput = {
  contractBytes: Uint8Array
  expectedContractSha256: string
  producerBytes: Uint8Array
  resetAdapterBytes: Uint8Array
}
export type BoundedFishOverlayContract = {
  schema: 'bounded-fish-overlay-v1'
  sourceSha256: string
  clipName: string
  producerSha256: string
  resetAdapterSha256: string
  verification: 'root-reviewed-source-and-reset'
  reviewEvidence: string
  resetPolicy: 'restore-clean-before-mixer-normalize-capture-before-overlay'
  quaternionComposition: 'clip-times-ordered-local-rotations'
  joints: { nodeIndex: number; jointName: string; rotations: { axis: [number, number, number]; maxAbsAngleRad: number }[] }[]
}
export type ClipSphereCertificate = {
  scope: 'single-clip-only'
  sourceSha256: string
  assetId: string
  clipName: string
  centerM: [number, number, number]
  radiusM: number
  uniformScale: number
  sourceReference: FishClipEnvelopeOptions['sourceReference']
  adultLengthM: number
  geometry: { vertices: number; triangles: number; joints: number; maxJointDepth: number }
  proof: {
    method: 'joint-product-telescope-and-whole-slerp-chord-bounds'
    sourceRadiusM: number
    referenceDisplacementRadiusM: number
    allRotationRadiusM: number
    maxLocalRotationDifferenceNorm: number
    coversTriangleInteriors: true
    sampledPosesUsedAsProof: false
    work: number
  }
  numerics: {
    weightEvaluation: 'nonnegative-l1-normalize-then-float32-store'
    sourceWeightSumRange: [number, number]
    normalizedWeightSumRange: [number, number]
    maxSourceQuaternionNormError: number
    sourceQuaternionNormAllowanceM: number
    scalarOperationBudget: number
    binary32UnitRoundoff: number
    absoluteArithmeticBoundM: number
    paddingM: number
  }
  requires: readonly string[]
  excludes: readonly string[]
}
export type FishClipEnvelopeResult =
  | { status: 'ready'; activeEnvelope: ClipSphereCertificate | BoundedOverlaySphereCertificate; clipOnly: ClipSphereCertificate }
  | { status: 'unavailable'; reason: string; clipOnly?: ClipSphereCertificate }
export type BoundedOverlaySphereCertificate = Omit<ClipSphereCertificate, 'scope'> & {
  scope: 'bounded-procedural-overlay'
  overlay: {
    contractSha256: string
    producerSha256: string
    resetAdapterSha256: string
    verification: 'source-bytes-verified-semantics-root-attested'
    reviewEvidence: string
    resetPolicy: BoundedFishOverlayContract['resetPolicy']
    quaternionComposition: BoundedFishOverlayContract['quaternionComposition']
    joints: BoundedFishOverlayContract['joints']
  }
}

const MAX_BYTES = 16 * 1024 * 1024, MAX_WORK = 4_000_000
const FLOAT_U = 2 ** -24, SQRT3_UP = 1.732050807568878
const identityQ = [0, 0, 0, 1], identityS = [1, 1, 1], zero = [0, 0, 0]
const fail = (message: string): never => { throw new Error(message) }
const check = (condition: unknown, message: string) => { if (!condition) fail(message) }
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const array = (x: any, n: number, label: string, limit = 16): number[] => {
  check(Array.isArray(x) && x.length === n && x.every((v: unknown) => finite(v) && Math.abs(v) <= limit), `Invalid ${label}`)
  return [...x]
}
const norm = (v: readonly number[]) => Math.hypot(...v)
const norm1 = (v: readonly number[]) => v.reduce((sum, x) => sum + Math.abs(x), 0)
const distanceQ = (a: readonly number[], b: readonly number[]) => Math.min(
  Math.hypot(...a.map((v, i) => v - b[i])), Math.hypot(...a.map((v, i) => v + b[i])),
)
const vec = (v: readonly number[]) => new Vector3(v[0], v[1], v[2])
const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i])
const compose = (t: number[], q: number[], s: number[]) => new Matrix4().compose(vec(t), new Quaternion(...q as [number, number, number, number]), vec(s))

/** Offline only. The returned sphere certifies the declared normalized single-clip
 * skinning contract, not a renderer's unvalidated overlay or shader deformation. */
export function analyzeFishClipEnvelope(bytes: Uint8Array, options: FishClipEnvelopeOptions): FishClipEnvelopeResult {
  try {
    check(bytes instanceof Uint8Array && bytes.byteLength >= 28 && bytes.byteLength <= MAX_BYTES, 'Require bounded GLB bytes')
    const buffer = Buffer.from(bytes) // Own bytes before hashing/decoding.
    const sourceSha256 = createHash('sha256').update(buffer).digest('hex')
    const expectedSha256 = options?.expectedSha256, clipName = options?.clipName, adultLengthM = options?.adultLengthM, requestedComposition = options?.composition, overlayInput = options?.boundedOverlay
    const suppliedReference = options?.sourceReference
    const reference = { lengthAxis: suppliedReference?.lengthAxis, lengthM: suppliedReference?.lengthM, authority: suppliedReference?.authority }
    check(typeof expectedSha256 === 'string' && /^[a-f0-9]{64}$/.test(expectedSha256) && expectedSha256 === sourceSha256, 'Exact source hash mismatch')
    check(typeof clipName === 'string' && clipName.length > 0, 'Require selected clip name')
    check(reference && reference.lengthAxis === '+Z' && finite(reference.lengthM) && reference.lengthM > 0 && reference.lengthM <= 2
      && typeof reference.authority === 'string' && reference.authority.trim().length > 0 && reference.authority.length <= 1024, 'Require explicit verified +Z metric source-reference authority and length')
    check(finite(adultLengthM) && adultLengthM > 0 && adultLengthM <= 2, 'Require explicit positive bounded adult length in meters')
    check(['single-clip', 'procedural-overlay', 'clip-blend'].includes(requestedComposition), 'Unknown playback composition')
    check(!overlayInput || requestedComposition === 'procedural-overlay', 'Bounded overlay supplied for non-overlay composition')
    const sourceReference = { ...reference }, uniformScale = adultLengthM / reference.lengthM
    check(uniformScale <= 100, 'Adult uniform scale exceeds supported limit')
    check(buffer.readUInt32LE(0) === 0x46546c67 && buffer.readUInt32LE(4) === 2 && buffer.readUInt32LE(8) === buffer.length, 'Invalid GLB header')
    const jsonLength = buffer.readUInt32LE(12), binaryHeader = 20 + jsonLength
    check(jsonLength % 4 === 0 && binaryHeader + 8 <= buffer.length && buffer.readUInt32LE(16) === 0x4e4f534a, 'Require first JSON chunk')
    const binaryLength = buffer.readUInt32LE(binaryHeader)
    check(buffer.readUInt32LE(binaryHeader + 4) === 0x004e4942 && binaryLength % 4 === 0 && binaryHeader + 8 + binaryLength === buffer.length, 'Require exactly one embedded BIN chunk')
    const doc = JSON.parse(buffer.toString('utf8', 20, binaryHeader))
    let work = 0
    const spend = (n = 1) => { work += n; check(work <= MAX_WORK, 'Analyzer work limit exceeded') }
    // Khronos KHR_materials_specular changes BRDF reflection factors/textures,
    // not positions/skins. Only its material attachment is allowed. Definition:
    // https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_specular
    const materials = new Set(Array.isArray(doc.materials) ? doc.materials : [])
    const scan = [doc]
    while (scan.length) {
      const value = scan.pop(); spend()
      if (!value || typeof value !== 'object') continue
      if (Array.isArray(value)) { check(value.length <= 300_000, 'JSON array exceeds supported limit'); for (const item of value) scan.push(item) }
      else {
        check(!value.extensions || Object.keys(value.extensions).length === 0
          || (materials.has(value) && Object.keys(value.extensions).every(key => key === 'KHR_materials_specular')), 'Geometry/node/accessor/unknown extensions are unsupported')
        check(!value.extensionsRequired?.length, 'Required extensions are unsupported')
        check(!value.extensionsUsed?.length || (value === doc && Array.isArray(value.extensionsUsed)
          && value.extensionsUsed.every((x: unknown) => x === 'KHR_materials_specular')), 'Unknown extension declaration')
        scan.push(...Object.values(value))
      }
    }
    check(doc.asset?.version === '2.0' && Array.isArray(doc.buffers) && doc.buffers.length === 1 && !doc.buffers[0].uri, 'Require one embedded glTF2 buffer')
    const declaredBinary = doc.buffers[0].byteLength
    check(Number.isSafeInteger(declaredBinary) && declaredBinary > 0 && declaredBinary <= binaryLength && binaryLength - declaredBinary <= 3, 'Invalid declared binary length')
    const binary = buffer.subarray(binaryHeader + 8, binaryHeader + 8 + declaredBinary)
    check(Array.isArray(doc.accessors) && doc.accessors.length <= 256 && Array.isArray(doc.bufferViews) && doc.bufferViews.length <= 256, 'Accessor limits exceeded')
    const access = (index: number, type: string, components: number, allowed: number[], maxCount: number): number[][] => {
      check(Number.isSafeInteger(index) && index >= 0 && index < doc.accessors.length, 'Invalid accessor index')
      const a = doc.accessors[index]
      check(a && a.type === type && allowed.includes(a.componentType) && !a.normalized && !a.sparse && Number.isSafeInteger(a.count) && a.count > 0 && a.count <= maxCount, 'Unsupported accessor type/count/normalization/sparse data')
      check(Number.isSafeInteger(a.bufferView) && a.bufferView >= 0 && a.bufferView < doc.bufferViews.length, 'Invalid buffer view')
      const v = doc.bufferViews[a.bufferView], size = a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 1
      const start = v.byteOffset ?? 0, offset = a.byteOffset ?? 0, stride = v.byteStride ?? components * size
      check(v.buffer === 0 && [start, offset, v.byteLength, stride].every(x => Number.isSafeInteger(x) && x >= 0)
        && start % size === 0 && offset % size === 0 && stride % size === 0 && stride >= components * size && stride <= 252
        && start + v.byteLength <= binary.length && offset + (a.count - 1) * stride + components * size <= v.byteLength, 'Accessor data exceeds aligned buffer-view bounds')
      const rows: number[][] = []
      for (let i = 0; i < a.count; i++) {
        spend(components)
        const row = []
        for (let c = 0; c < components; c++) {
          const at = start + offset + i * stride + c * size
          const x = a.componentType === 5126 ? binary.readFloatLE(at) : size === 4 ? binary.readUInt32LE(at) : size === 2 ? binary.readUInt16LE(at) : binary.readUInt8(at)
          check(Number.isFinite(x), 'Nonfinite accessor value'); row.push(x)
        }
        rows.push(row)
      }
      return rows
    }
    check(Array.isArray(doc.nodes) && doc.nodes.length >= 3 && doc.nodes.length <= 34 && Array.isArray(doc.scenes) && doc.scenes.length === 1 && (doc.scene ?? 0) === 0, 'Require bounded single scene')
    const nodes: any[] = doc.nodes, rootIds = doc.scenes[0].nodes
    check(Array.isArray(rootIds) && rootIds.length === 1 && Number.isSafeInteger(rootIds[0]) && nodes[rootIds[0]], 'Require one asset root')
    const rootId = rootIds[0], parents = new Map<number, number>(), visited = new Set<number>()
    const visit = (id: number, depth: number) => {
      spend(); check(Number.isSafeInteger(id) && id >= 0 && id < nodes.length && !visited.has(id) && depth <= 16, 'Cycle/instance/invalid node or hierarchy depth limit')
      visited.add(id)
      const n = nodes[id]; check(n && !n.matrix && !n.weights && !n.camera, 'Unsupported node transform/morph/camera')
      check(n.children === undefined || Array.isArray(n.children), 'Invalid child nodes')
      for (const child of n.children ?? []) { check(!parents.has(child), 'Multiple parents unsupported'); parents.set(child, id); visit(child, depth + 1) }
    }
    visit(rootId, 0); check(visited.size === nodes.length, 'Inactive nodes unsupported')
    const root = nodes[rootId], metadata = root.extras?.reefAsset
    check(nodes.every((n, i) => i === rootId || !n.extras?.reefAsset), 'Nested asset scope unsupported')
    check(metadata?.schema === 'reef-asset-v1' && metadata.kind === 'fish' && metadata.units === 'meter' && metadata.upAxis === '+Y' && metadata.origin === 'local'
      && typeof metadata.id === 'string' && metadata.id.length > 0, 'Require canonical meter/+Y local fish metadata')
    const T = nodes.map(n => array(n.translation ?? zero, 3, 'node translation', 2)), S = nodes.map(n => array(n.scale ?? identityS, 3, 'node scale', 4))
    check(S.every(s => s.every(x => x > 0)), 'Nonpositive scale unsupported')
    let maxQuaternionNormError = 0
    const unitQ = (value: any) => {
      const q = array(value, 4, 'unit quaternion', 1.000001), length = norm(q)
      check(Math.abs(length - 1) <= 1e-6, 'Quaternion is not approximately unit')
      maxQuaternionNormError = Math.max(maxQuaternionNormError, Math.abs(length - 1))
      return q.map(v => v / length)
    }
    const Q = nodes.map(n => unitQ(n.rotation ?? identityQ))
    check(same(T[rootId], zero) && same(S[rootId], identityS) && distanceQ(Q[rootId], identityQ) === 0, 'Root transform must be identity')
    check(Array.isArray(doc.meshes) && doc.meshes.length === 1 && !doc.meshes[0].weights && doc.meshes[0].primitives?.length === 1
      && Array.isArray(doc.skins) && doc.skins.length === 1 && Array.isArray(doc.animations) && doc.animations.length === 1, 'Require one mesh/primitive/skin/clip')
    const meshIds = nodes.flatMap((n, i) => n.mesh === undefined ? [] : [i])
    check(meshIds.length === 1, 'Require one active mesh instance')
    const meshId = meshIds[0], meshNode = nodes[meshId], primitive = doc.meshes[0].primitives[0], skin = doc.skins[0]
    check(meshNode.mesh === 0 && meshNode.skin === 0 && parents.get(meshId) === rootId && !meshNode.children?.length
      && same(T[meshId], zero) && same(S[meshId], identityS) && distanceQ(Q[meshId], identityQ) === 0, 'Mesh must be identity directly under root')
    check((primitive.mode ?? 4) === 4 && !primitive.targets?.length && primitive.attributes && Object.keys(primitive.attributes).every(k => ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'].includes(k)), 'Unsupported topology/attributes/morph targets')
    const jointIds: number[] = skin.joints
    check(Array.isArray(jointIds) && jointIds.length > 0 && jointIds.length <= 32 && new Set(jointIds).size === jointIds.length
      && jointIds.every(id => visited.has(id) && id !== rootId && id !== meshId), 'Invalid skin joints')
    check(nodes.length === jointIds.length + 2 && nodes.every((n, i) => i === rootId || i === meshId || jointIds.includes(i)), 'Unsupported nonjoint transform scopes')
    check(nodes.every((n, i) => i === meshId || n.skin === undefined), 'Unexpected skin reference')
    if (skin.skeleton !== undefined) check(jointIds.includes(skin.skeleton), 'Unsupported skeleton root')
    const paths = jointIds.map(id => {
      const path = []
      while (id !== rootId) { check(jointIds.includes(id), 'Joint hierarchy must end at asset root'); path.unshift(id); id = parents.get(id)! }
      return path
    })
    const maxDepth = Math.max(...paths.map(p => p.length))
    const ibms = access(skin.inverseBindMatrices, 'MAT4', 16, [5126], 32).map(m => {
      check(m.every(x => Math.abs(x) <= 16) && m[3] === 0 && m[7] === 0 && m[11] === 0 && m[15] === 1, 'Invalid affine inverse bind matrix')
      return new Matrix4().fromArray(m)
    })
    check(ibms.length === jointIds.length, 'Inverse bind count mismatch')
    const bindLocals = nodes.map((_, i) => compose(T[i], Q[i], S[i]))
    for (let j = 0; j < paths.length; j++) {
      const bind = new Matrix4()
      for (const id of paths[j]) bind.multiply(bindLocals[id])
      const product = bind.multiply(ibms[j]).elements
      check(product.every((x, i) => Math.abs(x - (i % 5 === 0 ? 1 : 0)) <= 1e-5), 'Inverse bind does not match declared global bind transform')
    }
    const positions = access(primitive.attributes.POSITION, 'VEC3', 3, [5126], 50_000)
    const weights = access(primitive.attributes.WEIGHTS_0, 'VEC4', 4, [5126], 50_000)
    const joints = access(primitive.attributes.JOINTS_0, 'VEC4', 4, [5121, 5123], 50_000)
    const indices = access(primitive.indices, 'SCALAR', 1, [5123, 5125], 300_000)
    check(weights.length === positions.length && joints.length === positions.length && positions.every(p => p.every(x => Math.abs(x) <= 2))
      && indices.length % 3 === 0 && indices.every(([i]) => i < positions.length), 'Geometry count/index/coordinate mismatch')
    const lows = [Infinity, Infinity, Infinity], highs = [-Infinity, -Infinity, -Infinity]
    for (const p of positions) for (let c = 0; c < 3; c++) { lows[c] = Math.min(lows[c], p[c]); highs[c] = Math.max(highs[c], p[c]) }
    const sourceLength = highs[2] - lows[2]
    check(Math.abs(sourceLength - sourceReference.lengthM) <= 1e-9, 'Explicit +Z source reference differs from exact geometry')
    check(Array.isArray(metadata.dimensionsM) && metadata.dimensionsM.length === 3 && metadata.dimensionsM.every((x: number, i: number) => finite(x) && Math.abs(x - (highs[i] - lows[i])) <= 1e-5), 'Declared meter dimensions mismatch')
    const clip = doc.animations[0]
    check(clip.name === clipName && Array.isArray(clip.channels) && clip.channels.length > 0 && clip.channels.length <= 96 && Array.isArray(clip.samplers) && clip.samplers.length <= 96, 'Selected single clip missing or channel limits exceeded')
    const deltas = nodes.map(() => 0), targets = new Set<string>(), rotationTargets = new Set<number>()
    for (const channel of clip.channels) {
      const id = channel.target?.node, path = channel.target?.path, key = `${id}/${path}`
      check(jointIds.includes(id) && ['rotation', 'translation', 'scale'].includes(path) && !targets.has(key), 'Unsupported/duplicate animation target')
      targets.add(key)
      check(Number.isSafeInteger(channel.sampler) && channel.sampler >= 0 && channel.sampler < clip.samplers.length, 'Invalid animation sampler')
      const sampler = clip.samplers[channel.sampler], interpolation = sampler.interpolation ?? 'LINEAR'
      const times = access(sampler.input, 'SCALAR', 1, [5126], 4096).map(([t]) => t)
      check(times.length >= 2 && times.every((t, i) => t >= 0 && t <= 60 && (i === 0 || t > times[i - 1])), 'Invalid bounded animation timestamps')
      const values = access(sampler.output, path === 'rotation' ? 'VEC4' : 'VEC3', path === 'rotation' ? 4 : 3, [5126], 4096)
      check(values.length === times.length, 'Animation key count mismatch')
      if (path !== 'rotation') {
        check(interpolation === 'STEP' && values.every(v => same(v, values[0])), 'Only constant STEP translation/scale is supported')
        const value = array(values[0], 3, `clip ${path}`, path === 'scale' ? 4 : 2)
        if (path === 'scale') { check(value.every(x => x > 0), 'Nonpositive animated scale'); S[id] = value } else T[id] = value
      } else {
        rotationTargets.add(id)
        check(interpolation === 'LINEAR' || (interpolation === 'STEP' && values.every(v => same(v, values[0]))), 'Only shortest LINEAR or constant STEP rotation is supported')
        const quats = values.map(unitQ)
        for (let k = 0; k + 1 < quats.length; k++) {
          // For short S3 arcs alpha<=pi/2, alpha<=2*endpoint chord.
          // Every point is within that arc length of either endpoint. Both
          // signs of the reference quaternion represent the same rotation.
          const travel = 2 * distanceQ(quats[k], quats[k + 1])
          const endpoint = Math.min(distanceQ(quats[k], Q[id]), distanceQ(quats[k + 1], Q[id]))
          deltas[id] = Math.max(deltas[id], Math.min(2, 2 * (endpoint + travel) + 1e-12))
        }
      }
    }
    check(rotationTargets.size === jointIds.length, 'Every skin joint requires an explicit selected-clip rotation track')
    const locals = nodes.map((_, i) => compose(T[i], Q[i], S[i])), scaleNorm = S.map(s => Math.max(...s))
    const prefixNorms = paths.map(path => { let scale = 1; return path.map(id => { const result = scale; scale *= scaleNorm[id]; return result }) })
    const makeCertificate = (localDeltas: number[], additionalRotations = 0): ClipSphereCertificate => {
      let rawWeightMin = Infinity, rawWeightMax = -Infinity, storedWeightMin = Infinity, storedWeightMax = -Infinity
      let referenceRadius = 0, allRotationRadius = 0, absoluteBound = 0
      for (let v = 0; v < positions.length; v++) {
        const raw = weights[v], sum = raw.reduce((a, b) => a + b, 0)
        check(raw.every(w => w >= 0 && w <= 1) && sum >= .9999 && sum <= 1.0001, 'Invalid nonnegative skin weights or sum')
        check(joints[v].every(j => j < jointIds.length), 'Skin joint index outside palette')
        rawWeightMin = Math.min(rawWeightMin, sum); rawWeightMax = Math.max(rawWeightMax, sum)
        // Matches GLTFLoader -> SkinnedMesh.normalizeSkinWeights -> Float32 store.
        const w = raw.map(x => Math.fround(x * (1 / sum))), storedSum = w.reduce((a, b) => a + b, 0)
        storedWeightMin = Math.min(storedWeightMin, storedSum); storedWeightMax = Math.max(storedWeightMax, storedSum)
        const referencePoint = new Vector3(); let displacement = 0, coarse = 0, absolute = 0
        for (let influence = 0; influence < 4; influence++) {
          if (w[influence] === 0) continue
          const j = joints[v][influence], path = paths[j], matrix = ibms[j]
          let point = vec(positions[v]).applyMatrix4(matrix), delta = 0, chain = point.length()
          const e = matrix.elements, p = positions[v]
          let absoluteChain = 0
          for (let r = 0; r < 3; r++) absoluteChain += Math.abs(e[12 + r]) + p.reduce((s, x, c) => s + Math.abs(e[c * 4 + r] * x), 0)
          for (let k = path.length - 1; k >= 0; k--) {
            spend(12); const id = path[k], scale = scaleNorm[id]
            delta += prefixNorms[j][k] * scale * localDeltas[id] * point.length()
            chain = norm(T[id]) + scale * chain
            absoluteChain = norm1(T[id]) + SQRT3_UP * scale * absoluteChain
            point = point.applyMatrix4(locals[id])
          }
          referencePoint.addScaledVector(point, w[influence]); displacement += w[influence] * delta
          coarse += w[influence] * chain; absolute += w[influence] * absoluteChain
        }
        referenceRadius = Math.max(referenceRadius, referencePoint.length() + displacement)
        allRotationRadius = Math.max(allRotationRadius, coarse); absoluteBound = Math.max(absoluteBound, absolute)
      }
      // Deliberately generous sequential-operation bound for local matrix/quaternion
      // evaluation, hierarchy products, four-influence LBS and normalized-weight store.
      // Conditional on standard round-to-nearest binary32 arithmetic, no fast-math
      // reassociation/deformation, and unit quaternion evaluation as declared below.
      const scalarOperationBudget = 256 * (maxDepth + 2) + 256 + 128 * additionalRotations
      const gamma = scalarOperationBudget * FLOAT_U / (1 - scalarOperationBudget * FLOAT_U)
      const sourceRadius = Math.min(referenceRadius, allRotationRadius)
      // Keep the observed authored norm error visible and budgeted as well as
      // requiring normalized evaluation. This is not permission to substitute an
      // unvalidated raw-quaternion interpolator for the declared contract.
      const sourceQuaternionNormAllowanceM = 64 * maxQuaternionNormError * (maxDepth + additionalRotations + 1) * absoluteBound * uniformScale
      const paddingM = Math.max(1e-6, gamma * absoluteBound * uniformScale + sourceQuaternionNormAllowanceM + 1e-9)
      const radiusM = sourceRadius * uniformScale + paddingM
      check(Number.isFinite(radiusM) && radiusM > 0 && radiusM <= 10 && Number.isFinite(absoluteBound), 'Unbounded envelope arithmetic')
      const certificate: ClipSphereCertificate = {
        scope: 'single-clip-only', sourceSha256, assetId: metadata.id, clipName,
        centerM: [0, 0, 0], radiusM, uniformScale, sourceReference, adultLengthM,
        geometry: { vertices: positions.length, triangles: indices.length / 3, joints: jointIds.length, maxJointDepth: maxDepth },
        proof: { method: 'joint-product-telescope-and-whole-slerp-chord-bounds', sourceRadiusM: sourceRadius,
          referenceDisplacementRadiusM: referenceRadius, allRotationRadiusM: allRotationRadius,
          maxLocalRotationDifferenceNorm: Math.max(...localDeltas), coversTriangleInteriors: true, sampledPosesUsedAsProof: false, work },
        numerics: { weightEvaluation: 'nonnegative-l1-normalize-then-float32-store', sourceWeightSumRange: [rawWeightMin, rawWeightMax],
          normalizedWeightSumRange: [storedWeightMin, storedWeightMax], maxSourceQuaternionNormError: maxQuaternionNormError, sourceQuaternionNormAllowanceM,
          scalarOperationBudget, binary32UnitRoundoff: FLOAT_U, absoluteArithmeticBoundM: absoluteBound * uniformScale, paddingM },
        requires: [
          'Exactly the selected normal clip at weight 1; arbitrary time/speed, clamped endpoints or looping within its key range.',
          'Unit-normalized shortest-arc playback between authored rotation keys; deterministic evaluation from clip/reference pose, no accumulated rotations.',
          'Declared constant translation/scales, exact inverse binds, nonnegative L1-normalized Float32 skin weights and standard linear blend skinning.',
          'Standard round-to-nearest binary32 or more accurate arithmetic within the reported operation budget; unit-quaternion normalization is part of the contract.',
          'Uniform adult scale about the declared root origin; source +Z length/anatomical authority and biological adult length are caller responsibilities.',
        ],
        excludes: ['Procedural turning overlays', 'Clip blending/additive clips', 'Morph/shader displacement', 'Unvalidated renderer arithmetic/fast-math', 'Biological or art approval'],
      }
      return certificate
    }
    const certificate = makeCertificate(deltas)
    if (requestedComposition === 'procedural-overlay' && overlayInput) {
      const ownBytes = (input: unknown, limit: number, label: string) => {
        check(input instanceof Uint8Array && input.byteLength > 0 && input.byteLength <= limit, `Invalid bounded ${label} bytes`)
        return Buffer.from(input as Uint8Array)
      }
      const expectedContractSha256 = overlayInput.expectedContractSha256
      const contractBytes = ownBytes(overlayInput.contractBytes, 64 * 1024, 'overlay contract')
      const producerBytes = ownBytes(overlayInput.producerBytes, 256 * 1024, 'overlay producer')
      const resetBytes = ownBytes(overlayInput.resetAdapterBytes, 256 * 1024, 'reset adapter')
      const hash = (input: Uint8Array) => createHash('sha256').update(input).digest('hex')
      const contractSha256 = hash(contractBytes)
      check(typeof expectedContractSha256 === 'string' && /^[a-f0-9]{64}$/.test(expectedContractSha256)
        && expectedContractSha256 === contractSha256, 'Overlay contract hash mismatch')
      const contract: BoundedFishOverlayContract = JSON.parse(contractBytes.toString('utf8'))
      check(contract?.schema === 'bounded-fish-overlay-v1' && contract.sourceSha256 === sourceSha256 && contract.clipName === clipName, 'Overlay fish source/clip identity mismatch')
      check(contract.verification === 'root-reviewed-source-and-reset' && typeof contract.reviewEvidence === 'string'
        && contract.reviewEvidence.trim().length > 0 && contract.reviewEvidence.length <= 4096, 'Overlay/reset review is unverified')
      check(contract.resetPolicy === 'restore-clean-before-mixer-normalize-capture-before-overlay'
        && contract.quaternionComposition === 'clip-times-ordered-local-rotations', 'Unsupported overlay reset/composition contract')
      check(hash(producerBytes) === contract.producerSha256 && hash(resetBytes) === contract.resetAdapterSha256, 'Overlay producer/reset source bytes differ from reviewed contract')
      check(Array.isArray(contract.joints) && contract.joints.length === jointIds.length, 'Overlay contract must cover every skin joint, including zero-cap joints')
      const seen = new Set<number>(), names = new Set<string>(), addedDeltas = nodes.map(() => 0), rotationCounts = nodes.map(() => 0)
      for (const entry of contract.joints) {
        spend()
        check(entry && Number.isSafeInteger(entry.nodeIndex) && jointIds.includes(entry.nodeIndex) && !seen.has(entry.nodeIndex)
          && typeof entry.jointName === 'string' && entry.jointName.length > 0 && nodes[entry.nodeIndex].name === entry.jointName
          && !names.has(entry.jointName), 'Overlay joint id/name/uniqueness mismatch')
        seen.add(entry.nodeIndex); names.add(entry.jointName)
        check(Array.isArray(entry.rotations) && entry.rotations.length <= 2, 'Require at most two ordered local rotations per joint')
        for (const rotation of entry.rotations) {
          spend(); const axis = array(rotation?.axis, 3, 'overlay local axis', 1)
          check(Math.abs(norm(axis) - 1) <= 1e-9 && finite(rotation.maxAbsAngleRad) && rotation.maxAbsAngleRad >= 0 && rotation.maxAbsAngleRad <= Math.PI, 'Invalid overlay unit axis/angle cap')
          // ||R(a)-I||=2sin(|a|/2)<=min(2,|a|). For an ordered
          // product, telescope differences and use unit rotation norms.
          addedDeltas[entry.nodeIndex] += Math.min(2, rotation.maxAbsAngleRad)
          rotationCounts[entry.nodeIndex]++
        }
      }
      const combined = deltas.map((clipDelta, id) => Math.min(2, clipDelta + addedDeltas[id] + 1e-12))
      const maxAdditionalRotations = Math.max(...paths.map(path => path.reduce((sum, id) => sum + rotationCounts[id], 0)))
      const overlayBase = makeCertificate(combined, maxAdditionalRotations)
      const activeEnvelope: BoundedOverlaySphereCertificate = {
        ...overlayBase, scope: 'bounded-procedural-overlay',
        overlay: {
          contractSha256, producerSha256: hash(producerBytes), resetAdapterSha256: hash(resetBytes),
          verification: 'source-bytes-verified-semantics-root-attested', reviewEvidence: contract.reviewEvidence,
          resetPolicy: contract.resetPolicy, quaternionComposition: contract.quaternionComposition, joints: contract.joints,
        },
        requires: [...overlayBase.requires,
          'Only the exact source-bound ordered per-joint rotations, within every reported cap, after a clean clip reset/capture on every application.',
          'Root-reviewed producer and reset-adapter semantics must correspond to the hashed bytes and be used by the actual renderer; this offline analyzer verifies byte identities, not review authority or renderer installation.',
        ],
        excludes: ['Unbound/additional procedural overlays', ...overlayBase.excludes.filter(item => item !== 'Procedural turning overlays')],
      }
      return { status: 'ready', activeEnvelope, clipOnly: certificate }
    }
    if (requestedComposition !== 'single-clip') return { status: 'unavailable', reason: `Unvalidated ${requestedComposition}; clip-only sphere must not certify this playback`, clipOnly: certificate }
    return { status: 'ready', activeEnvelope: certificate, clipOnly: certificate }
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
  }
}
