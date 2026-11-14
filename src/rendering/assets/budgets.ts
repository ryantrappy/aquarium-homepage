/** Performance and asset-delivery budgets (AQ-70.3).
 *
 * Pure, renderer-independent policy: no WebGL, no DOM, no three.js imports,
 * so every rule below is unit-testable in the Node vitest environment.
 * The numbers are the budgets in `docs/photorealism-budgets.md`; this module
 * is the machine-readable form of that document, and `budgets.test.ts`
 * enforces it against the live manifests on every `npm test` run.
 *
 * How the numbers were set (measured on `gemini_control` at the AQ-70.3
 * implementation, commit `c38674f`, from the checked-in files — not a
 * browser session; see the doc for the full measurement table):
 * - Per-asset caps sit ~15–40% above the largest asset already in the
 *   class, so the current scene passes with headroom for the photoreal
 *   rebuilds (AQ-70.9/70.10/70.11) while still catching regressions.
 * - The blue-tang splat-fish is the class outlier in every dimension
 *   (2.36 MB file, 19,406 tris, 1.70 MB of textures at 1024 px); the
 *   background-fish caps are sized to admit it rather than to bless it.
 * - GPU texture memory is estimated as decoded RGBA8 + mipmaps (x1.33)
 *   for PNG/JPEG, and as BC7 (~1 byte/px + mipmaps) for KTX2. That is why
 *   compressed delivery matters: the same 1024 px maps cost 16 MiB
 *   uncompressed and ~4 MiB as KTX2.
 * - The frame-time target is 16.7 ms. The runtime tier mechanism
 *   (`runtime-quality.ts`) steps down at EMA > 19 ms or p95 > 22 ms and
 *   permits recovery below EMA 17.5 ms when p95 <= 22 ms. That recovery
 *   threshold is reachable on steady 60 Hz RAF intervals (~16.67 ms), but
 *   is a bounded recovery probe rather than the frame-time target or proof
 *   of extra GPU headroom. `FRAME_TIME_BUDGET` records the target and policy
 *   thresholds separately; `budgets.test.ts` checks their correspondence
 *   and the recovery hysteresis without treating recovery as a budget pass.
 *
 * Compressed delivery (KTX2/Basis Universal) is required for every asset
 * that is not grandfathered. All 29 manifest assets predate this budget
 * and ship PNG textures, so they are grandfathered by id in
 * `GRANDFATHERED_UNCOMPRESSED_ASSET_IDS`. A new asset id that is not in
 * that set fails the check unless its textures are KTX2 — that is the
 * enforcement: the grandfather list is frozen at this commit and never
 * grows. The proof-candidate fish in `src/rendering/proof/` are not in
 * any manifest, so the automated check does not cover them; the doc
 * records the clownfish proof asset (3x 2048 px maps, ~64 MiB GPU) as a
 * measured outlier to be replaced under AQ-79/AQ-70.9, not as a budget.
 */

export type AssetBudgetClass = 'hero-fish' | 'background-fish' | 'coral' | 'rock'

export interface AssetClassBudget {
  /** Largest single GLB file allowed in the class (bytes). */
  maxFileBytes: number
  /** Largest triangle count allowed for one asset. */
  maxTriangles: number
  /** Largest texture dimension (either axis, px) allowed. */
  maxTextureDimensionPx: number
  /** Largest number of texture maps allowed on one asset. */
  maxTextureMaps: number
  /** Largest single embedded texture (encoded bytes) allowed. */
  maxTextureBytes: number
  /** Largest estimated decoded GPU texture memory for one asset (bytes). */
  maxGpuTextureBytes: number
  /** Largest summed GLB file bytes for the whole class (bytes). */
  maxTotalFileBytes: number
  /** Largest summed triangle count for the whole class. */
  maxTotalTriangles: number
  /** Largest summed estimated GPU texture memory for the class (bytes). */
  maxTotalGpuTextureBytes: number
}

const MIB = 1024 * 1024

/** Per-class caps. See the header comment and docs/photorealism-budgets.md
 * for the measured maxima each cap was sized from. */
