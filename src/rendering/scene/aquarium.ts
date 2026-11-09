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
  DEPTH_HAZE_END_Z,
  DEPTH_HAZE_START_Z,
  LIGHT_SHAFT_BAND_CENTERS,
  LIGHT_SHAFT_BAND_WIDTH_M,
  LIGHT_SHAFT_SLANT_PER_M,
  LIGHT_SHAFT_SWAY_AMPLITUDE_M,
  LIGHT_SHAFT_SWAY_HZ,
  createRestrainedCausticLightController,
  evaluateBubblePosition,
  evaluateDepthTintedColor,
  evaluateFixtureIntensities,
  evaluateFluorescenceActinicFactor,
  evaluateSurfaceRippleOffset,
  evaluateSuspendedParticlePosition,
} from './underwater-optics'
import { createAragoniteSandBed } from './aragonite-sand'
import { estimateCaptionRect, labelLiftPx, resolveLabelDeconflicts } from './fish-label-layout'
import { ENVIRONMENT_MAP_INTENSITY, applyEnvironmentMapIntensity, createAquariumEnvironmentMap } from './environment-map'
import { createSwimmingFish, seedForId, startleFish, stepSwimmingSchool, type SwimmingFish, type WaterHabitat } from './motion'
import { createReefMeshNavigation, MESH_NAVIGATION_COLLISION_RADIUS_M, type ReefMeshIslandInput } from './reef-mesh-navigation'
import { applyFishTurningRigOverlay, bindFishTurningRig, evaluateSpriteTurnScaleX, type FishTurningRig } from './fish-turning'
import { SPRITE_PLANE_WIDTH, fishClearanceRadius, fishModelScale, fishRenderLength, fishSpriteScale } from './fish-scale'
import { canRunFishSceneLoop, findSafeFishHeading, findSafeFishSpawn, fishSceneStatus, fishSpawnPreference, isSafeFishPosition } from './fish-spawn'
import { EMPTY_FISH_EXTENSIONS, type FishExtensionConfig } from '../../simulation/fish-extensions'
import { consumeFrameSteps, createFrameClock, SIMULATION_STEP_SECONDS, suspendFrameClock } from './clock'
import { handleArtworkTextureFailure, nearestVisibleIntersection, readArtworkAlpha, type SpriteMasks } from './alpha-picking'
import { applyFishLinkVisibility } from './fish-link-focus'
import { projectFishLinkBounds } from './fish-link-projection'
import { createFishClipPlayer, type FishClipPlayer } from './fish-animation'
import { bindFishFlexToModel, updateFishFlex, type FishFlexBinding } from './fish-flex-material'
import { reconcileFishInhabitants, refreshFishLink } from './fish-inhabitants'
import { SCHOOL_TOTAL_COUNT, resolveSchoolPopulation, schoolmateSpawnOffset } from './school-population'
import { applyCaustics, createCaustics } from './caustics'
import { AdaptiveQualityController, LAZY_MAX_CONCURRENT_LOADS, QUALITY_TIERS, lodAnimationFrameSkip, orderLazyLoadQueue, phase0SpeciesIds, projectedFishLengthPx, selectFishLod, type FishLod, type QualityTier } from './runtime-quality'
import { FRAME_RATE_PUSH_INTERVAL_MS, FrameRateSampler, type FrameRateSample } from './frame-rate'
import {
  DEFAULT_CAMERA_DISTANCE_M,
  DEFAULT_CAMERA_ZOOM_STATE,
  clampCameraZoomState,
  dampCameraZoomState,
  isOverviewZoomState,
  panCameraZoomState,
  stepZoomDistance,
  zoomStateForFocalArea,
  zoomToCursor,
  type CameraZoomState,
  type FocalAreaId,
} from './camera-zoom'

const modelUrls: Record<string, string> = {
  'ocellaris-clownfish': new URL('../proof/candidate-real-clown.glb', import.meta.url).href,
  'yellow-tang': new URL('../proof/candidate-real-tang.glb', import.meta.url).href,
  'blue-tang': new URL('../assets/splat-fish/blue-tang.glb', import.meta.url).href,
  'royal-gramma': new URL('../assets/splat-fish/royal-gramma.glb', import.meta.url).href,
  'banggai-cardinalfish': new URL('../assets/splat-fish/banggai-cardinalfish.glb', import.meta.url).href,
  'mandarin-dragonet': new URL('../assets/splat-fish/mandarin-dragonet.glb', import.meta.url).href,
  'blue-green-chromis': new URL('../assets/splat-fish/blue-green-chromis.glb', import.meta.url).href,
  firefish: new URL('../assets/splat-fish/firefish.glb', import.meta.url).href,
  'yellow-watchman-goby': new URL('../assets/splat-fish/yellow-watchman-goby.glb', import.meta.url).href,
  'tailspot-blenny': new URL('../assets/splat-fish/tailspot-blenny.glb', import.meta.url).href,
  'six-line-wrasse': new URL('../assets/splat-fish/six-line-wrasse.glb', import.meta.url).href,
  'mccoskers-flasher-wrasse': new URL('../assets/splat-fish/mccoskers-flasher-wrasse.glb', import.meta.url).href,
  'lyretail-anthias': new URL('../assets/splat-fish/lyretail-anthias.glb', import.meta.url).href,
  'flame-angelfish': new URL('../assets/splat-fish/flame-angelfish.glb', import.meta.url).href,
  'copperband-butterflyfish': new URL('../assets/splat-fish/copperband-butterflyfish.glb', import.meta.url).href,
}
export type SceneStatus = 'loading' | 'ready' | 'failed'
export type AquariumController = { update(services: ServiceConfig[], paused: boolean): void; activate(id: string): void; serviceAt(x: number, y: number): string | undefined; canActivate(id: string, x?: number, y?: number): boolean; dispose(): void; zoomIn(): boolean; zoomOut(): boolean; zoomToFocalArea(id: FocalAreaId): boolean; resetZoom(): boolean; isZoomed(): boolean; getCameraZoom(): CameraZoomState }
type Inhabitant = { service: ServiceConfig; root: THREE.Group; motion: SwimmingFish; clipPlayer?: FishClipPlayer; turningRig?: FishTurningRig; flex?: FishFlexBinding; anchor?: HTMLAnchorElement; visible: boolean; fallback: boolean; releasedFocus: boolean; artwork?: THREE.Mesh; artworkUnavailable?: boolean; schoolmate: boolean; lod: FishLod; lodModel?: THREE.Object3D; lodSprite?: THREE.Mesh }

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

