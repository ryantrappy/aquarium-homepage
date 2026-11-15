#!/usr/bin/env node
// Recompute source-file/embedded-texture bounds from immutable Git objects.
// Run from any directory with: node <this-file> > inventory.json
// The script intentionally does not use the working-tree asset files.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const commit = '1f6e1f49e210b7e612c17cefbbedd8b7b4c2548f'
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const git = path => execFileSync('git', ['-C', root, 'show', `${commit}:${path}`], { maxBuffer: 64 * 1024 * 1024 })
const blobId = path => execFileSync('git', ['-C', root, 'rev-parse', `${commit}:${path}`], { encoding: 'utf8' }).trim()
const json = path => JSON.parse(git(path).toString('utf8'))

function glbStats(path) {
  const bytes = git(path)
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error(`not a GLB: ${path}`)
  let offset = 12
  let document
  let binaryOffset
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    offset += 8
    if (type === 0x4e4f534a) document = JSON.parse(bytes.toString('utf8', offset, offset + length))
    if (type === 0x004e4942) binaryOffset = offset
    offset += length
  }
  if (!document) throw new Error(`missing JSON chunk: ${path}`)

  const textures = (document.images ?? []).map(image => {
    const mime = image.mimeType ?? 'unknown'
    const view = document.bufferViews?.[image.bufferView]
    const start = (binaryOffset ?? 0) + (view?.byteOffset ?? 0)
    let width = 0
    let height = 0
    if (mime === 'image/png' && view) {
      width = bytes.readUInt32BE(start + 16)
      height = bytes.readUInt32BE(start + 20)
    }
    if (mime === 'image/jpeg' && view) {
      let cursor = start + 2
      const end = start + view.byteLength
      while (cursor + 9 < end) {
        if (bytes[cursor] !== 0xff) { cursor++; continue }
        const marker = bytes[cursor + 1]
        const length = bytes.readUInt16BE(cursor + 2)
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          height = bytes.readUInt16BE(cursor + 5)
          width = bytes.readUInt16BE(cursor + 7)
          break
        }
        cursor += 2 + length
      }
    }
    const encodedBytes = view?.byteLength ?? 0
    // Mirrors the existing PNG/JPEG RGBA8 + full-mipmap estimate. This is
    // an estimate for embedded image maps, not total WebGL allocation.
    const estimatedGpuBytes = Math.floor(width * height * 4 * 4 / 3)
    return { mime, width, height, encodedBytes, estimatedGpuBytes }
  })
  const sourceTriangles = (document.meshes ?? []).reduce((sum, mesh) => sum + (mesh.primitives ?? []).reduce((meshSum, primitive) => {
    const accessor = primitive.indices !== undefined
      ? document.accessors?.[primitive.indices]
      : document.accessors?.[primitive.attributes?.POSITION]
    return meshSum + Math.floor((accessor?.count ?? 0) / 3)
  }, 0), 0)
  return {
    path,
    gitBlob: blobId(path),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    fileBytes: bytes.length,
    uniqueSourceTriangles: sourceTriangles,
    textures,
    estimatedEmbeddedTextureGpuBytes: textures.reduce((sum, texture) => sum + texture.estimatedGpuBytes, 0),
  }
}

const splatManifest = json('src/rendering/assets/splat-fish/manifest.json')
const coralManifest = json('src/rendering/assets/corals/manifest.json')
const coralFiles = coralManifest.assets.filter(asset => asset.kind !== 'rock').map(asset => asset.path)
const rockFiles = coralManifest.assets.filter(asset => asset.kind === 'rock').map(asset => asset.path)
const reefFiles = [...rockFiles, ...coralFiles, 'src/rendering/assets/corals/custom-rocks/reef-center-arch.glb']
const fishPaths = {
  'yellow-tang': 'src/rendering/proof/candidate-real-tang.glb',
  'ocellaris-clownfish': 'src/rendering/assets/fish/download_testing_copies/clownfish-copy.glb',
  'banggai-cardinalfish': 'src/rendering/assets/splat-fish/banggai-cardinalfish.glb',
  'royal-gramma': 'src/rendering/assets/splat-fish/royal-gramma.glb',
  'blue-tang': 'src/rendering/assets/splat-fish/blue-tang.glb',
  'blue-green-chromis': 'src/rendering/assets/splat-fish/blue-green-chromis.glb',
}
const scenarios = {}
for (const [name, ids] of Object.entries({
  phase0ThreeConfiguredFish: ['yellow-tang', 'banggai-cardinalfish', 'royal-gramma'],
  defaultFiveServices: ['yellow-tang', 'banggai-cardinalfish', 'royal-gramma', 'ocellaris-clownfish', 'blue-tang'],
  defaultFivePlusChromisService: ['yellow-tang', 'banggai-cardinalfish', 'royal-gramma', 'ocellaris-clownfish', 'blue-tang', 'blue-green-chromis'],
})) {
  const files = ids.map(id => glbStats(fishPaths[id]))
  scenarios[name] = aggregate(files)
  scenarios[name].speciesIds = ids
  scenarios[name].uniqueFishGlbFiles = files
}
const reef = reefFiles.map(glbStats)
scenarios.wideStaticReef = { ...aggregate(reef), uniqueReefGlbFiles: reef }

const standardPotentialFishPaths = [
  ...splatManifest.assets.map(asset => asset.path),
  fishPaths['yellow-tang'],
  fishPaths['ocellaris-clownfish'],
]
const standardPotentialFish = standardPotentialFishPaths.map(glbStats)
scenarios.allStandardPotentialFishExcludingOptionalSailfinAndAQ106 = {
  ...aggregate(standardPotentialFish),
  uniqueFishGlbFiles: standardPotentialFish,
}
scenarios.allStandardPotentialAssetsExcludingOptionalSailfinAndAQ106 = aggregate([...standardPotentialFish, ...reef])
scenarios.allStandardPotentialAssetsExcludingOptionalSailfinAndAQ106.uniqueFishGlbFiles = standardPotentialFish
scenarios.allStandardPotentialAssetsExcludingOptionalSailfinAndAQ106.uniqueReefGlbFiles = reef

const budgetComparison = [
  'src/rendering/proof/candidate-real-clown.glb',
  'src/rendering/proof/candidate-real-tang.glb',
  fishPaths['ocellaris-clownfish'],
  'src/rendering/assets/corals/custom-rocks/reef-center-arch.glb',
].map(glbStats)

function aggregate(files) {
  return {
    uniqueGlbFileCount: files.length,
    uniqueSourceFileBytes: files.reduce((sum, file) => sum + file.fileBytes, 0),
    uniqueSourceTriangles: files.reduce((sum, file) => sum + file.uniqueSourceTriangles, 0),
    estimatedEmbeddedTextureGpuBytes: files.reduce((sum, file) => sum + file.estimatedEmbeddedTextureGpuBytes, 0),
  }
}

console.log(JSON.stringify({
  sourceCommit: commit,
  metricDefinitions: {
    uniqueSourceTriangles: 'Sum of GLB mesh primitive source indices (or POSITION accessor fallback) divided by three per unique file. Does not count repeated runtime instances or multipass draws.',
    estimatedEmbeddedTextureGpuBytes: 'Embedded PNG/JPEG map dimensions as RGBA8, multiplied by 4/3 for a full mip-chain estimate. Excludes geometry buffers, RTT/depth/shadow/PMREM targets, driver overhead, transient decode and shared-resource details.',
  },
  scenarios,
  budgetContractComparisonFiles: budgetComparison,
}, null, 2))

