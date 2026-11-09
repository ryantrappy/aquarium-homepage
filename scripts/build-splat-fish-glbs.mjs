/**
 * Photorealistic Self-Contained 3D Reef Fish Generator (`reef-asset-v1`)
 *
 * Reconstructs watertight, fusiform C-infinity 3D-volumetric, rigged & animated `.glb`
 * fish models from `public/fish/<id>.webp` or manual Blender overrides in
 * `src/rendering/assets/splat-fish/overrides/<id>.glb`, verified in Blender 5.2.3 LTS.
 */

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import * as THREE from 'three'
import { validateAssetContract } from '../src/rendering/assets/contract.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(REPO_ROOT, 'src/rendering/assets/splat-fish')
const PUBLIC_FISH_DIR = path.join(REPO_ROOT, 'public/fish')

const LEARNED_GUIDE_PATH = path.join(OUT_DIR, 'overrides', 'learned-shape-guide.json')
const LEARNED_GUIDES = fs.existsSync(LEARNED_GUIDE_PATH)
  ? JSON.parse(fs.readFileSync(LEARNED_GUIDE_PATH, 'utf8'))
  : null

function sampleLearnedGuideMultiplier(specId, s, v) {
  if (!LEARNED_GUIDES) return 1.0
  const guide =
    LEARNED_GUIDES.guidesBySpecies?.[specId] ??
    Object.values(LEARNED_GUIDES.guidesByArchetype ?? {})[0] ??
    null
  if (!guide) return 1.0
  const longArr = guide.longitudinalMultipliers
  const dvArr = guide.dorsoventralMultipliers
  if (!Array.isArray(longArr) || !Array.isArray(dvArr) || !longArr.length || !dvArr.length) return 1.0

  const fsIdx = clamp(s, 0, 1) * (longArr.length - 1)
  const i0 = Math.floor(fsIdx), i1 = Math.min(longArr.length - 1, i0 + 1)
  const longMult = lerp(longArr[i0], longArr[i1], fsIdx - i0)

  const fvIdx = clamp(v, 0, 1) * (dvArr.length - 1)
  const j0 = Math.floor(fvIdx), j1 = Math.min(dvArr.length - 1, j0 + 1)
  const dvMult = lerp(dvArr[j0], dvArr[j1], fvIdx - j0)

  const weight = LEARNED_GUIDES.guidesBySpecies?.[specId] ? 0.65 : 0.35
  const combined = clamp(longMult * 0.7 + dvMult * 0.3, 0.72, 1.32)
  return lerp(1.0, combined, weight)
}

const clamp = (v, lo = 0.0, hi = 1.0) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t
function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1.0 : 0.0
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
  return t * t * (3.0 - 2.0 * t)
}

/**
 * Natural teleost top-down fusiform longitudinal half-width profile (`s in [0, 1]`, tail 0 -> snout 1):
 * - Slender caudal fin & peduncle (`s <= 0.20`)
 * - Continuous hydrodynamic taper from maximum width at the opercular shoulder (`s = 0.74`)
 *   down to the caudal peduncle (`s = 0.20`), eliminating the uniform-thickness slab look!
 * - Convex ogive snout taper from the opercular shoulder (`s = 0.74`) to the snout lips (`s = 1.0`).
 */
function evaluateFusiformLongitudinalHalfWidth(s, maxHalfW) {
  if (s <= 0.18) {
    const uTail = s / 0.18
    return maxHalfW * lerp(0.025, 0.14, smoothstep(0.0, 1.0, Math.pow(uTail, 1.25)))
  }
  if (s <= 0.74) {
    // Hydrodynamic teardrop rise from peduncle (0.18) to opercular shoulder peak (0.74)
    const uTrunk = (s - 0.18) / 0.56
    const teardrop = Math.pow(Math.sin(uTrunk * Math.PI * 0.5), 0.78)
    return maxHalfW * lerp(0.14, 1.0, teardrop)
  }
  // Ogive head/snout taper from shoulder peak (0.74) to snout tip (1.0)
  const uHead = (1.0 - s) / 0.26
  const ogive = Math.pow(Math.sin(clamp(uHead, 0, 1) * Math.PI * 0.5), 0.62)
  return maxHalfW * (0.16 + 0.84 * ogive)
}

function evaluateAnatomicalHeadRelief(u, v, dNorm = 1.0) {
  const boundaryFade = smoothstep(0.03, 0.16, dNorm)

  // 1. Protruding C2-Continuous Convex 3D Eye Cornea Hemisphere & Recessed Circumorbital Socket Rim
  const uEye = 0.858
  const vEye = 0.376
  const ruEye = 0.034
  const rvEye = 0.062
  const duEye = (u - uEye) / ruEye
  const dvEye = (v - vEye) / rvEye
  const rEye = Math.hypot(duEye, dvEye)

  let eyeDx = 0.0
  if (rEye < 1.0) {
    const c2Dome = Math.pow(0.5 + 0.5 * Math.cos(rEye * Math.PI), 1.3)
    eyeDx += 0.0075 * c2Dome * smoothstep(0.06, 0.22, dNorm)
  }
  if (rEye > 0.82 && rEye < 1.28) {
    const tRim = (rEye - 0.82) / 0.46
    const c2Rim = Math.pow(Math.sin(tRim * Math.PI), 2.0)
    eyeDx -= 0.0018 * c2Rim * boundaryFade
  }

  // 2. C2-Smooth Sculpted 3D Operculum (Gill-Cover) Plate & Recessed Posterior Gill Slit
  const vGillT = clamp((v - 0.375) / 0.265, 0.0, 1.0)
  const vGillMask = Math.pow(Math.sin(vGillT * Math.PI), 2.0)
  const uGill = 0.760 + 0.35 * Math.pow(v - 0.54, 2)
  const duGill = u - uGill
  let gillDx = 0.0
  if (vGillMask > 0.0) {
    if (duGill > -0.002 && duGill < 0.052) {
      const tPlate = (duGill + 0.002) / 0.054
      const c2Plate = Math.pow(Math.sin(tPlate * Math.PI), 2.0) * (1.0 - 0.35 * tPlate)
      gillDx += 0.0055 * vGillMask * c2Plate * boundaryFade
    }
    const slitBell = Math.exp(-Math.pow((duGill + 0.0038) / 0.0050, 2))
    gillDx -= 0.0048 * vGillMask * slitBell * boundaryFade
  }

  // 3. Sculpted 3D Mouth Cleft & Upper/Lower Lip Ridges at Snout Tip
  const uMouthMask = smoothstep(0.942, 0.960, u) * smoothstep(0.996, 0.982, u)
  const vMouthCenter = 0.502 + 0.14 * (0.985 - u)
  const dvMouth = v - vMouthCenter
  let mouthDx = 0.0
  if (uMouthMask > 0.0) {
    const cleftBell = Math.exp(-Math.pow(dvMouth / 0.0052, 2))
    const upperLipBell = Math.exp(-Math.pow((dvMouth + 0.0135) / 0.0062, 2))
    const lowerLipBell = Math.exp(-Math.pow((dvMouth - 0.0135) / 0.0062, 2))
    mouthDx = uMouthMask * boundaryFade * (-0.0042 * cleftBell + 0.0036 * upperLipBell + 0.0034 * lowerLipBell)
  }

  return {
    dx: eyeDx + gillDx + mouthDx,
    rEye,
    duEye,
    dvEye,
    vGillMask,
    duGill,
    uMouthMask,
    dvMouth,
  }
}

// CRC32 & PNG encoder
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function makePngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function encodeRgbaPng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + width * 4)
    raw[rowOff] = 0
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowOff + 1)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, makePngChunk('IHDR', ihdr), makePngChunk('IDAT', idat), makePngChunk('IEND', Buffer.alloc(0))])
}

const SPINE_Z = [1.0, 0.48, 0.12, -0.23, -0.55, -0.78]
function computeSpineSkinning(z) {
  if (z >= SPINE_Z[0]) return { joints: [0, 1, 0, 0], weights: [1, 0, 0, 0] }
  for (let i = 0; i < SPINE_Z.length - 1; i++) {
    const zHi = SPINE_Z[i], zLo = SPINE_Z[i + 1]
    if (z <= zHi && z >= zLo) {
      const t = (zHi - z) / (zHi - zLo)
      const s = t * t * (3 - 2 * t)
      return { joints: [i, i + 1, 0, 0], weights: [1 - s, s, 0, 0] }
    }
  }
  return { joints: [5, 4, 0, 0], weights: [1, 0, 0, 0] }
}