export function createAquarium(canvas: HTMLCanvasElement, overlay: HTMLElement, initialServices: ServiceConfig[], initialPaused: boolean, status: (status: SceneStatus) => void, focusFallback: () => HTMLElement | null = () => null, fishExtensions: FishExtensionConfig = EMPTY_FISH_EXTENSIONS, onFrameRate?: (sample: FrameRateSample | null) => void): AquariumController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // Underwater optics are the single source of truth for the water column
  // (AQ-39 AC #2): background, fog, light intensities, and ripple amplitude
  // all come from DEFAULT_AQUARIUM_OPTICS_CONFIG instead of a second set of
  // literals. The fog/background colour is the config background tinted by
  // Beer-Lambert transmittance at the rear-wall path depth (3.5 m, the
  // aquarium-scale bound in evaluateDepthTransmittance), so distant water
  // loses red first while foreground fish at depth ~0 stay un-veiled.
  // '#183654' tinted at 3.5 m is '#082d50'. This is a static setup-time
  // colour, so pause / prefers-reduced-motion need no handling here; the
  // animated optics (caustics, ripples, particles) already freeze below.
  const optics = DEFAULT_AQUARIUM_OPTICS_CONFIG
  const waterColumnColor = evaluateDepthTintedColor(optics.backgroundHex, 3.5)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(waterColumnColor)
  scene.fog = new THREE.Fog(waterColumnColor, optics.fogNear, optics.fogFar)
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 60); camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0)

  // Camera zoom into focal areas (AQ-62 AC #1/#2): the camera stays front-on
  // and dollies toward a focal target inside the water volume. `current` is
  // what is rendered; `desired` is what the user asked for. render() damps
  // current toward desired each frame, so zooming is a smooth interpolated
  // transition — unless prefers-reduced-motion is set, in which case the
  // camera snaps instantly (AQ-62 AC #5). Labels and raycast picking read
  // the live camera every frame (projectFishLinkBounds / nearest), so they
  // stay accurate at every zoom state by construction (AQ-62 AC #4).
  let cameraZoomCurrent: CameraZoomState = { ...DEFAULT_CAMERA_ZOOM_STATE }
  let cameraZoomDesired: CameraZoomState = { ...DEFAULT_CAMERA_ZOOM_STATE }
  function applyCameraZoom() {
    camera.position.set(cameraZoomCurrent.targetX, cameraZoomCurrent.targetY, cameraZoomCurrent.targetZ + cameraZoomCurrent.distance)
    camera.lookAt(cameraZoomCurrent.targetX, cameraZoomCurrent.targetY, cameraZoomCurrent.targetZ)
    camera.updateProjectionMatrix()
  }
  function setCameraZoomDesired(next: CameraZoomState) {
    cameraZoomDesired = clampCameraZoomState(next)
    // Apply once immediately so zoom responds while paused (no animation
    // loop): render() snaps when the loop is stopped, and damps when it runs.
    render(0, true)
    return !isOverviewZoomState(cameraZoomDesired)
  }

  // Runtime-generated PMREM environment map (AQ-71): procedural IBL from the
  // tank's own palette, generated once here. scene.background stays the
  // Beer-Lambert-tinted water colour from AQ-39.
  const environmentMap = createAquariumEnvironmentMap(renderer)
  if (environmentMap) scene.environment = environmentMap.texture

  // 3-tier reef LED lighting rig (AQ-14.2 & AQ-39):
  // 1) Balanced sky-to-indigo-crevice HemisphereLight so overhangs & caves retain deep actinic shadow contrast
  const hemiLight = new THREE.HemisphereLight('#88ccff', '#1b1636', 0.40)
  scene.add(hemiLight)
  // 2) Crisp 14,000K overhead reef daylight key light with soft shadow map.
  // AQ-70.6 AC #2: the key/fill split is derived from the fixture
  // white/blue balance and total output in the optics config, so tuning
  // the fixture re-balances both lights (and the coral fluorescence) at
  // once. At the default balance the resolved intensities are exactly the
  // long-standing 2.1 / 0.95.
  const fixture = evaluateFixtureIntensities(optics.fixtureWhiteBalance, optics.fixtureTotalIntensity)
  const keyLight = new THREE.DirectionalLight('#f6faff', fixture.keyLightIntensity)
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
  const fillLight = new THREE.DirectionalLight('#5a98ff', fixture.fillLightIntensity)
  fillLight.position.set(-4.2, 2.8, 3.2)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight('#b4dcff', 0.45)
  rimLight.position.set(0, 4.2, -3.5)
  scene.add(rimLight)

  const causticLightController = createRestrainedCausticLightController(keyLight, fillLight, {
    keyLightIntensity: fixture.keyLightIntensity,
    fillLightIntensity: fixture.fillLightIntensity,
  })

  // Real caustic texture (AQ-14.2 AC #2, AQ-70.6 AC #1): one shared
  // procedural cellular texture and time uniform for the sand, live-rock,
  // coral, and fish shaders (see caustics.ts). Backdrop and water surface
  // are deliberately not patched.
  const caustics = createCaustics()

  // Photoreal aragonite sand bed (AQ-73 / AQ-70.12): the generated PBR
  // trio (grain-scale normal/roughness, non-repeating macro variation),
  // rock-base contact AO, talus mounding, and rear-rising aquascaping slope
  // live in aragonite-sand.ts. This replaces the old inline 256x256 LCG-noise
  // texture with its hard-coded indigo AO blobs, which made the islands read
  // as floating. AQ-70.6: the sand's own caustic ridge network was removed;
  // the shared cellular caustic chunk is applied here instead, so the sand
  // shows the same caustic system as the rock, coral, and fish.
  const sandBed = createAragoniteSandBed({ narrow: false })
  const sand = sandBed.sandMesh
  applyCaustics(sand.material as THREE.MeshStandardMaterial, caustics)
  scene.add(sandBed.group)

  // Layered Reef-Tank Backdrop (AQ-14.6 & AQ-39): eliminates the flat paint-bucket wall & sharp horizon line
  const rearUniforms = { uRearTime: { value: 0 } }
  const rearMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0.0 })
  rearMaterial.envMapIntensity = ENVIRONMENT_MAP_INTENSITY.backdrop
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
// AQ-86: deepened base/mid so the graded background reads darker deep-blue with depth.
vec3 cBottom = vec3(0.04, 0.08, 0.19);
vec3 cMid = vec3(0.10, 0.23, 0.40);
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

// AQ-86: soften the hard horizontal background/sand seam — the lowest band
// of the backdrop eases toward the warm aragonite sand tone instead of
// ending on a hard navy line. No blur, veil, or vignette is involved.
waterCol = mix(vec3(0.30, 0.27, 0.22), waterCol, smoothstep(0.0, 0.14, hNorm));

