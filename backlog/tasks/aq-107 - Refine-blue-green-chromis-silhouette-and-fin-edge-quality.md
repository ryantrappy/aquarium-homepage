---
id: AQ-107
title: Refine blue-green chromis silhouette and fin-edge quality
status: Done
assignee:
  - '@root'
created_date: '2026-11-14 21:01'
updated_date: '2026-11-15 14:04'
labels:
  - modeling
  - rendering
dependencies: []
references:
  - src/rendering/assets/splat-fish/blue-green-chromis.glb
  - scripts/build-splat-fish-glbs.mjs
priority: '2'
type: bug
ordinal: 144000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User screenshot dated 2026-11-14 14:58 shows visibly stepped edges on the blue-green chromis dorsal fin, tail and body compared with other fish. Diagnose the actual rendered asset and distinguish source silhouette/alpha sampling from renderer aliasing before refinement. Preserve Gemini visual work and other concurrent species; route native model authoring through the modeling workflow. User confirms ownership and redistribution rights for all supplied fish references and derivatives.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Record the exact runtime asset/material path and objective evidence identifying the source of the chromis edge stepping.
- [x] #2 The chromis body, dorsal fin and tail have smooth intentional contours at normal and close laptop viewing sizes, with before/after captures accepted by Root against the supplied screenshot and peer fish.
- [x] #3 Preserve species appearance, rig/swim animation, scale, picking and clearance behavior; verify relevant integration and asset checks.
- [x] #4 Asset refinements retain reproducible source, updated runtime GLB, inspection/manifest and provenance; any Blender edits additionally save packed native .blend, export override and run the required sync workflow. Commit and push only the Root-reviewed scoped task to the shared rolling PR, without deployment.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inspect runtime mapping, embedded GLB geometry/texture/filtering and supplied screenshot first; obtain independent subagent diagnosis. Select a targeted renderer/asset correction from evidence, preserving all concurrent work and coordinating model ownership before editing native assets. Laptop-only visual verification per user.

Root-approved contour implementation: preserve byte-identical c53ea07f base GLB under sources/blue-green-chromis-contour-base.glb with source/generator/manifest hash guards. Add standalone chromis-only refinement command reconstructing the existing alpha/SDF field; subdivide only incidence-2 outer silhouette edges and their two incident triangles with max1.5px edge at350px plus bounded chord error. Preserve winding, UV, normalized skin weights, rig, animation and texture bytes; regenerate normals and measured accessors/bounds. Validate actual output topology/contract/budgets before atomic writes of chromis runtime GLB, inspection and only its manifest row. Add allowlisted per-entry generator/provenance support and meaningful deterministic/no-write/topology/preserved-buffer/manifest-invariance checks. No shared all-species regeneration, no Blender edits, no other supplied asset changes. Root must verify exact laptop normal/close-up before/after and relevant runtime behavior before acceptance/commit/push.

Root-reviewed implementation adjustment: the baseline includes folded projected faces and shared internal fin chords, so local per-edge triangle subdivision failed safe. Use the single SDF contour with front/back connected-domain remeshing, retaining original POSITION/UV/JOINTS/WEIGHTS prefixes and detached-component triangles, with side-specific subpixel midpoint thickness only for internal shared chords. Recompute normals/connectivity, validate closed manifold incidence, encoded Float32 winding/area, contour limits and budgets. Root acceptance still requires exact normal/close native visual comparison and runtime integration evidence.

Final accepted approach supersedes prior global remesh plan: replay the pinned exact original species recipe with a denser139x83 grid, requiring84x50 byte-identical base reproduction first. All-species writer is removed before isolated execution. Preserve owned image, learned guide, PBR textures/materials, rig and animations; validate final budgets and concurrency guards, and write only selected outputs. Root accepts long intentional straight edges where sampled contour error and actual normal/close appearance meet the task.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-14 21:05
---
Root policy clarification: the existing chromis has no Blender source or override; it is generated from the owned WebP. The original task-created AC4 overstated the project rule. AGENTS mandates packed native persistence for edits performed in Blender and explicitly permits supporting-pipeline changes for functionality. A reproducible, chromis-only contour pipeline refinement preserving Gemini art can be reviewed without creating or editing a live Blender model. No acceptance yet: the coarse-grid spacing is consistent with the screenshot but exact exported contour error and before/after native evidence still need verification.
---

author: root
created: 2026-11-15 05:38
---
Root code review in progress: require no-write dry-run when immutable base is missing, explicit per-species generator allowlist, and final provenance-encoded byte-budget check. Returned to implementing agent for correction; no criteria accepted yet.
---

author: root
created: 2026-11-15 05:42
---
Root native visual rejection 2026-11-14: candidate GLB e6eccd0c16ebdb3fcfb5e7d788f3bae5f57607cbd84954175fc4fa58a8190bef passes topology/contour tests but isolated GLTFLoader comparison shows severe shredded triangular texture/shading across body and fins at normal and 350px close sizes; base and peer remain smooth. Native evidence /tmp/aq107-root-native/comparison-profile.jpg, fixture /tmp/aq107-native-compare-QKH5YW. No AC accepted or completion commit. Returned to agent to diagnose UV/material/normal continuity and preserve original visual mapping; geometry metrics alone are insufficient. Integration also found exact swim extent changed 0.44845%; measured scale constant was corrected and existing 7 scale tests pass, subject to final accepted asset bounds.
---

created: 2026-11-15 14:04
---
Root final acceptance2026-11-15: original-recipe139x83 GLBca69aa9d preserves art/rig/materials and exact2-unit swim extent,24220tris/1242656B. Actual exported contour max sampled error0.5894px vs1.8652base at350px, p950.1022vs0.4014. Native laptop normal/350pxclose/profile/pose/yaw comparisons accepted against base/user screenshot/peer, supplemented by exact currentruntime macro/overview/clip poses and ready/no-failed-assets state. Native bodyclick777,379 opens configuredGoogle _blank usergesture; emptywater100,450 no windowOpen. Root89integrationtests/7suites, typecheck17scripts/build pass. All12otherrows/24files byte-identicald118dca. Evidence docs/asset-evidence/aq107/root-review-20261115/. NoBlender/other-species-generation/deployment/phone checks. Source was externally committed in mixed273583c before final Root review; this scoped acceptance records the reviewed result without rewriting concurrent history.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the blue-green chromis silhouette using the exact existing visual recipe at higher grid resolution. Root accepted visibly smoother dorsal/tail contours at normal and350px close sizes, preserved original textures/materials/rig/animation/scale, verified actual runtime picking and integration, deterministic no-write reproduction, peer-asset invariance and final budgets. Two global-remesh candidates were rejected and retained as evidence. Root acceptance: docs/asset-evidence/aq107/root-review-20261115/.
<!-- SECTION:FINAL_SUMMARY:END -->
