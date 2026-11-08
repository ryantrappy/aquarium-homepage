import * as THREE from 'three'

/**
 * Runtime-generated PMREM environment map (image-based lighting) for the
 * aquarium scene (AQ-71, tracker #3).
 *
 * The environment is built procedurally from the tank's own palette — no
 * external or paid HDR/EXR asset is fetched. It is generated once at scene
 * init via `PMREMGenerator.fromScene()`; there is no per-frame cost and no
 * regeneration on resize. `scene.background` is never set to this texture:
 * the painted rear backdrop plane and the `#183654` background stay.
 *
 * Light re-tune that goes with this map: hemi 0.62 -> 0.40 (in
 * `aquarium.ts`), key 2.45 -> 2.1 and fill 1.12 -> 0.95 in
 * `DEFAULT_AQUARIUM_OPTICS_CONFIG` (`underwater-optics.ts`). Since PR #7
 * the optics config is the single source of truth for light intensities, so
 * the key/fill constructors and the caustic-light-controller config — which
 * re-asserts its base values every frame — all pick the new values up from
 * there. Rim 0.45 unchanged, exposure left at 1.02 pending a visual check —
 * see the PR description.
 */

// Gradient stops of the rear backdrop shader, as linear RGB triples.
// They are the same stops as `aquarium.ts`'s rear backdrop
// (deep indigo bottom -> cobalt mid -> aquamarine-violet top).
export const AQUARIUM_ENVIRONMENT_GRADIENT_STOPS = [
  { position: 0, color: [0.06, 0.11, 0.24] as const },
  { position: 0.58, color: [0.12, 0.26, 0.44] as const },
  { position: 1, color: [0.26, 0.48, 0.66] as const },
] as const

export const AQUARIUM_ENVIRONMENT_PANEL_COLORS = {
  key: '#f6faff',
  fill: '#5a98ff',
  rim: '#b4dcff',
  sandBounce: '#d8cbb0',
} as const

// Per-material envMapIntensity. Every MeshStandardMaterial in the scene gets
// an explicit value — none is left at the three.js default of 1.0 by accident.
// Fish 0.55 is a starting point: the 13/15 extruded-silhouette GLBs can look
// plasticky/grey under full IBL, so visual review decides the final value;
// the fallback is lowering the fish intensity, not removing the env map.
export const ENVIRONMENT_MAP_INTENSITY = {
  fish: 0.55,
  reef: 0.35,
  sand: 0.2,
  waterSurface: 0.9,
  backdrop: 0,
} as const

function gradientColorAt(t: number, out: THREE.Color): THREE.Color {
  const clamped = THREE.MathUtils.clamp(t, 0, 1)
  const bottom = AQUARIUM_ENVIRONMENT_GRADIENT_STOPS[0].color
  const mid = AQUARIUM_ENVIRONMENT_GRADIENT_STOPS[1].color
  const top = AQUARIUM_ENVIRONMENT_GRADIENT_STOPS[2].color
  // Mirror the backdrop shader's smoothstep blends.
  const lower = THREE.MathUtils.smoothstep(clamped, 0, 0.58)
  const upper = THREE.MathUtils.smoothstep(clamped, 0.52, 1)
  out.setRGB(
    THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(bottom[0], mid[0], lower),
      top[0],
      upper,
    ),
    THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(bottom[1], mid[1], lower),
      top[1],
      upper,
    ),
    THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(bottom[2], mid[2], lower),
      top[2],
      upper,
    ),
  )
  return out
}

/**
 * Builds the small procedural scene the PMREM generator renders into a
 * cubemap. Pure scene-graph construction — no renderer, no canvas, no
 * network — so it is unit-testable without a WebGL context.
 *
 * Contents: a BackSide gradient sphere (the tank water column), 2–3 bright
 * emissive planes overhead as LED-panel proxies, and a dim warm-ivory disc
 * below as sand bounce. Panel colours are multiplied above 1 so they read
 * as light sources in the PMREM blur rather than as flat colour.
 */
