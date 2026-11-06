/**
 * Code-Driven Procedural 3D Reef Fish Generator (Node.js port of `src/rendering/modeling/build_*.py`)
 *
 * Uses the anatomical silhouettes, fin proportions, and color palettes extracted from the
 * Gaussian Splat reference models and `docs/reef-fish-roster.md` to build true 3D anatomical,
 * watertight, rigged & animated `.glb` fish models for the 9 species not yet covered by
 * `src/rendering/assets/fish/fish-*.glb`:
 *   - blue-green-chromis (Chromis viridis)
 *   - firefish (Nemateleotris magnifica)
 *   - yellow-watchman-goby (Cryptocentrus cinctus)
 *   - tailspot-blenny (Ecsenius stigmatura)
 *   - six-line-wrasse (Pseudocheilinus hexataenia)
 *   - mccoskers-flasher-wrasse (Paracheilinus mccoskeri)
 *   - lyretail-anthias (Pseudanthias squamipinnis)
 *   - flame-angelfish (Centropyge loricula)
 *   - copperband-butterflyfish (Chelmon rostratus)
 *
 * Every generated model has:
 *   - Canonical orientation: +Y dorsal (UP), -Y ventral (DOWN), +Z snout (FORWARD), -Z tail (BACK),
 *     normalized to exact swim-axis Z bounds [-1.0, +1.0] (2.0 units total length).
 *   - 64-ring x 40-segment sculpted 3D body loft with mouth indent, 3D orbital rims, and gill opercula.
 *   - 3D flush convex cornea eyes (Left & Right) with radial iris, pupil, and corneal specular highlight.
 *   - Separate double-sided scalloped rayed 3D dorsal, anal, caudal, pelvic, and articulated pectoral fins.
 *   - 512x512 procedural PBR BaseColor atlas (Body UV island, Dorsal/Anal/Pelvic Fin UV island,
 *     Caudal/Pectoral Fin UV island, and Polar Cornea Eye UV island).
 *   - 8-joint armature (`spine_0..spine_5`, `pectoral_L`, `pectoral_R`) + 49-frame swim animation clip.
 */

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const OUT_DIR = '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/assets/splat-fish'
const DONOR_GLB = '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/proof/candidate-real-clown.glb'

const clamp = (v, lo = 0.0, hi = 1.0) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t
const lerpColor = (c0, c1, t) => [
  lerp(c0[0], c1[0], t),
  lerp(c0[1], c1[1], t),
  lerp(c0[2], c1[2], t),
]
function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1.0 : 0.0
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
  return t * t * (3.0 - 2.0 * t)
}

