#!/usr/bin/env node

/**
 * Read-only AQ-37 inventory of the pinned Mesh2Motion Fish template versus
 * the existing licensed tang study derivative. This does not create a rig,
 * alter either GLB, or infer anatomical axes from glTF coordinate labels.
 *
 * Usage:
 *   node scripts/inspect-m2m-tang-fit.mjs /path/to/mesh2motion-app /path/to/candidate-real-tang.glb
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const [sourceRoot, targetPath, clownPath] = process.argv.slice(2)
if (!sourceRoot || !targetPath) {
  console.error('Usage: node scripts/inspect-m2m-tang-fit.mjs <Mesh2Motion-checkout> <tang.glb> [clown.glb]')
  process.exit(2)
}

const sourceRevision = 'b6dc8faa022fecf69956c79682a2ecaca9fcb81d'
const targets = {
  'shark/skeleton.glb': path.join(sourceRoot, 'static/assets/shark/skeleton.glb'),
  'shark/animations/swim-horizontal.glb': path.join(sourceRoot, 'static/assets/shark/animations/swim-horizontal.glb'),
  tang: targetPath,
  ...(clownPath ? { clown: clownPath } : {}),
}

function readGlb(buffer, name) {
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${name}: not a GLB file`)
  const version = buffer.readUInt32LE(4)
  if (version !== 2) throw new Error(`${name}: expected glTF 2, got ${version}`)
  let offset = 12, json, binary
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4)
    offset += 8
    const chunk = buffer.subarray(offset, offset + length)
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').replace(/\0+$/g, '').trim())
    if (type === 0x004e4942) binary = chunk
    offset += length
  }
  if (!json) throw new Error(`${name}: missing JSON chunk`)
  return { json, binary, sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length }
}

const files = Object.fromEntries(await Promise.all(Object.entries(targets).map(async ([key, file]) => [key, readGlb(await readFile(file), key)])))

function nodesByIndex(gltf) { return gltf.nodes ?? [] }
function jointNames(gltf, skinIndex = 0) {
  const nodes = nodesByIndex(gltf), skin = gltf.skins?.[skinIndex]
  return skin ? skin.joints.map(index => ({ index, name: nodes[index]?.name ?? `node-${index}` })) : []
}
function nodeNameSet(gltf) { return new Set(nodesByIndex(gltf).map(node => node.name).filter(Boolean)) }
function animationTracks(gltf) {
  const nodes = nodesByIndex(gltf)
  return (gltf.animations ?? []).map(animation => ({
    name: animation.name ?? '(unnamed)',
    channels: animation.channels.map(channel => ({
      node: nodes[channel.target.node]?.name ?? `node-${channel.target.node}`,
      path: channel.target.path,
    })),
  }))
}
function accessorBounds(gltf) {
  const meshes = []
  for (const [meshIndex, mesh] of (gltf.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
      const accessorIndex = primitive.attributes?.POSITION
      const accessor = gltf.accessors?.[accessorIndex]
      if (accessor?.min && accessor?.max) meshes.push({
        mesh: mesh.name ?? `mesh-${meshIndex}`,
        primitive: primitiveIndex,
        min: accessor.min,
        max: accessor.max,
        vertexCount: accessor.count,
      })
    }
  }
  return meshes
}
function skinCoverage(parsed) {
  const { json: gltf, binary } = parsed
  const skin = gltf.skins?.[0]
  if (!skin || !binary) return { skinCount: gltf.skins?.length ?? 0, coverage: null }
  const palette = skin.joints.map((nodeIndex, jointIndex) => ({ jointIndex, name: gltf.nodes[nodeIndex]?.name ?? `node-${nodeIndex}`, weight: 0 }))
  const scalarTypes = { 5121: [1, 'readUInt8'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] }
  let weightedVertices = 0, maxInfluencesPerVertex = 0, primitives = 0
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    const jointAccessor = gltf.accessors?.[primitive.attributes?.JOINTS_0]
    const weightAccessor = gltf.accessors?.[primitive.attributes?.WEIGHTS_0]
    if (!jointAccessor || !weightAccessor) continue
    const jointView = gltf.bufferViews[jointAccessor.bufferView], weightView = gltf.bufferViews[weightAccessor.bufferView]
    const jSize = scalarTypes[jointAccessor.componentType]?.[0], wSize = scalarTypes[weightAccessor.componentType]?.[0]
    const jRead = scalarTypes[jointAccessor.componentType]?.[1], wRead = scalarTypes[weightAccessor.componentType]?.[1]
    if (!jSize || !wSize || !jRead || !wRead) throw new Error('Unsupported joint or weight component type')
    const jBase = (jointView.byteOffset ?? 0) + (jointAccessor.byteOffset ?? 0)
    const wBase = (weightView.byteOffset ?? 0) + (weightAccessor.byteOffset ?? 0)
    const jStride = jointView.byteStride ?? jSize * 4, wStride = weightView.byteStride ?? wSize * 4
    const normalizedScale = weightAccessor.normalized ? (weightAccessor.componentType === 5121 ? 255 : 65535) : 1
    for (let vertex = 0; vertex < jointAccessor.count; vertex++) {
      let total = 0, influences = 0
      for (let slot = 0; slot < 4; slot++) {
        const joint = binary[jRead](jBase + vertex * jStride + slot * jSize)
        const weight = binary[wRead](wBase + vertex * wStride + slot * wSize) / normalizedScale
        if (weight > 0) { total += weight; influences++; if (palette[joint]) palette[joint].weight += weight }
      }
      if (total > 0) weightedVertices++
      maxInfluencesPerVertex = Math.max(maxInfluencesPerVertex, influences)
    }
    primitives++
  }
  return { skinCount: gltf.skins.length, primitivesWithSkinAttributes: primitives, weightedVertices, maxInfluencesPerVertex, coverage: palette.map(({ jointIndex, name, weight }) => ({ jointIndex, name, weightSum: Number(weight.toFixed(5)) })) }
}

const rigJson = files['shark/skeleton.glb'].json
const clipJson = files['shark/animations/swim-horizontal.glb'].json
const rigJoints = jointNames(rigJson)
const clipTargets = new Set(animationTracks(clipJson).flatMap(animation => animation.channels.map(channel => channel.node)))
const report = {
  source: {
    repository: 'https://github.com/Mesh2Motion/mesh2motion-app',
    revision: sourceRevision,
    fishTemplate: { name: 'Fish', manifestKey: 'shark', representation: 'skeleton-only GLB; no target mesh or precomputed weights', ...files['shark/skeleton.glb'], jointCount: rigJoints.length, jointNames: rigJoints.map(joint => joint.name) },
    swimHorizontal: { ...files['shark/animations/swim-horizontal.glb'], tracks: animationTracks(clipJson), uniqueTrackedNodes: [...new Set([...clipTargets])].sort() },
  },
  target: Object.fromEntries(Object.entries({ tang: files.tang, ...(files.clown ? { clown: files.clown } : {}) }).map(([name, parsed]) => {
    const gltf = parsed.json
    const names = nodeNameSet(gltf)
    return [name, {
      path: name === 'tang' ? targetPath : clownPath,
      sha256: parsed.sha256,
      bytes: parsed.bytes,
      meshes: accessorBounds(gltf),
      joints: jointNames(gltf),
      clips: animationTracks(gltf),
      skinCoverage: skinCoverage(parsed),
      templateTrackNodeNameMatches: [...clipTargets].filter(trackName => names.has(trackName)),
    }]
  })),
  limits: [
    'This parses exported glTF metadata and current target skin weights; it does not run Mesh2Motion binding or claim the target geometry has been deformed by this Fish template.',
    'Coordinate axes and anatomical correspondence are not inferred. The target and source rigs use different joint names, counts and hierarchy.',
  ],
}
console.log(JSON.stringify(report, null, 2))
