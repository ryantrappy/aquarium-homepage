// Isolated controlled asset/loader/occlusion probe. Not the production renderer.
export {}
const canvas = document.querySelector<HTMLCanvasElement>('#view')!
const status = document.querySelector<HTMLElement>('#status')!
const selection = document.querySelector<HTMLElement>('#selection')!
const metrics = document.querySelector<HTMLElement>('#metrics')!
const select = document.querySelector<HTMLSelectElement>('#engine')!
const pauseButton = document.querySelector<HTMLButtonElement>('#pause')!
const blockerToggle = document.querySelector<HTMLInputElement>('#blocker')!
const reefToggle = document.querySelector<HTMLInputElement>('#reef')!
const engine = new URLSearchParams(location.search).get('engine') || 'three'
const assets = [
  { url: new URL('./candidate-real-clown.glb', import.meta.url).href, name: 'Clownfish' },
  { url: new URL('./candidate-real-tang.glb', import.meta.url).href, name: 'Yellow tang' },
]
// Two white directional sources avoid non-equivalent ambient/hemisphere models.
// Directions point from the specimen toward each light.
const lights = [{ direction: [1, 4, 6], intensity: 3 }, { direction: [-3, -1, 4], intensity: 1 }]
const reefAsset = new URL('./candidate-reef.glb', import.meta.url).href
const reefPosition = [0, -.7, 0]
const reefScale = 2
select.value = engine
select.addEventListener('change', () => { location.search = `?engine=${select.value}` })
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches, yaw = 0
pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion'
pauseButton.addEventListener('click', () => { paused = !paused; pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion' })
document.querySelector('#turn')!.addEventListener('click', () => { yaw += Math.PI / 4 })
const position = (i: number) => innerWidth < 600 ? [0, i ? -.8 : .8, 0] : [i ? 1.45 : -1.45, 0, 0]
const blockerPosition = () => innerWidth < 600 ? [-.35, .45, .65] : [-1.8, -.35, .65]
const pickResult = (name?: string) => { selection.textContent = name ? `Nearest visible target: ${name}` : 'No target at this point.' }
// Fixed DPR=1 in every engine. This reports frame intervals, not GPU timings.
let previous = performance.now(), samples: number[] = []
function sample(drawCalls: number) {
  const now = performance.now(), dt = now - previous; previous = now
  if (document.hidden || dt > 250) { samples = []; return }
  samples.push(dt)
  if (samples.length === 180) {
    const sorted = [...samples].sort((a, b) => a - b)
    metrics.textContent = `${innerWidth}×${innerHeight} · DPR 1 · ${drawCalls} draw calls · frame interval median ${sorted[90].toFixed(1)} ms / p95 ${sorted[171].toFixed(1)} ms (not GPU time)`
    samples = []
  }
}

async function startThree() {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#183b48')
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 100); camera.position.z = 8
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight)
  lights.forEach(({ direction, intensity }) => { const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.fromArray(direction); scene.add(light) })
  const specimens: { root: import('three').Group; mixer: import('three').AnimationMixer; clips: number }[] = []
  for (const asset of assets) {
    const gltf = await new GLTFLoader().loadAsync(asset.url)
    // Both local exports use the same normalized two-unit head-to-tail span.
    // Transform the whole skeleton and mesh together; don't fit skinned bounds.
    const root = new THREE.Group(), orientation = new THREE.Group()
    orientation.rotation.y = Math.PI / 2; orientation.add(gltf.scene); root.add(orientation); scene.add(root)
    gltf.scene.traverse(node => { node.userData.target = asset.name })
    const mixer = new THREE.AnimationMixer(gltf.scene)
    if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play()
    specimens.push({ root, mixer, clips: gltf.animations.length })
  }
  const reef = (await new GLTFLoader().loadAsync(reefAsset)).scene
  reef.position.fromArray(reefPosition); reef.scale.setScalar(reefScale)
  reef.traverse(node => { node.userData.target = 'Reef geometry' }); scene.add(reef)
  const blocker = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 16), new THREE.MeshStandardMaterial({ color: '#808080', roughness: .9, metalness: 0 }))
  blocker.scale.set(1, .7, .65); blocker.userData.target = 'Depth blocker'; scene.add(blocker)
  const ray = new THREE.Raycaster()
  canvas.addEventListener('click', event => {
    ray.setFromCamera(new THREE.Vector2(event.offsetX / canvas.clientWidth * 2 - 1, 1 - event.offsetY / canvas.clientHeight * 2), camera)
    const hit = ray.intersectObjects(scene.children, true).find(hit => {
      if (!hit.object.userData.target) return false
      for (let node: import('three').Object3D | null = hit.object; node; node = node.parent) if (!node.visible) return false
      return true
    })
    pickResult(hit?.object.userData.target)
  })
  status.textContent = `Three.js: ${specimens.map((s, i) => `${assets[i].name} ${s.clips} clip`).join(' · ')} · reef loaded`
  let last = performance.now()
  renderer.setAnimationLoop(now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now
    specimens.forEach(({ root, mixer }, i) => { root.position.fromArray(position(i)); root.rotation.y = yaw; if (!paused && !document.hidden) mixer.update(dt) })
    blocker.visible = blockerToggle.checked; blocker.position.fromArray(blockerPosition())
    reef.visible = reefToggle.checked
    renderer.render(scene, camera); sample(renderer.info.render.calls)
  })
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
  addEventListener('pagehide', () => { renderer.setAnimationLoop(null); renderer.dispose() }, { once: true })
}

