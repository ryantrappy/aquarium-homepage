---
id: AQ-62
title: Allow zooming into focal areas of the reef aquascape
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-05 18:00
updated_date: '2026-11-08T20:08:00Z'
labels:
  - ui
  - rendering
  - accessibility
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/alpha-picking.ts
  - src/components/AquariumScene.tsx
  - AQ-50
  - AQ-58
documentation:
  - docs/design-principles.md
  - docs/rendering.md
priority: '33'
type: feature
ordinal: 33
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current aquarium scene uses a fixed front-on perspective of the full tank volume. While this provides the primary wide overview, users cannot inspect fine biological details of modular coral colonies, polyp motion, rock crevices, or cave passages. Adding bounded camera zoom into focal areas of the reef with smooth transitions, collision/boundary clamping, and a seamless return to the default overview enhances immersion while preserving the contained-tank aesthetic and accessible service links.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Camera supports zooming into focal regions of the reef with smooth interpolated transitions
- [ ] #2 Camera translation and zoom depth are strictly clamped to stay inside the water volume without clipping into live rock or aquarium glass
- [ ] #3 A clear, accessible mechanism (e.g. reset button or Esc key) smoothly returns the camera to the default full-tank overview
- [ ] #4 Fish service links, labels, and raycast picking maintain accurate screen projection and occlusion throughout zoom states
- [ ] #5 Reduced-motion preference (prefers-reduced-motion) disables animated camera smoothing in favor of instant framing
- [ ] #6 Responsive behavior is verified on 1440x900 and 402x874 viewports without UI clipping
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
