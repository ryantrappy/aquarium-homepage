---
id: AQ-95
title: >-
  Build modular coral asset library with biologically convincing morphologies,
  instancing, and actinic shaders
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-11 05:16'
labels:
  - corals
  - shaders
  - threejs
  - photorealism
dependencies: []
references:
  - src/rendering/scene/coral-material.ts
  - src/rendering/scene/reef-assembly.ts
  - AQ-70.11
  - AQ-42
  - AQ-53
documentation:
  - docs/modular-coral-and-live-rock-spec.md
priority: high
type: enhancement
ordinal: 101000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Architect the modular coral asset library and rendering shaders to make the reef feel like an ecosystem growing on natural rock:
1. Reusable Modular Coral Asset Library (Blender):
   - Branching Corals (Acropora/Stylophora, 3–4 variations): Irregular, tapering, slightly crooked growth with visible axial/radial corallites rather than repeated cylinders.
   - Plating Corals (Montipora, 2–3 variations): Broad, thin, uneven overlapping shelves with detailed growth edges that attach to plateau ledges.
   - Fleshy LPS Corals (Hammer, Torch, 3 variations): Rounded inflated tissue, fine tentacles, and visible skeletal bases.
   - Colonial Polyps (Zoanthids, mushrooms, 2 variations): Dense low clusters and discs.
   - Brain Corals (Diploria, Favia, 2 variations): Meandering valley ridges with muted tones.
   - Encrusting Corals: Map/shade encrusting patches directly onto the live-rock surface rather than floating separate meshes.
2. Controlled Color Palette:
   - Base colors limited to natural dominant hues: muted violet, teal, green, and peach.
   - Occasional intensely fluorescent specimens popping under blue actinic lighting.
3. Three.js Instancing & Shader Features:
   - Populate colonies across the rock using THREE.InstancedMesh with randomized scale/orientation to minimize draw calls.
   - Inject multi-frequency vertex sway (sin(time + position.x) * heightMask) via material.onBeforeCompile for organic water current rippling.
   - Add subtle Fresnel-based actinic rim glow in cyan, magenta, and neon green for authentic reef-tank pop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Blender library includes modular coral archetypes: 3–4 branching, 2–3 plating, 3 fleshy LPS, 2 colonial polyps, and 2 brain corals
- [ ] #2 Branching corals feature irregular crooked growth, plating corals form thin overlapping shelves, and encrusting corals texture rock patches directly
- [ ] #3 Color palette adheres to muted violet, teal, green, and peach with selective intensely fluorescent specimens
- [ ] #4 THREE.InstancedMesh is used to scatter and orient coral variations across the scape with minimal draw calls
- [ ] #5 Shaders inject multi-frequency vertex sway for current motion and Fresnel actinic rim glow that freezes on pause/reduced-motion
<!-- AC:END -->
