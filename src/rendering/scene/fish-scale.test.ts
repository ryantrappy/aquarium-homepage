import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REEF_FISH as fishData } from '../../lib/fish'
import {
  FISH_RENDER_LENGTH_INCHES, MIN_FISH_CLEARANCE, MODEL_SWIM_AXIS_LENGTH, SPRITE_ARTWORK_LENGTH_FRACTION, SPRITE_PLANE_WIDTH, TANK_UNITS_PER_INCH,
  fishBodyRadiusM, fishClearanceRadius, fishModelScale, fishRenderLength, fishSpriteScale,
} from './fish-scale'

const root = resolve(__dirname, '../../..')
const runtimeModels: Record<string, string> = {
  'ocellaris-clownfish': 'src/rendering/proof/candidate-real-clown.glb',
  'yellow-tang': 'src/rendering/proof/candidate-real-tang.glb',
  'blue-tang': 'src/rendering/assets/splat-fish/blue-tang.glb',
  'royal-gramma': 'src/rendering/assets/splat-fish/royal-gramma.glb',
  'banggai-cardinalfish': 'src/rendering/assets/splat-fish/banggai-cardinalfish.glb',
  'mandarin-dragonet': 'src/rendering/assets/splat-fish/mandarin-dragonet.glb',
  'blue-green-chromis': 'src/rendering/assets/splat-fish/blue-green-chromis.glb',
  firefish: 'src/rendering/assets/splat-fish/firefish.glb',
  'yellow-watchman-goby': 'src/rendering/assets/splat-fish/yellow-watchman-goby.glb',
  'tailspot-blenny': 'src/rendering/assets/splat-fish/tailspot-blenny.glb',
  'six-line-wrasse': 'src/rendering/assets/splat-fish/six-line-wrasse.glb',
  'mccoskers-flasher-wrasse': 'src/rendering/assets/splat-fish/mccoskers-flasher-wrasse.glb',
  'lyretail-anthias': 'src/rendering/assets/splat-fish/lyretail-anthias.glb',
  'flame-angelfish': 'src/rendering/assets/splat-fish/flame-angelfish.glb',
  'copperband-butterflyfish': 'src/rendering/assets/splat-fish/copperband-butterflyfish.glb',
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
function parseReferenceRows() {
  const doc = readFileSync(resolve(root, 'docs/fish-scale-reference.md'), 'utf8')
  const rows = new Map<string, { typical: string; maximum: string; fishBaseUrl: string; renderLengthInches: number }>()
  for (const line of doc.split('\n')) {
    const cells = line.split('|').map(cell => cell.trim())
    const id = cells[1]?.match(/^`([a-z-]+)`$/)?.[1]
    if (!id || cells.length < 6) continue
    const maxCell = cells[3]
    const maximum = maxCell.match(/^\[([^\]]+)\]/)?.[1] ?? maxCell
    const fishBaseUrl = maxCell.match(/\]\((https:\/\/www\.fishbase\.se\/summary\/[^)]+)\)/)?.[1] ?? ''
    rows.set(id, { typical: cells[2], maximum, fishBaseUrl, renderLengthInches: Number(cells[4]) })
  }
  return rows
}