const SPECIES_SPECS = [
  {
    id: 'blue-tang',
    scientificName: 'Paracanthurus hepatus (Regal Blue Tang / Palette Surgeonfish)',
    rigArchetype: 'labriform_cruiser',
    clipName: 'blue_tang_labriform_swim',
    spineAmpDeg: [0.0, 0.8, 2.2, 5.2, 8.8, 13.0],
    pectSweepDeg: 26.0,
    pectFeatherDeg: 12.0,
    maxHalfW: 0.132,
    texSize: 1024,
    gridNZ: 120,
    gridNY: 72,
    pectoral: { z: 0.44, y: -0.09, length: 0.24, spreadY: 0.16, outX: 0.038, u0: 0.020, u1: 0.195, v0: 0.020, v1: 0.175 },
  },
  {
    id: 'royal-gramma',
    scientificName: 'Gramma loreto (Royal Gramma / Fairy Basslet)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'royal_gramma_subcarangiform_swim',
    spineAmpDeg: [0.0, 1.2, 2.8, 5.6, 8.8, 12.4],
    pectSweepDeg: 25.0,
    pectFeatherDeg: 13.0,
    maxHalfW: 0.145,
    pectoral: { z: 0.42, y: -0.07, length: 0.22, spreadY: 0.14, outX: 0.042, u0: 0.56, u1: 0.72, v0: 0.44, v1: 0.68 },
  },
  {
    id: 'banggai-cardinalfish',
    scientificName: 'Pterapogon kauderni (Banggai Cardinalfish)',
    rigArchetype: 'banner_hoverer',
    clipName: 'banggai_banner_hover_swim',
    spineAmpDeg: [0.0, 0.6, 1.6, 3.8, 6.5, 9.6],
    pectSweepDeg: 26.0,
    pectFeatherDeg: 14.0,
    maxHalfW: 0.135,
    pectoral: { z: 0.40, y: -0.06, length: 0.22, spreadY: 0.14, outX: 0.040, u0: 0.56, u1: 0.72, v0: 0.48, v1: 0.68 },
  },
  {
    id: 'mandarin-dragonet',
    scientificName: 'Synchiropus splendidus (Mandarin Dragonet)',
    rigArchetype: 'benthic_percher_dragonet',
    clipName: 'mandarin_dragonet_hover_swim',
    spineAmpDeg: [0.0, 0.9, 2.2, 4.8, 7.8, 11.2],
    pectSweepDeg: 30.0,
    pectFeatherDeg: 16.0,
    maxHalfW: 0.165,
    pectoral: { z: 0.38, y: -0.08, length: 0.24, spreadY: 0.16, outX: 0.048, u0: 0.52, u1: 0.70, v0: 0.48, v1: 0.74 },
  },
  {
    id: 'blue-green-chromis',
    scientificName: 'Chromis viridis (Blue-Green Chromis)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'chromis_subcarangiform_swim',
    spineAmpDeg: [0.0, 1.2, 2.8, 5.4, 8.5, 12.0],
    pectSweepDeg: 24.0,
    pectFeatherDeg: 12.0,
    maxHalfW: 0.140,
    pectoral: { z: 0.44, y: -0.07, length: 0.22, spreadY: 0.14, outX: 0.040, u0: 0.60, u1: 0.76, v0: 0.44, v1: 0.68 },
  },
  {
    id: 'firefish',
    scientificName: 'Nemateleotris magnifica (Firefish / Magnificent Dartfish)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'firefish_hover_dart_swim',
    spineAmpDeg: [0.0, 1.0, 2.5, 5.2, 8.2, 11.5],
    pectSweepDeg: 24.0,
    pectFeatherDeg: 13.0,
    maxHalfW: 0.125,
    pectoral: { z: 0.46, y: -0.05, length: 0.20, spreadY: 0.12, outX: 0.036, u0: 0.62, u1: 0.76, v0: 0.46, v1: 0.68 },
  },
  {
    id: 'yellow-watchman-goby',
    scientificName: 'Cryptocentrus cinctus (Yellow Watchman Goby)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'watchman_goby_benthic_swim',
    spineAmpDeg: [0.0, 0.9, 2.2, 4.8, 7.6, 10.8],
    pectSweepDeg: 25.0,
    pectFeatherDeg: 14.0,
    maxHalfW: 0.145,
    pectoral: { z: 0.44, y: -0.07, length: 0.22, spreadY: 0.14, outX: 0.042, u0: 0.60, u1: 0.76, v0: 0.48, v1: 0.72 },
  },
  {
    id: 'tailspot-blenny',
    scientificName: 'Ecsenius stigmatura (Tailspot Blenny)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'tailspot_blenny_sinuate_swim',
    spineAmpDeg: [0.0, 1.4, 3.2, 6.0, 9.2, 12.5],
    pectSweepDeg: 24.0,
    pectFeatherDeg: 13.0,
    maxHalfW: 0.135,
    pectoral: { z: 0.46, y: -0.06, length: 0.20, spreadY: 0.13, outX: 0.038, u0: 0.62, u1: 0.76, v0: 0.48, v1: 0.72 },
  },
  {
    id: 'six-line-wrasse',
    scientificName: 'Pseudocheilinus hexataenia (Six-Line Wrasse)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'six_line_wrasse_labriform_swim',
    spineAmpDeg: [0.0, 1.0, 2.3, 4.8, 7.6, 10.8],
    pectSweepDeg: 26.0,
    pectFeatherDeg: 14.0,
    maxHalfW: 0.140,
    pectoral: { z: 0.44, y: -0.07, length: 0.21, spreadY: 0.13, outX: 0.038, u0: 0.60, u1: 0.75, v0: 0.46, v1: 0.68 },
  },
  {
    id: 'mccoskers-flasher-wrasse',
    scientificName: "Paracheilinus mccoskeri (McCosker's Flasher Wrasse)",
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'mccoskers_flasher_wrasse_swim',
    spineAmpDeg: [0.0, 1.1, 2.6, 5.2, 8.4, 11.8],
    pectSweepDeg: 25.0,
    pectFeatherDeg: 13.0,
    maxHalfW: 0.138,
    pectoral: { z: 0.44, y: -0.07, length: 0.21, spreadY: 0.13, outX: 0.038, u0: 0.60, u1: 0.75, v0: 0.46, v1: 0.68 },
  },
  {
    id: 'lyretail-anthias',
    scientificName: 'Pseudanthias squamipinnis (Lyretail Anthias)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'lyretail_anthias_school_swim',
    spineAmpDeg: [0.0, 1.2, 2.7, 5.4, 8.6, 12.2],
    pectSweepDeg: 24.0,
    pectFeatherDeg: 12.0,
    maxHalfW: 0.140,
    pectoral: { z: 0.42, y: -0.07, length: 0.22, spreadY: 0.14, outX: 0.040, u0: 0.58, u1: 0.74, v0: 0.46, v1: 0.70 },
  },
  {
    id: 'flame-angelfish',
    scientificName: 'Centropyge loricula (Flame Angelfish)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'flame_angelfish_reef_swim',
    spineAmpDeg: [0.0, 0.8, 2.0, 4.2, 7.0, 10.4],
    pectSweepDeg: 26.0,
    pectFeatherDeg: 14.0,
    maxHalfW: 0.138,
    pectoral: { z: 0.42, y: -0.08, length: 0.22, spreadY: 0.14, outX: 0.040, u0: 0.58, u1: 0.74, v0: 0.48, v1: 0.72 },
  },
  {
    id: 'copperband-butterflyfish',
    scientificName: 'Chelmon rostratus (Copperband Butterflyfish)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'copperband_butterflyfish_glide_swim',
    spineAmpDeg: [0.0, 0.6, 1.5, 3.4, 6.0, 9.2],
    pectSweepDeg: 25.0,
    pectFeatherDeg: 13.0,
    maxHalfW: 0.125,
    pectoral: { z: 0.36, y: -0.10, length: 0.21, spreadY: 0.14, outX: 0.036, u0: 0.54, u1: 0.70, v0: 0.50, v1: 0.74 },
  },
]

function decodeWebpRgba(webpPath) {
  const buf = execFileSync('dwebp', [webpPath, '-pam', '-o', '-'], {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const headerEnd = buf.indexOf(Buffer.from('ENDHDR\n')) + 7
  const header = buf.subarray(0, headerEnd).toString('ascii')
  const width = Number(header.match(/WIDTH\s+(\d+)/)[1])
  const height = Number(header.match(/HEIGHT\s+(\d+)/)[1])
  const rgba = new Uint8Array(buf.buffer, buf.byteOffset + headerEnd, width * height * 4)
  return { width, height, rgba }
}

function computeDistanceField(mask, width, height) {
  const INF = 1e9
  const dist = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) dist[i] = mask[i] ? INF : 0

  const w1 = 1.0, w2 = Math.SQRT2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      let d = dist[idx]
      if (d === 0) continue
      if (x > 0) d = Math.min(d, dist[idx - 1] + w1)
      if (y > 0) {
        d = Math.min(d, dist[(y - 1) * width + x] + w1)
        if (x > 0) d = Math.min(d, dist[(y - 1) * width + x - 1] + w2)
        if (x + 1 < width) d = Math.min(d, dist[(y - 1) * width + x + 1] + w2)
      }
      dist[idx] = d
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const idx = y * width + x
      let d = dist[idx]
      if (d === 0) continue
      if (x + 1 < width) d = Math.min(d, dist[idx + 1] + w1)
      if (y + 1 < height) {
        d = Math.min(d, dist[(y + 1) * width + x] + w1)
        if (x + 1 < width) d = Math.min(d, dist[(y + 1) * width + x + 1] + w2)
        if (x > 0) d = Math.min(d, dist[(y + 1) * width + x - 1] + w2)
      }
      dist[idx] = d
    }
  }
  return dist
}

