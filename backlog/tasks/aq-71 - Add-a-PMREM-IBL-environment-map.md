---
id: AQ-71
title: Add a PMREM IBL environment map
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels: []
dependencies:
  - AQ-39
  - AQ-14.2
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 71
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The main scene has no environment map / PMREM / IBL, so fish PBR materials read flat and plasticky. Add a PMREM-generated environment map and a proper specular environment to the Three.js scene so wet, iridescent fish surfaces read as wet. Keep ACESFilmicToneMapping exposure 1.02 as the baseline and re-tune lighting after the env map lands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A PMREM environment map is loaded and applied to the scene without breaking the existing 3-tier LED rig
- [ ] #2 Fish materials show visible specular / iridescent response that changes with viewing angle
- [ ] #3 Exposure and light intensities are re-tuned so the scene is not over- or under-exposed at 1440x900 and 402x874
- [ ] #4 Performance is verified at both viewports with no regression in frame rate
<!-- AC:END -->
