/**
 * Texture color-space audit (AQ-70.4 AC #4): albedo maps are sRGB, data maps
 * (normal / ORM / mask) are linear, and COLOR_0 masks are treated as data.
 *
 * Fish, coral, and rock GLBs all load through the same `GLTFLoader`, so the
 * loader's slot mapping is verified once with a minimal inline glTF (one
 * triangle, three 1x1 PNG data-URI textures: baseColor, metallicRoughness,
 * normal) instead of re-parsing every production asset. The generated sand
 * PBR trio is verified directly, and the coral raw-mask material is verified
 * to keep COLOR_0 out of the display path.
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createAragoniteSandPbrTextures } from './aragonite-sand'
import { applyCoralRawMaskMaterial } from './coral-material'

// three's GLTFLoader reads data-URI images via `self.createImageBitmap`
// (a browser global); the happy-dom test environment does not define `self`.
// Shim it so the loader takes its ordinary Image path.
if (typeof (globalThis as { self?: unknown }).self === 'undefined') {
  ;(globalThis as { self: typeof globalThis }).self = globalThis
}

// 1x1 transparent PNG.
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
// 42 bytes: 9 float32 positions (triangle) + 3 uint16 indices.
const TRIANGLE_BUFFER_BASE64 = 'AAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAAABAAIA'

/**
 * Builds a minimal binary glTF (GLB) in memory: one triangle, one 1x1 PNG
 * image in the BIN chunk, three textures (baseColor, metallicRoughness,
 * normal) all referencing that image. A GLB is used instead of JSON with a
 * data-URI buffer because the test environment's fetch/XHR never resolves
 * data: URIs, which hangs the JSON loader path; the GLB path reads the BIN
 * chunk directly.
 */
function buildMinimalGlb(): ArrayBuffer {
  const png = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64')
  const triangle = Buffer.from(TRIANGLE_BUFFER_BASE64, 'base64')
  const bin = Buffer.concat([triangle, png])
  const json = JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicRoughnessTexture: { index: 1 },
        },
        normalTexture: { index: 2 },
      },
    ],
    textures: [{ source: 0 }, { source: 1 }, { source: 2 }],
    // One image entry per texture slot: the loader caches textures per
    // image, so sharing a single image would make map/normalMap/metalnessMap
    // the same Texture object and hide the per-slot colorSpace assignment.
    // All three entries read the same PNG bytes via separate bufferViews.
    images: [
      { bufferView: 2, mimeType: 'image/png' },
      { bufferView: 3, mimeType: 'image/png' },
      { bufferView: 4, mimeType: 'image/png' },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 6 },
      { buffer: 0, byteOffset: 42, byteLength: png.length },
      { buffer: 0, byteOffset: 42, byteLength: png.length },
      { buffer: 0, byteOffset: 42, byteLength: png.length },
    ],
    buffers: [{ byteLength: bin.length }],
  })
  const jsonBytes = new TextEncoder().encode(json)
  const jsonPaddedLength = Math.ceil(jsonBytes.length / 4) * 4
  const binPaddedLength = Math.ceil(bin.length / 4) * 4
  const totalLength = 12 + 8 + jsonPaddedLength + 8 + binPaddedLength
  const glb = new ArrayBuffer(totalLength)
  const view = new DataView(glb)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, totalLength, true)
  view.setUint32(12, jsonPaddedLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(glb, 20, jsonBytes.length).set(jsonBytes)
  new Uint8Array(glb, 20 + jsonBytes.length, jsonPaddedLength - jsonBytes.length).fill(0x20)
  const binStart = 20 + jsonPaddedLength
  view.setUint32(binStart, binPaddedLength, true)
  view.setUint32(binStart + 4, 0x004e4942, true)
  new Uint8Array(glb, binStart + 8, bin.length).set(bin)
  return glb
}

describe('texture color spaces by map type (AQ-70.4 AC #4)', () => {
  it('loads GLTF baseColor as sRGB and normal / metallic-roughness as linear data', async () => {
    // happy-dom cannot decode PNG pixels (its Image path throws on the
    // missing ProgressEvent), so stub only the decode: the loader's own
    // slot -> colorSpace assignment in assignTexture still runs, and the
    // test asserts its result. Which decode path the loader picks depends
    // on whether the environment defines createImageBitmap, so stub both.
    const originalImageLoad = THREE.ImageLoader.prototype.load
    const originalBitmapLoad = THREE.ImageBitmapLoader.prototype.load
    THREE.ImageLoader.prototype.load = function (url, onLoad) {
      const image = { width: 1, height: 1 } as unknown as HTMLImageElement
      queueMicrotask(() => onLoad?.(image))
      return image
    }
    THREE.ImageBitmapLoader.prototype.load = function (url, onLoad) {
      const bitmap = { width: 1, height: 1, close() {} } as unknown as ImageBitmap
      queueMicrotask(() => onLoad?.(bitmap))
      return new THREE.Texture(bitmap as unknown as HTMLImageElement)
    }
    let gltf: Awaited<ReturnType<GLTFLoader['parseAsync']>>
    try {
      gltf = await new GLTFLoader().parseAsync(buildMinimalGlb(), '')
    } finally {
      THREE.ImageLoader.prototype.load = originalImageLoad
      THREE.ImageBitmapLoader.prototype.load = originalBitmapLoad
    }
    let material: THREE.MeshStandardMaterial | undefined
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        material = object.material
      }
    })
    expect(material).toBeDefined()
    const mat = material as THREE.MeshStandardMaterial
    expect(mat.map).toBeDefined()
    expect(mat.map!.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(mat.normalMap).toBeDefined()
    expect(mat.normalMap!.colorSpace).toBe(THREE.NoColorSpace)
    expect(mat.metalnessMap).toBeDefined()
    expect(mat.metalnessMap!.colorSpace).toBe(THREE.NoColorSpace)
    expect(mat.roughnessMap).toBeDefined()
    expect(mat.roughnessMap!.colorSpace).toBe(THREE.NoColorSpace)
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
  })

  it('generates the sand PBR trio with an sRGB albedo and linear normal / roughness maps', () => {
    const { albedoTexture, normalTexture, roughnessTexture } = createAragoniteSandPbrTextures(64)
    expect(albedoTexture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(normalTexture.colorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(roughnessTexture.colorSpace).toBe(THREE.LinearSRGBColorSpace)
    albedoTexture.dispose()
    normalTexture.dispose()
    roughnessTexture.dispose()
  })

  it('treats coral COLOR_0 masks as data: vertexColors stays off so the mask never becomes display RGB or opacity', () => {
    const binding = applyCoralRawMaskMaterial(new THREE.MeshStandardMaterial(), { role: 'coral-soft' })
    expect(binding.material.vertexColors).toBe(false)
    expect(binding.material.transparent).toBe(false)
  })
})
