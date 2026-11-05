import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { analyzeFishClipEnvelope, type BoundedFishOverlayContract, type BoundedFishOverlayInput, type FishClipEnvelopeOptions } from './fish-clip-envelope'

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const point = (a: number[]) => new Vector3(a[0], a[1], a[2])
const quat = (axis: number[], angle: number) => new Quaternion().setFromAxisAngle(point(axis).normalize(), angle).toArray()
const identity = [0, 0, 0, 1]
type Config = {
  positions?: number[][]; weights?: number[][]; palette?: number[][]
  translations?: number[][]; scales?: number[][]; rotations?: number[][][]
  clipTranslations?: number[][]; clipScales?: number[][]
  mutate?: (doc: any) => void
}

/** Independent, small indexed two-joint GLB. Test pose evaluation uses direct
 * global matrices, not the analyzer's bound/telescope implementation. */
function fixture(config: Config = {}) {
  const positions = (config.positions ?? [[.005, .006, .04], [-.005, -.003, .035], [.002, .004, -.04]]).map(v => v.map(Math.fround))
  const weights = config.weights ?? [[.25, .75, 0, 0], [.4, .6, 0, 0], [0, 1, 0, 0]]
  const palette = config.palette ?? positions.map(() => [0, 1, 0, 0])
  const translations = config.translations ?? [[0, 0, .03], [0, 0, -.04]]
  const scales = config.scales ?? [[1, 1, 1], [1, 1, 1]]
  const rotations = config.rotations ?? [
    [quat([0, 1, 0], -.25), quat([0, 1, 0], .3)],
    [quat([1, 0, 0], -.4), quat([1, 0, 0], .5)],
  ]
  const bin = Buffer.alloc(Math.max(8192, positions.length * 64 + 4096)), views: any[] = [], accessors: any[] = []; let offset = 0
  function add(rows: number[][], type: string, componentType = 5126) {
    offset = Math.ceil(offset / 4) * 4
    const start = offset, size = componentType === 5126 ? 4 : 2
    for (const row of rows) for (const x of row) { if (componentType === 5126) bin.writeFloatLE(x, offset); else bin.writeUInt16LE(x, offset); offset += size }
    const view = views.push({ buffer: 0, byteOffset: start, byteLength: offset - start }) - 1
    return accessors.push({ bufferView: view, componentType, count: rows.length, type }) - 1
  }
  const positionAccessor = add(positions, 'VEC3'), weightsAccessor = add(weights, 'VEC4'), jointsAccessor = add(palette, 'VEC4', 5123), indices = add([[0], [1], [2]], 'SCALAR', 5123)
  const bind0 = new Matrix4().compose(point(translations[0]), new Quaternion(), point(scales[0]))
  const bind1 = bind0.clone().multiply(new Matrix4().compose(point(translations[1]), new Quaternion(), point(scales[1])))
  const inverseBinds = [bind0.clone().invert(), bind1.clone().invert()]
  const inverseAccessor = add(inverseBinds.map(m => m.toArray()), 'MAT4'), times = add([[0], [1]], 'SCALAR')
  const samplers: any[] = [], channels: any[] = []
  for (let j = 0; j < 2; j++) for (const path of ['translation', 'rotation', 'scale']) {
    const values = path === 'rotation' ? rotations[j] : [
      (path === 'translation' ? config.clipTranslations ?? translations : config.clipScales ?? scales)[j],
      (path === 'translation' ? config.clipTranslations ?? translations : config.clipScales ?? scales)[j],
    ]
    const output = add(values, path === 'rotation' ? 'VEC4' : 'VEC3')
    const sampler = samplers.push({ input: times, output, interpolation: path === 'rotation' ? 'LINEAR' : 'STEP' }) - 1
    channels.push({ sampler, target: { node: j + 2, path } })
  }
  const dimensions = [0, 1, 2].map(i => Math.max(...positions.map(v => v[i])) - Math.min(...positions.map(v => v[i])))
  const doc: any = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [
      { children: [1, 2], extras: { reefAsset: { schema: 'reef-asset-v1', id: 'fixture-fish', kind: 'fish', units: 'meter', upAxis: '+Y', origin: 'local', dimensionsM: dimensions } } },
      { mesh: 0, skin: 0 }, { name: 'spine_0', translation: translations[0], scale: scales[0], children: [3] }, { name: 'pectoral_L', translation: translations[1], scale: scales[1] },
    ],
    meshes: [{ primitives: [{ mode: 4, attributes: { POSITION: positionAccessor, JOINTS_0: jointsAccessor, WEIGHTS_0: weightsAccessor }, indices }] }],
    skins: [{ joints: [2, 3], inverseBindMatrices: inverseAccessor }], animations: [{ name: 'test-swim', channels, samplers }],
    accessors, bufferViews: views, buffers: [{ byteLength: offset }],
  }
  config.mutate?.(doc)
  const text = Buffer.from(JSON.stringify(doc)), json = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(json)
  const binary = Buffer.alloc(Math.ceil(offset / 4) * 4); bin.copy(binary, 0, 0, offset)
  const bytes = Buffer.alloc(28 + json.length + binary.length)
  bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8)
  bytes.writeUInt32LE(json.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); json.copy(bytes, 20)
  bytes.writeUInt32LE(binary.length, 20 + json.length); bytes.writeUInt32LE(0x004e4942, 24 + json.length); binary.copy(bytes, 28 + json.length)
  const options: FishClipEnvelopeOptions = {
    expectedSha256: sha(bytes), clipName: 'test-swim', sourceReference: { lengthAxis: '+Z', lengthM: dimensions[2], authority: 'Explicit synthetic +Z source contract' }, adultLengthM: dimensions[2], composition: 'single-clip',
  }
  const at = (time: number, localRotations: { axis: number[]; angle: number }[][] = [[], []]) => {
    const matrices = rotations.map((keys, j) => {
      const q = new Quaternion().fromArray(keys[0]).normalize().slerp(new Quaternion().fromArray(keys[1]).normalize(), time)
      for (const r of localRotations[j]) q.multiply(new Quaternion().setFromAxisAngle(point(r.axis), r.angle)).normalize()
      return new Matrix4().compose(point((config.clipTranslations ?? translations)[j]), q, point((config.clipScales ?? scales)[j]))
    })
    matrices[1].premultiply(matrices[0])
    return positions.map((p, i) => {
      const w = weights[i].map(Math.fround), sum = w.reduce((a, b) => a + b, 0), result = new Vector3()
      for (let k = 0; k < 4; k++) if (w[k]) result.addScaledVector(point(p).applyMatrix4(inverseBinds[palette[i][k]]).applyMatrix4(matrices[palette[i][k]]), Math.fround(w[k] * (1 / sum)))
      return result
    })
  }
  return { bytes, options, at }
}

