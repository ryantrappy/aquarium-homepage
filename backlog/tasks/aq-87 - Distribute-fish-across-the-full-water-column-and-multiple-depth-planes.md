---
id: AQ-87
title: Distribute fish across the full water column and multiple depth planes
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-08'
labels:
  - behavior
  - photorealism
  - rendering
dependencies:
  - AQ-34
  - AQ-60
  - AQ-12
references:
  - src/rendering/scene/fish-spawn.ts
  - src/lib/fish-behavior.ts
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/motion.ts
  - AQ-34
  - AQ-60
  - AQ-12
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop fish clustering in the top half of the tank on a single depth plane by enforcing per-species depth/height ranges in spawn placement and route targets, so the school uses the full tank height and at least two distinct depth planes. Scale and depth behaviour are covered by AQ-79 (Blender promotion, per-species Root approval, no automatic swap), AQ-78, AQ-60 (true scale, In Progress), and AQ-34; this task adds only the missing full-water-column distribution requirement. (Video-review finding, 2026-11-08: fish cluster in the top half on what reads as a single plane.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each species' declared depthRange / height band is honoured by spawn placement and route targets — no species is confined to the top half by default
- [ ] #2 Look-dev captures at 1440x900 and 402x874 show fish spread through the full water column and on at least two visibly distinct depth planes, with fish still prominent and legible
- [ ] #3 Fish still pass in front of / behind reef without intersecting solid geometry, and labels / hit targets stay correct at all depths
- [ ] #4 Existing schooling, startle, pause / reduced-motion behaviour is unchanged; tests cover the new distribution
- [ ] #5 Root accepts the distribution against reference captures before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
