import type { Vec3 } from '../../simulation/habitat-navigation'
import { fishBodyRadiusM, fishModelScale, SNOWFLAKE_MORAY_FOREBODY_BOUNDS, SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION } from './fish-scale'
import type { ReefPlacement } from './reef-layout'

/** Fixed body-center point in the measured right-cave passage; the head reaches its visible mouth. */
export const SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL = Object.freeze({ x: -0.04, y: 0.02, z: 0.18 })
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
  const modelPoint = (point: Vec3): Vec3 => islandLocalToWorld(placement, {
    x: rootLocal.x + point.x * scale / placement.uniformScale,
    y: rootLocal.y + point.y * scale / placement.uniformScale,
    z: rootLocal.z + point.z * scale / placement.uniformScale,
  })

  return Object.freeze({
    position: islandLocalToWorld(placement, rootLocal),
    yaw: placement.yaw,
    bodyCenter: islandLocalToWorld(placement, caveCenter),
    forebodyAxisStart: modelPoint({ x: modelCenter.x, y: modelCenter.y, z: SNOWFLAKE_MORAY_FOREBODY_BOUNDS.min.z }),
    forebodyAxisEnd: modelPoint({ x: modelCenter.x, y: modelCenter.y, z: SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.z }),
    headPosition: modelPoint(SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION),
    headAxisStart: modelPoint(SNOWFLAKE_MORAY_HEAD_BONE_BIND_POSITION),
    headAxisEnd: modelPoint({ x: modelCenter.x, y: modelCenter.y, z: SNOWFLAKE_MORAY_FOREBODY_BOUNDS.max.z }),
  })
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