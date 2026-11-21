---
id: AQ-94
title: >-
  Author Negative Space Aquascape (NSA) with 5–8 modular rock pieces, pinnacle
  canyon, and 2048px trim sheet
status: Done
assignee:
  - '@gemini'
created_date: '2026-11-11 04:55'
updated_date: '2026-11-21 19:10'
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
- [x] #1 Aquascape forms an asymmetrical Negative Space Aquascape (NSA) with a left arch rising to a high pinnacle, lower right island, and central swim canyon
- [x] #2 Reef is assembled from a reusable library of 5–8 modular sculpted rock pieces sharing a single 2048x2048 PBR texture atlas (Normal, Roughness, AO)
- [x] #3 Upper half of the water column preserves open negative space for unobstructed fish swimming and label visibility
- [x] #4 Total exported .glb asset size for assembled foundations remains under 5 MB with minimal draw calls
- [x] #5 Substrate dunes, shell fragments, and rubble eliminate hard intersecting seams at the sand bed base
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root next major visual iteration under the active user goal: preserve supplied left/right foundations and coral work, add a custom central arch module rather than another enlarged mound. Root alone will own Blender; leave live reef-full-model scene untouched and use a separate saved source. Before authoring, add an explicitly isolated --reef <id> dispatch to sync-blender-override.mjs before fish docs/learning/build side effects. Mandated blend/override paths remain under splat-fish; install validated custom rock derivatives with a separate module manifest so ten-coral/fish catalogs are untouched. Never feed rock geometry into fish anatomical guides or run fish rebuilds from reef mode. Package source/blend/export hashes, contract/provenance/inspection, and verify module is actually selected in scene before model commit. Integrate arch as a separate navigation collider/input (verify union behavior; do not introduce overlapping components into a single parity classifier), aspect-specific placements and existing hit/depth/shadow rules. Save/pack/export/sync/commit the new used model; review native two-size composition and measured opening with honest fish-radius scope. This is the first additive visual module, not completion of the full5–8piece library/2048atlas/current foundation art requirements; retain all existing ACs and final reference goal.

Next Root visual iteration: grow four small existing coral colonies on the central arch using real saved Blender socket empties. Shape only local support footprints and measure exact exported contact/orientation/radial support/clearance with existing socket inspector; no invented supported coordinates. Extend isolated reef installer to accept only verified empty socket children under the one applied rock mesh. Preserve authored arch maps/geometry in generic coral mounting via an explicit opt-in, omit legacy companions/scatter for this bridge, register actual mounted coral envelopes/controller clock. Reuse existing supplied templates; Root alone handles Blender/source/export/sync, Luna bounded code/test work. Also replace visibly striped procedural arch surface fields with reproducible isotropic noise and reduce palette mismatch. Save packed native/export/sync/commit used updated model with fresh reports; native two-size final art remains separate from full library/body clearance.

Build a deterministic shared-atlas kit from the seven saved NSA exports so the modular foundation can fit the asset budget. Preserve per-module geometry, root names, and coral sockets. Assemble and review the new modules at 1440×900 with the established front-on camera, keeping the production reef while the new layout is being reviewed.

Use the assembled kit and mounted coral colliders to measure a sheltered right-side moray pose. Confirm the head clears solid geometry and sand and is visible from the laptop camera while the partial rear stays visually sheltered. Connect the preview to the existing fail-closed resident checks only after this evidence.

Fit a saved bubble-tip anemone to a supported left-module socket, derive its host point from the mounted crown, and reproduce a clear clownfish approach with the exact shared-atlas reef. Reuse the species-specific soft-tissue allowance and preserve the canyon and moray head checks.

Fit substrate contact footprints to the low sections of the exact modular foundation, seat the saved rubble on the same sand profile, and review the 1440×900 rock-to-sand transition while retaining the clear canyon and moray approach.

Restore habitat behavior parity for the wide modular reef by deriving shelter, forage and perch destinations from mounted modules and checking measured cave, rubble and sand destinations with the exact collision query. Keep each destination in a compatible ecological band and verify an approach before publishing it.

