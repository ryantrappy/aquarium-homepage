import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'
import { validateAssetContract } from './contract'
import { evaluateCoralVertexDisplacement } from '../scene/coral-material'
import {
  assembleCoralsOnRockSockets,
  DEFAULT_LEFT_ISLAND_MOUNTS,
  MODULAR_CORAL_ASSET_URLS,
} from '../scene/reef-assembly'
// The installer is plain .mjs without a declaration file.
// @ts-expect-error Test the actual source-bound custom colony packager.
import { syncCoralOverride } from '../../../scripts/sync-coral-override.mjs'

const id = 'reef-euphyllia-flowing-torch'
const socketName = 'socket_lps_mid_01'
const registryDir = 'src/rendering/assets/corals/custom-colonies'
const registryPath = `${registryDir}/manifest.json`
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

// GLTFLoader's image path refers to the browser global `self`; Node's test
// environment may not define it even when the decoder methods are stubbed.
if (typeof (globalThis as { self?: unknown }).self === 'undefined') {
  ;(globalThis as { self: typeof globalThis }).self = globalThis
}

type ReefPrimitive = { id: string; role: 'coral-soft' | 'coral-rigid'; maskSchema: string }
type GlbDocument = {
  scene?: number
  scenes: Array<{ nodes: number[] }>
  nodes: Array<{ mesh?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }>
  meshes: Array<{ primitives: Array<{ attributes: Record<string, number>; indices?: number; material?: number; extras?: { reefPrimitive?: ReefPrimitive } }> }>
  accessors: Array<{ bufferView: number; componentType: number; count: number; type: string; normalized?: boolean; byteOffset?: number }>
  bufferViews: Array<{ byteOffset?: number; byteLength: number; byteStride?: number }>
  buffers: Array<{ uri?: string }>
  images?: Array<{ uri?: string; bufferView?: number; mimeType?: string }>
  textures?: Array<unknown>
  materials?: Array<{
    alphaMode?: string
    emissiveTexture?: unknown
    emissiveFactor?: number[]
    pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }
    normalTexture?: unknown
    extensions?: Record<string, Record<string, number>>
    extras?: { reefPrimitive?: ReefPrimitive }
  }>
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

function registeredRuntimePath() {
  const url = MODULAR_CORAL_ASSET_URLS[id]
  expect(url).toBeDefined()
  return fileURLToPath(new URL(url!))
}

function readGlb(filePath: string) {
  const bytes = fs.readFileSync(filePath)
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67)
  expect(bytes.readUInt32LE(4)).toBe(2)
  expect(bytes.readUInt32LE(8)).toBe(bytes.length)
  const jsonLength = bytes.readUInt32LE(12)
  const binaryHeaderOffset = 20 + jsonLength
  const binaryLength = bytes.readUInt32LE(binaryHeaderOffset)
  expect(binaryLength + binaryHeaderOffset + 8).toBe(bytes.length)
  const document = JSON.parse(bytes.toString('utf8', 20, binaryHeaderOffset)) as GlbDocument
  return { bytes, document, binary: bytes.subarray(binaryHeaderOffset + 8, binaryHeaderOffset + 8 + binaryLength) }
}

function readFloat3(document: GlbDocument, binary: Buffer, accessorIndex: number) {
  const accessor = document.accessors[accessorIndex]!
  expect(accessor.type).toBe('VEC3')
  expect(accessor.componentType).toBe(5126)
  const view = document.bufferViews[accessor.bufferView]!
  const stride = view.byteStride ?? 12
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  return Array.from({ length: accessor.count }, (_, vertex) => [0, 1, 2].map(axis =>
    binary.readFloatLE(start + vertex * stride + axis * 4),
  ))
}

function readNormalizedColor0(document: GlbDocument, binary: Buffer, accessorIndex: number) {
  const accessor = document.accessors[accessorIndex]!
  expect(accessor.type).toBe('VEC4')
  expect(accessor.componentType).toBe(5123)
  expect(accessor.normalized).toBe(true)
  const view = document.bufferViews[accessor.bufferView]!
  const stride = view.byteStride ?? 8
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  return Array.from({ length: accessor.count }, (_, vertex) => [0, 1, 2, 3].map(channel =>
    binary.readUInt16LE(start + vertex * stride + channel * 2) / 65535,
  ))
}

