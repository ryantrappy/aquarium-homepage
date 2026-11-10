#!/usr/bin/env node
/**
 * measure-capture-histograms.mjs — repeatable realism measurement for aquarium captures.
 *
 * Computes luminance / saturation / hue statistics from a PNG capture so a
 * reviewer can score it against docs/photorealism-rubric.md without
 * eyeballing it. Dependency-free: decodes PNG in-process (8-bit and 16-bit
 * samples, color types 0/2/3/4/6, non-interlaced) with node:zlib.
 *
 * Usage:
 *   node scripts/measure-capture-histograms.mjs <capture.png> [--crop x,y,w,h] [--sample N] [--json]
 *
 *   --crop x,y,w,h   measure only a rectangular region (per-element scoring:
 *                    e.g. the sand bed, one coral colony, the water column).
 *   --sample N       measure every Nth pixel (default 1; use 4+ for 4K captures).
 *   --json           print the full result as JSON instead of the summary.
 *
 * Notes:
 * - Luminance is Rec. 709 on the sRGB bytes (display-referred, not linear);
 *   it is comparable across captures taken the same way, which is what the
 *   rubric needs. Do not compare it against linear-light measurements.
 * - Saturation is HSV saturation (max-min)/max per pixel.
 * - JPEG captures are not supported: convert to PNG first (e.g. with
 *   Python PIL: Image.open('capture.jpg').convert('RGB').save('capture.png')).
 *   The baseline screenshot (JPEG, missing from the repo — see the rubric's
 *   gap table) must be re-saved and converted before it can be measured.
 * - Interlaced (Adam7) PNGs are rejected: re-save them non-interlaced.
 */
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

function fail(message) {
  process.stderr.write(`measure-capture-histograms: ${message}\n`)
  process.exitCode = 2
  throw new Error(message)
}

function parseArgs(argv) {
  const positional = []
  const options = { crop: null, sample: 1, json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') options.json = true
    else if (arg === '--crop' || arg.startsWith('--crop=')) {
      const value = arg === '--crop' ? argv[++i] : arg.slice('--crop='.length)
      options.crop = String(value).split(',').map(Number)
    } else if (arg === '--sample' || arg.startsWith('--sample=')) {
      const value = arg === '--sample' ? argv[++i] : arg.slice('--sample='.length)
      options.sample = Number(value)
    } else if (arg.startsWith('--')) fail(`unknown option ${arg}`)
    else positional.push(arg)
  }
  if (positional.length !== 1) fail('usage: measure-capture-histograms.mjs <capture.png> [--crop x,y,w,h] [--sample N] [--json]')
  if (options.crop && (options.crop.length !== 4 || options.crop.some((v) => !Number.isFinite(v) || v < 0))) {
    fail('--crop needs x,y,w,h with non-negative numbers')
  }
  if (!Number.isInteger(options.sample) || options.sample < 1) fail('--sample needs a positive integer')
  return { file: positional[0], ...options }
}

function readChunks(buffer) {
  if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) {
    fail('not a PNG file (bad signature)')
  }
  const chunks = []
  let offset = 8
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    chunks.push({ type, data })
    offset += 12 + length
    if (type === 'IEND') break
  }
  return chunks
}

function decodePng(buffer) {
  const chunks = readChunks(buffer)
  const ihdr = chunks.find((c) => c.type === 'IHDR')
  if (!ihdr) fail('PNG has no IHDR chunk')
  const width = ihdr.data.readUInt32BE(0)
  const height = ihdr.data.readUInt32BE(4)
  const bitDepth = ihdr.data[8]
  const colorType = ihdr.data[9]
  const interlace = ihdr.data[12]
  if (interlace !== 0) fail('interlaced (Adam7) PNGs are not supported; re-save non-interlaced')
  if (bitDepth !== 8 && bitDepth !== 16) fail(`unsupported PNG bit depth ${bitDepth} (only 8 and 16)`)
  const channelsByType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }
  const channels = channelsByType[colorType]
  if (channels === undefined) fail(`unsupported PNG color type ${colorType}`)
  const paletteChunk = chunks.find((c) => c.type === 'PLTE')
  let palette = null
  if (colorType === 3) {
    if (!paletteChunk) fail('palette PNG has no PLTE chunk')
    palette = paletteChunk.data
  }
  const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data))
  if (idat.length === 0) fail('PNG has no IDAT chunk')
  const raw = inflateSync(idat)
  const bytesPerSample = bitDepth === 16 ? 2 : 1
  const bytesPerPixel = channels * bytesPerSample
  const stride = width * bytesPerPixel
  if (raw.length < height * (stride + 1)) fail('PNG IDAT data is truncated')
  // Unfilter scanlines (filter types 0-4, per the PNG spec).
  const pixels = Buffer.alloc(height * stride)
  let previous = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = pixels.subarray(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= bytesPerPixel ? out[x - bytesPerPixel] : 0
      const b = previous[x]
      const c = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0
      let value = line[x]
      if (filter === 1) value = (value + a) & 0xff
      else if (filter === 2) value = (value + b) & 0xff
      else if (filter === 3) value = (value + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        const predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        value = (value + predictor) & 0xff
      } else if (filter !== 0) fail(`unsupported PNG filter type ${filter}`)
      out[x] = value
    }
    previous = Buffer.from(out)
  }
  const sampleAt = (x, y) => {
    const offset = (y * width + x) * bytesPerPixel
    const read = (channel) => bitDepth === 16 ? pixels[offset + channel * 2] : pixels[offset + channel]
    if (colorType === 0) return [read(0), read(0), read(0)]
    if (colorType === 2) return [read(0), read(1), read(2)]
    if (colorType === 3) {
      const index = read(0) * 3
      return [palette[index], palette[index + 1], palette[index + 2]]
    }
    if (colorType === 4) return [read(0), read(0), read(0)]
    return [read(0), read(1), read(2)]
  }
  return { width, height, bitDepth, colorType, sampleAt }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

