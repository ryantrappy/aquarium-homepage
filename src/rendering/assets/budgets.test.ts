import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_STEP_DOWN_EMA_MS,
  ADAPTIVE_STEP_DOWN_P95_MS,
  ADAPTIVE_STEP_UP_EMA_MS,
} from '../scene/runtime-quality'
import {
  ASSET_CLASS_BUDGETS,
  DOWNLOAD_BUDGETS,
  FRAME_TIME_BUDGET,
  GRANDFATHERED_UNCOMPRESSED_ASSET_IDS,
  estimateGpuTextureBytes,
  evaluateAssetBudget,
  evaluateSceneBudgets,
  type AssetBudgetClass,
  type BudgetTexture,
} from './budgets'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const ASSETS_DIR = path.join(REPO_ROOT, 'src/rendering/assets')

const pngTexture = (overrides: Partial<BudgetTexture> = {}): BudgetTexture => ({
  mimeType: 'image/png',
  widthPx: 512,
  heightPx: 512,
  bytes: 100_000,
  ...overrides,
})

const ktx2Texture = (overrides: Partial<BudgetTexture> = {}): BudgetTexture => ({
  mimeType: 'image/ktx2',
  widthPx: 512,
  heightPx: 512,
  bytes: 25_000,
  ...overrides,
})

describe('estimateGpuTextureBytes', () => {
  it('costs PNG/JPEG as RGBA8 with mipmaps and KTX2 as BC7', () => {
    // 512x512 RGBA8 + mipmaps: 512*512*4*4/3 = 1,398,101 (floored).
    expect(estimateGpuTextureBytes(pngTexture())).toBe(1_398_101)
    // Same dimensions as BC7: 512*512*1*4/3 = 349,525 (floored) — ~4x smaller.
    expect(estimateGpuTextureBytes(ktx2Texture())).toBe(349_525)
    expect(estimateGpuTextureBytes(pngTexture({ mimeType: 'image/jpeg' }))).toBe(1_398_101)
    // Unknown formats cost as RGBA8: fail closed rather than undercounting.
    expect(estimateGpuTextureBytes(pngTexture({ mimeType: 'image/webp' }))).toBe(1_398_101)
  })
})

describe('evaluateAssetBudget', () => {
  const base = {
    id: 'test-fish',
    assetClass: 'hero-fish' as AssetBudgetClass,
    fileBytes: 1_400_000,
    triangles: 17_000,
    textures: [pngTexture(), pngTexture(), pngTexture()],
    grandfathered: true,
  }

  it('passes an asset inside every cap', () => {
    expect(evaluateAssetBudget(base)).toEqual([])
  })

  it('fails an oversized file, too many triangles, and an oversized texture', () => {
    const violations = evaluateAssetBudget({
      ...base,
      fileBytes: ASSET_CLASS_BUDGETS['hero-fish'].maxFileBytes + 1,
      triangles: ASSET_CLASS_BUDGETS['hero-fish'].maxTriangles + 1,
      textures: [pngTexture({ bytes: ASSET_CLASS_BUDGETS['hero-fish'].maxTextureBytes + 1 })],
    })
    expect(violations.map((v) => v.path)).toEqual(
      expect.arrayContaining(['test-fish.fileBytes', 'test-fish.triangles', 'test-fish.textures[0].bytes']),
    )
  })

  it('fails a texture over the dimension cap and too many maps', () => {
    const violations = evaluateAssetBudget({
      ...base,
      textures: [
        pngTexture({ widthPx: 2048, heightPx: 2048 }),
        pngTexture(),
        pngTexture(),
        pngTexture(),
        pngTexture(),
      ],
    })
    expect(violations.map((v) => v.path)).toEqual(
      expect.arrayContaining(['test-fish.textures[0]', 'test-fish.textures']),
    )
  })

  it('fails GPU texture memory over the per-asset cap', () => {
    // Three 1024 px RGBA8 maps are exactly 16 MiB; a fourth map tips it over.
    const violations = evaluateAssetBudget({
      ...base,
      textures: [
        pngTexture({ widthPx: 1024, heightPx: 1024 }),
        pngTexture({ widthPx: 1024, heightPx: 1024 }),
        pngTexture({ widthPx: 1024, heightPx: 1024 }),
        pngTexture({ widthPx: 1024, heightPx: 1024 }),
      ],
    })
    expect(violations.map((v) => v.path)).toContain('test-fish.gpuTextureBytes')
  })

  it('fails a non-grandfathered asset whose textures are not KTX2', () => {
    const violations = evaluateAssetBudget({ ...base, grandfathered: false })
    expect(violations).toHaveLength(1)
    expect(violations[0].path).toBe('test-fish.textures')
    expect(violations[0].message).toContain('KTX2')
  })

  it('passes a non-grandfathered asset whose textures are all KTX2', () => {
    expect(evaluateAssetBudget({ ...base, grandfathered: false, textures: [ktx2Texture(), ktx2Texture()] })).toEqual([])
  })

  it('passes a grandfathered asset with uncompressed textures', () => {
    expect(evaluateAssetBudget(base)).toEqual([])
  })

  it('fails closed on invalid measurements', () => {
    const violations = evaluateAssetBudget({ ...base, fileBytes: -1, triangles: Number.NaN, textures: 'nope' as never })
    expect(violations.length).toBeGreaterThanOrEqual(3)
  })
})