async function startBabylon() {
  const [{ Engine }, { Scene }, { FreeCamera }, { Vector3 }, { Color3, Color4 }, { DirectionalLight }, { TransformNode }, { ImportMeshAsync }, { MeshBuilder }, { PBRMaterial }] = await Promise.all([
    import('@babylonjs/core/Engines/engine'), import('@babylonjs/core/scene'), import('@babylonjs/core/Cameras/freeCamera'),
    import('@babylonjs/core/Maths/math.vector'), import('@babylonjs/core/Maths/math.color'),
    import('@babylonjs/core/Lights/directionalLight'), import('@babylonjs/core/Meshes/transformNode'), import('@babylonjs/core/Loading/sceneLoader'),
    import('@babylonjs/core/Meshes/meshBuilder'), import('@babylonjs/core/Materials/PBR/pbrMaterial'),
  ])
  await import('@babylonjs/loaders/glTF')
  await import('@babylonjs/core/Culling/ray')
  const { SceneInstrumentation } = await import('@babylonjs/core/Instrumentation/sceneInstrumentation')
  const renderer = new Engine(canvas, true, {}, false); renderer.setHardwareScalingLevel(1)
  const scene = new Scene(renderer); scene.clearColor = Color4.FromHexString('#183b48ff'); scene.useRightHandedSystem = true
  const instrumentation = new SceneInstrumentation(scene)
  const camera = new FreeCamera('camera', new Vector3(0, 0, 8), scene); camera.setTarget(Vector3.Zero()); camera.fov = 35 * Math.PI / 180; camera.minZ = .01; camera.maxZ = 100
  scene.imageProcessingConfiguration.toneMappingEnabled = false; scene.imageProcessingConfiguration.exposure = 1; scene.imageProcessingConfiguration.contrast = 1
  lights.forEach(({ direction: d, intensity }, i) => { const light = new DirectionalLight(`light-${i}`, new Vector3(-d[0], -d[1], -d[2]), scene); light.intensity = intensity })
  const specimens: { root: import('@babylonjs/core/Meshes/transformNode').TransformNode; clip: import('@babylonjs/core/Animations/animationGroup').AnimationGroup | undefined; clips: number }[] = []
  for (const asset of assets) {
    const result = await ImportMeshAsync(asset.url, scene)
    const root = new TransformNode(asset.name, scene), orientation = new TransformNode('orientation', scene)
    orientation.parent = root; orientation.rotation.y = Math.PI / 2; result.meshes[0].parent = orientation
    result.meshes.forEach(mesh => { mesh.metadata = { target: asset.name } })
    const clip = result.animationGroups[0]; clip?.start(true); if (paused || document.hidden) clip?.pause()
    specimens.push({ root, clip, clips: result.animationGroups.length })
  }
  const reefResult = await ImportMeshAsync(reefAsset, scene)
  const reef = new TransformNode('Reef geometry', scene); reefResult.meshes[0].parent = reef
  reef.position.set(reefPosition[0], reefPosition[1], reefPosition[2]); reef.scaling.setAll(reefScale)
  reefResult.meshes.forEach(mesh => { mesh.metadata = { target: 'Reef geometry' } })
  const blocker = MeshBuilder.CreateSphere('Depth blocker', { diameter: 1, segments: 32 }, scene)
  blocker.scaling.set(1, .7, .65); blocker.metadata = { target: 'Depth blocker' }
  const material = new PBRMaterial('blocker', scene); material.albedoColor = Color3.FromHexString('#808080').toLinearSpace(); material.roughness = .9; material.metallic = 0; blocker.material = material
  canvas.addEventListener('click', event => { const hit = scene.pick(event.offsetX, event.offsetY); pickResult(hit?.pickedMesh?.metadata?.target) })
  status.textContent = `Babylon.js: ${specimens.map((s, i) => `${assets[i].name} ${s.clips} clip`).join(' · ')} · reef loaded`
  let wasRunning = !paused && !document.hidden
  renderer.runRenderLoop(() => {
    const running = !paused && !document.hidden
    specimens.forEach(({ root, clip }, i) => { const p = position(i); root.position.set(p[0], p[1], p[2]); root.rotation.y = yaw; if (running !== wasRunning) { running ? clip?.play(true) : clip?.pause() } })
    wasRunning = running; blocker.setEnabled(blockerToggle.checked); const p = blockerPosition(); blocker.position.set(p[0], p[1], p[2])
    reef.setEnabled(reefToggle.checked)
    scene.render(); sample(instrumentation.drawCallsCounter.current)
  })
  addEventListener('resize', () => renderer.resize())
  addEventListener('pagehide', () => { instrumentation.dispose(); scene.dispose(); renderer.dispose() }, { once: true })
}

