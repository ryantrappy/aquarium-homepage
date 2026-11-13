import * as THREE from 'three'
import { DEFAULT_AQUARIUM_OPTICS_CONFIG } from './underwater-optics'
import { SURFACE_WAVE_GLSL } from './surface-waves'

/**
 * Real, animated caustics (AQ-14.2 AC #2, AQ-39, AQ-70.6): a single
 * procedural, tileable caustic texture generated at runtime (no external
 * asset, $0 budget) sampled in the sand, live-rock, coral, and fish
 * shaders via a shared `onBeforeCompile` patch.
 *
 * AQ-70.6: the texture is a true cellular (Voronoi) network — bright ridges
 * where two cells' feature points are equidistant (F2 - F1 ≈ 0) on a mostly
 * dark field — not the sine-wave interference web it replaced, which read
 * as soft stripes. The same texture is the one shared chunk for every lit
 * surface; the sand shader's own sine ridge network and the coral shader's
 * sine caustic shimmer were removed so the scene can never show two
 * disagreeing caustic systems.
 *
 * This is a shader texture, NOT a literal `THREE.SpotLight` projector: a
 * projector would light all surfaces uniformly (no upward-normal or depth
 * masking), fight the key light and its shadow map, and add a second
 * shadow/projector pass for no gain.
 *
 * Scope: sand, live rock, coral, and fish (skinned, via the post-skinning
 * world-position hook in `applyCaustics`). Backdrop, water surface, and
 * glass are excluded. No Snell's-law ray convergence is implemented; this
 * is a surface-space approximation whose physical coherence comes from
 * the sun-slant projection (UVs sampled at the surface footpoint the
 * light passed through) and the shared wave-field focus term
 * (`surface-waves.ts`: bright where the surface converges light, dim
 * where it diverges) — the scroll still reuses the 0.22 / 0.37 Hz
 * envelope rates, which are deliberately not equated to the wave
 * field's dispersion frequencies (see `evaluateCausticPatternUV`).
 */

/** Default caustic texture resolution (pixels per side). 256, not 512:
 * the Voronoi field is generated on the main thread at startup (the
 * 512 default cost ~600 ms there; 256 costs ~130 ms) and the texture is
 * linearly filtered and mipmapped, so 64 px per cell still renders the
 * same soft ridge network — the saved ~470 ms is the one cheap startup
 * win in the batch's wake. The >180 s first render under SwiftShader is
 * not this: it is software rasterization of the whole scene (PMREM +
 * VSM shadow passes + full-frame shaders on the CPU), not JS startup. */
export const CAUSTIC_TEXTURE_SIZE = 256

/** Voronoi cells per tile side in the cellular caustic texture (AQ-70.6):
 * one tile spans ~2.9 m at the default layer-A scale, so a cell is ~0.7 m
 * across; the two scrolling layers at different scales multiply, which
 * breaks the regularity into finer structure. */
export const CAUSTIC_VORONOI_CELLS = 4
/** Voronoi edge width in cell units: F2 - F1 below this reads as a bright
 * ridge. Tuned so the texture is ~8% bright ridge on ~73% dark field. */
export const CAUSTIC_VORONOI_EDGE_WIDTH = 0.22

/**
 * Deterministic feature-point offset in [0, 1)^2 for Voronoi cell
 * `(ix, iy)` (already wrapped into [0, CAUSTIC_VORONOI_CELLS)). Sin-hash,
 * like the other procedural fields in this scene; the wrapped inputs make
 * the pattern tile seamlessly.
 */
function voronoiFeaturePoint(ix: number, iy: number): [number, number] {
  const fx = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123
  const fy = Math.sin(ix * 269.5 + iy * 183.3) * 28001.8384
  return [fx - Math.floor(fx), fy - Math.floor(fy)]
}

/**
 * Pure, tileable cellular caustic value at texture coordinates `u, v` in
 * [0, 1). A Voronoi F2 - F1 edge field: bright ridges where the two nearest
 * feature points are equidistant, dark cell interiors. All feature points
 * are periodic in the tile, so `value(0, v) === value(1, v)` and
 * `value(u, 0) === value(u, 1)` exactly. The texture is a light multiplier,
 * not albedo.
 */
export function evaluateCausticTextureValue(u: number, v: number): number {
  const cells = CAUSTIC_VORONOI_CELLS
  const x = u * cells
  const y = v * cells
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  let f1 = Infinity
  let f2 = Infinity
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = cx + dx
      const ny = cy + dy
      const wx = ((nx % cells) + cells) % cells
      const wy = ((ny % cells) + cells) % cells
      const [ox, oy] = voronoiFeaturePoint(wx, wy)
      const px = nx + ox
      const py = ny + oy
      const d = Math.hypot(x - px, y - py)
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  const edge = Math.max(0, 1 - (f2 - f1) / CAUSTIC_VORONOI_EDGE_WIDTH)
  return edge * edge
}

