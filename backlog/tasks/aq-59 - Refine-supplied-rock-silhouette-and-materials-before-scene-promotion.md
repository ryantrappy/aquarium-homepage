---
id: AQ-59
title: Refine supplied rock silhouette and materials before scene promotion
status: In Progress
assignee:
  - '@gemini'
created_date: '2026-11-05 03:13'
updated_date: '2026-11-12 14:46'
labels:
  - modeling
dependencies: []
references:
  - AQ-14.3
  - src/rendering/modeling/build_live_rock_islands.py
  - design/reef-control-v2-preview.png
  - /tmp/aq-asset-review-20261104/left-exact-front.png
  - /tmp/aq-asset-review-20261104/left-exact-oblique.png
  - docs/asset-evidence/aq57/left-exact-front.png
  - docs/asset-evidence/aq57/left-exact-oblique.png
documentation:
  - docs/asset-evidence/aq59/runtime-20261112/review.json
priority: '2'
type: bug
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root inspected exact packaged left front/oblique snapshots (SHA 2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c). The real arch is useful, but repeated flat terrace layers and wavy stretched gray/purple material read as manufactured sheets rather than porous carbonate live rock. Keep these supplied assets as the starting point and preserve passing mounts/cave measurements; do not replace the runtime photogrammetry baseline until art review passes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hash-matched neutral front/oblique/sand-contact renders show irregular natural rock massing and porous carbonate/coralline detail without repeated flat sheet silhouettes, wavy texture stretching or wallpaper projection.
- [ ] #2 Updated geometry keeps a measured real cave, grounded base and independently passing available mounts; source/export hashes and actual dimensions remain consistent.
- [ ] #3 Root accepts exact-export renders against the sharp front-on reef-tank reference before AQ14.3 or runtime assembly is approved.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-11-05 Root-requested independent read-only review lane (@collision-validation): pin exact newly packaged left/right GLBs, current generator, manifests and packaged/docs inspection/socket evidence under /tmp/aq59-root-review-20261105, detect source changes and verify task-declared hashes. Run existing manifest/socket freshness checkers independently; inspect exact geometry/provenance/canonical bounds, cave and fixed .02/.04/.06m mesh capsules from pinned bytes. Produce neutral-light textured front/oblique/sand-contact views plus neutral material comparison using copied existing Blender review scripts only in /tmp; no visual/model/generator/packager/renderer/inspection-record writes and no AQ58 historical fixture changes. Check live Blender/render jobs before launching or treating waits as terminal. Record outputs/limitations in this task; Root alone reviews art and Done. Modeling ownership remains @gemini.

Root-approved functional AQ59 texture-pipeline iteration. Before editing, snapshot the current generator and exact left/right GLB hashes to /tmp. Keep all model/GLB export output under /tmp/aq59-uv-fix-20261105; do not run package_modular_corals or write candidate GLBs/manifest/inspection records in the repo. In build_live_rock_islands.py only, replace top-only UV sampling and compressed top/bottom skirt UVs with non-overlapping surface charts at measured texel density; rasterize the existing color/ORM/height fields from actual triangle barycentric positions and normals. Bake tangent-space normal detail from each chart's physical surface frame, or omit only unsupported detail in a clearly labeled comparison variant. Keep geometry, sockets, palette, field parameters, and dimensions unchanged. Quantify original/new UV overlap, degeneracy, anisotropy, texels/m and source-to-export triangle-position equality; create temporary exact-PBR and neutral front/oblique/sand-contact renders. Verify existing cave/mount geometry and exact rendered hashes. Report outputs and limits for Root approval; do not update ACs/DoD or mark Done.

Root renderer-only refinement 2026-11-12: keep Gemini geometry, Blender sources, GLBs, socket data and manifests unchanged; replace blue-biased carbonate shader colors with neutral warm dark aragonite and reduce broad coralline coverage/rims. Verify actual compiled WebGL at the two viewports and retain porous geometry detail. This is an assembled-material improvement, not acceptance of exact-export model criteria.

