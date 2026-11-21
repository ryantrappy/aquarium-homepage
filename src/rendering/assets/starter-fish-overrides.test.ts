import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error Exercise pure exported override inspector without separate declaration file.
import { extractShapeGuideFromOverride } from '../../../scripts/sync-blender-override.mjs'
import { validateAssetContract } from './contract'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const SPLAT_DIR = path.join(REPO_ROOT, 'src/rendering/assets/splat-fish')

const STARTER_OVERRIDES = [
  { id: 'yellow-tang', clipName: 'yellow_tang_labriform_swim' },
  { id: 'ocellaris-clownfish', clipName: 'clownfish_subcarangiform_swim' },
  { id: 'desjardins-sailfin-tang', clipName: 'zebrasoma_labriform_swim' },
] as const

function parseGlb(buf: Buffer) {
  expect(buf.readUInt32LE(0)).toBe(0x46546c67)
  expect(buf.readUInt32LE(4)).toBe(2)
  const jsonLen = buf.readUInt32LE(12)
  const doc = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binLen = buf.readUInt32LE(20 + jsonLen)
  const binary = buf.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + binLen)
  return { doc, binary }
}

function pngDimensions(chunk: Buffer): { widthPx: number; heightPx: number } {
  expect(chunk.length).toBeGreaterThanOrEqual(24)
  expect(chunk.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
  return { widthPx: chunk.readUInt32BE(16), heightPx: chunk.readUInt32BE(20) }
}

describe('standalone Blender starter & license-clean fish overrides (AQ-91 / AQ-70.9)', () => {
  it.each(STARTER_OVERRIDES)(
    'validates packed .blend workfile and contract-ready override GLB for $id',
    ({ id, clipName }) => {
      const blendPath = path.join(SPLAT_DIR, 'blend', `${id}.blend`)
      const overridePath = path.join(SPLAT_DIR, 'overrides', `${id}.glb`)
      expect(fs.existsSync(blendPath)).toBe(true)
      expect(fs.existsSync(overridePath)).toBe(true)

      const buf = fs.readFileSync(overridePath)
      expect(buf.length).toBeLessThan(1_150_000)

      const { doc, binary } = parseGlb(buf)
      const prim = doc.meshes?.[0]?.primitives?.[0]
      expect(prim).toBeDefined()

      const indicesAccessor = doc.accessors[prim.indices]
      const triangles = Math.floor((indicesAccessor?.count ?? 0) / 3)
      expect(triangles).toBeGreaterThan(5_000)
      expect(triangles).toBeLessThanOrEqual(16_000)

      // Blender -Y snout..tail normalization yields glTF Z span in [-1, 1] (~2.0m length).
      const posAccessor = doc.accessors[prim.attributes.POSITION]
      expect(posAccessor.min[2]).toBeGreaterThanOrEqual(-1.005)
      expect(posAccessor.max[2]).toBeLessThanOrEqual(1.005)
      expect(posAccessor.max[2] - posAccessor.min[2]).toBeCloseTo(2.0, 2)

      // 8-bone canonical skeleton & 1 seamless swim clip with rotation on every joint
      const skinJoints: number[] = doc.skins?.[0]?.joints ?? []
      expect(skinJoints).toHaveLength(8)
      const jointNames = skinJoints.map((ni) => doc.nodes[ni]?.name)
      expect(new Set(jointNames)).toEqual(
        new Set([
          'spine_0',
          'spine_1',
          'spine_2',
          'spine_3',
          'spine_4',
          'spine_5',
          'pectoral_L',
          'pectoral_R',
        ]),
      )

      expect(doc.animations).toHaveLength(1)
      expect(doc.animations[0].name).toBe(clipName)
      const jointSet = new Set(skinJoints)
      const rotChannels = doc.animations[0].channels.filter(
        (c: { target?: { path?: string; node?: number } }) => c.target?.path === 'rotation',
      )
      expect(rotChannels).toHaveLength(8)
      expect(new Set(rotChannels.map((c: { target: { node: number } }) => c.target.node))).toEqual(jointSet)

      // 3 embedded 512x512 PNGs wired to BaseColor, Normal, and shared ORM
      expect(doc.images).toHaveLength(3)
      const mat = doc.materials[0]
      const baseImgIdx = mat.pbrMetallicRoughness.baseColorTexture.index
      const normImgIdx = mat.normalTexture.index
      const mrImgIdx = mat.pbrMetallicRoughness.metallicRoughnessTexture.index
      const occImgIdx = mat.occlusionTexture.index
      expect(occImgIdx).toBe(mrImgIdx)
      expect(new Set([baseImgIdx, normImgIdx, mrImgIdx])).toEqual(new Set([0, 1, 2]))

      for (const image of doc.images as { bufferView: number; mimeType: string }[]) {
        expect(image.mimeType).toBe('image/png')
        const bv = doc.bufferViews[image.bufferView]
        const chunk = binary.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + (bv.byteLength ?? 0))
        expect(pngDimensions(chunk)).toEqual({ widthPx: 512, heightPx: 512 })
      }

      // Zero unreferenced accessors or bufferViews
      const usedAccessors = new Set<number>()
      for (const accIdx of Object.values(prim.attributes) as number[]) usedAccessors.add(accIdx)
      usedAccessors.add(prim.indices)
      usedAccessors.add(doc.skins[0].inverseBindMatrices)
      for (const sampler of doc.animations[0].samplers) {
        usedAccessors.add(sampler.input)
        usedAccessors.add(sampler.output)
      }
      expect(usedAccessors.size).toBe(doc.accessors.length)

      const usedBufferViews = new Set<number>()
      for (const acc of doc.accessors) usedBufferViews.add(acc.bufferView)
      for (const img of doc.images) usedBufferViews.add(img.bufferView)
      expect(usedBufferViews.size).toBe(doc.bufferViews.length)

      // Shape-guide extractor works cleanly on standalone overrides
      const guide = extractShapeGuideFromOverride(id, overridePath)
      expect(guide.longitudinalMultipliers).toHaveLength(16)
      expect(guide.dorsoventralMultipliers).toHaveLength(10)

      // Contract-valid inspection JSON with cited silhouette proportions (<= 8% deviation)
      const inspectionPath = path.join(SPLAT_DIR, 'overrides', `fish-${id}-inspection.json`)
      expect(fs.existsSync(inspectionPath)).toBe(true)
      const report = JSON.parse(fs.readFileSync(inspectionPath, 'utf8'))
      const contractRes = validateAssetContract(report)
      expect(
        contractRes.valid,
        `fish-${id} contract issues: ${JSON.stringify('issues' in contractRes ? contractRes.issues : [])}`,
      ).toBe(true)
      expect(report.extras.reefAsset.id).toBe(`fish-${id}`)
      expect(report.extras.reefAsset.provenance.license).toBe('original')
      expect(report.silhouetteReference).toBeDefined()
      expect(report.silhouetteReference?.relativeDeviationPct).toBeLessThanOrEqual(8)
    },
  )

  it('preserves existing proof and download testing runtime files alongside overrides', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/rendering/proof/candidate-real-tang.glb'))).toBe(true)
    expect(
      fs.existsSync(path.join(REPO_ROOT, 'src/rendering/assets/fish/download_testing_copies/clownfish-copy.glb')),
    ).toBe(true)
  })
})
