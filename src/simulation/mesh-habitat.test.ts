import { BoxGeometry } from 'three'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildMeshCollider, queryMeshCapsule, type MeshCollider, type MeshPoint } from './mesh-collision'
import { createMeshClearanceQuery } from './mesh-habitat'
import { findMeshRoute } from './mesh-navigation'

function cube(id: string, x = 0): MeshCollider {
  const geometry = new BoxGeometry(.2, .2, .2)
  const positions = geometry.getAttribute('position'), indices = geometry.index!
  const triangles = []
  for (let i = 0; i < indices.count; i += 3) {
    const points = [0, 1, 2].map(j => {
      const index = indices.getX(i + j)
      return { x: positions.getX(index) + x, y: positions.getY(index), z: positions.getZ(index) }
    })
    triangles.push({ a: points[0], b: points[1], c: points[2] })
  }
  geometry.dispose()
  const result = buildMeshCollider({ id, sourceSha256: 'a'.repeat(64), units: 'meter', upAxis: '+Y', coordinateSpace: 'world', triangles })
  if (result.status !== 'ready') throw new Error(result.reason)
  return result.collider
}
const budget = { maxNodeVisits: 250_000, maxTriangleTests: 2_000_000 }
const point = { x: 0, y: .5, z: 0 }

describe('static mesh habitat query adapter', () => {
  it('clamps global planner budgets to valid per-query budgets and integrates the real mesh oracle', () => {
    const collider = cube('rock')
    expect(queryMeshCapsule(collider, { start: point, end: point, radiusM: .02, budget }).status).toBe('indeterminate')
    const queryCapsule = createMeshClearanceQuery([collider])
    expect(queryCapsule(point, point, .02, budget).status).toBe('clear')
    const result = findMeshRoute({
      start: { x: -.5, y: .5, z: -.5 }, target: { x: .5, y: .5, z: .5 },
      waterBounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
      fishClearanceRadius: .02, spacingM: .25, queryCapsule,
    })
    expect(result.status).toBe('route')
    if (result.status === 'route') for (let i = 1; i < result.path.length; i++) {
      expect(queryCapsule(result.path[i - 1], result.path[i], .02, budget).status).toBe('clear')
    }
  })

  it('requires clearance against every solid and owns its registry snapshot', () => {
    const sources = [cube('left', -1), cube('right', 1)]
    const query = createMeshClearanceQuery(sources)
    sources.pop()
    expect(query({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, .01, budget).status).toBe('blocked')
    expect(query(point, point, .01, budget).status).toBe('clear')
  })

  it('sums actual work across meshes and shares the remaining budget', () => {
    const sources = [cube('left', -1), cube('right', 1)]
    const query = createMeshClearanceQuery(sources)
    const singles = sources.map(source => queryMeshCapsule(source, { start: point, end: point, radiusM: .01 }))
    const result = query(point, point, .01, budget)
    expect(result.status).toBe('clear')
    expect(result.work.nodeVisits).toBe(singles.reduce((sum, answer) => sum + answer.work.nodeVisits, 0))
    const limited = query(point, point, .01, { maxNodeVisits: singles[0].work.nodeVisits, maxTriangleTests: 8192 })
    expect(limited.status).toBe('indeterminate')
    expect(limited.work.nodeVisits).toBeLessThanOrEqual(singles[0].work.nodeVisits)
  })

  it('never interprets missing, excessive or invalid collision sources as empty water', () => {
    expect(createMeshClearanceQuery([])(point, point, .01, budget).status).toBe('indeterminate')
    const collider = cube('rock')
    expect(createMeshClearanceQuery(Array(65).fill(collider))(point, point, .01, budget).status).toBe('indeterminate')
    expect(createMeshClearanceQuery([{} as MeshCollider])(point, point, .01, budget).status).toBe('indeterminate')
  })

  it('rejects exhausted/malformed budgets and propagates invalid endpoints', () => {
    const query = createMeshClearanceQuery([cube('rock')])
    expect(query(point, point, .01, { maxNodeVisits: 0, maxTriangleTests: 1 }).status).toBe('indeterminate')
    expect(query(point, point, .01, { maxNodeVisits: Infinity, maxTriangleTests: 1 }).status).toBe('indeterminate')
    expect(query({ x: NaN, y: 0, z: 0 } as MeshPoint, point, .01, budget).status).toBe('indeterminate')
  })

  it('routes fixed probes through the exact supplied cave using the real planner and shared query', () => {
    const bytes = readFileSync(new URL('../../docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz', import.meta.url))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612')
    const geometry = JSON.parse(gunzipSync(bytes).toString()) as {
      assetId: string; sourceSha256: string; positions: number[][]; triangles: number[][]
    }
    expect(geometry.sourceSha256).toBe('2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c')
    const pointFromArray = (p: readonly number[]) => ({ x: p[0], y: p[1], z: p[2] })
    const built = buildMeshCollider({
      id: geometry.assetId, sourceSha256: geometry.sourceSha256, units: 'meter', upAxis: '+Y', coordinateSpace: 'world',
      triangles: geometry.triangles.map(([a, b, c]) => ({ a: pointFromArray(geometry.positions[a]), b: pointFromArray(geometry.positions[b]), c: pointFromArray(geometry.positions[c]) })),
    })
    expect(built.status).toBe('ready')
    if (built.status !== 'ready') return
    const queryCapsule = createMeshClearanceQuery([built.collider])
    for (const radius of [.02, .04, .06]) {
      const result = findMeshRoute({
        start: { x: 0, y: .08, z: -.38 }, target: { x: 0, y: .08, z: .38 },
        waterBounds: { min: { x: -.75, y: -.012, z: -.55 }, max: { x: .75, y: .6, z: .55 } },
        fishClearanceRadius: radius, spacingM: .07, queryCapsule,
      })
      expect(result.status).toBe('route')
      if (result.status === 'route') {
        expect(result.path).toHaveLength(2)
        expect(queryCapsule(result.path[0], result.path[1], radius, budget).status).toBe('clear')
      }
    }
    expect(queryCapsule({ x: 0, y: .08, z: -.38 }, { x: 0, y: .08, z: .38 }, .07, budget).status).toBe('blocked')
    const detour = findMeshRoute({
      start: { x: 0, y: .08, z: -.38 }, target: { x: 0, y: .08, z: .38 },
      waterBounds: { min: { x: -.75, y: -.012, z: -.55 }, max: { x: .75, y: .6, z: .55 } },
      fishClearanceRadius: .07, spacingM: .07, queryCapsule,
      budget: { maxLatticeNodes: 4096, maxExpandedNodes: 2048, maxCollisionQueries: 10_000, maxNodeVisits: 200_000, maxTriangleTests: 500_000 },
    })
    expect(detour.status).toBe('route')
    if (detour.status === 'route') {
      expect(detour.path.length).toBeGreaterThan(2)
      for (let i = 1; i < detour.path.length; i++) expect(queryCapsule(detour.path[i - 1], detour.path[i], .07, budget).status).toBe('clear')
    }
  })
})
