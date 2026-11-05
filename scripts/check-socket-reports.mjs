import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { inspectRockSockets } from '../src/rendering/assets/socket-inspector.ts'

const defaultRoot = fileURLToPath(new URL('..', import.meta.url))

function sameJsonValue(a, b) {
  // JSON has one numeric zero: serialization does not preserve the sign of -0.
  // Compare numbers exactly, with no rounding or tolerance.
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const aKeys = Object.keys(a), bKeys = Object.keys(b)
  return aKeys.length === bKeys.length && aKeys.every(key => Object.hasOwn(b, key) && sameJsonValue(a[key], b[key]))
}

function normalizedReport(report) {
  if (!Array.isArray(report.supportedSockets) || !Array.isArray(report.rejectedSockets) || !Array.isArray(report.measurements)) {
    throw new Error('missing supportedSockets, rejectedSockets or measurements arrays')
  }
  const normalized = structuredClone(report)
  for (const socket of normalized.supportedSockets) {
    if (typeof socket?.support?.evidence?.report !== 'string') throw new Error('missing socket support evidence report path')
    // Only this documented location may differ between packaged and docs reports.
    socket.support.evidence.report = '<report-path>'
  }
  return normalized
}

export async function checkSocketReports(root = defaultRoot) {
  const errors = [], summaries = []
  for (const side of ['left', 'right']) {
    const assetId = `live-rock-island-${side}`
    const assetPath = `src/rendering/assets/corals/${assetId}.glb`
    try {
      const bytes = await readFile(resolve(root, assetPath))
      const actual = inspectRockSockets(bytes, '<report-path>')
      summaries.push(`${side}: ${actual.supportedSockets.length} supported, ${actual.rejectedSockets.length} rejected; ${actual.sourceSha256}`)
      if (!actual.supportedSockets.length || actual.rejectedSockets.length) errors.push(`${side}: current geometry has no supported sockets or has rejected sockets`)
      const expected = normalizedReport(actual)
      const reportPaths = [
        `src/rendering/assets/corals/${assetId}-socket-report.json`,
        `docs/asset-evidence/aq52-${side}-socket-report.json`,
      ]
      for (const reportPath of reportPaths) {
        try {
          const report = JSON.parse(await readFile(resolve(root, reportPath), 'utf8'))
          if (report.sourceSha256 !== actual.sourceSha256) throw new Error(`stale sourceSha256: expected ${actual.sourceSha256}, found ${report.sourceSha256}`)
          const normalized = normalizedReport(report)
          if (!sameJsonValue(normalized, expected)) {
            const keys = [...new Set([...Object.keys(normalized), ...Object.keys(expected)])]
              .filter(key => !sameJsonValue(normalized[key], expected[key]))
            throw new Error(`socket results differ from current geometry (${keys.join(', ')})`)
          }
        } catch (error) {
          errors.push(`${reportPath}: ${error.message}`)
        }
      }
      if (!bytes.equals(await readFile(resolve(root, assetPath)))) errors.push(`${assetPath}: GLB changed during inspection; rerun the checker`)
    } catch (error) {
      errors.push(`${assetPath}: ${error.message}`)
    }
  }
  return { valid: errors.length === 0, summaries, errors }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  if (args.length > 1 || args.some(arg => arg.startsWith('--'))) {
    console.error('Usage: node scripts/check-socket-reports.mjs [repository-root]')
    process.exitCode = 1
  } else {
    const result = await checkSocketReports(args[0] ? resolve(args[0]) : defaultRoot)
    result.summaries.forEach(line => console.log(line))
    result.errors.forEach(line => console.error(line))
    if (!result.valid) process.exitCode = 1
  }
}
