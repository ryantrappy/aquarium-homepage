// @vitest-environment happy-dom
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceConfig } from '../../lib/services'
import { getFishById } from '../../lib/fish'
import type { SwimmingFish } from './motion'
import type { FishClipPlayer } from './fish-animation'
import { refreshFishLink } from './fish-inhabitants'
import { createAquarium, type AquariumController, type SceneStatus } from './aquarium'

const state = vi.hoisted(() => ({
  renderer: undefined as undefined | { scene?: import('three').Scene; loop: ((time: number) => void) | null },
  created: [] as SwimmingFish[], players: [] as FishClipPlayer[], sources: [] as import('three').Group[],
  textures: [] as { texture: import('three').Texture; load?: () => void; error?: (error: unknown) => void }[],
  blockedSpawn: false, throwCreateForId: '', beforeCreateFailure: undefined as (() => void) | undefined,
}))
vi.mock('three', async importOriginal => {
  const real = await importOriginal<typeof import('three')>()
  class Renderer {
    shadowMap = { enabled: false, type: 0 }; scene?: THREE.Scene; loop: ((time: number) => void) | null = null
    constructor() { state.renderer = this }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    setAnimationLoop(loop: ((time: number) => void) | null) { this.loop = loop }
    render(scene: THREE.Scene, camera: THREE.Camera) { this.scene = scene; camera.updateMatrixWorld(true) }
  }
  return { ...real, WebGLRenderer: Renderer }
})
vi.mock('three/addons/loaders/GLTFLoader.js', async () => {
  const T = await import('three')
  return { GLTFLoader: class {
    async loadAsync(url: string) {
      const root = new T.Group()
      if (url.includes('left-rock') || url.includes('right-rock') || url === 'coral') return { scene: root, animations: [] }
      const bone = new T.Bone(); bone.name = 'spine_0'; root.add(bone)
      const geometry = new T.BufferGeometry()
      geometry.setAttribute('position', new T.Float32BufferAttribute([-.2, 0, 0, .2, 0, 0, 0, .2, 0], 3))
      geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Array(12).fill(0), 4))
      geometry.setAttribute('skinWeight', new T.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4)); geometry.setIndex([0, 1, 2])
      const mesh = new T.SkinnedMesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide })); root.add(mesh)
      root.updateMatrixWorld(true); mesh.bind(new T.Skeleton([bone]))
      const end = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), .7)
      const clip = new T.AnimationClip('fixture-swim', 1, [new T.QuaternionKeyframeTrack('spine_0.quaternion', [0, 1], [0, 0, 0, 1, ...end.toArray()])])
      state.sources.push(root)
      return { scene: root, animations: [clip] }
    }
  } }
})
vi.mock('./reef-assembly', () => ({
  LIVE_ROCK_ISLAND_URLS: { left: 'left-rock', right: 'right-rock' }, MODULAR_CORAL_ASSET_URLS: { fixture: 'coral' },
  DEFAULT_LEFT_ISLAND_MOUNTS: [], DEFAULT_RIGHT_ISLAND_MOUNTS: [],
  assembleCoralsOnRockSockets: () => ({ update() {} }), instantiateModularReefHabitat: () => ({ obstacles: [], anchors: [] }),
}))
vi.mock('./motion', async importOriginal => {
  const real = await importOriginal<typeof import('./motion')>()
  return { ...real, createSwimmingFish: (...args: Parameters<typeof real.createSwimmingFish>) => {
    if (args[0] === state.throwCreateForId) { state.beforeCreateFailure?.(); throw Error('Fixture extension setup failed') }
    const fish = real.createSwimmingFish(args[0], args[1] === 'artwork-fixture' ? 'ocellaris-clownfish' : args[1], ...args.slice(2) as [typeof args[2], typeof args[3], typeof args[4]])
    vi.spyOn(fish.extensions, 'dispose'); state.created.push(fish); return fish
  } }
})
vi.mock('./fish-animation', async importOriginal => {
  const real = await importOriginal<typeof import('./fish-animation')>()
  return { ...real, createFishClipPlayer: (...args: Parameters<typeof real.createFishClipPlayer>) => {
    const player = real.createFishClipPlayer(...args), owned = { ...player, dispose: vi.fn(() => player.dispose()) }
    state.players.push(owned); return owned
  } }
})
vi.mock('./fish-spawn', async importOriginal => {
  const real = await importOriginal<typeof import('./fish-spawn')>()
  return { ...real, findSafeFishSpawn: (...args: Parameters<typeof real.findSafeFishSpawn>) => state.blockedSpawn ? undefined : real.findSafeFishSpawn(...args) }
})
vi.mock('../../lib/fish', async importOriginal => {
  const real = await importOriginal<typeof import('../../lib/fish')>()
  return { ...real, getFishById: (id: string) => id === 'artwork-fixture' ? { ...real.REEF_FISH[0], id } : real.getFishById(id) }
})

