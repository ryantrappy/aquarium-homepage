// Isolated AQ40 proof. Local review files are opt-in and served by a bounded
// dev-only Vite mount. The production aquarium never imports this module.
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { z } from 'zod'
import curatedManifest from './pipeline-assets/manifest.json'
import rockUrl from './pipeline-assets/original-rock-bake.glb?url'
import staghornReferenceUrl from './pipeline-assets/staghorn-unbaked-lod.glb?url'
import staghornBakedUrl from './pipeline-assets/staghorn-normal-baked.glb?url'
import noticesUrl from './pipeline-assets/ASSET_NOTICES.md?url'
import rockProvenanceUrl from './pipeline-assets/original-rock-provenance.json?url'
import rockValidationUrl from './pipeline-assets/original-rock-validation.json?url'
import staghornProvenanceUrl from './pipeline-assets/staghorn-provenance.json?url'
import staghornValidationUrl from './pipeline-assets/staghorn-validation.json?url'

const filename = z.string().regex(/^[a-z0-9][a-z0-9-]*\.glb$/)
const manifestSchema = z.object({
  schema: z.literal('aq40-pipeline-review-v1'),
  specimens: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/), label: z.string().min(1), baked: filename,
    reference: filename.optional(), referenceLabel: z.string().optional(), notes: z.string(),
    reviewScale: z.number().finite().positive().optional(),
  }).strict()).min(1),
}).strict()
type Specimen = z.infer<typeof manifestSchema>['specimens'][number]
type Choice = { specimen: Specimen; bakedUrl: string; referenceUrl?: string; provenanceUrl?: string; validationUrl?: string }
// Root-curated specimens passed bounded technical browser QA. None are
// approved final artwork or imported by the production aquarium.
const assetUrls: Record<string, string> = { 'original-rock-bake.glb': rockUrl, 'staghorn-unbaked-lod.glb': staghornReferenceUrl, 'staghorn-normal-baked.glb': staghornBakedUrl }
const reports: Record<string, { provenanceUrl: string; validationUrl: string }> = {
  'original-rock': { provenanceUrl: rockProvenanceUrl, validationUrl: rockValidationUrl },
  'staghorn-normal': { provenanceUrl: staghornProvenanceUrl, validationUrl: staghornValidationUrl },
}
const curated: Choice[] = manifestSchema.parse(curatedManifest).specimens.map(specimen => {
  if (!assetUrls[specimen.baked] || (specimen.reference && !assetUrls[specimen.reference])) throw new Error('Curated manifest references an unbundled specimen')
  return { specimen, bakedUrl: assetUrls[specimen.baked], referenceUrl: specimen.reference ? assetUrls[specimen.reference] : undefined, ...reports[specimen.id] }
})
const canvas = document.querySelector<HTMLCanvasElement>('#view')!
const viewport = document.querySelector<HTMLElement>('#viewport')!
const status = document.querySelector<HTMLElement>('#status')!
const details = document.querySelector<HTMLElement>('#map-details')!
const notes = document.querySelector<HTMLElement>('#notes')!
const select = document.querySelector<HTMLSelectElement>('#specimen')!
const pause = document.querySelector<HTMLButtonElement>('#pause')!
const normal = document.querySelector<HTMLInputElement>('#normal')!
const ao = document.querySelector<HTMLInputElement>('#ao')!
const labels = ['#left-label', '#right-label'].map(id => document.querySelector<HTMLElement>(id)!)
document.querySelector<HTMLAnchorElement>('#notices')!.href = noticesUrl
const provenanceLink = document.querySelector<HTMLAnchorElement>('#provenance')!
const validationLink = document.querySelector<HTMLAnchorElement>('#validation')!
let renderer: THREE.WebGLRenderer | undefined
let disposed = false, version = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches
let loadedStatus: string | undefined
let last: number | undefined, lightPhase = 0, oblique = false
let choices: typeof curated = [], roots: THREE.Object3D[] = [], mixers: THREE.AnimationMixer[] = []
let bounds = new THREE.Box3(), fitCenter = new THREE.Vector3(), fitSize = new THREE.Vector3(.1, .1, .1)
const originals = new Map<THREE.MeshStandardMaterial, { normal: THREE.Texture | null; ao: THREE.Texture | null }>()
const scenes = [new THREE.Scene(), new THREE.Scene()]
const cameras = [new THREE.PerspectiveCamera(35, 1, .001, 100), new THREE.PerspectiveCamera(35, 1, .001, 100)]
const keys: THREE.DirectionalLight[] = []
const floors: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>[] = []
let environment: THREE.WebGLRenderTarget | undefined

