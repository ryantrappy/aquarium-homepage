import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateAssetContract } from './contract'
// The script is intentionally plain .mjs and has no separate declaration file.
// @ts-expect-error Exercise the actual script parser rather than a test copy.
import { parseReefSyncArgs, syncReefOverride } from '../../../scripts/sync-reef-override.mjs'
// @ts-expect-error These are pure exported guards from the fish sync script.
import { extractShapeGuideFromOverride, fishOverrideFiles } from '../../../scripts/sync-blender-override.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const fishRoot = path.join(repoRoot, 'src/rendering/assets/splat-fish')
const fishWorkflowPaths = [
  'scripts/build-splat-fish-glbs.mjs',
  'src/rendering/assets/splat-fish/manifest.json',
  'src/rendering/assets/splat-fish/README.md',
  'src/rendering/assets/splat-fish/overrides/README.md',
  'src/rendering/assets/splat-fish/overrides/learned-shape-guide.json',
  'src/rendering/assets/splat-fish/blend/README.md',
]

function snapshotFishWorkflow(root: string) {
  return fishWorkflowPaths.map(relative => {
    const file = path.join(root, relative)
    if (!fs.existsSync(file)) return [relative, null]
    const digest = createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    return [relative, digest]
  })
}

function installFixtureInputs(root: string, id: string) {
  const copies = [
    [path.join(fishRoot, 'blend', `${id}.blend`), path.join(root, 'src/rendering/assets/splat-fish/blend', `${id}.blend`)],
    [path.join(fishRoot, 'overrides', `${id}.glb`), path.join(root, 'src/rendering/assets/splat-fish/overrides', `${id}.glb`)],
    [path.join(repoRoot, 'src/rendering/modeling', `build_${id.replaceAll('-', '_')}.py`), path.join(root, 'src/rendering/modeling', `build_${id.replaceAll('-', '_')}.py`)],
  ] as const
  for (const [source, destination] of copies) {
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, destination)
  }
  for (const relative of fishWorkflowPaths) {
    const source = path.join(repoRoot, relative), destination = path.join(root, relative)
    if (!fs.existsSync(source)) continue
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, destination)
  }
  return copies[1]![1]
}

function rewriteGlbJson(source: Buffer, mutate: (document: any) => void): Buffer {
  const jsonLength = source.readUInt32LE(12)
  const binHeaderOffset = 20 + jsonLength
  const binLength = source.readUInt32LE(binHeaderOffset)
  const document = JSON.parse(source.toString('utf8', 20, binHeaderOffset))
  mutate(document)
  const json = Buffer.from(JSON.stringify(document), 'utf8')
  const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20)
  json.copy(paddedJson)
  const bin = source.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength)
  const totalLength = 12 + 8 + paddedJson.length + 8 + bin.length
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)
  header.writeUInt32LE(paddedJson.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, paddedJson, binHeader, bin])
}

describe('reef sync CLI argument parser', () => {
  it('accepts a single reef identifier with the required guide flag', () => {
    expect(parseReefSyncArgs(['--reef', 'reef-center-arch', '--learn-guide'])).toBe('reef-center-arch')
    expect(parseReefSyncArgs(['--learn-guide', '--reef', 'reef-center-arch'])).toBe('reef-center-arch')
  })

  it.each(['blue-tang', 'ocellaris-clownfish', 'mandarin-dragonet'])(
    'rejects fish species ID %s in reef mode',
    fishId => {
      expect(() => parseReefSyncArgs(['--reef', fishId, '--learn-guide'])).toThrow()
    },
  )

  it.each([
    { args: ['--reef', 'reef-center-arch', '--learn-guide', '--install'] },
    { args: ['--reef', 'reef-center-arch', '--learn-guide', '--freeze', 'blue-tang'] },
    { args: ['--reef', '../reef-center-arch', '--learn-guide'] },
    { args: ['--reef', '/tmp/reef-center-arch', '--learn-guide'] },
    { args: ['--reef', 'src/rendering/assets/splat-fish/blue-tang', '--learn-guide'] },
  ])('rejects mixed or path-like arguments: $args', ({ args }) => {
    expect(() => parseReefSyncArgs(args)).toThrow()
  })

  it.each([
    { args: [] },
    { args: ['--reef'] },
    { args: ['--reef', '--learn-guide'] },
    { args: ['--reef', 'reef-center-arch'] },
    { args: ['--reef', 'reef-center-arch', '--learn-guide', '--learn-guide'] },
    { args: ['--reef', 'reef-center-arch', '--reef', 'reef-other-arch', '--learn-guide'] },
  ])('rejects missing or repeated flags: $args', ({ args }) => {
    expect(() => parseReefSyncArgs(args)).toThrow()
  })
})

