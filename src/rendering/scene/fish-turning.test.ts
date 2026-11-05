import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  SHARP_TURN_THRESHOLD_RAD,
  applyFishTurningRigOverlay,
  bindFishTurningRig,
  computeCurvilinearStepVector,
  evaluateSpineTurnAngles,
  evaluateSpriteTurnScaleX,
  evaluateTurnSpeedFactor,
  fishTurningEnvelopeContract,
  resolveTurnManeuverStage,
  stepFishTurnKinematics,
  type FishTurnKinematics,
} from './fish-turning'
import { createSwimmingFish, stepSwimmingFish, type WaterHabitat } from './motion'

function buildHierarchyFromGlb(relativePath: string): THREE.Group {
  const bytes = readFileSync(new URL(relativePath, import.meta.url))
  const jsonLen = bytes.readUInt32LE(12)
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLen).toString('utf8'))
  const nodes: THREE.Object3D[] = gltf.nodes.map((n: { name?: string; translation?: number[]; rotation?: number[] }) => {
    const obj = new THREE.Object3D()
    obj.name = n.name ?? ''
    if (n.translation) obj.position.set(n.translation[0], n.translation[1], n.translation[2])
    if (n.rotation) obj.quaternion.set(n.rotation[0], n.rotation[1], n.rotation[2], n.rotation[3])
    return obj
  })
  gltf.nodes.forEach((n: { children?: number[] }, idx: number) => {
    for (const childIdx of n.children ?? []) {
      nodes[idx].add(nodes[childIdx])
    }
  })
  const root = new THREE.Group()
  const sceneRootIndices: number[] = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? []
  for (const idx of sceneRootIndices) {
    root.add(nodes[idx])
  }
  return root
}

type RigAssetSnapshot = {
  speciesId: string
  relativePath: string
  sha256: string
  spineNames: string[]
  pectoralLeftName: string
  pectoralRightName: string
  skinJointNames: string[]
  rotationTargets: string[]
  clipName: string
  spineLocalZ: [number, number, number]
  pectoralLeftLocalZ: [number, number, number]
  pectoralRightLocalZ: [number, number, number]
}

type GlbDocument = {
  nodes: Array<{ name?: string; translation?: number[]; rotation?: number[]; scale?: number[]; children?: number[] }>
  scenes?: Array<{ nodes?: number[] }>
  scene?: number
  skins?: Array<{ joints: number[] }>
  animations?: Array<{ name?: string; channels: Array<{ sampler: number; target: { node: number; path: string } }>; samplers: Array<{ output: number }> }>
  accessors?: Array<{ bufferView?: number; byteOffset?: number; count: number; componentType: number; type: string }>
  bufferViews?: Array<{ byteOffset?: number; byteStride?: number }>
}

const RIG_ASSET_SNAPSHOTS: readonly RigAssetSnapshot[] = [
  {
    speciesId: 'ocellaris-clownfish',
    relativePath: '../proof/candidate-real-clown.glb',
    sha256: '9beebbfe33e9e4459702e1aba6ad2df6f7309aca854f3bb5d1b88a36ca9444a6',
    spineNames: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5'],
    pectoralLeftName: 'pectoral_L',
    pectoralRightName: 'pectoral_R',
    skinJointNames: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5', 'pectoral_L', 'pectoral_R'],
    rotationTargets: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5', 'pectoral_L', 'pectoral_R'],
    clipName: 'Experimental swim',
    spineLocalZ: [0, 1, 0],
    pectoralLeftLocalZ: [0, 1, 0],
    pectoralRightLocalZ: [0, 1, 0],
  },
  {
    speciesId: 'yellow-tang',
    relativePath: '../proof/candidate-real-tang.glb',
    sha256: '44d28509f62de1eec2a9644fea1a6ce5c79d642997b3487aa0e21d6069f76f5b',
    spineNames: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5'],
    pectoralLeftName: 'pectoral_L',
    pectoralRightName: 'pectoral_R',
    skinJointNames: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5', 'pectoral_L', 'pectoral_R'],
    rotationTargets: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5', 'pectoral_L', 'pectoral_R'],
    clipName: 'Experimental swim',
    spineLocalZ: [0, 1, 0],
    pectoralLeftLocalZ: [-0.0263, 0.7865, 0.6171],
    pectoralRightLocalZ: [0.0263, 0.7865, 0.6171],
  },
  {
    speciesId: 'royal-gramma',
    relativePath: '../assets/fish/fish-royal-gramma.glb',
    sha256: '1d629137b3fde0e85519d8cdda51edd2e94ec7dcb98e5ec1c0558e4e57d2e87d',
    spineNames: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4'],
    pectoralLeftName: 'pectoral_L',
    pectoralRightName: 'pectoral_R',
    skinJointNames: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'pectoral_L', 'pectoral_R'],
    rotationTargets: ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'pectoral_L', 'pectoral_R'],
    clipName: 'royal_gramma_subcarangiform_swim',
    spineLocalZ: [0, 1, 0],
    pectoralLeftLocalZ: [-0.0439, 0.9875, 0.1516],
    pectoralRightLocalZ: [0.0439, 0.9875, 0.1516],
  },
]