function boundedOverlay(input: ReturnType<typeof fixture>, mutate?: (document: BoundedFishOverlayContract) => void): BoundedFishOverlayInput {
  const producerBytes = Buffer.from('Synthetic test-only reviewed rotation producer; no runtime authority.'), resetAdapterBytes = Buffer.from('Synthetic test-only reset/capture adapter; no runtime authority.')
  const document: BoundedFishOverlayContract = {
    schema: 'bounded-fish-overlay-v1', sourceSha256: input.options.expectedSha256, clipName: input.options.clipName,
    producerSha256: sha(producerBytes), resetAdapterSha256: sha(resetAdapterBytes), verification: 'root-reviewed-source-and-reset',
    reviewEvidence: 'Synthetic explicit attestation fixture; not a review of real renderer code.',
    resetPolicy: 'restore-clean-before-mixer-normalize-capture-before-overlay', quaternionComposition: 'clip-times-ordered-local-rotations',
    joints: [
      { nodeIndex: 2, jointName: 'spine_0', rotations: [{ axis: [0, 0, 1], maxAbsAngleRad: .2 }] },
      { nodeIndex: 3, jointName: 'pectoral_L', rotations: [{ axis: [0, 0, 1], maxAbsAngleRad: .483 }, { axis: [1, 0, 0], maxAbsAngleRad: .24 }] },
    ],
  }
  mutate?.(document)
  const contractBytes = Buffer.from(JSON.stringify(document))
  return { contractBytes, expectedContractSha256: sha(contractBytes), producerBytes, resetAdapterBytes }
}

