import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { CENTER_ARCH_PLACEMENT, CENTER_ARCH_URL, createCenterArch, disposeCenterArchMaterials } from './reef-arch'
import { createReefMeshNavigation, MESH_NAVIGATION_COLLISION_RADIUS_M, MESH_NAVIGATION_MOVEMENT_BUDGET } from './reef-mesh-navigation'

type Point = { x: number; y: number; z: number }
type Triangle = { a: Point; b: Point; c: Point }

function readGlbTriangles(bytes: Uint8Array): Triangle[] {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const jsonLength = buffer.readUInt32LE(12)
  const document = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength)) as {
    accessors: Array<{ bufferView: number; byteOffset?: number; count: number; componentType: number; type: string }>
    bufferViews: Array<{ byteOffset?: number }>
    nodes: Array<{ mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }>
    meshes: Array<{ primitives: Array<{ attributes: { POSITION: number }; indices?: number }> }>
    scenes: Array<{ nodes: number[] }>
    scene?: number
  }
  let binary: Buffer | undefined
  for (let offset = 12; offset < buffer.length;) {
    const length = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    offset += 8
    if (type === 0x004e4942) binary = buffer.subarray(offset, offset + length)
    offset += length
  }
  if (!binary) throw new Error('GLB has no binary chunk')

  const accessor = (index: number): ArrayLike<number> => {
    const item = document.accessors[index]!
    const view = document.bufferViews[item.bufferView]!
    const start = (view.byteOffset ?? 0) + (item.byteOffset ?? 0)
    const count = item.count * ({ SCALAR: 1, VEC3: 3 }[item.type]!)
    if (item.componentType === 5126) return new Float32Array(binary!.buffer, binary!.byteOffset + start, count)
    if (item.componentType === 5123) return new Uint16Array(binary!.buffer, binary!.byteOffset + start, count)
    if (item.componentType === 5125) return new Uint32Array(binary!.buffer, binary!.byteOffset + start, count)
    throw new Error(`Unsupported GLB component type ${item.componentType}`)
  }
  const nodeMatrix = (node: typeof document.nodes[number]) => {
    if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix)
    const [x, y, z] = node.translation ?? [0, 0, 0]
    const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1]
    const [sx, sy, sz] = node.scale ?? [1, 1, 1]
    return new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion(qx, qy, qz, qw),
      new THREE.Vector3(sx, sy, sz),
    )
  }

  const triangles: Triangle[] = []
  const visit = (index: number, parent: THREE.Matrix4) => {
    const node = document.nodes[index]!
    const world = parent.clone().multiply(nodeMatrix(node))
    if (node.mesh !== undefined) for (const primitive of document.meshes[node.mesh]!.primitives) {
      const positions = accessor(primitive.attributes.POSITION)
      const indices = primitive.indices === undefined ? undefined : accessor(primitive.indices)
      const count = indices?.length ?? positions.length / 3
      for (let i = 0; i < count; i += 3) {
        const vertex = (n: number): Point => {
          const index = indices?.[n] ?? n
          const point = new THREE.Vector3(
            positions[index * 3]!, positions[index * 3 + 1]!, positions[index * 3 + 2]!,
          ).applyMatrix4(world)
          return { x: point.x, y: point.y, z: point.z }
        }
        triangles.push({ a: vertex(i), b: vertex(i + 1), c: vertex(i + 2) })
      }
    }
    for (const child of node.children ?? []) visit(child, world)
  }
  const scene = document.scenes[document.scene ?? 0]!
  for (const root of scene.nodes) visit(root, new THREE.Matrix4())
  return triangles
}