function readGlb(relativePath: string): { bytes: Buffer; json: GlbDocument; binaryOffset: number } | undefined {
  const url = new URL(relativePath, import.meta.url)
  if (!existsSync(url)) return undefined
  const bytes = readFileSync(url)
  const jsonLength = bytes.readUInt32LE(12)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as GlbDocument
  return { bytes, json, binaryOffset: 20 + jsonLength + 8 }
}

function buildHierarchyFromDocument(gltf: GlbDocument): THREE.Group {
  const nodes = gltf.nodes.map(node => {
    const obj = new THREE.Object3D()
    obj.name = node.name ?? ''
    if (node.translation) obj.position.fromArray(node.translation)
    if (node.rotation) obj.quaternion.fromArray(node.rotation)
    if (node.scale) obj.scale.fromArray(node.scale)
    return obj
  })
  gltf.nodes.forEach((node, idx) => {
    for (const childIdx of node.children ?? []) nodes[idx].add(nodes[childIdx])
  })
  const root = new THREE.Group()
  for (const idx of gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? []) root.add(nodes[idx])
  root.updateMatrixWorld(true)
  return root
}

function expectedModifiedJointNames(snapshot: RigAssetSnapshot): string[] {
  const firstFlex = snapshot.speciesId === 'yellow-tang' ? 3 : 1
  return [
    ...snapshot.spineNames.slice(firstFlex),
    snapshot.pectoralLeftName,
    snapshot.pectoralRightName,
  ]
}

function expectQuaternionAccessorIsNormalized(asset: NonNullable<ReturnType<typeof readGlb>>, accessorIndex: number): void {
  const accessor = asset.json.accessors?.[accessorIndex]
  expect(accessor?.type).toBe('VEC4')
  expect(accessor?.componentType).toBe(5126)
  expect(accessor?.bufferView).toBeDefined()
  const view = asset.json.bufferViews?.[accessor!.bufferView!]
  expect(view).toBeDefined()
  const offset = asset.binaryOffset + (view!.byteOffset ?? 0) + (accessor!.byteOffset ?? 0)
  const stride = view!.byteStride ?? 16
  for (let i = 0; i < accessor!.count; i++) {
    const values = [0, 1, 2, 3].map(component => asset.bytes.readFloatLE(offset + i * stride + component * 4))
    const norm = Math.hypot(...values)
    expect(Number.isFinite(norm)).toBe(true)
    expect(norm).toBeCloseTo(1, 5)
  }
}

