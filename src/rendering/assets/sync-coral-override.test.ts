import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// Script helpers are intentionally plain .mjs without declaration files.
// @ts-expect-error Exercise the actual CLI parser and packager.
import { parseCoralSyncArgs, syncCoralOverride } from '../../../scripts/sync-coral-override.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const id = 'reef-acropora-antler'
const sourceRoot = 'src/rendering/assets/splat-fish'
const coralManifest = 'src/rendering/assets/corals/manifest.json'
const fishWorkflowPaths = [
  'scripts/build-splat-fish-glbs.mjs',
  `${sourceRoot}/manifest.json`,
  `${sourceRoot}/README.md`,
  `${sourceRoot}/overrides/README.md`,
  `${sourceRoot}/overrides/learned-shape-guide.json`,
  `${sourceRoot}/blend/README.md`,
  coralManifest,
]

type MutateFixture = (document: any, binary: Buffer, offsets: number[]) => void

function makeGlb(mutate?: MutateFixture): Buffer {
  const views: Array<{ buffer: number; byteOffset: number; byteLength: number }> = []
  const accessors: Array<{ bufferView: number; componentType: number; count: number; type: string; normalized?: boolean }> = []
  const chunks: Buffer[] = []
  let byteOffset = 0
  const offsets: number[] = []
  const addAccessor = (values: Buffer, componentType: number, count: number, type: string, normalized = false) => {
    const componentBytes = componentType === 5123 ? 2 : componentType === 5121 ? 1 : 4
    const padding = (componentBytes - (byteOffset % componentBytes)) % componentBytes
    if (padding) { chunks.push(Buffer.alloc(padding)); byteOffset += padding }
    const index = accessors.length
    offsets.push(byteOffset)
    views.push({ buffer: 0, byteOffset, byteLength: values.length })
    accessors.push({ bufferView: views.length - 1, componentType, count, type, ...(normalized ? { normalized: true } : {}) })
    chunks.push(values)
    byteOffset += values.length
    return index
  }
  const floats = (values: number[]) => {
    const bytes = Buffer.alloc(values.length * 4)
    values.forEach((value, index) => bytes.writeFloatLE(value, index * 4))
    return bytes
  }
  const positions = addAccessor(floats([-0.25, 0, 0, 0.35, 0.75, 0.1, 0.15, -0.2, 0.45]), 5126, 3, 'VEC3')
  const normals = addAccessor(floats([0, 0, 1, 0, 0, 1, 0, 0, 1]), 5126, 3, 'VEC3')
  const uv = addAccessor(floats([0, 0, 1, 0, 0.5, 1]), 5126, 3, 'VEC2')
  const masks = addAccessor(Buffer.from([0, 64, 128, 255, 0, 128, 64, 255, 0, 255, 180, 255]), 5121, 3, 'VEC4', true)
  const indices = addAccessor(Buffer.from([0, 0, 1, 0, 2, 0]), 5123, 3, 'SCALAR')
  const binary = Buffer.concat([...chunks, Buffer.alloc((4 - byteOffset % 4) % 4)])
  const document: any = {
    asset: { version: '2.0', generator: 'sync-coral test fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: positions, NORMAL: normals, TEXCOORD_0: uv, COLOR_0: masks }, indices, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.6, 0.55, 0.5, 1], metallicFactor: 0, roughnessFactor: 0.82 }, emissiveFactor: [0, 0, 0] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: views,
    accessors,
  }
  mutate?.(document, binary, offsets)
  const json = Buffer.from(JSON.stringify(document), 'utf8')
  const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20)
  json.copy(paddedJson)
  const total = 12 + 8 + paddedJson.length + 8 + binary.length
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  header.writeUInt32LE(paddedJson.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  const binaryHeader = Buffer.alloc(8)
  binaryHeader.writeUInt32LE(binary.length, 0)
  binaryHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, paddedJson, binaryHeader, binary])
}