function ready(input: ReturnType<typeof fixture>) {
  const result = analyzeFishClipEnvelope(input.bytes, input.options)
  expect(result.status, result.status === 'unavailable' ? result.reason : '').toBe('ready')
  if (result.status !== 'ready') throw Error(result.reason)
  return result.clipOnly
}

describe('analytic clip-only fish sphere', () => {
  it('covers hierarchical weighted vertices and triangle interiors over complete interpolated motion', () => {
    const input = fixture(), certificate = ready(input)
    expect(certificate.scope).toBe('single-clip-only')
    expect(certificate.proof.sampledPosesUsedAsProof).toBe(false)
    for (let step = 0; step <= 400; step++) {
      const points = input.at(step / 400)
      for (const p of [...points, points[0].clone().multiplyScalar(.2).addScaledVector(points[1], .3).addScaledVector(points[2], .5)]) expect(p.length()).toBeLessThanOrEqual(certificate.radiusM)
    }
  })
  it('includes an interior SLERP maximum that exceeds both endpoint extents', () => {
    const input = fixture({ positions: [[-.01, 0, -.05], [.01, 0, -.05], [0, .005, -.045]], weights: Array.from({ length: 3 }, () => [1, 0, 0, 0]),
      rotations: [[quat([1, 0, 0], -2), quat([1, 0, 0], 2)], [identity, identity]] })
    const certificate = ready(input), endpoints = Math.max(...input.at(0).map(p => p.length()), ...input.at(1).map(p => p.length()))
    const middle = Math.max(...input.at(.5).map(p => p.length()))
    expect(middle).toBeGreaterThan(endpoints + .01)
    expect(certificate.radiusM).toBeGreaterThanOrEqual(middle)
  })
  it('retains translated pivots, constant clip translations and nonuniform scale operator norms', () => {
    const input = fixture({ scales: [[1.4, .75, 1.2], [.8, 1.1, 1.3]], clipScales: [[1.4000001, .75, 1.2], [.8, 1.1, 1.3]], clipTranslations: [[.002, 0, .03], [0, 0, -.04]] })
    const certificate = ready(input)
    for (let step = 0; step <= 300; step++) for (const p of input.at(step / 300)) expect(p.length()).toBeLessThanOrEqual(certificate.radiusM)
    expect(certificate.numerics.paddingM).toBeGreaterThan(0)
  })
  it('keeps quaternion sign equivalence and explicit adult metric scale', () => {
    const rotations = [[quat([0, 1, 0], -.2), quat([0, 1, 0], .3)], [identity, identity]]
    const a = fixture({ rotations }), b = fixture({ rotations: rotations.map(keys => keys.map(q => q.map(v => -v))) })
    const ca = ready(a), cb = ready(b)
    expect(cb.radiusM).toBeCloseTo(ca.radiusM, 10)
    const doubled = analyzeFishClipEnvelope(a.bytes, { ...a.options, adultLengthM: a.options.adultLengthM * 2 })
    expect(doubled.status).toBe('ready')
    if (doubled.status === 'ready') expect(doubled.clipOnly.radiusM).toBeCloseTo(ca.radiusM * 2, 7)
  })
  it('includes Float32 weight normalization and near-unit quaternion error allowances', () => {
    const input = fixture({ weights: [[.33333334, .6666667, 0, 0], [.4, .60000002, 0, 0], [0, 1, 0, 0]],
      rotations: [[quat([0, 1, 0], .2).map(v => v * 1.0000001), quat([0, 1, 0], .3)], [identity, identity]] })
    const certificate = ready(input)
    expect(certificate.numerics.maxSourceQuaternionNormError).toBeGreaterThan(0)
    expect(certificate.numerics.sourceQuaternionNormAllowanceM).toBeGreaterThan(0)
    expect(certificate.numerics.sourceWeightSumRange[1]).toBeGreaterThan(1)
    for (const p of input.at(.5)) expect(p.length()).toBeLessThan(certificate.radiusM)
  })
  it.each(['procedural-overlay', 'clip-blend'] as const)('refuses %s playback even with a separately qualified clip-only sphere', composition => {
    const input = fixture(), result = analyzeFishClipEnvelope(input.bytes, { ...input.options, composition })
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') { expect(result.reason).toContain('must not certify'); expect(result.clipOnly?.scope).toBe('single-clip-only') }
  })
  it('selects the explicitly bounded overlay sphere while retaining a separate clip-only comparison', () => {
    const input = fixture({ scales: [[1.2, .8, 1.1], [1, 1.1, .9]] })
    const result = analyzeFishClipEnvelope(input.bytes, { ...input.options, composition: 'procedural-overlay', boundedOverlay: boundedOverlay(input) })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') throw Error(result.reason)
    expect(result.activeEnvelope.scope).toBe('bounded-procedural-overlay')
    expect(result.clipOnly.scope).toBe('single-clip-only')
    expect(result.activeEnvelope.radiusM).toBeGreaterThan(result.clipOnly.radiusM)
    expect(result.activeEnvelope.numerics.scalarOperationBudget).toBeGreaterThan(result.clipOnly.numerics.scalarOperationBudget)
    // Independent pose regressions supplement, and do not replace, the analytic
    // all-angle product/telescope proof. Two pectoral axes compose in order.
    for (let step = 0; step <= 40; step++) for (const spine of [-.2, 0, .2]) for (const flare of [-.483, 0, .483]) for (const pitch of [-.24, 0, .24]) {
      const points = input.at(step / 40, [[{ axis: [0, 0, 1], angle: spine }], [{ axis: [0, 0, 1], angle: flare }, { axis: [1, 0, 0], angle: pitch }]])
      for (const p of points) expect(p.length()).toBeLessThanOrEqual(result.activeEnvelope.radiusM)
    }
    if (result.activeEnvelope.scope === 'bounded-procedural-overlay') expect(result.activeEnvelope.overlay.verification).toBe('source-bytes-verified-semantics-root-attested')
  })
  it.each([
    ['unreviewed', (d: any) => { d.verification = 'unverified-until-root-asset-and-reset-review' }],
    ['unbound fish', (d: any) => { d.sourceSha256 = '0'.repeat(64) }],
    ['wrong clip', (d: any) => { d.clipName = 'other' }],
    ['old reset policy', (d: any) => { d.resetPolicy = 'mixer-update-before-overlay' }],
    ['wrong order', (d: any) => { d.quaternionComposition = 'overlay-times-clip' }],
    ['missing palette joint', (d: any) => { d.joints.pop() }],
    ['duplicate joint', (d: any) => { d.joints[1] = d.joints[0] }],
    ['wrong node id', (d: any) => { d.joints[1].nodeIndex = 0 }],
    ['wrong joint name', (d: any) => { d.joints[1].jointName = 'other' }],
    ['nonunit axis', (d: any) => { d.joints[1].rotations[0].axis = [0, 0, 2] }],
    ['negative cap', (d: any) => { d.joints[1].rotations[0].maxAbsAngleRad = -.1 }],
    ['nonfinite cap', (d: any) => { d.joints[1].rotations[0].maxAbsAngleRad = Infinity }],
    ['unbounded cap', (d: any) => { d.joints[1].rotations[0].maxAbsAngleRad = 100 }],
    ['too many local rotations', (d: any) => { d.joints[1].rotations.push(d.joints[1].rotations[0]) }],
    ['missing semantic review', (d: any) => { d.reviewEvidence = '' }],
    ['stale producer', (d: any) => { d.producerSha256 = '0'.repeat(64) }],
    ['stale reset adapter', (d: any) => { d.resetAdapterSha256 = '0'.repeat(64) }],
  ])('refuses bounded overlay with %s', (_, mutate) => {
    const input = fixture()
    expect(analyzeFishClipEnvelope(input.bytes, { ...input.options, composition: 'procedural-overlay', boundedOverlay: boundedOverlay(input, mutate) }).status).toBe('unavailable')
  })
  it('rejects stale/oversize overlay evidence bytes and unexpected overlay configuration', () => {
    const input = fixture(), evidence = boundedOverlay(input)
    for (const changed of [
      { ...evidence, expectedContractSha256: '0'.repeat(64) }, { ...evidence, producerBytes: Buffer.from('changed') },
      { ...evidence, resetAdapterBytes: Buffer.from('changed') }, { ...evidence, contractBytes: Buffer.alloc(65537) },
      { ...evidence, producerBytes: Buffer.alloc(262145) },
    ]) expect(analyzeFishClipEnvelope(input.bytes, { ...input.options, composition: 'procedural-overlay', boundedOverlay: changed }).status).toBe('unavailable')
    expect(analyzeFishClipEnvelope(input.bytes, { ...input.options, boundedOverlay: evidence }).status).toBe('unavailable')
  })
  it.each([
    ['morph', (d: any) => { d.meshes[0].primitives[0].targets = [{ POSITION: 0 }] }],
    ['cubic', (d: any) => { d.animations[0].samplers[1].interpolation = 'CUBICSPLINE' }],
    ['animated translation', (d: any) => { d.animations[0].samplers[0].interpolation = 'LINEAR' }],
    ['blend clips', (d: any) => { d.animations.push(d.animations[0]) }],
    ['node extension', (d: any) => { d.nodes[2].extensions = { KHR_materials_specular: {} } }],
    ['accessor extension', (d: any) => { d.accessors[0].extensions = { EXT_meshopt_compression: {} } }],
    ['required extension', (d: any) => { d.extensionsRequired = ['KHR_materials_specular'] }],
    ['unknown material extension', (d: any) => { d.materials = [{ extensions: { EXT_unknown: {} } }] }],
    ['invalid bind', (d: any) => { d.nodes[2].translation = [0, 0, .08] }],
    ['root scale', (d: any) => { d.nodes[0].scale = [2, 2, 2] }],
    ['mesh transform', (d: any) => { d.nodes[1].translation = [1, 0, 0] }],
    ['inactive node', (d: any) => { d.nodes.push({}) }],
    ['cycle', (d: any) => { d.nodes[3].children = [2] }],
    ['accessor bounds', (d: any) => { d.accessors[0].byteOffset = 1000000 }],
    ['sparse', (d: any) => { d.accessors[0].sparse = {} }],
    ['excessive count', (d: any) => { d.accessors[0].count = 50001 }],
    ['duplicate animation target', (d: any) => { d.animations[0].channels.push(d.animations[0].channels[0]) }],
  ])('fails unavailable on %s', (_, mutate) => {
    const input = fixture({ mutate }), result = analyzeFishClipEnvelope(input.bytes, input.options)
    expect(result.status).toBe('unavailable')
  })
  it.each([
    [[-1, 2, 0, 0], 'negative'], [[0, 0, 0, 0], 'zero'], [[.1, .2, 0, 0], 'malformed sum'], [[NaN, 1, 0, 0], 'nonfinite'],
  ] as [number[], string][])('rejects %s skin weights (%s)', (bad) => {
    const input = fixture({ weights: [bad, [1, 0, 0, 0], [1, 0, 0, 0]] })
    expect(analyzeFishClipEnvelope(input.bytes, input.options).status).toBe('unavailable')
  })
  it('permits only the approved material-only specular attachment/declaration', () => {
    const input = fixture({ mutate: d => { d.materials = [{ extensions: { KHR_materials_specular: { specularColorFactor: [1.08, 1.08, 1.08] } } }]; d.extensionsUsed = ['KHR_materials_specular'] } })
    expect(ready(input).radiusM).toBeGreaterThan(0)
  })
  it('rejects wrong provenance, inferred/unmatched axis reference and invalid scale inputs', () => {
    const input = fixture()
    for (const options of [
      { ...input.options, expectedSha256: '0'.repeat(64) }, { ...input.options, adultLengthM: Infinity }, { ...input.options, adultLengthM: -1 },
      { ...input.options, sourceReference: { ...input.options.sourceReference, lengthM: .4 } },
      { ...input.options, sourceReference: { ...input.options.sourceReference, lengthAxis: '+X' } },
      { ...input.options, sourceReference: { ...input.options.sourceReference, authority: '' } },
      { ...input.options, composition: 'guess' },
    ]) expect(analyzeFishClipEnvelope(input.bytes, options as FishClipEnvelopeOptions).status).toBe('unavailable')
    expect(analyzeFishClipEnvelope(Buffer.alloc(16 * 1024 * 1024 + 1), input.options).status).toBe('unavailable')
    expect(analyzeFishClipEnvelope(input.bytes.subarray(0, 20), input.options).status).toBe('unavailable')
  })
  it('snapshots metric/reference inputs once instead of accepting state changes through getters', () => {
    const input = fixture(); let adultReads = 0, referenceReads = 0
    Object.defineProperty(input.options, 'adultLengthM', { get: () => ++adultReads === 1 ? .08 : Infinity })
    Object.defineProperty(input.options.sourceReference, 'lengthM', { get: () => ++referenceReads === 1 ? Math.fround(.04) - Math.fround(-.04) : 1 })
    const certificate = ready(input)
    expect(adultReads).toBe(1); expect(referenceReads).toBe(1)
    expect(certificate.adultLengthM).toBe(.08)
  })
  it('stops a supported-size dense skin at the shared analyzer work ceiling', () => {
    const input = fixture({ positions: Array.from({ length: 50_000 }, (_, i) => [i % 2 ? .005 : -.005, i % 3 ? .004 : -.003, i % 2 ? .04 : -.04]),
      weights: Array.from({ length: 50_000 }, () => [.25, .25, .25, .25]), palette: Array.from({ length: 50_000 }, () => [1, 1, 1, 1]) })
    const result = analyzeFishClipEnvelope(input.bytes, input.options)
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') expect(result.reason).toBe('Analyzer work limit exceeded')
  })
  it('keeps the CLI read-only and distinguishes explicit clip/overlay results and malformed flags', () => {
    const input = fixture(), directory = mkdtempSync(join(tmpdir(), 'fish-clip-envelope-'))
    try {
      const path = join(directory, 'fixture.glb'); writeFileSync(path, input.bytes)
      const args = [fileURLToPath(new URL('../../../scripts/inspect-fish-clip-envelope.mjs', import.meta.url)), path,
        '--expected-sha256', input.options.expectedSha256, '--clip', input.options.clipName, '--source-length-axis', '+Z',
        '--source-length-m', String(input.options.sourceReference.lengthM), '--source-authority', 'Synthetic explicit source axis',
        '--adult-length-m', String(input.options.adultLengthM), '--composition', 'single-clip']
      const clip = spawnSync(process.execPath, args, { encoding: 'utf8' })
      expect(clip.status, clip.stderr).toBe(0)
      expect(JSON.parse(clip.stdout).clipOnly.scope).toBe('single-clip-only')
      const overlayArgs = args.map(a => a === 'single-clip' ? 'procedural-overlay' : a)
      const overlay = spawnSync(process.execPath, overlayArgs, { encoding: 'utf8' })
      expect(overlay.status).toBe(1); expect(JSON.parse(overlay.stdout).status).toBe('unavailable')
      const evidence = boundedOverlay(input), contract = { ...JSON.parse(Buffer.from(evidence.contractBytes).toString('utf8')), producerPath: 'producer.ts', resetAdapterPath: 'reset.ts' }
      const contractPath = join(directory, 'overlay.json'), contractBytes = Buffer.from(JSON.stringify(contract))
      writeFileSync(contractPath, contractBytes); writeFileSync(join(directory, 'producer.ts'), evidence.producerBytes); writeFileSync(join(directory, 'reset.ts'), evidence.resetAdapterBytes)
      const boundedArgs = [...overlayArgs, '--bounded-overlay-contract', contractPath, '--expected-overlay-contract-sha256', sha(contractBytes)]
      const bounded = spawnSync(process.execPath, boundedArgs, { encoding: 'utf8' })
      expect(bounded.status, bounded.stderr).toBe(0)
      expect(JSON.parse(bounded.stdout).activeEnvelope.scope).toBe('bounded-procedural-overlay')
      writeFileSync(join(directory, 'reset.ts'), 'changed reset adapter')
      const stale = spawnSync(process.execPath, boundedArgs, { encoding: 'utf8' })
      expect(stale.status).toBe(1); expect(JSON.parse(stale.stdout).status).toBe('unavailable')
      expect(spawnSync(process.execPath, [...overlayArgs, '--bounded-overlay-contract', contractPath]).status).toBe(1)
      for (const extra of [['--unknown', 'x'], ['--adult-length-m', '.08']]) expect(spawnSync(process.execPath, [...args, ...extra]).status).toBe(1)
      expect(readFileSync(path).equals(input.bytes)).toBe(true)
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
})
