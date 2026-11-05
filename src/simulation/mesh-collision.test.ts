import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { buildMeshCollider, queryMeshCapsule, type MeshCollider, type MeshColliderInput, type MeshPoint, type MeshTriangle, type MeshCapsuleQuery } from './mesh-collision'
import { isWaterSegmentSafe } from './habitat-navigation'

const p = (x: number, y: number, z: number) => ({ x, y, z })
function box(min = p(-.1, -.1, -.1), max = p(.1, .1, .1)): MeshTriangle[] {
  const quads = [
    [p(min.x, min.y, min.z), p(min.x, min.y, max.z), p(min.x, max.y, max.z), p(min.x, max.y, min.z)],
    [p(max.x, min.y, min.z), p(max.x, max.y, min.z), p(max.x, max.y, max.z), p(max.x, min.y, max.z)],
    [p(min.x, min.y, min.z), p(max.x, min.y, min.z), p(max.x, min.y, max.z), p(min.x, min.y, max.z)],
    [p(min.x, max.y, min.z), p(min.x, max.y, max.z), p(max.x, max.y, max.z), p(max.x, max.y, min.z)],
    [p(min.x, min.y, min.z), p(min.x, max.y, min.z), p(max.x, max.y, min.z), p(max.x, min.y, min.z)],
    [p(min.x, min.y, max.z), p(max.x, min.y, max.z), p(max.x, max.y, max.z), p(min.x, max.y, max.z)],
  ]
  return quads.flatMap(([a, b, c, d]) => [{ a, b, c }, { a, b: c, c: d }])
}
const input = (triangles: readonly MeshTriangle[], id = 'fixture'): MeshColliderInput => ({ id, sourceSha256: 'a'.repeat(64), units: 'meter', upAxis: '+Y', coordinateSpace: 'world', triangles })
function collider(triangles = box()): MeshCollider {
  const built = buildMeshCollider(input(triangles))
  if (built.status !== 'ready') throw new Error(built.reason)
  return built.collider
}
const query = (index: MeshCollider, start: MeshPoint, end: MeshPoint, radiusM = .01) => queryMeshCapsule(index, { start, end, radiusM })

