import * as THREE from 'three'

const MAX_SKIN_BONES = 32
const MAX_UNIT_QUATERNION_DEVIATION = 1e-3
const MIN_QUATERNION_LENGTH = 1e-12

export type FishClipPlayer = Readonly<{
  skinBoneCount: number
  /** Advances the sole full-weight clip, leaving a normalized clean pose for the caller's overlay. */
  advance(dtSeconds: number): void
  /** Stops the action and releases mixer bindings for this root and clip. */
  dispose(): void
}>

/**
 * Owns one normal-blend swim clip and the clean skin-bone pose immediately
 * before any procedural overlay. Call `advance` before applying that overlay.
 */
export function createFishClipPlayer(
  root: THREE.Object3D,
  clip: THREE.AnimationClip,
  initialTimeSeconds = 0,
): FishClipPlayer {
  if (!(root instanceof THREE.Object3D)) {
    throw new TypeError('Fish clip player requires a Three.js root Object3D.')
  }
  if (!(clip instanceof THREE.AnimationClip) || !Number.isFinite(clip.duration) || clip.duration < 0) {
    throw new TypeError('Fish clip player requires exactly one valid Three.js AnimationClip.')
  }
  if (!Number.isFinite(initialTimeSeconds) || initialTimeSeconds < 0) {
    throw new RangeError('Initial fish clip time must be finite and nonnegative.')
  }

  const bones = collectSkinBones(root)
  for (const bone of bones) normalizeCheckedQuaternion(bone.quaternion, bone.name)
  const mixer = new THREE.AnimationMixer(root)
  const initialPose = new Map(bones.map(bone => [bone, bone.quaternion.clone()]))
  const cleanPose = new Map<THREE.Bone, THREE.Quaternion>()
  try {
    const action = mixer.clipAction(clip, root)
    action.reset()
    action.enabled = true
    action.setEffectiveWeight(1)
    action.setEffectiveTimeScale(1)
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.play()

    mixer.setTime(initialTimeSeconds)
    captureCleanPose(bones, cleanPose)
  } catch (error) {
    for (const [bone, pose] of initialPose) bone.quaternion.copy(pose)
    mixer.stopAllAction()
    mixer.uncacheClip(clip)
    mixer.uncacheRoot(root)
    throw error
  }

  let disposed = false

  return Object.freeze({
    skinBoneCount: bones.length,
    advance(dtSeconds: number): void {
      if (disposed) throw new Error('Cannot advance a disposed fish clip player.')
      if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
        throw new RangeError('Fish clip delta time must be finite and nonnegative.')
      }
      // A paused frame must preserve the visible overlay; do not restore or run the mixer.
      if (dtSeconds === 0) return

      restoreCleanPose(bones, cleanPose)
      try {
        mixer.update(dtSeconds)
        captureCleanPose(bones, cleanPose)
      } catch (error) {
        // Keep the last known clean pose if the mixer emits an invalid quaternion.
        restoreCleanPose(bones, cleanPose)
        throw error
      }
    },

    dispose(): void {
      if (disposed) return
      disposed = true
      // Releasing mixer bindings restores their original bind values. Preserve
      // the current pose when retiring an invalid clip in a still-visible fish.
      const finalPose = bones.map(bone => bone.quaternion.clone())
      mixer.stopAllAction()
      mixer.uncacheClip(clip)
      mixer.uncacheRoot(root)
      bones.forEach((bone, index) => bone.quaternion.copy(finalPose[index]))
      cleanPose.clear()
    },
  })
}

function collectSkinBones(root: THREE.Object3D): THREE.Bone[] {
  const bones = new Set<THREE.Bone>()
  const palettes: (readonly THREE.Bone[])[] = []
  root.traverse(node => {
    if (!(node instanceof THREE.SkinnedMesh)) return
    palettes.push(node.skeleton.bones)
    for (const bone of node.skeleton.bones) bones.add(bone)
  })
  if (bones.size === 0) {
    throw new RangeError('Fish clip player requires a root containing a skinned mesh with bones.')
  }
  if (bones.size > MAX_SKIN_BONES) {
    throw new RangeError(`Fish clip player supports at most ${MAX_SKIN_BONES} unique skin bones.`)
  }
  // Several primitives may share the same skin palette. Separate skeleton
  // objects created by SkeletonUtils.clone still refer to these same bones.
  const first = palettes[0]
  if (palettes.some(palette => palette.length !== first.length || palette.some((bone, i) => bone !== first[i]))) {
    throw new RangeError('Fish clip player requires one shared skin-bone palette.')
  }
  return [...bones]
}

function captureCleanPose(
  bones: readonly THREE.Bone[],
  cleanPose: Map<THREE.Bone, THREE.Quaternion>,
): void {
  // Validate the complete next pose before changing any saved bone. If a late
  // track is malformed, advance() can then restore the complete prior pose.
  for (const bone of bones) assertValidQuaternion(bone.quaternion, bone.name)
  for (const bone of bones) {
    bone.quaternion.normalize()
    const saved = cleanPose.get(bone)
    if (saved) saved.copy(bone.quaternion)
    else cleanPose.set(bone, bone.quaternion.clone())
  }
}

function restoreCleanPose(
  bones: readonly THREE.Bone[],
  cleanPose: ReadonlyMap<THREE.Bone, THREE.Quaternion>,
): void {
  for (const bone of bones) {
    const pose = cleanPose.get(bone)
    if (!pose) throw new Error(`Missing clean pose for fish bone ${bone.name || '<unnamed>'}.`)
    bone.quaternion.copy(pose)
  }
}

function assertValidQuaternion(quaternion: THREE.Quaternion, boneName: string): void {
  const length = quaternion.length()
  if (
    !Number.isFinite(quaternion.x)
    || !Number.isFinite(quaternion.y)
    || !Number.isFinite(quaternion.z)
    || !Number.isFinite(quaternion.w)
    || !Number.isFinite(length)
    || length <= MIN_QUATERNION_LENGTH
    || Math.abs(length - 1) > MAX_UNIT_QUATERNION_DEVIATION
  ) {
    throw new RangeError(`Fish clip produced a malformed quaternion for bone ${boneName || '<unnamed>'}.`)
  }
}

function normalizeCheckedQuaternion(quaternion: THREE.Quaternion, boneName: string): void {
  assertValidQuaternion(quaternion, boneName)
  quaternion.normalize()
}
