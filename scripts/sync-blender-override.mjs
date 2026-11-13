#!/usr/bin/env node
/**
 * Manual Blender Override Sync, Shape-Guide Learner & Repo Installer
 *
 * MANDATORY BLENDER WORKFLOW RULE:
 *   Any edits made to a fish in Blender MUST always be:
 *     1. Saved to `src/rendering/assets/splat-fish/blend/<species-id>.blend` (with packed textures)
 *     2. Exported to `src/rendering/assets/splat-fish/overrides/<species-id>.glb`
 *     3. Synced & learned via `node scripts/sync-blender-override.mjs --learn-guide`
 *     4. Committed to Git (`blend/`, `overrides/`, `src/rendering/assets/splat-fish/`, and `manifest.json`)
 *   Never leave Blender edits only in live viewport memory.
 *
 * Usage:
 *   - Freeze current model into overrides/, extract its 3D shape guide, and rebuild all fish:
 *     node scripts/sync-blender-override.mjs --install --freeze blue-tang --learn-guide
 *
 *   - After exporting a sculpted .glb from Blender to overrides/<species-id>.glb:
 *     node scripts/sync-blender-override.mjs --learn-guide
 *
 *   - After exporting a custom reef rock override:
 *     node scripts/sync-blender-override.mjs --reef reef-center-arch --learn-guide
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(__filename), '..')
const ASSETS_DIR = path.join(REPO_ROOT, 'src/rendering/assets/splat-fish')
const OVERRIDES_DIR = path.join(ASSETS_DIR, 'overrides')
const BLEND_DIR = path.join(ASSETS_DIR, 'blend')
const GUIDE_PATH = path.join(OVERRIDES_DIR, 'learned-shape-guide.json')
const BUILD_SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/build-splat-fish-glbs.mjs')

const ARCHETYPE_GROUPS = {
  laterally_compressed_disc: ['blue-tang', 'flame-angelfish', 'copperband-butterflyfish', 'banggai-cardinalfish'],
  fusiform_reef_swimmer: [
    'royal-gramma',
    'blue-green-chromis',
    'six-line-wrasse',
    'mccoskers-flasher-wrasse',
    'lyretail-anthias',
    'firefish',
  ],
  benthic_percher: ['mandarin-dragonet', 'yellow-watchman-goby', 'tailspot-blenny'],
}

function clamp(v, lo = 0.0, hi = 1.0) {
  return Math.max(lo, Math.min(hi, v))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function getArchetypeGroup(speciesId) {
  for (const [group, members] of Object.entries(ARCHETYPE_GROUPS)) {
    if (members.includes(speciesId)) return group
  }
  return 'fusiform_reef_swimmer'
}

/**
 * Reads a binary .glb buffer and extracts typed arrays for POSITION, TEXCOORD_0, JOINTS_0, WEIGHTS_0.
 */
export function parseGlbGeometry(glbBuffer) {
  if (glbBuffer.byteLength < 20 || glbBuffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error('Invalid GLB header')
  }
  const jsonLen = glbBuffer.readUInt32LE(12)
  const doc = JSON.parse(glbBuffer.subarray(20, 20 + jsonLen).toString('utf8'))
  const binStart = 20 + jsonLen + 8
  const binChunkLen = glbBuffer.readUInt32LE(20 + jsonLen)
  const binBuf = glbBuffer.subarray(binStart, binStart + binChunkLen)

  const prim = doc.meshes?.[0]?.primitives?.[0]
  if (!prim) throw new Error('GLB contains no mesh primitive')

  function readAccessorFloatArray(accIdx, components) {
    if (typeof accIdx !== 'number') return null
    const acc = doc.accessors[accIdx]
    const bv = doc.bufferViews[acc.bufferView]
    const byteOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const count = acc.count * components
    const out = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      out[i] = binBuf.readFloatLE(byteOffset + i * 4)
    }
    return out
  }

  function readAccessorUint8Array(accIdx, components) {
    if (typeof accIdx !== 'number') return null
    const acc = doc.accessors[accIdx]
    const bv = doc.bufferViews[acc.bufferView]
    const byteOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const count = acc.count * components
    const out = new Uint8Array(count)
    for (let i = 0; i < count; i++) {
      out[i] = acc.componentType === 5123
        ? binBuf.readUInt16LE(byteOffset + i * 2)
        : binBuf.readUInt8(byteOffset + i)
    }
    return out
  }

  return {
    positions: readAccessorFloatArray(prim.attributes.POSITION, 3),
    uvs: readAccessorFloatArray(prim.attributes.TEXCOORD_0, 2),
    joints: readAccessorUint8Array(prim.attributes.JOINTS_0, 4),
    weights: readAccessorFloatArray(prim.attributes.WEIGHTS_0, 4),
  }
}

