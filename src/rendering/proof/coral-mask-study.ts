import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { applyCoralRawMaskMaterial } from '../scene/coral-material'

const sources = [
  ['coral-euphyllia-torch', 'e267292425df202d816b5f8a93336e2e5255962a87116f9cc8fd680ac260c022', new URL('../assets/corals/coral-euphyllia-torch.glb', import.meta.url)],
  ['coral-brain-diploria', '904f471bb1a1094004b04294c4166ff309487f3333cea82e6105bf96ca1f100d', new URL('../assets/corals/coral-brain-diploria.glb', import.meta.url)],
  ['coral-acropora-staghorn', '629781835efee49bea46f109cfdeeef0ba434d94a8dc3bf33d769eb31f99c0ea', new URL('../assets/corals/coral-acropora-staghorn.glb', import.meta.url)],
] as const
const canvas = document.querySelector('canvas')!, output = document.querySelector('output')!, button = document.querySelector('button')!
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
const scene = new THREE.Scene(); scene.background = new THREE.Color('#182c36')
const camera = new THREE.PerspectiveCamera(38, 1, .01, 10); camera.position.set(.35, .55, 1.15); camera.lookAt(0, .08, 0)
scene.add(new THREE.HemisphereLight('#e8f3ff', '#756c53', 2))
const light = new THREE.DirectionalLight('#fff6e8', 3); light.position.set(-.4, .8, .4); light.castShadow = true
Object.assign(light.shadow.camera, { left: -.8, right: .8, top: .8, bottom: -.8, near: .01, far: 3 }); light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -.0001; scene.add(light)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ color: '#887f69', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.013; floor.receiveShadow = true; scene.add(floor)
const bindings: ReturnType<typeof applyCoralRawMaskMaterial>[] = [], roots: THREE.Object3D[] = []
const target = new THREE.WebGLRenderTarget(480, 320)
function render(time = 0, paused = false, reduced = false) {
  bindings.forEach(binding => binding.update(time, paused, reduced)); renderer.render(scene, camera)
}
function resize() { const box = canvas.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / box.height; camera.updateProjectionMatrix(); render() }
new ResizeObserver(resize).observe(canvas)
async function digest(bytes: Uint8Array) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer))].map(v => v.toString(16).padStart(2, '0')).join('') }
async function frame(time: number, paused: boolean, reduced: boolean) {
  renderer.setRenderTarget(target); const aspect = camera.aspect; camera.aspect = 1.5; camera.updateProjectionMatrix()
  render(time, paused, reduced); const pixels = new Uint8Array(480 * 320 * 4); renderer.readRenderTargetPixels(target, 0, 0, 480, 320, pixels)
  renderer.setRenderTarget(null); camera.aspect = aspect; camera.updateProjectionMatrix(); return digest(pixels)
}
try {
  for (const [index, [id, hash, url]] of sources.entries()) {
    const response = await fetch(url); if (!response.ok) throw Error(`${id}: HTTP ${response.status}`)
    const bytes = new Uint8Array(await response.arrayBuffer()); if (await digest(bytes) !== hash) throw Error(`${id}: source hash mismatch`)
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, '')
    gltf.scene.position.x = (index - 1) * .34; roots.push(gltf.scene)
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const role = object.userData.reefPrimitive?.role ?? object.parent?.userData.reefPrimitive?.role
      if (!['coral-soft', 'coral-rigid'].includes(role)) throw Error(`${id}: missing explicit primitive role`)
      const color = object.geometry.getAttribute('color'); if (!color || color.itemSize !== 4) throw Error(`${id}: missing raw COLOR_0`)
      if (Array.isArray(object.material) || !(object.material instanceof THREE.MeshStandardMaterial)) throw Error(`${id}: unsupported material`)
      const binding = applyCoralRawMaskMaterial(object.material, { role }); bindings.push(binding)
      object.customDepthMaterial = binding.depthMaterial; object.castShadow = true; object.receiveShadow = true
      // Disable frustum culling for this functional shader proof; production
      // integration must separately account for displaced bounding volumes.
      object.frustumCulled = false
    }); scene.add(gltf.scene)
  }
  await renderer.compileAsync(scene, camera); resize(); button.disabled = false; output.textContent = 'Exact source hashes verified. Surface and shadow materials ready.'
  button.onclick = async () => {
    button.disabled = true
    try {
      const moving = [await frame(.25, false, false), await frame(1.25, false, false)]
      const paused = [await frame(.25, true, false), await frame(1.25, true, false)]
      const reduced = [await frame(.25, false, true), await frame(1.25, false, true)]
      roots[0].visible = roots[1].visible = false
      const rigid = [await frame(.25, false, false), await frame(1.25, false, false)]
      roots[0].visible = roots[1].visible = true; render(.25)
      output.textContent = JSON.stringify({ sources: sources.map(([id, sha256]) => ({ id, sha256 })), comparisons: { motionChangesPixels: moving[0] !== moving[1], pauseStable: paused[0] === paused[1], reducedMotionStable: reduced[0] === reduced[1], rigidStable: rigid[0] === rigid[1] }, hashes: { moving, paused, reduced, rigid }, programs: renderer.info.programs?.length }, null, 2)
    } catch (error) { output.textContent = String(error) }
    button.disabled = false
  }
} catch (error) { output.textContent = String(error); console.error(error) }