function meshFromTriangles(triangles: readonly Triangle[], material: THREE.Material): THREE.Mesh {
  const positions = new Float32Array(triangles.length * 9)
  const indices = new Uint32Array(triangles.length * 3)
  triangles.forEach((triangle, triangleIndex) => {
    for (const [vertexIndex, point] of [triangle.a, triangle.b, triangle.c].entries()) {
      const index = triangleIndex * 3 + vertexIndex
      positions[index * 3] = point.x
      positions[index * 3 + 1] = point.y
      positions[index * 3 + 2] = point.z
      indices[index] = index
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeBoundingSphere()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.reefPrimitive = { role: 'rock' }
  return mesh
}

function sourceArch(): { root: THREE.Group; mesh: THREE.Mesh; map: THREE.Texture; normalMap: THREE.Texture } {
  const geometry = meshFromTriangles(
    readGlbTriangles(readFileSync(new URL(CENTER_ARCH_URL))),
    new THREE.MeshStandardMaterial(),
  ).geometry
  const map = new THREE.Texture()
  const normalMap = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.72, metalness: 0.04 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.reefPrimitive = { role: 'rock' }
  const root = new THREE.Group()
  root.add(mesh)
  return { root, mesh, map, normalMap }
}

function worldPoint(x: number, y: number, z: number): Point {
  return {
    x: CENTER_ARCH_PLACEMENT.x + x * CENTER_ARCH_PLACEMENT.scale,
    y: CENTER_ARCH_PLACEMENT.y + y * CENTER_ARCH_PLACEMENT.scale,
    z: CENTER_ARCH_PLACEMENT.z + z * CENTER_ARCH_PLACEMENT.scale,
  }
}

function triangleCenter(triangle: Triangle): Point {
  return {
    x: (triangle.a.x + triangle.b.x + triangle.c.x) / 3,
    y: (triangle.a.y + triangle.b.y + triangle.c.y) / 3,
    z: (triangle.a.z + triangle.b.z + triangle.c.z) / 3,
  }
}

describe('createCenterArch', () => {
  it('preserves packaged geometry and texture maps while cloning role materials and applying scene transforms', () => {
    const { root, mesh: sourceMesh, map, normalMap } = sourceArch()
    const originalMaterial = sourceMesh.material as THREE.MeshStandardMaterial
    const arch = createCenterArch(root)
    const archMesh = arch.children[0] as THREE.Mesh
    const material = archMesh.material as THREE.MeshStandardMaterial

    expect(archMesh.geometry).toBe(sourceMesh.geometry)
    expect(material).not.toBe(originalMaterial)
    expect(material.map).toBe(map)
    expect(material.normalMap).toBe(normalMap)
    expect(material.roughness).toBe(originalMaterial.roughness)
    expect(material.metalness).toBe(originalMaterial.metalness)
    expect(archMesh.castShadow).toBe(true)
    expect(archMesh.receiveShadow).toBe(true)
    expect(arch.name).toBe('reef-center-arch')
    expect(arch.position.toArray()).toEqual([CENTER_ARCH_PLACEMENT.x, CENTER_ARCH_PLACEMENT.y, CENTER_ARCH_PLACEMENT.z])
    expect(arch.scale.toArray()).toEqual([CENTER_ARCH_PLACEMENT.scale, CENTER_ARCH_PLACEMENT.scale, CENTER_ARCH_PLACEMENT.scale])
  })

  it('disposes its cloned materials once without disposing borrowed geometry or maps', () => {
    const { root, mesh: sourceMesh, map, normalMap } = sourceArch()
    const arch = createCenterArch(root)
    const archMesh = arch.children[0] as THREE.Mesh
    const material = archMesh.material as THREE.MeshStandardMaterial
    const geometryDispose = vi.spyOn(archMesh.geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')
    const mapDispose = vi.spyOn(map, 'dispose')
    const normalMapDispose = vi.spyOn(normalMap, 'dispose')

    disposeCenterArchMaterials(arch)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(geometryDispose).not.toHaveBeenCalled()
    expect(mapDispose).not.toHaveBeenCalled()
    expect(normalMapDispose).not.toHaveBeenCalled()
    expect(sourceMesh.geometry).toBe(archMesh.geometry)
  })
})

describe('center arch navigation from the packaged GLB', () => {
  it('keeps the center passage clear through the arch and blocks the cap and leg at the scene probe radius', async () => {
    const triangles = readGlbTriangles(readFileSync(new URL(CENTER_ARCH_URL)))
    const { root } = sourceArch()
    const arch = createCenterArch(root)
    const result = await createReefMeshNavigation([{ reef: arch, islandId: 'reef-center-arch', mountedCorals: [] }])

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    const query = result.meshNavigation.queryCapsule!
    const budget = { ...MESH_NAVIGATION_MOVEMENT_BUDGET }
    const passage = query(
      worldPoint(0, 0.1, -0.18),
      worldPoint(0, 0.1, 0.18),
      MESH_NAVIGATION_COLLISION_RADIUS_M,
      budget,
    )
    expect(passage.status).toBe('clear')

    const capTriangle = triangles
      .map(triangle => ({ triangle, center: triangleCenter(triangle) }))
      .filter(sample => sample.center.y > 0.48)
      .sort((a, b) => Math.abs(a.center.x) - Math.abs(b.center.x))[0]!.triangle
    const capCenter = triangleCenter(capTriangle)
    const capPoint = worldPoint(capCenter.x, capCenter.y, capCenter.z)
    const cap = query(
      capPoint,
      capPoint,
      MESH_NAVIGATION_COLLISION_RADIUS_M,
      { ...MESH_NAVIGATION_MOVEMENT_BUDGET },
    )
    expect(cap.status).toBe('blocked')
    const legTriangle = triangles
      .map(triangle => ({ triangle, center: triangleCenter(triangle) }))
      .filter(sample => sample.center.x < -0.4 && sample.center.y > 0.05 && sample.center.y < 0.3)
      .sort((a, b) => Math.abs(a.center.z) - Math.abs(b.center.z))[0]!.triangle
    const legCenter = triangleCenter(legTriangle)
    const legPoint = worldPoint(legCenter.x, legCenter.y, legCenter.z)
    const leg = query(
      legPoint,
      legPoint,
      MESH_NAVIGATION_COLLISION_RADIUS_M,
      { ...MESH_NAVIGATION_MOVEMENT_BUDGET },
    )
    expect(leg.status).toBe('blocked')
  }, 120_000)
})