const service = (id: string, fishId = 'ocellaris-clownfish'): ServiceConfig => ({ id, fishId, name: id, url: `https://${id}.example.test`, isExample: false })
let controller: AquariumController, host: HTMLDivElement, overlay: HTMLDivElement, status: ReturnType<typeof vi.fn<(value: SceneStatus) => void>>
function anchors(services: ServiceConfig[]) {
  const old = new Map([...overlay.querySelectorAll<HTMLAnchorElement>('a')].map(a => [a.dataset.serviceId!, a]))
  const next = services.map(s => {
    const a = old.get(s.id) ?? document.createElement('a'); a.dataset.serviceId = s.id; a.href = s.url
    a.title = `${s.name} · ${getFishById(s.fishId)?.commonName}`; a.setAttribute('aria-label', `Open ${s.name} in a new tab`)
    const label = document.createElement('span'); label.className = 'fish-name'; label.textContent = s.name; a.replaceChildren(label); return a
  })
  overlay.replaceChildren(...next)
}
function rootFor(id: string): THREE.Group {
  return state.renderer!.scene!.children.find(object => object instanceof THREE.Group && object.children.some(child => {
    let matches = false; child.traverse(node => { if (node.userData.serviceId === id) matches = true }); return matches
  })) as THREE.Group
}
function meshFor(id: string): THREE.SkinnedMesh { let mesh!: THREE.SkinnedMesh; rootFor(id).traverse(n => { if (n instanceof THREE.SkinnedMesh) mesh = n }); return mesh }
function update(services: ServiceConfig[]) { anchors(services); controller.update(services, false) }
async function start(services = [service('first'), service('second', 'yellow-tang')]) {
  anchors(services); controller = createAquarium(host.querySelector('canvas')!, overlay, services, false, status)
  await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ready'))
}
function advance() { state.renderer!.loop?.(0); state.renderer!.loop?.(50) }

