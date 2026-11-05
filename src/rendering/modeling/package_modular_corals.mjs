/**
 * Package candidate modular coral colonies and bare live-rock island foundations into
 * `src/rendering/assets/corals/`, stamp in-band `reefAsset` / `reefPrimitive` / `reefSocket`
 * glTF extras per `docs/asset-contract.md`, emit `<id>-inspection.json` and `manifest.json`,
 * and verify every asset against `validateAssetContract` from `src/rendering/assets/contract.ts`.
 *
 * Run:
 *   node --experimental-strip-types src/rendering/modeling/package_modular_corals.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { validateAssetContract } from '../assets/contract.ts'
import { inspectRockSockets } from '../assets/socket-inspector.ts'

const REPO_ROOT = process.cwd()
const SOURCE_DIR = '/tmp/coral-models'
const OUT_DIR = path.join(REPO_ROOT, 'src/rendering/assets/corals')

const ASSETS = [
  {
    id: 'coral-euphyllia-torch',
    file: 'coral-euphyllia-torch.glb',
    kind: 'coral',
    archetype: 'tentaculate-lps',
    species: 'Euphyllia glabrescens (Gold / Neon-Green Tip Torch Coral)',
    generator: 'src/rendering/modeling/build_euphyllia_torch.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_euphyllia_torch.py -- /tmp/coral-models/coral-euphyllia-torch',
    primitiveRoles: {
      Euphyllia_Skeleton: { id: 'euphyllia_skeleton', role: 'coral-rigid' },
      Euphyllia_Polyp_Crown: { id: 'euphyllia_polyp_crown', role: 'coral-soft' },
    },
  },
  {
    id: 'coral-acropora-table',
    file: 'coral-acropora-table.glb',
    kind: 'coral',
    archetype: 'branching-sps',
    species: 'Acropora hyacinthus / millepora (Corymbose Table SPS Colony)',
    generator: 'src/rendering/modeling/build_acropora_table.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_acropora_table.py -- /tmp/coral-models/coral-acropora-table',
    primitiveRoles: {
      Coral_Acropora_Table: { id: 'acropora_table_colony', role: 'coral-rigid' },
    },
  },
  {
    id: 'coral-acropora-staghorn',
    file: 'coral-acropora-staghorn.glb',
    kind: 'coral',
    archetype: 'branching-sps',
    species: 'Acropora formosa / cervicornis (Upright Arborescent Staghorn SPS Colony)',
    generator: 'src/rendering/modeling/build_acropora_staghorn.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_acropora_staghorn.py -- /tmp/coral-models/coral-acropora-staghorn',
    primitiveRoles: {
      Coral_Acropora_Staghorn: { id: 'acropora_staghorn_colony', role: 'coral-rigid' },
    },
  },
  {
    id: 'coral-montipora-plate',
    file: 'coral-montipora-plate.glb',
    kind: 'coral',
    archetype: 'plating-sps',
    species: 'Montipora capricornis (Scrolling Whorl Plate SPS Colony)',
    generator: 'src/rendering/modeling/build_montipora_plate.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_montipora_plate.py -- /tmp/coral-models/coral-montipora-plate',
    primitiveRoles: {
      Coral_Montipora_Plate: { id: 'montipora_plate_colony', role: 'coral-rigid' },
    },
  },
  {
    id: 'coral-brain-diploria',
    file: 'coral-brain-diploria.glb',
    kind: 'coral',
    archetype: 'mounded-lps',
    species: 'Diploria / Symphyllia (Meandroid Labyrinth Brain Coral)',
    generator: 'src/rendering/modeling/build_brain_coral.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_brain_coral.py -- /tmp/coral-models/coral-brain-diploria',
    primitiveRoles: {
      Coral_Brain_Diploria: { id: 'diploria_brain_colony', role: 'coral-soft' },
    },
  },
  {
    id: 'coral-anemone-bta',
    file: 'coral-anemone-bta.glb',
    kind: 'coral',
    archetype: 'host-anemone',
    species: 'Entacmaea quadricolor (Rose / Sunburst Bubble-Tip Host Anemone)',
    generator: 'src/rendering/modeling/build_bubble_tip_anemone.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_bubble_tip_anemone.py -- /tmp/coral-models/coral-anemone-bta',
    primitiveRoles: {
      Anemone_Column_Disc: { id: 'anemone_column_disc', role: 'coral-soft' },
      Anemone_Tentacle_Crown: { id: 'anemone_tentacle_crown', role: 'coral-soft' },
    },
  },
  {
    id: 'coral-euphyllia-hammer',
    file: 'coral-euphyllia-hammer.glb',
    kind: 'coral',
    archetype: 'tentaculate-lps',
    species: 'Euphyllia ancora / parancora (Bi-Color Anchor / Hammer Coral)',
    generator: 'src/rendering/modeling/build_euphyllia_hammer.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_euphyllia_hammer.py -- /tmp/coral-models/coral-euphyllia-hammer',
    primitiveRoles: {
      Euphyllia_Hammer_Skeleton: { id: 'euphyllia_hammer_skeleton', role: 'coral-rigid' },
      Euphyllia_Hammer_Polyp_Crown: { id: 'euphyllia_hammer_polyp_crown', role: 'coral-soft' },
    },
  },
  {
    id: 'coral-zoanthid-mat',
    file: 'coral-zoanthid-mat.glb',
    kind: 'coral',
    archetype: 'zoanthid-mat',
    species: 'Zoanthus sp. (Encrusting Colonial Button Polyp Cluster)',
    generator: 'src/rendering/modeling/build_zoanthid_mat.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_zoanthid_mat.py -- /tmp/coral-models/coral-zoanthid-mat',
    primitiveRoles: {
      Coral_Zoanthid_Mat: { id: 'zoanthid_button_cluster', role: 'coral-soft' },
    },
  },
  {
    id: 'live-rock-island-left',
    file: 'live-rock-island-left.glb',
    kind: 'rock',
    archetype: 'rock-foundation',
    species: 'Aragonite Live-Rock Left Arched Bommie Foundation with Coral Mount Sockets',
    generator: 'src/rendering/modeling/build_live_rock_islands.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_live_rock_islands.py -- /tmp/coral-models left',
    primitiveRoles: {
      Live_Rock_Island_Left: { id: 'live_rock_island_left', role: 'rock' },
    },
  },
  {
    id: 'live-rock-island-right',
    file: 'live-rock-island-right.glb',
    kind: 'rock',
    archetype: 'rock-foundation',
    species: 'Aragonite Live-Rock Right Terraced Shelf Foundation with Coral Mount Sockets',
    generator: 'src/rendering/modeling/build_live_rock_islands.py',
    recipe: '/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_live_rock_islands.py -- /tmp/coral-models right',
    primitiveRoles: {
      Live_Rock_Island_Right: { id: 'live_rock_island_right', role: 'rock' },
    },
  },
]

const SOCKET_ARCHETYPES = {
  sps_crest: { archetype: 'branching-sps', footprint: 0.035, clearance: 0.085 },
  plate_ledge: { archetype: 'plating-sps', footprint: 0.032, clearance: 0.080 },
  lps_mid: { archetype: 'tentaculate-lps', footprint: 0.030, clearance: 0.075 },
  brain_apron: { archetype: 'mounded-lps', footprint: 0.045, clearance: 0.075 },
  anemone_crevice: { archetype: 'host-anemone', footprint: 0.038, clearance: 0.085 },
  soft_mat: { archetype: 'zoanthid-mat', footprint: 0.040, clearance: 0.070 },
}

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

function decodeColor0Values(doc, binChunk, accessorIndex, isRigid, assetId, primId) {
  const accessor = doc.accessors[accessorIndex]
  const bv = doc.bufferViews[accessor.bufferView]
  const byteOffset = (bv.byteOffset || 0) + (accessor.byteOffset || 0)
  const count = accessor.count
  const componentType = accessor.componentType // 5121 = UNSIGNED_BYTE, 5123 = UNSIGNED_SHORT, 5126 = FLOAT
  const isVec4 = accessor.type === 'VEC4'
  const channels = isVec4 ? 4 : 3
  const values = new Array(count * 4)

  const stride = bv.byteStride || (componentType === 5126 ? channels * 4 : componentType === 5123 ? channels * 2 : channels)
  for (let i = 0; i < count; i++) {
    const base = byteOffset + i * stride
    let r = 0, g = 0, b = 0, a = 1
    if (componentType === 5121) {
      r = binChunk.readUInt8(base) / 255
      g = binChunk.readUInt8(base + 1) / 255
      b = binChunk.readUInt8(base + 2) / 255
      a = isVec4 ? binChunk.readUInt8(base + 3) / 255 : 1
    } else if (componentType === 5123) {
      r = binChunk.readUInt16LE(base) / 65535
      g = binChunk.readUInt16LE(base + 2) / 65535
      b = binChunk.readUInt16LE(base + 4) / 65535
      a = isVec4 ? binChunk.readUInt16LE(base + 6) / 65535 : 1
    } else if (componentType === 5126) {
      r = binChunk.readFloatLE(base)
      g = binChunk.readFloatLE(base + 4)
      b = binChunk.readFloatLE(base + 8)
      a = isVec4 ? binChunk.readFloatLE(base + 12) : 1
    } else {
      throw new Error(`Unsupported COLOR_0 componentType ${componentType} on ${assetId}/${primId}`)
    }
    for (const [chName, val] of [['R', r], ['G', g], ['B', b], ['A', a]]) {
      if (!Number.isFinite(val) || val < 0 || val > 1) {
        throw new Error(`Invalid COLOR_0.${chName}=${val} at vertex ${i} on ${assetId}/${primId}`)
      }
    }
    if (isRigid && r !== 0) {
      throw new Error(`Rigid coral primitive ${assetId}/${primId} has non-zero flexibility COLOR_0.R=${r} at vertex ${i}`)
    }
    values[i * 4] = r
    values[i * 4 + 1] = g
    values[i * 4 + 2] = b
    values[i * 4 + 3] = a
  }
  return values
}

function quatUpVector([x, y, z, w]) {
  const ux = 2 * (x * y - z * w)
  const uy = 1 - 2 * (x * x + z * z)
  const uz = 2 * (y * z + x * w)
  const len = Math.hypot(ux, uy, uz) || 1
  return [Number((ux / len).toFixed(6)), Number((uy / len).toFixed(6)), Number((uz / len).toFixed(6))]
}

function normalizeQuat([x, y, z, w]) {
  const len = Math.hypot(x, y, z, w) || 1
  return [Number((x / len).toFixed(6)), Number((y / len).toFixed(6)), Number((z / len).toFixed(6)), Number((w / len).toFixed(6))]
}

fs.mkdirSync(OUT_DIR, { recursive: true })

const manifestEntries = []

for (const spec of ASSETS) {
  const srcGlbPath = path.join(SOURCE_DIR, spec.file)
  const rawBuf = fs.readFileSync(srcGlbPath)
  const { doc, binChunk } = parseGlb(rawBuf)
  const generatorPath = path.join(REPO_ROOT, spec.generator)
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(generatorPath)).digest('hex')

  // Compute primitive bounds and overall asset bounds from POSITION accessors
  const overallMin = [Infinity, Infinity, Infinity]
  const overallMax = [-Infinity, -Infinity, -Infinity]
  const primitives = []
  let totalTriangles = 0

  for (const node of doc.nodes) {
    if (node.mesh === undefined) continue
    const mesh = doc.meshes[node.mesh]
    const primRole = spec.primitiveRoles[node.name]
    if (!primRole) {
      throw new Error(`Missing primitiveRoles mapping for node ${node.name} in ${spec.id}`)
    }
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
      id: primRole.id,
      role: primRole.role,
      ...(spec.kind === 'coral' ? { maskSchema: 'coral-raw-masks-v1' } : {}),
    }
    node.extras = { ...(node.extras || {}), reefPrimitive: primExtras }

    const primRecord = {
      id: primRole.id,
      role: primRole.role,
      vertexCount: posAccessor.count,
      boundsM: { min: pMin, max: pMax },
      material: {
        vertexColors: false,
        vertexAlpha: false,
        aoSource: spec.kind === 'coral' ? 'coral-mask-a' : 'texture',
      },
    }

    if (spec.kind === 'coral') {
      primRecord.maskSchema = 'coral-raw-masks-v1'
      const colorAccessorIdx = prim.attributes.COLOR_0
      if (colorAccessorIdx === undefined) {
        throw new Error(`Missing COLOR_0 attribute on coral primitive ${node.name} in ${spec.id}`)
      }
      const colorValues = decodeColor0Values(doc, binChunk, colorAccessorIdx, primRole.role === 'coral-rigid', spec.id, primRole.id)
      primRecord.color0 = {
        itemSize: 4,
        values: colorValues,
      }
    }

    primitives.push(primRecord)
  }

  const dimensionsM = [
    Number((overallMax[0] - overallMin[0]).toFixed(6)),
    Number((overallMax[1] - overallMin[1]).toFixed(6)),
    Number((overallMax[2] - overallMin[2]).toFixed(6)),
  ]

  const reefAsset = {
    schema: 'reef-asset-v1',
    id: spec.id,
    kind: spec.kind,
    units: 'meter',
    upAxis: '+Y',
    origin: 'local',
    dimensionsM,
    ...(spec.kind === 'coral' ? { maskSchema: 'coral-raw-masks-v1' } : {}),
    provenance: {
      license: 'original',
      creator: 'Aquarium project',
      sourceSha256,
      recipe: spec.recipe,
      attribution: `Original procedural Blender 5.0.1 ${spec.kind} asset (${spec.species}) with embedded PBR textures.`,
    },
  }

  // Stamp reefAsset onto the root scene node
  const rootNodeIdx = doc.scenes[doc.scene || 0].nodes[0]
  const rootNode = doc.nodes[rootNodeIdx]
  rootNode.extras = { ...(rootNode.extras || {}), reefAsset }

  // Stamp reefSocket intent onto rock socket nodes before building the final GLB
  if (spec.kind === 'rock') {
    const parentPrimId = primitives[0].id
    for (const node of doc.nodes) {
      if (!node.name || !node.name.startsWith('socket_')) continue
      const match = /^socket_([a-z_]+)_\d{2}$/.exec(node.name)
      if (!match) continue
      const prefix = match[1]
      const socketMeta = SOCKET_ARCHETYPES[prefix]
      if (!socketMeta) continue

      node.extras = {
        ...(node.extras || {}),
        reefSocket: {
          role: 'coral-mount',
          parentMesh: parentPrimId,
          archetype: socketMeta.archetype,
          footprintRadiusM: socketMeta.footprint,
          clearanceRadiusM: socketMeta.clearance,
        },
      }
    }
  }

  // Build final stamped GLB and compute its exact SHA-256
  const stampedGlb = buildGlb(doc, binChunk)
  const glbSha256 = crypto.createHash('sha256').update(stampedGlb).digest('hex')

  // Measure actual exported rock sockets using the independent geometry inspector (AQ-52)
  let sockets = []
  // Collision proxies require independent solid-coverage and cave-clearance evidence (AQ-58).
  const collisionParts = []
  if (spec.kind === 'rock') {
    const socketReportRelPath = `src/rendering/assets/corals/${spec.id}-socket-report.json`
    const socketReportAbsPath = path.join(REPO_ROOT, socketReportRelPath)
    const socketReport = inspectRockSockets(stampedGlb, socketReportRelPath)
    fs.writeFileSync(socketReportAbsPath, JSON.stringify(socketReport, null, 2) + '\n')
    if (socketReport.rejectedSockets.length > 0 || socketReport.supportedSockets.length === 0) {
      console.error(`Socket geometry verification failed for ${spec.id}:`, JSON.stringify(socketReport.rejectedSockets, null, 2))
      process.exit(1)
    }
    sockets = socketReport.supportedSockets

  }

  const inspectionRecord = {
    extras: { reefAsset },
    rootTransform: {
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    boundsM: { min: overallMin, max: overallMax },
    primitives,
    sockets,
    collisionParts,
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
    file: spec.file,
    path: `src/rendering/assets/corals/${spec.file}`,
    inspectionReport: `src/rendering/assets/corals/${spec.id}-inspection.json`,
    kind: spec.kind,
    archetype: spec.archetype,
    species: spec.species,
    sha256: glbSha256,
    bytes: stampedGlb.length,
    triangles: totalTriangles,
    dimensionsM,
    boundsM: inspectionRecord.boundsM,
    primitives: primitives.map(p => ({
      id: p.id,
      role: p.role,
      vertexCount: p.vertexCount,
      maskSchema: p.maskSchema || null,
    })),
    socketCount: sockets.length,
    generator: spec.generator,
    generatorSha256: sourceSha256,
    recipe: spec.recipe,
    contractValidated: true,
    status: 'candidate-awaiting-root-review',
  })

  console.log(`Packaged & contract-verified ${spec.id}: ${stampedGlb.length} bytes, ${totalTriangles} tris, sha256=${glbSha256.slice(0, 12)}...`)
}

const manifestPath = path.join(OUT_DIR, 'manifest.json')
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      schema: 'modular-coral-and-rock-manifest-v1',
      contractSchema: 'reef-asset-v1',
      note: 'Ten supplied coral/rock candidates pass the offline contract; visual, collision and runtime integration require separate Root review.',
      assets: manifestEntries,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Wrote ${manifestPath} with ${manifestEntries.length} verified assets.`)
