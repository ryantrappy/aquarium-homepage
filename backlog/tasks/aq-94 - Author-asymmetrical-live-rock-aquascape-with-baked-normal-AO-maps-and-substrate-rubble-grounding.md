---
id: AQ-94
title: >-
  Author Negative Space Aquascape (NSA) with 5–8 modular rock pieces, pinnacle
  canyon, and 2048px trim sheet
status: In Progress
assignee:
  - '@gemini'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-13 15:08'
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
- [x] #3 Upper half of the water column preserves open negative space for unobstructed fish swimming and label visibility
- [x] #4 Total exported .glb asset size for assembled foundations remains under 5 MB with minimal draw calls
- [ ] #5 Substrate dunes, shell fragments, and rubble eliminate hard intersecting seams at the sand bed base
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root next major visual iteration under the active user goal: preserve supplied left/right foundations and coral work, add a custom central arch module rather than another enlarged mound. Root alone will own Blender; leave live reef-full-model scene untouched and use a separate saved source. Before authoring, add an explicitly isolated --reef <id> dispatch to sync-blender-override.mjs before fish docs/learning/build side effects. Mandated blend/override paths remain under splat-fish; install validated custom rock derivatives with a separate module manifest so ten-coral/fish catalogs are untouched. Never feed rock geometry into fish anatomical guides or run fish rebuilds from reef mode. Package source/blend/export hashes, contract/provenance/inspection, and verify module is actually selected in scene before model commit. Integrate arch as a separate navigation collider/input (verify union behavior; do not introduce overlapping components into a single parity classifier), aspect-specific placements and existing hit/depth/shadow rules. Save/pack/export/sync/commit the new used model; review native two-size composition and measured opening with honest fish-radius scope. This is the first additive visual module, not completion of the full5–8piece library/2048atlas/current foundation art requirements; retain all existing ACs and final reference goal.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root2026-11-12 reopened from Done after independent native/export review. Saved reef-full-model.blend contains exactly two merged foundation meshes (Live_Rock_Island_Left/Right), coral previews and sand/scatter, with no5-8 reusable rock-piece meshes or2048px image. Generator NSA_MODULAR_ROCK_LIBRARY is seven scalar field descriptions merged into island heightfields, not a reusable sculpted piece library. Actual runtime reef-full-model-left/right.glb have no embedded maps and are absent from canonical manifest/socket reports. Existing upper-water space and under5MB/draw-count criteria retained; central arch/library/grounding final acceptance withdrawn pending exact-source evidence. Native review is read-only and does not alter the live dirty Blender scene. Detailed evidence follows underAQ59.

Luna read-only pipeline audit confirms current sync main always writes fish docs, learns every override GLB and executes fish builder. Reef path must branch before all those operations and reject mixed fish flags. Existing contract.ts supports kindrock with identityY-upmeter/provenance; socket-inspector.ts can pin source bytes and measure declared socket intent. Existing coral packager is a fixed ten-asset batch, not a callable module installer; existing manifest checker hardcodes counts. Preserve those sources and use separate custom module registry/manifest. No new model/pipeline changes have been made by Root yet.

Root authored additive reef-center-arch in separate background Blender5.2.3 (live user scene untouched), saved uncompressed packed source splat-fish/blend/reef-center-arch.blend and exported raw overrides/reef-center-arch.glb. Separate --reef reef-center-arch --learn-guide installer stamps/validates rock metadata, measured buffers and hashes with dedicated custom-rocks registry; never rebuilds/learns fish. Source has9282vertices/18560triangles, three packed custom images1024carbonate/512normal/512roughness; not a high-poly bake/2048atlas or full5–8modulelibrary. Actual scene uses desktop central bridge with own fallback/exactcollider, hit/depth/shadow/caustics/env handling; phone preserves enlarged single-island composition. Existing supplied foundations untouched. Root first native trial confirms visible opening and additional central height; final exact-source captures/verification follow. Luna actualasset navigation at0.04scene probe clears center and blocks cap/leg; no calibrated fullfish-body envelope claim. Keep full task InProgress.

Root final native review accepts additive central-height iteration at6e57f2d. Evidence docs/asset-evidence/aq94/central-arch-20261113/: bothsizes ready/no failedassets,11inhabitants,8phone targets>=44px insideviewport, zero consolewarnings/errors. Packednative read-only audit confirms9282vertexmesh plus3packedimages. Runtime left/right/arch exports total2963992bytes so retained AC4 remains valid. Exactsource782tests/68files/typecheck15scripts pass; final productionbuild running. Actualmesh0.04sceneprobe passes center and blocks cap/leg, not animated-body certification. Model is saved/exported/synced/used/committed6e57f2d. Full AC1/2/5 art/library/grounding remain open; no Done. Root reserves Blender, no live scene edits/deployment.

Final exact6e57f2d production build completed successfully. Root verified native PNG signatures/dimensions and snapshot source/ready assertions. No final-task completion or runtime-budget claim.
<!-- SECTION:NOTES:END -->