describe('fish-only shape guide discovery', () => {
  it('sorts fish GLB overrides and excludes reef GLB overrides', () => {
    expect(fishOverrideFiles([
      'zebra-danio.png',
      'reef-center-arch.glb',
      'yellow-tang.glb',
      'blue-tang.glb',
      'reef-other-arch.glb',
    ])).toEqual(['blue-tang.glb', 'yellow-tang.glb'])
  })

  it('rejects direct shape-guide extraction for a reef ID before reading its file', () => {
    expect(() => extractShapeGuideFromOverride('reef-center-arch', '/missing/reef-center-arch.glb'))
      .toThrow(/fish shape guide from reef override/i)
  })
})

function fishWorkflowSnapshot() {
  return snapshotFishWorkflow(repoRoot)
}

describe('reef sync early CLI dispatch', () => {
  it('rejects invalid reef-plus-install invocation before fish workflow files change', () => {
    const before = fishWorkflowSnapshot()
    const script = path.join(repoRoot, 'scripts/sync-blender-override.mjs')
    const result = spawnSync(process.execPath, [script, '--reef', '../blue-tang', '--install'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 15_000,
    })
    const after = fishWorkflowSnapshot()

    expect(result.error).toBeUndefined()
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/--reef|rock identifier|Usage/i)
    expect(after).toEqual(before)
  })

  it('packages a valid reef source idempotently in an isolated fixture without touching fish workflow files', () => {
    const id = 'reef-center-arch'
    const beforeMainRepo = fishWorkflowSnapshot()
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reef-override-sync-'))
    const fixtureInputs = [
      [
        path.join(fishRoot, 'blend', `${id}.blend`),
        path.join(fixtureRoot, 'src/rendering/assets/splat-fish/blend', `${id}.blend`),
      ],
      [
        path.join(fishRoot, 'overrides', `${id}.glb`),
        path.join(fixtureRoot, 'src/rendering/assets/splat-fish/overrides', `${id}.glb`),
      ],
      [
        path.join(repoRoot, 'src/rendering/modeling', `build_${id.replaceAll('-', '_')}.py`),
        path.join(fixtureRoot, 'src/rendering/modeling', `build_${id.replaceAll('-', '_')}.py`),
      ],
    ] as const

    try {
      for (const [source, destination] of fixtureInputs) {
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        fs.copyFileSync(source, destination)
      }

      const firstEntry = syncReefOverride(fixtureRoot, id)
      const moduleDir = path.join(fixtureRoot, 'src/rendering/assets/corals/custom-rocks')
      const packagedPath = path.join(moduleDir, `${id}.glb`)
      const checkedInPackagedPath = path.join(repoRoot, firstEntry.path)
      const inspectionPath = path.join(moduleDir, `${id}-inspection.json`)
      const socketReportPath = path.join(moduleDir, `${id}-socket-report.json`)
      const manifestPath = path.join(moduleDir, 'manifest.json')
      const packagedBytes = fs.readFileSync(packagedPath)
      expect(packagedBytes).toEqual(fs.readFileSync(checkedInPackagedPath))
      const packagedHash = createHash('sha256').update(packagedBytes).digest('hex')
      const jsonLength = packagedBytes.readUInt32LE(12)
      const glbDoc = JSON.parse(packagedBytes.toString('utf8', 20, 20 + jsonLength))
      const inspection = JSON.parse(fs.readFileSync(inspectionPath, 'utf8'))
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const nativeBytes = fs.readFileSync(fixtureInputs[0][1])
      const overrideBytes = fs.readFileSync(fixtureInputs[1][1])
      const generatorBytes = fs.readFileSync(fixtureInputs[2][1])
      const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

      expect(firstEntry).toMatchObject({
        id,
        kind: 'rock',
        path: `src/rendering/assets/corals/custom-rocks/${id}.glb`,
        inspection: `src/rendering/assets/corals/custom-rocks/${id}-inspection.json`,
        nativeSha256: hash(nativeBytes),
        overrideSha256: hash(overrideBytes),
        generatorSha256: hash(generatorBytes),
        sha256: packagedHash,
      })
      expect(manifest).toMatchObject({ schema: 'custom-reef-modules-v1', assets: [firstEntry] })
      expect(inspection.extras.reefAsset).toMatchObject({ id, kind: 'rock', units: 'meter', upAxis: '+Y', origin: 'local' })
      expect(inspection.extras.reefAsset.provenance).toMatchObject({
        license: 'original',
        creator: 'Aquarium project',
        sourceSha256: hash(overrideBytes),
      })
      expect(glbDoc.nodes[glbDoc.scenes[glbDoc.scene ?? 0].nodes[0]].extras.reefAsset).toEqual(inspection.extras.reefAsset)
      const sockets = JSON.parse(fs.readFileSync(socketReportPath, 'utf8'))
      expect(sockets.supportedSockets.map((socket: { name: string }) => socket.name).sort()).toEqual([
        'socket_plate_ledge_11',
        'socket_soft_mat_11',
        'socket_soft_mat_12',
        'socket_sps_crest_11',
      ])
      expect(sockets.rejectedSockets).toEqual([])

      const manifestBeforeRepeat = fs.readFileSync(manifestPath)
      const packagedBeforeRepeat = fs.readFileSync(packagedPath)
      expect(syncReefOverride(fixtureRoot, id)).toEqual(firstEntry)
      expect(fs.readFileSync(manifestPath)).toEqual(manifestBeforeRepeat)
      expect(fs.readFileSync(packagedPath)).toEqual(packagedBeforeRepeat)
      expect(fishWorkflowSnapshot()).toEqual(beforeMainRepo)
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each([
    {
      label: 'a child mesh',
      mutate: (doc: any) => {
        const root = doc.nodes[doc.scenes[doc.scene ?? 0].nodes[0]]
        const childIndex = doc.nodes.length
        root.children.push(childIndex)
        doc.nodes.push({ name: 'socket_soft_mat_99', mesh: root.mesh, extras: { reefSocket: { role: 'coral-mount' } } })
      },
      expected: /one applied rock mesh root|empty coral socket intents/i,
    },
    {
      label: 'an unknown empty child',
      mutate: (doc: any) => {
        const root = doc.nodes[doc.scenes[doc.scene ?? 0].nodes[0]]
        root.children.push(doc.nodes.length)
        doc.nodes.push({ name: 'socket_soft_mat_99' })
      },
      expected: /empty coral socket intents/i,
    },
    {
      label: 'a socket moved off its supported footprint',
      mutate: (doc: any) => {
        const root = doc.nodes[doc.scenes[doc.scene ?? 0].nodes[0]]
        const movedSocket = doc.nodes[root.children[0]]
        movedSocket.translation = [0, 0, 10]
      },
      expected: /Unverified coral sockets/i,
    },
  ])('rejects $label before writing reef outputs and leaves fish workflow files unchanged', ({ mutate, expected }) => {
    const id = 'reef-center-arch'
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reef-override-invalid-'))
    try {
      const overridePath = installFixtureInputs(fixtureRoot, id)
      const input = fs.readFileSync(overridePath)
      fs.writeFileSync(overridePath, rewriteGlbJson(input, mutate))
      const fishBefore = snapshotFishWorkflow(fixtureRoot)
      const outputDir = path.join(fixtureRoot, 'src/rendering/assets/corals/custom-rocks')

      expect(() => syncReefOverride(fixtureRoot, id)).toThrow(expected)
      expect(fs.existsSync(outputDir)).toBe(false)
      expect(fishWorkflowPaths.map(relative => {
        const file = path.join(fixtureRoot, relative)
        return fs.existsSync(file) ? [relative, createHash('sha256').update(fs.readFileSync(file)).digest('hex')] : [relative, null]
      })).toEqual(fishBefore)
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('verifies the checked-in reef module provenance, contract, and total runtime GLB size', () => {
    const id = 'reef-center-arch'
    const customManifestPath = path.join(repoRoot, 'src/rendering/assets/corals/custom-rocks/manifest.json')
    const manifest = JSON.parse(fs.readFileSync(customManifestPath, 'utf8'))
    expect(manifest.schema).toBe('custom-reef-modules-v1')
    const entry = manifest.assets.find((asset: { id: string }) => asset.id === id)
    expect(entry).toBeDefined()
    if (!entry) return

    const installedBytes = fs.readFileSync(path.join(repoRoot, entry.path))
    const nativeBytes = fs.readFileSync(path.join(repoRoot, entry.nativePath))
    const overrideBytes = fs.readFileSync(path.join(repoRoot, entry.overridePath))
    const generatorBytes = fs.readFileSync(path.join(repoRoot, entry.generatorPath))
    const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
    expect(entry.nativeSha256).toBe(hash(nativeBytes))
    expect(entry.overrideSha256).toBe(hash(overrideBytes))
    expect(entry.generatorSha256).toBe(hash(generatorBytes))
    expect(entry.sha256).toBe(hash(installedBytes))
    expect(entry.bytes).toBe(installedBytes.length)

    const inspection = JSON.parse(fs.readFileSync(path.join(repoRoot, entry.inspection), 'utf8'))
    expect(validateAssetContract(inspection)).toMatchObject({ valid: true })
    expect(inspection.extras.reefAsset.provenance.sourceSha256).toBe(entry.overrideSha256)
    const jsonLength = installedBytes.readUInt32LE(12)
    const glbDoc = JSON.parse(installedBytes.toString('utf8', 20, 20 + jsonLength))
    const rootIndex = glbDoc.scenes[glbDoc.scene ?? 0].nodes[0]
    expect(glbDoc.nodes[rootIndex].extras.reefAsset).toEqual(inspection.extras.reefAsset)

    const runtimeGlbs = [
      path.join(repoRoot, 'src/rendering/assets/corals/reef-full-model-left.glb'),
      path.join(repoRoot, 'src/rendering/assets/corals/reef-full-model-right.glb'),
      path.join(repoRoot, entry.path),
    ]
    const totalRuntimeBytes = runtimeGlbs.reduce((total, file) => total + fs.statSync(file).size, 0)
    expect(totalRuntimeBytes).toBeLessThan(5_000_000)
  })
})
