import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { describe, expect, it, vi } from 'vitest'
import { AQUARIUM_WATER_BOUNDS, assembleCoralsOnRockSockets, MODULAR_CORAL_ASSET_URLS } from './reef-assembly'
import {
  NSA_MODULE_MOUNTS,
  NSA_KIT_URL,
  NSA_ROCK_URLS,
  NSA_SUBSTRATE_CONTACTS,
  RUBBLE_TALUS_URL,
  createRubbleTalusGroundingAprons,
  createNsaReviewReef,
  disposeRubbleTalusMaterials,
  rubbleTalusPlacementsForViewport,
} from './reef-nsa'
import { createReefMeshNavigation, MESH_NAVIGATION_MOVEMENT_BUDGET, segmentIntersectsInflatedBox } from './reef-mesh-navigation'
import { resolveNsaMorayResidence, SNOWFLAKE_MORAY_HEAD_COLLISION_RADIUS_M } from './moray-residence'
import { createAragoniteSandBed, evaluateAragoniteSandWorldY, evaluateRockBaseContactFactor } from './aragonite-sand'
import { mountedAnemoneHosts } from './anemone-host'
import { createSwimmingFish, distance, stepSwimmingFish } from './motion'
import { analyzeFishClipEnvelope } from '../assets/fish-clip-envelope'
import { fishRenderLength, MODEL_SWIM_AXIS_LENGTH } from './fish-scale'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('AQ-94 NSA modular rock library & rubble-talus grounding', () => {
  it('loads the shared-atlas kit and assembles exact module collision in the review layout', async () => {
    const bytes = readFileSync(new URL(NSA_KIT_URL))
    expect(bytes.byteLength).toBeLessThan(5_000_000)
    const document = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
    expect(document.images).toHaveLength(3)
    const loader = new GLTFLoader().register(parser => ({
      name: 'reef-kit-test-geometry',
      loadMaterial: async (index: number) => {
        // Keep authored collision roles while skipping image decoding in Node.
        const material = new THREE.MeshStandardMaterial()
        material.userData = parser.json.materials[index].extras ?? {}
        return material
      },
    }))
    const { scene } = await loader.parseAsync(Uint8Array.from(bytes).buffer, '')
    expect(scene.children.map(node => node.name).sort()).toEqual(Object.keys(NSA_ROCK_URLS).sort())
    const placements = createNsaReviewReef(scene)
    expect(placements).toHaveLength(7)
    for (const { reef, mounts } of placements) {
      for (const mount of mounts) expect(reef.getObjectByName(mount.socketName), mount.socketName).toBeDefined()
    }
    const templates = new Map<string, THREE.Object3D>()
    for (const id of new Set(placements.flatMap(({ mounts }) => mounts.map(mount => mount.coralAssetId)))) {
      const model = readFileSync(new URL(MODULAR_CORAL_ASSET_URLS[id]))
      const { scene: template } = await loader.parseAsync(Uint8Array.from(model).buffer, '')
      templates.set(id, template)
    }
    const assemblies = placements.map(({ reef, islandId, mounts }) => ({
      reef, islandId,
      mountedCorals: assembleCoralsOnRockSockets(reef, templates, mounts, { preserveAuthoredRock: true, includeScatter: false }).mountedCorals,
    }))
    expect(assemblies.flatMap(assembly => assembly.mountedCorals)).toHaveLength(13)
    const result = await createReefMeshNavigation(assemblies)
    expect(result.status, JSON.stringify(result.diagnostics)).toBe('ready')
    if (result.status !== 'ready') return
    const query = result.meshNavigation.queryCapsule!
    expect(query({ x: -.2, y: -1.95, z: -3.8 }, { x: -.2, y: -1.95, z: 1.9 }, .04, MESH_NAVIGATION_MOVEMENT_BUDGET).status).toBe('clear')

    const hosts = assemblies.flatMap(({ mountedCorals, islandId }) => mountedAnemoneHosts(mountedCorals, islandId))
    expect(hosts).toHaveLength(1)
    const [host] = hosts
    expect(host.id).toBe('reef-nsa-cave-buttress-anchor-socket_lps_mid_22-hostAnemone')
    expect(host.compatibleSpecies).toEqual(['ocellaris-clownfish'])
    const resident = result.meshNavigation.queryCapsuleForSpecies!['ocellaris-clownfish']!
    const approach = { ...host.position, z: host.position.z + .45 }
    expect(query(host.position, host.position, .04, MESH_NAVIGATION_MOVEMENT_BUDGET).status).toBe('blocked')
    expect(resident(approach, host.position, .04, MESH_NAVIGATION_MOVEMENT_BUDGET).status).toBe('clear')

    const species = 'ocellaris-clownfish'
    const halfAxis = .16
    const envelope = analyzeFishClipEnvelope(readFileSync(new URL('../assets/fish/download_testing_copies/clownfish-copy.glb', import.meta.url)), {
      expectedSha256: 'be6e9cbd2b5b6a76d5204f3a140ae7538a0115e6a067dcbabd0dfd1a273db7ac',
      clipName: 'clownfish_subcarangiform_swim',
      adultLengthM: fishRenderLength(species),
      sourceReference: { lengthAxis: '+Z', lengthM: MODEL_SWIM_AXIS_LENGTH[species], authority: 'AQ-58 runtime scene scale fixture' },
      composition: 'single-clip',
      capsuleHalfAxisM: halfAxis,
    })
    if (envelope.status !== 'ready') throw new Error(envelope.reason)
    // The Z-aligned body translates straight in over this interval, so its
    // swept volume is one capsule spanning the nearest and farthest endpoints.
    const nearBodyEnd = { ...host.position, z: host.position.z + .24 - halfAxis }
    const farBodyEnd = { ...approach, z: approach.z + halfAxis }
    expect(resident(nearBodyEnd, farBodyEnd, envelope.activeEnvelope.capsule!.radiusM, MESH_NAVIGATION_MOVEMENT_BUDGET).status).toBe('clear')

    const habitat = { bounds: AQUARIUM_WATER_BOUNDS, obstacles: [], anchors: hosts, meshNavigation: result.meshNavigation }
    const clownfish = createSwimmingFish('modular-clownfish', species, approach, .5, undefined, { collisionRadiusM: .04 })
    const heights: number[] = []
    for (let frame = 0; frame < 1200; frame++) {
      const before = { ...clownfish.position }
      stepSwimmingFish(clownfish, habitat, 1 / 30)
      expect(resident(before, clownfish.position, .04, MESH_NAVIGATION_MOVEMENT_BUDGET).status).toBe('clear')
      if (frame >= 600) {
        expect(distance(clownfish.position, host.position)).toBeLessThan(.8)
        heights.push(clownfish.position.y)
      }
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(.015)

    const readyIds = new Set(result.diagnostics.islands.map(island => island.islandId))
    const moray = resolveNsaMorayResidence(false, readyIds)!
    const radius = SNOWFLAKE_MORAY_HEAD_COLLISION_RADIUS_M
    expect(query(moray.headAxisStart, moray.headAxisEnd, radius, MESH_NAVIGATION_MOVEMENT_BUDGET).status).toBe('clear')
    for (const point of [moray.headAxisStart, moray.headAxisEnd]) {
      expect(point.y - radius - evaluateAragoniteSandWorldY(point.x, point.z, false, NSA_SUBSTRATE_CONTACTS)).toBeGreaterThan(.13)
    }
    const rubble = createRubbleTalusGroundingAprons(scene.getObjectByName('reef-nsa-rubble-talus')!, false, true)
    try {
      for (const piece of rubble.children) {
        const bounds = new THREE.Box3().setFromObject(piece)
        expect(segmentIntersectsInflatedBox(moray.headAxisStart, moray.headAxisEnd, bounds, radius)).toBe(false)
        const floorY = evaluateAragoniteSandWorldY(piece.position.x, piece.position.z, false, NSA_SUBSTRATE_CONTACTS)
        expect(bounds.min.y).toBeLessThan(floorY)
        expect(bounds.max.y).toBeGreaterThan(floorY)
        expect(bounds.max.y).toBeLessThan(AQUARIUM_WATER_BOUNDS.min.y)
      }
    } finally {
      disposeRubbleTalusMaterials(rubble)
    }
    const sand = createAragoniteSandBed({ textureSize: 32, contactFootprints: NSA_SUBSTRATE_CONTACTS })
    try {
      const y = sand.sandMesh.position.y
      const z = sand.sandMesh.position.z
      const vertices = sand.sandMesh.geometry.getAttribute('position')
      for (let i = 0; i < vertices.count; i += 17) {
        const height = y + vertices.getZ(i)
        expect(height).toBeCloseTo(evaluateAragoniteSandWorldY(vertices.getX(i), z - vertices.getY(i), false, NSA_SUBSTRATE_CONTACTS), 5)
        expect(height).toBeLessThan(AQUARIUM_WATER_BOUNDS.min.y)
      }
      const arch = placements.find(({ islandId }) => islandId === 'reef-nsa-high-arch-span')!.reef
      for (const { x, z } of NSA_SUBSTRATE_CONTACTS.slice(1, 3)) {
        const pier = new THREE.Raycaster(new THREE.Vector3(x, -2.9, z), new THREE.Vector3(0, 1, 0), 0, .35)
        expect(pier.intersectObject(arch, true).length).toBeGreaterThan(0)
      }
      expect(evaluateRockBaseContactFactor(-.2, -2.2, false, NSA_SUBSTRATE_CONTACTS)).toBeGreaterThan(.88)
      const matrix = new THREE.Matrix4()
      const position = new THREE.Vector3()
      const scale = new THREE.Vector3()
      let largestShell = 0
      for (let i = 0; i < sand.shellInstances.count; i++) {
        sand.shellInstances.getMatrixAt(i, matrix)
        matrix.decompose(position, new THREE.Quaternion(), scale)
        const floorY = evaluateAragoniteSandWorldY(position.x, position.z, false, NSA_SUBSTRATE_CONTACTS)
        expect(position.y - floorY).toBeCloseTo(.002, 5)
        largestShell = Math.max(largestShell, scale.x)
      }
      expect(largestShell).toBeGreaterThan(.012)
    } finally {
      sand.dispose()
    }
    const camera = new THREE.Vector3(0, .15, 9)
    function isVisible(point: { x: number; y: number; z: number }) {
      const direction = new THREE.Vector3(point.x, point.y, point.z).sub(camera)
      const ray = new THREE.Raycaster(camera, direction.clone().normalize(), 0, direction.length() - .03)
      return ray.intersectObjects(placements.map(item => item.reef), true).length === 0
    }
    expect(isVisible(moray.headAxisStart)).toBe(true)
    expect(isVisible(moray.headAxisEnd)).toBe(true)
    for (const x of [-.075, 0, .075]) {
      for (const y of [-.075, .08]) {
        expect(isVisible({ x: moray.position.x + x, y: moray.position.y + y, z: moray.position.z })).toBe(false)
      }
    }
  }, 20_000)

  it('resolves all 7 NSA module URLs on disk and keeps combined live runtime rock GLBs under 5 MB', () => {
    expect(Object.keys(NSA_ROCK_URLS)).toHaveLength(7)
    for (const url of Object.values(NSA_ROCK_URLS)) {
      const filePath = fileURLToPath(url)
      expect(existsSync(filePath), `missing ${filePath}`).toBe(true)
    }
    expect(RUBBLE_TALUS_URL).toBe(NSA_ROCK_URLS['reef-nsa-rubble-talus'])

    const liveRuntimeRockGlbs = [
      path.join(repoRoot, 'src/rendering/assets/corals/reef-full-model-left.glb'),
      path.join(repoRoot, 'src/rendering/assets/corals/reef-full-model-right.glb'),
      path.join(repoRoot, 'src/rendering/assets/corals/custom-rocks/reef-center-arch.glb'),
      fileURLToPath(RUBBLE_TALUS_URL),
    ]
    const totalLiveBytes = liveRuntimeRockGlbs.reduce((sum, file) => sum + statSync(file).size, 0)
    expect(totalLiveBytes).toBeLessThan(5_000_000)
  })

  it('aligns NSA_MODULE_MOUNTS sockets and archetypes with checked-in custom-rocks inspections', () => {
    for (const [moduleId, mounts] of Object.entries(NSA_MODULE_MOUNTS)) {
      const inspectionPath = path.join(repoRoot, 'src/rendering/assets/corals/custom-rocks', `${moduleId}-inspection.json`)
      const inspection = JSON.parse(readFileSync(inspectionPath, 'utf8')) as {
        sockets: Array<{ name: string; archetype: string }>
      }
      const bySocket = new Map(inspection.sockets.map((socket) => [socket.name, socket.archetype]))
      expect(mounts.length).toBeGreaterThanOrEqual(1)
      for (const mount of mounts) {
        expect(bySocket.get(mount.socketName), `${moduleId}:${mount.socketName}`).toBe(mount.archetype)
        expect(MODULAR_CORAL_ASSET_URLS[mount.coralAssetId], mount.coralAssetId).toBeDefined()
        expect(mount.paletteOverride?.surfaceMode).toBe('baked-pbr')
        if (mount.rigidPaletteOverride) {
          expect(mount.rigidPaletteOverride.surfaceMode).toBe('baked-pbr')
          expect(mount.rigidPaletteOverride.fluorescenceStrength).toBe(0)
        }
      }
    }
  })

  it('creates 6 desktop and 2 phone non-pickable grounded aprons below habitat floor and disposes cloned materials only', () => {
    const sourceRoot = new THREE.Group()
    const sourceGeometry = new THREE.BoxGeometry(0.39, 0.094, 0.27)
    const sourceTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    const sourceMaterial = new THREE.MeshStandardMaterial({ map: sourceTexture })
    const sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial)
    sourceRoot.add(sourceMesh)

    const sourceGeoSpy = vi.spyOn(sourceGeometry, 'dispose')
    const sourceMatSpy = vi.spyOn(sourceMaterial, 'dispose')
    const sourceTexSpy = vi.spyOn(sourceTexture, 'dispose')

    const desktopGroup = createRubbleTalusGroundingAprons(sourceRoot, false)
    const phoneGroup = createRubbleTalusGroundingAprons(sourceRoot, true)

    expect(desktopGroup.name).toBe('reef-nsa-rubble-talus-grounding')
    expect(desktopGroup.children).toHaveLength(6)
    expect(phoneGroup.children).toHaveLength(2)

    for (const [narrow, group] of [
      [false, desktopGroup],
      [true, phoneGroup],
    ] as const) {
      const placements = rubbleTalusPlacementsForViewport(narrow)
      group.children.forEach((child, idx) => {
        const apronTopY = child.position.y + 0.094 * placements[idx]!.scale
        expect(apronTopY).toBeLessThan(-2.25)
        child.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return
          expect(node.castShadow).toBe(true)
          expect(node.receiveShadow).toBe(true)
          expect(node.material).not.toBe(sourceMaterial)
          const hits: THREE.Intersection[] = []
          node.raycast(new THREE.Raycaster(), hits)
          expect(hits).toEqual([])
        })
      })
    }

    const clonedMaterialSpies: ReturnType<typeof vi.spyOn>[] = []
    desktopGroup.traverse((node) => {
      if (node instanceof THREE.Mesh) clonedMaterialSpies.push(vi.spyOn(node.material as THREE.Material, 'dispose'))
    })

    disposeRubbleTalusMaterials(desktopGroup)
    disposeRubbleTalusMaterials(phoneGroup)

    for (const spy of clonedMaterialSpies) expect(spy).toHaveBeenCalledTimes(1)
    expect(sourceGeoSpy).not.toHaveBeenCalled()
    expect(sourceMatSpy).not.toHaveBeenCalled()
    expect(sourceTexSpy).not.toHaveBeenCalled()
  })
})
