---
id: AQ-36
title: Review the Sketchfab animated aquarium as a fish-motion reference
status: Done
assignee:
  - '@root'
created_date: '2026-11-03T04:47:00Z'
updated_date: '2026-11-03T12:44:00Z'
labels: []
dependencies: []
references:
  - >-
    https://sketchfab.com/3d-models/virtual-aquarium-all-fish-animated-8de6bc7d49c64649910a199e7405ecb6
  - AQ-5
  - AQ-12
  - AQ-13
  - AQ-18
  - AQ-19
  - AQ-20
  - AQ-21
  - AQ-22
  - AQ-23
  - AQ-24
  - AQ-25
  - AQ-26
  - AQ-27
  - AQ-28
  - AQ-29
  - AQ-30
  - AQ-31
  - AQ-32
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/sketchfab-motion-review.md
priority: medium
type: spike
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the Sketchfab reference https://sketchfab.com/3d-models/virtual-aquarium-all-fish-animated-8de6bc7d49c64649910a199e7405ecb6 for animation ideas relevant to this aquarium. Search-indexed page metadata identifies the title as “Virtual Aquarium ALL Fish Animated,” creator Adam Prejean (@adamprejean), published July 6, 2022, and describes animated swim cycles for Unity aquarium fish that respond to users tapping the glass. The viewer itself has not yet been verified; treat those details as page-description metadata, not observations of playback. The worker must inspect the actual model/viewer animation and record what was observed. This is inspiration and a guide only: do not assume the model’s species match this project’s roster or that its license permits reuse.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The actual Sketchfab viewer/model animation is inspected, and the review distinguishes directly observed playback from page metadata or inaccessible/unverified details.
- [x] #2 The review documents concrete observations about swim-cycle body deformation, fin motion, turning, paths, and any visible reef or habitat interactions, noting unavailable aspects explicitly.
- [x] #3 Takeaways are mapped to relevant follow-up work in AQ-5, AQ-12, AQ-13, and the 15 species-specific animation tasks AQ-18 through AQ-32.
- [x] #4 The reference is attributed as Virtual Aquarium ALL Fish Animated by Adam Prejean (@adamprejean), published July 6, 2022; no species match or reuse/license permission is assumed without verification.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inspect the actual Sketchfab model viewer and animation playback, record observed motion separately from metadata, verify attribution/license as reference only, and map concrete lessons into AQ-5/AQ-12/AQ-13 and species task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: Review https://sketchfab.com/3d-models/virtual-aquarium-all-fish-animated-8de6bc7d49c64649910a199e7405ecb6 as animation inspiration/guide. Compare swim-cycle deformation, fin motion, turning, paths, and reef interaction; map takeaways to AQ-5/AQ-12/AQ-13 and species tasks. Do not assume species catalog match or license permission. Search-indexed metadata says Virtual Aquarium ALL Fish Animated by Adam Prejean (@adamprejean), published July 6, 2022, with animated swim cycles for Unity interactive aquarium fish responding to glass taps. This is page-description metadata only: direct page access was 403 and playback was not observed. Keep To Do until actual viewer/animation review findings are documented.

Root inspected actual playback in the restored Sketchfab viewer: selected Slow Swim, Fast Swim and Look Left at User; verified changing articulated poses and separate fin orientations. Review separates visible playback from page metadata and unverified tap interaction. docs/sketchfab-motion-review.md maps findings to AQ5/12/13, all species AQ18–32 and habitat work. No model reuse or species identity inferred. Saved reference screenshot in design/sketchfab-motion-reference.png.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reviewed actual viewer playback and documented articulated motion, all-angle anatomy checks, fixed display positions and absent habitat interaction. Attributed creator/date, distinguished metadata from observations, and mapped follow-up requirements without assuming model rights or species matches.
<!-- SECTION:FINAL_SUMMARY:END -->