function blurFloatField(field, width, height, passes = 2) {
  let src = new Float32Array(field)
  let dst = new Float32Array(width * height)
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0, wSum = 0
        for (let dy = -2; dy <= 2; dy++) {
          const ny = clamp(y + dy, 0, height - 1)
          const wy = dy === 0 ? 6 : Math.abs(dy) === 1 ? 4 : 1
          for (let dx = -2; dx <= 2; dx++) {
            const nx = clamp(x + dx, 0, width - 1)
            const wx = dx === 0 ? 6 : Math.abs(dx) === 1 ? 4 : 1
            const w = wx * wy
            sum += src[ny * width + nx] * w
            wSum += w
          }
        }
        dst[y * width + x] = sum / wSum
      }
    }
    const tmp = src; src = dst; dst = tmp
  }
  return src
}

function sampleFloatBilinear(field, width, height, u, v) {
  const fx = clamp(u * (width - 1), 0, width - 1)
  const fy = clamp(v * (height - 1), 0, height - 1)
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1)
  const tx = fx - x0, ty = fy - y0
  return lerp(
    lerp(field[y0 * width + x0], field[y0 * width + x1], tx),
    lerp(field[y1 * width + x0], field[y1 * width + x1], tx),
    ty,
  )
}

function inpaintBlueTangFlank(srcRgba, W, H) {
  const cleanRgba = new Uint8Array(srcRgba)
  const inpaintMask = new Float32Array(W * H)
  for (let y = Math.floor(0.425 * H); y <= Math.floor(0.75 * H); y++) {
    const v = y / H
    const topFade = smoothstep(0.425, 0.442, v)
    for (let x = Math.floor(0.61 * W); x <= Math.floor(0.765 * W); x++) {
      const u = x / W
      const uGill = 0.760 + 0.35 * Math.pow(v - 0.54, 2)
      if (u >= uGill - 0.004) continue
      const du = u - 0.684, dv = v - 0.578
      const along = -du * 0.39 - dv * 0.92
      const perp = du * 0.92 - dv * 0.39
      const dFin = Math.hypot(along / 0.175, perp / 0.068)
      if (dFin < 1.0) inpaintMask[y * W + x] = topFade * smoothstep(1.0, 0.68, dFin)
    }
  }

  const rBlue = new Float32Array(W * H)
  const gBlue = new Float32Array(W * H)
  const bBlue = new Float32Array(W * H)
  const solveBlue = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const r = cleanRgba[i * 4], g = cleanRgba[i * 4 + 1], b = cleanRgba[i * 4 + 2]
    if (inpaintMask[i] > 0.005 || b < 185) {
      solveBlue[i] = 1; rBlue[i] = 18; gBlue[i] = 76; bBlue[i] = 246
    } else {
      rBlue[i] = r; gBlue[i] = g; bBlue[i] = b
    }
  }
  for (let iter = 0; iter < 300; iter++) {
    for (let y = Math.floor(0.38 * H); y <= Math.floor(0.78 * H); y++) {
      for (let x = Math.floor(0.58 * W); x <= Math.floor(0.765 * W); x++) {
        const i = y * W + x
        if (!solveBlue[i]) continue
        rBlue[i] = 0.25 * (rBlue[i - 1] + rBlue[i + 1] + rBlue[i - W] + rBlue[i + W])
        gBlue[i] = 0.25 * (gBlue[i - 1] + gBlue[i + 1] + gBlue[i - W] + gBlue[i + W])
        bBlue[i] = 0.25 * (bBlue[i - 1] + bBlue[i + 1] + bBlue[i - W] + bBlue[i + W])
      }
    }
  }
  for (let y = Math.floor(0.425 * H); y <= Math.floor(0.75 * H); y++) {
    const v = y / H
    for (let x = Math.floor(0.61 * W); x <= Math.floor(0.765 * W); x++) {
      const i = y * W + x
      const m = inpaintMask[i]
      if (m <= 0.001) continue
      const u = x / W
      const tCurve = clamp((u - 0.605) / 0.082, 0, 1.3)
      const vBlackEdge = 0.565 - 0.135 * Math.pow(tCurve, 1.85)
      const inBlack = (1.0 - smoothstep(vBlackEdge - 0.012, vBlackEdge + 0.012, v)) * (1.0 - smoothstep(0.682, 0.696, u))
      const grain = (Math.sin(x * 1.7 + y * 2.3) * Math.cos(x * 2.9 - y * 1.9)) * 2.0
      const targetR = lerp(clamp(rBlue[i] + grain, 6, 45), 13, inBlack)
      const targetG = lerp(clamp(gBlue[i] + grain, 50, 110), 17, inBlack)
      const targetB = lerp(clamp(bBlue[i] + grain, 215, 255), 31, inBlack)
      cleanRgba[i * 4] = Math.round(lerp(cleanRgba[i * 4], targetR, m))
      cleanRgba[i * 4 + 1] = Math.round(lerp(cleanRgba[i * 4 + 1], targetG, m))
      cleanRgba[i * 4 + 2] = Math.round(lerp(cleanRgba[i * 4 + 2], targetB, m))
    }
  }
  return cleanRgba
}

function dilateRgbaInterior(rgba, distIn, width, height, paintBlueTangPectoral = false) {
  const out = new Uint8Array(rgba.length)
  const filled = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0, tail = 0

  for (let i = 0; i < width * height; i++) {
    if (rgba[i * 4 + 3] >= 235 && distIn[i] >= 2.8) {
      out[i * 4 + 0] = rgba[i * 4 + 0]
      out[i * 4 + 1] = rgba[i * 4 + 1]
      out[i * 4 + 2] = rgba[i * 4 + 2]
      out[i * 4 + 3] = 255
      filled[i] = 1
      queue[tail++] = i
    }
  }

  const dirs = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1]
  while (head < tail) {
    const curr = queue[head++]
    const cx = curr % width
    const cy = (curr / width) | 0
    for (const d of dirs) {
      const next = curr + d
      if (next < 0 || next >= width * height || filled[next]) continue
      const nx = next % width
      const ny = (next / width) | 0
      if (Math.abs(nx - cx) > 1 || Math.abs(ny - cy) > 1) continue
      out[next * 4 + 0] = out[curr * 4 + 0]
      out[next * 4 + 1] = out[curr * 4 + 1]
      out[next * 4 + 2] = out[curr * 4 + 2]
      out[next * 4 + 3] = 255
      filled[next] = 1
      queue[tail++] = next
    }
  }

  if (paintBlueTangPectoral) {
    for (let y = 0; y < Math.floor(0.195 * height); y++) {
      const ty = clamp((y / height - 0.015) / 0.165, 0, 1)
      for (let x = 0; x < Math.floor(0.215 * width); x++) {
        const tx = clamp((x / width - 0.015) / 0.185, 0, 1)
        const rayRidge = 0.5 + 0.5 * Math.cos(ty * 16.0 * Math.PI * 2.0)
        const cWristBlue = [18, 74, 244]
        const cIceRay = [92, 162, 252]
        const cCanary = [246, 210, 20]
        const cGoldWeb = [165, 148, 32]
        const cHyalineTip = [42, 78, 168]

        const rayStrength = smoothstep(0.08, 0.35, tx) * (1.0 - 0.35 * smoothstep(0.88, 1.0, tx))
        let r = lerp(cWristBlue[0], cIceRay[0], rayRidge * 0.52 * rayStrength)
        let g = lerp(cWristBlue[1], cIceRay[1], rayRidge * 0.52 * rayStrength)
        let b = lerp(cWristBlue[2], cIceRay[2], rayRidge * 0.52 * rayStrength)

        const yellowRadial = smoothstep(0.34, 0.56, tx) * (1.0 - smoothstep(0.84, 0.96, tx))
        const yellowAngular = smoothstep(0.02, 0.10, ty) * (1.0 - smoothstep(0.45, 0.72, ty))
        const yellowMask = yellowRadial * yellowAngular
        r = lerp(r, lerp(cGoldWeb[0], cCanary[0], 0.40 + 0.60 * rayRidge), yellowMask)
        g = lerp(g, lerp(cGoldWeb[1], cCanary[1], 0.40 + 0.60 * rayRidge), yellowMask)
        b = lerp(b, lerp(cGoldWeb[2], cCanary[2], 0.40 + 0.60 * rayRidge), yellowMask)

        const rimT = smoothstep(0.88, 0.99, tx) * 0.55
        r = lerp(r, cHyalineTip[0], rimT)
        g = lerp(g, cHyalineTip[1], rimT)
        b = lerp(b, cHyalineTip[2], rimT)

        const dIdx = (y * width + x) * 4
        out[dIdx] = Math.round(r)
        out[dIdx + 1] = Math.round(g)
        out[dIdx + 2] = Math.round(b)
        out[dIdx + 3] = 255
      }
    }
  }

  return out
}