describe('true 3D mesh capsule queries', () => {
  it('keeps a depth gap open when one flattened bounding volume closes it', () => {
    const geometry = [...box(p(-.3, 0, -.3), p(.3, .3, -.1)), ...box(p(-.3, 0, .1), p(.3, .3, .3))]
    const index = collider(geometry), start = p(-.5, .15, 0), end = p(.5, .15, 0)
    expect(index.componentCount).toBe(2)
    expect(query(index, start, end, .04).status).toBe('clear')
    expect(isWaterSegmentSafe({ start, target: end, fishClearanceRadius: .04, waterBounds: { min: p(-1, -1, -1), max: p(1, 1, 1) }, obstacles: [{ id: 'flattened', bounds: index.bounds }] })).toBe(false)
    expect(query(index, p(-.5, .15, -.2), p(.5, .15, -.2), .04).status).toBe('blocked')
  })

  it('allows water below an overhang without filling a column down to sand', () => {
    const index = collider(box(p(-.3, .2, -.3), p(.3, .3, .3)))
    expect(query(index, p(0, .1, -.5), p(0, .1, .5), .04).status).toBe('clear')
    expect(query(index, p(0, .25, -.5), p(0, .25, .5), .04).status).toBe('blocked')
  })

  it('checks arbitrary diagonals continuously and preserves Euclidean corner clearance', () => {
    const index = collider()
    expect(query(index, p(-.4, -.4, -.4), p(.4, .4, .4), 0).status).toBe('blocked')
    expect(query(index, p(-.4, .25, -.4), p(.4, .35, .4), .1).status).toBe('clear')
    expect(query(index, p(.16, .16, -.3), p(.16, .16, .3), .07).status).toBe('clear')
    expect(query(index, p(.16, .16, -.3), p(.16, .16, .3), Math.hypot(.06, .06)).status).toBe('blocked')
  })

  it('blocks face, edge and vertex tangency rather than using strict box interiors', () => {
    const index = collider()
    expect(query(index, p(-.3, .12, 0), p(.3, .12, 0), .02).status).toBe('blocked')
    expect(query(index, p(.1, .1, .1), p(.1, .1, .1), 0)).toMatchObject({ status: 'blocked', reason: 'surface-contact' })
    expect(query(index, p(.12, .12, .12), p(.12, .12, .12), Math.sqrt(3) * .02).status).toBe('blocked')
  })

  it('rejects wholly enclosed motion and zero-length interior points despite no boundary crossing', () => {
    const index = collider(box(p(-1, -1, -1), p(1, 1, 1)))
    expect(query(index, p(0, 0, 0), p(.2, .1, -.1), .01)).toMatchObject({ status: 'blocked', reason: 'inside-solid' })
    expect(query(index, p(0, 0, 0), p(0, 0, 0), 0)).toMatchObject({ status: 'blocked', reason: 'inside-solid' })
    expect(query(index, p(2, 0, 0), p(2, 0, 0), 0).status).toBe('clear')
  })

  it('uses union semantics for disconnected and nested closed components', () => {
    const nested = collider([...box(p(-.5, -.5, -.5), p(.5, .5, .5)), ...box()])
    expect(nested.componentCount).toBe(2)
    expect(query(nested, p(0, 0, 0), p(0, 0, 0), .001)).toMatchObject({ status: 'blocked', reason: 'inside-solid' })
    const disconnected = collider([...box(p(-.5, -.1, -.1), p(-.3, .1, .1)), ...box(p(.3, -.1, -.1), p(.5, .1, .1))])
    expect(query(disconnected, p(0, -.2, 0), p(0, .2, 0), .04).status).toBe('clear')
  })

  it('uses explicitly applied world transforms without guessing a legacy conversion', () => {
    const transform = (v: MeshPoint) => p((v.x - v.z) / Math.sqrt(2) + .4, v.y + .2, (v.x + v.z) / Math.sqrt(2) - .1)
    const rotated = box().map(t => ({ a: transform(t.a), b: transform(t.b), c: transform(t.c) }))
    const index = collider(rotated)
    expect(query(index, transform(p(0, 0, 0)), transform(p(0, 0, 0)), .001).status).toBe('blocked')
    expect(query(index, transform(p(.16, .16, -.3)), transform(p(.16, .16, .3)), .07).status).toBe('clear')
    expect(buildMeshCollider({ ...input(rotated), units: 'centimeter' } as unknown as MeshColliderInput).status).toBe('unavailable')
    expect(buildMeshCollider({ ...input(rotated), coordinateSpace: 'local' } as unknown as MeshColliderInput).status).toBe('unavailable')
  })
})

