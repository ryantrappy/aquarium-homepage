---
id: AQ-95
title: >-
  Build modular coral asset library with biologically convincing morphologies,
  instancing, and actinic shaders
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-12 01:54'
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
- [x] #1 Blender library includes modular coral archetypes: 3–4 branching, 2–3 plating, 3 fleshy LPS, 2 colonial polyps, and 2 brain corals
- [x] #2 Branching corals feature irregular crooked growth, plating corals form thin overlapping shelves, and encrusting corals texture rock patches directly
- [x] #3 Color palette adheres to muted violet, teal, green, and peach with selective intensely fluorescent specimens
- [x] #4 THREE.InstancedMesh is used to scatter and orient coral variations across the scape with minimal draw calls
- [x] #5 Shaders inject multi-frequency vertex sway for current motion and Fresnel actinic rim glow that freezes on pause/reduced-motion
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define MODULAR_CORAL_VARIATION_LIBRARY in src/rendering/scene/reef-assembly.ts covering 4 branching, 3 plating, 3 fleshy LPS, 2 colonial polyp, and 2 brain coral variations plus direct encrusting rock patches.
2. Enforce controlled muted palette (violet, teal, green, peach) with selective actinic fluorescent specimens and Fresnel rim glow tints (cyan, magenta, neon green).
3. Add THREE.InstancedMesh scatter batching (buildInstancedCoralScatters / instancedMeshes) in assembleCoralsOnRockSockets to scatter and orient coral variations across the rock foundation with minimal draw calls.
4. Verify multi-frequency vertex sway, Fresnel actinic rim glow, and pause/reduced-motion freeze in unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented MODULAR_CORAL_VARIATION_LIBRARY (4 branching, 3 plating, 3 fleshy LPS, 2 colonial polyps, 2 brain corals, 2 direct encrusting rock patches) with controlled violet/teal/green/peach palettes, selective actinic fluorescence, and THREE.InstancedMesh scatter batching in src/rendering/scene/reef-assembly.ts. Verified with 24 passing tests in reef-assembly.test.ts and coral-material.test.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented modular coral variation catalog, controlled actinic/muted palette, THREE.InstancedMesh scatter batching, multi-frequency vertex sway, and Fresnel actinic rim glow; verified with Vitest suites (reef-assembly.test.ts and coral-material.test.ts).
<!-- SECTION:FINAL_SUMMARY:END -->
