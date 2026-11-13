// Mesh navigation for the assembled reef (AQ-58 / AQ-34).
//
// The live rock islands are exact closed manifolds, so each island's rock gets
// a real mesh collider built from the sculpted render geometry (the same
// topology the offline fixture verifies; see docs/asset-evidence/aq58).
// Corals are NOT closed manifolds — 6 of the 8 templates fail the collider's
// gate (branching corals are 79-404 closed components, over the 64-component
// cap; acropora-table has non-manifold vertices; montipora-plate has
// inconsistent edges) — so corals keep a conservative hybrid: one world-space
// AABB per mounted coral mesh, derived from the geometry bounding sphere that
// assembleCoralsOnRockSockets already extends by the measured shader sway
// margin (see measureCoralShaderMargin in reef-assembly.ts). A capsule query
// is blocked when it enters a coral box, and otherwise delegates to the rock
// mesh query. Indeterminate is never mapped to clear.
//
// All-or-nothing per habitat: if any island's rock collider fails the gate,
// or any coral mesh lacks a bounding sphere, no meshNavigation is returned
// and the caller keeps the existing AABB routing. The build is async because
// the triangle fingerprint uses Web Crypto SHA-256 and a single rock collider
// costs ~1 s of main-thread work; callers should build after first paint so
// fish keep swimming on AABB routing until mesh mode activates.
import * as THREE from 'three'
import { buildMeshCollider, type MeshCollider, type MeshTriangle } from '../../simulation/mesh-collision'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import type {
  CapsuleClearanceQuery,
  MeshNavigationBudget,
  MeshNavigationWorkBudget,
} from '../../simulation/mesh-navigation'
import type { SolidObstacleVolume } from '../../simulation/habitat-navigation'
import type { MeshNavigationConfig } from './motion'
import type { AssembledCoralBinding } from './reef-assembly'

/** Lattice spacing for mesh route planning (m). The fixed water bounds give
 * ~17 x 11 x 16 = ~3,000 nodes, inside the planner's 4,096-node budget. */
export const MESH_NAVIGATION_SPACING_M = 0.5

/**
 * Fixed technical probe radius (m) for live fish in mesh mode. This is the
 * middle Root-approved probe radius from COLLISION_PROBE_RADII_M (0.02 /
 * 0.04 / 0.06 m, rock-collision.ts) — a probe, not a species envelope.
 * Per-species animated envelopes do not exist yet (AQ-58), so no species
 * radius is invented here.
 */
export const MESH_NAVIGATION_COLLISION_RADIUS_M = 0.04

/** Planner defaults, matching DEFAULT_BUDGET in mesh-navigation.ts. */
export const MESH_NAVIGATION_PLANNER_BUDGET: MeshNavigationBudget = {
  maxLatticeNodes: 4096,
  maxExpandedNodes: 4096,
  maxCollisionQueries: 50_000,
  maxNodeVisits: 250_000,
  maxTriangleTests: 2_000_000,
}

/** Per-query work budget, matching the per-query caps in createMeshClearanceQuery. */
export const MESH_NAVIGATION_MOVEMENT_BUDGET: MeshNavigationWorkBudget = {
  maxNodeVisits: 4096,
  maxTriangleTests: 8192,
}

export type ReefMeshIslandInput = {
  reef: THREE.Object3D
  islandId: string
  mountedCorals: readonly AssembledCoralBinding[]
}

export type ReefMeshIslandDiagnostics = {
  islandId: string
  rockTriangles: number
  rockVertices: number
  rockComponents: number
  boundaryEdges: number
  nonManifoldEdges: number
  nonManifoldVertices: number
  inconsistentEdges: number
  duplicateFaces: number
  degenerateFaces: number
  buildWork: number
  bvhNodes: number
  /** SHA-256 of the canonical JSON of the extracted sculpted world triangles. */
  sourceSha256: string
  coralMeshBoxes: number
  coralMeshes: number
}

export type ReefMeshNavigationDiagnostics = {
  islands: ReefMeshIslandDiagnostics[]
  buildMs: number
}

export type ReefMeshNavigationResult =
  | {
      status: 'ready'
      meshNavigation: MeshNavigationConfig
      diagnostics: ReefMeshNavigationDiagnostics
    }
  | { status: 'unavailable'; reason: string; diagnostics: ReefMeshNavigationDiagnostics }

type Vec3 = { x: number; y: number; z: number }
type Box = { min: Vec3; max: Vec3 }

export type RockFallbackObstaclesResult =
  | { status: 'ready'; obstacles: SolidObstacleVolume[] }
  | { status: 'unavailable'; reason: string }

