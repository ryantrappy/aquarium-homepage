---
id: AQ-88
title: Correct coral saturation and palette in the renderer without rebuilding assets
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-13 05:36'
labels:
  - modeling
  - photorealism
  - rendering
dependencies:
  - AQ-42
  - AQ-70.1
references:
  - src/rendering/scene/coral-material.ts
  - src/rendering/scene/reef-assembly.ts
  - AQ-42
  - AQ-70.11
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Interim, code-only coral colour correction: adjust coral material saturation / grading and palette overrides in coral-material.ts so bleached lavender / white reads as healthy saturated tissue. No coral asset changes (no GLB, socket, or manifest changes). This task explicitly does not replace AQ-70.11, which remains the full fix (large Gemini-owned art rebuild of coral colonies with photoreal tissue / polyp detail and natural colour variation). (Video-review finding, 2026-11-08: corals read bleached lavender/white instead of healthy saturated tissue.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Corals read as saturated healthy tissue (no bleached lavender / white cast) in look-dev captures at 1440x900 and 402x874, judged against the AQ-70.1 rubric
- [ ] #2 Renderer / material-only change (saturation, palette / roughness overrides, fluorescence mask use); no coral GLB / socket / manifest changes, and all AQ-42 / AQ-42.1 contract tests pass
- [ ] #3 No blanket emissive; fluorescence stays mask-driven per AQ-70.6 / AQ-39
- [ ] #4 No frame-time regression at either viewport; Root records art acceptance before Done, and the task notes AQ-70.11 remains the full fix
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Correct the CPU reference evaluator to match GLSL saturation extrapolation above 1 without changing runtime shader behavior or unrelated clamped blends. 2. Add an independent expected-value regression at saturation factor 1.18, covering exact channel results and the GLSL upper highlight ceiling with no extra lower clamp. 3. Run the focused coral material tests and scoped TypeScript check; leave visual and frame-time acceptance pending Root evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-13 CPU/GLSL parity correction: evaluateCoralTissueColor used the shared CPU mix helper, which clamps the AQ-88 saturation factor 1.18 to 1.0; GLSL mix extrapolates above 1. Updated only the CPU reference saturation step to use the GLSL arithmetic, leaving runtime shader and palette behavior unchanged. Added an independent hard-coded numeric regression for a high-chroma input, including the 0.92 per-channel upper cap. Verification: coral-material.test.ts 12/12 passed; npm run typecheck (tsc and script syntax check) passed; scoped git diff --check passed. No assets changed. Visual two-viewport/color acceptance and frame-time evidence remain pending Root.

Root reviewed Luna saturation-reference fix: runtime GLSL remains unchanged; CPU helper had clamped1.18 to1, so its old tests understated grading. Explicit extrapolation and independent numeric expected-value regression now match GLSL upper highlight clamp. Luna reports12 focused tests and typecheck14scripts pass; Root reviewing assembly regressions. This is a verified functional handoff only, not AC1/4 art/performance acceptance; AQ70.11 remains the full tissue/polyp art fix.
<!-- SECTION:NOTES:END -->
