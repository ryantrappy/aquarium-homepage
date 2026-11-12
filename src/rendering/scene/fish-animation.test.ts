import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createFishClipPlayer } from './fish-animation'

function makeRig(): {
  root: THREE.Group
  bones: { body: THREE.Bone; tail: THREE.Bone; fin: THREE.Bone }
} {
  const root = new THREE.Group()
  const body = new THREE.Bone()
  body.name = 'body'
  const tail = new THREE.Bone()
  tail.name = 'tail'
  const fin = new THREE.Bone()
  fin.name = 'pectoral_L'
  body.add(tail, fin)
  root.add(body)
  root.updateMatrixWorld(true)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
  mesh.name = 'fish_skin'
  root.add(mesh)
  mesh.bind(new THREE.Skeleton([body, tail, fin]))

  return { root, bones: { body, tail, fin } }
}

function makeSwimClip(): THREE.AnimationClip {
  const constantBody = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.2)
  const tailEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.7)
  const finStart = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.1)
  const finEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.35)
  return new THREE.AnimationClip('measured-swim', 1, [
    new THREE.QuaternionKeyframeTrack('body.quaternion', [0, 1], [...constantBody.toArray(), ...constantBody.toArray()]),
    new THREE.QuaternionKeyframeTrack('tail.quaternion', [0, 1], [0, 0, 0, 1, ...tailEnd.toArray()]),
    new THREE.QuaternionKeyframeTrack('pectoral_L.quaternion', [0, 1], [...finStart.toArray(), ...finEnd.toArray()]),
  ])
}

function expectQuaternionNear(actual: THREE.Quaternion, expected: THREE.Quaternion, digits = 5): void {
  expect(actual.length()).toBeCloseTo(1, 12)
  expect(Math.abs(actual.dot(expected))).toBeCloseTo(1, digits)
}

function poseAt(trackStart: THREE.Quaternion, trackEnd: THREE.Quaternion, timeSeconds: number): THREE.Quaternion {
  const phase = ((timeSeconds % 1) + 1) % 1
  return trackStart.clone().slerp(trackEnd, phase).normalize()
}

function overlay(bone: THREE.Bone, angle = 0.13): void {
  bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)).normalize()
}

function copyTrackData(clip: THREE.AnimationClip): Array<{ times: number[]; values: number[] }> {
  return clip.tracks.map(track => ({ times: Array.from(track.times), values: Array.from(track.values) }))
}

