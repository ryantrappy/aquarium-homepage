import { describe, expect, it } from 'vitest'
import { inspectRockSockets } from './socket-inspector'

type Fixture = { positions: number[]; indices?: number[]; id: string; role: string; nodeTransform?: Record<string, number[]> }
const internalGap: Fixture = {
  id: 'rock', role: 'rock',
  // A supported center island plus four distant pads leaves an unsupported annulus.
  positions: [
    -.01, 0, -.01, -.01, 0, .01, .01, 0, .01, -.01, 0, -.01, .01, 0, .01, .01, 0, -.01,
    -.12, 0, -.12, -.12, 0, -.08, -.08, 0, -.08, -.12, 0, -.12, -.08, 0, -.08, -.08, 0, -.12,
    .08, 0, -.12, .08, 0, -.08, .12, 0, -.08, .08, 0, -.12, .12, 0, -.08, .12, 0, -.12,
    -.12, 0, .08, -.12, 0, .12, -.08, 0, .12, -.12, 0, .08, -.08, 0, .12, -.08, 0, .08,
    .08, 0, .08, .08, 0, .12, .12, 0, .12, .08, 0, .08, .12, 0, .12, .12, 0, .08,
  ],
  indices: Array.from({ length: 5 }, (_, i) => [i * 6, i * 6 + 1, i * 6 + 2, i * 6 + 3, i * 6 + 4, i * 6 + 5]).flat(),
}

function glbFixture(options: {
  halfSize?: number
  socket?: { translation?: number[]; rotation?: number[]; scale?: number[]; intent?: Record<string, unknown>; name?: string }
  root?: Record<string, number[]>
  asset?: Record<string, unknown>
  parent?: Record<string, number[]>
  meshTransform?: Record<string, number[]>
  indexed?: boolean
  duplicateSocket?: boolean
  blocker?: Fixture
  base?: Fixture
} = {}) {
  const half = options.halfSize ?? .5
  const basePositions = [-half, 0, -half, -half, 0, half, half, 0, half, -half, 0, -half, half, 0, half, half, 0, -half]
  const meshSpecs: Fixture[] = [{ ...(options.base ?? { id: 'rock', role: 'rock', positions: basePositions, indices: options.indexed === false ? undefined : [0, 1, 2, 3, 4, 5] }), nodeTransform: options.meshTransform }]
  if (options.blocker) meshSpecs.push(options.blocker)
  const buffer = Buffer.alloc(1024), bufferViews: any[] = [], accessors: any[] = [], meshes: any[] = [], meshNodes: any[] = []
  let offset = 0
  const addData = (values: number[], type: 'float' | 'ushort') => {
    offset = Math.ceil(offset / 4) * 4
    const start = offset, size = type === 'float' ? 4 : 2
    values.forEach((value, i) => type === 'float' ? buffer.writeFloatLE(value, start + i * size) : buffer.writeUInt16LE(value, start + i * size))
    const length = values.length * size; bufferViews.push({ buffer: 0, byteOffset: start, byteLength: length, target: type === 'float' ? 34962 : 34963 })
    offset += length
    const index = bufferViews.length - 1
    return { bufferView: index, count: type === 'float' ? values.length / 3 : values.length, componentType: type === 'float' ? 5126 : 5123, type: type === 'float' ? 'VEC3' : 'SCALAR' }
  }
  for (let mi = 0; mi < meshSpecs.length; mi++) {
    const spec = meshSpecs[mi], positionAccessor = accessors.push(addData(spec.positions, 'float')) - 1
    let indexAccessor: number | undefined
    if (spec.indices) indexAccessor = accessors.push(addData(spec.indices, 'ushort')) - 1
    meshes.push({ name: `mesh-${spec.id}`, primitives: [{ attributes: { POSITION: positionAccessor }, ...(indexAccessor === undefined ? {} : { indices: indexAccessor }), mode: 4 }] })
    const nodeIndex = meshNodes.length + 2
    meshNodes.push({ name: `mesh-node-${spec.id}`, mesh: mi, extras: { reefPrimitive: { id: spec.id, role: spec.role } }, ...(mi === 0 ? spec.nodeTransform ?? {} : {}) })
  }
  const socket = options.socket ?? {}
  const intent = socket.intent ?? { role: 'coral-mount', parentMesh: 'rock', archetype: 'branching-sps', footprintRadiusM: .1, clearanceRadiusM: .15 }
  const socketNodes = Array.from({ length: options.duplicateSocket ? 2 : 1 }, () => ({ name: socket.name ?? 'socket_sps_crest_01', ...(socket.translation ? { translation: socket.translation } : {}), ...(socket.rotation ? { rotation: socket.rotation } : {}), ...(socket.scale ? { scale: socket.scale } : {}), extras: { reefSocket: intent } }))
  const nodes = [
    { name: 'AssetRoot', children: [1], extras: { reefAsset: { id: 'fixture-rock', kind: 'rock', units: 'meter', upAxis: '+Y', origin: 'local', ...(options.asset ?? {}) } }, ...(options.root ?? {}) },
    { name: 'TransformGroup', children: meshNodes.map((_, i) => i + 2).concat(Array.from({ length: socketNodes.length }, (_, i) => meshNodes.length + 2 + i)), ...(options.parent ?? {}) },
    ...meshNodes,
    ...socketNodes,
  ]
  // Use a valid 4-byte-padded BIN chunk while preserving the exact buffer byteLength.
  const binary = buffer.subarray(0, offset), binChunk = Buffer.alloc(Math.ceil(binary.length / 4) * 4); binary.copy(binChunk)
  const doc = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes, meshes, buffers: [{ byteLength: binary.length }], bufferViews, accessors }
  const json = Buffer.from(JSON.stringify(doc)), jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(jsonChunk)
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length, out = Buffer.alloc(total)
  out.write('glTF', 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonChunk.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(out, 20)
  const binOffset = 20 + jsonChunk.length; out.writeUInt32LE(binChunk.length, binOffset); out.writeUInt32LE(0x004e4942, binOffset + 4); binChunk.copy(out, binOffset + 8)
  return out
}

