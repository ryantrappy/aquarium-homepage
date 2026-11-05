import { readFile, stat, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { readRockCollisionGeometry } from '../src/rendering/assets/socket-inspector.ts'

const schema = 'rock-collision-geometry-fixture-v1'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const identity = { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
const usage = [
  'Capture: node scripts/capture-rock-collision-fixture.mjs <source.glb> <new.fixture.json.gz> --expected-source-sha256 <hash> --generator <generator.py>',
  'Check:   node scripts/capture-rock-collision-fixture.mjs --check <fixture.json.gz> [--source <live.glb>] [--generator <generator.py>]',
  'Check without --source validates fixture integrity only; it does not claim live-source freshness.',
].join('\n')

async function boundedRead(path, maxBytes) {
  if ((await stat(path)).size > maxBytes) throw new Error(`Input exceeds ${maxBytes} byte limit: ${path}`)
  const bytes = await readFile(path)
  if (bytes.length > maxBytes) throw new Error(`Input grew beyond ${maxBytes} byte limit: ${path}`)
  return bytes
}

function options(args, names) {
  const parsed = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!names.includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || parsed[args[i]] !== undefined) throw new Error(usage)
    parsed[args[i]] = args[i + 1]
  }
  return parsed
}

function indexedGeometry(source) {
  const positions = [], triangles = [], ids = new Map()
  for (const triangle of source.triangles) {
    const indices = []
    for (const point of [triangle.a, triangle.b, triangle.c]) {
      const key = JSON.stringify(point)
      if (!ids.has(key)) { ids.set(key, positions.length); positions.push([...point]) }
      indices.push(ids.get(key))
    }
    triangles.push(indices)
  }
  return { positions, triangles }
}

function validateFixture(value) {
  if (!value || value.schema !== schema || typeof value.assetId !== 'string' || !value.assetId || typeof value.primitiveId !== 'string' || !value.primitiveId
    || !digest(value.sourceSha256) || !digest(value.generatorSha256) || !digest(value.geometrySha256)
    || value.units !== 'meter' || value.upAxis !== '+Y' || value.coordinateSpace !== 'world'
    || JSON.stringify(value.rootTransform) !== JSON.stringify(identity)) throw new Error('Invalid fixture header, provenance hashes or identity meter/+Y scope')
  const provenance = value.provenance
  if (provenance?.license !== 'original' || ['creator', 'recipe', 'attribution'].some(key => typeof provenance[key] !== 'string' || !provenance[key].trim())) throw new Error('Require explicit custom-project provenance')
  if (!Array.isArray(value.positions) || value.positions.length < 3 || value.positions.length > 300_000
    || !value.positions.every(point => Array.isArray(point) && point.length === 3 && point.every(n => Number.isFinite(n) && Math.abs(n) <= 1000))) throw new Error('Invalid finite exact-position array')
  if (!Array.isArray(value.triangles) || !value.triangles.length || value.triangles.length > 100_000
    || !value.triangles.every(face => Array.isArray(face) && face.length === 3 && new Set(face).size === 3 && face.every(i => Number.isSafeInteger(i) && i >= 0 && i < value.positions.length))) throw new Error('Invalid indexed triangle array')
  if (!value.boundsM || ['min', 'max'].some(key => !Array.isArray(value.boundsM[key]) || value.boundsM[key].length !== 3)) throw new Error('Invalid fixture bounds')
  for (let axis = 0; axis < 3; axis++) {
    let low = Infinity, high = -Infinity
    for (const point of value.positions) { low = Math.min(low, point[axis]); high = Math.max(high, point[axis]) }
    if (!(low < high) || value.boundsM.min[axis] !== low || value.boundsM.max[axis] !== high) throw new Error('Fixture bounds do not match exact positions')
  }
  if (sha(JSON.stringify({ positions: value.positions, triangles: value.triangles })) !== value.geometrySha256) throw new Error('Fixture geometry digest mismatch')
  return value
}