function makeDualPrimitiveGlb(mutate?: MutateFixture): Buffer {
  const views: Array<{ buffer: number; byteOffset: number; byteLength: number }> = []
  const accessors: Array<{ bufferView: number; componentType: number; count: number; type: string; normalized?: boolean }> = []
  const chunks: Buffer[] = []
  let byteOffset = 0
  const offsets: number[] = []
  const addAccessor = (values: Buffer, componentType: number, count: number, type: string, normalized = false) => {
    const componentBytes = componentType === 5123 ? 2 : componentType === 5121 ? 1 : 4
    const padding = (componentBytes - (byteOffset % componentBytes)) % componentBytes
    if (padding) { chunks.push(Buffer.alloc(padding)); byteOffset += padding }
    const index = accessors.length
    offsets.push(byteOffset)
    views.push({ buffer: 0, byteOffset, byteLength: values.length })
    accessors.push({ bufferView: views.length - 1, componentType, count, type, ...(normalized ? { normalized: true } : {}) })
    chunks.push(values)
    byteOffset += values.length
    return index
  }
  const floats = (values: number[]) => {
    const bytes = Buffer.alloc(values.length * 4)
    values.forEach((value, index) => bytes.writeFloatLE(value, index * 4))
    return bytes
  }
  const addPrimitive = (positionsData: number[], colors: number[]) => {
    const positions = addAccessor(floats(positionsData), 5126, 3, 'VEC3')
    const normals = addAccessor(floats([0, 0, 1, 0, 0, 1, 0, 0, 1]), 5126, 3, 'VEC3')
    const uv = addAccessor(floats([0, 0, 1, 0, 0.5, 1]), 5126, 3, 'VEC2')
    const masks = addAccessor(Buffer.from(colors), 5121, 3, 'VEC4', true)
    const indices = addAccessor(Buffer.from([0, 0, 1, 0, 2, 0]), 5123, 3, 'SCALAR')
    return { attributes: { POSITION: positions, NORMAL: normals, TEXCOORD_0: uv, COLOR_0: masks }, indices }
  }

  const softPrimitive = addPrimitive(
    [-0.25, 0, 0, 0.35, 0.75, 0.1, 0.15, -0.2, 0.45],
    [0, 0, 255, 255, 255, 255, 0, 170, 128, 128, 128, 220],
  )
  const rigidPrimitive = addPrimitive(
    [-0.1, 0.1, 0.2, 0.1, 0.3, 0.1, 0, 0.2, -0.1],
    [0, 0, 255, 255, 0, 128, 64, 255, 0, 255, 128, 190],
  )
  const binary = Buffer.concat([...chunks, Buffer.alloc((4 - byteOffset % 4) % 4)])
  const document: any = {
    asset: { version: '2.0', generator: 'sync-coral dual-role test fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [
      { ...softPrimitive, material: 0 },
      { ...rigidPrimitive, material: 1 },
    ] }],
    materials: [
      {
        pbrMetallicRoughness: { baseColorFactor: [0.8, 0.65, 0.58, 1], metallicFactor: 0, roughnessFactor: 0.78 },
        emissiveFactor: [0, 0, 0],
        extras: { reefPrimitive: { id: 'torch_crown', role: 'coral-soft', maskSchema: 'coral-raw-masks-v1' } },
      },
      {
        pbrMetallicRoughness: { baseColorFactor: [0.45, 0.38, 0.3, 1], metallicFactor: 0, roughnessFactor: 0.9 },
        emissiveFactor: [0, 0, 0],
        extras: { reefPrimitive: { id: 'torch_skeleton', role: 'coral-rigid', maskSchema: 'coral-raw-masks-v1' } },
      },
    ],
    buffers: [{ byteLength: binary.length }],
    bufferViews: views,
    accessors,
  }
  mutate?.(document, binary, offsets)
  const json = Buffer.from(JSON.stringify(document), 'utf8')
  const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20)
  json.copy(paddedJson)
  const total = 12 + 8 + paddedJson.length + 8 + binary.length
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  header.writeUInt32LE(paddedJson.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  const binaryHeader = Buffer.alloc(8)
  binaryHeader.writeUInt32LE(binary.length, 0)
  binaryHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, paddedJson, binaryHeader, binary])
}

