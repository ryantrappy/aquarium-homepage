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
