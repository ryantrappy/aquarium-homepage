import * as THREE from 'three'
import aragoniteSandSource from '../scene/aragonite-sand.ts?raw'
import { createAragoniteSandBed } from '../scene/aragonite-sand'

const EXPECTED_FACTORY_SHA256 = '5b1439e98a09d3c0e5e9cf41d03f846e9b46fd30f946fe43873afd63ba649075'
const TARGET_WIDTH = 480
const TARGET_HEIGHT = 320

const canvasElement = document.querySelector<HTMLCanvasElement>('#sand-canvas')
const buttonElement = document.querySelector<HTMLButtonElement>('#run-proof')
const outputElement = document.querySelector<HTMLOutputElement>('#proof-report')
if (!canvasElement || !buttonElement || !outputElement) throw new Error('Sand proof page is missing a required DOM element')
const canvas: HTMLCanvasElement = canvasElement
const button: HTMLButtonElement = buttonElement
const output: HTMLOutputElement = outputElement

const shaderErrors: Array<{ program: string; vertex: string | null; fragment: string | null }> = []
const webglErrors: Array<{ phase: string; code: number; name: string }> = []
let contextLost = false

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(1)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NoToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.debug.checkShaderErrors = true
renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
  shaderErrors.push({
    program: gl.getProgramInfoLog(program as unknown as Parameters<typeof gl.getProgramInfoLog>[0]) ?? '(no program log)',
    vertex: gl.getShaderInfoLog(vertexShader as unknown as Parameters<typeof gl.getShaderInfoLog>[0]),
    fragment: gl.getShaderInfoLog(fragmentShader as unknown as Parameters<typeof gl.getShaderInfoLog>[0]),
  })
}

const gl = renderer.getContext()
const scene = new THREE.Scene()
scene.background = new THREE.Color('#182a31')

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 80)
camera.position.set(0, 7.6, 15.5)
camera.lookAt(0, -2.55, -0.25)

scene.add(new THREE.HemisphereLight('#f1f5f2', '#746c59', 1.25))
const keyLight = new THREE.DirectionalLight('#fff5df', 2.25)
keyLight.position.set(-5.5, 10, 7)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(1024, 1024)
keyLight.shadow.bias = -0.00015
keyLight.shadow.normalBias = 0.012
Object.assign(keyLight.shadow.camera, { left: -18, right: 18, top: 15, bottom: -15, near: 0.1, far: 40 })
keyLight.shadow.camera.updateProjectionMatrix()
scene.add(keyLight, keyLight.target)

const fillLight = new THREE.DirectionalLight('#bedbff', 0.55)
fillLight.position.set(6, 4, -7)
scene.add(fillLight)

const sandBed = createAragoniteSandBed({ narrow: window.innerWidth < 600 })
scene.add(sandBed.group)

const target = new THREE.WebGLRenderTarget(TARGET_WIDTH, TARGET_HEIGHT, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: true,
  stencilBuffer: false,
  generateMipmaps: false,
})

function hex(bytes: Uint8Array): string {
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer)
  return hex(new Uint8Array(digest))
}

async function sha256Pixels(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer)
  return hex(new Uint8Array(digest))
}

function drainGlErrors(phase: string): void {
  for (let attempts = 0; attempts < 16; attempts++) {
    const code = gl.getError()
    if (code === gl.NO_ERROR) return
    const names = new Map<number, string>([
      [gl.INVALID_ENUM, 'INVALID_ENUM'],
      [gl.INVALID_VALUE, 'INVALID_VALUE'],
      [gl.INVALID_OPERATION, 'INVALID_OPERATION'],
      [gl.OUT_OF_MEMORY, 'OUT_OF_MEMORY'],
      [gl.INVALID_FRAMEBUFFER_OPERATION, 'INVALID_FRAMEBUFFER_OPERATION'],
      [gl.CONTEXT_LOST_WEBGL, 'CONTEXT_LOST_WEBGL'],
    ])
    const name = names.get(code) ?? 'UNKNOWN_WEBGL_ERROR'
    webglErrors.push({ phase, code, name })
  }
}

function viewportLayout() {
  const rect = canvas.getBoundingClientRect()
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    canvasCssWidth: rect.width,
    canvasCssHeight: rect.height,
    canvasBackingWidth: canvas.width,
    canvasBackingHeight: canvas.height,
    narrow: window.innerWidth < 600,
    readbackWidth: TARGET_WIDTH,
    readbackHeight: TARGET_HEIGHT,
  }
}

function renderVisible(): void {
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  renderer.setSize(rect.width, rect.height, false)
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  sandBed.setLayout(window.innerWidth < 600)
  renderVisible()
})
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault()
  contextLost = true
  button.disabled = true
  output.textContent = 'WebGL context lost; proof stopped.'
})
window.addEventListener('error', event => {
  output.textContent = `Browser error: ${event.message}`
})
window.addEventListener('unhandledrejection', event => {
  output.textContent = `Unhandled rejection: ${String(event.reason)}`
})

