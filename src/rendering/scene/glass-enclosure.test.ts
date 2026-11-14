import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { describe, expect, it, vi } from 'vitest'
import { createGlassEnclosure, glassEnclosureLayout } from './glass-enclosure'

function namedMeshes(group: THREE.Group, name: string): THREE.Mesh[] {
  return group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.name === name)
}

function reflectionWalls(group: THREE.Group): Reflector[] {
  return group.children.filter((child): child is Reflector => child instanceof Reflector)
}

function makeCamera(x = 0): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
  camera.position.set(x, 0, 4)
  camera.lookAt(0, 0, -1)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

function fakeRenderer(options: { throwOnRender?: boolean } = {}) {
  const previousTarget = { name: 'previous-render-target' }
  const renders: Array<{ scene: THREE.Scene; camera: THREE.Camera }> = []
  const renderer = {
    xr: { enabled: true },
    shadowMap: { autoUpdate: true },
    autoClear: true,
    state: { buffers: { depth: { setMask: vi.fn() } }, viewport: vi.fn() },
    getRenderTarget: vi.fn(() => previousTarget),
    setRenderTarget: vi.fn(),
    clear: vi.fn(),
    render: vi.fn((scene: THREE.Scene, camera: THREE.Camera) => {
      renders.push({ scene, camera })
      if (options.throwOnRender) throw new Error('simulated reflection renderer failure')
    }),
  }
  return { renderer, previousTarget, renders }
}

function drawReflection(
  reflector: Reflector,
  renderer: ReturnType<typeof fakeRenderer>['renderer'],
  scene: THREE.Scene,
  camera: THREE.Camera,
): void {
  reflector.onBeforeRender(
    renderer as unknown as THREE.WebGLRenderer,
    scene,
    camera,
    reflector.geometry,
    reflector.material as THREE.Material,
    {} as THREE.Group,
  )
}

