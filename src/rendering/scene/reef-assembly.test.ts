import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_LEFT_ISLAND_MOUNTS,
  DEFAULT_RIGHT_ISLAND_MOUNTS,
  assembleCoralsOnRockSockets,
  inferSocketArchetype,
  instantiateModularReefHabitat,
} from './reef-assembly'
import { evaluateCoralVertexDisplacement } from './coral-material'

function buildRockFixtureFromSocketReport(reportFile: string): THREE.Group {
  const report = JSON.parse(
    readFileSync(new URL(`../assets/corals/${reportFile}`, import.meta.url), 'utf8'),
  )
  const root = new THREE.Group()
  const rockMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ map: new THREE.Texture() }),
  )
  rockMesh.name = 'Live_Rock_Island'
  rockMesh.userData = { reefPrimitive: { id: 'live_rock', role: 'rock' } }
  root.add(rockMesh)

  for (const socket of report.supportedSockets) {
    const node = new THREE.Object3D()
    node.name = socket.name
    node.position.set(socket.positionM[0], socket.positionM[1], socket.positionM[2])
    node.quaternion.set(socket.rotation[0], socket.rotation[1], socket.rotation[2], socket.rotation[3])
    root.add(node)
  }
  return root
}

function buildMockCoralTemplates(): Map<string, THREE.Object3D> {
  const templates = new Map<string, THREE.Object3D>()
  const coralSpecs: Array<[string, Array<[string, 'coral-soft' | 'coral-rigid']>]> = [
    ['coral-euphyllia-torch', [['euphyllia_polyp_crown', 'coral-soft'], ['euphyllia_skeleton', 'coral-rigid']]],
    ['coral-euphyllia-hammer', [['euphyllia_hammer_polyp_crown', 'coral-soft'], ['euphyllia_hammer_skeleton', 'coral-rigid']]],
    ['coral-anemone-bta', [['anemone_column_disc', 'coral-soft'], ['anemone_tentacle_crown', 'coral-soft']]],
    ['coral-acropora-table', [['acropora_table_colony', 'coral-rigid']]],
    ['coral-acropora-staghorn', [['acropora_staghorn_colony', 'coral-rigid']]],
    ['coral-montipora-plate', [['montipora_plate_colony', 'coral-rigid']]],
    ['coral-brain-diploria', [['diploria_brain_colony', 'coral-soft']]],
    ['coral-zoanthid-mat', [['zoanthid_button_cluster', 'coral-soft']]],
  ]

  for (const [id, primitives] of coralSpecs) {
    const group = new THREE.Group()
    group.name = id
    for (const [primId, role] of primitives) {
      const mesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ vertexColors: true }),
      )
      mesh.name = primId
      mesh.userData = { reefPrimitive: { id: primId, role } }
      group.add(mesh)
    }
    templates.set(id, group)
  }
  return templates
}

function setMaskGeometry(mesh: THREE.Mesh, positions: readonly (readonly [number, number, number])[], masks: readonly (readonly [number, number, number, number])[]) {
  const geometry = mesh.geometry
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.flatMap(p => [...p]), 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(masks.flatMap(mask => [...mask]), 4))
  geometry.computeBoundingSphere()
  return geometry
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

