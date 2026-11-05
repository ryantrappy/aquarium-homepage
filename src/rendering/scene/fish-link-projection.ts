import { MathUtils, type PerspectiveCamera, type Vector3 } from 'three'

/** Project only points inside the camera depth range. Invalid projections must
 * never produce mirrored links or infinite/negative CSS bounds. scratch is
 * caller-owned so the per-frame projection does not allocate vector objects. */
export function projectFishLinkBounds(position: Vector3, camera: PerspectiveCamera, width: number, height: number, bodyLength: number, scratch: Vector3) {
  scratch.copy(position).applyMatrix4(camera.matrixWorldInverse)
  const depth = -scratch.z
  if (!(depth > 0) || !Number.isFinite(depth)) return undefined
  scratch.copy(position).project(camera)
  if (!Number.isFinite(scratch.x) || !Number.isFinite(scratch.y) || !Number.isFinite(scratch.z) || scratch.z < -1 || scratch.z > 1) return undefined
  const pixels = height / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * depth)
  const linkWidth = Math.max(44, pixels * Math.max(.55, bodyLength * 1.15))
  const linkHeight = Math.max(44, pixels * Math.max(.42, bodyLength * .78))
  return { x: (scratch.x + 1) * width / 2 - linkWidth / 2, y: (1 - scratch.y) * height / 2 - linkHeight / 2, width: linkWidth, height: linkHeight }
}
