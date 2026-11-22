import * as THREE from 'three'
import type { Vec3 } from '../../simulation/habitat-navigation'
import { fishBodyRadiusM, fishModelScale, SNOWFLAKE_MORAY_FOREBODY_BOUNDS, SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION } from './fish-scale'
import type { ReefPlacement } from './reef-layout'

/** Fixed body-center point in the measured right-cave passage; the head reaches its visible mouth. */
export const SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL = Object.freeze({ x: 0.02, y: 0.02, z: 0.18 })
const morayHalfWidth = (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.x - SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.x) / 2
const morayHalfHeight = (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.y - SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.y) / 2
export const SNOWFLAKE_MORAY_CAVE_COLLISION_RADIUS_M = Math.hypot(morayHalfWidth, morayHalfHeight)
  * fishModelScale('snowflake-moray-eel') + 0.005
/** Clearance bound for the exposed head-to-probe segment; the embedded rear is intentionally occluded. */
export const SNOWFLAKE_MORAY_HEAD_COLLISION_RADIUS_M = fishBodyRadiusM('snowflake-moray-eel') + 0.02

export type MorayResidence = Readonly<{
  position: Vec3
  yaw: number
  bodyCenter: Vec3
  forebodyAxisStart: Vec3
  forebodyAxisEnd: Vec3
  headPosition: Vec3
  headAxisStart: Vec3
  headAxisEnd: Vec3
}>

function residenceFromRootPose(position: Vec3, yaw: number): MorayResidence {
  const scale = fishModelScale('snowflake-moray-eel')
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const modelPoint = (point: Vec3): Vec3 => ({
    x: position.x + (point.x * c + point.z * s) * scale,
    y: position.y + point.y * scale,
    z: position.z + (-point.x * s + point.z * c) * scale,
  })
  const { min, max } = SNOWFLAKE_MORAY_FOREBODY_BOUNDS
  const axisX = (min.x + max.x) / 2, axisY = (min.y + max.y) / 2
  const forebodyAxisEnd = modelPoint({ x: axisX, y: axisY, z: max.z })
  const headPosition = modelPoint(SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION)
  return Object.freeze({
    position, yaw,
    bodyCenter: modelPoint({ x: axisX, y: axisY, z: (min.z + max.z) / 2 }),
    forebodyAxisStart: modelPoint({ x: axisX, y: axisY, z: min.z }),
    forebodyAxisEnd,
    headPosition,
    headAxisStart: headPosition,
    headAxisEnd: forebodyAxisEnd,
  })
}

/** Measured shelter between the right ledge and bommie in the modular layout. */
export function resolveNsaMorayResidence(narrow: boolean, readyIslandIds: ReadonlySet<string>): MorayResidence | undefined {
  if (narrow || !readyIslandIds.has('reef-nsa-encrusting-ledge') || !readyIslandIds.has('reef-nsa-bommie-mound')) return undefined
  return residenceFromRootPose({ x: 2.14, y: -2.41, z: -.33 }, -.72)
}

/** Runtime reef collider IDs are derived from the exact layout index. */
export function hasReadyRightIslandCollider(placements: readonly ReefPlacement[], readyIslandIds: ReadonlySet<string>): boolean {
  const rightIndex = placements.findIndex(placement => placement.islandKind === 'right')
  return rightIndex >= 0 && readyIslandIds.has(`reef-${rightIndex}`)
}

function finitePlacement(placement: ReefPlacement): boolean {
  return Number.isFinite(placement.position.x)
    && Number.isFinite(placement.position.y)
    && Number.isFinite(placement.position.z)
    && Number.isFinite(placement.uniformScale)
    && placement.uniformScale > 0
    && Number.isFinite(placement.foundationHeightScale)
    && placement.foundationHeightScale > 0
    && Number.isFinite(placement.yaw)
}

function islandLocalToWorld(placement: ReefPlacement, local: Vec3): Vec3 {
  const c = Math.cos(placement.yaw), s = Math.sin(placement.yaw)
  return {
    x: placement.position.x + (local.x * c + local.z * s) * placement.uniformScale,
    y: placement.position.y + local.y * placement.uniformScale,
    z: placement.position.z + (-local.x * s + local.z * c) * placement.uniformScale,
  }
}

/**
 * Places the supplied partial forebody within the measured right-island
 * passage. No left-cave, narrow-layout, or open-water fallback is permitted.
 */
export function resolveSnowflakeMorayResidence(placements: readonly ReefPlacement[]): MorayResidence | undefined {
  const rightIslands = placements.filter(placement => placement.islandKind === 'right')
  if (rightIslands.length !== 1) return undefined
  const placement = rightIslands[0]!
  if (!finitePlacement(placement)) return undefined

  const scale = fishModelScale('snowflake-moray-eel')
  const modelCenter = {
    x: (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.x + SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.x) / 2,
    y: (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.y + SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.y) / 2,
    z: (SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.z + SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.z) / 2,
  }
  const caveCenter = {
    x: SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL.x,
    y: SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL.y * placement.foundationHeightScale,
    z: SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL.z,
  }
  const rootLocal = {
    x: caveCenter.x - modelCenter.x * scale / placement.uniformScale,
    y: caveCenter.y - modelCenter.y * scale / placement.uniformScale,
    z: caveCenter.z - modelCenter.z * scale / placement.uniformScale,
  }
  return residenceFromRootPose(islandLocalToWorld(placement, rootLocal), placement.yaw)
}

/** Fail closed until the authored model, right-cave collider, and exposed-head corridor are ready. */
export function resolveAvailableSnowflakeMorayResidence(
  placements: readonly ReefPlacement[],
  modelReady: boolean,
  capsuleIsClear?: (start: Vec3, end: Vec3, radius: number) => boolean,
): MorayResidence | undefined {
  if (!modelReady || !capsuleIsClear) return undefined
  const residence = resolveSnowflakeMorayResidence(placements)
  if (!residence || !capsuleIsClear(
    residence.headAxisStart,
    residence.headAxisEnd,
    SNOWFLAKE_MORAY_HEAD_COLLISION_RADIUS_M,
  )) return undefined
  return residence
}

/** Seat the saved talus inside the rear of the wide legacy right cave. */
export function createMorayCaveBacking(source: THREE.Object3D): THREE.Object3D {
  const backing = source.clone(true)
  backing.name = 'moray-cave-backing'
  backing.position.set(3.16, -2.79, -1.48)
  backing.rotation.y = -.08
  backing.scale.set(3.5, 7.5, 1.2)
  backing.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    const cloneMaterial = (material: THREE.Material) => {
      const clone = material.clone()
      if (clone instanceof THREE.MeshStandardMaterial) clone.color.multiplyScalar(.38)
      return clone
    }
    node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material)
    node.castShadow = true
    node.receiveShadow = true
  })
  return backing
}
