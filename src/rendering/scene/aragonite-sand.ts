import * as THREE from 'three'
import { reefContactFootprints } from './reef-layout'

export type RockFootprint = Readonly<{
  x: number
  z: number
  radiusX: number
  radiusZ: number
}>

export type AragoniteSandConfig = Readonly<{
  textureSize?: number
  narrow?: boolean
}>

export type AragoniteSandBed = Readonly<{
  group: THREE.Group
  sandMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  frontEdgeMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  rubbleInstances: THREE.InstancedMesh
  shellInstances: THREE.InstancedMesh
  corallineInstances: THREE.InstancedMesh
  albedoTexture: THREE.DataTexture
  normalTexture: THREE.DataTexture
  roughnessTexture: THREE.DataTexture
  update(elapsedSeconds: number, paused: boolean, reducedMotion: boolean): void
  setLayout(narrow: boolean): void
  dispose(): void
}>

const LEFT_CONTACT_AO_STRENGTH = 0.55
const RIGHT_CONTACT_AO_STRENGTH = 0.52

export function getRockFootprintsForViewport(narrow: boolean): readonly RockFootprint[] {
  return reefContactFootprints(narrow)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function hash2(ix: number, iy: number): number {
  const x = ((ix % 64) + 64) % 64
  const y = ((iy % 64) + 64) % 64
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + 1743) >>> 0
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function tileableNoise(u: number, v: number, freq: number): number {
  const x = u * freq
  const y = v * freq
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)

  const wrap = (k: number) => ((k % freq) + freq) % freq
  const v00 = hash2(wrap(ix), wrap(iy))
  const v10 = hash2(wrap(ix + 1), wrap(iy))
  const v01 = hash2(wrap(ix), wrap(iy + 1))
  const v11 = hash2(wrap(ix + 1), wrap(iy + 1))
  const a = v00 + (v10 - v00) * ux
  const b = v01 + (v11 - v01) * ux
  return a + (b - a) * uy
}

type AragoniteSandPixels = Readonly<{
  dim: number
  albedo: Uint8Array
  normal: Uint8Array
  roughness: Uint8Array
}>

// The pixel data is deterministic (fixed seed + tileable noise), so it is
// generated once per size and shared: a scene rebuild must not pay the
// ~180 ms 512² generation again on every createAquarium call (AQ-73).
// Each caller still gets fresh DataTexture wrappers, and dispose() only
// releases GPU resources — the cached bytes stay valid.
const aragoniteSandPixelCache = new Map<number, AragoniteSandPixels>()

/**
 * Generates the deterministic PBR pixel trio (albedo in sRGB, tangent-space
 * normal in Linear, roughness in Linear) calibrated to warm cream/ivory
 * oolitic & special-grade aragonite reef sand (1-2 mm calcium carbonate
 * grains, shell flecks, and pink/lilac coralline specks).
 */