Use the shared modular reef for the default wide display. Keep the existing narrow reef, lazy-load a new foundation only when its layout is needed, and switch its sand, collision and habitat together. Validate the default production build at 1440x900 and verify repeat breakpoint changes with controller tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root2026-11-12 reopened from Done after independent native/export review. Saved reef-full-model.blend contains exactly two merged foundation meshes (Live_Rock_Island_Left/Right), coral previews and sand/scatter, with no5-8 reusable rock-piece meshes or2048px image. Generator NSA_MODULAR_ROCK_LIBRARY is seven scalar field descriptions merged into island heightfields, not a reusable sculpted piece library. Actual runtime reef-full-model-left/right.glb have no embedded maps and are absent from canonical manifest/socket reports. Existing upper-water space and under5MB/draw-count criteria retained; central arch/library/grounding final acceptance withdrawn pending exact-source evidence. Native review is read-only and does not alter the live dirty Blender scene. Detailed evidence follows underAQ59.

Luna read-only pipeline audit confirms current sync main always writes fish docs, learns every override GLB and executes fish builder. Reef path must branch before all those operations and reject mixed fish flags. Existing contract.ts supports kindrock with identityY-upmeter/provenance; socket-inspector.ts can pin source bytes and measure declared socket intent. Existing coral packager is a fixed ten-asset batch, not a callable module installer; existing manifest checker hardcodes counts. Preserve those sources and use separate custom module registry/manifest. No new model/pipeline changes have been made by Root yet.

Root authored additive reef-center-arch in separate background Blender5.2.3 (live user scene untouched), saved uncompressed packed source splat-fish/blend/reef-center-arch.blend and exported raw overrides/reef-center-arch.glb. Separate --reef reef-center-arch --learn-guide installer stamps/validates rock metadata, measured buffers and hashes with dedicated custom-rocks registry; never rebuilds/learns fish. Source has9282vertices/18560triangles, three packed custom images1024carbonate/512normal/512roughness; not a high-poly bake/2048atlas or full5–8modulelibrary. Actual scene uses desktop central bridge with own fallback/exactcollider, hit/depth/shadow/caustics/env handling; phone preserves enlarged single-island composition. Existing supplied foundations untouched. Root first native trial confirms visible opening and additional central height; final exact-source captures/verification follow. Luna actualasset navigation at0.04scene probe clears center and blocks cap/leg; no calibrated fullfish-body envelope claim. Keep full task InProgress.

Root final native review accepts additive central-height iteration at6e57f2d. Evidence docs/asset-evidence/aq94/central-arch-20261113/: bothsizes ready/no failedassets,11inhabitants,8phone targets>=44px insideviewport, zero consolewarnings/errors. Packednative read-only audit confirms9282vertexmesh plus3packedimages. Runtime left/right/arch exports total2963992bytes so retained AC4 remains valid. Exactsource782tests/68files/typecheck15scripts pass; final productionbuild running. Actualmesh0.04sceneprobe passes center and blocks cap/leg, not animated-body certification. Model is saved/exported/synced/used/committed6e57f2d. Full AC1/2/5 art/library/grounding remain open; no Done. Root reserves Blender, no live scene edits/deployment.

Final exact6e57f2d production build completed successfully. Root verified native PNG signatures/dimensions and snapshot source/ready assertions. No final-task completion or runtime-budget claim.

Root implementation handoff: four saved native socket empties now support two small front-facing zoanthid mats, a Montipora plate and a green Acropora table colony reusing existing supplied templates. Smaller footprint25mm with scaled zoa0.16 preservesarchcontour; no legacy scatter/companion extras. Exact exported inspector accepts4/4,384radial samples, zero unsupported footprint samples or cylinder blockers. Added explicit preserveAuthoredRock/includeScatter options (defaultsunchanged), shared-clock controllers, shader-expanded coral fallback boxes and actual mesh-nav envelope inputs. Newcoral materials/depthmaterials released onrebuild/teardown; sourcegeometry/maps remain borrowed. Surface uses isotropic seeded noise; UVassignment followsvertexidentity afterwinding fixes. Read-only saved-native audit shows9282vertices,4empties,3packedimages, positivevolume0.03133588389145,0boundary/nonmanifoldedges/zeroareafaces. No exhaustive selfintersection/wholecolony or fishbodyfit certification. Initial broadpads rejected visually and replaced by smaller frontslopes.107focusedtests/5files passed, final27actualasset/pipeline tests andtypecheck15scripts pass after finalmodelupdate. Root final exactsource native captures/fulltests/build follow; no Done.

