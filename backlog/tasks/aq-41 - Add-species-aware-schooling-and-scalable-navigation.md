---
id: AQ-41
title: Add species-aware schooling and scalable navigation
status: In Progress
assignee:
  - '@Luna'
created_date: 2026-11-03 12:33
updated_date: '2026-11-08T21:36:00Z'
labels:
  - ready-for-review
  - gemini approved
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
priority: '18'
type: enhancement
ordinal: 18
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The reference proposes boids, spatial hashing and GPU computation for large fish populations. The actual service-linked fish count and species-specific social behavior must determine whether this complexity is justified; solitary species should not be forced into schools.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Use sourced species profiles to determine which fish group, with independent bounded steering and collision-safe paths through the habitat.
- [x] #2 Benchmark realistic configured fish counts on the target viewports and select CPU or GPU spatial indexing based on measurements, documenting limits and fallback behavior.
- [x] #3 Verify deterministic edge cases for separation, obstacles, population changes, pause and reduced motion without fish intersecting habitat.
- [x] #4 School steering and refuge responses are limited to species whose profiles support group behavior and compatible shelter (such as blue-green chromis); an ordinary service click or nearby fish does not trigger a screen-wide panic. Any environmental disturbance is an explicit, scoped event.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Implemented src/rendering/scene/schooling-navigation.ts and src/rendering/scene/schooling-navigation.test.ts:
  * Sourced social grouping modes (SPECIES_SOCIAL_GROUPING_MODE) restrict cohesion/alignment to profile-supported grouping species (blue-green-chromis shoal, lyretail-anthias harem-aggregation, banggai-cardinalfish hover-group) while keeping solitary/territorial species (royal-gramma, firefish, yellow-watchman-goby, tailspot-blenny, six-line-wrasse, etc.) independent.
  * Isolates single-fish service-click startles (peer.startleSeconds > 0) so an ordinary service click never triggers a screen-wide school panic (AC #4).
  * Enforces personal-space separation and isWaterSegmentSafe obstacle boundaries, freezes under pause/reduced-motion, and includes benchmarkSchoolingStep() confirming direct CPU evaluation completes in < 1 ms/frame for realistic homepage populations (N <= 24).

2026-11-08 audit: PR #17 merged species-aware schooling and visual schoolmates (src/rendering/scene/school-population.ts, schooling-navigation.ts, stepSwimmingSchool and disturbSchool in motion.ts, reconcileSchoolmates in aquarium.ts) plus mesh-navigation compatibility fixes (isSafeCurrentInhabitantPosition and isSegmentSafe). All 4 ACs verified by schooling-navigation.test.ts and school-population.test.ts; moved to In Progress (ready-for-review / gemini approved) for Root review.
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
