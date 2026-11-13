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
  LIGHT_SHAFT_REACH_FADE_M,
  LIGHT_SHAFT_SLANT_PER_M,
  LIGHT_SHAFT_SWAY_AMPLITUDE_M,
  SUN_DIRECTION,
  WATER_SURFACE_Y,
  createRestrainedCausticLightController,
  createParticleSprite,
  bubbleEmitterForRockFootprint,
  evaluateBubblePosition,
  evaluateDepthTintedColor,
  evaluateFixtureIntensities,
  evaluateFluorescenceActinicFactor,
  evaluateSuspendedParticlePosition,
  lightShaftBandReach,
} from './underwater-optics'
import { SURFACE_WAVE_GLSL } from './surface-waves'
import { RaymarchedShaftPass, SHAFT_BEAM_GLSL } from './light-shafts'
import { createAragoniteSandBed, getRockFootprintsForViewport } from './aragonite-sand'
import { reefPlacementsForViewport } from './reef-layout'
import { createGlassEnclosure, glassEnclosureLayout } from './glass-enclosure'
import { createWaterSurface } from './water-surface'
import { estimateCaptionRect, labelLiftPx, resolveLabelDeconflicts } from './fish-label-layout'
import { ENVIRONMENT_MAP_INTENSITY, applyEnvironmentMapIntensity, createAquariumEnvironmentMap } from './environment-map'
import { createSwimmingFish, seedForId, startleFish, stepSwimmingSchool, type SwimmingFish, type WaterHabitat } from './motion'
import { createReefMeshNavigation, createRockFallbackObstacles, MESH_NAVIGATION_COLLISION_RADIUS_M, type ReefMeshIslandInput } from './reef-mesh-navigation'
import { applyFishTurningRigOverlay, bindFishTurningRig, evaluateSpriteTurnScaleX, type FishTurningRig } from './fish-turning'
import { SPRITE_PLANE_WIDTH, fishBodyRadiusM, fishClearanceRadius, fishModelScale, fishRenderLength, fishSpriteScale } from './fish-scale'
import { canRunFishSceneLoop, evaluateTieredVerticalDepthRange, findSafeFishHeading, findSafeFishSpawn, fishSceneStatus, fishSpawnPreference, fishSpawnSlotsForServices, isSafeFishPosition } from './fish-spawn'
import { EMPTY_FISH_EXTENSIONS, type FishExtensionConfig } from '../../simulation/fish-extensions'
import { consumeFrameSteps, createFrameClock, SIMULATION_STEP_SECONDS, suspendFrameClock } from './clock'
import { handleArtworkTextureFailure, nearestVisibleIntersection, readArtworkAlpha, type SpriteMasks } from './alpha-picking'
import { applyFishLinkVisibility, isLabelSampleExposed } from './fish-link-focus'
import { projectFishLinkBounds } from './fish-link-projection'
import { createFishClipPlayer, type FishClipPlayer } from './fish-animation'
import { bindFishFlexToModel, updateFishFlex, type FishFlexBinding } from './fish-flex-material'
import { reconcileFishInhabitants, refreshFishLink } from './fish-inhabitants'
import { SCHOOL_TOTAL_COUNT, resolveSchoolPopulation, schoolmateSpawnOffset } from './school-population'
import { applyCaustics, createCaustics } from './caustics'
import { AdaptiveQualityController, LAZY_MAX_CONCURRENT_LOADS, QUALITY_TIERS, consumeLodAnimationDelta, createLodAnimationDeltaState, orderLazyLoadQueue, phase0SpeciesIds, projectedFishLengthPx, selectFishLod, shaftModeForTier, type FishLod, type QualityTier } from './runtime-quality'
import { FRAME_RATE_PUSH_INTERVAL_MS, FrameRateSampler, type FrameRateSample } from './frame-rate'
import {
  DEFAULT_CAMERA_DISTANCE_M,
  DEFAULT_CAMERA_ZOOM_STATE,
  clampCameraZoomState,
  dampCameraZoomState,
  isOverviewZoomState,
  panCameraZoomState,
  stepZoomDistance,
  zoomStateForFishPosition,
  zoomStateForFocalArea,
  zoomToCursor,
  type CameraZoomState,
  type FocalAreaId,
} from './camera-zoom'
import {
  LOOKDEV_PRESETS,
  lookDevCameraState,
  resolveLookDevConfig,
  summarizeLookDevAssetBytes,
  summarizeLookDevTiming,
  type LookDevBridge,
  type LookDevCaptureSnapshot,
  type LookDevPreset,
} from './lookdev'

