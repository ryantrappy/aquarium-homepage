import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../../../', import.meta.url))
if (process.argv.length > 3) throw new Error('Usage: node audit-coral-bounds.mjs [output.json]')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const pin = async relative => sha(await readFile(join(repo, relative)))
const expectedPins = {
  'src/rendering/scene/reef-assembly.ts': '0c2187458fb7ff22159f5d0ce221eb9983d7186288633999b12bcdebca36538a',
  'src/rendering/scene/coral-material.ts': '93db5d62466824927872926ed53ea59a4ef5306bb8457ed8c04fbc80e2e21953',
  'src/rendering/assets/corals/manifest.json': '6cab6a72c3dedaee2824155ae452793de90ed7fda4e596f7ccdc767ade983af4',
}
for (const [path, expected] of Object.entries(expectedPins)) {
  const actual = await pin(path)
  if (actual !== expected) throw new Error(`Source pin changed for ${path}: ${actual}`)
}

const manifest = JSON.parse(await readFile(join(repo, 'src/rendering/assets/corals/manifest.json'), 'utf8'))
const assets = manifest.assets.filter(asset => asset.id.startsWith('coral-'))
if (assets.length !== 8) throw new Error(`Expected exactly 8 coral assets; found ${assets.length}`)

function glbDocument(bytes, file) {
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2) throw new Error(`${file}: invalid GLB v2 header`)
  const jsonLength = bytes.readUInt32LE(12)
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${file}: first chunk is not JSON`)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
  const binHeader = 20 + jsonLength
  if (bytes.readUInt32LE(binHeader + 4) !== 0x004e4942) throw new Error(`${file}: second chunk is not BIN`)
  return { json, bin: bytes.subarray(binHeader + 8) }
}

const componentBytes = new Map([[5121, 1], [5123, 2], [5125, 4], [5126, 4]])
function accessorRows(doc, bin, accessorId, expectedType, expectedComponents) {
  const accessor = doc.accessors[accessorId]
  if (!accessor || accessor.type !== expectedType || accessor.sparse) throw new Error(`Unsupported ${expectedType} accessor`)
  const componentByteLength = componentBytes.get(accessor.componentType)
  if (!componentByteLength) throw new Error(`Unsupported GLTF component type ${accessor.componentType}`)
  const view = doc.bufferViews[accessor.bufferView]
  if (!view || (accessor.count && expectedComponents * componentByteLength > (view.byteStride ?? expectedComponents * componentByteLength))) {
    throw new Error(`Malformed accessor ${accessorId}`)
  }
  const byteOffset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const stride = view.byteStride ?? expectedComponents * componentByteLength
  const readComponent = offset => {
    switch (accessor.componentType) {
      case 5121: { const value = bin.readUInt8(offset); return accessor.normalized ? value / 255 : value }
      case 5123: { const value = bin.readUInt16LE(offset); return accessor.normalized ? value / 65535 : value }
      case 5125: { const value = bin.readUInt32LE(offset); return accessor.normalized ? value / 4294967295 : value }
      case 5126: return bin.readFloatLE(offset)
      default: throw new Error(`Unsupported component type ${accessor.componentType}`)
    }
  }
  return Array.from({ length: accessor.count }, (_, row) => Array.from({ length: expectedComponents }, (_, component) =>
    readComponent(byteOffset + row * stride + component * componentByteLength)))
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const defaultAmplitudeM = 0.014
const report = {
  schema: 'aq42-coral-shader-bounds-source-audit-v1',
  status: 'read-only-source-pinned-analytic-bounds-reproduction',
  sourcePins: {},
  method: {
    amplitudeM: defaultAmplitudeM,
    formulas: {
      tuck: '1 - smoothstep(-0.006, 0.018, y)',
      softFlex: 'pow(clamp(R, 0, 1), 1.8)',
      maxDx: '0.45 * tuck * abs(x) + 1.38 * A * flex',
      maxDy: '0.008 * tuck + 0.18 * (1.38 + 1.10) * A * flex^2',
      maxDz: '0.45 * tuck * abs(z) + 1.10 * A * flex',
      vertexMargin: 'sqrt(maxDx^2 + maxDy^2 + maxDz^2)',
      numericPad: '1e-5 * max(1, abs(x)+maxDx, abs(y)+maxDy, abs(z)+maxDz)',
      geometryExpansion: 'max(vertexMargin) + 1e-5 * max(numericScale), added to original geometry.boundingSphere.radius',
    },
    rigidRole: 'flex=0, so only skirt tuck contributes; raw R does not add flow displacement.',
    conservatism: 'Each component uses independent absolute sine/cosine maxima; their Euclidean combination upper-bounds the per-vertex displacement even when extrema are not simultaneous. Adding that maximum displacement to the original sphere radius covers every displaced vertex; a sphere also covers triangle interiors by convexity.',
    notSamplingProof: 'No time or pose samples are used to establish this analytic envelope. CPU/GPU finite-precision safety is the stated scaled numerical pad plus runtime Float32 overflow fail-open checks.',
    limits: [
      'Exact current GLB POSITION and normalized COLOR_0 arrays only; source hash must match the pinned manifest.',
      'Fixed primitive role and immutable POSITION/COLOR_0 attributes.',
      'Assembly-managed motion scale 0/1; finite flow amplitude at the exact reported default 0.014m.',
      'Arbitrary direct geometry/role/motion-uniform mutation is unsupported; assembly.update rechecks amplitude before production frame culling.',
      'This is a local geometry-space sphere margin; mount/island Object3D transforms scale the sphere at runtime.',
      'No claim of visible clipping in a particular camera view, photorealism, artifact-free normal deformation, or viewport performance.',
    ],
  },
  assets: [],
}
for (const relative of Object.keys(expectedPins)) report.sourcePins[relative] = expectedPins[relative]

for (const asset of assets) {
  const file = join(repo, 'src/rendering/assets/corals', asset.file)
  const bytes = await readFile(file)
  const sourceSha256 = sha(bytes)
  if (sourceSha256 !== asset.sha256) throw new Error(`${asset.id}: GLB source hash does not match manifest`)
  const { json: doc, bin } = glbDocument(bytes, asset.file)
  const primitives = []
  for (const node of doc.nodes.filter(candidate => candidate.mesh !== undefined)) {
    const mesh = doc.meshes[node.mesh]
    for (const primitive of mesh.primitives) {
      const role = node.extras?.reefPrimitive?.role ?? mesh.extras?.reefPrimitive?.role
      if (!['coral-soft', 'coral-rigid'].includes(role)) throw new Error(`${asset.id}/${node.name}: missing explicit coral role`)
      const positions = accessorRows(doc, bin, primitive.attributes.POSITION, 'VEC3', 3)
      const masks = accessorRows(doc, bin, primitive.attributes.COLOR_0, 'VEC4', 4)
      if (positions.length !== masks.length || positions.length !== doc.accessors[primitive.attributes.POSITION].count) {
        throw new Error(`${asset.id}/${node.name}: POSITION/COLOR_0 count mismatch`)
      }
      let maxMarginM = 0
      let maxVertexIndex = -1
      let maxVertexDetails
      let maxNumericScale = 1
      for (let i = 0; i < positions.length; i++) {
        const [x, y, z] = positions[i]
        const [rawR, rawG, rawB, rawA] = masks[i]
        if (![x, y, z, rawR, rawG, rawB, rawA].every(Number.isFinite)) throw new Error(`${asset.id}/${node.name}: non-finite input at vertex ${i}`)
        const tuck = 1 - smoothstep(-0.006, 0.018, y)
        const flex = role === 'coral-soft' ? Math.pow(Math.max(0, Math.min(1, rawR)), 1.8) : 0
        const dx = 0.45 * tuck * Math.abs(x) + 1.38 * defaultAmplitudeM * flex
        const dy = 0.008 * tuck + 0.18 * (1.38 + 1.10) * defaultAmplitudeM * flex * flex
        const dz = 0.45 * tuck * Math.abs(z) + 1.10 * defaultAmplitudeM * flex
        const vertexMarginM = Math.hypot(dx, dy, dz)
        if (vertexMarginM > maxMarginM) {
          maxMarginM = vertexMarginM
          maxVertexIndex = i
          maxVertexDetails = { positionM: positions[i], rawMask: masks[i], flexibility: flex, componentMaxM: { x: dx, y: dy, z: dz } }
        }
        maxNumericScale = Math.max(maxNumericScale, Math.abs(x) + dx, Math.abs(y) + dy, Math.abs(z) + dz)
      }
      const numericPadM = 1e-5 * maxNumericScale
      primitives.push({
        nodeIndex: doc.nodes.indexOf(node),
        nodeName: node.name,
        meshIndex: node.mesh,
        primitiveIndex: mesh.primitives.indexOf(primitive),
        role,
        vertexCount: positions.length,
        color0: {
          componentType: doc.accessors[primitive.attributes.COLOR_0].componentType,
          normalized: Boolean(doc.accessors[primitive.attributes.COLOR_0].normalized),
          rawRedRange: [Math.min(...masks.map(value => value[0])), Math.max(...masks.map(value => value[0]))],
        },
        maxVertexIndex,
        maxVertexDetails,
        shaderMarginM: maxMarginM,
        numericScale: maxNumericScale,
        numericPadM,
        expandedSphereRadiusAddM: maxMarginM + numericPadM,
      })
    }
  }
  const generatorPath = asset.generator
  const generatorSha256 = generatorPath ? await pin(generatorPath).catch(() => null) : null
  if (generatorSha256 && generatorSha256 !== asset.generatorSha256) throw new Error(`${asset.id}: generator hash does not match manifest`)
  report.assets.push({
    id: asset.id,
    file: asset.file,
    sourceSha256,
    generator: generatorPath,
    generatorSha256,
    manifestGeneratorSha256: asset.generatorSha256,
    primitives,
  })
}

report.summary = {
  assetCount: report.assets.length,
  primitiveCount: report.assets.reduce((sum, asset) => sum + asset.primitives.length, 0),
  vertexCount: report.assets.flatMap(asset => asset.primitives).reduce((sum, primitive) => sum + primitive.vertexCount, 0),
  localSphereMarginRangeM: [
    Math.min(...report.assets.flatMap(asset => asset.primitives.map(primitive => primitive.expandedSphereRadiusAddM))),
    Math.max(...report.assets.flatMap(asset => asset.primitives.map(primitive => primitive.expandedSphereRadiusAddM))),
  ],
  method: 'Analytic per-vertex displacement envelope, plus scale-aware finite-precision pad; no temporal sampling.',
}
const outputPath = resolve(process.argv[2] ?? '/tmp/aq42-coral-bounds-audit.json')
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ report: outputPath, assets: report.summary.assetCount, primitives: report.summary.primitiveCount, vertices: report.summary.vertexCount, marginRangeM: report.summary.localSphereMarginRangeM }))
