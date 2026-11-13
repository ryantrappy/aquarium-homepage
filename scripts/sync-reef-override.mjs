/** Isolated custom rock installer. Never reads or rebuilds fish catalogs. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { validateAssetContract } from '../src/rendering/assets/contract.ts'
import { readRockCollisionGeometry, inspectRockSockets } from '../src/rendering/assets/socket-inspector.ts'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
export function parseReefSyncArgs(args) {
  const index = args.indexOf('--reef'), id = args[index + 1]
  if (index < 0 || !/^reef-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? '') || args.filter(a => a === '--reef').length !== 1
    || args.filter(a => a === '--learn-guide').length !== 1
    || args.some((arg, i) => i !== index && i !== index + 1 && arg !== '--learn-guide')) {
    throw new Error('Use --reef <reef-prefixed-rock-id> --learn-guide; fish flags cannot be combined with reef mode')
  }
  return id
}

function parseGlb(bytes) {
  if (bytes.length < 28 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2
    || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Invalid GLB2')
  const length = bytes.readUInt32LE(12), offset = 20 + length
  if (offset + 8 > bytes.length || bytes.readUInt32LE(offset + 4) !== 0x004e4942
    || offset + 8 + bytes.readUInt32LE(offset) !== bytes.length) throw new Error('Require one embedded BIN chunk')
  return { doc: JSON.parse(bytes.toString('utf8', 20, offset).trim()), bin: bytes.subarray(offset + 8) }
}
function buildGlb(doc, bin) {
  const json = Buffer.from(JSON.stringify(doc)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32)
  json.copy(padded)
  const header = Buffer.alloc(20), chunk = Buffer.alloc(8)
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + bin.length, 8)
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  chunk.writeUInt32LE(bin.length); chunk.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, padded, chunk, bin])
}

export function syncReefOverride(repoRoot, id) {
  if (typeof id !== 'string' || !/^reef-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Invalid reef rock identifier')
  const sourceDir = 'src/rendering/assets/splat-fish'
  const nativePath = `${sourceDir}/blend/${id}.blend`, overridePath = `${sourceDir}/overrides/${id}.glb`
  const generatorPath = `src/rendering/modeling/build_${id.replaceAll('-', '_')}.py`
  const native = fs.readFileSync(path.join(repoRoot, nativePath)), source = fs.readFileSync(path.join(repoRoot, overridePath))
  const generator = fs.readFileSync(path.join(repoRoot, generatorPath))
  if (native.toString('ascii', 0, 7) !== 'BLENDER') throw new Error('Native source is not an uncompressed Blender file')
  const { doc, bin } = parseGlb(source), roots = doc.scenes?.[doc.scene ?? 0]?.nodes
  if (roots?.length !== 1 || doc.animations?.length || doc.skins?.length || doc.extensionsRequired?.length
    || doc.buffers?.length !== 1 || doc.buffers[0].uri || doc.images?.some(image => image.uri)) throw new Error('Require one static, embedded canonical rock root')
  const root = doc.nodes[roots[0]], meshNodes = doc.nodes.filter(node => node.mesh !== undefined)
  if (meshNodes.length !== 1 || meshNodes[0] !== root || root.children?.length) throw new Error('Require one applied mesh root without children')
  const matrix = root.matrix ?? identity
  if (matrix.some((n, i) => n !== identity[i]) || root.translation?.some(n => n !== 0)
    || root.scale?.some(n => n !== 1) || root.rotation?.some((n, i) => n !== [0, 0, 0, 1][i])) throw new Error('Apply root transforms before export')
  const mesh = doc.meshes[root.mesh]
  if (mesh.primitives.length !== 1) throw new Error('Custom rock modules require one triangle primitive/material')
  const primitive = mesh.primitives[0], position = doc.accessors[primitive.attributes.POSITION]
  if (primitive.attributes.COLOR_0 !== undefined || primitive.targets || primitive.extensions || (primitive.mode ?? 4) !== 4
    || position?.type !== 'VEC3' || position.componentType !== 5126) throw new Error('Require static triangle positions without vertex colors or morphs')
  // Measure the position buffer, not declared accessor bounds.
  const view = doc.bufferViews[position.bufferView], stride = view.byteStride ?? 12, start = (view.byteOffset ?? 0) + (position.byteOffset ?? 0)
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  if (position.sparse || stride < 12 || start + (position.count - 1) * stride + 12 > bin.length) throw new Error('Unsupported/out-of-range POSITION accessor')
  for (let i = 0; i < position.count; i++) for (let axis = 0; axis < 3; axis++) {
    const value = bin.readFloatLE(start + i * stride + axis * 4)
    if (!Number.isFinite(value)) throw new Error('Nonfinite rock position')
    min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value)
  }
  const dimensionsM = max.map((value, i) => value - min[i]), boundsM = { min, max }
  const material = doc.materials?.[primitive.material]
  if (!material || material.alphaMode && material.alphaMode !== 'OPAQUE') throw new Error('Require an opaque PBR material')
  const reefAsset = { schema: 'reef-asset-v1', id, kind: 'rock', units: 'meter', upAxis: '+Y', origin: 'local', dimensionsM,
    provenance: { license: 'original', creator: 'Aquarium project', sourceSha256: sha(source),
      recipe: `Blender background --python ${generatorPath}; node scripts/sync-blender-override.mjs --reef ${id} --learn-guide`,
      attribution: 'Original custom procedural limestone arch and embedded textures; no imported visual assets.' } }
  const primitiveRecord = { id: id.replaceAll('-', '_'), role: 'rock', vertexCount: position.count, boundsM,
    material: { vertexColors: false, vertexAlpha: false, aoSource: material.occlusionTexture ? 'texture' : 'none' } }
  root.extras = { ...root.extras, reefAsset, reefPrimitive: { id: primitiveRecord.id, role: 'rock' } }
  primitive.extras = { ...primitive.extras, reefPrimitive: { id: primitiveRecord.id, role: 'rock' } }
  const packaged = buildGlb(doc, bin), geometry = readRockCollisionGeometry(packaged)
  const dir = 'src/rendering/assets/corals/custom-rocks', socketPath = `${dir}/${id}-socket-report.json`
  const sockets = inspectRockSockets(packaged, socketPath)
  if (sockets.rejectedSockets.length || sockets.supportedSockets.length) throw new Error('Standalone module must not declare unverified coral sockets')
  const inspection = { extras: { reefAsset }, rootTransform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    boundsM: geometry.boundsM, primitives: [primitiveRecord], sockets: [], collisionParts: [] }
  const result = validateAssetContract(inspection)
  if (!result.valid) throw new Error(JSON.stringify(result.issues))
  const manifestPath = path.join(repoRoot, dir, 'manifest.json')
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { schema: 'custom-reef-modules-v1', assets: [] }
  if (manifest.schema !== 'custom-reef-modules-v1' || !Array.isArray(manifest.assets)) throw new Error('Invalid custom reef registry')
  const entry = { id, kind: 'rock', path: `${dir}/${id}.glb`, inspection: `${dir}/${id}-inspection.json`, socketReport: socketPath,
    nativePath, nativeSha256: sha(native), overridePath, overrideSha256: sha(source), generatorPath, generatorSha256: sha(generator),
    sha256: sha(packaged), bytes: packaged.length, triangles: geometry.triangles.length, dimensionsM }
  manifest.assets = [...manifest.assets.filter(item => item.id !== id), entry].sort((a, b) => a.id.localeCompare(b.id))
  fs.mkdirSync(path.join(repoRoot, dir), { recursive: true })
  fs.writeFileSync(path.join(repoRoot, entry.path), packaged)
  fs.writeFileSync(path.join(repoRoot, entry.inspection), JSON.stringify(inspection, null, 2) + '\n')
  fs.writeFileSync(path.join(repoRoot, socketPath), JSON.stringify(sockets, null, 2) + '\n')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Synced reef ${id}: ${entry.triangles} triangles, ${entry.bytes} bytes; fish catalogs untouched`)
  return entry
}
