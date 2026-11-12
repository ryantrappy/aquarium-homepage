import * as THREE from 'three'
import { SURFACE_WAVE_GLSL } from './surface-waves'
import { DEFAULT_AQUARIUM_OPTICS_CONFIG } from './underwater-optics'

/**
 * Screen-space raymarched light shafts (AQ-98 / AQ-86, High tier only).
 *
 * Architecture (PolyFish's proven overlay design, adapted to this tank):
 * (a) a depth-only pre-pass captures the scene depth buffer (colour
 * discarded — the pre-pass render target's colour is never read);
 * (b) the scene renders normally, straight to canvas — scene colours
 * never pass through an intermediate buffer, so there is no
 * sRGB/HalfFloat round-trip darkening the whole picture;
 * (c) a fullscreen quad renders ONLY the god-ray light contribution
 * with AdditiveBlending, at half resolution, upscaled by bilinear
 * filtering. Shafts are low-frequency light; half-res is visually
 * lossless and roughly quarters the cost.
 *
 * Occlusion is free: the march runs along each view ray from the
 * camera until the depth buffer says geometry was hit, so shafts stop
 * at rock and fish instead of passing through them (the flat plane's
 * single most fake behaviour).
 *
 * Beam pattern: inverted Voronoi F1 (cell CENTRES bright = thick soft
 * columns), NOT F2-F1 (cell edges bright = the lacy caustic web — that
 * mistake makes shafts read as caustic intersections). Two octaves of
 * domain warping break the grid regularity; cell centres are static in
 * time (beam roots stay anchored at the surface) while the warp drifts
 * slowly. Surface coupling: the pattern is sampled in a coordinate
 * space tilted along the sun direction and offset by the shared wave
 * field — each sample's intensity is modulated by the focus term at
 * the ray's surface intersection, so surface motion drives the light
 * filtering. Banding is broken by per-pixel interleaved-gradient-noise
 * dithering on the ray start, a view-angle fade, and an exponential
 * soft-clamp so overlapping beams blend instead of spiking.
 *
 * Tier gating lives in runtime-quality.ts (`shaftModeForTier`): High =
 * this pass, Balanced = the upgraded shaft plane, Low = plane at half
 * alpha. This pass costs ~0 on Balanced/Low — it is never constructed
 * there. If the raymarch misses the frame budget on real hardware, cut
 * steps/resolution or demote it to High-only — never move the budget.
 * Real-hardware frame times cannot be measured under SwiftShader
 * (software rasterization); that measurement is still owed.
 */

/** Beam cell size in surface-footpoint metres (one Voronoi cell). */
export const SHAFT_BEAM_CELL_M = 1.4
/** Domain-warp strength in beam-pattern UV units. */
export const SHAFT_WARP_STRENGTH = 0.35
/** Exponential depth fade per metre below the surface. */
export const SHAFT_DEPTH_FADE_PER_M = 0.55

function fract(x: number): number {
  return x - Math.floor(x)
}

function hash21(x: number, y: number): number {
  const px = fract(x * 123.34)
  const py = fract(y * 456.21)
  const d = px * (px + 45.32) + py * (py + 45.32)
  return fract(px * py + d)
}

function hash22(ix: number, iy: number): { x: number; y: number } {
  return { x: hash21(ix, iy), y: hash21(ix + 57.31, iy + 19.17) }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = smoothstep(0, 1, fx)
  const sy = smoothstep(0, 1, fy)
  const a = hash21(ix, iy)
  const b = hash21(ix + 1, iy)
  const c = hash21(ix, iy + 1)
  const d = hash21(ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

/** Distance to the nearest Voronoi feature point (F1) in cell units. */
export function evaluateVoronoiF1(u: number, v: number): number {
  const cx = Math.floor(u)
  const cy = Math.floor(v)
  let f1 = Infinity
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = cx + dx
      const ny = cy + dy
      const fp = hash22(nx, ny)
      const px = nx + fp.x
      const py = ny + fp.y
      f1 = Math.min(f1, Math.hypot(u - px, v - py))
    }
  }
  return f1
}

