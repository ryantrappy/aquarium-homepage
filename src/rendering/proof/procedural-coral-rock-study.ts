import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const canvas = document.querySelector<HTMLCanvasElement>('#coral-canvas')!
const output = document.querySelector<HTMLOutputElement>('#study-output')!
const lightingBtn = document.querySelector<HTMLButtonElement>('#toggle-lighting')!
const rotateBtn = document.querySelector<HTMLButtonElement>('#toggle-rotate')!
const wireframeBtn = document.querySelector<HTMLButtonElement>('#toggle-wireframe')!

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15

const scene = new THREE.Scene()
scene.background = new THREE.Color('#42566e')

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50)
camera.position.set(0, 0.65, 3.1)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

const blueKey = new THREE.DirectionalLight('#3b9eff', 3.4)
blueKey.position.set(-4.2, 3.2, 2.8)
scene.add(blueKey)

const warmRim = new THREE.DirectionalLight('#fff0c7', 2.4)
warmRim.position.set(4.0, 1.8, 1.6)
scene.add(warmRim)

const bounceHemi = new THREE.HemisphereLight('#8cb8db', '#1461d8', 1.35)
scene.add(bounceHemi)

const rootGroup = new THREE.Group()
scene.add(rootGroup)

let autoRotate = true
let studioMode = true
let wireframe = false
const meshes: THREE.Mesh[] = []

lightingBtn.addEventListener('click', () => {
  studioMode = !studioMode
  lightingBtn.textContent = studioMode ? 'Lighting: Studio' : 'Lighting: Reef Actinic'
  scene.background = new THREE.Color(studioMode ? '#42566e' : '#061a36')
  blueKey.color.set(studioMode ? '#3b9eff' : '#2e6be6')
  warmRim.color.set(studioMode ? '#fff0c7' : '#eef6ff')
})

rotateBtn.addEventListener('click', () => {
  autoRotate = !autoRotate
  rotateBtn.textContent = autoRotate ? 'Auto-Rotate: On' : 'Auto-Rotate: Off'
})

wireframeBtn.addEventListener('click', () => {
  wireframe = !wireframe
  wireframeBtn.textContent = wireframe ? 'Wireframe: On' : 'Wireframe: Off'
  for (const mesh of meshes) {
    const mat = mesh.material as THREE.MeshStandardMaterial
    if (mat) mat.wireframe = wireframe
  }
})

function resize() {
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  renderer.setSize(rect.width, rect.height, false)
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(canvas)
resize()

new GLTFLoader().load(
  '/test-assets/procedural-coral-rock.glb',
  (gltf) => {
    let vertices = 0
    let triangles = 0
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshes.push(obj)
        const pos = obj.geometry.getAttribute('position')
        if (pos) vertices += pos.count
        if (obj.geometry.index) triangles += obj.geometry.index.count / 3
        else if (pos) triangles += pos.count / 3
      }
    })
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    gltf.scene.position.sub(center)
    rootGroup.add(gltf.scene)

    output.textContent = JSON.stringify(
      {
        status: 'READY',
        asset: '/test-assets/procedural-coral-rock.glb',
        vertices,
        triangles: Math.round(triangles),
        dimensionsM: [
          Number(size.x.toFixed(3)),
          Number(size.y.toFixed(3)),
          Number(size.z.toFixed(3)),
        ],
      },
      null,
      2,
    )
  },
  undefined,
  (error) => {
    output.textContent = `Failed to load GLB: ${String(error)}`
  },
)

let last = performance.now()
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (autoRotate) rootGroup.rotation.y += dt * 0.42
  controls.update()
  renderer.render(scene, camera)
})