describe('true relative fish sizing', () => {
  it('mirrors the render lengths in docs/fish-scale-reference.md for every roster species', () => {
    const table = parseReferenceRows()
    expect(table.size).toBe(fishData.length)
    for (const fish of fishData) expect(FISH_RENDER_LENGTH_INCHES[fish.id], fish.id).toBe(table.get(fish.id)?.renderLengthInches)
    expect(Object.keys(FISH_RENDER_LENGTH_INCHES).sort()).toEqual([...table.keys()].sort())
  })

  it('links each maximum by the roster scientific name and respects the female lyretail maximum', () => {
    const rows = parseReferenceRows()
    expect(rows.size).toBe(fishData.length)
    for (const fish of fishData) {
      const speciesSlug = fish.scientificName.trim().replace(/\s+/g, '-')
      expect(rows.get(fish.id)?.fishBaseUrl, fish.id).toBe(`https://www.fishbase.se/summary/${speciesSlug}`)
    }

    const anthias = rows.get('lyretail-anthias')!
    const femaleMax = anthias.maximum.match(/([\d.]+)\s*\/\s*([\d.]+)\s*TL\s*female/i)
    expect(femaleMax).not.toBeNull()
    const roster = readFileSync(resolve(root, 'docs/reef-fish-roster.md'), 'utf8')
    const anthiasRosterRow = roster.split('\n').find(line => line.includes('`lyretail-anthias`'))
    expect(anthiasRosterRow).toMatch(/adult female baseline/i)
    expect(FISH_RENDER_LENGTH_INCHES['lyretail-anthias'] * 2.54).toBeLessThanOrEqual(Number(femaleMax![2]))
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

  it('has a measured alpha-width fraction for every catalog thumbnail', () => {
    expect(Object.keys(SPRITE_ARTWORK_LENGTH_FRACTION).sort()).toEqual(fishData.map(fish => fish.id).sort())
    const provenance = JSON.parse(readFileSync(resolve(root, 'docs/fish-art-provenance.json'), 'utf8')) as {
      known_imagegen_webp_canonicals: { species_id: string; alpha_visible_width_fraction: number }[]
      new_generated_png_candidates: { species_id: string; alpha_visible_width_fraction: number }[]
    }
    const recordedFractions = new Map([
      ...provenance.known_imagegen_webp_canonicals,
      ...provenance.new_generated_png_candidates,
    ].map(item => [item.species_id, item.alpha_visible_width_fraction]))
    for (const fish of fishData) {
      expect(SPRITE_ARTWORK_LENGTH_FRACTION[fish.id], fish.id).toBeGreaterThan(0)
      expect(SPRITE_ARTWORK_LENGTH_FRACTION[fish.id], fish.id).toBeLessThanOrEqual(1)
      expect(SPRITE_ARTWORK_LENGTH_FRACTION[fish.id], fish.id).toBe(recordedFractions.get(fish.id))
    }
  })

  it('keeps collision envelopes covering each body and never below the previous radius', () => {
    for (const fish of fishData) {
      const radius = fishClearanceRadius(fish.id)
      expect(radius).toBeGreaterThanOrEqual(MIN_FISH_CLEARANCE)
      expect(radius).toBeGreaterThan(fishRenderLength(fish.id) / 2)
    }
  })

  it('scales the fish-to-fish body radius to physical size within the AQ-85 envelope', () => {
    // Every roster species lands in [0.04, 0.08]: an order of magnitude
    // below the legacy 0.5 clearance, so school separation bubbles can no
    // longer fuse into one multi-meter exclusion zone.
    for (const fish of fishData) {
      const radius = fishBodyRadiusM(fish.id)
      expect(radius, fish.id).toBeGreaterThanOrEqual(0.04)
      expect(radius, fish.id).toBeLessThanOrEqual(0.08)
    }
    // Largest species clamps at the envelope ceiling; smallest sits near
    // the floor; a mid-size clownfish is 15% of its 0.48-unit length.
    expect(fishBodyRadiusM('blue-tang')).toBe(0.08)
    expect(fishBodyRadiusM('tailspot-blenny')).toBeCloseTo(0.054, 6)
    expect(fishBodyRadiusM('ocellaris-clownfish')).toBeCloseTo(0.072, 6)
    // Non-decreasing with render length, so bigger fish keep bigger space.
    const byLength = [...fishData].sort((a, b) => FISH_RENDER_LENGTH_INCHES[a.id] - FISH_RENDER_LENGTH_INCHES[b.id])
    for (let i = 1; i < byLength.length; i++) {
      expect(fishBodyRadiusM(byLength[i].id)).toBeGreaterThanOrEqual(fishBodyRadiusM(byLength[i - 1].id))
    }
    // Unknown species fall back to the 3in render length.
    expect(fishBodyRadiusM('unknown-species')).toBeCloseTo(0.072, 6)
  })
})
