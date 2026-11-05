import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const roots: string[] = []
const checkerPath = fileURLToPath(new URL('../../../scripts/check-reef-asset-manifests.mjs', import.meta.url))
const categories = [
  { folder: 'corals', count: 10, kinds: ['coral', 'rock'] },
  { folder: 'fish', count: 6, kinds: ['fish'] },
]

function digest(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

function fixtureRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'reef-manifest-checker-'))
  roots.push(root)
  for (const category of categories) {
    const assetDir = path.join(root, 'src/rendering/assets', category.folder)
    mkdirSync(assetDir, { recursive: true })
    const assets = Array.from({ length: category.count }, (_, index) => {
      const kind = category.kinds[index % category.kinds.length]
      const id = `${category.folder}-${index}`
      const file = `${id}.glb`
      const relativeAssetPath = `src/rendering/assets/${category.folder}/${file}`
      const inspectionReport = `src/rendering/assets/${category.folder}/${id}-inspection.json`
      const bytes = Buffer.from(`test asset ${id}`)
      const sourceHash = digest(Buffer.from(`generator ${id}`))
      writeFileSync(path.join(root, relativeAssetPath), bytes)
      writeFileSync(path.join(root, inspectionReport), JSON.stringify({
        extras: { reefAsset: { id, kind, provenance: { sourceSha256: sourceHash } } },
      }))
      return {
        id, kind, file, path: relativeAssetPath, inspectionReport,
        sha256: digest(bytes), bytes: bytes.length, generatorSha256: sourceHash,
      }
    })
    writeFileSync(path.join(assetDir, 'manifest.json'), JSON.stringify({ assets }))
  }
  return root
}

function readInputs(root: string) {
  const paths = categories.flatMap(({ folder }) => {
    const dir = path.join(root, 'src/rendering/assets', folder)
    return [
      path.join(dir, 'manifest.json'),
      ...Array.from({ length: folder === 'corals' ? 10 : 6 }, (_, index) => {
        const id = `${folder}-${index}`
        return [path.join(dir, `${id}.glb`), path.join(dir, `${id}-inspection.json`)]
      }).flat(),
    ]
  })
  return paths.map((file) => readFileSync(file))
}

function runChecker(root: string) {
  return spawnSync(process.execPath, [checkerPath, root], { encoding: 'utf8' })
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('reef asset manifest checker', () => {
  it('verifies all 16 asset files and 16 paired reports without changing inputs', () => {
    const root = fixtureRoot()
    const before = readInputs(root)

    const result = runChecker(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Verified 32 files (16 assets and 16 paired inspection reports).')
    expect(readInputs(root)).toEqual(before)
  })

  it('reports missing files, duplicate IDs, size and asset hash mismatches, and inspection identity/source mismatches', () => {
    const root = fixtureRoot()
    const coralDir = path.join(root, 'src/rendering/assets/corals')
    const manifestPath = path.join(coralDir, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.assets[1].id = manifest.assets[0].id
    manifest.assets[2].bytes++
    manifest.assets[3].sha256 = '0'.repeat(64)
    writeFileSync(manifestPath, JSON.stringify(manifest))
    rmSync(path.join(coralDir, manifest.assets[4].file))
    const wrongIdentityPath = path.join(coralDir, manifest.assets[5].inspectionReport.split('/').at(-1)!)
    const wrongIdentity = JSON.parse(readFileSync(wrongIdentityPath, 'utf8'))
    wrongIdentity.extras.reefAsset.id = 'different-id'
    writeFileSync(wrongIdentityPath, JSON.stringify(wrongIdentity))
    const wrongSourcePath = path.join(coralDir, manifest.assets[6].inspectionReport.split('/').at(-1)!)
    const wrongSource = JSON.parse(readFileSync(wrongSourcePath, 'utf8'))
    wrongSource.extras.reefAsset.provenance.sourceSha256 = 'f'.repeat(64)
    writeFileSync(wrongSourcePath, JSON.stringify(wrongSource))

    const result = runChecker(root)
    const details = result.stderr

    expect(result.status).toBe(1)
    expect(details).toContain('duplicate asset ID')
    expect(details).toContain('byte size mismatch')
    expect(details).toContain('sha256 mismatch')
    expect(details).toContain('asset file is missing')
    expect(details).toContain('inspection identity mismatch')
    expect(details).toContain('inspection source hash mismatch')
  })

  it('rejects paths that escape their manifest asset directory', () => {
    const root = fixtureRoot()
    const manifestPath = path.join(root, 'src/rendering/assets/fish/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.assets[0].path = 'src/rendering/assets/corals/corals-0.glb'
    writeFileSync(manifestPath, JSON.stringify(manifest))

    const result = runChecker(root)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('path must stay inside src/rendering/assets/fish')
  })

  it('leaves invalid manifests and all other fixture inputs byte-identical', () => {
    const root = fixtureRoot()
    const manifestPath = path.join(root, 'src/rendering/assets/fish/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.assets[0].sha256 = '0'.repeat(64)
    writeFileSync(manifestPath, JSON.stringify(manifest))
    const before = readInputs(root)

    const result = runChecker(root)

    expect(result.status).toBe(1)
    expect(readInputs(root)).toEqual(before)
  })
})
