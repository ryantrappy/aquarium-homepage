#!/usr/bin/env node
/**
 * Manual Blender Override Sync & Freeze Helper for Splat Fish Assets
 *
 * Usage:
 *   1. Freeze the current blue-tang.glb (or any species) as a protected manual override:
 *      node scripts/sync-blender-override.mjs --freeze blue-tang
 *
 *   2. Sync all manual .glb overrides in src/rendering/assets/splat-fish/overrides/
 *      into src/rendering/assets/splat-fish/, updating inspection reports & manifest.json:
 *      node scripts/sync-blender-override.mjs
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
const BUILD_SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/build-splat-fish-glbs.mjs')

export function ensureOverrideDirectories() {
  fs.mkdirSync(OVERRIDES_DIR, { recursive: true })
  fs.mkdirSync(BLEND_DIR, { recursive: true })

  const readmePath = path.join(OVERRIDES_DIR, 'README.md')
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      [
        '# Manual Blender Overrides (`splat-fish`)',
        '',
        'Place hand-edited `.glb` exports in this folder (`<species-id>.glb`) and editable `.blend` files in `../blend/<species-id>.blend`.',
        '',
        '- When `overrides/<species-id>.glb` is present, `scripts/build-splat-fish-glbs.mjs` preserves it instead of overwriting it with procedural geometry, automatically injects/updates the `reef-asset-v1` contract metadata and bounding box, and refreshes `fish-<species-id>-inspection.json` and `manifest.json` (unless `--force-procedural` is passed).',
        '- Freeze a current model into `overrides/` with:',
        '  `node scripts/sync-blender-override.mjs --freeze blue-tang`',
        '- After exporting a revised `.glb` from Blender into `overrides/`, run:',
        '  `node scripts/sync-blender-override.mjs`',
        '',
      ].join('\n'),
      'utf8',
    )
  }
}

function main() {
  ensureOverrideDirectories()
  const args = process.argv.slice(2)
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

  execFileSync(process.execPath, ['--experimental-strip-types', BUILD_SCRIPT_PATH], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
