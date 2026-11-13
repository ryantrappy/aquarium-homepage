// @vitest-environment happy-dom
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceConfig } from '../../lib/services'
import { getFishById } from '../../lib/fish'
import type { SwimmingFish } from './motion'
import type { FishClipPlayer } from './fish-animation'
import { refreshFishLink } from './fish-inhabitants'
import { createAquarium, type AquariumController, type SceneStatus } from './aquarium'
import type { FishExtensionConfig, FishExtensionSnapshot } from '../../simulation/fish-extensions'

const state = vi.hoisted(() => ({
  renderer: undefined as undefined | { scene?: import('three').Scene; loop: ((time: number) => void) | null; pixelRatio: number; info: { autoReset: boolean; render: { calls: number; triangles: number; points: number; lines: number }; memory: { geometries: number; textures: number }; reset(): void } },
  created: [] as SwimmingFish[], players: [] as FishClipPlayer[], sources: [] as import('three').Group[],
  textures: [] as { texture: import('three').Texture; load?: () => void; error?: (error: unknown) => void }[],
  deferFishLoads: false, failFishLoads: false, pendingFishLoadReleases: [] as Array<() => void>, resizeCallback: undefined as undefined | (() => void),
  deferMeshNavigation: false, pendingMeshNavigationReleases: [] as Array<() => void>, meshNavigationResult: undefined as unknown,
  blockedSpawn: false, throwCreateForId: '', beforeCreateFailure: undefined as (() => void) | undefined,
  forceLabelExposure: false,
}))
vi.mock('three', async importOriginal => {
  const real = await importOriginal<typeof import('three')>()
  class Renderer {
    shadowMap = { enabled: false, type: 0 }; scene?: THREE.Scene; loop: ((time: number) => void) | null = null; pixelRatio = 1
    info = { autoReset: true, render: { calls: 0, triangles: 0, points: 0, lines: 0 }, memory: { geometries: 0, textures: 0 }, reset() { this.render = { calls: 0, triangles: 0, points: 0, lines: 0 } } }
    constructor() { state.renderer = this }
    setPixelRatio(value: number) { this.pixelRatio = value } getPixelRatio() { return this.pixelRatio } setSize() {} dispose() {} forceContextLoss() {}
    setAnimationLoop(loop: ((time: number) => void) | null) { this.loop = loop }
    render(scene: THREE.Scene, camera: THREE.Camera) { this.scene = scene; camera.updateMatrixWorld(true); if (this.info.autoReset) this.info.reset(); this.info.render.calls++; this.info.render.triangles += 12; this.info.memory.geometries = scene.children.length; this.info.memory.textures = 3 }
  }
  return { ...real, WebGLRenderer: Renderer }
})
vi.mock('three/addons/loaders/GLTFLoader.js', async () => {
  const T = await import('three')
  return { GLTFLoader: class {
    async loadAsync(url: string) {
      const root = new T.Group()
      if (url.includes('left-rock') || url.includes('right-rock') || url === 'coral') return { scene: root, animations: [] }
      if (state.failFishLoads && url.includes('.glb')) throw new Error('Fixture fish asset failure')
      if (state.deferFishLoads && url.includes('.glb')) await new Promise<void>(resolve => state.pendingFishLoadReleases.push(resolve))
      const turningRig = url.includes('splat-fish/blue-tang.glb')
      const spine: InstanceType<typeof T.Bone>[] = []
      for (let index = 0; index < (turningRig ? 6 : 1); index++) {
        const bone = new T.Bone(); bone.name = `spine_${index}`
        if (index > 0) spine[index - 1]!.add(bone)
        else root.add(bone)
        spine.push(bone)
      }
      const pectoralLeft = new T.Bone(), pectoralRight = new T.Bone()
      if (turningRig) {
        pectoralLeft.name = 'pectoral_L'; pectoralRight.name = 'pectoral_R'
        root.add(pectoralLeft, pectoralRight)
      }
      const geometry = new T.BufferGeometry()
      geometry.setAttribute('position', new T.Float32BufferAttribute([-.2, 0, 0, .2, 0, 0, 0, .2, 0], 3))
      geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Array(12).fill(0), 4))
      geometry.setAttribute('skinWeight', new T.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4)); geometry.setIndex([0, 1, 2])
      const mesh = new T.SkinnedMesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide })); root.add(mesh)
      const bones = turningRig ? [...spine, pectoralLeft, pectoralRight] : spine
      root.updateMatrixWorld(true); mesh.bind(new T.Skeleton(bones))
      const end = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), .7)
      const tracks = [new T.QuaternionKeyframeTrack('spine_0.quaternion', [0, 1], [0, 0, 0, 1, ...end.toArray()])]
      if (turningRig) {
        const tailEnd = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), .24)
        const finEnd = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), .36)
        tracks.push(
          new T.QuaternionKeyframeTrack('spine_5.quaternion', [0, 1], [0, 0, 0, 1, ...tailEnd.toArray()]),
          new T.QuaternionKeyframeTrack('pectoral_L.quaternion', [0, 1], [0, 0, 0, 1, ...finEnd.toArray()]),
          new T.QuaternionKeyframeTrack('pectoral_R.quaternion', [0, 1], [0, 0, 0, 1, ...finEnd.toArray()]),
        )
      }
      const clip = new T.AnimationClip('fixture-swim', 1, tracks)
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
vi.mock('./reef-mesh-navigation', async importOriginal => {
  const real = await importOriginal<typeof import('./reef-mesh-navigation')>()
  return {
    ...real,
    createReefMeshNavigation: (...args: Parameters<typeof real.createReefMeshNavigation>) => state.deferMeshNavigation
      ? new Promise<Awaited<ReturnType<typeof real.createReefMeshNavigation>>>(resolve => {
          state.pendingMeshNavigationReleases.push(() => resolve(state.meshNavigationResult as Awaited<ReturnType<typeof real.createReefMeshNavigation>>))
        })
      : real.createReefMeshNavigation(...args),
  }
})
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
  return {
    ...real,
    fishSpawnPreference: (id: string, speciesId: string, ...args: Parameters<typeof real.fishSpawnPreference> extends [string, string, ...infer Rest] ? Rest : never) =>
      real.fishSpawnPreference(id, speciesId === 'artwork-fixture' ? 'ocellaris-clownfish' : speciesId, ...args),
    findSafeFishSpawn: (...args: Parameters<typeof real.findSafeFishSpawn>) => state.blockedSpawn ? undefined : real.findSafeFishSpawn(...args),
  }
})
vi.mock('./fish-link-focus', async importOriginal => {
  const real = await importOriginal<typeof import('./fish-link-focus')>()
  return { ...real, applyFishLinkVisibility: (...args: Parameters<typeof real.applyFishLinkVisibility>) =>
    real.applyFishLinkVisibility(args[0], state.forceLabelExposure || args[1], args[2]) }
})
vi.mock('../../lib/fish', async importOriginal => {
  const real = await importOriginal<typeof import('../../lib/fish')>()
  return { ...real, getFishById: (id: string) => id === 'artwork-fixture' ? { ...real.REEF_FISH[0], id } : real.getFishById(id) }
})