function disposeModels(objects: THREE.Object3D[], includeOriginals = false) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  const skeletons = new Set<THREE.Skeleton>()
  objects.forEach(root => root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    geometries.add(node.geometry)
    if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material)
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value) })
    }
  }))
  if (includeOriginals) originals.forEach(maps => { if (maps.normal) textures.add(maps.normal); if (maps.ao) textures.add(maps.ao) })
  const bitmaps = new Set<ImageBitmap>()
  textures.forEach(texture => { if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) bitmaps.add(texture.source.data) })
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose()); skeletons.forEach(value => value.dispose()); bitmaps.forEach(value => value.close())
}

function assetMetadata(node: THREE.Object3D) {
  for (let current: THREE.Object3D | null = node; current; current = current.parent) if (current.userData.reefAsset) return current.userData.reefAsset
}

function hasRawCoralMasks(node: THREE.Object3D) {
  let primitive: Record<string, unknown> | undefined
  for (let current: THREE.Object3D | null = node; current && !primitive; current = current.parent) primitive = current.userData.reefPrimitive
  const asset = assetMetadata(node)
  return asset?.schema === 'reef-asset-v1' && asset.kind === 'coral' && asset.maskSchema === 'coral-raw-masks-v1'
    && primitive?.maskSchema === 'coral-raw-masks-v1' && ['coral-rigid', 'coral-soft'].includes(String(primitive.role))
}

function hasDeclaredMeters(root: THREE.Object3D) {
  let count = 0, declared = true
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    count++
    const asset = assetMetadata(node)
    declared &&= asset?.schema === 'reef-asset-v1' && asset.units === 'meter' && asset.upAxis === '+Y'
  })
  return count > 0 && declared
}

function prepare(root: THREE.Object3D, control: boolean, sourceMaterials: Set<THREE.Material>, adjustable = false) {
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    node.castShadow = true; node.receiveShadow = true
    const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(material => {
      sourceMaterials.add(material)
      const copy = material.clone()
      if (copy instanceof THREE.MeshStandardMaterial) {
        // Bypass only explicitly declared coral raw masks. Unmarked imported
        // COLOR_0 remains display color, including on the map-free control.
        if (hasRawCoralMasks(node)) copy.vertexColors = false
        if (control) { copy.map = null; copy.roughnessMap = null; copy.metalnessMap = null; copy.normalMap = null; copy.aoMap = null }
        else if (adjustable) originals.set(copy, { normal: copy.normalMap, ao: copy.aoMap })
      }
      return copy
    })
    node.material = Array.isArray(node.material) ? materials : materials[0]
  })
}

function mapReport(gltf: GLTF) {
  const materials = new Set<THREE.MeshStandardMaterial>(), images = new Set<unknown>()
  let triangles = 0, vertices = 0, tangentVertices = 0
  gltf.scene.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    const positions = node.geometry.getAttribute('position')
    vertices += positions.count; triangles += (node.geometry.index?.count ?? positions.count) / 3
    tangentVertices += node.geometry.getAttribute('tangent')?.count ?? 0
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material instanceof THREE.MeshStandardMaterial) materials.add(material)
  })
  const roles = { baseColor: 0, roughness: 0, metallic: 0, normal: 0, AO: 0 }
  for (const material of materials) for (const [role, texture] of Object.entries({ baseColor: material.map, roughness: material.roughnessMap, metallic: material.metalnessMap, normal: material.normalMap, AO: material.aoMap })) {
    if (texture) { roles[role as keyof typeof roles]++; images.add(texture.source.data) }
  }
  const json = gltf.parser.json as { materials?: { pbrMetallicRoughness?: { baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }; normalTexture?: unknown; occlusionTexture?: unknown }[] }
  const pointers = (json.materials ?? []).map((material, i) => ({ material: i, baseColor: material.pbrMetallicRoughness?.baseColorTexture ?? null, metallicRoughness: material.pbrMetallicRoughness?.metallicRoughnessTexture ?? null, normal: material.normalTexture ?? null, occlusion: material.occlusionTexture ?? null }))
  return `${triangles.toLocaleString()} triangles · ${vertices.toLocaleString()} accessor vertices · ${tangentVertices.toLocaleString()} tangent vertices\n${materials.size} PBR materials · ${images.size} decoded images\nLoaded material bindings: ${JSON.stringify(roles)}\nActual glTF texture pointers: ${JSON.stringify(pointers, null, 2)}`
}

function boundsReport(label: string, root: THREE.Object3D) {
  const measured = new THREE.Box3().setFromObject(root), size = measured.getSize(new THREE.Vector3())
  return `${label}: min ${measured.min.toArray().map(n => n.toFixed(6))}; max ${measured.max.toArray().map(n => n.toFixed(6))}; dimensions ${size.toArray().map(n => n.toFixed(6))}`
}

function updateMaps() {
  originals.forEach((maps, material) => {
    material.normalMap = normal.checked ? maps.normal : null
    material.aoMap = ao.checked ? maps.ao : null
    material.needsUpdate = true
  })
}