export const ASSET_CLASS_BUDGETS: Readonly<Record<AssetBudgetClass, AssetClassBudget>> = Object.freeze({
  // Measured maxima (6 Blender-built fish): 1,432,684 B, 17,226 tris,
  // 1024 px, 3 maps, 609,655 B largest texture, 16 MiB GPU each.
  'hero-fish': Object.freeze({
    maxFileBytes: 2 * MIB,
    maxTriangles: 25_000,
    maxTextureDimensionPx: 1024,
    maxTextureMaps: 4,
    maxTextureBytes: 768 * 1024,
    maxGpuTextureBytes: 16 * MIB,
    maxTotalFileBytes: 12 * MIB,
    maxTotalTriangles: 150_000,
    maxTotalGpuTextureBytes: 96 * MIB,
  }),
  // Measured maxima (13 splat-fish): 2,360,008 B, 19,406 tris, 1024 px,
  // 3 maps, 1,701,456 B largest texture, 16 MiB GPU each. The blue-tang
  // splat is the outlier on every axis; the caps admit it, they do not
  // bless it — a rebuild should bring it in line with its siblings.
  'background-fish': Object.freeze({
    maxFileBytes: 2.5 * MIB,
    maxTriangles: 25_000,
    maxTextureDimensionPx: 1024,
    maxTextureMaps: 4,
    maxTextureBytes: 2 * MIB,
    maxGpuTextureBytes: 16 * MIB,
    maxTotalFileBytes: 32.5 * MIB,
    maxTotalTriangles: 325_000,
    maxTotalGpuTextureBytes: 13 * 16 * MIB,
  }),
  // Measured maxima (8 coral colonies): 2,236,728 B, 34,176 tris, 512 px,
  // 7 maps, 388,951 B largest texture, 9.79 MiB GPU.
  coral: Object.freeze({
    maxFileBytes: 2.5 * MIB,
    maxTriangles: 40_000,
    maxTextureDimensionPx: 512,
    maxTextureMaps: 8,
    maxTextureBytes: 512 * 1024,
    maxGpuTextureBytes: 10 * MIB,
    maxTotalFileBytes: 20 * MIB,
    maxTotalTriangles: 320_000,
    maxTotalGpuTextureBytes: 80 * MIB,
  }),
  // Measured maxima (2 rock islands): 2,125,240 B, 24,572 tris, 512 px,
  // 3 maps, 636,554 B largest texture, 4 MiB GPU.
  rock: Object.freeze({
    maxFileBytes: 2.5 * MIB,
    maxTriangles: 30_000,
    maxTextureDimensionPx: 512,
    maxTextureMaps: 4,
    maxTextureBytes: 768 * 1024,
    maxGpuTextureBytes: 5 * MIB,
    maxTotalFileBytes: 5 * MIB,
    maxTotalTriangles: 60_000,
    maxTotalGpuTextureBytes: 10 * MIB,
  }),
})

export interface DownloadBudgets {
  /** Blocking fish GLB bytes before first paint (Phase 0, AQ-76).
   * Measured 2,786,052 B with the default 5-service configuration. */
  phase0FishMaxBytes: number
  /** All runtime fish GLBs (13 splat + 2 proof candidates).
   * Measured 19,210,848 B. The 15-species hero end state (AQ-78) at
   * ~1.4 MB per fish is ~21 MB, so this cap still fits it. */
  totalFishGlbMaxBytes: number
  /** All GLBs the scene loads (fish + reef). Measured 35,287,324 B. */
  totalSceneGlbMaxBytes: number
  /** Decoded GPU texture memory for everything the scene loads.
   * Measured 205,520,866 B (196.0 MiB) at the budget commit. Full
   * 15-hero promotion at 1024 px does NOT fit this cap — see the doc:
   * it requires KTX2 delivery or 512 px maps. */
  runtimeGpuTextureMaxBytes: number
}

export const DOWNLOAD_BUDGETS: Readonly<DownloadBudgets> = Object.freeze({
  phase0FishMaxBytes: 3.5 * MIB,
  totalFishGlbMaxBytes: 24 * MIB,
  totalSceneGlbMaxBytes: 40 * MIB,
  runtimeGpuTextureMaxBytes: 256 * MIB,
})

export interface FrameTimeBudget {
  /** Frame-time target: 60 fps at both viewports. */
  targetMs: number
  /** Sustained p95 above this steps the quality tier down. This must
   * equal ADAPTIVE_STEP_DOWN_P95_MS in runtime-quality.ts. */
  p95MaxMs: number
  /** Sustained EMA above this steps the quality tier down. This must
   * equal ADAPTIVE_STEP_DOWN_EMA_MS in runtime-quality.ts. */
  stepDownEmaMs: number
  /** Recovery-probe EMA threshold. This must equal ADAPTIVE_STEP_UP_EMA_MS
   * in runtime-quality.ts. It is intentionally not the frame-time target. */
  stepUpEmaMs: number
}

