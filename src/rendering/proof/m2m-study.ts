import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// This is an exported, locally supplied test file, not a bundled production asset.
const scene = new THREE.Scene()
scene.background = new THREE.Color('#183b48')
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 100)
camera.position.set(0, 0, 5)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x4b676e, 2))
const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(1, 4, 6)
scene.add(light)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
const status = document.querySelector<HTMLElement>('#status')!
const button = document.querySelector<HTMLButtonElement>('button')!
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
button.textContent = paused ? 'Resume motion' : 'Pause motion'
button.addEventListener('click', () => { paused = !paused; button.textContent = paused ? 'Resume motion' : 'Pause motion' })
let mixer: THREE.AnimationMixer | undefined
new GLTFLoader().load('./candidate-m2m-clown.glb', gltf => {
  const specimen = gltf.scene
  specimen.rotation.y = Math.PI / 2
  specimen.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(specimen)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  specimen.position.sub(center)
  const pivot = new THREE.Group()
  pivot.add(specimen)
  pivot.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z))
  scene.add(pivot)
  mixer = new THREE.AnimationMixer(specimen)
  const clip = gltf.animations[0]
  if (clip) mixer.clipAction(clip).play()
  let skinned = 0
  specimen.traverse(object => { if (object instanceof THREE.SkinnedMesh) skinned++ })
  status.textContent = `${skinned} skinned meshes; ${gltf.animations.length} clips${clip ? `: ${clip.name} (${clip.duration.toFixed(2)}s)` : ''}`
}, undefined, error => { console.error(error); status.textContent = 'Local export unavailable; see docs/rendering.md for reproduction.' })
let last = performance.now()
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000)
  last = now
  if (!paused && !document.hidden) mixer?.update(dt)
  controls.update()
  renderer.render(scene, camera)
})
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