const service = (id: string, fishId = 'ocellaris-clownfish'): ServiceConfig => ({ id, fishId, name: id, url: `https://${id}.example.test`, isExample: false })
let controller: AquariumController, host: HTMLDivElement, overlay: HTMLDivElement, status: ReturnType<typeof vi.fn<(value: SceneStatus) => void>>
let documentHidden = false
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
async function start(services = [service('first'), service('second', 'yellow-tang')], fishExtensions?: FishExtensionConfig) {
  anchors(services)
  controller = fishExtensions
    ? createAquarium(host.querySelector('canvas')!, overlay, services, false, status, () => null, fishExtensions)
    : createAquarium(host.querySelector('canvas')!, overlay, services, false, status)
  await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ready'))
}
function advance() { state.renderer!.loop?.(0); state.renderer!.loop?.(50) }
function spriteAlphaAt(texture: THREE.DataTexture, fx: number, fy: number): number {
  const image = texture.image as { width: number; height: number; data: Uint8Array }
  const x = Math.min(image.width - 1, Math.max(0, Math.floor((fx * 0.5 + 0.5) * image.width)))
  const y = Math.min(image.height - 1, Math.max(0, Math.floor((fy * 0.5 + 0.5) * image.height)))
  return image.data[(y * image.width + x) * 4 + 3]!
}

