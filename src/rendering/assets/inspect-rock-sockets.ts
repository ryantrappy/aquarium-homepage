import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { inspectRockSockets } from './socket-inspector.ts'

const usage = 'Usage: node src/rendering/assets/inspect-rock-sockets.ts <source.glb> <new-report.json>'
const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--help') {
  console.log(`${usage}\nInspects exported geometry without modifying the GLB. Refuses to overwrite reports.`)
} else if (args.length !== 2 || args.some(value => value.startsWith('--'))) {
  console.error(usage)
  process.exitCode = 1
} else {
  try {
    const [sourcePath, reportPath] = args.map(value => resolve(value))
    if (sourcePath === reportPath) throw new Error('The report path must differ from the source GLB')
    const bytes = await readFile(sourcePath)
    const report = inspectRockSockets(bytes, args[1])
    await mkdir(dirname(reportPath), { recursive: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
    console.log(`${report.supportedSockets.length} supported, ${report.rejectedSockets.length} rejected; ${report.sourceSha256}`)
    console.log(`Socket inspection written to ${reportPath}`)
    if (!report.supportedSockets.length || report.rejectedSockets.length) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
