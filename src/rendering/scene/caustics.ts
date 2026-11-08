import * as THREE from 'three'
import { DEFAULT_AQUARIUM_OPTICS_CONFIG } from './underwater-optics'

/**
 * Real, animated caustics (AQ-14.2 AC #2, AQ-39): a single procedural,
 * tileable caustic texture generated at runtime (no external asset, $0
 * budget) sampled in the sand, live-rock, and coral shaders via a shared
 * `onBeforeCompile` patch.
 *
 * This is a shader texture, NOT a literal `THREE.SpotLight` projector: a
 * projector would light all surfaces uniformly (no upward-normal or depth
 * masking), fight the key light and its shadow map, and add a second
 * shadow/projector pass for no gain.
 *
 * Scope, deliberately: sand, live rock, and coral only — AQ-14.2 AC #2
 * covers exactly those three. Fish are excluded: they are skinned GLBs
 * with stock PBR and no custom shader, and a world-space pattern on a
 * swimming fish reads as the texture swimming, not light moving. Fish
 * keep the existing global key/fill shimmer from
 * `createRestrainedCausticLightController`. Backdrop, water surface, and
 * glass are excluded as well. No Snell's-law ray convergence is
 * implemented; this is a surface-space approximation whose physical
 * coherence comes from reusing the ripple frequencies (0.22 / 0.37 Hz),
 * the upward-normal mask, and the depth envelope from
 * `evaluateCausticIntensity`.
 */

const TWO_PI = Math.PI * 2

/** Default caustic texture resolution (pixels per side). */
export const CAUSTIC_TEXTURE_SIZE = 512

/**
 * Pure, tileable caustic web value at texture coordinates `u, v` in [0, 1).
 * All spatial frequencies are integer multiples of 2π across the tile, so
 * the pattern wraps seamlessly: `value(0, v) === value(1, v)` and
 * `value(u, 0) === value(u, 1)`. Two warped interference fields are
 * multiplied and sharpened, giving bright ridged webs on a mostly dark
 * field — the texture is a light multiplier, not albedo.
 */
export function evaluateCausticTextureValue(u: number, v: number): number {
  const w1 =
    Math.sin(TWO_PI * (4 * u + 3 * v) + 1.3 * Math.sin(TWO_PI * (2 * u - 5 * v)))
  const w2 =
    Math.cos(TWO_PI * (3 * u - 4 * v) + 1.1 * Math.cos(TWO_PI * (5 * u + 2 * v)))
  const web = Math.abs(w1 * w2)
  return Math.pow(web, 2.5)
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
  const uniforms: CausticUniforms = {
    uCausticMap: { value: texture },
    uCausticTime: { value: 0 },
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
}

const CAUSTIC_CACHE_KEY_SUFFIX = ':caustics-v1'

/**
 * Patches a `MeshStandardMaterial` so the caustic texture is sampled in its
 * fragment shader, masked to upward-facing surfaces and faded with depth
 * (the same envelope as `evaluateCausticIntensity`), capped at
 * `uCausticMaxAdd` additive on direct diffuse light.
 *
 * The existing `onBeforeCompile` is preserved (chained) — sand, coral, and
 * live-rock materials all already patch their shaders — and the
 * `customProgramCacheKey` is suffixed so the patched program can never
 * collide with the unpatched one. The hook is `#include <opaque_fragment>`
 * (with the caustic code injected just before it): that include is untouched
 * by the sand / coral / rock patches, which replace other chunks, so the
 * injection lands regardless of patch order. Depth materials are never
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
  }
  const previousOnBeforeCompile = material.onBeforeCompile
  const previousCacheKey = material.customProgramCacheKey
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile.call(material, shader, renderer)
    Object.assign(shader.uniforms, caustics.uniforms, perMaterialUniforms)
    shader.vertexShader =
      'varying vec3 vCausticWorldPos;\nvarying vec3 vCausticWorldNormal;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\nvCausticWorldNormal = normalize(mat3(modelMatrix) * objectNormal);',
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
    shader.fragmentShader =
      'uniform sampler2D uCausticMap;\nuniform float uCausticTime;\nuniform float uCausticScaleA;\nuniform float uCausticScaleB;\nuniform float uCausticMaxAdd;\nvarying vec3 vCausticWorldPos;\nvarying vec3 vCausticWorldNormal;\n' +
      shader.fragmentShader
    // UV scroll mirrors evaluateCausticPatternUV exactly (0.22 Hz layer A,
    // 0.37 Hz layer B, opposite drift directions). Keep the two in sync.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `// Animated caustic texture (AQ-14.2 AC #2): two world-space layers
// scrolling in opposite directions, masked to upward faces and faded
// with depth, capped at uCausticMaxAdd additive on direct diffuse light.
vec2 causticUvA = vCausticWorldPos.xz * uCausticScaleA + vec2(uCausticTime * 0.022, -uCausticTime * 0.0132);
vec2 causticUvB = vCausticWorldPos.xz * uCausticScaleB + vec2(-uCausticTime * 0.0296, uCausticTime * 0.0185);
float causticP = texture2D(uCausticMap, causticUvA).r * texture2D(uCausticMap, causticUvB).r;
causticP = smoothstep(0.25, 0.85, causticP);
float causticMask = max(vCausticWorldNormal.y, 0.0) * (1.0 - 0.35 * clamp((2.8 - vCausticWorldPos.y) / 5.6, 0.0, 1.0));
reflectedLight.directDiffuse += diffuseColor.rgb * (causticP * causticMask * uCausticMaxAdd);
#include <opaque_fragment>`,
    )
  }
  material.customProgramCacheKey = () =>
    `${typeof previousCacheKey === 'function' ? previousCacheKey.call(material) : 'default'}${CAUSTIC_CACHE_KEY_SUFFIX}`
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
