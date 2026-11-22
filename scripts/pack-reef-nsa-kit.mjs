/** Deterministic shared-atlas packer for the seven runtime NSA rock modules. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { buildGlb, parseGlb } from './sync-reef-override.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROCK_DIR = 'src/rendering/assets/corals/custom-rocks'
const OUTPUT = `${ROCK_DIR}/reef-nsa-kit.glb`
const MAX_BYTES = 5_000_000
const MODULES = Object.freeze([
  'reef-nsa-pinnacle-spire',
  'reef-nsa-cantilever-shelf',
  'reef-nsa-cave-buttress',
  'reef-nsa-bommie-mound',
  'reef-nsa-rubble-talus',
  'reef-nsa-high-arch-span',
  'reef-nsa-encrusting-ledge',
])
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const copy = value => structuredClone(value)
const aligned = value => (value + 3) & ~3

function fail(message) { throw new Error(message) }

function validateSource(id, bytes, entry) {
  if (!entry || entry.id !== id || entry.kind !== 'rock' || entry.path !== `${ROCK_DIR}/${id}.glb`)
    fail(`Manifest is missing the expected packaged asset entry for ${id}`)
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256)
    fail(`Packaged source ${id} does not match its manifest byte count and SHA-256`)
  const { doc, bin } = parseGlb(bytes)
  const roots = doc.scenes?.[doc.scene ?? 0]?.nodes
  if (doc.asset?.version !== '2.0' || doc.extensionsRequired?.length || doc.animations?.length || doc.skins?.length
    || doc.scenes?.length !== 1 || (doc.scene ?? 0) !== 0 || doc.cameras?.length
    || doc.nodes?.length !== (roots?.length ?? -1) + (doc.nodes?.[roots?.[0]]?.children?.length ?? 0)
    || roots?.length !== 1 || !Array.isArray(doc.nodes) || !Array.isArray(doc.meshes) || doc.meshes.length !== 1
    || doc.buffers?.length !== 1 || doc.buffers[0].uri || doc.buffers[0].byteLength > bin.length
    || doc.nodes.some(node => node.skin !== undefined || node.camera !== undefined || node.extensions))
    fail(`Unsupported static one-root structure in ${id}`)
  const rootIndex = roots[0]
  const root = doc.nodes[rootIndex]
  const children = root.children ?? []
  if (root.mesh !== 0 || children.some(index => !Number.isInteger(index) || index < 0 || index >= doc.nodes.length)
    || new Set(children).size !== children.length || children.includes(rootIndex)
    || doc.nodes.some((node, index) => index !== rootIndex && !children.includes(index)))
    fail(`Unsupported root or child-node layout in ${id}`)
  if (root.matrix && !jsonEqual(root.matrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
    fail(`Root transform must be identity in ${id}`)
  if (root.translation?.some(value => value !== 0) || root.rotation?.some((value, i) => value !== [0, 0, 0, 1][i])
    || root.scale?.some(value => value !== 1)) fail(`Root transform must be identity in ${id}`)
  for (const index of children) {
    const node = doc.nodes[index]
    if (!node || !/^socket_[a-z_]+_\d{2}$/.test(node.name ?? '') || node.mesh !== undefined || node.children?.length
      || node.skin !== undefined || node.camera !== undefined || node.extensions
      || node.extras?.reefSocket?.role !== 'coral-mount') fail(`Unsupported direct socket node in ${id}`)
  }
  const mesh = doc.meshes[0]
  if (mesh.primitives?.length !== 1 || mesh.weights || mesh.extensions || mesh.extras)
    fail(`Expected one plain triangle primitive in ${id}`)
  const primitive = mesh.primitives[0]
  if ((primitive.mode ?? 4) !== 4 || primitive.targets || primitive.extensions || primitive.attributes.COLOR_0 !== undefined
    || primitive.indices === undefined || primitive.material === undefined || primitive.attributes.POSITION === undefined)
    fail(`Unsupported mesh primitive in ${id}`)
  if (!Array.isArray(doc.accessors) || !Array.isArray(doc.bufferViews) || !Array.isArray(doc.images)
    || doc.images.length !== 3 || doc.images.some(image => image.uri || image.mimeType !== 'image/jpeg')
    || !Array.isArray(doc.textures) || doc.textures.length !== 3 || !Array.isArray(doc.samplers))
    fail(`Expected three embedded JPEG trim textures in ${id}`)
  const imageViews = doc.images.map(image => image.bufferView)
  const referencedViews = new Set(Object.values(primitive.attributes).map(index => doc.accessors[index]?.bufferView))
  referencedViews.add(doc.accessors[primitive.indices]?.bufferView)
  if (imageViews.some(index => !Number.isInteger(index)) || imageViews.some(index => referencedViews.has(index)))
    fail(`Image and geometry buffer views overlap or are invalid in ${id}`)
  if (new Set([...imageViews, ...referencedViews]).size !== doc.bufferViews.length
    || doc.bufferViews.some((_, index) => !imageViews.includes(index) && !referencedViews.has(index)))
    fail(`Unexpected unreferenced buffer view in ${id}`)
  for (const [viewIndex, view] of doc.bufferViews.entries()) {
    const start = view.byteOffset ?? 0
    if (!Number.isInteger(start) || !Number.isInteger(view.byteLength) || start < 0 || view.byteLength < 0
      || start + view.byteLength > bin.length || (start & 3) !== 0)
      fail(`Invalid buffer view ${viewIndex} in ${id}`)
  }
  for (const accessor of doc.accessors) {
    if (accessor.sparse || !Number.isInteger(accessor.bufferView) || accessor.bufferView < 0
      || accessor.bufferView >= doc.bufferViews.length) fail(`Unsupported accessor in ${id}`)
  }
  for (const texture of doc.textures) {
    if (!Number.isInteger(texture.source) || texture.source < 0 || texture.source >= doc.images.length
      || !Number.isInteger(texture.sampler) || texture.sampler < 0 || texture.sampler >= doc.samplers.length)
      fail(`Unsupported texture reference in ${id}`)
  }
  if (!Array.isArray(doc.materials) || doc.materials.length !== 1 || primitive.material !== 0)
    fail(`Expected one source material in ${id}`)
  return { id, doc, bin, root, childIndices: children, mesh, primitive, imageViews }
}

function makePack(manifest) {
  const assets = []
  for (const id of MODULES) {
    const entry = manifest.assets.find(asset => asset.id === id)
    const bytes = fs.readFileSync(path.join(ROOT, ROCK_DIR, `${id}.glb`))
    assets.push(validateSource(id, bytes, entry))
  }
  const baseline = assets[0]
  const sharedImages = baseline.doc.images.map(image => {
    const view = baseline.doc.bufferViews[image.bufferView]
    const start = view.byteOffset ?? 0
    return { image, bytes: baseline.bin.subarray(start, start + view.byteLength) }
  })
  for (const asset of assets.slice(1)) {
    if (!jsonEqual(asset.doc.textures, baseline.doc.textures) || !jsonEqual(asset.doc.samplers, baseline.doc.samplers))
      fail(`Trim texture or sampler table differs in ${asset.id}`)
    if (!jsonEqual(asset.doc.extensionsUsed, baseline.doc.extensionsUsed) || !jsonEqual(asset.doc.extensions, baseline.doc.extensions))
      fail(`Extension tables differ in ${asset.id}`)
    for (const [i, { image, bytes }] of sharedImages.entries()) {
      const view = asset.doc.bufferViews[asset.doc.images[i].bufferView]
      const start = view.byteOffset ?? 0
      if (!jsonEqual(asset.doc.images[i], image) || !bytes.equals(asset.bin.subarray(start, start + view.byteLength)))
        fail(`Shared trim image ${i} differs in ${asset.id}`)
    }
  }

  const chunks = []
  let byteLength = 0
  const append = source => {
    const start = aligned(byteLength)
    if (start > byteLength) chunks.push(Buffer.alloc(start - byteLength))
    chunks.push(source)
    byteLength = start + source.length
    return start
  }
  const out = {
    asset: copy(baseline.doc.asset),
    extensionsUsed: copy(baseline.doc.extensionsUsed ?? []),
    extensions: copy(baseline.doc.extensions ?? undefined),
    scene: 0,
    scenes: [{ name: 'reef-nsa-kit', nodes: [] }],
    nodes: [], meshes: [], materials: [],
    accessors: [], bufferViews: [],
    images: [], textures: copy(baseline.doc.textures), samplers: copy(baseline.doc.samplers),
    buffers: [{ byteLength: 0 }],
  }
  for (const { image, bytes } of sharedImages) {
    const offset = append(bytes)
    const viewIndex = out.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1
    out.images.push({ ...copy(image), bufferView: viewIndex })
  }

  for (const asset of assets) {
    const viewMap = new Map()
    for (const [i, sourceView] of asset.doc.bufferViews.entries()) {
      if (asset.imageViews.includes(i)) continue
      const start = sourceView.byteOffset ?? 0
      const offset = append(asset.bin.subarray(start, start + sourceView.byteLength))
      const viewIndex = out.bufferViews.push({ ...copy(sourceView), buffer: 0, byteOffset: offset }) - 1
      viewMap.set(i, viewIndex)
    }
    const accessorOffset = out.accessors.length
    for (const accessor of asset.doc.accessors)
      out.accessors.push({ ...copy(accessor), bufferView: viewMap.get(accessor.bufferView) })
    const meshIndex = out.meshes.length
    const materialIndex = out.materials.length
    const primitive = copy(asset.primitive)
    primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes)
      .map(([semantic, accessor]) => [semantic, accessor + accessorOffset]))
    primitive.indices += accessorOffset
    primitive.material = materialIndex
    out.meshes.push({ ...copy(asset.mesh), primitives: [primitive] })
    out.materials.push(copy(asset.doc.materials[0]))

    const topIndex = out.nodes.length
    const top = { ...copy(asset.root), name: asset.id, mesh: meshIndex }
    delete top.children
    out.nodes.push(top)
    const childIndices = asset.childIndices.map(index => {
      const child = copy(asset.doc.nodes[index])
      const mappedIndex = out.nodes.push(child) - 1
      return mappedIndex
    })
    if (childIndices.length) top.children = childIndices
    out.scenes[0].nodes.push(topIndex)
  }
  out.buffers[0].byteLength = byteLength
  const bin = Buffer.concat(chunks, byteLength)
  const packed = buildGlb(out, bin)
  if (packed.length >= MAX_BYTES) fail(`Packed NSA kit exceeds ${MAX_BYTES} bytes (${packed.length})`)
  return { packed, doc: out, bin }
}

function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--check') || args.filter(arg => arg === '--check').length > 1)
    fail('Usage: node scripts/pack-reef-nsa-kit.mjs [--check]')
  const manifestPath = path.join(ROOT, ROCK_DIR, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (manifest.schema !== 'custom-reef-modules-v1' || !Array.isArray(manifest.assets)) fail('Invalid custom-rocks manifest')
  const { packed, doc } = makePack(manifest)
  const outputPath = path.join(ROOT, OUTPUT)
  if (args.includes('--check')) {
    if (!fs.existsSync(outputPath)) fail(`Missing generated pack: ${OUTPUT}`)
    const current = fs.readFileSync(outputPath)
    if (!current.equals(packed)) fail(`Generated pack is stale: ${OUTPUT}`)
  } else {
    fs.writeFileSync(outputPath, packed)
  }
  const roots = doc.scenes[0].nodes.map(index => doc.nodes[index].name)
  console.log(`${args.includes('--check') ? 'CHECK' : 'PACK'} ${OUTPUT}: ${packed.length} bytes, roots=${roots.join(',')}, images=${doc.images.length}, sha256=${sha256(packed)}`)
}

main()
