import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { ServiceConfig } from '../../lib/services'
import { getFishById } from '../../lib/fish'
import {
  DEFAULT_LEFT_ISLAND_MOUNTS,
  DEFAULT_RIGHT_ISLAND_MOUNTS,
  LIVE_ROCK_ISLAND_URLS,
  MODULAR_CORAL_ASSET_URLS,
  assembleCoralsOnRockSockets,
  instantiateModularReefHabitat,
} from './reef-assembly'
import {
  DEFAULT_AQUARIUM_OPTICS_CONFIG,
  createRestrainedCausticLightController,
  evaluateSurfaceRippleOffset,
  evaluateSuspendedParticlePosition,
} from './underwater-optics'
import { createSwimmingFish, seedForId, startleFish, stepSwimmingFish, type SwimmingFish, type WaterHabitat } from './motion'
import { applyFishTurningRigOverlay, bindFishTurningRig, evaluateSpriteTurnScaleX, type FishTurningRig } from './fish-turning'
import { SPRITE_PLANE_WIDTH, fishClearanceRadius, fishModelScale, fishRenderLength, fishSpriteScale } from './fish-scale'
import { canRunFishSceneLoop, findSafeFishSpawn, fishSceneStatus, isSafeFishPosition } from './fish-spawn'
import { EMPTY_FISH_EXTENSIONS, type FishExtensionConfig } from '../../simulation/fish-extensions'
import { consumeFrameSteps, createFrameClock, SIMULATION_STEP_SECONDS, suspendFrameClock } from './clock'
import { nearestVisibleIntersection, readArtworkAlpha, type SpriteMasks } from './alpha-picking'
import { applyFishLinkVisibility } from './fish-link-focus'

const modelUrls: Record<string, string> = {
  'ocellaris-clownfish': new URL('../proof/candidate-real-clown.glb', import.meta.url).href,
  'yellow-tang': new URL('../proof/candidate-real-tang.glb', import.meta.url).href,
}
export type SceneStatus = 'loading' | 'ready' | 'failed'
export type AquariumController = { update(services: ServiceConfig[], paused: boolean): void; activate(id: string): void; serviceAt(x: number, y: number): string | undefined; canActivate(id: string, x?: number, y?: number): boolean; dispose(): void }
type Inhabitant = { service: ServiceConfig; root: THREE.Group; motion: SwimmingFish; mixer?: THREE.AnimationMixer; turningRig?: FishTurningRig; anchor?: HTMLAnchorElement; visible: boolean; fallback: boolean; releasedFocus: boolean }

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

