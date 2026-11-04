// Derive static navigation data from the exact licensed reef mesh, without a GPU
// or texture decoding. No source asset is modified. Run from the repository root.
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DoubleSide } from 'three'

const source = 'src/rendering/proof/candidate-reef.glb'
const bytes = await fs.readFile(source), jsonLength = bytes.readUInt32LE(12)
const data = JSON.parse(bytes.subarray(20, 20 + jsonLength))
// Geometry-only in-memory load: the GLB's position/index buffers stay identical.
for (const mesh of data.meshes) for (const primitive of mesh.primitives) delete primitive.material
delete data.images; delete data.textures; delete data.materials; delete data.samplers
let json = Buffer.from(JSON.stringify(data)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)])
const binary = bytes.subarray(20 + jsonLength), header = Buffer.alloc(20)
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + json.length + binary.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
const geometryOnly = Buffer.concat([header, json, binary])
const reef = await new GLTFLoader().parseAsync(geometryOnly.buffer.slice(geometryOnly.byteOffset, geometryOnly.byteOffset + geometryOnly.byteLength), '')
reef.scene.traverse(object => { if (object.isMesh) object.material.side = DoubleSide })
const server = await createServer({ configFile: false, cacheDir: '/tmp/aq-reef-derivation-vite-cache', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, appType: 'custom' })
try {
  const { deriveReefHabitat } = await server.ssrLoadModule('/src/rendering/scene/habitat.ts')
  const { obstacles, anchors } = deriveReefHabitat(reef.scene, -1, 'source')
  const snapshot = {
    schemaVersion: 1,
    source, sha256: createHash('sha256').update(bytes).digest('hex'),
    method: '4x4 columns covering real triangle bounds; lower upward-facing substrate ray hits. Anchor Y stores the conservative surface height without fish clearance. No refuge/host/perch/burrow inferred.',
    obstacles,
    anchors: anchors.map(anchor => ({ ...anchor, position: { ...anchor.position, y: anchor.position.y - .53 } })),
  }
  await fs.writeFile('src/rendering/scene/reef-habitat.json', JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`Derived ${obstacles.length} static columns and ${anchors.length} actual substrate points from ${snapshot.sha256}`)
} finally { await server.close() }