function fixtureSnapshot(root: string) {
  return fishWorkflowPaths.map(relative => {
    const file = path.join(root, relative)
    if (!fs.existsSync(file)) return [relative, null]
    return [relative, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]
  })
}

function makeFixture(mutate?: MutateFixture, overrideBytes = makeGlb(mutate)) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coral-override-sync-'))
  const nativePath = path.join(root, sourceRoot, 'blend', `${id}.blend`)
  const overridePath = path.join(root, sourceRoot, 'overrides', `${id}.glb`)
  const generatorPath = path.join(root, 'src/rendering/modeling', `build_${id.replaceAll('-', '_')}.py`)
  fs.mkdirSync(path.dirname(nativePath), { recursive: true })
  fs.mkdirSync(path.dirname(overridePath), { recursive: true })
  fs.mkdirSync(path.dirname(generatorPath), { recursive: true })
  // Header-only Blender marker and generator text are synthetic test fixtures, not native model inputs.
  fs.writeFileSync(nativePath, Buffer.from('BLENDERtest-only-fixture'))
  fs.writeFileSync(overridePath, overrideBytes)
  fs.writeFileSync(generatorPath, '# synthetic test generator fixture\n')
  for (const relative of fishWorkflowPaths) {
    const source = path.join(repoRoot, relative)
    if (!fs.existsSync(source)) continue
    const destination = path.join(root, relative)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, destination)
  }
  return { root, overridePath }
}

