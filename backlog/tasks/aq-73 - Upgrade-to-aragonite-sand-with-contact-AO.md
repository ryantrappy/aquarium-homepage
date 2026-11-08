---
id: AQ-73
title: Upgrade to aragonite sand with contact AO and grain detail
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T20:08:00Z'
labels:
  - photorealism
  - rendering
dependencies:
  - AQ-59
  - AQ-14.3
  - AQ-70.12
references:
  - src/rendering/scene/aquarium.ts
  - docs/asset-evidence/aq70-12/functional-review.json
  - AQ-70.12
documentation:
  - docs/rendering.md
priority: '3'
type: feature
ordinal: 73
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Current main-scene sand in src/rendering/scene/aquarium.ts (~L113-165) is a 256x256 procedural LCG-noise DataTexture on a sine-rippled plane with hard-coded indigo AO blobs. Coordinate with AQ-70.12 (see docs/asset-evidence/aq70-12/functional-review.json) to review and integrate photoreal aragonite sand with grain-scale normal/roughness detail, subtle mineral sparkle, non-repeating macro variation, and soft contact AO where live rock meets the substrate while staying within GPU memory (~4 MiB with mips) and triangle budgets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sand shows grain-scale normal / roughness variation and sparkle at close range, not a flat procedural texture
- [ ] #2 Contact AO is present where live rock meets the substrate, with grounded bases
- [ ] #3 The external AQ-70.12 sand work is Root-reviewed and either integrated or explicitly rejected with reasons
- [ ] #4 Sand is verified at 1440x900 and 402x874 with no performance regression
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
