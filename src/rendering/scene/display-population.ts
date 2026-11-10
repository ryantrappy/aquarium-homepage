/**
 * Visual-only display fish (Ryan's 2026-11-09 sailfin decision).
 *
 * Roster species with no service link that still swim the tank. A display
 * fish is a fixed inhabitant, not a schoolmate: it has no lead service fish
 * to cluster around, so it spawns from its own species preference (like a
 * service fish) but fail-soft (like a mate) — a missing safe spawn skips it
 * instead of failing the scene. It carries no service URL and no anchor by
 * construction, and the scene creates it with the schoolmate flag, so it is
 * never pickable or focusable and never gets a label.
 *
 * The first (and only) display fish is the Desjardins' sailfin tang: the
 * `download_testing_copies` GLB that used to stand in for the yellow tang
 * is now its own species, while the yellow tang goes back to the licensed
 * proof candidate (`proof/candidate-real-tang.glb`).
 */

export const DISPLAY_FISH_ID = 'display-desjardins-sailfin-tang'
export const DISPLAY_SPECIES_ID = 'desjardins-sailfin-tang'

export type DisplayFishDescriptor = Readonly<{
  /** Deterministic id: `display-<species-id>`. */
  id: string
  speciesId: typeof DISPLAY_SPECIES_ID
}>

export function isDisplayFishId(id: string): boolean {
  return id.startsWith('display-')
}

/** The display fish to spawn: one descriptor per fixed visual-only fish. */
export function resolveDisplayPopulation(): DisplayFishDescriptor[] {
  return [{ id: DISPLAY_FISH_ID, speciesId: DISPLAY_SPECIES_ID }]
}
