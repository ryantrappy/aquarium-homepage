import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// Script helpers are intentionally plain .mjs without declaration files.
// @ts-expect-error Exercise actual CLI parser and packager.
import { parseInvertebrateSyncArgs, syncInvertebrateOverride } from '../../../scripts/sync-invertebrate-override.mjs'
// @ts-expect-error Pure helper guards from unified Blender override dispatcher.
import { extractShapeGuideFromOverride, fishOverrideFiles } from '../../../scripts/sync-blender-override.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const INVERTEBRATES_DIR = path.join(REPO_ROOT, 'src/rendering/assets/invertebrates')

const EXPECTED_IDS = [
  'invertebrate-banded-trochus-snail',
  'invertebrate-emerald-mithrax-crab',
  'invertebrate-scarlet-reef-hermit-crab',
  'invertebrate-scarlet-skunk-cleaner-shrimp',
] as const

const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex')

function parseGlbJson(buf: Buffer) {
  expect(buf.readUInt32LE(0)).toBe(0x46546c67)
  expect(buf.readUInt32LE(4)).toBe(2)
  const jsonLen = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
}

function parseWebpDimensions(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 4).toString('ascii')).toBe('RIFF')
  expect(buf.subarray(8, 12).toString('ascii')).toBe('WEBP')
  const fourcc = buf.subarray(12, 16).toString('ascii')
  if (fourcc === 'VP8X') {
    const width = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16))
    const height = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16))
    return { width, height }
  }
  if (fourcc === 'VP8 ') {
    expect(buf[23]).toBe(0x9d)
    expect(buf[24]).toBe(0x01)
    expect(buf[25]).toBe(0x2a)
    const width = buf.readUInt16LE(26) & 0x3fff
    const height = buf.readUInt16LE(28) & 0x3fff
    return { width, height }
  }
  if (fourcc === 'VP8L') {
    expect(buf[20]).toBe(0x2f)
    const bits = buf.readUInt32LE(21)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >> 14) & 0x3fff) + 1
    return { width, height }
  }
  throw new Error(`Unsupported WebP chunk fourcc: ${fourcc}`)
}

