---
id: AQ-100
title: >-
  Implement click-to-focus camera dolly transitions and fish inspect cards with
  smooth panorama reset
status: Done
assignee:
  - '@codex'
created_date: '2026-11-11 05:09'
updated_date: '2026-11-12 02:18'
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
- [x] #1 Clicking a fish or choosing a service from the Services modal initiates a smooth camera dolly focusing on that fish
- [x] #2 The camera smoothly follows the selected fish while presenting a compact, non-intrusive status card with a direct launch link
- [x] #3 A Reset view button, pressing Escape, or clicking open water smoothly dollies the camera back to the full-tank panorama
- [x] #4 Under prefers-reduced-motion, transitions cut or fade instantly without camera dolly motion
- [x] #5 Keyboard navigation and touch interactions work reliably without camera jitter at 1440x900 and 402x874
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add zoomStateForFishPosition and trackFocusedFishCameraState in src/rendering/scene/camera-zoom.ts with instant snap on reduced-motion/pause.
2. Expose fish focus APIs on AquariumController and add fish inspect card + panorama reset in src/components/AquariumScene.tsx.
3. Add unit tests in src/rendering/scene/camera-zoom.test.ts and src/components/AquariumScene.test.tsx.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added zoomStateForFishPosition and trackFocusedFishCameraState in src/rendering/scene/camera-zoom.ts, wired focusServiceFish and getFocusedServiceId in src/rendering/scene/aquarium.ts, and added the compact glassmorphic .fish-inspect-card with direct launch link and panorama reset (button, Escape, open-water click) in src/components/AquariumScene.tsx and src/styles/aquarium.css.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented click-to-focus camera dolly transitions, live fish tracking, compact glassmorphic fish inspect cards with direct launch links, smooth panorama reset via button/Escape/open-water click, and instant snap under prefers-reduced-motion.
<!-- SECTION:FINAL_SUMMARY:END -->
