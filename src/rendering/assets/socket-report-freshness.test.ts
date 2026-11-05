import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { inspectRockSockets } from './socket-inspector'

const repository = fileURLToPath(new URL('../../../', import.meta.url))
const checker = join(repository, 'scripts/check-socket-reports.mjs')
const temporaryRoots: string[] = []

function checkSocketReports(root: string) {
  const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' })
  return {
    valid: result.status === 0,
    summaries: result.stdout.trim().split('\n').filter(Boolean),
    errors: result.stderr.trim().split('\n').filter(Boolean),
  }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'socket-report-freshness-'))
  temporaryRoots.push(root)
  for (const side of ['left', 'right']) {
    const asset = `src/rendering/assets/corals/live-rock-island-${side}.glb`
    const bytes = await readFile(join(repository, asset))
    await mkdir(dirname(join(root, asset)), { recursive: true })
    await writeFile(join(root, asset), bytes)
    for (const reportPath of [`src/rendering/assets/corals/live-rock-island-${side}-socket-report.json`, `docs/asset-evidence/aq52-${side}-socket-report.json`]) {
      await mkdir(dirname(join(root, reportPath)), { recursive: true })
      await writeFile(join(root, reportPath), JSON.stringify(inspectRockSockets(bytes, reportPath)))
    }
  }
  return root
}

async function changeReport(root: string, reportPath: string, change: (report: any) => void) {
  const path = join(root, reportPath)
  const report = JSON.parse(await readFile(path, 'utf8'))
  change(report)
  await writeFile(path, JSON.stringify(report))
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('socket report freshness', () => {
  it('accepts independently generated reports with different documented report paths and leaves inputs unchanged', async () => {
    const root = await fixture()
    const path = join(root, 'src/rendering/assets/corals/live-rock-island-left.glb')
    const reportPath = join(root, 'docs/asset-evidence/aq52-left-socket-report.json')
    const before = await Promise.all([readFile(path), readFile(reportPath)])
    const result = await checkSocketReports(root)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.summaries).toHaveLength(2)
    expect(result.summaries[0]).toMatch(/^left: \d+ supported, 0 rejected; [a-f0-9]{64}$/)
    expect(result.summaries[1]).toMatch(/^right: \d+ supported, 0 rejected; [a-f0-9]{64}$/)
    expect(await Promise.all([readFile(path), readFile(reportPath)])).toEqual(before)
  })

  it('exits nonzero when a docs report has a stale source hash', async () => {
    const root = await fixture()
    await changeReport(root, 'docs/asset-evidence/aq52-left-socket-report.json', report => { report.sourceSha256 = '0'.repeat(64) })
    const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('aq52-left-socket-report.json: stale sourceSha256')
    expect(result.stdout).toContain('right:')
  })

  it('exits nonzero when packaged measured results change despite a matching source hash', async () => {
    const root = await fixture()
    await changeReport(root, 'src/rendering/assets/corals/live-rock-island-right-socket-report.json', report => { report.measurements[0].data.socketToSurfaceDistanceM += .01 })
    const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('socket results differ from current geometry (measurements)')
  })

  it('does not normalize unrelated evidence fields or metadata', async () => {
    const root = await fixture()
    await changeReport(root, 'docs/asset-evidence/aq52-left-socket-report.json', report => { report.supportedSockets[0].support.evidence.geometrySha256 = '0'.repeat(64) })
    const result = await checkSocketReports(root)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('socket results differ from current geometry (supportedSockets)')
  })

  it('fails clearly on missing report data and rejected socket records', async () => {
    const root = await fixture()
    await changeReport(root, 'docs/asset-evidence/aq52-left-socket-report.json', report => { delete report.measurements })
    await changeReport(root, 'src/rendering/assets/corals/live-rock-island-right-socket-report.json', report => { report.rejectedSockets.push({ name: 'unexpected-rejection' }) })
    const result = await checkSocketReports(root)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('missing supportedSockets, rejectedSockets or measurements arrays')
    expect(result.errors.join('\n')).toContain('socket results differ from current geometry (rejectedSockets)')
  })

  it('fails clearly if a report file is absent', async () => {
    const root = await fixture()
    await rm(join(root, 'docs/asset-evidence/aq52-right-socket-report.json'))
    const result = await checkSocketReports(root)
    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('aq52-right-socket-report.json: ENOENT')
  })
})