function report(options?: Parameters<typeof glbFixture>[0]) { return inspectRockSockets(glbFixture(options), '/tmp/report.json') }

describe('exported rock socket measurements', () => {
  it('accepts an exactly supported flat shelf and reports hash-pinned measured support', () => {
    const result = report()
    expect(result.supportedSockets).toHaveLength(1)
    expect(result.rejectedSockets).toHaveLength(0)
    const socket = result.supportedSockets[0]
    expect(socket.support.supportedRadiusM).toBe(socket.footprintRadiusM)
    expect(socket.support.freeRadiusM).toBe(socket.clearanceRadiusM)
    expect(socket.support.evidence.geometrySha256).toBe(result.sourceSha256)
    expect(socket.support.evidence.report).toBe('/tmp/report.json')
    expect(result.measurements[0].data.footprintSamples).toBeGreaterThan(100)
    expect(result.method.footprintSampleCount).toBe(result.measurements[0].data.footprintSamples)
  })

  it('rejects a footprint that reaches past a shelf edge and preserves original socket intent', () => {
    const result = report({ halfSize: .12, socket: { translation: [.03, 0, 0] } })
    expect(result.supportedSockets).toHaveLength(0)
    expect(result.rejectedSockets[0].reasons).toContain('footprint-not-supported-at-all-radial-samples')
    expect(result.rejectedSockets[0].intent).toMatchObject({ footprintRadiusM: .1, clearanceRadiusM: .15 })
  })

  it('rejects an unsupported internal gap even when the socket center is supported', () => {
    const result = report({ base: internalGap })
    expect(result.measurements[0].data.socketToSurfaceDistanceM).toBe(0)
    expect(result.rejectedSockets[0].reasons).toContain('footprint-not-supported-at-all-radial-samples')
    expect(result.measurements[0].data.footprintSamples).toBeGreaterThan(100)
  })

  it('rejects floating and incorrectly oriented socket nodes against the measured surface', () => {
    const floating = report({ socket: { translation: [0, .01, 0] } })
    expect(floating.rejectedSockets[0].reasons).toContain('socket-not-in-contact-with-parent-surface')
    const angle = Math.PI / 4
    const tilted = report({ socket: { rotation: [0, 0, Math.sin(angle), Math.cos(angle)] } })
    expect(tilted.rejectedSockets[0].reasons).toContain('socket-up-does-not-match-measured-surface-normal')
  })

  it('rejects a rock triangle intersecting the clearance cylinder but ignores a far collinear projected triangle', () => {
    const barrier: Fixture = { id: 'barrier', role: 'rock', positions: [.05, .01, -.3, .05, .3, .3, .05, .3, -.3], indices: [0, 1, 2] }
    const blocked = report({ blocker: barrier })
    expect(blocked.rejectedSockets[0].reasons).toContain('clearance-cylinder-intersects-rock-geometry')
    const farWall: Fixture = { id: 'far-wall', role: 'rock', positions: [5, .01, 0, 6, .3, 0, 5, .3, 0], indices: [0, 1, 2] }
    const clear = report({ blocker: farWall })
    expect(clear.supportedSockets).toHaveLength(1)
  })

  it('accounts for parent and mesh transforms and accepts non-indexed TRIANGLES', () => {
    const result = report({ indexed: false, parent: { translation: [2, 0, 0] }, meshTransform: { scale: [2, 1, 2] } })
    expect(result.supportedSockets).toHaveLength(1)
    expect(result.supportedSockets[0].positionM).toEqual([2, 0, 0])
    expect(result.measurements[0].data.socketToSurfaceDistanceM).toBeLessThanOrEqual(.002)
  })

  it('accounts for parent rotation when measuring socket and mesh world transforms', () => {
    const angle = Math.PI / 6
    const result = report({
      parent: { translation: [2, .5, -.4], rotation: [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)] },
      socket: { translation: [.1, 0, .05] },
    })
    expect(result.supportedSockets).toHaveLength(1)
    const socket = result.supportedSockets[0]
    expect(socket.positionM[0]).toBeCloseTo(2 + .1 * Math.cos(angle))
    expect(socket.positionM[1]).toBeCloseTo(.5 + .1 * Math.sin(angle))
    expect(socket.positionM[2]).toBeCloseTo(-.35)
    expect(socket.normal[0]).toBeCloseTo(-Math.sin(angle))
    expect(socket.normal[1]).toBeCloseTo(Math.cos(angle))
    expect(result.measurements[0].data.socketToSurfaceDistanceM).toBeLessThanOrEqual(.002)
  })

  it('rejects invalid quaternion, duplicate names and role/archetype mismatch without inventing measurements', () => {
    const zeroQuat = report({ socket: { rotation: [0, 0, 0, 0] } })
    expect(zeroQuat.supportedSockets).toHaveLength(0)
    expect(zeroQuat.rejectedSockets[0].reasons).toContain('invalid-socket-transform')
    const duplicate = report({ duplicateSocket: true })
    expect(duplicate.supportedSockets).toHaveLength(0)
    expect(duplicate.rejectedSockets.every(socket => socket.reasons.includes('duplicate-socket-name'))).toBe(true)
    const mismatched = report({ socket: { intent: { role: 'coral-mount', parentMesh: 'rock', archetype: 'host-anemone', footprintRadiusM: .1, clearanceRadiusM: .15 } } })
    expect(mismatched.rejectedSockets[0].reasons).toContain('socket-name-archetype-mismatch')
    const scaled = report({ socket: { scale: [2, 1, 1] } })
    expect(scaled.rejectedSockets[0].reasons).toContain('invalid-socket-transform')
  })

  it('fails closed on unsupported primitive modes and invalid GLB bounds', () => {
    const source = glbFixture()
    const badLength = Buffer.from(source); badLength.writeUInt32LE(badLength.length - 4, 8)
    expect(() => inspectRockSockets(badLength, '/tmp/bad.json')).toThrow('declared GLB length')
    const nonTriangles = Buffer.from(source)
    const jsonLength = nonTriangles.readUInt32LE(12)
    const json = JSON.parse(nonTriangles.toString('utf8', 20, 20 + jsonLength).trim())
    json.meshes[0].primitives[0].mode = 1
    const rebuilt = glbFixtureWithDoc(json, nonTriangles)
    expect(() => inspectRockSockets(rebuilt, '/tmp/nontri.json')).toThrow('not TRIANGLES')
    json.meshes[0].primitives[0].mode = 4; json.accessors[0].normalized = true
    expect(() => inspectRockSockets(glbFixtureWithDoc(json, nonTriangles), '/tmp/normalized-position.json')).toThrow('float values normalized')
    expect(() => inspectRockSockets(glbFixture({ asset: { units: 'centimeter' } }), '/tmp/non-meter.json')).toThrow('units=meter')
  })
})

function glbFixtureWithDoc(doc: any, previous: Buffer) {
  const json = Buffer.from(JSON.stringify(doc)), jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(jsonChunk)
  const oldJsonLength = previous.readUInt32LE(12), oldBinHeader = 20 + oldJsonLength, binLength = previous.readUInt32LE(oldBinHeader), bin = previous.subarray(oldBinHeader + 8, oldBinHeader + 8 + binLength)
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length, out = Buffer.alloc(total)
  out.write('glTF', 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonChunk.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(out, 20)
  const binOffset = 20 + jsonChunk.length; out.writeUInt32LE(bin.length, binOffset); out.writeUInt32LE(0x004e4942, binOffset + 4); bin.copy(out, binOffset + 8)
  return out
}
