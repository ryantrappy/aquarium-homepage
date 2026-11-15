import crypto from 'node:crypto'
import zlib from 'node:zlib'

// Canonical, zlib-version-independent comparison helpers for GLB assets.
//
// The splat-fish generator encodes embedded PNG textures with
// `zlib.deflateSync(raw, { level: 9 })`, and deflate output differs between
// bundled zlib versions (zlib 1.3 produced the checked-in chromis base;
// Node 24.22's zlib 1.3.2.1-motley compresses the identical pixels to
// different bytes). Byte-comparing GLBs therefore fails on any Node whose
// bundled zlib differs from the author's. These helpers compare what matters
// — mesh, rig, animation, materials and texture pixels — and ignore the
// zlib-dependent compression bytes.

const GLB_JSON = 0x4e4f534a
const GLB_BIN = 0x004e4942

function parseGlb(buffer: Buffer): { json: any; binary: Buffer } {
  if (buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) {
    throw new Error('Expected a complete glTF 2.0 binary file')
  }
  const chunks: { type: number; bytes: Buffer }[] = []
  let offset = 12
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Truncated GLB chunk header')
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4)
    offset += 8
    if (offset + length > buffer.length) throw new Error('Truncated GLB chunk')
    chunks.push({ type, bytes: buffer.subarray(offset, offset + length) })
    offset += length
  }
  const jsonChunk = chunks.find(chunk => chunk.type === GLB_JSON)
  const binChunk = chunks.find(chunk => chunk.type === GLB_BIN)
  if (!jsonChunk || !binChunk || chunks.length !== 2) throw new Error('Expected one JSON and one BIN GLB chunk')
  return { json: JSON.parse(jsonChunk.bytes.toString('utf8').trimEnd()), binary: Buffer.from(binChunk.bytes) }
}

// Inflate a PNG's IDAT chunks to raw scanlines (filter byte + RGBA per row).
// The chromis PNG encoder always writes filter 0, so raw scanlines are the
// pixels; comparing them compares texture content, independent of zlib.
export function pngRawScanlines(pngBytes: Buffer): Buffer {
  if (!pngBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Expected PNG bytes')
  const idat: Buffer[] = []
  let offset = 8
  while (offset < pngBytes.length) {
    if (offset + 8 > pngBytes.length) throw new Error('Truncated PNG chunk header')
    const length = pngBytes.readUInt32BE(offset), type = pngBytes.toString('ascii', offset + 4, offset + 8)
    if (offset + 12 + length > pngBytes.length) throw new Error('Truncated PNG chunk')
    if (type === 'IDAT') idat.push(pngBytes.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
  }
  if (!idat.length) throw new Error('PNG has no IDAT chunk')
  return zlib.inflateSync(Buffer.concat(idat))
}

// Canonical, zlib-version-independent fingerprint of a GLB: the glTF JSON
// with bufferView/buffer sizes stripped (they shift with PNG encoding size),
// mesh and rig bytes hashed raw, and each embedded PNG hashed by its inflated
// raw scanlines. Two GLBs have the same fingerprint iff they carry the same
// mesh, rig, animation, materials and texture pixels, whatever zlib version
// compressed the PNGs.
export function canonicalGlbFingerprint(glbBytes: Buffer): string {
  const { json, binary } = parseGlb(glbBytes)
  const hash = crypto.createHash('sha256')
  const jsonCopy = structuredClone(json)
  for (const view of jsonCopy.bufferViews ?? []) { delete view.byteOffset; delete view.byteLength }
  for (const buffer of jsonCopy.buffers ?? []) { delete buffer.byteLength }
  hash.update(JSON.stringify(jsonCopy))
  const imageViews = new Set((json.images ?? []).map((image: { bufferView: number }) => image.bufferView))
  for (let i = 0; i < (json.bufferViews ?? []).length; i++) {
    const view = json.bufferViews[i]
    const start = view.byteOffset ?? 0, bytes = binary.subarray(start, start + view.byteLength)
    hash.update(imageViews.has(i) ? pngRawScanlines(bytes) : bytes)
  }
  return hash.digest('hex')
}
