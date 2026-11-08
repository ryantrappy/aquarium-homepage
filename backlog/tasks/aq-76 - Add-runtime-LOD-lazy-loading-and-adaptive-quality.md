---
id: AQ-76
title: Add runtime LOD, lazy loading, and adaptive quality
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels: []
dependencies:
  - AQ-41
  - AQ-38
documentation:
  - docs/rendering.md
priority: '4'
type: feature
ordinal: 76
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Proof fish GLBs are heavy for a launcher (proof clown 5.97 MB, splat-fish up to 2.13 MB each) and there is no runtime LOD, lazy loading, or adaptive quality system — "LOD" in the backlog currently refers only to asset geometry LODs. Add distance-based LOD, lazy loading of off-screen species, and an adaptive pixel-ratio / shadow toggle, without dropping desktop quality (pixel ratio cap 1.5).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Distance-based LOD reduces geometry / texture cost for far fish without visible popping
- [ ] #2 Off-screen species are lazy-loaded instead of all loading up front
- [ ] #3 Adaptive quality lowers pixel ratio / shadows under load and restores them when headroom returns
- [ ] #4 Performance is measured at 1440x900 and 402x874 before and after, with results recorded
<!-- AC:END -->
