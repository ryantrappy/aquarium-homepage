import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import {
  createReefMeshNavigation,
  MESH_NAVIGATION_COLLISION_RADIUS_M,
  MESH_NAVIGATION_MOVEMENT_BUDGET,
  segmentIntersectsInflatedBox,
} from './reef-mesh-navigation'
import { DEFAULT_LEFT_ISLAND_MOUNTS, instantiateModularReefHabitat } from './reef-assembly'

type P = { x: number; y: number; z: number }
const p = (x: number, y: number, z: number): P => ({ x, y, z })

describe('segmentIntersectsInflatedBox', () => {
  const box = { min: p(-1, -1, -1), max: p(1, 1, 1) }
  it('hits a point inside the box', () => {
    expect(segmentIntersectsInflatedBox(p(0, 0, 0), p(0, 0, 0), box, 0.04)).toBe(true)
  })
  it('misses a point outside the box', () => {
    expect(segmentIntersectsInflatedBox(p(2, 0, 0), p(2, 0, 0), box, 0.04)).toBe(false)
  })
  it('hits a segment crossing the box', () => {
    expect(segmentIntersectsInflatedBox(p(-2, 0, 0), p(2, 0, 0), box, 0)).toBe(true)
  })
  it('misses a parallel segment outside the box', () => {
    expect(segmentIntersectsInflatedBox(p(-2, 2, 0), p(2, 2, 0), box, 0.04)).toBe(false)
  })
  it('hits within the radius inflation', () => {
    expect(segmentIntersectsInflatedBox(p(1.03, 0, 0), p(1.03, 0, 0), box, 0.04)).toBe(true)
    expect(segmentIntersectsInflatedBox(p(1.05, 0, 0), p(1.05, 0, 0), box, 0.04)).toBe(false)
  })
})

function boxRock(size = 1): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size, size, size)
  const mesh = new THREE.Mesh(geometry)
  mesh.userData.reefPrimitive = { role: 'rock' }
  return mesh
}

function boxCoral(center: P, size = 0.2): THREE.Group {
  const geometry = new THREE.BoxGeometry(size, size, size)
  geometry.computeBoundingSphere()
  const mesh = new THREE.Mesh(geometry)
  mesh.position.set(center.x, center.y, center.z)
  const root = new THREE.Group()
  root.add(mesh)
  return root
}

describe('createReefMeshNavigation (synthetic reef)', () => {
  it('builds a ready config for a closed-box rock with a coral envelope', async () => {
    const reef = new THREE.Group()
    reef.add(boxRock(1))
    const coralRoot = boxCoral(p(0.8, 0, 0))
    reef.add(coralRoot)
    const result = await createReefMeshNavigation([
      { reef, islandId: 'reef-0', mountedCorals: [{ socketName: 'socket_test_01', coralAssetId: 'coral-test', root: coralRoot, materialControllers: [] }] },
    ])
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.diagnostics.islands[0].rockTriangles).toBe(12)
    expect(result.diagnostics.islands[0].rockComponents).toBe(1)
    expect(result.diagnostics.islands[0].boundaryEdges).toBe(0)
    expect(result.diagnostics.islands[0].coralMeshBoxes).toBe(1)
    const query = result.meshNavigation.queryCapsule!
    const budget = { ...MESH_NAVIGATION_MOVEMENT_BUDGET }
    expect(query(p(-2, 0, 0), p(-2, 0, 0), MESH_NAVIGATION_COLLISION_RADIUS_M, budget).status).toBe('clear')
    expect(query(p(-2, 0, 0), p(2, 0, 0), MESH_NAVIGATION_COLLISION_RADIUS_M, budget).status).toBe('blocked')
    const coral = query(p(0.8, 0, 0), p(0.8, 0, 0), MESH_NAVIGATION_COLLISION_RADIUS_M, budget)
    expect(coral.status).toBe('blocked')
    expect(coral.reason).toBe('coral-envelope')
    expect(query(p(0, 0, 0), p(0, 0, 0), MESH_NAVIGATION_COLLISION_RADIUS_M, { maxNodeVisits: 0, maxTriangleTests: 0 }).status).toBe('indeterminate')
    expect(query({ x: Number.NaN, y: 0, z: 0 }, p(0, 0, 0), MESH_NAVIGATION_COLLISION_RADIUS_M, budget).status).toBe('indeterminate')
  })

  it('fails closed on an open rock surface', async () => {
    const reef = new THREE.Group()
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1))
    plane.userData.reefPrimitive = { role: 'rock' }
    reef.add(plane)
    const result = await createReefMeshNavigation([{ reef, islandId: 'reef-0', mountedCorals: [] }])
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') expect(result.reason).toMatch(/rock-collider-unavailable/)
  })

  it('fails closed when a coral mesh has no bounding sphere', async () => {
    const reef = new THREE.Group()
    reef.add(boxRock(1))
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    const mesh = new THREE.Mesh(geometry)
    mesh.position.set(0.8, 0, 0)
    const root = new THREE.Group()
    root.add(mesh)
    reef.add(root)
    expect(geometry.boundingSphere).toBeNull()
    const result = await createReefMeshNavigation([
      { reef, islandId: 'reef-0', mountedCorals: [{ socketName: 'socket_test_01', coralAssetId: 'coral-test', root, materialControllers: [] }] },
    ])
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') expect(result.reason).toMatch(/coral-bounding-sphere-missing/)
  })

  it('fails closed with no islands', async () => {
    const result = await createReefMeshNavigation([])
    expect(result.status).toBe('unavailable')
  })
})