Root exactd454c27 verification complete:791tests/68files, typecheck15scripts and productionbuild pass. Native1440x900/402x874DPR1 ready/no failedassets/11inhabitants;8phone targets>=44px contained;zeroconsolewarnings/errors. Evidence docs/asset-evidence/aq94/arch-growth-20261113/. Finalgreenbranchingcolony movedforward fromrightreefshadow, smallzoa mats frontfacing, broadsupportpads rejected/removed. Root accepts bounded colonization/texture iteration; maincoralshape/texture and broader finalreefart stillopen. Current threefoundationpackages2,874,820bytes retain delivery-sizeAC4, not performanceacceptance. Native/exactexport/currentpackage hashes committed withd454c27, no liveBlenderdocumentedit/deployment. Task94remainsInProgressforfullNSA/library/atlas/grounding requirements.

2026-11-21 Blender MCP NSA Modular Library + 2048px Trim Sheet Batch (Milestone B): Authored 5 grounded (zsh procedural) NSA carbonate live-rock modules in live Blender 5.2.3 LTS sharing one deterministic 2048x2048 4-quadrant limestone PBR trim sheet (src/rendering/modeling/reef_nsa_trim_sheet.py; textures in src/rendering/assets/corals/custom-rocks/textures/reef-nsa-trim-2048-{albedo,normal,orm}.jpg) and registered in src/rendering/assets/corals/custom-rocks/manifest.json (6 modules total alongside reef-center-arch): reef-nsa-pinnacle-spire (13,380 tris, 1,553,272 B, sockets socket_plate_ledge_21 + socket_sps_crest_21), reef-nsa-cantilever-shelf (10,628 tris, 1,439,016 B, sockets socket_lps_mid_21 + socket_plate_ledge_22), reef-nsa-cave-buttress (16,928 tris, 1,678,664 B, socket socket_lps_mid_22), reef-nsa-bommie-mound (12,500 tris, 1,539,956 B, sockets socket_brain_apron_21 + socket_soft_mat_21), and reef-nsa-rubble-talus (6,640 tris, 1,299,896 B, substrate grounding apron, 0 sockets). Every module passes watertight topology (0 non-manifold/boundary/loose), boundsM.min[1]==0 grounded alignment, aoSource:'texture', zero rejected sockets, and automated 2048x2048 JPEG SOF + shared byte-digest identity tests in src/rendering/assets/sync-reef-override.test.ts. Remains In Progress for full-tank NSA canyon assembly and Root visual review.

2026-11-21 Runtime NSA Integration (Milestone C): Added typed modular NSA rock catalog & verified custom-coral mount presets in src/rendering/scene/reef-nsa.ts and mounted reef-nsa-rubble-talus.glb live in src/rendering/scene/aquarium.ts (6 sand-tilted non-pickable grounding aprons on desktop, 2 on phone) with caustics/IBL and cloned-material disposal. Combined live runtime rock GLBs measure 4,174,716 bytes (< 5,000,000). Added unit and lifecycle tests in src/rendering/scene/reef-nsa.test.ts and aquarium-lifecycle.test.ts; keeps AQ-94 In Progress pending Root 1440x900 visual review and full pinnacle-canyon runtime composition.