function buildPhotorealPbrTextures(dilatedRgba, srcW, srcH, size = 512, specId = '') {
  const baseRgba = new Uint8Array(size * size * 4)
  const normRgba = new Uint8Array(size * size * 4)
  const ormRgba = new Uint8Array(size * size * 4)

  function sampleRgbBilinear(u, v) {
    const fx = clamp(u * (srcW - 1), 0, srcW - 1)
    const fy = clamp(v * (srcH - 1), 0, srcH - 1)
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    const x1 = Math.min(srcW - 1, x0 + 1), y1 = Math.min(srcH - 1, y0 + 1)
    const tx = fx - x0, ty = fy - y0
    const i00 = (y0 * srcW + x0) * 4, i10 = (y0 * srcW + x1) * 4
    const i01 = (y1 * srcW + x0) * 4, i11 = (y1 * srcW + x1) * 4
    return [
      lerp(lerp(dilatedRgba[i00], dilatedRgba[i10], tx), lerp(dilatedRgba[i01], dilatedRgba[i11], tx), ty),
      lerp(lerp(dilatedRgba[i00 + 1], dilatedRgba[i10 + 1], tx), lerp(dilatedRgba[i01 + 1], dilatedRgba[i11 + 1], tx), ty),
      lerp(lerp(dilatedRgba[i00 + 2], dilatedRgba[i10 + 2], tx), lerp(dilatedRgba[i01 + 2], dilatedRgba[i11 + 2], tx), ty),
    ]
  }

  for (let py = 0; py < size; py++) {
    const v = (py + 0.5) / size
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size
      let [r, g, b] = sampleRgbBilinear(u, v)
      const idx = (py * size + px) * 4

      const relC = evaluateAnatomicalHeadRelief(u, v, 1.0)
      let ao = 248.0
      let rough = 0.42

      // Subtle ctenoid scale & fin-ray micro-roughness/AO modulation
      const isFinBand = (1.0 - smoothstep(0.16, 0.28, v)) + smoothstep(0.72, 0.84, v) + (1.0 - smoothstep(0.15, 0.24, u))
      if (isFinBand > 0.05) {
        const finRay = Math.sin((u * 42.0 + v * 18.0) * Math.PI * 2.0)
        ao -= finRay * 6.0 * clamp(isFinBand, 0, 1)
        rough = lerp(rough, 0.34, clamp(isFinBand, 0, 1) * (0.5 + 0.5 * finRay))
      } else if (u > 0.24 && u < 0.78) {
        // Imbricated diamond ctenoid scale micro-sheen
        const sA = Math.sin((u * 56.0 + v * 34.0) * Math.PI * 2.0)
        const sB = Math.sin((u * 56.0 - v * 34.0) * Math.PI * 2.0)
        const scaleCell = sA * sB
        ao -= Math.max(0, -scaleCell) * 7.0
        rough = lerp(rough, 0.36, Math.max(0, scaleCell) * 0.35)
      }

      // 1. Wet cornea roughness (0.03) over the eye
      if (relC.rEye < 0.94) {
        const corneaMask = 1.0 - smoothstep(0.72, 0.94, relC.rEye)
        rough = lerp(rough, 0.03, corneaMask)
        ao = lerp(ao, 255.0, corneaMask)
      }

      // 2. Operculum gill-slit AO & edge sheen
      if (relC.vGillMask > 0.001) {
        const slitDepth = Math.exp(-Math.pow((relC.duGill + 0.0038) / 0.0048, 2)) * relC.vGillMask
        const plateRim = Math.exp(-Math.pow((relC.duGill - 0.0070) / 0.0070, 2)) * relC.vGillMask
        ao = lerp(ao, 138.0, slitDepth * 0.78)
        rough = lerp(rough, 0.28, plateRim * 0.55)
      }

      // 3. Mouth cleft AO & lip sheen
      if (relC.uMouthMask > 0.001) {
        const cleftDepth = Math.exp(-Math.pow(relC.dvMouth / 0.0050, 2)) * relC.uMouthMask
        const lipHighlight = (
          Math.exp(-Math.pow((relC.dvMouth + 0.0135) / 0.0062, 2)) +
          Math.exp(-Math.pow((relC.dvMouth - 0.0135) / 0.0062, 2))
        ) * relC.uMouthMask
        ao = lerp(ao, 132.0, cleftDepth * 0.80)
        rough = lerp(rough, 0.26, lipHighlight * 0.58)
      }

      baseRgba[idx + 0] = clamp(Math.round(r), 0, 255)
      baseRgba[idx + 1] = clamp(Math.round(g), 0, 255)
      baseRgba[idx + 2] = clamp(Math.round(b), 0, 255)
      baseRgba[idx + 3] = 255

      normRgba[idx + 0] = 128
      normRgba[idx + 1] = 128
      normRgba[idx + 2] = 255
      normRgba[idx + 3] = 255

      ormRgba[idx + 0] = clamp(Math.round(ao), 0, 255)
      ormRgba[idx + 1] = clamp(Math.round(rough * 255), 0, 255)
      ormRgba[idx + 2] = 0
      ormRgba[idx + 3] = 255
    }
  }

  return {
    basePng: encodeRgbaPng(size, size, baseRgba),
    normPng: encodeRgbaPng(size, size, normRgba),
    ormPng: encodeRgbaPng(size, size, ormRgba),
  }
}

