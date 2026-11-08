---
id: AQ-76
title: Add runtime LOD, lazy loading, and adaptive quality
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T20:35:00Z'
labels:
  - performance
  - rendering
dependencies:
  - AQ-41
  - AQ-38
  - AQ-70.3
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/assets/manifest-checker.test.ts
  - AQ-70.3
documentation:
  - docs/rendering.md
priority: '4'
type: feature
ordinal: 76
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coordinate with AQ-70.3 (photoreal asset-delivery and frame-time budgets) to implement runtime distance-based geometry/material LOD, progressive/lazy loading for non-active species so initial scene startup stays fast, and adaptive pixel-ratio / shadow-map scaling under GPU load across 1440x900 desktop and 402x874 mobile proxy viewports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Distance-based LOD reduces geometry / texture cost for far fish without visible popping
- [ ] #2 Off-screen species are lazy-loaded instead of all loading up front
- [ ] #3 Adaptive quality lowers pixel ratio / shadows under load and restores them when headroom returns
- [ ] #4 Performance is measured at 1440x900 and 402x874 before and after, with results recorded
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 PR #18 review findings to address before merging origin/perf/lod-adaptive-aq76:
1. Rebase onto current branch to resolve conflicts in src/rendering/scene/aquarium.ts and docs/rendering.md, and include schoolmates (AQ-41) in evaluateFishLod(), pumpLazyLoads(), and the animation loop.
2. In pumpLazyLoads(), replace fish.find(...) with a loop over all inhabitants ([...fish, ...schoolmates].filter(...)) so every instance sharing a speciesId (including schoolmates) upgrades from fallback sprite to GLB, and continue past off-screen species in lazyQueue instead of breaking out of the while loop.
3. Lower LOD_SPRITE_PROJECTED_PX from 70px (which forces tailspot-blenny to a 2D sprite at all depths and drops 10 other species to 2D sprites in mid-tank) and add hysteresis to the projected-pixel threshold.
4. Pass 2 * SIMULATION_STEP_SECONDS when advancing clipPlayer and updateFishFlex on even steps at LOD1 (so LOD1 does not halve animation speed to 0.5x) and retain applyFishTurningRigOverlay.
<!-- SECTION:NOTES:END -->