describe('modular coral socket assembly on live-rock foundations (AQ-14.4)', () => {
  it('mounts all 12 left-island and 11 right-island sockets with verified archetypes, 3D live-rock shader, and raw-mask material bindings', () => {
    const templates = buildMockCoralTemplates()
    const leftRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    const rightRock = buildRockFixtureFromSocketReport('live-rock-island-right-socket-report.json')

    const leftAssembly = assembleCoralsOnRockSockets(leftRock, templates, DEFAULT_LEFT_ISLAND_MOUNTS)
    const rightAssembly = assembleCoralsOnRockSockets(rightRock, templates, DEFAULT_RIGHT_ISLAND_MOUNTS)

    expect(leftAssembly.mountedCorals).toHaveLength(12)
    expect(rightAssembly.mountedCorals).toHaveLength(11)

    const leftRockMesh = leftRock.getObjectByName('Live_Rock_Island') as THREE.Mesh
    expect((leftRockMesh.material as THREE.MeshStandardMaterial).userData.liveRockShader).toBe('live-rock-3d-aragonite-v1')
    expect((leftRockMesh.material as THREE.MeshStandardMaterial).map).toBeNull()

    for (const mounted of [...leftAssembly.mountedCorals, ...rightAssembly.mountedCorals]) {
      expect(mounted.materialControllers.length).toBeGreaterThan(0)
      for (const ctrl of mounted.materialControllers) {
        expect(ctrl.material.vertexColors).toBe(false)
        expect(ctrl.material.transparent).toBe(false)
      }
    }

    // Verify pause / reduced-motion gating updates uMotionScale across all mounted soft colonies
    leftAssembly.update(3.2, true, false)
    for (const mounted of leftAssembly.mountedCorals) {
      for (const ctrl of mounted.materialControllers) {
        expect(ctrl.uniforms.uMotionScale.value).toBe(0)
      }
    }

    leftAssembly.update(3.2, false, false)
    const softControllers = leftAssembly.mountedCorals
      .flatMap(m => m.materialControllers)
      .filter(c => c.uniforms.uRoleIsSoft.value === 1)
    expect(softControllers.length).toBeGreaterThan(0)
    for (const ctrl of softControllers) {
      expect(ctrl.uniforms.uMotionScale.value).toBe(1)
    }
  })

  it('forwards the fixture actinic level to every mounted coral material, defaulting to 1 (AQ-70.6 AC #3)', () => {
    const templates = buildMockCoralTemplates()
    const leftRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')

    const assembly = assembleCoralsOnRockSockets(leftRock, templates, DEFAULT_LEFT_ISLAND_MOUNTS, {
      actinicLevel: 0.5,
    })
    expect(assembly.mountedCorals.length).toBeGreaterThan(0)
    for (const mounted of assembly.mountedCorals) {
      expect(mounted.materialControllers.length).toBeGreaterThan(0)
      for (const ctrl of mounted.materialControllers) {
        expect(ctrl.uniforms.uActinicLevel.value).toBe(0.5)
      }
    }

    const defaultRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    const defaultAssembly = assembleCoralsOnRockSockets(defaultRock, templates, DEFAULT_LEFT_ISLAND_MOUNTS)
    for (const mounted of defaultAssembly.mountedCorals) {
      for (const ctrl of mounted.materialControllers) {
        expect(ctrl.uniforms.uActinicLevel.value).toBe(1)
      }
    }
  })

  it('bounds shader-displaced soft vertices and grows shared cached geometry only once across clones and amplitude changes', () => {
    const templates = buildMockCoralTemplates()
    const template = templates.get('coral-euphyllia-torch')!
    const crown = template.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    const geometry = setMaskGeometry(crown, [
      [0.16, 0.12, 0.04],
      [-0.13, 0.018, -0.08],
      [0.01, -0.02, 0.02],
    ], [
      [1, 0.8, 0.14, 0.5],
      [0.44, 0.4, 0.67, 0.25],
      [0, 0.1, 0.9, 0.8],
    ])
    const positions = geometry.getAttribute('position').array.slice()
    const baseSphere = geometry.boundingSphere!.clone()
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(entry => entry.coralAssetId === 'coral-euphyllia-torch')!
    const first = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      templates,
      [mount],
    )
    const firstMesh = first.mountedCorals[0].root.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    expect(firstMesh.geometry).toBe(geometry)
    expect(geometry.boundingSphere!.radius).toBeGreaterThan(baseSphere.radius)
    expect(geometry.getAttribute('position').array).toEqual(positions)

    const firstRadius = geometry.boundingSphere!.radius
    const second = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      templates,
      [mount],
    )
    const secondMesh = second.mountedCorals[0].root.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    expect(secondMesh.geometry).toBe(firstMesh.geometry)
    expect(geometry.boundingSphere!.radius).toBe(firstRadius)

    const controller = first.mountedCorals[0].materialControllers.find(binding => binding.uniforms.uRoleIsSoft.value === 1)!
    controller.uniforms.uFlowAmplitudeM.value = 0.05
    first.update(1)
    const expandedRadius = geometry.boundingSphere!.radius
    expect(expandedRadius).toBeGreaterThan(firstRadius)
    second.update(1)
    expect(geometry.boundingSphere!.radius).toBe(expandedRadius)

    const color = geometry.getAttribute('color')
    const sphere = geometry.boundingSphere!
    for (let vertex = 0; vertex < geometry.getAttribute('position').count; vertex++) {
      const pos = geometry.getAttribute('position')
      for (let sample = 0; sample <= 80; sample++) {
        const time = sample / 10
        const displacement = evaluateCoralVertexDisplacement(
          { x: pos.getX(vertex), y: pos.getY(vertex), z: pos.getZ(vertex) },
          { r: color.getX(vertex), g: color.getY(vertex), b: color.getZ(vertex), a: color.getW(vertex) },
          'coral-soft',
          time,
          { flowAmplitudeM: 0.05 },
        )
        const skirt = 1 - smoothstep(-0.006, 0.018, pos.getY(vertex))
        const deformed = new THREE.Vector3(
          pos.getX(vertex) * (1 - 0.45 * skirt) + displacement.dx,
          pos.getY(vertex) - 0.008 * skirt + displacement.dy,
          pos.getZ(vertex) * (1 - 0.45 * skirt) + displacement.dz,
        )
        expect(deformed.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius)
      }
    }
  })

  it('keeps a rigid basal vertex that shader-tucks into view from being culled by the original geometry sphere', () => {
    const templates = buildMockCoralTemplates()
    const template = templates.get('coral-acropora-staghorn')!
    const rigid = template.getObjectByName('acropora_staghorn_colony') as THREE.Mesh
    const localVertices: Array<[number, number, number]> = [
      [1.01, 0, 0],
      [1.02, 0, 0.003],
      [1.01, 0.002, 0.003],
    ]
    const geometry = setMaskGeometry(rigid, localVertices, localVertices.map(() => [0, 0, 0, 0] as const))
    const baseSphere = geometry.boundingSphere!.clone()

    const assembly = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      templates,
      [DEFAULT_LEFT_ISLAND_MOUNTS[0]],
    )
    const assembledMesh = assembly.mountedCorals[0].root.getObjectByName('acropora_staghorn_colony') as THREE.Mesh
    assembledMesh.updateWorldMatrix(true, false)
    expect(assembledMesh.geometry).toBe(geometry)
    expect(assembledMesh.frustumCulled).toBe(true)

    const deformedWorldVertices = localVertices.map(([x, y, z]) => {
      const tuck = 1 - smoothstep(-0.006, 0.018, y)
      return new THREE.Vector3(x * (1 - 0.45 * tuck), y - 0.008 * tuck, z * (1 - 0.45 * tuck))
        .applyMatrix4(assembledMesh.matrixWorld)
    })
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    for (const point of deformedWorldVertices) { min.min(point); max.max(point) }
    const padding = 0.005
    min.addScalar(-padding); max.addScalar(padding)
    const frustum = new THREE.Frustum(
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -min.x),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), max.x),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -min.y),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), max.y),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -min.z),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), max.z),
    )
    expect(deformedWorldVertices.every(point => frustum.intersectsSphere(new THREE.Sphere(point, 0)))).toBe(true)

    const expandedSphere = geometry.boundingSphere!.clone()
    geometry.boundingSphere!.copy(baseSphere)
    expect(assembledMesh.intersectsFrustum(frustum)).toBe(false)
    geometry.boundingSphere!.copy(expandedSphere)
    expect(assembledMesh.intersectsFrustum(frustum)).toBe(true)
  })

  it('fails open to an infinite culling sphere for non-finite masks or amplitudes', () => {
    const templates = buildMockCoralTemplates()
    const template = templates.get('coral-euphyllia-torch')!
    const crown = template.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    const geometry = setMaskGeometry(crown, [[0.1, 0.08, 0.1]], [[Number.NaN, 0, 0, 0]])
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(entry => entry.coralAssetId === 'coral-euphyllia-torch')!
    const assembly = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      templates,
      [mount],
    )
    expect(geometry.boundingSphere!.radius).toBe(Infinity)

    const controller = assembly.mountedCorals[0].materialControllers.find(binding => binding.uniforms.uRoleIsSoft.value === 1)!
    controller.uniforms.uFlowAmplitudeM.value = Number.POSITIVE_INFINITY
    assembly.update(1)
    expect(geometry.boundingSphere!.radius).toBe(Infinity)
  })

  it('scales the padding with large finite displacement and fails open on Float32 amplitude overflow', () => {
    const templates = buildMockCoralTemplates()
    const crown = templates.get('coral-euphyllia-torch')!.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    const geometry = setMaskGeometry(crown, [[0.1, 0, 0]], [[1, 0, 0, 0]])
    const baseRadius = geometry.boundingSphere!.radius
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(entry => entry.coralAssetId === 'coral-euphyllia-torch')!
    const assembly = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      templates,
      [mount],
    )
    const controller = assembly.mountedCorals[0].materialControllers.find(binding => binding.uniforms.uRoleIsSoft.value === 1)!
    controller.uniforms.uFlowAmplitudeM.value = 1000
    assembly.update(1)

    const skirt = 1 - smoothstep(-0.006, 0.018, 0)
    const dx = 0.45 * skirt * 0.1 + 1.38 * 1000
    const dz = 1.10 * 1000
    const dy = 0.008 * skirt + 0.18 * (1.38 + 1.10) * 1000
    const exactVertexEnvelope = Math.hypot(dx, dy, dz)
    expect(geometry.boundingSphere!.radius).toBeGreaterThanOrEqual(baseRadius + exactVertexEnvelope + 0.01)

    controller.uniforms.uFlowAmplitudeM.value = 1e40
    assembly.update(2)
    expect(geometry.boundingSphere!.radius).toBe(Infinity)

    const zeroFlexTemplates = buildMockCoralTemplates()
    const zeroFlexCrown = zeroFlexTemplates.get('coral-euphyllia-torch')!.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    const zeroFlexGeometry = setMaskGeometry(zeroFlexCrown, [[0.1, 0, 0]], [[0, 0, 0, 0]])
    const zeroFlexAssembly = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      zeroFlexTemplates,
      [mount],
    )
    const zeroFlexController = zeroFlexAssembly.mountedCorals[0].materialControllers.find(binding => binding.uniforms.uRoleIsSoft.value === 1)!
    zeroFlexController.uniforms.uFlowAmplitudeM.value = 3e38
    zeroFlexAssembly.update(1)
    expect(Number.isFinite(Math.fround(3e38))).toBe(true)
    expect(Math.fround(3e38 * 1.38)).toBe(Infinity)
    expect(zeroFlexGeometry.boundingSphere!.radius).toBe(Infinity)

    const sumOverflowTemplates = buildMockCoralTemplates()
    const sumOverflowCrown = sumOverflowTemplates.get('coral-euphyllia-torch')!.getObjectByName('euphyllia_polyp_crown') as THREE.Mesh
    const sumOverflowGeometry = setMaskGeometry(sumOverflowCrown, [[0.1, 0, 0]], [[0, 0, 0, 0]])
    const sumOverflowAssembly = assembleCoralsOnRockSockets(
      buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json'),
      sumOverflowTemplates,
      [mount],
    )
    const sumOverflowController = sumOverflowAssembly.mountedCorals[0].materialControllers.find(binding => binding.uniforms.uRoleIsSoft.value === 1)!
    sumOverflowController.uniforms.uFlowAmplitudeM.value = 2e38
    sumOverflowAssembly.update(1)
    expect(Number.isFinite(Math.fround(2e38))).toBe(true)
    expect(Number.isFinite(Math.fround(2e38 * 1.38))).toBe(true)
    expect(Number.isFinite(Math.fround(2e38 * 1.10))).toBe(true)
    expect(Math.fround(2e38 * (1.38 + 1.10))).toBe(Infinity)
    expect(sumOverflowGeometry.boundingSphere!.radius).toBe(Infinity)
  })

  it('instantiates 3D modular reef obstacles preserving the left pass-through cave arch and grazing anchors', () => {
    const leftHabitat = instantiateModularReefHabitat('left', 4.2, { x: -2.65, y: -2.72, z: -1.1 }, 'reef-0', 0)
    expect(leftHabitat.obstacles.length).toBe(8)
    expect(leftHabitat.anchors.length).toBe(3)

    // The cave opening at the center of the left island (localX=0, localY=0.06 -> worldX=-2.65, worldY=-2.468)
    // must NOT be inside any of the lower rock band obstacles (rock-part-01..06 flank left and right of the cave).
    const cavePoint = { x: -2.65, y: -2.72 + 0.06 * 4.2, z: -1.1 }
    const containingObstacles = leftHabitat.obstacles.filter(
      obs =>
        cavePoint.x >= obs.bounds.min.x &&
        cavePoint.x <= obs.bounds.max.x &&
        cavePoint.y >= obs.bounds.min.y &&
        cavePoint.y <= obs.bounds.max.y &&
        cavePoint.z >= obs.bounds.min.z &&
        cavePoint.z <= obs.bounds.max.z,
    )
    expect(containingObstacles).toHaveLength(0)
  })

  it('rejects mismatched socket archetypes', () => {
    const templates = buildMockCoralTemplates()
    const leftRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    expect(inferSocketArchetype('socket_sps_crest_01')).toBe('branching-sps')
    expect(() =>
      assembleCoralsOnRockSockets(leftRock, templates, [
        {
          socketName: 'socket_sps_crest_01',
          coralAssetId: 'coral-anemone-bta',
          archetype: 'host-anemone',
          yawRad: 0,
          scale: 1,
        },
      ]),
    ).toThrow(/archetype.*does not match/)
  })
})