function fit() {
  if (!renderer) return
  const width = viewport.clientWidth, height = viewport.clientHeight, phone = width < 600
  renderer.setSize(width, height, false)
  const aspect = phone ? width / (height / 2) : (width / 2) / height
  const radius = Math.max(fitSize.length() / 2, .005)
  const angle = Math.atan(Math.tan(THREE.MathUtils.degToRad(35 / 2)) * Math.min(1, aspect))
  const distance = radius / Math.sin(angle) * 1.15
  cameras.forEach(camera => {
    camera.aspect = aspect; camera.near = Math.max(.0001, distance / 1000); camera.far = Math.max(10, distance * 10)
    camera.position.copy(fitCenter).add(new THREE.Vector3(...(oblique ? [1, .38, 1.4] : [0, .08, 1.7]) as [number, number, number]).normalize().multiplyScalar(distance))
    camera.lookAt(fitCenter); camera.updateProjectionMatrix()
  })
  if (loadedStatus) status.textContent = `${loadedStatus} · ${width}×${height} drawing area · DPR 1`
}

async function loadChoice(index: number) {
  const request = ++version, choice = choices[index]
  loadedStatus = undefined
  status.classList.remove('error'); status.textContent = `Loading ${choice.specimen.label}…`
  const loader = new GLTFLoader()
  const loaded = await Promise.allSettled([loader.loadAsync(choice.bakedUrl), choice.referenceUrl ? loader.loadAsync(choice.referenceUrl) : Promise.resolve(undefined)])
  const baked = loaded[0].status === 'fulfilled' ? loaded[0].value : undefined
  const reference = loaded[1].status === 'fulfilled' ? loaded[1].value : undefined
  if (disposed || request !== version || loaded.some(result => result.status === 'rejected')) {
    disposeModels([baked?.scene, reference?.scene].filter((root): root is THREE.Group => Boolean(root)))
    if (!disposed && request === version) throw new Error('A specimen GLB failed to load; see console/network error')
    return
  }
  if (!baked) throw new Error('Missing baked specimen')
  mixers.forEach(mixer => { mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()) }); mixers = []
  roots.forEach(root => root.removeFromParent()); disposeModels(roots, true); roots = []; originals.clear()
  const control = reference?.scene ?? clone(baked.scene)
  const declaredMeters = hasDeclaredMeters(baked.scene) && (!reference || hasDeclaredMeters(reference.scene))
  const unitLabel = declaredMeters ? 'declared meter units' : 'uncalibrated source coordinates'
  const displayUnit = choice.specimen.reviewScale !== undefined ? 'm (chosen review design scale)' : declaredMeters ? 'm (declared asset units)' : 'source units (unverified)'
  const rawBounds = [boundsReport(`Raw baked GLB (${unitLabel})`, baked.scene), ...(reference ? [boundsReport(`Raw reference GLB (${unitLabel})`, reference.scene)] : [])].join('\n')
  const report = `${rawBounds}\n${choice.specimen.reviewScale === undefined ? 'No review placement scale.' : `Uniform REVIEW-only multiplier: ${choice.specimen.reviewScale}. Chosen design meters; source physical size unverified; not asset-contract validated.`}\n\n${mapReport(baked)}`
  if (choice.specimen.reviewScale !== undefined) { control.scale.multiplyScalar(choice.specimen.reviewScale); baked.scene.scale.multiplyScalar(choice.specimen.reviewScale) }
  const sourceMaterials = new Set<THREE.Material>()
  prepare(control, !reference, sourceMaterials); prepare(baked.scene, false, sourceMaterials, true)
  // Both sides now own cloned materials; the imported originals are detached.
  // Their shared textures remain owned by the active comparison, not disposed.
  sourceMaterials.forEach(material => material.dispose())
  roots = [control, baked.scene]
  roots.forEach((root, i) => {
    scenes[i].add(root)
    const mixer = new THREE.AnimationMixer(root); mixers.push(mixer)
    for (const clip of (i === 0 && reference ? reference : baked).animations) mixer.clipAction(clip).play()
  })
  bounds = new THREE.Box3()
  roots.forEach(root => bounds.union(new THREE.Box3().setFromObject(root)))
  bounds.getCenter(fitCenter); bounds.getSize(fitSize)
  floors.forEach(floor => { floor.position.set(fitCenter.x, bounds.min.y - .0002, fitCenter.z); floor.scale.setScalar(Math.max(fitSize.length() * 5, .1)) })
  keys.forEach(key => {
    const span = Math.max(fitSize.length(), .1)
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: .001, far: 20 })
    key.shadow.camera.updateProjectionMatrix()
  })
  labels[0].textContent = reference ? (choice.specimen.referenceLabel ?? 'Source/reference GLB') : 'Untextured control · same low geometry'
  labels[1].textContent = 'Baked GLB · map toggles affect this view'
  details.textContent = report
  for (const [link, url] of [[provenanceLink, choice.provenanceUrl], [validationLink, choice.validationUrl]] as const) {
    link.hidden = !url
    if (url) link.href = url
    else link.removeAttribute('href')
  }
  notes.textContent = `${choice.specimen.notes} Matched fit, cameras, neutral room environment, lights and exposure. Only explicitly marked coral raw masks bypass display color; other COLOR_0 is preserved. No coral sway/fluorescence or final habitat claim.`
  loadedStatus = `${choice.specimen.label} loaded · display ${fitSize.toArray().map(value => value.toFixed(4)).join(' × ')} ${displayUnit}`
  normal.disabled = ![...originals.values()].some(maps => maps.normal)
  ao.disabled = ![...originals.values()].some(maps => maps.ao)
  updateMaps(); fit()
}

