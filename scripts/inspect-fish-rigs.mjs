#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = 'src/rendering/assets/fish/manifest.json'
const outputPath = 'docs/asset-evidence/fish-rig-inventory.json'
const candidatePaths = [
  'src/rendering/proof/candidate-real-clown.glb',
  'src/rendering/proof/candidate-real-tang.glb',
]

const semanticNameCandidates = {
  head: ['head'],
  spineMid: ['spine_mid', 'spine'],
  tailBase: ['tail_base', 'peduncle'],
  tailTip: ['tail_tip', 'caudal'],
  pectoralLeft: ['pectoral_L'],
  pectoralRight: ['pectoral_R'],
}

const glbJsonChunkType = 0x4e4f534a
const glbMagic = 0x46546c67
const defaultTransforms = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
}

function rootPath(path) {
  return resolve(root, path)
}

function relativePath(path) {
  return resolve(root, path).slice(root.length + 1).split(sep).join('/')
}

function assertIndex(index, length, label) {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new Error(`${label} index ${index} is outside the available range.`)
  }
}

function parseGlbJson(buffer, path) {
  if (buffer.byteLength < 20 || buffer.readUInt32LE(0) !== glbMagic) {
    throw new Error(`${path} is not a valid GLB file.`)
  }
  const version = buffer.readUInt32LE(4)
  const declaredLength = buffer.readUInt32LE(8)
  if (version !== 2 || declaredLength !== buffer.byteLength) {
    throw new Error(`${path} has unsupported or inconsistent GLB header metadata.`)
  }

  let offset = 12
  let document
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) throw new Error(`${path} has a truncated GLB chunk header.`)
    const chunkLength = buffer.readUInt32LE(offset)
    const chunkType = buffer.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkLength
    if (chunkEnd > buffer.byteLength) throw new Error(`${path} has a truncated GLB chunk.`)
    if (chunkType === glbJsonChunkType) {
      if (document) throw new Error(`${path} contains more than one JSON chunk.`)
      const jsonText = buffer.subarray(chunkStart, chunkEnd).toString('utf8').replace(/[\u0000\u0020]+$/u, '')
      document = JSON.parse(jsonText)
    }
    offset = chunkEnd
  }
  if (!document) throw new Error(`${path} has no JSON chunk.`)
  return { version, document }
}

