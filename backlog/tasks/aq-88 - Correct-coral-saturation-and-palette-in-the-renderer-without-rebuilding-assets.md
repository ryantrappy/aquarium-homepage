---
id: AQ-88
title: Correct coral saturation and palette in the renderer without rebuilding assets
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-08'
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