Milestone F (8/8 modular custom live-rock library complete on custom-rocks/manifest.json):
- Authored build_reef_nsa_high_arch_span.py and build_reef_nsa_encrusting_ledge.py in Blender 5.2.3 LTS sharing the identical 2048x2048 4-quadrant limestone trim sheet (reef-nsa-trim-2048-{albedo,normal,orm}.jpg), visually inspected front + oblique Cycles previews, and synced via --reef ... --learn-guide:
  - reef-nsa-high-arch-span: 16,228 tris, 1,642,516 B (0.8155 x 0.7194 x 0.3608 m, sha256 5fb4e25300f7721026a3a4a29da63ae36d1347ec8f369bea35609a6ec71f6fa9), sockets socket_sps_crest_22 (branching-sps) & socket_plate_ledge_23 (plating-sps), 0 rejected sockets.
  - reef-nsa-encrusting-ledge: 9,946 tris, 1,432,940 B (0.6745 x 0.2608 x 0.3585 m, sha256 5cb1020ad6b45ad5141827b02c5d239a68f95271f9ed8ba467fa2a8e9a306f0a), sockets socket_brain_apron_22 (mounded-lps) & socket_soft_mat_22 (zoanthid-mat), 0 rejected sockets.
- Wired both modules into src/rendering/scene/reef-nsa.ts and updated src/rendering/assets/sync-reef-override.test.ts (verifying all 7 reef-nsa-* pieces share byte-identical 2048px JPEG textures) + src/rendering/scene/reef-nsa.test.ts (all 7 URLs and socket presets).
- Verified check-reef-asset-manifests.mjs (32 files), npm run typecheck (18 scripts), npx vitest run --maxWorkers=3 (82/82 test files, 1055/1055 tests passing), and npm run build exited 0. Remains In Progress pending pinnacle-canyon runtime composition and Root visual review.

2026-11-21 Live Blender MCP visual audit overhaul: upgraded reef_nsa_trim_sheet.py and build_reef_nsa_*.py to replace circular Worley dot holes and pale plaster palette with heavily domain-warped F2-F1 karst fissures, anisotropic carbonate strata, and mature wet plum/violet-magenta coralline plates matching docs/more-realistic-reef-guide.png; added pre-remesh angular slab/tapered-crag shaping + 3D Voronoi/strata chiseling + height-bounded socket clearance (eliminating stacked round balls and vertical curtain artifacts); and implemented 8-iteration Laplacian-smoothed macro-region connected-island UVs (eliminating triangle-confetti quadrant switching and per-triangle clamping seams). Rebuilt, synced, and verified all 7 reef-nsa-* modules in live Blender MCP (pinnacle-spire 14,526 tris/1,617,840 B, cantilever-shelf 11,524 tris/1,546,096 B, cave-buttress 19,458 tris/1,771,648 B, bommie-mound 14,606 tris/1,645,744 B, rubble-talus 7,210 tris/1,420,888 B, high-arch-span 18,578 tris/1,735,588 B, encrusting-ledge 10,564 tris/1,513,116 B; combined live runtime rock GLBs 4,295,708 B < 5,000,000 B). Verified 82/82 Vitest files (1055/1055 tests), check-reef-asset-manifests.mjs, typecheck, and build.

Root review 2026-11-21. The seven current NSA exports now package into a single deterministic 3,956,104-byte GLB with one set of the three 2048px trim maps. PACK and CHECK SHA-256 c90fe8541f67a8984b65aa57169c5c44f5930e11766f66e4395093fac36c21b4. The existing aquarium look-dev entry point at /?lookdev=1&reef=nsa loads the kit in development, instantiates a left pinnacle and cave buttress, high center arch, right bommie with reused smaller spire, shelves and talus, and mounts 13 corals. The fixed current right cave resident is absent in this experimental layout. The assembled live collision snapshot built successfully. A 0.04-scene-unit capsule clears the mounted canyon at x=-0.2 and y=-1.95 from z=-3.8 to z=1.9 after the cap at socket_plate_ledge_23 was restored to its authored scale. This does not establish animated-body clearance. The 1440×900 DPR 1 screenshot under docs/asset-evidence/aq94/shared-atlas-preview/ has 14 resolved inhabitants and no warnings or failed assets. The kit uses the existing packed Blender sources and does not alter their geometry or textures. The default habitat remains the production composition. Keep AC1, AC2 and AC5 open for final art, runtime habitat/occlusion, and grounding review.

