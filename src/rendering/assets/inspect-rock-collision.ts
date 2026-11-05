import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { readRockCollisionGeometry } from './socket-inspector.ts'
import { buildRockCollisionReport } from './rock-collision.ts'

const usage = 'Usage: node src/rendering/assets/inspect-rock-collision.ts <source.glb> <new-report.json> --max-parts <1..16> [--require-passage]'
const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--help') console.log(`${usage}\nRead-only exact-geometry inspection. Refuses to overwrite reports; does not install collision metadata.`)
else {
  try {
    if (args.length < 4 || args.length > 5 || args[2] !== '--max-parts' || args.length === 5 && args[4] !== '--require-passage') throw new Error(usage)
    const source = resolve(args[0]), output = resolve(args[1])
    if (source === output) throw new Error('Report path must differ from source GLB')
    const bytes = await readFile(source)
    const report = buildRockCollisionReport(readRockCollisionGeometry(bytes), { maxParts: Number(args[3]), requirePassage: args[4] === '--require-passage' })
    if (!bytes.equals(await readFile(source))) throw new Error('GLB changed during inspection; rerun without promoting this result')
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
    console.log(`${report.assetId}: ${report.status}; ${report.candidateParts.length} candidate parts; ${report.sourceSha256}`)
    for (const probe of report.probes) console.log(`${probe.radiusM}m probe: mesh capsule=${probe.exactMeshCapsuleSafe}, mesh swept cube=${probe.exactMeshSweptCubeSafe}, current AABB route=${probe.currentCubeInflatedAabbRouteSafe}`)
    if (report.status !== 'validated-offline') process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1
  }
}
