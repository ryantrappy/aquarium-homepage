import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { ShapeUtils, Vector2 } from 'three'
import { readRockCollisionGeometry, type RockCollisionGeometry } from './socket-inspector'
import { buildRockCollisionReport, inspectRockTopology, verifyCollisionCoverage, segmentTriangleDistance, cubeInflatedProbeSafe, type CollisionBox } from './rock-collision'
import { isWaterSegmentSafe } from '../../simulation/habitat-navigation'

type Point = [number, number, number]
type Triangle = RockCollisionGeometry['triangles'][number]
const triangle = (a: Point, b: Point, c: Point, index = 0): Triangle => ({ meshId: 'rock', index, a, b, c })
function source(triangles: Triangle[], envelope?: RockCollisionGeometry['boundsM']): RockCollisionGeometry {
  const points = triangles.flatMap(t => [t.a, t.b, t.c])
  return {
    assetId: 'test-rock', sourceSha256: 'a'.repeat(64), triangles,
    boundsM: envelope ?? { min: [0, 1, 2].map(axis => Math.min(...points.map(p => p[axis]))) as Point, max: [0, 1, 2].map(axis => Math.max(...points.map(p => p[axis]))) as Point },
  }
}

function extrusion(outline: Array<[number, number]>, front = .2, back = -.2) {
  const triangles: Triangle[] = []
  const append = (a: Point, b: Point, c: Point) => triangles.push(triangle(a, b, c, triangles.length))
  const point = (i: number, z: number): Point => [...outline[i], z]
  for (const [a, b, c] of ShapeUtils.triangulateShape(outline.map(p => new Vector2(...p)), [])) {
    append(point(a, front), point(b, front), point(c, front))
    append(point(a, back), point(c, back), point(b, back))
  }
  for (let i = 0; i < outline.length; i++) {
    const next = (i + 1) % outline.length
    append(point(i, front), point(i, back), point(next, back))
    append(point(i, front), point(next, back), point(next, front))
  }
  return source(triangles)
}
const cube = () => extrusion([[-.2, 0], [.2, 0], [.2, .3], [-.2, .3]])
const arch = () => extrusion([[-.2, 0], [-.07, 0], [-.07, .15], [.07, .15], [.07, 0], [.2, 0], [.2, .3], [-.2, .3]])
const box = (id: string, min: Point, max: Point): CollisionBox => ({ id, boundsM: { min, max } })

function glb(geometry: RockCollisionGeometry, mutate?: (doc: any) => void) {
  const floats = geometry.triangles.flatMap(t => [t.a, t.b, t.c]).flat(), binary = Buffer.alloc(floats.length * 4)
  floats.forEach((value, i) => binary.writeFloatLE(value, i * 4))
  const doc: any = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Rock', mesh: 0, extras: { reefAsset: { schema: 'reef-asset-v1', id: 'test-rock', kind: 'rock', units: 'meter', upAxis: '+Y', origin: 'local', dimensionsM: geometry.boundsM.max.map((v, i) => v - geometry.boundsM.min[i]) } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4, extras: { reefPrimitive: { id: 'rock', role: 'rock' } } }] }],
    accessors: [{ bufferView: 0, count: floats.length / 3, type: 'VEC3', componentType: 5126 }],
    buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteLength: binary.length }],
  }
  mutate?.(doc)
  const json = Buffer.from(JSON.stringify(doc)), jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(jsonChunk)
  const out = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binary.length)
  out.write('glTF'); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8)
  out.writeUInt32LE(jsonChunk.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(out, 20)
  const offset = 20 + jsonChunk.length; out.writeUInt32LE(binary.length, offset); out.writeUInt32LE(0x004e4942, offset + 4); binary.copy(out, offset + 8)
  return out
}

