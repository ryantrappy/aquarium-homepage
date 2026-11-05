---
id: AQ-63
title: 'Fix fish link picking desync, context menu race, and camera-plane projection'
status: Done
assignee:
  - '@link-interaction'
created_date: '2026-11-05 18:32'
updated_date: '2026-11-05 21:04'
labels: []
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/components/AquariumScene.tsx
documentation:
  - docs/asset-evidence/aq63/review.json
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
- [x] #1 Clicking or tapping any swimming or startled fish reliably opens its configured service URL without raycast misses due to DOM position lag
- [x] #2 DOM anchor position and bounds remain synchronized with the 3D fish across animation frames without 240ms stutter
- [x] #3 Right-clicking (contextmenu) on overlapping fish maintains the correct service URL in the native context menu without 0ms race conditions
- [x] #4 Inhabitants behind the camera plane (projected.z > 1.0 or pos.z >= camera.z) are hidden cleanly without inverted screen coordinates or negative layout bounds
- [x] #5 Accessible keyboard focus retention and existing occluded-fish focus handoffs from AQ-50 remain intact
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify current label cadence, native context targeting, camera projection and AQ-50 focus behavior against the task claims. 2. Fix confirmed interaction defects in narrowly owned modules, coordinating any aquarium.ts edits with Root. 3. Run focused behavioral tests and report criterion-specific evidence and browser limitations for Root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 implementation starts with allegation verification; prior Root observation that anchor transforms update each frame must be preserved. aquarium.ts contains concurrent splat-fish work and is not owned by this worker.

2026-11-05 @link-interaction handoff: confirmed the claimed 240ms transform throttle is false in current source: positionLabels executes each render; only visibility raycasts are throttled. Added camera-space projection helper rejecting behind/on-camera, near/far-clipped and nonfinite coordinates before CSS mutation; invalid labels use existing AQ-50 focus handoff and retain last valid focused position when fallback cannot accept focus. Native overlap target href now persists without 0ms timer while a context menu may remain open, and each subsequent action resolves its own service afresh. Focused verification: AquariumScene, fish-link-projection, fish-link-focus and alpha-picking suites, 23 tests/4 files passed; typecheck passed. Unit/DOM evidence covers 30-second context href persistence, subsequent keyboard and pointer target reset, native default prevention behavior, middle click, exact alpha/occlusion and existing focus contracts. Root owns browser review for full interactive criterion acceptance; no AC/status completion claimed by this worker.

2026-11-05 Root independent review:18 focused tests pass, isolated reviewed-source typecheck and production build pass. Native Chrome1440x900/402x874 scale1: all5 link transforms changed on every one of23 consecutive sampled frame intervals with finite >=44px bounds; sampled body clicks opened native tabs without lag misses, overlapping rectangles resolved the foreground service. Native delayed context Open Link opened Komodo; DOM overlap regression retains chosen URL for30seconds and re-resolves the following keyboard/pointer action. Phone pause stable12frames/resume moves, Settings fits/no horizontal overflow. Camera depth tests cover on/behind/near/far/nonfinite and rotated camera, existing AQ50 focus/keyboard contracts pass. Evidence and limits:docs/asset-evidence/aq63/review.json plus two screenshots. Preserved concurrent splat/model URL changes are excluded from this task commit. No final art/scene acceptance. Preexisting PCFSoftShadowMap warning persists; no captured errors.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed native overlap context URL lifetime and camera-depth label projection while preserving frame-synchronized bounds, exact picking and AQ50 focus behavior. Root verified18 behavior tests, isolated typecheck/build and native browser interactions at1440x900/402x874. Evidence:docs/asset-evidence/aq63/review.json. Concurrent visual assets preserved and excluded.
<!-- SECTION:FINAL_SUMMARY:END -->
