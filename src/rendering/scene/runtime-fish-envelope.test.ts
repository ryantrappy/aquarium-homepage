import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { Bone, MeshBasicMaterial, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { expect, it } from 'vitest'
import { isInvertebrateSpecies, SNOWFLAKE_MORAY_EEL_ID } from '../../lib/fish'
import type { SpeciesBehaviorId } from '../../lib/fish-behavior'
import { analyzeFishClipEnvelope, type BoundedFishOverlayContract } from '../assets/fish-clip-envelope'
import { boundFishFlexDisplacementBL } from './fish-body-flex'
import { fishModelScale, fishRenderLength } from './fish-scale'
import { bindFishTurningRig, fishTurningEnvelopeContract } from './fish-turning'
import { SPECIES_LOCOMOTION_SIGNATURES } from './species-locomotion-extensions'

type ResetProof = {
  producerSha256: string
  resetAdapterSha256: string
  assets: { id: string; path: string; sourceSha256: string; clip: string; frames: number;
    pausePreservesOverlay: boolean; sourceTracksUnchanged: boolean }[]
}
type Joint = BoundedFishOverlayContract['joints'][number]
const repo = new URL('../../../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, repo))
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const loader = new GLTFLoader().register(() => ({
  name: 'AQ58_OFFLINE_SKIP_MATERIALS',
  loadMaterial: async () => new MeshBasicMaterial(),
}))

function overlayJoints(bytes: Buffer, mesh: SkinnedMesh, rig: ReturnType<typeof bindFishTurningRig>): Joint[] {
  const doc = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
  if (doc.skins?.length !== 1) throw new Error('Turning binding requires one skin')
  const palette = new Map(mesh.skeleton.bones.map(bone => [bone.name, bone]))
  const jointNames = new Set<string>()
  const jointIndices: number[] = doc.skins[0].joints
  const joints = jointIndices.map((nodeIndex: number): Joint => {
    const jointName: string = doc.nodes[nodeIndex].name
    if (!palette.has(jointName) || jointNames.has(jointName)) throw new Error('Ambiguous GLB joint mapping')
    jointNames.add(jointName)
    return { nodeIndex, jointName, rotations: [] }
  })
  if (jointNames.size !== palette.size || palette.size !== mesh.skeleton.bones.length) {
    throw new Error('GLB and runtime skin palettes differ')
  }
  function add(bone: typeof rig.pectoralLeft, axis: Joint['rotations'][number]['axis'], maxAbsAngleRad: number) {
    if (!bone || maxAbsAngleRad === 0) return
    const joint = joints.find(entry => entry.jointName === bone.name)
    if (!(bone instanceof Bone) || palette.get(bone.name) !== bone || !joint) {
      throw new Error('Turning overlay targets a node outside the skin palette')
    }
    joint.rotations.push({ axis, maxAbsAngleRad })
  }
  if (rig.spineJoints.length <= 1) return joints
  const caps = fishTurningEnvelopeContract(rig)
  if (caps.spineJointCount !== rig.spineJoints.length) throw new Error('Unsupported turning spine count')
  add(rig.spineJoints[0], [0, 1, 0], caps.maxSpineRollAbsRad)
  for (const [index, joint] of rig.spineJoints.entries()) {
    add(joint, [0, 0, 1], caps.perJointSpineAngleAbsRad[index])
  }
  add(rig.pectoralLeft, [0, 0, -1], caps.maxPectoralFlareAbsRad)
  add(rig.pectoralLeft, [1, 0, 0], caps.maxPectoralPitchAbsRad)
  add(rig.pectoralRight, [0, 0, 1], caps.maxPectoralFlareAbsRad)
  add(rig.pectoralRight, [1, 0, 0], caps.maxPectoralPitchAbsRad)
  return joints
}

it('measures source-pinned clip, turn and post-skinning flex budgets for the live swimmers', async () => {
  const proof: ResetProof = JSON.parse(execFileSync(process.execPath,
    ['scripts/verify-fish-clip-player.mjs', '--runtime'], { cwd: repo, encoding: 'utf8' }))
  const producerBytes = read('src/rendering/scene/fish-turning.ts')
  const resetAdapterBytes = read('src/rendering/scene/fish-animation.ts')
  expect(sha(producerBytes)).toBe(proof.producerSha256)
  expect(sha(resetAdapterBytes)).toBe(proof.resetAdapterSha256)
  const measurements = []
  for (const asset of proof.assets) {
    const { id, path, sourceSha256, clip } = asset
    if (id === SNOWFLAKE_MORAY_EEL_ID || isInvertebrateSpecies(id)) continue
    const bytes = read(path)
    expect(sha(bytes)).toBe(sourceSha256)
    expect(asset).toMatchObject({ frames: 120, pausePreservesOverlay: true, sourceTracksUnchanged: true })
    const base = { id, path, sourceSha256, clip }
    const renderLength = fishRenderLength(id)
    const capsuleHalfAxisM = id === 'blue-tang' ? .5 : id === 'ocellaris-clownfish' ? .16 : renderLength / 3
    try {
      const { scene } = await loader.parseAsync(Uint8Array.from(bytes).buffer, '')
      const meshes: SkinnedMesh[] = []
      scene.traverse(node => { if (node instanceof SkinnedMesh) meshes.push(node) })
      if (meshes.length !== 1) throw new Error('Envelope requires exactly one skinned mesh frame')
      const [mesh] = meshes
      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox
      const bindLength = box ? box.max.z - box.min.z : NaN
      const gait = SPECIES_LOCOMOTION_SIGNATURES[id as SpeciesBehaviorId]?.gait
      const flexFraction = gait && boundFishFlexDisplacementBL(gait)
      if (flexFraction === undefined || !Number.isFinite(bindLength) || bindLength <= 0) {
        throw new Error('Unsupported flex gait or bind length')
      }
      const scale = fishModelScale(id)
      const contract: BoundedFishOverlayContract = {
        schema: 'bounded-fish-overlay-v1',
        sourceSha256,
        clipName: clip,
        producerSha256: proof.producerSha256,
        resetAdapterSha256: proof.resetAdapterSha256,
        verification: 'root-reviewed-source-and-reset',
        reviewEvidence: 'AQ-58 source review and verify-fish-clip-player.mjs --runtime',
        resetPolicy: 'restore-clean-before-mixer-normalize-capture-before-overlay',
        quaternionComposition: 'clip-times-ordered-local-rotations',
        joints: overlayJoints(bytes, mesh, bindFishTurningRig(scene, id)),
      }
      const contractBytes = Buffer.from(JSON.stringify(contract))
      const analysis = analyzeFishClipEnvelope(bytes, {
        expectedSha256: sourceSha256,
        clipName: clip,
        adultLengthM: bindLength * scale,
        sourceReference: { lengthAxis: '+Z', lengthM: bindLength, authority: 'AQ-58 real loader bind geometry at aquarium fishModelScale' },
        capsuleHalfAxisM,
        composition: 'procedural-overlay',
        boundedOverlay: { contractBytes, expectedContractSha256: sha(contractBytes), producerBytes, resetAdapterBytes },
      })
      if (analysis.status === 'unavailable') throw new Error(analysis.reason)
      const clipRadiusM = analysis.clipOnly.capsule?.radiusM
      const turnRadiusM = analysis.activeEnvelope.capsule?.radiusM
      if (analysis.activeEnvelope.scope !== 'bounded-procedural-overlay' || clipRadiusM === undefined || turnRadiusM === undefined) {
        throw new Error('No bounded overlay capsule')
      }
      const flexMarginM = bindLength * scale * flexFraction
      measurements.push({
        ...base, status: 'bounded' as const, bindLength, scale, capsuleHalfAxisM, clipRadiusM, turnRadiusM, flexMarginM,
        contractSha256: analysis.activeEnvelope.overlay.contractSha256,
        combinedRadiusM: turnRadiusM + flexMarginM,
      })
    } catch (error) {
      measurements.push({ ...base, status: 'unavailable' as const, reason: (error as Error).message })
    }
  }
  if (process.env.AQ58_ENVELOPE_REPORT) {
    writeFileSync(process.env.AQ58_ENVELOPE_REPORT, JSON.stringify({
      scope: 'Continuous clip and turning envelope with analytic flex padding in aquarium world units',
      excludes: ['GPU flex arithmetic', 'fallback artwork', 'fixed residents', 'reef route clearance'],
      sourceSha256: Object.fromEntries([
        'scene/aquarium.ts', 'scene/fish-animation.ts', 'scene/fish-turning.ts', 'scene/fish-scale.ts',
        'scene/fish-body-flex.ts', 'scene/fish-flex-material.ts', 'scene/species-locomotion-extensions.ts', 'assets/fish-clip-envelope.ts',
      ].map(path => [path, sha(read('src/rendering/' + path))])),
      resetProbeSha256: sha(read('scripts/verify-fish-clip-player.mjs')),
      measurements,
    }, null, 2) + '\n')
  }
  for (const id of ['blue-tang', 'ocellaris-clownfish']) {
    const body = measurements.find(entry => entry.id === id)
    if (body?.status !== 'bounded') throw new Error(JSON.stringify(body))
    expect(body.combinedRadiusM).toBeGreaterThan(body.clipRadiusM)
  }
}, 30_000)
