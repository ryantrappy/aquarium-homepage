---
id: AQ-94
title: >-
  Author Negative Space Aquascape (NSA) with arch, pinnacle canyon, and single
  2048px live-rock trim sheet
status: In Progress
assignee:
  - '@gemini'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-11 05:08'
labels:
  - modeling
  - blender
  - photorealism
  - aquascape
dependencies: []
references:
  - src/rendering/assets/corals/
  - src/rendering/modeling/build_live_rock_islands.py
  - AQ-70.13
  - AQ-59
documentation:
  - docs/modular-coral-and-live-rock-spec.md
priority: high
type: enhancement
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Architect the live rock aquascape from scratch using Negative Space Aquascaping (NSA) principles and efficient modular trim sheet baking:
1. Negative Space Aquascaping (NSA):
   - Rather than solid mounds of rock, construct an asymmetrical sweeping arch on the left that rises into a high pinnacle near the water surface, paired with a smaller, lower secondary island on the right.
   - This creates a natural "canyon" in the middle that draws the eye inward, establishes dramatic depth, and provides natural 3D swim paths for fish to navigate through.
2. Single Texture Atlas / Trim Sheet:
   - Sculpt 4–5 modular live rock pieces in Blender with high-poly porous cavities, crevice details, and plateau shelves.
   - Bake high-poly porous details (tangent-space Normal, Roughness, and Ambient Occlusion maps) onto a single shared 2048×2048 texture atlas / trim sheet.
   - Assemble the entire reef structure using instances of these modular rocks, keeping the exported .glb under 5 MB and minimizing draw calls.
3. Substrate Grounding:
   - Add subtle dunes, shell fragments, and small rubble where the rock meets the sand bed to anchor the scape seamlessly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The aquascape forms an asymmetrical Negative Space Aquascape (NSA) featuring a left sweeping arch rising to a high pinnacle, a lower right island, and a central swim canyon
- [ ] #2 The reef structure is assembled from 4–5 modular sculpted rock assets sharing a single 2048x2048 PBR texture atlas (Normal, Roughness, AO)
- [ ] #3 Total exported .glb asset size for the assembled live-rock foundations remains under 5 MB with minimal draw calls
- [ ] #4 Plateau shelves on the spire and substrate rubble at the sand bed base ground the structure naturally
- [ ] #5 Exported assets pass manifest validation and collision geometry probes without breaking fish navigation clearance
<!-- AC:END -->