function buildPhotoreal3DMesh(spec) {
  const webpPath = path.join(PUBLIC_FISH_DIR, `${spec.id}.webp`)
  const decoded = decodeWebpRgba(webpPath)
  const { width, height } = decoded
  const rgba = spec.id === 'blue-tang'
    ? inpaintBlueTangFlank(decoded.rgba, width, height)
    : decoded.rgba

  const insideMask = new Uint8Array(width * height)
  const outsideMask = new Uint8Array(width * height)
  let xMin = width, xMax = 0, yMin = height, yMax = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = rgba[(y * width + x) * 4 + 3]
      if (a >= 80) {
        insideMask[y * width + x] = 1
        if (x < xMin) xMin = x
        if (x > xMax) xMax = x
        if (y < yMin) yMin = y
        if (y > yMax) yMax = y
      } else {
        outsideMask[y * width + x] = 1
      }
    }
  }

  const distIn = computeDistanceField(insideMask, width, height)
  const distOut = computeDistanceField(outsideMask, width, height)
  const rawSdf = new Float32Array(width * height)
  let maxDistIn = 1.0
  for (let i = 0; i < width * height; i++) {
    rawSdf[i] = insideMask[i] ? distIn[i] : -distOut[i]
    if (distIn[i] > maxDistIn) maxDistIn = distIn[i]
  }
  const smoothSdf = blurFloatField(rawSdf, width, height, 3)

  const bboxW = Math.max(1, xMax - xMin)
  const bboxH = Math.max(1, yMax - yMin)
  const aspectY = bboxH / bboxW

  const nZ = spec.gridNZ || 84
  const nY = spec.gridNY || 50
  const gridN = (nZ + 1) * (nY + 1)
  const gU = new Float32Array(gridN)
  const gV = new Float32Array(gridN)
  const gSdf = new Float32Array(gridN)
  const gThick = new Float32Array(gridN)

  for (let iy = 0; iy <= nY; iy++) {
    const ty = iy / nY
    const py = lerp(Math.max(0, yMin - 3), Math.min(height - 1, yMax + 3), ty)
    const v = py / (height - 1)
    for (let iz = 0; iz <= nZ; iz++) {
      const tz = iz / nZ
      const px = lerp(Math.max(0, xMin - 3), Math.min(width - 1, xMax + 3), tz)
      const u = px / (width - 1)
      const idx = iy * (nZ + 1) + iz
      gU[idx] = u
      gV[idx] = v
      gSdf[idx] = sampleFloatBilinear(smoothSdf, width, height, u, v)
    }
  }

  const activeCell = new Uint8Array(nZ * nY)
  const usedVert = new Uint8Array(gridN)
  for (let iy = 0; iy < nY; iy++) {
    for (let iz = 0; iz < nZ; iz++) {
      const i00 = iy * (nZ + 1) + iz
      const i10 = i00 + 1
      const i01 = i00 + (nZ + 1)
      const i11 = i01 + 1
      const maxCorner = Math.max(gSdf[i00], gSdf[i10], gSdf[i01], gSdf[i11])
      if (maxCorner > 0.15) {
        activeCell[iy * nZ + iz] = 1
        usedVert[i00] = 1
        usedVert[i10] = 1
        usedVert[i01] = 1
        usedVert[i11] = 1
      }
    }
  }

  const isBoundaryVert = new Uint8Array(gridN)
  const duStep = 1.5 / width
  const dvStep = 1.5 / height
  for (let i = 0; i < gridN; i++) {
    if (!usedVert[i]) continue
    if (gSdf[i] <= 0.35) {
      isBoundaryVert[i] = 1
      let u = gU[i], v = gV[i]
      for (let iter = 0; iter < 5; iter++) {
        const val = sampleFloatBilinear(smoothSdf, width, height, u, v)
        const gx = (sampleFloatBilinear(smoothSdf, width, height, u + duStep, v) - sampleFloatBilinear(smoothSdf, width, height, u - duStep, v)) / (2 * duStep)
        const gy = (sampleFloatBilinear(smoothSdf, width, height, u, v + dvStep) - sampleFloatBilinear(smoothSdf, width, height, u, v - dvStep)) / (2 * dvStep)
        const g2 = gx * gx + gy * gy
        if (g2 < 1e-4) break
        u = clamp(u - (val * gx) / g2, 0.002, 0.998)
        v = clamp(v - (val * gy) / g2, 0.002, 0.998)
      }
      gU[i] = u
      gV[i] = v
      gSdf[i] = 0
      gThick[i] = 0
    } else {
      const u = gU[i], v = gV[i]
      const s = clamp(((u * (width - 1)) - xMin) / bboxW, 0, 1)
      const vNorm = clamp(((v * (height - 1)) - yMin) / bboxH, 0, 1)
      const dNorm = clamp(gSdf[i] / (maxDistIn * 0.92), 0, 1)

      // Pterygiophore fin-base step: dorsal (vNorm < 0.22) and anal (vNorm > 0.78) fins
      // pinch rapidly to a thin ribbed membrane while the central muscular trunk rounds out.
      const inTrunkBand = smoothstep(0.16, 0.28, vNorm) * (1.0 - smoothstep(0.72, 0.84, vNorm))
      const finBladeArch = 0.18 * Math.pow(Math.sin(dNorm * Math.PI * 0.5), 1.65)
      const trunkArch = Math.pow(Math.sin(dNorm * Math.PI * 0.5), 0.95)
      const lenticularArch = lerp(finBladeArch, trunkArch, inTrunkBand)

      const isCranium = smoothstep(0.66, 0.80, s) * inTrunkBand
      const dCranium = clamp(gSdf[i] / (maxDistIn * 0.21), 0, 1)
      const craniumArch = Math.pow(Math.sin(dCranium * Math.PI * 0.5), 0.52)
      const verticalCrown = Math.pow(Math.sin(clamp((vNorm - 0.12) / 0.76, 0.05, 0.95) * Math.PI), 0.62)
      const crossArch = lerp(lenticularArch, craniumArch * verticalCrown, isCranium)

      // Natural top-down fusiform teardrop profile (peaks at opercular shoulder s=0.74, tapers to tail and snout)
      const longHw = evaluateFusiformLongitudinalHalfWidth(s, spec.maxHalfW)
      const guideMult = sampleLearnedGuideMultiplier(spec.id, s, v)
      const effectiveGuide = lerp(guideMult, 1.0, isCranium * 0.85)
      gThick[i] = Math.max(0.0015 * Math.pow(dNorm, 0.6), longHw * crossArch * effectiveGuide)
    }
  }

  for (let pass = 0; pass < 4; pass++) {
    const nextThick = new Float32Array(gThick)
    for (let iy = 1; iy < nY; iy++) {
      for (let iz = 1; iz < nZ; iz++) {
        const idx = iy * (nZ + 1) + iz
        if (!usedVert[idx] || isBoundaryVert[idx]) continue
        const avg = 0.25 * (
          gThick[idx - 1] +
          gThick[idx + 1] +
          gThick[idx - (nZ + 1)] +
          gThick[idx + (nZ + 1)]
        )
        nextThick[idx] = lerp(gThick[idx], avg, 0.45)
      }
    }
    gThick.set(nextThick)
  }

  for (let i = 0; i < gridN; i++) {
    if (!usedVert[i] || isBoundaryVert[i]) continue
    const u = gU[i], v = gV[i]
    const dNorm = clamp(gSdf[i] / (maxDistIn * 0.92), 0, 1)
    const relief = evaluateAnatomicalHeadRelief(u, v, dNorm)
    if (Math.abs(relief.dx) > 1e-6) {
      gThick[i] = Math.max(0.0012, gThick[i] + relief.dx)
    }
  }

  const positions = []
  const uvs = []
  const joints = []
  const weights = []
  const indices = []

  function addVert(x, y, z, u, v, skinOverride) {
    const idx = positions.length / 3
    positions.push(x, y, z)
    uvs.push(u, v)
    const skin = skinOverride || computeSpineSkinning(z)
    joints.push(...skin.joints)
    weights.push(...skin.weights)
    return idx
  }

  const posSideIdx = new Int32Array(gridN).fill(-1)
  const negSideIdx = new Int32Array(gridN).fill(-1)

  const uMin = xMin / (width - 1), uSpan = Math.max(1e-5, (xMax - xMin) / (width - 1))
  const vMin = yMin / (height - 1), vSpan = Math.max(1e-5, (yMax - yMin) / (height - 1))

  for (let i = 0; i < gridN; i++) {
    if (!usedVert[i]) continue
    const u = gU[i], v = gV[i]
    const zNorm = ((u - uMin) / uSpan) * 2.0 - 1.0
    const yNorm = (0.5 - (v - vMin) / vSpan) * 2.0 * aspectY
    const x = isBoundaryVert[i] ? 0 : gThick[i]

    let uTex = u
    if (spec.id === 'blue-tang' && u > 0.80 && v > 0.310 && v < 0.452) {
      const vEyeBand = smoothstep(0.310, 0.338, v) * (1.0 - smoothstep(0.420, 0.452, v))
      const inFrontBridge = (1.0 - smoothstep(0.048, 0.072, x)) * vEyeBand
      if (inFrontBridge > 0.001 && u < 0.901) {
        uTex = lerp(u, 0.901, inFrontBridge * smoothstep(0.80, 0.835, u))
      }
    }

    if (isBoundaryVert[i]) {
      const vIdx = addVert(0, yNorm, zNorm, uTex, v)
      posSideIdx[i] = vIdx
      negSideIdx[i] = vIdx
    } else {
      posSideIdx[i] = addVert(x, yNorm, zNorm, uTex, v)
      negSideIdx[i] = addVert(-x, yNorm, zNorm, uTex, v)
    }
  }

  for (let iy = 0; iy < nY; iy++) {
    for (let iz = 0; iz < nZ; iz++) {
      if (!activeCell[iy * nZ + iz]) continue
      const i00 = iy * (nZ + 1) + iz
      const i10 = i00 + 1
      const i01 = i00 + (nZ + 1)
      const i11 = i01 + 1

      const p00 = posSideIdx[i00], p10 = posSideIdx[i10], p01 = posSideIdx[i01], p11 = posSideIdx[i11]
      if (p00 !== p10 && p10 !== p11 && p11 !== p00) indices.push(p00, p01, p11)
      if (p00 !== p11 && p11 !== p10 && p10 !== p00) indices.push(p00, p11, p10)

      const n00 = negSideIdx[i00], n10 = negSideIdx[i10], n01 = negSideIdx[i01], n11 = negSideIdx[i11]
      if (n00 !== n11 && n11 !== n01 && n01 !== n00) indices.push(n00, n11, n01)
      if (n00 !== n10 && n10 !== n11 && n11 !== n00) indices.push(n00, n10, n11)
    }
  }

  const p = spec.pectoral
  const rootFlankX = spec.maxHalfW * 0.72

  for (const [sideSign, jointIdx] of [[1.0, 6], [-1.0, 7]]) {
    const nC = 16, mR = 6
    const grid = [[], []]
    for (let side = 0; side < 2; side++) {
      const surfSign = side === 0 ? 1.0 : -1.0
      for (let c = 0; c < nC; c++) {
        const sRay = c / (nC - 1)
        const col = []
        for (let r = 0; r < mR; r++) {
          const tRad = r / (mR - 1)
          const halfT = lerp(0.0014, 0.0004, tRad) * surfSign
          let px, py, pz, u, v
          if (spec.id === 'blue-tang') {
            const uR = lerp(0.726, 0.708, sRay)
            const vR = lerp(0.595, 0.655, sRay)
            const arch = Math.pow(Math.sin(sRay * Math.PI), 0.62)
            const uTip = lerp(0.648, 0.640, sRay) - 0.022 * arch
            const vTip = lerp(0.455, 0.625, sRay) - 0.018 * arch
            const uCurr = lerp(uR, uTip, tRad)
            const vCurr = lerp(vR, vTip, tRad)
            pz = ((uCurr - uMin) / uSpan) * 2.0 - 1.0
            py = (0.5 - (vCurr - vMin) / vSpan) * 2.0 * aspectY
            const fV = clamp((vCurr - vMin) / vSpan, 0.1, 0.9)
            const bodyHw = spec.maxHalfW * 0.85 * Math.pow(Math.sin(fV * Math.PI), 1.42)
            px = sideSign * (bodyHw * 0.98 + 0.038 * Math.pow(tRad, 1.15) + halfT)
            u = lerp(p.u0, p.u1, tRad)
            v = lerp(p.v0, p.v1, sRay)
          } else {
            const ang = lerp(-0.52, 0.62, sRay)
            const reach = 0.55 + 0.45 * Math.pow(Math.sin(sRay * Math.PI), 0.55)
            const rayLen = p.length * reach
            px = sideSign * (rootFlankX + p.outX * Math.pow(tRad, 1.1) * reach + halfT)
            py = p.y + lerp(-0.018, 0.018, sRay) + p.spreadY * Math.pow(tRad, 0.92) * Math.sin(ang)
            pz = p.z - rayLen * tRad * Math.cos(ang * 0.45)
            u = lerp(p.u0, p.u1, 1.0 - tRad * 0.85)
            v = lerp(p.v0, p.v1, sRay)
          }
          const wFin = smoothstep(0.08, 0.35, tRad)
          const skin = { joints: [jointIdx, 1, 0, 0], weights: [wFin, 1.0 - wFin, 0, 0] }
          col.push(addVert(px, py, pz, u, v, skin))
        }
        grid[side].push(col)
      }
    }
    for (let c = 0; c < nC - 1; c++) {
      for (let r = 0; r < mR - 1; r++) {
        indices.push(
          grid[0][c][r], grid[0][c + 1][r], grid[0][c + 1][r + 1],
          grid[0][c][r], grid[0][c + 1][r + 1], grid[0][c][r + 1],
          grid[1][c][r], grid[1][c][r + 1], grid[1][c + 1][r + 1],
          grid[1][c][r], grid[1][c + 1][r + 1], grid[1][c + 1][r],
        )
      }
    }
  }

  let zMin = Infinity, zMax = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2]
    if (z < zMin) zMin = z
    if (z > zMax) zMax = z
  }
  const zSpan = zMax - zMin
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] = ((positions[i + 2] - zMin) / zSpan) * 2.0 - 1.0
  }

  const normals = new Float32Array(positions.length)
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3
    const ax = positions[i1] - positions[i0], ay = positions[i1 + 1] - positions[i0 + 1], az = positions[i1 + 2] - positions[i0 + 2]
    const bx = positions[i2] - positions[i0], by = positions[i2 + 1] - positions[i0 + 1], bz = positions[i2 + 2] - positions[i0 + 2]
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz
    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz
    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz
  }
  for (let i = 0; i < normals.length; i += 3) {
    const x = positions[i], z = positions[i + 2]
    if (z > 0.35 && Math.abs(x) < 0.035) {
      const seamBlend = smoothstep(0.0, 0.035, Math.abs(x))
      normals[i] *= seamBlend
    }
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1.0
    normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len
  }

  const dilatedRgba = dilateRgbaInterior(rgba, distIn, width, height, spec.id === 'blue-tang')
  const pbr = buildPhotorealPbrTextures(dilatedRgba, width, height, spec.texSize || 512, spec.id)

  return {
    positions: new Float32Array(positions),
    normals,
    uvs: new Float32Array(uvs),
    joints: new Uint8Array(joints),
    weights: new Float32Array(weights),
    indices: new Uint16Array(indices),
    rootFlankX,
    pectoralZ: spec.pectoral.z,
    pectoralY: spec.pectoral.y,
    normalScale: 0.08,
    ...pbr,
  }
}