function hash(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

function glbJson(bytes: Buffer) {
  const jsonLength = bytes.readUInt32LE(12)
  return JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
}

function glbBinary(bytes: Buffer) {
  const jsonLength = bytes.readUInt32LE(12)
  const binaryHeaderOffset = 20 + jsonLength
  const binaryLength = bytes.readUInt32LE(binaryHeaderOffset)
  return bytes.subarray(binaryHeaderOffset + 8, binaryHeaderOffset + 8 + binaryLength)
}

describe('coral sync CLI argument parser', () => {
  it('accepts a reef-prefixed colony ID with the guide flag in either order', () => {
    expect(parseCoralSyncArgs(['--coral', id, '--learn-guide'])).toBe(id)
    expect(parseCoralSyncArgs(['--learn-guide', '--coral', id])).toBe(id)
  })

  it.each([
    { args: ['--coral', 'blue-tang', '--learn-guide'] },
    { args: ['--coral', 'ocellaris-clownfish', '--learn-guide'] },
    { args: ['--coral', 'coral-acropora-staghorn', '--learn-guide'] },
    { args: ['--coral', id] },
    { args: ['--coral', id, '--coral', 'reef-other-colony', '--learn-guide'] },
    { args: ['--coral', id, '--learn-guide', '--learn-guide'] },
    { args: ['--coral', id, '--learn-guide', '--reef', 'reef-center-arch'] },
    { args: ['--coral', id, '--learn-guide', '--freeze', 'blue-tang'] },
    { args: ['--coral', '../reef-colony', '--learn-guide'] },
    { args: ['--coral', '/tmp/reef-colony', '--learn-guide'] },
    { args: ['--coral'] },
    { args: [] },
  ])('rejects unsupported, mixed, path, missing, or repeated args: $args', ({ args }) => {
    expect(() => parseCoralSyncArgs(args)).toThrow()
  })
})

describe('isolated coral override sync', () => {
  it('packages synthetic raw masks and provenance idempotently without touching canonical catalogs', () => {
    const { root, overridePath } = makeFixture()
    try {
      const before = fixtureSnapshot(root)
      const entry = syncCoralOverride(root, id)
      const outputPath = path.join(root, entry.path)
      const inspectionPath = path.join(root, entry.inspection)
      const manifestPath = path.join(root, 'src/rendering/assets/corals/custom-colonies/manifest.json')
      const packaged = fs.readFileSync(outputPath)
      const raw = fs.readFileSync(overridePath)
      const inspection = JSON.parse(fs.readFileSync(inspectionPath, 'utf8'))
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const jsonLength = packaged.readUInt32LE(12)
      const json = JSON.parse(packaged.toString('utf8', 20, 20 + jsonLength))
      const rootNode = json.nodes[json.scenes[json.scene ?? 0].nodes[0]]

      expect(entry).toMatchObject({
        id,
        kind: 'coral',
        nativeSha256: hash(fs.readFileSync(path.join(root, entry.nativePath))),
        overrideSha256: hash(raw),
        generatorSha256: hash(fs.readFileSync(path.join(root, entry.generatorPath))),
        sha256: hash(packaged),
        bytes: packaged.length,
        triangles: 1,
      })
      expect(entry.dimensionsM[0]).toBeCloseTo(0.6, 6)
      expect(entry.dimensionsM[1]).toBeCloseTo(0.95, 6)
      expect(entry.dimensionsM[2]).toBeCloseTo(0.45, 6)
      expect(manifest).toMatchObject({ schema: 'custom-coral-colonies-v1', assets: [entry] })
      expect(rootNode.extras.reefAsset).toMatchObject({
        id,
        kind: 'coral',
        units: 'meter',
        upAxis: '+Y',
        origin: 'local',
        maskSchema: 'coral-raw-masks-v1',
        provenance: { license: 'original', sourceSha256: hash(raw) },
      })
      expect(inspection.extras.reefAsset).toEqual(rootNode.extras.reefAsset)
      expect(inspection.primitives[0]).toMatchObject({
        role: 'coral-rigid',
        maskSchema: 'coral-raw-masks-v1',
        vertexCount: 3,
        material: { vertexColors: false, vertexAlpha: false, aoSource: 'coral-mask-a' },
        color0: { itemSize: 4, values: [0, 64 / 255, 128 / 255, 1, 0, 128 / 255, 64 / 255, 1, 0, 1, 180 / 255, 1] },
      })
      expect(glbBinary(packaged)).toEqual(glbBinary(raw))
      expect(inspection.boundsM.min[0]).toBeCloseTo(-0.25, 6)
      expect(inspection.boundsM.min[1]).toBeCloseTo(-0.2, 6)
      expect(inspection.boundsM.min[2]).toBe(0)
      expect(inspection.boundsM.max[0]).toBeCloseTo(0.35, 6)
      expect(inspection.boundsM.max[1]).toBe(0.75)
      expect(inspection.boundsM.max[2]).toBeCloseTo(0.45, 6)
      expect(fixtureSnapshot(root)).toEqual(before)

      const manifestBeforeRepeat = fs.readFileSync(manifestPath)
      const packagedBeforeRepeat = fs.readFileSync(outputPath)
      expect(syncCoralOverride(root, id)).toEqual(entry)
      expect(fs.readFileSync(manifestPath)).toEqual(manifestBeforeRepeat)
      expect(fs.readFileSync(outputPath)).toEqual(packagedBeforeRepeat)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('packages a two-primitive torch crown and rigid skeleton with distinct roles, combined bounds, and idempotent provenance', () => {
    const canonicalBefore = fixtureSnapshot(repoRoot)
    const { root, overridePath } = makeFixture(undefined, makeDualPrimitiveGlb())
    try {
      const before = fixtureSnapshot(root)
      const entry = syncCoralOverride(root, id)
      const outputPath = path.join(root, entry.path)
      const inspectionPath = path.join(root, entry.inspection)
      const manifestPath = path.join(root, 'src/rendering/assets/corals/custom-colonies/manifest.json')
      const packaged = fs.readFileSync(outputPath)
      const raw = fs.readFileSync(overridePath)
      const inspection = JSON.parse(fs.readFileSync(inspectionPath, 'utf8'))
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const json = glbJson(packaged)
      const rawJson = glbJson(raw)

      expect(entry).toMatchObject({
        id,
        kind: 'coral',
        overrideSha256: hash(raw),
        sha256: hash(packaged),
        bytes: packaged.length,
        triangles: 2,
      })
      expect(entry.dimensionsM[0]).toBeCloseTo(0.6, 6)
      expect(entry.dimensionsM[1]).toBeCloseTo(0.95, 6)
      expect(entry.dimensionsM[2]).toBeCloseTo(0.55, 6)
      expect(manifest).toMatchObject({ schema: 'custom-coral-colonies-v1', assets: [entry] })
      expect(inspection.primitives).toHaveLength(2)
      expect(inspection.primitives.map((primitive: any) => primitive.vertexCount)).toEqual([3, 3])
      expect(inspection.primitives.map((primitive: any) => [primitive.id, primitive.role])).toEqual([
        ['torch_crown', 'coral-soft'],
        ['torch_skeleton', 'coral-rigid'],
      ])
      expect(inspection.primitives[0].color0.values).toEqual([
        0, 0, 1, 1,
        1, 1, 0, 170 / 255,
        128 / 255, 128 / 255, 128 / 255, 220 / 255,
      ])
      expect(inspection.primitives[1].color0.values.filter((_: number, index: number) => index % 4 === 0)).toEqual([0, 0, 0])
      const softColorAccessor = rawJson.meshes[0].primitives[0].attributes.COLOR_0
      const rigidColorAccessor = rawJson.meshes[0].primitives[1].attributes.COLOR_0
      expect(softColorAccessor).not.toBe(rigidColorAccessor)
      expect(rawJson.accessors[softColorAccessor].count).toBe(3)
      expect(rawJson.accessors[rigidColorAccessor].count).toBe(3)
      expect(inspection.boundsM.min[0]).toBeCloseTo(-0.25, 6)
      expect(inspection.boundsM.min[1]).toBeCloseTo(-0.2, 6)
      expect(inspection.boundsM.min[2]).toBeCloseTo(-0.1, 6)
      expect(inspection.boundsM.max[0]).toBeCloseTo(0.35, 6)
      expect(inspection.boundsM.max[1]).toBeCloseTo(0.75, 6)
      expect(inspection.boundsM.max[2]).toBeCloseTo(0.45, 6)
      expect(json.meshes[0].primitives).toHaveLength(2)
      expect(json.materials.map((material: any) => material.extras.reefPrimitive)).toEqual([
        { id: 'torch_crown', role: 'coral-soft', maskSchema: 'coral-raw-masks-v1' },
        { id: 'torch_skeleton', role: 'coral-rigid', maskSchema: 'coral-raw-masks-v1' },
      ])
      expect(json.materials.every((material: any) => (!material.alphaMode || material.alphaMode === 'OPAQUE')
        && !material.emissiveTexture && (!material.emissiveFactor || material.emissiveFactor.every((value: number) => value === 0)))).toBe(true)
      expect(glbBinary(packaged)).toEqual(glbBinary(raw))
      expect(fixtureSnapshot(root)).toEqual(before)
      expect(fixtureSnapshot(repoRoot)).toEqual(canonicalBefore)

      const manifestBeforeRepeat = fs.readFileSync(manifestPath)
      const packagedBeforeRepeat = fs.readFileSync(outputPath)
      expect(syncCoralOverride(root, id)).toEqual(entry)
      expect(fs.readFileSync(manifestPath)).toEqual(manifestBeforeRepeat)
      expect(fs.readFileSync(outputPath)).toEqual(packagedBeforeRepeat)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('accepts arbitrary unique primitive IDs when the material roles and mask schema are valid', () => {
    const { root } = makeFixture(undefined, makeDualPrimitiveGlb((doc) => {
      doc.materials[0].extras.reefPrimitive.id = 'flowing_torch_tissue'
      doc.materials[1].extras.reefPrimitive.id = 'flowing_torch_base'
    }))
    try {
      const entry = syncCoralOverride(root, id)
      const inspection = JSON.parse(fs.readFileSync(path.join(root, entry.inspection), 'utf8'))
      expect(inspection.primitives.map((primitive: any) => [primitive.id, primitive.role])).toEqual([
        ['flowing_torch_tissue', 'coral-soft'],
        ['flowing_torch_base', 'coral-rigid'],
      ])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it.each([
    {
      name: 'nonzero rigid-flex R',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => binary.writeUInt8(1, offsets[3]!),
    },
    {
      name: 'nonfinite position',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => binary.writeFloatLE(Number.NaN, offsets[0]!),
    },
    {
      name: 'out-of-range index',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => binary.writeUInt16LE(3, offsets[4]! + 2),
    },
    {
      name: 'translated root',
      mutate: (doc: any) => { doc.nodes[0].translation = [0.1, 0, 0] },
    },
    {
      name: 'emissive tissue material',
      mutate: (doc: any) => { doc.materials[0].emissiveFactor = [0.1, 0, 0] },
    },
    {
      name: 'missing per-material primitive metadata',
      fixture: 'dual',
      mutate: (doc: any) => { delete doc.materials[0].extras.reefPrimitive },
    },
    {
      name: 'missing primitive ID',
      fixture: 'dual',
      mutate: (doc: any) => { delete doc.materials[0].extras.reefPrimitive.id },
    },
    {
      name: 'invalid-format primitive ID',
      fixture: 'dual',
      mutate: (doc: any) => { doc.materials[0].extras.reefPrimitive.id = 'Torch Crown' },
    },
    {
      name: 'unknown primitive role',
      fixture: 'dual',
      mutate: (doc: any) => { doc.materials[0].extras.reefPrimitive.role = 'coral-flexible' },
    },
    {
      name: 'duplicate primitive IDs',
      fixture: 'dual',
      mutate: (doc: any) => { doc.materials[1].extras.reefPrimitive.id = 'torch_crown' },
    },
    {
      name: 'two soft roles instead of one soft and one rigid role',
      fixture: 'dual',
      mutate: (doc: any) => { doc.materials[1].extras.reefPrimitive.role = 'coral-soft' },
    },
    {
      name: 'more than two primitives',
      fixture: 'dual',
      mutate: (doc: any) => { doc.meshes[0].primitives.push({ ...doc.meshes[0].primitives[1], attributes: { ...doc.meshes[0].primitives[1].attributes } }) },
    },
    {
      name: 'nonzero rigid-flex R',
      fixture: 'dual',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => binary.writeUInt8(1, offsets[8]!),
    },
    {
      name: 'soft crown with all-zero R',
      fixture: 'dual',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => {
        for (const vertex of [0, 1, 2]) binary.writeUInt8(0, offsets[3]! + vertex * 4)
      },
    },
    {
      name: 'soft crown without a pinned R=0 base',
      fixture: 'dual',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => {
        for (const vertex of [0, 1, 2]) binary.writeUInt8(1, offsets[3]! + vertex * 4)
      },
    },
    {
      name: 'nonfinite dual-primitive attribute',
      fixture: 'dual',
      mutate: (_doc: any, binary: Buffer, offsets: number[]) => binary.writeFloatLE(Number.NaN, offsets[5]! + 4),
    },
    {
      name: 'nonopaque dual-primitive material',
      fixture: 'dual',
      mutate: (doc: any) => { doc.materials[1].alphaMode = 'BLEND' },
    },
    {
      name: 'emission on both dual-primitive materials',
      fixture: 'dual',
      mutate: (doc: any) => { for (const material of doc.materials) material.emissiveFactor = [0.1, 0, 0] },
    },
  ])('rejects $name before writing package output', ({ mutate, fixture }) => {
    const { root } = fixture === 'dual'
      ? makeFixture(undefined, makeDualPrimitiveGlb(mutate))
      : makeFixture(mutate)
    try {
      const before = fixtureSnapshot(root)
      expect(() => syncCoralOverride(root, id)).toThrow()
      expect(fs.existsSync(path.join(root, 'src/rendering/assets/corals/custom-colonies'))).toBe(false)
      expect(fixtureSnapshot(root)).toEqual(before)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('early coral CLI dispatch rejects mixed flags before canonical fish/coral catalogs change', () => {
    const before = fixtureSnapshot(repoRoot)
    const script = path.join(repoRoot, 'scripts/sync-blender-override.mjs')
    const result = spawnSync(process.execPath, [script, '--coral', '../reef-colony', '--install'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 15_000,
    })
    expect(result.error).toBeUndefined()
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/--coral|colony/i)
    expect(fixtureSnapshot(repoRoot)).toEqual(before)
  })
})
