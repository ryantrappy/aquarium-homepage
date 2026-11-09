// True relative fish sizing (AQ-60).
//
// Every rendered fish derives its nose-to-tail length from one global
// tank-units-per-inch constant and the species' adult total length in
// docs/fish-scale-reference.md. The test suite parses that table and re-measures
// the runtime GLBs, so neither the sizes nor the measured extents may drift.

/** World units (three.js scene units) per real-world inch of fish length. */
export const TANK_UNITS_PER_INCH = .16

/** Render length in inches, mirrored from the "Render length" column of docs/fish-scale-reference.md. */
export const FISH_RENDER_LENGTH_INCHES: Readonly<Record<string, number>> = Object.freeze({
  'ocellaris-clownfish': 3,
  'yellow-tang': 6.5,
  'blue-tang': 9,
  'royal-gramma': 2.75,
  'banggai-cardinalfish': 2.75,
  'blue-green-chromis': 3,
  firefish: 2.75,
  'yellow-watchman-goby': 3,
  'mandarin-dragonet': 2.5,
  'tailspot-blenny': 2.25,
  'six-line-wrasse': 3,
  'mccoskers-flasher-wrasse': 2.75,
  'lyretail-anthias': 2.5,
  'flame-angelfish': 3.75,
  'copperband-butterflyfish': 6.5,
})

/**
 * Nose-to-tail extent of each runtime GLB along its swim axis (bind-space +Z of
 * the skinned meshes), in model units. Measured from the GLB accessor bounds;
 * fish-scale.test.ts re-reads the files and fails if these change.
 */
export const MODEL_SWIM_AXIS_LENGTH: Readonly<Record<string, number>> = Object.freeze({
  'ocellaris-clownfish': 2, // src/rendering/proof/candidate-real-clown.glb, z -1 … 1
  'yellow-tang': 1.985423, // src/rendering/proof/candidate-real-tang.glb, z -0.999266 … 0.986158
  'blue-tang': 2, // src/rendering/assets/splat-fish/blue-tang.glb, z -1 … 1
  'royal-gramma': 2, // src/rendering/assets/splat-fish/royal-gramma.glb, z -1 … 1
  'banggai-cardinalfish': 2, // src/rendering/assets/splat-fish/banggai-cardinalfish.glb, z -1 … 1
  'mandarin-dragonet': 2, // src/rendering/assets/splat-fish/mandarin-dragonet.glb, z -1 … 1
  'blue-green-chromis': 2, // src/rendering/assets/splat-fish/blue-green-chromis.glb, z -1 … 1
  firefish: 2, // src/rendering/assets/splat-fish/firefish.glb, z -1 … 1
  'yellow-watchman-goby': 2, // src/rendering/assets/splat-fish/yellow-watchman-goby.glb, z -1 … 1
  'tailspot-blenny': 2, // src/rendering/assets/splat-fish/tailspot-blenny.glb, z -1 … 1
  'six-line-wrasse': 2, // src/rendering/assets/splat-fish/six-line-wrasse.glb, z -1 … 1
  'mccoskers-flasher-wrasse': 2, // src/rendering/assets/splat-fish/mccoskers-flasher-wrasse.glb, z -1 … 1
  'lyretail-anthias': 2, // src/rendering/assets/splat-fish/lyretail-anthias.glb, z -1 … 1
  'flame-angelfish': 2, // src/rendering/assets/splat-fish/flame-angelfish.glb, z -1 … 1
  'copperband-butterflyfish': 2, // src/rendering/assets/splat-fish/copperband-butterflyfish.glb, z -1 … 1
})

/** Fallback artwork plane width in world units before species scaling. */
export const SPRITE_PLANE_WIDTH = .95

/**
 * Fraction of each fallback artwork's width covered by the fish (alpha > 0.2),
 * measured from the canonical public/fish/*.webp pixels. Unknown artwork assumes it fills the plane.
 */
export const SPRITE_ARTWORK_LENGTH_FRACTION: Readonly<Record<string, number>> = Object.freeze({
  'ocellaris-clownfish': .975,
  'yellow-tang': .923333,
  'blue-tang': .981667,
  'royal-gramma': .96,
  'banggai-cardinalfish': .92,
  'blue-green-chromis': .96,
  firefish: .806667,
  'yellow-watchman-goby': .903333,
  'mandarin-dragonet': .963333,
  'tailspot-blenny': .96,
  'six-line-wrasse': .906667,
  'mccoskers-flasher-wrasse': .918333,
  'lyretail-anthias': .951667,
  'flame-angelfish': .953333,
  'copperband-butterflyfish': .983333,
})

const FALLBACK_LENGTH_INCHES = 3

/** Target nose-to-tail length in world units for a species. */
export function fishRenderLength(speciesId: string): number {
  return (FISH_RENDER_LENGTH_INCHES[speciesId] ?? FALLBACK_LENGTH_INCHES) * TANK_UNITS_PER_INCH
}

/** Uniform scale for a GLB model so its swim-axis extent equals the target length. */
export function fishModelScale(speciesId: string): number {
  const measured = MODEL_SWIM_AXIS_LENGTH[speciesId]
  if (!(measured > 0)) throw new RangeError(`No measured swim-axis length for ${speciesId} model.`)
  return fishRenderLength(speciesId) / measured
}

/** Uniform scale for a fallback artwork plane so the drawn fish matches the target length. */
export function fishSpriteScale(speciesId: string): number {
  const fraction = SPRITE_ARTWORK_LENGTH_FRACTION[speciesId] ?? 1
  return fishRenderLength(speciesId) / (SPRITE_PLANE_WIDTH * fraction)
}

/** Collision radius never smaller than the pre-AQ-60 envelope, and always covering half the body length. */
export const MIN_FISH_CLEARANCE = .5
export function fishClearanceRadius(speciesId: string): number {
  return Math.max(MIN_FISH_CLEARANCE, fishRenderLength(speciesId) / 2 + .05)
}

/**
 * Physical body radius used for fish-to-fish personal-space separation (AQ-85).
 *
 * This is deliberately NOT `fishClearanceRadius`: clearance is the legacy
 * habitat-obstacle envelope (>= 0.5) and must stay that way for rocks and
 * tank walls, while two fish only need each other's actual body radius plus
 * a small buffer. The radius is species-proportional: the body half-width
 * estimate is 15% of the rendered nose-to-tail length, clamped into the
 * AQ-85 body-radius envelope [0.04, 0.08] so the largest species (blue tang,
 * 1.44 units long, raw 0.216) cannot reintroduce an oversized separation
 * bubble, and the smallest species stay above the 0.04 floor. Resulting
 * pairwise minimum separations (two radii + the 0.06 AQ-85 buffer) run
 * ~0.14m–0.22m instead of the legacy >= 1.12m.
 */
export const MIN_FISH_BODY_RADIUS_M = .04
export const MAX_FISH_BODY_RADIUS_M = .08
export const FISH_BODY_RADIUS_LENGTH_FRACTION = .15
export function fishBodyRadiusM(speciesId: string): number {
  const raw = fishRenderLength(speciesId) * FISH_BODY_RADIUS_LENGTH_FRACTION
  return Math.min(MAX_FISH_BODY_RADIUS_M, Math.max(MIN_FISH_BODY_RADIUS_M, raw))
}
