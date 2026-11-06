---
id: AQ-62
title: Allow zooming into focal areas of the reef aquascape
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:00'
labels: []
dependencies: []
documentation:
  - docs/design-principles.md
  - docs/rendering.md
priority: medium
type: feature
ordinal: 65000
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations

1. **Define Bounded Reef Focal Zones & Camera Clamping (`src/rendering/scene/underwater-optics.ts` or `src/rendering/scene/camera-zoom.ts`)**:
   - Define preset focal targets inside the safe water volume (`x in [-3.2, +3.2]`, `y in [-1.8, +1.6]`, `z in [3.2, 9.0]`) so the camera never clips into the front glass (`z = 9.0`), rear backdrop (`z = -5.5`), sandbed (`y = -2.8`), or live-rock island bounding boxes:
     ```ts
     export type ReefFocalZoneId = 'overview' | 'left-arch' | 'anemone-terrace' | 'right-garden'
     export const REEF_FOCAL_ZONES: Record<ReefFocalZoneId, { position: Vec3; lookAt: Vec3; fov: number }> = {
       overview: { position: { x: 0, y: 0.15, z: 9.0 }, lookAt: { x: 0, y: 0.15, z: 0 }, fov: 42 },
       'left-arch': { position: { x: -2.1, y: -0.55, z: 4.6 }, lookAt: { x: -2.35, y: -0.95, z: -1.35 }, fov: 36 },
       'anemone-terrace': { position: { x: -1.6, y: 0.35, z: 4.4 }, lookAt: { x: -2.05, y: 0.15, z: -1.15 }, fov: 35 },
       'right-garden': { position: { x: 2.2, y: -0.25, z: 4.6 }, lookAt: { x: 2.65, y: -0.55, z: -1.20 }, fov: 36 },
     }
     ```
2. **Smooth Camera Interpolation & Projection Sync (`src/rendering/scene/aquarium.ts`, lines 63, 281–345)**:
   - Extend `AquariumController` (line 42) with `setFocalZone(zone: ReefFocalZoneId): void` and `getFocalZone(): ReefFocalZoneId`.
   - In `render()` (line 295), damp `camera.position`, `currentLookAt`, and `camera.fov` toward the active focal zone using `1 - Math.exp(-dt * 6.5)`, or snap immediately in a single step when `reducedMotion || paused` is active (AC #1, #2, #5).
   - Whenever `camera.position` or `camera.fov` changes by `> 1e-4`, call `camera.updateProjectionMatrix()` and pass `forceLabels = true` into `positionLabels(true)` so fish `<a>` overlays and `nearest()` raycasts remain pixel-aligned throughout the zoom transition (AC #4).
3. **Accessible Focal-Zone Controls & `Escape` Reset (`src/components/AquariumScene.tsx` & `src/App.tsx`)**:
   - Add a compact, unobtrusive focal-zone selector / reset pill bar alongside the existing tank controls and bind a `keydown` listener for `Escape` (when no modal is open) that calls `setFocalZone('overview')` and returns focus cleanly (AC #3, #6).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters

- **Current Camera & Tank Bounds (`src/rendering/scene/aquarium.ts`)**:
  - Default overview camera (line 63): `new THREE.PerspectiveCamera(42, 1, 0.1, 60)` at `position = (0, 0.15, 9.0)`, `lookAt = (0, 0.15, 0)`.
  - Tank water bounds (line 178 & `resize()` line 355): `x in [-halfWidth, +halfWidth]` (up to `±5.0`), `y in [-2.25, +2.8]` (sandbed at `y = -2.8`, top water surface meniscus at `y = +2.66`), `z in [-4.6, +2.8]` (rear backdrop at `z = -5.5`).
  - Left live-rock island placement (desktop `width >= 600`, line 222): `position = (-2.35, -2.70, -1.35)`, `uniformScale = 4.5`, `yaw = 0.08`.
  - Right live-rock island placement (desktop `width >= 600`, line 230): `position = (2.65, -2.70, -1.20)`, `uniformScale = 4.3`, `yaw = -0.10`.
  - Mobile single-island placement (`width < 600`, line 211): `position = (-0.15, -2.70, -1.35)`, `uniformScale = 3.4`, `yaw = 0.06`.
- **Label & Raycast Invariant**:
  - Both `nearest()` (line 184) and `positionLabels()` (line 286) read `camera.matrixWorldInverse` and `camera.projectionMatrix`, so calling `camera.lookAt(currentLookAt)`, `camera.updateProjectionMatrix()`, `scene.updateMatrixWorld(true)`, and `positionLabels(true)` each frame during a camera transition keeps all fish `<a>` overlays and hit-testing 100% synchronized.
<!-- SECTION:NOTES:END -->


