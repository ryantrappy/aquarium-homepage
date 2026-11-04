import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { assets, calibration, canvas, xPosition, yPosition, sample } from './shared'
export async function run() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#183b48')
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 100); camera.position.set(0, 0, 8)
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true}); renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15
  scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x4b676e, 2))
  const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 4, 6); scene.add(light)
  const loader = new GLTFLoader(), mixers: THREE.AnimationMixer[] = [], roots: THREE.Group[] = []
  for (const [i, url] of assets.entries()) {
    const gltf = await loader.loadAsync(url), object = gltf.scene
    const settings = calibration[i]; object.rotation.y = settings.yaw
    const mixer = new THREE.AnimationMixer(object); mixer.clipAction(gltf.animations[0]).play(); mixer.update(.1)
    object.position.set(-settings.center[0], -settings.center[1], -settings.center[2])
    const pivot = new THREE.Group(); pivot.add(object); pivot.scale.setScalar(2 / settings.width)
    const root = new THREE.Group(); root.add(pivot); root.position.set(xPosition(i), yPosition(i), 0); scene.add(root); roots.push(root)
    mixers.push(mixer)
  }
  const rock = new THREE.Mesh(new THREE.SphereGeometry(.4, 24, 16), new THREE.MeshStandardMaterial({color:'#7a6552',roughness:1})); rock.position.set(-.7,-.45, .7); rock.scale.set(1.2,.65,.7); scene.add(rock)
  let last = performance.now(), elapsed = 0
  renderer.setAnimationLoop(now => { const dt = Math.min(.05,(now-last)/1000); last = now; elapsed += dt; mixers.forEach(m => m.update(dt)); roots.forEach((r,i) => {r.rotation.y = .4*Math.sin(elapsed*.5+i); r.position.set(xPosition(i),yPosition(i),0)}); renderer.render(scene,camera); sample() })
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)})
}