describe('fish animation clean-pose mixer owner', () => {
  it('restores overlays before real constant and changing mixer tracks across hundreds of frames', () => {
    const { root, bones } = makeRig()
    const clip = makeSwimClip()
    const sourceSnapshot = copyTrackData(clip)
    const bodyExpected = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.2)
    const tailEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.7)
    const finStart = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.1)
    const finEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.35)
    const player = createFishClipPlayer(root, clip)

    expect(player.skinBoneCount).toBe(3)
    for (let frame = 1; frame <= 360; frame++) {
      const time = frame / 60
      player.advance(1 / 60)
      expectQuaternionNear(bones.body.quaternion, bodyExpected)
      expectQuaternionNear(bones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, time))
      expectQuaternionNear(bones.fin.quaternion, poseAt(finStart, finEnd, time))

      // The caller composes an overlay after the clean clip pose. A constant track
      // may not write the bone again on the next mixer tick, so the next step must
      // start by restoring the saved clean pose rather than retaining this product.
      overlay(bones.body)
      overlay(bones.tail)
      overlay(bones.fin)
    }

    expect(copyTrackData(clip)).toEqual(sourceSnapshot)
    player.dispose()
    player.dispose()
    expect(() => player.advance(1 / 60)).toThrow(/disposed/i)
  })

  it('preserves the rendered overlay for zero-delta pause and resumes from the clean clip pose', () => {
    const { root, bones } = makeRig()
    const clip = makeSwimClip()
    const tailEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.7)
    const player = createFishClipPlayer(root, clip, 0.2)
    player.advance(0.1)
    const cleanAfterAdvance = poseAt(new THREE.Quaternion(), tailEnd, 0.3)
    expectQuaternionNear(bones.tail.quaternion, cleanAfterAdvance)

    overlay(bones.tail, 0.4)
    const pausedOverlay = bones.tail.quaternion.clone()
    player.advance(0)
    expectQuaternionNear(bones.tail.quaternion, pausedOverlay)

    player.advance(0.1)
    expectQuaternionNear(bones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, 0.4))
    player.dispose()
  })

  it('seeks to a deterministic clip time from a clean pose after an overlay', () => {
    const { root, bones } = makeRig()
    const tailEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.7)
    const player = createFishClipPlayer(root, makeSwimClip())
    player.advance(0.2)
    overlay(bones.tail, 0.35)
    player.seek(0.6)
    expectQuaternionNear(bones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, 0.6))
    expect(() => player.seek(-1)).toThrow(/finite and nonnegative/i)
    player.dispose()
  })

  it('keeps separate mixer clocks and poses for independent fish instances sharing one immutable clip', () => {
    const clip = makeSwimClip()
    const { root: firstRoot, bones: firstBones } = makeRig()
    const { root: secondRoot, bones: secondBones } = makeRig()
    const first = createFishClipPlayer(firstRoot, clip, 0.1)
    const second = createFishClipPlayer(secondRoot, clip, 0.6)
    const tailEnd = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.7)

    first.advance(0.2)
    overlay(firstBones.tail, 0.3)
    second.advance(0.05)
    expectQuaternionNear(firstBones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, 0.3).multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3),
    ).normalize())
    expectQuaternionNear(secondBones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, 0.65))

    first.advance(0.1)
    expectQuaternionNear(firstBones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, 0.4))
    expectQuaternionNear(secondBones.tail.quaternion, poseAt(new THREE.Quaternion(), tailEnd, 0.65))
    first.dispose()
    second.dispose()
  })

  it('rejects missing, oversized, zero, nonfinite, and materially non-unit skin poses', () => {
    const clip = makeSwimClip()
    expect(() => createFishClipPlayer(new THREE.Group(), clip)).toThrow(/skinned mesh/i)

    const oversized = makeRig()
    const extraBones = Array.from({ length: 30 }, (_, index) => {
      const bone = new THREE.Bone()
      bone.name = `extra_${index}`
      oversized.root.add(bone)
      return bone
    })
    const extraMesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    oversized.root.add(extraMesh)
    extraMesh.bind(new THREE.Skeleton(extraBones))
    expect(() => createFishClipPlayer(oversized.root, clip)).toThrow(/at most 32/i)

    const zeroPose = makeRig()
    zeroPose.bones.tail.quaternion.set(0, 0, 0, 0)
    expect(() => createFishClipPlayer(zeroPose.root, clip)).toThrow(/malformed quaternion/i)

    const nonfinitePose = makeRig()
    nonfinitePose.bones.fin.quaternion.set(Number.NaN, 0, 0, 1)
    expect(() => createFishClipPlayer(nonfinitePose.root, clip)).toThrow(/malformed quaternion/i)

    const nonUnitPose = makeRig()
    nonUnitPose.bones.body.quaternion.set(0, 0, 0, 1.1)
    expect(() => createFishClipPlayer(nonUnitPose.root, clip)).toThrow(/malformed quaternion/i)
  })

  it('restores the complete prior clean pose when a late skin-bone track becomes invalid', () => {
    const { root, bones } = makeRig()
    const clip = makeSwimClip()
    clip.tracks[2] = new THREE.QuaternionKeyframeTrack('pectoral_L.quaternion', [0, .5, 1], [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1])
    const player = createFishClipPlayer(root, clip)
    const prior = [bones.body, bones.tail, bones.fin].map(bone => bone.quaternion.clone())
    overlay(bones.body); overlay(bones.tail); overlay(bones.fin)
    expect(() => player.advance(.5)).toThrow(/malformed quaternion/i)
    // Tail is evaluated before the malformed fin and has a new valid clip
    // rotation. It must roll back too, rather than becoming a partial new pose.
    for (const [index, bone] of [bones.body, bones.tail, bones.fin].entries()) expectQuaternionNear(bone.quaternion, prior[index])
    player.dispose()
    for (const [index, bone] of [bones.body, bones.tail, bones.fin].entries()) expectQuaternionNear(bone.quaternion, prior[index])
  })

  it('accepts shared-skin primitives but rejects a second independent skin palette', () => {
    const { root, bones } = makeRig()
    const shared = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    root.add(shared); shared.bind(new THREE.Skeleton([bones.body, bones.tail, bones.fin]))
    const player = createFishClipPlayer(root, makeSwimClip()); expect(player.skinBoneCount).toBe(3); player.dispose()
    const other = new THREE.Bone(); other.name = 'another_skin'; root.add(other)
    const independent = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    root.add(independent); independent.bind(new THREE.Skeleton([other]))
    expect(() => createFishClipPlayer(root, makeSwimClip())).toThrow(/one shared skin-bone palette/i)
  })

  it('rejects malformed clip output and invalid time inputs without emitting NaNs', () => {
    const { root, bones } = makeRig()
    const badTrack = new THREE.QuaternionKeyframeTrack('tail.quaternion', [0, 1], [0, 0, 0, 0, 0, 0, 0, 0])
    const malformedClip = new THREE.AnimationClip('bad-quaternion', 1, [badTrack])
    expect(() => createFishClipPlayer(root, malformedClip)).toThrow(/malformed quaternion/i)
    expect([...bones.tail.quaternion.toArray()].every(Number.isFinite)).toBe(true)

    expect(() => createFishClipPlayer(makeRig().root, makeSwimClip(), Number.NaN)).toThrow(/finite and nonnegative/i)
    const player = createFishClipPlayer(makeRig().root, makeSwimClip())
    expect(() => player.advance(-0.1)).toThrow(/finite and nonnegative/i)
    expect(() => player.advance(Number.POSITIVE_INFINITY)).toThrow(/finite and nonnegative/i)
    player.dispose()
  })
})
