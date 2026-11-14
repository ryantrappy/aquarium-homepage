import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as THREE from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/node_modules/three/build/three.module.js'
import { GLTFLoader } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/node_modules/three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/node_modules/three/examples/jsm/utils/SkeletonUtils.js'
import { projectFishBodyBounds } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/fish-link-projection.ts'
import { fishModelScale } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/fish-scale.ts'
import { bindFishFlexToModel, updateFishFlex } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/fish-flex-material.ts'
import { bindFishTurningRig, applyFishTurningRigOverlay } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/fish-turning.ts'
import { createFishClipPlayer } from '/Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/fish-animation.ts'

import { it } from 'vitest'

it('measures full AQ-89 projection CPU cost for the exact 11-inhabitant roster', async () => {
  const repo = '/Users/ryantrapp/Desktop/Code/aquarium-homepage'
  const proof = '/tmp/aquarium-aq87-proof-8b2d7cc'
  const outputPath = process.env.AQ89_PROJECTION_OUTPUT ?? '/tmp/aq89-projection-cpu/results-after.json'
  const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
  const sourceFiles = [
    'src/rendering/scene/aquarium.ts',
    'src/rendering/scene/fish-link-projection.ts',
    'src/rendering/scene/fish-flex-material.ts',
    'src/rendering/scene/fish-animation.ts',
    'src/rendering/scene/fish-turning.ts',
    'src/rendering/scene/fish-scale.ts',
  ]
  const sourcesBefore = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, hash(await readFile(resolve(repo, path)))])))
  const aquariumPath = resolve(repo, 'src/rendering/scene/aquarium.ts')
  const aquariumSource = await readFile(aquariumPath, 'utf8')
  const block = aquariumSource.match(/const modelUrls: Record<string, string> = \{([\s\S]*?)^\}/m)?.[1]
  if (!block) throw new Error('Current aquarium modelUrls block missing')
  const urls = new Map([...block.matchAll(/^\s*(?:'([^']+)'|([\w-]+)):\s*new URL\('([^']+)'/gm)]
    .map(match => [match[1] ?? match[2], fileURLToPath(new URL(match[3], pathToFileURL(aquariumPath)))]))
  const viewportInputs = {
    laptop: JSON.parse(await readFile(resolve(proof, 'docs/asset-evidence/aq87/distribution-20261112/laptop.json'), 'utf8')),
    phone: JSON.parse(await readFile(resolve(proof, 'docs/asset-evidence/aq87/distribution-20261112/phone.json'), 'utf8')),
  }
  const roster = viewportInputs.phone.inhabitants
  const uniqueSpecies = [...new Set(roster.map((item: any) => item.speciesId))]
  if (roster.length !== 11 || uniqueSpecies.length !== 8) throw new Error('Expected exact 8-service / 11-inhabitant AQ-87 roster')
  const loader = new GLTFLoader().register(() => ({
    name: 'AQ89_CPU_PROBE_SKIP_TEXTURES',
    loadMaterial: async () => new THREE.MeshStandardMaterial(),
  }))
  const bases = new Map<string, any>(), assetHashes: Record<string, string> = {}
  for (const speciesId of uniqueSpecies) {
    const assetPath = urls.get(speciesId)
    if (!assetPath) throw new Error('No current runtime URL for ' + speciesId)
    const bytes = await readFile(assetPath)
    assetHashes[assetPath.slice(repo.length + 1)] = hash(bytes)
    const array = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    bases.set(speciesId, await loader.parseAsync(array, ''))
  }
  type FishInstance = {
    id: string; speciesId: string; root: THREE.Group; clip: ReturnType<typeof createFishClipPlayer>;
    rig: ReturnType<typeof bindFishTurningRig>; flex: NonNullable<ReturnType<typeof bindFishFlexToModel>>;
    phase: number
  }
  const instances: FishInstance[] = roster.map((entry: any, index: number) => {
    const base = bases.get(entry.speciesId)
    if (base.animations.length !== 1) throw new Error(`Expected one current clip for ${entry.speciesId}, got ${base.animations.length}`)
    const root = new THREE.Group()
    const model = clone(base.scene)
    model.scale.setScalar(fishModelScale(entry.speciesId))
    root.add(model)
    const clip = createFishClipPlayer(model, base.animations[0], .137 + index * .011)
    const rig = bindFishTurningRig(model, entry.speciesId)
    const flex = bindFishFlexToModel(model, entry.speciesId, index * 127 + 37)
    if (!flex) throw new Error('No live flex binding for ' + entry.speciesId)
    return { id: entry.id, speciesId: entry.speciesId, root, clip, rig, flex, phase: index * .31 }
  })
  function projectedCount(root: THREE.Object3D, camera: THREE.Camera): number {
    let count = 0
    root.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh) || !camera.layers.test(object.layers)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      if (!materials.some(material => material.visible)) return
      const geometry = object.geometry, positions = geometry.getAttribute('position')
      if (!positions) return
      if (Array.isArray(object.material) || geometry.drawRange.start !== 0 || Number.isFinite(geometry.drawRange.count)) {
        const vertices = new Set<number>(), elements = geometry.index?.count ?? positions.count
        const groups = Array.isArray(object.material) ? geometry.groups : [{ start: 0, count: elements, materialIndex: 0 }]
        for (const group of groups) {
          if (!materials[group.materialIndex ?? 0]?.visible) continue
          const start = Math.max(group.start, geometry.drawRange.start, 0)
          const end = Math.min(group.start + group.count, geometry.drawRange.start + geometry.drawRange.count, elements)
          for (let i = start; i < end; i++) vertices.add(geometry.index?.getX(i) ?? i)
        }
        count += vertices.size
      } else count += positions.count
    })
    return count
  }
  function pose(view: any, frame: number) {
    for (const [index, instance] of instances.entries()) {
      const live = view.inhabitants[index]
      instance.clip.advance(1 / 60)
      const turnPhase = instance.phase + frame / 60 * 1.3
      applyFishTurningRigOverlay(instance.rig, {
        yawRateRadPerSec: .65 * Math.sin(turnPhase),
        smoothedYawRate: .48 * Math.sin(turnPhase - .2),
        turnCurvature: .38 * Math.sin(turnPhase),
        turnCurvatureDelayed: .25 * Math.sin(turnPhase - .3),
        turnPhase,
        maneuverStage: 'exit-stroke',
        exitStrokeSeconds: .22,
        speed: .42,
        startleSeconds: .16,
      }, false)
      updateFishFlex(instance.flex, instance.speciesId, {
        speedNorm: .72,
        state: 'swim',
        maneuverStage: 'exit-stroke',
        startleSeconds: .16,
      }, 1 / 60, false)
      instance.root.position.set(live.position.x + .018 * Math.sin(turnPhase), live.position.y + .01 * Math.cos(turnPhase * .7), live.position.z)
      instance.root.rotation.set(.035 * Math.cos(turnPhase), .21 * Math.sin(turnPhase), .028 * Math.sin(turnPhase * .8), 'YXZ')
      instance.root.updateMatrix()
      instance.root.updateMatrixWorld(true)
    }
  }
  function percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a,b) => a-b)
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]
  }
  function cameraFor(width: number, height: number) {
    const camera = new THREE.PerspectiveCamera(42, width / height, .1, 60)
    camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0)
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
    return camera
  }
  const measurements: Record<string, any> = {}
  for (const [key, view] of Object.entries(viewportInputs)) {
    const width = key === 'laptop' ? 1440 : 402, height = key === 'laptop' ? 900 : 874
    const camera = cameraFor(width, height), scratch = new THREE.Vector3()
    const perFish = new Map(instances.map(item => [item.id, [] as number[]]))
    const totals: number[] = [], wallTotals: number[] = [], clippedOrMissing = { fullViewport: 0, undefined: 0 }
    const count = instances.reduce((sum, item) => sum + projectedCount(item.root, camera), 0)
    function projectOne() {
      let total = 0
      for (const item of instances) {
        const t0 = process.hrtime.bigint()
        const bounds = projectFishBodyBounds(item.root, camera, width, height, scratch, item.flex.deformVertex)
        const ms = Number(process.hrtime.bigint() - t0) / 1e6
        perFish.get(item.id)!.push(ms)
        total += ms
        if (!bounds) clippedOrMissing.undefined++
        else if (bounds.x === 0 && bounds.y === 0 && bounds.width === width && bounds.height === height) clippedOrMissing.fullViewport++
      }
      return total
    }
    for (let i = 0; i < 20; i++) { pose(view, i); camera.updateMatrixWorld(true); projectOne() }
    for (let i = 20; i < 140; i++) {
      pose(view, i); camera.updateMatrixWorld(true)
      const t0 = process.hrtime.bigint()
      const total = projectOne()
      const elapsed = Number(process.hrtime.bigint() - t0) / 1e6
      // Sum per-fish timings for comparison with the wall measured full pass.
      totals.push(total)
      wallTotals.push(elapsed)
    }
    measurements[key] = {
      viewport: { width, height }, samples: totals.length, warmupFrames: 20,
      projectedFishCount: instances.length, uniqueSpeciesCount: uniqueSpecies.length,
      projectedVerticesPerPass: count, meanPerFishVertices: count / instances.length,
      fullViewportFallbackResults: clippedOrMissing.fullViewport, undefinedResults: clippedOrMissing.undefined,
      projectionCpuMs: { summedFishTimers: { p50: percentile(totals,.50), p95: percentile(totals,.95), mean: totals.reduce((a,b)=>a+b,0)/totals.length, max: Math.max(...totals) }, wholePassWallClock: { p50: percentile(wallTotals,.50), p95: percentile(wallTotals,.95), mean: wallTotals.reduce((a,b)=>a+b,0)/wallTotals.length, max: Math.max(...wallTotals) } },
      perFishP95Ms: Object.fromEntries([...perFish].map(([id, ms]) => [id, percentile(ms.slice(20),.95)])),
      rawSamplesMs: { summedFishTimers: totals, wholePassWallClock: wallTotals, perFish: Object.fromEntries([...perFish].map(([id, ms]) => [id, ms.slice(20)])) },
    }
  }
  const sourcesAfter = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, hash(await readFile(resolve(repo, path)))])))
  if (JSON.stringify(sourcesBefore) !== JSON.stringify(sourcesAfter)) throw new Error('One or more source files changed during probe; results are invalid')
  const report = {
    purpose: 'CPU-only benchmark of exact full-vertex AQ-89 fish body projection; no GPU, native-browser, or mobile-budget claim.',
    sourceRoot: repo, sourceFiles, sourceSha256: sourcesBefore,
    viewportRosterSidecars: {
      phone: {path:'docs/asset-evidence/aq87/distribution-20261112/phone.json',sha256:hash(await readFile(resolve(proof,'docs/asset-evidence/aq87/distribution-20261112/phone.json')))},
      laptop:{path:'docs/asset-evidence/aq87/distribution-20261112/laptop.json',sha256:hash(await readFile(resolve(proof,'docs/asset-evidence/aq87/distribution-20261112/laptop.json')))},
    },
    rosterNote: '8-service/11-inhabitant positions copied from historical AQ-87 phone/laptop sidecars; this is a timing fixture, not current ecology/pose acceptance.',
  roster: roster.map((entry:any)=>({id:entry.id,speciesId:entry.speciesId,position:entry.position})),
    assetSha256: assetHashes,
    modelClips: Object.fromEntries([...bases].map(([id,gltf])=>[id,{clip:gltf.animations[0]?.name,duration:gltf.animations[0]?.duration}])),
    activePose: 'per-instance GLTF swim clip, non-zero turning overlay and live GPU-uniform flex; per-frame root yaw/pitch/bank and a small translated movement; transform preparation excluded from projection timer.',
    skipMaterials: 'GLTFLoader loadMaterial hook substitutes MeshStandardMaterial; image decode/material texture work excluded.',
    measurements,
  }
  await writeFile(outputPath, JSON.stringify(report,null,2)+'\n')
  for (const instance of instances) { instance.clip.dispose(); instance.flex.dispose() }
  console.log(JSON.stringify(report,null,2))

}, 120_000)