/**
 * Beam-pattern intensity in [0, 1] at beam-plane coords (u, v) in
 * metres and time `t` (seconds, frozen at 0 on pause/reduced-motion).
 * Inverted-Voronoi-F1 columns with two octaves of domain warp; the
 * warp drifts slowly with time while the cell centres stay anchored.
 * Pure TS mirror of `shaftBeamPattern` in `SHAFT_BEAM_GLSL` below.
 */
export function evaluateShaftBeamPattern(
  u: number,
  v: number,
  timeSeconds: number,
  options?: { paused?: boolean; reducedMotion?: boolean },
): number {
  if (!Number.isFinite(u) || !Number.isFinite(v)) return 0
  const t = options?.paused || options?.reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds % 3600
  const cu = u / SHAFT_BEAM_CELL_M
  const cv = v / SHAFT_BEAM_CELL_M
  // Two octaves of domain warp, drifting slowly with the shared clock.
  const w1 = valueNoise(cu * 0.5 + t * 0.021, cv * 0.5 - t * 0.017)
  const w2 = valueNoise(cu * 1.1 - t * 0.013, cv * 1.1 + t * 0.019)
  const warpU = (w1 - 0.5) * 2 * SHAFT_WARP_STRENGTH + (w2 - 0.5) * SHAFT_WARP_STRENGTH
  const warpV = (valueNoise(cu * 0.5 - t * 0.015, cv * 0.5 + t * 0.023) - 0.5) * 2 * SHAFT_WARP_STRENGTH
  const f1 = evaluateVoronoiF1(cu + warpU, cv + warpV)
  // Cell centres bright (f1 ≈ 0), fading out by f1 ≈ 0.6 cell units.
  return 1 - smoothstep(0.05, 0.6, f1)
}

/** GLSL mirror of the beam pattern above (same hash/noise/Voronoi). */
export const SHAFT_BEAM_GLSL = `// Raymarched shaft beam pattern (light-shafts.ts): inverted-Voronoi-F1
// columns with 2-octave domain warp. TS mirror: evaluateShaftBeamPattern.
float shaftHash21(vec2 p) {
  vec2 q = fract(p * vec2(123.34, 456.21));
  float d = q.x * (q.x + 45.32) + q.y * (q.y + 45.32);
  return fract(q.x * q.y + d);
}
vec2 shaftHash22(vec2 p) {
  return vec2(shaftHash21(p), shaftHash21(p + vec2(57.31, 19.17)));
}
float shaftValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 s = f * f * (3.0 - 2.0 * f);
  float a = shaftHash21(i);
  float b = shaftHash21(i + vec2(1.0, 0.0));
  float c = shaftHash21(i + vec2(0.0, 1.0));
  float d = shaftHash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}
float shaftVoronoiF1(vec2 p) {
  vec2 c = floor(p);
  float f1 = 8.0;
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      vec2 n = c + vec2(float(dx), float(dy));
      vec2 fp = n + shaftHash22(n);
      f1 = min(f1, distance(p, fp));
    }
  }
  return f1;
}
float shaftBeamPattern(vec2 p, float t) {
  vec2 c = p / ${SHAFT_BEAM_CELL_M.toFixed(2)};
  float w1 = shaftValueNoise(c * 0.5 + vec2(t * 0.021, -t * 0.017));
  float w2 = shaftValueNoise(c * 1.1 + vec2(-t * 0.013, t * 0.019));
  float w3 = shaftValueNoise(c * 0.5 + vec2(-t * 0.015, t * 0.023));
  vec2 warp = vec2((w1 - 0.5) * 2.0 * ${SHAFT_WARP_STRENGTH.toFixed(2)} + (w2 - 0.5) * ${SHAFT_WARP_STRENGTH.toFixed(2)}, (w3 - 0.5) * 2.0 * ${SHAFT_WARP_STRENGTH.toFixed(2)});
  float f1 = shaftVoronoiF1(c + warp);
  return 1.0 - smoothstep(0.05, 0.6, f1);
}
`

export type RaymarchedShaftPassOptions = {
  /** Objects that must NOT write depth in the pre-pass (transparent /
   * non-occluding: water surface, shaft/haze planes, particles). */
  nonOccluders?: THREE.Object3D[]
  steps?: number
  renderScale?: number
  softClamp?: number
}