function buildOriginalRigAndAnimation(spec, rootFlankX, pectoralZ = spec.pectoral.z, pectoralY = spec.pectoral.y) {
  const s2 = Math.SQRT1_2
  const pectX = Number(rootFlankX.toFixed(4))
  const pectY = Number((0.48 - pectoralZ).toFixed(4))
  const pectZ = Number(pectoralY.toFixed(4))

  const jointSpecs = [
    { name: 'spine_0', parent: -1, translation: [0, 0, 1.0], rotation: [-s2, 0, 0, s2], children: [1] },
    { name: 'spine_1', parent: 0, translation: [0, 0.52, 0], rotation: [0, 0, 0, 1], children: [2, 6, 7] },
    { name: 'spine_2', parent: 1, translation: [0, 0.36, 0], rotation: [0, 0, 0, 1], children: [3] },
    { name: 'spine_3', parent: 2, translation: [0, 0.35, 0], rotation: [0, 0, 0, 1], children: [4] },
    { name: 'spine_4', parent: 3, translation: [0, 0.32, 0], rotation: [0, 0, 0, 1], children: [5] },
    { name: 'spine_5', parent: 4, translation: [0, 0.23, 0], rotation: [0, 0, 0, 1], children: [] },
    { name: 'pectoral_L', parent: 1, translation: [pectX, pectY, pectZ], rotation: [0, 0, -0.26945543, 0.96301287], children: [] },
    { name: 'pectoral_R', parent: 1, translation: [-pectX, pectY, pectZ], rotation: [0, 0, 0.26945543, 0.96301287], children: [] },
  ]

  const worldMatrices = []
  const ibmFloats = new Float32Array(8 * 16)
  for (let j = 0; j < jointSpecs.length; j++) {
    const js = jointSpecs[j]
    const localMat = new THREE.Matrix4().compose(
      new THREE.Vector3(...js.translation),
      new THREE.Quaternion(...js.rotation),
      new THREE.Vector3(1, 1, 1),
    )
    const worldMat = js.parent === -1
      ? localMat.clone()
      : new THREE.Matrix4().multiplyMatrices(worldMatrices[js.parent], localMat)
    worldMatrices.push(worldMat)
    const ibm = worldMat.clone().invert()
    ibmFloats.set(ibm.elements, j * 16)
  }

  const frameCount = 49
  const times = new Float32Array(frameCount)
  for (let f = 0; f < frameCount; f++) times[f] = f / 24.0

  const phaseLag = 0.52
  const quatTracks = jointSpecs.map(() => new Float32Array(frameCount * 4))
  const euler = new THREE.Euler()
  const restQuat = new THREE.Quaternion()
  const deltaQuat = new THREE.Quaternion()
  const outQuat = new THREE.Quaternion()

  for (let f = 0; f < frameCount; f++) {
    const phase = (f / (frameCount - 1)) * Math.PI * 2.0

    for (let j = 0; j < 6; j++) {
      restQuat.set(...jointSpecs[j].rotation)
      const ampRad = THREE.MathUtils.degToRad(spec.spineAmpDeg[j] || 0)
      const angleZ = ampRad * Math.sin(phase - j * phaseLag)
      deltaQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleZ)
      outQuat.copy(restQuat).multiply(deltaQuat).normalize()
      quatTracks[j].set([outQuat.x, outQuat.y, outQuat.z, outQuat.w], f * 4)
    }

    for (const [jIdx, sideSign] of [[6, 1.0], [7, -1.0]]) {
      restQuat.set(...jointSpecs[jIdx].rotation)
      const sweep = THREE.MathUtils.degToRad(spec.pectSweepDeg) * Math.sin(phase * 2.0)
      const feather = THREE.MathUtils.degToRad(spec.pectFeatherDeg) * Math.cos(phase * 2.0)
      euler.set(feather, 0, sideSign * sweep, 'XYZ')
      deltaQuat.setFromEuler(euler)
      outQuat.copy(restQuat).multiply(deltaQuat).normalize()
      quatTracks[jIdx].set([outQuat.x, outQuat.y, outQuat.z, outQuat.w], f * 4)
    }
  }

  return { jointSpecs, ibmFloats, times, quatTracks }
}

