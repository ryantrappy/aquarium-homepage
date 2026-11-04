import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { nearestVisibleIntersection, textureAlphaAt, type AlphaMask, type SpriteMasks } from './alpha-picking'

function fixture() {
  const texture = new THREE.Texture(); texture.magFilter = THREE.NearestFilter
  const preview = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .2, side: THREE.DoubleSide }))
  preview.position.z = 1; preview.userData.serviceId = 'preview'
  const fish = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); fish.userData.serviceId = 'real-fish'
  const masks: SpriteMasks = new WeakMap()
  masks.set(preview, { texture, pixels: { width: 2, height: 2, alpha: new Uint8Array([0, 255, 255, 255]) } })
  const hit = (x: number, y: number, objects: THREE.Object3D[]) => {
    objects.forEach(object => object.updateMatrixWorld(true))
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1))
    return nearestVisibleIntersection(ray.intersectObjects(objects, false), masks)
  }
  return { texture, preview, fish, masks, hit }
}

describe('preview texture-alpha picking', () => {
  it('rejects empty-water corners and selects the real fish behind a transparent preview', () => {
    const { preview, fish, hit } = fixture()
    expect(hit(-.5, .5, [preview])).toBeUndefined()
    expect(hit(-.5, .5, [fish, preview])?.object).toBe(fish)
    expect(hit(.5, .5, [fish, preview])?.object).toBe(preview)
  })
  it('keeps opaque reef in nearest-hit ordering after skipping a transparent preview', () => {
    const { preview, fish, hit } = fixture()
    const reef = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); reef.position.z = .5
    expect(hit(-.5, .5, [fish, reef, preview])?.object).toBe(reef)
    expect(hit(-.5, .5, [fish, reef, preview])?.object.userData.serviceId).toBeUndefined()
  })
  it('uses the same alpha cutoff including equality and material opacity', () => {
    const { preview, texture, masks, hit } = fixture()
    masks.set(preview, { texture, pixels: { width: 1, height: 1, alpha: new Uint8Array([51]) } })
    expect(hit(0, 0, [preview])?.object).toBe(preview) // 51 / 255 == 0.2
    preview.material.opacity = .5
    expect(hit(0, 0, [preview])).toBeUndefined()
    preview.material.opacity = 1
    masks.set(preview, { texture, pixels: { width: 1, height: 1, alpha: new Uint8Array([50]) } })
    expect(hit(0, 0, [preview])).toBeUndefined()
  })
  it('respects texture rotation, repeat, offset, flipY and explicit UV matrices without mutating the hit UV', () => {
    const mask: AlphaMask = { width: 2, height: 2, alpha: new Uint8Array([0, 255, 255, 255]) }
    const texture = new THREE.Texture(); texture.magFilter = THREE.NearestFilter; texture.flipY = false
    const uv = new THREE.Vector2(.25, .25)
    expect(textureAlphaAt(mask, texture, uv)).toBe(0)
    texture.center.set(.5, .5); texture.rotation = Math.PI
    expect(textureAlphaAt(mask, texture, uv)).toBe(1)
    expect(uv.toArray()).toEqual([.25, .25])
    texture.rotation = 0; texture.center.set(0, 0); texture.repeat.set(2, 1); texture.offset.set(.5, 0); texture.wrapS = THREE.RepeatWrapping
    expect(textureAlphaAt(mask, texture, new THREE.Vector2(.1, .25))).toBe(1)
    texture.offset.x = 0
    expect(textureAlphaAt(mask, texture, new THREE.Vector2(.1, .25))).toBe(0)
    texture.repeat.set(1, 1); texture.flipY = true
    expect(textureAlphaAt(mask, texture, uv)).toBe(1)
    texture.flipY = false; texture.matrixAutoUpdate = false; texture.matrix.setUvTransform(.5, 0, 1, 1, 0, 0, 0)
    expect(textureAlphaAt(mask, texture, uv)).toBe(1)
  })
  it('samples linear alpha near texel centers and fails closed until a mask has decoded', () => {
    const { preview, texture, masks, hit } = fixture()
    masks.set(preview, { texture })
    expect(hit(0, 0, [preview])).toBeUndefined()
    const mask: AlphaMask = { width: 2, height: 1, alpha: new Uint8Array([0, 255]) }
    texture.magFilter = THREE.LinearFilter; texture.flipY = false
    expect(textureAlphaAt(mask, texture, new THREE.Vector2(.34, .5))).toBeCloseTo(.18)
    expect(textureAlphaAt(mask, texture, new THREE.Vector2(.36, .5))).toBeCloseTo(.22)
    masks.set(preview, { texture, pixels: mask })
    expect(hit(-.32, 0, [preview])).toBeUndefined()
    expect(hit(-.28, 0, [preview])?.object).toBe(preview)
  })
})