/**
 * The raymarched shaft pass. Constructed lazily on the High tier only;
 * `renderDepth` runs before the main scene render, `renderShafts`
 * after it. All time uniforms freeze at 0 when paused / reduced-motion
 * / hidden, exactly like the caustic and shaft-plane channels.
 *
 * If construction or any render throws (e.g. no depth-texture support),
 * the caller must catch, dispose, and fall back to the shaft plane —
 * the pass must never fail the aquarium.
 */
export class RaymarchedShaftPass {
  private renderer: THREE.WebGLRenderer
  private nonOccluders: THREE.Object3D[]
  private steps: number
  private renderScale: number
  private softClamp: number
  private depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  private depthTarget: THREE.WebGLRenderTarget
  private shaftTarget: THREE.WebGLRenderTarget
  private quadScene = new THREE.Scene()
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private copyScene = new THREE.Scene()
  private uniforms: Record<string, THREE.IUniform>
  private copyUniforms: Record<string, THREE.IUniform>
  private width = 1
  private height = 1
  private disposed = false

  constructor(renderer: THREE.WebGLRenderer, options: RaymarchedShaftPassOptions = {}) {
    this.renderer = renderer
    const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
    this.nonOccluders = options.nonOccluders ?? []
    this.steps = options.steps ?? cfg.shaftRaymarchSteps
    this.renderScale = options.renderScale ?? cfg.shaftRenderScale
    this.softClamp = options.softClamp ?? cfg.shaftSoftClamp
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.width = Math.max(1, size.x)
    this.height = Math.max(1, size.y)
    this.depthTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(this.width, this.height, THREE.UnsignedIntType),
    })
    const sw = Math.max(1, Math.floor(this.width * this.renderScale))
    const sh = Math.max(1, Math.floor(this.height * this.renderScale))
    this.shaftTarget = new THREE.WebGLRenderTarget(sw, sh, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    })
    this.uniforms = {
      tDepth: { value: this.depthTarget.depthTexture },
      uTime: { value: 0 },
      uSteps: { value: this.steps },
      uSoftClamp: { value: this.softClamp },
      uProjInv: { value: new THREE.Matrix4() },
      uViewInv: { value: new THREE.Matrix4() },
      uCameraPos: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(cfg.sunDirection.x, cfg.sunDirection.y, cfg.sunDirection.z) },
      uSurfaceY: { value: cfg.surfaceY },
      uAlpha: { value: cfg.shaftRaymarchAlpha },
    }
    const shaftMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDepth;
        uniform float uTime;
        uniform int uSteps;
        uniform float uSoftClamp;
        uniform mat4 uProjInv;
        uniform mat4 uViewInv;
        uniform vec3 uCameraPos;
        uniform vec3 uSunDir;
        uniform float uSurfaceY;
        uniform float uAlpha;
        varying vec2 vUv;
        ${SURFACE_WAVE_GLSL}
        ${SHAFT_BEAM_GLSL}
        float shaftIgn(vec2 p) {
          return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
        }
        void main() {
          float depth = texture2D(tDepth, vUv).x;
          if (depth >= 1.0) { gl_FragColor = vec4(0.0); return; }
          vec4 ndc = vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
          vec4 viewPos = uProjInv * ndc;
          viewPos /= viewPos.w;
          vec3 worldPos = (uViewInv * viewPos).xyz;
          vec3 rayDir = normalize(worldPos - uCameraPos);
          float rayLen = length(worldPos - uCameraPos);
          // View-angle fade: beams read from the side, not when looking
          // straight up the beam axis (where step banding would show).
          float axisFade = 1.0 - smoothstep(0.75, 0.95, abs(dot(rayDir, uSunDir)));
          float stepLen = rayLen / float(uSteps);
          float jitter = shaftIgn(gl_FragCoord.xy);
          float accum = 0.0;
          for (int i = 0; i < 32; i++) {
            if (i >= uSteps) break;
            float t = (float(i) + jitter) * stepLen;
            vec3 p = uCameraPos + rayDir * t;
            // Surface footpoint the light passed through (gentle vertical sun-slant).
            float dist = (uSurfaceY - p.y) / max(uSunDir.y, 0.2);
            vec2 surf = p.xz + uSunDir.xz * dist * 0.25;
            float focus = surfaceWaveFocus(surf, uTime);
            float beam = pow(shaftBeamPattern(surf, uTime), 2.4);
            float curtainStriation = 0.55 + 0.45 * shaftValueNoise(vec2(surf.x * 3.8 + uTime * 0.05, p.y * 0.35));
            float rippleGate = smoothstep(-0.15, 0.75, focus) * curtainStriation;
            float depthFade = exp(-max(3.20 - p.y, 0.0) * 0.82) * smoothstep(-1.4, 3.15, p.y);
            accum += beam * (0.20 + 0.80 * rippleGate) * depthFade * stepLen * 0.30;
          }
          float light = (1.0 - exp(-accum * uSoftClamp)) * axisFade * uAlpha * 0.58;
          gl_FragColor = vec4(vec3(0.24, 0.60, 0.94) * light, light);
        }`,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaftMaterial)
    quad.frustumCulled = false
    this.quadScene.add(quad)
    this.copyUniforms = { tShaft: { value: this.shaftTarget.texture } }
    const copyMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.copyUniforms,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tShaft;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tShaft, vUv); }`,
    })
    const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
    copyQuad.frustumCulled = false
    this.copyScene.add(copyQuad)
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.depthTarget.setSize(this.width, this.height)
    this.shaftTarget.setSize(
      Math.max(1, Math.floor(this.width * this.renderScale)),
      Math.max(1, Math.floor(this.height * this.renderScale)),
    )
  }

  /** Frozen time (0 on pause / reduced-motion / hidden) + camera matrices. */
  update(timeSeconds: number, camera: THREE.Camera, paused = false, reducedMotion = false): void {
    this.uniforms.uTime.value =
      paused || reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds % 3600
    this.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse)
    this.uniforms.uViewInv.value.copy(camera.matrixWorld)
    this.uniforms.uCameraPos.value.setFromMatrixPosition(camera.matrixWorld)
  }

  /** Depth-only pre-pass: occluders only, colour discarded. */
  renderDepth(scene: THREE.Scene, camera: THREE.Camera): void {
    const hidden: THREE.Object3D[] = []
    for (const object of this.nonOccluders) {
      if (object.visible) {
        object.visible = false
        hidden.push(object)
      }
    }
    const previousOverride = scene.overrideMaterial
    scene.overrideMaterial = this.depthMaterial
    this.renderer.setRenderTarget(this.depthTarget)
    this.renderer.render(scene, camera)
    this.renderer.setRenderTarget(null)
    scene.overrideMaterial = previousOverride
    for (const object of hidden) object.visible = true
  }

  /** Half-res raymarch quad, then an additive fullscreen copy to canvas.
   * The copy render must NOT auto-clear: `renderer.render` clears the
   * current target by default, and clearing the canvas here would wipe
   * the scene the main render just drew, leaving only the additive
   * shafts on black. */
  renderShafts(): void {
    this.renderer.setRenderTarget(this.shaftTarget)
    this.renderer.render(this.quadScene, this.quadCamera)
    this.renderer.setRenderTarget(null)
    const autoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    try {
      this.renderer.render(this.copyScene, this.quadCamera)
    } finally {
      this.renderer.autoClear = autoClear
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.depthTarget.dispose()
    this.shaftTarget.dispose()
    this.depthMaterial.dispose()
    this.quadScene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        ;(object.material as THREE.Material).dispose()
      }
    })
    this.copyScene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        ;(object.material as THREE.Material).dispose()
      }
    })
  }
}

