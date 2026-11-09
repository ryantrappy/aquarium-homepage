---
id: AQ-71
title: Add a PMREM IBL environment map
status: In Progress
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T21:36:00Z'
labels:
  - photorealism
  - rendering
  - optics
  - ready-for-review
  - gemini approved
dependencies:
  - AQ-39
  - AQ-14.2
  - AQ-70.4
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/underwater-optics.ts
  - AQ-70.4
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 71
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The main scene currently lacks a scene.environment PMREM texture, causing MeshStandardMaterial fish and coral surfaces to lack view-dependent specular reflections and read flat or plasticky. Coordinate with AQ-70.4 to generate and apply a custom or CC0/CC-BY-4.0 verified reef-tank PMREM environment map in src/rendering/scene/aquarium.ts, evaluate tone mapping (ACESFilmicToneMapping exposure 1.02 baseline vs AgX/Neutral per AQ-70.4), and re-tune key/fill/rim light intensities so wet, iridescent fish surfaces read naturally without over-exposing highlights.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A PMREM environment map is loaded and applied to the scene without breaking the existing 3-tier LED rig
- [x] #2 Fish materials show visible specular / iridescent response that changes with viewing angle
- [ ] #3 Exposure and light intensities are re-tuned so the scene is not over- or under-exposed at 1440x900 and 402x874
- [ ] #4 Performance is verified at both viewports with no regression in frame rate
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 audit: PR #9 merged procedural PMREM environment map generation (src/rendering/scene/environment-map.ts, 6 passing tests in environment-map.test.ts) and wired scene.environment and per-role envMapIntensity into src/rendering/scene/aquarium.ts. Moved to In Progress (ready-for-review / gemini approved) awaiting Root 2-viewport exposure/performance sign-off (ACs #3-#4).
<!-- SECTION:NOTES:END -->
