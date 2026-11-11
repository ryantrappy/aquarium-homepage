---
id: AQ-95
title: >-
  Implement smart coral instancing via THREE.InstancedMesh with multi-frequency
  vertex sway and actinic Fresnel rim glow
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-11 05:08'
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
Architect the coral rendering pipeline for maximum biological realism and WebGL performance:
1. THREE.InstancedMesh for Coral Colonies:
   - Rather than exporting hundreds of individual polyps from Blender, author and export 10–12 distinct hero coral meshes (e.g. Acropora branch cluster, Montipora plate, Zoanthid polyp cluster, Torch coral tentacle cluster, Brain coral dome, Anemone base).
   - Use THREE.InstancedMesh (or <Instances>) to scatter, scale, and rotate instances across the rock foundations according to biological zonation (SPS high, LPS mid, soft/anemones low), maintaining near-zero CPU overhead and minimal draw calls.
2. Custom Vertex Sway & Fluorescence Shader (material.onBeforeCompile):
   - Inject a custom shader chunk adding multi-frequency vertex sway (e.g. sin(time + position.x) * heightMask) so soft corals and anemone tentacles ripple organically with simulated water currents.
   - Actinic Emissive Rim (Fresnel): Real corals glow under blue actinic LEDs. Add a subtle Fresnel-based emissive glow in cyan, magenta, and neon green for authentic actinic pop without requiring expensive real-time GI.
3. Contracts & Controls:
   - Ensure sway freezes on pause, reduced motion, and page blur; preserve socket anchors and COLOR_0 contracts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 10–12 distinct hero coral archetypes are exported and populated across the reef using THREE.InstancedMesh with randomized scale/rotation, keeping draw calls minimal
- [ ] #2 material.onBeforeCompile injects multi-frequency vertex sway driven by vertex height and position for organic water current motion
- [ ] #3 A subtle Fresnel-based actinic emissive rim glow (cyan, magenta, neon green) is applied to simulate blue LED coral fluorescence
- [ ] #4 Vertex sway animation halts synchronously on pause, under prefers-reduced-motion, and when the document is hidden
- [ ] #5 Automated tests verify that modular socket alignment, flexibility contracts, and 60fps frame rates are maintained
<!-- AC:END -->
