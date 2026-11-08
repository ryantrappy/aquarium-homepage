---
id: AQ-79
title: Promote the 6 existing Blender-built fish into the runtime
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-08T20:08:00Z'
labels:
  - modeling
  - photorealism
  - rendering
dependencies:
  - AQ-70
  - AQ-12
  - AQ-40
  - AQ-58
  - AQ-60
references:
  - src/rendering/assets/fish/manifest.json
  - src/rendering/assets/splat-fish/manifest.json
  - src/rendering/assets/splat-fish/overrides/
  - src/rendering/scene/aquarium.ts
  - scripts/verify-fish-clip-player.mjs
  - AQ-58
  - AQ-60
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 79
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Perform per-species visual and contract comparison between the 6 candidate models in src/rendering/assets/fish/ and the photoreal texture-projected / Blender-override models in src/rendering/assets/splat-fish/ (including overrides/blue-tang.glb), promoting only the higher-realism, Root-approved asset for each species into the active runtime roster in src/rendering/scene/aquarium.ts without breaking service-link picking, adult scale (AQ-60), or clip-player pose safety (AQ-58).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each of the 6 Blender fish is reviewed per-species against its species baseline before promotion
- [ ] #2 Promoted fish are wired into the live roster with correct service assignment and click targets
- [ ] #3 The corresponding splat-fish GLBs are removed/replaced with no orphaned references
- [ ] #4 Visual acceptance passes at 1440x900 and 402x874
- [ ] #5 No automatic swap — promotion only on Root approval per species
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