async function capturePixels(elapsedSeconds: number, paused: boolean, reducedMotion: boolean): Promise<string> {
  sandBed.update(elapsedSeconds, paused, reducedMotion)
  const previousAspect = camera.aspect
  renderer.setRenderTarget(target)
  camera.aspect = TARGET_WIDTH / TARGET_HEIGHT
  camera.updateProjectionMatrix()
  renderer.clear(true, true, true)
  renderer.render(scene, camera)
  const pixels = new Uint8Array(TARGET_WIDTH * TARGET_HEIGHT * 4)
  renderer.readRenderTargetPixels(target, 0, 0, TARGET_WIDTH, TARGET_HEIGHT, pixels)
  renderer.setRenderTarget(null)
  camera.aspect = previousAspect
  camera.updateProjectionMatrix()
  renderVisible()
  return sha256Pixels(pixels)
}

function rendererStats() {
  return {
    programCount: renderer.info.programs?.length ?? 0,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    webgl2: renderer.capabilities.isWebGL2,
    maxTextureSize: renderer.capabilities.maxTextureSize,
    glVersion: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    surfaceGeometryHasTangent: sandBed.sandMesh.geometry.hasAttribute('tangent'),
    mapColorSpaces: {
      albedo: sandBed.albedoTexture.colorSpace,
      normal: sandBed.normalTexture.colorSpace,
      roughness: sandBed.roughnessTexture.colorSpace,
    },
    shadowMapEnabled: renderer.shadowMap.enabled,
    shadowMapSize: keyLight.shadow.mapSize.toArray(),
    contextLost,
  }
}

try {
  const factorySha256 = await sha256(aragoniteSandSource)
  if (factorySha256 !== EXPECTED_FACTORY_SHA256) {
    throw new Error(`Factory source hash mismatch: expected ${EXPECTED_FACTORY_SHA256}, received ${factorySha256}`)
  }

  sandBed.update(0, false, false)
  renderer.compileAsync(scene, camera).then(() => {
    drainGlErrors('compileAsync')
    renderVisible()
    drainGlErrors('initial-render')
    button.disabled = false
    output.textContent = JSON.stringify({
      status: 'factory-hash-verified-and-material-compiled',
      factorySha256,
      expectedFactorySha256: EXPECTED_FACTORY_SHA256,
      layout: viewportLayout(),
      stats: rendererStats(),
      shaderErrors,
      webglErrors,
      scope: 'Functional shader and phase proof only; not photorealism, tiling, physical grain scale, or frame-time acceptance.',
    }, null, 2)
  }).catch(error => {
    output.textContent = `WebGL compile failed: ${String(error)}`
    console.error(error)
  })
} catch (error) {
  output.textContent = `Proof setup failed: ${String(error)}`
  console.error(error)
}

button.addEventListener('click', async () => {
  button.disabled = true
  output.textContent = 'Rendering deterministic GPU phase comparisons…'
  try {
    const activeQuarter = await capturePixels(0.25, false, false)
    const activeOneQuarter = await capturePixels(1.25, false, false)
    const pausedHeld = await capturePixels(2.25, true, false)
    const reducedHeld = await capturePixels(97.5, false, true)
    const resumed = await capturePixels(2.25, false, false)
    const configuredTimeFirst = await capturePixels(37.125, false, false)
    const configuredTimeSecond = await capturePixels(37.125, false, false)
    drainGlErrors('phase-comparisons')

    const comparisons = {
      activeTimeChangesPixels: activeQuarter !== activeOneQuarter,
      pauseHoldsLastPhase: pausedHeld === activeOneQuarter,
      reducedMotionHoldsLastPhase: reducedHeld === activeOneQuarter,
      resumeAdvancesPhase: resumed !== pausedHeld,
      configuredTimeReproducible: configuredTimeFirst === configuredTimeSecond,
      sourcePinVerified: await sha256(aragoniteSandSource) === EXPECTED_FACTORY_SHA256,
      shaderCompileClean: shaderErrors.length === 0,
      webglErrorsClean: webglErrors.length === 0,
    }
    const passed = Object.values(comparisons).every(Boolean)
    output.textContent = JSON.stringify({
      status: passed ? 'PASS' : 'FAIL',
      factorySha256: EXPECTED_FACTORY_SHA256,
      layout: viewportLayout(),
      comparisons,
      pixelHashes: {
        activeQuarter,
        activeOneQuarter,
        pausedHeld,
        reducedHeld,
        resumed,
        configuredTimeFirst,
        configuredTimeSecond,
      },
      stats: rendererStats(),
      shaderErrors,
      webglErrors,
      scope: 'Functional shader and phase proof only; not photorealism, tiling, physical grain scale, contact-art, or frame-time acceptance.',
    }, null, 2)
  } catch (error) {
    output.textContent = `GPU phase proof failed: ${String(error)}`
    console.error(error)
  } finally {
    button.disabled = false
  }
})
