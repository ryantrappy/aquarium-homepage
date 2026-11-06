import * as THREE from 'three'

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

const DESKTOP_ROCK_FOOTPRINTS: readonly RockFootprint[] = Object.freeze([
  { x: -2.35, z: -1.35, radiusX: 1.85, radiusZ: 1.15 },
  { x: 2.65, z: -1.20, radiusX: 1.75, radiusZ: 1.10 },
])

const MOBILE_ROCK_FOOTPRINTS: readonly RockFootprint[] = Object.freeze([
  { x: -0.15, z: -1.35, radiusX: 1.45, radiusZ: 0.95 },
])

export function getRockFootprintsForViewport(narrow: boolean): readonly RockFootprint[] {
  return narrow ? MOBILE_ROCK_FOOTPRINTS : DESKTOP_ROCK_FOOTPRINTS
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

/**
 * Generates a tileable PBR map trio (albedo in sRGB, tangent-space normal in Linear,
 * roughness in Linear) calibrated to warm cream/ivory oolitic & special-grade aragonite reef sand
 * (1-2 mm calcium carbonate grains, shell flecks, and pink/lilac coralline specks).
 */
export function createAragoniteSandPbrTextures(size = 512): {
  albedoTexture: THREE.DataTexture
  normalTexture: THREE.DataTexture
  roughnessTexture: THREE.DataTexture
} {
  const dim = clamp(Math.trunc(size), 64, 1024)
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

      // Warm cream-ivory calcium carbonate base (#EFE8D8 .. #E2D8C3), strictly R >= G >= B
      const baseWarmth = (grainBump - 0.5) * 34 + (r0 - 0.5) * 14
      let r = 236 + baseWarmth
      let g = 227 + baseWarmth * 0.94
      let b = 208 + baseWarmth * 0.85

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

  const ripple1 = 0.024 * Math.sin(worldX * 1.15 + worldZ * 0.45 + 0.35 * Math.sin(worldZ * 0.8))
  const ripple2 = 0.016 * Math.cos(worldZ * 1.65 - worldX * 0.52)
  const duneUndulation = 0.028 * Math.sin(worldX * 0.42 - 0.6) * Math.cos(worldZ * 0.35)

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
 * darkening smoothly to `0.56` right where the live-rock base meets the aragonite bed).
 * Replaces the old oversized hand-painted indigo blobs.
 */
export function evaluateRockBaseContactFactor(
  worldX: number,
  worldZ: number,
  narrow = false,
): number {
  const footprints = getRockFootprintsForViewport(narrow)
  let factor = 1.0
  for (const fp of footprints) {
    const nx = (worldX - fp.x) / (fp.radiusX * 0.92)
    const nz = (worldZ - fp.z) / (fp.radiusZ * 0.92)
    const r = Math.hypot(nx, nz)
    const contact = 1.0 - 0.44 * (1.0 - smoothstep(0.62, 1.12, r))
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
    const wy = baseSandY + evaluateAragoniteSandElevation(wx, wz, narrow) + 0.008
    return { wx, wy, wz }
  }

  for (let i = 0; i < rubbleMesh.count; i++) {
    const { wx, wy, wz } = sampleScatterPoint(i, rubbleMesh.count)
    dummy.position.set(wx, wy, wz)
    dummy.rotation.set(rand() * 0.5 - 0.25, rand() * Math.PI * 2, rand() * 0.5 - 0.25)
    const sx = 0.022 + rand() * 0.032
    const sy = 0.012 + rand() * 0.016
    const sz = 0.018 + rand() * 0.028
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
    const { wx, wy, wz } = sampleScatterPoint(i + 17, shellMesh.count)
    dummy.position.set(wx, wy + 0.003, wz)
    dummy.rotation.set(-Math.PI * 0.35 + (rand() - 0.5) * 0.4, rand() * Math.PI * 2, (rand() - 0.5) * 0.4)
    const s = 0.016 + rand() * 0.020
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
    const { wx, wy, wz } = sampleScatterPoint(i + 31, corallineMesh.count)
    dummy.position.set(wx, wy, wz)
    dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5)
    const s = 0.018 + rand() * 0.024
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
    uSandTime: { value: 0 },
    uLeftFootprint: { value: new THREE.Vector4(-2.35, -1.35, 1.85, 1.15) },
    uRightFootprint: { value: new THREE.Vector4(2.65, -1.20, 1.75, 1.10) },
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
    normalScale: new THREE.Vector2(0.55, 0.55),
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
      `uniform float uSandTime;\nuniform vec4 uLeftFootprint;\nuniform vec4 uRightFootprint;\nuniform float uSingleIslandMode;\nvarying vec3 vSandWorldPos;\nvarying vec2 vSandRawUv;\n` +
      shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
// Dual-scale rotated aperiodic UV sampling eliminates visible grid repetition at all viewports (AQ-70.12 AC #1)
vec2 uvPrimary = vSandWorldPos.xz * 1.35;
mat2 rot37 = mat2(0.7986355, -0.6018150, 0.6018150, 0.7986355);
vec2 uvSecondary = rot37 * (vSandWorldPos.xz * 0.52) + vec2(0.37, 0.71);
vec4 texelPrimary = texture2D(map, uvPrimary);
vec4 texelSecondary = texture2D(map, uvSecondary);
float macroBlend = 0.5 + 0.32 * sin(vSandWorldPos.x * 0.65 + cos(vSandWorldPos.z * 0.78)) + 0.18 * cos(vSandWorldPos.x * 1.4 - vSandWorldPos.z * 1.2);
vec4 sampledDiffuseColor = mix(texelPrimary, texelSecondary, smoothstep(0.28, 0.72, macroBlend));
diffuseColor *= sampledDiffuseColor;
#endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
// Macro warm aragonite variation & natural olive-tan detritus settling near rock bases (AQ-70.12 AC #1 & #2)
vec2 dLeft = (vSandWorldPos.xz - uLeftFootprint.xy) / (uLeftFootprint.zw * 0.92);
float rLeft = length(dLeft);
float aoLeft = 1.0 - 0.42 * (1.0 - smoothstep(0.62, 1.12, rLeft));

vec2 dRight = (vSandWorldPos.xz - uRightFootprint.xy) / (uRightFootprint.zw * 0.92);
float rRight = length(dRight);
float aoRight = mix(1.0 - 0.40 * (1.0 - smoothstep(0.62, 1.12, rRight)), 1.0, uSingleIslandMode);
float rockContactAo = min(aoLeft, aoRight);

// Subtle warm detritus & dampened aragonite near rock bases and ripple troughs (never blue-grey or indigo)
float detritusMask = (1.0 - smoothstep(0.70, 1.35, min(rLeft, mix(rRight, 99.0, uSingleIslandMode)))) * 0.38;
vec3 warmDetritus = vec3(0.76, 0.70, 0.58);
diffuseColor.rgb = mix(diffuseColor.rgb, warmDetritus, detritusMask);

// Gentle rear-water depth attenuation preserving warm cream foreground
float rearFade = smoothstep(-5.4, 0.8, vSandWorldPos.z);
vec3 rearWaterTint = vec3(0.56, 0.66, 0.72);
diffuseColor.rgb = mix(diffuseColor.rgb * rearWaterTint, diffuseColor.rgb, 0.48 + 0.52 * rearFade);
diffuseColor.rgb *= rockContactAo;

// Two-layer intersecting Voronoi-like refraction caustic network (AQ-70.12)
vec2 cUv1 = vSandWorldPos.xz * 1.65 + vec2(uSandTime * 0.42, -uSandTime * 0.31);
vec2 cUv2 = (mat2(0.866, -0.5, 0.5, 0.866) * vSandWorldPos.xz) * 2.15 + vec2(-uSandTime * 0.36, uSandTime * 0.48);
float ridge1 = 1.0 - abs(sin(cUv1.x) * cos(cUv1.y));
float ridge2 = 1.0 - abs(sin(cUv2.x) * cos(cUv2.y));
float causticNet = pow(clamp(ridge1 * ridge2, 0.0, 1.0), 2.4) * rockContactAo * (0.35 + 0.65 * rearFade);
diffuseColor.rgb += vec3(0.20, 0.21, 0.18) * causticNet;
`,
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
    color: new THREE.Color('#dfd4be'),
  })
  const frontEdgeMesh = new THREE.Mesh(frontEdgeGeometry, frontEdgeMaterial)
  frontEdgeMesh.name = 'AragoniteFrontGlassSandEdge'
  frontEdgeMesh.receiveShadow = true
  frontEdgeMesh.raycast = () => {}

  const rubbleGeometry = new THREE.DodecahedronGeometry(1, 0)
  const rubbleMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.90,
    metalness: 0.0,
  })
  const rubbleInstances = new THREE.InstancedMesh(rubbleGeometry, rubbleMaterial, 48)
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
  const shellInstances = new THREE.InstancedMesh(shellGeometry, shellMaterial, 36)
  shellInstances.name = 'AragoniteShellInstances'
  shellInstances.receiveShadow = true
  shellInstances.raycast = () => {}

  const corallineGeometry = new THREE.IcosahedronGeometry(1, 0)
  const corallineMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0.0,
  })
  const corallineInstances = new THREE.InstancedMesh(corallineGeometry, corallineMaterial, 28)
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
    update(elapsedSeconds: number, paused: boolean, reducedMotion: boolean) {
      sandUniforms.uSandTime.value =
        paused || reducedMotion || !Number.isFinite(elapsedSeconds) ? 0 : elapsedSeconds % 3600
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