beforeEach(() => {
  documentHidden = false
  state.created = []; state.players = []; state.sources = []; state.textures = []; state.blockedSpawn = false; state.throwCreateForId = ''; state.beforeCreateFailure = undefined
  state.deferFishLoads = false; state.failFishLoads = false; state.pendingFishLoadReleases = []; state.resizeCallback = undefined
  state.deferMeshNavigation = false; state.pendingMeshNavigationReleases = []; state.meshNavigationResult = undefined
  state.forceLabelExposure = false
  vi.stubGlobal('devicePixelRatio', 1)
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { state.resizeCallback = callback } observe() {} disconnect() {} })
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden)
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, _loaded, _progress, error) => {
    const texture = new THREE.Texture(document.createElement('img')); vi.spyOn(texture, 'dispose'); state.textures.push({ texture, load: () => _loaded?.(texture), error }); return texture
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
  host = document.createElement('div'); Object.defineProperties(host, { clientWidth: { configurable: true, value: 1440 }, clientHeight: { configurable: true, value: 900 } })
  host.innerHTML = '<canvas></canvas><div></div>'; overlay = host.querySelector('div')!; document.body.append(host); status = vi.fn()
})
afterEach(() => { controller?.dispose(); delete window.__AQUARIUM_LOOKDEV__; window.history.replaceState({}, '', '/'); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('actual aquarium controller inhabitant lifecycle without WebGL', () => {
  it('holds capture readiness until the application finishes loading saved configuration', async () => {
    window.history.replaceState({}, '', '/?lookdev=1')
    const services = [service('config-pending')]
    anchors(services)
    controller = createAquarium(host.querySelector('canvas')!, overlay, services, false, status, undefined, undefined, undefined, false)
    await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ready'))
    const bridge = window.__AQUARIUM_LOOKDEV__!
    let resolved = false
    const ready = bridge.ready().then(snapshot => { resolved = true; return snapshot })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(resolved).toBe(false)
    expect(bridge.state().ready).toBe(false)
    controller.update(services, false, true)
    expect((await ready).ready).toBe(true)
    const samples = bridge.state().inhabitants
    expect(samples.filter(sample => !sample.schoolmate).map(sample => sample.id).sort()).toEqual(services.map(service => service.id).sort())
    for (const sample of samples) {
      const live = state.created.slice().reverse().find(fish => fish.id === sample.id)!
      expect(sample.position).toEqual(live.position)
      expect(sample.position).not.toBe(live.position)
      expect(sample.heightRange).not.toBeNull()
      expect(sample.position.y).toBeGreaterThanOrEqual(sample.heightRange![0])
      expect(sample.position.y).toBeLessThanOrEqual(sample.heightRange![1])
    }
  })

  it('stages the same final look-dev roster whether saved services arrive early or late', async () => {
    window.history.replaceState({}, '', '/?lookdev=1&seed=61')
    const final = [service('early-a'), service('early-b', 'yellow-tang'), service('late-c', 'royal-gramma')]
    const poses = () => final.map(service => ({
      id: service.id,
      position: { ...state.created.slice().reverse().find(fish => fish.id === service.id)!.position },
    }))
    await start(final.slice(0, 2))
    await window.__AQUARIUM_LOOKDEV__!.ready()
    update(final)
    await window.__AQUARIUM_LOOKDEV__!.ready()
    const lateArrival = poses()

    controller.dispose()
    state.created = []
    status.mockClear()
    await start(final)
    await window.__AQUARIUM_LOOKDEV__!.ready()
    expect(poses()).toEqual(lateArrival)
  })

  it.each([[1440, 900], [402, 874]])('keeps final roster spawns in their ecological bands across the %ix%i water column', async (width, height) => {
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: width })
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: height })
    window.history.replaceState({}, '', '/?lookdev=1&seed=2026')
    await start([
      service('a-gramma', 'royal-gramma'), service('b-yellow', 'yellow-tang'),
      service('c-blue', 'blue-tang'), service('d-clown'),
      service('e-cardinal', 'banggai-cardinalfish'), service('f-wrasse', 'mccoskers-flasher-wrasse'),
      service('g-butterfly', 'copperband-butterflyfish'), service('h-anthias', 'lyretail-anthias'),
    ])
    const snapshot = await window.__AQUARIUM_LOOKDEV__!.ready()
    const leaders = snapshot.inhabitants.filter(fish => !fish.schoolmate)
    expect(leaders).toHaveLength(8)
    for (const fish of snapshot.inhabitants) {
      expect(fish.heightRange).not.toBeNull()
      expect(fish.position.y).toBeGreaterThanOrEqual(fish.heightRange![0] - 1e-9)
      expect(fish.position.y).toBeLessThanOrEqual(fish.heightRange![1] + 1e-9)
    }
    const heights = leaders.map(fish => fish.position.y)
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(2.5)
    expect(leaders.find(fish => fish.speciesId === 'royal-gramma')!.position.y).toBeLessThan(-0.75)
    expect(new Set(leaders.map(fish => fish.position.z.toFixed(1))).size).toBeGreaterThanOrEqual(2)
  })

  it('loads a later visible species while an off-screen species stays queued', async () => {
    const idleCallbacks: IdleRequestCallback[] = []
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
      idleCallbacks.push(callback)
      return idleCallbacks.length
    })
    const services = [
      service('clown'), service('tang', 'yellow-tang'), service('gramma', 'royal-gramma'),
      service('offscreen', 'mandarin-dragonet'), service('visible', 'lyretail-anthias'),
    ]
    await start(services)
    const offscreen = state.created.find(fish => fish.id === 'offscreen')!
    offscreen.position = { ...offscreen.position, x: 100 }
    controller.update(services, true)
    for (const callback of idleCallbacks.splice(0)) callback({ didTimeout: false, timeRemaining: () => 10 })
    await vi.waitFor(() => expect(state.sources).toHaveLength(4))
    await vi.waitFor(() => expect(state.players).toHaveLength(state.created.length - 1))
    let offscreenHasModel = false
    rootFor('offscreen').traverse(node => { if (node instanceof THREE.SkinnedMesh) offscreenHasModel = true })
    expect(offscreenHasModel).toBe(false)
  })

  it('samples a distant fish less often without halving its animation clock', async () => {
    const services = [service('far')]
    await start(services)
    const fish = state.created[0]!
    fish.position = { ...fish.position, z: -3.5 }
    controller.update(services, true) // Publish the far pose and evaluate LOD while stopped.
    controller.update(services, false)
    const player = state.players[0]!, originalAdvance = player.advance
    const sampledSeconds: number[] = []
    vi.spyOn(player, 'advance').mockImplementation(delta => {
      const rate = (.55 + Math.min(1.7, fish.speed * 2.2)) * fish.animationPlaybackRate
      sampledSeconds.push(delta / rate)
      originalAdvance(delta)
    })
    state.renderer!.loop?.(0)
    state.renderer!.loop?.(100)
    expect(sampledSeconds).toHaveLength(3)
    for (const delta of sampledSeconds) expect(delta).toBeCloseTo(2 / 60)
    expect(sampledSeconds.reduce((sum, delta) => sum + delta, 0)).toBeCloseTo(0.1)
  })

  it('freezes fish motion, swim clips and turn poses under a live reduced-motion toggle without catch-up', async () => {
    let reducedMotion = false
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return reducedMotion },
      addEventListener() {},
      removeEventListener() {},
    }))
    const services = [service('tang', 'blue-tang')]
    await start(services)
    await vi.waitFor(() => expect(state.players).toHaveLength(1))

    const fish = state.created[0]!
    const player = state.players[0]!
    const root = rootFor('tang')
    const mesh = meshFor('tang')
    const bones = new Map(mesh.skeleton.bones.map(bone => [bone.name, bone]))
    expect(bones.has('spine_5')).toBe(true)
    expect(bones.has('pectoral_L')).toBe(true)
    expect(bones.has('pectoral_R')).toBe(true)

    // Force a large heading change in the actual controller fixture so the
    // resumed pose contains both a swim clip and a turn-rig overlay.
    const origin = { ...fish.position }
    fish.yaw = 0
    fish.speed = 0.4
    fish.route = [origin, { x: origin.x - 1.5, y: origin.y, z: origin.z }]
    fish.waypoint = 1
    fish.targetWait = 0
    fish.routeGeneration = fish.behavior.navigationGeneration
    state.renderer!.loop?.(0)
    state.renderer!.loop?.(100)
    expect(fish.position).not.toEqual(origin)
    expect(Math.abs(fish.turnKinematics.turnCurvature)).toBeGreaterThan(0)
    const turnPose = bones.get('spine_5')!.quaternion.clone()
    const finPose = bones.get('pectoral_L')!.quaternion.clone()
    expect(turnPose.angleTo(new THREE.Quaternion())).toBeGreaterThan(0.01)
    expect(finPose.angleTo(new THREE.Quaternion())).toBeGreaterThan(0.01)

    const movingPose = {
      position: { ...fish.position },
      yaw: fish.yaw,
      pitch: fish.pitch,
      bank: fish.bank,
      speed: fish.speed,
      turnKinematics: { ...fish.turnKinematics },
      spine: bones.get('spine_5')!.quaternion.toArray(),
      leftPectoral: bones.get('pectoral_L')!.quaternion.toArray(),
      rightPectoral: bones.get('pectoral_R')!.quaternion.toArray(),
    }
    const originalAdvance = player.advance
    const advanceSpy = vi.spyOn(player, 'advance').mockImplementation(delta => originalAdvance(delta))

    reducedMotion = true
    state.renderer!.loop?.(300)
    state.renderer!.loop?.(800)
    expect({
      position: fish.position,
      yaw: fish.yaw,
      pitch: fish.pitch,
      bank: fish.bank,
      speed: fish.speed,
      turnKinematics: fish.turnKinematics,
      spine: bones.get('spine_5')!.quaternion.toArray(),
      leftPectoral: bones.get('pectoral_L')!.quaternion.toArray(),
      rightPectoral: bones.get('pectoral_R')!.quaternion.toArray(),
    }).toEqual(movingPose)
    expect(advanceSpy).not.toHaveBeenCalled()

    reducedMotion = false
    state.renderer!.loop?.(800)
    expect(fish.position).toEqual(movingPose.position)
    expect(advanceSpy).not.toHaveBeenCalled()
    state.renderer!.loop?.(850)
    expect(fish.position).not.toEqual(movingPose.position)
    expect(advanceSpy).toHaveBeenCalledTimes(3)
    expect(rootFor('tang')).toBe(root)
  })

  it('drives the actual water-surface clock through active, paused, reduced-motion, and hidden states', async () => {
    let reducedMotion = false
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return reducedMotion },
      addEventListener() {},
      removeEventListener() {},
    }))
    const services = [service('surface-clock')]
    await start(services)

    const surface = state.renderer!.scene!.getObjectByName('AquariumWaterSurface') as THREE.Mesh
    const surfaceMaterial = surface.material as THREE.ShaderMaterial
    const surfaceTime = () => surfaceMaterial.uniforms.uTime.value as number
    expect(surface).toBeInstanceOf(THREE.Mesh)
    expect(surfaceTime()).toBe(0)

    state.renderer!.loop?.(0)
    state.renderer!.loop?.(100)
    const activeTime = surfaceTime()
    expect(activeTime).toBeGreaterThan(0)

    // Hidden scenes stop drawing, so the last visible surface phase is held.
    documentHidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect(state.renderer!.loop).toBeNull()
    expect(surfaceTime()).toBe(activeTime)
    documentHidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    state.renderer!.loop?.(5000) // First frame resets the suspended clock.
    expect(surfaceTime()).toBe(activeTime)
    state.renderer!.loop?.(5050)
    expect(surfaceTime()).toBeGreaterThan(activeTime)
    expect(surfaceTime()).toBeLessThan(activeTime + 0.1)

    const beforePauseTime = surfaceTime()
    controller.update(services, true)
    expect(surfaceTime()).toBe(0)
    controller.update(services, false)
    state.renderer!.loop?.(5100) // Resume without consuming the paused wall-clock gap.
    expect(surfaceTime()).toBe(0)
    state.renderer!.loop?.(5150)
    expect(surfaceTime()).toBeCloseTo(beforePauseTime + 0.05)

    reducedMotion = true
    state.renderer!.loop?.(5200)
    state.renderer!.loop?.(5250)
    expect(surfaceTime()).toBe(0)
    reducedMotion = false
    state.renderer!.loop?.(5250)
    expect(surfaceTime()).toBe(0)
    state.renderer!.loop?.(5300)
    expect(surfaceTime()).toBeCloseTo(beforePauseTime + 0.1)
  })

  it('upgrades every schoolmate when its shared lazy-loaded species arrives', async () => {
    window.history.replaceState({}, '', '/?lookdev=1&seed=23')
    await start([
      service('clown'), service('tang', 'yellow-tang'),
      service('gramma', 'royal-gramma'), service('school', 'blue-green-chromis'),
    ])
    await vi.waitFor(() => expect(state.sources).toHaveLength(4))
    expect(state.created.length).toBeGreaterThan(4)
    await vi.waitFor(() => expect(state.players).toHaveLength(state.created.length))
    expect((await window.__AQUARIUM_LOOKDEV__!.ready()).unresolvedFishIds).toEqual([])
  })

  it('freezes a DEV look-dev scene at the configured seed/time and resets stats after preset, subject, and time changes', async () => {
    window.history.replaceState({}, '', '/?lookdev=1&seed=43&time=7.25&preset=fish-macro&subject=capture&labels=off')
    await start([service('capture')])
    const bridge = window.__AQUARIUM_LOOKDEV__!
    const ready = await bridge.ready()
    expect(ready.ready).toBe(true)
    expect(ready.seed).toBe(43)
    expect(ready.timeSeconds).toBe(7.25)
    expect(ready.preset).toBe('fish-macro')
    expect(ready.viewport).toMatchObject({ width: 1440, height: 900, devicePixelRatio: 1 })
    expect(ready.renderer.render.calls).toBeGreaterThan(0)
    expect(overlay.querySelector('.fish-name')?.getAttribute('style')).toContain('visibility: hidden')
    // Exercise the normal exposure writer for a visible fish, rather than
    // relying on the mock triangle's raycast visibility in this fixture.
    state.forceLabelExposure = true
    bridge.renderFrozen()
    expect(overlay.querySelector('a')?.dataset.occluded).toBe('false')
    expect(overlay.querySelector('.fish-name')?.getAttribute('style')).toContain('visibility: hidden')

    const fish = state.created.slice().reverse().find(fish => fish.id === 'capture')!
    const startPosition = { ...fish.position }
    const startBone = meshFor('capture').skeleton.bones[0]!.quaternion.clone()
    expect(fish.yaw).toBeCloseTo(Math.PI / 2)
    advance()
    expect(fish.position).toEqual(startPosition)
    expect(fish.yaw).toBeCloseTo(Math.PI / 2)

    expect(bridge.setTime(0.6)).toBe(true)
    expect(bridge.state().ready).toBe(true)
    expect(bridge.state().timing.rafInterval).toBeNull()
    expect(meshFor('capture').skeleton.bones[0]!.quaternion.angleTo(startBone)).toBeGreaterThan(0.01)
    const fishMacro = controller.getCameraZoom()
    expect(bridge.setPreset('coral-macro').preset).toBe('coral-macro')
    expect(controller.getCameraZoom().targetX).not.toBe(fishMacro.targetX)
    expect(bridge.state().timing.rafInterval).toBeNull()
    expect(bridge.setSubject('missing')).toBe(false)
    expect(bridge.setSubject(undefined)).toBe(true)
    expect(bridge.state().timing.rafInterval).toBeNull()
    expect(bridge.setPreset('rock-sand-contact').preset).toBe('rock-sand-contact')
    expect(bridge.setTime(Number.NaN)).toBe(false)
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 402 })
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 874 })
    state.resizeCallback?.()
    expect(bridge.state().viewport).toMatchObject({ width: 402, height: 874, devicePixelRatio: 1 })
    await bridge.ready()
    expect(bridge.state().ready).toBe(true)
    expect(bridge.state().timing.rafInterval).toBeNull()
    const frozen = bridge.renderFrozen()
    expect(frozen.timing.frozenPoseRenderCall?.sampleCount).toBe(1)

    const canvas = host.querySelector('canvas')!
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    expect(bridge.state().ready).toBe(false)
    expect(state.renderer!.loop).toBeNull()
    const restoredReady = bridge.ready()
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect((await restoredReady).ready).toBe(true)
  })

  it('does not resolve look-dev readiness until queued fish assets finish and are integrated', async () => {
    state.deferFishLoads = true
    window.history.replaceState({}, '', '/?lookdev=1&seed=11')
    anchors([service('pending')])
    controller = createAquarium(host.querySelector('canvas')!, overlay, [service('pending')], false, status)
    const bridge = window.__AQUARIUM_LOOKDEV__!
    const readyPromise = bridge.ready()
    await vi.waitFor(() => expect(state.pendingFishLoadReleases.length).toBeGreaterThan(0))
    expect(bridge.state().ready).toBe(false)
    expect(bridge.state().pendingAssetCount).toBeGreaterThan(0)
    for (const release of state.pendingFishLoadReleases.splice(0)) release()
    await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ready'))
    expect((await readyPromise).ready).toBe(true)
    expect(bridge.state().pendingAssetCount).toBe(0)
    expect(bridge.state().unresolvedFishIds).toEqual([])
  })

  it('waits for current mesh navigation before resolving readiness and freezes the post-relocation pose', async () => {
    state.deferMeshNavigation = true
    window.history.replaceState({}, '', '/?lookdev=1&seed=17')
    await start([service('nav-pending')])
    const bridge = window.__AQUARIUM_LOOKDEV__!
    const initial = { ...state.created[0]!.position }
    let readyResolved = false
    const readyPromise = bridge.ready().then(snapshot => { readyResolved = true; return snapshot })
    await vi.waitFor(() => expect(state.pendingMeshNavigationReleases).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(readyResolved).toBe(false)
    expect(bridge.state().ready).toBe(false)

    const blockedInitialPoint = (point: { x: number; y: number; z: number }) =>
      point.x === initial.x && point.y === initial.y && point.z === initial.z
    state.meshNavigationResult = {
      status: 'ready',
      meshNavigation: {
        units: 'meter', spacingM: 0.5,
        budget: { maxLatticeNodes: 4096, maxExpandedNodes: 4096, maxCollisionQueries: 50000, maxNodeVisits: 250000, maxTriangleTests: 2000000 },
        movementBudget: { maxNodeVisits: 4096, maxTriangleTests: 8192 },
        queryCapsule: (start: { x: number; y: number; z: number }) => ({
          status: blockedInitialPoint(start) ? 'blocked' : 'clear',
          work: { nodeVisits: 0, triangleTests: 0 },
        }),
      },
      diagnostics: { islands: [], buildMs: 0 },
    } satisfies import('./reef-mesh-navigation').ReefMeshNavigationResult
    state.pendingMeshNavigationReleases.shift()?.()
    const snapshot = await readyPromise
    expect(snapshot.ready).toBe(true)
    const settledFish = state.created.slice().reverse().find(fish => fish.id === 'nav-pending')!
    const settledPose = { ...settledFish.position }
    expect(settledPose).not.toEqual(initial)
    expect(bridge.state().ready).toBe(true)
    advance()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(settledFish.position).toEqual(settledPose)
  })

  it('blocks on a failed current thumbnail texture and clears that failure when its inhabitant retires', async () => {
    state.failFishLoads = true
    window.history.replaceState({}, '', '/?lookdev=1')
    await start([service('texture-failure')])
    const bridge = window.__AQUARIUM_LOOKDEV__!
    await vi.waitFor(() => expect(state.textures.length).toBeGreaterThan(0))
    const texture = state.textures[0]!
    expect(bridge.state().ready).toBe(false)
    const waiting = bridge.ready()
    texture.error?.(new Error('Fixture texture failure'))
    await expect(waiting).rejects.toThrow(/thumbnail texture failed/i)
    expect(bridge.state().failedAssets.some(key => key.startsWith('thumbnail:'))).toBe(true)
    update([])
    await vi.waitFor(() => expect(bridge.state().ready).toBe(true))
    expect(bridge.state().failedAssets.some(key => key.startsWith('thumbnail:'))).toBe(false)
  })

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
  it('uses VSM soft shadows, not the removed PCFSoftShadowMap (AQ-70.4 AC #3)', async () => {
    await start()
    const renderer = state.renderer as unknown as { shadowMap: { enabled: boolean; type: number } }
    expect(renderer.shadowMap.enabled).toBe(true)
    expect(renderer.shadowMap.type).toBe(THREE.VSMShadowMap)
    expect(renderer.shadowMap.type).not.toBe(THREE.PCFSoftShadowMap)
  })
  it('renders motes and bubbles as soft round sprites, not hard squares (AQ-43 visual-check fix)', async () => {
    await start()
    const points: THREE.Points[] = []
    state.renderer!.scene!.traverse(object => { if (object instanceof THREE.Points) points.push(object) })
    expect(points).toHaveLength(3)
    const bySize = new Map(points.map(point => {
      const material = point.material as THREE.PointsMaterial
      return [material.size, { point, material }] as const
    }))
    const foreground = bySize.get(0.02)!
    const background = bySize.get(0.03)!
    const bubbles = bySize.get(0.06)!
    // Counts, sizes and opacities are unchanged by the sprite fix.
    expect((foreground.point.geometry.getAttribute('position') as THREE.BufferAttribute).count).toBe(16)
    expect((background.point.geometry.getAttribute('position') as THREE.BufferAttribute).count).toBe(32)
    expect((bubbles.point.geometry.getAttribute('position') as THREE.BufferAttribute).count).toBe(32)
    expect(foreground.material.opacity).toBe(0.2)
    expect(background.material.opacity).toBe(0.34)
    expect(bubbles.material.opacity).toBe(0.6)
    // Every system carries a generated round sprite map and discards
    // fully-transparent corners, so no point renders as a hard square.
    for (const { material } of [foreground, background, bubbles]) {
      expect(material.map).toBeInstanceOf(THREE.DataTexture)
      expect(material.alphaTest).toBeGreaterThan(0)
    }
    // Motes are soft discs (solid centre); bubbles are hollow rings.
    const moteMap = foreground.material.map as THREE.DataTexture
    const bubbleMap = bubbles.material.map as THREE.DataTexture
    expect(spriteAlphaAt(moteMap, 0, 0)).toBe(255)
    expect(spriteAlphaAt(bubbleMap, 0, 0)).toBeLessThan(10)
    expect(spriteAlphaAt(bubbleMap, 0.68, 0)).toBeGreaterThan(200)
  })
  it('keeps the depth-haze and shaft planes tall enough that no plane edge crosses the water (visual band)', async () => {
    await start()
    const planes: THREE.Mesh[] = []
    state.renderer!.scene!.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        const uniforms = object.material.uniforms as Record<string, { value: unknown } | undefined>
        if (uniforms.uHazeAlpha || uniforms.uShaftAlpha) planes.push(object)
      }
    })
    expect(planes).toHaveLength(2)
    for (const plane of planes) {
      const height = (plane.geometry as THREE.PlaneGeometry).parameters.height
      const top = plane.position.y + height / 2
      // The overview frame tops out near y 4.8 at the haze depth; a plane
      // top inside the frame reads as a hard horizontal band across the tank.
      expect(top).toBeGreaterThan(4.8)
    }
  })
  it('initializes the fish heading and first extension snapshot with the same seeded yaw', async () => {
    const snapshots: FishExtensionSnapshot[] = []
    const capture = {
      kind: 'behavior' as const,
      id: 'capture-initial-yaw',
      create(snapshot: FishExtensionSnapshot) { snapshots.push(snapshot); return { step: () => [] } },
    }
    const extensions: FishExtensionConfig = { defaults: { [capture.id]: { operation: 'add', extension: capture } } }
    await start([service('heading', 'yellow-tang')], extensions)
    // One snapshot: the service fish only — the display sailfin no longer
    // spawns by default (Ryan 2026-11-09: "take it out of the tank").
    expect(snapshots).toHaveLength(1)
    expect(state.created[0].yaw).toBe(snapshots[0].yaw)
    expect(state.created[0].yaw).toBeGreaterThanOrEqual(0)
    expect(state.created[0].yaw).toBeLessThan(2 * Math.PI)
    expect(snapshots[0].position).toEqual(state.created[0].position)
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
  }, 15000) // AQ-90: async GLB start() exceeds the 5 s default under full-suite load; passes in isolation.
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
  it('lazy-loads species beyond the first three and swaps sprites to GLBs in place (AQ-76 AC #2)', async () => {
    const services = [service('one', 'ocellaris-clownfish'), service('two', 'yellow-tang'), service('three', 'royal-gramma'), service('four', 'blue-tang'), service('five', 'firefish')]
    await start(services)
    // Drive the animation loop so the ~0.24 s label cadence re-pumps the
    // lazy queue (the idle-callback pump alone is timing-dependent).
    for (let i = 0; i < 6; i++) advance()
    // Phase 0 blocks first paint on the first 3 configured species only:
    // the 4th and 5th start as thumbnail sprites, links already clickable.
    const rootFour = rootFor('four'), rootFive = rootFor('five')
    expect(rootFour).toBeDefined(); expect(rootFive).toBeDefined()
    expect(meshFor('four')).toBeUndefined(); expect(meshFor('five')).toBeUndefined()
    expect(overlay.querySelector<HTMLAnchorElement>('[data-service-id="four"]')!.title).toContain('artwork preview')
    // The background queue swaps each sprite to its GLB in place: same root
    // and motion, no new inhabitant, and the preview suffix drops.
    await vi.waitFor(() => expect(meshFor('four')).toBeDefined())
    await vi.waitFor(() => expect(meshFor('five')).toBeDefined())
    expect(rootFor('four')).toBe(rootFour); expect(rootFor('five')).toBe(rootFive)
    expect(state.created).toHaveLength(5)
    expect(overlay.querySelector<HTMLAnchorElement>('[data-service-id="four"]')!.title).not.toContain('artwork preview')
  }, 15000)
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