describe('mesh build and query failure boundaries', () => {
  it('rejects open, degenerate, duplicate and inconsistently oriented source surfaces', () => {
    const faces = box()
    expect(buildMeshCollider(input(faces.slice(1)))).toMatchObject({ status: 'unavailable', diagnostics: { boundaryEdges: 3 } })
    expect(buildMeshCollider(input([{ a: p(0, 0, 0), b: p(0, 0, 0), c: p(0, 0, 0) }]))).toMatchObject({ status: 'unavailable', diagnostics: { degenerateFaces: 1 } })
    expect(buildMeshCollider(input([...faces, faces[0]]))).toMatchObject({ status: 'unavailable', diagnostics: { duplicateFaces: 1 } })
    const flipped = [...faces]; flipped[0] = { a: faces[0].a, b: faces[0].c, c: faces[0].b }
    const invalid = buildMeshCollider(input(flipped))
    expect(invalid.status).toBe('unavailable')
    expect(invalid.diagnostics.inconsistentEdges).toBeGreaterThan(0)
  })

  it('rejects vertex-pinched components and excessive component count with bounded build work', () => {
    const pinched = [...box(p(-1, -1, -1), p(0, 0, 0)), ...box(p(0, 0, 0), p(1, 1, 1))]
    const result = buildMeshCollider(input(pinched))
    expect(result.status).toBe('unavailable')
    expect(result.diagnostics.nonManifoldVertices).toBeGreaterThan(0)
    const tooMany = Array.from({ length: 65 }, (_, i) => box(p(i * 2, 0, 0), p(i * 2 + 1, 1, 1))).flat()
    expect(buildMeshCollider(input(tooMany))).toMatchObject({ status: 'unavailable', diagnostics: { components: 65 } })
  })

  it('owns its geometry snapshot and freezes public state without claiming hash verification', () => {
    const faces = box(), built = buildMeshCollider(input(faces))
    expect(built.status).toBe('ready')
    if (built.status !== 'ready') return
    expect(built.diagnostics).toMatchObject({ selfIntersectionCheck: 'not-performed', sourceHashVerification: 'caller-provenance-only' })
    for (const t of faces) for (const point of [t.a, t.b, t.c]) (point as { x: number }).x = 999
    expect(query(built.collider, p(0, 0, 0), p(0, 0, 0), .001).status).toBe('blocked')
    expect(Object.isFrozen(built.collider)).toBe(true)
    expect(Object.isFrozen(built.collider.bounds.min)).toBe(true)
    expect(query({ ...built.collider }, p(2, 0, 0), p(2, 0, 0))).toMatchObject({ status: 'indeterminate', reason: 'invalid-collider' })
  })

  it('shares a single budget across boundary distance and all parity retries', () => {
    const index = collider(box(p(-1, -1, -1), p(1, 1, 1))), start = p(0, 0, 0)
    const nodes = queryMeshCapsule(index, { start, end: start, radiusM: .001, budget: { maxNodeVisits: 1, maxTriangleTests: 8192 } })
    expect(nodes).toMatchObject({ status: 'indeterminate', reason: 'work-budget', work: { nodeVisits: 1 } })
    const faces = queryMeshCapsule(index, { start, end: start, radiusM: .001, budget: { maxNodeVisits: 4096, maxTriangleTests: 13 } })
    expect(faces).toMatchObject({ status: 'indeterminate', reason: 'work-budget', work: { triangleTests: 13 } })
    expect(query(index, start, start, .001)).toMatchObject({ status: 'blocked', reason: 'inside-solid' })
  })

  it('fails indeterminate if all three inside rays hit ambiguous vertices', () => {
    const directions = [p(1, .371, .529), p(.217, 1, .613), p(.419, .283, 1)], faces: MeshTriangle[] = []
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
      const v = directions.map((d, i) => { const sign = [a, b, c][i]; return p(d.x * sign, d.y * sign, d.z * sign) })
      const u = p(v[1].x - v[0].x, v[1].y - v[0].y, v[1].z - v[0].z), w = p(v[2].x - v[0].x, v[2].y - v[0].y, v[2].z - v[0].z)
      const normal = p(u.y * w.z - u.z * w.y, u.z * w.x - u.x * w.z, u.x * w.y - u.y * w.x)
      const sign = normal.x * v[0].x + normal.y * v[0].y + normal.z * v[0].z
      faces.push(sign > 0 ? { a: v[0], b: v[1], c: v[2] } : { a: v[0], b: v[2], c: v[1] })
    }
    const index = collider(faces)
    expect(query(index, p(0, 0, 0), p(0, 0, 0), .001)).toMatchObject({ status: 'indeterminate', reason: 'ambiguous-inside-classification' })
  })

  it.each([
    { radiusM: -1 }, { radiusM: NaN }, { radiusM: Infinity },
    { start: p(NaN, 0, 0) }, { budget: { maxNodeVisits: 0 } }, { budget: { maxTriangleTests: -1 } },
    { budget: { maxNodeVisits: .5 } }, { budget: { maxTriangleTests: 100_001 } },
    { budget: null }, { budget: { maxNodeVisits: null } }, { budget: 'invalid' },
  ])('rejects invalid query %# without fabricating clear water', patch => {
    const result = queryMeshCapsule(collider(), { start: p(1, 1, 1), end: p(2, 2, 2), radiusM: .01, ...patch } as unknown as MeshCapsuleQuery)
    expect(result).toMatchObject({ status: 'indeterminate', reason: 'invalid-query', work: { nodeVisits: 0, triangleTests: 0 } })
  })
})

