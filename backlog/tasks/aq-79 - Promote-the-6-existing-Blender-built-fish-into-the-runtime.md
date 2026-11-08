---
id: AQ-79
title: Promote the 6 existing Blender-built fish into the runtime
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08
updated_date: '2026-11-08T19:35:00Z'
labels: []
dependencies:
  - AQ-70
  - AQ-12
  - AQ-40
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 79
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Per-species, Root-reviewed promotion of the 6 Blender-built fish in src/rendering/assets/fish/ into the live roster, wiring them in aquarium.ts / the fish roster and replacing the corresponding splat-fish GLBs (procedurally extruded from 2D silhouettes). This closes the remaining gap in tracker item 1: AQ-78 covers building NEW scanned/sculpted fish only (its AC #4 covers promotion of those new models, "no automatic swap"), and AQ-70.9/70.10 are rebuild work — neither covers promoting the existing Blender fish. This is a prerequisite for AQ-72 (translucent fins/iridescence AC #1) and AQ-74 (eyes/gills/mouth AC #1), both of which assume "the promoted fish models". No automatic swap — Root review is required per the Blender README (do not replace active models automatically).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each of the 6 Blender fish is reviewed per-species against its species baseline before promotion
- [ ] #2 Promoted fish are wired into the live roster with correct service assignment and click targets
- [ ] #3 The corresponding splat-fish GLBs are removed/replaced with no orphaned references
- [ ] #4 Visual acceptance passes at 1440x900 and 402x874
- [ ] #5 No automatic swap — promotion only on Root approval per species
<!-- AC:END -->