describe('evaluateSceneBudgets', () => {
  const base = {
    phase0FishBytes: 2_786_052,
    totalFishGlbBytes: 19_210_848,
    totalSceneGlbBytes: 35_287_324,
    runtimeGpuTextureBytes: 205_520_866,
  }

  it('passes the measured current scene', () => {
    expect(evaluateSceneBudgets(base)).toEqual([])
  })

  it('fails each total over its budget', () => {
    const violations = evaluateSceneBudgets({
      phase0FishBytes: DOWNLOAD_BUDGETS.phase0FishMaxBytes + 1,
      totalFishGlbBytes: DOWNLOAD_BUDGETS.totalFishGlbMaxBytes + 1,
      totalSceneGlbBytes: DOWNLOAD_BUDGETS.totalSceneGlbMaxBytes + 1,
      runtimeGpuTextureBytes: DOWNLOAD_BUDGETS.runtimeGpuTextureMaxBytes + 1,
    })
    expect(violations.map((v) => v.path)).toEqual([
      'phase0FishBytes',
      'totalFishGlbBytes',
      'totalSceneGlbBytes',
      'runtimeGpuTextureBytes',
    ])
  })
})

/** --- Live-manifest enforcement (AQ-70.3 AC #2) ---
 * Reads the real manifests and GLBs and fails the suite when any asset
 * exceeds its class budget or a non-grandfathered asset lacks compressed
 * texture delivery. This is the automated check: adding or rebuilding an
 * asset must fit the budgets in docs/photorealism-budgets.md. */

function parseGlb(buf: Buffer) {
  expect(buf.readUInt32LE(0)).toBe(0x46546c67)
  expect(buf.readUInt32LE(4)).toBe(2)
  const jsonLen = buf.readUInt32LE(12)
  const doc = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binLen = buf.readUInt32LE(20 + jsonLen)
  const binary = buf.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + binLen)
  return { doc, binary }
}

function pngDimensions(chunk: Buffer): { widthPx: number; heightPx: number } | null {
  if (chunk.length < 24 || !chunk.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null
  return { widthPx: chunk.readUInt32BE(16), heightPx: chunk.readUInt32BE(20) }
}

function jpegDimensions(chunk: Buffer): { widthPx: number; heightPx: number } | null {
  // Walk JPEG markers to the first baseline/extended SOF segment.
  let i = 2
  while (i + 9 < chunk.length) {
    if (chunk[i] !== 0xff) {
      i += 1
      continue
    }
    const marker = chunk[i + 1]
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    const length = chunk.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { heightPx: chunk.readUInt16BE(i + 5), widthPx: chunk.readUInt16BE(i + 7) }
    }
    i += 2 + length
  }
  return null
}

function ktx2Dimensions(chunk: Buffer): { widthPx: number; heightPx: number } | null {
  // KTX2 header: 12-byte identifier, vkFormat @12, typeSize @16,
  // pixelWidth @20, pixelHeight @24 (all little-endian u32).
  if (chunk.length < 28) return null
  return { widthPx: chunk.readUInt32LE(20), heightPx: chunk.readUInt32LE(24) }
}