export function buildAquariumEnvironmentScene(): THREE.Scene {
  const envScene = new THREE.Scene()
  const color = new THREE.Color()

  const sphereGeometry = new THREE.SphereGeometry(10, 32, 16)
  const positions = sphereGeometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  for (let i = 0; i < positions.count; i++) {
    gradientColorAt((positions.getY(i) / 10 + 1) / 2, color)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  sphereGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const gradientSphere = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }),
  )
  gradientSphere.name = 'aquarium-environment-gradient'
  envScene.add(gradientSphere)

  const addPanel = (
    name: string,
    hex: string,
    brightness: number,
    width: number,
    height: number,
    position: [number, number, number],
    rotationX: number,
  ) => {
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    material.color.set(hex).multiplyScalar(brightness)
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
    panel.name = name
    panel.position.set(position[0], position[1], position[2])
    panel.rotation.x = rotationX
    envScene.add(panel)
    return panel
  }

  // Overhead LED-panel proxies, facing down into the tank.
  addPanel('aquarium-environment-key-panel', AQUARIUM_ENVIRONMENT_PANEL_COLORS.key, 8, 6, 3, [0.5, 7, 1], Math.PI / 2)
  addPanel('aquarium-environment-fill-panel', AQUARIUM_ENVIRONMENT_PANEL_COLORS.fill, 5, 3.5, 2, [-3, 6, 2], Math.PI / 2)
  addPanel('aquarium-environment-rim-panel', AQUARIUM_ENVIRONMENT_PANEL_COLORS.rim, 3, 5, 1.2, [0, 5, -4], Math.PI / 2)

  // Dim warm-ivory disc below as sand bounce.
  const sandMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  sandMaterial.color.set(AQUARIUM_ENVIRONMENT_PANEL_COLORS.sandBounce).multiplyScalar(0.35)
  const sandDisc = new THREE.Mesh(new THREE.CircleGeometry(8, 32), sandMaterial)
  sandDisc.name = 'aquarium-environment-sand-bounce'
  sandDisc.position.set(0, -5, 0)
  sandDisc.rotation.x = -Math.PI / 2
  envScene.add(sandDisc)

  return envScene
}

function disposeEnvironmentScene(scene: THREE.Scene): void {
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => material.dispose())
  })
}

export type AquariumEnvironmentMap = {
  texture: THREE.Texture
  dispose: () => void
}

/**
 * Generates the aquarium's PMREM environment map once and returns the
 * texture plus a dispose function for the render target. The generator is
 * disposed immediately; the render target lives until the scene is disposed
 * (see `dispose()` in `aquarium.ts`). Call once at init — never per frame
 * and never on resize.
 *
 * Returns `null` (with a warning) if PMREM generation fails — e.g. a
 * headless/test renderer without a real GL context — so the scene still
 * loads with its direct lights instead of failing outright. IBL is an
 * enhancement; its absence must never fail the aquarium.
 */
export function createAquariumEnvironmentMap(renderer: THREE.WebGLRenderer): AquariumEnvironmentMap | null {
  try {
    const pmrem = new THREE.PMREMGenerator(renderer)
    try {
      const envScene = buildAquariumEnvironmentScene()
      try {
        const renderTarget = pmrem.fromScene(envScene, 0.04)
        return {
          texture: renderTarget.texture,
          dispose: () => renderTarget.dispose(),
        }
      } finally {
        disposeEnvironmentScene(envScene)
      }
    } finally {
      pmrem.dispose()
    }
  } catch (error) {
    console.warn('Aquarium environment map unavailable; continuing without IBL', error)
    return null
  }
}

/**
 * Sets an explicit `envMapIntensity` on every MeshStandardMaterial (which
 * includes MeshPhysicalMaterial) under `root`. MeshBasicMaterial sprites and
 * PointsMaterials are untouched — they do not take part in IBL.
 */
export function applyEnvironmentMapIntensity(root: THREE.Object3D, intensity: number): void {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = intensity
    }
  })
}