beforeEach(() => {
  state.created = []; state.players = []; state.sources = []; state.textures = []; state.blockedSpawn = false; state.throwCreateForId = ''; state.beforeCreateFailure = undefined
  vi.stubGlobal('devicePixelRatio', 1)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, _loaded, _progress, error) => {
    const texture = new THREE.Texture(document.createElement('img')); vi.spyOn(texture, 'dispose'); state.textures.push({ texture, load: () => _loaded?.(texture), error }); return texture
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
  host = document.createElement('div'); Object.defineProperties(host, { clientWidth: { value: 1440 }, clientHeight: { value: 900 } })
  host.innerHTML = '<canvas></canvas><div></div>'; overlay = host.querySelector('div')!; document.body.append(host); status = vi.fn()
})
afterEach(() => { controller?.dispose(); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('actual aquarium controller inhabitant lifecycle without WebGL', () => {
  it('preserves live roots, motion, routes and clip phase through name/URL edits and reorder', async () => {
    await start()
    const initialPosition = { ...state.created[0].position }, initialQuaternion = meshFor('first').skeleton.bones[0].quaternion.toArray()
    advance()
    const first = state.created[0], second = state.created[1], root = rootFor('first'), mesh = meshFor('first'), player = state.players[0]
    expect(first.speed).toBeGreaterThan(0); expect(first.position).not.toEqual(initialPosition)
    expect(mesh.skeleton.bones[0].quaternion.toArray()).not.toEqual(initialQuaternion)
    const saved = { position: { ...first.position }, speed: first.speed, route: first.route, random: first.random, quaternion: mesh.skeleton.bones[0].quaternion.toArray() }
    const edited = { ...service('first'), name: 'Latest name', url: 'https://new.example.test' }
    update([service('second', 'yellow-tang'), edited])
    expect(state.created).toHaveLength(2); expect(rootFor('first')).toBe(root); expect(state.players).toHaveLength(2); expect(state.players[0]).toBe(player); expect(player.dispose).not.toHaveBeenCalled()
    expect(first.position).toEqual(saved.position); expect(first.speed).toBe(saved.speed); expect(first.route).toBe(saved.route); expect(first.random).toBe(saved.random)
    expect(mesh.skeleton.bones[0].quaternion.toArray()).toEqual(saved.quaternion)
    expect(first.extensions.dispose).not.toHaveBeenCalled(); expect(second.extensions.dispose).not.toHaveBeenCalled()
    const anchor = overlay.querySelector<HTMLAnchorElement>('[data-service-id="first"]')!
    expect(anchor.href).toBe(edited.url + '/'); expect(anchor.title).toContain('Latest name'); expect(anchor.getAttribute('aria-label')).toContain('Latest name')
  })
  it('adds only the new fish and removes/replaces only the targeted private resources', async () => {
    await start(); advance()
    const first = state.created[0], firstRoot = rootFor('first'), second = state.created[1], secondMesh = meshFor('second')
    const firstPose = { ...first.position }, firstSpeed = first.speed, firstRoute = first.route
    const skeletonDispose = vi.spyOn(secondMesh.skeleton, 'dispose'), sharedGeometryDispose = vi.spyOn(secondMesh.geometry, 'dispose')
    update([service('first'), service('second', 'yellow-tang'), service('third', 'royal-gramma')])
    expect(state.created).toHaveLength(3); expect(rootFor('first')).toBe(firstRoot); expect(first.extensions.dispose).not.toHaveBeenCalled()
    expect(first.position).toEqual(firstPose); expect(first.speed).toBe(firstSpeed); expect(first.route).toBe(firstRoute)
    update([service('first'), service('third', 'royal-gramma')])
    expect(second.extensions.dispose).toHaveBeenCalledTimes(1); expect(state.players[1].dispose).toHaveBeenCalledTimes(1); expect(state.players[0].dispose).not.toHaveBeenCalled(); expect(skeletonDispose).toHaveBeenCalledTimes(1); expect(sharedGeometryDispose).not.toHaveBeenCalled()
    expect(rootFor('second')).toBeUndefined(); expect(rootFor('first')).toBe(firstRoot)
    update([service('first', 'blue-tang'), service('third', 'royal-gramma')])
    expect(first.extensions.dispose).toHaveBeenCalledTimes(1); expect(rootFor('first')).not.toBe(firstRoot); expect(state.created).toHaveLength(4)
  })
  it('retains prior fish on a true no-fit update and reuses them when configuration fits again', async () => {
    await start(); advance(); const prior = state.created[0], root = rootFor('first'), pose = { ...prior.position }
    state.blockedSpawn = true; update([service('first'), service('second', 'yellow-tang'), service('new')])
    expect(status).toHaveBeenLastCalledWith('failed'); expect(state.renderer!.loop).toBeNull(); expect(state.created).toHaveLength(2)
    expect(rootFor('first')).toBe(root); expect(prior.position).toEqual(pose); expect(prior.extensions.dispose).not.toHaveBeenCalled()
    state.blockedSpawn = false; update([service('first'), service('second', 'yellow-tang')])
    expect(status).toHaveBeenLastCalledWith('ready'); expect(state.renderer!.loop).not.toBeNull(); expect(rootFor('first')).toBe(root); expect(state.created).toHaveLength(2)
  })
  it('cleans newly created entries on a later creation error without retiring surviving fish', async () => {
    await start(); const root = rootFor('first'); state.throwCreateForId = 'bad'
    let newSkeletonDispose: ReturnType<typeof vi.fn> | undefined, sharedGeometryDispose: ReturnType<typeof vi.fn> | undefined
    state.beforeCreateFailure = () => {
      const mesh = meshFor('new')
      newSkeletonDispose = vi.spyOn(mesh.skeleton, 'dispose'); sharedGeometryDispose = vi.spyOn(mesh.geometry, 'dispose')
    }
    update([service('first'), service('new'), service('bad')])
    expect(status).toHaveBeenLastCalledWith('failed'); expect(rootFor('first')).toBe(root); expect(rootFor('new')).toBeUndefined()
    expect(state.created[0].extensions.dispose).not.toHaveBeenCalled(); expect(state.created[2].extensions.dispose).toHaveBeenCalledTimes(1)
    expect(state.players[2].dispose).toHaveBeenCalledTimes(1); expect(newSkeletonDispose).toHaveBeenCalledTimes(1); expect(sharedGeometryDispose).not.toHaveBeenCalled()
    state.throwCreateForId = ''; update([service('first')]); expect(status).toHaveBeenLastCalledWith('ready'); expect(rootFor('first')).toBe(root)
  })
  it('refreshes a focused native anchor without changing its focus or error fallback semantics', async () => {
    await start([service('first')])
    const anchor = overlay.querySelector<HTMLAnchorElement>('a')!; anchor.focus()
    const item = { service: service('first'), anchor, fallback: true, artworkUnavailable: true }
    refreshFishLink(item, { ...service('first'), name: 'Focused latest', url: 'https://focus.example.test' }, anchor)
    expect(document.activeElement).toBe(anchor); expect(anchor.href).toBe('https://focus.example.test/')
    expect(anchor.dataset.artworkError).toBe('true'); expect(anchor.getAttribute('aria-label')).toContain('Focused latest')
    expect(anchor.title).toContain('thumbnail unavailable')
  })
  it('ignores old artwork callbacks while a no-fit replacement retains its resources', async () => {
    await start([service('art', 'artwork-fixture')]); const pending = state.textures[0]
    state.blockedSpawn = true
    const next = { ...service('art', 'ocellaris-clownfish'), name: 'Replacement', url: 'https://replacement.example.test' }
    update([next]); expect(status).toHaveBeenLastCalledWith('failed')
    const anchor = overlay.querySelector<HTMLAnchorElement>('a')!, title = anchor.title
    pending.error?.(Error('old species failed')); pending.load?.()
    expect(anchor.title).toBe(title); expect(anchor.href).toBe(next.url + '/'); expect(anchor.hasAttribute('data-artwork-error')).toBe(false)
    expect(pending.texture.dispose).not.toHaveBeenCalled()
    state.blockedSpawn = false; update([{ ...next, name: 'Fitting replacement' }])
    expect(status).toHaveBeenLastCalledWith('ready'); expect(pending.texture.dispose).toHaveBeenCalledTimes(1)
  })
  it('uses current metadata for delayed artwork failure and ignores callbacks from a removed generation', async () => {
    await start([service('art', 'artwork-fixture')]); const old = state.textures[0]
    update([{ ...service('art', 'artwork-fixture'), name: 'Renamed artwork', url: 'https://renamed.example.test' }])
    old.error?.(Error('blocked image'))
    const anchor = overlay.querySelector<HTMLAnchorElement>('a')!
    expect(anchor.title).toContain('Renamed artwork'); expect(anchor.getAttribute('aria-label')).toContain('thumbnail unavailable'); expect(anchor.href).toBe('https://renamed.example.test/')
    update([]); expect(old.texture.dispose).toHaveBeenCalledTimes(1)
    update([service('art', 'artwork-fixture')]); const replacement = overlay.querySelector<HTMLAnchorElement>('a')!
    old.error?.(Error('late stale error')); old.load?.()
    expect(replacement.hasAttribute('data-artwork-error')).toBe(false); expect(replacement.title).not.toContain('unavailable')
    expect(old.texture.dispose).toHaveBeenCalledTimes(1)
  })
})
