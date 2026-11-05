---
id: AQ-63
title: 'Fix fish link picking desync, context menu race, and camera-plane projection'
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
labels: []
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/components/AquariumScene.tsx
documentation:
  - docs/code-review-findings.md
priority: high
type: bug
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pointer picking on swimming fish frequently fails because DOM anchor position updates are throttled to ~4 FPS (240ms) while WebGL fish move at 60 FPS, causing pointer clicks to miss the anchor or fail raycast mesh validation. In addition, right-clicking on overlapping fish links temporarily swaps href to the visible fish but reverts it after 0ms, causing browser context menu actions to target the wrong service URL. Finally, positionLabels lacks a camera-plane guard, causing coordinates to invert when a fish crosses behind the camera.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking or tapping any swimming or startled fish reliably opens its configured service URL without raycast misses due to DOM position lag
- [ ] #2 DOM anchor position and bounds remain synchronized with the 3D fish across animation frames without 240ms stutter
- [ ] #3 Right-clicking (contextmenu) on overlapping fish maintains the correct service URL in the native context menu without 0ms race conditions
- [ ] #4 Inhabitants behind the camera plane (projected.z > 1.0 or pos.z >= camera.z) are hidden cleanly without inverted screen coordinates or negative layout bounds
- [ ] #5 Accessible keyboard focus retention and existing occluded-fish focus handoffs from AQ-50 remain intact
<!-- AC:END -->
