---
id: AQ-96
title: >-
  Implement high-Kelvin reef lighting, filmic tone mapping, upward caustics, and
  marine snow
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-11 05:16'
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
Architect the underwater lighting and atmosphere to eliminate plastic reads and provide authentic reef illumination:
1. Directional Overhead & Filmic Tone Mapping:
   - Configure a 14,000K–20,000K overhead DirectionalLight paired with soft ambient fill to lift shadows naturally.
   - Avoid uniformly brightening every colony; use directional angle and soft contact shadows to emphasize organic crevices and depth.
   - Configure WebGLRenderer with ACESFilmicToneMapping, correct sRGB output encoding, and carefully tuned exposure to preserve vibrant highlight roll-off and deep aquatic shadows.
2. Upward-Masked Projected Caustics:
   - Project scrolling dual-layered caustics onto sand and rock, masked by the upward-facing surface normal: max(dot(worldNormal, vec3(0, 1, 0)), 0.0), so caustics only shimmer on top surfaces while overhangs stay naturally shaded.
3. Marine Snow & Depth Fog:
   - Single THREE.Points particle system (300–500 particles) slowly drifting to sell water motion.
   - Deep aquatic THREE.FogExp2 (#0a2239 to #0d3b66) to soften the background.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighting simulates a 14,000K–20,000K reef spectrum with directional top lighting and soft contact shadows
- [ ] #2 Renderer applies ACESFilmicToneMapping with correct sRGB encoding and tuned exposure
- [ ] #3 Scrolling dual-layered caustics are masked to upward-facing surfaces (max(dot(N, UP), 0.0))
- [ ] #4 THREE.Points particle system (300–500 particles) drifts slowly as suspended marine snow
- [ ] #5 All animated lighting, caustics, and particles freeze synchronously on pause and reduced motion
<!-- AC:END -->
