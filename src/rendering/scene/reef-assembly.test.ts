import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  AQUARIUM_WATER_BOUNDS,
  DEFAULT_LEFT_ISLAND_MOUNTS,
  DEFAULT_RIGHT_ISLAND_MOUNTS,
  MODULAR_CORAL_ASSET_URLS,
  MODULAR_CORAL_VARIATION_LIBRARY,
  ACTINIC_RIM_TINT_HEX,
  assembleCoralsOnRockSockets,
  inferSocketArchetype,
  instantiateModularReefHabitat,
  LIVE_ROCK_ISLAND_URLS,
  snapshotMountedCoralOrigins,
  SOCKET_ANCHOR_POSITIONS_M,
} from './reef-assembly'
import { evaluateCoralVertexDisplacement } from './coral-material'
import { fishBodyRadiusM } from './fish-scale'
import { isSpeciesCompatibleWithAnchor } from './habitat-anchor-interactions'
import { isWaterSegmentSafe } from '../../simulation/habitat-navigation'

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

function buildRockFixtureFromRuntimeGlb(): THREE.Group {
  type GlbNode = { name?: string; translation?: number[]; rotation?: number[]; scale?: number[]; children?: number[] }
  const runtimeUrl = new URL(LIVE_ROCK_ISLAND_URLS.left)
  runtimeUrl.search = ''
  const bytes = readFileSync(runtimeUrl)
  const jsonLength = bytes.readUInt32LE(12)
  const document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)) as { nodes: GlbNode[] }
  const root = new THREE.Group()
  root.name = 'Live_Rock_Island_Left'

  document.nodes.forEach((node, index) => {
    if (!node.name?.startsWith('socket_sps_crest_')) return
    const parent = document.nodes.find(candidate => candidate.children?.includes(index))
    if (parent?.name !== root.name) throw new Error(`Runtime socket ${node.name} is not a direct reef child.`)
    const socket = new THREE.Group()
    socket.name = node.name
    socket.position.fromArray(node.translation ?? [0, 0, 0])
    if (node.rotation) socket.quaternion.fromArray(node.rotation)
    if (node.scale) socket.scale.fromArray(node.scale)
    root.add(socket)
  })
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
    ['reef-acropora-antler', [['reef_acropora_antler', 'coral-rigid']]],
    ['reef-acropora-corymbose', [['reef_acropora_corymbose', 'coral-rigid']]],
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
    const originalLeftRockMaterial = (leftRock.getObjectByName('Live_Rock_Island') as THREE.Mesh).material

    const leftAssembly = assembleCoralsOnRockSockets(leftRock, templates, DEFAULT_LEFT_ISLAND_MOUNTS)
    const rightAssembly = assembleCoralsOnRockSockets(rightRock, templates, DEFAULT_RIGHT_ISLAND_MOUNTS)

    expect(leftAssembly.mountedCorals).toHaveLength(12)
    expect(rightAssembly.mountedCorals).toHaveLength(11)
    expect(leftAssembly.instancedMeshes.length).toBeGreaterThan(0)

    const leftRockMesh = leftRock.getObjectByName('Live_Rock_Island') as THREE.Mesh
    expect(leftRockMesh.material).not.toBe(originalLeftRockMaterial)
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

  it('preserves an authored rock while mounting requested coral and updating its controller clock', () => {
    const templates = buildMockCoralTemplates()
    const rockRoot = new THREE.Group()
    const authoredGeometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4)
    const authoredPositions = authoredGeometry.getAttribute('position')
    const authoredPositionBytes = authoredPositions.array.slice()
    const authoredMap = new THREE.Texture()
    const authoredMaterial = new THREE.MeshStandardMaterial({ map: authoredMap, roughness: 0.42, metalness: 0.16 })
    const rockMesh = new THREE.Mesh(authoredGeometry, authoredMaterial)
    rockMesh.name = 'reef-center-arch-rock'
    rockMesh.userData.reefPrimitive = { id: 'reef_center_arch', role: 'rock' }
    const socket = new THREE.Group()
    socket.name = 'socket_anemone_crevice_01'
    socket.position.set(0.2, 0.3, -0.1)
    rockRoot.add(rockMesh, socket)

    const assembly = assembleCoralsOnRockSockets(rockRoot, templates, [{
      socketName: 'socket_anemone_crevice_01',
      coralAssetId: 'coral-anemone-bta',
      archetype: 'host-anemone',
      yawRad: 0.3,
      scale: 1.2,
    }], { preserveAuthoredRock: true, includeScatter: false })

    expect(rockMesh.geometry).toBe(authoredGeometry)
    expect(rockMesh.geometry.getAttribute('position')).toBe(authoredPositions)
    expect(authoredPositions.array).toEqual(authoredPositionBytes)
    expect(rockMesh.material).toBe(authoredMaterial)
    expect(authoredMaterial.map).toBe(authoredMap)
    expect(authoredMaterial.roughness).toBe(0.42)
    expect(authoredMaterial.metalness).toBe(0.16)
    expect(rockMesh.castShadow).toBe(false)
    expect(rockMesh.receiveShadow).toBe(false)

    expect(assembly.mountedCorals).toHaveLength(1)
    expect(assembly.mountedCorals[0]!.root.parent).toBe(rockRoot)
    expect(assembly.mountedCorals[0]!.root.position.toArray()).toEqual([0.2, 0.3, -0.1])
    const controllers = assembly.mountedCorals[0]!.materialControllers
    expect(controllers.length).toBeGreaterThan(0)
    expect(controllers.every(controller => Boolean(controller.material.userData.coralRawMasks))).toBe(true)
    assembly.update(1.25, false, false)
    expect(controllers.every(controller => controller.uniforms.uTime.value === 1.25)).toBe(true)
    expect(controllers.every(controller => controller.uniforms.uMotionScale.value === 1)).toBe(true)
    assembly.update(2, true, false)
    expect(controllers.every(controller => controller.uniforms.uTime.value === 2)).toBe(true)
    expect(controllers.every(controller => controller.uniforms.uMotionScale.value === 0)).toBe(true)

    expect(assembly.instancedMeshes).toEqual([])
    expect(rockRoot.children.filter(child => child.name.startsWith('mounted_'))).toHaveLength(1)
  })

  it('omits instance scatter only when explicitly requested', () => {
    const templates = buildMockCoralTemplates()
    const rockRoot = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    const assembly = assembleCoralsOnRockSockets(rockRoot, templates, DEFAULT_LEFT_ISLAND_MOUNTS, { includeScatter: false })

    expect(assembly.mountedCorals).toHaveLength(DEFAULT_LEFT_ISLAND_MOUNTS.length)
    expect(assembly.instancedMeshes).toEqual([])
    expect(rockRoot.children.some(child => child instanceof THREE.InstancedMesh)).toBe(false)
    const rockMesh = rockRoot.getObjectByName('Live_Rock_Island') as THREE.Mesh
    expect((rockMesh.material as THREE.MeshStandardMaterial).userData.liveRockShader).toBe('live-rock-3d-aragonite-v1')
  })

  it('keeps the custom baked-PBR primary palette separate from its legacy violet scatter palette', () => {
    const templates = buildMockCoralTemplates()
    const rockRoot = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    const assembly = assembleCoralsOnRockSockets(rockRoot, templates, DEFAULT_LEFT_ISLAND_MOUNTS)
    const primary = assembly.mountedCorals.find(mounted => mounted.coralAssetId === 'reef-acropora-antler')!
    const primaryBinding = primary.materialControllers[0]!
    const zoanthidScatter = assembly.instancedMeshes.find(mesh => mesh.name.startsWith('instanced_coral-zoanthid-mat_'))!
    const scatterMaterial = zoanthidScatter.material as THREE.MeshStandardMaterial
    const scatterUniforms = scatterMaterial.userData.coralRawMasks.uniforms

    expect(primaryBinding.material.customProgramCacheKey()).toContain(':baked-pbr')
    expect(primaryBinding.uniforms.uPaletteBase.value.getHexString()).toBe('8b71a8')
    expect(scatterMaterial.customProgramCacheKey()).not.toContain(':baked-pbr')
    expect(scatterUniforms.uPaletteBase.value.getHexString()).toBe('5c46c8')
  })

  it('mounts the registered corymbose colony at right crest 05 with baked PBR while preserving the legacy scatter palette', () => {
    const id = 'reef-acropora-corymbose'
    const registeredUrl = MODULAR_CORAL_ASSET_URLS[id]
    expect(registeredUrl).toBeDefined()
    expect(new URL(registeredUrl!).pathname).toContain('/custom-colonies/reef-acropora-corymbose.glb')

    const mount = DEFAULT_RIGHT_ISLAND_MOUNTS.find(entry => entry.socketName === 'socket_sps_crest_05')
    expect(mount).toMatchObject({ coralAssetId: id, archetype: 'branching-sps' })
    expect(mount?.paletteOverride?.surfaceMode).toBe('baked-pbr')

    const templates = buildMockCoralTemplates()
    const rockRoot = buildRockFixtureFromSocketReport('live-rock-island-right-socket-report.json')
    const assembly = assembleCoralsOnRockSockets(rockRoot, templates, DEFAULT_RIGHT_ISLAND_MOUNTS)
    const primary = assembly.mountedCorals.find(mounted => mounted.socketName === 'socket_sps_crest_05')!
    const primaryBinding = primary.materialControllers[0]!
    const scatter = assembly.instancedMeshes.find(mesh => mesh.name.startsWith('instanced_coral-zoanthid-mat_'))!
    const scatterMaterial = scatter.material as THREE.MeshStandardMaterial
    const scatterUniforms = scatterMaterial.userData.coralRawMasks.uniforms

    expect(primary.coralAssetId).toBe(id)
    expect(primaryBinding.material.customProgramCacheKey()).toContain(':baked-pbr')
    expect(scatterMaterial.customProgramCacheKey()).not.toContain(':baked-pbr')
    expect(scatterUniforms.uPaletteBase.value.getHexString()).toBe('d85c84')
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
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(entry => entry.coralAssetId === 'coral-euphyllia-torch') ?? {
      socketName: 'socket_lps_mid_03',
      coralAssetId: 'coral-euphyllia-torch',
      archetype: 'tentaculate-lps' as const,
      yawRad: 0.85,
      scale: 1.45,
    }
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
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS[0]
    const template = templates.get(mount.coralAssetId)!
    const rigid = template.children.find(child =>
      child instanceof THREE.Mesh && child.userData.reefPrimitive?.role === 'coral-rigid',
    ) as THREE.Mesh
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
      [mount],
    )
    const assembledMesh = assembly.mountedCorals[0].root.getObjectByName(rigid.name) as THREE.Mesh
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
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(entry => entry.coralAssetId === 'coral-euphyllia-torch') ?? {
      socketName: 'socket_lps_mid_03',
      coralAssetId: 'coral-euphyllia-torch',
      archetype: 'tentaculate-lps' as const,
      yawRad: 0.85,
      scale: 1.45,
    }
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
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(entry => entry.coralAssetId === 'coral-euphyllia-torch') ?? {
      socketName: 'socket_lps_mid_03',
      coralAssetId: 'coral-euphyllia-torch',
      archetype: 'tentaculate-lps' as const,
      yawRad: 0.85,
      scale: 1.45,
    }
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
    // AQ-82: 7 measured rock parts + 3 tight calcified-base boxes for the
    // branching-SPS crest stalks; the monolithic coral-canopy-crest box is gone.
    expect(leftHabitat.obstacles.length).toBe(10)
    expect(leftHabitat.obstacles.filter(obs => obs.id.includes('coral-canopy-crest'))).toHaveLength(0)
    expect(leftHabitat.obstacles.filter(obs => obs.id.includes('coral-base-'))).toHaveLength(3)
    // AQ-82: 12 socket-derived anchors + 6 ledge anchors (3 grazing + 3 perch) + 1 sand burrow.
    expect(leftHabitat.anchors.length).toBe(19)

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

  it('derives socket anchors from the measured socket reports, not invented positions (AQ-82 AC #2)', () => {
    for (const islandKind of ['left', 'right'] as const) {
      const report = JSON.parse(
        readFileSync(new URL(`../assets/corals/live-rock-island-${islandKind}-socket-report.json`, import.meta.url), 'utf8'),
      )
      const table = SOCKET_ANCHOR_POSITIONS_M[islandKind]
      expect(Object.keys(table).sort()).toEqual(report.supportedSockets.map((socket: { name: string }) => socket.name).sort())
      for (const socket of report.supportedSockets) {
        const [x, y, z] = table[socket.name]!
        expect(Math.abs(x - socket.positionM[0])).toBeLessThan(1e-4)
        expect(Math.abs(y - socket.positionM[1])).toBeLessThan(1e-4)
        expect(Math.abs(z - socket.positionM[2])).toBeLessThan(1e-4)
      }
    }
  })

  it('snapshots frozen copies of mounted root positions without applying parent world transforms', () => {
    const reefRoot = new THREE.Group()
    reefRoot.position.set(8, -3, 5)
    reefRoot.rotation.y = Math.PI / 3
    reefRoot.scale.setScalar(2)
    const coralRoot = new THREE.Group()
    coralRoot.position.set(0.12, 0.34, -0.56)
    reefRoot.add(coralRoot)
    reefRoot.updateMatrixWorld(true)
    const binding = {
      socketName: 'socket_sps_crest_01',
      coralAssetId: 'coral-acropora-staghorn',
      root: coralRoot,
      materialControllers: [],
    }

    const snapshot = snapshotMountedCoralOrigins([binding])
    const worldPosition = coralRoot.getWorldPosition(new THREE.Vector3())
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot[binding.socketName])).toBe(true)
    expect(snapshot[binding.socketName]).toEqual({ x: 0.12, y: 0.34, z: -0.56 })
    expect(worldPosition.distanceTo(coralRoot.position)).toBeGreaterThan(1)

    coralRoot.position.set(1, 2, 3)
    expect(snapshot[binding.socketName]).toEqual({ x: 0.12, y: 0.34, z: -0.56 })
    expect(Object.keys(snapshotMountedCoralOrigins([]))).toEqual([])
  })

  it('rejects invalid mounted-origin names, duplicates, missing entries, and non-finite coordinates', () => {
    const rootAt = (x: number, y = 0, z = 0) => {
      const root = new THREE.Group()
      root.position.set(x, y, z)
      return root
    }
    const binding = (socketName: string, root: THREE.Group) => ({
      socketName,
      coralAssetId: 'coral-acropora-staghorn',
      root,
      materialControllers: [],
    })
    expect(() => snapshotMountedCoralOrigins([binding(' ', rootAt(0))])).toThrow(/non-empty, trimmed/)
    expect(() => snapshotMountedCoralOrigins([
      binding('socket_sps_crest_01', rootAt(0)),
      binding('socket_sps_crest_01', rootAt(1)),
    ])).toThrow(/Duplicate mounted coral socket/)
    expect(() => snapshotMountedCoralOrigins([binding('socket_sps_crest_01', rootAt(Number.NaN))])).toThrow(/finite island-local origin/)

    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(item => item.socketName === 'socket_sps_crest_01')!
    const bounds = { min: { x: -100, y: -100, z: -100 }, max: { x: 100, y: 100, z: 100 } }
    expect(() => instantiateModularReefHabitat('left', 1, { x: 0, y: 0, z: 0 }, 'missing', 0, [mount], bounds, {})).toThrow(/origin.*missing/)
    expect(() => instantiateModularReefHabitat(
      'left', 1, { x: 0, y: 0, z: 0 }, 'nonfinite', 0, [mount], bounds,
      { [mount.socketName]: { x: 0, y: Number.POSITIVE_INFINITY, z: 0 } },
    )).toThrow(/finite island-local origin/)
    expect(() => instantiateModularReefHabitat(
      'left', 1, { x: 0, y: 0, z: 0 }, 'duplicate', 0, [mount, mount], bounds,
      { [mount.socketName]: { x: 0, y: 0, z: 0 } },
    )).toThrow(/Duplicate coral mount socket/)
  })

  it('uses mounted root origins with mount offsets exactly once and preserves canonical defaults', () => {
    const socketName = 'socket_sps_crest_01'
    const mount = {
      ...DEFAULT_LEFT_ISLAND_MOUNTS.find(item => item.socketName === socketName)!,
      offsetM: [0.2, 0.3, 0.4] as const,
    }
    const [canonicalX, canonicalY, canonicalZ] = SOCKET_ANCHOR_POSITIONS_M.left[socketName]!
    const root = new THREE.Group()
    root.position.set(canonicalX + 0.2, canonicalY + 0.3, canonicalZ + 0.4)
    const origins = snapshotMountedCoralOrigins([{
      socketName,
      coralAssetId: mount.coralAssetId,
      root,
      materialControllers: [],
    }])
    const waterBounds = { min: { x: -100, y: -100, z: -100 }, max: { x: 100, y: 100, z: 100 } }
    const actual = instantiateModularReefHabitat('left', 1, { x: 0, y: 0, z: 0 }, 'offset', 0, [mount], waterBounds, origins)
    const legacy = instantiateModularReefHabitat('left', 1, { x: 0, y: 0, z: 0 }, 'offset', 0, [mount], waterBounds)
    const actualBase = actual.obstacles.find(item => item.id === 'offset-coral-base-socket_sps_crest_01')!
    const legacyBase = legacy.obstacles.find(item => item.id === 'offset-coral-base-socket_sps_crest_01')!
    expect(actualBase.bounds.min).toEqual({ x: root.position.x - 0.07, y: root.position.y, z: root.position.z - 0.07 })
    expect(legacyBase.bounds.min).toEqual({ x: canonicalX - 0.07, y: canonicalY, z: canonicalZ - 0.07 })

    const shelter = actual.anchors.find(item => item.anchor === 'branchingCoralShelter')!
    expect(shelter.position).toEqual({ x: root.position.x, y: root.position.y + 0.17, z: root.position.z })
    const legacyShelter = legacy.anchors.find(item => item.anchor === 'branchingCoralShelter')!
    expect(legacyShelter.position).toEqual({ x: canonicalX + 0.2, y: canonicalY + 0.3 + 0.17, z: canonicalZ + 0.4 })
  })

  it('uses mounted origins from the current runtime GLB when they differ from canonical socket reports', () => {
    const rock = buildRockFixtureFromRuntimeGlb()
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(item => item.socketName === 'socket_sps_crest_03')!
    const assembly = assembleCoralsOnRockSockets(rock, buildMockCoralTemplates(), [mount])
    const binding = assembly.mountedCorals[0]!
    const origins = snapshotMountedCoralOrigins(assembly.mountedCorals)
    const canonical = SOCKET_ANCHOR_POSITIONS_M.left[mount.socketName]!
    expect(Math.abs(origins[mount.socketName]!.y - canonical[1])).toBeGreaterThan(0.1)
    expect(origins[mount.socketName]!.y).toBeCloseTo(binding.root.position.y, 7)

    const waterBounds = { min: { x: -100, y: -100, z: -100 }, max: { x: 100, y: 100, z: 100 } }
    const habitat = instantiateModularReefHabitat(
      'left', 1, { x: 0, y: 0, z: 0 }, 'runtime-glb', 0, [mount], waterBounds, origins,
    )
    const base = habitat.obstacles.find(item => item.id === `runtime-glb-coral-base-${mount.socketName}`)!
    expect(base.bounds.min.y).toBeCloseTo(binding.root.position.y, 7)
    expect(base.bounds.max.y).toBeCloseTo(binding.root.position.y + 0.06, 7)
    const refuge = habitat.anchors.find(item => item.anchor === 'branchingCoralRefuge')!
    expect(refuge.position.y).toBeCloseTo(binding.root.position.y + 0.12, 7)
    expect(refuge.position.z).toBeCloseTo(binding.root.position.z - 0.03, 7)
  })

  it('keeps mounted-origin refuge anchors aligned at two scaled and yawed scene placements', () => {
    const mount = DEFAULT_LEFT_ISLAND_MOUNTS.find(item => item.socketName === 'socket_sps_crest_03')!
    const waterBounds = { min: { x: -100, y: -100, z: -100 }, max: { x: 100, y: 100, z: 100 } }
    const placements = [
      { scale: 1.6, yaw: 0.14, position: new THREE.Vector3(-2.35, -2.7, -1.35) },
      { scale: 1.35, yaw: -0.21, position: new THREE.Vector3(2.65, -2.7, -1.2) },
    ]

    for (const [index, placement] of placements.entries()) {
      const rock = buildRockFixtureFromRuntimeGlb()
      rock.position.copy(placement.position)
      rock.rotation.y = placement.yaw
      rock.scale.setScalar(placement.scale)
      const assembly = assembleCoralsOnRockSockets(rock, buildMockCoralTemplates(), [mount])
      const binding = assembly.mountedCorals[0]!
      const mountedOrigins = snapshotMountedCoralOrigins(assembly.mountedCorals)
      const habitat = instantiateModularReefHabitat(
        'left', placement.scale, placement.position, `viewport-${index}`, placement.yaw,
        [mount], waterBounds, mountedOrigins,
      )
      const refuge = habitat.anchors.find(item => item.anchor === 'branchingCoralRefuge')!
      const expected = binding.root.getWorldPosition(new THREE.Vector3())
      const parentWorldQuaternion = rock.getWorldQuaternion(new THREE.Quaternion())
      expected.add(new THREE.Vector3(0, 0.12, -0.03).applyQuaternion(parentWorldQuaternion).multiplyScalar(placement.scale))
      expect(new THREE.Vector3(refuge.position.x, refuge.position.y, refuge.position.z).distanceTo(expected)).toBeLessThan(1e-6)
    }
  })

  it('builds a rigid base for an explicitly mounted SPS socket outside the canonical table', () => {
    const mount = {
      socketName: 'socket_sps_crest_07',
      coralAssetId: 'coral-acropora-staghorn',
      archetype: 'branching-sps' as const,
      yawRad: 0,
      scale: 1,
    }
    const origin = { x: 0.4, y: 0.5, z: -0.2 }
    const habitat = instantiateModularReefHabitat(
      'left', 1, { x: 0, y: 0, z: 0 }, 'future-sps', 0, [mount],
      { min: { x: -100, y: -100, z: -100 }, max: { x: 100, y: 100, z: 100 } },
      { [mount.socketName]: origin },
    )
    const base = habitat.obstacles.find(item => item.id === 'future-sps-coral-base-socket_sps_crest_07')!
    expect(base.bounds.min).toEqual({ x: origin.x - 0.07, y: origin.y, z: origin.z - 0.07 })
    expect(base.bounds.max).toEqual({ x: origin.x + 0.07, y: origin.y + 0.06, z: origin.z + 0.07 })
    expect(habitat.anchors.some(item => item.id.includes('socket_sps_crest_07'))).toBe(false)
  })

  it('emits typed socket-derived anchors for every interaction kind and no unmounted socket (AQ-82 AC #2)', () => {
    const leftHabitat = instantiateModularReefHabitat('left', 4.5, { x: -2.35, y: -2.7, z: -1.35 }, 'reef-0', 0.08)
    const rightHabitat = instantiateModularReefHabitat('right', 4.3, { x: 2.65, y: -2.7, z: -1.2 }, 'reef-1', -0.1)
    expect(rightHabitat.obstacles.length).toBe(4)
    expect(rightHabitat.anchors.length).toBe(18)
    const all = [...leftHabitat.anchors, ...rightHabitat.anchors]
    const byType = (anchor: string) => all.filter(item => item.anchor === anchor)
    expect(byType('hostAnemone')).toHaveLength(1)
    expect(byType('hostAnemone')[0]!.id).toContain('socket_anemone_crevice_01')
    expect(byType('branchingCoralShelter')).toHaveLength(6)
    expect(byType('branchingCoralRefuge')).toHaveLength(6)
    expect(byType('foragingPatch')).toHaveLength(10)
    expect(byType('grazingSurface')).toHaveLength(6)
    expect(byType('rockPerch')).toHaveLength(6)
    expect(byType('sandBurrowEntrance')).toHaveLength(2)
    // Every listed species is profile-compatible with its anchor (never a substituted type).
    for (const anchor of all) {
      expect(anchor.compatibleSpecies!.length).toBeGreaterThan(0)
      for (const species of anchor.compatibleSpecies!) {
        expect(isSpeciesCompatibleWithAnchor(species, anchor)).toBe(true)
      }
    }
    // An unmounted socket is a bare rock feature, not a coral interaction:
    // with no mounts, only the ledge + burrow anchors remain.
    const bare = instantiateModularReefHabitat('left', 4.5, { x: -2.35, y: -2.7, z: -1.35 }, 'reef-0', 0.08, [])
    expect(bare.obstacles.length).toBe(7)
    expect(bare.anchors.length).toBe(7)
    expect(bare.anchors.every(item => item.anchor === 'grazingSurface' || item.anchor === 'rockPerch' || item.anchor === 'sandBurrowEntrance')).toBe(true)
  })

  it('keeps every derived anchor a safe point under reduced anchor-approach clearance at desktop and mobile placements (AQ-82 AC #1/#3)', () => {
    const placements = [
      instantiateModularReefHabitat('left', 4.5, { x: -2.35, y: -2.7, z: -1.35 }, 'reef-0', 0.08),
      instantiateModularReefHabitat('right', 4.3, { x: 2.65, y: -2.7, z: -1.2 }, 'reef-1', -0.1),
      instantiateModularReefHabitat('left', 3.4, { x: -0.15, y: -2.7, z: -1.35 }, 'reef-0', 0.06),
    ]
    for (const habitat of placements) {
      for (const anchor of habitat.anchors) {
        // Ledge grazing/perch anchors are the documented exception: they
        // hover 0.60 m above the ledge inside the coral canopy (and inside
        // the expanded rock AABB) by design — pinned by
        // reef-mesh-navigation.test.ts — so AABB routing approaches them
        // via the interaction offset rather than onto them.
        if (anchor.anchor === 'grazingSurface' || anchor.anchor === 'rockPerch') continue
        // Reduced clearance is per-species; the anchor must be reachable by
        // its largest compatible species (body radius + 0.03 margin).
        const clearance = Math.max(...anchor.compatibleSpecies!.map(species => fishBodyRadiusM(species))) + 0.03
        expect(
          isWaterSegmentSafe({
            start: anchor.position,
            target: anchor.position,
            waterBounds: AQUARIUM_WATER_BOUNDS,
            obstacles: habitat.obstacles,
            fishClearanceRadius: clearance,
          }),
        ).toBe(true)
      }
    }
    // Combined desktop habitat: anchors must also clear the other island.
    const combined = {
      obstacles: [...placements[0]!.obstacles, ...placements[1]!.obstacles],
      anchors: [...placements[0]!.anchors, ...placements[1]!.anchors],
    }
    expect(combined.obstacles.length).toBeLessThanOrEqual(32)
    expect(combined.anchors.length).toBeLessThanOrEqual(128)
    for (const anchor of combined.anchors) {
      if (anchor.anchor === 'grazingSurface' || anchor.anchor === 'rockPerch') continue
      const clearance = Math.max(...anchor.compatibleSpecies!.map(species => fishBodyRadiusM(species))) + 0.03
      expect(
        isWaterSegmentSafe({
          start: anchor.position,
          target: anchor.position,
          waterBounds: AQUARIUM_WATER_BOUNDS,
          obstacles: combined.obstacles,
          fishClearanceRadius: clearance,
        }),
      ).toBe(true)
    }
  })

  it('clamps outer-socket anchors into the swimming volume instead of emitting unreachable ones (AQ-82)', () => {
    const leftHabitat = instantiateModularReefHabitat('left', 4.5, { x: -2.35, y: -2.7, z: -1.35 }, 'reef-0', 0.08)
    const rightHabitat = instantiateModularReefHabitat('right', 4.3, { x: 2.65, y: -2.7, z: -1.2 }, 'reef-1', -0.1)
    const leftPlate = leftHabitat.anchors.find(item => item.id.includes('socket_plate_ledge_01'))!
    const rightPlate = rightHabitat.anchors.find(item => item.id.includes('socket_plate_ledge_04'))!
    // The islands extend past the tank walls; the clamp keeps the anchor
    // inside by the largest anchor-approach clearance (0.08 + 0.03).
    expect(leftPlate.position.x).toBeCloseTo(AQUARIUM_WATER_BOUNDS.min.x + 0.11, 6)
    expect(rightPlate.position.x).toBeCloseTo(AQUARIUM_WATER_BOUNDS.max.x - 0.11, 6)
    const burrow = leftHabitat.anchors.find(item => item.anchor === 'sandBurrowEntrance')!
    expect(burrow.position.y).toBeCloseTo(-2.13, 6)
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

  it('defines the modular coral variation library (4 branching, 3 plating, 3 fleshy LPS, 2 colonial polyps, 2 brain, 2 encrusting) with controlled hues and THREE.InstancedMesh scatter (AQ-95)', () => {
    const byFamily = (family: string) => MODULAR_CORAL_VARIATION_LIBRARY.filter(v => v.family === family)
    expect(byFamily('branching')).toHaveLength(4)
    expect(byFamily('plating')).toHaveLength(3)
    expect(byFamily('fleshy-lps')).toHaveLength(3)
    expect(byFamily('colonial-polyp')).toHaveLength(2)
    expect(byFamily('brain')).toHaveLength(2)
    expect(byFamily('encrusting')).toHaveLength(2)

    const validHues = new Set(['violet', 'teal', 'green', 'peach'])
    const validRims = new Set(Object.keys(ACTINIC_RIM_TINT_HEX))
    for (const variation of MODULAR_CORAL_VARIATION_LIBRARY) {
      expect(validHues.has(variation.dominantHue)).toBe(true)
      expect(validRims.has(variation.actinicRimTint)).toBe(true)
      expect(variation.morphology.length).toBeGreaterThan(15)
    }
    const fluorescent = MODULAR_CORAL_VARIATION_LIBRARY.filter(v => v.isFluorescentSpecimen)
    expect(fluorescent.length).toBeGreaterThanOrEqual(3)
    expect(fluorescent.length).toBeLessThan(MODULAR_CORAL_VARIATION_LIBRARY.length)

    const templates = buildMockCoralTemplates()
    const leftRock = buildRockFixtureFromSocketReport('live-rock-island-left-socket-report.json')
    const assembly = assembleCoralsOnRockSockets(leftRock, templates, DEFAULT_LEFT_ISLAND_MOUNTS)
    expect(assembly.instancedMeshes.length).toBeGreaterThan(0)
    const totalInstances = assembly.instancedMeshes.reduce((sum, mesh) => sum + mesh.count, 0)
    expect(totalInstances).toBe(DEFAULT_LEFT_ISLAND_MOUNTS.length)
    for (const instanced of assembly.instancedMeshes) {
      expect(instanced).toBeInstanceOf(THREE.InstancedMesh)
      const m0 = new THREE.Matrix4()
      instanced.getMatrixAt(0, m0)
      expect(m0.elements.every(Number.isFinite)).toBe(true)
    }
  })
})
