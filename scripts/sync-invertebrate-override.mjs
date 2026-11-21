/** Isolated original invertebrate installer; canonical fish/coral/rock catalogs stay untouched. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseGlb, buildGlb } from './sync-reef-override.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const idPattern = /^invertebrate-[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_TRIANGLES = 25_000
const MAX_GLB_BYTES = 2 * 1024 * 1024
const MAX_TEXTURE_DIM_PX = 1024
const COMPONENT_SIZES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

export function parseInvertebrateSyncArgs(args) {
  const index = args.indexOf('--invertebrate')
  const id = args[index + 1]
  if (
    index < 0
    || typeof id !== 'string'
    || !idPattern.test(id)
    || args.filter((arg) => arg === '--invertebrate').length !== 1
    || args.filter((arg) => arg === '--learn-guide').length !== 1
    || args.some((arg, i) => i !== index && i !== index + 1 && arg !== '--learn-guide')
  ) {
    throw new Error('Use --invertebrate <invertebrate-prefixed-id> --learn-guide; fish/reef/coral flags cannot be mixed')
  }
  return id
}

function readAccessor(doc, bin, index, expectedType, allowedComponentTypes) {
  const item = doc.accessors?.[index]
  const view = doc.bufferViews?.[item?.bufferView]
  const components = TYPE_COMPONENTS[expectedType]
  if (
    !item
    || !view
    || item.type !== expectedType
    || !allowedComponentTypes.includes(item.componentType)
    || item.sparse
    || !Number.isSafeInteger(item.count)
    || item.count <= 0
    || view.buffer !== 0
  ) {
    throw new Error(`Invalid ${expectedType} accessor at index ${index}`)
  }
  const size = COMPONENT_SIZES[item.componentType]
  const stride = view.byteStride ?? components * size
  const offset = (view.byteOffset ?? 0) + (item.byteOffset ?? 0)
  const end = offset + (item.count - 1) * stride + components * size
  if (
    !Number.isSafeInteger(stride)
    || stride < components * size
    || stride % size
    || !Number.isSafeInteger(offset)
    || offset < 0
    || !Number.isSafeInteger(view.byteLength)
    || end > (view.byteOffset ?? 0) + view.byteLength
    || end > bin.length
  ) {
    throw new Error(`Accessor ${index} falls outside embedded bufferView`)
  }
  const values = []
  for (let i = 0; i < item.count; i++) {
    for (let c = 0; c < components; c++) {
      const at = offset + i * stride + c * size
      let value
      if (item.componentType === 5126) value = bin.readFloatLE(at)
      else if (item.componentType === 5125) value = bin.readUInt32LE(at)
      else if (item.componentType === 5123) value = bin.readUInt16LE(at)
      else if (item.componentType === 5122) value = bin.readInt16LE(at)
      else if (item.componentType === 5120) value = bin.readInt8(at)
      else value = bin.readUInt8(at)

      if (item.normalized) {
        if (item.componentType === 5126 || item.componentType === 5125) {
          throw new Error(`Unsupported normalized accessor at index ${index}`)
        }
        value /= item.componentType === 5123 ? 65535 : item.componentType === 5121 ? 255 : 127
      }
      if (!Number.isFinite(value)) {
        throw new Error(`Nonfinite value in accessor ${index}`)
      }
      values.push(value)
    }
  }
  return { item, values }
}

function readEmbeddedImageMetadata(doc, bin) {
  const images = doc.images ?? []
  if (images.length !== 3) {
    throw new Error(`Expected 3 embedded textures (BaseColor, Normal, ORM), found ${images.length}`)
  }
  return images.map((image, idx) => {
    if (image.uri) {
      throw new Error(`External image URI is not allowed: ${image.uri}`)
    }
    const view = doc.bufferViews?.[image.bufferView]
    if (!view || view.buffer !== 0) {
      throw new Error(`Image ${idx} is missing an embedded bufferView`)
    }
    const start = view.byteOffset ?? 0
    const end = start + view.byteLength
    if (start < 0 || end > bin.length || view.byteLength < 28) {
      throw new Error(`Image ${idx} bufferView is out of bounds`)
    }
    const slice = bin.subarray(start, end)
    const isPng = slice.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    const isKtx2 = slice.subarray(0, 12).equals(Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]))
    if (!isPng && !isKtx2) {
      throw new Error(`Image ${idx} must be embedded PNG or KTX2`)
    }
    const widthPx = isPng ? slice.readUInt32BE(16) : slice.readUInt32LE(20)
    const heightPx = isPng ? slice.readUInt32BE(20) : slice.readUInt32LE(24)
    if (!widthPx || !heightPx || widthPx > MAX_TEXTURE_DIM_PX || heightPx > MAX_TEXTURE_DIM_PX) {
      throw new Error(`Image ${idx} dimensions ${widthPx}x${heightPx} exceed <= ${MAX_TEXTURE_DIM_PX}px cap`)
    }
    return {
      name: image.name ?? `texture_${idx}`,
      mimeType: image.mimeType ?? (isPng ? 'image/png' : 'image/ktx2'),
      widthPx,
      heightPx,
      bytes: view.byteLength,
    }
  })
}

export function syncInvertebrateOverride(repoRoot, id) {
  if (typeof id !== 'string' || !idPattern.test(id)) {
    throw new Error('Invalid invertebrate identifier')
  }
  const sourceDir = 'src/rendering/assets/splat-fish'
  const outDir = 'src/rendering/assets/invertebrates'
  const nativePath = `${sourceDir}/blend/${id}.blend`
  const overridePath = `${sourceDir}/overrides/${id}.glb`
  const generatorPath = `src/rendering/modeling/build_${id.replaceAll('-', '_')}.py`

  const native = fs.readFileSync(path.join(repoRoot, nativePath))
  const raw = fs.readFileSync(path.join(repoRoot, overridePath))
  const generator = fs.readFileSync(path.join(repoRoot, generatorPath))
  if (native.toString('ascii', 0, 7) !== 'BLENDER') {
    throw new Error(`Require an uncompressed packed native Blender file at ${nativePath}`)
  }

  const { doc, bin } = parseGlb(raw)
  const roots = doc.scenes?.[doc.scene ?? 0]?.nodes
  if (
    !roots?.length
    || doc.extensionsRequired?.length
    || doc.buffers?.length !== 1
    || doc.buffers[0].uri
  ) {
    throw new Error('Require a single embedded binary buffer with no extensionsRequired')
  }
  if (doc.meshes?.length !== 1 || doc.skins?.length !== 1 || !doc.animations?.length) {
    throw new Error(`Require 1 mesh, 1 skin, and >= 1 animation clip for ${id}`)
  }

  const meshNodes = doc.nodes.filter((n) => n.mesh === 0)
  if (meshNodes.length !== 1 || meshNodes[0].skin !== 0) {
    throw new Error(`Require a single skinned mesh node bound to skin 0 for ${id}`)
  }
  const skin = doc.skins[0]
  if (!Array.isArray(skin.joints) || skin.joints.length < 4) {
    throw new Error(`Require >= 4 skin joints for ${id}, found ${skin.joints?.length ?? 0}`)
  }
  const jointSet = new Set(skin.joints)
  const jointNames = skin.joints.map((nodeIdx, idx) => doc.nodes?.[nodeIdx]?.name ?? `joint_${idx}`)

  const textures = readEmbeddedImageMetadata(doc, bin)
  const mesh = doc.meshes[0]
  if (!Array.isArray(mesh.primitives) || mesh.primitives.length < 1) {
    throw new Error(`Mesh for ${id} has no primitives`)
  }

  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let totalTriangles = 0
  const primitiveReports = mesh.primitives.map((prim, primIdx) => {
    if ((prim.mode ?? 4) !== 4 || prim.targets || prim.extensions) {
      throw new Error(`Primitive ${primIdx} of ${id} must use standard indexed/non-indexed triangles`)
    }
    const positions = readAccessor(doc, bin, prim.attributes?.POSITION, 'VEC3', [5126])
    const normals = readAccessor(doc, bin, prim.attributes?.NORMAL, 'VEC3', [5126])
    const uvs = readAccessor(doc, bin, prim.attributes?.TEXCOORD_0, 'VEC2', [5126])
    const joints = readAccessor(doc, bin, prim.attributes?.JOINTS_0, 'VEC4', [5121, 5123])
    const weights = readAccessor(doc, bin, prim.attributes?.WEIGHTS_0, 'VEC4', [5126, 5121, 5123])
    const vCount = positions.item.count
    if ([normals, uvs, joints, weights].some((attr) => attr.item.count !== vCount)) {
      throw new Error(`Attribute counts mismatch on primitive ${primIdx} of ${id}`)
    }
    for (let i = 0; i < vCount; i++) {
      const wSum = weights.values[i * 4] + weights.values[i * 4 + 1] + weights.values[i * 4 + 2] + weights.values[i * 4 + 3]
      if (!(wSum > 0.5)) {
        throw new Error(`Vertex ${i} on primitive ${primIdx} of ${id} has invalid weight sum ${wSum}`)
      }
      for (let c = 0; c < 4; c++) {
        if (joints.values[i * 4 + c] >= skin.joints.length) {
          throw new Error(`Vertex ${i} references out-of-range joint index`)
        }
      }
      for (let axis = 0; axis < 3; axis++) {
        const val = positions.values[i * 3 + axis]
        if (val < min[axis]) min[axis] = val
        if (val > max[axis]) max[axis] = val
      }
    }

    const material = doc.materials?.[prim.material]
    if (!material) throw new Error(`Missing material on primitive ${primIdx} of ${id}`)
    const baseTexIdx = material.pbrMetallicRoughness?.baseColorTexture?.index
    const normalTexIdx = material.normalTexture?.index
    const mrTexIdx = material.pbrMetallicRoughness?.metallicRoughnessTexture?.index
    const occTexIdx = material.occlusionTexture?.index
    if (
      !Number.isInteger(baseTexIdx)
      || !Number.isInteger(normalTexIdx)
      || !Number.isInteger(mrTexIdx)
      || occTexIdx !== mrTexIdx
    ) {
      throw new Error(`Material on ${id} must wire BaseColor, Normal, and shared ORM metallicRoughnessTexture === occlusionTexture`)
    }
    const imageSources = [baseTexIdx, normalTexIdx, mrTexIdx].map((tIdx) => doc.textures?.[tIdx]?.source)
    if (new Set(imageSources).size !== 3 || imageSources.some((src) => !Number.isInteger(src))) {
      throw new Error(`Material on ${id} must reference 3 distinct embedded images`)
    }

    const indices = prim.indices === undefined
      ? undefined
      : readAccessor(doc, bin, prim.indices, 'SCALAR', [5121, 5123, 5125])
    const indexCount = indices?.item.count ?? vCount
    if (indexCount % 3 !== 0) {
      throw new Error(`Primitive ${primIdx} triangle index count is not divisible by 3`)
    }
    totalTriangles += indexCount / 3
    return {
      id: `${id.replaceAll('-', '_')}_${primIdx}`,
      role: 'invertebrate',
      vertexCount: vCount,
      triangles: indexCount / 3,
      aoSource: 'texture',
    }
  })

  if (totalTriangles > MAX_TRIANGLES) {
    throw new Error(`${id} exceeds ${MAX_TRIANGLES} triangle budget (${totalTriangles})`)
  }
  const dimensionsM = max.map((value, i) => value - min[i])
  if (dimensionsM.some((d) => !(d > 0))) {
    throw new Error(`${id} must have positive extent on all axes`)
  }
  if (min[1] < -0.005 || min[1] > 0.005) {
    throw new Error(`${id} must be substrate-grounded (boundsM.min[1] = ${min[1].toFixed(5)} m outside +-0.005 m)`)
  }

  const animationClips = doc.animations.map((anim, animIdx) => {
    if (!Array.isArray(anim.channels) || !anim.channels.length) {
      throw new Error(`Animation ${animIdx} on ${id} has no channels`)
    }
    for (const ch of anim.channels) {
      if (!jointSet.has(ch.target?.node)) {
        throw new Error(`Animation channel targets non-skin node ${ch.target?.node} on ${id}`)
      }
      if (!['rotation', 'translation', 'scale'].includes(ch.target?.path)) {
        throw new Error(`Unsupported animation path ${ch.target?.path} on ${id}`)
      }
      const sampler = anim.samplers?.[ch.sampler]
      if (!sampler) throw new Error(`Missing animation sampler ${ch.sampler} on ${id}`)
      readAccessor(doc, bin, sampler.input, 'SCALAR', [5126])
      const outputType = ch.target.path === 'rotation' ? 'VEC4' : 'VEC3'
      readAccessor(doc, bin, sampler.output, outputType, [5126])
    }
    return anim.name ?? `clip_${animIdx}`
  })

  const speciesId = id.replace(/^invertebrate-/, '')
  const root = doc.nodes[roots[0]]
  const metadata = {
    schema: 'reef-invertebrate-v1',
    id,
    speciesId,
    kind: 'invertebrate',
    units: 'meter',
    upAxis: '+Y',
    forwardAxis: '+Z',
    origin: 'substrate-grounded',
    dimensionsM,
    jointCount: skin.joints.length,
    jointNames,
    animationClips,
    provenance: {
      license: 'original',
      creator: 'Aquarium project',
      sourceSha256: sha(raw),
      recipe: `Blender --background --python ${generatorPath}; node scripts/sync-blender-override.mjs --invertebrate ${id} --learn-guide`,
      attribution: `Original rigged and animated 3D reef invertebrate (${speciesId}) with procedural 512x512 BaseColor/Normal/ORM PBR textures; zero external donor assets.`,
    },
  }
  root.extras = { ...root.extras, reefInvertebrate: metadata }

  const packaged = buildGlb(doc, bin)
  if (packaged.length > MAX_GLB_BYTES) {
    throw new Error(`${id} packaged GLB exceeds ${MAX_GLB_BYTES} byte budget (${packaged.length} bytes)`)
  }

  const inspection = {
    extras: { reefInvertebrate: metadata },
    boundsM: { min, max },
    triangles: totalTriangles,
    bytes: packaged.length,
    primitives: primitiveReports,
    textures,
  }

  const manifestPath = path.join(repoRoot, outDir, 'manifest.json')
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { schema: 'custom-invertebrates-v1', assets: [] }
  if (manifest.schema !== 'custom-invertebrates-v1' || !Array.isArray(manifest.assets)) {
    throw new Error('Invalid custom invertebrate registry')
  }

  const entry = {
    id,
    speciesId,
    kind: 'invertebrate',
    path: `${outDir}/${id}.glb`,
    inspection: `${outDir}/${id}-inspection.json`,
    nativePath,
    nativeSha256: sha(native),
    overridePath,
    overrideSha256: sha(raw),
    generatorPath,
    generatorSha256: sha(generator),
    sha256: sha(packaged),
    bytes: packaged.length,
    triangles: totalTriangles,
    dimensionsM,
    jointCount: skin.joints.length,
    animationClips,
    textures,
  }
  manifest.assets = [...manifest.assets.filter((item) => item.id !== id), entry].sort((a, b) => a.id.localeCompare(b.id))

  fs.mkdirSync(path.join(repoRoot, outDir), { recursive: true })
  fs.writeFileSync(path.join(repoRoot, entry.path), packaged)
  fs.writeFileSync(path.join(repoRoot, entry.inspection), `${JSON.stringify(inspection, null, 2)}\n`, 'utf8')
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Synced invertebrate ${id}: ${entry.triangles} triangles, ${entry.bytes} bytes, ${entry.jointCount} joints; canonical catalogs untouched`)
  return entry
}