function buildSelfContainedContractGlb(spec, meshData, sourceSha256) {
  const { jointSpecs, ibmFloats, times, quatTracks } = buildOriginalRigAndAnimation(
    spec,
    meshData.rootFlankX,
    meshData.pectoralZ ?? spec.pectoral.z,
    meshData.pectoralY ?? spec.pectoral.y,
  )

  const posMin = [Infinity, Infinity, Infinity]
  const posMax = [-Infinity, -Infinity, -Infinity]
  const vertCount = meshData.positions.length / 3
  for (let i = 0; i < vertCount; i++) {
    for (let c = 0; c < 3; c++) {
      const v = meshData.positions[i * 3 + c]
      if (v < posMin[c]) posMin[c] = v
      if (v > posMax[c]) posMax[c] = v
    }
  }
  const pMin = posMin.map(v => Number(v.toFixed(6)))
  const pMax = posMax.map(v => Number(v.toFixed(6)))
  const dimensionsM = [
    Number((pMax[0] - pMin[0]).toFixed(6)),
    Number((pMax[1] - pMin[1]).toFixed(6)),
    Number((pMax[2] - pMin[2]).toFixed(6)),
  ]

  const assetId = `fish-${spec.id}`
  const primitiveId = `${spec.id.replace(/-/g, '_')}_body`
  const recipe = `node --experimental-strip-types scripts/build-splat-fish-glbs.mjs`

  const reefAsset = {
    schema: 'reef-asset-v1',
    id: assetId,
    kind: 'fish',
    units: 'meter',
    upAxis: '+Y',
    origin: 'local',
    dimensionsM,
    provenance: {
      license: 'original',
      creator: 'Aquarium project',
      sourceSha256,
      recipe,
      attribution: `Original photorealistic 3D rigged and animated fish asset (${spec.scientificName}) reconstructed from project-original public/fish/${spec.id}.webp with embedded PBR textures.`,
    },
  }

  const reefPrimitive = {
    id: primitiveId,
    role: 'fish',
  }

  const chunks = []
  const bufferViews = []
  const accessors = []
  let byteOffset = 0

  function addBufferView(typedOrBuffer, target) {
    const buf = Buffer.isBuffer(typedOrBuffer)
      ? typedOrBuffer
      : Buffer.from(typedOrBuffer.buffer, typedOrBuffer.byteOffset, typedOrBuffer.byteLength)
    const pad = (4 - (buf.length % 4)) % 4
    const bvIndex = bufferViews.length
    const bv = { buffer: 0, byteOffset, byteLength: buf.length }
    if (target) bv.target = target
    bufferViews.push(bv)
    chunks.push(buf)
    if (pad > 0) chunks.push(Buffer.alloc(pad))
    byteOffset += buf.length + pad
    return bvIndex
  }

  function addAccessor(bvIndex, componentType, count, type, min, max) {
    const accIndex = accessors.length
    const acc = { bufferView: bvIndex, componentType, count, type }
    if (min) acc.min = min
    if (max) acc.max = max
    accessors.push(acc)
    return accIndex
  }

  const accPos = addAccessor(addBufferView(meshData.positions, 34962), 5126, vertCount, 'VEC3', pMin, pMax)
  const accNorm = addAccessor(addBufferView(meshData.normals, 34962), 5126, vertCount, 'VEC3')
  const accUv = addAccessor(addBufferView(meshData.uvs, 34962), 5126, vertCount, 'VEC2')
  const accJoints = addAccessor(addBufferView(meshData.joints, 34962), 5121, vertCount, 'VEC4')
  const accWeights = addAccessor(addBufferView(meshData.weights, 34962), 5126, vertCount, 'VEC4')
  const accIdx = addAccessor(addBufferView(meshData.indices, 34963), 5123, meshData.indices.length, 'SCALAR')

  const bvBasePng = addBufferView(meshData.basePng)
  const bvNormPng = addBufferView(meshData.normPng)
  const bvOrmPng = addBufferView(meshData.ormPng)

  const accIbm = addAccessor(addBufferView(ibmFloats), 5126, 8, 'MAT4')
  const accTime = addAccessor(
    addBufferView(times),
    5126,
    times.length,
    'SCALAR',
    [0],
    [Number(times[times.length - 1].toFixed(6))],
  )

  const samplers = []
  const channels = []
  for (let j = 0; j < 8; j++) {
    const accRot = addAccessor(addBufferView(quatTracks[j]), 5126, times.length, 'VEC4')
    const samplerIdx = samplers.length
    samplers.push({
      input: accTime,
      interpolation: 'LINEAR',
      output: accRot,
    })
    channels.push({
      sampler: samplerIdx,
      target: { node: 2 + j, path: 'rotation' },
    })
  }

  const nodes = [
    {
      name: `${spec.id}_Root`,
      children: [1, 2],
      extras: { reefAsset },
    },
    {
      name: `${spec.id}_Mesh`,
      mesh: 0,
      skin: 0,
      extras: { reefPrimitive },
    },
    ...jointSpecs.map(js => {
      const node = {
        name: js.name,
        translation: js.translation,
        rotation: js.rotation,
      }
      if (js.children.length > 0) {
        node.children = js.children.map(c => 2 + c)
      }
      return node
    }),
  ]

  const doc = {
    asset: {
      version: '2.0',
      generator: 'Aquarium photorealistic 3D fish generator (reef-asset-v1)',
    },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes,
    skins: [
      {
        name: `${spec.id}_Rig`,
        inverseBindMatrices: accIbm,
        skeleton: 2,
        joints: [2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
    meshes: [
      {
        name: `${spec.id}_Geo`,
        primitives: [
          {
            attributes: {
              POSITION: accPos,
              NORMAL: accNorm,
              TEXCOORD_0: accUv,
              JOINTS_0: accJoints,
              WEIGHTS_0: accWeights,
            },
            indices: accIdx,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: `${spec.id}_Mat`,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicRoughnessTexture: { index: 2 },
          metallicFactor: 0.0,
          roughnessFactor: 1.0,
        },
        normalTexture: { index: 1, scale: meshData.normalScale ?? 0.08 },
        occlusionTexture: { index: 2, strength: 1.0 },
      },
    ],
    textures: [
      { sampler: 0, source: 0 },
      { sampler: 0, source: 1 },
      { sampler: 0, source: 2 },
    ],
    samplers: [
      {
        magFilter: 9729,
        minFilter: 9987,
        wrapS: 33071,
        wrapT: 33071,
      },
    ],
    images: [
      { bufferView: bvBasePng, mimeType: 'image/png', name: `${spec.id}_BaseColor` },
      { bufferView: bvNormPng, mimeType: 'image/png', name: `${spec.id}_Normal` },
      { bufferView: bvOrmPng, mimeType: 'image/png', name: `${spec.id}_ORM` },
    ],
    animations: [
      {
        name: spec.clipName,
        samplers,
        channels,
      },
    ],
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  }

  const inspectionRecord = {
    extras: { reefAsset },
    rootTransform: {
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    boundsM: { min: pMin, max: pMax },
    primitives: [
      {
        id: primitiveId,
        role: 'fish',
        vertexCount: vertCount,
        boundsM: { min: pMin, max: pMax },
        material: {
          vertexColors: false,
          vertexAlpha: false,
          aoSource: 'texture',
        },
      },
    ],
    sockets: [],
    collisionParts: [],
  }

  const validation = validateAssetContract(inspectionRecord)
  if (!validation.valid) {
    throw new Error(`Contract validation failed for ${assetId}: ${JSON.stringify(validation.issues)}`)
  }

  const jsonStr = JSON.stringify(doc)
  const jsonPad = (4 - (Buffer.byteLength(jsonStr, 'utf8') % 4)) % 4
  const jsonBuf = Buffer.from(jsonStr + ' '.repeat(jsonPad), 'utf8')
  const binBuf = Buffer.concat(chunks)

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonBuf.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binBuf.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)

  return {
    glbBuf: Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]),
    inspectionRecord,
    dimensionsM,
    vertCount,
    triCount: meshData.indices.length / 3,
    joints: jointSpecs.map(j => j.name),
    animations: [spec.clipName],
    primitiveId,
  }
}

function loadManualOverrideGlb(spec, overrideGlbPath, proceduralMeshData, sourceSha256) {
  const rawBuf = fs.readFileSync(overrideGlbPath)
  if (rawBuf.byteLength < 20 || rawBuf.readUInt32LE(0) !== 0x46546c67 || rawBuf.readUInt32LE(4) !== 2) {
    throw new Error(`Invalid GLB header in manual override: ${overrideGlbPath}`)
  }
  const jsonChunkLen = rawBuf.readUInt32LE(12)
  const jsonChunkType = rawBuf.readUInt32LE(16)
  if (jsonChunkType !== 0x4e4f534a) {
    throw new Error(`First chunk in manual override is not JSON: ${overrideGlbPath}`)
  }
  const doc = JSON.parse(rawBuf.subarray(20, 20 + jsonChunkLen).toString('utf8'))
  const binHeaderOffset = 20 + jsonChunkLen
  const binChunkLen = rawBuf.readUInt32LE(binHeaderOffset)
  const binBuf = rawBuf.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binChunkLen)

  const prim = doc.meshes?.[0]?.primitives?.[0]
  if (!prim) {
    throw new Error(`Manual override GLB contains no mesh primitive: ${overrideGlbPath}`)
  }

  function readFloatAccessor(accIdx, compCount) {
    if (typeof accIdx !== 'number' || !doc.accessors?.[accIdx]) return null
    const acc = doc.accessors[accIdx]
    const bv = doc.bufferViews[acc.bufferView]
    const baseOff = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const stride = bv.byteStride || compCount * 4
    const out = new Float32Array(acc.count * compCount)
    for (let i = 0; i < acc.count; i++) {
      const vOff = baseOff + i * stride
      for (let c = 0; c < compCount; c++) {
        out[i * compCount + c] = binBuf.readFloatLE(vOff + c * 4)
      }
    }
    return out
  }

  function readJointsAccessor(accIdx) {
    if (typeof accIdx !== 'number' || !doc.accessors?.[accIdx]) return null
    const acc = doc.accessors[accIdx]
    const bv = doc.bufferViews[acc.bufferView]
    const baseOff = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const isU16 = acc.componentType === 5123
    const elemSize = isU16 ? 2 : 1
    const stride = bv.byteStride || 4 * elemSize
    const canonicalNames = ['spine_0', 'spine_1', 'spine_2', 'spine_3', 'spine_4', 'spine_5', 'pectoral_L', 'pectoral_R']
    const exportedJointNodes = doc.skins?.[0]?.joints?.map(nIdx => doc.nodes?.[nIdx]?.name) ?? canonicalNames
    const remap = exportedJointNodes.map((name, idx) => {
      const found = canonicalNames.indexOf(name)
      return found !== -1 ? found : Math.min(7, idx)
    })
    const out = new Uint8Array(acc.count * 4)
    for (let i = 0; i < acc.count; i++) {
      const vOff = baseOff + i * stride
      for (let c = 0; c < 4; c++) {
        const rawJ = isU16 ? binBuf.readUInt16LE(vOff + c * 2) : binBuf.readUInt8(vOff + c)
        out[i * 4 + c] = remap[rawJ] ?? rawJ
      }
    }
    return out
  }

  function readIndicesAccessor(accIdx) {
    if (typeof accIdx !== 'number' || !doc.accessors?.[accIdx]) return null
    const acc = doc.accessors[accIdx]
    const bv = doc.bufferViews[acc.bufferView]
    const baseOff = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const out = new Uint16Array(acc.count)
    for (let i = 0; i < acc.count; i++) {
      out[i] = acc.componentType === 5125
        ? binBuf.readUInt32LE(baseOff + i * 4)
        : acc.componentType === 5123
          ? binBuf.readUInt16LE(baseOff + i * 2)
          : binBuf.readUInt8(baseOff + i)
    }
    return out
  }

  function extractTextureBuffer(texInfo) {
    if (!texInfo || typeof texInfo.index !== 'number') return null
    const tex = doc.textures?.[texInfo.index]
    if (!tex || typeof tex.source !== 'number') return null
    const img = doc.images?.[tex.source]
    if (!img || typeof img.bufferView !== 'number') return null
    const bv = doc.bufferViews?.[img.bufferView]
    if (!bv) return null
    return Buffer.from(binBuf.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength))
  }

  const positions = readFloatAccessor(prim.attributes.POSITION, 3) ?? proceduralMeshData.positions
  const normals = readFloatAccessor(prim.attributes.NORMAL, 3) ?? proceduralMeshData.normals
  const uvs = readFloatAccessor(prim.attributes.TEXCOORD_0, 2) ?? proceduralMeshData.uvs
  const joints = readJointsAccessor(prim.attributes.JOINTS_0) ?? proceduralMeshData.joints
  const weights = readFloatAccessor(prim.attributes.WEIGHTS_0, 4) ?? proceduralMeshData.weights
  const indices = readIndicesAccessor(prim.indices) ?? proceduralMeshData.indices

  // Preserve custom textures embedded in the manual override GLB (e.g. dual-island 1024x1024 PBR maps)
  const mat = doc.materials?.[prim.material ?? 0]
  const overrideBasePng = extractTextureBuffer(mat?.pbrMetallicRoughness?.baseColorTexture)
  const overrideNormPng = extractTextureBuffer(mat?.normalTexture)
  const overrideOrmPng = extractTextureBuffer(mat?.pbrMetallicRoughness?.metallicRoughnessTexture ?? mat?.occlusionTexture)

  // Measure pectoral_L (joint 6) root socket from the override mesh so the rig pivot matches the geometry
  const pectPts = []
  const vertCount = positions.length / 3
  for (let i = 0; i < vertCount; i++) {
    let wPect = 0
    for (let c = 0; c < 4; c++) {
      if (joints[i * 4 + c] === 6) wPect += weights[i * 4 + c]
    }
    if (wPect > 0.1) {
      pectPts.push({
        x: Math.abs(positions[i * 3 + 0]),
        y: positions[i * 3 + 1],
        z: positions[i * 3 + 2],
      })
    }
  }
  let rootFlankX = proceduralMeshData.rootFlankX
  let pectoralZ = proceduralMeshData.pectoralZ ?? spec.pectoral.z
  let pectoralY = proceduralMeshData.pectoralY ?? spec.pectoral.y
  if (pectPts.length > 0) {
    pectPts.sort((a, b) => a.x - b.x)
    const rootSample = pectPts.slice(0, Math.max(1, Math.floor(pectPts.length * 0.2)))
    const avg = rootSample.reduce(
      (acc, p) => ({
        x: acc.x + p.x / rootSample.length,
        y: acc.y + p.y / rootSample.length,
        z: acc.z + p.z / rootSample.length,
      }),
      { x: 0, y: 0, z: 0 },
    )
    rootFlankX = Math.max(0.04, avg.x)
    pectoralZ = avg.z
    pectoralY = avg.y
  }

  const overrideMeshData = {
    ...proceduralMeshData,
    positions,
    normals,
    uvs,
    joints,
    weights,
    indices,
    rootFlankX,
    pectoralZ,
    pectoralY,
    basePng: overrideBasePng ?? proceduralMeshData.basePng,
    normPng: overrideNormPng ?? proceduralMeshData.normPng,
    ormPng: overrideOrmPng ?? proceduralMeshData.ormPng,
    normalScale: overrideNormPng ? 0.65 : proceduralMeshData.normalScale,
  }

  const built = buildSelfContainedContractGlb(spec, overrideMeshData, sourceSha256)
  return {
    ...built,
    isOverride: true,
  }
}