// --- Real-asset coverage: the actual rock GLB, parsed minimally (positions +
// indices + node transforms), assembled the way aquarium.ts does. ---

type MeshTriangle = { a: P; b: P; c: P }

function readGlb(bytes: Uint8Array): { doc: any; bin: Buffer } {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const jsonLen = b.readUInt32LE(12)
  const doc = JSON.parse(b.toString('utf8', 20, 20 + jsonLen))
  let off = 12
  let bin: Buffer | undefined
  while (off < b.length) {
    const len = b.readUInt32LE(off)
    const type = b.readUInt32LE(off + 4)
    off += 8
    if (type === 0x004e4942) bin = b.subarray(off, off + len)
    off += len
  }
  if (!bin) throw new Error('no BIN chunk')
  return { doc, bin }
}

function glbTriangles(bytes: Uint8Array): MeshTriangle[] {
  const { doc, bin } = readGlb(bytes)
  const accessor = (i: number) => {
    const a = doc.accessors[i]
    const view = doc.bufferViews[a.bufferView]
    const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0)
    const count = a.count * ({ SCALAR: 1, VEC3: 3 }[a.type as string]!)
    if (a.componentType === 5126) return new Float32Array(bin.buffer, bin.byteOffset + start, count)
    if (a.componentType === 5123) return new Uint16Array(bin.buffer, bin.byteOffset + start, count)
    if (a.componentType === 5125) return new Uint32Array(bin.buffer, bin.byteOffset + start, count)
    throw new Error(`unsupported component type ${a.componentType}`)
  }
  const localMatrix = (node: any): THREE.Matrix4 => {
    const m = new THREE.Matrix4()
    if (node.matrix) return m.fromArray(node.matrix)
    const t = node.translation ?? [0, 0, 0]
    const r = node.rotation ?? [0, 0, 0, 1]
    const s = node.scale ?? [1, 1, 1]
    return m.compose(
      new THREE.Vector3(t[0], t[1], t[2]),
      new THREE.Quaternion(r[0], r[1], r[2], r[3]),
      new THREE.Vector3(s[0], s[1], s[2]),
    )
  }
  const tris: MeshTriangle[] = []
  const visit = (nodeIndex: number, parent: THREE.Matrix4) => {
    const node = doc.nodes[nodeIndex]
    const world = parent.clone().multiply(localMatrix(node))
    if (node.mesh !== undefined) {
      for (const prim of doc.meshes[node.mesh].primitives) {
        const pos = accessor(prim.attributes.POSITION)
        const idx = prim.indices !== undefined ? accessor(prim.indices) : undefined
        const n = idx ? idx.length : pos.length / 3
        for (let i = 0; i < n; i += 3) {
          const vi = idx ? [idx[i], idx[i + 1], idx[i + 2]] : [i, i + 1, i + 2]
          const pts = vi.map((v) => {
            const vec = new THREE.Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]).applyMatrix4(world)
            return p(vec.x, vec.y, vec.z)
          })
          tris.push({ a: pts[0], b: pts[1], c: pts[2] })
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world)
  }
  for (const root of doc.scenes[doc.scene ?? 0].nodes) visit(root, new THREE.Matrix4())
  return tris
}

