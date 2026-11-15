#!/usr/bin/env node
/**
 * Refine only the blue-green chromis GLB's 2D silhouette boundary.
 *
 * The immutable base GLB and project-original thumbnail are the inputs. The
 * Rebuild only chromis with the pinned original generator recipe at 139×83.
 * The 84×50 recipe must first reproduce the immutable base (same mesh, rig,
 * materials and texture pixels; embedded PNG compression bytes may differ
 * between zlib versions, so the comparison is canonical, not byte-for-byte).
 * All-species generator entrypoint is never executed; output stays isolated.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateAssetContract } from '../src/rendering/assets/contract.ts'
import { ASSET_CLASS_BUDGETS } from '../src/rendering/assets/budgets.ts'
import { canonicalGlbFingerprint, pngRawScanlines } from '../src/rendering/assets/canonical-glb.ts'

const scriptPath = fileURLToPath(import.meta.url)
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..')
const DEFAULT_PATHS = Object.freeze({
  glb: 'src/rendering/assets/splat-fish/blue-green-chromis.glb',
  report: 'src/rendering/assets/splat-fish/fish-blue-green-chromis-inspection.json',
  manifest: 'src/rendering/assets/splat-fish/manifest.json',
  source: 'public/fish/blue-green-chromis.webp',
  base: 'src/rendering/assets/splat-fish/sources/blue-green-chromis-contour-base.glb',
})
const BASE_GLB_SHA256 = 'c53ea07f3e6f96d254546cbb54f418106b268dcc00ea96c2aed14796e1b855de'
const SOURCE_WEBP_SHA256 = '1990dc99a1424e4cda5cccbd7508dbe4959718b5d5dcc0939b4e8b5401cb3049'
const SHARED_GENERATOR_SHA256 = '7e7a41d4ddb47f4d7b596b50880321dbd80c7ae1ae0016880649089047617fdd'
const GUIDE_SHA256 = '84bcdf285815122091c578e897db43a7e1b585d3bcf474349529f5fc1ece143e'
const GRID = [139, 83]
const GLB_JSON = 0x4e4f534a
const GLB_BIN = 0x004e4942

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }

function parseGlb(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) {
    throw new Error('Expected a complete glTF 2.0 binary file')
  }
  const chunks = []
  let offset = 12
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Truncated GLB chunk header')
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4)
    offset += 8
    if (offset + length > buffer.length) throw new Error('Truncated GLB chunk')
    chunks.push({ type, bytes: buffer.subarray(offset, offset + length) })
    offset += length
  }
  const jsonChunk = chunks.find(chunk => chunk.type === GLB_JSON)
  const binChunk = chunks.find(chunk => chunk.type === GLB_BIN)
  if (!jsonChunk || !binChunk || chunks.length !== 2) throw new Error('Expected one JSON and one BIN GLB chunk')
  return { json: JSON.parse(jsonChunk.bytes.toString('utf8').trimEnd()), binary: Buffer.from(binChunk.bytes) }
}

function encodeGlb(json, binary) {
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonPadding = (4 - jsonBytes.length % 4) % 4
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)])
  const binPadding = (4 - binary.length % 4) % 4
  const paddedBin = Buffer.concat([binary, Buffer.alloc(binPadding)])
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length
  const header = Buffer.alloc(12)
  header.write('glTF', 0, 'ascii'); header.writeUInt32LE(2, 4); header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(paddedJson.length, 0); jsonHeader.writeUInt32LE(GLB_JSON, 4)
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(paddedBin.length, 0); binHeader.writeUInt32LE(GLB_BIN, 4)
  return Buffer.concat([header, jsonHeader, paddedJson, binHeader, paddedBin])
}

const COMPONENT_BYTES = new Map([[5121, 1], [5123, 2], [5125, 4], [5126, 4]])
const TYPE_WIDTH = new Map([['SCALAR', 1], ['VEC2', 2], ['VEC3', 3], ['VEC4', 4]])

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex]
  if (!accessor || accessor.sparse) throw new Error(`Unsupported or missing accessor ${accessorIndex}`)
  const view = json.bufferViews[accessor.bufferView]
  const componentBytes = COMPONENT_BYTES.get(accessor.componentType), width = TYPE_WIDTH.get(accessor.type)
  if (!view || !componentBytes || !width) throw new Error(`Unsupported accessor layout ${accessorIndex}`)
  const stride = view.byteStride || componentBytes * width
  if (stride !== componentBytes * width) throw new Error(`Interleaved accessor ${accessorIndex} is not supported`)
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0)
  const count = accessor.count * width
  if (start + count * componentBytes > binary.length) throw new Error(`Accessor ${accessorIndex} exceeds the GLB binary chunk`)
  const values = new Array(count)
  for (let i = 0; i < count; i++) {
    const at = start + i * componentBytes
    values[i] = componentBytes === 4
      ? (accessor.componentType === 5126 ? binary.readFloatLE(at) : binary.readUInt32LE(at))
      : componentBytes === 2 ? binary.readUInt16LE(at) : binary[at]
  }
  return { accessor, values, width }
}

function replaceManifestEntryText(manifestText, nextEntry) {
  const assetsKey = manifestText.indexOf('"assets"')
  const arrayStart = manifestText.indexOf('[', assetsKey)
  if (assetsKey < 0 || arrayStart < 0) throw new Error('Could not locate manifest assets array')
  let inString = false, escaped = false, braceDepth = 0, entryStart = -1
  for (let i = arrayStart + 1; i < manifestText.length; i++) {
    const ch = manifestText[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') { if (braceDepth === 0) entryStart = i; braceDepth++; continue }
    if (ch === '}') {
      braceDepth--
      if (braceDepth === 0) {
        const entryEnd = i + 1
        const entry = JSON.parse(manifestText.slice(entryStart, entryEnd))
        if (entry.id === 'fish-blue-green-chromis') {
          const lineStart = manifestText.lastIndexOf('\n', entryStart) + 1
          const indent = manifestText.slice(lineStart, entryStart)
          const serialized = JSON.stringify(nextEntry, null, 2).replaceAll('\n', `\n${indent}`)
          return manifestText.slice(0, entryStart) + serialized + manifestText.slice(entryEnd)
        }
      }
    }
  }
  throw new Error('Chromis entry not found in manifest')
}

function atomicWrite(filePath, bytes) {
  const tempPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`
  const fd = fs.openSync(tempPath, 'wx', 0o644)
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  fs.renameSync(tempPath, filePath)
}

function inspectImageBytes(doc, binary) {
  return doc.images.map(image => {
    const view = doc.bufferViews[image.bufferView], bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Chromis PBR maps must remain embedded PNGs')
    // Hash the inflated raw scanlines (pixels), not the compressed PNG bytes:
    // the generator encodes PNGs with zlib.deflateSync at level 9, and
    // deflate output differs between bundled zlib versions (zlib 1.3 produced
    // the checked-in base; Node 24.22's zlib 1.3.2.1-motley compresses the
    // identical pixels to different bytes). Pixel hashes are stable.
    return { mimeType: image.mimeType, widthPx: bytes.readUInt32BE(16), heightPx: bytes.readUInt32BE(20), sha256: sha256(pngRawScanlines(bytes)) }
  })
}

function replaceExactlyOnce(source, before, after) {
  const first = source.indexOf(before)
  if (first < 0 || source.indexOf(before, first + before.length) !== -1) throw new Error(`Shared generator anchor missing or ambiguous: ${before}`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

// Construct a temporary, selected-species module from a pinned shared source.
// Its all-species writer is removed before execution; no import or execution of
// the shared entrypoint occurs. All generated files live in the temporary dir.
function buildSelectedRecipe(root, sourceText, generatorHash) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aq107-chromis-recipe-'))
  try {
    let moduleText = replaceExactlyOnce(sourceText, "import * as THREE from 'three'", `import * as THREE from ${JSON.stringify(import.meta.resolve('three'))}`)
    moduleText = replaceExactlyOnce(moduleText, "import { validateAssetContract } from '../src/rendering/assets/contract.ts'", `import { validateAssetContract } from ${JSON.stringify(pathToFileURL(path.join(repositoryRoot, 'src/rendering/assets/contract.ts')).href)}`)
    moduleText = replaceExactlyOnce(moduleText, "const REPO_ROOT = path.resolve(__dirname, '..')", `const REPO_ROOT = ${JSON.stringify(root)}`)
    const anchor = "const OVERRIDES_DIR = path.join(OUT_DIR, 'overrides')"
    const offset = moduleText.indexOf(anchor)
    if (offset < 0 || moduleText.indexOf(anchor, offset + anchor.length) !== -1) throw new Error('Shared generator entrypoint anchor missing or ambiguous')
    moduleText = moduleText.slice(0, offset) + `\nconst original = SPECIES_SPECS.filter(s => s.id === 'blue-green-chromis')\nif (original.length !== 1) throw new Error('Expected exactly one chromis recipe')\nconst run = (gridNZ, gridNY, stem) => {\n  const spec = { ...original[0], gridNZ, gridNY }\n  const built = buildSelfContainedContractGlb(spec, buildPhotoreal3DMesh(spec), ${JSON.stringify(generatorHash)})\n  fs.writeFileSync(path.join(${JSON.stringify(temp)}, stem + '.glb'), built.glbBuf)\n  fs.writeFileSync(path.join(${JSON.stringify(temp)}, stem + '.json'), JSON.stringify(built.inspectionRecord))\n}\nrun(84, 50, 'base')\nrun(139, 83, 'selected')\n`
    const file = path.join(temp, 'selected-recipe.mjs')
    fs.writeFileSync(file, moduleText)
    execFileSync(process.execPath, ['--experimental-strip-types', file], { stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 })
    return {
      base: fs.readFileSync(path.join(temp, 'base.glb')),
      selected: fs.readFileSync(path.join(temp, 'selected.glb')),
      report: JSON.parse(fs.readFileSync(path.join(temp, 'selected.json'), 'utf8')),
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
}

function accessorBytes(model, accessorIndex) {
  const a = model.json.accessors[accessorIndex], view = model.json.bufferViews[a.bufferView]
  const width = TYPE_WIDTH.get(a.type) || (a.type === 'MAT4' ? 16 : 0)
  const size = COMPONENT_BYTES.get(a.componentType)
  if (!width || !size || a.sparse || view.byteStride) throw new Error('Unexpected rig accessor layout')
  const start = (view.byteOffset || 0) + (a.byteOffset || 0)
  return model.binary.subarray(start, start + a.count * width * size)
}
function rigFingerprint(model) {
  const doc = model.json
  if (doc.skins?.length !== 1 || doc.animations?.length !== 1 || doc.skins[0].joints.length !== 8 || doc.animations[0].channels.length !== 8) throw new Error('Unexpected chromis rig/animation structure')
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify({ skin: doc.skins[0].joints, channels: doc.animations[0].channels, samplers: doc.animations[0].samplers.map(s => s.interpolation), name: doc.animations[0].name }))
  hash.update(accessorBytes(model, doc.skins[0].inverseBindMatrices))
  for (const sampler of doc.animations[0].samplers) { hash.update(accessorBytes(model, sampler.input)); hash.update(accessorBytes(model, sampler.output)) }
  return hash.digest('hex')
}

function readArguments(argv) {
  let root = repositoryRoot, dryRun = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = path.resolve(argv[++i] || '')
    else if (argv[i] === '--dry-run') dryRun = true
    else if (argv[i] === '--help') return { help: true }
    else throw new Error(`Unknown argument ${argv[i]}`)
  }
  return { root, dryRun }
}

export async function main(argv = process.argv.slice(2)) {
  const args = readArguments(argv)
  if (args.help) { console.log('Usage: node --experimental-strip-types scripts/refine-chromis-contour.mjs [--root REPO] [--dry-run]'); return }
  const root = args.root
  const paths = Object.fromEntries(Object.entries(DEFAULT_PATHS).map(([key, value]) => [key, path.join(root, value)]))
  paths.generator = path.join(root, 'scripts/build-splat-fish-glbs.mjs')
  paths.guide = path.join(root, 'src/rendering/assets/splat-fish/overrides/learned-shape-guide.json')
  if (!fs.existsSync(paths.base)) throw new Error('Missing immutable base GLB; refusing to generate or write outputs')
  for (const [label, file] of Object.entries(paths)) if (!fs.existsSync(file)) throw new Error(`Missing ${label} input: ${file}`)
  const snapshots = Object.fromEntries(Object.entries(paths).map(([key, file]) => [key, fs.readFileSync(file)]))
  const actual = Object.fromEntries(Object.entries(snapshots).map(([key, bytes]) => [key, sha256(bytes)]))
  if (actual.base !== BASE_GLB_SHA256 || actual.source !== SOURCE_WEBP_SHA256 || actual.generator !== SHARED_GENERATOR_SHA256 || actual.guide !== GUIDE_SHA256) throw new Error('Pinned base, source image, generator, or learned guide hash mismatch')
  const scriptHash = sha256(fs.readFileSync(scriptPath)), manifestText = snapshots.manifest.toString('utf8'), manifest = JSON.parse(manifestText)
  const entry = manifest.assets?.find(item => item.id === 'fish-blue-green-chromis')
  if (!entry || entry.sha256 !== actual.glb) throw new Error('Chromis GLB and manifest row do not match')
  const oldInputs = entry.sourceInputs
  if (actual.glb !== BASE_GLB_SHA256 && !(entry.generator === 'scripts/refine-chromis-contour.mjs' && oldInputs?.baseGlbSha256 === actual.base && oldInputs?.sourceWebpSha256 === actual.source)) throw new Error('Refusing to replace an unrecognized chromis output')

  const built = buildSelectedRecipe(root, snapshots.generator.toString('utf8'), actual.generator)
  // Compare canonically, not byte-for-byte: the mesh, rig and texture pixels
  // must reproduce exactly, but the embedded PNG bytes legitimately differ
  // between zlib versions (see canonicalGlbFingerprint), so a raw byte
  // comparison would fail on any Node whose bundled zlib differs from the
  // one that produced the immutable base.
  if (canonicalGlbFingerprint(built.base) !== canonicalGlbFingerprint(snapshots.base)) throw new Error('Original 84×50 recipe did not reproduce immutable base (mesh, rig, materials and texture pixels must match)')
  const base = parseGlb(snapshots.base), selected = parseGlb(built.selected)
  if (JSON.stringify(inspectImageBytes(base.json, base.binary)) !== JSON.stringify(inspectImageBytes(selected.json, selected.binary))) throw new Error('Original texture payloads changed')
  if (JSON.stringify(base.json.materials) !== JSON.stringify(selected.json.materials)) throw new Error('Original material definitions changed')
  if (rigFingerprint(base) !== rigFingerprint(selected)) throw new Error('Original rig or animation changed')
  const primitive = selected.json.meshes[0].primitives[0], vertexCount = selected.json.accessors[primitive.attributes.POSITION].count
  const triangleCount = selected.json.accessors[primitive.indices].count / 3
  const bounds = { min: selected.json.accessors[primitive.attributes.POSITION].min, max: selected.json.accessors[primitive.attributes.POSITION].max }
  const dimensions = bounds.min.map((x, i) => Number((bounds.max[i] - x).toFixed(6)))
  const sourceInputs = { baseGlbSha256: actual.base, sourceWebpSha256: actual.source, sharedGeneratorSha256: actual.generator, learnedGuideSha256: actual.guide, grid: GRID }
  const recipe = `node scripts/refine-chromis-contour.mjs; baseGlbSha256=${actual.base}; sourceWebpSha256=${actual.source}; sharedGeneratorSha256=${actual.generator}; learnedGuideSha256=${actual.guide}; grid=139x83`
  const rootNode = selected.json.nodes[selected.json.scenes?.[0]?.nodes?.[0] ?? 0]
  rootNode.extras.reefAsset.provenance.sourceSha256 = scriptHash
  rootNode.extras.reefAsset.provenance.recipe = recipe
  built.report.extras.reefAsset = structuredClone(rootNode.extras.reefAsset)
  if (!validateAssetContract(built.report).valid) throw new Error('Selected inspection fails reef asset contract')
  const finalGlb = encodeGlb(selected.json, selected.binary)
  const budget = ASSET_CLASS_BUDGETS['background-fish']
  if (finalGlb.length > budget.maxFileBytes || triangleCount > budget.maxTriangles) throw new Error('Final encoded chromis exceeds background-fish budget')
  const images = inspectImageBytes(selected.json, selected.binary)
  if (images.length > budget.maxTextureMaps || images.some(image => Math.max(image.widthPx, image.heightPx) > budget.maxTextureDimensionPx)) throw new Error('Chromis textures exceed background-fish budget')
  Object.assign(entry, { sha256: sha256(finalGlb), bytes: finalGlb.length, triangles: triangleCount, dimensionsM: dimensions, boundsM: bounds, primitives: entry.primitives.map((item, i) => i === 0 ? { ...item, vertexCount } : item), generator: 'scripts/refine-chromis-contour.mjs', generatorSha256: scriptHash, recipe, sourceInputs })
  const finalManifest = replaceManifestEntryText(manifestText, entry), finalReport = JSON.stringify(built.report, null, 2) + '\n'
  for (const [key, file] of Object.entries(paths)) if (sha256(fs.readFileSync(file)) !== actual[key]) throw new Error(`${key} changed concurrently; refusing to overwrite`)
  if (sha256(fs.readFileSync(scriptPath)) !== scriptHash) throw new Error('Refinement script changed concurrently')
  if (!args.dryRun) { atomicWrite(paths.glb, finalGlb); atomicWrite(paths.report, Buffer.from(finalReport)); atomicWrite(paths.manifest, Buffer.from(finalManifest)) }
  console.log(JSON.stringify({ dryRun: args.dryRun, sourceInputs, scriptSha256: scriptHash, baseFingerprint: canonicalGlbFingerprint(built.base), recipeOutputFingerprint: canonicalGlbFingerprint(built.selected), outputFingerprint: canonicalGlbFingerprint(finalGlb), outputBytes: finalGlb.length, triangles: triangleCount, vertices: vertexCount, bounds, texturesUnchanged: true, rigFingerprint: rigFingerprint(selected) }, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error?.stack || error); process.exitCode = 1 })
}