Root GPU-cost refinement2026-11-12: native callback/draw diagnostics suggest graphics/presentation cost, while the rock normal shader redundantly reevaluates the same four-octave3D field at four offsets per fragment. Reuse its existing height signal and derive the surface gradient with screen-space derivatives in the view-space tangent frame. Preserve substrate/pore/color fields and geometry; verify actual WebGL compile, macro detail and both native frame-time cases before accepting.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-04 (@gemini):
- Upgraded `src/rendering/modeling/build_live_rock_islands.py` to eliminate the 3-tier horizontal terrace shelves and vertical cliff UV stretching:
  1. Replaced the 3 uniform socket elevations (`z = 0.375, 0.240, 0.105 m`) with 12 staggered boulder apex elevations on `left` and 11 on `right`, separated by deep 3D Voronoi/ridged clefts and diagonal reef buttresses.
  2. Tightened `pad_margin` (`0.011 m`) to each coral plug's immediate footprint and sloped the `clearanceRadiusM` zone downward (`sz - crag_dip`) so the clearance cylinder remains 100% unobstructed (`z <= sz`) without flattening surrounding rock into wide horizontal tabletops.
  3. Replaced 2D `(u, v)` procedural noise with `build_live_rock_textures_from_surface()`, which maps each `(u, v)` texel to its exact 3D mesh coordinate `(px, py, pz)` and 3D surface normal `(nx, ny, nz)` and evaluates 3D isotropic aragonite pores/vugs and upward-normal-weighted coralline algae plaques in meter space (eliminating vertical cliff UV stretching).
  4. Preserved the pinned `live-rock-island-left.glb` (`2f90be06...`) and `live-rock-island-right.glb` (`68337f77...`) files on disk while `AQ-58` (`@collision-validation`) completes its pinned-hash collision review (`rock-collision.test.ts`).

2026-11-05 (@gemini):
- Packaged the newly built Blender 5.0.1 live-rock island GLBs into src/rendering/assets/corals/:
  * live-rock-island-left.glb (sha256: ac2ed1793d16e84f264ac19017935f7daa4f158ebac116cddde57a53653c34d5, 2,125,240 bytes, 24,572 triangles, 12/12 supported sockets, 0 rejected).
  * live-rock-island-right.glb (sha256: ab7b756344c6a0a879d254b6ca06a20c63c4246b0a19b76394cc532c61abfbee, 2,104,916 bytes, 24,572 triangles, 11/11 supported sockets, 0 rejected).
- Synced docs/asset-evidence/aq52-left-socket-report.json and aq52-right-socket-report.json; verified via node scripts/check-reef-asset-manifests.mjs (32/32 files) and node scripts/check-socket-reports.mjs.
- Generated conservative horizontal-band collision reports in docs/asset-evidence/aq59/left-collision-report.json (validated-offline, 7 parts, 0.02/0.04m probes clear) and right-collision-report.json (validated-offline, 1 part) while leaving docs/asset-evidence/aq58/ pinned to the historical fixture.

2026-11-05 independent read-only AQ59 review completed for Root. Exact pinned evidence directory: /tmp/aq59-root-review-20261105; snapshot.json records input bytes/hashes and render-evidence.json records render hashes and review settings. Left GLB ac2ed1793d16e84f264ac19017935f7daa4f158ebac116cddde57a53653c34d5 (2125240 bytes), right ab7b756344c6a0a879d254b6ca06a20c63c4246b0a19b76394cc532c61abfbee (2104916 bytes). Current generator3508cc39e15bb594a19d8774dbaff1f10dc675aa124e510d363d1c28c15009cc matches both embedded original-project provenance records. Existing manifest checker independently verified32/32files; existing socket freshness checker independently recomputed and matched both packaged+docs reports:12left/11right supported,0rejected. All pinned live inputs/generator/manifest/inspection/socket/report scripts remained byte-identical after review.
Measured canonical dimensions left1.011278212 x.398000007 x.536800712m; right.966448754 x.347999996 x.511544228m. Both mesh query builds ready:24572triangles,12288exact-position-welded vertices,1closed component,8191BVHnodes; no degenerate/duplicate/open/nonmanifold/inconsistent edges or vertices detected. Independent Blender geometry review with1e-7m weld also finds0boundary/nonmanifoldedges. Neither check certifies exhaustive self-intersections. Actual packaged inspection collisionParts remain[]; no metadata installed. Fixed axis x0,y.08m,z[-.36,.36] mesh capsule radii.02/.04/.06m clear on left using defaults (.06=499nodevisits/804triangleTests); corresponding right paths block. Front-depth lane (-.56,.30,.24) to(.56,.30,.24),r.02 clears both. Blender left cave horizontal ray at y.08 shows1mm-grid interval[-.073,.074]m; independent121samples at5mmstep yield minsurfaceclearance.067689478m and conservativecontinuouslowerbound.065189478m. External sand excluded. These are fixed technical probes, not animated fish envelopes.
Twelve exact1000x750 Cycles24sample renders exist at renders/{left,right}-{front,oblique,top,closeup,neutral-front,neutral-oblique}.png. Front/oblique/closeup include temporary review floor at exact exported minY=-.012m; source geometry unchanged. Copied render_root_review.py uses white inspection lights and exact imported PBR; neutral comparisons replace materials only in memory. Original view script/render logs retained. Existing Blender jobs checked before launch; both owned renders completed normally with exit0, no unknown process restart.
Reviewer observation requiring Root visual decision: both current textured front/oblique images still show conspicuous vertical stretched/wavy gray-purple streaks and broad flat truncated platform/summit silhouettes; clay oblique confirms smooth steep-sided truncated masses. Useful real arch/ground contact retained, but technical passes do not establish natural porous carbonate/coralline art or satisfy AC1/AC3. Root must inspect the exact images; no visual acceptance/Done or AC changes made. No repository source/model/generator/packager/coral/renderer/inspection edits. Historical AQ58 fixture remains unchanged at77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612.