export const FRAME_TIME_BUDGET: Readonly<FrameTimeBudget> = Object.freeze({
  targetMs: 16.7,
  p95MaxMs: 22,
  stepDownEmaMs: 19,
  stepUpEmaMs: 17.5,
})

/** Manifest asset ids whose PNG textures predate this budget and are
 * grandfathered out of the compressed-delivery rule. Frozen at the budget
 * commit (`c38674f`): every id in the three live manifests at that commit.
 * This set never grows — a new asset id must ship KTX2 textures. */
export const GRANDFATHERED_UNCOMPRESSED_ASSET_IDS: ReadonlySet<string> = new Set([
  // src/rendering/assets/fish/manifest.json (6 hero fish)
  'fish-banggai-cardinalfish',
  'fish-blue-tang',
  'fish-mandarin-dragonet',
  'fish-ocellaris-clownfish',
  'fish-royal-gramma',
  'fish-yellow-tang',
  // src/rendering/assets/corals/manifest.json (8 corals, 2 rock islands)
  'coral-acropora-staghorn',
  'coral-acropora-table',
  'coral-anemone-bta',
  'coral-brain-diploria',
  'coral-euphyllia-hammer',
  'coral-euphyllia-torch',
  'coral-montipora-plate',
  'coral-zoanthid-mat',
  'live-rock-island-left',
  'live-rock-island-right',
  // src/rendering/assets/splat-fish/manifest.json (13 background fish)
  'fish-blue-green-chromis',
  'fish-copperband-butterflyfish',
  'fish-firefish',
  'fish-flame-angelfish',
  'fish-lyretail-anthias',
  'fish-mccoskers-flasher-wrasse',
  'fish-six-line-wrasse',
  'fish-tailspot-blenny',
  'fish-yellow-watchman-goby',
])

export interface BudgetTexture {
  mimeType: string
  widthPx: number
  heightPx: number
  /** Encoded (on-disk) size of the texture in bytes. */
  bytes: number
}

export interface BudgetViolation {
  path: string
  message: string
}

/** Estimated decoded GPU memory for one texture: RGBA8 + mipmaps (x1.33)
 * for PNG/JPEG, BC7 (~1 byte/px + mipmaps) for KTX2. Unknown formats are
 * costed as RGBA8 — fail closed rather than undercounting. */
export function estimateGpuTextureBytes(texture: BudgetTexture): number {
  const pixels = texture.widthPx * texture.heightPx
  const bytesPerPixel = texture.mimeType === 'image/ktx2' ? 1 : 4
  return Math.floor((pixels * bytesPerPixel * 4) / 3)
}

export interface AssetBudgetInput {
  id: string
  assetClass: AssetBudgetClass
  /** GLB file size in bytes. */
  fileBytes: number
  /** Triangle count from the GLB index accessors. */
  triangles: number
  textures: BudgetTexture[]
  /** True only for the ids in GRANDFATHERED_UNCOMPRESSED_ASSET_IDS. */
  grandfathered: boolean
}

/** Check one asset against its class budget. Returns every violation;
 * an empty array means the asset fits. Invalid measurements (negative,
 * non-finite, or missing values) are violations, not passes. */