export function createAquarium(canvas: HTMLCanvasElement, overlay: HTMLElement, initialServices: ServiceConfig[], initialPaused: boolean, status: (status: SceneStatus) => void, focusFallback: () => HTMLElement | null = () => null, fishExtensions: FishExtensionConfig = EMPTY_FISH_EXTENSIONS): AquariumController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#183654')
  scene.fog = new THREE.Fog('#183654', 18, 36)
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 60); camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0)

  // 3-tier reef LED lighting rig (AQ-14.2 & AQ-39):
  // 1) Balanced sky-to-indigo-crevice HemisphereLight so overhangs & caves retain deep actinic shadow contrast
  const hemiLight = new THREE.HemisphereLight('#88ccff', '#1b1636', 0.62)
  scene.add(hemiLight)
  // 2) Crisp 14,000K overhead reef daylight key light with soft shadow map
  const keyLight = new THREE.DirectionalLight('#f6faff', 2.45)
  keyLight.position.set(1.2, 6.8, 4.6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.camera.near = 1.0
  keyLight.shadow.camera.far = 16.0
  keyLight.shadow.camera.left = -6.5
  keyLight.shadow.camera.right = 6.5
  keyLight.shadow.camera.top = 4.5
  keyLight.shadow.camera.bottom = -4.5
  keyLight.shadow.bias = -0.0006
  keyLight.shadow.normalBias = 0.015
  scene.add(keyLight)
  // 3) Royal-blue actinic fill light + soft top-back rim light
  const fillLight = new THREE.DirectionalLight('#5a98ff', 1.12)
  fillLight.position.set(-4.2, 2.8, 3.2)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight('#b4dcff', 0.45)
  rimLight.position.set(0, 4.2, -3.5)
  scene.add(rimLight)

  const causticLightController = createRestrainedCausticLightController(keyLight, fillLight, {
    keyLightIntensity: 2.45,
    fillLightIntensity: 1.12,
  })

  // Granular aragonite & coralline-rubble sand bed with rock-base contact AO & caustic shimmer (AQ-14.6 & AQ-14.2)
  const grain = new Uint8Array(256 * 256 * 4); let grainSeed = 1743
  for (let i = 0; i < grain.length; i += 4) {
    grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0
    const r0 = grainSeed / 4294967296
    grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0
    const r1 = grainSeed / 4294967296
    // Occasional tiny purple/pink coralline shell specks in warm ivory aragonite sand
    const isCorallineSpeck = r1 < 0.065
    const value = (r0 - .5) * 32
    grain[i] = Math.min(255, Math.max(0, (isCorallineSpeck ? 185 : 226) + value))
    grain[i + 1] = Math.min(255, Math.max(0, (isCorallineSpeck ? 152 : 228) + value))
    grain[i + 2] = Math.min(255, Math.max(0, (isCorallineSpeck ? 192 : 236) + value))
    grain[i + 3] = 255
  }
  const sandTexture = new THREE.DataTexture(grain, 256, 256); sandTexture.colorSpace = THREE.SRGBColorSpace; sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping; sandTexture.repeat.set(38, 24); sandTexture.magFilter = THREE.LinearFilter; sandTexture.minFilter = THREE.LinearMipmapLinearFilter; sandTexture.generateMipmaps = true; sandTexture.needsUpdate = true
  const sandGeometry = new THREE.PlaneGeometry(32, 20, 128, 80), sandPositions = sandGeometry.getAttribute('position')
  for (let i = 0; i < sandPositions.count; i++) {
    const sx = sandPositions.getX(i), sy = sandPositions.getY(i)
    const ripple = .032 * Math.sin(sx * .9) + .020 * Math.cos(sy * 1.4 + sx * .4)
    const leftMound = .12 * Math.exp(-Math.pow((sx + 2.35) / 2.5, 2) - Math.pow((sy - 1.35) / 1.7, 2))
    const rightMound = .11 * Math.exp(-Math.pow((sx - 2.85) / 2.4, 2) - Math.pow((sy - 1.20) / 1.6, 2))
    sandPositions.setZ(i, ripple + leftMound + rightMound)
  }
  sandGeometry.computeVertexNormals()
  const sandUniforms = { uSandTime: { value: 0 } }
  const sandMaterial = new THREE.MeshStandardMaterial({ map: sandTexture, roughness: 0.94, metalness: 0.0 })
  sandMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, sandUniforms)
    shader.vertexShader = `varying vec3 vSandWorldPos;\n` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvec4 sandWp = modelMatrix * vec4(transformed, 1.0);\nvSandWorldPos = sandWp.xyz;`,
    )
    shader.fragmentShader = `uniform float uSandTime;\nvarying vec3 vSandWorldPos;\n` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
// Deep indigo contact shadow beneath left and right live-rock islands + soft rear depth fade
float leftRockAo = 1.0 - 0.58 * exp(-pow((vSandWorldPos.x + 2.35) / 2.35, 2.0) - pow((vSandWorldPos.z + 1.35) / 1.35, 2.0));
float rightRockAo = 1.0 - 0.56 * exp(-pow((vSandWorldPos.x - 2.65) / 2.25, 2.0) - pow((vSandWorldPos.z + 1.20) / 1.30, 2.0));
float sandContactAo = leftRockAo * rightRockAo;
float rearDepthFade = smoothstep(-5.4, -0.4, vSandWorldPos.z);
vec3 shadowTint = vec3(0.16, 0.17, 0.34);
diffuseColor.rgb = mix(shadowTint, diffuseColor.rgb, sandContactAo * (0.42 + 0.58 * rearDepthFade));
float sWave1 = sin(uSandTime * 1.38 + vSandWorldPos.x * 1.9 + vSandWorldPos.z * 1.6);
float sWave2 = cos(uSandTime * 2.32 - vSandWorldPos.x * 1.4 + vSandWorldPos.z * 2.1);
float sandCaustic = smoothstep(0.15, 0.88, 0.5 + 0.25 * (sWave1 + sWave2)) * sandContactAo * rearDepthFade;
diffuseColor.rgb *= (0.86 + 0.22 * sandCaustic);
`,
    )
  }
  const sand = new THREE.Mesh(sandGeometry, sandMaterial); sand.rotation.x = -Math.PI / 2; sand.position.y = -2.8; sand.receiveShadow = true; scene.add(sand)

  // Layered Reef-Tank Backdrop (AQ-14.6 & AQ-39): eliminates the flat paint-bucket wall & sharp horizon line
  const rearUniforms = { uRearTime: { value: 0 } }
  const rearMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0.0 })
  rearMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, rearUniforms)
    shader.vertexShader = `varying vec3 vRearWorldPos;\n` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvec4 rearWp = modelMatrix * vec4(transformed, 1.0);\nvRearWorldPos = rearWp.xyz;`,
    )
    shader.fragmentShader = `uniform float uRearTime;\nvarying vec3 vRearWorldPos;\n` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
float hNorm = clamp((vRearWorldPos.y + 2.8) / 5.6, 0.0, 1.0);
// Deep actinic navy-indigo at base -> rich reef cobalt mid-water -> luminous aquamarine-violet under top LEDs
vec3 cBottom = vec3(0.06, 0.11, 0.24);
vec3 cMid = vec3(0.12, 0.26, 0.44);
vec3 cTop = vec3(0.26, 0.48, 0.66);
vec3 waterCol = mix(cBottom, cMid, smoothstep(0.0, 0.58, hNorm));
waterCol = mix(waterCol, cTop, smoothstep(0.52, 1.0, hNorm));

// Subtle rear-glass coralline & reef biofilm patina (like the real aquarium back glass in 12.23.52 PM)
float patinaNoise = 0.5 + 0.28 * sin(vRearWorldPos.x * 1.7 + cos(vRearWorldPos.y * 2.3)) + 0.22 * cos(vRearWorldPos.x * 4.1 - vRearWorldPos.y * 3.7);
float patinaMask = smoothstep(0.42, 0.82, patinaNoise) * (1.0 - smoothstep(0.65, 0.96, hNorm)) * 0.28;
vec3 cCorallineGlass = vec3(0.24, 0.16, 0.34);
waterCol = mix(waterCol, cCorallineGlass, patinaMask);

// Soft overhead LED light shafts / sunbeams filtering down from the top water surface
float beamCoord = vRearWorldPos.x * 0.85 - vRearWorldPos.y * 0.22;
float beam1 = 0.5 + 0.5 * sin(beamCoord * 2.4 + uRearTime * 0.45);
float beam2 = 0.5 + 0.5 * cos(beamCoord * 3.9 - uRearTime * 0.32 + 1.4);
float sunbeams = pow(beam1 * 0.6 + beam2 * 0.4, 2.2) * smoothstep(0.18, 0.98, hNorm);
waterCol += vec3(0.10, 0.16, 0.24) * sunbeams * 0.55;

diffuseColor.rgb = waterCol;
`,
    )
  }
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(32, 14), rearMaterial); rear.position.set(0, 0, -5.5); scene.add(rear)

  // Visible Rippling Top Water Surface / Meniscus (AQ-14.2 AC #1 & AQ-14.6 AC #2)
  const waterSurfaceGeometry = new THREE.PlaneGeometry(32, 12, 48, 20)
  const waterSurfaceMaterial = new THREE.MeshStandardMaterial({
    color: '#88c8f2',
    emissive: '#382458',
    emissiveIntensity: 0.32,
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const waterSurface = new THREE.Mesh(waterSurfaceGeometry, waterSurfaceMaterial)
  waterSurface.rotation.x = Math.PI / 2
  waterSurface.position.set(0, 2.66, -1.2)
  waterSurface.raycast = () => {}
  scene.add(waterSurface)

  // Restrained 24-Mote Suspended Water-Column Particles (AQ-43)
  const particleCount = DEFAULT_AQUARIUM_OPTICS_CONFIG.maxSuspendedParticles
  const particlePositions = new Float32Array(particleCount * 3)
  const particleGeometry = new THREE.BufferGeometry()
  const particlePositionAttr = new THREE.BufferAttribute(particlePositions, 3)
  particleGeometry.setAttribute('position', particlePositionAttr)
  const particleMaterial = new THREE.PointsMaterial({
    color: '#d8f0ff',
    size: 0.024,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  })
  const particles = new THREE.Points(particleGeometry, particleMaterial)
  particles.raycast = () => {}
  scene.add(particles)

  const abort = new AbortController(), loader = new GLTFLoader(), modelBases = new Map<string, GLTF>(), coralTemplates = new Map<string, THREE.Object3D>(), reefs: THREE.Object3D[] = []
  let rockIslandLeftBase: GLTF | undefined, rockIslandRightBase: GLTF | undefined
  let reefControllers: Array<ReturnType<typeof assembleCoralsOnRockSockets>> = []
  let coralElapsedSec = 0
  const reducedMotionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  let disposed = false, failed = false, loaded = false, paused = initialPaused, services = initialServices, fish: Inhabitant[] = []
  const loadedAssets = new Set<GLTF>()
  let habitat: WaterHabitat = { bounds: { min: { x: -4, y: -2.25, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }, obstacles: [], anchors: [] }
  let width = 1, height = 1, labelClock = 0, spawnUnavailable = false
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
    reefControllers = []; habitat.obstacles = []; habitat.anchors = []
    if (!rockIslandLeftBase || !rockIslandRightBase || coralTemplates.size === 0) return
    const reducedMotion = Boolean(reducedMotionQuery?.matches)
    const placements = width < 600
      ? [
          {
            islandKind: 'left' as const,
            rockScene: rockIslandLeftBase.scene,
            mounts: DEFAULT_LEFT_ISLAND_MOUNTS,
            position: { x: -0.15, y: -2.70, z: -1.35 },
            uniformScale: 3.4,
            yaw: 0.06,
          },
        ]
      : [
          {
            islandKind: 'left' as const,
            rockScene: rockIslandLeftBase.scene,
            mounts: DEFAULT_LEFT_ISLAND_MOUNTS,
            position: { x: -2.35, y: -2.70, z: -1.35 },
            uniformScale: 4.5,
            yaw: 0.08,
          },
          {
            islandKind: 'right' as const,
            rockScene: rockIslandRightBase.scene,
            mounts: DEFAULT_RIGHT_ISLAND_MOUNTS,
            position: { x: 2.65, y: -2.70, z: -1.20 },
            uniformScale: 4.3,
            yaw: -0.10,
          },
        ]
    for (const [i, placement] of placements.entries()) {
      const { islandKind, rockScene, mounts, position, uniformScale, yaw } = placement
      const reef = rockScene.clone(true)
      const assembled = assembleCoralsOnRockSockets(reef, coralTemplates, mounts, {
        paused: paused || document.hidden,
        reducedMotion,
      })
      reefControllers.push(assembled)
      reef.scale.setScalar(uniformScale)
      reef.position.set(position.x, position.y, position.z)
      reef.rotation.y = yaw
      scene.add(reef)
      reefs.push(reef)

      const result = instantiateModularReefHabitat(islandKind, uniformScale, position, `reef-${i}`, yaw)
      habitat.obstacles.push(...result.obstacles)
      habitat.anchors.push(...result.anchors)
      reef.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) })
    }
    hitMeshes.push(sand)
  }
  function removeFish() {
    const extensionErrors: unknown[] = []
    fish.forEach(item => {
      try { item.motion.extensions.dispose() } catch (error) { extensionErrors.push(error) }
      scene.remove(item.root); item.mixer?.stopAllAction(); item.mixer?.uncacheRoot(item.mixer.getRoot()); item.root.traverse(object => { if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose() })
    })
    ownedSprites.forEach(sprite => { disposeTree(sprite) }); ownedSprites.length = 0; fish = []
    if (extensionErrors.length) console.error('Fish extension cleanup failed', new AggregateError(extensionErrors, 'Fish extension cleanup failed'))
  }
  function rebuildFish(): boolean | undefined {
    removeFish(); if (!loaded || disposed) return undefined
    hitMeshes.splice(0); reefs.forEach(reef => reef.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) })); hitMeshes.push(sand)
    const anchors = new Map(Array.from(overlay.querySelectorAll<HTMLAnchorElement>('a[data-service-id]')).map(anchor => [anchor.dataset.serviceId!, anchor]))
    const spawnPlans = services.map((service, i) => {
      const species = getFishById(service.fishId); if (!species) return undefined
      const span = habitat.bounds.max.x - habitat.bounds.min.x
      const x = width < 600 ? [-.3, .3, 0][i % 3] : ((i % 3) - 1) * Math.min(span * .26, 2.7)
      const y = (width < 600 ? [1.25, .55, 1.95][i % 3] : 1.45) - Math.floor(i / 3) * .7
      const clearance = fishClearanceRadius(service.fishId)
      const preferred = { x, y: Math.max(.3, y), z: 1.8 + (i % 2) * .2 }
      return { species, clearance, position: findSafeFishSpawn(preferred, habitat.bounds, habitat.obstacles, clearance) }
    })
    if (spawnPlans.some(plan => plan !== undefined && plan.position === undefined)) {
      // The React-owned native service links remain in the visible fallback layout.
      // Never create an unsafe fish or shrink its model/radius to make it fit.
      spawnUnavailable = true
      syncLoop()
      return false
    }
    spawnUnavailable = false
    services.forEach((service, i) => {
      const spawn = spawnPlans[i]; if (!spawn) return
      const { species, clearance, position } = spawn
      const root = new THREE.Group(), base = modelBases.get(service.fishId), fallback = !base
      let mixer: THREE.AnimationMixer | undefined
      let turningRig: FishTurningRig | undefined
      if (base) {
        const model = clone(base.scene); root.add(model); model.scale.setScalar(fishModelScale(service.fishId))
        turningRig = bindFishTurningRig(model, service.fishId)
        mixer = new THREE.AnimationMixer(model); base.animations.forEach(clip => mixer!.clipAction(clip).play()); mixer.setTime((seedForId(service.id) % 1500) / 1000)
      } else {
        const spriteScale = fishSpriteScale(service.fishId)
        const texture = new THREE.TextureLoader().load(species.thumbnail, loadedTexture => {
          if (disposed || failed || !ownedSprites.includes(sprite)) return
          const image = loadedTexture.image as HTMLImageElement
          const imageWidth = image.naturalWidth, imageHeight = image.naturalHeight
          if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth > 0 && imageHeight > 0) {
            sprite.scale.set(spriteScale, spriteScale * (SPRITE_PLANE_WIDTH / .62) * (imageHeight / imageWidth), 1)
          }
          try { spriteMasks.set(sprite, { texture: loadedTexture, pixels: readArtworkAlpha(image) }) }
          catch (error) { console.warn('Fish artwork alpha unavailable', error) }
          if (!document.hidden) render(0, true)
        }); texture.colorSpace = THREE.SRGBColorSpace
        const sprite = new THREE.Mesh(new THREE.PlaneGeometry(SPRITE_PLANE_WIDTH, .62), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .2, depthWrite: true, side: THREE.DoubleSide }))
        sprite.scale.set(spriteScale, spriteScale, 1)
        root.add(sprite); ownedSprites.push(sprite)
        spriteMasks.set(sprite, { texture }) // pending/failed masks never claim opaque pixels
      }
      const motion = createSwimmingFish(service.id, service.fishId, position!, clearance, fishExtensions)
      root.position.set(motion.position.x, motion.position.y, motion.position.z); scene.add(root)
      root.traverse(object => { if (object instanceof THREE.Mesh) { object.userData.serviceId = service.id; hitMeshes.push(object) } })
      const anchor = anchors.get(service.id); if (anchor) anchor.title = `${service.name} · ${species.commonName}${fallback ? ' · artwork preview' : ''}`
      fish.push({ service, root, motion, mixer, turningRig, anchor, visible: false, fallback, releasedFocus: false })
    })
    render(0, true)
    return true
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
      const bodyLength = fishRenderLength(item.service.fishId)
      const linkWidth = Math.max(44, pixels * Math.max(.55, bodyLength * 1.15)), linkHeight = Math.max(44, pixels * Math.max(.42, bodyLength * .78))
      anchor.style.transform = `translate3d(${x - linkWidth / 2}px,${y - linkHeight / 2}px,0)`; anchor.style.width = `${linkWidth}px`; anchor.style.height = `${linkHeight}px`
      anchor.style.zIndex = String(Math.round((item.root.position.z + 10) * 100))
    }
  }
  function render(steps: number, forceLabels = false) {
    const habitatStopped = paused || document.hidden
    const reducedMotion = Boolean(reducedMotionQuery?.matches)
    if (!habitatStopped && !reducedMotion && steps > 0) {
      coralElapsedSec = (coralElapsedSec + steps * SIMULATION_STEP_SECONDS) % 3600
    }
    const effectiveEnvTime = habitatStopped || reducedMotion ? 0 : coralElapsedSec
    sandUniforms.uSandTime.value = effectiveEnvTime
    rearUniforms.uRearTime.value = effectiveEnvTime
    causticLightController.update(coralElapsedSec, habitatStopped, reducedMotion)

    // Update top water-surface ripple displacement (AQ-14.2 AC #1 & #5)
    const surfPos = waterSurfaceGeometry.getAttribute('position')
    for (let i = 0; i < surfPos.count; i++) {
      const wx = surfPos.getX(i), wz = surfPos.getY(i)
      surfPos.setZ(i, evaluateSurfaceRippleOffset(wx, wz, coralElapsedSec, { paused: habitatStopped, reducedMotion, amplitudeM: 0.032 }))
    }
    surfPos.needsUpdate = true

    // Update 24 restrained water-column motes (AQ-43 AC #2)
    for (let i = 0; i < particleCount; i++) {
      const pt = evaluateSuspendedParticlePosition(i, habitat.bounds, coralElapsedSec, {
        paused: habitatStopped,
        reducedMotion,
      })
      particlePositions[i * 3] = pt.x
      particlePositions[i * 3 + 1] = pt.y
      particlePositions[i * 3 + 2] = pt.z
    }
    particlePositionAttr.needsUpdate = true

    for (const controller of reefControllers) {
      controller.update(coralElapsedSec, habitatStopped, reducedMotion)
    }
    for (let step = 0; step < steps; step++) for (const item of fish) {
      const focused = document.activeElement === item.anchor
      if (!focused) item.releasedFocus = false
      const stopped = paused || document.hidden || (focused && !item.releasedFocus)
      stepSwimmingFish(item.motion, habitat, SIMULATION_STEP_SECONDS, stopped)
      if (!stopped) {
        item.mixer?.update(SIMULATION_STEP_SECONDS * (.55 + Math.min(1.7, item.motion.speed * 2.2)) * item.motion.animationPlaybackRate)
        if (item.turningRig) applyFishTurningRigOverlay(item.turningRig, item.motion.turnKinematics, stopped)
      }
    }
    for (const item of fish) {
      const pose = item.motion; item.root.position.set(pose.position.x, pose.position.y, pose.position.z)
      if (item.fallback) { item.root.rotation.set(0, 0, 0); item.root.scale.x = evaluateSpriteTurnScaleX(pose.yaw) }
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
    if (!canRunFishSceneLoop(paused, document.hidden, spawnUnavailable)) {
      renderer.setAnimationLoop(null)
      if (!document.hidden && !spawnUnavailable) render(0, true)
    }
    else renderer.setAnimationLoop(tick)
  }
  let narrow = false
  function resize() {
    if (disposed || failed) return
    const nextWidth = Math.max(1, canvas.parentElement!.clientWidth), nextHeight = Math.max(1, canvas.parentElement!.clientHeight)
    const sizeChanged = width !== nextWidth || height !== nextHeight
    width = nextWidth; height = nextHeight
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
    // The nearest fish depth controls the safe horizontal envelope, so depth
    // changes cannot send an otherwise in-bounds fish beyond the view edge.
    const halfWidth = Math.min(5.0, (camera.position.z - 2.8) * Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect * .96)
    habitat.bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
    const newNarrow = width < 600
    const recoveringFromUnavailableSpawn = spawnUnavailable
    let rebuildSucceeded: boolean | undefined
    if (loaded && (narrow !== newNarrow || (spawnUnavailable && sizeChanged) || fish.some(item => !isSafeFishPosition(item.motion.position, item.motion.clearance, habitat.bounds, habitat.obstacles)))) {
      narrow = newNarrow; rebuildHabitat(); rebuildSucceeded = rebuildFish()
      if (rebuildSucceeded !== undefined) status(fishSceneStatus(!rebuildSucceeded))
    }
    if (recoveringFromUnavailableSpawn && rebuildSucceeded === true) syncLoop()
    if (!spawnUnavailable) render(0, true)
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
    const coralIds = Object.keys(MODULAR_CORAL_ASSET_URLS)
    const fishIds = Object.keys(modelUrls)
    const [rockLeft, rockRight, ...restModels] = await Promise.all([
      load(LIVE_ROCK_ISLAND_URLS.left),
      load(LIVE_ROCK_ISLAND_URLS.right),
      ...coralIds.map(id => load(MODULAR_CORAL_ASSET_URLS[id])),
      ...fishIds.map(id => load(modelUrls[id])),
    ])
    if (disposed || failed) return
    rockIslandLeftBase = rockLeft
    rockIslandRightBase = rockRight
    coralIds.forEach((id, i) => coralTemplates.set(id, restModels[i].scene))
    fishIds.forEach((id, i) => modelBases.set(id, restModels[coralIds.length + i]))
    loaded = true; narrow = width < 600; rebuildHabitat()
    const initialSpawnSucceeded = rebuildFish() === true
    status(fishSceneStatus(!initialSpawnSucceeded))
    syncLoop()
  }
  void initialize().catch(error => { console.error('Aquarium assets could not load', error); failed = true; loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); if (!disposed) { renderer.setAnimationLoop(null); status('failed') } })
  syncLoop()
  return {
    update(next, stopped) {
      const changed = JSON.stringify(next) !== JSON.stringify(services); services = next; paused = stopped
      if (changed) {
        const rebuilt = rebuildFish()
        if (rebuilt !== undefined) status(fishSceneStatus(!rebuilt))
      }
      syncLoop()
    },
    activate(id) { const item = fish.find(item => item.service.id === id); if (!item || paused || document.hidden) return; item.releasedFocus = true; startleFish(item.motion, habitat) },
    serviceAt: nearest,
    canActivate(id, x, y) { const item = fish.find(item => item.service.id === id); return Boolean(item && (x === undefined || y === undefined ? updateVisibility(item) : nearest(x, y) === id)) },
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); observer.disconnect(); renderer.setAnimationLoop(null)
      removeFish(); loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); sand.geometry.dispose(); sand.material.dispose(); sandTexture.dispose(); rear.geometry.dispose(); rear.material.dispose(); waterSurfaceGeometry.dispose(); waterSurfaceMaterial.dispose(); particleGeometry.dispose(); particleMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss()
    },
  }
}