describe('invertebrate Blender override sync CLI & isolation guards (AQ-109)', () => {
  it('accepts a valid invertebrate ID with --learn-guide and rejects mixed/invalid arguments', () => {
    expect(parseInvertebrateSyncArgs(['--invertebrate', 'invertebrate-banded-trochus-snail', '--learn-guide'])).toBe(
      'invertebrate-banded-trochus-snail',
    )
    expect(parseInvertebrateSyncArgs(['--learn-guide', '--invertebrate', 'invertebrate-scarlet-skunk-cleaner-shrimp'])).toBe(
      'invertebrate-scarlet-skunk-cleaner-shrimp',
    )
    for (const badArgs of [
      ['--invertebrate', 'blue-tang', '--learn-guide'],
      ['--invertebrate', '../invertebrate-banded-trochus-snail', '--learn-guide'],
      ['--invertebrate', 'invertebrate-banded-trochus-snail'],
      ['--invertebrate', 'invertebrate-banded-trochus-snail', '--learn-guide', '--install'],
      ['--invertebrate', 'invertebrate-banded-trochus-snail', '--learn-guide', '--reef', 'reef-center-arch'],
      ['--invertebrate', 'invertebrate-banded-trochus-snail', '--learn-guide', '--coral', 'reef-acropora-antler'],
    ]) {
      expect(() => parseInvertebrateSyncArgs(badArgs), JSON.stringify(badArgs)).toThrow()
    }
  })

  it('excludes invertebrate overrides from fish shape-guide extraction', () => {
    expect(
      fishOverrideFiles([
        'blue-tang.glb',
        'reef-center-arch.glb',
        'invertebrate-banded-trochus-snail.glb',
        'invertebrate-scarlet-skunk-cleaner-shrimp.glb',
        'yellow-tang.glb',
      ]),
    ).toEqual(['blue-tang.glb', 'yellow-tang.glb'])

    const sampleOverride = path.join(REPO_ROOT, 'src/rendering/assets/splat-fish/overrides/invertebrate-emerald-mithrax-crab.glb')
    expect(() => extractShapeGuideFromOverride('invertebrate-emerald-mithrax-crab', sampleOverride)).toThrow()
  })

  it('syncs idempotently into a temporary root without touching canonical fish or coral catalogs', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aq109-inv-sync-'))
    const id = 'invertebrate-emerald-mithrax-crab'
    try {
      const filesToStage = [
        `src/rendering/assets/splat-fish/blend/${id}.blend`,
        `src/rendering/assets/splat-fish/overrides/${id}.glb`,
        `src/rendering/modeling/build_${id.replaceAll('-', '_')}.py`,
      ]
      for (const rel of filesToStage) {
        const dst = path.join(tmpRoot, rel)
        fs.mkdirSync(path.dirname(dst), { recursive: true })
        fs.copyFileSync(path.join(REPO_ROOT, rel), dst)
      }

      const first = syncInvertebrateOverride(tmpRoot, id)
      const second = syncInvertebrateOverride(tmpRoot, id)
      expect(second).toEqual(first)

      const tmpGlb = fs.readFileSync(path.join(tmpRoot, first.path))
      const repoGlb = fs.readFileSync(path.join(REPO_ROOT, first.path))
      expect(sha256(tmpGlb)).toBe(sha256(repoGlb))
      expect(fs.existsSync(path.join(tmpRoot, 'src/rendering/assets/fish/manifest.json'))).toBe(false)
      expect(fs.existsSync(path.join(tmpRoot, 'src/rendering/assets/corals/manifest.json'))).toBe(false)
      expect(fs.existsSync(path.join(tmpRoot, 'src/rendering/assets/splat-fish/overrides/learned-shape-guide.json'))).toBe(false)
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('packaged invertebrate assets, rigs, grounding, and thumbnails (AQ-109)', () => {
  it('validates all four invertebrate species packages, SHA-256 lineage, skin/animation contracts, and 600x400 WebPs', () => {
    const manifestPath = path.join(INVERTEBRATES_DIR, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    expect(manifest.schema).toBe('custom-invertebrates-v1')
    expect(manifest.assets).toHaveLength(EXPECTED_IDS.length)
    expect(manifest.assets.map((entry: { id: string }) => entry.id)).toEqual([...EXPECTED_IDS])

    for (const entry of manifest.assets) {
      const nativeBuf = fs.readFileSync(path.join(REPO_ROOT, entry.nativePath))
      const overrideBuf = fs.readFileSync(path.join(REPO_ROOT, entry.overridePath))
      const genBuf = fs.readFileSync(path.join(REPO_ROOT, entry.generatorPath))
      const packagedBuf = fs.readFileSync(path.join(REPO_ROOT, entry.path))
      const inspection = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, entry.inspection), 'utf8'))

      expect(nativeBuf.subarray(0, 7).toString('ascii'), entry.id).toBe('BLENDER')
      expect(sha256(nativeBuf), `${entry.id} nativeSha256`).toBe(entry.nativeSha256)
      expect(sha256(overrideBuf), `${entry.id} overrideSha256`).toBe(entry.overrideSha256)
      expect(sha256(genBuf), `${entry.id} generatorSha256`).toBe(entry.generatorSha256)
      expect(sha256(packagedBuf), `${entry.id} sha256`).toBe(entry.sha256)
      expect(packagedBuf.length, `${entry.id} bytes`).toBe(entry.bytes)
      expect(entry.bytes, `${entry.id} <= 2 MiB`).toBeLessThanOrEqual(2 * 1024 * 1024)
      expect(entry.triangles, `${entry.id} <= 25000 tris`).toBeLessThanOrEqual(25_000)

      expect(inspection.extras.reefInvertebrate.schema).toBe('reef-invertebrate-v1')
      expect(inspection.extras.reefInvertebrate.upAxis).toBe('+Y')
      expect(inspection.extras.reefInvertebrate.forwardAxis).toBe('+Z')
      expect(inspection.extras.reefInvertebrate.origin).toBe('substrate-grounded')
      expect(inspection.extras.reefInvertebrate.provenance.license).toBe('original')
      expect(inspection.extras.reefInvertebrate.provenance.sourceSha256).toBe(entry.overrideSha256)
      expect(inspection.boundsM.min[1], `${entry.id} grounded minY`).toBeGreaterThanOrEqual(-0.005)
      expect(inspection.boundsM.min[1], `${entry.id} grounded minY`).toBeLessThanOrEqual(0.005)

      const doc = parseGlbJson(packagedBuf)
      const rootNode = doc.nodes[doc.scenes[doc.scene ?? 0].nodes[0]]
      expect(rootNode?.extras?.reefInvertebrate).toEqual(inspection.extras.reefInvertebrate)
      expect(doc.meshes).toHaveLength(1)
      expect(doc.skins).toHaveLength(1)
      expect(doc.skins[0].joints.length).toBeGreaterThanOrEqual(4)
      expect(doc.animations.length).toBeGreaterThanOrEqual(1)
      const jointSet = new Set<number>(doc.skins[0].joints)
      for (const channel of doc.animations[0].channels) {
        expect(jointSet.has(channel.target.node)).toBe(true)
      }

      expect(doc.images).toHaveLength(3)
      const mat = doc.materials[0]
      expect(mat.occlusionTexture.index).toBe(mat.pbrMetallicRoughness.metallicRoughnessTexture.index)
      for (const tex of entry.textures) {
        expect(tex.widthPx).toBe(512)
        expect(tex.heightPx).toBe(512)
      }

      const thumbPath = path.join(REPO_ROOT, 'public/fish', `${entry.speciesId}.webp`)
      const thumbBuf = fs.readFileSync(thumbPath)
      expect(parseWebpDimensions(thumbBuf)).toEqual({ width: 600, height: 400 })
    }
  })
})
