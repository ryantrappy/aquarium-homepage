---
id: AQ-93
title: Add ambiance fish (link-less display fish) as a future feature
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-09
updated_date: 2026-11-09
labels:
  - behavior
  - rendering
dependencies:
  - AQ-41
  - AQ-44
  - AQ-82
  - AQ-70.3
references:
  - src/rendering/scene/display-population.ts
  - src/rendering/scene/school-population.ts
documentation:
  - docs/reef-fish-roster.md
priority: Low
type: feature
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design link-less display fish ("ambiance fish") as a deliberate feature, so
the tank can have background life without implying a missing service link.

Context: PR #37 added the Desjardins' sailfin tang as an always-present
link-less fish, and Ryan had it removed the same day ("take it out of the
tank") — a hero fish with no link reads as a missing link. But link-less
fish already exist deliberately: the chromis/anthias schoolmates (PR #17,
Ryan's 2026-11-08 population decision) swim the tank with no service, no
label, and no picking. This task turns that precedent into a designed
feature instead of a one-off.

Design questions to settle (no code until Root accepts the design):

- Species eligibility: which species may be ambiance fish. Small and
  background species only (schooling species, cryptic bottom-dwellers);
  hero species and any species carrying a service link are excluded.
- Visual distinction: ambiance fish must read as background, not as broken
  links — no label, never pickable or focusable, no hover affordance, and
  ideally a visibly quieter treatment than service fish (smaller scale,
  background depth planes, no link affordances of any kind).
- Spawn and config rules: how ambiance fish are enabled and how many spawn
  (default off unless deliberately enabled? a fixed population per species?
  tied to the service list or independent of it?).
- Budget compliance (AQ-70.3): ambiance fish count against the Phase 0,
  total-fish, and GPU caps in the true runtime totals; the design must say
  how many fit and what loads lazily.
- Behavior and motion integration (AQ-41/AQ-44/AQ-45, AQ-82 anchors):
  ambiance fish swim naturally (schooling, perching, grazing) and never
  strand, loop, or block service fish spawns.

The seam already exists: `src/rendering/scene/display-population.ts`
(`resolveDisplayPopulation()`) currently returns an empty population after
the sailfin removal, and is the place a deliberate ambiance population
would be resolved from.

Note explicitly: the sailfin itself stays an optional add for a new service
(see `display-population.ts`, "Attaching a service"), NOT an ambiance fish.
Its size (12 in render length, the largest fish in the tank) and hero
status disqualify it under the eligibility rule above.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Species eligibility rule recorded: which species may be ambiance fish, with hero and link species explicitly excluded
- [ ] #2 Visual-distinction rule recorded: no label, never pickable or focusable, no hover affordance, and a visibly quieter treatment than service fish
- [ ] #3 Spawn and config behavior defined: how ambiance fish are enabled, how many spawn, and whether the population is tied to the service list
- [ ] #4 Budget check defined: ambiance fish counted in the AQ-70.3 true runtime totals (Phase 0, total fish, GPU) with the headroom stated
- [ ] #5 Behavior and motion integration defined (AQ-41/AQ-44/AQ-45, AQ-82 anchors) so ambiance fish swim naturally and never strand or block service spawns
- [ ] #6 No change to the five service fish or the chromis/anthias schoolmates
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
