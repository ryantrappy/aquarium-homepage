import { describe, expect, it } from 'vitest'
import { validateAssetContract, type AssetInspection } from './contract'

const hash = 'a'.repeat(64)
function rock(): AssetInspection {
  const boundsM = { min: [-.5, 0, -.2], max: [.5, .4, .2] } as AssetInspection['boundsM']
  return {
    extras: { reefAsset: { schema: 'reef-asset-v1', id: 'proof-rock', kind: 'rock', units: 'meter', upAxis: '+Y', origin: 'local', dimensionsM: [1, .4, .4], provenance: { license: 'original', creator: 'Aquarium project', sourceSha256: hash, recipe: 'scripts/original-rock.py seed=7', attribution: 'Original project geometry' } } },
    rootTransform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    boundsM, primitives: [{ id: 'rock-main', role: 'rock', vertexCount: 4, boundsM, material: { vertexColors: false, vertexAlpha: false, aoSource: 'texture' } }],
    sockets: [{ name: 'socket_sps_crest_01', role: 'coral-mount', parentMesh: 'rock-main', archetype: 'branching-sps', positionM: [0, .4, 0], normal: [0, 1, 0], rotation: [0, 0, 0, 1], footprintRadiusM: .03, clearanceRadiusM: .1, support: { pointM: [0, .4, 0], normal: [0, 1, 0], supportedRadiusM: .035, freeRadiusM: .12, evidence: { method: 'surface-probes-v1', geometrySha256: hash, report: 'proof-rock-support.json' } } }],
    collisionParts: [{ id: 'pillar', sourceMesh: 'rock-main', boundsM, evidence: { method: 'closed-mesh-proxies-v1', geometrySha256: hash, report: 'proof-rock-proxies.json' } }],
  }
}
function coral(): AssetInspection {
  const value = rock()
  value.extras.reefAsset.kind = 'coral'
  value.extras.reefAsset.maskSchema = 'coral-raw-masks-v1'
  value.sockets = []; value.collisionParts = []
  const part = value.primitives[0]
  part.role = 'coral-rigid'; part.maskSchema = 'coral-raw-masks-v1'
  part.material.aoSource = 'coral-mask-a'
  part.color0 = { itemSize: 4, values: Array.from({ length: 4 }, () => [0, 1, .25, .4]).flat() }
  return value
}
function invalid(value: unknown, path: string) {
  const result = validateAssetContract(value)
  expect(result.valid).toBe(false)
  if (!result.valid) expect(result.issues.some(issue => issue.path.includes(path))).toBe(true)
}

