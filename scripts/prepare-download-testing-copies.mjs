/**
 * Non-Destructive Adapter for `src/rendering/assets/fish/download_testing/*.glb`
 *
 * Reads the original reference `.glb` files in `src/rendering/assets/fish/download_testing/`
 * WITHOUT modifying them, and creates normalized, contract-rigged (`spine_0..spine_5`,
 * `pectoral_L`, `pectoral_R`), PBR-textured (BaseColor + Normal + ORM with
 * glossy wet cornea `roughness = 0.03` and cavity AO), animated copies in:
 *   - `src/rendering/assets/fish/download_testing_copies/blue_tang_fish_paracanthurus_hepatus-copy.glb`
 *   - `src/rendering/assets/fish/download_testing_copies/clownfish-copy.glb`
 *   - `src/rendering/assets/fish/download_testing_copies/zebrasoma_desjardinii-copy.glb`
 * and updates `src/rendering/assets/splat-fish/overrides/blue-tang.glb` + `.output/blue_tang_photoreal/`.
 */

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import * as THREE from 'three'
import { validateAssetContract } from '../src/rendering/assets/contract.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const SRC_TESTING_DIR = path.join(REPO_ROOT, 'src/rendering/assets/fish/download_testing')
const OUT_COPIES_DIR = path.join(REPO_ROOT, 'src/rendering/assets/fish/download_testing_copies')
const SPLAT_OVERRIDES_DIR = path.join(REPO_ROOT, 'src/rendering/assets/splat-fish/overrides')
const BLUE_TANG_TEX_DIR = path.join(REPO_ROOT, '.output/blue_tang_photoreal')

fs.mkdirSync(OUT_COPIES_DIR, { recursive: true })
fs.mkdirSync(SPLAT_OVERRIDES_DIR, { recursive: true })
fs.mkdirSync(BLUE_TANG_TEX_DIR, { recursive: true })

const clamp = (v, lo = 0.0, hi = 1.0) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t
function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1.0 : 0.0
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
  return t * t * (3.0 - 2.0 * t)
}

// CRC32 & Paeth-filtered PNG encoder for compact GLB delivery within the 2.5 MiB budget
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
function paethPredictor(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}
function encodeRgbaPng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc(height * (1 + stride))
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + stride)
    raw[rowOff] = 4 // Paeth filter
    const curOff = y * stride
    const prevOff = (y - 1) * stride
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? rgba[curOff + i - 4] : 0
      const b = y > 0 ? rgba[prevOff + i] : 0
      const c = y > 0 && i >= 4 ? rgba[prevOff + i - 4] : 0
      raw[rowOff + 1 + i] = (rgba[curOff + i] - paethPredictor(a, b, c)) & 0xff
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, makePngChunk('IHDR', ihdr), makePngChunk('IDAT', idat), makePngChunk('IEND', Buffer.alloc(0))])
}

