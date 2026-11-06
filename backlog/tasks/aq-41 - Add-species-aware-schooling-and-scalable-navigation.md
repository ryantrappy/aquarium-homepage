---
id: AQ-41
title: Add species-aware schooling and scalable navigation
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 12:33
updated_date: '2026-11-04T02:32:00Z'
labels: []
dependencies:
  - AQ-12
  - AQ-34
  - AQ-35
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC5047653/
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC9339911/
  - https://fishesofaustralia.net.au/home/species/4402
  - https://academic.oup.com/beheco/article-abstract/16/3/521/189890
documentation:
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The reference proposes boids, spatial hashing and GPU computation for large fish populations. The actual service-linked fish count and species-specific social behavior must determine whether this complexity is justified; solitary species should not be forced into schools.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Use sourced species profiles to determine which fish group, with independent bounded steering and collision-safe paths through the habitat.
- [ ] #2 Benchmark realistic configured fish counts on the target viewports and select CPU or GPU spatial indexing based on measurements, documenting limits and fallback behavior.
- [ ] #3 Verify deterministic edge cases for separation, obstacles, population changes, pause and reduced motion without fish intersecting habitat.
- [ ] #4 School steering and refuge responses are limited to species whose profiles support group behavior and compatible shelter (such as blue-green chromis); an ordinary service click or nearby fish does not trigger a screen-wide panic. Any environmental disturbance is an explicit, scoped event.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations

1. **Sourced Social Grouping Classification (`src/rendering/scene/schooling-navigation.ts`, lines 36–55)**:
   - Use `SPECIES_SOCIAL_GROUPING_MODE` to restrict conspecific cohesion and alignment strictly to documented grouping species:
     - `'blue-green-chromis': 'shoal'` (`neighborRadius = 2.2`, `cohesionGain = 0.24`, `alignmentGain = 0.22`)
     - `'lyretail-anthias': 'harem-aggregation'` (`neighborRadius = 2.0`, `cohesionGain = 0.18`, `alignmentGain = 0.16`)
     - `'banggai-cardinalfish': 'hover-group'` (`neighborRadius = 1.6`, `cohesionGain = 0.12`, `alignmentGain = 0.08`)
   - Keep all 12 solitary/territorial/pair-bonded species on `'pair-or-solitary'` so they never school artificially (AC #1).
2. **Collision-Safe Separation & Startle Isolation (`src/rendering/scene/schooling-navigation.ts`, `evaluateSchoolingSteering()` at lines 69–175)**:
   - Apply personal-space repulsion across all nearby fish when `dist < self.clearanceRadius + peer.clearanceRadius + 0.12`.
   - Ignore any startled peer (`peer.startleSeconds > 0`) when accumulating conspecific cohesion and heading alignment so a single-fish service click (AQ-13) never triggers a screen-wide panic (AC #4).
   - Validate candidate steering offsets through `isWaterSegmentSafe({ start: self.position, target: candidate, waterBounds, obstacles, fishClearanceRadius: self.clearanceRadius })` before applying (AC #1, #3).
3. **Wire Peer Schooling Step into Scene Loop (`src/rendering/scene/aquarium.ts`, `render()` at lines 322–334)**:
   - In `render()`, build the snapshot array `peers: SchoolingPeer[]` from `fish.map(f => ({ id: f.service.id, speciesId: f.service.fishId as SpeciesBehaviorId, position: f.motion.position, yaw: f.motion.yaw, speed: f.motion.speed, clearanceRadius: f.motion.clearance, startleSeconds: f.motion.startleSeconds }))` and apply `evaluateSchoolingSteering()` during each simulation substep when `!stopped && !reducedMotion`.
4. **CPU vs. Spatial-Grid Benchmark Verification (`src/rendering/scene/schooling-navigation.ts`, `benchmarkSchoolingStep()` at lines 183–234 & `src/rendering/scene/schooling-navigation.test.ts`)**:
   - Run `benchmarkSchoolingStep(24, 50)` to verify direct CPU pairwise scanning completes in `< 500 µs/step` for realistic homepage populations (`N <= 24`), avoiding unnecessary GPU compute shader overhead (AC #2).
<!-- SECTION:PLAN:END -->


## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Implemented src/rendering/scene/schooling-navigation.ts and src/rendering/scene/schooling-navigation.test.ts:
  * Sourced social grouping modes (SPECIES_SOCIAL_GROUPING_MODE) restrict cohesion/alignment to profile-supported grouping species (blue-green-chromis shoal, lyretail-anthias harem-aggregation, banggai-cardinalfish hover-group) while keeping solitary/territorial species (royal-gramma, firefish, yellow-watchman-goby, tailspot-blenny, six-line-wrasse, etc.) independent.
  * Isolates single-fish service-click startles (peer.startleSeconds > 0) so an ordinary service click never triggers a screen-wide school panic (AC #4).
  * Enforces personal-space separation and isWaterSegmentSafe obstacle boundaries, freezes under pause/reduced-motion, and includes benchmarkSchoolingStep() confirming direct CPU evaluation completes in < 1 ms/frame for realistic homepage populations (N <= 24).
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

Reviewed behavior guidance supports AQ-41's existing schooling/navigation scope. Keep group steering limited to profile-supported species and compatible refuges; don't interpret AQ-13's single-fish service click or ordinary proximity as a threat cue for other fish.

---

author: @Luna
created: 2026-11-04T02:32:00Z

---

Research doc now distinguishes documented social patterns (Chromis shoals, Anthias aggregations/harems, group-living Banggai cardinalfish) and retracts the “only two group” claim. The <0.05 ms/frame spatial-index estimate was unmeasured and is withdrawn; benchmark before selecting an optimization.

---
<!-- COMMENTS:END -->