function fail(error: unknown) { loadedStatus = undefined; console.error(error); status.classList.add('error'); status.textContent = `Pipeline proof unavailable: ${String(error)}` }
async function start() {
  if (new URLSearchParams(location.search).get('review') === 'local') {
    const response = await fetch('/pipeline-review/manifest.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('Local review manifest is not available in the whitelisted directory')
    const manifest = manifestSchema.parse(await response.json())
    choices = manifest.specimens.map(specimen => ({ specimen, bakedUrl: `/pipeline-review/${specimen.baked}`, referenceUrl: specimen.reference ? `/pipeline-review/${specimen.reference}` : undefined }))
  } else choices = curated
  if (!choices.length || disposed) return
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
  const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer)
  environment = pmrem.fromScene(room, .04); room.dispose(); pmrem.dispose()
  scenes.forEach(scene => {
    scene.background = new THREE.Color('#303a42'); scene.environment = environment!.texture
    const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(1, 2, 3); key.castShadow = true; key.shadow.mapSize.set(1024,1024); scene.add(key); keys.push(key)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x45403a, .5))
    const fill = new THREE.DirectionalLight(0xffffff, .7); fill.position.set(-2, 1, -1); scene.add(fill)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#686660', roughness: .9 }))
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor); floors.push(floor)
  })
  choices.forEach((choice, i) => select.add(new Option(choice.specimen.label, String(i))))
  select.disabled = false
  select.addEventListener('change', () => { loadChoice(Number(select.value)).catch(fail) })
  await loadChoice(0)
  if (disposed) return
  renderer.setAnimationLoop(now => {
    const dt = last === undefined || !Number.isFinite(now) ? 0 : Math.max(0, Math.min(.05, (now-last)/1000)); last = Number.isFinite(now) ? now : undefined
    if (!paused && !document.hidden) { lightPhase += dt * .45; mixers.forEach(mixer => mixer.update(dt)) }
    keys.forEach(key => { key.position.copy(fitCenter).add(new THREE.Vector3(Math.sin(lightPhase)*2, 2, 3)); key.target.position.copy(fitCenter); key.target.updateMatrixWorld() })
    const width = viewport.clientWidth, height = viewport.clientHeight, phone = width < 600
    renderer!.setScissorTest(true)
    scenes.forEach((scene, i) => {
      const x = phone ? 0 : i * width/2, y = phone ? (1-i)*height/2 : 0
      const w = phone ? width : width/2, h = phone ? height/2 : height
      renderer!.setViewport(x,y,w,h); renderer!.setScissor(x,y,w,h); renderer!.render(scene,cameras[i])
    })
  })
}

pause.textContent = paused ? 'Resume light sweep' : 'Pause light sweep'
pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Resume light sweep' : 'Pause light sweep' })
document.querySelector('#front')!.addEventListener('click', () => { oblique = false; fit() })
document.querySelector('#oblique')!.addEventListener('click', () => { oblique = true; fit() })
normal.addEventListener('change', updateMaps); ao.addEventListener('change', updateMaps)
const observer = new ResizeObserver(fit); observer.observe(viewport)
document.addEventListener('visibilitychange', () => { last = undefined })
addEventListener('pagehide', event => {
  // A bfcache return resumes this same document; do not leave it with a dead
  // renderer. Non-persisted navigation/reload still releases owned resources.
  if (event.persisted) { last = undefined; return }
  if (disposed) return
  disposed = true; version++; observer.disconnect(); renderer?.setAnimationLoop(null)
  mixers.forEach(mixer => { mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()) }); disposeModels(roots, true)
  floors.forEach(floor => { floor.geometry.dispose(); floor.material.dispose() })
  keys.forEach(key => key.shadow.dispose())
  environment?.dispose(); renderer?.dispose()
})
start().catch(fail)