function generateAragoniteSandPixels(dim: number): AragoniteSandPixels {
  const pixelCount = dim * dim
  const albedoData = new Uint8Array(pixelCount * 4)
  const normalData = new Uint8Array(pixelCount * 4)
  const roughnessData = new Uint8Array(pixelCount * 4)
  const heightField = new Float32Array(pixelCount)

  let seed = 0x9e3779b9
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  for (let y = 0; y < dim; y++) {
    const v = y / dim
    for (let x = 0; x < dim; x++) {
      const u = x / dim
      const idx = y * dim + x

      const macro = tileableNoise(u, v, 8)
      const meso = tileableNoise(u, v, 24)
      const fine = tileableNoise(u, v, 64)
      const r0 = nextRand()
      const r1 = nextRand()
      const r2 = nextRand()

      const grainBump = 0.38 * fine + 0.34 * meso + 0.16 * macro + 0.12 * r0
      heightField[idx] = grainBump

      // Warm cream-ivory calcium carbonate base (#E6DCC8 mean, #D0C2B0..#FCF2DC
      // across the grain field), strictly R >= G >= B. The swing is wide
      // enough to read as granular sand at overview distance: the old
      // ±17-step base (mean #EFE8D8) averaged out to flat white under the
      // key + hemi + env light, which is the "flat white sand" visual
      // finding. The speckles below add the pink/tan/white grain accents.
      const baseWarmth = (grainBump - 0.5) * 44 + (r0 - 0.5) * 14
      let r = 230 + baseWarmth
      let g = 220 + baseWarmth * 0.94
      let b = 200 + baseWarmth * 0.85

      if (r1 < 0.055) {
        // 5.5% pink/lilac coralline & Homotrema rubrum foraminifera specks
        r = 212 + (r0 - 0.5) * 18
        g = 166 + (r0 - 0.5) * 16
        b = 182 + (r0 - 0.5) * 18
      } else if (r1 < 0.13) {
        // 7.5% bleached white bivalve / Halimeda flakes
        r = 246 + (r0 - 0.5) * 8
        g = 242 + (r0 - 0.5) * 8
        b = 232 + (r0 - 0.5) * 8
      } else if (r2 < 0.09) {
        // 9% warm tan/ochre skeletal coral fragments
        r = 216 + (r0 - 0.5) * 14
        g = 202 + (r0 - 0.5) * 14
        b = 178 + (r0 - 0.5) * 14
      }

      const p4 = idx * 4
      albedoData[p4] = clamp(Math.round(r), 0, 255)
      albedoData[p4 + 1] = clamp(Math.round(g), 0, 255)
      albedoData[p4 + 2] = clamp(Math.round(b), 0, 255)
      albedoData[p4 + 3] = 255

      const rough = clamp(0.91 - (grainBump - 0.45) * 0.24 - (r1 < 0.13 ? 0.08 : 0), 0.70, 0.96)
      const roughByte = clamp(Math.round(rough * 255), 0, 255)
      roughnessData[p4] = roughByte
      roughnessData[p4 + 1] = roughByte
      roughnessData[p4 + 2] = roughByte
      roughnessData[p4 + 3] = 255
    }
  }

  const strength = 2.65
  for (let y = 0; y < dim; y++) {
    const yPrev = (y - 1 + dim) % dim
    const yNext = (y + 1) % dim
    for (let x = 0; x < dim; x++) {
      const xPrev = (x - 1 + dim) % dim
      const xNext = (x + 1) % dim
      const dhdx = (heightField[y * dim + xNext] - heightField[y * dim + xPrev]) * strength
      const dhdy = (heightField[yNext * dim + x] - heightField[yPrev * dim + x]) * strength
      const nx = -dhdx
      const ny = -dhdy
      const nz = 1.0
      const invLen = 1 / Math.hypot(nx, ny, nz)
      const p4 = (y * dim + x) * 4
      normalData[p4] = clamp(Math.round((nx * invLen * 0.5 + 0.5) * 255), 0, 255)
      normalData[p4 + 1] = clamp(Math.round((ny * invLen * 0.5 + 0.5) * 255), 0, 255)
      normalData[p4 + 2] = clamp(Math.round((nz * invLen * 0.5 + 0.5) * 255), 0, 255)
      normalData[p4 + 3] = 255
    }
  }

  return { dim, albedo: albedoData, normal: normalData, roughness: roughnessData }
}

/**
 * Returns a tileable PBR map trio wrapping the cached deterministic pixels
 * for `size` (fresh DataTexture objects per call, shared pixel bytes).
 */
export function createAragoniteSandPbrTextures(size = 512): {
  albedoTexture: THREE.DataTexture
  normalTexture: THREE.DataTexture
  roughnessTexture: THREE.DataTexture
} {
  const dim = clamp(Math.trunc(size), 64, 1024)
  let pixels = aragoniteSandPixelCache.get(dim)
  if (!pixels) {
    pixels = generateAragoniteSandPixels(dim)
    aragoniteSandPixelCache.set(dim, pixels)
  }
  const { albedo: albedoData, normal: normalData, roughness: roughnessData } = pixels

  const configureTexture = (tex: THREE.DataTexture, srgb: boolean) => {
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(22, 14)
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.generateMipmaps = true
    tex.needsUpdate = true
    return tex
  }

  return {
    albedoTexture: configureTexture(new THREE.DataTexture(albedoData, dim, dim), true),
    normalTexture: configureTexture(new THREE.DataTexture(normalData, dim, dim), false),
    roughnessTexture: configureTexture(new THREE.DataTexture(roughnessData, dim, dim), false),
  }
}

/**
 * Evaluates the world-space sand bed elevation offset (`dy` above base `y = -2.8`) at `(worldX, worldZ)`.
 * Includes:
 *   1. Gentle aquascaping slope rising toward the rear glass (`z = -5.5`) so the foreground isn't a flat slab.
 *   2. Asymmetric flow-sculpted sand ripples with non-parallel wavevectors.
 *   3. Natural talus mounding around the live-rock island perimeters.
 * Strictly capped (`<= 0.40` units above `-2.8`, so `y <= -2.40`) to stay safely below `habitat.bounds.min.y = -2.25`.
 */
