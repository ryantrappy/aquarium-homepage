import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { ServiceConfig } from '../../lib/services'
import { getFishById } from '../../lib/fish'
import { instantiateReefHabitat } from './habitat'
import reefHabitat from './reef-habitat.json'
import { createSwimmingFish, seedForId, startleFish, stepSwimmingFish, type SwimmingFish, type WaterHabitat } from './motion'
import { consumeFrameSteps, createFrameClock, SIMULATION_STEP_SECONDS, suspendFrameClock } from './clock'
import { nearestVisibleIntersection, readArtworkAlpha, type SpriteMasks } from './alpha-picking'
import { applyFishLinkVisibility } from './fish-link-focus'

const modelUrls: Record<string, string> = {
  'ocellaris-clownfish': new URL('../proof/candidate-real-clown.glb', import.meta.url).href,
  'yellow-tang': new URL('../proof/candidate-real-tang.glb', import.meta.url).href,
}
const reefUrl = new URL('../proof/candidate-reef.glb', import.meta.url).href
export type SceneStatus = 'loading' | 'ready' | 'failed'
export type AquariumController = { update(services: ServiceConfig[], paused: boolean): void; activate(id: string): void; serviceAt(x: number, y: number): string | undefined; canActivate(id: string, x?: number, y?: number): boolean; dispose(): void }
type Inhabitant = { service: ServiceConfig; root: THREE.Group; motion: SwimmingFish; mixer?: THREE.AnimationMixer; anchor?: HTMLAnchorElement; visible: boolean; fallback: boolean; releasedFocus: boolean }

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose()
  })
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose())
  textures.forEach(value => { value.dispose(); if (typeof ImageBitmap !== 'undefined' && value.source.data instanceof ImageBitmap) value.source.data.close() })
}

