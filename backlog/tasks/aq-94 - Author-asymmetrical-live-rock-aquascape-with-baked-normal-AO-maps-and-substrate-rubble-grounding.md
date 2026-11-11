---
id: AQ-94
title: >-
  Author Negative Space Aquascape (NSA) with 5–8 modular rock pieces, pinnacle
  canyon, and 2048px trim sheet
status: In Progress
assignee:
  - '@gemini'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-11 05:16'
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
Architect the live rock aquascape from scratch using Negative Space Aquascaping (NSA) principles and a modular 5–8 piece library:
1. Negative Space Aquascaping (NSA) & Upper Water Negative Space:
   - Rather than solid rock mounds, construct an asymmetrical sweeping arch on the left rising into a high pinnacle near the surface, paired with a lower secondary bommie on the right, creating a central swim canyon.
   - Preserve substantial negative space in the upper half of the water column so open-water cruisers and service labels remain uncluttered and easy to interact with.
2. Modular 5–8 Piece Live-Rock Library & Trim Sheet:
   - Sculpt 5–8 modular live-rock pieces in Blender with porous cavities, crevice details, plateau shelves, and dedicated encrusting coral rock patches.
   - Bake high-poly porous details (Normal, Roughness, AO) onto a single 2048×2048 texture atlas / trim sheet.
   - Assemble the primary pinnacle formation and secondary island from instances of these modular pieces, keeping the exported .glb under 5 MB with minimal draw calls.
3. Substrate Grounding:
   - Add subtle dunes, shell fragments, and small rubble where the rock meets the sand bed to anchor the scape seamlessly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Aquascape forms an asymmetrical Negative Space Aquascape (NSA) with a left arch rising to a high pinnacle, lower right island, and central swim canyon
- [ ] #2 Reef is assembled from a reusable library of 5–8 modular sculpted rock pieces sharing a single 2048x2048 PBR texture atlas (Normal, Roughness, AO)
- [ ] #3 Upper half of the water column preserves open negative space for unobstructed fish swimming and label visibility
- [ ] #4 Total exported .glb asset size for assembled foundations remains under 5 MB with minimal draw calls
- [ ] #5 Substrate dunes, shell fragments, and rubble eliminate hard intersecting seams at the sand bed base
<!-- AC:END -->