Root modular moray review 2026-11-21. Authored a wide-preview residence at root (2.14, -2.41, -0.33), yaw -0.72, beside the existing right ledge and bommie. Runtime requires the same loaded crevice-idle rig, both actual right-module colliders, and the existing clear exposed-head capsule. The exact kit test includes all 13 mounted corals, a >0.13 scene-unit endpoint margin to the sand under the exposed-head bound, disjoint talus boxes, visible head/tip and six rear cross-section points hidden from the front-on camera. Native 1440×900 DPR 1 review loaded 15 resolved inhabitants with zero warnings/errors. Pointer body click opened the configured Snowflake moray eel service card. Evidence docs/asset-evidence/aq94/modular-moray-review/. The proof checks the exposed head and front-on shelter, not a continuous whole-body animation certificate. The preview remains development-only pending production layout and interaction review.

Root modular clownfish review 2026-11-21. The seven saved sculpted modules share one verified 2048px trim atlas. The packed GLB uses normal texture 0 and shared roughness/AO texture 1 on all seven materials; the source test verifies atlas dimensions and byte-identical image digests. AC2 verified for the assembled kit. The lower-left buttress now mounts the existing rose bubble-tip anemone. Actual crown geometry yields the ocellaris-only host; the exact reef test clears the current 0.04 m navigation probe throughout a 40-second simulation. A source-pinned straight skeletal swim envelope clears to 0.24 m in front of the crown; close-in full-body clearance is pending. The central canyon and right moray checks remain. The native 1440×900 overview rendered 15 inhabitants with no failed assets or console warnings/errors. Evidence docs/asset-evidence/aq94/modular-clownfish-review/. Keep AQ-94 In Progress for default-layout composition and substrate grounding.

Root modular substrate review 2026-11-21. Fitted five contacts to below-Y -2.55 mesh sections for the buttress, two separate arch piers, bommie and right ledge. The preview uses one footprint array for sand geometry, contact shading, scatter and benthic placement. Six smaller placements reuse the saved rubble at exposed rock edges. Exact-kit clearance retains the central 0.04 capsule, clownfish motion, and moray head and shelter tests. The laptop comparison had 15 inhabitants, zero failed assets and zero browser warnings/errors. Evidence docs/asset-evidence/aq94/modular-substrate-review/. Final composition and grounding remain open for default-layout review.

Root live habitat review 2026-11-21. The modular composition now runs the normal animation path at the development-only /?reef=nsa. It derives plate and branching destinations from mounted colony geometry and uses measured sites beside the arch, sand and slope. All destinations require an in-band compatible species and a clear 0.04 scene-unit approach using the exact collider. The exact-kit test verifies 16 fish/interaction pairs and a 20-second watchman goby simulation that reaches the burrow entrance without a blocked movement sample. The controller test confirms the destinations reach the live simulation only after mesh readiness. At 1440x900 DPR 1, nine of twelve link projections moved by more than two pixels over 32 animation frames; zero moved while paused. Browser warnings/errors: zero. Default wide selection and close-in full-body clearance remain open.

Root production acceptance 2026-11-21. The compiled homepage at 1440x900 DPR 1 selects the modular reef with no query or development bridge. Initial foundation request: the shared 3,956,104-byte kit only. The left coral-to-base silhouette spans approximately 78% of frame height, right bommie is lower, and the canyon and softened substrate contact are visible. Exact geometry verifies the clearance and bedding conditions. Blue tang body picking opened the Internet Archive service card. Pause/Resume, Services and Settings worked; browser warnings/errors: zero. Controller tests verify lazy narrow load, stale completion handling, repeated resize and preserved Pause/link. 1,059 tests, typecheck, production build and deterministic kit check passed. Screenshot and verification in docs/asset-evidence/aq94/default-laptop-review/.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The compiled wide homepage uses seven saved modular rock pieces sharing one 2048px PBR atlas, with an asymmetrical pinnacle and canyon, 13 mounted colonies and sand-fit rubble. The 1440x900 default route and exact assets verified the composition, grounding and asset budget. Tests cover the narrow fallback and the modular habitat. Follow-on whole-body clearance remains tracked under AQ-58.
<!-- SECTION:FINAL_SUMMARY:END -->