const args = process.argv.slice(2)
try {
  if (args.length === 1 && args[0] === '--help') console.log(usage)
  else if (args[0] === '--check') {
    if (!args[1] || args[1].startsWith('--')) throw new Error(usage)
    const flags = options(args.slice(2), ['--source', '--generator'])
    const compressed = await boundedRead(resolve(args[1]), 8 * 1024 * 1024)
    const fixture = validateFixture(JSON.parse(gunzipSync(compressed, { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8')))
    if (flags['--source']) {
      const sourcePath = resolve(flags['--source']), bytes = await boundedRead(sourcePath, 32 * 1024 * 1024)
      if (sha(bytes) !== fixture.sourceSha256) throw new Error(`Live source mismatch: expected ${fixture.sourceSha256}, found ${sha(bytes)}`)
      const geometry = indexedGeometry(readRockCollisionGeometry(bytes))
      if (sha(JSON.stringify(geometry)) !== fixture.geometrySha256) throw new Error('Live exact geometry differs from the fixture')
      if (!bytes.equals(await boundedRead(sourcePath, 32 * 1024 * 1024))) throw new Error('Source bytes changed during check')
    }
    if (flags['--generator']) {
      const path = resolve(flags['--generator']), bytes = await boundedRead(path, 4 * 1024 * 1024)
      if (sha(bytes) !== fixture.generatorSha256) throw new Error(`Generator mismatch: expected ${fixture.generatorSha256}, found ${sha(bytes)}`)
      if (!bytes.equals(await boundedRead(path, 4 * 1024 * 1024))) throw new Error('Generator bytes changed during check')
    }
    console.log(JSON.stringify({ status: 'fixture-integrity-valid', fixtureSha256: sha(compressed), sourceSha256: fixture.sourceSha256, generatorSha256: fixture.generatorSha256, positions: fixture.positions.length, triangles: fixture.triangles.length, liveSourceChecked: Boolean(flags['--source']), generatorChecked: Boolean(flags['--generator']) }))
  } else {
    if (!args[0] || !args[1] || args[0].startsWith('--') || args[1].startsWith('--')) throw new Error(usage)
    const flags = options(args.slice(2), ['--expected-source-sha256', '--generator'])
    if (!digest(flags['--expected-source-sha256']) || !flags['--generator']) throw new Error(usage)
    const sourcePath = resolve(args[0]), outputPath = resolve(args[1]), generatorPath = resolve(flags['--generator'])
    if (outputPath === sourcePath || outputPath === generatorPath) throw new Error('Fixture output must differ from source and generator')
    const bytes = await boundedRead(sourcePath, 32 * 1024 * 1024), generatorBytes = await boundedRead(generatorPath, 4 * 1024 * 1024)
    if (sha(bytes) !== flags['--expected-source-sha256']) throw new Error(`Source hash mismatch: expected ${flags['--expected-source-sha256']}, found ${sha(bytes)}`)
    const source = readRockCollisionGeometry(bytes)
    const doc = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim())
    const metadata = doc.nodes[doc.scenes[doc.scene ?? 0].nodes[0]].extras.reefAsset
    if (metadata.provenance?.sourceSha256 !== sha(generatorBytes)) throw new Error('Generator bytes do not match embedded source provenance')
    const geometry = indexedGeometry(source)
    const fixture = validateFixture({
      schema, assetId: source.assetId, primitiveId: source.triangles[0].meshId,
      sourceSha256: source.sourceSha256, generatorSha256: sha(generatorBytes),
      provenance: { license: metadata.provenance.license, creator: metadata.provenance.creator, recipe: metadata.provenance.recipe, attribution: metadata.provenance.attribution },
      units: 'meter', upAxis: '+Y', coordinateSpace: 'world', rootTransform: identity, boundsM: source.boundsM,
      geometrySha256: sha(JSON.stringify(geometry)), ...geometry,
    })
    const json = JSON.stringify(fixture)
    const roundtrip = JSON.parse(json)
    for (let i = 0; i < source.triangles.length; i++) for (let corner = 0; corner < 3; corner++) {
      const before = [source.triangles[i].a, source.triangles[i].b, source.triangles[i].c][corner]
      const after = roundtrip.positions[roundtrip.triangles[i][corner]]
      if (!before.every((value, axis) => Object.is(value, after[axis]))) throw new Error('JSON roundtrip changed an exported coordinate')
    }
    const compressed = gzipSync(Buffer.from(json), { level: 9 })
    if (!bytes.equals(await boundedRead(sourcePath, 32 * 1024 * 1024)) || !generatorBytes.equals(await boundedRead(generatorPath, 4 * 1024 * 1024))) throw new Error('Source or generator changed during capture')
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, compressed, { flag: 'wx' })
    console.log(JSON.stringify({ status: 'captured-technical-geometry', fixtureSha256: sha(compressed), sourceSha256: fixture.sourceSha256, generatorSha256: fixture.generatorSha256, geometrySha256: fixture.geometrySha256, bytes: compressed.length, positions: fixture.positions.length, triangles: fixture.triangles.length }))
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1
}