function isRockMesh(node: THREE.Object3D): node is THREE.Mesh {
  if (!(node instanceof THREE.Mesh)) return false
  const reefPrim = node.userData?.reefPrimitive ?? node.parent?.userData?.reefPrimitive
  return reefPrim?.role === 'rock' || node.name.toLowerCase().includes('live_rock')
}

function finiteVec3(value: unknown): value is Vec3 {
  return Boolean(value)
    && typeof value === 'object'
    && ['x', 'y', 'z'].every(axis => Number.isFinite((value as Record<string, unknown>)[axis]))
}

function validWorkBudget(budget: unknown): budget is MeshNavigationWorkBudget {
  return Boolean(budget)
    && typeof budget === 'object'
    && Number.isSafeInteger((budget as MeshNavigationWorkBudget).maxNodeVisits)
    && (budget as MeshNavigationWorkBudget).maxNodeVisits > 0
    && Number.isSafeInteger((budget as MeshNavigationWorkBudget).maxTriangleTests)
    && (budget as MeshNavigationWorkBudget).maxTriangleTests > 0
}

/** Slab test for a capsule segment against a box inflated by the fish radius. */
export function segmentIntersectsInflatedBox(start: Vec3, end: Vec3, box: Box, radius: number): boolean {
  const min = { x: box.min.x - radius, y: box.min.y - radius, z: box.min.z - radius }
  const max = { x: box.max.x + radius, y: box.max.y + radius, z: box.max.z + radius }
  let tMin = 0
  let tMax = 1
  for (const axis of ['x', 'y', 'z'] as const) {
    const d = end[axis] - start[axis]
    if (Math.abs(d) < 1e-12) {
      if (start[axis] < min[axis] || start[axis] > max[axis]) return false
    } else {
      let t1 = (min[axis] - start[axis]) / d
      let t2 = (max[axis] - start[axis]) / d
      if (t1 > t2) [t1, t2] = [t2, t1]
      tMin = Math.max(tMin, t1)
      tMax = Math.min(tMax, t2)
      if (tMin > tMax) return false
    }
  }
  return true
}

function extractRockTriangles(reef: THREE.Object3D): MeshTriangle[] | undefined {
  reef.updateMatrixWorld(true)
  const triangles: MeshTriangle[] = []
  let sawRock = false
  let invalid = false
  reef.traverse(node => {
    if (!isRockMesh(node)) return
    sawRock = true
    const position = node.geometry.getAttribute('position')
    if (!position) { invalid = true; return }
    const index = node.geometry.getIndex()
    const vertex = (i: number): Vec3 | undefined => {
      const v = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(node.matrixWorld)
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) return undefined
      return { x: v.x, y: v.y, z: v.z }
    }
    const count = index ? index.count : position.count
    for (let i = 0; i + 2 < count; i += 3) {
      const a = vertex(index ? index.getX(i) : i)
      const b = vertex(index ? index.getX(i + 1) : i + 1)
      const c = vertex(index ? index.getX(i + 2) : i + 2)
      if (!a || !b || !c) { invalid = true; return }
      triangles.push({ a, b, c })
    }
  })
  if (invalid || !sawRock || !triangles.length) return undefined
  return triangles
}

/**
 * Build conservative, uninflated world-space AABBs from the actual rock mesh
 * vertices. Bounds use world-space scene units; they are not a certification
 * that scene units equal metres. This is the fail-closed fallback while the
 * exact mesh collider is unavailable. Fish radius is applied by the collision
 * query, not baked into these volumes. Cached geometry bounds are intentionally
 * ignored because runtime sculpting and nested transforms can make them stale.
 */