describe('camera zoom (AQ-62)', () => {
  // advance() replays timestamps 0 and 50, so the frame clock yields steps
  // only on the first call. Drive the mocked loop with increasing
  // timestamps here so camera smoothing actually runs.
  let now = 1000
  // 100 ms per frame = 6 simulation steps, so the camera damps ~45% of the
  // remaining distance each frame and settles in about a dozen frames.
  function tickFrames(count: number) {
    for (let i = 0; i < count; i++) { now += 100; state.renderer!.loop?.(now) }
  }
  function settle() { tickFrames(12) }

  it('starts at the full-tank overview and is not zoomed', async () => {
    await start()
    expect(controller.isZoomed()).toBe(false)
    expect(controller.getCameraZoom().distance).toBe(9)
    expect(controller.getCameraZoom().targetX).toBe(0)
  })

  it('zooms in and out in steps, clamps at the limits, and resets', async () => {
    await start()
    expect(controller.zoomIn()).toBe(true)
    expect(controller.isZoomed()).toBe(true)
    settle()
    expect(controller.getCameraZoom().distance).toBeCloseTo(9 / 1.35, 2)
    expect(controller.zoomOut()).toBe(false)
    expect(controller.isZoomed()).toBe(false)
    settle()
    expect(controller.getCameraZoom().distance).toBeCloseTo(9, 2)
    // Repeated zoom-ins stop at the closest distance, never inside the reef.
    for (let i = 0; i < 10; i++) controller.zoomIn()
    settle()
    expect(controller.getCameraZoom().distance).toBeCloseTo(4.5, 2)
    expect(controller.resetZoom()).toBe(false)
    expect(controller.isZoomed()).toBe(false)
  }, 30000) // AQ-70.3 drive-by, same root cause as the AQ-90 15 s raise:
  // async GLB start() under full-suite load. This test takes ~14.2 s on
  // the clean base (94% of 15 s); the added budget-test worker tips it
  // over. The test itself is synchronous once start() returns; no test
  // logic changed.

  it('zooms to a named focal area and back to the overview', async () => {
    await start()
    expect(controller.zoomToFocalArea('left-reef')).toBe(true)
    settle()
    const zoomed = controller.getCameraZoom()
    expect(zoomed.targetX).toBeCloseTo(-2.35, 2)
    expect(zoomed.distance).toBeCloseTo(5.5, 2)
    expect(controller.zoomToFocalArea('overview')).toBe(false)
    expect(controller.isZoomed()).toBe(false)
    expect(controller.zoomToFocalArea('not-a-reef' as never)).toBe(false)
  }, 15000)

  it('smoothly interpolates toward the desired state on following frames', async () => {
    await start()
    controller.zoomIn()
    // The first frame primes the frame clock with 0 steps; the second moves
    // the rendered camera part-way, not all the way.
    tickFrames(2)
    const mid = controller.getCameraZoom().distance
    expect(mid).toBeGreaterThan(9 / 1.35)
    expect(mid).toBeLessThan(9)
    settle()
    expect(controller.getCameraZoom().distance).toBeCloseTo(9 / 1.35, 2)
  }, 15000)

  it('snaps instantly under prefers-reduced-motion (AQ-62 AC #5)', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    await start()
    controller.zoomIn()
    // No frames advanced: a reduced-motion camera is already at the target.
    expect(controller.getCameraZoom().distance).toBeCloseTo(9 / 1.35, 2)
  })

  it('wheel zoom targets the point under the cursor', async () => {
    await start()
    const section = host
    // Cursor at the left reef (x = 25% across, y = 60% down the 1440x900 view).
    // happy-dom's WheelEvent drops clientX/clientY, so dispatch a MouseEvent
    // typed as a wheel event with deltaY attached; real browsers populate
    // all three fields on WheelEvent.
    const wheel = new MouseEvent('wheel', { clientX: 360, clientY: 540, bubbles: true, cancelable: true }) as WheelEvent
    Object.defineProperty(wheel, 'deltaY', { value: -240 })
    section.dispatchEvent(wheel)
    expect(controller.isZoomed()).toBe(true)
    settle()
    const zoomed = controller.getCameraZoom()
    expect(zoomed.targetX).toBeLessThan(0)
    expect(zoomed.distance).toBeLessThan(9)
  }, 15000)

  it('dragging while zoomed pans the focal target without moving fish links', async () => {
    await start()
    controller.zoomToFocalArea('left-reef')
    settle()
    const before = controller.getCameraZoom()
    const section = host
    const down = new PointerEvent('pointerdown', { pointerId: 1, clientX: 700, clientY: 400, bubbles: true })
    const move = new PointerEvent('pointermove', { pointerId: 1, clientX: 800, clientY: 400, bubbles: true })
    const up = new PointerEvent('pointerup', { pointerId: 1, clientX: 800, clientY: 400, bubbles: true })
    section.dispatchEvent(down)
    section.dispatchEvent(move)
    section.dispatchEvent(up)
    settle()
    const after = controller.getCameraZoom()
    // Dragging right pans the view right: the focal target moves left.
    expect(after.targetX).toBeLessThan(before.targetX)
    expect(after.distance).toBeCloseTo(before.distance, 1)
  }, 15000)

  it('dragging at the overview does nothing', async () => {
    await start()
    const section = host
    section.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 700, clientY: 400, bubbles: true }))
    section.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 900, clientY: 400, bubbles: true }))
    section.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 900, clientY: 400, bubbles: true }))
    expect(controller.isZoomed()).toBe(false)
  })
})
