---
id: AQ-87
title: Distribute fish across the full water column and multiple depth planes
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-08'
updated_date: '2026-11-13 01:03'
labels:
  - behavior
  - photorealism
  - rendering
dependencies:
  - AQ-34
  - AQ-60
  - AQ-12
references:
  - src/rendering/scene/fish-spawn.ts
  - src/lib/fish-behavior.ts
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/motion.ts
  - AQ-34
  - AQ-60
  - AQ-12
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop fish clustering in the top half of the tank on a single depth plane by enforcing per-species depth/height ranges in spawn placement and route targets, so the school uses the full tank height and at least two distinct depth planes. Scale and depth behaviour are covered by AQ-79 (Blender promotion, per-species Root approval, no automatic swap), AQ-78, AQ-60 (true scale, In Progress), and AQ-34; this task adds only the missing full-water-column distribution requirement. (Video-review finding, 2026-11-08: fish cluster in the top half on what reads as a single plane.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each species' declared depthRange / height band is honoured by spawn placement and route targets — no species is confined to the top half by default
- [ ] #2 Look-dev captures at 1440x900 and 402x874 show fish spread through the full water column and on at least two visibly distinct depth planes, with fish still prominent and legible
- [ ] #3 Fish still pass in front of / behind reef without intersecting solid geometry, and labels / hit targets stay correct at all depths
- [ ] #4 Existing schooling, startle, pause / reduced-motion behaviour is unchanged; tests cover the new distribution
- [ ] #5 Root accepts the distribution against reference captures before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root distribution iteration: preserve each species existing declared vertical band during safety fallback/mesh relocation rather than searching the entire water height when a preferred reef position is blocked. Extend bounded spawn search with an optional safe world-height interval and constrain current service/schoolmate/relocation callers using the existing ecological range helper. Do not reduce collision clearances, reset retained fish after unrelated settings edits, change school/startle/pause contracts or invent habitat targets. Reproduce blocked lower-band fallback in tests and verify actual-controller spawns plus native exact-size captures. Inspect cruise targets/anchor-state exceptions separately; do not claim the whole distribution task accepted from spawn changes alone.

Native diagnostic showed a second cause: height strata reused horizontal ID order, placing a gramma whose ID sorted first at the very top of its own band. Root now assigns independent heightIndex by ecological depth preference, preserving stable horizontal identity lanes and input-order independence. A constrained search also prioritizes keeping intended Y over a shorter upward escape, while preserving collision/crowding checks. Both cruise planners share the same range helper; explicit anchor-state/startle behavior is preserved and remains an acceptance consideration. DEV capture sidecars gain copied inhabitant positions and allowedY bands for objective review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root reviewed two-size native trial: independent ecological height order plus height-preserving safe search restores low foreground fish (gramma aroundY-1.51, butterfly aroundY-1.10) while clown/cardinal remain upper water and tangs span farther depth. DEV snapshots now copy positions/allowedY for objective checks. Root accepts the visible spread for current eight-service roster, but not full-task completion: explicit anchor/startle state targets may leave general cruise bands, clown profile currently ends at normalizedDepth0.48, and exact animated-body solid-clearance gates remain with AQ58/AQ60. Do not infer AC1/AC3 from point-safe snapshots.130focused spawn/scale/controller/motion/schooling/runtime tests and typecheck14scripts pass. Existing spawn test fixtures now consume actual shared reef placements and physical-spacing arguments instead of obsolete hardcoded layout values.
<!-- SECTION:NOTES:END -->
