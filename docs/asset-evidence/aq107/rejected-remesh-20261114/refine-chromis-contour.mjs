#!/usr/bin/env node
/**
 * Refine only the blue-green chromis GLB's 2D silhouette boundary.
 *
 * The immutable base GLB and project-original thumbnail are the inputs. The
 * mesh's smooth alpha SDF defines the remeshed boundary; original interior
 * attributes, separate components, PBR images, rig, animation and all other
 * fish assets are retained.
 * This is a deterministic asset pipeline tool, not a Blender replacement.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ShapeUtils, Vector2 } from 'three'
import { validateAssetContract } from '../src/rendering/assets/contract.ts'
import { ASSET_CLASS_BUDGETS } from '../src/rendering/assets/budgets.ts'

const scriptPath = fileURLToPath(import.meta.url)
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..')
const DEFAULT_PATHS = Object.freeze({
  glb: 'src/rendering/assets/splat-fish/blue-green-chromis.glb',
  report: 'src/rendering/assets/splat-fish/fish-blue-green-chromis-inspection.json',
  manifest: 'src/rendering/assets/splat-fish/manifest.json',
  source: 'public/fish/blue-green-chromis.webp',
  base: 'src/rendering/assets/splat-fish/sources/blue-green-chromis-contour-base.glb',
})
const BASE_GLB_SHA256 = 'c53ea07f3e6f96d254546cbb54f418106b268dcc00ea96c2aed14796e1b855de'
const SOURCE_WEBP_SHA256 = '1990dc99a1424e4cda5cccbd7508dbe4959718b5d5dcc0939b4e8b5401cb3049'
const MAX_EDGE_PX_AT_REFERENCE_WIDTH = 1.5
const REFERENCE_FISH_WIDTH_PX = 350
const MAX_SDF_CHORD_ERROR_PX = 0.3
const MAX_BOUNDARY_VERTICES = 10000
const GLB_JSON = 0x4e4f534a
const GLB_BIN = 0x004e4942

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }

function parseGlb(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) {
    throw new Error('Expected a complete glTF 2.0 binary file')
  }
  const chunks = []
  let offset = 12
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Truncated GLB chunk header')
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4)
    offset += 8
    if (offset + length > buffer.length) throw new Error('Truncated GLB chunk')
    chunks.push({ type, bytes: buffer.subarray(offset, offset + length) })
    offset += length
  }
  const jsonChunk = chunks.find(chunk => chunk.type === GLB_JSON)
  const binChunk = chunks.find(chunk => chunk.type === GLB_BIN)
  if (!jsonChunk || !binChunk || chunks.length !== 2) throw new Error('Expected one JSON and one BIN GLB chunk')
  return { json: JSON.parse(jsonChunk.bytes.toString('utf8').trimEnd()), binary: Buffer.from(binChunk.bytes) }
}

function encodeGlb(json, binary) {
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonPadding = (4 - jsonBytes.length % 4) % 4
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)])
  const binPadding = (4 - binary.length % 4) % 4
  const paddedBin = Buffer.concat([binary, Buffer.alloc(binPadding)])
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length
  const header = Buffer.alloc(12)
  header.write('glTF', 0, 'ascii'); header.writeUInt32LE(2, 4); header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(paddedJson.length, 0); jsonHeader.writeUInt32LE(GLB_JSON, 4)
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(paddedBin.length, 0); binHeader.writeUInt32LE(GLB_BIN, 4)
  return Buffer.concat([header, jsonHeader, paddedJson, binHeader, paddedBin])
}

const COMPONENT_BYTES = new Map([[5121, 1], [5123, 2], [5125, 4], [5126, 4]])
const TYPE_WIDTH = new Map([['SCALAR', 1], ['VEC2', 2], ['VEC3', 3], ['VEC4', 4]])

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex]
  if (!accessor || accessor.sparse) throw new Error(`Unsupported or missing accessor ${accessorIndex}`)
  const view = json.bufferViews[accessor.bufferView]
  const componentBytes = COMPONENT_BYTES.get(accessor.componentType), width = TYPE_WIDTH.get(accessor.type)
  if (!view || !componentBytes || !width) throw new Error(`Unsupported accessor layout ${accessorIndex}`)
  const stride = view.byteStride || componentBytes * width
  if (stride !== componentBytes * width) throw new Error(`Interleaved accessor ${accessorIndex} is not supported`)
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0)
  const count = accessor.count * width
  if (start + count * componentBytes > binary.length) throw new Error(`Accessor ${accessorIndex} exceeds the GLB binary chunk`)
  const values = new Array(count)
  for (let i = 0; i < count; i++) {
    const at = start + i * componentBytes
    values[i] = componentBytes === 4
      ? (accessor.componentType === 5126 ? binary.readFloatLE(at) : binary.readUInt32LE(at))
      : componentBytes === 2 ? binary.readUInt16LE(at) : binary[at]
  }
  return { accessor, values, width }
}

function encodeAttribute(values, componentType) {
  const bytes = COMPONENT_BYTES.get(componentType)
  const output = Buffer.alloc(values.length * bytes)
  for (let i = 0; i < values.length; i++) {
    const offset = i * bytes
    if (componentType === 5126) output.writeFloatLE(values[i], offset)
    else if (componentType === 5123) output.writeUInt16LE(values[i], offset)
    else if (componentType === 5121) output[offset] = values[i]
    else throw new Error(`Cannot encode component type ${componentType}`)
  }
  return output
}

function decodeSourceRgba(sourcePath) {
  const pam = execFileSync('dwebp', [sourcePath, '-pam', '-o', '-'], { maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
  const headerEnd = pam.indexOf(Buffer.from('ENDHDR\n')) + 7
  if (headerEnd < 7) throw new Error('dwebp output has no PAM header')
  const header = pam.subarray(0, headerEnd).toString('ascii')
  const width = Number(header.match(/WIDTH\s+(\d+)/)?.[1])
  const height = Number(header.match(/HEIGHT\s+(\d+)/)?.[1])
  const depth = Number(header.match(/DEPTH\s+(\d+)/)?.[1])
  const rgba = pam.subarray(headerEnd)
  if (!width || !height || depth !== 4 || rgba.length !== width * height * 4) throw new Error('Expected RGBA PAM output from dwebp')
  return { width, height, rgba }
}

function computeDistanceField(mask, width, height) {
  const infinity = 1e9, dist = new Float32Array(width * height)
  for (let i = 0; i < dist.length; i++) dist[i] = mask[i] ? infinity : 0
  const diagonal = Math.SQRT2
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x; let d = dist[i]; if (d === 0) continue
    if (x > 0) d = Math.min(d, dist[i - 1] + 1)
    if (y > 0) {
      d = Math.min(d, dist[i - width] + 1)
      if (x > 0) d = Math.min(d, dist[i - width - 1] + diagonal)
      if (x + 1 < width) d = Math.min(d, dist[i - width + 1] + diagonal)
    }
    dist[i] = d
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x; let d = dist[i]; if (d === 0) continue
    if (x + 1 < width) d = Math.min(d, dist[i + 1] + 1)
    if (y + 1 < height) {
      d = Math.min(d, dist[i + width] + 1)
      if (x + 1 < width) d = Math.min(d, dist[i + width + 1] + diagonal)
      if (x > 0) d = Math.min(d, dist[i + width - 1] + diagonal)
    }
    dist[i] = d
  }
  return dist
}

function buildSourceSdf(rgba, width, height) {
  const inside = new Uint8Array(width * height), outside = new Uint8Array(width * height)
  let minX = width, maxX = 0, minY = height, maxY = 0
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x
    if (rgba[i * 4 + 3] >= 80) {
      inside[i] = 1; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    } else outside[i] = 1
  }
  if (minX >= maxX || minY >= maxY) throw new Error('Source alpha has no useful silhouette')
  const insideDistance = computeDistanceField(inside, width, height)
  const outsideDistance = computeDistanceField(outside, width, height)
  let sdf = new Float32Array(width * height)
  for (let i = 0; i < sdf.length; i++) sdf[i] = inside[i] ? insideDistance[i] : -outsideDistance[i]
  const weight = d => d === 0 ? 6 : Math.abs(d) === 1 ? 4 : 1
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(sdf.length)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let sum = 0, total = 0
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const w = weight(dx) * weight(dy), sx = clamp(x + dx, 0, width - 1), sy = clamp(y + dy, 0, height - 1)
        sum += sdf[sy * width + sx] * w; total += w
      }
      next[y * width + x] = sum / total
    }
    sdf = next
  }
  function sample(u, v) {
    const fx = clamp(u * (width - 1), 0, width - 1), fy = clamp(v * (height - 1), 0, height - 1)
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1)
    const tx = fx - x0, ty = fy - y0
    const top = sdf[y0 * width + x0] * (1 - tx) + sdf[y0 * width + x1] * tx
    const bottom = sdf[y1 * width + x0] * (1 - tx) + sdf[y1 * width + x1] * tx
    return top * (1 - ty) + bottom * ty
  }
  const contourNodes = new Map(), contourLinks = new Map()
  const addContourLink = (a, b) => {
    const aa = contourLinks.get(a) || []; aa.push(b); contourLinks.set(a, aa)
    const bb = contourLinks.get(b) || []; bb.push(a); contourLinks.set(b, bb)
  }
  const edgeIntersection = (key, ax, ay, bx, by) => {
    if (contourNodes.has(key)) return
    const va = sdf[ay * width + ax], vb = sdf[by * width + bx]
    const t = clamp(va / (va - vb), 0, 1)
    contourNodes.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t])
  }
  for (let y = 0; y < height - 1; y++) for (let x = 0; x < width - 1; x++) {
    const values = [sdf[y * width + x], sdf[y * width + x + 1], sdf[(y + 1) * width + x + 1], sdf[(y + 1) * width + x]]
    const edges = []
    if ((values[0] >= 0) !== (values[1] >= 0)) { const key = `h${x},${y}`; edgeIntersection(key, x, y, x + 1, y); edges.push(key) }
    if ((values[1] >= 0) !== (values[2] >= 0)) { const key = `v${x + 1},${y}`; edgeIntersection(key, x + 1, y, x + 1, y + 1); edges.push(key) }
    if ((values[2] >= 0) !== (values[3] >= 0)) { const key = `h${x},${y + 1}`; edgeIntersection(key, x + 1, y + 1, x, y + 1); edges.push(key) }
    if ((values[3] >= 0) !== (values[0] >= 0)) { const key = `v${x},${y}`; edgeIntersection(key, x, y + 1, x, y); edges.push(key) }
    if (edges.length === 2) addContourLink(edges[0], edges[1])
    else if (edges.length === 4) {
      const centerInside = values.reduce((sum, value) => sum + value, 0) >= 0
      const corner0Inside = values[0] >= 0
      if (centerInside === corner0Inside) { addContourLink(edges[0], edges[1]); addContourLink(edges[2], edges[3]) }
      else { addContourLink(edges[0], edges[3]); addContourLink(edges[1], edges[2]) }
    }
  }
  const contourLoops = [], visitedContourNodes = new Set()
  for (const key of contourNodes.keys()) {
    if (visitedContourNodes.has(key)) continue
    const links = contourLinks.get(key) || []
    if (links.length !== 2) continue
    const loop = [key]
    let previous = key, current = links[0]
    while (current !== key && loop.length <= contourNodes.size) {
      if (visitedContourNodes.has(current)) break
      loop.push(current); visitedContourNodes.add(current)
      const nexts = contourLinks.get(current) || []
      if (nexts.length !== 2) break
      const next = nexts.find(item => item !== previous)
      previous = current; current = next
    }
    visitedContourNodes.add(key)
    if (current === key && loop.length >= 8) {
      const area = loop.reduce((sum, node, i) => {
        const a = contourNodes.get(node), b = contourNodes.get(loop[(i + 1) % loop.length])
        return sum + a[0] * b[1] - b[0] * a[1]
      }, 0)
      contourLoops.push({ loop, area: Math.abs(area) })
    }
  }
  contourLoops.sort((a, b) => b.area - a.area)
  const outerContourLoop = contourLoops[0]?.loop
  if (!outerContourLoop) throw new Error('SDF did not produce a closed outer silhouette contour')
  return { width, height, minX, maxX, minY, maxY, sample, contour: outerContourLoop.map(key => { const p = contourNodes.get(key); return [p[0] / (width - 1), p[1] / (height - 1)] }) }
}

function fitCoordinate(uvValues, positions, vertexIndices, uvComponent, positionComponent) {
  let sumU = 0, sumP = 0
  for (const i of vertexIndices) { sumU += uvValues[i * 2 + uvComponent]; sumP += positions[i * 3 + positionComponent] }
  const meanU = sumU / vertexIndices.length, meanP = sumP / vertexIndices.length
  let numerator = 0, denominator = 0
  for (const i of vertexIndices) {
    const du = uvValues[i * 2 + uvComponent] - meanU
    numerator += du * (positions[i * 3 + positionComponent] - meanP); denominator += du * du
  }
  if (denominator < 1e-12) throw new Error('Cannot map source UVs onto the exported boundary')
  const slope = numerator / denominator
  return { slope, intercept: meanP - slope * meanU, at: u => slope * u + (meanP - slope * meanU) }
}

function buildBoundaryEdges(indices, positions, uvs, sdf) {
  const isPlane = new Uint8Array(positions.length / 3)
  for (let i = 0; i < isPlane.length; i++) if (Math.abs(positions[i * 3]) <= 1e-7) isPlane[i] = 1
  const edges = new Map(), triangles = []
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i], indices[i + 1], indices[i + 2]]
    triangles.push(tri)
    for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
      if (!isPlane[a] || !isPlane[b]) continue
      const low = Math.min(a, b), high = Math.max(a, b), key = `${low},${high}`
      const current = edges.get(key) || { low, high, incidence: 0 }
      current.incidence++; edges.set(key, current)
    }
  }
  const outline = [...edges.values()].filter(edge => edge.incidence === 2)
  for (const edge of edges.values()) if (edge.incidence === 1
    && Math.abs(positions[edge.low * 3]) <= 2e-4 && Math.abs(positions[edge.high * 3]) <= 2e-4
    && Math.abs(sdf.sample(uvs[edge.low * 2], uvs[edge.low * 2 + 1])) <= 0.05
    && Math.abs(sdf.sample(uvs[edge.high * 2], uvs[edge.high * 2 + 1])) <= 0.05) outline.push(edge)
  const degree = new Map()
  for (const edge of outline) { degree.set(edge.low, (degree.get(edge.low) || 0) + 1); degree.set(edge.high, (degree.get(edge.high) || 0) + 1) }
  if (outline.length < 100 || [...degree.values()].some(value => value !== 2)) throw new Error('Expected a closed, connected-degree-two chromis silhouette boundary')
  const outlineSet = new Set(outline.map(edge => `${edge.low},${edge.high}`))
  return { outline, outlineSet, triangles }
}

function blendSkin(vertices, joints, weights) {
  const accum = new Map()
  for (const { index, factor } of vertices) for (let k = 0; k < 4; k++) {
    const weight = weights[index * 4 + k] * factor
    if (weight > 0) accum.set(joints[index * 4 + k], (accum.get(joints[index * 4 + k]) || 0) + weight)
  }
  const sorted = [...accum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  const sum = sorted.reduce((total, [, value]) => total + value, 0)
  if (!(sum > 0)) throw new Error('Cannot interpolate an empty skin weight')
  const outJoints = [0, 0, 0, 0], outWeights = [0, 0, 0, 0]
  for (let i = 0; i < sorted.length; i++) { outJoints[i] = sorted[i][0]; outWeights[i] = sorted[i][1] / sum }
  return { joints: outJoints, weights: outWeights }
}

function triangleNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
}

function refineMesh(mesh, sdf, fishWidthPx = REFERENCE_FISH_WIDTH_PX) {
  const { json, binary } = mesh
  const primitive = json.meshes?.[0]?.primitives?.[0]
  if (!primitive || json.meshes[0].primitives.length !== 1 || primitive.mode && primitive.mode !== 4) throw new Error('Expected one triangle-list chromis mesh primitive')
  const attrs = primitive.attributes
  const positionData = readAccessor(json, binary, attrs.POSITION)
  const normalData = readAccessor(json, binary, attrs.NORMAL)
  const uvData = readAccessor(json, binary, attrs.TEXCOORD_0)
  const jointData = readAccessor(json, binary, attrs.JOINTS_0)
  const weightData = readAccessor(json, binary, attrs.WEIGHTS_0)
  const indexData = readAccessor(json, binary, primitive.indices)
  if (positionData.width !== 3 || normalData.width !== 3 || uvData.width !== 2 || jointData.width !== 4 || weightData.width !== 4 || indexData.width !== 1) throw new Error('Unexpected chromis vertex/index attribute shape')
  if (positionData.accessor.componentType !== 5126 || uvData.accessor.componentType !== 5126 || normalData.accessor.componentType !== 5126 || jointData.accessor.componentType !== 5121 || weightData.accessor.componentType !== 5126 || indexData.accessor.componentType !== 5123) throw new Error('Unexpected chromis vertex/index component types')
  const positions = [...positionData.values], uvs = [...uvData.values], joints = [...jointData.values], weights = [...weightData.values]
  const indices = indexData.values
  if (indices.length % 3 !== 0) throw new Error('Chromis index accessor is not a triangle list')
  const { outline, outlineSet, triangles } = buildBoundaryEdges(indices, positions, uvs, sdf)
  const contourVertices = new Set()
  for (const edge of outline) { contourVertices.add(edge.low); contourVertices.add(edge.high) }
  const yFromV = fitCoordinate(uvs, positions, [...contourVertices], 1, 1)
  const zFromU = fitCoordinate(uvs, positions, [...contourVertices], 0, 2)
  const projectionScale = fishWidthPx / 2 // exported fish longitudinal bounds are normalized to exactly 2 m
  const sdfToScreen = fishWidthPx / (sdf.maxX - sdf.minX)

  const appendVertex = (position, uv, skin) => {
    const index = positions.length / 3
    positions.push(...position); uvs.push(...uv); joints.push(...skin.joints); weights.push(...skin.weights)
    return index
  }
  const bodyVertices = new Set([outline[0].low])
  let expandedBody=true
  while(expandedBody) { expandedBody=false; for(const tri of triangles) if(tri.some(i=>bodyVertices.has(i))) for(const i of tri) if(!bodyVertices.has(i)){bodyVertices.add(i);expandedBody=true} }
  // Use one traversal of the SDF contour; independently matching adjacent
  // source edges can traverse the same contour span twice at folded fins.
  const loop = [], actualEdgeStats = []
  for (let i=0;i<sdf.contour.length;i++) {
    const a=sdf.contour[i]
    {
      const uv=a
      let best=null
      for(const edge of outline) {
        const u=[uvs[edge.low*2],uvs[edge.low*2+1]], v=[uvs[edge.high*2],uvs[edge.high*2+1]]
        const dx=(v[0]-u[0])*(sdf.width-1), dy=(v[1]-u[1])*(sdf.height-1)
        const px=(uv[0]-u[0])*(sdf.width-1), py=(uv[1]-u[1])*(sdf.height-1)
        const f=clamp((px*dx+py*dy)/(dx*dx+dy*dy),0,1), distance=(px-f*dx)**2+(py-f*dy)**2
        if(!best||distance<best.distance)best={edge,f,distance}
      }
      const skin=blendSkin([{index:best.edge.low,factor:1-best.f},{index:best.edge.high,factor:best.f}],joints,weights)
      const index=appendVertex([0,yFromV.at(uv[1]),zFromU.at(uv[0])],uv,skin)
      loop.push(index);actualEdgeStats.push({node:{uv}})
    }
  }
  const point = i => [positions[i * 3 + 1], positions[i * 3 + 2]]
  const cross2 = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  let changed = true
  while(changed) {
    changed=false
    for(let i=0;i<loop.length;i++) {
      const a=point(loop[(i+loop.length-1)%loop.length]),b=point(loop[i]),c=point(loop[(i+1)%loop.length])
      if(Math.abs(cross2(a,b,c))/Math.hypot(c[0]-a[0],c[1]-a[1])*projectionScale<0.01) { loop.splice(i,1); changed=true; break }
    }
  }
  // Zero-thickness vertices omitted by the base edge classifier are also
  // silhouette points. Retain their exact attributes in contour order.
  for(let vertex=0;vertex<positionData.accessor.count;vertex++) {
    if(!bodyVertices.has(vertex)||contourVertices.has(vertex)||Math.abs(positions[vertex*3])>1e-7)continue
    const p=point(vertex);let best={distance:Infinity,index:-1}
    for(let i=0;i<loop.length;i++) {
      const a=point(loop[i]),b=point(loop[(i+1)%loop.length]),dx=b[0]-a[0],dy=b[1]-a[1]
      const t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy),0,1)
      const distance=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
      if(distance<best.distance)best={distance,index:i}
    }
    if(best.distance>1e-4)throw new Error(`Center-plane point ${vertex} is not on the contour`)
    loop.splice(best.index+1,0,vertex);contourVertices.add(vertex)
  }
  const polygon = loop.map(i => new Vector2(...point(i)))
  const seed = ShapeUtils.triangulateShape(polygon, []).map(t => t.map(i => loop[i]))
  if (seed.length !== loop.length - 2) throw new Error(`Silhouette triangulation did not cover its domain: ${seed.length} / ${loop.length}; used ${new Set(seed.flat()).size}`)
  const refinedIndices = [], parentNormals = []
  for (const side of [1, -1]) {
    const faces = seed.filter(t => Math.abs(cross2(...t.map(point))) > 1e-14).map(t => {
      const area = cross2(...t.map(point))
      if (Math.abs(area) < 1e-14) throw new Error(`Degenerate seed triangle ${area} ${JSON.stringify(t.map(point))}`)
      return Math.sign(area) === side ? t : [t[0],t[2],t[1]]
    })
    for (let vertex = 0; vertex < positionData.accessor.count; vertex++) {
      if (!bodyVertices.has(vertex) || contourVertices.has(vertex)) continue
      const x = positions[vertex*3]
      if (side*x < -1e-7) continue
      const p = point(vertex)
      let match = -1, edge = -1
      for (let i=0;i<faces.length;i++) {
        const face=faces[i], q=face.map(point)
        const signs=[cross2(q[0],q[1],p),cross2(q[1],q[2],p),cross2(q[2],q[0],p)].map(v => v*side)
        if (signs.every(v => v >= -1e-13)) { match=i; edge=signs.findIndex(v => Math.abs(v) <= 1e-13); break }
      }
      if (match < 0) throw new Error(`Interior vertex ${vertex} falls outside refined silhouette on side ${side}, sdf ${sdf.sample(uvs[vertex*2],uvs[vertex*2+1])}, p ${p}`)
      const face=faces[match]
      if (edge < 0) {
        faces.splice(match,1,[face[0],face[1],vertex],[face[1],face[2],vertex],[face[2],face[0],vertex])
      } else {
        const a=face[edge], b=face[(edge+1)%3]
        const incident=[]
        for(let i=0;i<faces.length;i++) if(faces[i].includes(a)&&faces[i].includes(b)) incident.push(i)
        if(incident.length!==2) throw new Error(`Interior vertex ${vertex} touches contour or nonmanifold edge ${a},${b}`)
        for(const i of incident.reverse()) {
          const f=faces[i], e=f.findIndex((v,j)=>v===a&&f[(j+1)%3]===b || v===b&&f[(j+1)%3]===a)
          const u=f[e], v=f[(e+1)%3], w=f[(e+2)%3]
          faces.splice(i,1,[u,vertex,w],[vertex,v,w])
        }
      }
    }
    for(const face of faces) { refinedIndices.push(...face); parentNormals.push([side,0,0]) }
  }
  // Split long straight boundary edges after triangulation; inserting collinear
  // points into the polygon before ear clipping can create zero-area ears.
  const splitLoop=[]
  for(let i=0;i<loop.length;i++) {
    const a=loop[i],b=loop[(i+1)%loop.length], pa=point(a),pb=point(b)
    const parts=Math.ceil(Math.hypot(pa[0]-pb[0],pa[1]-pb[1])*projectionScale/MAX_EDGE_PX_AT_REFERENCE_WIDTH)
    const chain=[a]; splitLoop.push(a)
    for(let part=1;part<parts;part++) {
      const t=part/parts
      const pos=[0,positions[3*a+1]*(1-t)+positions[3*b+1]*t,positions[3*a+2]*(1-t)+positions[3*b+2]*t]
      const uv=[uvs[2*a]*(1-t)+uvs[2*b]*t,uvs[2*a+1]*(1-t)+uvs[2*b+1]*t]
      const skin=blendSkin([{index:a,factor:1-t},{index:b,factor:t}],joints,weights)
      const v=appendVertex(pos,uv,skin);chain.push(v);splitLoop.push(v);actualEdgeStats.push({node:{uv}})
    }
    chain.push(b)
    if(parts<=1)continue
    const incidents=[]
    for(let j=0;j<refinedIndices.length;j+=3) {
      const face=refinedIndices.slice(j,j+3), e=face.findIndex((v,k)=>v===a&&face[(k+1)%3]===b||v===b&&face[(k+1)%3]===a)
      if(e>=0)incidents.push({j,face,e,normal:parentNormals[j/3]})
    }
    if(incidents.length!==2)throw new Error(`Boundary edge ${a},${b} has ${incidents.length} incident body faces`)
    for(const {j,face,e,normal} of incidents.reverse()) {
      const nodes=face[e]===a?chain:[...chain].reverse(),third=face[(e+2)%3],replacement=[]
      for(let k=0;k<nodes.length-1;k++)replacement.push(nodes[k],nodes[k+1],third)
      refinedIndices.splice(j,3,...replacement);parentNormals.splice(j/3,1,...Array(nodes.length-1).fill(normal))
    }
  }
  loop.splice(0,loop.length,...splitLoop)
  // The two sides can share interior chords whose endpoints both lie on the
  // zero-thickness fin boundary. Give each side its own midpoint on such a
  // chord, so only actual silhouette edges remain shared by the two sides.
  const incidence=new Map()
  for(let i=0;i<refinedIndices.length;i+=3) for(const [a,b] of [[refinedIndices[i],refinedIndices[i+1]],[refinedIndices[i+1],refinedIndices[i+2]],[refinedIndices[i+2],refinedIndices[i]]]) {
    const k=`${Math.min(a,b)},${Math.max(a,b)}`;incidence.set(k,(incidence.get(k)||0)+1)
  }
  const bad=[...incidence].filter(([,count])=>count!==2)
  if(bad.some(([,count])=>count!==4))throw new Error('Body has open or multiply incident edges')
  for(const [key] of bad) {
    const [a,b]=key.split(',').map(Number)
    const midpoint=side => appendVertex([side * 1e-5,(positions[3*a+1]+positions[3*b+1])/2,(positions[3*a+2]+positions[3*b+2])/2],[(uvs[2*a]+uvs[2*b])/2,(uvs[2*a+1]+uvs[2*b+1])/2],blendSkin([{index:a,factor:.5},{index:b,factor:.5}],joints,weights))
    const nodes=new Map([[1,midpoint(1)],[-1,midpoint(-1)]])
    const incidents=[]
    for(let j=0;j<refinedIndices.length;j+=3) {
      const face=refinedIndices.slice(j,j+3), e=face.findIndex((v,k)=>v===a&&face[(k+1)%3]===b||v===b&&face[(k+1)%3]===a)
      if(e>=0)incidents.push({j,face,e,normal:parentNormals[j/3]})
    }
    if(incidents.length!==4)throw new Error(`Shared internal chord ${key} lost incident faces`)
    for(const {j,face,e,normal} of incidents.reverse()) {
      const v=nodes.get(Math.sign(normal[0])),u=face[e],w=face[(e+1)%3],third=face[(e+2)%3]
      refinedIndices.splice(j,3,u,v,third,v,w,third);parentNormals.splice(j/3,1,normal,normal)
    }
  }
  const finalIncidence=new Map()
  for(let i=0;i<refinedIndices.length;i+=3) for(const [a,b] of [[refinedIndices[i],refinedIndices[i+1]],[refinedIndices[i+1],refinedIndices[i+2]],[refinedIndices[i+2],refinedIndices[i]]]) {
    const k=`${Math.min(a,b)},${Math.max(a,b)}`;finalIncidence.set(k,(finalIncidence.get(k)||0)+1)
  }
  if([...finalIncidence.values()].some(count=>count!==2))throw new Error('Body remesh is not closed and manifold')
  for(let i=0;i<positions.length;i++)positions[i]=Math.fround(positions[i])
  for(const tri of triangles) if(!bodyVertices.has(tri[0])) {
    refinedIndices.push(...tri)
    parentNormals.push(triangleNormal(...tri.map(i => positions.slice(i*3,i*3+3))))
  }
  if (positions.length / 3 > MAX_BOUNDARY_VERTICES + positionData.accessor.count) throw new Error('Refined chromis exceeded its explicit vertex-growth bound')
  const finalTriangleCount = refinedIndices.length / 3
  const budget = ASSET_CLASS_BUDGETS['background-fish']
  if (finalTriangleCount > budget.maxTriangles) throw new Error(`Refined chromis has ${finalTriangleCount} triangles, above its ${budget.maxTriangles} cap`)

  const normals = new Float32Array(positions.length)
  const triangleMetrics = { zeroArea: 0, inverted: 0, minArea2: Infinity }
  for (let i = 0; i < refinedIndices.length; i += 3) {
    const ia = refinedIndices[i], ib = refinedIndices[i + 1], ic = refinedIndices[i + 2]
    const a = positions.slice(ia * 3, ia * 3 + 3), b = positions.slice(ib * 3, ib * 3 + 3), c = positions.slice(ic * 3, ic * 3 + 3)
    const normal = triangleNormal(a, b, c), area2 = Math.hypot(...normal)
    const parent = parentNormals[i / 3]
    const dot = normal[0] * parent[0] + normal[1] * parent[1] + normal[2] * parent[2]
    triangleMetrics.minArea2 = Math.min(triangleMetrics.minArea2, area2)
    if (!(area2 > 1e-11)) triangleMetrics.zeroArea++
    if (!(dot > 1e-12)) triangleMetrics.inverted++
    for (const index of [ia, ib, ic]) { normals[index * 3] += normal[0]; normals[index * 3 + 1] += normal[1]; normals[index * 3 + 2] += normal[2] }
  }
  if (triangleMetrics.zeroArea || triangleMetrics.inverted) throw new Error(`Triangle validation failed: ${JSON.stringify(triangleMetrics)}`)
  for (let i = 0; i < normals.length; i += 3) {
    const x = positions[i], z = positions[i + 2]
    if (z > 0.35 && Math.abs(x) < 0.035) normals[i] *= clamp(Math.abs(x) / 0.035, 0, 1)
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2])
    if (!(length > 1e-12)) { if (contourVertices.has(i / 3)) { normals.set(normalData.values.slice(i,i+3),i); continue } if (i / 3 >= positionData.accessor.count) { normals[i] = 1; continue } throw new Error(`Vertex ${i / 3} has no usable normal`) }
    normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length
  }

  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], maxWeightError = 0
  for (let i = 0; i < positions.length; i += 3) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], positions[i + axis]); max[axis] = Math.max(max[axis], positions[i + axis])
  }
  for (let i = 0; i < weights.length; i += 4) {
    const sum = weights[i] + weights[i + 1] + weights[i + 2] + weights[i + 3]
    maxWeightError = Math.max(maxWeightError, Math.abs(sum - 1))
    if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-5) throw new Error(`Vertex ${i / 4} skin weights are not normalized`)
  }
  const maxBoundarySdf = Math.max(...actualEdgeStats.map(({ node }) => Math.abs(sdf.sample(node.uv[0], node.uv[1]))))
  const refinedEdgeLengths = loop.map((vertex,i) => {
    const a=point(vertex),b=point(loop[(i+1)%loop.length]); return Math.hypot(a[0]-b[0],a[1]-b[1])*projectionScale
  })

  let maxChordErrorPx=0
  for(let i=0;i<loop.length;i++) {
    const a=loop[i], b=loop[(i+1)%loop.length]
    for(const t of [0,.25,.5,.75,1]) maxChordErrorPx=Math.max(maxChordErrorPx,Math.abs(sdf.sample(uvs[a*2]*(1-t)+uvs[b*2]*t,uvs[a*2+1]*(1-t)+uvs[b*2+1]*t))*sdfToScreen)
  }
  if(Math.max(...refinedEdgeLengths)>MAX_EDGE_PX_AT_REFERENCE_WIDTH+1e-6 || maxChordErrorPx>MAX_SDF_CHORD_ERROR_PX)throw new Error(`Contour limits exceeded: edge ${Math.max(...refinedEdgeLengths)}, chord ${maxChordErrorPx}`)

  const replacements = new Map()
  const updatedAttributes = {
    POSITION: encodeAttribute(positions, positionData.accessor.componentType),
    NORMAL: encodeAttribute(normals, normalData.accessor.componentType),
    TEXCOORD_0: encodeAttribute(uvs, uvData.accessor.componentType),
    JOINTS_0: encodeAttribute(joints, jointData.accessor.componentType),
    WEIGHTS_0: encodeAttribute(weights, weightData.accessor.componentType),
  }
  for (const [semantic, bytes] of Object.entries(updatedAttributes)) {
    const accessor = json.accessors[attrs[semantic]]
    accessor.count = positions.length / 3
    replacements.set(accessor.bufferView, bytes)
  }
  const indexBytes = encodeAttribute(refinedIndices, indexData.accessor.componentType)
  json.accessors[primitive.indices].count = refinedIndices.length
  json.accessors[primitive.indices].min = [Math.min(...refinedIndices)]
  json.accessors[primitive.indices].max = [Math.max(...refinedIndices)]
  replacements.set(indexData.accessor.bufferView, indexBytes)
  for (let i = 0; i < positions.length; i += 3) {
    // Position bounds are written below from the complete output positions.
  }
  const positionAccessor = json.accessors[attrs.POSITION]
  positionAccessor.min = min; positionAccessor.max = max
  const rebuiltBinary = rebuildBufferViews(json, binary, replacements)
  json.buffers[0].byteLength = rebuiltBinary.length
  return {
    binary: rebuiltBinary,
    metrics: {
      sourceDimensions: [sdf.width, sdf.height],
      sourceAlphaBounds: [sdf.minX, sdf.minY, sdf.maxX, sdf.maxY],
      originalBoundaryEdges: outline.length,
      addedBoundaryVertices: actualEdgeStats.length,
      maxRefinedEdgePxAt350: Math.max(0, ...refinedEdgeLengths),
      p95RefinedEdgePxAt350: [...refinedEdgeLengths].sort((a, b) => a - b)[Math.floor((refinedEdgeLengths.length - 1) * 0.95)],
      maxAddedContourVertexSdfResidualSourcePx: maxBoundarySdf,
      maxChordErrorPxAt350: maxChordErrorPx,
      bodyNonManifoldEdges: 0,
      triangleCountBefore: indices.length / 3,
      triangleCountAfter: finalTriangleCount,
      triangleMetrics,
      maxSkinWeightSumError: maxWeightError,
      bounds: { min, max },
    },
  }
}

function rebuildBufferViews(json, binary, replacements) {
  const views = json.bufferViews.map((view, index) => ({ view, index, start: view.byteOffset || 0, end: (view.byteOffset || 0) + view.byteLength })).sort((a, b) => a.start - b.start)
  const chunks = [], originalUnreferencedRanges = []
  let previousEnd = 0, newOffset = 0
  for (const { view, index, start, end } of views) {
    if (start < previousEnd || end > binary.length) throw new Error(`Overlapping or invalid original bufferView ${index}`)
    if (start > previousEnd) {
      const gap = binary.subarray(previousEnd, start)
      chunks.push(gap); newOffset += gap.length; originalUnreferencedRanges.push(gap)
    }
    const replacement = replacements.get(index)
    const bytes = replacement || binary.subarray(start, end)
    const padding = (4 - newOffset % 4) % 4
    if (padding) { chunks.push(Buffer.alloc(padding)); newOffset += padding }
    view.byteOffset = newOffset; view.byteLength = bytes.length
    chunks.push(bytes); newOffset += bytes.length; previousEnd = end
  }
  if (previousEnd < binary.length) chunks.push(binary.subarray(previousEnd))
  return Buffer.concat(chunks)
}

function replaceManifestEntryText(manifestText, nextEntry) {
  const assetsKey = manifestText.indexOf('"assets"')
  const arrayStart = manifestText.indexOf('[', assetsKey)
  if (assetsKey < 0 || arrayStart < 0) throw new Error('Could not locate manifest assets array')
  let inString = false, escaped = false, braceDepth = 0, entryStart = -1
  for (let i = arrayStart + 1; i < manifestText.length; i++) {
    const ch = manifestText[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') { if (braceDepth === 0) entryStart = i; braceDepth++; continue }
    if (ch === '}') {
      braceDepth--
      if (braceDepth === 0) {
        const entryEnd = i + 1
        const entry = JSON.parse(manifestText.slice(entryStart, entryEnd))
        if (entry.id === 'fish-blue-green-chromis') {
          const lineStart = manifestText.lastIndexOf('\n', entryStart) + 1
          const indent = manifestText.slice(lineStart, entryStart)
          const serialized = JSON.stringify(nextEntry, null, 2).replaceAll('\n', `\n${indent}`)
          return manifestText.slice(0, entryStart) + serialized + manifestText.slice(entryEnd)
        }
      }
    }
  }
  throw new Error('Chromis entry not found in manifest')
}

function atomicWrite(filePath, bytes) {
  const tempPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`
  const fd = fs.openSync(tempPath, 'wx', 0o644)
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  fs.renameSync(tempPath, filePath)
}

function inspectImageBytes(doc, binary) {
  return doc.images.map(image => {
    const view = doc.bufferViews[image.bufferView], bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Chromis PBR maps must remain embedded PNGs')
    return { mimeType: image.mimeType, bytes: bytes.length, widthPx: bytes.readUInt32BE(16), heightPx: bytes.readUInt32BE(20), sha256: sha256(bytes) }
  })
}

function validateAndRefreshMetadata({ glb, report, manifest, scriptHash, baseHash, sourceHash, metrics, sourceInputs }) {
  const parsed = parseGlb(glb), doc = parsed.json
  const primitive = doc.meshes[0].primitives[0]
  const positions = readAccessor(doc, parsed.binary, primitive.attributes.POSITION).values
  const bounds = { min: [...metrics.bounds.min], max: [...metrics.bounds.max] }
  const dimensions = bounds.min.map((value, axis) => Number((bounds.max[axis] - value).toFixed(6)))
  const rootNodeIndex = doc.scenes?.[0]?.nodes?.[0] ?? 0
  const rootNode = doc.nodes[rootNodeIndex]
  const reefAsset = rootNode?.extras?.reefAsset
  if (!reefAsset || reefAsset.id !== 'fish-blue-green-chromis') throw new Error('Chromis GLB root provenance is missing')
  reefAsset.dimensionsM = dimensions
  reefAsset.provenance.sourceSha256 = scriptHash
  reefAsset.provenance.recipe = `node scripts/refine-chromis-contour.mjs; baseGlbSha256=${baseHash}; sourceWebpSha256=${sourceHash}`
  const inspection = JSON.parse(report)
  inspection.extras.reefAsset = structuredClone(reefAsset)
  inspection.boundsM = bounds
  inspection.primitives[0].vertexCount = positions.length / 3
  inspection.primitives[0].boundsM = bounds
  const validation = validateAssetContract(inspection)
  if (!validation.valid) throw new Error(`Inspection contract failed: ${JSON.stringify(validation.issues)}`)
  const triangles = primitive.indices === undefined ? 0 : doc.accessors[primitive.indices].count / 3
  const outputBytes = glb.length
  if (outputBytes > ASSET_CLASS_BUDGETS['background-fish'].maxFileBytes) throw new Error('Refined chromis exceeded the background-fish file cap')
  if (triangles > ASSET_CLASS_BUDGETS['background-fish'].maxTriangles) throw new Error('Refined chromis exceeded the background-fish triangle cap')
  const textures = inspectImageBytes(doc, parsed.binary)
  if (textures.length > ASSET_CLASS_BUDGETS['background-fish'].maxTextureMaps || textures.some(tex => Math.max(tex.widthPx, tex.heightPx) > ASSET_CLASS_BUDGETS['background-fish'].maxTextureDimensionPx)) {
    throw new Error('Refined chromis exceeded the background-fish texture cap')
  }
  const nextManifest = { ...manifest }
  const row = nextManifest.assets.find(entry => entry.id === 'fish-blue-green-chromis')
  if (!row) throw new Error('Chromis manifest row is missing')
  Object.assign(row, {
    sha256: sha256(glb), bytes: outputBytes, triangles,
    dimensionsM: dimensions, boundsM: bounds,
    primitives: row.primitives.map((item, index) => index === 0 ? { ...item, vertexCount: positions.length / 3 } : item),
    generator: 'scripts/refine-chromis-contour.mjs', generatorSha256: scriptHash,
    recipe: reefAsset.provenance.recipe,
    sourceInputs,
  })
  return { inspection, nextManifest, textures, triangles }
}

function readArguments(argv) {
  let root = repositoryRoot, dryRun = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = path.resolve(argv[++i] || '')
    else if (argv[i] === '--dry-run') dryRun = true
    else if (argv[i] === '--help') return { help: true }
    else throw new Error(`Unknown argument ${argv[i]}`)
  }
  return { root, dryRun }
}

export async function main(argv = process.argv.slice(2)) {
  const args = readArguments(argv)
  if (args.help) {
    console.log('Usage: node --experimental-strip-types scripts/refine-chromis-contour.mjs [--root REPO] [--dry-run]')
    return
  }
  const root = args.root
  const paths = Object.fromEntries(Object.entries(DEFAULT_PATHS).map(([key, value]) => [key, path.join(root, value)]))
  const scriptHash = sha256(fs.readFileSync(scriptPath))
  for (const [label, file] of Object.entries({ source: paths.source, glb: paths.glb, report: paths.report, manifest: paths.manifest })) {
    if (!fs.existsSync(file)) throw new Error(`Missing ${label} input: ${file}`)
  }
  const originalGlb = fs.readFileSync(paths.glb), originalHash = sha256(originalGlb)
  const sourceBytes = fs.readFileSync(paths.source), sourceHash = sha256(sourceBytes)
  if (sourceHash !== SOURCE_WEBP_SHA256) throw new Error(`Source WebP hash mismatch: ${sourceHash}`)
  const originalReportBytes = fs.readFileSync(paths.report), originalManifestBytes = fs.readFileSync(paths.manifest)
  const originalReport = originalReportBytes.toString('utf8'), originalManifestText = originalManifestBytes.toString('utf8')
  const manifest = JSON.parse(originalManifestText)
  const manifestEntry = manifest.assets?.find(entry => entry.id === 'fish-blue-green-chromis')
  if (!manifestEntry) throw new Error('Chromis manifest row is missing')

  if (!fs.existsSync(paths.base)) throw new Error('Missing immutable base GLB; refusing to generate or write outputs')
  const verifiedBaseBytes = fs.readFileSync(paths.base), baseHash = sha256(verifiedBaseBytes)
  if (baseHash !== BASE_GLB_SHA256) throw new Error('Immutable base GLB hash mismatch')
  const priorSourceInputs = manifestEntry.sourceInputs
  const mayReplaceCurrent = originalHash === BASE_GLB_SHA256
    || (originalHash === manifestEntry.sha256 && manifestEntry.generator === 'scripts/refine-chromis-contour.mjs'
      && priorSourceInputs?.baseGlbSha256 === baseHash && priorSourceInputs?.sourceWebpSha256 === sourceHash)
  if (!mayReplaceCurrent) throw new Error('Current chromis GLB does not match the pinned base or a prior output from this refinement pipeline')
  if (manifestEntry.sha256 !== originalHash) throw new Error('Current manifest row does not pin the current chromis GLB')

  const beforeImages = inspectImageBytes(parseGlb(verifiedBaseBytes).json, parseGlb(verifiedBaseBytes).binary)
  const mesh = parseGlb(verifiedBaseBytes)
  const source = decodeSourceRgba(paths.source)
  const sdf = buildSourceSdf(source.rgba, source.width, source.height)
  const refined = refineMesh(mesh, sdf)
  const outputGlb = encodeGlb(mesh.json, refined.binary)
  const outputParsed = parseGlb(outputGlb)
  const afterImages = inspectImageBytes(outputParsed.json, outputParsed.binary)
  if (JSON.stringify(beforeImages) !== JSON.stringify(afterImages)) throw new Error('PBR texture payload changed during contour refinement')

  const sourceInputs = { baseGlbSha256: baseHash, sourceWebpSha256: sourceHash }
  const refreshed = validateAndRefreshMetadata({
    glb: outputGlb, report: originalReport, manifest, scriptHash, baseHash, sourceHash,
    metrics: refined.metrics, sourceInputs,
  })
  outputParsed.json.nodes[outputParsed.json.scenes?.[0]?.nodes?.[0] ?? 0].extras.reefAsset = structuredClone(refreshed.inspection.extras.reefAsset)
  const finalGlb = encodeGlb(outputParsed.json, outputParsed.binary)
  if (finalGlb.length > ASSET_CLASS_BUDGETS['background-fish'].maxFileBytes) throw new Error('Final encoded chromis exceeded the background-fish file cap')
  refreshed.nextManifest.assets.find(entry => entry.id === 'fish-blue-green-chromis').sha256 = sha256(finalGlb)
  refreshed.nextManifest.assets.find(entry => entry.id === 'fish-blue-green-chromis').bytes = finalGlb.length
  const finalReport = JSON.stringify(refreshed.inspection, null, 2) + '\n'
  const finalManifest = replaceManifestEntryText(originalManifestText, refreshed.nextManifest.assets.find(entry => entry.id === 'fish-blue-green-chromis'))

  const finalContract = validateAssetContract(refreshed.inspection)
  if (!finalContract.valid) throw new Error(`Final inspection contract failed: ${JSON.stringify(finalContract.issues)}`)
  if (sha256(fs.readFileSync(paths.source)) !== sourceHash || sha256(fs.readFileSync(paths.base)) !== baseHash) throw new Error('Pinned source changed during refinement')
  if (sha256(fs.readFileSync(paths.glb)) !== originalHash
    || sha256(fs.readFileSync(paths.report)) !== sha256(originalReportBytes)
    || sha256(fs.readFileSync(paths.manifest)) !== sha256(originalManifestBytes)) throw new Error('Chromis outputs or manifest changed concurrently; refusing to overwrite')

  if (!args.dryRun) {
    atomicWrite(paths.glb, finalGlb)
    atomicWrite(paths.report, Buffer.from(finalReport))
    atomicWrite(paths.manifest, Buffer.from(finalManifest))
  }
  console.log(JSON.stringify({
    dryRun: args.dryRun,
    sourceInputs,
    scriptSha256: scriptHash,
    outputSha256: sha256(finalGlb),
    outputBytes: finalGlb.length,
    texturesUnchanged: true,
    textureHashes: afterImages.map(image => image.sha256),
    ...refined.metrics,
  }, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error?.stack || error); process.exitCode = 1 })
}