function buildInventoryEntry(path, kind, manifestEntry) {
  const bytes = cachedGlbBytes.get(path)
  if (!bytes) throw new Error(`Input bytes were not loaded for ${path}.`)
  const { version, document } = parseGlbJson(bytes, path)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const nodes = Array.isArray(document.nodes) ? document.nodes : []
  const skins = Array.isArray(document.skins) ? document.skins : []
  const animations = Array.isArray(document.animations) ? document.animations : []
  const parents = nodes.map(() => [])

  nodes.forEach((node, parentIndex) => {
    for (const childIndex of node.children ?? []) {
      assertIndex(childIndex, nodes.length, `${path} node child`)
      parents[childIndex].push(parentIndex)
    }
  })

  const jointReferences = new Set()
  const skinInventory = skins.map((skin, skinIndex) => ({
    index: skinIndex,
    name: skin.name ?? null,
    skeletonNodeIndex: skin.skeleton ?? null,
    skeletonNodeName: skin.skeleton === undefined ? null : nodes[skin.skeleton]?.name ?? null,
    joints: (skin.joints ?? []).map((nodeIndex, skinJointIndex) => {
      assertIndex(nodeIndex, nodes.length, `${path} skin joint`)
      jointReferences.add(nodeIndex)
      return { skinJointIndex, nodeIndex, nodeName: nodes[nodeIndex]?.name ?? null }
    }),
  }))

  const animationInventory = animations.map((animation, animationIndex) => {
    const samplers = animation.samplers ?? []
    const channels = (animation.channels ?? []).map((channel, channelIndex) => {
      const targetNodeIndex = channel.target?.node
      if (targetNodeIndex !== undefined) assertIndex(targetNodeIndex, nodes.length, `${path} animation target`)
      const sampler = samplers[channel.sampler]
      if (!sampler) throw new Error(`${path} animation ${animationIndex} channel ${channelIndex} has no sampler.`)
      return {
        channelIndex,
        samplerIndex: channel.sampler,
        targetNodeIndex: targetNodeIndex ?? null,
        targetNodeName: targetNodeIndex === undefined ? null : nodes[targetNodeIndex]?.name ?? null,
        path: channel.target?.path ?? null,
        interpolation: sampler.interpolation ?? 'LINEAR',
        inputAccessorIndex: sampler.input,
        outputAccessorIndex: sampler.output,
      }
    })
    return { index: animationIndex, name: animation.name ?? null, channels }
  })

  const animationPathsByNode = new Map()
  for (const animation of animationInventory) {
    for (const channel of animation.channels) {
      if (channel.targetNodeIndex === null) continue
      const paths = animationPathsByNode.get(channel.targetNodeIndex) ?? new Set()
      if (channel.path) paths.add(channel.path)
      animationPathsByNode.set(channel.targetNodeIndex, paths)
    }
  }

  const nodeInventory = nodes.map((node, index) => ({
    index,
    name: node.name ?? null,
    parentNodeIndices: parents[index],
    parentNodeNames: parents[index].map(parentIndex => nodes[parentIndex]?.name ?? null),
    childNodeIndices: node.children ?? [],
    childNodeNames: (node.children ?? []).map(childIndex => nodes[childIndex]?.name ?? null),
    meshIndex: node.mesh ?? null,
    skinIndex: node.skin ?? null,
    isSkinJoint: jointReferences.has(index),
    restTransform: node.matrix
      ? { matrix: node.matrix, source: 'matrix' }
      : {
          translation: node.translation ?? defaultTransforms.translation,
          rotation: node.rotation ?? defaultTransforms.rotation,
          scale: node.scale ?? defaultTransforms.scale,
          sourceAuthored: {
            translation: node.translation !== undefined,
            rotation: node.rotation !== undefined,
            scale: node.scale !== undefined,
          },
        },
    animationTracks: animationInventory.flatMap(animation => animation.channels
      .filter(channel => channel.targetNodeIndex === index)
      .map(channel => ({ animationIndex: animation.index, animationName: animation.name, path: channel.path }))),
  }))

  const nameMatches = new Map()
  nodes.forEach((node, index) => {
    if (typeof node.name !== 'string') return
    const indices = nameMatches.get(node.name) ?? []
    indices.push(index)
    nameMatches.set(node.name, indices)
  })

  const candidateNames = [...new Set(Object.values(semanticNameCandidates).flat())].sort()
  const semanticCoverage = Object.fromEntries(Object.entries(semanticNameCandidates).map(([semantic, candidates]) => {
    const matches = candidates.flatMap(name => (nameMatches.get(name) ?? []).map(nodeIndex => {
      const paths = [...(animationPathsByNode.get(nodeIndex) ?? [])].sort()
      return {
        candidateName: name,
        nodeIndex,
        isSkinJoint: jointReferences.has(nodeIndex),
        animatedPaths: paths,
        rotationAnimated: paths.includes('rotation'),
      }
    }))
    return [semantic, {
      candidateNames: candidates,
      missingCandidateNames: candidates.filter(name => !nameMatches.has(name)),
      matches,
    }]
  }))
  const indexedSpineNodes = nodeInventory.filter(node => /^spine_\d+$/u.test(node.name ?? ''))
  semanticCoverage.indexedSpineJoints = {
    namingRule: '^spine_[0-9]+$ (literal-name inventory only; no anatomical segment inferred)',
    nodes: indexedSpineNodes.map(node => ({
      nodeIndex: node.index,
      name: node.name,
      isSkinJoint: node.isSkinJoint,
      animatedPaths: [...(animationPathsByNode.get(node.index) ?? [])].sort(),
      rotationAnimated: (animationPathsByNode.get(node.index) ?? new Set()).has('rotation'),
    })),
  }

  return {
    path: relativePath(path),
    role: kind,
    assetId: manifestEntry?.id ?? null,
    fishSpeciesId: manifestEntry?.fishSpeciesId ?? null,
    rigArchetype: manifestEntry?.rigArchetype ?? null,
    byteLength: bytes.byteLength,
    sha256,
    manifestSha256: manifestEntry?.sha256 ?? null,
    manifestHashMatches: manifestEntry ? manifestEntry.sha256 === sha256 : null,
    glbVersion: version,
    sceneRoots: (document.scenes ?? []).map((scene, sceneIndex) => ({
      sceneIndex,
      name: scene.name ?? null,
      rootNodeIndices: scene.nodes ?? [],
      rootNodeNames: (scene.nodes ?? []).map(nodeIndex => nodes[nodeIndex]?.name ?? null),
    })),
    semanticNameCandidates: candidateNames,
    semanticCoverage,
    nodes: nodeInventory,
    skins: skinInventory,
    animations: animationInventory,
  }
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]))
  }
  return value
}

const manifest = JSON.parse(await readFile(rootPath(manifestPath), 'utf8'))
const fishEntries = (manifest.assets ?? []).filter(asset => asset.kind === 'fish')
if (fishEntries.length !== 6) throw new Error(`Expected six manifest fish assets; found ${fishEntries.length}.`)

const manifestByPath = new Map(fishEntries.map(entry => [entry.path, entry]))
const inputs = [
  ...candidatePaths.map(path => ({ path, role: 'active-candidate' })),
  ...fishEntries.map(entry => ({ path: entry.path, role: 'supplied-fish', manifestEntry: entry })),
].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
if (inputs.length !== 8 || new Set(inputs.map(input => input.path)).size !== 8) {
  throw new Error(`Expected eight distinct GLB inputs; found ${inputs.length}.`)
}

const cachedGlbBytes = new Map()
for (const input of inputs) cachedGlbBytes.set(input.path, await readFile(rootPath(input.path)))
const inventory = {
  schema: 'fish-rig-inventory-v1',
  generator: 'scripts/inspect-fish-rigs.mjs',
  sourceSet: {
    activeCandidatePaths: [...candidatePaths].sort(),
    suppliedFishManifest: relativePath(manifestPath),
    suppliedFishPaths: fishEntries.map(entry => entry.path).sort(),
    semanticNamesAreLiteralOnly: true,
    coordinateAxesInferred: false,
    integrationClaimed: false,
  },
  assets: inputs.map(input => buildInventoryEntry(input.path, input.role, manifestByPath.get(input.path))),
}

const json = `${JSON.stringify(sortKeys(inventory), null, 2)}\n`
await writeFile(rootPath(outputPath), json, 'utf8')
process.stdout.write(`Wrote ${relativePath(outputPath)} from ${inputs.length} GLBs.\n`)