2026-11-05 Root gate refresh: runtime live-rock/coral shading and measured AO improvements are functional code reviews, not acceptance of rock silhouette/material art. Preserve supplied geometry, real arch and measured mounts. AQ59 stays open for a Gemini-authored model iteration addressing the previously reviewed flat summit/mesa and natural-surface criteria, with exact exported front/oblique evidence and current provenance/socket/clearance checks. Current scene screenshots in AQ63/66 are interaction illustrations, not final scene or candidate art approvals.

Root2026-11-12 renderer-only handoff: neutralized blue-biased carbonate shades and reduced broad magenta coralline coverage/rims, preserving geometry, sockets, Blender sources, GLBs and manifests. Both exact DPR1 browser views render without shader warnings/errors.24 coral/assembly tests and current687-test full suite pass. Native HUD observed54FPS laptop/60FPS phone when host idle, not a formal regression benchmark. Captures and explicit remaining exact-export art/geometry gates:docs/asset-evidence/aq59/runtime-20261112/review.json. AQ59 remains In Progress; no exact-export/model acceptance criterion is checked by this renderer change.

Root2026-11-12 removed redundant normal-field evaluations: reuses medCrag/finePores already computed for color and applies an unparametrized view-space surface gradient using dFdx/dFdy, preserving3D pore/color fields and model geometry.24 coral/assembly tests pass. Native full/macro WebGL renders compile with no captured shader warnings/errors and retain visible rock detail. Speedup is not yet measured; do not infer frame-budget acceptance from fewer shader operations. Current preview is a working-tree review, not a committed AQ70.2 baseline.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-05 04:20
---
Root sequencing2026-11-04: this High visual-modeling prerequisite is ordered before AQ14.3 acceptance, alongside the collision blocker. User-managed coral/model work retains ownership; Root/Codex will not edit coral assets/rendering while that agent is active.
---

author: root
created: 2026-11-05 13:20
---
Root independently viewed exact newly packaged left-oblique, right-oblique and left-neutral-oblique renders (leftac2ed179…/rightab7b7563…). Art acceptance remains withheld: broad flat truncated summits/plug-sized mesa platforms and steep smooth walls still dominate the silhouette, while prominent purple-gray vertical streaks/waves remain on both textured exports. The material/shape change has not met AC1/3. Preserve useful real arch, grounded base and23 passing mounts; no rollback to historicalAQ58 geometry and no production promotion. Next Gemini iteration should confine flat support to measured mounting footprints, retain clearance by shaping nearby irregular rock mass rather than repeated truncated plateaus, and demonstrate actual exported surface detail across steep walls without texture streaks in the same neutral front/oblique views. Read-only technical validation passes exactsource/currentgenerator3508cc39… provenance,manifest32/32,sockets12/11,closed topology and default20/40/60mm left cave probes; these are not animated fish envelopes. Durable review evidence/renders:docs/asset-evidence/aq59/. No model/generator/coral edits by Root.
---

created: 2026-11-05 13:51
---
Root approved a bounded functional UV/bake fix after read-only evidence confirmed the source-to-export surface mapping defect. Plan: adjust only the rock texture/UV generator in src/rendering/modeling/build_live_rock_islands.py, preserve exact geometry/sockets/palette/noise fields, and generate review-only outputs under /tmp/aq59-uv-fix-20261105. No packaged GLB/manifest/inspection writes or art acceptance.
---
<!-- COMMENTS:END -->