function expectDisplacementAtTimes(
  position: readonly number[],
  mask: readonly number[],
  role: ReefPrimitive['role'],
  times: readonly [number, number],
) {
  return times.map(time => evaluateCoralVertexDisplacement(
    { x: position[0]!, y: position[1]!, z: position[2]! },
    { r: mask[0]!, g: mask[1]!, b: mask[2]!, a: mask[3]! },
    role,
    time,
  ))
}

async function loadActualGlb(glbBytes: Buffer) {
  // Keep GLTFLoader's actual material/geometry parsing but stub only pixel
  // decode, which happy-dom cannot perform for the embedded PNG payloads.
  const originalImageLoad = THREE.ImageLoader.prototype.load
  const originalBitmapLoad = THREE.ImageBitmapLoader.prototype.load
  THREE.ImageLoader.prototype.load = function (_url, onLoad) {
    const image = { width: 1, height: 1 } as unknown as HTMLImageElement
    queueMicrotask(() => onLoad?.(image))
    return image
  }
  THREE.ImageBitmapLoader.prototype.load = function (_url, onLoad) {
    const bitmap = { width: 1, height: 1, close() {} } as unknown as ImageBitmap
    queueMicrotask(() => onLoad?.(bitmap))
    return new THREE.Texture(bitmap as unknown as HTMLImageElement)
  }
  try {
    const buffer = new ArrayBuffer(glbBytes.byteLength)
    new Uint8Array(buffer).set(glbBytes)
    return await new GLTFLoader().parseAsync(buffer, '')
  } finally {
    THREE.ImageLoader.prototype.load = originalImageLoad
    THREE.ImageBitmapLoader.prototype.load = originalBitmapLoad
  }
}