/**
 * Generates the caustic texture at runtime as a `THREE.DataTexture`
 * (not a canvas texture: the vitest environment is Node, with no DOM
 * canvas). Greyscale web, `NoColorSpace` because it multiplies light
 * rather than supplying albedo. Generated once; never regenerated per
 * frame.
 */
export function generateCausticsTexture(size: number = CAUSTIC_TEXTURE_SIZE): THREE.DataTexture {
  const clampedSize = Math.max(16, Math.floor(size))
  const data = new Uint8Array(clampedSize * clampedSize * 4)
  for (let y = 0; y < clampedSize; y++) {
    for (let x = 0; x < clampedSize; x++) {
      const value = Math.round(
        Math.min(1, Math.max(0, evaluateCausticTextureValue(x / clampedSize, y / clampedSize))) * 255,
      )
      const i = (y * clampedSize + x) * 4
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, clampedSize, clampedSize, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

export type CausticUniforms = {
  uCausticMap: { value: THREE.Texture }
  uCausticTime: { value: number }
  /** Unit sun direction (toward the key light) for the slant projection. */
  uSunDir: { value: THREE.Vector3 }
  /** Water-surface height for the slant projection. */
  uSurfaceY: { value: number }
  /** Gain of the shared wave-field focus term on the caustic pattern. */
  uFocusGain: { value: number }
}

export type Caustics = {
  texture: THREE.Texture
  uniforms: CausticUniforms
  /** Sets the shared caustic time; freezes at 0 when paused or reduced-motion. */
  update(timeSeconds: number, paused?: boolean, reducedMotion?: boolean): void
  dispose(): void
}

/**
 * Creates the single shared caustic texture and time uniform for the scene.
 * One texture + one shared uniform set for every patched material; the
 * per-material scale / max-add uniforms are created by `applyCaustics`.
 */
export function createCaustics(size: number = CAUSTIC_TEXTURE_SIZE): Caustics {
  const texture = generateCausticsTexture(size)
  const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
  const uniforms: CausticUniforms = {
    uCausticMap: { value: texture },
    uCausticTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(cfg.sunDirection.x, cfg.sunDirection.y, cfg.sunDirection.z) },
    uSurfaceY: { value: cfg.surfaceY },
    uFocusGain: { value: cfg.surfaceFocusGain },
  }
  return {
    texture,
    uniforms,
    update(timeSeconds: number, paused = false, reducedMotion = false) {
      uniforms.uCausticTime.value =
        paused || reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds % 3600
    },
    dispose() {
      texture.dispose()
    },
  }
}

export type ApplyCausticsOptions = {
  /** World-space UV scale (UV per metre) of layer A; default from the optics config. */
  scaleA?: number
  /** World-space UV scale (UV per metre) of layer B; default from the optics config. */
  scaleB?: number
  /** Maximum additive brightness; default from the optics config (0.35). */
  maxAdd?: number
  /**
   * Lower edge of the ridge smoothstep; default 0.35. Lowering it widens
   * the visible ridge network on that material without raising the peak
   * (the +0.35 cap is untouched): the sand uses 0.22 because it is both
   * the deepest surface (the depth envelope gives it ×0.65 vs ×0.89 on
   * the rock) and the brightest (the same absolute add is a smaller
   * relative change), so its dapple reads faint at overview distance.
   */
  threshold?: number
  /**
   * Skinned meshes (AQ-70.6 AC #1: fish): hook the world position and normal
   * after skinning instead of at `begin_vertex` / `beginnormal_vertex`,
   * which run on the bind pose. At `#include <project_vertex>` the
   * `transformed` position is already skinned (and flex-displaced), and at
   * `#include <defaultnormal_vertex>` `objectNormal` is already skinned.
   * The pattern then stays fixed in world space while the fish swims
   * through it, instead of swimming with the fish.
   */
  skinned?: boolean
}

const CAUSTIC_CACHE_KEY_SUFFIX = ':caustics-v1'
const CAUSTIC_SKINNED_CACHE_KEY_SUFFIX = ':caustics-skinned-v1'

/**
 * Patches a `MeshStandardMaterial` so the caustic texture is sampled in its
 * fragment shader, masked to upward-facing surfaces and faded with depth
 * (the same envelope as `evaluateCausticIntensity`), capped at
 * `uCausticMaxAdd` additive on direct diffuse light.
 *
 * The existing `onBeforeCompile` is preserved (chained) — sand, coral, and
 * live-rock materials all already patch their shaders, and fish flex
 * replaces the fish material's hook after cloning, so the caustics patch
 * must be applied after flex binding on fish — and the
 * `customProgramCacheKey` is suffixed so the patched program can never
 * collide with the unpatched one. The hook is `#include <opaque_fragment>`
 * (with the caustic code injected just before it): that include is untouched
 * by the sand / coral / rock / flex patches, which replace other chunks, so
 * the injection lands regardless of patch order. Depth materials are never
 * patched: caustics affect colour only, never shadows.
 *
 * Safe to call twice on the same material: the second call is a no-op.
 * `disposeCaustics` restores the material's previous `onBeforeCompile`.
 */
export function applyCaustics(
  material: THREE.MeshStandardMaterial,
  caustics: Caustics,
  options: ApplyCausticsOptions = {},
): THREE.MeshStandardMaterial {
  if (material.userData.causticsApplied) return material
  const cfg = DEFAULT_AQUARIUM_OPTICS_CONFIG
  const perMaterialUniforms = {
    uCausticScaleA: { value: options.scaleA ?? cfg.causticTextureScaleA },
    uCausticScaleB: { value: options.scaleB ?? cfg.causticTextureScaleB },
    uCausticMaxAdd: { value: options.maxAdd ?? cfg.causticMaxAdd },
    uCausticThreshold: { value: options.threshold ?? 0.35 },
  }
  const previousOnBeforeCompile = material.onBeforeCompile
  const previousCacheKey = material.customProgramCacheKey
  const skinned = Boolean(options.skinned)
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile.call(material, shader, renderer)
    Object.assign(shader.uniforms, caustics.uniforms, perMaterialUniforms)
    shader.vertexShader =
      'varying vec3 vCausticWorldPos;\nvarying vec3 vCausticWorldNormal;\n' + shader.vertexShader
    if (skinned) {
      // Post-skinning hooks (AQ-70.6): `transformed` is skinned and
      // flex-displaced by the time `project_vertex` runs, and
      // `objectNormal` is skinned by `defaultnormal_vertex`.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <defaultnormal_vertex>',
        '#include <defaultnormal_vertex>\nvCausticWorldNormal = normalize(mat3(modelMatrix) * objectNormal);',
      )
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    } else {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvCausticWorldNormal = normalize(mat3(modelMatrix) * objectNormal);',
      )
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    }
    shader.fragmentShader =
      'uniform sampler2D uCausticMap;\nuniform float uCausticTime;\nuniform vec3 uSunDir;\nuniform float uSurfaceY;\nuniform float uFocusGain;\nuniform float uCausticScaleA;\nuniform float uCausticScaleB;\nuniform float uCausticMaxAdd;\nuniform float uCausticThreshold;\nvarying vec3 vCausticWorldPos;\nvarying vec3 vCausticWorldNormal;\n' +
      SURFACE_WAVE_GLSL +
      shader.fragmentShader
    // UV scroll mirrors evaluateCausticPatternUV exactly (0.22 Hz layer A,
    // 0.37 Hz layer B, opposite drift directions). Keep the two in sync.
    // Sun-slant projection (AQ-70.6 / AQ-96): the UVs are sampled at the
    // surface point the light passed through, so the dapple on tall rock
    // and high coral shifts along the light direction and lines up with
    // the shafts above it. Focus modulation: the shared wave-field focus
    // at that surface point multiplies the pattern by
    // (1 + uFocusGain * focus) — bright where the surface converges light,
    // dim where it diverges — so the sand dapple breathes with the surface
    // instead of scrolling on an independent clock.
    // Injection point (AQ-14.2 fix, 2026-11-11): AFTER `#include
    // <aomap_fragment>`, NOT at `#include <opaque_fragment>`. In three
    // r187's meshphysical fragment shader, `outgoingLight` is already
    // formed from `reflectedLight` (`vec3 outgoingLight = totalDiffuse +
    // totalSpecular + ...`) BEFORE `opaque_fragment` runs, so writing
    // `reflectedLight.directDiffuse` at the opaque_fragment point is
    // dead code — it never reaches the pixels. That is why three visual
    // checks found "no dapple discernible" even though the pattern was
    // sampled correctly: the caustic chunk ran, then its result was
    // discarded. `aomap_fragment` sits between `lights_fragment_end`
    // (where directDiffuse is accumulated) and the outgoingLight sum,
    // so the dim and the add below actually land. Verified with an
    // isolated probe (plane + key light): rendering `causticP` directly
    // shows a strong cellular web, and with this injection point the
    // same web reaches the lit output.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <aomap_fragment>',
      `#include <aomap_fragment>
// Animated caustic texture (AQ-14.2 AC #2): two world-space layers
// scrolling in opposite directions, masked to upward faces and faded
// with depth, capped at uCausticMaxAdd additive on direct diffuse light.
// The layers combine by MAX, not product: the cellular texture is a
// mostly-dark field (mean ~0.16), so a product's mean is ~0.027 and the
// old smoothstep(0.25, 0.85) left only ~2.7% of any surface with any
// pattern at all (mean additive +0.004) — the "no dapple discernible"
// visual-check finding. Max keeps the cellular network shape (union of
// ridges): ~32% of the surface shows pattern, mean additive +0.07 before
// the upward-normal and depth masks, still restrained under the +0.35 cap.
float causticDist = (uSurfaceY - vCausticWorldPos.y) / max(uSunDir.y, 0.2);
vec2 causticSurf = vCausticWorldPos.xz + uSunDir.xz * causticDist;
vec2 causticWarp = surfaceWaveSlope(causticSurf, uCausticTime) * 1.45;
vec2 causticUvA = (causticSurf + causticWarp) * uCausticScaleA + vec2(uCausticTime * 0.022, -uCausticTime * 0.0132);
vec2 causticUvB = (causticSurf - causticWarp * 0.85) * uCausticScaleB + vec2(-uCausticTime * 0.0296, uCausticTime * 0.0185);
vec2 dispOffset = causticWarp * 0.006;
float cR = max(texture2D(uCausticMap, causticUvA + dispOffset).r, texture2D(uCausticMap, causticUvB - dispOffset).r);
float cG = max(texture2D(uCausticMap, causticUvA).r, texture2D(uCausticMap, causticUvB).r);
float cB = max(texture2D(uCausticMap, causticUvA - dispOffset).r, texture2D(uCausticMap, causticUvB + dispOffset).r);
vec3 causticRGB = smoothstep(vec3(uCausticThreshold), vec3(0.88), vec3(cR, cG, cB));
causticRGB = pow(causticRGB, vec3(1.55));
float causticP = pow(smoothstep(uCausticThreshold, 0.88, cG), 1.6);
causticRGB.g = causticP;
float causticMask = max(vCausticWorldNormal.y, 0.0) * (1.0 - 0.35 * clamp((2.8 - vCausticWorldPos.y) / 5.6, 0.0, 1.0));
// Light redistribution (look-dev 2026-11-11): focusing means bright
// ridges AND dimmer surroundings — the light in the web came from the
// field around it.
// Only redistribute the direct fixture light. Recoloring ambient light
// here painted the whole sand bed blue between bright polygon outlines.
reflectedLight.directDiffuse *= 1.0 - 0.14 * (1.0 - cG) * causticMask;
float focusMod = clamp(1.0 + uFocusGain * surfaceWaveFocus(causticSurf, uCausticTime), 0.0, 1.2);
vec3 causticLedTint = vec3(0.95, 1.06, 1.18);
reflectedLight.directDiffuse += diffuseColor.rgb * causticRGB * causticLedTint * (focusMod * causticMask * uCausticMaxAdd * 1.25);`,
    )
  }
  const cacheKeySuffix = skinned ? CAUSTIC_SKINNED_CACHE_KEY_SUFFIX : CAUSTIC_CACHE_KEY_SUFFIX
  material.customProgramCacheKey = () =>
    `${typeof previousCacheKey === 'function' ? previousCacheKey.call(material) : 'default'}${cacheKeySuffix}`
  material.userData.causticsApplied = true
  material.userData.causticsPreviousOnBeforeCompile = previousOnBeforeCompile
  material.userData.causticsPreviousCacheKey = previousCacheKey
  material.needsUpdate = true
  return material
}

/** Restores a material patched by `applyCaustics` to its previous shader. */
export function disposeCaustics(material: THREE.MeshStandardMaterial): void {
  if (!material.userData.causticsApplied) return
  material.onBeforeCompile = material.userData.causticsPreviousOnBeforeCompile ?? (() => {})
  material.customProgramCacheKey = material.userData.causticsPreviousCacheKey
  delete material.userData.causticsApplied
  delete material.userData.causticsPreviousOnBeforeCompile
  delete material.userData.causticsPreviousCacheKey
  material.needsUpdate = true
}