/**
 * Extracts a normalized 3D anatomical shape guide from a manually sculpted .glb in overrides/.
 */
export function extractShapeGuideFromOverride(speciesId, overrideGlbPath) {
  if (typeof speciesId === 'string' && speciesId.startsWith('reef-')) {
    throw new Error(`Cannot extract a fish shape guide from reef override "${speciesId}".`)
  }
  const glbBuf = fs.readFileSync(overrideGlbPath)
  const { positions, joints, weights } = parseGlbGeometry(glbBuf)
  const vertCount = positions.length / 3

  let zMin = Infinity, zMax = -Infinity
  let yMin = Infinity, yMax = -Infinity
  let maxHalfWidth = 0.001

  const isPectoralVert = new Uint8Array(vertCount)
  for (let i = 0; i < vertCount; i++) {
    if (joints && weights) {
      for (let c = 0; c < 4; c++) {
        const j = joints[i * 4 + c]
        const w = weights[i * 4 + c]
        if ((j === 6 || j === 7) && w > 0.25) {
          isPectoralVert[i] = 1
        }
      }
    }
    if (isPectoralVert[i]) continue
    const x = Math.abs(positions[i * 3])
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    if (x > maxHalfWidth) maxHalfWidth = x
    if (y < yMin) yMin = y
    if (y > yMax) yMax = y
    if (z < zMin) zMin = z
    if (z > zMax) zMax = z
  }

  const nS = 16
  const nV = 10
  const longMaxRatio = new Float32Array(nS)
  const dvMaxRatio = new Float32Array(nV)

  let pectZMin = Infinity, pectZMax = -Infinity
  let pectYMin = Infinity, pectYMax = -Infinity
  let pectXMax = 0

  for (let i = 0; i < vertCount; i++) {
    const x = Math.abs(positions[i * 3])
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]

    if (isPectoralVert[i]) {
      if (z < pectZMin) pectZMin = z
      if (z > pectZMax) pectZMax = z
      if (y < pectYMin) pectYMin = y
      if (y > pectYMax) pectYMax = y
      if (x > pectXMax) pectXMax = x
      continue
    }

    const s = clamp((z - zMin) / Math.max(1e-5, zMax - zMin), 0, 0.9999)
    const v = clamp((yMax - y) / Math.max(1e-5, yMax - yMin), 0, 0.9999)
    const iS = Math.floor(s * nS)
    const iV = Math.floor(v * nV)
    const ratio = x / maxHalfWidth

    if (ratio > longMaxRatio[iS]) longMaxRatio[iS] = ratio
    if (ratio > dvMaxRatio[iV]) dvMaxRatio[iV] = ratio
  }

  const longitudinalMultipliers = []
  for (let iS = 0; iS < nS; iS++) {
    const s = (iS + 0.5) / nS
    let baseRatio
    if (s <= 0.21) {
      const uTail = s / 0.21
      baseRatio = lerp(0.002 / 0.132, 0.022 / 0.132, Math.pow(uTail, 1.2))
    } else {
      const uBody = (s - 0.21) / 0.79
      baseRatio = uBody < 0.58
        ? lerp(0.022 / 0.132, 1.0, Math.pow(uBody / 0.58, 0.85))
        : Math.pow(Math.sin(clamp((1.0 - uBody) / 0.42, 0, 1) * Math.PI * 0.5), 0.68)
    }
    const measured = longMaxRatio[iS] > 0.01 ? longMaxRatio[iS] : baseRatio
    const mult = clamp(measured / Math.max(0.05, baseRatio), 0.65, 1.45)
    longitudinalMultipliers.push(Number(mult.toFixed(4)))
  }

  const dorsoventralMultipliers = []
  for (let iV = 0; iV < nV; iV++) {
    const v = (iV + 0.5) / nV
    const baseArch = Math.pow(Math.sin(clamp(v, 0.05, 0.95) * Math.PI), 1.42)
    const measured = dvMaxRatio[iV] > 0.01 ? dvMaxRatio[iV] : baseArch
    const mult = clamp(measured / Math.max(0.08, baseArch), 0.75, 1.35)
    dorsoventralMultipliers.push(Number(mult.toFixed(4)))
  }

  return {
    sourceSpeciesId: speciesId,
    archetypeGroup: getArchetypeGroup(speciesId),
    extractedAt: new Date().toISOString(),
    measuredMaxHalfWidthM: Number(maxHalfWidth.toFixed(5)),
    nS,
    nV,
    longitudinalMultipliers,
    dorsoventralMultipliers,
    pectoralGuide: Number.isFinite(pectZMin)
      ? {
          zRoot: Number(pectZMax.toFixed(4)),
          length: Number((pectZMax - pectZMin).toFixed(4)),
          spreadY: Number((pectYMax - pectYMin).toFixed(4)),
          maxOutX: Number(pectXMax.toFixed(4)),
        }
      : null,
  }
}

