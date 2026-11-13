import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import type { QualityTier } from './runtime-quality'

// These are the existing scene's display units, not a new metric scale.
// AQ-70.13 owns the remaining physical-tank/unit correspondence.
export function glassEnclosureLayout(narrow: boolean, surfaceY: number) {
  return { halfWidth: narrow ? 2.3 : 6.0, frontZ: 2.84, backZ: -5.48, bottomY: -2.8, surfaceY }
}

const reflectionShader = {
  name: 'AquariumSideReflection',
  uniforms: { tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, color: { value: new THREE.Color() } },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vReflectionUv;
    varying vec2 vPaneUv;
    varying vec3 vPaneWorld;
    varying vec3 vPaneNormal;
    void main() {
      vReflectionUv = textureMatrix * vec4(position, 1.0);
      vPaneUv = uv;
      vPaneWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      vPaneNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec4 vReflectionUv;
    varying vec2 vPaneUv;
    varying vec3 vPaneWorld;
    varying vec3 vPaneNormal;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPaneWorld);
      float grazing = 1.0 - abs(dot(viewDir, normalize(vPaneNormal)));
      float edge = smoothstep(0.0, 0.025, vPaneUv.y) * (1.0 - smoothstep(0.975, 1.0, vPaneUv.y));
      float alpha = (0.035 + 0.085 * pow(grazing, 3.0)) * edge;
      vec3 reflected = texture2DProj(tDiffuse, vReflectionUv).rgb;
      gl_FragColor = vec4(reflected, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}

function clearPaneMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    vertexShader: `
      varying vec2 vPaneUv;
      varying vec3 vPaneWorld;
      varying vec3 vPaneNormal;
      void main() {
        vPaneUv = uv;
        vPaneWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vPaneNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vPaneUv;
      varying vec3 vPaneWorld;
      varying vec3 vPaneNormal;
      void main() {
        float grazing = 1.0 - abs(dot(normalize(cameraPosition - vPaneWorld), normalize(vPaneNormal)));
        float edgeDistance = min(min(vPaneUv.x, 1.0-vPaneUv.x), min(vPaneUv.y, 1.0-vPaneUv.y));
        float edge = 1.0 - smoothstep(0.0, 0.012, edgeDistance);
        float diagonal = exp(-pow((vPaneUv.x + vPaneUv.y * 0.75 - 1.05) / 0.028, 2.0));
        float light = edge * (0.008 + 0.012 * pow(grazing, 5.0)) + diagonal * 0.003;
        gl_FragColor = vec4(vec3(0.64, 0.82, 0.90) * light, light);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

type Wall = { reflector: Reflector; lastTime: number; nextTime: number; cameraKey: string; revision: number; valid: boolean; failed: boolean }

export function createGlassEnclosure(options: {
  surfaceY: number
  excludeFromReflections?: () => THREE.Object3D[]
}) {
  const group = new THREE.Group()
  group.name = 'AquariumGlassEnclosure'
  const walls: Wall[] = []
  const clearMaterial = clearPaneMaterial()
  const seamMaterial = new THREE.MeshBasicMaterial({ color: '#20333c', transparent: true, opacity: 0.38, depthWrite: false })
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: '#8aa6af', transparent: true, opacity: 0.18, depthWrite: false })
  const geometries: THREE.BufferGeometry[] = []
  let sceneTime = 0, sceneRevision = 0, tier: QualityTier = 'high', disposed = false

  function nonInteractive<T extends THREE.Mesh>(mesh: T, name: string): T {
    mesh.name = name
    mesh.raycast = () => {}
    mesh.renderOrder = 4
    group.add(mesh)
    return mesh
  }
  function box(name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
    const geometry = new THREE.BoxGeometry(...size); geometries.push(geometry)
    const mesh = nonInteractive(new THREE.Mesh(geometry, material), name)
    mesh.position.set(...position)
  }

  function setLayout(narrow: boolean) {
    for (const wall of walls) wall.reflector.dispose()
    walls.length = 0
    for (const geometry of geometries) geometry.dispose()
    geometries.length = 0
    group.clear()
    const layout = glassEnclosureLayout(narrow, options.surfaceY)
    const { halfWidth, frontZ, backZ, bottomY, surfaceY } = layout
    const height = surfaceY - bottomY, depth = frontZ - backZ
    const centerY = (surfaceY + bottomY) / 2, centerZ = (frontZ + backZ) / 2
    for (const sign of [-1, 1]) {
      const geometry = new THREE.PlaneGeometry(depth, height); geometries.push(geometry)
      const reflector = new Reflector(geometry, { shader: reflectionShader, textureWidth: 256, textureHeight: 384, multisample: 0, clipBias: 0.003 })
      reflector.position.set(sign * halfWidth, centerY, centerZ)
      reflector.rotation.y = sign < 0 ? Math.PI / 2 : -Math.PI / 2
      const material = reflector.material as THREE.ShaderMaterial
      material.transparent = true; material.depthWrite = false
      const wall: Wall = { reflector, lastTime: -Infinity, nextTime: -Infinity, cameraKey: '', revision: -1, valid: false, failed: false }
      const originalRender = reflector.onBeforeRender
      reflector.onBeforeRender = function (renderer, scene, camera, geometry, material, drawGroup) {
        if (disposed || tier === 'low' || wall.failed) return
        const key = [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements].join(',')
        const interval = tier === 'high' ? 0.5 : 1
        if (wall.valid && wall.revision === sceneRevision && wall.cameraKey === key && sceneTime >= wall.lastTime && sceneTime < wall.nextTime) return
        const excluded = [group, ...(options.excludeFromReflections?.() ?? [])]
        const visibility = excluded.map(object => object.visible)
        const target = renderer.getRenderTarget(), xr = renderer.xr.enabled, shadowUpdates = renderer.shadowMap.autoUpdate
        try {
          excluded.forEach(object => { object.visible = false })
          originalRender.call(this, renderer, scene, camera, geometry, material, drawGroup)
          // Stagger the periodic sides after the initial complete capture.
          wall.nextTime = sceneTime + interval + (!wall.valid && sign > 0 ? interval * 0.5 : 0)
          wall.lastTime = sceneTime; wall.cameraKey = key; wall.revision = sceneRevision; wall.valid = true
        } catch (error) {
          // Keep the clear physical pane if a device cannot render a mirror.
          reflector.visible = false
          wall.failed = true
          console.warn('Aquarium side reflection unavailable', error)
        } finally {
          excluded.forEach((object, index) => { object.visible = visibility[index] })
          renderer.xr.enabled = xr; renderer.shadowMap.autoUpdate = shadowUpdates
          renderer.setRenderTarget(target)
        }
      }
      walls.push(wall)
      nonInteractive(reflector, sign < 0 ? 'LeftGlassReflection' : 'RightGlassReflection')
      const pane = nonInteractive(new THREE.Mesh(new THREE.PlaneGeometry(depth, height), clearMaterial), sign < 0 ? 'LeftClearGlass' : 'RightClearGlass')
      geometries.push(pane.geometry)
      pane.position.copy(reflector.position); pane.rotation.copy(reflector.rotation)
      for (const z of [frontZ, backZ]) box('GlassCornerSeam', [0.018, height, 0.018], [sign * halfWidth, centerY, z], seamMaterial)
    }
    for (const z of [frontZ, backZ]) {
      const geometry = new THREE.PlaneGeometry(halfWidth * 2, height); geometries.push(geometry)
      const pane = nonInteractive(new THREE.Mesh(geometry, clearMaterial), z === frontZ ? 'FrontClearGlass' : 'BackClearGlass')
      pane.position.set(0, centerY, z)
      box('BottomGlassLip', [halfWidth * 2, 0.045, 0.035], [0, bottomY - 0.005, z], edgeMaterial)
    }
  }

  return {
    group,
    setLayout,
    update(timeSeconds: number, quality: QualityTier, revision = 0) {
      sceneTime = timeSeconds; tier = quality; sceneRevision = revision
      for (const wall of walls) wall.reflector.visible = quality !== 'low' && !wall.failed
    },
    invalidate() {
      for (const wall of walls) { wall.valid = false; wall.failed = false }
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const wall of walls) wall.reflector.dispose()
      for (const geometry of geometries) geometry.dispose()
      clearMaterial.dispose(); seamMaterial.dispose(); edgeMaterial.dispose(); group.clear()
    },
  }
}
