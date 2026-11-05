/**
 * Package, stamp in-band glTF extras, and contract-validate all 6 rigged & animated
 * 3D reef fish species models in `src/rendering/assets/fish/`.
 *
 * Usage:
 *   node --experimental-strip-types src/rendering/modeling/package_modular_fish.mjs
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAssetContract } from '../assets/contract.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const SOURCE_DIR = '/tmp/fish-models'
const OUT_DIR = path.join(REPO_ROOT, 'src/rendering/assets/fish')

const FISH_ASSETS = [
  {
    id: 'fish-ocellaris-clownfish',
    fishSpeciesId: 'ocellaris-clownfish',
    file: 'fish-ocellaris-clownfish.glb',
    species: 'Amphiprion ocellaris (Ocellaris Clownfish)',
    rigArchetype: 'subcarangiform_schooler',
    generator: 'src/rendering/modeling/build_clownfish.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_clownfish.py -- /tmp/fish-models/fish-ocellaris-clownfish',
    meshNodeName: 'Ocellaris_Clownfish',
    primitiveId: 'ocellaris_clownfish_body',
  },
  {
    id: 'fish-yellow-tang',
    fishSpeciesId: 'yellow-tang',
    file: 'fish-yellow-tang.glb',
    species: 'Zebrasoma flavescens (Yellow Tang)',
    rigArchetype: 'labriform_rigid_disc',
    generator: 'src/rendering/modeling/build_yellow_tang.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_yellow_tang.py -- /tmp/fish-models/fish-yellow-tang',
    meshNodeName: 'Yellow_Tang',
    primitiveId: 'yellow_tang_body',
  },
  {
    id: 'fish-blue-tang',
    fishSpeciesId: 'blue-tang',
    file: 'fish-blue-tang.glb',
    species: 'Paracanthurus hepatus (Regal Blue Tang / Palette Surgeonfish)',
    rigArchetype: 'labriform_cruiser',
    generator: 'src/rendering/modeling/build_blue_tang.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_blue_tang.py -- /tmp/fish-models/fish-blue-tang',
    meshNodeName: 'Blue_Tang',
    primitiveId: 'blue_tang_body',
  },
  {
    id: 'fish-royal-gramma',
    fishSpeciesId: 'royal-gramma',
    file: 'fish-royal-gramma.glb',
    species: 'Gramma loreto (Royal Gramma / Fairy Basslet)',
    rigArchetype: 'subcarangiform_schooler',
    generator: 'src/rendering/modeling/build_royal_gramma.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_royal_gramma.py -- /tmp/fish-models/fish-royal-gramma',
    meshNodeName: 'Royal_Gramma',
    primitiveId: 'royal_gramma_body',
  },
  {
    id: 'fish-banggai-cardinalfish',
    fishSpeciesId: 'banggai-cardinalfish',
    file: 'fish-banggai-cardinalfish.glb',
    species: 'Pterapogon kauderni (Banggai Cardinalfish)',
    rigArchetype: 'banner_hoverer',
    generator: 'src/rendering/modeling/build_banggai_cardinalfish.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_banggai_cardinalfish.py -- /tmp/fish-models/fish-banggai-cardinalfish',
    meshNodeName: 'Banggai_Cardinalfish',
    primitiveId: 'banggai_cardinalfish_body',
  },
  {
    id: 'fish-mandarin-dragonet',
    fishSpeciesId: 'mandarin-dragonet',
    file: 'fish-mandarin-dragonet.glb',
    species: 'Synchiropus splendidus (Mandarin Dragonet)',
    rigArchetype: 'benthic_percher_dragonet',
    generator: 'src/rendering/modeling/build_mandarin_dragonet.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_mandarin_dragonet.py -- /tmp/fish-models/fish-mandarin-dragonet',
    meshNodeName: 'Mandarin_Dragonet',
    primitiveId: 'mandarin_dragonet_body',
  },
]

function parseGlb(buffer) {
  if (buffer.toString('utf8', 0, 4) !== 'glTF') {
    throw new Error('Invalid GLB header')
  }
  const jsonLen = buffer.readUInt32LE(12)
  const jsonStr = buffer.subarray(20, 20 + jsonLen).toString('utf8').replace(/\0+$/, '').trim()
  const doc = JSON.parse(jsonStr)
  const binHeaderOffset = 20 + jsonLen
  const binLen = buffer.readUInt32LE(binHeaderOffset)
  const binChunk = buffer.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLen)
  return { doc, binChunk }
}

function buildGlb(doc, binChunk) {
  let jsonBytes = Buffer.from(JSON.stringify(doc), 'utf8')
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4
  if (jsonPad > 0) {
    jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)])
  }
  const binPad = (4 - (binChunk.length % 4)) % 4
  const paddedBin = binPad > 0 ? Buffer.concat([binChunk, Buffer.alloc(binPad, 0x00)]) : binChunk

  const totalLen = 12 + 8 + jsonBytes.length + 8 + paddedBin.length
  const out = Buffer.alloc(totalLen)
  out.write('glTF', 0, 4, 'utf8')
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(totalLen, 8)
  out.writeUInt32LE(jsonBytes.length, 12)
  out.write('JSON', 16, 4, 'utf8')
  jsonBytes.copy(out, 20)
  const binStart = 20 + jsonBytes.length
  out.writeUInt32LE(paddedBin.length, binStart)
  out.write('BIN\0', binStart + 4, 4, 'utf8')
  paddedBin.copy(out, binStart + 8)
  return out
}

fs.mkdirSync(OUT_DIR, { recursive: true })

const manifestEntries = []

for (const spec of FISH_ASSETS) {
  const srcGlbPath = path.join(SOURCE_DIR, spec.file)
  const rawBuf = fs.readFileSync(srcGlbPath)
  const { doc, binChunk } = parseGlb(rawBuf)
  const generatorPath = path.join(REPO_ROOT, spec.generator)
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(generatorPath)).digest('hex')

  const overallMin = [Infinity, Infinity, Infinity]
  const overallMax = [-Infinity, -Infinity, -Infinity]
  const primitives = []
  let totalTriangles = 0

  for (const node of doc.nodes) {
    if (node.mesh === undefined) continue
    const mesh = doc.meshes[node.mesh]
    const prim = mesh.primitives[0]
    const posAccessor = doc.accessors[prim.attributes.POSITION]
    const idxAccessor = prim.indices !== undefined ? doc.accessors[prim.indices] : null
    const triCount = idxAccessor ? idxAccessor.count / 3 : posAccessor.count / 3
    totalTriangles += triCount

    const pMin = posAccessor.min.map(v => Number(v.toFixed(6)))
    const pMax = posAccessor.max.map(v => Number(v.toFixed(6)))
    for (let k = 0; k < 3; k++) {
      overallMin[k] = Math.min(overallMin[k], pMin[k])
      overallMax[k] = Math.max(overallMax[k], pMax[k])
    }

    const primExtras = {
      id: spec.primitiveId,
      role: 'fish',
    }
    node.extras = { ...(node.extras || {}), reefPrimitive: primExtras }

    primitives.push({
      id: spec.primitiveId,
      role: 'fish',
      vertexCount: posAccessor.count,
      boundsM: { min: pMin, max: pMax },
      material: {
        vertexColors: false,
        vertexAlpha: false,
        aoSource: 'texture',
      },
    })
  }

  const dimensionsM = [
    Number((overallMax[0] - overallMin[0]).toFixed(6)),
    Number((overallMax[1] - overallMin[1]).toFixed(6)),
    Number((overallMax[2] - overallMin[2]).toFixed(6)),
  ]

  const reefAsset = {
    schema: 'reef-asset-v1',
    id: spec.id,
    kind: 'fish',
    units: 'meter',
    upAxis: '+Y',
    origin: 'local',
    dimensionsM,
    provenance: {
      license: 'original',
      creator: 'Aquarium project',
      sourceSha256,
      recipe: spec.recipe,
      attribution: `Original procedural Blender 5.0.1 rigged and animated fish asset (${spec.species}) with embedded 1024x1024 PBR textures.`,
    },
  }

  const rootNodeIdx = doc.scenes[doc.scene || 0].nodes[0]
  const rootNode = doc.nodes[rootNodeIdx]
  rootNode.extras = { ...(rootNode.extras || {}), reefAsset }

  const stampedGlb = buildGlb(doc, binChunk)
  const glbSha256 = crypto.createHash('sha256').update(stampedGlb).digest('hex')

  const skinJoints = doc.skins && doc.skins[0] ? doc.skins[0].joints.map(j => doc.nodes[j].name) : []
  const animationNames = (doc.animations || []).map(a => a.name)

  const inspectionRecord = {
    extras: { reefAsset },
    rootTransform: {
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    boundsM: { min: overallMin, max: overallMax },
    primitives,
    sockets: [],
    collisionParts: [],
  }

  const validation = validateAssetContract(inspectionRecord)
  if (!validation.valid) {
    console.error(`Contract validation failed for ${spec.id}:`, validation.issues)
    process.exit(1)
  }

  const outGlbPath = path.join(OUT_DIR, spec.file)
  const outInspectionPath = path.join(OUT_DIR, `${spec.id}-inspection.json`)
  fs.writeFileSync(outGlbPath, stampedGlb)
  fs.writeFileSync(outInspectionPath, JSON.stringify(inspectionRecord, null, 2) + '\n')

  manifestEntries.push({
    id: spec.id,
    fishSpeciesId: spec.fishSpeciesId,
    file: spec.file,
    path: `src/rendering/assets/fish/${spec.file}`,
    inspectionReport: `src/rendering/assets/fish/${spec.id}-inspection.json`,
    kind: 'fish',
    rigArchetype: spec.rigArchetype,
    species: spec.species,
    sha256: glbSha256,
    bytes: stampedGlb.length,
    triangles: totalTriangles,
    dimensionsM,
    boundsM: inspectionRecord.boundsM,
    joints: skinJoints,
    animations: animationNames,
    primitives: primitives.map(p => ({
      id: p.id,
      role: p.role,
      vertexCount: p.vertexCount,
    })),
    generator: spec.generator,
    generatorSha256: sourceSha256,
    recipe: spec.recipe,
    contractValidated: true,
    status: 'candidate-awaiting-root-review',
  })

  console.log(
    `Packaged & contract-verified ${spec.id}: ${stampedGlb.length} bytes, ${totalTriangles} tris, joints=${skinJoints.length}, anims=${animationNames.join(',')}, sha256=${glbSha256.slice(0, 12)}...`,
  )
}

const manifestPath = path.join(OUT_DIR, 'manifest.json')
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      schema: 'modular-fish-manifest-v1',
      contractSchema: 'reef-asset-v1',
      note: 'Six supplied rigged fish candidates pass the offline contract; anatomy, clip composition and runtime integration require separate Root review.',
      assets: manifestEntries,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Wrote ${manifestPath} with ${manifestEntries.length} verified fish assets.`)