export function evaluateAragoniteSandElevation(
  worldX: number,
  worldZ: number,
  narrow = false,
): number {
  const backProgress = clamp((2.8 - worldZ) / 8.2, 0, 1)
  const backSlope = 0.25 * Math.pow(backProgress, 1.25)

  const ripple1 = 0.030 * Math.sin(worldX * 1.35 + worldZ * 0.55 + 0.40 * Math.sin(worldZ * 0.9))
  const ripple2 = 0.020 * Math.cos(worldZ * 1.85 - worldX * 0.62)
  const duneUndulation = 0.032 * Math.sin(worldX * 0.45 - 0.6) * Math.cos(worldZ * 0.38)

  const footprints = getRockFootprintsForViewport(narrow)
  let rockTalus = 0
  for (const fp of footprints) {
    const nx = (worldX - fp.x) / fp.radiusX
    const nz = (worldZ - fp.z) / fp.radiusZ
    const r2 = nx * nx + nz * nz
    const berm = 0.11 * Math.exp(-Math.pow(r2 - 0.55, 2) / 0.48)
    rockTalus += berm
  }

  return clamp(backSlope + ripple1 + ripple2 + duneUndulation + rockTalus, -0.06, 0.40)
}

/**
 * Evaluates tight physical rock-base contact ambient occlusion (`1.0` in open sand,
 * darkening smoothly to `0.45` right where the live-rock base meets the aragonite bed).
 * Replaces the old oversized hand-painted indigo blobs. The strengths were
 * raised from 0.42/0.40 (visual-check fix): the old grounding ring was too
 * weak to read under the bright sand, so the islands looked like they were
 * floating on white. The fade is also wider (0.55..1.55) so the ring extends
 * visibly beyond the rock edge instead of hiding underneath it.
 */
export function evaluateRockBaseContactFactor(
  worldX: number,
  worldZ: number,
  narrow = false,
): number {
  const footprints = getRockFootprintsForViewport(narrow)
  let factor = 1.0
  for (let i = 0; i < footprints.length; i++) {
    const fp = footprints[i]
    const nx = (worldX - fp.x) / (fp.radiusX * 0.92)
    const nz = (worldZ - fp.z) / (fp.radiusZ * 0.92)
    const r = Math.hypot(nx, nz)
    const strength = i === 0 ? LEFT_CONTACT_AO_STRENGTH : RIGHT_CONTACT_AO_STRENGTH
    const contact = 1.0 - strength * (1.0 - smoothstep(0.55, 1.55, r))
    factor = Math.min(factor, contact)
  }
  return factor
}

function applySandGeometryElevation(geometry: THREE.PlaneGeometry, narrow: boolean): void {
  const pos = geometry.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const sx = pos.getX(i)
    const sy = pos.getY(i)
    const worldX = sx
    const worldZ = -sy
    const elevation = evaluateAragoniteSandElevation(worldX, worldZ, narrow)
    pos.setZ(i, elevation)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
}