describe('custom flowing torch coral colony package', () => {
  it('keeps the native, generated, packaged and default-mounted asset in sync', async () => {
    const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, registryPath), 'utf8'))
    expect(registry.schema).toBe('custom-coral-colonies-v1')
    const entry = registry.assets.find((asset: { id: string }) => asset.id === id)
    expect(entry).toBeDefined()
    if (!entry) return

    const primaryMount = DEFAULT_LEFT_ISLAND_MOUNTS.find(mount => mount.socketName === socketName && mount.coralAssetId === id)
    expect(primaryMount, `${id} should be mounted at ${socketName}`).toBeDefined()
    const runtimePath = registeredRuntimePath()
    expect(path.relative(repoRoot, runtimePath)).toBe(entry.path)

    for (const [hashField, relativePath] of [
      ['nativeSha256', entry.nativePath],
      ['overrideSha256', entry.overridePath],
      ['generatorSha256', entry.generatorPath],
      ['sha256', entry.path],
    ] as const) {
      expect(entry[hashField]).toBe(sha256(fs.readFileSync(path.join(repoRoot, relativePath))))
    }

    const native = fs.readFileSync(path.join(repoRoot, entry.nativePath))
    const rawOverride = fs.readFileSync(path.join(repoRoot, entry.overridePath))
    const { bytes, document, binary } = readGlb(runtimePath)
    const inspection = JSON.parse(fs.readFileSync(path.join(repoRoot, entry.inspection), 'utf8'))
    expect(native.toString('ascii', 0, 7)).toBe('BLENDER')
    expect(entry.bytes).toBe(bytes.length)
    expect(bytes.length).toBeLessThan(3_000_000)
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

    expect(document.nodes).toHaveLength(1)
    expect(document.nodes[0]!.translation ?? [0, 0, 0]).toEqual([0, 0, 0])
    expect(document.nodes[0]!.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1])
    expect(document.nodes[0]!.scale ?? [1, 1, 1]).toEqual([1, 1, 1])
    expect(document.meshes).toHaveLength(1)
    const primitives = document.meshes[0]!.primitives
    expect(primitives).toHaveLength(2)
    expect(document.buffers).toHaveLength(1)
    expect(document.buffers[0]!.uri).toBeUndefined()
    expect(document.images).toHaveLength(6)
    expect(document.images!.every(image => image.uri === undefined && image.bufferView !== undefined)).toBe(true)
    expect(document.textures).toHaveLength(6)
    expect(document.materials).toHaveLength(2)
    for (const material of document.materials!) {
      expect(material.alphaMode ?? 'OPAQUE').toBe('OPAQUE')
      expect(material.pbrMetallicRoughness?.baseColorFactor?.[3] ?? 1).toBe(1)
      expect(material.pbrMetallicRoughness?.baseColorTexture).toBeDefined()
      expect(material.pbrMetallicRoughness?.metallicRoughnessTexture).toBeDefined()
      expect(material.normalTexture).toBeDefined()
      expect(material.emissiveTexture).toBeUndefined()
      expect(material.emissiveFactor?.every(channel => channel === 0) ?? true).toBe(true)
      expect(material.extras?.reefPrimitive?.role).toMatch(/^coral-(soft|rigid)$/)
    }
    expect(document.materials!.map(material => material.extras!.reefPrimitive!.role).sort()).toEqual(['coral-rigid', 'coral-soft'])
    expect(document.materials!.find(material => material.extras?.reefPrimitive?.role === 'coral-soft')?.extensions).toMatchObject({
      KHR_materials_transmission: { transmissionFactor: expect.any(Number) },
      KHR_materials_ior: { ior: expect.any(Number) },
    })

    const byRole = new Map<ReefPrimitive['role'], { positions: number[][]; masks: number[][] }>()
    for (const primitive of primitives) {
      const role = primitive.extras?.reefPrimitive?.role
      expect(role).toMatch(/^coral-(soft|rigid)$/)
      expect(primitive.attributes.COLOR_0).toBeDefined()
      const positionAccessor = document.accessors[primitive.attributes.POSITION!]!
      const maskAccessor = document.accessors[primitive.attributes.COLOR_0!]!
      expect(maskAccessor.count).toBe(positionAccessor.count)
      const triangles = primitive.indices === undefined
        ? positionAccessor.count / 3
        : document.accessors[primitive.indices]!.count / 3
      expect(inspection.primitives.find((item: { id: string }) => item.id === primitive.extras!.reefPrimitive!.id)?.vertexCount).toBe(positionAccessor.count)
      expect(triangles).toBeGreaterThan(0)
      expect(triangles).toBeLessThanOrEqual(30_000)
      byRole.set(role as ReefPrimitive['role'], {
        positions: readFloat3(document, binary, primitive.attributes.POSITION!),
        masks: readNormalizedColor0(document, binary, primitive.attributes.COLOR_0!),
      })
    }
    expect([...byRole.keys()].sort()).toEqual(['coral-rigid', 'coral-soft'])

    const gltf = await loadActualGlb(bytes)
    const loadedRoles = new Map<string, THREE.MeshStandardMaterial>()
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const material = Array.isArray(object.material) ? object.material[0] : object.material
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
      const standard = material as THREE.MeshStandardMaterial
      const role = (standard.userData.reefPrimitive as ReefPrimitive | undefined)?.role
      expect(role).toMatch(/^coral-(soft|rigid)$/)
      expect(standard.map).toBeDefined()
      expect(standard.roughnessMap).toBeDefined()
      expect(standard.normalMap).toBeDefined()
      expect(standard.transparent).toBe(false)
      loadedRoles.set(role!, standard)
    })
    expect([...loadedRoles.keys()].sort()).toEqual(['coral-rigid', 'coral-soft'])
    const loadedSoft = loadedRoles.get('coral-soft')!
    expect(loadedSoft).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect((loadedSoft as THREE.MeshPhysicalMaterial).transmission).toBeGreaterThan(0)
    expect((loadedSoft as THREE.MeshPhysicalMaterial).ior).toBeGreaterThan(1)
    expect(loadedRoles.get('coral-rigid')).not.toBeInstanceOf(THREE.MeshPhysicalMaterial)
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
  })

  it('preserves separate soft and rigid raw masks and evaluates their real displacement behavior', () => {
    const { document, binary } = readGlb(registeredRuntimePath())
    const byRole = new Map<ReefPrimitive['role'], { positions: number[][]; masks: number[][] }>()
    for (const primitive of document.meshes[0]!.primitives) {
      const role = primitive.extras?.reefPrimitive?.role
      expect(role).toMatch(/^coral-(soft|rigid)$/)
      byRole.set(role as ReefPrimitive['role'], {
        positions: readFloat3(document, binary, primitive.attributes.POSITION!),
        masks: readNormalizedColor0(document, binary, primitive.attributes.COLOR_0!),
      })
    }
    const soft = byRole.get('coral-soft')!
    const rigid = byRole.get('coral-rigid')!
    const summary = (masks: number[][], channel: number) => {
      const values = masks.map(mask => mask[channel]!)
      return { min: Math.min(...values), max: Math.max(...values), uniqueCount: new Set(values).size }
    }
    const softFlex = summary(soft.masks, 0)
    expect(softFlex.min).toBe(0)
    expect(softFlex.max).toBeGreaterThan(0)
    expect(softFlex.uniqueCount).toBeGreaterThan(10)
    expect(summary(soft.masks, 1).max).toBe(1)
    expect(summary(soft.masks, 2).min).toBeGreaterThan(0)
    expect(summary(soft.masks, 2).max).toBeLessThan(1)
    expect(summary(soft.masks, 3).min).toBeGreaterThanOrEqual(0)
    expect(summary(soft.masks, 3).max).toBeLessThanOrEqual(1)
    expect(rigid.masks.every(mask => mask[0] === 0)).toBe(true)

    const times = [0.75, 3.25] as const
    const pinnedSoftVertex = soft.masks.findIndex(mask => mask[0] === 0)
    expect(pinnedSoftVertex).toBeGreaterThanOrEqual(0)
    expect(expectDisplacementAtTimes(soft.positions[pinnedSoftVertex]!, soft.masks[pinnedSoftVertex]!, 'coral-soft', times)[0])
      .toEqual(expectDisplacementAtTimes(soft.positions[pinnedSoftVertex]!, soft.masks[pinnedSoftVertex]!, 'coral-soft', times)[1])
    expect(expectDisplacementAtTimes(rigid.positions[0]!, rigid.masks[0]!, 'coral-rigid', times)[0])
      .toEqual(expectDisplacementAtTimes(rigid.positions[0]!, rigid.masks[0]!, 'coral-rigid', times)[1])

    const movingVertex = soft.masks.findIndex(mask => mask[0]! > 0)
    expect(movingVertex).toBeGreaterThanOrEqual(0)
    const [first, second] = expectDisplacementAtTimes(soft.positions[movingVertex]!, soft.masks[movingVertex]!, 'coral-soft', times)
    expect([first.dx, first.dy, first.dz]).not.toEqual([second.dx, second.dy, second.dz])
  })

  it('binds both actual loaded torch roles on the default socket and preserves soft transmission and skeleton shape', async () => {
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(candidate => candidate.socketName === socketName && candidate.coralAssetId === id)
    expect(mount).toBeDefined()
    if (!mount) return
    const { bytes } = readGlb(registeredRuntimePath())
    const gltf = await loadActualGlb(bytes)
    const sourceMeshes: THREE.Mesh[] = []
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) sourceMeshes.push(object)
    })
    const sourceRole = (mesh: THREE.Mesh) => {
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      return (material?.userData.reefPrimitive as ReefPrimitive | undefined)?.role
    }
    const sourceRigid = sourceMeshes.find(mesh => sourceRole(mesh) === 'coral-rigid')
    expect(sourceRigid).toBeDefined()
    if (!sourceRigid) return
    const authoredRigidPosition = sourceRigid.position.toArray()
    const authoredRigidScale = sourceRigid.scale.toArray()

    const rockRoot = new THREE.Group()
    const rockMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial())
    rockMesh.name = 'Live_Rock_Island'
    rockMesh.userData.reefPrimitive = { id: 'integration-fixture-rock', role: 'rock' }
    rockRoot.add(rockMesh)
    const socket = new THREE.Object3D()
    socket.name = socketName
    rockRoot.add(socket)

    const assembly = assembleCoralsOnRockSockets(
      rockRoot,
      new Map([[id, gltf.scene]]),
      [mount],
      { preserveAuthoredRock: true, includeScatter: false },
    )
    expect(assembly.instancedMeshes).toHaveLength(0)
    expect(assembly.mountedCorals).toHaveLength(1)
    const mounted = assembly.mountedCorals[0]!
    const boundMeshes: Array<{ mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; role: string }> = []
    mounted.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const material = Array.isArray(object.material) ? object.material[0] : object.material
      if (!(material instanceof THREE.MeshStandardMaterial)) return
      const rawMasks = material.userData.coralRawMasks
      if (rawMasks) boundMeshes.push({ mesh: object, material, role: rawMasks.role })
    })
    expect(boundMeshes.map(binding => binding.role).sort()).toEqual(['coral-rigid', 'coral-soft'])
    const softBinding = boundMeshes.find(binding => binding.role === 'coral-soft')!
    const rigidBinding = boundMeshes.find(binding => binding.role === 'coral-rigid')!
    const softUniforms = softBinding.material.userData.coralRawMasks.uniforms
    const rigidUniforms = rigidBinding.material.userData.coralRawMasks.uniforms
    expect(softBinding.mesh.userData.reefPrimitive).toMatchObject({ role: 'coral-soft' })
    expect(rigidBinding.mesh.userData.reefPrimitive).toMatchObject({ role: 'coral-rigid' })
    expect(softUniforms.uRoleIsSoft.value).toBe(1)
    expect(softUniforms.uMotionScale.value).toBe(1)
    expect(softBinding.material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect((softBinding.material as THREE.MeshPhysicalMaterial).transmission).toBeCloseTo(0.12, 5)
    expect(rigidUniforms.uRoleIsSoft.value).toBe(0)
    expect(rigidUniforms.uMotionScale.value).toBe(0)
    expect(rigidUniforms.uFluorescenceStrength.value).toBe(0)
    expect(rigidBinding.mesh.position.toArray()).toEqual(authoredRigidPosition)
    expect(rigidBinding.mesh.scale.toArray()).toEqual(authoredRigidScale)

    assembly.update(1.75, true)
    expect(softUniforms.uMotionScale.value).toBe(0)
    expect(rigidUniforms.uMotionScale.value).toBe(0)
    assembly.update(2.5, false)
    expect(softUniforms.uMotionScale.value).toBe(1)
    expect(rigidUniforms.uMotionScale.value).toBe(0)
    expect(rigidBinding.mesh.position.toArray()).toEqual(authoredRigidPosition)
    expect(rigidBinding.mesh.scale.toArray()).toEqual(authoredRigidScale)
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
  })

  it('repackages the exact saved sources byte-identically and idempotently in a temporary root', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, registryPath), 'utf8'))
    const entry = registry.assets.find((asset: { id: string }) => asset.id === id)
    expect(entry).toBeDefined()
    if (!entry) return
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'custom-torch-package-'))
    try {
      for (const relative of [entry.nativePath, entry.overridePath, entry.generatorPath]) {
        const target = path.join(tempRoot, relative)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(path.join(repoRoot, relative), target)
      }
      const first = syncCoralOverride(tempRoot, id)
      const installed = path.join(tempRoot, first.path)
      const installedInspection = path.join(tempRoot, first.inspection)
      const tempManifest = path.join(tempRoot, registryPath)
      expect(fs.readFileSync(installed)).toEqual(fs.readFileSync(path.join(repoRoot, entry.path)))
      expect(fs.readFileSync(installedInspection)).toEqual(fs.readFileSync(path.join(repoRoot, entry.inspection)))
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