diffuseColor.rgb = waterCol;
`,
    )
  }
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(32, 14), rearMaterial); rear.position.set(0, 0, -5.5); scene.add(rear)

  // Restrained aquarium-scale depth haze (AQ-86 AC #1): one translucent
  // plane midway between the fish volume and the rear wall, deepening the
  // rear water column without fogging the foreground. No open-ocean fog
  // (AQ-39 §1.1), blue veil, blur, or dark vignette (AQ-14.6 AC #3,
  // AQ-14.2 AC #4) — the plane is static, its alpha peaks at 0.22 at the
  // sand, and it sits behind the fish volume (z < -1.5) by construction.
  const hazeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uHazeAlpha: { value: optics.depthHazeMaxAlpha } },
    vertexShader: 'varying vec2 vHazeUv; void main() { vHazeUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uHazeAlpha;
      varying vec2 vHazeUv;
      void main() {
        float vertical = 1.0 - vHazeUv.y;
        float edgeFade = smoothstep(0.0, 0.10, vHazeUv.x) * smoothstep(1.0, 0.90, vHazeUv.x);
        vec3 hazeColor = mix(vec3(0.05, 0.16, 0.30), vec3(0.02, 0.07, 0.16), vertical);
        float alpha = uHazeAlpha * (0.45 + 0.55 * vertical) * edgeFade;
        gl_FragColor = vec4(hazeColor, alpha);
      }`,
  })
  const hazePlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.4), hazeMaterial)
  hazePlane.position.set(0, -0.08, (DEPTH_HAZE_START_Z + DEPTH_HAZE_END_Z) / 2)
  hazePlane.renderOrder = 1
  hazePlane.raycast = () => {}
  scene.add(hazePlane)

  // Soft volumetric light shafts (AQ-86 AC #2): one additive plane just
  // behind the fish volume carrying the three slanted bands from
  // underwater-optics.ts (mirrored by evaluateLightShaftIntensity, so the
  // CPU reference and the shader can never disagree). Bands weaken with
  // depth and freeze at the t=0 phase on pause / reduced-motion / hidden,
  // exactly like the caustic and ripple channels.
  const shaftUniforms = {
    uShaftTime: { value: 0 },
    uShaftAlpha: { value: optics.lightShaftMaxAlpha },
  }
  const shaftMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: shaftUniforms,
    vertexShader: 'varying vec3 vShaftWorldPos; varying vec2 vShaftUv; void main() { vShaftUv = uv; vec4 shaftWp = modelMatrix * vec4(position, 1.0); vShaftWorldPos = shaftWp.xyz; gl_Position = projectionMatrix * viewMatrix * shaftWp; }',
    fragmentShader: `
      uniform float uShaftTime;
      uniform float uShaftAlpha;
      varying vec3 vShaftWorldPos;
      varying vec2 vShaftUv;
      void main() {
        float depthFromTop = clamp((2.8 - vShaftWorldPos.y) / 5.6, 0.0, 1.0);
        float depthEnvelope = 1.0 - 0.85 * depthFromTop;
        float edgeFade = smoothstep(0.0, 0.06, vShaftUv.x) * smoothstep(1.0, 0.94, vShaftUv.x);
        float shaft = 0.0;
${LIGHT_SHAFT_BAND_CENTERS.map((center, index) => `        float sway${index} = ${LIGHT_SHAFT_SWAY_AMPLITUDE_M.toFixed(2)} * sin(uShaftTime * ${(2 * Math.PI * LIGHT_SHAFT_SWAY_HZ).toFixed(4)} + ${center.toFixed(2)});
        shaft += exp(-pow((vShaftWorldPos.x - (${center.toFixed(2)} + (2.8 - vShaftWorldPos.y) * ${LIGHT_SHAFT_SLANT_PER_M.toFixed(2)} + sway${index})) / ${LIGHT_SHAFT_BAND_WIDTH_M.toFixed(2)}, 2.0));`).join('\n')}
        float alpha = min(shaft, 1.0) * depthEnvelope * edgeFade * uShaftAlpha;
        gl_FragColor = vec4(vec3(0.55, 0.80, 0.95) * alpha, alpha);
      }`,
  })
  const shaftPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.4), shaftMaterial)
  shaftPlane.position.set(0, -0.08, DEPTH_HAZE_START_Z - 0.3)
  shaftPlane.renderOrder = 2
  shaftPlane.raycast = () => {}
  scene.add(shaftPlane)

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
  waterSurfaceMaterial.envMapIntensity = ENVIRONMENT_MAP_INTENSITY.waterSurface
  const waterSurface = new THREE.Mesh(waterSurfaceGeometry, waterSurfaceMaterial)
  waterSurface.rotation.x = Math.PI / 2
  waterSurface.position.set(0, 2.66, -1.2)
  waterSurface.raycast = () => {}
  scene.add(waterSurface)

  // Depth-graded suspended particulate (AQ-43 as amended 2026-11-08):
  // 48 motes total — 16 faint foreground motes in the fish volume
  // (z -1.5..+2.8) and 32 background motes behind it (z -4.6..-1.5),
  // so the density reads as a depth cue without clouding the fish.
  const foregroundParticleCount = DEFAULT_AQUARIUM_OPTICS_CONFIG.foregroundSuspendedParticles
  const backgroundParticleCount = DEFAULT_AQUARIUM_OPTICS_CONFIG.backgroundSuspendedParticles
  const foregroundParticlePositions = new Float32Array(foregroundParticleCount * 3)
  const foregroundParticleGeometry = new THREE.BufferGeometry()
  const foregroundParticlePositionAttr = new THREE.BufferAttribute(foregroundParticlePositions, 3)
  foregroundParticleGeometry.setAttribute('position', foregroundParticlePositionAttr)
  const foregroundParticleMaterial = new THREE.PointsMaterial({
    color: '#d8f0ff',
    size: 0.02,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  })
  const foregroundParticles = new THREE.Points(foregroundParticleGeometry, foregroundParticleMaterial)
  foregroundParticles.raycast = () => {}
  scene.add(foregroundParticles)
  const backgroundParticlePositions = new Float32Array(backgroundParticleCount * 3)
  const backgroundParticleGeometry = new THREE.BufferGeometry()
  const backgroundParticlePositionAttr = new THREE.BufferAttribute(backgroundParticlePositions, 3)
  backgroundParticleGeometry.setAttribute('position', backgroundParticlePositionAttr)
  const backgroundParticleMaterial = new THREE.PointsMaterial({
    color: '#d8f0ff',
    size: 0.03,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  })
  const backgroundParticles = new THREE.Points(backgroundParticleGeometry, backgroundParticleMaterial)
  backgroundParticles.raycast = () => {}
  scene.add(backgroundParticles)

  // Sparse bubble streams (AQ-43 as amended 2026-11-08): one pre-allocated
  // Points system, 16 slots per stream, 32 total. Emitters are derived
  // from the live-rock island placements in rebuildHabitat() (one per
  // island; narrow viewports have only the left island, so only one
  // stream — the draw range below hides the unused slots). Normal
  // blending, not additive, so bubbles never become the bright specular
  // dots AQ-43 originally warned about.
  const bubblesPerStream = DEFAULT_AQUARIUM_OPTICS_CONFIG.maxBubbles / 2
  const bubblePositions = new Float32Array(DEFAULT_AQUARIUM_OPTICS_CONFIG.maxBubbles * 3)
  const bubbleGeometry = new THREE.BufferGeometry()
  const bubblePositionAttr = new THREE.BufferAttribute(bubblePositions, 3)
  bubbleGeometry.setAttribute('position', bubblePositionAttr)
  const bubbleMaterial = new THREE.PointsMaterial({
    color: '#eaf7ff',
    size: 0.035,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  const bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial)
  bubbles.raycast = () => {}
  bubbleGeometry.setDrawRange(0, 0)
  scene.add(bubbles)
  let bubbleEmitters: Readonly<{ x: number; y: number; z: number }>[] = []
  let particleBuffersDirty = true

  const abort = new AbortController(), loader = new GLTFLoader(), modelBases = new Map<string, GLTF>(), coralTemplates = new Map<string, THREE.Object3D>(), reefs: THREE.Object3D[] = []
  let rockIslandLeftBase: GLTF | undefined, rockIslandRightBase: GLTF | undefined
  let reefControllers: Array<ReturnType<typeof assembleCoralsOnRockSockets>> = []
  let coralElapsedSec = 0
  const reducedMotionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  let disposed = false, failed = false, loaded = false, paused = initialPaused, services = initialServices, fish: Inhabitant[] = []
  // Visual-only schoolmates (AQ-41): no service, no anchor, no link. Kept in
  // a separate list from the service fish so the AQ-64 service reconcile
  // never disposes or refreshes them; they are reconciled with the service
  // list by reconcileSchoolmates() below.
  let schoolmates: Inhabitant[] = []
  const loadedAssets = new Set<GLTF>()
  let habitat: WaterHabitat = { bounds: { min: { x: -4, y: -2.25, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }, obstacles: [], anchors: [] }
  let width = 1, height = 1, labelClock = 0, spawnUnavailable = false
  let meshNavigationGeneration = 0
  const clock = createFrameClock()
  // AQ-76 runtime quality: global simulation-step counter for the LOD1
  // half-rate clip cadence, and the adaptive tier controller + active tier.
  let animationStepIndex = 0
  let qualityTier: QualityTier = 'high'
  const qualityController = new AdaptiveQualityController()
  // AQ-76 lazy-load queue state lives with the other scene state (not beside
  // initialize): resize() -> render() can pump the queue during setup, before
  // the initialize() block below has run, so these must be initialized here.
  let lazyQueue: string[] = []
  let lazyActiveLoads = 0
  const ray = new THREE.Raycaster(), projected = new THREE.Vector3(), sample = new THREE.Vector3(), hitMeshes: THREE.Object3D[] = []
  const ownedSprites = new Set<THREE.Mesh>()
  const spriteMasks: SpriteMasks = new WeakMap()
  function nearest(x: number, y: number) {
    const box = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((x - box.left) / box.width * 2 - 1, 1 - (y - box.top) / box.height * 2), camera)
    return nearestVisibleIntersection(ray.intersectObjects(hitMeshes, false), spriteMasks)?.object.userData.serviceId as string | undefined
  }
  function updateVisibility(item: Inhabitant) {
    const rect = canvas.getBoundingClientRect()
    const artworkUnavailable = Boolean(item.artworkUnavailable)
    let visible = artworkUnavailable && Boolean(projectFishLinkBounds(item.root.position, camera, width, height, fishRenderLength(item.service.fishId), projected))
    if (!visible && !artworkUnavailable) for (const [localY, localZ] of [[0, 0], [0, .31], [0, -.31], [.13, 0], [-.13, 0]]) {
      sample.set(item.fallback ? localZ : 0, localY, item.fallback ? 0 : localZ).applyMatrix4(item.root.matrixWorld).project(camera)
      if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.z) || Math.abs(sample.x) > .96 || Math.abs(sample.y) > .94 || sample.z < -1 || sample.z > 1) continue
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
  function isSafeCurrentInhabitantPosition(item: Inhabitant): boolean {
    if (habitat.meshNavigation?.queryCapsule) {
      const r = MESH_NAVIGATION_COLLISION_RADIUS_M
      const { min, max } = habitat.bounds
      const p = item.motion.position
      if (
        p.x < min.x + r || p.x > max.x - r ||
        p.y < min.y + r || p.y > max.y - r ||
        p.z < min.z + r || p.z > max.z - r
      ) {
        return false
      }
      return (
        habitat.meshNavigation.queryCapsule(p, p, r, {
          ...habitat.meshNavigation.movementBudget,
        }).status === 'clear'
      )
    }
    return isSafeFishPosition(
      item.motion.position,
      item.motion.clearance,
      habitat.bounds,
      habitat.obstacles,
    )
  }
  function rebuildHabitat() {
    // Invalidate any previous mesh routing before the reefs are replaced; a
    // fresh collider build is kicked off below and applied only if this
    // generation is still current. Until it lands, fish keep AABB routing.
    meshNavigationGeneration++
    const generation = meshNavigationGeneration
    habitat.meshNavigation = undefined
    particleBuffersDirty = true
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
    // Bubble emitters (AQ-43 as amended): one at the base of each live-rock
    // island, derived from the placements above — never hardcoded. The left
    // stream is the anemone stream: the host-anemone mount lives on the
    // left island (DEFAULT_LEFT_ISLAND_MOUNTS, socket_anemone_crevice_01),
    // but habitat.anchors only ever carries grazingSurface locations, so
    // no runtime world position for the anemone exists to resolve — the
    // left-island base is the fallback the spec allows, and it is where
    // the anemone sits.
    bubbleEmitters = placements.map(placement => ({
      x: placement.position.x,
      y: DEFAULT_AQUARIUM_OPTICS_CONFIG.bubbleEmitterBaseY,
      z: placement.position.z,
    }))
    bubbleGeometry.setDrawRange(0, bubbleEmitters.length * bubblesPerStream)
    const meshIslands: ReefMeshIslandInput[] = []
    for (const [i, placement] of placements.entries()) {
      const { islandKind, rockScene, mounts, position, uniformScale, yaw } = placement
      const reef = rockScene.clone(true)
      const assembled = assembleCoralsOnRockSockets(reef, coralTemplates, mounts, {
        paused: paused || document.hidden,
        reducedMotion,
        // AQ-70.6 AC #3: coral fluorescence scales with the fixture's
        // actinic share.
        actinicLevel: evaluateFluorescenceActinicFactor(optics.fixtureWhiteBalance),
      })
      reefControllers.push(assembled)
      // Real caustics on live rock and coral (AQ-14.2 AC #2). Assembly clones
      // the rock/coral materials per island, so each rebuild patches fresh
      // material instances; applyCaustics also guards against double-patching.
      // Rock gets a broader pattern (fewer, wider webs) than sand/coral.
      // Fish materials are patched in bindGlbToInhabitant, not here.
      reef.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!(mat instanceof THREE.MeshStandardMaterial)) continue
          const isRock = Boolean(mat.userData.liveRockShader)
          const isCoral = Boolean(mat.userData.coralRawMasks)
          if (!isRock && !isCoral) continue
          applyCaustics(mat, caustics, isRock ? { scaleA: 0.25, scaleB: 0.4 } : undefined)
        }
      })
      reef.scale.setScalar(uniformScale)
      reef.position.set(position.x, position.y, position.z)
      reef.rotation.y = yaw
      scene.add(reef)
      reefs.push(reef)
      applyEnvironmentMapIntensity(reef, ENVIRONMENT_MAP_INTENSITY.reef)

      const result = instantiateModularReefHabitat(islandKind, uniformScale, position, `reef-${i}`, yaw)
      habitat.obstacles.push(...result.obstacles)
      habitat.anchors.push(...result.anchors)
      reef.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) })
      meshIslands.push({ reef, islandId: `reef-${i}`, mountedCorals: assembled.mountedCorals })
    }
    hitMeshes.push(sand)
    // Mesh routing builds after first paint (~1 s per island on the main
    // thread) and activates only for this generation. Any failure keeps the
    // existing AABB routing; nothing below depends on the mesh being ready.
    createReefMeshNavigation(meshIslands).then(result => {
      if (disposed || generation !== meshNavigationGeneration) return
      if (result.status === 'ready') {
        habitat.meshNavigation = result.meshNavigation
        // Relocate any fish or schoolmate that drifted into a coral envelope
        // during the brief AABB window before the async mesh collider resolved.
        const meshCheck = (candidate: SwimmingFish['position']) =>
          result.meshNavigation.queryCapsule!(
            candidate,
            candidate,
            MESH_NAVIGATION_COLLISION_RADIUS_M,
            { ...result.meshNavigation.movementBudget },
          ).status === 'clear'
        const allInhabitants = [...fish, ...schoolmates]
        const occupiedForRelocation: Array<{ position: SwimmingFish['position']; clearance: number }> = []
        for (const item of allInhabitants) {
          if (isSafeCurrentInhabitantPosition(item)) {
            occupiedForRelocation.push({ position: item.motion.position, clearance: item.motion.clearance })
          }
        }
        for (const item of allInhabitants) {
          if (isSafeCurrentInhabitantPosition(item)) continue
          const relocated = findSafeFishSpawn(
            item.motion.position,
            habitat.bounds,
            habitat.obstacles,
            item.motion.clearance,
            occupiedForRelocation,
            meshCheck,
          )
          if (relocated) {
            item.motion.position = relocated
            item.motion.route = []
            item.motion.speed = 0
            item.root.position.set(relocated.x, relocated.y, relocated.z)
            occupiedForRelocation.push({ position: relocated, clearance: item.motion.clearance })
          }
        }
        console.info('Mesh navigation ready', result.diagnostics)
      } else {
        console.warn('Mesh navigation unavailable; staying on AABB routing', result.reason, result.diagnostics)
      }
    }).catch(error => {
      if (!disposed && generation === meshNavigationGeneration) console.warn('Mesh navigation build failed; staying on AABB routing', error)
    })
  }
  function disposeInhabitant(item: Inhabitant) {
    try { item.motion.extensions.dispose() } catch (error) { console.error('Fish extension cleanup failed', error) }
    item.flex?.dispose(); item.flex = undefined
    scene.remove(item.root); item.clipPlayer?.dispose()
    const skeletons = new Set<THREE.Skeleton>()
    item.root.traverse(object => { if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton) })
    skeletons.forEach(skeleton => skeleton.dispose())
    if (item.artwork) {
      ownedSprites.delete(item.artwork); spriteMasks.delete(item.artwork); disposeTree(item.artwork)
    }
    if (item.lodSprite) {
      ownedSprites.delete(item.lodSprite); spriteMasks.delete(item.lodSprite); disposeTree(item.lodSprite); item.lodSprite = undefined
    }
    item.anchor?.removeAttribute('data-artwork-error')
  }
  // Bind a loaded GLB to an inhabitant: clone, scale, env intensity, and the
  // clip player + turning rig + body flex. Shared with the lazy-load
  // sprite-to-GLB swap below, so the two paths can never drift apart.
  function bindGlbToInhabitant(item: Inhabitant, base: GLTF) {
    const model = clone(base.scene); model.scale.setScalar(fishModelScale(item.service.fishId))
    applyEnvironmentMapIntensity(model, ENVIRONMENT_MAP_INTENSITY.fish)
    // Only service fish get a serviceId on their meshes (AQ-41 AC #4 / AQ-13):
    // schoolmates must never be pickable, so their meshes stay anonymous.
    if (!item.schoolmate) model.traverse(object => { if (object instanceof THREE.Mesh) object.userData.serviceId = item.service.id })
    item.root.add(model); item.lodModel = model; item.lod = 0
    // The player restores the clean clip pose before every turning overlay.
    if (base.animations.length === 1) {
      try {
        item.clipPlayer = createFishClipPlayer(model, base.animations[0], (seedForId(item.service.id) % 1500) / 1000)
        item.turningRig = bindFishTurningRig(model, item.service.fishId)
        try {
          item.flex = bindFishFlexToModel(model, item.service.fishId, seedForId(item.service.id))
        } catch (error) {
          console.warn('Fish body flex unavailable; retaining bone-only animation', item.service.fishId, error)
        }
      } catch (error) {
        item.clipPlayer?.dispose(); item.clipPlayer = undefined
        console.warn('Fish animation unsupported; retaining static service fish', item.service.fishId, error)
      }
    } else console.warn('Fish animation requires one clip; retaining static service fish', item.service.fishId)
    // AQ-70.6 AC #1 / AQ-70.8 AC #3: the shared cellular caustic chunk is
    // applied after flex binding (flex replaces onBeforeCompile, so the
    // caustics patch must chain on top of it), with the skinned hook so the
    // pattern stays fixed in world space while the fish swims through it.
    // Fish also cast shadows onto the sand and rock now.
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        if (mat instanceof THREE.MeshStandardMaterial) applyCaustics(mat, caustics, { skinned: true })
      }
    })
  }
  // Build the thumbnail sprite for an inhabitant. Used for the no-GLB
  // fallback (`lodOnly: false`, stored as `item.artwork`) and for the far
  // LOD2 sprite (`lodOnly: true`, stored as `item.lodSprite`). A failed LOD
  // sprite only drops that fish back to its full GLB; a failed fallback
  // sprite keeps the existing thumbnail-unavailable handling.
  function buildSprite(item: Inhabitant, lodOnly: boolean) {
    const species = getFishById(item.service.fishId)!
    const spriteScale = fishSpriteScale(item.service.fishId)
    // No-fit fallback retains old resources, but callbacks for a removed or
    // replaced service must not rewrite its React-owned current native link.
    const acceptsArtworkCallback = () => !disposed && !failed && ownedSprites.has(sprite)
      && (item.schoolmate || services.some(next => next.id === item.service.id && next.fishId === item.service.fishId))
    const texture = new THREE.TextureLoader().load(species.thumbnail, loadedTexture => {
      if (!acceptsArtworkCallback()) return
      const image = loadedTexture.image as HTMLImageElement
      const imageWidth = image.naturalWidth, imageHeight = image.naturalHeight
      if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth > 0 && imageHeight > 0) {
        sprite.scale.set(spriteScale, spriteScale * (SPRITE_PLANE_WIDTH / .62) * (imageHeight / imageWidth), 1)
      }
      try { spriteMasks.set(sprite, { texture: loadedTexture, pixels: readArtworkAlpha(image) }) }
      catch (error) { console.warn('Fish artwork alpha unavailable', error) }
      if (!document.hidden) render(0, true)
    }, undefined, error => {
      if (!acceptsArtworkCallback()) return
      if (lodOnly) {
        console.warn('Far-fish LOD sprite failed to load; keeping full GLB', species.thumbnail, error)
        item.root.remove(sprite)
        ownedSprites.delete(sprite); spriteMasks.delete(sprite); disposeTree(sprite)
        if (item.lodSprite === sprite) { item.lodSprite = undefined; item.lod = 1 }
        return
      }
      item.artworkUnavailable = true
      handleArtworkTextureFailure(sprite, texture, hitMeshes, spriteMasks, item.anchor)
      sprite.material.map = null // the failure handler already disposed this owned texture
      refreshFishLink(item, item.service, item.anchor)
      console.warn('Fish thumbnail failed to load; native service label remains available', species.thumbnail, error)
      if (!document.hidden) render(0, true)
    }); texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(SPRITE_PLANE_WIDTH, .62), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .2, depthWrite: true, side: THREE.DoubleSide }))
    sprite.scale.set(spriteScale, spriteScale, 1)
    if (!item.schoolmate) sprite.userData.serviceId = item.service.id
    item.root.add(sprite); ownedSprites.add(sprite)
    spriteMasks.set(sprite, { texture }) // pending/failed masks never claim opaque pixels
    return sprite
  }
  // Upgrade a thumbnail-fallback inhabitant to its GLB in place when the
  // background lazy load lands: same position, yaw, motion, anchor, and
  // service link — only the artwork changes. A failed swap keeps the sprite.
  function swapFallbackToGlb(item: Inhabitant) {
    const base = modelBases.get(item.service.fishId)
    if (!base || !item.fallback || disposed || failed) return
    const sprite = item.artwork
    try {
      if (sprite) {
        item.root.remove(sprite)
        ownedSprites.delete(sprite); spriteMasks.delete(sprite); disposeTree(sprite)
        item.artwork = undefined
      }
      bindGlbToInhabitant(item, base)
      item.fallback = false
      refreshFishLink(item, item.service, item.anchor)
      rebuildHitMeshes()
      if (!document.hidden) render(0, true)
    } catch (error) {
      console.warn('Fish GLB swap failed; keeping thumbnail fallback', item.service.fishId, error)
    }
  }
  // Apply a distance-LOD tier to a GLB inhabitant. LOD2 hides the skinned
  // model and shows the cached thumbnail sprite (created on first entry);
  // LOD0/LOD1 show the model and hide the sprite. Fallback (sprite-only)
  // fish have no model to swap, so their tier is recorded but not applied.
  function applyFishLod(item: Inhabitant, lod: FishLod) {
    if (item.fallback || !item.lodModel) { item.lod = lod; return }
    if (lod === 2) {
      if (!item.lodSprite) {
        item.lodSprite = buildSprite(item, true)
        rebuildHitMeshes()
      }
      item.lodModel.visible = false
      if (item.lodSprite) item.lodSprite.visible = true
    } else {
      item.lodModel.visible = true
      if (item.lodSprite) item.lodSprite.visible = false
    }
    item.lod = lod
  }
  function removeFish() { fish.forEach(disposeInhabitant); fish = []; schoolmates.forEach(disposeInhabitant); schoolmates = [] }
  function rebuildHitMeshes() {
    hitMeshes.length = 0
    reefs.forEach(reef => reef.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) }))
    hitMeshes.push(sand)
    fish.forEach(item => item.root.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) }))
    schoolmates.forEach(item => item.root.traverse(object => { if (object instanceof THREE.Mesh) hitMeshes.push(object) }))
  }
  type FishSpawn = { species: NonNullable<ReturnType<typeof getFishById>>; clearance: number; position: SwimmingFish['position']; yaw: number }
  function createInhabitant(service: ServiceConfig, spawn: FishSpawn, anchor?: HTMLAnchorElement, schoolmate = false): Inhabitant {
    const { clearance, position, yaw } = spawn
    const root = new THREE.Group(), base = modelBases.get(service.fishId), fallback = !base
    const motion = createSwimmingFish(service.id, service.fishId, position, clearance, fishExtensions, { initialYaw: yaw, collisionRadiusM: MESH_NAVIGATION_COLLISION_RADIUS_M })
    const item: Inhabitant = { service, root, motion, anchor, visible: false, fallback, releasedFocus: false, schoolmate, lod: 0 }
    try {
      if (base) bindGlbToInhabitant(item, base)
      else item.artwork = buildSprite(item, false)
      root.position.set(motion.position.x, motion.position.y, motion.position.z)
      // Schoolmates are never pickable (AQ-41 AC #4 / AQ-13): only service
      // fish get a serviceId on their meshes, so picking can never resolve a
      // click or a focus target to a schoolmate. Their meshes still join
      // hitMeshes for honest occlusion of the fish behind them.
      if (!schoolmate) root.traverse(object => { if (object instanceof THREE.Mesh) object.userData.serviceId = service.id })
      scene.add(root)
      return item
    } catch (error) { disposeInhabitant(item); throw error }
  }
  /**
   * Reconciles the visual-only schoolmates with the current service list
   * (AQ-41, AQ-64): a chromis service keeps 5 schoolmates (6 total), an
   * anthias service 3 (4 total). Mates are retained across service updates
   * when their lead fish and species are unchanged, so other fishes' swimming
   * state is never reset; a mate is re-spawned only when its lead is new,
   * its species changed, or its current position is no longer safe in the
   * (possibly resized) habitat. A mate that cannot find a safe spawn is
   * skipped fail-soft — it never fails the whole scene the way a service
   * fish's missing spawn does. Mates cluster around their lead fish's current
   * position with deterministic per-instance offsets (school-population.ts);
   * no schoolCenter anchor is invented — the runtime habitat emits only
   * grazingSurface anchors.
   */
  function reconcileSchoolmates(
    nextServices: readonly ServiceConfig[],
    occupied: Array<{ position: SwimmingFish['position']; clearance: number }>,
    meshSpawnCheck: ((candidate: SwimmingFish['position']) => boolean) | undefined,
    spawns: Map<string, FishSpawn>,
  ) {
    const leadPosition = new Map<string, SwimmingFish['position']>()
    for (const service of nextServices) {
      const retained = fish.find(item => item.service.id === service.id)
      if (retained?.service.fishId === service.fishId) leadPosition.set(service.id, { ...retained.motion.position })
      else if (spawns.get(service.id)) leadPosition.set(service.id, { ...spawns.get(service.id)!.position })
    }
    const currentMates = new Map(schoolmates.map(item => [item.service.id, item]))
    const tankWidth = habitat.bounds.max.x - habitat.bounds.min.x
    const nextMates: Inhabitant[] = []
    for (const mate of resolveSchoolPopulation(nextServices)) {
      const lead = leadPosition.get(mate.serviceId)
      if (!lead) continue
      const existing = currentMates.get(mate.id)
      if (existing && existing.service.fishId === mate.speciesId
        && isSafeCurrentInhabitantPosition(existing)) {
        nextMates.push(existing)
        occupied.push({ position: existing.motion.position, clearance: existing.motion.clearance })
        continue
      }
      const species = getFishById(mate.speciesId)!
      const clearance = fishClearanceRadius(mate.speciesId)
      const offset = schoolmateSpawnOffset(mate.id, mate.speciesId, tankWidth, mate.index, SCHOOL_TOTAL_COUNT[mate.speciesId] - 1)
      const preferred = { x: lead.x + offset.x, y: lead.y + offset.y, z: lead.z + offset.z }
      const position = findSafeFishSpawn(preferred, habitat.bounds, habitat.obstacles, clearance, occupied, meshSpawnCheck)
      if (!position) continue
      const yaw = findSafeFishHeading(position, Math.atan2(offset.x, offset.z), habitat.bounds, habitat.obstacles, clearance)
      if (yaw === undefined) continue
      nextMates.push(createInhabitant(
        { id: mate.id, name: '', url: '', fishId: mate.speciesId, isExample: false },
        { species, clearance, position, yaw },
        undefined,
        true,
      ))
      occupied.push({ position, clearance })
    }
    for (const old of schoolmates) if (!nextMates.includes(old)) disposeInhabitant(old)
    schoolmates = nextMates
  }
  function reconcileFish(): boolean | undefined {
    if (!loaded || disposed) return undefined
    const anchors = new Map(Array.from(overlay.querySelectorAll<HTMLAnchorElement>('a[data-service-id]')).map(anchor => [anchor.dataset.serviceId!, anchor]))
    const current = new Map(fish.map(item => [item.service.id, item]))
    const nextServices = services.filter(service => getFishById(service.fishId))
    const horizontalOrder = [...nextServices].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.fishId < b.fishId ? -1 : a.fishId > b.fishId ? 1 : 0)
    const horizontalSlots = new Map(horizontalOrder.map((service, index) => [service.id, { index, count: horizontalOrder.length }]))
    const spawns = new Map<string, FishSpawn>()
    const occupied: Array<{ position: SwimmingFish['position']; clearance: number }> = nextServices.flatMap(next => {
      const retained = current.get(next.id)
      return retained?.service.fishId === next.fishId
        ? [{ position: retained.motion.position, clearance: retained.motion.clearance }]
        : []
    })
    const refreshRetainedLinks = () => nextServices.forEach(next => {
      const retained = current.get(next.id)
      if (retained?.service.fishId === next.fishId) refreshFishLink(retained, next, anchors.get(next.id))
    })
    // Once mesh routing is active, a spawn must also be clear of the rock
    // mesh and the coral envelopes. Before the async build lands there is no
    // mesh to consult, so the existing AABB check is the whole check.
    const meshSpawnCheck = habitat.meshNavigation?.queryCapsule
      ? (candidate: SwimmingFish['position']) => {
          const mesh = habitat.meshNavigation!
          return mesh.queryCapsule!(candidate, candidate, MESH_NAVIGATION_COLLISION_RADIUS_M, { ...mesh.movementBudget }).status === 'clear'
        }
      : undefined
    for (const service of nextServices) {
      const previous = current.get(service.id)
      if (previous?.service.fishId === service.fishId) continue
      const species = getFishById(service.fishId)!
      const clearance = fishClearanceRadius(service.fishId)
      const preference = fishSpawnPreference(service.id, service.fishId, habitat.bounds, clearance, horizontalSlots.get(service.id))
      const position = preference && findSafeFishSpawn(preference.position, habitat.bounds, habitat.obstacles, clearance, occupied, meshSpawnCheck)
      if (!position || !preference) {
        // Keep existing instances intact during the truthful full-native fallback.
        // A later fitting configuration can reuse their exact poses and clocks.
        refreshRetainedLinks()
        spawnUnavailable = true; syncLoop(); return false
      }
      const yaw = findSafeFishHeading(position, preference.yaw, habitat.bounds, habitat.obstacles, clearance)
      if (yaw === undefined) {
        refreshRetainedLinks()
        spawnUnavailable = true; syncLoop(); return false
      }
      spawns.set(service.id, { species, clearance, position, yaw })
      occupied.push({ position, clearance })
    }
    try {
      fish = reconcileFishInhabitants(fish, nextServices, {
        create: service => createInhabitant(service, spawns.get(service.id)!, anchors.get(service.id)),
        refresh: (item, service) => refreshFishLink(item, service, anchors.get(service.id)),
        dispose: disposeInhabitant,
      })
    } catch (error) {
      console.error('Aquarium inhabitant update unavailable; native service links remain available', error)
      refreshRetainedLinks()
      spawnUnavailable = true; rebuildHitMeshes(); syncLoop(); return false
    }
    reconcileSchoolmates(nextServices, occupied, meshSpawnCheck, spawns)
    spawnUnavailable = false; rebuildHitMeshes(); render(0, true)
    return true
  }
  function rebuildFish(): boolean | undefined { removeFish(); return reconcileFish() }
  function positionLabels(force = false) {
    // AQ-89: two passes — place every visible label tight under its fish,
    // then de-conflict the captions so none covers another fish or caption.
    const placedLabels: Array<{ anchor: HTMLAnchorElement; id: string; bounds: { x: number; y: number; width: number; height: number }; lift: number; depth: number }> = []
    for (const item of fish) {
      const anchor = item.anchor; if (!anchor) continue
      const bounds = projectFishLinkBounds(item.root.position, camera, width, height, fishRenderLength(item.service.fishId), projected)
      if (!bounds) {
        item.visible = false
        // Preserve AQ-50's focus handoff before hiding an invalid projection.
        // If no fallback accepts focus, retain the last valid label position.
        if (!applyFishLinkVisibility(anchor, false, focusFallback())) anchor.style.visibility = 'hidden'
        continue
      }
      // Resolve focused exposure before moving its DOM target. If no control
      // can receive focus, keep its last visible label position for now.
      if (force || anchor.contains(document.activeElement)) updateVisibility(item)
      if (!item.visible && anchor.contains(document.activeElement)) continue
      anchor.style.visibility = 'visible'
      anchor.style.transform = `translate3d(${bounds.x}px,${bounds.y}px,0)`; anchor.style.width = `${bounds.width}px`; anchor.style.height = `${bounds.height}px`
      anchor.style.zIndex = String(Math.round((item.root.position.z + 10) * 100))
      // AQ-89 AC #1: tuck the caption tight under the fish's belly — the
      // link box is centred on the fish and taller than the body, so a
      // caption at top: 100% would float with a visible gap.
      const lift = labelLiftPx(bounds.height)
      anchor.style.setProperty('--fish-label-lift', `${lift}px`)
      placedLabels.push({ anchor, id: item.service.id, bounds, lift, depth: item.root.position.z })
      // AQ-13: keep the hover tooltip on-screen — flip it below the caption
      // near the top edge and align it inward near the left/right edges.
      const tooltipCenterX = bounds.x + bounds.width / 2
      anchor.classList.toggle('fish-link-tooltip-below', bounds.y < 40)
      anchor.classList.toggle('fish-link-tooltip-left', tooltipCenterX < 110)
      anchor.classList.toggle('fish-link-tooltip-right', tooltipCenterX > width - 110)
    }
    if (placedLabels.length > 1) {
      const resolved = resolveLabelDeconflicts(
        placedLabels.map(entry => ({
          id: entry.id,
          caption: estimateCaptionRect(entry.bounds, entry.lift),
          body: entry.bounds,
          depth: entry.depth,
        })),
        { width, height },
      )
      for (const result of resolved) {
        const entry = placedLabels.find(candidate => candidate.id === result.id)
        if (!entry) continue
        entry.anchor.style.setProperty('--fish-label-dy', `${result.dy}px`)
        entry.anchor.classList.toggle('fish-label-deconflicted', result.faded)
        entry.anchor.classList.toggle('fish-label-align-left', result.align === 'left')
        entry.anchor.classList.toggle('fish-label-align-right', result.align === 'right')
      }
    } else if (placedLabels.length === 1) {
      // A lone label never needs a shift, but a stale de-conflict from a
      // busier frame must not linger on it.
      const entry = placedLabels[0]!
      entry.anchor.style.setProperty('--fish-label-dy', '0px')
      entry.anchor.classList.remove('fish-label-deconflicted')
      entry.anchor.classList.remove('fish-label-align-left')
      entry.anchor.classList.remove('fish-label-align-right')
    }
  }
  function render(steps: number, forceLabels = false) {
    const habitatStopped = paused || document.hidden
    const reducedMotion = Boolean(reducedMotionQuery?.matches)
    // Camera zoom (AQ-62 AC #1/#5): damp toward the desired state while the
    // scene is running; snap instantly on reduced motion or while paused /
    // hidden, so zoom still responds with no animation loop. A single
    // render(0, true) while running leaves the current state alone — the
    // next tick damps it — so button/wheel zooms stay smooth.
    if (reducedMotion || habitatStopped) cameraZoomCurrent = { ...cameraZoomDesired }
    else if (steps > 0) cameraZoomCurrent = dampCameraZoomState(cameraZoomCurrent, cameraZoomDesired, steps * SIMULATION_STEP_SECONDS)
    applyCameraZoom()
    if (!habitatStopped && !reducedMotion && steps > 0) {
      coralElapsedSec = (coralElapsedSec + steps * SIMULATION_STEP_SECONDS) % 3600
    }
    const effectiveEnvTime = habitatStopped || reducedMotion ? 0 : coralElapsedSec
    // AQ-73: the aragonite bed owns its sand time; its caustic network
    // freezes at its last phase on pause / reduced-motion / hidden.
    sandBed.update(coralElapsedSec, habitatStopped, reducedMotion)
    rearUniforms.uRearTime.value = effectiveEnvTime
    // AQ-86: the shaft sway freezes at its t=0 phase with everything else.
    shaftUniforms.uShaftTime.value = effectiveEnvTime
    causticLightController.update(coralElapsedSec, habitatStopped, reducedMotion)
    // The caustic texture time freezes at 0 on pause / reduced-motion,
    // exactly like the scalar shimmer above.
    caustics.update(coralElapsedSec, habitatStopped, reducedMotion)

    // Update top water-surface ripple displacement (AQ-14.2 AC #1 & #5)
    const surfPos = waterSurfaceGeometry.getAttribute('position')
    for (let i = 0; i < surfPos.count; i++) {
      const wx = surfPos.getX(i), wz = surfPos.getY(i)
      surfPos.setZ(i, evaluateSurfaceRippleOffset(wx, wz, coralElapsedSec, { paused: habitatStopped, reducedMotion, amplitudeM: optics.surfaceRippleAmplitudeM }))
    }
    surfPos.needsUpdate = true

    // Update depth-graded water-column motes (AQ-43 AC #2 as amended):
    // foreground motes stay in the fish volume, background motes behind it.
    // Position attributes are only flagged when the tank is actually
    // moving — when paused or reduced-motion the helpers return the frozen
    // base positions, so there is nothing new to upload.
    const motesMoving = !habitatStopped && !reducedMotion
    const uploadParticles = motesMoving || particleBuffersDirty
    for (let i = 0; i < foregroundParticleCount; i++) {
      const pt = evaluateSuspendedParticlePosition(i, habitat.bounds, coralElapsedSec, {
        paused: habitatStopped,
        reducedMotion,
        zBand: { min: -1.5, max: 2.8 },
      })
      foregroundParticlePositions[i * 3] = pt.x
      foregroundParticlePositions[i * 3 + 1] = pt.y
      foregroundParticlePositions[i * 3 + 2] = pt.z
    }
    if (uploadParticles) foregroundParticlePositionAttr.needsUpdate = true
    for (let i = 0; i < backgroundParticleCount; i++) {
      const pt = evaluateSuspendedParticlePosition(foregroundParticleCount + i, habitat.bounds, coralElapsedSec, {
        paused: habitatStopped,
        reducedMotion,
        zBand: { min: -4.6, max: -1.5 },
      })
      backgroundParticlePositions[i * 3] = pt.x
      backgroundParticlePositions[i * 3 + 1] = pt.y
      backgroundParticlePositions[i * 3 + 2] = pt.z
    }
    if (uploadParticles) backgroundParticlePositionAttr.needsUpdate = true

    // Update sparse bubble streams (AQ-43 AC #2 as amended): slots 0..15
    // belong to the first emitter, the rest to the second; the draw range
    // set in rebuildHabitat() hides slots with no emitter (narrow view).
    for (let i = 0; i < DEFAULT_AQUARIUM_OPTICS_CONFIG.maxBubbles; i++) {
      const streamIndex = i < bubblesPerStream ? 0 : 1
      const emitter = bubbleEmitters[streamIndex] ?? bubbleEmitters[0] ?? { x: 0, y: DEFAULT_AQUARIUM_OPTICS_CONFIG.bubbleEmitterBaseY, z: 0 }
      const bubble = evaluateBubblePosition(i, emitter, habitat.bounds, coralElapsedSec, {
        paused: habitatStopped,
        reducedMotion,
      })
      bubblePositions[i * 3] = bubble.x
      bubblePositions[i * 3 + 1] = bubble.y
      bubblePositions[i * 3 + 2] = bubble.z
    }
    if (uploadParticles) bubblePositionAttr.needsUpdate = true
    particleBuffersDirty = false

    for (const controller of reefControllers) {
      controller.update(coralElapsedSec, habitatStopped, reducedMotion)
    }
    for (let step = 0; step < steps; step++) {
      // School steering needs one pre-move peer snapshot per frame (AQ-41),
      // so the whole school — service fish and visual-only schoolmates — is
      // stepped together instead of one fish at a time.
      const swimmers = [...fish, ...schoolmates]
      const stoppedFlags = swimmers.map(item => {
        const focused = document.activeElement === item.anchor
        if (!focused) item.releasedFocus = false
        return paused || document.hidden || (focused && !item.releasedFocus)
      })
      stepSwimmingSchool(swimmers.map(item => item.motion), habitat, SIMULATION_STEP_SECONDS, stoppedFlags, { reducedMotion })
      swimmers.forEach((item, index) => {
        const stopped = stoppedFlags[index]
        if (!stopped) {
        // Animation LOD (AQ-76 AC #1): fish keep swimming at every tier, but
        // far fish advance their swim clip at half rate (LOD1) or not at all
        // (LOD2 sprite), and the turning-rig overlay runs only at LOD0.
        // `animationStepIndex` is the global step counter, so the half rate
        // is a real every-other-step cadence rather than a per-frame coin flip.
        const animateThisStep = !stopped && item.lod !== 2 && animationStepIndex % lodAnimationFrameSkip(item.lod) === 0
        if (animateThisStep) {
          try {
            item.clipPlayer?.advance(SIMULATION_STEP_SECONDS * (.55 + Math.min(1.7, item.motion.speed * 2.2)) * item.motion.animationPlaybackRate)
          } catch (error) {
            // The player has restored its complete last clean pose. Retire this
            // unsupported animation once; other fish and native links keep working.
            item.clipPlayer?.dispose(); item.clipPlayer = undefined; item.turningRig = undefined
            item.flex?.dispose(); item.flex = undefined
            console.warn('Fish animation stopped after invalid clip output', item.service.id, error)
          }
          // Lighthill body flex runs last in the frame: after the clip advance
          // and the turning overlay, on the same simulation dt, so clip, bone
          // bend, and vertex wave share one clock. Paused / hidden / focused
          // frames never reach this block, so the wave freezes with the clip;
          // prefers-reduced-motion neutralises the amplitude inside update.
          if (item.flex) {
            const cruiseSpeedWorld = item.motion.behavior.variation.cruiseSpeedTankWidthsPerSecond
              * (habitat.bounds.max.x - habitat.bounds.min.x)
            updateFishFlex(item.flex, item.service.fishId, {
              speedNorm: cruiseSpeedWorld > 0 ? item.motion.speed / cruiseSpeedWorld : 0,
              state: item.motion.behavior.state,
              maneuverStage: item.motion.turnKinematics.maneuverStage,
              startleSeconds: item.motion.startleSeconds,
            }, SIMULATION_STEP_SECONDS, reducedMotion)
          }
        }
        if (!stopped && item.lod === 0 && item.turningRig) applyFishTurningRigOverlay(item.turningRig, item.motion.turnKinematics, stopped)
        }
      })
    animationStepIndex++
    }
    for (const item of [...fish, ...schoolmates]) {
      const pose = item.motion; item.root.position.set(pose.position.x, pose.position.y, pose.position.z)
      if (item.fallback || item.lod === 2) { item.root.rotation.set(0, 0, 0); item.root.scale.x = evaluateSpriteTurnScaleX(pose.yaw) }
      else { item.root.rotation.set(pose.pitch, pose.yaw, pose.bank, 'YXZ') }
    }
    scene.updateMatrixWorld(true)
    labelClock += steps * SIMULATION_STEP_SECONDS
    const refreshLabels = forceLabels || labelClock > .24
    if (refreshLabels) {
      evaluateFishLod()
      pumpLazyLoads()
    }
    positionLabels(refreshLabels)
    if (labelClock > .24) labelClock = 0
    renderer.render(scene, camera)
  }
  // Distance LOD (AQ-76 AC #1), evaluated at the ~0.24 s label cadence
  // using the already-computed projection depth — no extra raycast. Depth
  // is camera z (9) minus fish z, so it spans the real 6.2-13.6 range.
  function evaluateFishLod() {
    const lodBias = QUALITY_TIERS[qualityTier].lodBias
    for (const item of fish) {
      if (item.fallback || !item.lodModel) continue
      const depth = camera.position.z - item.root.position.z
      const projected = projectedFishLengthPx(fishRenderLength(item.service.fishId), height, camera.fov, depth)
      const next = selectFishLod(depth, projected, item.lod, lodBias)
      if (next !== item.lod) applyFishLod(item, next)
    }
  }
  // Adaptive quality (AQ-76 AC #3): sample every rAF interval, but never
  // let hidden/paused/reduced-motion frames count as load — the controller
  // drops those and clears its window. Tier changes apply the pixel-ratio
  // cap and shadow toggle, then re-apply the stored size via resize().
  let lastTickTimestamp: number | undefined
  function applyQualityTier(tier: QualityTier) {
    qualityTier = tier
    const spec = QUALITY_TIERS[tier]
    renderer.setPixelRatio(Math.min(devicePixelRatio, spec.pixelRatioCap))
    keyLight.castShadow = spec.shadows
    resize()
  }
  // Debug FPS counter (AQ-83 AC #2/#4): a read-only observer of the same
  // frame intervals the adaptive-quality controller already consumes. It
  // pushes a smoothed sample at ~3 Hz and never touches animation rates,
  // LOD, or the tick loop's structure.
  const frameRateSampler = new FrameRateSampler()
  let lastFrameRatePushMs = 0
  function tick(now: number) {
    const steps = consumeFrameSteps(clock, now)
    if (lastTickTimestamp !== undefined && now > lastTickTimestamp) {
      const intervalMs = now - lastTickTimestamp
      const excluded = document.hidden || paused || Boolean(reducedMotionQuery?.matches)
      qualityController.recordFrameInterval(intervalMs, now, excluded)
      frameRateSampler.record(intervalMs, excluded)
      if (onFrameRate && now - lastFrameRatePushMs >= FRAME_RATE_PUSH_INTERVAL_MS) {
        lastFrameRatePushMs = now
        onFrameRate(frameRateSampler.sample())
      }
      const nextTier = qualityController.evaluate(now)
      if (nextTier !== qualityTier) applyQualityTier(nextTier)
    }
    lastTickTimestamp = now
    if (steps) render(steps)
  }
  function syncLoop() {
    if (disposed || failed) return
    suspendFrameClock(clock)
    if (!canRunFishSceneLoop(paused, document.hidden, spawnUnavailable)) {
      renderer.setAnimationLoop(null)
      // Sampling stops with the loop; report the suspension so the HUD
      // badge shows Paused / Suspended instead of a frozen FPS value.
      onFrameRate?.(null)
      if (!document.hidden && !spawnUnavailable) render(0, true)
    }
    else renderer.setAnimationLoop(tick)
  }
  let narrow = false
  function resize() {
    if (disposed || failed) return
    const nextWidth = Math.max(1, canvas.parentElement!.clientWidth), nextHeight = Math.max(1, canvas.parentElement!.clientHeight)
    const sizeChanged = width !== nextWidth || height !== nextHeight
    if (sizeChanged) particleBuffersDirty = true
    width = nextWidth; height = nextHeight
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
    // The nearest fish depth controls the safe horizontal envelope, so depth
    // changes cannot send an otherwise in-bounds fish beyond the view edge.
    // AQ-62: the envelope is measured from the overview camera distance,
    // not the live camera — zooming in must not shrink the fish roaming
    // volume or trigger a habitat rebuild.
    const halfWidth = Math.min(5.0, (DEFAULT_CAMERA_DISTANCE_M - 2.8) * Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect * .96)
    habitat.bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
    const newNarrow = width < 600
    const recoveringFromUnavailableSpawn = spawnUnavailable
    let rebuildSucceeded: boolean | undefined
    // AQ-73: the sand bed follows the single-/dual-island layout with the
    // habitat; setLayout is a no-op when the layout already matches.
    if (newNarrow !== narrow) sandBed.setLayout(newNarrow)
    if (loaded && (narrow !== newNarrow || (spawnUnavailable && sizeChanged) || [...fish, ...schoolmates].some(item => !isSafeCurrentInhabitantPosition(item)))) {
      narrow = newNarrow; rebuildHabitat(); rebuildSucceeded = rebuildFish()
      if (rebuildSucceeded !== undefined) status(fishSceneStatus(!rebuildSucceeded))
    }
    if (recoveringFromUnavailableSpawn && rebuildSucceeded === true) syncLoop()
    if (!spawnUnavailable) render(0, true)
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement!); resize()
  document.addEventListener('visibilitychange', syncLoop, { signal: abort.signal })
  // Camera zoom input (AQ-62 AC #1/#2): wheel zooms toward the cursor,
  // drag pans while zoomed, pinch zooms on touch. The canvas itself has
  // pointer-events: none, so listeners live on the section (the canvas
  // parent), which also receives events bubbling from the link layer. A drag
  // never starts on a fish link (event target closest('a')), so panning
  // cannot steal a click; a drag that ends over a link is suppressed by a
  // capture-phase click guard. At the overview, drag does nothing — the
  // scene behaves exactly as before zooming existed.
  const zoomHost = canvas.parentElement!
  const zoomPointers = new Map<number, { x: number; y: number }>()
  let zoomDragged = false
  let zoomDragDistancePx = 0
  let zoomPinchDistance: number | undefined
  let zoomPinchMidpoint: { x: number; y: number } | undefined
  function zoomNdc(clientX: number, clientY: number) {
    const box = canvas.getBoundingClientRect()
    // A degenerate rect (zero size) falls back to the scene's known size so
    // cursor math never divides by zero.
    const w = box.width > 0 ? box.width : width
    const h = box.height > 0 ? box.height : height
    const left = box.width > 0 ? box.left : 0
    const top = box.height > 0 ? box.top : 0
    // A wheel event without cursor coordinates (some synthetic dispatchers)
    // zooms about the screen centre instead of producing NaN targets.
    const x = Number.isFinite(clientX) ? clientX : left + w / 2
    const y = Number.isFinite(clientY) ? clientY : top + h / 2
    return { x: ((x - left) / w) * 2 - 1, y: 1 - ((y - top) / h) * 2 }
  }
  zoomHost.addEventListener('wheel', event => {
    event.preventDefault()
    const ndc = zoomNdc(event.clientX, event.clientY)
    const nextDistance = cameraZoomDesired.distance * Math.exp(event.deltaY * 0.0012)
    setCameraZoomDesired(zoomToCursor(cameraZoomDesired, camera.aspect, camera.fov, ndc.x, ndc.y, nextDistance))
  }, { passive: false, signal: abort.signal })
  zoomHost.addEventListener('pointerdown', event => {
    if (event.target instanceof Element && event.target.closest('a')) return
    if (zoomPointers.size === 0) { zoomDragged = false; zoomDragDistancePx = 0 }
    zoomPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (zoomPointers.size === 2) {
      const [first, second] = [...zoomPointers.values()]
      zoomPinchDistance = Math.hypot(first!.x - second!.x, first!.y - second!.y)
      zoomPinchMidpoint = { x: (first!.x + second!.x) / 2, y: (first!.y + second!.y) / 2 }
    }
  }, { signal: abort.signal })
  zoomHost.addEventListener('pointermove', event => {
    const previous = zoomPointers.get(event.pointerId)
    if (!previous) return
    const moved = { x: event.clientX - previous.x, y: event.clientY - previous.y }
    zoomPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (zoomPointers.size === 2 && zoomPinchDistance !== undefined && zoomPinchMidpoint !== undefined) {
      const [first, second] = [...zoomPointers.values()]
      const nextDistance = Math.hypot(first!.x - second!.x, first!.y - second!.y)
      if (nextDistance <= 0 || zoomPinchDistance <= 0) return
      const midpoint = { x: (first!.x + second!.x) / 2, y: (first!.y + second!.y) / 2 }
      const ndc = zoomNdc(midpoint.x, midpoint.y)
      const next = zoomToCursor(cameraZoomDesired, camera.aspect, camera.fov, ndc.x, ndc.y, cameraZoomDesired.distance * (zoomPinchDistance / nextDistance))
      // Pinch also pans toward the midpoint's drift so the content tracks
      // both fingers instead of only zooming about the screen centre.
      const panned = panCameraZoomState(next, camera.fov, height, midpoint.x - zoomPinchMidpoint.x, midpoint.y - zoomPinchMidpoint.y)
      zoomPinchDistance = nextDistance
      zoomPinchMidpoint = midpoint
      zoomDragged = true
      setCameraZoomDesired(panned)
      return
    }
    if (zoomPointers.size !== 1 || isOverviewZoomState(cameraZoomDesired)) return
    zoomDragDistancePx += Math.abs(moved.x) + Math.abs(moved.y)
    if (zoomDragDistancePx > 6) zoomDragged = true
    setCameraZoomDesired(panCameraZoomState(cameraZoomDesired, camera.fov, height, moved.x, moved.y))
  }, { signal: abort.signal })
  function zoomEndPointer(event: PointerEvent) {
    zoomPointers.delete(event.pointerId)
    if (zoomPointers.size < 2) { zoomPinchDistance = undefined; zoomPinchMidpoint = undefined }
    if (zoomPointers.size === 0) {
      zoomDragDistancePx = 0
      // The click guard below clears zoomDragged when it suppresses a click;
      // this timeout covers a drag with no following click (release outside
      // the section) so a later genuine click is never swallowed.
      setTimeout(() => { zoomDragged = false }, 350)
    }
  }
  zoomHost.addEventListener('pointerup', zoomEndPointer, { signal: abort.signal })
  zoomHost.addEventListener('pointercancel', zoomEndPointer, { signal: abort.signal })
  zoomHost.addEventListener('click', event => {
    if (!zoomDragged) return
    zoomDragged = false
    event.preventDefault()
    event.stopPropagation()
  }, { capture: true, signal: abort.signal })
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); failed = true; renderer.setAnimationLoop(null); status('failed') }, { signal: abort.signal })
  // Per-asset fish load with failure isolation (AQ-76 AC #2): a single GLB
  // failure logs a warning and leaves that species on its thumbnail sprite
  // instead of failing the whole scene, as the old single Promise.all did.
  // A load that finishes after disposal disposes its GLB instead of adding it.
  async function loadFishModel(id: string) {
    try {
      const model = await loader.loadAsync(modelUrls[id])
      if (disposed || failed) { disposeTree(model.scene); return undefined }
      loadedAssets.add(model)
      return model
    } catch (error) {
      console.warn('Fish model failed to load; keeping thumbnail fallback', id, error)
      return undefined
    }
  }
  // Background lazy-load queue (AQ-76 AC #2): at most 2 GLBs in flight,
  // driven by requestIdleCallback with a setTimeout fallback. Species with
  // no configured service are never queued. A species whose inhabitant is
  // currently off-screen (no valid link projection) stays queued until it
  // re-enters; the queue is re-pumped on the ~0.24 s label cadence.
  function enqueueLazyFishLoads(fishIds: readonly string[]) {
    const pending = orderLazyLoadQueue(
      fishIds.filter(id => !modelBases.has(id) && !lazyQueue.includes(id)),
      services.map(service => service.fishId),
    )
    lazyQueue.push(...pending)
    scheduleLazyPump()
  }
  function scheduleLazyPump() {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => pumpLazyLoads(), { timeout: 1000 })
    else setTimeout(() => pumpLazyLoads(), 50)
  }
  function pumpLazyLoads() {
    if (disposed || failed || lazyQueue.length === 0) return
    while (lazyActiveLoads < LAZY_MAX_CONCURRENT_LOADS && lazyQueue.length > 0) {
      const id = lazyQueue[0]
      const item = fish.find(next => next.service.fishId === id)
      if (item && !item.fallback) { lazyQueue.shift(); continue }
      if (item && !projectFishLinkBounds(item.root.position, camera, width, height, fishRenderLength(id), projected)) break
      lazyQueue.shift()
      lazyActiveLoads++
      void loadFishModel(id).then(model => {
        lazyActiveLoads--
        if (disposed || failed) { if (model) disposeTree(model.scene); return }
        if (model) {
          modelBases.set(id, model)
          const target = fish.find(next => next.service.fishId === id && next.fallback)
          if (target) swapFallbackToGlb(target)
          if (!document.hidden) render(0, true)
        }
        scheduleLazyPump()
      })
    }
  }
  async function initialize() {
    const load = async (url: string) => {
      const model = await loader.loadAsync(url)
      if (disposed || failed) disposeTree(model.scene)
      else loadedAssets.add(model)
      return model
    }
    const coralIds = Object.keys(MODULAR_CORAL_ASSET_URLS)
    // Lazy loading (AQ-76 AC #2): Phase 0 blocks first paint on the rocks,
    // corals, and the first 3 configured species only. The remaining
    // configured species load in the background after `ready`; species with
    // no configured service never load at all.
    const configuredFishIds = [...new Set(services.map(service => service.fishId))]
    const phase0Ids = phase0SpeciesIds(configuredFishIds)
    const [rockLeft, rockRight, ...restModels] = await Promise.all([
      load(LIVE_ROCK_ISLAND_URLS.left),
      load(LIVE_ROCK_ISLAND_URLS.right),
      ...coralIds.map(id => load(MODULAR_CORAL_ASSET_URLS[id])),
      ...phase0Ids.map(id => loadFishModel(id)),
    ])
    if (disposed || failed) return
    rockIslandLeftBase = rockLeft
    rockIslandRightBase = rockRight
    coralIds.forEach((id, i) => coralTemplates.set(id, restModels[i]!.scene))
    phase0Ids.forEach((id, i) => { const model = restModels[coralIds.length + i]; if (model) modelBases.set(id, model) })
    loaded = true; narrow = width < 600; rebuildHabitat()
    const initialSpawnSucceeded = rebuildFish() === true
    status(fishSceneStatus(!initialSpawnSucceeded))
    syncLoop()
    enqueueLazyFishLoads(configuredFishIds)
  }
  void initialize().catch(error => { console.error('Aquarium assets could not load', error); failed = true; loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); if (!disposed) { renderer.setAnimationLoop(null); status('failed') } })
  syncLoop()
  return {
    update(next, stopped) {
      const changed = JSON.stringify(next) !== JSON.stringify(services); services = next; paused = stopped
      if (changed) {
        const rebuilt = reconcileFish()
        if (rebuilt !== undefined) status(fishSceneStatus(!rebuilt))
        // A newly configured species starts on its thumbnail sprite and its
        // GLB joins the background queue; removing a service never evicts a
        // loaded GLB in v1 (15 species max, ~18 MB total).
        enqueueLazyFishLoads(next.map(service => service.fishId))
      }
      syncLoop()
    },
    activate(id) { const item = fish.find(item => item.service.id === id); if (!item || paused || document.hidden) return; item.releasedFocus = true; startleFish(item.motion, habitat) },
    // Camera zoom (AQ-62 AC #1/#3): each returns whether the camera is
    // zoomed after the action, so the UI can enable the Reset control.
    zoomIn() { return setCameraZoomDesired({ ...cameraZoomDesired, distance: stepZoomDistance(cameraZoomDesired.distance, 'in') }) },
    zoomOut() { return setCameraZoomDesired({ ...cameraZoomDesired, distance: stepZoomDistance(cameraZoomDesired.distance, 'out') }) },
    zoomToFocalArea(id) {
      const next = zoomStateForFocalArea(id)
      if (!next) return !isOverviewZoomState(cameraZoomDesired)
      return setCameraZoomDesired(next)
    },
    resetZoom() { return setCameraZoomDesired({ ...DEFAULT_CAMERA_ZOOM_STATE }) },
    isZoomed() { return !isOverviewZoomState(cameraZoomDesired) },
    getCameraZoom() { return { ...cameraZoomCurrent } },
    serviceAt: nearest,
    canActivate(id, x, y) { const item = fish.find(item => item.service.id === id); return Boolean(item && (x === undefined || y === undefined ? updateVisibility(item) : nearest(x, y) === id)) },
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); observer.disconnect(); renderer.setAnimationLoop(null); lazyQueue = []
      removeFish(); loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); sandBed.dispose(); rear.geometry.dispose(); rear.material.dispose(); hazePlane.geometry.dispose(); hazeMaterial.dispose(); shaftPlane.geometry.dispose(); shaftMaterial.dispose(); waterSurfaceGeometry.dispose(); waterSurfaceMaterial.dispose(); foregroundParticleGeometry.dispose(); foregroundParticleMaterial.dispose(); backgroundParticleGeometry.dispose(); backgroundParticleMaterial.dispose(); bubbleGeometry.dispose(); bubbleMaterial.dispose(); caustics.dispose(); environmentMap?.dispose(); renderer.dispose(); renderer.forceContextLoss()
    },
  }
}

