import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  captureWaterRadianceProbe,
  WATER_RADIANCE_CUBE_SIZE,
  WaterRadianceProbeManager,
} from './water-radiance-probe'

function fakeRenderer() {
  const originalTarget = new THREE.WebGLRenderTarget(8, 8)
  const viewport = new THREE.Vector4(2, 3, 640, 480)
  const scissor = new THREE.Vector4(4, 5, 300, 200)
  const render = { calls: 11, frame: 12, triangles: 13, points: 14, lines: 15 }
  const shadowMap = { autoUpdate: true, needsUpdate: false }
  const renderer = {
    xr: { enabled: true },
    shadowMap,
    info: { autoReset: true, render: { ...render } },
    autoClear: true,
    autoClearColor: false,
    autoClearDepth: true,
    autoClearStencil: false,
    getRenderTarget: () => originalTarget,
    getActiveCubeFace: () => 3,
    getActiveMipmapLevel: () => 2,
    getViewport: (out: THREE.Vector4) => out.copy(viewport),
    getScissor: (out: THREE.Vector4) => out.copy(scissor),
    getScissorTest: () => true,
    setRenderTarget: vi.fn(),
    setViewport: vi.fn(),
    setScissor: vi.fn(),
    setScissorTest: vi.fn(),
  }
  return { renderer: renderer as unknown as THREE.WebGLRenderer, originalTarget, viewport, scissor, render, shadowMap }
}

const cubeUpdate = vi.spyOn(THREE.CubeCamera.prototype, 'update')
afterEach(() => cubeUpdate.mockReset())

describe('static reef water radiance probe', () => {
  it('captures one linear 128px cube while hiding exclusions and restoring renderer state', () => {
    const state = fakeRenderer()
    const scene = new THREE.Scene()
    const light = new THREE.DirectionalLight()
    light.castShadow = true
    scene.add(light)
    light.shadow.autoUpdate = true
    light.shadow.needsUpdate = false
    const excluded = new THREE.Group()
    scene.add(excluded)
    const capture = vi.fn(function(this: THREE.CubeCamera, renderer: Parameters<typeof cubeUpdate>[0]) {
      expect(excluded.visible).toBe(false)
      const webgl = renderer as unknown as THREE.WebGLRenderer
      expect(webgl.shadowMap.autoUpdate).toBe(false)
      expect(webgl.shadowMap.needsUpdate).toBe(false)
      expect(light.shadow.autoUpdate).toBe(false)
      expect(light.shadow.needsUpdate).toBe(false)
      this.renderTarget.texture.mipmapsAutoUpdate = false
      webgl.info.render.calls += 6
      webgl.xr.enabled = false
      webgl.autoClear = false
      webgl.setRenderTarget(null, 0, 0)
    })
    cubeUpdate.mockImplementation(capture as unknown as typeof cubeUpdate)

    const probe = captureWaterRadianceProbe(state.renderer, scene, [excluded])

    expect(probe).not.toBeNull()
    expect(probe!.texture).toBeInstanceOf(THREE.CubeTexture)
    expect(probe!.texture.colorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(WATER_RADIANCE_CUBE_SIZE).toBe(128)
    expect(capture).toHaveBeenCalledTimes(1)
    expect(excluded.visible).toBe(true)
    expect(state.renderer.xr.enabled).toBe(true)
    expect(state.renderer.autoClear).toBe(true)
    expect(state.renderer.autoClearColor).toBe(false)
    expect(state.renderer.autoClearDepth).toBe(true)
    expect(state.renderer.autoClearStencil).toBe(false)
    expect(state.renderer.shadowMap.autoUpdate).toBe(true)
    expect(state.renderer.shadowMap.needsUpdate).toBe(false)
    expect(light.shadow.autoUpdate).toBe(true)
    expect(light.shadow.needsUpdate).toBe(false)
    expect(state.renderer.info.autoReset).toBe(true)
    expect(state.renderer.info.render).toEqual(state.render)
    expect(state.renderer.setRenderTarget).toHaveBeenLastCalledWith(state.originalTarget, 3, 2)
    expect(state.renderer.setViewport).toHaveBeenLastCalledWith(state.viewport)
    expect(state.renderer.setScissor).toHaveBeenLastCalledWith(state.scissor)
    expect(state.renderer.setScissorTest).toHaveBeenLastCalledWith(true)
    probe!.dispose()
  })

  it('restores exclusions and renderer state and disposes the target when capture throws', () => {
    const state = fakeRenderer()
    const scene = new THREE.Scene()
    const excluded = new THREE.Group()
    excluded.visible = false
    scene.add(excluded)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let target: THREE.WebGLCubeRenderTarget | undefined
    cubeUpdate.mockImplementation(function(this: THREE.CubeCamera, renderer) {
      target = this.renderTarget
      expect(excluded.visible).toBe(false)
      const webgl = renderer as unknown as THREE.WebGLRenderer
      webgl.xr.enabled = false
      webgl.setRenderTarget(null, 0, 0)
      throw new Error('capture failed')
    })
    const dispose = vi.spyOn(THREE.WebGLCubeRenderTarget.prototype, 'dispose')

    const probe = captureWaterRadianceProbe(state.renderer, scene, [excluded])

    expect(probe).toBeNull()
    expect(excluded.visible).toBe(false)
    expect(state.renderer.xr.enabled).toBe(true)
    expect(state.renderer.setRenderTarget).toHaveBeenLastCalledWith(state.originalTarget, 3, 2)
    expect(target).toBeDefined()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledOnce()
    dispose.mockRestore()
    warn.mockRestore()
  })

  it('captures once per layout revision, disposes replaced targets, and cannot recapture after disposal', () => {
    const state = fakeRenderer()
    const scene = new THREE.Scene()
    const targets: THREE.WebGLCubeRenderTarget[] = []
    cubeUpdate.mockImplementation(function(this: THREE.CubeCamera) { targets.push(this.renderTarget) })
    const dispose = vi.spyOn(THREE.WebGLCubeRenderTarget.prototype, 'dispose')
    const manager = new WaterRadianceProbeManager(state.renderer, scene, () => [])

    const wide = manager.captureForLayout('wide')
    expect(manager.captureForLayout('wide')).toBe(wide)
    expect(cubeUpdate).toHaveBeenCalledTimes(1)
    const narrow = manager.captureForLayout('narrow')
    expect(narrow).not.toBe(wide)
    expect(cubeUpdate).toHaveBeenCalledTimes(2)
    expect(dispose).toHaveBeenCalledTimes(1)
    manager.dispose()
    manager.dispose()
    expect(dispose).toHaveBeenCalledTimes(2)
    expect(manager.captureForLayout('wide')).toBeNull()
    expect(cubeUpdate).toHaveBeenCalledTimes(2)
    dispose.mockRestore()
  })
})