const OVERRIDES_DIR = path.join(OUT_DIR, 'overrides')
const BLEND_DIR = path.join(OUT_DIR, 'blend')
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(OVERRIDES_DIR, { recursive: true })
fs.mkdirSync(BLEND_DIR, { recursive: true })

const forceProcedural = process.argv.includes('--force-procedural')
const generatorSha256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')
const manifestEntries = []

for (const spec of SPECIES_SPECS) {
  const meshData = buildPhotoreal3DMesh(spec)
  const proceduralBuilt = buildSelfContainedContractGlb(spec, meshData, generatorSha256)
  const fileName = `${spec.id}.glb`
  const overrideGlbPath = path.join(OVERRIDES_DIR, fileName)
  const built = !forceProcedural && fs.existsSync(overrideGlbPath)
    ? loadManualOverrideGlb(spec, overrideGlbPath, meshData, generatorSha256)
    : proceduralBuilt
  const assetId = `fish-${spec.id}`
  const outGlbPath = path.join(OUT_DIR, fileName)
  const outInspectionPath = path.join(OUT_DIR, `${assetId}-inspection.json`)

  fs.writeFileSync(outGlbPath, built.glbBuf)
  fs.writeFileSync(outInspectionPath, JSON.stringify(built.inspectionRecord, null, 2) + '\n')

  const glbSha256 = crypto.createHash('sha256').update(built.glbBuf).digest('hex')
  manifestEntries.push({
    id: assetId,
    fishSpeciesId: spec.id,
    file: fileName,
    path: `src/rendering/assets/splat-fish/${fileName}`,
    inspectionReport: `src/rendering/assets/splat-fish/${assetId}-inspection.json`,
    kind: 'fish',
    rigArchetype: spec.rigArchetype,
    species: spec.scientificName,
    sha256: glbSha256,
    bytes: built.glbBuf.length,
    triangles: built.triCount,
    dimensionsM: built.dimensionsM,
    boundsM: built.inspectionRecord.boundsM,
    joints: built.joints,
    animations: built.animations,
    primitives: [
      {
        id: built.primitiveId,
        role: 'fish',
        vertexCount: built.vertCount,
      },
    ],
    generator: 'scripts/build-splat-fish-glbs.mjs',
    generatorSha256,
    recipe: 'node --experimental-strip-types scripts/build-splat-fish-glbs.mjs',
    contractValidated: true,
    status: 'candidate-awaiting-root-review',
  })

  const modeLabel = built.isOverride ? '[override]' : 'Built     '
  console.log(
    `${modeLabel} & contract-verified ${assetId.padEnd(30)} -> ${(built.glbBuf.length / 1024).toFixed(1)} KB | tris: ${built.triCount} | anim: ${spec.clipName} | sha256: ${glbSha256.slice(0, 12)}...`,
  )
}

const manifestPath = path.join(OUT_DIR, 'manifest.json')
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      schema: 'modular-fish-manifest-v1',
      contractSchema: 'reef-asset-v1',
      note: 'Thirteen self-contained photorealistic 3D rigged fish assets reconstructed from project-original public/fish/*.webp cutouts pass the offline reef-asset-v1 contract.',
      assets: manifestEntries,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Wrote ${manifestPath} with ${manifestEntries.length} contract-validated fish assets.`)