/**
 * View-dot-normal soft edge fade for volumetric god ray cones (AQ-98 AC #2):
 * `clamp(dot(viewDirection, normal), 0.0, 1.0)` raised to a soft falloff exponent
 * so light rays vanish smoothly at grazing angles or as the camera orbits,
 * eliminating hard polygon boundaries.
 */
export function evaluateGodRayEdgeFade(
  viewDirection: Readonly<{ x: number; y: number; z: number }>,
  normal: Readonly<{ x: number; y: number; z: number }>,
): number {
  const vLen = Math.hypot(viewDirection.x, viewDirection.y, viewDirection.z)
  const nLen = Math.hypot(normal.x, normal.y, normal.z)
  if (vLen <= 1e-9 || nLen <= 1e-9) return 0
  const dot =
    (viewDirection.x / vLen) * (normal.x / nLen) +
    (viewDirection.y / vLen) * (normal.y / nLen) +
    (viewDirection.z / vLen) * (normal.z / nLen)
  const clamped = Math.min(1, Math.max(0, dot))
  return Math.pow(clamped, 1.5)
}

/**
 * Upward-angled / vertical-scale camera framing (AQ-98 AC #3):
 * Positions the camera slightly lower in the water column with a gentle upward
 * tilt and a 45°–50° vertical FOV band so the left NSA pinnacle reads with
 * towering vertical scale while keeping the camera well in front of the
 * foreground fish volume (`z <= 2.8`).
 */