describe('canonical collision geometry wrapper', () => {
  it('uses only the active scene and returns the unchanged transformed rock triangles', () => {
    const data = glb(cube(), doc => { doc.nodes.push({ mesh: 0, translation: [100, 0, 0] }) })
    const parsed = readRockCollisionGeometry(data)
    expect(parsed.triangles).toHaveLength(12)
    expect(parsed.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(parsed.boundsM.min[0]).toBeCloseTo(-.2)
  })

  it('rejects a skipped degenerate face rather than validating the parser-filtered remainder', () => {
    const geometry = cube(); geometry.triangles.push(triangle([0, 0, 0], [0, 0, 0], [0, 0, 0], 12))
    expect(() => readRockCollisionGeometry(glb(geometry))).toThrow('skipped degenerate triangles')
  })

  it('rejects transforms, active instances, multiple roots and noncanonical metadata', () => {
    expect(() => readRockCollisionGeometry(glb(cube(), doc => { doc.nodes[0].translation = [1, 0, 0] }))).toThrow('transformed geometry scopes')
    expect(() => readRockCollisionGeometry(glb(cube(), doc => { doc.nodes[0].children = [1]; doc.nodes.push({ mesh: 0 }) }))).toThrow('instances are unsupported')
    expect(() => readRockCollisionGeometry(glb(cube(), doc => { doc.nodes[0].extensions = { EXT_mesh_gpu_instancing: { attributes: {} } } }))).toThrow('GPU-instanced geometry')
    expect(() => readRockCollisionGeometry(glb(cube(), doc => {
      delete doc.nodes[0].mesh; doc.nodes[0].children = [1]
      doc.nodes.push({ name: 'socket_transform', translation: [1, 0, 0], children: [2] }, { mesh: 0 })
    }))).toThrow('geometry inside socket hierarchies')
    expect(() => readRockCollisionGeometry(glb(cube(), doc => { doc.nodes.push({}); doc.scenes[0].nodes.push(1) }))).toThrow('one canonical rock root')
    expect(() => readRockCollisionGeometry(glb(cube(), doc => { doc.nodes[0].extras.reefAsset.units = 'centimeter' }))).toThrow('meter, +Y')
    expect(() => readRockCollisionGeometry(glb(cube(), doc => { doc.nodes[0].extras.reefAsset.dimensionsM = [1, 1, 1] }))).toThrow('dimensions differ')
  })
})

describe('closed, oriented topology and conservative union coverage', () => {
  it('accepts closed convex and concave surfaces, but makes no self-intersection claim', () => {
    expect(inspectRockTopology(cube().triangles)).toMatchObject({ valid: true, connectedComponents: 1, exhaustiveSelfIntersectionCheck: false })
    expect(inspectRockTopology(arch().triangles)).toMatchObject({ valid: true, boundaryEdges: 0, nonManifoldVertices: 0 })
  })

  it('rejects open, inconsistently oriented, degenerate and pinched-vertex surfaces', () => {
    const geometry = cube()
    expect(inspectRockTopology(geometry.triangles.slice(1))).toMatchObject({ valid: false, boundaryEdges: 3 })
    const flipped = [...geometry.triangles]; flipped[0] = { ...flipped[0], b: flipped[0].c, c: flipped[0].b }
    expect(inspectRockTopology(flipped).inconsistentEdges).toBeGreaterThan(0)
    expect(inspectRockTopology([...geometry.triangles, triangle([0, 0, 0], [0, 0, 0], [0, 0, 0])])).toMatchObject({ valid: false, degenerateTriangles: 1 })
    expect(inspectRockTopology([triangle([0, 0, 0], [1, 0, 1], [0, 1, 1]), triangle([0, 0, 0], [0, 1, 1], [1, 0, 1])])).toMatchObject({ valid: false, duplicateFaces: 1 })
    const first = extrusion([[-1, -1], [0, -1], [0, 0], [-1, 0]], 0, -1)
    const second = extrusion([[0, 0], [1, 0], [1, 1], [0, 1]], 1, 0)
    expect(inspectRockTopology([...first.triangles, ...second.triangles]).nonManifoldVertices).toBeGreaterThan(0)
  })

  it('detects missing triangle interiors even when every original vertex lies in a different box', () => {
    const geometry = source([triangle([-.9, .1, 0], [.9, .1, 0], [0, .9, 0])], { min: [-1, 0, -1], max: [1, 1, 1] })
    const boxes = [box('a', [-1, 0, -1], [-.8, .2, 1]), box('b', [.8, 0, -1], [1, .2, 1]), box('c', [-.1, .8, -1], [.1, 1, 1])]
    expect(geometry.triangles.flatMap(t => [t.a, t.b, t.c]).every(p => boxes.some(b => p.every((v, i) => v >= b.boundsM.min[i] && v <= b.boundsM.max[i])))).toBe(true)
    expect(verifyCollisionCoverage(geometry, boxes)).toMatchObject({ surfaceCovered: false, uncoveredTriangles: 1, exteriorConnectedComplement: false })
  })

  it('covers the whole convex solid with one full-depth box and rejects a falsely carved gap', () => {
    const geometry = cube()
    expect(verifyCollisionCoverage(geometry, [{ id: 'all', boundsM: geometry.boundsM }])).toMatchObject({ surfaceCovered: true, exteriorConnectedComplement: true, omittedPrisms: 0 })
    const wrong = [box('left', [-.2, 0, -.2], [-.05, .3, .2]), box('right', [.05, 0, -.2], [.2, .3, .2])]
    expect(verifyCollisionCoverage(geometry, wrong)).toMatchObject({ surfaceCovered: false, exteriorConnectedComplement: false })
  })
})

describe('continuous capsule distances and bounded band construction', () => {
  it('finds face crossings, parallel face distances, edge distances and zero-length segments', () => {
    const face = triangle([0, 0, 0], [1, 0, 0], [0, 1, 0])
    expect(segmentTriangleDistance([.2, .2, 1], [.2, .2, -1], face)).toBe(0)
    expect(segmentTriangleDistance([.2, .2, 1], [.4, .2, 1], face)).toBeCloseTo(1)
    expect(segmentTriangleDistance([2, 0, 1], [2, 0, -1], face)).toBeCloseTo(1)
    expect(segmentTriangleDistance([.2, .2, 1], [.2, .2, 1], face)).toBeCloseTo(1)
  })

  it('preserves a closed concave arch with fixed probes and fails closed at a one-part budget', () => {
    const report = buildRockCollisionReport(arch(), { maxParts: 16, requirePassage: true })
    expect(report.status).toBe('validated-offline')
    expect(report.candidateParts.length).toBeLessThanOrEqual(16)
    expect(report.coverage).toMatchObject({ surfaceCovered: true, exteriorConnectedComplement: true, boundaryCrossingPrisms: 0 })
    expect(report.probes.map(p => p.radiusM)).toEqual([.02, .04, .06])
    expect(report.probes.every(p => p.currentCubeInflatedAabbRouteSafe)).toBe(true)
    expect(report.promotionStatus).toBe('unavailable-pending-root-and-scene-review')
    const limited = buildRockCollisionReport(arch(), { maxParts: 1, requirePassage: true })
    expect(limited.status).toBe('unavailable')
    expect(limited.candidateParts).toHaveLength(1)
    expect(limited.stoppedBy).toBe('part-budget-or-minimum-band-height')
    expect(buildRockCollisionReport(arch(), { maxParts: 16, requirePassage: true, minBandHeightM: .2 }).status).toBe('unavailable')
  })

  it('keeps blocked solids blocked and returns no candidate boxes for invalid topology', () => {
    const blocked = buildRockCollisionReport(cube(), { maxParts: 1, requirePassage: false })
    expect(blocked.status).toBe('validated-offline')
    expect(blocked.probes.every(p => !p.exactMeshCapsuleSafe && !p.currentCubeInflatedAabbRouteSafe)).toBe(true)
    const open = cube(); open.triangles.pop()
    expect(buildRockCollisionReport(open, { maxParts: 16, requirePassage: true })).toMatchObject({ status: 'unavailable', candidateParts: [] })
  })

  it('does not certify a tangent swept cube even when the raw navigation predicate permits contact', () => {
    const touchingPrism = extrusion([[.02, 0], [.22, 0], [.22, .3], [.02, .3]])
    const prism = buildRockCollisionReport(touchingPrism, { maxParts: 16, requirePassage: true, axisX: 0, heightM: .08 })
    expect(prism.status).toBe('unavailable')
    expect(prism.probes[0]).toMatchObject({ exactMeshCapsuleSafe: false, exactMeshSweptCubeSafe: false, currentCubeInflatedAabbRouteSafe: true })
    const touchingArch = extrusion([[-.2, 0], [-.02, 0], [-.02, .15], [.02, .15], [.02, 0], [.2, 0], [.2, .3], [-.2, .3]])
    const report = buildRockCollisionReport(touchingArch, { maxParts: 16, requirePassage: true })
    expect(report.status).toBe('unavailable')
    expect(report.probes[0]).toMatchObject({ exactMeshCapsuleSafe: false, exactMeshSweptCubeSafe: false })
    const rawBoxes = [box('left', [-.2, 0, -.2], [-.02, .3, .2]), box('right', [.02, 0, -.2], [.2, .3, .2])]
    expect(cubeInflatedProbeSafe(rawBoxes, 0, .08, .02)).toBe(true)
    expect(report.probes.every(probe => !probe.exactMeshSweptCubeSafe || probe.exactMeshCapsuleSafe)).toBe(true)
    const largerArch = extrusion([[-.2, 0], [-.06, 0], [-.06, .15], [.06, .15], [.06, 0], [.2, 0], [.2, .3], [-.2, .3]])
    const larger = buildRockCollisionReport(largerArch, { maxParts: 16, requirePassage: true })
    expect(larger.status).toBe('validated-offline')
    expect(larger.probes[2]).toMatchObject({ radiusM: .06, exactMeshCapsuleSafe: false, exactMeshSweptCubeSafe: false })
    expect(larger.probes.slice(0, 2).every(probe => probe.exactMeshSweptCubeSafe)).toBe(true)
    const outsideAxis = buildRockCollisionReport(arch(), { maxParts: 16, requirePassage: true, axisX: 1 })
    expect(outsideAxis.method.probeAxisWithinSourceXY).toBe(false)
    expect(outsideAxis.status).toBe('unavailable')
  })

  it('covers the known sloped-wall miss in the exact left export and distinguishes capsule from cube routing', () => {
    const fixture = JSON.parse(gunzipSync(readFileSync(new URL('../../../docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz', import.meta.url))).toString()) as {
      assetId: string; sourceSha256: string; primitiveId: string; positions: Point[]; triangles: number[][]; boundsM: RockCollisionGeometry['boundsM']
    }
    const geometry: RockCollisionGeometry = {
      assetId: fixture.assetId, sourceSha256: fixture.sourceSha256, boundsM: fixture.boundsM,
      triangles: fixture.triangles.map(([a, b, c], index) => ({ meshId: fixture.primitiveId, index, a: fixture.positions[a], b: fixture.positions[b], c: fixture.positions[c] })),
    }
    expect(geometry.sourceSha256).toBe('2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c')
    const report = buildRockCollisionReport(geometry, { maxParts: 16, requirePassage: true })
    expect(report.status).toBe('validated-offline')
    expect(report.coverage).toMatchObject({ surfaceCovered: true, uncoveredTriangles: 0, exteriorConnectedComplement: true })
    const knownMiss = [-.11637334525585175, .08302615582942963, .244855597615242]
    expect(report.candidateParts.some(b => knownMiss.every((v, i) => v >= b.boundsM.min[i] && v <= b.boundsM.max[i]))).toBe(true)
    expect(report.probes[2]).toMatchObject({ exactMeshCapsuleSafe: true, exactMeshSweptCubeSafe: false, currentCubeInflatedAabbRouteSafe: false })
    for (const probe of report.probes) {
      const point = (p: Point) => ({ x: p[0], y: p[1], z: p[2] })
      const actualRouting = isWaterSegmentSafe({
        start: point(probe.startM), target: point(probe.endM), fishClearanceRadius: probe.radiusM,
        waterBounds: { min: { x: -1, y: -.5, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        obstacles: report.candidateParts.map(p => ({ id: p.id, bounds: { min: point(p.boundsM.min), max: point(p.boundsM.max) } })),
      })
      expect(probe.currentCubeInflatedAabbRouteSafe).toBe(actualRouting)
    }
    expect(report.probes.slice(0, 2).every(p => p.currentCubeInflatedAabbRouteSafe)).toBe(true)
    expect(report).not.toHaveProperty('collisionParts')
  })
})