describe('biomechanical fish turning and curvilinear spine bending (AQ-49)', () => {
  it('enforces the exact 65-degree two-stage maneuver threshold (brake-pivot -> exit-stroke -> none)', () => {
    expect(SHARP_TURN_THRESHOLD_RAD).toBeCloseTo((65 * Math.PI) / 180, 10)

    const belowThreshold = resolveTurnManeuverStage('none', 0, (64 * Math.PI) / 180, 0)
    expect(belowThreshold.stage).toBe('none')

    const atThreshold = resolveTurnManeuverStage('none', 0, (65.1 * Math.PI) / 180, 0)
    expect(atThreshold.stage).toBe('brake-pivot')

    const intoExitStroke = resolveTurnManeuverStage(
      atThreshold.stage,
      atThreshold.nextExitStrokeSeconds,
      (45 * Math.PI) / 180,
      0,
    )
    expect(intoExitStroke.stage).toBe('exit-stroke')

    expect(evaluateTurnSpeedFactor(Math.PI, 0, 'brake-pivot')).toBeCloseTo(0.38, 6)
    expect(evaluateTurnSpeedFactor(0.4, 0, 'exit-stroke')).toBeCloseTo(1.16, 6)
  })

  it('locks forward translation strictly to the fish heading axis (dot === 1.0) during 180-degree reversals with zero backward/sideways crab-sliding', () => {
    const step = computeCurvilinearStepVector(
      0,
      0,
      { x: 0, y: 0, z: -1 },
      Math.PI,
      0.1,
      1.5,
    )
    expect(step.x).toBeCloseTo(0, 8)
    expect(step.y).toBeCloseTo(0, 8)
    expect(step.z).toBeCloseTo(0.1, 8)

    // Verify full 180-degree reversal trajectory in stepSwimmingFish has forward-alignment dot > 0.99 on every substep
    const openHabitat: WaterHabitat = {
      bounds: { min: { x: -5, y: -2.4, z: -4 }, max: { x: 5, y: 2.8, z: 4 } },
      obstacles: [],
      anchors: [],
    }
    const fish = createSwimmingFish('reversal-clown', 'ocellaris-clownfish', { x: 0, y: 0.5, z: 0 }, 0.3)
    fish.yaw = Math.PI / 2 // Facing +X
    fish.pitch = 0
    fish.speed = 0.6
    // Sync routeGeneration so the FSM does not replace our manual 180-degree reversal route
    fish.routeGeneration = fish.behavior.navigationGeneration
    fish.route = [
      { x: 0, y: 0.5, z: 0 },
      { x: -2.5, y: 0.5, z: 0 },
    ]
    fish.waypoint = 1

    let sawBrakePivot = false
    let sawExitStroke = false
    for (let i = 0; i < 140; i++) {
      // Keep routeGeneration synced across state transitions during the 2.3s maneuver
      fish.routeGeneration = fish.behavior.navigationGeneration
      const prev = { ...fish.position }
      stepSwimmingFish(fish, openHabitat, 1 / 60)
      const dx = fish.position.x - prev.x
      const dy = fish.position.y - prev.y
      const dz = fish.position.z - prev.z
      const stepLen = Math.hypot(dx, dy, dz)
      expect(stepLen).toBeGreaterThan(0)

      const noseX = Math.sin(fish.yaw) * Math.cos(fish.pitch)
      const noseY = -Math.sin(fish.pitch)
      const noseZ = Math.cos(fish.yaw) * Math.cos(fish.pitch)
      const forwardDot = (dx * noseX + dy * noseY + dz * noseZ) / stepLen
      expect(forwardDot).toBeGreaterThan(0.99)

      if (fish.turnKinematics.maneuverStage === 'brake-pivot') sawBrakePivot = true
      if (fish.turnKinematics.maneuverStage === 'exit-stroke') sawExitStroke = true
    }

    expect(sawBrakePivot).toBe(true)
    expect(sawExitStroke).toBe(true)
    expect(Math.sin(fish.yaw)).toBeLessThan(0)
  })

  it('binds actual exported GLB fish hierarchies and enforces archetype-specific spine bending (0 anterior sail shear on yellow-tang vs progressive ramp on clownfish)', () => {
    const candidateClown = buildHierarchyFromGlb('../proof/candidate-real-clown.glb')
    const candidateTang = buildHierarchyFromGlb('../proof/candidate-real-tang.glb')
    const suppliedClown = buildHierarchyFromGlb('../assets/fish/fish-ocellaris-clownfish.glb')
    const suppliedTang = buildHierarchyFromGlb('../assets/fish/fish-yellow-tang.glb')

    const clownRig = bindFishTurningRig(candidateClown, 'ocellaris-clownfish')
    const tangRig = bindFishTurningRig(candidateTang, 'yellow-tang')
    const suppliedClownRig = bindFishTurningRig(suppliedClown, 'ocellaris-clownfish')
    const suppliedTangRig = bindFishTurningRig(suppliedTang, 'yellow-tang')

    expect(clownRig.archetype).toBe('subcarangiform_schooler')
    expect(clownRig.spineJoints.map(j => j.name)).toEqual(['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5'])
    expect(tangRig.archetype).toBe('labriform_rigid_disc')
    expect(tangRig.spineJoints.map(j => j.name)).toEqual(['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5'])
    expect(suppliedClownRig.spineJoints.map(j => j.name)).toEqual(['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4'])
    expect(suppliedTangRig.spineJoints.map(j => j.name)).toEqual(['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4'])

    let kinematics: FishTurnKinematics = {
      yawRateRadPerSec: 0,
      smoothedYawRate: 0,
      turnCurvature: 0,
      turnCurvatureDelayed: 0,
      turnPhase: 0,
      maneuverStage: 'none',
      exitStrokeSeconds: 0,
      speed: 1.1,
      startleSeconds: 0,
    }
    for (let i = 0; i < 8; i++) {
      kinematics = stepFishTurnKinematics(kinematics, 0.09, 1 / 30, 1.1, 0, 1.3)
    }

    const clownAngles = evaluateSpineTurnAngles(
      clownRig.spineJoints.length,
      kinematics,
      clownRig.archetype,
    )
    // Subcarangiform schooler bends progressively from spine_1 through spine_5
    expect(clownAngles.spineBendRad[0]).toBe(0)
    expect(Math.abs(clownAngles.spineBendRad[1])).toBeGreaterThan(0)
    expect(Math.abs(clownAngles.spineBendRad[5])).toBeGreaterThan(Math.abs(clownAngles.spineBendRad[1]))

    const tangAngles = evaluateSpineTurnAngles(
      tangRig.spineJoints.length,
      kinematics,
      tangRig.archetype,
    )
    // Labriform rigid disc keeps spine_0, spine_1, and spine_2 at 0 rad so dorsal/anal sails never shear
    expect(tangAngles.spineBendRad[0]).toBe(0)
    expect(tangAngles.spineBendRad[1]).toBe(0)
    expect(tangAngles.spineBendRad[2]).toBe(0)
    expect(Math.abs(tangAngles.spineBendRad[3])).toBeGreaterThan(0)
    expect(Math.abs(tangAngles.spineBendRad[5])).toBeGreaterThan(Math.abs(tangAngles.spineBendRad[3]))

    applyFishTurningRigOverlay(tangRig, kinematics, false)
    expect(tangRig.spineJoints[1].quaternion.equals(new THREE.Quaternion())).toBe(true)
    expect(tangRig.spineJoints[2].quaternion.equals(new THREE.Quaternion())).toBe(true)
    expect(tangRig.spineJoints[4].quaternion.equals(new THREE.Quaternion())).toBe(false)
  })

  it('publishes bounded overlay caps and verifies exact skin, rest axes, and clip reset tracks for clown, tang, and gramma rigs', () => {
    for (const snapshot of RIG_ASSET_SNAPSHOTS) {
      const asset = readGlb(snapshot.relativePath)
      let root: THREE.Group

      if (asset) {
        const actualHash = createHash('sha256').update(asset.bytes).digest('hex')
        expect(actualHash, `${snapshot.speciesId} source hash`).toBe(snapshot.sha256)
        root = buildHierarchyFromDocument(asset.json)

        const expectedJointNames = [
          ...snapshot.spineNames,
          snapshot.pectoralLeftName,
          snapshot.pectoralRightName,
        ]
        const matchingSkin = asset.json.skins?.find(skin => {
          const names = skin.joints.map(index => asset.json.nodes[index]?.name ?? '')
          return expectedJointNames.every(name => names.includes(name))
        })
        expect(matchingSkin, `${snapshot.speciesId} skin membership`).toBeDefined()
        expect(matchingSkin!.joints.map(index => asset.json.nodes[index]?.name ?? '').sort())
          .toEqual([...snapshot.skinJointNames].sort())

        const clips = asset.json.animations ?? []
        expect(clips.length).toBeGreaterThan(0)
        const activeClip = clips.find(clip => clip.name === snapshot.clipName)
        expect(activeClip, `${snapshot.speciesId} active clip`).toBeDefined()
        const rotationTargets = new Set(
          activeClip!.channels
            .filter(channel => channel.target.path === 'rotation')
            .map(channel => asset.json.nodes[channel.target.node]?.name ?? ''),
        )
        expect([...rotationTargets].sort()).toEqual([...snapshot.rotationTargets].sort())
        for (const name of expectedModifiedJointNames(snapshot)) {
          expect(rotationTargets, `${snapshot.speciesId} clip resets ${name}`).toContain(name)
        }

        // Every active clip rotation sample is unit length at rest/keyed poses, as required
        // before the post-mixer local-axis overlay is composed.
        for (const channel of activeClip!.channels.filter(channel => channel.target.path === 'rotation')) {
          const outputAccessor = activeClip!.samplers[channel.sampler]?.output
          if (outputAccessor !== undefined) expectQuaternionAccessorIsNormalized(asset, outputAccessor)
        }

        root.updateMatrixWorld(true)
        const nodesByName = new Map<string, THREE.Object3D>()
        root.traverse(node => nodesByName.set(node.name, node))
        for (const [name, expected] of [
          [snapshot.pectoralLeftName, snapshot.pectoralLeftLocalZ],
          [snapshot.pectoralRightName, snapshot.pectoralRightLocalZ],
        ] as const) {
          const joint = nodesByName.get(name)
          expect(joint, `${snapshot.speciesId} ${name} node`).toBeDefined()
          const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(joint!.getWorldQuaternion(new THREE.Quaternion()))
          expect(axis.x).toBeCloseTo(expected[0], 2)
          expect(axis.y).toBeCloseTo(expected[1], 2)
          expect(axis.z).toBeCloseTo(expected[2], 2)
        }
        for (const spineName of snapshot.spineNames) {
          const joint = nodesByName.get(spineName)
          expect(joint, `${snapshot.speciesId} ${spineName} node`).toBeDefined()
          const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(joint!.getWorldQuaternion(new THREE.Quaternion()))
          expect(axis.x).toBeCloseTo(snapshot.spineLocalZ[0], 2)
          expect(axis.y).toBeCloseTo(snapshot.spineLocalZ[1], 2)
          expect(axis.z).toBeCloseTo(snapshot.spineLocalZ[2], 2)
        }

        for (const name of expectedJointNames) {
          expect(asset.json.nodes.filter(node => node.name === name), `${snapshot.speciesId} unique ${name}`).toHaveLength(1)
        }
      } else {
        // Clean checkout fallback: retain only hash-pinned structural evidence so the
        // producer math remains testable without depending on untracked model delivery.
        expect(snapshot.sha256).toMatch(/^[0-9a-f]{64}$/)
        expect(snapshot.skinJointNames).toEqual(expect.arrayContaining(expectedModifiedJointNames(snapshot)))
        expect(snapshot.rotationTargets).toEqual(expect.arrayContaining(expectedModifiedJointNames(snapshot)))
        const nodes: THREE.Object3D[] = []
        for (const name of snapshot.spineNames) {
          const node = new THREE.Object3D()
          node.name = name
          nodes.push(node)
        }
        const rootNode = new THREE.Group()
        const spineRest = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0))
        nodes[0].quaternion.copy(spineRest)
        for (let i = 1; i < nodes.length; i++) nodes[i - 1].add(nodes[i])
        rootNode.add(nodes[0])
        for (const [name, axis] of [
          [snapshot.pectoralLeftName, snapshot.pectoralLeftLocalZ],
          [snapshot.pectoralRightName, snapshot.pectoralRightLocalZ],
        ] as const) {
          const pectoral = new THREE.Object3D()
          pectoral.name = name
          pectoral.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...axis).normalize())
          rootNode.add(pectoral)
        }
        root = rootNode
      }

      const rig = bindFishTurningRig(root, snapshot.speciesId)
      expect(rig.spineJoints.map(joint => joint.name)).toEqual(snapshot.spineNames)
      expect(rig.pectoralLeft?.name).toBe(snapshot.pectoralLeftName)
      expect(rig.pectoralRight?.name).toBe(snapshot.pectoralRightName)

      const contract = fishTurningEnvelopeContract(rig)
      expect(contract.verification).toBe('unverified-until-root-asset-and-reset-review')
      expect(contract.sourceIdentity).toBe('unbound')
      expect(contract.composition).toBe('procedural-overlay')
      expect(contract.quaternionComposition).toBe('mixerQuaternion-times-localAxisAngle')
      expect(contract.jointNames).toEqual(expectedModifiedJointNames(snapshot))
      expect(contract.maxSummedSpineAngleAbsRad).toBeCloseTo(1.275, 12)
      expect(contract.spineJointCaps.map(cap => cap.jointName)).toEqual(snapshot.spineNames)
      expect(contract.spineJointCaps.reduce((sum, cap) => sum + cap.maxAbsAngleRad, 0)).toBeCloseTo(1.275, 12)

      const extreme: FishTurnKinematics = {
        yawRateRadPerSec: 4.5,
        smoothedYawRate: 4.5,
        turnCurvature: 1,
        turnCurvatureDelayed: 1,
        turnPhase: Math.PI / 2,
        maneuverStage: 'exit-stroke',
        exitStrokeSeconds: 0.38,
        speed: 1,
        startleSeconds: 1,
      }
      const bounds = evaluateSpineTurnAngles(rig.spineJoints.length, extreme, rig.archetype)
      for (let i = 0; i < bounds.spineBendRad.length; i++) {
        expect(Math.abs(bounds.spineBendRad[i])).toBeLessThanOrEqual(contract.spineJointCaps[i].maxAbsAngleRad + 1e-12)
      }
      expect(bounds.spineBendRad.reduce((sum, angle) => sum + Math.abs(angle), 0)).toBeLessThanOrEqual(1.275 + 1e-12)
      expect(Math.abs(bounds.pectoralLeftFlareRad)).toBeLessThanOrEqual(0.483 + 1e-12)
      expect(Math.abs(bounds.pectoralRightFlareRad)).toBeLessThanOrEqual(0.483 + 1e-12)
      expect(Math.abs(bounds.pectoralLeftPitchRad)).toBeLessThanOrEqual(0.24 + 1e-12)
      expect(Math.abs(bounds.pectoralRightPitchRad)).toBeLessThanOrEqual(0.24 + 1e-12)

      applyFishTurningRigOverlay(rig, extreme)
      for (const jointName of expectedModifiedJointNames(snapshot)) {
        const joint = rig.spineJoints.find(spineJoint => spineJoint.name === jointName)
          ?? (rig.pectoralLeft?.name === jointName ? rig.pectoralLeft : rig.pectoralRight)
        expect(joint).toBeDefined()
        expect(joint!.quaternion.length()).toBeCloseTo(1, 12)
        expect([...joint!.quaternion.toArray()].every(Number.isFinite)).toBe(true)
      }
    }
  })

  it('keeps malformed kinematics finite and clamps each output to its declared contract', () => {
    const root = new THREE.Group()
    const spine: THREE.Object3D[] = []
    for (let index = 0; index < 6; index++) {
      const joint = new THREE.Object3D()
      joint.name = `spine_${index}`
      if (index > 0) spine[index - 1].add(joint)
      else root.add(joint)
      spine.push(joint)
    }
    const left = new THREE.Object3D()
    left.name = 'pectoral_L'
    const right = new THREE.Object3D()
    right.name = 'pectoral_R'
    root.add(left, right)
    const rig = bindFishTurningRig(root, 'ocellaris-clownfish')
    const malformed = {
      yawRateRadPerSec: Number.NaN,
      smoothedYawRate: Number.POSITIVE_INFINITY,
      turnCurvature: 1,
      turnCurvatureDelayed: Number.NEGATIVE_INFINITY,
      turnPhase: Number.NaN,
      maneuverStage: 'exit-stroke',
      exitStrokeSeconds: Number.NaN,
      speed: Number.POSITIVE_INFINITY,
      startleSeconds: Number.NaN,
    } as FishTurnKinematics

    const angles = evaluateSpineTurnAngles(rig.spineJoints.length, malformed, rig.archetype)
    expect([...angles.spineBendRad, angles.pectoralLeftFlareRad, angles.pectoralRightFlareRad,
      angles.pectoralLeftPitchRad, angles.pectoralRightPitchRad].every(Number.isFinite)).toBe(true)
    expect(angles.spineBendRad.some(angle => Math.abs(angle) > 0)).toBe(true)
    applyFishTurningRigOverlay(rig, malformed)
    for (const joint of [...rig.spineJoints, rig.pectoralLeft!, rig.pectoralRight!]) {
      expect([...joint.quaternion.toArray()].every(Number.isFinite)).toBe(true)
      expect(joint.quaternion.length()).toBeCloseTo(1, 12)
    }
  })

  it('foreshortens fallback 2D sprites smoothly across yaw transitions instead of popping between -1 and +1', () => {
    expect(evaluateSpriteTurnScaleX(Math.PI / 2)).toBeCloseTo(1.0, 6)
    expect(evaluateSpriteTurnScaleX(-Math.PI / 2)).toBeCloseTo(-1.0, 6)
    expect(evaluateSpriteTurnScaleX(0.05)).toBeGreaterThan(0.28)
    expect(evaluateSpriteTurnScaleX(0.05)).toBeLessThan(0.35)
    expect(evaluateSpriteTurnScaleX(-0.05)).toBeLessThan(-0.28)
    expect(evaluateSpriteTurnScaleX(-0.05)).toBeGreaterThan(-0.35)
  })
})
