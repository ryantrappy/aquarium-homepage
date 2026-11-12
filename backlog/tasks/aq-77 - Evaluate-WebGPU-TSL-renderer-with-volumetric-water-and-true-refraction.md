---
id: AQ-77
title: Evaluate WebGPU TSL renderer with volumetric water and true refraction
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-08 00:30'
updated_date: '2026-11-12 05:37'
labels:
  - rendering
  - research
  - gemini-research
dependencies:
  - AQ-38
  - AQ-39
  - AQ-70.4
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/coral-material.ts
  - src/rendering/scene/underwater-optics.ts
  - AQ-70.4
  - AQ-72
  - AQ-78
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
- [x] #1 WebGPU / TSL feasibility is evaluated against the current Three.js scene, with risks and migration cost recorded
- [x] #2 Volumetric water, true refraction, and subsurface scattering are prototyped or explicitly scoped out with reasons
- [x] #3 A go / no-go decision for a renderer migration is recorded, with Root review
- [x] #4 No production renderer code is changed as part of this evaluation task
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Evaluate feasibility, record scoped effects and migration risks, and obtain Root decision without changing production renderer.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Evaluation completed 2026-11-08 (docs/research/webgpu-evaluation-aq77.md, PR queued as docs/webgpu-evaluation-aq77). Recommendation: DEFER — stay on WebGLRenderer. Three.js r187 (pinned) already ships WebGPURenderer + TSL with automatic WebGL 2 fallback, but it is still experimental per the three.js manual, the scene's 30 onBeforeCompile GLSL patches would all need TSL ports, and volumetric-water/refraction/SSS gains are gated on AQ-78 rigged fish and AQ-72 fin work that do not exist yet. No measured GPU bottleneck exists (33.3 ms median is a host frame interval, not a GPU timing). Re-evaluate once AQ-39 optics, AQ-76 LOD, and AQ-78 assets have landed and either WebGPURenderer leaves experimental status or a measured GPU bottleneck appears. No production renderer code changed (AC #4, AQ-38 AC7). ACs remain unchecked pending Root review; status/Done left to Root.

2026-11-08 audit: PR #20 merged docs/research/webgpu-evaluation-aq77.md with full feasibility, TSL shader port cost, and DEFER recommendation (zero production renderer changes). ACs #1, #2, #4 verified; moved to In Progress (ready-for-review / gemini approved) awaiting Root sign-off on AC #3.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-12 05:37
---
Root review 2026-11-11: Accepted DEFER as the current no-go decision. Historical version/browser claims are dated research context, not current compatibility guarantees. Verified ecf3e89 file scope and current WebGLRenderer/GLSL dependencies.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root reviewed the AQ-77 evaluation and accepts DEFER: retain WebGLRenderer and revisit migration after asset/quality work or measured GPU constraints justify it. Evaluation commit ecf3e89 changes only documentation and task records; current renderer and GLSL patch dependencies corroborate migration cost. Effects are explicitly scoped out with reasons. No production renderer migration is authorized.
<!-- SECTION:FINAL_SUMMARY:END -->
