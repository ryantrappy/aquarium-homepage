---
id: AQ-77
title: Evaluate WebGPU TSL renderer with volumetric water and true refraction
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels: []
dependencies:
  - AQ-38
  - AQ-39
documentation:
  - docs/rendering.md
  - docs/gemini_planning.md
priority: '5'
type: feature
ordinal: 77
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
"WebGPU" does not appear in any open backlog task. AQ-38 was an engine evaluation only, with no production renderer migration. Evaluate a Three.js WebGPURenderer + TSL migration as a research task: volumetric light shafts, true refraction through the water surface and glass, and subsurface scattering are the remaining "extremely realistic" ceiling, but this is a renderer replacement, not a polish pass. Do not start implementation until P0/P1 realism work is done; this task is evaluation first, with a go / no-go decision recorded.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WebGPU / TSL feasibility is evaluated against the current Three.js scene, with risks and migration cost recorded
- [ ] #2 Volumetric water, true refraction, and subsurface scattering are prototyped or explicitly scoped out with reasons
- [ ] #3 A go / no-go decision for a renderer migration is recorded, with Root review
- [ ] #4 No production renderer code is changed as part of this evaluation task
<!-- AC:END -->