describe('modular asset contract', () => {
  it('accepts meter-scale rock with separate texture AO and a supported placement socket', () => {
    expect(validateAssetContract(rock()).valid).toBe(true)
  })
  it('accepts raw coral masks without turning contact AO into transparency or rigid R into tint', () => {
    expect(validateAssetContract(coral()).valid).toBe(true)
    const soft = coral(); soft.primitives[0].role = 'coral-soft'; soft.primitives[0].color0!.values[0] = .5
    expect(validateAssetContract(soft).valid).toBe(true)
  })
  it('rejects unknown/malformed metadata and missing imported-asset provenance', () => {
    invalid(null, '')
    const value = rock(); value.extras.reefAsset.provenance.license = 'CC-BY-4.0'
    invalid(value, 'sourceUrl')
    invalid({ ...rock(), imaginaryHabitat: true }, '')
  })
  it('rejects wrong units/up axis, unapplied transforms and mismatched dimensions', () => {
    const value = rock()
    invalid({ ...value, extras: { reefAsset: { ...value.extras.reefAsset, units: 'centimeter' } } }, 'units')
    invalid({ ...value, extras: { reefAsset: { ...value.extras.reefAsset, upAxis: '+Z' } } }, 'upAxis')
    value.rootTransform.scale = [1, 3.4, 1]; invalid(value, 'scale')
    value.rootTransform.scale = [1, 1, 1]; value.rootTransform.translation[0] = 3; invalid(value, 'translation')
    value.rootTransform.translation = [0, 0, 0]; value.extras.reefAsset.dimensionsM[1] = 4; invalid(value, 'dimensionsM')
  })
  it('rejects nonfinite/inverted bounds and primitive bounds outside the measured asset', () => {
    const value = rock(); value.boundsM.max[0] = Infinity; invalid(value, 'boundsM')
    const inverted = rock(); inverted.boundsM.max[1] = -.1; invalid(inverted, 'boundsM')
    const escaped = rock(); escaped.primitives[0].boundsM = { min: [-2, 0, -.2], max: [.5, .4, .2] }; invalid(escaped, 'primitives.0.boundsM')
  })
  it('rejects default material vertex-color/alpha multiplication and rock/coral mask mix-ups', () => {
    const value = coral(); invalid({ ...value, primitives: [{ ...value.primitives[0], material: { ...value.primitives[0].material, vertexColors: true } }] }, 'vertexColors')
    invalid({ ...value, primitives: [{ ...value.primitives[0], material: { ...value.primitives[0].material, vertexAlpha: true } }] }, 'vertexAlpha')
    const stone = rock(); stone.primitives[0].color0 = value.primitives[0].color0; invalid(stone, 'primitives.0')
    const mislabeled = rock(); mislabeled.extras.reefAsset.maskSchema = 'coral-raw-masks-v1'; invalid(mislabeled, 'extras.reefAsset.maskSchema')
    const undeclared = coral(); delete undeclared.extras.reefAsset.maskSchema; invalid(undeclared, 'extras.reefAsset.maskSchema')
    value.primitives[0].material.aoSource = 'texture'; invalid(value, 'aoSource')
  })
  it('requires complete finite RGBA masks in range and zero rigid flexibility', () => {
    const value = coral(); value.primitives[0].color0!.values[0] = .01; invalid(value, 'color0.values')
    value.primitives[0].color0!.values[0] = 0; value.primitives[0].color0!.values.pop(); invalid(value, 'color0.values')
    for (const sample of [NaN, Infinity, -.01, 1.01]) {
      const bad = coral(); bad.primitives[0].color0!.values[2] = sample; invalid(bad, 'color0.values')
    }
    const missing = coral(); delete missing.primitives[0].maskSchema; invalid(missing, 'primitives.0')
  })
  it('rejects mistagged socket classes, semantic-anchor roles and nonexistent parents', () => {
    const value = rock(); value.sockets[0].archetype = 'host-anemone'; invalid(value, 'archetype')
    value.sockets[0].archetype = 'branching-sps'; value.sockets[0].parentMesh = 'imaginary-rock'; invalid(value, 'parentMesh')
    const wrongPart = rock(); wrongPart.primitives[0].boundsM = { min: [-.5, 0, -.2], max: [-.1, .4, .2] }; invalid(wrongPart, 'parentMesh')
    const fresh = rock(); invalid({ ...fresh, sockets: [{ ...fresh.sockets[0], role: 'anemone-host' }] }, 'role')
  })
  it('rejects off-surface mounts, wrong orientation and inadequate footprint/clearance evidence', () => {
    const value = rock(); value.sockets[0].support.pointM[1] = .3; invalid(value, 'support.pointM')
    const normal = rock(); normal.sockets[0].normal = [1, 0, 0]; invalid(normal, 'sockets.0')
    const clearance = rock(); clearance.sockets[0].support.freeRadiusM = .05; invalid(clearance, 'support')
    const support = rock(); support.sockets[0].support.supportedRadiusM = .01; invalid(support, 'support')
  })
  it('rejects duplicate ids, unknown collision sources and collision counts beyond the 32-part core budget', () => {
    const value = rock(); value.primitives.push({ ...value.primitives[0] }); invalid(value, 'primitives.1.id')
    const unknown = rock(); unknown.collisionParts[0].sourceMesh = 'missing'; invalid(unknown, 'sourceMesh')
    const excessive = rock(); excessive.collisionParts = Array.from({ length: 33 }, (_, i) => ({ ...excessive.collisionParts[0], id: `part-${i}` })); invalid(excessive, 'collisionParts')
  })
})