export function createAquarium(canvas: HTMLCanvasElement, overlay: HTMLElement, initialServices: ServiceConfig[], initialPaused: boolean, status: (status: SceneStatus) => void, focusFallback: () => HTMLElement | null = () => null): AquariumController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#155c73'); scene.fog = new THREE.Fog('#155c73', 15, 32)
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 60); camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0)
  for (const [position, intensity] of [[new THREE.Vector3(1, 6, 5), 3], [new THREE.Vector3(-4, 2, 3), 1]] as const) { const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.copy(position); scene.add(light) }
  const grain = new Uint8Array(256 * 256 * 4); let grainSeed = 1743
  for (let i = 0; i < grain.length; i += 4) { grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0; const value = (grainSeed / 4294967296 - .5) * 25; grain[i] = 207 + value; grain[i + 1] = 197 + value; grain[i + 2] = 173 + value; grain[i + 3] = 255 }
  const sandTexture = new THREE.DataTexture(grain, 256, 256); sandTexture.colorSpace = THREE.SRGBColorSpace; sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping; sandTexture.repeat.set(32, 20); sandTexture.magFilter = THREE.LinearFilter; sandTexture.minFilter = THREE.LinearMipmapLinearFilter; sandTexture.generateMipmaps = true; sandTexture.needsUpdate = true
  const sandGeometry = new THREE.PlaneGeometry(32, 20, 128, 80), sandPositions = sandGeometry.getAttribute('position')
  for (let i = 0; i < sandPositions.count; i++) sandPositions.setZ(i, .035 * Math.sin(sandPositions.getX(i) * .8) + .022 * Math.cos(sandPositions.getY(i) * 1.3 + sandPositions.getX(i) * .4))
  sandGeometry.computeVertexNormals()
  const sand = new THREE.Mesh(sandGeometry, new THREE.MeshStandardMaterial({ map: sandTexture, roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.y = -2.8; scene.add(sand)
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(32, 14), new THREE.MeshStandardMaterial({ color: '#115469', roughness: 1 })); rear.position.set(0, 0, -5.5); scene.add(rear)
  const abort = new AbortController(), loader = new GLTFLoader(), modelBases = new Map<string, GLTF>(), reefs: THREE.Object3D[] = []
  let disposed = false, failed = false, loaded = false, paused = initialPaused, services = initialServices, fish: Inhabitant[] = [], reefBase: GLTF | undefined
  const loadedAssets = new Set<GLTF>()
  let habitat: WaterHabitat = { bounds: { min: { x: -4, y: -2.25, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }, obstacles: [], anchors: [] }
  let width = 1, height = 1, labelClock = 0
  const clock = createFrameClock()
  const ray = new THREE.Raycaster(), projected = new THREE.Vector3(), sample = new THREE.Vector3(), hitMeshes: THREE.Object3D[] = []
  const ownedSprites: THREE.Mesh[] = []
  const spriteMasks: SpriteMasks = new WeakMap()
  function nearest(x: number, y: number) {
    const box = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((x - box.left) / box.width * 2 - 1, 1 - (y - box.top) / box.height * 2), camera)
    return nearestVisibleIntersection(ray.intersectObjects(hitMeshes, false), spriteMasks)?.object.userData.serviceId as string | undefined
  }
  function updateVisibility(item: Inhabitant) {
    const rect = canvas.getBoundingClientRect()
    let visible = false
    for (const [localY, localZ] of [[0, 0], [0, .31], [0, -.31], [.13, 0], [-.13, 0]]) {
      sample.set(item.fallback ? localZ : 0, localY, item.fallback ? 0 : localZ).applyMatrix4(item.root.matrixWorld).project(camera)
      if (Math.abs(sample.x) > .96 || Math.abs(sample.y) > .94 || sample.z > 1) continue
      if (nearest(rect.left + (sample.x + 1) * width / 2, rect.top + (1 - sample.y) * height / 2) === item.service.id) { visible = true; break }
    }
    item.visible = visible
    if (item.anchor) {
      // A retained focused label is still an exposed native control even if
      // its mesh is covered. Pointer bodies keep using nearest() separately.
      return applyFishLinkVisibility(item.anchor, visible, focusFallback())
    }
    return visible
  }
  function rebuildHabitat() {
    reefs.forEach(reef => { scene.remove(reef) }); reefs.length = 0; hitMeshes.length = 0
    habitat.obstacles = []; habitat.anchors = []
    if (!reefBase) return
    const placements = width < 600
      ? [{ position: { x: -.4, y: -1.65, z: -1.1 }, scale: { x: 3.6, y: 5, z: 1.4 }, yaw: .08 }]
      : [{ position: { x: -3.2, y: -1.62, z: -1.1 }, scale: { x: 4.6, y: 6.2, z: 1.8 }, yaw: .1 }, { position: { x: 3.4, y: -2.09, z: -.9 }, scale: { x: 3.4, y: 4.6, z: 1.5 }, yaw: -.18 }]
    for (const [i, placement] of placements.entries()) {
      const { position, scale, yaw } = placement
      const reef = reefBase.scene.clone(true); reef.scale.set(scale.x, scale.y, scale.z); reef.position.set(position.x, position.y, position.z); reef.rotation.y = yaw; scene.add(reef); reefs.push(reef)
      const result = instantiateReefHabitat(reefHabitat as Parameters<typeof instantiateReefHabitat>[0], scale, position, sand.position.y + .06, `reef-${i}`, yaw)
      habitat.obstacles.push(...result.obstacles); habitat.anchors.push(...result.anchors)
      reef.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) })
    }
    hitMeshes.push(sand)
  }
  function removeFish() {
    fish.forEach(item => { scene.remove(item.root); item.mixer?.stopAllAction(); item.mixer?.uncacheRoot(item.mixer.getRoot()); item.root.traverse(object => { if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose() }) })
    ownedSprites.forEach(sprite => { disposeTree(sprite) }); ownedSprites.length = 0; fish = []
  }
  function rebuildFish() {
    removeFish(); if (!loaded || disposed) return
    hitMeshes.splice(0); reefs.forEach(reef => reef.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) })); hitMeshes.push(sand)
    const anchors = new Map(Array.from(overlay.querySelectorAll<HTMLAnchorElement>('a[data-service-id]')).map(anchor => [anchor.dataset.serviceId!, anchor]))
    services.forEach((service, i) => {
      const species = getFishById(service.fishId); if (!species) return
      const root = new THREE.Group(), base = modelBases.get(service.fishId), fallback = !base
      let mixer: THREE.AnimationMixer | undefined
      if (base) {
        const model = clone(base.scene); root.add(model); model.scale.setScalar(service.fishId === 'yellow-tang' ? .48 : .42)
        mixer = new THREE.AnimationMixer(model); base.animations.forEach(clip => mixer!.clipAction(clip).play()); mixer.setTime((seedForId(service.id) % 1500) / 1000)
      } else {
        const texture = new THREE.TextureLoader().load(species.thumbnail, loadedTexture => {
          if (disposed || failed || !ownedSprites.includes(sprite)) return
          const image = loadedTexture.image as HTMLImageElement
          const imageWidth = image.naturalWidth, imageHeight = image.naturalHeight
          if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth > 0 && imageHeight > 0) {
            sprite.scale.y = (.95 / .62) * (imageHeight / imageWidth)
          }
          try { spriteMasks.set(sprite, { texture: loadedTexture, pixels: readArtworkAlpha(image) }) }
          catch (error) { console.warn('Fish artwork alpha unavailable', error) }
          if (!document.hidden) render(0, true)
        }); texture.colorSpace = THREE.SRGBColorSpace
        const sprite = new THREE.Mesh(new THREE.PlaneGeometry(.95, .62), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .2, depthWrite: true, side: THREE.DoubleSide })); root.add(sprite); ownedSprites.push(sprite)
        spriteMasks.set(sprite, { texture }) // pending/failed masks never claim opaque pixels
      }
      const span = habitat.bounds.max.x - habitat.bounds.min.x
      const x = width < 600 ? [-.3, .3, 0][i % 3] : ((i % 3) - 1) * Math.min(span * .26, 2.7)
      const y = (width < 600 ? [1.25, .55, 1.95][i % 3] : 1.45) - Math.floor(i / 3) * .7
      const motion = createSwimmingFish(service.id, service.fishId, { x, y: Math.max(.3, y), z: 1.8 + (i % 2) * .2 }, .5)
      root.position.set(motion.position.x, motion.position.y, motion.position.z); scene.add(root)
      root.traverse(object => { if (object instanceof THREE.Mesh) { object.userData.serviceId = service.id; hitMeshes.push(object) } })
      const anchor = anchors.get(service.id); if (anchor) anchor.title = `${service.name} · ${species.commonName}${fallback ? ' · artwork preview' : ''}`
      fish.push({ service, root, motion, mixer, anchor, visible: false, fallback, releasedFocus: false })
    })
    render(0, true)
  }
  function positionLabels(force = false) {
    for (const item of fish) {
      const anchor = item.anchor; if (!anchor) continue
      // Resolve focused exposure before moving its DOM target. If no control
      // can receive focus, keep its last visible label position for now.
      if (force || anchor.contains(document.activeElement)) updateVisibility(item)
      if (!item.visible && anchor.contains(document.activeElement)) continue
      projected.copy(item.root.position).project(camera)
      const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2
      const pixels = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - item.root.position.z))
      const linkWidth = Math.max(44, pixels * 1.1), linkHeight = Math.max(44, pixels * .78)
      anchor.style.transform = `translate3d(${x - linkWidth / 2}px,${y - linkHeight / 2}px,0)`; anchor.style.width = `${linkWidth}px`; anchor.style.height = `${linkHeight}px`
      anchor.style.zIndex = String(Math.round((item.root.position.z + 10) * 100))
    }
  }
  function render(steps: number, forceLabels = false) {
    for (let step = 0; step < steps; step++) for (const item of fish) {
      const focused = document.activeElement === item.anchor
      if (!focused) item.releasedFocus = false
      const stopped = paused || document.hidden || (focused && !item.releasedFocus)
      stepSwimmingFish(item.motion, habitat, SIMULATION_STEP_SECONDS, stopped)
      if (!stopped) item.mixer?.update(SIMULATION_STEP_SECONDS * (.55 + Math.min(1.7, item.motion.speed * 2.2)))
    }
    for (const item of fish) {
      const pose = item.motion; item.root.position.set(pose.position.x, pose.position.y, pose.position.z)
      if (item.fallback) { item.root.rotation.set(0, 0, 0); item.root.scale.x = Math.sin(pose.yaw) < 0 ? -1 : 1 }
      else { item.root.rotation.set(pose.pitch, pose.yaw, pose.bank, 'YXZ') }
    }
    scene.updateMatrixWorld(true)
    labelClock += steps * SIMULATION_STEP_SECONDS; positionLabels(forceLabels || labelClock > .24); if (labelClock > .24) labelClock = 0
    renderer.render(scene, camera)
  }
  function tick(now: number) { const steps = consumeFrameSteps(clock, now); if (steps) render(steps) }
  function syncLoop() {
    if (disposed || failed) return
    suspendFrameClock(clock)
    if (paused || document.hidden) { renderer.setAnimationLoop(null); if (!document.hidden) render(0, true) }
    else renderer.setAnimationLoop(tick)
  }
  let narrow = false
  function resize() {
    if (disposed || failed) return
    width = Math.max(1, canvas.parentElement!.clientWidth); height = Math.max(1, canvas.parentElement!.clientHeight)
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
    // The nearest fish depth controls the safe horizontal envelope, so depth
    // changes cannot send an otherwise in-bounds fish beyond the view edge.
    const halfWidth = Math.min(5.0, (camera.position.z - 2.8) * Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect * .96)
    habitat.bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
    const newNarrow = width < 600
    if (loaded && (narrow !== newNarrow || fish.some(item => Math.abs(item.motion.position.x) > halfWidth - .5))) { narrow = newNarrow; rebuildHabitat(); rebuildFish() }
    render(0, true)
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement!); resize()
  document.addEventListener('visibilitychange', syncLoop, { signal: abort.signal })
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); failed = true; renderer.setAnimationLoop(null); status('failed') }, { signal: abort.signal })
  async function initialize() {
    const load = async (url: string) => {
      const model = await loader.loadAsync(url)
      if (disposed || failed) disposeTree(model.scene)
      else loadedAssets.add(model)
      return model
    }
    const [reef, ...models] = await Promise.all([load(reefUrl), ...Object.values(modelUrls).map(load)])
    if (disposed || failed) return
    reefBase = reef; Object.keys(modelUrls).forEach((id, i) => modelBases.set(id, models[i]))
    loaded = true; narrow = width < 600; rebuildHabitat(); rebuildFish(); status('ready'); syncLoop()
  }
  void initialize().catch(error => { console.error('Aquarium assets could not load', error); failed = true; loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); if (!disposed) { renderer.setAnimationLoop(null); status('failed') } })
  syncLoop()
  return {
    update(next, stopped) { const changed = JSON.stringify(next) !== JSON.stringify(services); services = next; paused = stopped; if (changed) rebuildFish(); syncLoop() },
    activate(id) { const item = fish.find(item => item.service.id === id); if (!item || paused || document.hidden) return; item.releasedFocus = true; startleFish(item.motion, habitat) },
    serviceAt: nearest,
    canActivate(id, x, y) { const item = fish.find(item => item.service.id === id); return Boolean(item && (x === undefined || y === undefined ? updateVisibility(item) : nearest(x, y) === id)) },
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); observer.disconnect(); renderer.setAnimationLoop(null)
      removeFish(); loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); sand.geometry.dispose(); sand.material.dispose(); sandTexture.dispose(); rear.geometry.dispose(); rear.material.dispose(); renderer.dispose(); renderer.forceContextLoss()
    },
  }
}