async function startPlayCanvas() {
  status.textContent = 'PlayCanvas: initializing renderer…'
  const pc = await import('playcanvas')
  const app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true } })
  app.graphicsDevice.maxPixelRatio = 1; app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW); app.setCanvasResolution(pc.RESOLUTION_AUTO)
  app.scene.ambientLight = new pc.Color(0, 0, 0)
  // Empirical fixture calibration, not a universal engine conversion: a 30×40
  // central patch of the same gray PBR blocker measured 0.240 linear in Three /
  // Babylon and 0.798 here at exposure 1, with the same direct lights.
  app.scene.exposure = .30
  const camera = new pc.Entity('camera'); camera.addComponent('camera', { clearColor: new pc.Color(.094, .231, .282), fov: 35, nearClip: .01, farClip: 100 }); camera.setPosition(0, 0, 8); app.root.addChild(camera)
  lights.forEach(({ direction: d, intensity }, i) => {
    const light = new pc.Entity(`light-${i}`); light.addComponent('light', { type: 'directional', intensity })
    // PlayCanvas directional lights emit along local -Y, unlike camera -Z.
    light.setRotation(new pc.Quat().setFromDirections(pc.Vec3.UP, new pc.Vec3(d[0], d[1], d[2]).normalize())); app.root.addChild(light)
  })
  // Start the application before asynchronous container loads so initialization
  // and GPU uploads are processed even while the study waits for both assets.
  app.start()
  const targets = new Map<pc.GraphNode, string>()
  const specimens: { root: pc.Entity; fish: pc.Entity; clips: number }[] = []
  for (const assetInfo of assets) {
    status.textContent = `PlayCanvas: loading ${assetInfo.name}…`
    const asset = await new Promise<pc.Asset>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`${assetInfo.name} load timed out`)), 20000)
      app.assets.loadFromUrl(assetInfo.url, 'container', (error, asset) => { clearTimeout(timeout); error ? reject(error) : resolve(asset!) })
    })
    const resource = asset.resource as pc.ContainerResource
    const fish = resource.instantiateRenderEntity(); fish.setLocalEulerAngles(0, 90, 0)
    const root = new pc.Entity(assetInfo.name); root.addChild(fish); app.root.addChild(root)
    for (const render of fish.findComponents('render') as pc.RenderComponent[]) for (const mesh of render.meshInstances) targets.set(mesh.node, assetInfo.name)
    fish.addComponent('anim', { activate: true })
    const track = resource.animations[0]?.resource as pc.AnimTrack | undefined
    if (track) { fish.anim!.assignAnimation('swim', track); fish.anim!.baseLayer?.play('swim') }
    specimens.push({ root, fish, clips: resource.animations.length })
  }
  status.textContent = 'PlayCanvas: loading reef…'
  const reefSource = await new Promise<pc.Asset>((resolve, reject) => {
    app.assets.loadFromUrl(reefAsset, 'container', (error, asset) => error ? reject(error) : resolve(asset!))
  })
  const reef = (reefSource.resource as pc.ContainerResource).instantiateRenderEntity()
  reef.setLocalPosition(reefPosition[0], reefPosition[1], reefPosition[2]); reef.setLocalScale(reefScale, reefScale, reefScale); app.root.addChild(reef)
  for (const render of reef.findComponents('render') as pc.RenderComponent[]) for (const mesh of render.meshInstances) targets.set(mesh.node, 'Reef geometry')
  const blocker = new pc.Entity('Depth blocker'); blocker.addComponent('render', { type: 'sphere' }); blocker.setLocalScale(1, .7, .65); app.root.addChild(blocker)
  const material = new pc.StandardMaterial(); material.diffuse = new pc.Color(128 / 255, 128 / 255, 128 / 255); material.useMetalness = true; material.metalness = 0; material.gloss = .1; material.update()
  blocker.render!.meshInstances.forEach(mesh => { mesh.material = material; targets.set(mesh.node, 'Depth blocker') })
  const picker = new pc.Picker(app, innerWidth, innerHeight)
  canvas.addEventListener('click', async event => {
    try { picker.prepare(camera.camera!, app.scene); const hits = await picker.getSelectionAsync(event.offsetX, event.offsetY); const hit = hits[0]; pickResult(hit && 'node' in hit ? targets.get(hit.node) : undefined) }
    catch (error) { selection.textContent = `Picking failed: ${String(error)}` }
  })
  status.textContent = `PlayCanvas: ${specimens.map((s, i) => `${assets[i].name} ${s.clips} clip`).join(' · ')} · reef loaded`
  app.on('update', () => {
    specimens.forEach(({ root, fish }, i) => { const p = position(i); root.setLocalPosition(p[0], p[1], p[2]); root.setLocalEulerAngles(0, yaw * 180 / Math.PI, 0); fish.anim!.playing = !paused && !document.hidden })
    blocker.enabled = blockerToggle.checked; const p = blockerPosition(); blocker.setLocalPosition(p[0], p[1], p[2])
    reef.enabled = reefToggle.checked
  })
  app.on('postrender', () => sample(app.stats.drawCalls.total))
  addEventListener('resize', () => { app.resizeCanvas(); picker.resize(innerWidth, innerHeight) })
  addEventListener('pagehide', () => { picker.destroy(); app.destroy() }, { once: true })
}

const start = engine === 'babylon' ? startBabylon : engine === 'playcanvas' ? startPlayCanvas : startThree
start().catch(error => { console.error(error); status.textContent = `Unable to load ${engine} study: ${String(error)}` })
