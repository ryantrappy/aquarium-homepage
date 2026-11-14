import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateAssetContract } from './contract'
import { evaluateCoralVertexDisplacement } from '../scene/coral-material'
import {
  DEFAULT_LEFT_ISLAND_MOUNTS,
  DEFAULT_RIGHT_ISLAND_MOUNTS,
  MODULAR_CORAL_ASSET_URLS,
} from '../scene/reef-assembly'
// The installer is plain .mjs without a declaration file.
// @ts-expect-error Test the actual source-bound custom colony packager.
import { syncCoralOverride } from '../../../scripts/sync-coral-override.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const registryDir = 'src/rendering/assets/corals/custom-colonies'
const registryPath = `${registryDir}/manifest.json`
const coralCases = [
  {
    id: 'reef-acropora-antler',
    mounts: DEFAULT_LEFT_ISLAND_MOUNTS,
    socketName: 'socket_sps_crest_01',
  },
  {
    id: 'reef-acropora-corymbose',
    mounts: DEFAULT_RIGHT_ISLAND_MOUNTS,
    socketName: 'socket_sps_crest_05',
  },
] as const

type GlbDocument = {
  scene?: number
  scenes: Array<{ nodes: number[] }>
  nodes: Array<{ mesh?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }>
  meshes: Array<{ primitives: Array<{ attributes: Record<string, number>; indices?: number; material?: number }> }>
  accessors: Array<{ bufferView: number; componentType: number; count: number; type: string; normalized?: boolean; byteOffset?: number }>
  bufferViews: Array<{ byteOffset?: number; byteLength: number; byteStride?: number }>
  buffers: Array<{ uri?: string }>
  images?: Array<{ uri?: string; bufferView?: number; mimeType?: string }>
  textures?: Array<unknown>
  materials?: Array<{
    emissiveTexture?: unknown
    emissiveFactor?: number[]
    pbrMetallicRoughness?: { baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }
    normalTexture?: unknown
  }>
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

function registeredRuntimePath(id: string) {
  const url = MODULAR_CORAL_ASSET_URLS[id]
  expect(url).toBeDefined()
  return fileURLToPath(new URL(url!))
}

function sourceBoundPrimaryMount<T extends { coralAssetId: string; socketName: string }>(
  id: string,
  socketName: string,
  mounts: readonly T[],
): T {
  const mount = mounts.find(candidate => candidate.socketName === socketName && candidate.coralAssetId === id)
  expect(mount, `${id} should be mounted at ${socketName}`).toBeDefined()
  if (!mount) throw new Error(`${id} is not mounted at ${socketName}`)
  return mount
}

function readGlb(filePath: string) {
  const bytes = fs.readFileSync(filePath)
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67)
  expect(bytes.readUInt32LE(4)).toBe(2)
  expect(bytes.readUInt32LE(8)).toBe(bytes.length)
  const jsonLength = bytes.readUInt32LE(12)
  const binHeaderOffset = 20 + jsonLength
  const binLength = bytes.readUInt32LE(binHeaderOffset)
  expect(binLength + binHeaderOffset + 8).toBe(bytes.length)
  const document = JSON.parse(bytes.toString('utf8', 20, binHeaderOffset)) as GlbDocument
  return { bytes, document, binary: bytes.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength) }
}

function readPositions(document: GlbDocument, binary: Buffer, accessorIndex: number) {
  const accessor = document.accessors[accessorIndex]!
  expect(accessor.type).toBe('VEC3')
  expect(accessor.componentType).toBe(5126)
  const view = document.bufferViews[accessor.bufferView]!
  const stride = view.byteStride ?? 12
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const values: number[] = []
  for (let vertex = 0; vertex < accessor.count; vertex++) {
    for (let axis = 0; axis < 3; axis++) values.push(binary.readFloatLE(start + vertex * stride + axis * 4))
  }
  return values
}

function readNormalizedColor0(document: GlbDocument, binary: Buffer, accessorIndex: number) {
  const accessor = document.accessors[accessorIndex]!
  expect(accessor.type).toBe('VEC4')
  expect(accessor.componentType).toBe(5123)
  expect(accessor.normalized).toBe(true)
  const view = document.bufferViews[accessor.bufferView]!
  const stride = view.byteStride ?? 8
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const values: number[] = []
  for (let vertex = 0; vertex < accessor.count; vertex++) {
    for (let channel = 0; channel < 4; channel++) values.push(binary.readUInt16LE(start + vertex * stride + channel * 2) / 65535)
  }
  return values
}

function channelSummary(values: readonly number[], channel: number) {
  const selected = values.filter((_, index) => index % 4 === channel)
  return {
    min: Math.min(...selected),
    max: Math.max(...selected),
    uniqueCount: new Set(selected).size,
  }
}