export function evaluateAssetBudget(input: AssetBudgetInput): BudgetViolation[] {
  const violations: BudgetViolation[] = []
  const budget = ASSET_CLASS_BUDGETS[input.assetClass]
  const fail = (path: string, message: string) => violations.push({ path, message })
  const { id } = input

  if (!Number.isSafeInteger(input.fileBytes) || input.fileBytes < 0) {
    fail(`${id}.fileBytes`, 'File size must be a non-negative integer byte count')
  } else if (input.fileBytes > budget.maxFileBytes) {
    fail(`${id}.fileBytes`, `File is ${input.fileBytes} B, over the ${input.assetClass} budget of ${budget.maxFileBytes} B`)
  }
  if (!Number.isSafeInteger(input.triangles) || input.triangles < 0) {
    fail(`${id}.triangles`, 'Triangle count must be a non-negative integer')
  } else if (input.triangles > budget.maxTriangles) {
    fail(`${id}.triangles`, `Asset has ${input.triangles} triangles, over the ${input.assetClass} budget of ${budget.maxTriangles}`)
  }
  if (!Array.isArray(input.textures)) {
    fail(`${id}.textures`, 'Texture inventory must be an array')
    return violations
  }
  if (input.textures.length > budget.maxTextureMaps) {
    fail(`${id}.textures`, `Asset has ${input.textures.length} texture maps, over the ${input.assetClass} budget of ${budget.maxTextureMaps}`)
  }
  let gpuTotal = 0
  input.textures.forEach((texture, index) => {
    const path = `${id}.textures[${index}]`
    if (!Number.isSafeInteger(texture.widthPx) || texture.widthPx <= 0 || !Number.isSafeInteger(texture.heightPx) || texture.heightPx <= 0) {
      fail(path, 'Texture dimensions must be positive integers')
      return
    }
    const dimension = Math.max(texture.widthPx, texture.heightPx)
    if (dimension > budget.maxTextureDimensionPx) {
      fail(path, `Texture is ${texture.widthPx}x${texture.heightPx}, over the ${input.assetClass} maximum dimension of ${budget.maxTextureDimensionPx} px`)
    }
    if (!Number.isSafeInteger(texture.bytes) || texture.bytes < 0) {
      fail(`${path}.bytes`, 'Texture size must be a non-negative integer byte count')
    } else if (texture.bytes > budget.maxTextureBytes) {
      fail(`${path}.bytes`, `Texture is ${texture.bytes} B, over the ${input.assetClass} budget of ${budget.maxTextureBytes} B per texture`)
    }
    gpuTotal += estimateGpuTextureBytes(texture)
  })
  if (gpuTotal > budget.maxGpuTextureBytes) {
    fail(`${id}.gpuTextureBytes`, `Estimated GPU texture memory is ${gpuTotal} B, over the ${input.assetClass} budget of ${budget.maxGpuTextureBytes} B`)
  }
  if (!input.grandfathered && input.textures.length > 0) {
    const uncompressed = input.textures.filter((texture) => texture.mimeType !== 'image/ktx2')
    if (uncompressed.length > 0) {
      fail(`${id}.textures`, `Asset lacks compressed texture delivery (KTX2/Basis): ${uncompressed.length} of ${input.textures.length} textures are not image/ktx2. New photoreal assets must ship KTX2; only the grandfathered ids in GRANDFATHERED_UNCOMPRESSED_ASSET_IDS are exempt.`)
    }
  }
  return violations
}

export interface SceneBudgetInput {
  /** Blocking fish GLB bytes before first paint (Phase 0). */
  phase0FishBytes: number
  /** All runtime fish GLB bytes. */
  totalFishGlbBytes: number
  /** All GLB bytes the scene loads (fish + reef). */
  totalSceneGlbBytes: number
  /** Estimated decoded GPU texture memory for the loaded scene. */
  runtimeGpuTextureBytes: number
}

/** Check scene-wide download and GPU totals against the budgets. */
export function evaluateSceneBudgets(input: SceneBudgetInput): BudgetViolation[] {
  const violations: BudgetViolation[] = []
  const fail = (path: string, message: string) => violations.push({ path, message })
  const check = (path: string, value: number, max: number, label: string) => {
    if (!Number.isSafeInteger(value) || value < 0) fail(path, `${label} must be a non-negative integer byte count`)
    else if (value > max) fail(path, `${label} is ${value} B, over the budget of ${max} B`)
  }
  check('phase0FishBytes', input.phase0FishBytes, DOWNLOAD_BUDGETS.phase0FishMaxBytes, 'Phase 0 blocking fish bytes')
  check('totalFishGlbBytes', input.totalFishGlbBytes, DOWNLOAD_BUDGETS.totalFishGlbMaxBytes, 'Total runtime fish GLB bytes')
  check('totalSceneGlbBytes', input.totalSceneGlbBytes, DOWNLOAD_BUDGETS.totalSceneGlbMaxBytes, 'Total scene GLB bytes')
  check('runtimeGpuTextureBytes', input.runtimeGpuTextureBytes, DOWNLOAD_BUDGETS.runtimeGpuTextureMaxBytes, 'Runtime GPU texture memory')
  return violations
}