export function fishOverrideFiles(files) {
  return files
    .filter(file => file.endsWith('.glb') && !path.basename(file).startsWith('reef-'))
    .sort()
}

export function updateLearnedGuidesFile() {
  fs.mkdirSync(OVERRIDES_DIR, { recursive: true })
  const overrideFiles = fishOverrideFiles(fs.readdirSync(OVERRIDES_DIR))

  const guidesBySpecies = {}
  const guidesByArchetype = {}

  for (const file of overrideFiles) {
    const speciesId = file.replace(/\.glb$/, '')
    const fullPath = path.join(OVERRIDES_DIR, file)
    const guide = extractShapeGuideFromOverride(speciesId, fullPath)
    guidesBySpecies[speciesId] = guide
    guidesByArchetype[guide.archetypeGroup] = guide
  }

  const payload = {
    schema: 'splat-fish-learned-shape-guide-v1',
    note: 'Extracted from hand-edited Blender .glb overrides in src/rendering/assets/splat-fish/overrides/ to guide procedural fish generation across species.',
    updatedAt: new Date().toISOString(),
    guidesBySpecies,
    guidesByArchetype,
  }

  fs.writeFileSync(GUIDE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(
    `Updated learned shape guide at src/rendering/assets/splat-fish/overrides/learned-shape-guide.json from [${Object.keys(guidesBySpecies).join(', ') || 'none'}].`,
  )
  return payload
}

export function ensureDocumentationAndRules() {
  fs.mkdirSync(OVERRIDES_DIR, { recursive: true })
  fs.mkdirSync(BLEND_DIR, { recursive: true })

  fs.writeFileSync(
    path.join(OVERRIDES_DIR, 'README.md'),
    [
      '# Manual Blender Overrides & Shape Guides (`splat-fish`)',
      '',
      '## Mandatory Blender Persistence & Git Commit Rule',
      '',
      '**Any edits made to a fish in Blender MUST always be exported, synced, and committed to Git before finishing a task:**',
      '',
      '1. **Save the `.blend` workfile** (with packed textures) to `src/rendering/assets/splat-fish/blend/<species-id>.blend`.',
      '2. **Export the `.glb`** from Blender (`File -> Export -> glTF 2.0 (.glb)`) to `src/rendering/assets/splat-fish/overrides/<species-id>.glb`.',
      '3. **Sync the override & propagate its learned shape guide** to the procedural fish roster:',
      '   ```bash',
      '   node scripts/sync-blender-override.mjs --learn-guide',
      '   ```',
      '4. **Verify tests & commit to Git** (`blend/`, `overrides/`, `src/rendering/assets/splat-fish/*.glb`, `fish-*-inspection.json`, and `manifest.json`):',
      '   ```bash',
      '   npx vitest run src/rendering/assets/splat-fish-contract.test.ts src/rendering/assets/manifest-checker.test.ts',
      '   git add src/rendering/assets/splat-fish scripts/build-splat-fish-glbs.mjs scripts/sync-blender-override.mjs',
      '   git commit -m "feat(fish): update Blender override and learned shape guide"',
      '   ```',
      '',
      'Never leave Blender sculpting or material edits only in live Blender memory.',
      '',
      '## How Manual Overrides Guide Procedural Fish (`--learn-guide`)',
      '',
      '- `sync-blender-override.mjs --learn-guide` inspects every `.glb` in `overrides/`, extracts its normalized longitudinal thickness envelope and dorsoventral arch profile into `overrides/learned-shape-guide.json`, and feeds those curves into `scripts/build-splat-fish-glbs.mjs`.',
      '- Procedural species in the same body-plan archetype blend in the learned longitudinal and dorsoventral contour adjustments while preserving each species\'s own silhouette and `maxHalfW`.',
      '',
    ].join('\n'),
    'utf8',
  )

  fs.writeFileSync(
    path.join(BLEND_DIR, 'README.md'),
    [
      '# Editable Blender Source Files (`splat-fish`)',
      '',
      'Store `.blend` workfiles here (for example `blue-tang.blend`) with all textures packed (`File -> External Data -> Pack Resources`).',
      '',
      '## Mandatory Rule: Always Export & Commit Blender Edits',
      '',
      'Changes in an open Blender session are **not** tracked until saved, exported, synced, and committed:',
      '1. Save `src/rendering/assets/splat-fish/blend/<species-id>.blend`.',
      '2. Export `src/rendering/assets/splat-fish/overrides/<species-id>.glb`.',
      '3. Run `node scripts/sync-blender-override.mjs --learn-guide`.',
      '4. Commit the updated `.blend`, `overrides/`, `.glb`, inspection JSON, and `manifest.json` files to Git.',
      '',
    ].join('\n'),
    'utf8',
  )

  const splatReadmePath = path.join(ASSETS_DIR, 'README.md')
  if (fs.existsSync(splatReadmePath)) {
    const existing = fs.readFileSync(splatReadmePath, 'utf8')
    const ruleHeading = '## Mandatory Blender Edit, Export & Git Commit Workflow'
    if (!existing.includes(ruleHeading)) {
      const appendix = [
        '',
        ruleHeading,
        '',
        'Whenever any fish is created or edited in Blender (including via Blender MCP):',
        '1. **Save the `.blend` file** with packed textures to `src/rendering/assets/splat-fish/blend/<species-id>.blend`.',
        '2. **Export the `.glb` override** to `src/rendering/assets/splat-fish/overrides/<species-id>.glb`.',
        '3. **Run `node scripts/sync-blender-override.mjs --learn-guide`** so:',
        '   - `overrides/<species-id>.glb` is contract-validated and copied to `src/rendering/assets/splat-fish/<species-id>.glb`,',
        '   - `overrides/learned-shape-guide.json` is extracted from your manual sculpt to guide the procedural fish generator across the roster, and',
        '   - `fish-<species-id>-inspection.json` and `manifest.json` are updated with the new SHA-256 hashes and bounds.',
        '4. **Commit all updated files to Git** (`blend/`, `overrides/`, `*.glb`, `*-inspection.json`, and `manifest.json`). Never leave Blender changes uncommitted or only in viewport memory.',
        '',
      ].join('\n')
      fs.writeFileSync(splatReadmePath, existing.trimEnd() + '\n' + appendix, 'utf8')
    }
  }
}

export function installGuideHookIntoBuildScript() {
  if (!fs.existsSync(BUILD_SCRIPT_PATH)) return false
  let src = fs.readFileSync(BUILD_SCRIPT_PATH, 'utf8')
  if (src.includes('learned-shape-guide.json')) {
    return false
  }

  const helperCode = `
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
`

  src = src.replace(
    "const PUBLIC_FISH_DIR = path.join(REPO_ROOT, 'public/fish')",
    `const PUBLIC_FISH_DIR = path.join(REPO_ROOT, 'public/fish')\n${helperCode}`,
  )

  src = src.replace(
    'gThick[i] = Math.max(0.0015 * Math.pow(dNorm, 0.6), longHw * lenticularArch)',
    'const guideMult = sampleLearnedGuideMultiplier(spec.id, s, v)\n      gThick[i] = Math.max(0.0015 * Math.pow(dNorm, 0.6), longHw * lenticularArch * guideMult)',
  )

  fs.writeFileSync(BUILD_SCRIPT_PATH, src, 'utf8')
  console.log('Installed learned shape-guide hook into scripts/build-splat-fish-glbs.mjs.')
  return true
}

async function main() {
  const args = process.argv.slice(2)
  // Rocks are not fish: dispatch before documentation, guide learning or builds.
  if (args.includes('--reef')) {
    const { syncReefOverride, parseReefSyncArgs } = await import('./sync-reef-override.mjs')
    const id = parseReefSyncArgs(args)
    syncReefOverride(REPO_ROOT, id)
    return
  }
  ensureDocumentationAndRules()

  const freezeIdx = args.indexOf('--freeze')
  if (freezeIdx !== -1 && args[freezeIdx + 1]) {
    const speciesId = args[freezeIdx + 1]
    const currentGlbPath = path.join(ASSETS_DIR, `${speciesId}.glb`)
    if (!fs.existsSync(currentGlbPath)) {
      throw new Error(`Cannot freeze ${speciesId}: ${currentGlbPath} does not exist`)
    }
    const overrideGlbPath = path.join(OVERRIDES_DIR, `${speciesId}.glb`)
    fs.copyFileSync(currentGlbPath, overrideGlbPath)
    console.log(
      `Frozen ${speciesId}.glb -> src/rendering/assets/splat-fish/overrides/${speciesId}.glb (${(fs.statSync(overrideGlbPath).size / 1024).toFixed(1)} KB)`,
    )
  }

  if (args.includes('--install') || !fs.readFileSync(BUILD_SCRIPT_PATH, 'utf8').includes('learned-shape-guide.json')) {
    installGuideHookIntoBuildScript()
  }

  if (args.includes('--learn-guide') || !fs.existsSync(GUIDE_PATH)) {
    updateLearnedGuidesFile()
  }

  execFileSync(process.execPath, ['--experimental-strip-types', BUILD_SCRIPT_PATH], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
