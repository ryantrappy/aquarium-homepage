/**
 * Visual-only display fish (Ryan's 2026-11-09 sailfin decision, removed
 * from the default scene by Ryan's 2026-11-09 "take it out of the tank"
 * decision).
 *
 * This module is the seam for link-less display fish: `resolveDisplayPopulation`
 * returns the fixed inhabitants that swim the tank without a service link.
 * The population is currently EMPTY — no display fish spawns by default.
 * Ryan's rule is that fish in the default tank are the service links, plus
 * the chromis/anthias schoolmates he approved as ambience (PR #17); a hero
 * fish with no link reads as a missing link. The Desjardins' sailfin tang
 * stays a roster species (`src/lib/fish.ts`) as an optional add for a new
 * service — see "Attaching a service" below — and the deliberate
 * link-less-fish feature is tracked in AQ-93 (ambiance fish).
 *
 * Attaching a service (no code change needed): add a service entry with
 * `fishId: 'desjardins-sailfin-tang'` — in the Settings service editor (the
 * fish picker already lists every roster species, sailfin included) or in
 * `EXAMPLE_SERVICES` (`src/lib/services.ts`). The service-fish path is
 * fully generic: the id validates against the roster
 * (`src/lib/validation.ts`), the behavior profile, turning archetype,
 * locomotion extension and scale tables all exist for the species, and the
 * scene spawns it with a native anchor/label like any service fish.
 * LICENSE FLAG (from PR #37): the sailfin GLB source is CC-BY-NC-4.0,
 * which the project's $0 asset policy excludes — Root must clear or replace
 * the asset before it is anything more than a placeholder.
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

/**
 * The display fish to spawn: one descriptor per fixed visual-only fish.
 * Currently empty — see the module comment. The resolver stays so a future
 * ambiance-fish feature (AQ-93) can repopulate it deliberately.
 */
export function resolveDisplayPopulation(): DisplayFishDescriptor[] {
  return []
}