describe.each(coralCases)('$id custom rigid coral colony package', ({ id, mounts, socketName }) => {
  it('keeps source identities, mask contract, geometry and embedded PBR package in sync', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, registryPath), 'utf8'))
    expect(registry.schema).toBe('custom-coral-colonies-v1')
    const entry = registry.assets.find((asset: { id: string }) => asset.id === id)
    expect(entry).toBeDefined()
    if (!entry) return
    const primaryMount = sourceBoundPrimaryMount(id, socketName, mounts)
    expect(primaryMount).toMatchObject({ coralAssetId: id, archetype: 'branching-sps' })
    expect(primaryMount?.socketName).toBe(socketName)
    expect(primaryMount.paletteOverride?.surfaceMode).toBe('baked-pbr')
    const runtimePath = registeredRuntimePath(id)
    expect(path.relative(repoRoot, runtimePath)).toBe(entry.path)

    const checkedHashes = [
      ['nativeSha256', entry.nativePath],
      ['overrideSha256', entry.overridePath],
      ['generatorSha256', entry.generatorPath],
      ['sha256', entry.path],
    ] as const
    for (const [hashField, relativePath] of checkedHashes) {
      expect(entry[hashField]).toBe(sha256(fs.readFileSync(path.join(repoRoot, relativePath))))
    }
    const native = fs.readFileSync(path.join(repoRoot, entry.nativePath))
    const rawOverride = fs.readFileSync(path.join(repoRoot, entry.overridePath))
    const { bytes: packaged, document, binary } = readGlb(runtimePath)
    const inspection = JSON.parse(fs.readFileSync(path.join(repoRoot, entry.inspection), 'utf8'))

    expect(native.toString('ascii', 0, 7)).toBe('BLENDER')
    expect(entry.bytes).toBe(packaged.length)
    expect(packaged.length).toBeLessThan(3_000_000)
    expect(entry.triangles).toBeLessThanOrEqual(30_000)
    expect(inspection.extras.reefAsset).toMatchObject({
      id,
      kind: 'coral',
      units: 'meter',
      upAxis: '+Y',
      origin: 'local',
      maskSchema: 'coral-raw-masks-v1',
      provenance: { sourceSha256: sha256(rawOverride), license: 'original' },
    })
    expect(validateAssetContract(inspection)).toMatchObject({ valid: true })

    const scene = document.scenes[document.scene ?? 0]!
    expect(scene.nodes).toHaveLength(1)
    expect(document.nodes).toHaveLength(1)
    const root = document.nodes[scene.nodes[0]!]!
    expect(root.mesh).toBe(0)
    expect(root.children ?? []).toEqual([])
    expect(root.translation ?? [0, 0, 0]).toEqual([0, 0, 0])
    expect(root.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1])
    expect(root.scale ?? [1, 1, 1]).toEqual([1, 1, 1])
    expect(document.meshes).toHaveLength(1)
    expect(document.meshes[0]!.primitives).toHaveLength(1)
    const primitive = document.meshes[0]!.primitives[0]!

    expect(document.buffers).toHaveLength(1)
    expect(document.buffers[0]!.uri).toBeUndefined()
    expect(document.images).toHaveLength(3)
    expect(document.images!.every(image => image.uri === undefined && image.bufferView !== undefined)).toBe(true)
    expect(document.textures).toHaveLength(3)
    expect(document.materials).toHaveLength(1)
    const material = document.materials![0]!
    expect(material.pbrMetallicRoughness?.baseColorTexture).toBeDefined()
    expect(material.pbrMetallicRoughness?.metallicRoughnessTexture).toBeDefined()
    expect(material.normalTexture).toBeDefined()
    expect(material.emissiveTexture).toBeUndefined()
    expect(material.emissiveFactor?.every(channel => channel === 0) ?? true).toBe(true)

    const positions = readPositions(document, binary, primitive.attributes.POSITION!)
    const masks = readNormalizedColor0(document, binary, primitive.attributes.COLOR_0!)
    const positionAccessor = document.accessors[primitive.attributes.POSITION!]!
    const maskAccessor = document.accessors[primitive.attributes.COLOR_0!]!
    expect(maskAccessor.count).toBe(positionAccessor.count)
    expect(masks).toHaveLength(positionAccessor.count * 4)
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < positions.length; i++) {
      const axis = i % 3
      min[axis] = Math.min(min[axis]!, positions[i]!)
      max[axis] = Math.max(max[axis]!, positions[i]!)
    }
    const triangles = primitive.indices === undefined
      ? positionAccessor.count / 3
      : document.accessors[primitive.indices]!.count / 3
    expect(triangles).toBe(entry.triangles)
    expect(inspection.primitives[0].vertexCount).toBe(positionAccessor.count)
    for (let axis = 0; axis < 3; axis++) {
      expect(inspection.boundsM.min[axis]).toBeCloseTo(min[axis], 6)
      expect(inspection.boundsM.max[axis]).toBeCloseTo(max[axis], 6)
      expect(entry.dimensionsM[axis]).toBeCloseTo(max[axis]! - min[axis]!, 6)
    }

    const flexibility = channelSummary(masks, 0)
    const tip = channelSummary(masks, 1)
    const phase = channelSummary(masks, 2)
    const contactAo = channelSummary(masks, 3)
    expect(flexibility).toMatchObject({ min: 0, max: 0, uniqueCount: 1 })
    expect(tip.min).toBe(0)
    expect(tip.max).toBe(1)
    expect(tip.uniqueCount).toBeGreaterThan(100)
    expect(phase.min).toBeGreaterThan(0)
    expect(phase.max).toBeLessThan(1)
    expect(contactAo.min).toBeGreaterThanOrEqual(0)
    expect(contactAo.min).toBeLessThan(0.35)
    expect(contactAo.max).toBe(1)
    expect(contactAo.uniqueCount).toBeGreaterThan(20)

    const inspected = inspection.primitives[0]
    expect(inspected).toMatchObject({
      role: 'coral-rigid',
      maskSchema: 'coral-raw-masks-v1',
      material: { vertexColors: false, vertexAlpha: false, aoSource: 'coral-mask-a' },
    })
    expect(inspected.color0.values).toHaveLength(masks.length)
    for (let vertex = 0; vertex < masks.length / 4; vertex += 137) {
      for (let channel = 0; channel < 4; channel++) {
        expect(inspected.color0.values[vertex * 4 + channel]).toBeCloseTo(masks[vertex * 4 + channel]!, 7)
      }
    }
  })

  it('keeps sampled actual COLOR_0 vertices rigid across changing simulation times', () => {
    const { document, binary } = readGlb(registeredRuntimePath(id))
    const primitive = document.meshes[0]!.primitives[0]!
    const positions = readPositions(document, binary, primitive.attributes.POSITION!)
    const masks = readNormalizedColor0(document, binary, primitive.attributes.COLOR_0!)
    const vertexCount = positions.length / 3
    const sampleStep = Math.max(1, Math.floor(vertexCount / 120))
    for (let vertex = 0; vertex < vertexCount; vertex += sampleStep) {
      const offset = vertex * 4
      const position = { x: positions[vertex * 3]!, y: positions[vertex * 3 + 1]!, z: positions[vertex * 3 + 2]! }
      const mask = { r: masks[offset]!, g: masks[offset + 1]!, b: masks[offset + 2]!, a: masks[offset + 3]! }
      expect(mask.r).toBe(0)
      for (const time of [0, 0.75, 2.25, 8.5]) {
        expect(evaluateCoralVertexDisplacement(position, mask, 'coral-rigid', time)).toMatchObject({
          dx: 0,
          dy: 0,
          dz: 0,
          flexibilityWeight: 0,
        })
      }
    }
  })

  it('repackages the exact saved sources byte-identically and idempotently in a temporary root', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, registryPath), 'utf8'))
    const entry = registry.assets.find((asset: { id: string }) => asset.id === id)
    expect(entry).toBeDefined()
    if (!entry) return

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'custom-coral-package-'))
    try {
      for (const relative of [entry.nativePath, entry.overridePath, entry.generatorPath]) {
        const source = path.join(repoRoot, relative)
        const target = path.join(tempRoot, relative)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(source, target)
      }
      const first = syncCoralOverride(tempRoot, id)
      const installed = path.join(tempRoot, first.path)
      const installedInspection = path.join(tempRoot, first.inspection)
      const tempManifest = path.join(tempRoot, registryPath)
      const checkedInBytes = fs.readFileSync(path.join(repoRoot, entry.path))
      const checkedInInspection = fs.readFileSync(path.join(repoRoot, entry.inspection))
      expect(fs.readFileSync(installed)).toEqual(checkedInBytes)
      expect(fs.readFileSync(installedInspection)).toEqual(checkedInInspection)
      expect(first).toEqual(entry)

      const packageBeforeRepeat = fs.readFileSync(installed)
      const inspectionBeforeRepeat = fs.readFileSync(installedInspection)
      const manifestBeforeRepeat = fs.readFileSync(tempManifest)
      expect(syncCoralOverride(tempRoot, id)).toEqual(first)
      expect(fs.readFileSync(installed)).toEqual(packageBeforeRepeat)
      expect(fs.readFileSync(installedInspection)).toEqual(inspectionBeforeRepeat)
      expect(fs.readFileSync(tempManifest)).toEqual(manifestBeforeRepeat)
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
