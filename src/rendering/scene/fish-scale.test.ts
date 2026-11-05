import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REEF_FISH as fishData } from '../../lib/fish'
import {
  FISH_RENDER_LENGTH_INCHES, MIN_FISH_CLEARANCE, MODEL_SWIM_AXIS_LENGTH, SPRITE_ARTWORK_LENGTH_FRACTION, SPRITE_PLANE_WIDTH, TANK_UNITS_PER_INCH,
  fishClearanceRadius, fishModelScale, fishRenderLength, fishSpriteScale,
} from './fish-scale'

const root = resolve(__dirname, '../../..')
const runtimeModels: Record<string, string> = {
  'ocellaris-clownfish': 'src/rendering/proof/candidate-real-clown.glb',
  'yellow-tang': 'src/rendering/proof/candidate-real-tang.glb',
}

type GltfJson = { meshes: { primitives: { attributes: { POSITION: number } }[] }[]; accessors: { min?: number[]; max?: number[] }[]; nodes: { mesh?: number; skin?: number }[] }
function readGlbJson(path: string): GltfJson {
  const bytes = readFileSync(resolve(root, path))
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67) // 'glTF'
  const length = bytes.readUInt32LE(12)
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8')) as GltfJson
}
/** Swim-axis (+Z bind space) extent across every skinned mesh primitive in the GLB. */
function measureSwimAxis(path: string) {
  const json = readGlbJson(path)
  let min = Infinity, max = -Infinity
  json.nodes.filter(node => node.mesh !== undefined && node.skin !== undefined).forEach(node => {
    json.meshes[node.mesh!].primitives.forEach(primitive => {
      const accessor = json.accessors[primitive.attributes.POSITION]
      min = Math.min(min, accessor.min![2]); max = Math.max(max, accessor.max![2])
    })
  })
  return max - min
}
function parseReferenceTable() {
  const doc = readFileSync(resolve(root, 'docs/fish-scale-reference.md'), 'utf8')
  const rows = new Map<string, number>()
  for (const match of doc.matchAll(/^\| `([a-z-]+)` \|[^|]+\|[^|]+\| ([\d.]+) \|/gm)) rows.set(match[1], Number(match[2]))
  return rows
}

describe('true relative fish sizing', () => {
  it('mirrors the render lengths in docs/fish-scale-reference.md for every roster species', () => {
    const table = parseReferenceTable()
    expect(table.size).toBe(fishData.length)
    for (const fish of fishData) expect(FISH_RENDER_LENGTH_INCHES[fish.id], fish.id).toBe(table.get(fish.id))
    expect(Object.keys(FISH_RENDER_LENGTH_INCHES).sort()).toEqual([...table.keys()].sort())
  })

  it('uses swim-axis extents re-measured from the runtime GLBs', () => {
    for (const [id, path] of Object.entries(runtimeModels)) expect(MODEL_SWIM_AXIS_LENGTH[id], id).toBeCloseTo(measureSwimAxis(path), 5)
  })

  it('renders GLB and artwork fish at reference length ratios within 10%', () => {
    const rendered = (id: string) => id in MODEL_SWIM_AXIS_LENGTH
      ? MODEL_SWIM_AXIS_LENGTH[id] * fishModelScale(id)
      : SPRITE_PLANE_WIDTH * (SPRITE_ARTWORK_LENGTH_FRACTION[id] ?? 1) * fishSpriteScale(id)
    const clown = rendered('ocellaris-clownfish')
    expect(clown).toBeCloseTo(3 * TANK_UNITS_PER_INCH, 6)
    for (const fish of fishData) {
      const ratio = rendered(fish.id) / clown, expected = FISH_RENDER_LENGTH_INCHES[fish.id] / FISH_RENDER_LENGTH_INCHES['ocellaris-clownfish']
      expect(Math.abs(ratio / expected - 1), fish.id).toBeLessThan(.1)
    }
    // Yellow tang should be roughly twice a clownfish, the blue tang three times.
    expect(rendered('yellow-tang') / clown).toBeGreaterThan(1.9)
    expect(rendered('blue-tang') / clown).toBeCloseTo(3, 1)
  })

  it('keeps collision envelopes covering each body and never below the previous radius', () => {
    for (const fish of fishData) {
      const radius = fishClearanceRadius(fish.id)
      expect(radius).toBeGreaterThanOrEqual(MIN_FISH_CLEARANCE)
      expect(radius).toBeGreaterThan(fishRenderLength(fish.id) / 2)
    }
  })
})
