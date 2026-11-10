---
id: AQ-86
title: Add restrained aquarium-scale depth haze and volumetric light shafts
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-08'
labels:
  - optics
  - photorealism
  - rendering
dependencies:
  - AQ-39
  - AQ-14.6
  - AQ-70.6
references:
  - src/rendering/scene/underwater-optics.ts
  - src/rendering/scene/aquarium.ts
  - AQ-39
  - AQ-14.6
  - AQ-70.6
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give the tank visible depth with a restrained haze that starts behind the primary fish swimming volume and soft volumetric light shafts descending from the surface, without open-ocean fog, a blue veil, or a dark vignette. The graded background and the background/sand seam are covered by AQ-39, AQ-14.6, and AQ-70.6; this task adds only the missing fog/vignette-adjacent depth cues, constrained by the standing forbids: AQ-39 §1.1 rejects open-ocean fog, AQ-14.6 AC #3 forbids an open-ocean vignette, and AQ-14.2 AC #4 forbids blur/vignette/dark overlay. Unless Ryan/Root explicitly amend AQ-39, AQ-14.6 AC #3, and AQ-14.2 AC #4, no open-ocean fog, blue veil, blur, or dark vignette may be added under this task. (Video-review finding, 2026-11-08: the tank reads flat, with no depth haze and a hard horizontal background/sand seam.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Haze is visible in the rear water column / graded background, starts behind the primary fish volume (z < -1.5), and leaves foreground and mid-tank fish colours un-veiled at 1440x900 and 402x874
- [ ] #2 Soft volumetric shafts descend from the surface, weaken with depth, freeze under pause / reduced motion / page-hidden, and never flicker
- [ ] #3 No open-ocean fog, blue veil, blur, or dark vignette is added; any vignette decision is recorded with amended ACs in AQ-39, AQ-14.6, and AQ-14.2 first
- [ ] #4 The hard horizontal background/sand seam is gone at 1440x900 and 402x874, verified in look-dev captures
- [ ] #5 No frame-time regression at either viewport; Root reviews the captures before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
