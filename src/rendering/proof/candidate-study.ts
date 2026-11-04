import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const scene = new THREE.Scene(); scene.background = new THREE.Color('#183b48')
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 100); camera.position.set(0, 0, 8)
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x4b676e, 2))
const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 4, 6); scene.add(light)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true
const status = document.querySelector<HTMLElement>('#status')!
const pauseButton = document.querySelector<HTMLButtonElement>('button')!
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches, yaw = 0, autoTurn = false, elapsed = 0
pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion'
pauseButton.addEventListener('click', () => { paused = !paused; pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion' })
document.querySelector<HTMLButtonElement>('#turn')!.addEventListener('click', () => { yaw += Math.PI / 4 })
const autoButton = document.querySelector<HTMLButtonElement>('#auto-turn')!
autoButton.addEventListener('click', () => { autoTurn = !autoTurn; autoButton.textContent = autoTurn ? 'Auto turn on' : 'Auto turn off'; autoButton.setAttribute('aria-pressed', String(autoTurn)) })
const specimens: { root: THREE.Group; mixer: THREE.AnimationMixer }[] = []
async function load(url: string, name: string, index: number) {
  const gltf = await new GLTFLoader().loadAsync(url)
  const fish = gltf.scene; fish.rotation.y = Math.PI / 2; fish.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(fish), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3())
  fish.position.sub(center)
  const pivot = new THREE.Group(); pivot.add(fish); pivot.scale.setScalar(2 / Math.max(size.x, size.y, size.z))
  const root = new THREE.Group(); root.add(pivot); scene.add(root)
  const mixer = new THREE.AnimationMixer(fish); if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play()
  specimens[index] = { root, mixer }
  return `${name}: ${gltf.animations.length} clip(s)`
}
Promise.all([load('./candidate-real-clown.glb', 'Clownfish', 0), load('./candidate-real-tang.glb', 'Yellow tang', 1)])
  .then(result => { status.textContent = result.join(' · ') })
  .catch(error => { console.error(error); status.textContent = 'Local candidate exports unavailable; see documentation.' })
let last = performance.now()
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  if (!paused && !document.hidden) elapsed += dt
  specimens.forEach(({ root, mixer }, i) => {
    root.position.set(innerWidth < 600 ? 0 : (i ? 1.45 : -1.45), innerWidth < 600 ? (i ? -.8 : .8) : 0, 0)
    root.rotation.y = yaw + (autoTurn ? 1.15 * Math.sin(elapsed * .55 + i * .5) : 0)
    if (!paused && !document.hidden) mixer.update(dt)
  })
  controls.update(); renderer.render(scene, camera)
})
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
