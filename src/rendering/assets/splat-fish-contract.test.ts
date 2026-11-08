import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateAssetContract } from './contract'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const SPLAT_FISH_DIR = path.join(REPO_ROOT, 'src/rendering/assets/splat-fish')

function parseGlbJson(buf: Buffer) {
  expect(buf.readUInt32LE(0)).toBe(0x46546c67)
  expect(buf.readUInt32LE(4)).toBe(2)
  const jsonLen = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
}

describe('self-contained procedural 3D reef fish assets (src/rendering/assets/splat-fish)', () => {
  it('validates all 13 fish assets against manifest hashes, validateAssetContract, and zero unreferenced bufferViews/accessors', () => {
    const manifestPath = path.join(SPLAT_FISH_DIR, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    expect(manifest.schema).toBe('modular-fish-manifest-v1')
    expect(manifest.contractSchema).toBe('reef-asset-v1')
    expect(manifest.assets).toHaveLength(13)

    const generatorBytes = fs.readFileSync(path.join(REPO_ROOT, 'scripts/build-splat-fish-glbs.mjs'))
    const expectedGeneratorSha = crypto.createHash('sha256').update(generatorBytes).digest('hex')

    for (const entry of manifest.assets) {
      expect(entry.generatorSha256, entry.id).toBe(expectedGeneratorSha)

      const glbPath = path.join(REPO_ROOT, entry.path)
      const reportPath = path.join(REPO_ROOT, entry.inspectionReport)
      const glbBytes = fs.readFileSync(glbPath)
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))

      expect(glbBytes.length, entry.id).toBe(entry.bytes)
      const actualSha = crypto.createHash('sha256').update(glbBytes).digest('hex')
      expect(actualSha, entry.id).toBe(entry.sha256)

      // Validate inspection report against reef-asset-v1 contract
      const contractRes = validateAssetContract(report)
      expect(contractRes.valid, `${entry.id} contract issues: ${JSON.stringify('issues' in contractRes ? contractRes.issues : [])}`).toBe(true)
      expect(report.extras.reefAsset.provenance.license).toBe('original')
      expect(report.extras.reefAsset.provenance.sourceSha256).toBe(expectedGeneratorSha)

      // Parse GLB JSON and verify in-band extras + zero unreferenced accessors or bufferViews
      const doc = parseGlbJson(glbBytes)
      expect(doc.nodes[0].extras?.reefAsset).toEqual(report.extras.reefAsset)
      expect(doc.nodes[1].extras?.reefPrimitive).toEqual({
        id: entry.primitives[0].id,
        role: 'fish',
      })

      // Check 3 PBR textures (BaseColor, Normal, ORM wired to metallicRoughnessTexture & occlusionTexture)
      expect(doc.images).toHaveLength(3)
      expect(doc.materials[0].pbrMetallicRoughness.baseColorTexture.index).toBe(0)
      expect(doc.materials[0].normalTexture.index).toBe(1)
      expect(doc.materials[0].pbrMetallicRoughness.metallicRoughnessTexture.index).toBe(2)
      expect(doc.materials[0].occlusionTexture.index).toBe(2)

      // Check 8 joints and 8 animation rotation channels (1 per joint)
      expect(doc.skins[0].joints).toHaveLength(8)
      expect(doc.animations).toHaveLength(1)
      expect(doc.animations[0].channels).toHaveLength(8)

      // Verify every accessor and bufferView is referenced
      const usedAccessors = new Set<number>()
      const prim = doc.meshes[0].primitives[0]
      for (const accIdx of Object.values(prim.attributes) as number[]) usedAccessors.add(accIdx)
      usedAccessors.add(prim.indices)
      usedAccessors.add(doc.skins[0].inverseBindMatrices)
      for (const sampler of doc.animations[0].samplers) {
        usedAccessors.add(sampler.input)
        usedAccessors.add(sampler.output)
      }
      expect(usedAccessors.size, `${entry.id} unreferenced accessors`).toBe(doc.accessors.length)

      const usedBufferViews = new Set<number>()
      for (const acc of doc.accessors) usedBufferViews.add(acc.bufferView)
      for (const img of doc.images) usedBufferViews.add(img.bufferView)
      expect(usedBufferViews.size, `${entry.id} unreferenced bufferViews`).toBe(doc.bufferViews.length)
    }
  })
})