function createFrontSandEdgeGeometry(narrow: boolean): THREE.BufferGeometry {
  const segmentsX = 96
  const width = 16
  const frontZ = 2.82
  const bottomY = -3.18
  const baseSandY = -2.8

  const positions = new Float32Array((segmentsX + 1) * 2 * 3)
  const normals = new Float32Array((segmentsX + 1) * 2 * 3)
  const uvs = new Float32Array((segmentsX + 1) * 2 * 2)
  const indices: number[] = []

  for (let i = 0; i <= segmentsX; i++) {
    const u = i / segmentsX
    const wx = (u - 0.5) * width
    const topY = baseSandY + evaluateAragoniteSandElevation(wx, frontZ, narrow)

    const topIdx = i * 2
    const botIdx = i * 2 + 1

    positions[topIdx * 3] = wx
    positions[topIdx * 3 + 1] = topY
    positions[topIdx * 3 + 2] = frontZ
    normals[topIdx * 3 + 2] = 1
    uvs[topIdx * 2] = u * 12
    uvs[topIdx * 2 + 1] = 1

    positions[botIdx * 3] = wx
    positions[botIdx * 3 + 1] = bottomY
    positions[botIdx * 3 + 2] = frontZ
    normals[botIdx * 3 + 2] = 1
    uvs[botIdx * 2] = u * 12
    uvs[botIdx * 2 + 1] = 0

    if (i < segmentsX) {
      const a = i * 2
      const b = i * 2 + 1
      const c = (i + 1) * 2
      const d = (i + 1) * 2 + 1
      indices.push(a, b, c, c, b, d)
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geom.setIndex(indices)
  return geom
}

function populateScatterInstances(
  rubbleMesh: THREE.InstancedMesh,
  shellMesh: THREE.InstancedMesh,
  corallineMesh: THREE.InstancedMesh,
  narrow: boolean,
): void {
  const footprints = getRockFootprintsForViewport(narrow)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const baseSandY = -2.8

  let seed = narrow ? 4109 : 8293
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  const sampleFragmentScale = (nearRock: boolean) => {
    const size = Math.pow(rand(), 2.2)
    return nearRock && rand() > 0.94 ? 0.004 + size * 0.004 : 0.001 + size * 0.001
  }

  const sampleScatterPoint = (index: number, total: number) => {
    const fp = footprints[index % footprints.length]
    const nearRock = index < total * 0.72
    let wx: number
    let wz: number
    if (nearRock) {
      const angle = rand() * Math.PI * 2
      const dist = 0.78 + rand() * 0.95
      wx = fp.x + Math.cos(angle) * fp.radiusX * dist
      wz = fp.z + Math.sin(angle) * fp.radiusZ * dist
    } else {
      const halfSpanX = narrow ? 1.8 : 4.2
      wx = (rand() - 0.5) * 2 * halfSpanX
      wz = -3.4 + rand() * 5.8
    }
    wx = clamp(wx, -4.6, 4.6)
    wz = clamp(wz, -4.4, 2.55)
    const wy = baseSandY + evaluateAragoniteSandElevation(wx, wz, narrow) - 0.004
    return { wx, wy, wz, nearRock }
  }

  for (let i = 0; i < rubbleMesh.count; i++) {
    const { wx, wy, wz, nearRock } = sampleScatterPoint(i, rubbleMesh.count)
    dummy.position.set(wx, wy, wz)
    dummy.rotation.set(rand() * 0.5 - 0.25, rand() * Math.PI * 2, rand() * 0.5 - 0.25)
    const sx = sampleFragmentScale(nearRock)
    const sy = sx * 0.55
    const sz = sx * 0.9
    dummy.scale.set(sx, sy, sz)
    dummy.updateMatrix()
    rubbleMesh.setMatrixAt(i, dummy.matrix)
    const shade = 0.80 + rand() * 0.16
    color.setRGB(shade * 0.95, shade * 0.90, shade * 0.80)
    rubbleMesh.setColorAt(i, color)
  }
  rubbleMesh.instanceMatrix.needsUpdate = true
  if (rubbleMesh.instanceColor) rubbleMesh.instanceColor.needsUpdate = true

  for (let i = 0; i < shellMesh.count; i++) {
    const { wx, wy, wz, nearRock } = sampleScatterPoint(i + 17, shellMesh.count)
    dummy.position.set(wx, wy + 0.003, wz)
    dummy.rotation.set(-Math.PI * 0.35 + (rand() - 0.5) * 0.4, rand() * Math.PI * 2, (rand() - 0.5) * 0.4)
    const s = sampleFragmentScale(nearRock)
    dummy.scale.set(s * 1.25, s * 0.45, s)
    dummy.updateMatrix()
    shellMesh.setMatrixAt(i, dummy.matrix)
    const pearl = 0.88 + rand() * 0.11
    color.setRGB(pearl, pearl * 0.96, pearl * 0.88)
    shellMesh.setColorAt(i, color)
  }
  shellMesh.instanceMatrix.needsUpdate = true
  if (shellMesh.instanceColor) shellMesh.instanceColor.needsUpdate = true

  for (let i = 0; i < corallineMesh.count; i++) {
    const { wx, wy, wz, nearRock } = sampleScatterPoint(i + 31, corallineMesh.count)
    dummy.position.set(wx, wy, wz)
    dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5)
    const s = sampleFragmentScale(nearRock)
    dummy.scale.set(s * 1.2, s * 0.55, s * 0.95)
    dummy.updateMatrix()
    corallineMesh.setMatrixAt(i, dummy.matrix)
    const v = 0.75 + rand() * 0.22
    color.setRGB(0.68 * v, 0.36 * v, 0.54 * v)
    corallineMesh.setColorAt(i, color)
  }
  corallineMesh.instanceMatrix.needsUpdate = true
  if (corallineMesh.instanceColor) corallineMesh.instanceColor.needsUpdate = true
}

export function createAragoniteSandBed(config: AragoniteSandConfig = {}): AragoniteSandBed {
  let narrow = Boolean(config.narrow)
  const { albedoTexture, normalTexture, roughnessTexture } = createAragoniteSandPbrTextures(
    config.textureSize ?? 512,
  )

  const sandGeometry = new THREE.PlaneGeometry(32, 20, 128, 80)
  applySandGeometryElevation(sandGeometry, narrow)

  const sandUniforms = {
    uLeftFootprint: { value: new THREE.Vector4() },
    uRightFootprint: { value: new THREE.Vector4() },
    uSingleIslandMode: { value: narrow ? 1 : 0 },
  }

  const syncFootprintUniforms = (isNarrow: boolean) => {
    const fps = getRockFootprintsForViewport(isNarrow)
    sandUniforms.uLeftFootprint.value.set(fps[0].x, fps[0].z, fps[0].radiusX, fps[0].radiusZ)
    if (fps[1]) {
      sandUniforms.uRightFootprint.value.set(fps[1].x, fps[1].z, fps[1].radiusX, fps[1].radiusZ)
      sandUniforms.uSingleIslandMode.value = 0
    } else {
      sandUniforms.uSingleIslandMode.value = 1
    }
  }
  syncFootprintUniforms(narrow)

  const sandMaterial = new THREE.MeshStandardMaterial({
    map: albedoTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: roughnessTexture,
    roughness: 0.92,
    metalness: 0.0,
  })

  sandMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, sandUniforms)
    shader.vertexShader =
      `varying vec3 vSandWorldPos;\nvarying vec2 vSandRawUv;\n` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvec4 sandWp = modelMatrix * vec4(transformed, 1.0);\nvSandWorldPos = sandWp.xyz;\nvSandRawUv = uv;`,
    )
    shader.fragmentShader =
      `uniform vec4 uLeftFootprint;\nuniform vec4 uRightFootprint;\nuniform float uSingleIslandMode;\nvarying vec3 vSandWorldPos;\nvarying vec2 vSandRawUv;\n` +
      shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
// Shared world-space sample coordinates for all three generated PBR maps.
vec2 uvPrimary = vSandWorldPos.xz * 1.35;
mat2 rot37 = mat2(0.7986355, -0.6018150, 0.6018150, 0.7986355);
vec2 uvSecondary = rot37 * (vSandWorldPos.xz * 0.52) + vec2(0.37, 0.71);
float macroSignal = 0.5 + 0.32 * sin(vSandWorldPos.x * 0.65 + cos(vSandWorldPos.z * 0.78)) + 0.18 * cos(vSandWorldPos.x * 1.4 - vSandWorldPos.z * 1.2);
float sandMacroBlend = smoothstep(0.28, 0.72, macroSignal);`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
// Dual-scale rotated aperiodic UV sampling eliminates visible grid repetition at all viewports (AQ-70.12 AC #1)
vec4 texelPrimary = texture2D(map, uvPrimary);
vec4 texelSecondary = texture2D(map, uvSecondary);
vec4 sampledDiffuseColor = mix(texelPrimary, texelSecondary, sandMacroBlend);
diffuseColor *= sampledDiffuseColor;
#endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
        `#include <color_fragment>
// Macro warm aragonite variation & natural olive-tan detritus settling near rock bases (AQ-70.12 AC #1 & #2)
vec2 dLeft = (vSandWorldPos.xz - uLeftFootprint.xy) / (uLeftFootprint.zw * 0.92);
float rLeft = length(dLeft);
float aoLeft = 1.0 - ${LEFT_CONTACT_AO_STRENGTH.toFixed(2)} * (1.0 - smoothstep(0.55, 1.55, rLeft));

vec2 dRight = (vSandWorldPos.xz - uRightFootprint.xy) / (uRightFootprint.zw * 0.92);
float rRight = length(dRight);
float aoRight = mix(1.0 - ${RIGHT_CONTACT_AO_STRENGTH.toFixed(2)} * (1.0 - smoothstep(0.55, 1.55, rRight)), 1.0, uSingleIslandMode);
float rockContactAo = min(aoLeft, aoRight);

// Flow-sculpted sand ripple crests & troughs + under-arch shadow pockets (AQ-70.12, AQ-73, AQ-94)
float rippleWave = 0.5 + 0.34 * sin(vSandWorldPos.x * 2.45 + vSandWorldPos.z * 1.15 + 0.45 * sin(vSandWorldPos.z * 1.5)) + 0.16 * cos(vSandWorldPos.z * 3.2 - vSandWorldPos.x * 1.3);
float troughMask = (1.0 - smoothstep(0.24, 0.56, rippleWave)) * 0.12;
float crestHighlight = smoothstep(0.58, 0.88, rippleWave) * 0.08;

// Subtle warm detritus & dampened aragonite near rock bases and ripple troughs (never blue-grey or indigo)
float detritusMask = clamp((1.0 - smoothstep(0.70, 1.60, min(rLeft, mix(rRight, 99.0, uSingleIslandMode)))) * 0.50 + troughMask, 0.0, 0.68);
vec3 warmDetritus = vec3(0.76, 0.70, 0.58);
diffuseColor.rgb = mix(diffuseColor.rgb, warmDetritus, detritusMask);
diffuseColor.rgb *= (1.0 + crestHighlight);

// Deep under-arch & cave-mouth contact shadow pockets framing the swim-through channels
float leftCaveShadow = exp(-pow((vSandWorldPos.x + 2.35) / 0.55, 2.0) - pow((vSandWorldPos.z + 1.15) / 0.50, 2.0)) * 0.28;
float rightArchShadow = exp(-pow((vSandWorldPos.x - 2.35) / 0.68, 2.0) - pow((vSandWorldPos.z + 1.05) / 0.52, 2.0)) * 0.32 * (1.0 - uSingleIslandMode);
rockContactAo *= (1.0 - max(leftCaveShadow, rightArchShadow));

// Gentle rear-water depth attenuation preserving warm cream foreground on caustic ridges
// while shading ambient sand into moody underwater reef-blue shadow (more_realistic_reef_guide.png)
float rearFade = smoothstep(-5.2, -0.4, vSandWorldPos.z);
vec3 rearWaterTint = vec3(0.18, 0.30, 0.50);
vec3 frontSandTint = vec3(0.96, 0.95, 0.92);
diffuseColor.rgb *= mix(rearWaterTint, frontSandTint, rearFade);
// Shadowed contact where the substrate reaches the dark rear wall.
// Confine this contact transition to the final 0.95 display units of substrate;
// no screen-space gradient or lateral vignette darkens the foreground.
float rearWallDistance = max(vSandWorldPos.z + 5.5, 0.0);
float rearWallContact = mix(0.035, 1.0, smoothstep(0.0, 0.95, rearWallDistance));
diffuseColor.rgb *= rearWallContact;
// Local central arch pocket remains tied to the reef footprint.
float centerArchPocket = exp(-pow(vSandWorldPos.x / 1.45, 2.0) - pow((vSandWorldPos.z + 1.25) / 1.15, 2.0)) * 0.42 * (1.0 - uSingleIslandMode);
// Visual-check fix: the dual-scale UV blend only swaps grain phase, so at
// overview distance (mipmapped) both samples average to the same mean and
// the field reads flat white. Modulate luminance by the same macro signal
// so broad warm patches (±10%, zero mean change) survive at any distance.
diffuseColor.rgb *= 0.90 + 0.20 * sandMacroBlend;
diffuseColor.rgb *= rockContactAo * (1.0 - centerArchPocket);
// AQ-70.6: the sand's own caustic ridge network was removed. The shared
// cellular caustic chunk (caustics.ts) is applied to the sand material in
// rebuildHabitat, so the sand, rock, coral, and fish all show the one
// caustic system instead of two disagreeing patterns.
`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
vec4 roughnessPrimary = texture2D(roughnessMap, uvPrimary);
vec4 roughnessSecondary = texture2D(roughnessMap, uvSecondary);
roughnessFactor *= mix(roughnessPrimary.g, roughnessSecondary.g, sandMacroBlend);
// Calcite & shell grain micro-sparkle at close range (AQ-73 AC #1)
vec3 viewDir = normalize(cameraPosition - vSandWorldPos);
vec2 sparkleCell = floor(vSandWorldPos.xz * 220.0 + viewDir.xz * 6.0);
float sparkleSignal = fract(sin(dot(sparkleCell, vec2(127.1, 311.7))) * 43758.5453);
float sparkleGlint = step(0.975, sparkleSignal) * smoothstep(0.45, 0.85, rippleWave);
roughnessFactor = mix(roughnessFactor, 0.08, sparkleGlint);
#endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#ifdef USE_NORMALMAP_TANGENTSPACE
vec3 mapNPrimary = texture2D(normalMap, uvPrimary).xyz * 2.0 - 1.0;
vec3 mapNSecondary = texture2D(normalMap, uvSecondary).xyz * 2.0 - 1.0;
#if defined( USE_PACKED_NORMALMAP )
mapNPrimary = vec3(mapNPrimary.xy, sqrt(saturate(1.0 - dot(mapNPrimary.xy, mapNPrimary.xy))));
mapNSecondary = vec3(mapNSecondary.xy, sqrt(saturate(1.0 - dot(mapNSecondary.xy, mapNSecondary.xy))));
#endif
mapNPrimary.xy *= normalScale;
mapNSecondary.xy *= normalScale;
mat3 sandTbnPrimary = getTangentFrame(-vViewPosition, normal, uvPrimary);
mat3 sandTbnSecondary = getTangentFrame(-vViewPosition, normal, uvSecondary);
#ifdef DOUBLE_SIDED
sandTbnPrimary[0] *= faceDirection;
sandTbnPrimary[1] *= faceDirection;
sandTbnSecondary[0] *= faceDirection;
sandTbnSecondary[1] *= faceDirection;
#endif
vec3 sandNormalPrimary = normalize(sandTbnPrimary * mapNPrimary);
vec3 sandNormalSecondary = normalize(sandTbnSecondary * mapNSecondary);
normal = normalize(mix(sandNormalPrimary, sandNormalSecondary, sandMacroBlend));

// Flow-sculpted micro-ripples tilt the sand into the key and fill lights.
float phase1 = vSandWorldPos.x * 2.45 + vSandWorldPos.z * 1.15 + 0.45 * sin(vSandWorldPos.z * 1.5);
float phase2 = vSandWorldPos.z * 3.2 - vSandWorldPos.x * 1.3;
float dRippleDx = 0.34 * cos(phase1) * 2.45 + 0.16 * sin(phase2) * 1.3;
float dRippleDz = 0.34 * cos(phase1) * (1.15 + 0.45 * 1.5 * cos(vSandWorldPos.z * 1.5)) - 0.16 * sin(phase2) * 3.2;
float rippleStrength = 0.085 * smoothstep(-5.0, -1.0, vSandWorldPos.z);
normal = normalize(normal + vec3(-dRippleDx * rippleStrength, 0.0, -dRippleDz * rippleStrength));
#elif defined( USE_NORMALMAP_OBJECTSPACE )
normal = texture2D(normalMap, uvPrimary).xyz * 2.0 - 1.0;
#ifdef FLIP_SIDED
normal = -normal;
#endif
#ifdef DOUBLE_SIDED
normal = normal * faceDirection;
#endif
normal = normalize(normalMatrix * normal);
#elif defined( USE_BUMPMAP )
normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);
#endif`,
    )
  }

  const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial)
  sandMesh.name = 'AragoniteSandBed'
  sandMesh.rotation.x = -Math.PI / 2
  sandMesh.position.y = -2.8
  sandMesh.receiveShadow = true

  let frontEdgeGeometry = createFrontSandEdgeGeometry(narrow)
  const frontEdgeMaterial = new THREE.MeshStandardMaterial({
    map: albedoTexture,
    roughness: 0.94,
    metalness: 0.0,
  })
  const deepBedColor = new THREE.Color('#262936')
  const compactedBedColor = new THREE.Color('#6d6558')
  const oxygenatedCrustColor = new THREE.Color('#c6baa4')
  frontEdgeMaterial.onBeforeCompile = shader => {
    // MeshStandardMaterial only supplies vUv when a UV-consuming map define
    // is enabled. The geometry's uv attribute is available in the vertex
    // program, so pass it through our own varying for the mapless case too.
    shader.vertexShader = 'varying vec2 vFrontEdgeUv;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
vFrontEdgeUv = uv;`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying vec2 vFrontEdgeUv;`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
vec3 deepBedColor = vec3(${deepBedColor.r.toFixed(4)}, ${deepBedColor.g.toFixed(4)}, ${deepBedColor.b.toFixed(4)});
vec3 compactedBedColor = vec3(${compactedBedColor.r.toFixed(4)}, ${compactedBedColor.g.toFixed(4)}, ${compactedBedColor.b.toFixed(4)});
vec3 oxygenatedCrustColor = vec3(${oxygenatedCrustColor.r.toFixed(4)}, ${oxygenatedCrustColor.g.toFixed(4)}, ${oxygenatedCrustColor.b.toFixed(4)});
float middleLayerMask = smoothstep(0.25, 0.29, vFrontEdgeUv.y) * (1.0 - smoothstep(0.78, 0.82, vFrontEdgeUv.y));
float strataNoise = sin(vFrontEdgeUv.y * 115.0 + sin(vFrontEdgeUv.x * 8.0) * 1.5) * 0.014;
vec3 edgeColor = mix(deepBedColor, compactedBedColor, smoothstep(0.23, 0.27, vFrontEdgeUv.y));
edgeColor = mix(edgeColor, oxygenatedCrustColor, smoothstep(0.80, 0.84, vFrontEdgeUv.y));
edgeColor += strataNoise * middleLayerMask * vec3(0.70, 0.65, 0.55);
diffuseColor.rgb = edgeColor;`,
    )
  }
  const frontEdgeMesh = new THREE.Mesh(frontEdgeGeometry, frontEdgeMaterial)
  frontEdgeMesh.name = 'AragoniteFrontGlassSandEdge'
  frontEdgeMesh.receiveShadow = true
  frontEdgeMesh.raycast = () => {}

  const rubbleGeometry = new THREE.DodecahedronGeometry(1, 0)
  const rubbleMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.90,
    metalness: 0.0,
  })
  const rubbleInstances = new THREE.InstancedMesh(rubbleGeometry, rubbleMaterial, 96)
  rubbleInstances.name = 'AragoniteRubbleInstances'
  rubbleInstances.castShadow = true
  rubbleInstances.receiveShadow = true
  rubbleInstances.raycast = () => {}

  const shellGeometry = new THREE.ConeGeometry(1, 0.7, 7, 1, true)
  const shellMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.68,
    metalness: 0.02,
    side: THREE.DoubleSide,
  })
  const shellInstances = new THREE.InstancedMesh(shellGeometry, shellMaterial, 64)
  shellInstances.name = 'AragoniteShellInstances'
  shellInstances.receiveShadow = true
  shellInstances.raycast = () => {}

  const corallineGeometry = new THREE.IcosahedronGeometry(1, 0)
  const corallineMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0.0,
  })
  const corallineInstances = new THREE.InstancedMesh(corallineGeometry, corallineMaterial, 48)
  corallineInstances.name = 'AragoniteCorallineInstances'
  corallineInstances.receiveShadow = true
  corallineInstances.raycast = () => {}

  populateScatterInstances(rubbleInstances, shellInstances, corallineInstances, narrow)

  const group = new THREE.Group()
  group.name = 'AragoniteSandGroup'
  group.add(sandMesh, frontEdgeMesh, rubbleInstances, shellInstances, corallineInstances)

  return {
    group,
    sandMesh,
    frontEdgeMesh,
    rubbleInstances,
    shellInstances,
    corallineInstances,
    albedoTexture,
    normalTexture,
    roughnessTexture,
// AQ-70.6: the sand no longer carries its own caustic clock or ridge
// network. The shared cellular caustic chunk (caustics.ts) is applied to
// the sand material in rebuildHabitat and drives the pattern from the one
// frozen/shared caustic time, so the sand can never disagree with the
// rock, coral, and fish caustics. The update hook is kept (it is part of
// the bed's interface) but is now a no-op for time.
    update(_elapsedSeconds: number, _paused: boolean, _reducedMotion: boolean) {
      // No-op: sand caustics now come from the shared caustics chunk.
    },
    setLayout(nextNarrow: boolean) {
      if (narrow === nextNarrow) return
      narrow = nextNarrow
      syncFootprintUniforms(narrow)
      applySandGeometryElevation(sandGeometry, narrow)
      const nextFrontGeom = createFrontSandEdgeGeometry(narrow)
      frontEdgeMesh.geometry.dispose()
      frontEdgeMesh.geometry = nextFrontGeom
      frontEdgeGeometry = nextFrontGeom
      populateScatterInstances(rubbleInstances, shellInstances, corallineInstances, narrow)
    },
    dispose() {
      sandGeometry.dispose()
      sandMaterial.dispose()
      frontEdgeGeometry.dispose()
      frontEdgeMaterial.dispose()
      rubbleGeometry.dispose()
      rubbleMaterial.dispose()
      shellGeometry.dispose()
      shellMaterial.dispose()
      corallineGeometry.dispose()
      corallineMaterial.dispose()
      albedoTexture.dispose()
      normalTexture.dispose()
      roughnessTexture.dispose()
    },
  }
}