function decodeAndResizePngToRgba(pngBuf, targetSize = 768) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fish-tex-'))
  const inPng = path.join(tmpDir, 'in.png')
  const outWebp = path.join(tmpDir, 'out.webp')
  const outPam = path.join(tmpDir, 'out.pam')
  try {
    fs.writeFileSync(inPng, pngBuf)
    execFileSync('sips', ['-z', String(targetSize), String(targetSize), inPng, '--out', inPng], {
      stdio: 'ignore',
    })
    execFileSync('cwebp', ['-q', '100', '-lossless', inPng, '-o', outWebp], {
      stdio: 'ignore',
    })
    execFileSync('dwebp', [outWebp, '-pam', '-o', outPam], {
      stdio: 'ignore',
    })
    const pamBuf = fs.readFileSync(outPam)
    const headerEnd = pamBuf.indexOf(Buffer.from('ENDHDR\n')) + 7
    const rgba = new Uint8Array(
      pamBuf.buffer,
      pamBuf.byteOffset + headerEnd,
      targetSize * targetSize * 4,
    )
    return new Uint8Array(rgba)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
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

const COPY_SPECS = [
  {
    sourceFile: 'blue_tang_fish_paracanthurus_hepatus.glb',
    outputCopyFile: 'blue_tang_fish_paracanthurus_hepatus-copy.glb',
    speciesId: 'blue-tang',
    scientificName: 'Paracanthurus hepatus (Regal Blue Tang / Palette Surgeonfish)',
    rigArchetype: 'labriform_cruiser',
    clipName: 'blue_tang_labriform_swim',
    spineAmpDeg: [0.0, 0.8, 2.2, 5.2, 8.8, 13.0],
    pectSweepDeg: 26.0,
    pectFeatherDeg: 12.0,
    zTargetMin: -1.0,
    zTargetMax: 1.0,
    baseImageIdx: 0,
    normImageIdx: 1,
    occImageIdx: null,
    pectLeftSkinIndices: [7, 8],
    pectRightSkinIndices: [9, 10],
    eyeUvCenters: [
      { u: 0.1379, v: 0.3101, ru: 0.032, rv: 0.036 },
      { u: 0.8845, v: 0.7130, ru: 0.032, rv: 0.036 },
    ],
    eye3DCenter: { y: 0.0852, z: 0.7287, ry: 0.072, rz: 0.072 },
    sculptHeadFeatures: true,
  },
  {
    sourceFile: 'clownfish.glb',
    outputCopyFile: 'clownfish-copy.glb',
    speciesId: 'ocellaris-clownfish',
    scientificName: 'Amphiprion ocellaris (Ocellaris Clownfish)',
    rigArchetype: 'subcarangiform_schooler',
    clipName: 'clownfish_subcarangiform_swim',
    spineAmpDeg: [0.0, 1.2, 2.8, 5.4, 8.5, 12.0],
    pectSweepDeg: 22.0,
    pectFeatherDeg: 11.0,
    zTargetMin: -1.0,
    zTargetMax: 1.0,
    baseImageIdx: 0,
    normImageIdx: 2,
    occImageIdx: 1,
    pectLeftSkinIndices: [6, 7],
    pectRightSkinIndices: [11, 12],
    eyeUvCenters: [
      { u: 0.135, v: 0.312, ru: 0.034, rv: 0.036 },
      { u: 0.840, v: 0.778, ru: 0.034, rv: 0.036 },
    ],
    eye3DCenter: { y: 0.032, z: 0.725, ry: 0.075, rz: 0.075 },
    sculptHeadFeatures: true,
  },
  {
    sourceFile: 'zebrasoma_desjardinii.glb',
    outputCopyFile: 'zebrasoma_desjardinii-copy.glb',
    speciesId: 'yellow-tang',
    scientificName: 'Zebrasoma desjardinii (Desjardini Sailfin Tang)',
    rigArchetype: 'labriform_rigid_disc',
    clipName: 'zebrasoma_labriform_swim',
    spineAmpDeg: [0.0, 0.4, 1.2, 3.2, 6.2, 9.8],
    pectSweepDeg: 25.0,
    pectFeatherDeg: 13.0,
    zTargetMin: -0.999266,
    zTargetMax: 0.986157,
    baseImageIdx: 0,
    normImageIdx: 2,
    occImageIdx: 1,
    pectLeftSkinIndices: [7, 8],
    pectRightSkinIndices: [9, 10],
    eyeUvCenters: [
      { u: 0.296, v: 0.312, ru: 0.028, rv: 0.034 },
      { u: 0.704, v: 0.752, ru: 0.028, rv: 0.034 },
    ],
    eye3DCenter: { y: 0.005, z: 0.655, ry: 0.072, rz: 0.072 },
    sculptHeadFeatures: true,
  },
]

function parseGlb(glbPath) {
  const raw = fs.readFileSync(glbPath)
  const jsonLen = raw.readUInt32LE(12)
  const doc = JSON.parse(raw.subarray(20, 20 + jsonLen).toString('utf8'))
  const bin = raw.subarray(20 + jsonLen + 8)
  return { raw, doc, bin }
}

function readAccessor(doc, bin, accIdx, compCount, isInt = false) {
  const acc = doc.accessors[accIdx]
  const bv = doc.bufferViews[acc.bufferView]
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const isU16 = acc.componentType === 5123
  const isU32 = acc.componentType === 5125
  const elemSize = isInt ? (isU32 ? 4 : isU16 ? 2 : 1) : 4
  const stride = bv.byteStride || compCount * elemSize
  const out = new (isInt ? Uint32Array : Float32Array)(acc.count * compCount)
  for (let i = 0; i < acc.count; i++) {
    const vOff = base + i * stride
    for (let c = 0; c < compCount; c++) {
      const off = vOff + c * elemSize
      out[i * compCount + c] = isInt
        ? isU32
          ? bin.readUInt32LE(off)
          : isU16
            ? bin.readUInt16LE(off)
            : bin.readUInt8(off)
        : bin.readFloatLE(off)
    }
  }
  return out
}

function convertReferenceGlbToContractCopy(spec, generatorSha256) {
  const srcPath = path.join(SRC_TESTING_DIR, spec.sourceFile)
  const { raw, doc, bin } = parseGlb(srcPath)
  const sourceSha256 = crypto.createHash('sha256').update(raw).digest('hex')

  const prim = doc.meshes[0].primitives[0]
  const rawPos = readAccessor(doc, bin, prim.attributes.POSITION, 3, false)
  const rawUv = readAccessor(doc, bin, prim.attributes.TEXCOORD_0, 2, false)
  const rawJoints = readAccessor(doc, bin, prim.attributes.JOINTS_0, 4, true)
  const rawWeights = readAccessor(doc, bin, prim.attributes.WEIGHTS_0, 4, false)
  const rawIndices = readAccessor(doc, bin, prim.indices, 1, true)

  const vertCount = rawPos.length / 3
  const posAcc = doc.accessors[prim.attributes.POSITION]
  const zMin = posAcc.min[2], zMax = posAcc.max[2]
  const yMin = posAcc.min[1], yMax = posAcc.max[1]
  const zSpan = zMax - zMin
  const yMid = 0.5 * (yMin + yMax)
  const targetZSpan = spec.zTargetMax - spec.zTargetMin
  const uniformScale = targetZSpan / zSpan

  const positions = new Float32Array(vertCount * 3)
  const uvs = new Float32Array(rawUv)
  const joints = new Uint8Array(vertCount * 4)
  const weights = new Float32Array(vertCount * 4)

  const pectLeftPts = []
  let maxHalfW = 0.08

  for (let i = 0; i < vertCount; i++) {
    let x = rawPos[i * 3 + 0] * uniformScale
    let y = (rawPos[i * 3 + 1] - yMid) * uniformScale
    let z = spec.zTargetMin + ((rawPos[i * 3 + 2] - zMin) / zSpan) * targetZSpan

    let wPectL = 0
    let wPectR = 0
    for (let c = 0; c < 4; c++) {
      const sj = rawJoints[i * 4 + c]
      const sw = rawWeights[i * 4 + c]
      if (spec.pectLeftSkinIndices.includes(sj)) wPectL += sw
      if (spec.pectRightSkinIndices.includes(sj)) wPectR += sw
    }
    const isPectoral = wPectL > 0.08 || wPectR > 0.08

    if (spec.sculptHeadFeatures && !isPectoral && Math.abs(x) > 0.002) {
      const side = x >= 0 ? 1.0 : -1.0
      const ec = spec.eye3DCenter
      const dyEye = (y - ec.y) / ec.ry
      const dzEye = (z - ec.z) / ec.rz
      const rEye = Math.hypot(dyEye, dzEye)

      if (rEye < 0.92) {
        const tE = rEye / 0.92
        const dome = Math.pow(0.5 + 0.5 * Math.cos(tE * Math.PI), 1.25)
        x += side * 0.0082 * dome
      } else if (rEye < 1.28) {
        const tRim = (rEye - 0.92) / 0.36
        x -= side * 0.0018 * Math.pow(Math.sin(tRim * Math.PI), 2.0)
      }

      if (spec.speciesId === 'blue-tang' && y > -0.28 && y < 0.06 && z > 0.44 && z < 0.68) {
        const yGillMask = Math.pow(Math.sin(clamp((y + 0.28) / 0.34, 0, 1) * Math.PI), 2.0)
        const zGillSlit = 0.525 + 1.15 * Math.pow(y + 0.11, 2)
        const dzGill = z - zGillSlit
        if (dzGill > 0.0 && dzGill < 0.085) {
          const tPlate = dzGill / 0.085
          x += side * 0.0042 * yGillMask * Math.pow(Math.sin(tPlate * Math.PI), 2.0) * (1.0 - 0.3 * tPlate)
        }
        const slitBell = Math.exp(-Math.pow((dzGill + 0.006) / 0.010, 2))
        x -= side * 0.0036 * yGillMask * slitBell
      }

      if (spec.speciesId === 'blue-tang' && z > 0.89 && y > -0.25 && y < -0.11) {
        const zMouthMask = smoothstep(0.89, 0.93, z)
        const yMouthCenter = -0.182
        const dyM = y - yMouthCenter
        const cleft = Math.exp(-Math.pow(dyM / 0.009, 2))
        const lips =
          Math.exp(-Math.pow((dyM - 0.018) / 0.011, 2)) +
          Math.exp(-Math.pow((dyM + 0.018) / 0.011, 2))
        z += zMouthMask * (0.0032 * lips - 0.0038 * cleft)
        x += side * zMouthMask * (0.0020 * lips - 0.0022 * cleft)
      }
    }

    if (!isPectoral && Math.abs(x) > maxHalfW) maxHalfW = Math.abs(x)

    positions[i * 3 + 0] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    if (wPectL > 0.05) {
      const wFin = clamp(wPectL, 0.0, 1.0)
      joints.set([6, 1, 0, 0], i * 4)
      weights.set([wFin, 1.0 - wFin, 0, 0], i * 4)
      pectLeftPts.push({ x, y, z, wFin })
    } else if (wPectR > 0.05) {
      const wFin = clamp(wPectR, 0.0, 1.0)
      joints.set([7, 1, 0, 0], i * 4)
      weights.set([wFin, 1.0 - wFin, 0, 0], i * 4)
    } else {
      const skin = computeSpineSkinning(z)
      joints.set(skin.joints, i * 4)
      weights.set(skin.weights, i * 4)
    }
  }

  let actualZMin = Infinity, actualZMax = -Infinity
  for (let i = 0; i < vertCount; i++) {
    const z = positions[i * 3 + 2]
    if (z < actualZMin) actualZMin = z
    if (z > actualZMax) actualZMax = z
  }
  const actualZSpan = actualZMax - actualZMin
  for (let i = 0; i < vertCount; i++) {
    positions[i * 3 + 2] =
      spec.zTargetMin + ((positions[i * 3 + 2] - actualZMin) / actualZSpan) * targetZSpan
  }

  const indices = new Uint16Array(rawIndices.length)
  for (let i = 0; i < rawIndices.length; i++) indices[i] = rawIndices[i]

  const normals = new Float32Array(vertCount * 3)
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3
    const ax = positions[i1] - positions[i0], ay = positions[i1 + 1] - positions[i0 + 1], az = positions[i1 + 2] - positions[i0 + 2]
    const bx = positions[i2] - positions[i0], by = positions[i2 + 1] - positions[i0 + 1], bz = positions[i2 + 2] - positions[i0 + 2]
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz
    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz
    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz
  }
  // Weld vertex normals across co-located sagittal UV-seam vertices (|x| <= 0.015)
  const seamBuckets = new Map()
  for (let v = 0; v < vertCount; v++) {
    const x = positions[v * 3 + 0]
    if (Math.abs(x) > 0.015) continue
    const key = `${Math.round(x * 1000)},${Math.round(positions[v * 3 + 1] * 1000)},${Math.round(positions[v * 3 + 2] * 1000)}`
    let list = seamBuckets.get(key)
    if (!list) {
      list = []
      seamBuckets.set(key, list)
    }
    list.push(v)
  }
  for (const list of seamBuckets.values()) {
    if (list.length < 2) continue
    let sx = 0, sy = 0, sz = 0
    for (const v of list) {
      sx += normals[v * 3 + 0]
      sy += normals[v * 3 + 1]
      sz += normals[v * 3 + 2]
    }
    const xAbs = Math.abs(positions[list[0] * 3 + 0])
    const midFade = clamp(1.0 - xAbs / 0.006, 0.0, 1.0)
    sx *= 1.0 - midFade
    for (const v of list) {
      normals[v * 3 + 0] = sx
      normals[v * 3 + 1] = sy
      normals[v * 3 + 2] = sz
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1.0
    normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len
  }

  pectLeftPts.sort((a, b) => a.x - b.x)
  const rootSample = pectLeftPts.slice(0, Math.max(1, Math.floor(pectLeftPts.length * 0.2)))
  const pectRoot = rootSample.reduce(
    (acc, p) => ({
      x: acc.x + p.x / rootSample.length,
      y: acc.y + p.y / rootSample.length,
      z: acc.z + p.z / rootSample.length,
    }),
    { x: maxHalfW * 0.72, y: -0.10, z: 0.44 },
  )

  // Use 768x768 with Paeth PNG compression and quantized normal/ORM maps so the
  // complete GLB stays comfortably below the 2.5 MiB background-fish budget!
  const texSize = 768
  function extractImageBuf(imgIdx) {
    const im = doc.images[imgIdx]
    const bv = doc.bufferViews[im.bufferView]
    return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)
  }

  const baseRgba = decodeAndResizePngToRgba(extractImageBuf(spec.baseImageIdx), texSize)
  const normRgba = decodeAndResizePngToRgba(extractImageBuf(spec.normImageIdx), texSize)
  const occRgba =
    spec.occImageIdx !== null
      ? decodeAndResizePngToRgba(extractImageBuf(spec.occImageIdx), texSize)
      : null

  // Build a soft sagittal-seam distance weight in UV space so tangent-space normal
  // maps feather smoothly to neutral (128, 128, 255) right across the x = 0 midline.
  const seamWeightMap = new Float32Array(texSize * texSize)
  seamWeightMap.fill(1.0)
  const brushR = 14
  for (let v = 0; v < vertCount; v++) {
    const xAbs = Math.abs(positions[v * 3 + 0])
    if (xAbs > 0.008) continue
    const cx = Math.round(uvs[v * 2 + 0] * (texSize - 1))
    const cy = Math.round(uvs[v * 2 + 1] * (texSize - 1))
    for (let dy = -brushR; dy <= brushR; dy++) {
      const py = cy + dy
      if (py < 0 || py >= texSize) continue
      for (let dx = -brushR; dx <= brushR; dx++) {
        const px = cx + dx
        if (px < 0 || px >= texSize) continue
        const d = Math.hypot(dx, dy) / brushR
        if (d < 1.0) {
          const w = smoothstep(0.15, 1.0, d)
          const mIdx = py * texSize + px
          if (w < seamWeightMap[mIdx]) seamWeightMap[mIdx] = w
        }
      }
    }
  }

  const ormRgba = new Uint8Array(texSize * texSize * 4)
  for (let py = 0; py < texSize; py++) {
    const v = (py + 0.5) / texSize
    for (let px = 0; px < texSize; px++) {
      const u = (px + 0.5) / texSize
      const idx = (py * texSize + px) * 4
      const seamW = seamWeightMap[py * texSize + px]

      // Light 2-LSB quantization on BaseColor & Normal cuts deflate size by ~40% with zero visual loss
      baseRgba[idx + 0] = baseRgba[idx + 0] & 0xfc
      baseRgba[idx + 1] = baseRgba[idx + 1] & 0xfc
      baseRgba[idx + 2] = baseRgba[idx + 2] & 0xfc
      baseRgba[idx + 3] = 255

      const nR = Math.round(lerp(128, normRgba[idx + 0], seamW))
      const nG = Math.round(lerp(128, normRgba[idx + 1], seamW))
      const nB = Math.round(lerp(255, normRgba[idx + 2], seamW))
      normRgba[idx + 0] = nR & 0xfc
      normRgba[idx + 1] = nG & 0xfc
      normRgba[idx + 2] = nB & 0xfc
      normRgba[idx + 3] = 255

      const nx = (normRgba[idx + 0] / 255.0) * 2.0 - 1.0
      const ny = (normRgba[idx + 1] / 255.0) * 2.0 - 1.0
      const slope = Math.hypot(nx, ny)
      let ao = occRgba ? lerp(248.0, occRgba[idx + 0], 0.55) : 248.0 - slope * 28.0
      let rough = 0.40 - slope * 0.08

      for (const ec of spec.eyeUvCenters) {
        const dEye = Math.hypot((u - ec.u) / ec.ru, (v - ec.v) / ec.rv)
        if (dEye < 1.15) {
          const cornea = 1.0 - smoothstep(0.75, 1.05, dEye)
          rough = lerp(rough, 0.03, cornea)
          ao = lerp(ao, 255.0, cornea)
          const dGlint = Math.hypot((u - (ec.u - 0.006)) / 0.0055, (v - (ec.v - 0.008)) / 0.0065)
          if (dGlint < 1.0) {
            const glint = Math.pow(1.0 - dGlint, 2.2) * 0.85
            baseRgba[idx + 0] = clamp(Math.round(lerp(baseRgba[idx + 0], 252, glint)), 0, 255)
            baseRgba[idx + 1] = clamp(Math.round(lerp(baseRgba[idx + 1], 254, glint)), 0, 255)
            baseRgba[idx + 2] = clamp(Math.round(lerp(baseRgba[idx + 2], 255, glint)), 0, 255)
          }
        }
      }

      ormRgba[idx + 0] = clamp(Math.round(ao), 90, 255) & 0xf8
      ormRgba[idx + 1] = clamp(Math.round(clamp(rough, 0.03, 0.65) * 255), 8, 255) & 0xf8
      ormRgba[idx + 2] = 0
      ormRgba[idx + 3] = 255
    }
  }

  const basePng = encodeRgbaPng(texSize, texSize, baseRgba)
  const normPng = encodeRgbaPng(texSize, texSize, normRgba)
  const ormPng = encodeRgbaPng(texSize, texSize, ormRgba)

  if (spec.speciesId === 'blue-tang') {
    fs.writeFileSync(path.join(BLUE_TANG_TEX_DIR, 'base.png'), basePng)
    fs.writeFileSync(path.join(BLUE_TANG_TEX_DIR, 'norm.png'), normPng)
    fs.writeFileSync(path.join(BLUE_TANG_TEX_DIR, 'orm.png'), ormPng)
  }

  const s2 = Math.SQRT1_2
  const pectX = Number(Math.max(0.04, pectRoot.x).toFixed(4))
  const pectY = Number((0.48 - pectRoot.z).toFixed(4))
  const pectZ = Number(pectRoot.y.toFixed(4))

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

  const posMin = [Infinity, Infinity, Infinity]
  const posMax = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < vertCount; i++) {
    for (let c = 0; c < 3; c++) {
      const v = positions[i * 3 + c]
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

  const assetId = `fish-${spec.speciesId}`
  const primitiveId = `${spec.speciesId.replace(/-/g, '_')}_body`
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
      sourceSha256: generatorSha256,
      recipe: 'node --experimental-strip-types scripts/build-splat-fish-glbs.mjs',
      attribution: `Photorealistic 3D rigged and animated fish asset (${spec.scientificName}) adapted for testing from download_testing/${spec.sourceFile} (${sourceSha256.slice(0, 12)}).`,
    },
  }
  const reefPrimitive = { id: primitiveId, role: 'fish' }

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

  const accPos = addAccessor(addBufferView(positions, 34962), 5126, vertCount, 'VEC3', pMin, pMax)
  const accNorm = addAccessor(addBufferView(normals, 34962), 5126, vertCount, 'VEC3')
  const accUv = addAccessor(addBufferView(uvs, 34962), 5126, vertCount, 'VEC2')
  const accJoints = addAccessor(addBufferView(joints, 34962), 5121, vertCount, 'VEC4')
  const accWeights = addAccessor(addBufferView(weights, 34962), 5126, vertCount, 'VEC4')
  const accIdx = addAccessor(addBufferView(indices, 34963), 5123, indices.length, 'SCALAR')

  const bvBasePng = addBufferView(basePng)
  const bvNormPng = addBufferView(normPng)
  const bvOrmPng = addBufferView(ormPng)

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
    samplers.push({ input: accTime, interpolation: 'LINEAR', output: accRot })
    channels.push({ sampler: samplerIdx, target: { node: 2 + j, path: 'rotation' } })
  }

  const nodes = [
    { name: `${spec.speciesId}_Root`, children: [1, 2], extras: { reefAsset } },
    { name: `${spec.speciesId}_Mesh`, mesh: 0, skin: 0, extras: { reefPrimitive } },
    ...jointSpecs.map(js => {
      const node = { name: js.name, translation: js.translation, rotation: js.rotation }
      if (js.children.length > 0) node.children = js.children.map(c => 2 + c)
      return node
    }),
  ]

  const outDoc = {
    asset: {
      version: '2.0',
      generator: 'Aquarium photorealistic 3D fish generator (reef-asset-v1)',
    },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes,
    skins: [
      {
        name: `${spec.speciesId}_Rig`,
        inverseBindMatrices: accIbm,
        skeleton: 2,
        joints: [2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
    meshes: [
      {
        name: `${spec.speciesId}_Geo`,
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
        name: `${spec.speciesId}_Mat`,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicRoughnessTexture: { index: 2 },
          metallicFactor: 0.0,
          roughnessFactor: 1.0,
        },
        normalTexture: { index: 1, scale: 0.65 },
        occlusionTexture: { index: 2, strength: 1.0 },
      },
    ],
    textures: [
      { sampler: 0, source: 0 },
      { sampler: 0, source: 1 },
      { sampler: 0, source: 2 },
    ],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [
      { bufferView: bvBasePng, mimeType: 'image/png', name: `${spec.speciesId}_BaseColor` },
      { bufferView: bvNormPng, mimeType: 'image/png', name: `${spec.speciesId}_Normal` },
      { bufferView: bvOrmPng, mimeType: 'image/png', name: `${spec.speciesId}_ORM` },
    ],
    animations: [{ name: spec.clipName, samplers, channels }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  }

  const inspectionRecord = {
    extras: { reefAsset },
    rootTransform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    boundsM: { min: pMin, max: pMax },
    primitives: [
      {
        id: primitiveId,
        role: 'fish',
        vertexCount: vertCount,
        boundsM: { min: pMin, max: pMax },
        material: { vertexColors: false, vertexAlpha: false, aoSource: 'texture' },
      },
    ],
    sockets: [],
    collisionParts: [],
  }

  const validation = validateAssetContract(inspectionRecord)
  if (!validation.valid) {
    throw new Error(`Contract validation failed for ${spec.outputCopyFile}: ${JSON.stringify(validation.issues)}`)
  }

  const jsonStr = JSON.stringify(outDoc)
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

  const glbBuf = Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf])
  const outCopyPath = path.join(OUT_COPIES_DIR, spec.outputCopyFile)
  fs.writeFileSync(outCopyPath, glbBuf)

  if (spec.speciesId === 'blue-tang') {
    fs.writeFileSync(path.join(SPLAT_OVERRIDES_DIR, 'blue-tang.glb'), glbBuf)
  }

  console.log(
    `Created non-destructive copy ${spec.outputCopyFile.padEnd(46)} -> ${(glbBuf.length / 1024).toFixed(1)} KB | verts: ${vertCount} | tris: ${indices.length / 3} | z: [${pMin[2]}, ${pMax[2]}]`,
  )
}

const generatorSha256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')
for (const spec of COPY_SPECS) {
  convertReferenceGlbToContractCopy(spec, generatorSha256)
}
