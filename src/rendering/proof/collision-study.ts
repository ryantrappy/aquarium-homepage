import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildMeshCollider, queryMeshCapsule } from '../../simulation/mesh-collision'
import { findMeshRoute } from '../../simulation/mesh-navigation'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import type { Vec3 } from '../../simulation/habitat-navigation'

// A captured exact-geometry fixture, not production art or a fish envelope.
const expectedHash = '2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c'
const expectedFixtureHash = '77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612'
const expectedPayloadHash = '8c1d4c9c89f2bab90f6fda4f9d45c3d2c65e4f29ded3c70a552a4843c3c41a2b'
const canvas = document.querySelector('canvas')!
const output = document.querySelector('output')!
const runButton = document.querySelector<HTMLButtonElement>('#run')!
const pauseButton = document.querySelector<HTMLButtonElement>('#pause')!
const radiusSelect = document.querySelector<HTMLSelectElement>('#radius')!
const routeSelect = document.querySelector<HTMLSelectElement>('#route')!
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene()
scene.background = new THREE.Color('#173e49')
scene.add(new THREE.HemisphereLight(0xe0f5ff, 0x584a39, 2))
const light = new THREE.DirectionalLight(0xffffff, 3)
light.position.set(-1, 2, 3)
scene.add(light)
const camera = new THREE.PerspectiveCamera(42, 1, .001, 20)
camera.position.set(.9, .65, 1.5)
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, .15, 0)
controls.minDistance = .3
controls.maxDistance = 4
controls.update()
const visualRoute = new THREE.Group()
scene.add(visualRoute)
let collider: Parameters<typeof queryMeshCapsule>[0] | undefined
let path: readonly Vec3[] = []
let probe: THREE.Mesh | undefined
let paused = false
let progress = 0
let previousTime = 0
let buildMs = 0

function resize() {
  renderer.setSize(innerWidth, innerHeight, false)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  const distanceToFit = Math.max(1.8, 1.2 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect))
  camera.position.copy(controls.target).add(new THREE.Vector3(.9, .5, 1.5).normalize().multiplyScalar(distanceToFit))
  controls.update()
}
addEventListener('resize', resize)
resize()

function clearRoute() {
  visualRoute.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose()
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
    }
  })
  visualRoute.clear()
  path = []
  probe = undefined
}

function checkRoute() {
  if (!collider) return
  clearRoute()
  const radiusM = Number(radiusSelect.value)
  const start = routeSelect.value === 'cave' ? { x: 0, y: .08, z: -.38 } : { x: -.6, y: .1, z: -.35 }
  const target = routeSelect.value === 'cave' ? { x: 0, y: .08, z: .38 } : { x: .6, y: .1, z: .35 }
  const query = createMeshClearanceQuery([collider])
  const direct = query(start, target, radiusM, { maxNodeVisits: 4096, maxTriangleTests: 8192 })
  const began = performance.now()
  const result = findMeshRoute({
    start, target, fishClearanceRadius: radiusM, spacingM: .07,
    waterBounds: { min: { x: -.75, y: -.012, z: -.55 }, max: { x: .75, y: .6, z: .55 } },
    queryCapsule: query,
    budget: { maxLatticeNodes: 4096, maxExpandedNodes: 2048, maxCollisionQueries: 10_000, maxNodeVisits: 200_000, maxTriangleTests: 500_000 },
  })
  const routeMs = performance.now() - began
  if (result.status === 'route') {
    path = result.path
    const geometry = new THREE.BufferGeometry().setFromPoints(path.map(point => new THREE.Vector3(point.x, point.y, point.z)))
    visualRoute.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x8dffbe, depthTest: true })))
    probe = new THREE.Mesh(new THREE.SphereGeometry(radiusM, 24, 16), new THREE.MeshStandardMaterial({ color: 0x75f0ae, roughness: .5 }))
    visualRoute.add(probe)
    progress = 0
  }
  const reason = 'reason' in result ? ` (${result.reason})` : ''
  output.textContent = `Captured source: ${expectedHash}\nDirect capsule: ${direct.status}\n3D route: ${result.status}${reason}\nBuild: ${buildMs.toFixed(1)} ms; route: ${routeMs.toFixed(1)} ms\n${result.work.collisionQueries} queries; ${result.work.nodeVisits} BVH visits; ${result.work.triangleTests} triangle tests\nFixed ${radiusM * 1000} mm probe only; no animated-fish or final-art approval.`
}
runButton.addEventListener('click', checkRoute)
pauseButton.addEventListener('click', () => {
  paused = !paused
  pauseButton.textContent = paused ? 'Resume probe' : 'Pause probe'
})

