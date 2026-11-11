---
id: AQ-98
title: >-
  Implement volumetric god ray cones with view-edge fade and upward-angled
  camera framing
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 04:57'
updated_date: '2026-11-11 05:08'
labels:
  - lighting
  - camera
  - optics
  - shaders
  - threejs
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/underwater-optics.ts
  - AQ-96
  - AQ-86
documentation:
  - docs/rendering.md
priority: high
type: enhancement
ordinal: 104000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Architect volumetric lighting and dynamic camera composition:
1. God Rays (Volumetric Light Cones):
   - Construct 4–5 cylinder or cone meshes angled down from the top water surface.
   - Apply a custom ShaderMaterial configured with THREE.AdditiveBlending, depthWrite: false, and a scrolling noise texture.
   - Implement a soft edge fade based on the view-dot-normal product (clamp(dot(viewDirection, normal), 0.0, 1.0)) so the light rays softly vanish when viewed obliquely or as the camera orbits, avoiding hard mesh clipping edges.
2. Dynamic Camera Framing:
   - Position the THREE.PerspectiveCamera slightly lower in the water column and tilt it gently upward, or widen the vertical FOV (45°–50°) so the rock spire emphasizes towering vertical scale against the open water and surface light.
3. Animation Controls:
   - Freeze scrolling ray noise and lighting updates on pause, under prefers-reduced-motion, and when hidden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 4–5 volumetric cone/cylinder meshes descend from the water surface with scrolling noise and THREE.AdditiveBlending
- [ ] #2 Light rays implement a view-dot-normal edge fade that softly attenuates as the camera orbits, eliminating hard polygon boundaries
- [ ] #3 Camera position and upward tilt (or 45°–50° vertical FOV) accentuate the towering scale of the vertical pinnacle without clipping foreground fish
- [ ] #4 Volumetric ray animations freeze synchronously on pause, under prefers-reduced-motion, and when the document is hidden
- [ ] #5 Automated tests and look-dev captures at 1440x900 and 402x874 confirm fluid 60fps performance and zero visual clipping
<!-- AC:END -->
