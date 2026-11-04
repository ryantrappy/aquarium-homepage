import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// This isolated study expects locally supplied candidates; the model files are not part
// of the project. The skin/rig is evaluated separately from art quality and licensing.
const scene = new THREE.Scene()
scene.background = new THREE.Color('#183b48')
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 100)
camera.position.set(0, 0, 8)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
document.body.appendChild(renderer.domElement)
scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x4b676e, 2))
const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(1, 4, 6)
scene.add(light)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
const loader = new GLTFLoader()
const status = document.querySelector<HTMLElement>('#status')!
const pause = document.querySelector<HTMLButtonElement>('button')!
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
pause.textContent = paused ? 'Resume motion' : 'Pause motion'
pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Resume motion' : 'Pause motion' })

type Fish = { root: THREE.Group; spine: THREE.Bone[]; fins: THREE.Bone[]; rest: THREE.Quaternion[]; tang: boolean }
const fishes: Fish[] = []
async function loadFish(url: string, prefix: string, tang: boolean) {
  const gltf = await loader.loadAsync(url)
  const specimen = gltf.scene
  specimen.rotation.y = Math.PI / 2
  specimen.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(specimen)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const pivot = new THREE.Group()
  specimen.position.sub(center)
  pivot.add(specimen)
  pivot.scale.setScalar(2 / size.x)
  const root = new THREE.Group()
  root.add(pivot)
  scene.add(root)
  const bones: THREE.Bone[] = []
  specimen.traverse(object => { if (object instanceof THREE.Bone && object.name.startsWith(prefix)) bones.push(object) })
  const spine = bones.filter(bone => /Spine_0[2-4]/.test(bone.name))
  const fins = bones.filter(bone => /(?:L|R)_Upper_fin\./.test(bone.name))
  const active = [...spine, ...fins]
  fishes.push({ root, spine, fins, rest: active.map(b => b.quaternion.clone()), tang })
  return `${prefix} ${spine.length} spine / ${fins.length} fin bones`
}
Promise.all([loadFish('./candidate-clown.glb', 'Clown1', false), loadFish('./candidate-tang.glb', 'Yellow1', true)])
  .then(results => { status.textContent = `${results.join(' · ')} · art and rights under evaluation` })
  .catch((error: unknown) => { console.error(error); status.textContent = 'Inspection models unavailable. The local candidate files must be supplied separately.' })
let elapsed = 0, last = performance.now()
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  if (!paused && !document.hidden) elapsed += dt
  fishes.forEach(({ root, spine, fins, rest, tang }, index) => {
    root.position.set(innerWidth < 600 ? 0 : (index ? 1.45 : -1.45), innerWidth < 600 ? (index ? -.8 : .8) : 0, 0)
    root.rotation.y = .42 * Math.sin(elapsed * .5 + index * 1.4)
    root.rotation.z = .025 * Math.sin(elapsed * .8 + index)
    spine.forEach((bone, i) => { bone.quaternion.copy(rest[i]); bone.rotateY((tang ? .07 : .15) * (i + 1) * Math.sin(elapsed * (tang ? 2.8 : 4.2) - i * .55)) })
    fins.forEach((bone, i) => { bone.quaternion.copy(rest[spine.length + i]); bone.rotateZ((i ? -1 : 1) * .22 * Math.sin(elapsed * (tang ? 7 : 5.5))) })
  })
  controls.update(); renderer.render(scene, camera)
})
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
