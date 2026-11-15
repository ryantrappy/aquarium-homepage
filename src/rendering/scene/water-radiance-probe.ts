import * as THREE from 'three'

export const WATER_RADIANCE_CUBE_SIZE = 128
const WATER_RADIANCE_PROBE_ORIGIN = new THREE.Vector3(0, 1, 0)
const WATER_RADIANCE_PROBE_NEAR = 0.1
const WATER_RADIANCE_PROBE_FAR = 60

export interface WaterRadianceProbe {
  texture: THREE.CubeTexture
  dispose(): void
}

function shadowLightsIn(scene: THREE.Scene): Array<{ shadow: THREE.LightShadow }> {
  const lights: Array<{ shadow: THREE.LightShadow }> = []
  scene.traverse(object => {
    if (!(object as THREE.Light).isLight) return
    const shadow = (object as THREE.Light & { shadow?: THREE.LightShadow }).shadow
    if (shadow) lights.push({ shadow })
  })
  return lights
}

/** Capture one static, center-probe view of underwater scene radiance.
 * The cube texture is linear and borrowed by the water shader; this handle
 * owns its render target. Failure leaves the caller on the analytic fallback. */
export function captureWaterRadianceProbe(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  excludedObjects: readonly THREE.Object3D[],
): WaterRadianceProbe | null {
  const target = new THREE.WebGLCubeRenderTarget(WATER_RADIANCE_CUBE_SIZE, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.LinearSRGBColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  })
  target.texture.colorSpace = THREE.LinearSRGBColorSpace
  const cubeCamera = new THREE.CubeCamera(WATER_RADIANCE_PROBE_NEAR, WATER_RADIANCE_PROBE_FAR, target)
  cubeCamera.position.copy(WATER_RADIANCE_PROBE_ORIGIN)

  const excluded = [...new Set(excludedObjects)]
  const excludedVisibility = excluded.map(object => object.visible)
  const renderTarget = renderer.getRenderTarget()
  const cubeFace = renderer.getActiveCubeFace()
  const mipLevel = renderer.getActiveMipmapLevel()
  const viewport = renderer.getViewport(new THREE.Vector4())
  const scissor = renderer.getScissor(new THREE.Vector4())
  const scissorTest = renderer.getScissorTest()
  const xrEnabled = renderer.xr.enabled
  const autoClear = renderer.autoClear
  const autoClearColor = renderer.autoClearColor
  const autoClearDepth = renderer.autoClearDepth
  const autoClearStencil = renderer.autoClearStencil
  const shadowAutoUpdate = renderer.shadowMap.autoUpdate
  const shadowNeedsUpdate = renderer.shadowMap.needsUpdate
  const shadowStates = shadowLightsIn(scene).map(({ shadow }) => ({
    shadow,
    autoUpdate: shadow.autoUpdate,
    needsUpdate: shadow.needsUpdate,
  }))
  const infoAutoReset = renderer.info.autoReset
  const infoRender = { ...renderer.info.render }
  const mipmapsAutoUpdate = target.texture.mipmapsAutoUpdate

  try {
    excluded.forEach(object => { object.visible = false })
    // Reuse existing shadow maps without mutating their shared texels. A
    // first capture before the main renderer's first shadow update can be
    // unshadowed; normal scene rendering remains responsible for that update.
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = false
    for (const { shadow } of shadowStates) {
      shadow.autoUpdate = false
      shadow.needsUpdate = false
    }
    renderer.info.autoReset = false
    cubeCamera.update(renderer, scene)
    let disposed = false
    return {
      texture: target.texture,
      dispose() {
        if (disposed) return
        disposed = true
        target.dispose()
      },
    }
  } catch (error) {
    target.dispose()
    console.warn('Static water radiance probe unavailable; using analytic fallback', error)
    return null
  } finally {
    excluded.forEach((object, index) => { object.visible = excludedVisibility[index] })
    for (const state of shadowStates) {
      state.shadow.autoUpdate = state.autoUpdate
      state.shadow.needsUpdate = state.needsUpdate
    }
    renderer.shadowMap.autoUpdate = shadowAutoUpdate
    renderer.shadowMap.needsUpdate = shadowNeedsUpdate
    target.texture.mipmapsAutoUpdate = mipmapsAutoUpdate
    renderer.xr.enabled = xrEnabled
    renderer.autoClear = autoClear
    renderer.autoClearColor = autoClearColor
    renderer.autoClearDepth = autoClearDepth
    renderer.autoClearStencil = autoClearStencil
    renderer.info.autoReset = infoAutoReset
    Object.assign(renderer.info.render, infoRender)
    renderer.setRenderTarget(renderTarget, cubeFace, mipLevel)
    renderer.setViewport(viewport)
    renderer.setScissor(scissor)
    renderer.setScissorTest(scissorTest)
  }
}

/** Own one probe per reef layout revision. Service updates and ordinary frames
 * can call `captureForLayout` safely: the same revision never re-captures. */
export class WaterRadianceProbeManager {
  private probe: WaterRadianceProbe | null = null
  private layoutRevision: string | undefined
  private disposed = false

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly excludedObjects: () => readonly THREE.Object3D[],
  ) {}

  captureForLayout(layoutRevision: string): THREE.CubeTexture | null {
    if (this.disposed) return null
    if (this.layoutRevision === layoutRevision) return this.probe?.texture ?? null
    const previous = this.probe
    this.probe = captureWaterRadianceProbe(this.renderer, this.scene, this.excludedObjects())
    this.layoutRevision = layoutRevision
    previous?.dispose()
    return this.probe?.texture ?? null
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.probe?.dispose()
    this.probe = null
    this.layoutRevision = undefined
  }
}