function hash2(ix, iy) {
  let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) >>> 0
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295.0
}
function valueNoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const ux = fx * fx * (3.0 - 2.0 * fx)
  const uy = fy * fy * (3.0 - 2.0 * fy)
  return lerp(
    lerp(hash2(ix, iy), hash2(ix + 1, iy), ux),
    lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux),
    uy,
  )
}
function fbm2(x, y) {
  return (
    0.55 * valueNoise2(x, y) +
    0.30 * valueNoise2(x * 2.1 + 3.7, y * 2.1 + 1.9) +
    0.15 * valueNoise2(x * 4.3 + 8.1, y * 4.3 + 5.3)
  )
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

/**
 * Species anatomical & procedural texture definitions calibrated from the splat silhouettes
 * and `docs/reef-fish-roster.md`.
 * Parameter `s` runs from `0.0` (snout at `+Z`) to `1.0` (caudal peduncle base before tail fin).
 */
const SPECIES_SPECS = [
  {
    id: 'blue-green-chromis',
    zSnout: 1.0,
    zPeduncle: -0.52,
    maxDorsalY: 0.34,
    maxVentralY: 0.32,
    maxHalfW: 0.145,
    peakS: 0.36,
    eyeS: 0.13,
    eyeYFrac: 0.22,
    eyeRadius: 0.052,
    dorsal: { sStart: 0.26, sEnd: 0.84, height: 0.14, sweep: 0.12, archPow: 0.6 },
    anal: { sStart: 0.50, sEnd: 0.85, height: 0.12, sweep: 0.10 },
    caudal: { length: 0.48, spreadY: 0.38, forkDepth: 0.52, lobeSharpness: 1.6 }, // Deeply forked swallowtail
    pectoral: { s: 0.25, y: -0.06, length: 0.24, spread: 0.16 },
    pelvic: { s: 0.34, length: 0.14 },
    irisColor: [0.72, 0.92, 0.98],
    evalBodyColor(uBody, yNorm, mottle) {
      // Iridescent aquamarine-turquoise dorsum blending to shimmering silver-cyan belly
      const cTop = [0.06, 0.68, 0.78]
      const cMid = [0.22, 0.86, 0.88]
      const cBelly = [0.76, 0.94, 0.98]
      let col = yNorm > 0.48
        ? lerpColor(cMid, cTop, smoothstep(0.48, 0.92, yNorm))
        : lerpColor(cBelly, cMid, smoothstep(0.05, 0.48, yNorm))
      col = lerpColor(col, [0.35, 0.95, 0.92], 0.14 * mottle)
      return col
    },
    evalFinColor(isCaudal, sRay, tRad) {
      const base = [0.28, 0.84, 0.88]
      const edge = [0.08, 0.38, 0.52]
      const lobeBorder = isCaudal ? 1.0 - smoothstep(0.08, 0.20, Math.min(sRay, 1.0 - sRay)) : 0.0
      return lerpColor(base, edge, Math.max(lobeBorder * 0.7, tRad * 0.35))
    },
  },
  {
    id: 'firefish',
    zSnout: 1.0,
    zPeduncle: -0.60,
    maxDorsalY: 0.19,
    maxVentralY: 0.18,
    maxHalfW: 0.115,
    peakS: 0.28,
    eyeS: 0.10,
    eyeYFrac: 0.25,
    eyeRadius: 0.048,
    // Tall iconic first-dorsal pennant + long second dorsal
    dorsalPennant: { sStart: 0.22, sEnd: 0.36, height: 0.52, sweep: 0.22 },
    dorsal: { sStart: 0.40, sEnd: 0.88, height: 0.14, sweep: 0.10, archPow: 0.55 },
    anal: { sStart: 0.44, sEnd: 0.88, height: 0.13, sweep: 0.10 },
    caudal: { length: 0.40, spreadY: 0.21, forkDepth: 0.08, lobeSharpness: 1.1 },
    pectoral: { s: 0.21, y: -0.03, length: 0.20, spread: 0.13 },
    pelvic: { s: 0.26, length: 0.22 },
    irisColor: [0.85, 0.82, 0.32],
    evalBodyColor(uBody, yNorm, mottle) {
      // Pearlescent white-yellow head/forebody grading into fiery orange-red posterior
      const cFront = [0.95, 0.94, 0.90]
      const cHeadYellow = [0.98, 0.88, 0.42]
      const cMidOrange = [0.98, 0.42, 0.12]
      const cRearRed = [0.82, 0.10, 0.06]
      let col = lerpColor(cFront, cMidOrange, smoothstep(0.32, 0.58, uBody))
      col = lerpColor(col, cRearRed, smoothstep(0.55, 0.85, uBody))
      if (uBody < 0.22 && yNorm > 0.55) {
        col = lerpColor(col, cHeadYellow, smoothstep(0.22, 0.05, uBody) * smoothstep(0.55, 0.85, yNorm))
      }
      return lerpColor(col, [1, 1, 1], 0.06 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      const cOrangeRed = [0.92, 0.18, 0.06]
      const cBlackEdge = [0.06, 0.05, 0.08]
      const darkRim = smoothstep(0.72, 0.95, tRad)
      return lerpColor(cOrangeRed, cBlackEdge, darkRim * 0.82)
    },
  },
  {
    id: 'yellow-watchman-goby',
    zSnout: 1.0,
    zPeduncle: -0.58,
    maxDorsalY: 0.22,
    maxVentralY: 0.19,
    maxHalfW: 0.145,
    peakS: 0.22,
    eyeS: 0.11,
    eyeYFrac: 0.58, // High-set benthic watchman eyes
    eyeRadius: 0.050,
    dorsalPennant: { sStart: 0.22, sEnd: 0.42, height: 0.22, sweep: 0.08 },
    dorsal: { sStart: 0.45, sEnd: 0.88, height: 0.15, sweep: 0.09, archPow: 0.5 },
    anal: { sStart: 0.48, sEnd: 0.86, height: 0.13, sweep: 0.08 },
    caudal: { length: 0.42, spreadY: 0.23, forkDepth: -0.18, lobeSharpness: 1.0 }, // Rounded paddle tail
    pectoral: { s: 0.23, y: -0.04, length: 0.23, spread: 0.16 },
    pelvic: { s: 0.26, length: 0.17 },
    irisColor: [0.75, 0.88, 0.96],
    evalBodyColor(uBody, yNorm, mottle) {
      // Vivid sulphur-gold body with faint dusky saddle bars and iridescent ice-blue cheek/flank spots
      const cGold = [0.96, 0.80, 0.08]
      const cLemon = [0.99, 0.90, 0.24]
      const cSaddle = [0.74, 0.56, 0.06]
      let col = lerpColor(cLemon, cGold, smoothstep(0.15, 0.75, yNorm))
      const saddleWave = Math.max(0, Math.sin(uBody * Math.PI * 7.5)) * smoothstep(0.25, 0.85, uBody)
      col = lerpColor(col, cSaddle, saddleWave * 0.28)
      // Iridescent pale-blue ocellated spots on cheek and upper flank
      const sx = uBody * 18.0, sy = yNorm * 10.0
      const fx = sx - Math.floor(sx) - 0.5, fy = sy - Math.floor(sy) - 0.5
      const spotR = Math.hypot(fx, fy)
      const spotHash = hash2(Math.floor(sx), Math.floor(sy))
      if (spotHash > 0.62 && (uBody < 0.35 || yNorm > 0.45)) {
        const spotMask = 1.0 - smoothstep(0.14, 0.24, spotR)
        col = lerpColor(col, [0.58, 0.88, 0.99], spotMask * 0.85)
      }
      return lerpColor(col, cLemon, 0.08 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      const cGold = [0.96, 0.82, 0.12]
      const cBlueSpot = [0.55, 0.86, 0.98]
      const spot = 0.5 + 0.5 * Math.sin(sRay * 24.0) * Math.cos(tRad * 14.0)
      return lerpColor(cGold, cBlueSpot, smoothstep(0.75, 0.92, spot) * 0.45)
    },
  },
  {
    id: 'tailspot-blenny',
    zSnout: 1.0,
    zPeduncle: -0.60,
    maxDorsalY: 0.21,
    maxVentralY: 0.19,
    maxHalfW: 0.140,
    peakS: 0.24,
    eyeS: 0.10,
    eyeYFrac: 0.52,
    eyeRadius: 0.048,
    dorsal: { sStart: 0.18, sEnd: 0.88, height: 0.15, sweep: 0.09, archPow: 0.45 }, // Continuous combtooth dorsal
    anal: { sStart: 0.46, sEnd: 0.86, height: 0.12, sweep: 0.08 },
    caudal: { length: 0.40, spreadY: 0.22, forkDepth: -0.05, lobeSharpness: 1.0 },
    pectoral: { s: 0.22, y: -0.04, length: 0.21, spread: 0.15 },
    pelvic: { s: 0.20, length: 0.13 },
    irisColor: [0.98, 0.52, 0.14],
    evalBodyColor(uBody, yNorm, mottle) {
      // Slate-blue/indigo head -> warm ochre-copper midbody -> dark tailspot with bright orange-gold rim at peduncle
      const cHeadBlue = [0.18, 0.44, 0.68]
      const cOchre = [0.84, 0.54, 0.22]
      const cRearAmber = [0.76, 0.42, 0.16]
      let col = lerpColor(cHeadBlue, cOchre, smoothstep(0.18, 0.42, uBody))
      col = lerpColor(col, cRearAmber, smoothstep(0.55, 0.85, uBody))
      // Bright gold-orange cheek stripe below eye
      if (uBody < 0.26 && Math.abs(yNorm - 0.36) < 0.07) {
        const bar = 1.0 - smoothstep(0.02, 0.07, Math.abs(yNorm - 0.36))
        col = lerpColor(col, [0.98, 0.58, 0.10], bar * 0.88)
      }
      // Iconic black tail-base ocellus spot at uBody ~ 0.90, yNorm ~ 0.50 with bright gold halo
      const dSpot = Math.hypot((uBody - 0.89) / 0.065, (yNorm - 0.50) / 0.16)
      const halo = smoothstep(0.65, 0.90, dSpot) * (1.0 - smoothstep(0.95, 1.35, dSpot))
      const core = 1.0 - smoothstep(0.55, 0.82, dSpot)
      col = lerpColor(col, [0.98, 0.76, 0.22], halo * 0.85)
      col = lerpColor(col, [0.04, 0.04, 0.06], core * 0.95)
      return lerpColor(col, [0.92, 0.72, 0.44], 0.08 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      return lerpColor([0.72, 0.48, 0.24], [0.24, 0.38, 0.54], tRad * 0.6)
    },
  },
  {
    id: 'six-line-wrasse',
    zSnout: 1.0,
    zPeduncle: -0.58,
    maxDorsalY: 0.29,
    maxVentralY: 0.27,
    maxHalfW: 0.145,
    peakS: 0.38,
    eyeS: 0.13,
    eyeYFrac: 0.18,
    eyeRadius: 0.046,
    dorsal: { sStart: 0.24, sEnd: 0.86, height: 0.13, sweep: 0.09, archPow: 0.5 },
    anal: { sStart: 0.48, sEnd: 0.85, height: 0.12, sweep: 0.08 },
    caudal: { length: 0.42, spreadY: 0.26, forkDepth: -0.10, lobeSharpness: 1.0 },
    pectoral: { s: 0.25, y: -0.05, length: 0.20, spread: 0.14 },
    pelvic: { s: 0.32, length: 0.13 },
    irisColor: [0.98, 0.32, 0.08], // Red-orange iris with two white horizontal lines
    evalBodyColor(uBody, yNorm, mottle) {
      // Violet-blue base with 6 vivid horizontal orange-gold stripes along the flank
      const cBlue = [0.16, 0.28, 0.76]
      const cOrange = [0.96, 0.48, 0.10]
      const cBelly = [0.42, 0.52, 0.88]
      let col = lerpColor(cBelly, cBlue, smoothstep(0.05, 0.30, yNorm))
      if (yNorm >= 0.20 && yNorm <= 0.86 && uBody <= 0.90) {
        const stripePhase = ((yNorm - 0.20) / 0.66) * 6.0 * Math.PI * 2.0
        const stripeMask = smoothstep(-0.2, 0.4, Math.sin(stripePhase)) * smoothstep(0.04, 0.14, uBody)
        col = lerpColor(col, cOrange, stripeMask * 0.90)
      }
      // Ocellus dark spot at upper caudal peduncle / rear dorsal
      const dSpot = Math.hypot((uBody - 0.84) / 0.05, (yNorm - 0.78) / 0.12)
      if (dSpot < 1.2) {
        col = lerpColor(col, [0.05, 0.06, 0.12], (1.0 - smoothstep(0.5, 1.0, dSpot)) * 0.85)
      }
      return lerpColor(col, [1, 1, 1], 0.05 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      // Characteristic emerald-green caudal fin; orange-violet dorsal/anal with electric blue rim
      if (isCaudal) {
        return lerpColor([0.14, 0.76, 0.34], [0.28, 0.88, 0.48], 1.0 - tRad * 0.5)
      }
      const rim = smoothstep(0.80, 0.96, tRad)
      return lerpColor([0.88, 0.42, 0.16], [0.25, 0.68, 0.98], rim * 0.85)
    },
  },
  {
    id: 'mccoskers-flasher-wrasse',
    zSnout: 1.0,
    zPeduncle: -0.56,
    maxDorsalY: 0.27,
    maxVentralY: 0.25,
    maxHalfW: 0.135,
    peakS: 0.34,
    eyeS: 0.12,
    eyeYFrac: 0.20,
    eyeRadius: 0.046,
    // Tall flared dorsal sail with extended anterior filament
    dorsalPennant: { sStart: 0.22, sEnd: 0.38, height: 0.34, sweep: 0.16 },
    dorsal: { sStart: 0.36, sEnd: 0.88, height: 0.23, sweep: 0.14, archPow: 0.52 },
    anal: { sStart: 0.44, sEnd: 0.88, height: 0.20, sweep: 0.13 },
    caudal: { length: 0.44, spreadY: 0.28, forkDepth: -0.12, lobeSharpness: 1.0 },
    pectoral: { s: 0.24, y: -0.04, length: 0.22, spread: 0.14 },
    pelvic: { s: 0.30, length: 0.20 },
    irisColor: [0.98, 0.42, 0.12],
    evalBodyColor(uBody, yNorm, mottle) {
      // Luminous coral-orange/golden-peach dorsum, pearlescent pink-white belly, and 3 electric neon-blue longitudinal lines
      const cDorsal = [0.98, 0.46, 0.16]
      const cMid = [0.96, 0.64, 0.34]
      const cBelly = [0.96, 0.88, 0.90]
      let col = yNorm > 0.42
        ? lerpColor(cMid, cDorsal, smoothstep(0.42, 0.88, yNorm))
        : lerpColor(cBelly, cMid, smoothstep(0.08, 0.42, yNorm))
      const blueLines = [0.34, 0.54, 0.74]
      for (const ly of blueLines) {
        const dLine = Math.abs(yNorm - ly)
        if (dLine < 0.038 && uBody > 0.10) {
          const m = (1.0 - smoothstep(0.010, 0.036, dLine)) * smoothstep(0.10, 0.22, uBody)
          col = lerpColor(col, [0.16, 0.56, 0.99], m * 0.92)
        }
      }
      return lerpColor(col, [1, 0.9, 0.7], 0.06 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      // Crimson-magenta flared dorsal/anal with electric neon-blue outer margin
      const cRed = [0.90, 0.14, 0.24]
      const cGold = [0.98, 0.72, 0.20]
      const cNeonBlue = [0.18, 0.68, 0.99]
      let col = lerpColor(cGold, cRed, smoothstep(0.15, 0.65, tRad))
      const rim = smoothstep(0.78, 0.94, tRad)
      return lerpColor(col, cNeonBlue, rim * 0.90)
    },
  },
  {
    id: 'lyretail-anthias',
    zSnout: 1.0,
    zPeduncle: -0.50,
    maxDorsalY: 0.35,
    maxVentralY: 0.33,
    maxHalfW: 0.145,
    peakS: 0.35,
    eyeS: 0.12,
    eyeYFrac: 0.22,
    eyeRadius: 0.050,
    dorsalPennant: { sStart: 0.24, sEnd: 0.36, height: 0.28, sweep: 0.14 },
    dorsal: { sStart: 0.34, sEnd: 0.85, height: 0.16, sweep: 0.11, archPow: 0.55 },
    anal: { sStart: 0.48, sEnd: 0.84, height: 0.16, sweep: 0.11 },
    caudal: { length: 0.50, spreadY: 0.42, forkDepth: 0.58, lobeSharpness: 1.8 }, // Deep lunate lyretail streamers
    pectoral: { s: 0.25, y: -0.05, length: 0.24, spread: 0.15 },
    pelvic: { s: 0.32, length: 0.22 },
    irisColor: [0.48, 0.28, 0.88],
    evalBodyColor(uBody, yNorm, mottle) {
      // Vibrant coral-orange & peach-gold body with magenta-pink scale shimmer and diagonal violet cheek stripe below eye
      const cOrangeGold = [0.98, 0.52, 0.18]
      const cMagenta = [0.92, 0.30, 0.56]
      const cBelly = [0.98, 0.82, 0.74]
      let col = yNorm > 0.38
        ? lerpColor(cMagenta, cOrangeGold, smoothstep(0.38, 0.85, yNorm))
        : lerpColor(cBelly, cMagenta, smoothstep(0.08, 0.38, yNorm))
      // Diagonal violet-magenta stripe sweeping from eye (u=0.12, y=0.55) to pectoral base (u=0.28, y=0.32)
      const stripeY = 0.55 - (uBody - 0.12) * 1.4
      if (uBody >= 0.08 && uBody <= 0.30 && Math.abs(yNorm - stripeY) < 0.055) {
        const sm = 1.0 - smoothstep(0.015, 0.055, Math.abs(yNorm - stripeY))
        col = lerpColor(col, [0.68, 0.18, 0.86], sm * 0.90)
      }
      return lerpColor(col, [1.0, 0.85, 0.4], 0.08 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      const cBase = [0.96, 0.46, 0.42]
      const cTip = [0.98, 0.78, 0.18]
      const cVioletRim = [0.76, 0.24, 0.88]
      const col = lerpColor(cBase, cTip, tRad * 0.75)
      return lerpColor(col, cVioletRim, smoothstep(0.84, 0.96, tRad) * 0.65)
    },
  },
  {
    id: 'flame-angelfish',
    zSnout: 1.0,
    zPeduncle: -0.58,
    maxDorsalY: 0.48,
    maxVentralY: 0.46,
    maxHalfW: 0.135,
    peakS: 0.42,
    eyeS: 0.13,
    eyeYFrac: 0.18,
    eyeRadius: 0.048,
    dorsal: { sStart: 0.20, sEnd: 0.88, height: 0.22, sweep: 0.16, archPow: 0.52 },
    anal: { sStart: 0.42, sEnd: 0.88, height: 0.21, sweep: 0.16 },
    caudal: { length: 0.42, spreadY: 0.30, forkDepth: -0.10, lobeSharpness: 1.0 },
    pectoral: { s: 0.26, y: -0.06, length: 0.23, spread: 0.15 },
    pelvic: { s: 0.32, length: 0.20 },
    irisColor: [0.95, 0.45, 0.10],
    evalBodyColor(uBody, yNorm, mottle) {
      // Brilliant scarlet-vermilion body, golden-orange mid-flank glow, and 5 bold vertical jet-black bars
      const cScarlet = [0.96, 0.16, 0.04]
      const cGoldOrange = [0.99, 0.48, 0.06]
      const cBlack = [0.02, 0.02, 0.04]
      const midGlow = (1.0 - Math.abs(yNorm - 0.46) * 1.8) * smoothstep(0.22, 0.45, uBody) * (1.0 - smoothstep(0.68, 0.88, uBody))
      let col = lerpColor(cScarlet, cGoldOrange, clamp(midGlow, 0, 1) * 0.75)
      // 5 vertical black bars across midbody (uBody in [0.28, 0.78])
      const barCenters = [0.31, 0.42, 0.53, 0.64, 0.74]
      for (const bc of barCenters) {
        const wobble = 0.012 * Math.sin(yNorm * Math.PI * 2.0)
        const du = Math.abs(uBody + wobble - bc)
        const vertEnv = smoothstep(0.12, 0.28, yNorm) * (1.0 - smoothstep(0.84, 0.96, yNorm))
        if (du < 0.036) {
          const bm = (1.0 - smoothstep(0.014, 0.034, du)) * vertEnv
          col = lerpColor(col, cBlack, bm * 0.95)
        }
      }
      return lerpColor(col, cGoldOrange, 0.06 * mottle)
    },
    evalFinColor(isCaudal, sRay, tRad) {
      if (isCaudal) {
        return lerpColor([0.96, 0.26, 0.06], [0.98, 0.68, 0.14], tRad * 0.7)
      }
      // Scarlet dorsal/anal with dark purple-black posterior banding and electric neon-violet/blue outer margin
      const cScarlet = [0.94, 0.16, 0.05]
      const cDarkBand = [0.05, 0.03, 0.10]
      const cElectricBlue = [0.22, 0.48, 0.99]
      let col = cScarlet
      if (sRay > 0.55) {
        const stripe = 0.5 + 0.5 * Math.sin(sRay * 36.0)
        col = lerpColor(col, cDarkBand, smoothstep(0.55, 0.85, sRay) * stripe * 0.80)
      }
      const rim = smoothstep(0.82, 0.94, tRad)
      return lerpColor(col, cElectricBlue, rim * 0.95)
    },
  },
  {
    id: 'copperband-butterflyfish',
    zSnout: 1.0,
    zPeduncle: -0.62,
    maxDorsalY: 0.56,
    maxVentralY: 0.52,
    maxHalfW: 0.115,
    peakS: 0.46,
    snoutLenS: 0.20, // Elongated forceps-like Chelmon rostratus snout!
    eyeS: 0.22,
    eyeYFrac: 0.16,
    eyeRadius: 0.046,
    dorsal: { sStart: 0.26, sEnd: 0.88, height: 0.26, sweep: 0.12, archPow: 0.55 },
    anal: { sStart: 0.44, sEnd: 0.88, height: 0.24, sweep: 0.12 },
    caudal: { length: 0.38, spreadY: 0.24, forkDepth: -0.04, lobeSharpness: 1.0 },
    pectoral: { s: 0.30, y: -0.08, length: 0.22, spread: 0.14 },
    pelvic: { s: 0.36, length: 0.22 },
    irisColor: [0.88, 0.84, 0.72],
    evalBodyColor(uBody, yNorm, mottle) {
      // Pearlescent silver-white disc crossed by 4 black-edged copper-gold vertical bands + posterior dorsal ocellus
      const cSilver = [0.94, 0.95, 0.97]
      const cCopper = [0.88, 0.52, 0.10]
      const cBlack = [0.04, 0.04, 0.06]
      let col = lerpColor(cSilver, [0.86, 0.89, 0.94], 0.12 * mottle)
      // Snout tip orange-black accent
      if (uBody < 0.16) {
        col = lerpColor(col, cCopper, smoothstep(0.16, 0.02, uBody) * 0.65)
      }
      // 4 vertical copper bands: eye band (0.22), anterior trunk (0.40), mid-trunk (0.60), posterior trunk (0.80)
      const bands = [
        { u: 0.22, w: 0.032 },
        { u: 0.40, w: 0.048 },
        { u: 0.60, w: 0.052 },
        { u: 0.80, w: 0.056 },
      ]
      for (const b of bands) {
        const du = Math.abs(uBody - b.u)
        if (du < b.w + 0.018) {
          const inCopper = 1.0 - smoothstep(b.w - 0.010, b.w + 0.004, du)
          const inBlackRim = smoothstep(b.w - 0.014, b.w - 0.002, du) * (1.0 - smoothstep(b.w + 0.004, b.w + 0.016, du))
          col = lerpColor(col, cCopper, inCopper * 0.94)
          col = lerpColor(col, cBlack, inBlackRim * 0.85)
        }
      }
      // Iconic black false eyespot with white-blue halo on upper posterior body/dorsal base (u=0.79, y=0.78)
      const dEyeSpot = Math.hypot((uBody - 0.79) / 0.055, (yNorm - 0.78) / 0.12)
      if (dEyeSpot < 1.35) {
        const halo = smoothstep(0.65, 0.90, dEyeSpot) * (1.0 - smoothstep(0.95, 1.30, dEyeSpot))
        const core = 1.0 - smoothstep(0.55, 0.80, dEyeSpot)
        col = lerpColor(col, [0.85, 0.95, 1.0], halo * 0.90)
        col = lerpColor(col, cBlack, core * 0.96)
      }
      return col
    },
    evalFinColor(isCaudal, sRay, tRad) {
      if (isCaudal) {
        const baseBand = 1.0 - smoothstep(0.12, 0.26, tRad)
        return lerpColor([0.90, 0.93, 0.97], [0.06, 0.06, 0.08], baseBand * 0.85)
      }
      // Copper-gold dorsal/anal with white-blue submarginal line and false eyespot on posterior dorsal
      const cCopper = [0.88, 0.54, 0.12]
      const cIce = [0.82, 0.94, 1.0]
      let col = lerpColor(cCopper, cIce, smoothstep(0.84, 0.96, tRad) * 0.75)
      const dSpot = Math.hypot((sRay - 0.78) / 0.12, (tRad - 0.42) / 0.28)
      if (dSpot < 1.2) {
        const halo = smoothstep(0.60, 0.85, dSpot) * (1.0 - smoothstep(0.90, 1.18, dSpot))
        const core = 1.0 - smoothstep(0.50, 0.78, dSpot)
        col = lerpColor(col, cIce, halo * 0.90)
        col = lerpColor(col, [0.03, 0.03, 0.05], core * 0.96)
      }
      return col
    },
  },
]

function evaluateProfile(spec, s) {
  const z = lerp(spec.zSnout, spec.zPeduncle, s)
  const snoutS = spec.snoutLenS || 0.0

  let envDorsal, envVentral
  if (snoutS > 0 && s < snoutS) {
    // Elongated tubular forceps snout (Copperband butterflyfish)
    const u = s / snoutS
    const tube = 0.028 + 0.095 * Math.pow(u, 2.2)
    envDorsal = spec.maxDorsalY * tube
    envVentral = -spec.maxVentralY * tube
  } else {
    const sEff = snoutS > 0 ? (s - snoutS) / (1.0 - snoutS) : s
    const peak = snoutS > 0 ? (spec.peakS - snoutS) / (1.0 - snoutS) : spec.peakS
    if (sEff < peak) {
      const u = sEff / peak
      envDorsal = spec.maxDorsalY * Math.pow(Math.sin(u * Math.PI * 0.5), 0.62)
      envVentral = -spec.maxVentralY * Math.pow(Math.sin(u * Math.PI * 0.5), 0.64)
    } else if (sEff < 0.86) {
      const u = (sEff - peak) / (0.86 - peak)
      envDorsal = lerp(spec.maxDorsalY, spec.maxDorsalY * 0.25, smoothstep(0.0, 1.0, Math.pow(u, 1.1)))
      envVentral = lerp(-spec.maxVentralY, -spec.maxVentralY * 0.25, smoothstep(0.0, 1.0, Math.pow(u, 1.1)))
    } else {
      const u = (sEff - 0.86) / 0.14
      envDorsal = lerp(spec.maxDorsalY * 0.25, spec.maxDorsalY * 0.16, smoothstep(0.0, 1.0, u))
      envVentral = lerp(-spec.maxVentralY * 0.25, -spec.maxVentralY * 0.16, smoothstep(0.0, 1.0, u))
    }
    if (snoutS > 0) {
      const baseTube = 0.123
      envDorsal = Math.max(envDorsal, spec.maxDorsalY * baseTube * (1.0 - sEff))
      envVentral = Math.min(envVentral, -spec.maxVentralY * baseTube * (1.0 - sEff))
    }
  }

  let halfW
  if (s < 0.28) {
    halfW = spec.maxHalfW * Math.pow(Math.sin((s / 0.28) * Math.PI * 0.5), 0.55)
  } else if (s < 0.85) {
    halfW = lerp(spec.maxHalfW, spec.maxHalfW * 0.26, smoothstep(0.0, 1.0, (s - 0.28) / 0.57))
  } else {
    halfW = lerp(spec.maxHalfW * 0.26, 0.004, smoothstep(0.0, 1.0, (s - 0.85) / 0.15))
  }

  return { z, yTop: envDorsal, yBot: envVentral, halfW }
}

/**
 * Generates the 512x512 procedural PBR BaseColor texture atlas matching the 4-island UV layout of `build_*.py`:
 *   - Body UV island:                 u in [0.02, 0.98], v in [0.04, 0.60]
 *   - Dorsal/Anal/Pelvic Fin island:  u in [0.02, 0.44], v in [0.66, 0.96]
 *   - Caudal/Pectoral Fin island:     u in [0.46, 0.78], v in [0.66, 0.96]
 *   - Eye Cornea UV island:           polar disc around (0.90, 0.83) with radius 0.075
 *
 * Note on glTF UV convention: in glTF, v=0 is row 0 of the PNG and v=1 is row (size-1) of the PNG,
 * so py = 0 corresponds to v = 0.0 and py = size - 1 corresponds to v = 1.0!
 */
function buildSpeciesTexturePng(spec, size = 512) {
  const rgba = new Uint8Array(size * size * 4)

  for (let py = 0; py < size; py++) {
    const v = (py + 0.5) / size
    const rowOff = py * size * 4
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size
      const idx = rowOff + px * 4

      let r = 0.5, g = 0.5, b = 0.5

      if (v <= 0.63) {
        // BODY UV ISLAND: u_body in [0, 1] (0=snout, 1=peduncle), y_norm in [0, 1] (0=ventral -Y, 1=dorsal +Y)
        const uBody = clamp((u - 0.02) / 0.96, 0.0, 1.0)
        const yNorm = clamp((v - 0.04) / 0.56, 0.0, 1.0)
        const mottle = fbm2(uBody * 14.0, yNorm * 14.0)
        let col = spec.evalBodyColor(uBody, yNorm, mottle)

        // Subtle diamond micro-scale lattice across trunk
        const scaleEnv = smoothstep(0.18, 0.30, uBody) * (1.0 - 0.35 * smoothstep(0.86, 0.98, uBody))
        const su = uBody * 68.0
        const sv = yNorm * 38.0 + (Math.floor(su) % 2 === 1 ? 0.5 : 0.0)
        const fu = su - Math.floor(su) - 0.5
        const fv = sv - Math.floor(sv) - 0.5
        const scaleEdge = smoothstep(0.36, 0.52, Math.hypot(fu, fv)) * scaleEnv
        col = lerpColor(col, [col[0] * 0.85, col[1] * 0.88, col[2] * 0.92], scaleEdge * 0.16)

        // Subtle ventral countershading & dorsal highlight
        const dorsalSheen = smoothstep(0.75, 0.98, yNorm) * 0.08
        col = [col[0] + dorsalSheen, col[1] + dorsalSheen, col[2] + dorsalSheen]
        r = col[0]; g = col[1]; b = col[2]
      } else if (u >= 0.80 && v >= 0.64) {
        // EYE CORNEA UV ISLAND around (0.90, 0.83)
        const du = (u - 0.90) / 0.075
        const dv = (v - 0.83) / 0.075
        const rEye = Math.hypot(du, dv)
        const ang = Math.atan2(dv, du)
        const pupilM = 1.0 - smoothstep(0.36, 0.42, rEye)
        const irisM = smoothstep(0.36, 0.42, rEye) * (1.0 - smoothstep(0.76, 0.86, rEye))
        const fiber = 0.5 + 0.5 * Math.sin(ang * 24.0)
        const irisDark = [spec.irisColor[0] * 0.55, spec.irisColor[1] * 0.55, spec.irisColor[2] * 0.55]
        const irisCol = lerpColor(irisDark, spec.irisColor, fiber * 0.65 + 0.35 * (1.0 - rEye))
        let col = lerpColor([0.04, 0.05, 0.08], irisCol, irisM)
        col = lerpColor(col, [0.01, 0.01, 0.015], pupilM)
        const specD = Math.hypot(du + 0.14, dv - 0.16)
        const specM = 1.0 - smoothstep(0.03, 0.11, specD)
        col = lerpColor(col, [1.0, 0.99, 0.97], specM * 0.90)
        r = col[0]; g = col[1]; b = col[2]
      } else if (u <= 0.45) {
        // DORSAL / ANAL / PELVIC FIN UV ISLAND
        const sRay = clamp((u - 0.02) / 0.42, 0.0, 1.0)
        const tRad = clamp((v - 0.66) / 0.30, 0.0, 1.0)
        const rayRidge = 0.5 + 0.5 * Math.cos(sRay * 26.0 * Math.PI * 2.0)
        const baseCol = spec.evalFinColor(false, sRay, tRad)
        const darkCol = [baseCol[0] * 0.78, baseCol[1] * 0.78, baseCol[2] * 0.82]
        const col = lerpColor(darkCol, baseCol, 0.45 + 0.55 * rayRidge)
        r = col[0]; g = col[1]; b = col[2]
      } else {
        // CAUDAL / PECTORAL FIN UV ISLAND
        const sRay = clamp((u - 0.46) / 0.32, 0.0, 1.0)
        const tRad = clamp((v - 0.66) / 0.30, 0.0, 1.0)
        const rayRidge = 0.5 + 0.5 * Math.cos(sRay * 22.0 * Math.PI * 2.0)
        const baseCol = spec.evalFinColor(true, sRay, tRad)
        const darkCol = [baseCol[0] * 0.78, baseCol[1] * 0.78, baseCol[2] * 0.82]
        const col = lerpColor(darkCol, baseCol, 0.45 + 0.55 * rayRidge)
        r = col[0]; g = col[1]; b = col[2]
      }

      rgba[idx + 0] = clamp(Math.round(r * 255), 0, 255)
      rgba[idx + 1] = clamp(Math.round(g * 255), 0, 255)
      rgba[idx + 2] = clamp(Math.round(b * 255), 0, 255)
      rgba[idx + 3] = 255
    }
  }

  return encodeRgbaPng(size, size, rgba)
}

/**
 * Builds the complete code-driven 3D anatomical mesh (body + 3D cornea eyes + double-sided rayed fins)
 * in Three.js / glTF bind space (+Y dorsal UP, -Y ventral DOWN, +Z snout FORWARD, -Z tail BACK).
 */
function buildCodeDrivenMesh(spec) {
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

  function addQuad(i0, i1, i2, i3) {
    indices.push(i0, i1, i2, i0, i2, i3)
  }

  // 1. 64-RING x 40-SEGMENT SCULPTED 3D BODY LOFT
  const nRings = 64
  const nSeg = 40
  const ringGrid = []

  for (let r = 0; r < nRings; r++) {
    const s = Math.pow((r + 0.35) / (nRings - 0.65), 1.08)
    const { z: zRing, yTop, yBot, halfW } = evaluateProfile(spec, s)
    const yCenter = 0.5 * (yTop + yBot)
    const yHalf = Math.max(1e-4, 0.5 * (yTop - yBot))
    const uUv = 0.02 + 0.96 * s

    const row = []
    for (let j = 0; j <= nSeg; j++) {
      // j=0..nSeg wraps around circumference (0 = dorsal +Y, nSeg/2 = ventral -Y)
      const theta = (j / nSeg) * Math.PI * 2.0
      const cosT = Math.cos(theta) // +1 at dorsal (+Y), -1 at ventral (-Y)
      const sinT = Math.sin(theta) // +1 at left flank (+X), -1 at right flank (-X)

      let pz = zRing
      const py = yCenter + yHalf * cosT

      const keelTaper = 1.0 - 0.22 * Math.pow(cosT, 4)
      const midFlankFullness = 1.0 + 0.07 * (sinT * sinT) * (1.0 - 0.4 * (cosT * cosT))
      let px = halfW * sinT * keelTaper * midFlankFullness

      // Mouth lip indent near snout
      if (s < 0.045) {
        const lipEnv = smoothstep(0.006, 0.020, s) * (1.0 - s / 0.045)
        const mouthIndent = Math.exp(-Math.pow((cosT + 0.04) / 0.16, 2)) * (1.0 - 0.4 * (sinT * sinT))
        pz -= 0.006 * mouthIndent * lipEnv
      }

      // Sculpted 3D orbital rim around eye
      const eyeDs = (s - spec.eyeS) / 0.042
      const eyeDc = (cosT - spec.eyeYFrac) / 0.24
      const eyeR2 = eyeDs * eyeDs + eyeDc * eyeDc
      if (eyeR2 < 2.0 && Math.abs(sinT) > 0.40) {
        const orbitalRim = Math.exp(-Math.pow((Math.sqrt(eyeR2) - 0.90) / 0.28, 2))
        px += (sinT > 0 ? 1 : -1) * (0.008 * orbitalRim)
      }

      // Recessed operculum gill groove
      const gillS = 0.265 - 0.018 * cosT
      const gillDelta = (s - gillS) / 0.015
      if (Math.abs(gillDelta) < 2.2 && cosT < 0.50 && cosT > -0.78 && Math.abs(sinT) > 0.40) {
        const gillStep = -0.012 * gillDelta * Math.exp(-gillDelta * gillDelta)
        px += (sinT > 0 ? 1 : -1) * gillStep
      }

      const yNorm = clamp(0.5 * (1.0 + cosT), 0.0, 1.0) // 1.0 at dorsal (+Y), 0.0 at ventral (-Y)
      const vUv = 0.04 + 0.56 * yNorm
      row.push(addVert(px, py, pz, uUv, vUv))
    }
    ringGrid.push(row)
  }

  for (let r = 0; r < nRings - 1; r++) {
    for (let j = 0; j < nSeg; j++) {
      // Ensure outward counter-clockwise winding when viewed from outside (+X/+Y/+Z)
      addQuad(ringGrid[r][j], ringGrid[r + 1][j], ringGrid[r + 1][j + 1], ringGrid[r][j + 1])
    }
  }

  // Snout cap (+Z) & peduncle cap (-Z)
  const snoutTipIdx = addVert(0, 0, spec.zSnout, 0.02, 0.32)
  for (let j = 0; j < nSeg; j++) {
    indices.push(snoutTipIdx, ringGrid[0][j], ringGrid[0][j + 1])
  }
  const pedTipIdx = addVert(0, 0, spec.zPeduncle, 0.98, 0.32)
  for (let j = 0; j < nSeg; j++) {
    indices.push(pedTipIdx, ringGrid[nRings - 1][j + 1], ringGrid[nRings - 1][j])
  }

  // 2. 3D FLUSH CONVEX CORNEA EYES (LEFT +X & RIGHT -X)
  const { z: zEye, yTop: yTopE, yBot: yBotE, halfW: hwE } = evaluateProfile(spec, spec.eyeS)
  const yEye = 0.5 * (yTopE + yBotE) + spec.eyeYFrac * 0.5 * (yTopE - yBotE)
  const xEye = hwE * 0.90
  const rGlobe = spec.eyeRadius

  for (const sideSign of [1.0, -1.0]) {
    const nERings = 6
    const nESeg = 18
    const apexIdx = addVert(sideSign * (xEye + rGlobe * 0.62), yEye, zEye + rGlobe * 0.14, 0.90, 0.83)
    const eyeRings = []
    for (let er = 1; er <= nERings; er++) {
      const frac = er / nERings
      const phi = frac * (Math.PI * 0.48)
      const sinP = Math.sin(phi), cosP = Math.cos(phi)
      const row = []
      for (let ej = 0; ej <= nESeg; ej++) {
        const ang = (ej / nESeg) * Math.PI * 2.0
        const px = sideSign * (xEye + cosP * rGlobe * 0.62)
        const py = yEye + Math.sin(ang) * sinP * rGlobe
        const pz = zEye + Math.cos(ang) * sinP * rGlobe + cosP * rGlobe * 0.14
        const uE = 0.90 + 0.072 * frac * Math.cos(ang) * sideSign
        const vE = 0.83 + 0.072 * frac * Math.sin(ang)
        row.push(addVert(px, py, pz, uE, vE))
      }
      eyeRings.push(row)
    }
    for (let ej = 0; ej < nESeg; ej++) {
      if (sideSign > 0) indices.push(apexIdx, eyeRings[0][ej + 1], eyeRings[0][ej])
      else indices.push(apexIdx, eyeRings[0][ej], eyeRings[0][ej + 1])
    }
    for (let er = 0; er < nERings - 1; er++) {
      for (let ej = 0; ej < nESeg; ej++) {
        if (sideSign > 0) {
          addQuad(eyeRings[er][ej], eyeRings[er][ej + 1], eyeRings[er + 1][ej + 1], eyeRings[er + 1][ej])
        } else {
          addQuad(eyeRings[er][ej], eyeRings[er + 1][ej], eyeRings[er + 1][ej + 1], eyeRings[er][ej + 1])
        }
      }
    }
  }

  // Helper to append a watertight double-sided scalloped rayed 3D fin
  function appendDoubleSidedFin(columns, u0, u1) {
    const nCols = columns.length
    const mRows = columns[0].length
    const grid = [[], []] // side 0 (+normal), side 1 (-normal)

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1.0 : -1.0
      for (let c = 0; c < nCols; c++) {
        const colIdx = []
        for (let r = 0; r < mRows; r++) {
          const { pos, norm, halfT, sRay, tRad, skin } = columns[c][r]
          const rayRib = 0.5 + 0.5 * Math.cos(sRay * 24.0 * Math.PI * 2.0)
          const tActual = halfT * (0.75 + 0.40 * rayRib)
          const px = pos[0] + norm[0] * sign * tActual
          const py = pos[1] + norm[1] * sign * tActual
          const pz = pos[2] + norm[2] * sign * tActual
          const u = lerp(u0, u1, clamp(sRay, 0, 1))
          const v = 0.66 + 0.30 * clamp(tRad, 0, 1)
          colIdx.push(addVert(px, py, pz, u, v, skin))
        }
        grid[side].push(colIdx)
      }
    }

    for (let c = 0; c < nCols - 1; c++) {
      for (let r = 0; r < mRows - 1; r++) {
        addQuad(grid[0][c][r], grid[0][c + 1][r], grid[0][c + 1][r + 1], grid[0][c][r + 1])
        addQuad(grid[1][c][r], grid[1][c][r + 1], grid[1][c + 1][r + 1], grid[1][c + 1][r])
      }
    }
    // Stitch outer tip rim
    const rTop = mRows - 1
    for (let c = 0; c < nCols - 1; c++) {
      addQuad(grid[0][c][rTop], grid[0][c + 1][rTop], grid[1][c + 1][rTop], grid[1][c][rTop])
    }
    // Stitch leading and trailing edges
    for (let r = 0; r < mRows - 1; r++) {
      addQuad(grid[0][0][r], grid[0][0][r + 1], grid[1][0][r + 1], grid[1][0][r])
      const cLast = nCols - 1
      addQuad(grid[0][cLast][r + 1], grid[0][cLast][r], grid[1][cLast][r], grid[1][cLast][r + 1])
    }
  }

  // 3. OPTIONAL ANTERIOR DORSAL PENNANT / FIRST DORSAL (firefish, watchman goby, flasher wrasse, anthias)
  if (spec.dorsalPennant) {
    const dp = spec.dorsalPennant
    const cols = []
    const nC = 14, mR = 6
    for (let c = 0; c < nC; c++) {
      const sRay = c / (nC - 1)
      const sBody = lerp(dp.sStart, dp.sEnd, sRay)
      const { z: zB, yTop } = evaluateProfile(spec, sBody)
      const arch = Math.pow(Math.sin(Math.min(1, sRay * 1.15) * Math.PI), 0.65) * (1.0 - 0.35 * sRay)
      const finH = dp.height * arch
      const sweepZ = dp.sweep * Math.pow(sRay, 0.8)
      const col = []
      for (let r = 0; r < mR; r++) {
        const tRad = r / (mR - 1)
        const py = yTop - 0.015 + finH * Math.pow(tRad, 0.88)
        const pz = zB - sweepZ * Math.pow(tRad, 1.2)
        const halfT = lerp(0.010, 0.002, tRad)
        col.push({ pos: [0, py, pz], norm: [1, 0, 0], halfT, sRay: sRay * 0.35, tRad })
      }
      cols.push(col)
    }
    appendDoubleSidedFin(cols, 0.02, 0.44)
  }

  // 4. MAIN DORSAL FIN (+Y)
  {
    const d = spec.dorsal
    const nC = 28, mR = 6
    const cols = []
    for (let c = 0; c < nC; c++) {
      const sRay = c / (nC - 1)
      const sBody = lerp(d.sStart, d.sEnd, sRay)
      const { z: zB, yTop } = evaluateProfile(spec, sBody)
      const arch = Math.pow(Math.sin(sRay * Math.PI), d.archPow || 0.55) * (0.85 + 0.25 * sRay)
      const scallop = 1.0 - 0.025 * (0.5 - 0.5 * Math.cos(sRay * 22.0 * Math.PI * 2.0))
      const finH = d.height * arch * scallop
      const sweepZ = d.sweep * Math.pow(sRay, 1.15)
      const col = []
      for (let r = 0; r < mR; r++) {
        const tRad = r / (mR - 1)
        const py = yTop - 0.015 + finH * Math.pow(tRad, 0.90)
        const pz = zB - sweepZ * Math.pow(tRad, 1.15)
        const halfT = lerp(0.011, 0.0025, tRad)
        col.push({ pos: [0, py, pz], norm: [1, 0, 0], halfT, sRay, tRad })
      }
      cols.push(col)
    }
    appendDoubleSidedFin(cols, 0.02, 0.44)
  }

  // 5. ANAL FIN (-Y)
  {
    const a = spec.anal
    const nC = 22, mR = 6
    const cols = []
    for (let c = 0; c < nC; c++) {
      const sRay = c / (nC - 1)
      const sBody = lerp(a.sStart, a.sEnd, sRay)
      const { z: zB, yBot } = evaluateProfile(spec, sBody)
      const arch = Math.pow(Math.sin(sRay * Math.PI), 0.58) * (0.85 + 0.22 * sRay)
      const scallop = 1.0 - 0.025 * (0.5 - 0.5 * Math.cos(sRay * 18.0 * Math.PI * 2.0))
      const finH = a.height * arch * scallop
      const sweepZ = a.sweep * Math.pow(sRay, 1.12)
      const col = []
      for (let r = 0; r < mR; r++) {
        const tRad = r / (mR - 1)
        const py = yBot + 0.015 - finH * Math.pow(tRad, 0.90)
        const pz = zB - sweepZ * Math.pow(tRad, 1.12)
        const halfT = lerp(0.010, 0.0025, tRad)
        col.push({ pos: [0, py, pz], norm: [1, 0, 0], halfT, sRay, tRad })
      }
      cols.push(col)
    }
    appendDoubleSidedFin(cols, 0.02, 0.44)
  }

  // 6. CAUDAL FIN (extending from zPeduncle to exactly z = -1.0)
  {
    const cd = spec.caudal
    const { z: zPed, yTop: yTopP, yBot: yBotP, halfW: hwPed } = evaluateProfile(spec, 0.92)
    const nC = 24, mR = 7
    const cols = []
    for (let c = 0; c < nC; c++) {
      const sRay = c / (nC - 1) // 0 = ventral lobe (-Y), 1 = dorsal lobe (+Y)
      const uMid = Math.abs(sRay - 0.5) * 2.0 // 0 at center, 1 at outer lobes
      const yRoot = lerp(yBotP * 0.92, yTopP * 0.92, sRay)
      const yTip = lerp(-cd.spreadY, cd.spreadY, sRay)

      // Positive forkDepth = forked/lunate tail (lobes reach z=-1.0, center is recessed);
      // Negative forkDepth = rounded paddle tail (center reaches z=-1.0, outer edges shorter)
      let rayReach
      if (cd.forkDepth >= 0) {
        rayReach = 1.0 - cd.forkDepth * (1.0 - Math.pow(uMid, cd.lobeSharpness || 1.4))
      } else {
        rayReach = 1.0 + cd.forkDepth * Math.pow(uMid, 1.6)
      }
      const zTarget = zPed - (zPed - (-1.0)) * rayReach

      const col = []
      for (let r = 0; r < mR; r++) {
        const tRad = r / (mR - 1)
        const py = lerp(yRoot, yTip, Math.pow(tRad, 0.92))
        const pz = lerp(zPed, zTarget, tRad)
        const halfT = lerp(hwPed * 0.85, 0.0025, Math.pow(tRad, 0.65))
        col.push({ pos: [0, py, pz], norm: [1, 0, 0], halfT, sRay, tRad })
      }
      cols.push(col)
    }
    appendDoubleSidedFin(cols, 0.46, 0.78)
  }

  // 7. ARTICULATED 3D PECTORAL FINS (pectoral_L = joint 6, pectoral_R = joint 7)
  {
    const p = spec.pectoral
    const { z: zPect, halfW: hwPect } = evaluateProfile(spec, p.s)
    const yPect = p.y
    const xPect = hwPect * 0.88
    const nC = 14, mR = 5

    for (const [sideSign, jointIdx] of [[1.0, 6], [-1.0, 7]]) {
      const cols = []
      for (let c = 0; c < nC; c++) {
        const sRay = c / (nC - 1)
        const ang = lerp(-0.55, 0.68, sRay)
        const wing = Math.pow(Math.sin(sRay * Math.PI), 0.55) * (0.75 + 0.35 * sRay)
        const rayLen = p.length * (0.45 + 0.55 * wing)
        const yRootOff = lerp(-0.025, 0.025, sRay)
        const col = []
        for (let r = 0; r < mR; r++) {
          const tRad = r / (mR - 1)
          const px = sideSign * (xPect + rayLen * tRad * 0.34)
          const py = yPect + yRootOff + rayLen * Math.pow(tRad, 0.95) * Math.sin(ang) * 0.65
          const pz = zPect - rayLen * tRad * 0.88 * Math.cos(ang * 0.5)
          const wFin = smoothstep(0.05, 0.35, tRad)
          const skin = { joints: [jointIdx, 1, 0, 0], weights: [wFin, 1.0 - wFin, 0, 0] }
          col.push({
            pos: [px, py, pz],
            norm: [sideSign * 0.92, 0.15, 0.35],
            halfT: lerp(0.008, 0.002, tRad),
            sRay,
            tRad,
            skin,
          })
        }
        cols.push(col)
      }
      appendDoubleSidedFin(cols, 0.46, 0.78)
    }
  }

  // 8. PAIRED THORACIC PELVIC FINS
  {
    const pv = spec.pelvic
    const { z: zPelv, yBot: yBotPelv } = evaluateProfile(spec, pv.s)
    const nC = 10, mR = 5
    for (const sideSign of [1.0, -1.0]) {
      const cols = []
      for (let c = 0; c < nC; c++) {
        const sRay = c / (nC - 1)
        const rayLen = pv.length * (0.60 + 0.40 * Math.pow(Math.sin(sRay * Math.PI), 0.6))
        const col = []
        for (let r = 0; r < mR; r++) {
          const tRad = r / (mR - 1)
          const px = sideSign * (0.022 + 0.028 * tRad * (0.35 + 0.65 * sRay))
          const py = yBotPelv + 0.020 - rayLen * tRad * 0.68
          const pz = zPelv - 0.035 * sRay - rayLen * tRad * 0.78
          col.push({
            pos: [px, py, pz],
            norm: [sideSign * 0.92, -0.30, 0.25],
            halfT: lerp(0.007, 0.002, tRad),
            sRay,
            tRad,
          })
        }
        cols.push(col)
      }
      appendDoubleSidedFin(cols, 0.02, 0.44)
    }
  }

  // Normalize Z strictly to [-1.0, +1.0] (2.0 units swim-axis length)
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

  // Compute smooth area-weighted vertex normals
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
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1.0
    normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len
  }

  return {
    positions: new Float32Array(positions),
    normals,
    uvs: new Float32Array(uvs),
    joints: new Uint8Array(joints),
    weights: new Float32Array(weights),
    indices: new Uint16Array(indices),
    pngBuffer: buildSpeciesTexturePng(spec, 512),
  }
}

function packageSinglePrimitiveGlb(donorBuf, meshData, speciesId) {
  const donorJsonLen = donorBuf.readUInt32LE(12)
  const donorGltf = JSON.parse(donorBuf.subarray(20, 20 + donorJsonLen).toString('utf8'))
  const donorBin = donorBuf.subarray(20 + donorJsonLen + 8)
  const gltf = structuredClone(donorGltf)

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

  const chunks = []
  const newBufferViews = []
  let byteOffset = 0

  function appendBufferView(typedOrBuffer, target) {
    const buf = Buffer.from(typedOrBuffer.buffer, typedOrBuffer.byteOffset, typedOrBuffer.byteLength)
    const pad = (4 - (buf.length % 4)) % 4
    const bvIndex = newBufferViews.length
    const bv = { buffer: 0, byteOffset, byteLength: buf.length }
    if (target) bv.target = target
    newBufferViews.push(bv)
    chunks.push(buf)
    if (pad > 0) chunks.push(Buffer.alloc(pad))
    byteOffset += buf.length + pad
    return bvIndex
  }

  const bvPos = appendBufferView(meshData.positions, 34962)
  const bvNorm = appendBufferView(meshData.normals, 34962)
  const bvUv = appendBufferView(meshData.uvs, 34962)
  const bvJoints = appendBufferView(meshData.joints, 34962)
  const bvWeights = appendBufferView(meshData.weights, 34962)
  const bvIdx = appendBufferView(meshData.indices, 34963)
  const bvPng = appendBufferView(meshData.pngBuffer, undefined)
  appendBufferView(new Uint8Array([0, 0, 0, 0]), undefined)
  appendBufferView(new Uint8Array([0, 0, 0, 0]), undefined)

  for (let bvi = 9; bvi < donorGltf.bufferViews.length; bvi++) {
    const dbv = donorGltf.bufferViews[bvi]
    const slice = donorBin.subarray(dbv.byteOffset || 0, (dbv.byteOffset || 0) + dbv.byteLength)
    appendBufferView(slice, dbv.target)
  }

  gltf.bufferViews = newBufferViews
  gltf.buffers = [{ byteLength: byteOffset }]

  gltf.accessors[0] = { bufferView: bvPos, componentType: 5126, count: vertCount, type: 'VEC3', min: posMin, max: posMax }
  gltf.accessors[1] = { bufferView: bvNorm, componentType: 5126, count: vertCount, type: 'VEC3' }
  gltf.accessors[2] = { bufferView: bvUv, componentType: 5126, count: vertCount, type: 'VEC2' }
  gltf.accessors[3] = { bufferView: bvJoints, componentType: 5121, count: vertCount, type: 'VEC4' }
  gltf.accessors[4] = { bufferView: bvWeights, componentType: 5126, count: vertCount, type: 'VEC4' }
  gltf.accessors[5] = { bufferView: bvIdx, componentType: 5123, count: meshData.indices.length, type: 'SCALAR' }

  // Our mesh already includes articulated 3D pectoral fins weighted to joints 6 & 7, so use 1 unified primitive!
  gltf.meshes[0].primitives = [
    {
      attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, JOINTS_0: 3, WEIGHTS_0: 4 },
      indices: 5,
      material: 0,
    },
  ]
  gltf.images = [{ bufferView: bvPng, mimeType: 'image/png', name: `${speciesId}_BaseColor` }]
  gltf.textures = [{ sampler: 0, source: 0 }]
  gltf.materials = [
    {
      name: `${speciesId}_PBR`,
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorTexture: { index: 0 },
        metallicFactor: 0.02,
        roughnessFactor: 0.34,
      },
    },
  ]

  const jsonStr = JSON.stringify(gltf)
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

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf])
}

fs.mkdirSync(OUT_DIR, { recursive: true })
// Remove old splat-inflated GLBs for species that already have 16k-tri Blender code-driven models in src/rendering/assets/fish/
for (const existing of ['blue-tang.glb', 'royal-gramma.glb', 'banggai-cardinalfish.glb', 'mandarin-dragonet.glb']) {
  const p = path.join(OUT_DIR, existing)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

const donorBuf = fs.readFileSync(DONOR_GLB)
for (const spec of SPECIES_SPECS) {
  const meshData = buildCodeDrivenMesh(spec)
  const glbBuf = packageSinglePrimitiveGlb(donorBuf, meshData, spec.id)
  const outPath = path.join(OUT_DIR, `${spec.id}.glb`)
  fs.writeFileSync(outPath, glbBuf)
  console.log(
    `Code-driven 3D ${spec.id.padEnd(26)} -> ${(glbBuf.length / 1024).toFixed(1)} KB | verts: ${meshData.positions.length / 3} | tris: ${meshData.indices.length / 3}`,
  )
}
