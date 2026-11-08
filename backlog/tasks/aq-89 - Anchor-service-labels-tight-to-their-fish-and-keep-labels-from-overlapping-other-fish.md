---
id: AQ-89
title: Anchor service labels tight to their fish and keep labels from overlapping other fish
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-08'
labels:
  - accessibility
  - photorealism
  - rendering
dependencies:
  - AQ-13
  - AQ-70.14
  - AQ-34
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/fish-link-projection.ts
  - src/components/AquariumScene.tsx
  - src/styles/aquarium.css
  - AQ-13
  - AQ-70.14
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Service labels sit tucked directly under their fish with no floating gap, and never visually cover another fish. AQ-70.14 (Done: smaller / subtler captions, click priority across overlaps), AQ-13 AC #6 / AC #4, and AQ-34 AC #4 already cover caption styling, hover/focus brightening, and occlusion; this task adds only the missing tight anchoring and the rule that a label must not visually overlap another fish or its label. (Video-review finding, 2026-11-08: labels float with a visible gap under their fish and overlap other fish.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each label is anchored tight under (or immediately beside, at frame edges) its fish with no visible floating gap, at 1440x900 and 402x874
- [ ] #2 Labels never visually overlap another fish or its label; where fish cluster, labels de-conflict (offset, fade, or hide behind the nearer fish) while the native link and 44px target stay usable
- [ ] #3 Labels still follow moving fish, stay readable, brighten on hover / focus, and respect occlusion, per AQ-13 AC #4 and AQ-34 AC #4
- [ ] #4 Reduced-motion, pause, keyboard, touch, and Services-modal access are unchanged; existing AQ-70.14 / AQ-13 tests pass plus new overlap / anchoring tests
- [ ] #5 Root native visual review at 1440x900 and 402x874 accepts the anchoring before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