describe('pinned technical geometry fixture regression', () => {
  it('preserves exact captured geometry without depending on current artwork or claiming live freshness', () => {
    const compressed = readFileSync(new URL('../../docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz', import.meta.url))
    expect(compressed.length).toBeLessThanOrEqual(8 * 1024 * 1024)
    expect(createHash('sha256').update(compressed).digest('hex')).toBe('77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612')
    const parsed = JSON.parse(gunzipSync(compressed, { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8')) as {
      schema: string; assetId: string; sourceSha256: string; generatorSha256: string; geometrySha256: string
      units: string; upAxis: string; coordinateSpace: string; provenance: { license: string }
      rootTransform: { translation: number[]; rotation: number[]; scale: number[] }
      positions: number[][]; triangles: number[][]; boundsM: { min: number[]; max: number[] }
    }
    expect(parsed.schema).toBe('rock-collision-geometry-fixture-v1')
    expect(parsed.sourceSha256).toBe('2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c')
    expect(parsed.generatorSha256).toBe('e725024a01c07e09267258a1c9a3e2f28b6fbd07f03eef8cadb84a68c8437eed')
    expect(parsed).toMatchObject({ units: 'meter', upAxis: '+Y', coordinateSpace: 'world', provenance: { license: 'original' }, rootTransform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } })
    expect(Array.isArray(parsed.positions) && parsed.positions.length === 12_288).toBe(true)
    expect(parsed.positions.every(v => Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && Math.abs(n) <= 1000))).toBe(true)
    expect(Array.isArray(parsed.triangles) && parsed.triangles.length === 24_572).toBe(true)
    expect(parsed.triangles.every(t => Array.isArray(t) && t.length === 3 && new Set(t).size === 3 && t.every(i => Number.isSafeInteger(i) && i >= 0 && i < parsed.positions.length))).toBe(true)
    expect(createHash('sha256').update(JSON.stringify({ positions: parsed.positions, triangles: parsed.triangles })).digest('hex')).toBe(parsed.geometrySha256)
    const point = (v: readonly number[]) => p(v[0], v[1], v[2])
    const built = buildMeshCollider({ ...input(parsed.triangles.map(t => ({ a: point(parsed.positions[t[0]]), b: point(parsed.positions[t[1]]), c: point(parsed.positions[t[2]]) })), parsed.assetId), sourceSha256: parsed.sourceSha256 })
    expect(built.status).toBe('ready')
    if (built.status !== 'ready') return
    expect(built.diagnostics.buildWork).toBeLessThan(20_000_000)
    for (const radiusM of [.02, .04, .06]) {
      const result = query(built.collider, p(0, .08, -.36), p(0, .08, .36), radiusM)
      expect(result.status).toBe('clear')
      expect(result.work.nodeVisits).toBeLessThanOrEqual(4096)
      expect(result.work.triangleTests).toBeLessThanOrEqual(8192)
    }
    const miss = p(-.11637334525585175, .08302615582942963, .244855597615242)
    expect(query(built.collider, miss, miss, 0)).toMatchObject({ status: 'blocked', reason: 'surface-contact' })
    expect(query(built.collider, p(-.3, .05, 0), p(-.3, .05, 0), .005)).toMatchObject({ status: 'blocked', reason: 'inside-solid' })
    const start = p(-.56, .30, .24), end = p(.56, .30, .24)
    expect(query(built.collider, start, end, .02).status).toBe('clear')
    expect(isWaterSegmentSafe({
      start, target: end, fishClearanceRadius: .02, waterBounds: { min: p(-1, -1, -1), max: p(1, 1, 1) },
      obstacles: [{ id: 'flattened-global-fixture-box', bounds: { min: point(parsed.boundsM.min), max: point(parsed.boundsM.max) } }],
    })).toBe(false)
  })
})
