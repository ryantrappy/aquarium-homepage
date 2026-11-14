import { BufferAttribute, MathUtils, Matrix4, Mesh, SkinnedMesh, type Object3D, type PerspectiveCamera, type Vector3 } from 'three'

// Three's generic getVertexPosition recomputes boneWorld*inverse per vertex
// influence. Reuse those affine transforms for this frame's full-vertex pass.
const skinTransformCache = new WeakMap<SkinnedMesh, Matrix4[]>()
const modelView = new Matrix4(), modelProjection = new Matrix4()

function prepareSkinTransforms(mesh: SkinnedMesh): Matrix4[] {
  let transforms = skinTransformCache.get(mesh)
  if (!transforms || transforms.length !== mesh.skeleton.bones.length) {
    transforms = mesh.skeleton.bones.map(() => new Matrix4())
    skinTransformCache.set(mesh, transforms)
  }
  transforms.forEach((matrix, i) => matrix.multiplyMatrices(mesh.skeleton.bones[i].matrixWorld, mesh.skeleton.boneInverses[i])
    .premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix))
  return transforms
}

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

/** Project the currently rendered vertex pose separately from the native
 * minimum-size link. Morphs and current bone transforms precede the optional
 * callback for the fish's current post-skinning shader flex.
 * Caller updates world matrices first and owns the reusable scratch vector. */
export function projectFishBodyBounds(
  root: Object3D,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  scratch: Vector3,
  vertexDeformerFor?: (mesh: Mesh) => ((vertex: Vector3) => void) | undefined,
) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let clipped = false, invalid = false
  root.traverseVisible(object => {
    if (!(object instanceof Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    if (!camera.layers.test(object.layers) || !materials.some(material => material.visible)) return
    const positions = object.geometry.getAttribute('position')
    if (!positions) return
    const deformVertex = vertexDeformerFor?.(object)
    modelView.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld)
    modelProjection.multiplyMatrices(camera.projectionMatrix, modelView)
    const view = modelView.elements, clip = modelProjection.elements
    const rawPositions = positions instanceof BufferAttribute && !positions.normalized && !object.geometry.morphAttributes.position?.length
      ? positions.array : undefined
    const skin = object instanceof SkinnedMesh ? prepareSkinTransforms(object) : undefined
    const skinIndices = skin ? object.geometry.getAttribute('skinIndex') : undefined
    const skinWeights = skin ? object.geometry.getAttribute('skinWeight') : undefined
    if (skin && (!skinIndices || !skinWeights)) { invalid = true; return }
    const rawIndices = skinIndices instanceof BufferAttribute && !skinIndices.normalized ? skinIndices.array : undefined
    const rawWeights = skinWeights instanceof BufferAttribute && !skinWeights.normalized ? skinWeights.array : undefined
    // Hidden material groups and restricted draw ranges are not rendered.
    // The usual single-material/full-range fish path needs no index set.
    let vertices: Set<number> | undefined
    const geometry = object.geometry
    if (Array.isArray(object.material) || geometry.drawRange.start !== 0 || Number.isFinite(geometry.drawRange.count)) {
      vertices = new Set<number>()
      const count = geometry.index?.count ?? positions.count
      const groups = Array.isArray(object.material) ? geometry.groups : [{ start: 0, count, materialIndex: 0 }]
      for (const group of groups) {
        if (!materials[group.materialIndex ?? 0]?.visible) continue
        const start = Math.max(group.start, geometry.drawRange.start, 0)
        const end = Math.min(group.start + group.count, geometry.drawRange.start + geometry.drawRange.count, count)
        for (let i = start; i < end; i++) vertices.add(geometry.index?.getX(i) ?? i)
      }
    }
    const readBasePosition = (index: number) => {
      const positionOffset = index * 3
      if (rawPositions) scratch.set(rawPositions[positionOffset], rawPositions[positionOffset + 1], rawPositions[positionOffset + 2])
      else Mesh.prototype.getVertexPosition.call(object, index, scratch)
    }
    const visit = (index: number) => {
      if (skin) {
        // Base Mesh applies current morph targets before skinning, as GLSL
        // does. The precomposed matrices include both bind transforms.
        readBasePosition(index)
        const x = scratch.x, y = scratch.y, z = scratch.z
        let sx = 0, sy = 0, sz = 0
        const skinOffset = index * 4
        for (let influence = 0; influence < 4; influence++) {
          const weight = rawWeights ? rawWeights[skinOffset + influence] : skinWeights!.getComponent(index, influence)
          if (weight === 0) continue
          if (!Number.isFinite(weight) || weight < 0) { invalid = true; return }
          const bone = rawIndices ? rawIndices[skinOffset + influence] : skinIndices!.getComponent(index, influence)
          const matrix = skin[bone]?.elements
          if (!matrix) { invalid = true; return }
          sx += (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) * weight
          sy += (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) * weight
          sz += (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) * weight
        }
        scratch.set(sx, sy, sz)
      } else if (rawPositions) readBasePosition(index)
      else object.getVertexPosition(index, scratch)
      deformVertex?.(scratch)
      const depth = -(view[2] * scratch.x + view[6] * scratch.y + view[10] * scratch.z + view[14])
      if (!Number.isFinite(scratch.x) || !Number.isFinite(scratch.y) || !Number.isFinite(scratch.z) || !Number.isFinite(depth)) { invalid = true; return }
      if (depth < camera.near || depth > camera.far) { clipped = true; return }
      const reciprocalW = 1 / (clip[3] * scratch.x + clip[7] * scratch.y + clip[11] * scratch.z + clip[15])
      const ndcX = (clip[0] * scratch.x + clip[4] * scratch.y + clip[8] * scratch.z + clip[12]) * reciprocalW
      const ndcY = (clip[1] * scratch.x + clip[5] * scratch.y + clip[9] * scratch.z + clip[13]) * reciprocalW
      const x = (ndcX + 1) * width / 2, y = (1 - ndcY) * height / 2
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (vertices) vertices.forEach(visit)
    else for (let index = 0; index < positions.count; index++) visit(index)
  })
  if (invalid || !Number.isFinite(minX)) return undefined
  // A near-plane crossing has visible clipped edges not represented by the
  // surviving vertices. Conservatively reserve the frame instead of placing
  // a caption through that fish. Ordinary tank/overview poses do not cross it.
  if (clipped) return { x: 0, y: 0, width, height }
  // One CSS pixel reserves the rasterized antialiased edge as well.
  return { x: minX - 1, y: minY - 1, width: maxX - minX + 2, height: maxY - minY + 2 }
}
