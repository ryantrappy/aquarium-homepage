---
id: AQ-96
title: >-
  Implement high-Kelvin reef lighting, upward-masked projected caustics, and
  floating marine snow particles
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-11 05:08'
labels:
  - lighting
  - optics
  - shaders
  - threejs
  - photorealism
dependencies: []
references:
  - src/rendering/scene/underwater-optics.ts
  - src/rendering/scene/aquarium.ts
  - AQ-70.6
  - AQ-86
  - AQ-39
documentation:
  - docs/rendering.md
priority: high
type: enhancement
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Architect the water volume, lighting, and ambient particle atmosphere in Three.js:
1. High-Kelvin Reef Spectrum:
   - Configure a 14,000K–20,000K overhead DirectionalLight with a blue/cyan cast paired with soft ambient fill to lift shadows naturally.
2. Upward-Masked Projected Caustics:
   - Add a scrolling dual-layered caustics texture mixed into the emissiveMap or lightMap of sand bed and live rock materials.
   - Mask the caustic intensity by the upward-facing surface normal: max(dot(worldNormal, vec3(0, 1, 0)), 0.0), ensuring caustics shimmer naturally on top-facing surfaces, ledges, and sand while keeping overhang shadows clean.
3. Floating Marine Snow / Microbubbles:
   - Implement a single THREE.Points particle system (300–500 particles) slowly drifting through the water column to sell the feeling of living water movement.
4. Depth Fog:
   - Retain deep aquatic THREE.FogExp2 (#0a2239 to #0d3b66) to scatter light underwater and soften the far plane.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scene lighting models a 14,000K–20,000K reef spectrum with balanced blue/cyan key lighting and ambient shadow fill
- [ ] #2 Scrolling dual-layered caustics are projected onto sand and rock, masked by the upward surface normal dot product so underhangs remain shadowed
- [ ] #3 A lightweight THREE.Points particle system (300–500 particles) simulates marine snow/microbubbles drifting slowly across the tank
- [ ] #4 THREE.FogExp2 smoothly diffuses the far background without obscuring foreground fish clarity
- [ ] #5 Caustics and marine snow particles freeze synchronously on pause, under prefers-reduced-motion, and when hidden
<!-- AC:END -->