function measure(file, crop, sampleStep) {
  const { width, height, sampleAt } = decodePng(readFileSync(file))
  const region = crop
    ? { x: crop[0], y: crop[1], w: Math.min(crop[2], width - crop[0]), h: Math.min(crop[3], height - crop[1]) }
    : { x: 0, y: 0, w: width, h: height }
  if (region.w <= 0 || region.h <= 0) fail('crop region is empty or outside the image')
  const luminances = []
  const saturations = []
  const hueBuckets = [0, 0, 0, 0, 0, 0] // red, yellow, green, cyan, blue, magenta
  let counted = 0
  let overSaturated06 = 0
  let overSaturated08 = 0
  for (let y = region.y; y < region.y + region.h; y += sampleStep) {
    for (let x = region.x; x < region.x + region.w; x += sampleStep) {
      const [r, g, b] = sampleAt(x, y).map((v) => v / 255)
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const delta = max - min
      luminances.push(0.2126 * r + 0.7152 * g + 0.0722 * b)
      const saturation = max === 0 ? 0 : delta / max
      saturations.push(saturation)
      if (saturation > 0.6) overSaturated06++
      if (saturation > 0.8) overSaturated08++
      if (delta > 0) {
        let hue = max === r ? (g - b) / delta : max === g ? 2 + (b - r) / delta : 4 + (r - g) / delta
        hue = ((hue * 60) % 360 + 360) % 360
        hueBuckets[Math.min(5, Math.floor(hue / 60))]++
      }
      counted++
    }
  }
  luminances.sort((a, b) => a - b)
  saturations.sort((a, b) => a - b)
  const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length
  return {
    file,
    image: { width, height },
    region: { x: region.x, y: region.y, width: region.w, height: region.h },
    pixelsMeasured: counted,
    luminance: {
      mean: mean(luminances),
      p10: percentile(luminances, 0.1),
      p50: percentile(luminances, 0.5),
      p90: percentile(luminances, 0.9),
    },
    saturation: {
      mean: mean(saturations),
      p50: percentile(saturations, 0.5),
      p90: percentile(saturations, 0.9),
      fractionAbove06: overSaturated06 / counted,
      fractionAbove08: overSaturated08 / counted,
    },
    hueFractions: {
      red: hueBuckets[0] / counted,
      yellow: hueBuckets[1] / counted,
      green: hueBuckets[2] / counted,
      cyan: hueBuckets[3] / counted,
      blue: hueBuckets[4] / counted,
      magenta: hueBuckets[5] / counted,
    },
  }
}

const { file, crop, sample, json } = parseArgs(process.argv.slice(2))
const result = measure(file, crop, sample)
if (json) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else {
  const { luminance, saturation, hueFractions } = result
  const pct = (v) => `${(v * 100).toFixed(1)}%`
  process.stdout.write(
    `${result.file} (${result.image.width}x${result.image.height}, region ${result.region.width}x${result.region.height} at ${result.region.x},${result.region.y}, ${result.pixelsMeasured} px measured)\n` +
    `  luminance  mean ${luminance.mean.toFixed(3)}  p10 ${luminance.p10.toFixed(3)}  p50 ${luminance.p50.toFixed(3)}  p90 ${luminance.p90.toFixed(3)}\n` +
    `  saturation mean ${saturation.mean.toFixed(3)}  p50 ${saturation.p50.toFixed(3)}  p90 ${saturation.p90.toFixed(3)}  >0.6 ${pct(saturation.fractionAbove06)}  >0.8 ${pct(saturation.fractionAbove08)}\n` +
    `  hue        red ${pct(hueFractions.red)}  yellow ${pct(hueFractions.yellow)}  green ${pct(hueFractions.green)}  cyan ${pct(hueFractions.cyan)}  blue ${pct(hueFractions.blue)}  magenta ${pct(hueFractions.magenta)}\n`,
  )
}
