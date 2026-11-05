import * as THREE from 'three'
import { applyFishLinkVisibility } from './fish-link-focus'

export type AlphaMask = { width: number; height: number; alpha: Uint8Array }
export type MaskedTexture = { texture: THREE.Texture; pixels?: AlphaMask }
export type SpriteMasks = WeakMap<THREE.Object3D, MaskedTexture>

/** Remove a failed preview from picking while exposing its native service label. */
export function handleArtworkTextureFailure(
  sprite: THREE.Mesh,
  texture: THREE.Texture,
  hitMeshes: THREE.Object3D[],
  masks: SpriteMasks,
  anchor?: HTMLAnchorElement,
): void {
  sprite.visible = false
  sprite.parent?.remove(sprite)
  for (let index = hitMeshes.length - 1; index >= 0; index--) {
    if (hitMeshes[index] === sprite) hitMeshes.splice(index, 1)
  }
  masks.delete(sprite)
  texture.dispose()
  if (anchor) {
    applyFishLinkVisibility(anchor, true, null)
    anchor.dataset.artworkError = 'true'
  }
}

/** Upper bound for alpha-picking canvas dimensions, independent of source resolution. */
export const MAX_ALPHA_MASK_DIMENSION = 512

/** Preserve image proportions while bounding canvas and retained alpha allocations. */
export function alphaMaskDimensions(width: number, height: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) throw new Error('Fish artwork has no decoded pixels.')
  const scale = Math.min(1, MAX_ALPHA_MASK_DIMENSION / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Decode once per loaded artwork, rather than reading a canvas on every ray. */
export function readArtworkAlpha(image: HTMLImageElement): AlphaMask {
  const dimensions = alphaMaskDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const { width, height } = dimensions
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Fish artwork alpha could not be read.')
  context.drawImage(image, 0, 0, width, height)
  const rgba = context.getImageData(0, 0, width, height).data, alpha = new Uint8Array(width * height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]
  return { width, height, alpha }
}

function texelIndex(index: number, size: number, wrap: THREE.Wrapping) {
  if (wrap === THREE.RepeatWrapping) return ((index % size) + size) % size
  if (wrap === THREE.MirroredRepeatWrapping) {
    const mirrored = ((index % (2 * size)) + 2 * size) % (2 * size)
    return mirrored < size ? mirrored : 2 * size - mirrored - 1
  }
  return Math.min(size - 1, Math.max(0, index))
}

/** Base-image alpha with Three's UV matrix, wrap modes and upload flipY. */
export function textureAlphaAt(mask: AlphaMask, texture: THREE.Texture, originalUv: THREE.Vector2): number {
  if (texture.matrixAutoUpdate) texture.updateMatrix()
  const uv = texture.transformUv(originalUv.clone())
  const texel = (x: number, y: number) => mask.alpha[texelIndex(y, mask.height, texture.wrapT) * mask.width + texelIndex(x, mask.width, texture.wrapS)] / 255
  if (texture.magFilter === THREE.NearestFilter) return texel(Math.floor(uv.x * mask.width), Math.floor(uv.y * mask.height))
  // Linear sampling uses texel centers, including wrap/clamp behavior at edges.
  const x = uv.x * mask.width - .5, y = uv.y * mask.height - .5, x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = x - x0, fy = y - y0
  return texel(x0, y0) * (1 - fx) * (1 - fy) + texel(x0 + 1, y0) * fx * (1 - fy)
    + texel(x0, y0 + 1) * (1 - fx) * fy + texel(x0 + 1, y0 + 1) * fx * fy
}

/** Preserve nearest-geometry ordering; transparent artwork never blocks a later hit. */
export function nearestVisibleIntersection(hits: readonly THREE.Intersection[], masks: SpriteMasks): THREE.Intersection | undefined {
  return hits.find(hit => {
    const artwork = masks.get(hit.object)
    if (!artwork) return true // ordinary reef/fish geometry retains normal occlusion
    if (!artwork.pixels || !hit.uv || !(hit.object instanceof THREE.Mesh)) return false
    const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material
    const alpha = textureAlphaAt(artwork.pixels, artwork.texture, hit.uv) * material.opacity
    return alpha > 0 && alpha >= material.alphaTest
  })
}