export const VERIFIED_PINNACLE_CAMERA_FRAMING = Object.freeze({
  fovDeg: 46,
  minFovDeg: 45,
  maxFovDeg: 50,
  position: Object.freeze({ x: 0, y: 0.08, z: 9.0 }),
  lookAt: Object.freeze({ x: 0, y: 0.24, z: 0.0 }),
  upwardTiltRad: Math.atan2(0.24 - 0.08, 9.0),
  foregroundFishMaxZ: 2.8,
})

/**
 * Constructs 4–5 volumetric god-ray cone/cylinder meshes descending from the
 * top water surface with scrolling noise, `THREE.AdditiveBlending`,
 * `depthWrite: false`, and view-dot-normal edge fade (AQ-98 AC #1, #2, #4).
 */
export function createVolumetricGodRayCones(requestedCount = 5): {
  group: THREE.Group
  cones: THREE.Mesh[]
  uniforms: { uTime: { value: number }; uAlpha: { value: number } }
  update(timeSeconds: number, options?: { paused?: boolean; reducedMotion?: boolean; hidden?: boolean }): void
  dispose(): void
} {
  const count = Math.min(5, Math.max(4, Math.round(Number.isFinite(requestedCount) ? requestedCount : 5)))
  const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
  const uniforms = {
    uTime: { value: 0 },
    uAlpha: { value: cfg.lightShaftMaxAlpha },
  }
  const group = new THREE.Group()
  group.name = 'Volumetric_God_Ray_Cones'
  const cones: THREE.Mesh[] = []

  const xPositions = [-2.4, -1.1, 0.15, 1.35, 2.55].slice(0, count)
  for (let i = 0; i < count; i++) {
    const topRadius = 0.28 + (i % 2) * 0.08
    const bottomRadius = 0.72 + (i % 3) * 0.14
    const height = 4.6 + (i === 2 ? 0.6 : 0.0)
    const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 24, 1, true)
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vConeUv;
        void main() {
          vConeUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uAlpha;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vConeUv;
        ${SHAFT_BEAM_GLSL}
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPos);
          vec3 faceNormal = gl_FrontFacing ? normalize(vWorldNormal) : -normalize(vWorldNormal);
          float edgeFade = pow(clamp(dot(viewDirection, faceNormal), 0.0, 1.0), 1.5);
          float verticalFade = smoothstep(0.0, 0.85, vConeUv.y) * (1.0 - smoothstep(0.88, 1.0, vConeUv.y));
          float noise = 0.65 + 0.35 * shaftValueNoise(vec2(vConeUv.x * 4.0 + uTime * 0.04, vConeUv.y * 2.5 - uTime * 0.06));
          float alpha = edgeFade * verticalFade * noise * uAlpha;
          gl_FragColor = vec4(vec3(0.55, 0.82, 0.96) * alpha, alpha);
        }
      `,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `God_Ray_Cone_${i + 1}`
    mesh.position.set(xPositions[i]!, cfg.surfaceY - height * 0.48, -1.6 - (i % 2) * 0.35)
    mesh.rotation.z = -0.18 + (i - 2) * 0.03
    mesh.rotation.x = 0.08
    mesh.raycast = () => {}
    group.add(mesh)
    cones.push(mesh)
  }

  return {
    group,
    cones,
    uniforms,
    update(timeSeconds: number, options?: { paused?: boolean; reducedMotion?: boolean; hidden?: boolean }) {
      const frozen = Boolean(options?.paused || options?.reducedMotion || options?.hidden || !Number.isFinite(timeSeconds))
      uniforms.uTime.value = frozen ? 0 : timeSeconds % 3600
    },
    dispose() {
      for (const cone of cones) {
        cone.geometry.dispose()
        ;(cone.material as THREE.Material).dispose()
      }
    },
  }
}