export function createRockFallbackObstacles(
  reef: THREE.Object3D,
  islandId: string,
): RockFallbackObstaclesResult {
  if (!islandId.trim()) return { status: 'unavailable', reason: 'invalid-island-id' }

  try {
    reef.updateWorldMatrix(true, true)
  } catch {
    return { status: 'unavailable', reason: 'rock-transform-unavailable' }
  }

  const obstacles: SolidObstacleVolume[] = []
  let rockCount = 0
  let invalidReason: string | undefined
  const vertex = new THREE.Vector3()
  reef.traverse(node => {
    if (invalidReason || !isRockMesh(node)) return
    rockCount++
    if (node instanceof THREE.SkinnedMesh || node instanceof THREE.InstancedMesh) {
      invalidReason = 'rock-dynamic-transform-unsupported'
      return
    }
    const position = node.geometry.getAttribute('position')
    if (!position || position.itemSize < 3 || !Number.isSafeInteger(position.count) || position.count <= 0) {
      invalidReason = 'rock-positions-unavailable'
      return
    }
    if (!node.matrixWorld.elements.every(Number.isFinite)) {
      invalidReason = 'rock-transform-unavailable'
      return
    }

    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    try {
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i)
        const y = position.getY(i)
        const z = position.getZ(i)
        if (![x, y, z].every(Number.isFinite)) {
          invalidReason = 'rock-vertex-nonfinite'
          return
        }
        vertex.set(x, y, z).applyMatrix4(node.matrixWorld)
        if (![vertex.x, vertex.y, vertex.z].every(Number.isFinite)) {
          invalidReason = 'rock-transform-nonfinite'
          return
        }
        min.min(vertex)
        max.max(vertex)
      }
    } catch {
      invalidReason = 'rock-positions-unreadable'
      return
    }

    if (!(min.x < max.x && min.y < max.y && min.z < max.z)) {
      invalidReason = 'rock-bounds-degenerate'
      return
    }
    const suffix = String(rockCount - 1).padStart(2, '0')
    obstacles.push({
      id: `${islandId}-rock-${suffix}`,
      bounds: {
        min: { x: min.x, y: min.y, z: min.z },
        max: { x: max.x, y: max.y, z: max.z },
      },
    })
  })

  if (invalidReason) return { status: 'unavailable', reason: invalidReason }
  if (rockCount === 0 || obstacles.length === 0) return { status: 'unavailable', reason: 'rock-mesh-missing' }
  return { status: 'ready', obstacles }
}

/**
 * One world-space AABB per mounted coral mesh, from the geometry bounding
 * sphere. The sphere is the one assembleCoralsOnRockSockets extends by the
 * measured shader sway margin, so the box already covers sway; the radius is
 * scaled by the mesh's largest world-scale axis (mounts are uniform, rigid
 * skeletons are not — the max axis is the conservative choice).
 * Returns undefined when any coral mesh lacks a usable bounding sphere, so
 * the caller fails closed instead of shipping un-bounded coral.
 */
function coralMeshBoxes(mountedCorals: readonly AssembledCoralBinding[]): Box[] | undefined {
  const boxes: Box[] = []
  let meshCount = 0
  for (const mounted of mountedCorals) {
    mounted.root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return
      const position = node.geometry.getAttribute('position')
      if (!position || position.count === 0) return
      meshCount++
      const sphere = node.geometry.boundingSphere
      if (!sphere
        || !Number.isFinite(sphere.center.x) || !Number.isFinite(sphere.center.y) || !Number.isFinite(sphere.center.z)
        || !Number.isFinite(sphere.radius) || sphere.radius < 0) return
      const center = sphere.center.clone().applyMatrix4(node.matrixWorld)
      const e = node.matrixWorld.elements
      const worldScale = Math.max(
        Math.hypot(e[0], e[1], e[2]),
        Math.hypot(e[4], e[5], e[6]),
        Math.hypot(e[8], e[9], e[10]),
      )
      if (!Number.isFinite(worldScale) || worldScale <= 0) return
      const radius = sphere.radius * worldScale
      boxes.push({
        min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
        max: { x: center.x + radius, y: center.y + radius, z: center.z + radius },
      })
    })
  }
  if (boxes.length !== meshCount) return undefined
  return boxes
}

async function sha256Hex(text: string): Promise<string | undefined> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return undefined
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
  } catch {
    return undefined
  }
}

/**
 * Build one mesh-navigation config covering every island, or return
 * unavailable with per-island diagnostics. Never throws for bad geometry —
 * every failure mode returns unavailable so the caller can stay on AABB routing.
 */
