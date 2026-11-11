---
id: AQ-100
title: >-
  Implement click-to-focus camera dolly transitions and fish inspect cards with
  smooth panorama reset
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 05:09'
labels:
  - camera
  - ui
  - interaction
  - threejs
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/components/AquariumScene.tsx
  - src/components/ServiceModal.tsx
  - AQ-97
documentation:
  - docs/rendering.md
priority: high
type: enhancement
ordinal: 106000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement an interactive click-to-focus camera transition and inspection card workflow:
1. Smooth Camera Dolly:
   - When a user clicks a fish in the 3D scene or selects a service from the Services menu, smoothly dolly the camera to focus on and track that specific fish as it swims.
   - Use camera-controls or smooth interpolation (e.g. GSAP / damped lerp) with easing.
2. Compact Inspect Card:
   - Present a compact glassmorphic card displaying the service details, direct quick-launch link, and configured server telemetry.
3. Panorama Reset:
   - Provide a prominent, subtle "Reset view" button (or clicking open water / pressing Escape) that smoothly dollies the camera back to the default wide full-tank panorama.
4. Accessibility:
   - When prefers-reduced-motion is active, transition instantly without motion sickness; maintain full keyboard and screen-reader access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking a fish or choosing a service from the Services modal initiates a smooth camera dolly focusing on that fish
- [ ] #2 The camera smoothly follows the selected fish while presenting a compact, non-intrusive status card with a direct launch link
- [ ] #3 A Reset view button, pressing Escape, or clicking open water smoothly dollies the camera back to the full-tank panorama
- [ ] #4 Under prefers-reduced-motion, transitions cut or fade instantly without camera dolly motion
- [ ] #5 Keyboard navigation and touch interactions work reliably without camera jitter at 1440x900 and 402x874
<!-- AC:END -->
