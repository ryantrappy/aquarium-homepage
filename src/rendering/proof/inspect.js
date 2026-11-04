import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#164454')
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 100)
camera.position.set(0, 0, 7.5)
let renderer
try { renderer = new THREE.WebGLRenderer({ antialias: true }) } catch {
  document.body.classList.add('no-webgl')
  document.querySelector('header span').textContent = 'WebGL is unavailable. The example links remain accessible.'
  document.querySelector('button').hidden = true
}
if (renderer) {
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)
scene.add(new THREE.HemisphereLight(0xf0faff, 0x3b6871, 2))
const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(1, 5, 6)
scene.add(light)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
const loader = new THREE.TextureLoader()
const fish = []
const pauseButton = document.querySelector('button')
let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion'
pauseButton.addEventListener('click', () => { paused = !paused; pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion' })
const specimens = [
  { name: 'ocellaris-clownfish', ratio: .5, pivot: [432, 177], bodyHeight: .38, thickness: .22, frequency: 4.3, amplitude: .17 },
  { name: 'yellow-tang', ratio: 2/3, pivot: [420, 252], bodyHeight: .43, thickness: .16, frequency: 2.8, amplitude: .09 },
]
function makeFish(spec, index) {
  const group = new THREE.Group()
  group.position.x = (index - .5) * 2.9
  scene.add(group)
  const width = 2, height = width * spec.ratio
  const columns = 100, rows = 68
  const geometry = new THREE.PlaneGeometry(width, height, columns, rows)
  const positions = geometry.attributes.position
  const base = new Float32Array(positions.array)
  const texture = loader.load(`./${spec.name}-body.png`)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .12, side: THREE.DoubleSide, roughness: .75, depthWrite: true })
  const body = new THREE.Mesh(geometry, material)
  group.add(body)
  const backGeometry = geometry.clone()
  const back = new THREE.Mesh(backGeometry, material)
  group.add(back)
  const finTexture = loader.load(`./${spec.name}-fin.png`)
  finTexture.colorSpace = THREE.SRGBColorSpace
  const pivotX = spec.pivot[0] / 600 * width - width/2
  const pivotY = height/2 - spec.pivot[1] / (600 * spec.ratio) * height
  const finGeometry = new THREE.PlaneGeometry(width, height)
  finGeometry.translate(-pivotX, -pivotY, 0)
  const fin = new THREE.Mesh(finGeometry, new THREE.MeshStandardMaterial({ map: finTexture, transparent: true, alphaTest: .12, side: THREE.DoubleSide, roughness: .8, depthWrite: false }))
  const hinge = new THREE.Group()
  hinge.position.set(pivotX, pivotY, spec.thickness + .035)
  hinge.add(fin)
  group.add(hinge)
  const backHinge = hinge.clone()
  backHinge.position.z *= -1
  group.add(backHinge)
  fish.push({ group, geometry, backGeometry, positions, base, hinge, backHinge, spec, link: document.querySelectorAll('.fish-link')[index] })
}
specimens.forEach(makeFish)
let last = performance.now(), elapsed = 0
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  if (!document.hidden && !paused) elapsed += dt
  for (const { group, geometry, backGeometry, positions, base, hinge, backHinge, spec, link } of fish) {
    for (let i = 0; i < positions.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1]
      const ellipse = Math.max(0, 1 - ((x - .15) / .72) ** 2 - (y / spec.bodyHeight) ** 2)
      const bulge = Math.sqrt(ellipse) * spec.thickness
      const tail = Math.max(0, (.48 - x) / 1.48)
      const bend = spec.amplitude * tail * tail * Math.sin(elapsed * spec.frequency + x * 3.3)
      positions.setZ(i, bulge + bend)
      backGeometry.attributes.position.setZ(i, -bulge + bend)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    backGeometry.attributes.position.needsUpdate = true
    backGeometry.computeVertexNormals()
    hinge.rotation.y = -.3 + .45 * Math.sin(elapsed * (spec.frequency * 1.6))
    backHinge.rotation.y = -hinge.rotation.y
    group.rotation.y = .25 * Math.sin(elapsed * .32 + spec.frequency)
    group.rotation.z = .025 * Math.sin(elapsed * .7 + spec.frequency)
    group.position.y = (innerWidth < 600 ? (spec.name === 'ocellaris-clownfish' ? .8 : -.8) : 0) + .08 * Math.sin(elapsed * .65 + spec.frequency)
    group.position.x = innerWidth < 600 ? 0 : (spec.name === 'ocellaris-clownfish' ? -1.45 : 1.45)
    const projected = group.position.clone().project(camera)
    link.style.left = `${(projected.x + 1) * innerWidth / 2}px`
    link.style.top = `${(1 - projected.y) * innerHeight / 2}px`
  }
  controls.update()
  renderer.render(scene, camera)
})
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })

}
