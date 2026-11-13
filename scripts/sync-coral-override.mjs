/** Isolated original rigid-colony installer; canonical catalogs stay untouched. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseGlb, buildGlb } from './sync-reef-override.mjs'
import { validateAssetContract } from '../src/rendering/assets/contract.ts'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const idPattern = /^reef-[a-z0-9]+(?:-[a-z0-9]+)*$/
export function parseCoralSyncArgs(args) {
  const index = args.indexOf('--coral'), id = args[index + 1]
  if (index < 0 || typeof id !== 'string' || !idPattern.test(id)
    || args.filter(arg => arg === '--coral').length !== 1 || args.filter(arg => arg === '--learn-guide').length !== 1
    || args.some((arg, i) => i !== index && i !== index + 1 && arg !== '--learn-guide')) {
    throw new Error('Use --coral <reef-prefixed-colony-id> --learn-guide; rock/fish flags cannot be mixed')
  }
  return id
}

function accessor(doc, bin, index, type, components, allowedTypes) {
  const item = doc.accessors?.[index], view = doc.bufferViews?.[item?.bufferView]
  const sizes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }
  if (!item || !view || item.type !== type || !allowedTypes.includes(item.componentType) || item.sparse
    || !Number.isSafeInteger(item.count) || item.count <= 0 || view.buffer !== 0) throw new Error(`Invalid ${type} accessor`)
  const size = sizes[item.componentType], stride = view.byteStride ?? components * size
  const offset = (view.byteOffset ?? 0) + (item.byteOffset ?? 0)
  const end = offset + (item.count - 1) * stride + components * size
  if (!Number.isSafeInteger(stride) || stride < components * size || stride % size || !Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(view.byteLength) || end > (view.byteOffset ?? 0) + view.byteLength || end > bin.length) throw new Error('Accessor outside embedded buffer view')
  const values = []
  for (let i = 0; i < item.count; i++) for (let c = 0; c < components; c++) {
    const at = offset + i * stride + c * size
    let value = item.componentType === 5126 ? bin.readFloatLE(at) : item.componentType === 5125 ? bin.readUInt32LE(at) : item.componentType === 5123 ? bin.readUInt16LE(at) : bin.readUInt8(at)
    if (item.normalized) {
      if (item.componentType === 5126 || item.componentType === 5125) throw new Error('Unsupported normalized accessor')
      value /= item.componentType === 5123 ? 65535 : 255
    }
    if (!Number.isFinite(value)) throw new Error('Nonfinite accessor component')
    values.push(value)
  }
  return { item, values }
}

export function syncCoralOverride(repoRoot, id) {
  if (typeof id !== 'string' || !idPattern.test(id)) throw new Error('Invalid reef colony identifier')
  const sourceDir = 'src/rendering/assets/splat-fish', dir = 'src/rendering/assets/corals/custom-colonies'
  const nativePath = `${sourceDir}/blend/${id}.blend`, overridePath = `${sourceDir}/overrides/${id}.glb`
  const generatorPath = `src/rendering/modeling/build_${id.replaceAll('-', '_')}.py`
  const native = fs.readFileSync(path.join(repoRoot, nativePath)), raw = fs.readFileSync(path.join(repoRoot, overridePath)), generator = fs.readFileSync(path.join(repoRoot, generatorPath))
  if (native.toString('ascii', 0, 7) !== 'BLENDER') throw new Error('Require an uncompressed packed native Blender source')
  const { doc, bin } = parseGlb(raw), roots = doc.scenes?.[doc.scene ?? 0]?.nodes
  if (roots?.length !== 1 || doc.nodes?.length !== 1 || doc.meshes?.length !== 1 || doc.animations?.length || doc.skins?.length
    || doc.extensionsRequired?.length || doc.buffers?.length !== 1 || doc.buffers[0].uri || doc.images?.some(image => image.uri)) throw new Error('Require one static embedded colony mesh')
  const root = doc.nodes[roots[0]], mesh = doc.meshes[root?.mesh]
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  if (!mesh || mesh.primitives?.length !== 1 || root.children?.length || root.weights || root.skin !== undefined || root.extensions || mesh.weights
    || (root.matrix ?? identity).some((value, i) => value !== identity[i]) || root.translation?.some(value => value !== 0)
    || root.scale?.some(value => value !== 1) || root.rotation?.some((value, i) => value !== [0, 0, 0, 1][i])) throw new Error('Apply canonical colony root transforms')
  const primitive = mesh.primitives[0]
  if ((primitive.mode ?? 4) !== 4 || primitive.targets || primitive.extensions) throw new Error('Require ordinary static triangles')
  const positions = accessor(doc, bin, primitive.attributes?.POSITION, 'VEC3', 3, [5126])
  const normals = accessor(doc, bin, primitive.attributes?.NORMAL, 'VEC3', 3, [5126])
  const uv = accessor(doc, bin, primitive.attributes?.TEXCOORD_0, 'VEC2', 2, [5126])
  const masks = accessor(doc, bin, primitive.attributes?.COLOR_0, 'VEC4', 4, [5121, 5123, 5126])
  if ([normals, uv, masks].some(data => data.item.count !== positions.item.count)) throw new Error('Attribute counts differ')
  if (masks.values.some((value, i) => value < 0 || value > 1 || i % 4 === 0 && value !== 0)) throw new Error('Rigid coral requires bounded raw RGBA and pinned R=0')
  const indices = primitive.indices === undefined ? undefined : accessor(doc, bin, primitive.indices, 'SCALAR', 1, [5121, 5123, 5125])
  const count = indices?.item.count ?? positions.item.count
  if (count % 3 || indices?.item.normalized || indices?.values.some(value => !Number.isInteger(value) || value < 0 || value >= positions.item.count)) throw new Error('Invalid triangle index stream')
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.values.length; i++) { const axis = i % 3; min[axis] = Math.min(min[axis], positions.values[i]); max[axis] = Math.max(max[axis], positions.values[i]) }
  const boundsM = { min, max }, dimensionsM = max.map((value, i) => value - min[i])
  const material = doc.materials?.[primitive.material]
  if (!material || material.alphaMode && material.alphaMode !== 'OPAQUE' || material.emissiveTexture || material.emissiveFactor?.some(value => value !== 0)) throw new Error('Require opaque non-emissive tissue; fluorescence uses raw G at runtime')
  const metadata = { schema: 'reef-asset-v1', id, kind: 'coral', units: 'meter', upAxis: '+Y', origin: 'local', dimensionsM, maskSchema: 'coral-raw-masks-v1',
    provenance: { license: 'original', creator: 'Aquarium project', sourceSha256: sha(raw), recipe: `Blender background --python ${generatorPath}; node scripts/sync-blender-override.mjs --coral ${id} --learn-guide`, attribution: 'Original custom branching colony with baked surface maps and raw rigidity/tip/phase/contact-AO masks; no imported visual assets.' } }
  const role = { id: id.replaceAll('-', '_'), role: 'coral-rigid', maskSchema: 'coral-raw-masks-v1' }
  root.extras = { ...root.extras, reefAsset: metadata, reefPrimitive: role }
  primitive.extras = { ...primitive.extras, reefPrimitive: role }
  const inspection = { extras: { reefAsset: metadata }, rootTransform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }, boundsM,
    primitives: [{ ...role, vertexCount: positions.item.count, boundsM, material: { vertexColors: false, vertexAlpha: false, aoSource: 'coral-mask-a' }, color0: { itemSize: 4, values: masks.values } }], sockets: [], collisionParts: [] }
  const validation = validateAssetContract(inspection)
  if (!validation.valid) throw new Error(JSON.stringify(validation.issues))
  const packaged = buildGlb(doc, bin), manifestPath = path.join(repoRoot, dir, 'manifest.json')
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { schema: 'custom-coral-colonies-v1', assets: [] }
  if (manifest.schema !== 'custom-coral-colonies-v1' || !Array.isArray(manifest.assets)) throw new Error('Invalid custom coral registry')
  const entry = { id, kind: 'coral', path: `${dir}/${id}.glb`, inspection: `${dir}/${id}-inspection.json`, nativePath, nativeSha256: sha(native), overridePath, overrideSha256: sha(raw), generatorPath, generatorSha256: sha(generator), sha256: sha(packaged), bytes: packaged.length, triangles: count / 3, dimensionsM }
  manifest.assets = [...manifest.assets.filter(item => item.id !== id), entry].sort((a, b) => a.id.localeCompare(b.id))
  fs.mkdirSync(path.join(repoRoot, dir), { recursive: true })
  fs.writeFileSync(path.join(repoRoot, entry.path), packaged)
  fs.writeFileSync(path.join(repoRoot, entry.inspection), JSON.stringify(inspection, null, 2) + '\n')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Synced rigid colony ${id}: ${entry.triangles} triangles, ${entry.bytes} bytes; canonical catalogs untouched`)
  return entry
}