function glbTextures(doc: any, binary: Buffer): BudgetTexture[] {
  const bufferViews: any[] = doc.bufferViews ?? []
  return (doc.images ?? []).map((image: any) => {
    const view = bufferViews[image.bufferView] ?? {}
    const chunk = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + (view.byteLength ?? 0))
    const mimeType: string = image.mimeType ?? ''
    const dims =
      mimeType === 'image/png'
        ? pngDimensions(chunk)
        : mimeType === 'image/jpeg'
          ? jpegDimensions(chunk)
          : mimeType === 'image/ktx2'
            ? ktx2Dimensions(chunk)
            : null
    expect(dims, `image ${image.name ?? image.bufferView} (${mimeType}) must have parseable dimensions`).not.toBeNull()
    return { mimeType, widthPx: dims!.widthPx, heightPx: dims!.heightPx, bytes: view.byteLength ?? 0 }
  })
}

function glbTriangles(doc: any): number {
  let triangles = 0
  for (const mesh of doc.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = doc.accessors?.[primitive.indices]
      if (accessor) triangles += Math.floor(accessor.count / 3)
    }
  }
  return triangles
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

interface LiveAsset {
  id: string
  assetClass: AssetBudgetClass
  fileBytes: number
  triangles: number
  textures: BudgetTexture[]
  grandfathered: boolean
}

function loadLiveAssets(): LiveAsset[] {
  const specs: { manifest: string; dir: string; assetClass: (kind: string) => AssetBudgetClass }[] = [
    { manifest: 'fish/manifest.json', dir: 'fish', assetClass: () => 'hero-fish' },
    {
      manifest: 'corals/manifest.json',
      dir: 'corals',
      assetClass: (kind) => (kind === 'rock' ? 'rock' : 'coral'),
    },
    { manifest: 'splat-fish/manifest.json', dir: 'splat-fish', assetClass: () => 'background-fish' },
  ]
  const assets: LiveAsset[] = []
  for (const spec of specs) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, spec.manifest), 'utf8'))
    for (const entry of manifest.assets) {
      const glbPath = path.join(ASSETS_DIR, spec.dir, entry.file)
      const glbBytes = fs.readFileSync(glbPath)
      expect(glbBytes.length, entry.id).toBe(entry.bytes)
      expect(sha256Hex(glbBytes), entry.id).toBe(entry.sha256)
      const { doc, binary } = parseGlb(glbBytes)
      assets.push({
        id: entry.id,
        assetClass: spec.assetClass(entry.kind),
        fileBytes: glbBytes.length,
        triangles: glbTriangles(doc),
        textures: glbTextures(doc, binary),
        grandfathered: GRANDFATHERED_UNCOMPRESSED_ASSET_IDS.has(entry.id),
      })
    }
  }
  return assets
}