export async function createReefMeshNavigation(
  islands: readonly ReefMeshIslandInput[],
): Promise<ReefMeshNavigationResult> {
  const started = performance.now()
  const diagnostics: ReefMeshNavigationDiagnostics = { islands: [], buildMs: 0 }
  const finish = (result: ReefMeshNavigationResult): ReefMeshNavigationResult => {
    diagnostics.buildMs = Math.round(performance.now() - started)
    return result
  }
  if (!islands.length) return finish({ status: 'unavailable', reason: 'no-reef-islands', diagnostics })

  const colliders: MeshCollider[] = []
  const coralBoxes: Box[] = []
  for (const island of islands) {
    const triangles = extractRockTriangles(island.reef)
    if (!triangles) {
      return finish({ status: 'unavailable', reason: `rock-triangles-unavailable:${island.islandId}`, diagnostics })
    }
    const sourceSha256 = await sha256Hex(JSON.stringify(triangles))
    if (!sourceSha256) {
      return finish({ status: 'unavailable', reason: 'web-crypto-unavailable', diagnostics })
    }
    const built = buildMeshCollider({
      id: `${island.islandId}-rock`,
      sourceSha256,
      units: 'meter',
      upAxis: '+Y',
      coordinateSpace: 'world',
      triangles,
    })
    if (built.status !== 'ready') {
      diagnostics.islands.push({
        islandId: island.islandId,
        rockTriangles: triangles.length,
        rockVertices: built.diagnostics.vertices,
        rockComponents: built.diagnostics.components,
        boundaryEdges: built.diagnostics.boundaryEdges,
        nonManifoldEdges: built.diagnostics.nonManifoldEdges,
        nonManifoldVertices: built.diagnostics.nonManifoldVertices,
        inconsistentEdges: built.diagnostics.inconsistentEdges,
        duplicateFaces: built.diagnostics.duplicateFaces,
        degenerateFaces: built.diagnostics.degenerateFaces,
        buildWork: built.diagnostics.buildWork,
        bvhNodes: built.diagnostics.bvhNodes,
        sourceSha256,
        coralMeshBoxes: 0,
        coralMeshes: 0,
      })
      return finish({ status: 'unavailable', reason: `rock-collider-unavailable:${island.islandId}:${built.reason}`, diagnostics })
    }
    const boxes = coralMeshBoxes(island.mountedCorals)
    if (!boxes) {
      diagnostics.islands.push({
        islandId: island.islandId,
        rockTriangles: built.diagnostics.triangles,
        rockVertices: built.diagnostics.vertices,
        rockComponents: built.diagnostics.components,
        boundaryEdges: built.diagnostics.boundaryEdges,
        nonManifoldEdges: built.diagnostics.nonManifoldEdges,
        nonManifoldVertices: built.diagnostics.nonManifoldVertices,
        inconsistentEdges: built.diagnostics.inconsistentEdges,
        duplicateFaces: built.diagnostics.duplicateFaces,
        degenerateFaces: built.diagnostics.degenerateFaces,
        buildWork: built.diagnostics.buildWork,
        bvhNodes: built.diagnostics.bvhNodes,
        sourceSha256,
        coralMeshBoxes: 0,
        coralMeshes: 0,
      })
      return finish({ status: 'unavailable', reason: `coral-bounding-sphere-missing:${island.islandId}`, diagnostics })
    }
    diagnostics.islands.push({
      islandId: island.islandId,
      rockTriangles: built.diagnostics.triangles,
      rockVertices: built.diagnostics.vertices,
      rockComponents: built.diagnostics.components,
      boundaryEdges: built.diagnostics.boundaryEdges,
      nonManifoldEdges: built.diagnostics.nonManifoldEdges,
      nonManifoldVertices: built.diagnostics.nonManifoldVertices,
      inconsistentEdges: built.diagnostics.inconsistentEdges,
      duplicateFaces: built.diagnostics.duplicateFaces,
      degenerateFaces: built.diagnostics.degenerateFaces,
      buildWork: built.diagnostics.buildWork,
      bvhNodes: built.diagnostics.bvhNodes,
      sourceSha256,
      coralMeshBoxes: boxes.length,
      coralMeshes: boxes.length,
    })
    colliders.push(built.collider)
    coralBoxes.push(...boxes)
  }

  const meshQuery = createMeshClearanceQuery(colliders)
  const queryCapsule: CapsuleClearanceQuery = (start, end, radiusM, remainingWork) => {
    const noWork = { nodeVisits: 0, triangleTests: 0 }
    if (!finiteVec3(start) || !finiteVec3(end) || !Number.isFinite(radiusM) || radiusM < 0 || !validWorkBudget(remainingWork)) {
      return { status: 'indeterminate', reason: 'invalid-capsule-query', work: noWork }
    }
    for (const box of coralBoxes) {
      if (segmentIntersectsInflatedBox(start, end, box, radiusM)) {
        return { status: 'blocked', reason: 'coral-envelope', work: noWork }
      }
    }
    return meshQuery(start, end, radiusM, remainingWork)
  }

  return finish({
    status: 'ready',
    meshNavigation: {
      units: 'meter',
      spacingM: MESH_NAVIGATION_SPACING_M,
      budget: { ...MESH_NAVIGATION_PLANNER_BUDGET },
      movementBudget: { ...MESH_NAVIGATION_MOVEMENT_BUDGET },
      queryCapsule,
    },
    diagnostics,
  })
}
