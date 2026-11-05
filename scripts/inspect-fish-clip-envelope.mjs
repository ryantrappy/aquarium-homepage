import { readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { analyzeFishClipEnvelope } from '../src/rendering/assets/fish-clip-envelope.ts'

const usage = 'Usage: node scripts/inspect-fish-clip-envelope.mjs <fish.glb> --expected-sha256 <hash> --clip <name> --source-length-axis +Z --source-length-m <meters> --source-authority <verified-reference> --adult-length-m <meters> --composition <single-clip|procedural-overlay|clip-blend> [--bounded-overlay-contract <json> --expected-overlay-contract-sha256 <hash>]'
const required = ['--expected-sha256', '--clip', '--source-length-axis', '--source-length-m', '--source-authority', '--adult-length-m', '--composition']
const names = [...required, '--bounded-overlay-contract', '--expected-overlay-contract-sha256']
const limit = 16 * 1024 * 1024
async function boundedRead(path, maxBytes = limit) {
  if ((await stat(path)).size > maxBytes) throw Error('Input exceeds byte limit')
  const bytes = await readFile(path)
  if (bytes.length > maxBytes) throw Error('Input grew beyond byte limit')
  return bytes
}
try {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--help') console.log(usage)
  else {
    if (!args[0] || args[0].startsWith('--')) throw Error(usage)
    const flags = {}
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i], value = args[i + 1]
      if (!names.includes(key) || value === undefined || value.startsWith('--') || Object.hasOwn(flags, key)) throw Error(usage)
      flags[key] = value
    }
    if (!required.every(name => Object.hasOwn(flags, name))) throw Error(usage)
    if (Boolean(flags['--bounded-overlay-contract']) !== Boolean(flags['--expected-overlay-contract-sha256'])) throw Error('Bounded overlay requires both contract path and expected hash')
    const decimal = value => {
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) throw Error('Lengths require explicit finite decimal meters')
      return Number(value)
    }
    const source = resolve(args[0]), bytes = await boundedRead(source)
    const snapshots = [{ path: source, bytes, limit }]
    let boundedOverlay
    if (flags['--bounded-overlay-contract']) {
      if (flags['--composition'] !== 'procedural-overlay') throw Error('Bounded overlay contract requires procedural-overlay composition')
      const contractPath = resolve(flags['--bounded-overlay-contract']), contractBytes = await boundedRead(contractPath, 64 * 1024)
      const expectedContractSha256 = flags['--expected-overlay-contract-sha256']
      if (!/^[a-f0-9]{64}$/.test(expectedContractSha256) || createHash('sha256').update(contractBytes).digest('hex') !== expectedContractSha256) throw Error('Overlay contract hash mismatch')
      const contract = JSON.parse(contractBytes.toString('utf8'))
      if (typeof contract.producerPath !== 'string' || !contract.producerPath || typeof contract.resetAdapterPath !== 'string' || !contract.resetAdapterPath) throw Error('CLI overlay contract requires producerPath and resetAdapterPath')
      const producerPath = resolve(dirname(contractPath), contract.producerPath), resetPath = resolve(dirname(contractPath), contract.resetAdapterPath)
      const producerBytes = await boundedRead(producerPath, 256 * 1024), resetAdapterBytes = await boundedRead(resetPath, 256 * 1024)
      snapshots.push({ path: contractPath, bytes: contractBytes, limit: 64 * 1024 }, { path: producerPath, bytes: producerBytes, limit: 256 * 1024 }, { path: resetPath, bytes: resetAdapterBytes, limit: 256 * 1024 })
      boundedOverlay = { contractBytes, expectedContractSha256, producerBytes, resetAdapterBytes }
    }
    const result = analyzeFishClipEnvelope(bytes, {
      expectedSha256: flags['--expected-sha256'], clipName: flags['--clip'],
      sourceReference: { lengthAxis: flags['--source-length-axis'], lengthM: decimal(flags['--source-length-m']), authority: flags['--source-authority'] },
      adultLengthM: decimal(flags['--adult-length-m']), composition: flags['--composition'], boundedOverlay,
    })
    for (const snapshot of snapshots) if (!snapshot.bytes.equals(await boundedRead(snapshot.path, snapshot.limit))) throw Error('Source/contract/producer/reset changed during inspection; discard the result and rerun')
    console.log(JSON.stringify(result, null, 2))
    if (result.status !== 'ready') process.exitCode = 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
