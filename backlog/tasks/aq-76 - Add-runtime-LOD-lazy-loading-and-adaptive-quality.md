---
id: AQ-76
title: Add runtime LOD, lazy loading, and adaptive quality
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T20:08:00Z'
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
