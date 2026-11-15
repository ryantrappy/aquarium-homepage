import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const repo = '/Users/ryantrapp/Desktop/Code/aquarium-homepage'
const auditDir = '/tmp/aq87-front-depth-audit-20261115'
const require = createRequire(join(repo, 'package.json'))
const { createJiti } = require('jiti')
const jiti = createJiti(import.meta.url)
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const beforePath = join(auditDir, 'src/rendering/scene/fish-spawn-before.ts')
const afterPath = join(auditDir, 'src/rendering/scene/fish-spawn-after.ts')

assert.equal(sha256(beforePath), '7026d60d2766bb9e06e54a709fb358e1ff851f7a2bd9e2dad4e7b32db75c40b4')
assert.equal(sha256(afterPath), 'a7ffa923fedaa572597c95735b62aa5e1d2e4fa50e6503f0b0e56ba028432e9d')
for (const [relative, expected] of [
  ['src/lib/services.ts', '413fa3eee9ce8878348bdc811a44f77d08629e325c3b35419e39b751d614a9ab'],
  ['src/lib/fish-behavior.ts', 'ad537ea1ee5c0d97caa369753edd727c51f67cb28a981e1f020064571e228c77'],
  ['src/rendering/scene/camera-zoom.ts', '0e03a0ed9e23a97c9e15138d7c0a2fd2e59d2920d8bd8dd258c745bf54eaff51'],
  ['src/rendering/scene/fish-scale.ts', '6235ff8971c598618b7b476216fa40b60065702c96e2985c1797612d7a2effcf'],
  ['src/rendering/scene/reef-layout.ts', '1d0f005a75f513810eeda83108306a5cb82dc57726bc29edf429f5fa43c70179'],
  ['src/rendering/scene/reef-assembly.ts', 'a862591cc9a045bb9e2c572a5f1cfdaa9817e88733338f0a72c9b9cffb45a8cd'],
]) assert.equal(sha256(join(repo, relative)), expected, `pinned planner input ${relative}`)

const [before, after, { EXAMPLE_SERVICES }, { overviewHalfWidthAtDepth }, { fishBodyRadiusM, fishClearanceRadius }, { instantiateModularReefHabitat }, { reefPlacementsForViewport }] = await Promise.all([
  jiti.import(pathToFileURL(beforePath).href),
  jiti.import(pathToFileURL(afterPath).href),
  jiti.import(join(repo, 'src/lib/services.ts')),
  jiti.import(join(repo, 'src/rendering/scene/camera-zoom.ts')),
  jiti.import(join(repo, 'src/rendering/scene/fish-scale.ts')),
  jiti.import(join(repo, 'src/rendering/scene/reef-assembly.ts')),
  jiti.import(join(repo, 'src/rendering/scene/reef-layout.ts')),
])

assert.deepEqual(EXAMPLE_SERVICES.map(({ id }) => id), ['google', 'wikipedia', 'github', 'youtube', 'internet-archive'])

function plan(helper) {
  const width = 1440
  const height = 900
  const aspect = width / height
  const halfWidth = overviewHalfWidthAtDepth(aspect, -1.35)
  const bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
  const narrow = false
  const obstacles = reefPlacementsForViewport(narrow).flatMap((placement, index) =>
    instantiateModularReefHabitat(placement.islandKind, placement.uniformScale, placement.position, `reef-${index}`, placement.yaw).obstacles,
  )
  const maxAbsXAtDepth = (z) => Math.min(halfWidth, overviewHalfWidthAtDepth(aspect, z))
  const slots = helper.fishSpawnSlotsForServices(EXAMPLE_SERVICES)
  const occupied = []
  const positions = EXAMPLE_SERVICES.map((service) => {
    const clearance = fishClearanceRadius(service.fishId)
    const preference = helper.fishSpawnPreference(service.id, service.fishId, bounds, clearance, slots.get(service.id), maxAbsXAtDepth)
    assert.ok(preference, `${service.id} preference`)
    const heightRange = helper.evaluateTieredVerticalDepthRange(service.fishId, bounds, clearance)?.worldYRange
    assert.ok(heightRange, `${service.id} depth band`)
    const position = helper.findSafeFishSpawn(preference.position, bounds, obstacles, clearance, occupied, undefined, fishBodyRadiusM(service.fishId), heightRange, maxAbsXAtDepth)
    assert.ok(position, `${service.id} safe spawn`)
    const yaw = helper.findSafeFishHeading(position, preference.yaw, bounds, obstacles, clearance, maxAbsXAtDepth)
    assert.notEqual(yaw, undefined, `${service.id} heading`)
    occupied.push({ position, clearance, bodyRadiusM: fishBodyRadiusM(service.fishId) })
    return { id: service.id, fishId: service.fishId, x: position.x, y: position.y, z: position.z }
  })
  const zValues = positions.map(({ z }) => z)
  return { viewport: [width, height], positions, zSpan: Math.max(...zValues) - Math.min(...zValues) }
}

console.log(JSON.stringify({ before: plan(before), after: plan(after) }, null, 2))
