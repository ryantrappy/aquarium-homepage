import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { AquariumScene } from '../components/AquariumScene'
import { useServices } from '../lib/useServices'

export const Route = createFileRoute('/test-coral')({
  component: ProceduralCoralTestPage,
})

type ViewMode = 'split' | 'turntable' | 'tank'

interface MeshDiagnostics {
  loaded: boolean
  vertices: number
  triangles: number
  dimensionsM: [number, number, number]
  hasBaseColorMap: boolean
  hasRoughnessMap: boolean
  hasNormalMap: boolean
  error?: string
}

function ProceduralCoralTestPage() {
  const { services, isLoaded } = useServices()
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [lightingPreset, setLightingPreset] = useState<'tutorial-studio' | 'reef-actinic'>('tutorial-studio')
  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [pausedTank, setPausedTank] = useState(false)
  const [diagnostics, setDiagnostics] = useState<MeshDiagnostics>({
    loaded: false,
    vertices: 0,
    triangles: 0,
    dimensionsM: [0, 0, 0],
    hasBaseColorMap: false,
    hasRoughnessMap: false,
    hasNormalMap: false,
  })

  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const controlsRef = useRef({ lightingPreset, autoRotate, wireframe })
  controlsRef.current = { lightingPreset, autoRotate, wireframe }

  useEffect(() => {
    const canvas = studioCanvasRef.current
    if (!canvas || viewMode === 'tank') return

    let disposed = false
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#3b4e63')

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50)
    camera.position.set(0, 0.65, 3.1)

    const orbit = new OrbitControls(camera, canvas)
    orbit.enableDamping = true
    orbit.target.set(0, 0, 0)

    // Studio Lighting matching the YouTube tutorial:
    // 1. Bright blue circular key light on left (Strength 100 equivalent)
    const blueKeyLight = new THREE.DirectionalLight('#3b9eff', 3.4)
    blueKeyLight.position.set(-4.2, 3.2, 2.8)
    blueKeyLight.castShadow = true
    scene.add(blueKeyLight)

    // 2. Tall warm yellow rim light on opposite side (Strength 50 equivalent)
    const warmRimLight = new THREE.DirectionalLight('#fff0c7', 2.4)
    warmRimLight.position.set(4.0, 1.8, 1.6)
    scene.add(warmRimLight)

    // 3. Blue bounce reflection from underneath + ambient world fill
    const bounceHemi = new THREE.HemisphereLight('#8cb8db', '#1461d8', 1.35)
    scene.add(bounceHemi)

    const bouncePoint = new THREE.PointLight('#1461d8', 2.2, 6.0)
    bouncePoint.position.set(0, -1.55, 0.4)
    scene.add(bouncePoint)

    const coralGroup = new THREE.Group()
    scene.add(coralGroup)

    const meshes: THREE.Mesh[] = []
    const loader = new GLTFLoader()
    loader.load(
      '/test-assets/procedural-coral-rock.glb',
      (gltf) => {
        if (disposed) return
        let vertices = 0
        let triangles = 0
        let hasBaseColorMap = false
        let hasRoughnessMap = false
        let hasNormalMap = false

        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            meshes.push(obj)
            obj.castShadow = true
            obj.receiveShadow = true
            const geom = obj.geometry as THREE.BufferGeometry
            const pos = geom.getAttribute('position')
            if (pos) vertices += pos.count
            if (geom.index) triangles += geom.index.count / 3
            else if (pos) triangles += pos.count / 3

            const mat = obj.material as THREE.MeshStandardMaterial
            if (mat) {
              if (mat.map) hasBaseColorMap = true
              if (mat.roughnessMap) hasRoughnessMap = true
              if (mat.normalMap) hasNormalMap = true
              mat.wireframe = controlsRef.current.wireframe
            }
          }
        })

        const box = new THREE.Box3().setFromObject(gltf.scene)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        gltf.scene.position.sub(center)
        coralGroup.add(gltf.scene)

        setDiagnostics({
          loaded: true,
          vertices,
          triangles: Math.round(triangles),
          dimensionsM: [
            Number(size.x.toFixed(3)),
            Number(size.y.toFixed(3)),
            Number(size.z.toFixed(3)),
          ],
          hasBaseColorMap,
          hasRoughnessMap,
          hasNormalMap,
        })
      },
      undefined,
      (err) => {
        if (disposed) return
        setDiagnostics((prev) => ({ ...prev, error: String(err) }))
      },
    )

    function resize() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      renderer.setSize(rect.width, rect.height, false)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let last = performance.now()
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const { lightingPreset: preset, autoRotate: rotate, wireframe: wf } = controlsRef.current
      if (preset === 'tutorial-studio') {
        scene.background = new THREE.Color('#42566e')
        blueKeyLight.color.set('#3b9eff')
        blueKeyLight.intensity = 3.4
        warmRimLight.color.set('#fff0c7')
        warmRimLight.intensity = 2.4
        bounceHemi.color.set('#8cb8db')
        bounceHemi.groundColor.set('#1461d8')
      } else {
        scene.background = new THREE.Color('#061a36')
        blueKeyLight.color.set('#2e6be6')
        blueKeyLight.intensity = 3.8
        warmRimLight.color.set('#eef6ff')
        warmRimLight.intensity = 2.1
        bounceHemi.color.set('#3b78b8')
        bounceHemi.groundColor.set('#081b38')
      }

      for (const m of meshes) {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && mat.wireframe !== wf) mat.wireframe = wf
      }

      if (rotate) {
        coralGroup.rotation.y += dt * 0.42
      }
      orbit.update()
      renderer.render(scene, camera)
    })

    return () => {
      disposed = true
      ro.disconnect()
      renderer.setAnimationLoop(null)
      orbit.dispose()
      renderer.dispose()
    }
  }, [viewMode])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#081826',
        color: '#e6f1f8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 20px',
          background: 'rgba(6, 20, 34, 0.92)',
          borderBottom: '1px solid rgba(110, 175, 225, 0.24)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(46, 155, 255, 0.2)',
                color: '#7cc4ff',
                border: '1px solid rgba(124, 196, 255, 0.35)',
              }}
            >
              Unintegrated Test Sandbox
            </span>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              Procedural Coral / Live Rock Asset Testbench
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ec0d8' }}>
            Cycles Adaptive Displacement (`Dicing Scale 5.0`, `Filmic Very High Contrast`) &amp; Three.js GLB Test Preview — isolated from production `/`
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <div
            role="group"
            aria-label="Test view mode"
            style={{
              display: 'inline-flex',
              background: '#0d2438',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(124, 196, 255, 0.22)',
            }}
          >
            {(
              [
                ['split', 'Split Comparison + Tank'],
                ['turntable', '3D Turntable + Cycles'],
                ['tank', 'Full Test Tank Overlay'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 11px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === mode ? '#1e6fb8' : 'transparent',
                  color: viewMode === mode ? '#ffffff' : '#a9c7df',
                  fontWeight: viewMode === mode ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <Link
            to="/"
            style={{
              padding: '7px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#d8ecff',
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.16)',
            }}
          >
            Production Tank (/)
          </Link>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'tank'
              ? '1fr'
              : viewMode === 'turntable'
                ? 'minmax(380px, 1.2fr) minmax(340px, 1fr)'
                : 'minmax(360px, 1.15fr) minmax(340px, 0.95fr) minmax(360px, 1.1fr)',
          gap: '14px',
          padding: '14px',
        }}
      >
        {viewMode !== 'tank' && (
          <section
            aria-label="Three.js Interactive 3D Coral Rock GLB Turntable"
            style={{
              background: '#0c2033',
              borderRadius: '12px',
              border: '1px solid rgba(124, 196, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(124, 196, 255, 0.14)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '14px' }}>Three.js Live WebGL Render (`.glb`)</strong>
                <span style={{ display: 'block', fontSize: '12px', color: '#8fb4d0' }}>
                  Displaced 15,360-tri mesh + baked procedural BaseColor, Roughness &amp; Dual-Bump Normal maps
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() =>
                    setLightingPreset((p) => (p === 'tutorial-studio' ? 'reef-actinic' : 'tutorial-studio'))
                  }
                  style={{
                    padding: '5px 9px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(124, 196, 255, 0.3)',
                    background: '#13324d',
                    color: '#e6f1f8',
                    cursor: 'pointer',
                  }}
                >
                  Lighting: {lightingPreset === 'tutorial-studio' ? 'Tutorial Studio' : 'Reef 14,000K Actinic'}
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate((r) => !r)}
                  style={{
                    padding: '5px 9px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(124, 196, 255, 0.3)',
                    background: autoRotate ? '#1b578c' : '#13324d',
                    color: '#e6f1f8',
                    cursor: 'pointer',
                  }}
                >
                  {autoRotate ? 'Auto-Rotate: On' : 'Auto-Rotate: Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setWireframe((w) => !w)}
                  style={{
                    padding: '5px 9px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(124, 196, 255, 0.3)',
                    background: wireframe ? '#1b578c' : '#13324d',
                    color: '#e6f1f8',
                    cursor: 'pointer',
                  }}
                >
                  Wireframe
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', flex: 1, minHeight: '360px' }}>
              <canvas
                ref={studioCanvasRef}
                aria-label="Interactive 3D Procedural Coral Rock"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(6, 18, 29, 0.84)',
                  border: '1px solid rgba(124, 196, 255, 0.2)',
                  fontSize: '12px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span>
                  Status:{' '}
                  <strong style={{ color: diagnostics.loaded ? '#6be6a8' : '#ffd166' }}>
                    {diagnostics.error
                      ? `Error: ${diagnostics.error}`
                      : diagnostics.loaded
                        ? 'GLB Ready (Drag to Orbit / Scroll to Zoom)'
                        : 'Loading GLB…'}
                  </strong>
                </span>
                {diagnostics.loaded && (
                  <span>
                    {diagnostics.vertices.toLocaleString()} verts · {diagnostics.triangles.toLocaleString()} tris ·{' '}
                    {diagnostics.dimensionsM.join(' × ')} m
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {viewMode !== 'tank' && (
          <section
            aria-label="Blender Cycles Adaptive Displacement Reference & Node Specifications"
            style={{
              background: '#0c2033',
              borderRadius: '12px',
              border: '1px solid rgba(124, 196, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(124, 196, 255, 0.14)',
              }}
            >
              <strong style={{ fontSize: '14px' }}>
                Blender 5.2 Cycles Adaptive Displacement Render
              </strong>
              <span style={{ display: 'block', fontSize: '12px', color: '#8fb4d0' }}>
                Direct Cycles render (`Dicing Scale: 5.0`, `Filmic` + `Very High Contrast`, `Displacement and Bump`)
              </span>
            </div>

            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              <img
                src="/test-assets/procedural-coral-rock-cycles.png"
                alt="Blender Cycles Adaptive Displacement Render of Procedural Coral Rock"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid rgba(124, 196, 255, 0.24)',
                  display: 'block',
                }}
              />

              <div
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  background: 'rgba(6, 17, 28, 0.65)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(124, 196, 255, 0.15)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', color: '#a8d8ff' }}>
                  Verified Shader Node Tree (`Procedural Coral Rock`)
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbe0f0' }}>
                  <li>
                    <strong>Pores / Holes Mask:</strong> `Texture Coordinate (Object)` → `Noise (Scale 15, Detail 15, Rough 0.5)` + `MixRGB (Linear Light, Fac 0.010)` → `Voronoi (3D, Smooth F1, Euclidean, Scale 14, Smoothness 0.200)` → `ColorRamp (#303030 @ 0.0, #FFFFFF @ 0.535)`
                  </li>
                  <li>
                    <strong>Macro Variation &amp; Displacement:</strong> `Noise (Scale 2, Detail 15, Rough 0.5)` → `ColorRamp (0.353..0.561)` → `MixRGB (Fac=Macro, Color1=VoronoiRamp, Color2=#000000)` → `Displacement (Midlevel 0.500, Scale 0.140)`
                  </li>
                  <li>
                    <strong>Chained Micro-Bump:</strong> `Bump 1 (Strength 0.400, Height=VoronoiRamp)` → `Bump 2 (Strength 0.300, Height=Noise15.Fac)` → `Principled BSDF (Normal)`
                  </li>
                  <li>
                    <strong>Roughness &amp; Base Color:</strong> `ColorRamp (#404040..#FFFFFF)` on `Noise15.Fac`; `Noise (Scale 8, Detail 15)` → `ColorRamp (0.208=#31140B, 0.530=#8A5D40, 0.938=#BF9B7C)`
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {(viewMode === 'split' || viewMode === 'tank') && (
          <section
            aria-label="Test Aquarium Website Scene with Procedural Coral Specimen Overlay"
            style={{
              background: '#0c2033',
              borderRadius: '12px',
              border: '1px solid rgba(124, 196, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: viewMode === 'tank' ? '78vh' : '420px',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(124, 196, 255, 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '14px' }}>Live Aquarium Test Scene (Unintegrated Specimen)</strong>
                <span style={{ display: 'block', fontSize: '12px', color: '#8fb4d0' }}>
                  Renders the live aquarium tank with the test coral rock specimen previewed in-context
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPausedTank((p) => !p)}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(124, 196, 255, 0.3)',
                  background: '#13324d',
                  color: '#e6f1f8',
                  cursor: 'pointer',
                }}
              >
                {pausedTank ? 'Resume Tank' : 'Pause Tank'}
              </button>
            </div>

            <div style={{ position: 'relative', flex: 1, minHeight: '360px' }}>
              <AquariumScene
                services={services}
                paused={pausedTank}
                configurationReady={isLoaded}
              />
              {/* Floating specimen inspection card overlaid inside the test tank */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(6, 19, 32, 0.86)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(124, 196, 255, 0.32)',
                  maxWidth: '420px',
                  pointerEvents: 'none',
                }}
              >
                <img
                  src="/test-assets/procedural-coral-rock-cycles.png"
                  alt="Procedural Coral Rock Specimen"
                  style={{
                    width: '68px',
                    height: '52px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid rgba(124, 196, 255, 0.35)',
                  }}
                />
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#e6f4ff' }}>
                    Test Specimen: Procedural Coral Rock
                  </div>
                  <div style={{ color: '#9ec0d8', marginTop: '2px' }}>
                    `/test-assets/procedural-coral-rock.glb` ({diagnostics.triangles.toLocaleString()} tris) · Not added to production manifest
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