function glbSocketMatrices(bytes: Uint8Array): Map<string, THREE.Matrix4> {
  const { doc } = readGlb(bytes)
  const out = new Map<string, THREE.Matrix4>()
  const localMatrix = (node: any): THREE.Matrix4 => {
    const m = new THREE.Matrix4()
    if (node.matrix) return m.fromArray(node.matrix)
    const t = node.translation ?? [0, 0, 0]
    const r = node.rotation ?? [0, 0, 0, 1]
    const s = node.scale ?? [1, 1, 1]
    return m.compose(
      new THREE.Vector3(t[0], t[1], t[2]),
      new THREE.Quaternion(r[0], r[1], r[2], r[3]),
      new THREE.Vector3(s[0], s[1], s[2]),
    )
  }
  const visit = (nodeIndex: number, parent: THREE.Matrix4) => {
    const node = doc.nodes[nodeIndex]
    const world = parent.clone().multiply(localMatrix(node))
    if (typeof node.name === 'string') out.set(node.name, world)
    for (const child of node.children ?? []) visit(child, world)
  }
  for (const root of doc.scenes[doc.scene ?? 0].nodes) visit(root, new THREE.Matrix4())
  return out
}

function meshFromTriangles(tris: MeshTriangle[]): THREE.Mesh {
  const positions = new Float32Array(tris.length * 9)
  const index = new Uint32Array(tris.length * 3)
  tris.forEach((t, i) => {
    for (const [j, v] of [t.a, t.b, t.c].entries()) {
      positions[(i * 3 + j) * 3] = v.x
      positions[(i * 3 + j) * 3 + 1] = v.y
      positions[(i * 3 + j) * 3 + 2] = v.z
      index[i * 3 + j] = i * 3 + j
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(index, 1))
  geometry.computeBoundingSphere()
  return new THREE.Mesh(geometry)
}

function mountMatrix(socket: THREE.Matrix4, mount: { offsetM?: readonly [number, number, number]; yawRad: number; tiltXRad?: number; tiltZRad?: number; scale: number }): THREE.Matrix4 {
  const m = socket.clone()
  if (mount.offsetM) m.multiply(new THREE.Matrix4().makeTranslation(mount.offsetM[0], mount.offsetM[1], mount.offsetM[2]))
  m.multiply(new THREE.Matrix4().makeRotationY(mount.yawRad))
  if (mount.tiltXRad) m.multiply(new THREE.Matrix4().makeRotationX(mount.tiltXRad))
  if (mount.tiltZRad) m.multiply(new THREE.Matrix4().makeRotationZ(mount.tiltZRad))
  m.multiply(new THREE.Matrix4().makeScale(mount.scale, mount.scale, mount.scale))
  return m
}

describe('createReefMeshNavigation (real rock GLB)', () => {
  it('builds the wide-left island: rock ready, cave passage clear, known missed vertex blocked', async () => {
    const leftBytes = readFileSync(new URL('../assets/corals/live-rock-island-left.glb', import.meta.url))
    const rockTris = glbTriangles(leftBytes)
    expect(rockTris.length).toBe(24_572)

    const reef = new THREE.Group()
    const rock = meshFromTriangles(rockTris)
    rock.userData.reefPrimitive = { role: 'rock' }
    reef.add(rock)

    // Mount the hammer coral at socket_lps_mid_01, the way
    // assembleCoralsOnRockSockets does, so the ledge-left-apron anchor sits
    // inside its envelope (measured 0.075 m from the actual tentacles).
    const sockets = glbSocketMatrices(leftBytes)
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find((m) => m.socketName === 'socket_lps_mid_01')!
    const coralRoot = new THREE.Group()
    const coral = meshFromTriangles(glbTriangles(readFileSync(new URL(`../assets/corals/${mount.coralAssetId}.glb`, import.meta.url))))
    coralRoot.add(coral)
    coralRoot.applyMatrix4(mountMatrix(sockets.get(mount.socketName)!, mount))
    reef.add(coralRoot)

    reef.scale.setScalar(4.5)
    reef.position.set(-2.35, -2.7, -1.35)
    reef.rotation.y = 0.08

    const result = await createReefMeshNavigation([
      { reef, islandId: 'reef-0', mountedCorals: [{ socketName: mount.socketName, coralAssetId: mount.coralAssetId, root: coralRoot, materialControllers: [] }] },
    ])
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    const diag = result.diagnostics.islands[0]
    expect(diag.rockTriangles).toBe(24_572)
    expect(diag.rockVertices).toBe(12_288)
    expect(diag.rockComponents).toBe(1)
    expect(diag.boundaryEdges).toBe(0)
    expect(diag.nonManifoldEdges).toBe(0)
    expect(diag.nonManifoldVertices).toBe(0)
    expect(diag.inconsistentEdges).toBe(0)
    expect(diag.duplicateFaces).toBe(0)
    expect(diag.degenerateFaces).toBe(0)
    expect(diag.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(diag.coralMeshBoxes).toBeGreaterThanOrEqual(1)

    const island = new THREE.Matrix4().compose(
      new THREE.Vector3(-2.35, -2.7, -1.35),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.08, 0)),
      new THREE.Vector3(4.5, 4.5, 4.5),
    )
    const toWorld = (x: number, y: number, z: number): P => {
      const v = new THREE.Vector3(x, y, z).applyMatrix4(island)
      return p(v.x, v.y, v.z)
    }
    const query = result.meshNavigation.queryCapsule!
    const budget = { ...MESH_NAVIGATION_MOVEMENT_BUDGET }
    // The measured safe passage through the rock (AQ-58 fixture), world space.
    const passage = query(toWorld(0, 0.08, -0.36), toWorld(0, 0.08, 0.36), 0.04, budget)
    expect(passage.status).toBe('clear')
    // The known vertex the declared AABB gap missed (AQ-58) is solid rock.
    // NOTE: the AQ-58 fixture pins the old left export (source SHA
    // 2f90be06...); the live GLB was re-exported (ac2ed179...) with the same
    // topology but every vertex displaced (median ~5 mm), so the fixture's
    // exact point is 0.01 m off the current surface. Use the nearest current
    // vertex instead; the stale fixture is flagged in the PR body.
    const staleMiss = p(-0.11637334525585175, 0.08302615582942963, 0.244855597615242)
    let nearest: P | undefined
    let nearestD = Infinity
    for (const t of rockTris) {
      for (const v of [t.a, t.b, t.c]) {
        const d = Math.hypot(v.x - staleMiss.x, v.y - staleMiss.y, v.z - staleMiss.z)
        if (d < nearestD) { nearestD = d; nearest = v }
      }
    }
    expect(nearest).toBeDefined()
    const missed = query(toWorld(nearest!.x, nearest!.y, nearest!.z), toWorld(nearest!.x, nearest!.y, nearest!.z), 0, budget)
    expect(missed.status).toBe('blocked')
    // The grazing anchor is clear of the rock but inside the coral envelope.
    const { anchors } = instantiateModularReefHabitat('left', 4.5, { x: -2.35, y: -2.7, z: -1.35 }, 'reef-0', 0.08)
    const ledge = anchors.find((a) => a.id === 'reef-0-ledge-left-apron')!
    const anchorAnswer = query(ledge.position, ledge.position, 0.04, budget)
    expect(anchorAnswer.status).toBe('blocked')
    expect(anchorAnswer.reason).toBe('coral-envelope')

    // Without the coral mounted, the same anchor is clear of the rock alone.
    const rockOnly = await createReefMeshNavigation([{ reef, islandId: 'reef-0', mountedCorals: [] }])
    // (reef still contains the coral mesh, but with no mountedCorals the
    // adapter has no coral boxes; the rock collider is unchanged.)
    expect(rockOnly.status).toBe('ready')
    if (rockOnly.status === 'ready') {
      const clear = rockOnly.meshNavigation.queryCapsule!(ledge.position, ledge.position, 0.04, { ...MESH_NAVIGATION_MOVEMENT_BUDGET })
      expect(clear.status).toBe('clear')
    }
  }, 120_000)

  it('builds the narrow single island', async () => {
    const leftBytes = readFileSync(new URL('../assets/corals/live-rock-island-left.glb', import.meta.url))
    const reef = new THREE.Group()
    const rock = meshFromTriangles(glbTriangles(leftBytes))
    rock.userData.reefPrimitive = { role: 'rock' }
    reef.add(rock)
    reef.scale.setScalar(3.4)
    reef.position.set(-0.15, -2.7, -1.35)
    reef.rotation.y = 0.06
    const result = await createReefMeshNavigation([{ reef, islandId: 'reef-0', mountedCorals: [] }])
    expect(result.status).toBe('ready')
    if (result.status === 'ready') expect(result.diagnostics.islands[0].rockTriangles).toBe(24_572)
  }, 120_000)
})