describe('physical glass enclosure', () => {
  it.each([
    { narrow: false },
    { narrow: true },
  ])('bounds both viewport layouts with panes, seams, and a sand lip ($narrow)', ({ narrow }) => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(narrow)
    const { group } = enclosure
    const layout = glassEnclosureLayout(narrow, 2.6)
    const { halfWidth } = layout
    const height = layout.surfaceY - layout.bottomY
    const depth = layout.frontZ - layout.backZ

    expect(group.name).toBe('AquariumGlassEnclosure')
    expect(reflectionWalls(group)).toHaveLength(2)
    expect(namedMeshes(group, 'LeftClearGlass')).toHaveLength(1)
    expect(namedMeshes(group, 'RightClearGlass')).toHaveLength(1)
    expect(namedMeshes(group, 'FrontClearGlass')).toHaveLength(1)
    expect(namedMeshes(group, 'BackClearGlass')).toHaveLength(1)
    expect(namedMeshes(group, 'GlassCornerSeam')).toHaveLength(4)
    expect(namedMeshes(group, 'BottomGlassLip')).toHaveLength(2)
    expect(group.children).toHaveLength(12)

    for (const wall of reflectionWalls(group)) {
      const geometry = wall.geometry as THREE.PlaneGeometry
      expect(geometry.parameters.width).toBeCloseTo(depth)
      expect(geometry.parameters.height).toBeCloseTo(height)
      expect(Math.abs(wall.position.x)).toBeCloseTo(halfWidth)
      expect(wall.getRenderTarget().width).toBe(256)
      expect(wall.getRenderTarget().height).toBe(384)
      expect(wall.getRenderTarget().samples).toBe(0)
    }
    for (const pane of [...namedMeshes(group, 'FrontClearGlass'), ...namedMeshes(group, 'BackClearGlass')]) {
      const geometry = pane.geometry as THREE.PlaneGeometry
      expect(geometry.parameters.width).toBeCloseTo(halfWidth * 2)
      expect(geometry.parameters.height).toBeCloseTo(height)
    }
    for (const lip of namedMeshes(group, 'BottomGlassLip')) {
      expect((lip.geometry as THREE.BoxGeometry).parameters.width).toBeCloseTo(halfWidth * 2)
      expect(lip.position.y).toBeCloseTo(layout.bottomY - 0.005)
    }
    for (const pane of [...namedMeshes(group, 'LeftClearGlass'), ...namedMeshes(group, 'RightClearGlass')]) {
      const geometry = pane.geometry as THREE.PlaneGeometry
      expect(geometry.parameters.width).toBeCloseTo(depth)
      expect(geometry.parameters.height).toBeCloseTo(height)
      expect(Math.abs(pane.position.x)).toBeCloseTo(halfWidth)
    }
    for (const pane of namedMeshes(group, 'FrontClearGlass')) expect(pane.position.z).toBe(layout.frontZ)
    for (const pane of namedMeshes(group, 'BackClearGlass')) expect(pane.position.z).toBe(layout.backZ)
    for (const seam of namedMeshes(group, 'GlassCornerSeam')) {
      expect(Math.abs(seam.position.x)).toBeCloseTo(halfWidth)
      expect([layout.frontZ, layout.backZ]).toContain(seam.position.z)
    }
    for (const lip of namedMeshes(group, 'BottomGlassLip')) {
      expect([layout.frontZ, layout.backZ]).toContain(lip.position.z)
    }

    enclosure.dispose()
  })

  it('uses real Reflector render targets and samples their mirrored scene textures', () => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(false)

    for (const wall of reflectionWalls(enclosure.group)) {
      expect(wall.material).toBeInstanceOf(THREE.ShaderMaterial)
      const material = wall.material as THREE.ShaderMaterial
      expect(material.uniforms.tDiffuse.value).toBe(wall.getRenderTarget().texture)
      expect(material.fragmentShader).toContain('texture2DProj(tDiffuse, vReflectionUv)')
      expect(material.fragmentShader).not.toMatch(/vec[234]\s*\([^)]*(?:coral|silhouette)/i)
    }

    const scene = new THREE.Scene()
    const outerCoral = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial())
    outerCoral.name = 'OuterCoral'
    const sandCaustics = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial())
    sandCaustics.name = 'SandCaustics'
    scene.add(enclosure.group, outerCoral, sandCaustics)
    enclosure.group.updateMatrixWorld(true)
    const camera = makeCamera()
    const { renderer, renders } = fakeRenderer()
    renderer.render.mockImplementation((renderedScene, renderedCamera) => {
      expect(renderedScene).toBe(scene)
      expect(enclosure.group.visible).toBe(false)
      expect(outerCoral.visible).toBe(true)
      expect(sandCaustics.visible).toBe(true)
      renders.push({ scene: renderedScene, camera: renderedCamera })
    })
    enclosure.update(1, 'high', 0)
    const [leftWall, rightWall] = reflectionWalls(enclosure.group)
    drawReflection(leftWall, renderer, scene, camera)
    drawReflection(rightWall, renderer, scene, camera)

    expect(renders).toHaveLength(2)
    expect(renders.every(render => render.scene === scene)).toBe(true)
    expect(enclosure.group.visible).toBe(true)
    enclosure.dispose()
  })

  it('makes every enclosure mesh non-interactive for raycasting', () => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(false)
    const raycaster = new THREE.Raycaster()
    const intersections: THREE.Intersection[] = []

    const meshes = enclosure.group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    expect(meshes).toHaveLength(12)
    for (const mesh of meshes) mesh.raycast(raycaster, intersections)
    expect(intersections).toHaveLength(0)

    enclosure.dispose()
  })

  it('disposes old reflection and geometry resources when changing layouts, then disposes current resources', () => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(false)
    const oldMeshes = enclosure.group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    const oldGeometries = [...new Set(oldMeshes.map(mesh => mesh.geometry))]
    const oldWalls = reflectionWalls(enclosure.group)
    const oldTargets = oldWalls.map(wall => wall.getRenderTarget())
    const oldMaterialDisposals = oldWalls.map(wall => vi.fn())
    const oldTargetDisposals = oldTargets.map(() => vi.fn())
    const oldGeometryDisposals = oldGeometries.map(() => vi.fn())
    oldWalls.forEach((wall, index) => (wall.material as THREE.Material).addEventListener('dispose', oldMaterialDisposals[index]))
    oldTargets.forEach((target, index) => target.addEventListener('dispose', oldTargetDisposals[index]))
    oldGeometries.forEach((geometry, index) => geometry.addEventListener('dispose', oldGeometryDisposals[index]))

    enclosure.setLayout(true)
    expect(enclosure.group.children).toHaveLength(12)
    expect(reflectionWalls(enclosure.group)).not.toEqual(oldWalls)
    expect(oldMaterialDisposals.every(spy => spy.mock.calls.length === 1)).toBe(true)
    expect(oldTargetDisposals.every(spy => spy.mock.calls.length === 1)).toBe(true)
    expect(oldGeometryDisposals.every(spy => spy.mock.calls.length === 1)).toBe(true)

    const newMeshes = enclosure.group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    const newGeometries = [...new Set(newMeshes.map(mesh => mesh.geometry))]
    const currentWalls = reflectionWalls(enclosure.group)
    const currentTargets = currentWalls.map(wall => wall.getRenderTarget())
    const currentDisposals = [
      ...currentWalls.map(() => vi.fn()),
      ...currentTargets.map(() => vi.fn()),
      ...newGeometries.map(() => vi.fn()),
    ]
    currentWalls.forEach((wall, index) => (wall.material as THREE.Material).addEventListener('dispose', currentDisposals[index]))
    currentTargets.forEach((target, index) => target.addEventListener('dispose', currentDisposals[index + currentWalls.length]))
    newGeometries.forEach((geometry, index) => geometry.addEventListener('dispose', currentDisposals[index + currentWalls.length + currentTargets.length]))

    enclosure.dispose()
    enclosure.dispose()
    expect(currentDisposals.every(spy => spy.mock.calls.length === 1)).toBe(true)
    expect(enclosure.group.children).toHaveLength(0)
  })

  it('keeps transparent panes in low quality while disabling side reflections', () => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(false)
    enclosure.update(0, 'low')

    expect(reflectionWalls(enclosure.group).every(wall => !wall.visible)).toBe(true)
    expect(namedMeshes(enclosure.group, 'LeftClearGlass')[0].visible).toBe(true)
    expect(namedMeshes(enclosure.group, 'RightClearGlass')[0].visible).toBe(true)
    expect(namedMeshes(enclosure.group, 'FrontClearGlass')[0].visible).toBe(true)
    expect(namedMeshes(enclosure.group, 'BackClearGlass')[0].visible).toBe(true)

    enclosure.update(0, 'high')
    expect(reflectionWalls(enclosure.group).every(wall => wall.visible)).toBe(true)
    enclosure.dispose()
  })

  it('skips reflection renders while paused and refreshes on time, camera, or scene-revision changes', () => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(false)
    const scene = new THREE.Scene()
    scene.add(enclosure.group)
    enclosure.group.updateMatrixWorld(true)
    const camera = makeCamera()
    const { renderer, renders } = fakeRenderer()
    const [wall] = reflectionWalls(enclosure.group)

    enclosure.update(4, 'high', 2)
    drawReflection(wall, renderer, scene, camera)
    expect(renders).toHaveLength(1)

    // Repeated frames at a frozen scene time (pause/reduced-motion) reuse the last reflection.
    enclosure.update(4, 'high', 2)
    drawReflection(wall, renderer, scene, camera)
    expect(renders).toHaveLength(1)

    enclosure.update(4.5, 'high', 2)
    drawReflection(wall, renderer, scene, camera)
    expect(renders).toHaveLength(2)

    camera.position.x = 0.2
    camera.updateMatrixWorld(true)
    enclosure.update(4.5, 'high', 2)
    drawReflection(wall, renderer, scene, camera)
    expect(renders).toHaveLength(3)

    enclosure.update(4.5, 'high', 3)
    drawReflection(wall, renderer, scene, camera)
    expect(renders).toHaveLength(4)
    enclosure.dispose()
  })

  it('staggers actual side-wall callbacks at 0.5 second intervals after simultaneous initial captures', () => {
    const enclosure = createGlassEnclosure({ surfaceY: 2.6 })
    enclosure.setLayout(false)
    const scene = new THREE.Scene()
    scene.add(enclosure.group)
    enclosure.group.updateMatrixWorld(true)
    const camera = makeCamera()
    const { renderer, renders } = fakeRenderer()
    const [leftWall, rightWall] = reflectionWalls(enclosure.group)

    enclosure.update(0, 'high', 7)
    drawReflection(leftWall, renderer, scene, camera)
    expect(renders).toHaveLength(1)
    drawReflection(rightWall, renderer, scene, camera)
    expect(renders).toHaveLength(2)

    // Frozen scene time reuses both initial captures.
    enclosure.update(0, 'high', 7)
    drawReflection(leftWall, renderer, scene, camera)
    drawReflection(rightWall, renderer, scene, camera)
    expect(renders).toHaveLength(2)

    enclosure.update(0.5, 'high', 7)
    drawReflection(leftWall, renderer, scene, camera)
    expect(renders).toHaveLength(3)
    drawReflection(rightWall, renderer, scene, camera)
    expect(renders).toHaveLength(3)

    enclosure.update(0.75, 'high', 7)
    drawReflection(leftWall, renderer, scene, camera)
    expect(renders).toHaveLength(3)
    drawReflection(rightWall, renderer, scene, camera)
    expect(renders).toHaveLength(4)

    enclosure.update(1.0, 'high', 7)
    drawReflection(leftWall, renderer, scene, camera)
    expect(renders).toHaveLength(5)
    drawReflection(rightWall, renderer, scene, camera)
    expect(renders).toHaveLength(5)

    enclosure.update(1.25, 'high', 7)
    drawReflection(leftWall, renderer, scene, camera)
    expect(renders).toHaveLength(5)
    drawReflection(rightWall, renderer, scene, camera)
    expect(renders).toHaveLength(6)

    enclosure.dispose()
  })

  it('restores visibility, XR, shadow updates, and render target when reflection rendering throws', () => {
    const excluded = new THREE.Group()
    excluded.visible = true
    const enclosure = createGlassEnclosure({ surfaceY: 2.6, excludeFromReflections: () => [excluded] })
    enclosure.setLayout(false)
    const scene = new THREE.Scene()
    scene.add(enclosure.group, excluded)
    enclosure.group.updateMatrixWorld(true)
    const camera = makeCamera()
    const { renderer, previousTarget } = fakeRenderer({ throwOnRender: true })
    const [wall] = reflectionWalls(enclosure.group)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    enclosure.update(1, 'high', 0)
    drawReflection(wall, renderer, scene, camera)

    expect(renderer.render).toHaveBeenCalledTimes(1)
    expect(enclosure.group.visible).toBe(true)
    expect(excluded.visible).toBe(true)
    expect(wall.visible).toBe(false)
    expect(namedMeshes(enclosure.group, 'LeftClearGlass')[0].visible).toBe(true)
    expect(renderer.xr.enabled).toBe(true)
    expect(renderer.shadowMap.autoUpdate).toBe(true)
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(previousTarget)
    expect(warning).toHaveBeenCalledTimes(1)

    warning.mockRestore()
    enclosure.dispose()
  })
})