describe('live manifest budgets (AQ-70.3 AC #2)', () => {
  it('every manifest asset fits its class budget and the compressed-delivery rule', () => {
    const assets = loadLiveAssets()
    // Roster shape the budgets were sized from: 6 hero fish, 10 reef
    // assets (8 coral + 2 rock), 13 background fish. A roster change
    // must re-derive the budgets in docs/photorealism-budgets.md.
    expect(assets.filter((a) => a.assetClass === 'hero-fish')).toHaveLength(6)
    expect(assets.filter((a) => a.assetClass === 'coral')).toHaveLength(8)
    expect(assets.filter((a) => a.assetClass === 'rock')).toHaveLength(2)
    expect(assets.filter((a) => a.assetClass === 'background-fish')).toHaveLength(13)

    const violations = assets.flatMap((asset) => evaluateAssetBudget(asset))
    expect(violations).toEqual([])

    // Class totals fit too (not just each asset in isolation).
    for (const assetClass of ['hero-fish', 'background-fish', 'coral', 'rock'] as const) {
      const members = assets.filter((a) => a.assetClass === assetClass)
      const budget = ASSET_CLASS_BUDGETS[assetClass]
      const fileTotal = members.reduce((sum, a) => sum + a.fileBytes, 0)
      const triTotal = members.reduce((sum, a) => sum + a.triangles, 0)
      const gpuTotal = members.reduce(
        (sum, a) => sum + a.textures.reduce((t, texture) => t + estimateGpuTextureBytes(texture), 0),
        0,
      )
      expect(fileTotal, `${assetClass} total file bytes`).toBeLessThanOrEqual(budget.maxTotalFileBytes)
      expect(triTotal, `${assetClass} total triangles`).toBeLessThanOrEqual(budget.maxTotalTriangles)
      expect(gpuTotal, `${assetClass} total GPU texture bytes`).toBeLessThanOrEqual(budget.maxTotalGpuTextureBytes)
    }

    // No stale grandfather entries: every grandfathered id is a live asset.
    const liveIds = new Set(assets.map((a) => a.id))
    for (const id of GRANDFATHERED_UNCOMPRESSED_ASSET_IDS) {
      expect(liveIds.has(id), `grandfathered id ${id} is not in any live manifest`).toBe(true)
    }
  })

  it('the loaded scene fits the download and GPU totals', () => {
    const assets = loadLiveAssets()
    const gpuOf = (list: LiveAsset[]) =>
      list.reduce((sum, a) => sum + a.textures.reduce((t, texture) => t + estimateGpuTextureBytes(texture), 0), 0)
    const reefBytes = assets
      .filter((a) => a.assetClass === 'coral' || a.assetClass === 'rock')
      .reduce((sum, a) => sum + a.fileBytes, 0)
    const splatBytes = assets
      .filter((a) => a.assetClass === 'background-fish')
      .reduce((sum, a) => sum + a.fileBytes, 0)
    const splatGpu = gpuOf(assets.filter((a) => a.assetClass === 'background-fish'))
    const reefGpu = gpuOf(assets.filter((a) => a.assetClass === 'coral' || a.assetClass === 'rock'))

    // The two licensed proof fish are not in any manifest; they load at
    // runtime, so their bytes and GPU cost count toward the scene totals.
    const proofFiles = ['candidate-real-clown.glb', 'candidate-real-tang.glb']
    let proofBytes = 0
    let proofGpu = 0
    for (const file of proofFiles) {
      const glbBytes = fs.readFileSync(path.join(REPO_ROOT, 'src/rendering/proof', file))
      proofBytes += glbBytes.length
      const { doc, binary } = parseGlb(glbBytes)
      proofGpu += glbTextures(doc, binary).reduce((sum, texture) => sum + estimateGpuTextureBytes(texture), 0)
    }

    // Phase 0 blocks on the first 3 configured species (service order in
    // src/lib/services.ts): yellow-tang (proof), banggai-cardinalfish and
    // royal-gramma (splat). Measured 2,786,052 B at the AQ-76 write-up.
    const proofTangBytes = fs.statSync(path.join(REPO_ROOT, 'src/rendering/proof/candidate-real-tang.glb')).size
    const phase0 =
      proofTangBytes +
      assets.find((a) => a.id === 'fish-banggai-cardinalfish' && a.assetClass === 'background-fish')!.fileBytes +
      assets.find((a) => a.id === 'fish-royal-gramma' && a.assetClass === 'background-fish')!.fileBytes

    const violations = evaluateSceneBudgets({
      phase0FishBytes: phase0,
      totalFishGlbBytes: splatBytes + proofBytes,
      totalSceneGlbBytes: splatBytes + proofBytes + reefBytes,
      runtimeGpuTextureBytes: splatGpu + proofGpu + reefGpu,
    })
    expect(violations).toEqual([])
  })
})

describe('frame-time budget matches the runtime tier mechanism (AQ-70.3 AC #3)', () => {
  it('the adaptive-quality thresholds sit inside the documented budget', () => {
    // The controller in runtime-quality.ts is the mechanism; the budget
    // records its thresholds so a drift in either place fails here.
    expect(ADAPTIVE_STEP_DOWN_P95_MS).toBe(FRAME_TIME_BUDGET.p95MaxMs)
    expect(ADAPTIVE_STEP_DOWN_EMA_MS).toBe(FRAME_TIME_BUDGET.stepDownEmaMs)
    expect(ADAPTIVE_STEP_UP_EMA_MS).toBe(FRAME_TIME_BUDGET.stepUpEmaMs)
    expect(FRAME_TIME_BUDGET.stepDownEmaMs).toBeGreaterThan(FRAME_TIME_BUDGET.targetMs)
    expect(FRAME_TIME_BUDGET.targetMs).toBeGreaterThan(FRAME_TIME_BUDGET.stepUpEmaMs)
  })
})
