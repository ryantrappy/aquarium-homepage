import * as THREE from 'three'
import type { HabitatAnchorLocation, SolidObstacleVolume, Vec3 } from '../../simulation/habitat-navigation'
import { MIN_FISH_CLEARANCE, fishClearanceRadius } from './fish-scale'

function anchorClearanceOffset(compatibleSpecies?: readonly string[]): number {
  const maxRadius = compatibleSpecies?.length
    ? Math.max(MIN_FISH_CLEARANCE, ...compatibleSpecies.map(id => fishClearanceRadius(id)))
    : MIN_FISH_CLEARANCE
  return maxRadius + .03
}

/** Transform offline-derived source geometry data; no triangle scans at mount. */
export function instantiateReefHabitat(source: { obstacles: readonly SolidObstacleVolume[]; anchors: readonly HabitatAnchorLocation[] }, scale: Vec3, position: Vec3, floor: number, prefix: string, yaw = 0) {
  const transform = (point: Vec3) => ({ x: point.x * scale.x * Math.cos(yaw) + point.z * scale.z * Math.sin(yaw) + position.x, y: point.y * scale.y + position.y, z: -point.x * scale.x * Math.sin(yaw) + point.z * scale.z * Math.cos(yaw) + position.z })
  return {
    obstacles: source.obstacles.map(obstacle => {
      const corners = []
      for (const x of [obstacle.bounds.min.x, obstacle.bounds.max.x]) for (const y of [obstacle.bounds.min.y, obstacle.bounds.max.y]) for (const z of [obstacle.bounds.min.z, obstacle.bounds.max.z]) corners.push(transform({ x, y, z }))
      return { id: `${prefix}-${obstacle.id}`, bounds: { min: { x: Math.min(...corners.map(p => p.x)), y: floor, z: Math.min(...corners.map(p => p.z)) }, max: { x: Math.max(...corners.map(p => p.x)), y: Math.max(...corners.map(p => p.y)), z: Math.max(...corners.map(p => p.z)) } } }
    }),
    anchors: source.anchors.map(anchor => ({
      ...anchor,
      id: `${prefix}-${anchor.id}`,
      position: {
        ...transform(anchor.position),
        y: anchor.position.y * scale.y + position.y + anchorClearanceOffset(anchor.compatibleSpecies),
      },
    })),
  }
}

/** Conservative solid columns cover actual triangles, including their interiors
 * down to sand. Overhang voids are intentionally unavailable to navigation. */
export function deriveReefHabitat(reef: THREE.Object3D, floor: number, prefix: string) {
  reef.updateWorldMatrix(true, true)
  const bounds = new THREE.Box3().setFromObject(reef), cells = 4
  const dx = (bounds.max.x - bounds.min.x) / cells, dz = (bounds.max.z - bounds.min.z) / cells
  const tops = Array<number>(cells * cells).fill(-Infinity)
  const point = new THREE.Vector3(), low = new THREE.Vector3(), high = new THREE.Vector3()
  const meshes: THREE.Mesh[] = []
  reef.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    meshes.push(object)
    const positions = object.geometry.getAttribute('position'), indices = object.geometry.index
    for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
      low.set(Infinity, Infinity, Infinity); high.set(-Infinity, -Infinity, -Infinity)
      for (let j = 0; j < 3; j++) {
        point.fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j).applyMatrix4(object.matrixWorld); low.min(point); high.max(point)
      }
      const x0 = Math.max(0, Math.floor((low.x - bounds.min.x) / dx)), x1 = Math.min(cells - 1, Math.floor((high.x - bounds.min.x) / dx))
      const z0 = Math.max(0, Math.floor((low.z - bounds.min.z) / dz)), z1 = Math.min(cells - 1, Math.floor((high.z - bounds.min.z) / dz))
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) tops[x * cells + z] = Math.max(tops[x * cells + z], high.y)
    }
  })
  const obstacles: SolidObstacleVolume[] = [], anchors: HabitatAnchorLocation[] = []
  const ray = new THREE.Raycaster(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3()
  const compatibleSpecies = ['yellow-tang'] as const
  const clearanceOffset = anchorClearanceOffset(compatibleSpecies)
  tops.forEach((top, index) => {
    if (!Number.isFinite(top) || top <= floor) return
    const x = Math.floor(index / cells), z = index % cells
    const min = { x: bounds.min.x + x * dx, y: floor, z: bounds.min.z + z * dz }
    const max = { x: min.x + dx, y: top + .015, z: min.z + dz }
    obstacles.push({ id: `${prefix}-${index}`, bounds: { min, max } })
    // Only real, low, upward-facing exposed substrate receives a grazing tag;
    // no host, refuge, burrow or perch is inferred from a bounding box.
    ray.set(new THREE.Vector3((min.x + max.x) / 2, bounds.max.y + 1, (min.z + max.z) / 2), new THREE.Vector3(0, -1, 0))
    const hit = ray.intersectObjects(meshes, false)[0]
    if (!hit?.face || hit.point.y > bounds.max.y - .25) return
    normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld))
    if (normal.y < .7) return
    anchors.push({ id: `${prefix}-substrate-${index}`, anchor: 'grazingSurface', compatibleSpecies: [...compatibleSpecies], position: { x: hit.point.x, y: Math.max(hit.point.y, max.y) + clearanceOffset, z: hit.point.z } })
  })
  return { obstacles, anchors, meshes }
}