const modelUrls: Record<string, string> = {
  'ocellaris-clownfish': new URL('../assets/fish/download_testing_copies/clownfish-copy.glb', import.meta.url).href,
  // Restored 2026-11-09 (Ryan's sailfin decision): the yellow tang goes back
  // to the licensed proof candidate (JayNmeGaming, CC BY 4.0 — see
  // src/rendering/proof/ASSET_NOTICES.md). The sailfin copy that stood in
  // for it is now its own roster species below.
  'yellow-tang': new URL('../proof/candidate-real-tang.glb', import.meta.url).href,
  // Desjardins' sailfin tang — roster species, available as a future
  // service fish: it loads only when a service maps to it (Ryan
  // 2026-11-09: removed from the default scene — see display-population.ts).
  // LICENSE FLAG: the source GLB this copy derives from
  // (download_testing/zebrasoma_desjardinii.glb, ernielo18 via Sketchfab)
  // is CC-BY-NC-4.0, which the project's $0 asset policy excludes
  // (AGENTS.md: CC0 / CC-BY 4.0 / custom only). The copy's embedded
  // provenance claims license 'original', but that does not cure the
  // source license. Root must clear or replace this asset; see the PR body.
  'desjardins-sailfin-tang': new URL('../assets/fish/download_testing_copies/zebrasoma_desjardinii-copy.glb', import.meta.url).href,
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
export type AquariumController = { update(services: ServiceConfig[], paused: boolean, configurationReady?: boolean): void; activate(id: string): void; serviceAt(x: number, y: number): string | undefined; canActivate(id: string, x?: number, y?: number): boolean; dispose(): void; zoomIn(): boolean; zoomOut(): boolean; zoomToFocalArea(id: FocalAreaId): boolean; resetZoom(): boolean; isZoomed(): boolean; getCameraZoom(): CameraZoomState; focusServiceFish?(id: string): boolean; getFocusedServiceId?(): string | undefined }
declare global { interface Window { __AQUARIUM_LOOKDEV__?: LookDevBridge } }
type Inhabitant = { service: ServiceConfig; root: THREE.Group; motion: SwimmingFish; clipPlayer?: FishClipPlayer; turningRig?: FishTurningRig; flex?: FishFlexBinding; anchor?: HTMLAnchorElement; visible: boolean; fallback: boolean; releasedFocus: boolean; artwork?: THREE.Mesh; artworkUnavailable?: boolean; schoolmate: boolean; lod: FishLod; lodModel?: THREE.Object3D }

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

export function createAquarium(canvas: HTMLCanvasElement, overlay: HTMLElement, initialServices: ServiceConfig[], initialPaused: boolean, status: (status: SceneStatus) => void, focusFallback: () => HTMLElement | null = () => null, fishExtensions: FishExtensionConfig = EMPTY_FISH_EXTENSIONS, onFrameRate?: (sample: FrameRateSample | null) => void, initialConfigurationReady = true): AquariumController {
  const lookDevConfig = import.meta.env.DEV ? resolveLookDevConfig(window.location.search, true) : undefined
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(lookDevConfig ? 1 : Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.80
  renderer.shadowMap.enabled = true
  // AQ-70.4 AC #3: Variance Shadow Maps for soft reef-fixture penumbras.
  // A reef LED fixture is a wide multi-emitter source, not a single sun:
  // VSM blurs the shadow map (radius + blurSamples) so sand/rock shadows
  // get soft penumbras instead of sharp outdoor-sun silhouettes. This also
  // removes the PCFSoftShadowMap deprecation warning three r187 emits.
  // Trade-off, judged acceptable: VSM can light-bleed where a bright lit
  // surface sits directly behind a thin occluder; the scene's occluders are
  // chunky live rock and the bias below keeps the bleed restrained.
  // The 2048 map (was 1024) keeps the blur from turning into mush.
  renderer.shadowMap.type = THREE.VSMShadowMap

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
  scene.background = new THREE.Color('#04152d')
  scene.fog = new THREE.Fog('#04152d', optics.fogNear, optics.fogFar)
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
  let focusedServiceId: string | undefined
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
  const hemiLight = new THREE.HemisphereLight('#3b78b8', '#080614', 0.22)
  scene.add(hemiLight)
  // 2) Crisp 14,000K overhead reef daylight key light with soft shadow map.
  // AQ-70.6 AC #2: the key/fill split is derived from the fixture
  // white/blue balance and total output in the optics config, so tuning
  // the fixture re-balances both lights (and the coral fluorescence) at
  // once. At the default balance the resolved intensities are exactly the
  // long-standing 2.1 / 0.95.
  const fixture = evaluateFixtureIntensities(optics.fixtureWhiteBalance, optics.fixtureTotalIntensity)
  const keyLight = new THREE.DirectionalLight('#eef6ff', fixture.keyLightIntensity)
  keyLight.position.set(1.2, 6.8, 4.6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  // VSM blur: radius in shadow-map texels and the number of blur samples.
  // radius 4 at 1024px preserves the exact ~2.5 cm penumbra at the 13 m
  // shadow frustum (4/1024 == 8/2048) while reducing shadow blur texture
  // taps by 88% and fragment fill by 75% for 60 FPS performance.
  keyLight.shadow.radius = 4
  keyLight.shadow.blurSamples = 8
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
  const fillLight = new THREE.DirectionalLight('#2e6be6', fixture.fillLightIntensity)
  fillLight.position.set(-3.6, 4.2, 2.8)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight('#4a8ce0', 0.28)
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
  // Surface-driven lighting (AQ-96 / AQ-70.6): the sand threshold is
  // re-tuned from the 0.22 visual-check workaround back toward the 0.35
  // default (now `causticSandThreshold: 0.30` in the optics config) now
  // that the wave-field focus term does the work of making the dapple
  // strong — same +0.35 cap, same texture, no brighter peak.
  applyCaustics(sand.material as THREE.MeshStandardMaterial, caustics, { threshold: optics.causticSandThreshold })
  scene.add(sandBed.group)

  // Layered Reef-Tank Backdrop (AQ-14.6 & AQ-39): eliminates the flat paint-bucket wall & sharp horizon line
  // NOTE (AQ-96): the backdrop's old independent sine sunbeams (0.45 Hz /
  // 0.32 Hz) are DELETED — they were a third shaft system disagreeing
  // with the shaft plane and the caustic scroll. The backdrop now carries
  // only the gradient + patina + sand seam; all beams come from the one
  // shared wave field (shaft plane / raymarched pass). There is no
  // uRearTime any more: the backdrop is static, as it should be.
  const rearMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.98, metalness: 0.0 })
  rearMaterial.envMapIntensity = ENVIRONMENT_MAP_INTENSITY.backdrop
  rearMaterial.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 vRearWorldPos;\n` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvec4 rearWp = modelMatrix * vec4(transformed, 1.0);\nvRearWorldPos = rearWp.xyz;`,
    )
    shader.fragmentShader = `varying vec3 vRearWorldPos;\n` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
float hNorm = clamp((vRearWorldPos.y + 2.8) / 5.6, 0.0, 1.0);
// Deep abyssal navy at base -> rich reef sapphire mid-water -> deep royal cobalt below top LEDs
// Calibrated in linear space so directional lights do not wash the backdrop pale.
vec3 cBottom = vec3(0.002, 0.008, 0.026);
vec3 cMid = vec3(0.006, 0.024, 0.072);
vec3 cTop = vec3(0.015, 0.056, 0.145);
vec3 waterCol = mix(cBottom, cMid, smoothstep(0.0, 0.56, hNorm));
waterCol = mix(waterCol, cTop, smoothstep(0.50, 1.0, hNorm));

// Natural lateral falloff toward the tank side walls so the central reef & arch pop against deep navy corners
float sideFalloff = smoothstep(1.5, 8.5, abs(vRearWorldPos.x));
waterCol *= mix(1.0, 0.38, sideFalloff);

// Subtle rear-glass coralline & reef biofilm patina
float patinaNoise = 0.5 + 0.28 * sin(vRearWorldPos.x * 1.7 + cos(vRearWorldPos.y * 2.3)) + 0.22 * cos(vRearWorldPos.x * 4.1 - vRearWorldPos.y * 3.7);
float patinaMask = smoothstep(0.42, 0.82, patinaNoise) * (1.0 - smoothstep(0.55, 0.90, hNorm)) * 0.18;
vec3 cCorallineGlass = vec3(0.018, 0.009, 0.036);
waterCol = mix(waterCol, cCorallineGlass, patinaMask);

// Deep shadowed rear-sand horizon transition (no bright beige band)
waterCol = mix(vec3(0.003, 0.009, 0.024), waterCol, smoothstep(0.0, 0.14, hNorm));

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
        vec3 hazeColor = mix(vec3(0.012, 0.048, 0.12), vec3(0.004, 0.016, 0.052), vertical);
        float alpha = uHazeAlpha * (0.45 + 0.55 * vertical) * edgeFade;
        gl_FragColor = vec4(hazeColor, alpha);
      }`,
  })
  const hazePlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), hazeMaterial)
  // The plane spans y -4.1..5.9: its top edge sits above the visible frame
  // at both viewports (the overview frame tops out near y 4.8 at this depth;
  // zoomed views see less), so no hard haze edge can cross the water. The
  // old 5.4 m plane topped out at y 2.62 — about 23% down the 1440x900 frame
  // — and its top edge read as a dark horizontal band across the whole tank.
  // The bottom edge is hidden behind the sand bed.
  hazePlane.position.set(0, 0.9, (DEPTH_HAZE_START_Z + DEPTH_HAZE_END_Z) / 2)
  hazePlane.renderOrder = 1
  hazePlane.raycast = () => {}
  scene.add(hazePlane)

  // Soft volumetric light shafts (AQ-86 AC #2, upgraded AQ-96/AQ-98):
  // one additive plane just behind the fish volume carrying the three
  // slanted bands from underwater-optics.ts (mirrored by
  // evaluateLightShaftIntensity, so the CPU reference and the shader can
  // never disagree). The upgrade: band sway is driven by the shared
  // surface wave field sampled at each band root (no independent clock),
  // each band fades out past its own hashed depth reach (the centre band
  // over the open arch reaches deepest), a value-noise breakup keeps the
  // beams from reading as solid columns, and a view-angle fade dims them
  // when the camera looks up the beam axis. Bands weaken with depth and
  // freeze at the t=0 phase on pause / reduced-motion / hidden, exactly
  // like the caustic and ripple channels. This plane is the
  // Balanced/Low tier fallback; on High the raymarched pass replaces it.
  const shaftUniforms = {
    uShaftTime: { value: 0 },
    uShaftAlpha: { value: optics.lightShaftMaxAlpha },
    uSunDir: { value: new THREE.Vector3(SUN_DIRECTION.x, SUN_DIRECTION.y, SUN_DIRECTION.z) },
  }
  const shaftMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // Fragment RGB already contains alpha; add that radiance once.
    premultipliedAlpha: true,
    uniforms: shaftUniforms,
    vertexShader: 'varying vec3 vShaftWorldPos; varying vec2 vShaftUv; void main() { vShaftUv = uv; vec4 shaftWp = modelMatrix * vec4(position, 1.0); vShaftWorldPos = shaftWp.xyz; gl_Position = projectionMatrix * viewMatrix * shaftWp; }',
    fragmentShader: `
      uniform float uShaftTime;
      uniform float uShaftAlpha;
      uniform vec3 uSunDir;
      varying vec3 vShaftWorldPos;
      varying vec2 vShaftUv;
      ${SURFACE_WAVE_GLSL}
      ${SHAFT_BEAM_GLSL}
      void main() {
        float depthFromTop = clamp((2.8 - vShaftWorldPos.y) / 5.6, 0.0, 1.0);
        float depthEnvelope = pow(1.0 - 0.85 * depthFromTop, 1.55);
        float edgeFade = smoothstep(0.0, 0.06, vShaftUv.x) * smoothstep(1.0, 0.94, vShaftUv.x);
        float shaft = 0.0;
${LIGHT_SHAFT_BAND_CENTERS.map((center) => {
  const reach = lightShaftBandReach(center)
  return `        float sway${center === LIGHT_SHAFT_BAND_CENTERS[0] ? 0 : center === LIGHT_SHAFT_BAND_CENTERS[1] ? 1 : 2} = ${LIGHT_SHAFT_SWAY_AMPLITUDE_M.toFixed(2)} * surfaceWaveHeight(vec2(${center.toFixed(2)}, -1.8), uShaftTime);
        float reachFade${center === LIGHT_SHAFT_BAND_CENTERS[0] ? 0 : center === LIGHT_SHAFT_BAND_CENTERS[1] ? 1 : 2} = clamp(1.0 - (depthFromTop - ${reach.toFixed(4)}) / ${LIGHT_SHAFT_REACH_FADE_M.toFixed(2)}, 0.0, 1.0);
        shaft += exp(-pow((vShaftWorldPos.x - (${center.toFixed(2)} + (2.8 - vShaftWorldPos.y) * ${LIGHT_SHAFT_SLANT_PER_M.toFixed(2)} + sway${center === LIGHT_SHAFT_BAND_CENTERS[0] ? 0 : center === LIGHT_SHAFT_BAND_CENTERS[1] ? 1 : 2})) / ${LIGHT_SHAFT_BAND_WIDTH_M.toFixed(2)}, 2.0)) * reachFade${center === LIGHT_SHAFT_BAND_CENTERS[0] ? 0 : center === LIGHT_SHAFT_BAND_CENTERS[1] ? 1 : 2};`
}).join('\n')}
        // Internal fine curtain rays: vertical ray striations beneath surface ripples
        float fineCurtain = 0.55 + 0.45 * shaftValueNoise(vec2(vShaftWorldPos.x * 2.4 + uShaftTime * 0.04, vShaftWorldPos.y * 0.25));
        float breakup = (0.65 + 0.35 * shaftValueNoise(vec2(vShaftWorldPos.x * 0.8 + vShaftWorldPos.y * 0.3, uShaftTime * 0.05))) * fineCurtain;
        // View-angle fade: beams read from the side, not when looking up
        // the beam axis (zoomed-in / looking up), where they would band.
        vec3 shaftViewDir = normalize(vShaftWorldPos - cameraPosition);
        float axisFade = 1.0 - smoothstep(0.75, 0.95, abs(dot(shaftViewDir, uSunDir)));
        float alpha = min(shaft, 1.0) * depthEnvelope * edgeFade * breakup * axisFade * uShaftAlpha * 0.68;
        gl_FragColor = vec4(vec3(0.24, 0.58, 0.92) * alpha, alpha);
      }`,
  })
  const shaftPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), shaftMaterial)
  // Same full-frame height as the haze plane (see above): the old 5.4 m
  // plane ended at the same ~23% screen height and its top edge could read
  // as a faint bright line across the tank.
  shaftPlane.position.set(0, 0.9, DEPTH_HAZE_START_Z - 0.3)
  shaftPlane.renderOrder = 2
  shaftPlane.raycast = () => {}
  scene.add(shaftPlane)

  // The surface is a bounded water-air interface: continuous shared-wave
  // facets, softened Snell-window/TIR shading, rear fade, and front meniscus.
  const waterSurfaceController = createWaterSurface(glassEnclosureLayout(false, optics.surfaceY))
  const waterSurface = waterSurfaceController.mesh
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
    // AQ-43: soft round disc sprite — without a map every mote rendered
    // as a hard square ("tiny white squares up close", PR #37 check).
    map: createParticleSprite('mote'),
    alphaTest: 0.01,
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
    // AQ-43: same soft round disc sprite as the foreground motes.
    map: createParticleSprite('mote'),
    alphaTest: 0.01,
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
    // AQ-43: the 0.06 m / 0.6 opacity bump from the PR #32 round only made
    // bigger pale squares — without a map every bubble rendered as a hard
    // square, indistinguishable from the motes. The ring sprite below
    // reads as a rising bubble outline instead, while staying inside the
    // amended restraint (≤16 per stream, normal blending, no additive
    // specular dots). Counts are unchanged.
    size: 0.06,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    map: createParticleSprite('bubble'),
    alphaTest: 0.01,
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
  const glassEnclosure = createGlassEnclosure({
    surfaceY: optics.surfaceY,
    excludeFromReflections: () => [waterSurface, shaftPlane, hazePlane, foregroundParticles, backgroundParticles, bubbles, ...fish.map(item => item.root), ...schoolmates.map(item => item.root)],
  })
  scene.add(glassEnclosure.group)
  let glassLayoutNarrow: boolean | undefined
  let habitat: WaterHabitat = { bounds: { min: { x: -4, y: -2.25, z: -4.6 }, max: { x: 4, y: 2.8, z: 2.8 } }, obstacles: [], anchors: [] }
  let width = 1, height = 1, labelClock = 0, spawnUnavailable = false
  let lookDevPreset: LookDevPreset = lookDevConfig?.preset ?? 'full-scene'
  let lookDevTimeSeconds = lookDevConfig?.timeSeconds ?? 0
  let lookDevSubjectId = lookDevConfig?.subjectId
  let lookDevTextureRequestId = 0
  let lookDevReady = false, lookDevContextLost = false, lookDevFailure: string | undefined
  let lookDevNeedsStaging = true
  let lookDevConfigurationReady = initialConfigurationReady
  const lookDevCurrentAssets = new Set<string>(), lookDevPendingAssets = new Set<string>(), lookDevFailedAssets = new Set<string>()
  const lookDevRafSamples: number[] = [], lookDevCpuRenderSamples: number[] = [], lookDevFrozenRenderSamples: number[] = []
  let lookDevLastRafTime: number | undefined
  let lookDevCaptureRequested = false
  const lookDevReadyWaiters = new Set<{ resolve: (value: LookDevCaptureSnapshot) => void; reject: (reason: Error) => void }>()
  const lookDevWindowFrames = 120
  const lookDevResetTiming = () => {
    lookDevRafSamples.length = 0
    lookDevCpuRenderSamples.length = 0
    lookDevFrozenRenderSamples.length = 0
    lookDevLastRafTime = undefined
  }
  const recordLookDevSample = (target: number[], value: number) => {
    if (!Number.isFinite(value) || value < 0) return
    target.push(value)
    if (target.length > lookDevWindowFrames) target.shift()
  }
  function lookDevSnapshot(): LookDevCaptureSnapshot {
    const performanceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const rendererInfo = renderer.info
    const buildEnv = import.meta.env as ImportMetaEnv & { VITE_GIT_COMMIT?: string }
    const unresolvedFishIds = [...new Set([...fish, ...schoolmates]
      .filter(item => item.fallback && modelBases.has(item.service.fishId))
      .map(item => item.service.fishId))].sort()
    const failedTextures = [...lookDevFailedAssets].filter(key => key.startsWith('thumbnail:'))
    const currentFailure = lookDevFailure
      ?? (spawnUnavailable ? 'Fish spawn is unavailable for this viewport and service layout.' : undefined)
      ?? (failedTextures.length ? `Current fish thumbnail texture failed: ${failedTextures.join(', ')}` : undefined)
      ?? (unresolvedFishIds.length ? `Loaded fish models still have thumbnail-only inhabitants: ${unresolvedFishIds.join(', ')}.` : undefined)
    return {
      ready: lookDevReady && lookDevConfigurationReady && !lookDevContextLost && !document.hidden && !currentFailure && loaded
        && meshNavigationSettledGeneration === meshNavigationGeneration
        && lookDevPendingAssets.size === 0 && lazyQueue.length === 0
        && failedTextures.length === 0 && unresolvedFishIds.length === 0,
      ...(currentFailure === undefined ? {} : { failure: currentFailure }),
      pendingAssetCount: lookDevPendingAssets.size + lazyQueue.length,
      failedAssets: [...lookDevFailedAssets].sort(),
      unresolvedFishIds,
      commit: buildEnv.VITE_GIT_COMMIT ?? null,
      viewport: { width, height, devicePixelRatio: renderer.getPixelRatio() },
      preset: lookDevPreset,
      seed: lookDevConfig?.seed ?? 0,
      timeSeconds: lookDevTimeSeconds,
      ...(lookDevSubjectId === undefined ? {} : { subjectId: lookDevSubjectId }),
      labelsVisible: lookDevConfig?.labelsVisible ?? true,
      inhabitants: [...fish, ...schoolmates].map(item => ({
        id: item.service.id,
        speciesId: item.service.fishId,
        schoolmate: Boolean(item.schoolmate),
        position: { ...item.motion.position },
        heightRange: evaluateTieredVerticalDepthRange(item.service.fishId, habitat.bounds, item.motion.clearance)?.worldYRange ?? null,
      })),
      renderer: {
        render: { calls: rendererInfo.render.calls, triangles: rendererInfo.render.triangles, points: rendererInfo.render.points, lines: rendererInfo.render.lines },
        memory: { geometries: rendererInfo.memory.geometries, textures: rendererInfo.memory.textures },
      },
      timing: {
        rafInterval: summarizeLookDevTiming(lookDevRafSamples) ?? null,
        cpuRenderCall: summarizeLookDevTiming(lookDevCpuRenderSamples) ?? null,
        frozenPoseRenderCall: summarizeLookDevTiming(lookDevFrozenRenderSamples) ?? null,
        windowFrames: lookDevWindowFrames,
      },
      assets: summarizeLookDevAssetBytes(performanceEntries.map(entry => ({
        name: entry.name,
        encodedBodySize: entry.encodedBodySize,
        transferSize: entry.transferSize,
      }))),
    }
  }
  function waitForLookDevReady(): Promise<LookDevCaptureSnapshot> {
    const snapshot = lookDevSnapshot()
    if (snapshot.ready) return Promise.resolve(snapshot)
    if (snapshot.failure) return Promise.reject(new Error(snapshot.failure))
    return new Promise((resolve, reject) => lookDevReadyWaiters.add({ resolve, reject }))
  }
  function rejectLookDevWaiters(error: Error) {
    lookDevReadyWaiters.forEach(waiter => waiter.reject(error))
    lookDevReadyWaiters.clear()
  }
  function failLookDevCapture(reason: string) {
    if (!lookDevConfig || lookDevFailure) return
    lookDevFailure = reason
    rejectLookDevWaiters(new Error(reason))
  }
  function lookDevCameraTarget() {
    const target = lookDevSubjectId ? fish.find(item => item.service.id === lookDevSubjectId) : undefined
    const position = target?.motion.position
    return clampCameraZoomState(lookDevCameraState(lookDevPreset, position, width < 600))
  }
  function applyLookDevCamera() {
    if (!lookDevConfig) return
    focusedServiceId = undefined
    cameraZoomDesired = lookDevCameraTarget()
    cameraZoomCurrent = { ...cameraZoomDesired }
    applyCameraZoom()
  }
  function applyLookDevPresentation() {
    if (!lookDevConfig) return
    for (const item of [...fish, ...schoolmates]) {
      item.motion.yaw = Math.PI / 2
      item.motion.pitch = 0
      item.motion.bank = 0
      item.motion.speed = 0
      item.root.position.set(item.motion.position.x, item.motion.position.y, item.motion.position.z)
      if (item.fallback) item.root.scale.x = 1
      else item.root.rotation.set(0, Math.PI / 2, 0, 'YXZ')
      item.root.updateMatrix()
      item.root.updateMatrixWorld()
    }
  }
  function settleLookDevReadiness() {
    if (!lookDevConfig || lookDevReady || lookDevContextLost || lookDevFailure || disposed) return
    if (!lookDevConfigurationReady) return
    if (document.hidden) return
    if (spawnUnavailable) {
      rejectLookDevWaiters(new Error('Fish spawn is unavailable for this viewport and service layout.'))
      return
    }
    if (meshNavigationSettledGeneration !== meshNavigationGeneration) return
    if (!loaded || lookDevPendingAssets.size > 0 || lazyQueue.length > 0 || lazyActiveLoads > 0) return
    const failedTextures = [...lookDevFailedAssets].filter(key => key.startsWith('thumbnail:'))
    if (failedTextures.length > 0) {
      rejectLookDevWaiters(new Error(`Current fish thumbnail texture failed: ${failedTextures.join(', ')}`))
      return
    }
    if (lookDevSubjectId && !fish.some(item => item.service.id === lookDevSubjectId)) {
      rejectLookDevWaiters(new Error(`Look-dev subject "${lookDevSubjectId}" is not a configured service id.`))
      return
    }
    // Saved configuration can arrive before or after the starter models.
    // Restage the complete roster against the settled habitat once, rather
    // than capturing whichever retained starter positions won that race.
    if (lookDevNeedsStaging) {
      lookDevNeedsStaging = false
      if (rebuildFish() !== true) {
        rejectLookDevWaiters(new Error('Complete look-dev roster cannot be staged safely.'))
        return
      }
      if (lookDevPendingAssets.size > 0 || lazyQueue.length > 0 || lazyActiveLoads > 0) return
    }
    const unresolved = lookDevSnapshot().unresolvedFishIds
    if (unresolved.length > 0) {
      rejectLookDevWaiters(new Error(`Loaded fish models still have thumbnail-only inhabitants: ${unresolved.join(', ')}.`))
      return
    }
    lookDevResetTiming()
    applyLookDevPresentation()
    applyLookDevCamera()
    lookDevReady = true
    try { render(0, true) }
    catch (error) {
      lookDevReady = false
      failLookDevCapture(`Frozen render failed: ${String(error)}`)
      return
    }
    const snapshot = lookDevSnapshot()
    lookDevReadyWaiters.forEach(waiter => waiter.resolve(snapshot))
    lookDevReadyWaiters.clear()
  }
  function beginLookDevAsset(key: string) {
    if (!lookDevConfig) return
    lookDevCurrentAssets.add(key)
    lookDevPendingAssets.add(key)
    lookDevReady = false
    lookDevResetTiming()
  }
  function finishLookDevAsset(key: string, failedAsset = false) {
    if (!lookDevConfig || !lookDevCurrentAssets.has(key)) return
    lookDevPendingAssets.delete(key)
    if (failedAsset) lookDevFailedAssets.add(key)
    settleLookDevReadiness()
  }
  let meshNavigationGeneration = 0
  let meshNavigationSettledGeneration = 0
  const clock = createFrameClock()
  // Keep animation time per inhabitant across artwork swaps and LOD changes.
  const animationDeltas = new WeakMap<SwimmingFish, ReturnType<typeof createLodAnimationDeltaState>>()
  let qualityTier: QualityTier = 'high'
  // Raymarched shaft pass (AQ-98): lazily constructed on the High tier
  // only, disposed on failure (the shaft plane is the fallback). The
  // non-occluders are wired in render() where the pass is created.
  let shaftPass: RaymarchedShaftPass | null = null
  let shaftPassFailed = false
  const qualityController = new AdaptiveQualityController()
  // AQ-76 lazy-load queue state lives with the other scene state (not beside
  // initialize): resize() -> render() can pump the queue during setup, before
  // the initialize() block below has run, so these must be initialized here.
  let lazyQueue: string[] = []
  let lazyActiveLoads = 0
  const ray = new THREE.Raycaster(), projected = new THREE.Vector3(), sample = new THREE.Vector3(), hitMeshes: THREE.Object3D[] = []
  const reefMeshes: THREE.Object3D[] = []
  const fishMeshes: THREE.Object3D[] = []
  // Meshes belonging to no-service ambient schoolmates (sailfin, chromis,
  // anthias). They sit in hitMeshes as occluders for click picking, but
  // they must never hide a service fish's label: they carry no serviceId,
  // so without this set the visibility test cannot tell them from reef.
  const ambientMeshes = new Set<THREE.Object3D>()
  const ownedSprites = new Set<THREE.Mesh>()
  const spriteMasks: SpriteMasks = new WeakMap()
  const ndcSample = new THREE.Vector2()
  function raycastNdc(ndc: THREE.Vector2) {
    ray.setFromCamera(ndc, camera)
    return nearestVisibleIntersection(ray.intersectObjects(hitMeshes, false), spriteMasks)
  }
  function nearestHit(x: number, y: number) {
    const box = canvas.getBoundingClientRect()
    return raycastNdc(ndcSample.set((x - box.left) / box.width * 2 - 1, 1 - (y - box.top) / box.height * 2))
  }
  function nearest(x: number, y: number) {
    return nearestHit(x, y)?.object.userData.serviceId as string | undefined
  }
  function updateVisibility(item: Inhabitant) {
    const artworkUnavailable = Boolean(item.artworkUnavailable)
    let visible = artworkUnavailable && Boolean(projectFishLinkBounds(item.root.position, camera, width, height, fishRenderLength(item.service.fishId), projected))
    if (!visible && !artworkUnavailable) for (const [localY, localZ] of [[0, 0], [0, .31], [0, -.31], [.13, 0], [-.13, 0]]) {
      sample.set(item.fallback ? localZ : 0, localY, item.fallback ? 0 : localZ).applyMatrix4(item.root.matrixWorld)
      const distToFish = camera.position.distanceTo(sample)
      sample.project(camera)
      if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.z) || Math.abs(sample.x) > .96 || Math.abs(sample.y) > .94 || sample.z < -1 || sample.z > 1) continue
      // Occlusion check against reef/sand: test whether rock or sand sits between
      // the camera and this point on the fish. By setting ray.far = distToFish - 0.05,
      // Three.js bounding-sphere checks instantly skip all background reef/sand
      // geometry when the fish is swimming in open water in front of the reef.
      ndcSample.set(sample.x, sample.y)
      ray.setFromCamera(ndcSample, camera)
      ray.far = distToFish - 0.05
      const occluders = ray.intersectObjects(reefMeshes, false)
      const occludedByRock = Boolean(nearestVisibleIntersection(occluders, spriteMasks))
      ray.far = Infinity
      if (!occludedByRock) { visible = true; break }
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
    if (lookDevConfig) lookDevNeedsStaging = true
    // Invalidate any previous mesh routing before the reefs are replaced; a
    // fresh collider build is kicked off below and applied only if this
    // generation is still current. Until it lands, fish keep AABB routing.
    meshNavigationGeneration++
    const generation = meshNavigationGeneration
    if (lookDevConfig) {
      lookDevReady = false
      lookDevResetTiming()
    }
    habitat.meshNavigation = undefined
    particleBuffersDirty = true
    reefs.forEach(reef => { scene.remove(reef) }); reefs.length = 0; hitMeshes.length = 0; reefMeshes.length = 0; fishMeshes.length = 0
    reefControllers = []; habitat.obstacles = []; habitat.anchors = []
    if (!rockIslandLeftBase || !rockIslandRightBase || coralTemplates.size === 0) {
      meshNavigationSettledGeneration = generation
      settleLookDevReadiness()
      return
    }
    const reducedMotion = Boolean(reducedMotionQuery?.matches)
    const placements = reefPlacementsForViewport(width < 600).map(placement => ({
      ...placement,
      rockScene: placement.islandKind === 'left' ? rockIslandLeftBase!.scene : rockIslandRightBase!.scene,
      mounts: placement.islandKind === 'left' ? DEFAULT_LEFT_ISLAND_MOUNTS : DEFAULT_RIGHT_ISLAND_MOUNTS,
    }))
    // Bubble emitters (AQ-43 as amended): one at the base of each live-rock
    // island, derived from the placements above — never hardcoded. The left
    // stream is the anemone stream: the host-anemone mount lives on the
    // left island (DEFAULT_LEFT_ISLAND_MOUNTS, socket_anemone_crevice_01),
    // but habitat.anchors only ever carries grazingSurface locations, so
    // no runtime world position for the anemone exists to resolve — the
    // left-island base is the fallback the spec allows, and it is where
    // the anemone sits.
    // Visual-check fix: the emitter sits on the island's FRONT face
    // (bubbleEmitterForRockFootprint), not at the island centre — a
    // centre emitter hides most of the rise inside the rock mass, so no
    // stream was discernible. Counts and sizes are unchanged (≤16/stream,
    // ≤32 total, 0.06 m / 0.6 opacity).
    const rockFootprints = getRockFootprintsForViewport(width < 600)
    bubbleEmitters = placements.map((placement, index) => {
      const footprint = rockFootprints[index]
      return footprint
        ? bubbleEmitterForRockFootprint(footprint)
        : {
            x: placement.position.x,
            y: DEFAULT_AQUARIUM_OPTICS_CONFIG.bubbleEmitterBaseY,
            z: placement.position.z,
          }
    })
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

      const fallback = createRockFallbackObstacles(reef, `reef-${i}`)
      if (fallback.status !== 'ready') {
        // Never keep swimming with incomplete solid geometry, including on
        // resize. Native service links remain available in the failed view.
        failed = true
        renderer.setAnimationLoop(null)
        failLookDevCapture(`Reef collision geometry unavailable: ${fallback.reason}`)
        status('failed')
        return
      }
      const result = instantiateModularReefHabitat(islandKind, uniformScale, position, `reef-${i}`, yaw, mounts, habitat.bounds)
      // Keep the calcified coral bases; historical hand-authored rock bands
      // are replaced by bounds of the same current meshes used for rendering.
      habitat.obstacles.push(...fallback.obstacles, ...result.obstacles.filter(obstacle => obstacle.id.startsWith(`reef-${i}-coral-base-`)))
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
        const occupiedForRelocation: Array<{ position: SwimmingFish['position']; clearance: number; bodyRadiusM?: number }> = []
        for (const item of allInhabitants) {
          if (isSafeCurrentInhabitantPosition(item)) {
            occupiedForRelocation.push({ position: item.motion.position, clearance: item.motion.clearance, bodyRadiusM: fishBodyRadiusM(item.service.fishId) })
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
            fishBodyRadiusM(item.service.fishId),
            evaluateTieredVerticalDepthRange(item.service.fishId, habitat.bounds, item.motion.clearance)?.worldYRange,
          )
          if (relocated) {
            item.motion.position = relocated
            item.motion.route = []
            item.motion.speed = 0
            item.root.position.set(relocated.x, relocated.y, relocated.z)
            occupiedForRelocation.push({ position: relocated, clearance: item.motion.clearance, bodyRadiusM: fishBodyRadiusM(item.service.fishId) })
          }
        }
        console.info('Mesh navigation ready', result.diagnostics)
      } else {
        console.warn('Mesh navigation unavailable; staying on AABB routing', result.reason, result.diagnostics)
      }
      meshNavigationSettledGeneration = generation
      settleLookDevReadiness()
    }).catch(error => {
      if (disposed || generation !== meshNavigationGeneration) return
      console.warn('Mesh navigation build failed; staying on AABB routing', error)
      meshNavigationSettledGeneration = generation
      settleLookDevReadiness()
    })
  }
  function retireLookDevTextures(serviceId: string) {
    if (lookDevConfig) {
      const prefix = `thumbnail:${serviceId}:`
      for (const key of [...lookDevCurrentAssets]) if (key.startsWith(prefix)) {
        lookDevCurrentAssets.delete(key)
        lookDevPendingAssets.delete(key)
        lookDevFailedAssets.delete(key)
      }
    }
  }
  function disposeInhabitant(item: Inhabitant) {
    retireLookDevTextures(item.service.id)
    try { item.motion.extensions.dispose() } catch (error) { console.error('Fish extension cleanup failed', error) }
    item.flex?.dispose(); item.flex = undefined
    scene.remove(item.root); item.clipPlayer?.dispose()
    const skeletons = new Set<THREE.Skeleton>()
    item.root.traverse(object => { if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton) })
    skeletons.forEach(skeleton => skeleton.dispose())
    if (item.artwork) {
      ownedSprites.delete(item.artwork); spriteMasks.delete(item.artwork); disposeTree(item.artwork)
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
        const clip = base.animations[0]!
        const initialClipTime = lookDevConfig
          ? (clip.duration > 0 ? lookDevTimeSeconds % clip.duration : 0)
          : (seedForId(item.service.id) % 1500) / 1000
        item.clipPlayer = createFishClipPlayer(model, clip, initialClipTime)
        item.turningRig = bindFishTurningRig(model, item.service.fishId)
        try {
          const flexSeed = lookDevConfig ? `${lookDevConfig.seed}:${item.service.id}` : item.service.id
          item.flex = bindFishFlexToModel(model, item.service.fishId, seedForId(flexSeed))
          if (lookDevConfig) item.flex?.seek(lookDevTimeSeconds)
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
  // Build the thumbnail sprite for an inhabitant with no GLB yet (the
  // no-GLB fallback, stored as `item.artwork`, upgraded to the GLB by
  // `swapFallbackToGlb` when the lazy load lands). There is no distance
  // sprite tier any more: the LOD2 far-fish sprite swap was removed
  // 2026-11-09 at Ryan's direction, so this is the only sprite path left.
  function buildSprite(item: Inhabitant) {
    const species = getFishById(item.service.fishId)!
    const spriteScale = fishSpriteScale(item.service.fishId)
    const textureKey = `thumbnail:${item.service.id}:${++lookDevTextureRequestId}`
    beginLookDevAsset(textureKey)
    // No-fit fallback retains old resources, but callbacks for a removed or
    // replaced service must not rewrite its React-owned current native link.
    const acceptsArtworkCallback = () => !disposed && !failed && ownedSprites.has(sprite)
      && (item.schoolmate || services.some(next => next.id === item.service.id && next.fishId === item.service.fishId))
    const texture = new THREE.TextureLoader().load(species.thumbnail, loadedTexture => {
      finishLookDevAsset(textureKey)
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
      finishLookDevAsset(textureKey, true)
      if (!acceptsArtworkCallback()) return
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
        retireLookDevTextures(item.service.id)
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
  function removeFish() { fish.forEach(disposeInhabitant); fish = []; schoolmates.forEach(disposeInhabitant); schoolmates = [] }
  function rebuildHitMeshes() {
    hitMeshes.length = 0
    reefMeshes.length = 0
    fishMeshes.length = 0
    ambientMeshes.clear()
    reefs.forEach(reef => reef.traverse(object => { if (object instanceof THREE.Mesh) reefMeshes.push(object) }))
    reefMeshes.push(sand)
    fish.forEach(item => item.root.traverse(object => { if (object instanceof THREE.Mesh) fishMeshes.push(object) }))
    schoolmates.forEach(item => item.root.traverse(object => { if (object instanceof THREE.Mesh) { fishMeshes.push(object); ambientMeshes.add(object) } }))
    hitMeshes.push(...fishMeshes, ...reefMeshes)
  }
  type FishSpawn = { species: NonNullable<ReturnType<typeof getFishById>>; clearance: number; position: SwimmingFish['position']; yaw: number }
  function createInhabitant(service: ServiceConfig, spawn: FishSpawn, anchor?: HTMLAnchorElement, schoolmate = false): Inhabitant {
    const { clearance, position, yaw } = spawn
    const root = new THREE.Group(), base = modelBases.get(service.fishId), fallback = !base
    const motion = createSwimmingFish(service.id, service.fishId, position, clearance, fishExtensions, { initialYaw: yaw, collisionRadiusM: MESH_NAVIGATION_COLLISION_RADIUS_M })
    const item: Inhabitant = { service, root, motion, anchor, visible: false, fallback, releasedFocus: false, schoolmate, lod: 0 }
    try {
      if (base) bindGlbToInhabitant(item, base)
      else item.artwork = buildSprite(item)
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
    occupied: Array<{ position: SwimmingFish['position']; clearance: number; bodyRadiusM?: number }>,
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
        occupied.push({ position: existing.motion.position, clearance: existing.motion.clearance, bodyRadiusM: fishBodyRadiusM(existing.service.fishId) })
        continue
      }
      const species = getFishById(mate.speciesId)!
      const clearance = fishClearanceRadius(mate.speciesId)
      const offset = schoolmateSpawnOffset(mate.id, mate.speciesId, tankWidth, mate.index, SCHOOL_TOTAL_COUNT[mate.speciesId] - 1)
      const preferred = { x: lead.x + offset.x, y: lead.y + offset.y, z: lead.z + offset.z }
      const position = findSafeFishSpawn(preferred, habitat.bounds, habitat.obstacles, clearance, occupied, meshSpawnCheck, fishBodyRadiusM(mate.speciesId), evaluateTieredVerticalDepthRange(mate.speciesId, habitat.bounds, clearance)?.worldYRange)
      if (!position) continue
      const yaw = findSafeFishHeading(position, Math.atan2(offset.x, offset.z), habitat.bounds, habitat.obstacles, clearance)
      if (yaw === undefined) continue
      nextMates.push(createInhabitant(
        { id: mate.id, name: '', url: '', fishId: mate.speciesId, isExample: false },
        { species, clearance, position, yaw },
        undefined,
        true,
      ))
      occupied.push({ position, clearance, bodyRadiusM: fishBodyRadiusM(mate.speciesId) })
    }
    for (const old of schoolmates) if (!nextMates.includes(old)) disposeInhabitant(old)
    schoolmates = [...nextMates]
  }
  function reconcileFish(): boolean | undefined {
    if (!loaded || disposed || failed) return undefined
    const anchors = new Map(Array.from(overlay.querySelectorAll<HTMLAnchorElement>('a[data-service-id]')).map(anchor => [anchor.dataset.serviceId!, anchor]))
    const current = new Map(fish.map(item => [item.service.id, item]))
    const nextServices = services.filter(service => getFishById(service.fishId))
    const spawnOrderKey = (id: string) => lookDevConfig ? `${lookDevConfig.seed}:${id}` : id
    const horizontalSlots = fishSpawnSlotsForServices(nextServices)
    const spawns = new Map<string, FishSpawn>()
    const occupied: Array<{ position: SwimmingFish['position']; clearance: number; bodyRadiusM?: number }> = nextServices.flatMap(next => {
      const retained = current.get(next.id)
      return retained?.service.fishId === next.fishId
        ? [{ position: retained.motion.position, clearance: retained.motion.clearance, bodyRadiusM: fishBodyRadiusM(retained.service.fishId) }]
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
      const preference = fishSpawnPreference(spawnOrderKey(service.id), service.fishId, habitat.bounds, clearance, horizontalSlots.get(service.id))
      const position = preference && findSafeFishSpawn(preference.position, habitat.bounds, habitat.obstacles, clearance, occupied, meshSpawnCheck, fishBodyRadiusM(service.fishId), evaluateTieredVerticalDepthRange(service.fishId, habitat.bounds, clearance)?.worldYRange)
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
      occupied.push({ position, clearance, bodyRadiusM: fishBodyRadiusM(service.fishId) })
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
    const placedLabels: Array<{ anchor: HTMLAnchorElement; id: string; label: string; bounds: { x: number; y: number; width: number; height: number }; lift: number; depth: number }> = []
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
      if (anchor.style.visibility !== 'visible') anchor.style.visibility = 'visible'
      const transformVal = `translate3d(${bounds.x}px,${bounds.y}px,0)`
      if (anchor.style.transform !== transformVal) anchor.style.transform = transformVal
      const widthVal = `${bounds.width}px`
      if (anchor.style.width !== widthVal) anchor.style.width = widthVal
      const heightVal = `${bounds.height}px`
      if (anchor.style.height !== heightVal) anchor.style.height = heightVal
      const zIndexVal = String(Math.round((item.root.position.z + 10) * 100))
      if (anchor.style.zIndex !== zIndexVal) anchor.style.zIndex = zIndexVal
      // AQ-89 AC #1: tuck the caption tight under the fish's belly — the
      // link box is centred on the fish and taller than the body, so a
      // caption at top: 100% would float with a visible gap.
      const lift = labelLiftPx(bounds.height)
      const liftVal = `${lift}px`
      if (anchor.style.getPropertyValue('--fish-label-lift') !== liftVal) {
        anchor.style.setProperty('--fish-label-lift', liftVal)
      }
      placedLabels.push({ anchor, id: item.service.id, label: item.service.name, bounds, lift, depth: item.root.position.z })
      // AQ-13: keep the hover tooltip on-screen — flip it below the caption
      // near the top edge and align it inward near the left/right edges.
      const tooltipCenterX = bounds.x + bounds.width / 2
      anchor.classList.toggle('fish-link-tooltip-below', bounds.y < 40)
      anchor.classList.toggle('fish-link-tooltip-left', tooltipCenterX < 110)
      anchor.classList.toggle('fish-link-tooltip-right', tooltipCenterX > width - 110)
    }
    // Visual-check fix: the de-conflict pass also runs for a lone label —
    // the old `length > 1` guard meant a single visible fish (common in a
    // zoomed mobile view) never got its caption clamped into the frame,
    // so WatchMyBirds clipped at the right edge. The resolved horizontal
    // shift reaches the DOM as --fish-label-dx (the align classes alone
    // anchor the caption to the link box, which can itself sit partly
    // past the frame edge).
    if (placedLabels.length >= 1) {
      const resolved = resolveLabelDeconflicts(
        placedLabels.map(entry => ({
          id: entry.id,
          caption: estimateCaptionRect(entry.bounds, entry.lift, entry.label),
          body: entry.bounds,
          depth: entry.depth,
          label: entry.label,
        })),
        { width, height },
      )
      for (const result of resolved) {
        const entry = placedLabels.find(candidate => candidate.id === result.id)
        if (!entry) continue
        const dyVal = `${result.dy}px`
        if (entry.anchor.style.getPropertyValue('--fish-label-dy') !== dyVal) {
          entry.anchor.style.setProperty('--fish-label-dy', dyVal)
        }
        const dxVal = `${result.dx}px`
        if (entry.anchor.style.getPropertyValue('--fish-label-dx') !== dxVal) {
          entry.anchor.style.setProperty('--fish-label-dx', dxVal)
        }
        entry.anchor.classList.toggle('fish-label-deconflicted', result.faded)
        entry.anchor.classList.toggle('fish-label-align-left', result.align === 'left')
        entry.anchor.classList.toggle('fish-label-align-right', result.align === 'right')
      }
    }
  }
  function render(steps: number, forceLabels = false) {
    if (disposed || failed) return
    const habitatStopped = paused || document.hidden
    const reducedMotion = Boolean(reducedMotionQuery?.matches)
    if (lookDevConfig) applyLookDevPresentation()
    // Camera zoom (AQ-62 AC #1/#5): damp toward the desired state while the
    // scene is running; snap instantly on reduced motion or while paused /
    // hidden, so zoom still responds with no animation loop. A single
    // render(0, true) while running leaves the current state alone — the
    // next tick damps it — so button/wheel zooms stay smooth.
    if (focusedServiceId) {
      const focusedItem = fish.find(item => item.service.id === focusedServiceId)
      if (focusedItem) {
        cameraZoomDesired = zoomStateForFishPosition(focusedItem.motion.position, cameraZoomDesired.distance)
      } else {
        focusedServiceId = undefined
      }
    }
    if (reducedMotion || habitatStopped) cameraZoomCurrent = { ...cameraZoomDesired }
    else if (steps > 0) cameraZoomCurrent = dampCameraZoomState(cameraZoomCurrent, cameraZoomDesired, steps * SIMULATION_STEP_SECONDS)
    applyCameraZoom()
    if (!habitatStopped && !reducedMotion && steps > 0) {
      coralElapsedSec = (coralElapsedSec + steps * SIMULATION_STEP_SECONDS) % 3600
    }
    const sceneTime = lookDevConfig ? lookDevTimeSeconds : coralElapsedSec
    const environmentStopped = lookDevConfig ? false : habitatStopped
    const environmentReducedMotion = lookDevConfig ? false : reducedMotion
    const effectiveEnvTime = lookDevConfig ? sceneTime : habitatStopped || reducedMotion ? 0 : sceneTime
    // AQ-73: the aragonite bed owns its sand time; its caustic network
    // freezes at its last phase on pause / reduced-motion / hidden.
    sandBed.update(sceneTime, environmentStopped, environmentReducedMotion)
    // AQ-86: the shaft sway freezes at its t=0 phase with everything else.
    shaftUniforms.uShaftTime.value = effectiveEnvTime
    // AQ-96: the water surface time freezes at 0 with everything else.
    waterSurfaceController.updateTime(effectiveEnvTime)
    // Shaft tier (AQ-98 / AQ-76): High runs the raymarched pass and
    // hides the plane; Balanced shows the upgraded plane; Low shows it
    // at half alpha. The tier is the adaptive controller's, with the
    // same step-down/step-up thresholds as everything else.
    const shaftMode = shaftModeForTier(qualityTier)
    shaftPlane.visible = shaftMode !== 'raymarch'
    shaftUniforms.uShaftAlpha.value =
      shaftMode === 'reduced' ? optics.lightShaftMaxAlpha * 0.5 : optics.lightShaftMaxAlpha
    causticLightController.update(sceneTime, environmentStopped, environmentReducedMotion)
    // The caustic texture time freezes at 0 on pause / reduced-motion,
    // exactly like the scalar shimmer above.
    caustics.update(sceneTime, environmentStopped, environmentReducedMotion)

    // Update depth-graded water-column motes (AQ-43 AC #2 as amended):
    // foreground motes stay in the fish volume, background motes behind it.
    // Position attributes are only flagged when the tank is actually
    // moving — when paused or reduced-motion the helpers return the frozen
    // base positions, so there is nothing new to upload.
    const motesMoving = !habitatStopped && !reducedMotion
    const uploadParticles = motesMoving || particleBuffersDirty
    if (uploadParticles) {
      for (let i = 0; i < foregroundParticleCount; i++) {
        const pt = evaluateSuspendedParticlePosition(i, habitat.bounds, sceneTime, {
          paused: environmentStopped,
          reducedMotion: environmentReducedMotion,
          zBand: { min: -1.5, max: 2.8 },
        })
        foregroundParticlePositions[i * 3] = pt.x
        foregroundParticlePositions[i * 3 + 1] = pt.y
        foregroundParticlePositions[i * 3 + 2] = pt.z
      }
      foregroundParticlePositionAttr.needsUpdate = true
      for (let i = 0; i < backgroundParticleCount; i++) {
        const pt = evaluateSuspendedParticlePosition(foregroundParticleCount + i, habitat.bounds, sceneTime, {
          paused: environmentStopped,
          reducedMotion: environmentReducedMotion,
          zBand: { min: -4.6, max: -1.5 },
        })
        backgroundParticlePositions[i * 3] = pt.x
        backgroundParticlePositions[i * 3 + 1] = pt.y
        backgroundParticlePositions[i * 3 + 2] = pt.z
      }
      backgroundParticlePositionAttr.needsUpdate = true

      // Update sparse bubble streams (AQ-43 AC #2 as amended): slots 0..15
      // belong to the first emitter, the rest to the second; the draw range
      // set in rebuildHabitat() hides slots with no emitter (narrow view).
      for (let i = 0; i < DEFAULT_AQUARIUM_OPTICS_CONFIG.maxBubbles; i++) {
        const streamIndex = i < bubblesPerStream ? 0 : 1
        const emitter = bubbleEmitters[streamIndex] ?? bubbleEmitters[0] ?? { x: 0, y: DEFAULT_AQUARIUM_OPTICS_CONFIG.bubbleEmitterBaseY, z: 0 }
        const bubble = evaluateBubblePosition(i, emitter, habitat.bounds, sceneTime, {
          paused: environmentStopped,
          reducedMotion: environmentReducedMotion,
        })
        bubblePositions[i * 3] = bubble.x
        bubblePositions[i * 3 + 1] = bubble.y
        bubblePositions[i * 3 + 2] = bubble.z
      }
      bubblePositionAttr.needsUpdate = true
      particleBuffersDirty = false
    }

    for (const controller of reefControllers) {
      controller.update(sceneTime, environmentStopped, environmentReducedMotion)
    }
    for (let step = 0; step < steps; step++) {
      // School steering needs one pre-move peer snapshot per frame (AQ-41),
      // so the whole school — service fish and visual-only schoolmates — is
      // stepped together instead of one fish at a time.
      const swimmers = [...fish, ...schoolmates]
      const stoppedFlags = swimmers.map(item => {
        const focused = document.activeElement === item.anchor
        if (!focused) item.releasedFocus = false
        return paused || document.hidden || (!lookDevConfig && reducedMotion) || (focused && !item.releasedFocus)
      })
      stepSwimmingSchool(swimmers.map(item => item.motion), habitat, SIMULATION_STEP_SECONDS, stoppedFlags, { reducedMotion })
      swimmers.forEach((item, index) => {
        const stopped = stoppedFlags[index]
        let animationState = animationDeltas.get(item.motion)
        if (!animationState) {
          animationState = createLodAnimationDeltaState(item.lod)
          animationDeltas.set(item.motion, animationState)
        }
        const animationDt = consumeLodAnimationDelta(animationState, SIMULATION_STEP_SECONDS, item.lod, stopped)
        if (!stopped) {
        // Distant fish sample less often, but consume all active elapsed
        // time so their fins and body flex keep the same swimming speed.
        const animateThisStep = animationDt > 0
        if (animateThisStep) {
          try {
            item.clipPlayer?.advance(animationDt * (.55 + Math.min(1.7, item.motion.speed * 2.2)) * item.motion.animationPlaybackRate)
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
            }, animationDt, reducedMotion)
          }
        }
        if (animateThisStep && item.turningRig) applyFishTurningRigOverlay(item.turningRig, item.motion.turnKinematics, stopped)
        }
      })
    }
    for (const item of [...fish, ...schoolmates]) {
      const pose = item.motion; item.root.position.set(pose.position.x, pose.position.y, pose.position.z)
      if (item.fallback) { item.root.rotation.set(0, 0, 0); item.root.scale.x = evaluateSpriteTurnScaleX(pose.yaw) }
      else { item.root.rotation.set(pose.pitch, pose.yaw, pose.bank, 'YXZ') }
      item.root.updateMatrix()
      item.root.updateMatrixWorld()
    }
    labelClock += steps * SIMULATION_STEP_SECONDS
    const refreshLabels = forceLabels || labelClock > .24
    if (refreshLabels) {
      evaluateFishLod()
      pumpLazyLoads()
    }
    positionLabels(refreshLabels)
    // Apply capture-only suppression after normal occlusion/focus exposure,
    // which writes the same visibility property during label placement.
    if (lookDevConfig && !lookDevConfig.labelsVisible) {
      for (const item of fish) {
        const label = item.anchor?.querySelector('.fish-name') as HTMLElement | null
        if (label) label.style.visibility = 'hidden'
      }
    }
    if (labelClock > .24) labelClock = 0
    // Raymarched shafts (AQ-98, High tier only): the depth-only pre-pass
    // runs before the main render, the additive half-res quad after it.
    // Construction is lazy and failure is a fallback, never a scene
    // failure: if the pass cannot be built or a render throws, it is
    // disposed and the upgraded shaft plane takes over.
    const renderStartedAt = lookDevConfig ? performance.now() : 0
    const previousInfoAutoReset = renderer.info.autoReset
    if (lookDevConfig) { renderer.info.reset(); renderer.info.autoReset = false }
    // Reflections are a full-tank depth cue. Keep zoom/inspection clear and
    // avoid reflected scene renders on every frame of a tracking camera.
    const reflectOverview = lookDevConfig
      ? lookDevPreset === 'full-scene'
      : isOverviewZoomState(cameraZoomCurrent) && isOverviewZoomState(cameraZoomDesired)
    glassEnclosure.update(effectiveEnvTime, reflectOverview ? qualityTier : 'low', loadedAssets.size * 1000 + meshNavigationGeneration)
    try {
    if (shaftMode === 'raymarch' && !shaftPassFailed) {
      if (!shaftPass) {
        try {
          shaftPass = new RaymarchedShaftPass(renderer, {
            nonOccluders: [waterSurface, shaftPlane, hazePlane, foregroundParticles, backgroundParticles, bubbles, glassEnclosure.group],
          })
          const bufferSize = renderer.getDrawingBufferSize(new THREE.Vector2())
          shaftPass.setSize(bufferSize.x, bufferSize.y)
        } catch (error) {
          console.warn('Raymarched shafts unavailable; falling back to the shaft plane', error)
          shaftPassFailed = true
          shaftPass = null
        }
      }
      if (shaftPass) {
        shaftPass.update(sceneTime, camera, environmentStopped, environmentReducedMotion)
        try {
          shaftPass.renderDepth(scene, camera)
        } catch (error) {
          console.warn('Raymarched shaft depth pass failed; falling back to the shaft plane', error)
          shaftPassFailed = true
          shaftPass.dispose()
          shaftPass = null
          shaftPlane.visible = true
        }
      }
    }
    renderer.render(scene, camera)
    if (shaftMode === 'raymarch' && shaftPass) {
      try {
        shaftPass.renderShafts()
      } catch (error) {
        console.warn('Raymarched shaft pass failed; falling back to the shaft plane', error)
        shaftPassFailed = true
        shaftPass.dispose()
        shaftPass = null
        shaftPlane.visible = true
      }
    }
    } finally {
      if (lookDevConfig) renderer.info.autoReset = previousInfoAutoReset
    }
    if (lookDevConfig) {
      const elapsedMs = Math.max(0, performance.now() - renderStartedAt)
      recordLookDevSample(lookDevCpuRenderSamples, elapsedMs)
      if (lookDevCaptureRequested) recordLookDevSample(lookDevFrozenRenderSamples, elapsedMs)
    }
  }
  // Distance LOD (AQ-76 AC #1), evaluated at the ~0.24 s label cadence
  // using the already-computed projection depth — no extra raycast. Depth
  // is camera z (9) minus fish z, so it spans the real 6.2-13.6 range.
  // The tier only sets the animation rate now (LOD1 = half clip rate);
  // there is no sprite swap any more, so a distant fish keeps its GLB.
  function evaluateFishLod() {
    const lodBias = QUALITY_TIERS[qualityTier].lodBias
    for (const item of fish) {
      if (item.fallback || !item.lodModel) continue
      const depth = camera.position.z - item.root.position.z
      const projected = projectedFishLengthPx(fishRenderLength(item.service.fishId), height, camera.fov, depth)
      const next = selectFishLod(depth, projected, item.lod, lodBias)
      if (next !== item.lod) item.lod = next
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
    if (lookDevConfig) {
      if (lookDevLastRafTime !== undefined && now >= lookDevLastRafTime) recordLookDevSample(lookDevRafSamples, now - lookDevLastRafTime)
      lookDevLastRafTime = now
      lastTickTimestamp = now
      if (!document.hidden && loaded && !lookDevContextLost) render(0, true)
      return
    }
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
    if (lookDevConfig) {
      renderer.setAnimationLoop(document.hidden || lookDevContextLost ? null : tick)
      return
    }
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
    if (lookDevConfig && sizeChanged) { lookDevReady = false; lookDevNeedsStaging = true; lookDevResetTiming() }
    if (sizeChanged) particleBuffersDirty = true
    width = nextWidth; height = nextHeight
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
    if (shaftPass) {
      const bufferSize = renderer.getDrawingBufferSize(new THREE.Vector2())
      shaftPass.setSize(bufferSize.x, bufferSize.y)
    }
    // The nearest fish depth controls the safe horizontal envelope, so depth
    // changes cannot send an otherwise in-bounds fish beyond the view edge.
    // AQ-62: the envelope is measured from the overview camera distance,
    // not the live camera — zooming in must not shrink the fish roaming
    // volume or trigger a habitat rebuild.
    const halfWidth = Math.min(5.0, (DEFAULT_CAMERA_DISTANCE_M - 2.8) * Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect * .96)
    habitat.bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
    const newNarrow = width < 600
    if (glassLayoutNarrow !== newNarrow) {
      glassEnclosure.setLayout(newNarrow)
      waterSurfaceController.setLayout(glassEnclosureLayout(newNarrow, optics.surfaceY))
      glassLayoutNarrow = newNarrow
    }
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
    if (lookDevConfig) applyLookDevCamera()
    if (!spawnUnavailable) render(0, true)
    if (lookDevConfig) settleLookDevReadiness()
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement!); resize()
  document.addEventListener('visibilitychange', () => {
    syncLoop()
    if (!document.hidden) settleLookDevReadiness()
  }, { signal: abort.signal })
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
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    if (lookDevConfig) {
      lookDevContextLost = true
      lookDevReady = false
      lookDevResetTiming()
      syncLoop()
      return
    }
    failed = true; renderer.setAnimationLoop(null); status('failed')
  }, { signal: abort.signal })
  canvas.addEventListener('webglcontextrestored', () => {
    if (!lookDevConfig || disposed) return
    glassEnclosure.invalidate()
    lookDevContextLost = false
    lookDevReady = false
    lookDevResetTiming()
    applyLookDevCamera()
    syncLoop()
    settleLookDevReadiness()
  }, { signal: abort.signal })
  let lookDevBridge: LookDevBridge | undefined
  if (import.meta.env.DEV && lookDevConfig) {
    lookDevBridge = Object.freeze({
      ready: waitForLookDevReady,
      state: lookDevSnapshot,
      renderFrozen() {
        if (!lookDevSnapshot().ready) throw new Error('Look-dev capture is not ready; wait for bridge.ready() first.')
        lookDevCaptureRequested = true
        try { render(0, true) }
        finally { lookDevCaptureRequested = false }
        return lookDevSnapshot()
      },
      setPreset(preset: LookDevPreset) {
        if (!(LOOKDEV_PRESETS as readonly string[]).includes(preset)) return lookDevSnapshot()
        lookDevPreset = preset
        lookDevReady = false
        lookDevResetTiming()
        applyLookDevCamera()
        settleLookDevReadiness()
        return lookDevSnapshot()
      },
      setSubject(subjectId?: string) {
        if (subjectId !== undefined && !fish.some(item => item.service.id === subjectId)) return false
        if (lookDevSubjectId === subjectId) return true
        lookDevSubjectId = subjectId
        lookDevReady = false
        lookDevResetTiming()
        applyLookDevCamera()
        settleLookDevReadiness()
        return true
      },
      setTime(timeSeconds: number) {
        if (!Number.isFinite(timeSeconds) || timeSeconds < 0 || timeSeconds > 3600) return false
        lookDevTimeSeconds = timeSeconds
        for (const item of [...fish, ...schoolmates]) {
          item.clipPlayer?.seek(timeSeconds)
          item.flex?.seek(timeSeconds)
        }
        lookDevReady = false
        lookDevResetTiming()
        settleLookDevReadiness()
        return true
      },
    })
    window.__AQUARIUM_LOOKDEV__ = lookDevBridge
  }
  // Per-asset fish load with failure isolation (AQ-76 AC #2): a single GLB
  // failure logs a warning and leaves that species on its thumbnail sprite
  // instead of failing the whole scene, as the old single Promise.all did.
  // A load that finishes after disposal disposes its GLB instead of adding it.
  async function loadFishModel(id: string) {
    const lookDevKey = `fish:${id}`
    beginLookDevAsset(lookDevKey)
    try {
      const model = await loader.loadAsync(modelUrls[id])
      if (disposed || failed) { disposeTree(model.scene); finishLookDevAsset(lookDevKey); return undefined }
      loadedAssets.add(model)
      finishLookDevAsset(lookDevKey)
      return model
    } catch (error) {
      finishLookDevAsset(lookDevKey, true)
      console.warn('Fish model failed to load; keeping thumbnail fallback', id, error)
      return undefined
    }
  }
  // Background lazy-load queue (AQ-76 AC #2): at most 2 GLBs in flight,
  // driven by requestIdleCallback with a setTimeout fallback. Species with
  // no configured service are never queued. A species
  // whose inhabitant is currently off-screen (no valid link projection)
  // stays queued until it re-enters; the queue is re-pumped on the ~0.24 s
  // label cadence.
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
      const inhabitants = [...fish, ...schoolmates]
      // Keep off-screen species queued, while allowing later visible
      // species to load. Any member of a species can make it visible.
      const queueIndex = lazyQueue.findIndex(id => {
        const matches = inhabitants.filter(item => item.service.fishId === id)
        return modelBases.has(id) || matches.length === 0 || Boolean(lookDevConfig)
          || matches.some(item => {
            const bounds = projectFishLinkBounds(item.root.position, camera, width, height, fishRenderLength(id), projected)
            return bounds && bounds.x < width && bounds.y < height
              && bounds.x + bounds.width > 0 && bounds.y + bounds.height > 0
          })
      })
      if (queueIndex < 0) break
      const [id] = lazyQueue.splice(queueIndex, 1)
      const targets = inhabitants.filter(item => item.service.fishId === id && item.fallback)
      if (modelBases.has(id)) { targets.forEach(swapFallbackToGlb); continue }
      if (targets.length === 0) continue
      lazyActiveLoads++
      void loadFishModel(id).then(model => {
        lazyActiveLoads--
        if (disposed || failed) { if (model) disposeTree(model.scene); return }
        if (model) {
          modelBases.set(id, model)
          for (const target of [...fish, ...schoolmates]) {
            if (target.service.fishId === id && target.fallback) swapFallbackToGlb(target)
          }
          if (!document.hidden) render(0, true)
        }
        settleLookDevReadiness()
        scheduleLazyPump()
      })
    }
  }
  async function initialize() {
    const load = async (url: string) => {
      const lookDevKey = `scene:${url}`
      beginLookDevAsset(lookDevKey)
      try {
        const model = await loader.loadAsync(url)
        if (disposed || failed) disposeTree(model.scene)
        else loadedAssets.add(model)
        finishLookDevAsset(lookDevKey)
        return model
      } catch (error) {
        finishLookDevAsset(lookDevKey, true)
        throw error
      }
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
    settleLookDevReadiness()
  }
  void initialize().catch(error => {
    console.error('Aquarium assets could not load', error)
    failed = true
    failLookDevCapture(`Aquarium asset initialization failed: ${String(error)}`)
    loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear()
    if (!disposed) { renderer.setAnimationLoop(null); status('failed') }
  })
  syncLoop()
  return {
    update(next, stopped, configurationReady = true) {
      if (lookDevConfig && configurationReady !== lookDevConfigurationReady) {
        lookDevConfigurationReady = configurationReady
        lookDevReady = false
        lookDevNeedsStaging = true
        lookDevResetTiming()
      }
      const changed = JSON.stringify(next) !== JSON.stringify(services); services = next; paused = stopped
      if (changed) {
        if (lookDevConfig) {
          lookDevReady = false
          lookDevNeedsStaging = true
          lookDevResetTiming()
          if (lookDevSubjectId && !next.some(service => service.id === lookDevSubjectId)) lookDevSubjectId = undefined
          const activeSpecies = new Set(next.map(service => service.fishId))
          for (const key of [...lookDevCurrentAssets]) if (key.startsWith('fish:') && !activeSpecies.has(key.slice('fish:'.length))) {
            lookDevCurrentAssets.delete(key); lookDevPendingAssets.delete(key); lookDevFailedAssets.delete(key)
          }
        }
        const rebuilt = reconcileFish()
        if (rebuilt !== undefined) status(fishSceneStatus(!rebuilt))
        // A newly configured species starts on its thumbnail sprite and its
        // GLB joins the background queue; removing a service never evicts a
        // loaded GLB in v1 (16 species max, ~20 MB total).
        enqueueLazyFishLoads(next.map(service => service.fishId))
        if (lookDevConfig) { applyLookDevCamera(); settleLookDevReadiness() }
      }
      syncLoop()
      if (lookDevConfig) settleLookDevReadiness()
    },
    activate(id) { const item = fish.find(item => item.service.id === id); if (!item || failed || paused || document.hidden) return; item.releasedFocus = true; startleFish(item.motion, habitat) },
    // Camera zoom (AQ-62 AC #1/#3): each returns whether the camera is
    // zoomed after the action, so the UI can enable the Reset control.
    zoomIn() { return setCameraZoomDesired({ ...cameraZoomDesired, distance: stepZoomDistance(cameraZoomDesired.distance, 'in') }) },
    zoomOut() { return setCameraZoomDesired({ ...cameraZoomDesired, distance: stepZoomDistance(cameraZoomDesired.distance, 'out') }) },
    zoomToFocalArea(id) {
      focusedServiceId = undefined
      const next = zoomStateForFocalArea(id)
      if (!next) return !isOverviewZoomState(cameraZoomDesired)
      return setCameraZoomDesired(next)
    },
    focusServiceFish(id) {
      const item = fish.find(candidate => candidate.service.id === id)
      if (!item) return !isOverviewZoomState(cameraZoomDesired)
      focusedServiceId = id
      return setCameraZoomDesired(zoomStateForFishPosition(item.motion.position))
    },
    getFocusedServiceId() { return focusedServiceId },
    resetZoom() { focusedServiceId = undefined; return setCameraZoomDesired({ ...DEFAULT_CAMERA_ZOOM_STATE }) },
    isZoomed() { return !isOverviewZoomState(cameraZoomDesired) },
    getCameraZoom() { return { ...cameraZoomCurrent } },
    serviceAt: nearest,
    canActivate(id, x, y) { const item = fish.find(item => item.service.id === id); return Boolean(item && (x === undefined || y === undefined ? updateVisibility(item) : nearest(x, y) === id)) },
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); observer.disconnect(); renderer.setAnimationLoop(null); lazyQueue = []
      rejectLookDevWaiters(new Error('Aquarium was disposed before look-dev capture readiness.'))
      glassEnclosure.dispose()
      if (import.meta.env.DEV && lookDevBridge && window.__AQUARIUM_LOOKDEV__ === lookDevBridge) delete window.__AQUARIUM_LOOKDEV__
      removeFish(); loadedAssets.forEach(model => disposeTree(model.scene)); loadedAssets.clear(); sandBed.dispose(); rear.geometry.dispose(); rear.material.dispose(); hazePlane.geometry.dispose(); hazeMaterial.dispose(); shaftPlane.geometry.dispose(); shaftMaterial.dispose(); waterSurfaceController.dispose(); shaftPass?.dispose(); shaftPass = null; foregroundParticleGeometry.dispose(); foregroundParticleMaterial.dispose(); backgroundParticleGeometry.dispose(); backgroundParticleMaterial.dispose(); bubbleGeometry.dispose(); bubbleMaterial.dispose(); caustics.dispose(); environmentMap?.dispose(); renderer.dispose(); renderer.forceContextLoss()
    },
  }
}