function frame(time: number) {
  const dt = previousTime ? Math.min(.05, Math.max(0, (time - previousTime) / 1000)) : 0
  previousTime = time
  if (probe && path.length) {
    const lengths = path.slice(1).map((point, index) => Math.hypot(point.x - path[index].x, point.y - path[index].y, point.z - path[index].z))
    const total = lengths.reduce((sum, value) => sum + value, 0)
    if (!paused && !matchMedia('(prefers-reduced-motion: reduce)').matches && total > 0) progress = (progress + dt * .08) % total
    let remaining = progress
    let point = path[0]
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i]) {
        const t = lengths[i] ? remaining / lengths[i] : 0
        point = { x: path[i].x + (path[i + 1].x - path[i].x) * t, y: path[i].y + (path[i + 1].y - path[i].y) * t, z: path[i].z + (path[i + 1].z - path[i].z) * t }
        break
      }
      remaining -= lengths[i]
    }
    probe.position.set(point.x, point.y, point.z)
  }
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

async function load() {
  const response = await fetch(new URL('../../../docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz', import.meta.url))
  if (!response.ok) throw new Error(`Fixture response ${response.status}`)
  const bytes = await response.arrayBuffer()
  const digest = async (buffer: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(value => value.toString(16).padStart(2, '0')).join('')
  // HTTP Content-Encoding may already have decoded gzip before fetch exposes it.
  let payload = bytes
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength))
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    if (await digest(bytes) !== expectedFixtureHash) throw new Error('Fixture bytes changed; a fresh review is required.')
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decode the review fixture.')
    payload = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  if (await digest(payload) !== expectedPayloadHash) throw new Error('Fixture payload changed; a fresh review is required.')
  const fixture = JSON.parse(new TextDecoder().decode(payload)) as {
    schema: string; sourceSha256: string; units: string; upAxis: string; coordinateSpace: string
    positions: Array<[number, number, number]>; triangles: Array<[number, number, number]>
  }
  if (fixture.schema !== 'rock-collision-geometry-fixture-v1' || fixture.sourceSha256 !== expectedHash
    || fixture.units !== 'meter' || fixture.upAxis !== '+Y' || fixture.coordinateSpace !== 'world'
    || fixture.positions.length !== 12_288 || fixture.triangles.length !== 24_572) throw new Error('Unsupported pinned fixture scope.')
  const positions = fixture.positions.map(p => ({ x: p[0], y: p[1], z: p[2] }))
  const triangles = fixture.triangles.map(([a, b, c]) => ({ a: positions[a], b: positions[b], c: positions[c] }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(fixture.positions.flat(), 3))
  geometry.setIndex(fixture.triangles.flat())
  geometry.computeVertexNormals()
  scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#aaa69a', roughness: 1 })))
  const began = performance.now()
  const built = buildMeshCollider({ id: 'aq58-pinned-left-proof', sourceSha256: fixture.sourceSha256, units: 'meter', upAxis: '+Y', coordinateSpace: 'world', triangles })
  buildMs = performance.now() - began
  if (built.status !== 'ready') throw new Error(`Collision source unavailable: ${built.reason}`)
  collider = built.collider
  runButton.disabled = false
  checkRoute()
}
load().catch(error => { output.textContent = `Review unavailable: ${error instanceof Error ? error.message : String(error)}` })
