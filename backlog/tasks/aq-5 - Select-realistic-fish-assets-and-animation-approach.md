---
id: AQ-5
title: Investigate the rendering engine and fish-animation pipeline
status: In Progress
assignee:
  - '@fish-renderer'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03 19:25'
labels: []
dependencies: []
references:
  - 'https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources'
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
  - AQ-34
  - AQ-37
  - AQ-38
  - 'https://playcanvas.com/'
  - 'https://threejs.org/'
  - 'https://www.babylonjs.com/'
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/gemini-research-links.md
priority: high
type: spike
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Choose a rendering engine and fish-animation pipeline that can support realistic, clickable reef fish in a true 3D habitat. The candidate-engine shortlist is [PlayCanvas](https://playcanvas.com/), [Three.js](https://threejs.org/), and [Babylon.js](https://www.babylonjs.com/); these are candidates, not a predetermined choice. The investigating agent chooses and documents the best fit from comparative evidence. Compare the engines using the same realistic fish and reef assets plus comparable rig/animation inputs so engine capability is judged separately from source asset and rig quality. Include full articulated swimming, depth and coral occlusion/interactions, realistic materials and lighting, React/Vite/TanStack Start TypeScript integration, and performance at only 402x874 and 1440x900. Compare candidate assets and deformation/rig approaches, verify asset sources and licenses, and use small reviewable prototypes. Prioritize this investigation before committing to production animation architecture because the engine and pipeline must support believable swimming and integrate fish with reef geometry. The related work below informs this decision; AQ-5 does not implement all of it, and its completion does not wait for those separate tasks to be marked Done.

### Related investigations to consider together

- AQ-38 — Evaluate Babylon.js for photorealistic reef and animated fish rendering: compare Babylon.js with PlayCanvas and Three.js against the same assets and criteria; Babylon.js is not presumed to be the winner.
- AQ-37 — Investigate Mesh2Motion fish rigs and animation transfer: assess rig quality, export compatibility, and whether deformation clips transfer across different fish.
- AQ-36 — Review the Sketchfab animated aquarium as a fish-motion reference: use observed swim, fin, turn, path, and habitat patterns as an attributed guide.
- AQ-34 — Build a true 3D reef scene with depth-aware fish and habitat interactions: confirm that candidate rendering and animation approaches can support occlusion, obstacle clearance, and habitat anchors.
- AQ-35 — Define typed behavior profiles for all 15 reef fish species: keep per-species movement and habitat behavior separate from rig/deformation clips.
- AQ-12 — Animate reef fish with photorealistic, species-aware swimming, and AQ-13 — Startle a fish when its service link is activated: account for shared animation needs and the activation reaction.
- AQ-18 through AQ-32 — species-specific animation tasks: consider how the pipeline supports distinct fish shapes and behaviors across the target roster.
- AQ-14.2 — Add restrained reef habitat motion and lighting: consider lighting integration and how fish rendering fits the environment effects.

Record which related findings were tested, which were only considered or deferred, and compatible next steps; do not expand AQ-5 into implementation of all related features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A concise comparison covers candidate photorealistic asset and rendering approaches for the supported reef fish, including visual fidelity, performance, maintainability, and interaction tradeoffs.
- [ ] #2 Selected assets have documented sources, attribution needs, and licenses that allow use in this project.
- [ ] #3 The selected approach supports visible body, fin, and tail motion, species-aware turns, depth and lighting integration, and clickable service links; translating a still sprite alone is explicitly rejected as the finished approach.
- [ ] #4 A browser prototype or equivalent review artifact demonstrates the selected approach against the linked real-fish references for at least two reef species.
- [ ] #5 The engine, asset, and animation-pipeline recommendation states evidence from related investigations, distinguishes what was tested from what was only considered or deferred, explains the rationale, and identifies compatible next steps.
- [ ] #6 The comparison fairly evaluates PlayCanvas, Three.js, and Babylon.js using the same realistic fish and reef assets and comparable rig/animation inputs, separating engine capabilities from asset or rig quality. The investigating agent selects and documents the best-fit engine against articulated swimming, 3D depth/coral occlusion and interactions, realistic materials/lighting, React/Vite/TanStack Start TypeScript integration, and performance at 402x874 and 1440x900; no candidate is preselected.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Compare licensed realistic mesh, deforming photo-surface, and video approaches; verify candidate asset provenance and identify quality and performance limits.
2. Build an isolated two-species browser proof using genuinely deformable 3D bodies and separately articulated fins; assess against clownfish and yellow tang biological references without changing the existing aquarium.
3. Inspect the proof at the two required viewport sizes, document known visual and technical gaps and practical next steps, then request root review before implementing AQ-12.

4. Treat Gemini materials, biomechanics, and compute as unverified research inputs; build a closed anatomical two-species asset and compare the same models and rig inputs across Three.js, Babylon.js, and PlayCanvas at the two target viewports before recommending a renderer.

5. Root accepts the licensed pair only as a technical asset-pipeline baseline (not final fish fidelity). Replace the primitive-only habitat control with one verified licensed real coral/reef mesh; derive one bounded triangle-count asset while preserving UVs and textures, and use identical bytes in every engine. Compare calibrated direct-light fixtures, coral occlusion/picking and the two target viewports; give a finite engine/pipeline recommendation with explicit remaining AQ-12/AQ-34/AQ-40 work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Isolated proof runs via npx vite --config src/rendering/proof/vite.config.js (currently http://127.0.0.1:5188/). It uses project-created clownfish/tang surfaces, two non-watertight shaped meshes per fish with tailward vertex deformation, individually hinged pectoral planes, moving light-responsive normals, pause, reduced-motion initial state and native example links. Inspected at 402x874 and 1440x900. Front-on the generated textures retain detail; orbit reveals stretched/repeated eyes and thin fins, so this is a research candidate, not production photorealism. The study lacks reef occlusion, true 3D anatomy, swimming paths and full-school performance evidence. Comparison, provenance and open problems are in docs/rendering.md. npm run typecheck, npm test (7 tests) and npm run build pass.

Original modeling study created under src/rendering/modeling: Blender scripts for original clownfish and tang, plus a built-in ImageGen cylindrical clown skin experiment. The clown base body was checked in Blender: 960 vertices and zero boundary/nonmanifold edges; 7 rig bones and separate fin objects. Offline renders remain visibly schematic, with harsh fin shading and repetitive texture; neither model is production quality. No species animation criteria checked. Further anatomy, materials, fin rigging and human review remain.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T04:46:00Z
---
Root approves the isolated Three.js proof plan and minimal three runtime plus types. Reject the inspected toy/cartoon CC0 models as the fidelity baseline; their poor anatomy/high weight and missing rig are useful comparison evidence. A textured volumetric deforming mesh is worth prototyping if it has actual body thickness, independently articulated fins/tail, coherent turns/light/depth and remains maintainable across the roster. Please make the first two-species browser proof visually inspectable and document limitations before full integration. The goal remains photorealistic fish; flat cutout wobble and spheres with painted stripes do not satisfy AQ-12. Root will review the prototype against the provided fish references before choosing the final approach.
---

author: @root
created: 2026-11-03T04:47:00Z
---
New follow-up AQ-34 captures the user's 3D reef/depth-occlusion and obstacle-aware habitat direction. It depends on your AQ-5 rendering decision; AQ-5's status, assignee, and plan are unchanged.
---

author: @root
created: 2026-11-03T04:47:00Z
---
Separate follow-up AQ-37 will investigate Mesh2Motion as a possible rigging/animation-transfer workflow and report compatibility and quality evidence. It is research only; your AQ-5 status, assignee, and plan remain unchanged.
---

author: @fish-renderer
created: 2026-11-03T04:48:00Z
---
Root review requested: inspect the two-species study, including drag-to-orbit and pause, before selecting the rendering approach. The image-projected model fails at extreme angles and should not be accepted as finished AQ-12 fish. Please review whether this is a useful foundation or whether higher-quality rigged 3D assets should be sourced before implementation.
---

author: @root
created: 2026-11-03T04:49:00Z
---
New follow-up AQ-38 will evaluate Babylon.js with controlled assets as a possible fish/reef renderer and report evidence on realism, animation, navigation, integration, and performance. It is a candidate-engine spike only; AQ-5's active plan, status, and assignee are unchanged.
---

author: @root
created: 2026-11-03T04:51:00Z
---
User priority update: keep AQ-5 High and make the rendering engine, realistic assets, and fish-animation pipeline decision central before production animation architecture is committed. Consider the related investigations listed in the description together as evidence inputs, while keeping their implementation and completion separate from AQ-5.
---

author: @root
created: 2026-11-03T04:51:00Z
---
Root browser review of the study at laptop1440x900 and a dragged head-on view: reject this candidate for production. Side texture remains recognizable, but turning exposes slab-like open surfaces, repeated/stretched facial details and flat fin edges; it does not satisfy a believable anatomical body. Keep it isolated as research evidence. Next iteration should select or author closed species-correct 3D anatomy with proper UV/materials and independent eyes/mouth/gills/fin attachments plus a rig, then demonstrate two contrasting reef species turning and swimming. Read AQ-36 and AQ-37 now: the user supplied a Sketchfab animation reference and Mesh2Motion workflow option; research and prove these before final selection. Continue the spike rather than integrating or declaring AQ-12 complete. Native 3D habitat/occlusion requirement AQ-34 makes a watertight, depth-aware mesh solution necessary. Root permits additional high-quality asset research or procedural authorship, but no paid purchase without an approved budget and no unverifiable asset licensing. Also image edits/inpainting must use built-in ImageGen per skill; do not use the Python inpainting workflow for new texture edits.
---

author: @root
created: 2026-11-03T04:52:00Z
---
User added PlayCanvas alongside Three.js and Babylon.js as candidate engines and delegated the choice to you based on aquarium requirements. Compare all candidates with the same fish/reef assets and comparable rig inputs, separating engine capability from asset anatomy: the earlier Three.js study established limitations in its fish study assets, not that Three.js itself is unsuitable. Select and document the best fit from evidence; no engine is preselected.
---

author: @fish-renderer
created: 2026-11-03 12:34
---
Gemini references were reviewed alongside the existing tasks: AQ-12/18–32 cover locomotion; AQ-34/35 cover 3D habitat and species behavior; AQ-14.2 covers restrained water/caustic/polyps. New AQ-39–43 track independent optics, asset workflow, schooling/scaling, coral assets and suspended particles. Reference code is unverified and contains missing THREE imports and an undeclared assignment; it is not production code. Blender is already installed locally. The next proof will target closed species-specific anatomy, independent facial details and fins, all-angle inspection and motion rather than projected photo surfaces.
---

author: @fish-renderer
created: 2026-11-03 12:39
---
Additional local rig study at /rig-study.html: investigated the LasquetiSpice school, extracted one clownfish and yellow tang in Blender (992/990 triangles, 18 bones apiece) and drive their spines and pectorals in an isolated TypeScript viewer. Model artifacts remain ignored local files pending review. Sketchfab labels the school CC Attribution, but creator profile mentions Microsoft/PixCap library sources, so original model rights remain unverified. Models look stylized and are not accepted production assets. Blender export printed matrix warnings; float accessor scan found no nonfinite values, but visual deformation validation is still required. Root review requested. This does not satisfy the three-engine comparison or habitat/performance criteria.
---

author: @fish-renderer
created: 2026-11-03 12:50
---
Root reviewed offline renders of the local two-species control: anatomical volume is better than the open image slabs, but the tang has stylized smiling mouth and thin flat fins and the clown outline is faceted; neither is accepted for production. Controlled engine test harness is underway; same local rigs/clips and a simple rock primitive are loaded per engine. Preliminary automated desktop-headless runs exposed rig framing and PlayCanvas skin-bounds issues, now being corrected; those runs are not target-browser QA or phone performance evidence. User-facing browser access awaits the computer-use surface or explicit alternate automation permission.
---

author: @fish-renderer
created: 2026-11-03 12:52
---
Two further source leads require access and review: zixisun02 Clownfish (https://sketchfab.com/3d-models/47ba2679d91a4f14b3fc0bf8e3805af5, listed CC BY 4.0, 1.6k triangles, no animations) and JayNmeGaming Oxidane Yellow Tang (https://sketchfab.com/3d-models/5750f70ac6734728b0eb3ed81de9bb2d, listed CC BY, 1,184 triangles, no animations). Their official thumbnails show more plausible details than the prior CC0 toy sample but all-angle anatomy, source rights, texture, rigging and runtime remain unverified. Sketchfab public download API returned 401 unauthenticated; no assets have been downloaded or added. The different Microsoft 3D Viewer school listing https://sketchfab.com/3d-models/school-of-fish-7d2d816ab3a34130b51e0bb42247700c reinforces the need to establish underlying rights for the prior local school; relationship to those meshes is not yet verified.
---

author: @fish-renderer
created: 2026-11-03 13:36
---
Official signed-in Sketchfab downloads obtained for the CC BY 4.0 zixisun02 clownfish and JayNmeGaming Oxidane yellow tang; source hashes and required attribution are in docs/rendering.md. Blender confirms 1,605/1,184 triangles, no original clips or rigs. Neutral front renders show modeled faces, rather than projected side eyes. Experimental local Blender-derived six-segment rigs, short clips, and added tang pectoral membranes are shown at /candidate-study.html; request root review before integrating. The tang fins and clown fin weights are approximate; eyes/mouth/gills have no independent articulation. Blender emitted matrix warnings and clown sampler warning; finite/range scans and normal-length checks passed but do not establish visual correctness. No production acceptance, habitat, or engine decision claimed.
---

author: @root
created: 2026-11-03T13:44:00Z
---
Root reviewed candidate-study actual playback and 45-degree turns through side, rear, oblique and head-on views. Both licensed sources preserve believable volume and separate eyes/snouts at frontal angles; this is a substantial improvement over the rejected photo slabs. Current tang pectoral still reads as an oval patch/button on the flank, not a thin fan emerging behind the gill cover, and needs anatomically placed articulated membrane/rays with convincing attachment. Tang dorsal silhouette is polygonal and body material has uniform grain/baked shading. Clown has readable face/fin rays but needs a restrained independently articulated pectoral and tail-dominant wave with stable head. Please refine these specific anatomy/material/rig details and show a side/front/three-quarter animation check. Keep both as candidates until the fin/body and motion review passes; do not describe current study as photorealistic production-ready.
---

author: @fish-renderer
created: 2026-11-03 13:48
---
Iteration in response to review #14: local script now applies one subdivision and smooth normals to the tang, places its translucent ray-supported pectoral fan forward near the gill area, increases clown pectoral weighting, and sets tailward amplitude to increase from a fixed head. Refined exports are loaded by the same /candidate-study.html; source textures still include baked shading and separate mouth/eye/gill articulation is absent. Please review side/front/three-quarter playback and attachment before acceptance. Blender matrix and clown sampler warnings remain open.
---

author: @fish-renderer
created: 2026-11-03 13:55
---
Follow-up to review #14: reference-guided tang pectoral now uses a larger fan sector with narrow lower-gill hinge and converging geometric rays; a subtle static operculum edge was sampled against body geometry. Tang source already shows a small light caudal mark. A neutral Blender frame shows the new fin as a fan but somewhat geometric; latest exports are ready for root playback/angle review. Clown fin outer faces now receive a provisional 0.8-alpha material; inspect for body-surface leakage. Neither measure settles realistic motion, baked source shading, or independent eye/mouth/gill animation.
---

author: @root
created: 2026-11-03T13:56:00Z
---
The Gemini source handoff is now at docs/gemini-research-links.md. It separates linked model listings, video/tank references, user-supplied motion waypoints, and root spot checks from unverified claims; verify each candidate's exact source and license and compare engine capability with equivalent assets.
---

author: @fish-renderer
created: 2026-11-03 18:33
---
Unchanged latest derivatives validated using official Khronos glTF Validator 2.0.0-dev.3.10: zero errors in both. Clown warnings: missing tangent space on two primitives and one non-root skinned mesh. Tang: five non-root skinned mesh warnings. Added reproducible validate-models.mjs and documented exact limitations in docs/rendering.md. Root-authorized controlled engine-study now uses the same licensed pair/embedded clips in Three.js, Babylon.js and PlayCanvas, fixed camera/scale/DPR, pause/turn, and a labeled primitive depth/picking test. Typecheck passes; actual browser playback/picking and calibrated light comparison remain pending. Source exports preserved for root anatomy review.
---

author: @root
created: 2026-11-03T18:33:00Z
---
If a candidate model is paid or its files cannot be accessed, publicly viewable previews may still guide visual and animation research; no purchase is required or authorized. Use accessible owned/original/appropriately licensed assets for controlled tests, and do not claim inaccessible mesh, rig, clips, or performance were tested or assume reuse rights.
---

author: @root
created: 2026-11-03T18:34:00Z
---
Cost or download limits do not block progress: publicly accessible previews can guide visual/animation research, while accessible licensed assets support controlled tests. Treat the listing as reference-only unless the asset itself was tested; viewing grants no reuse rights.
---

author: @fish-renderer
created: 2026-11-03 18:48
---
Root reviewed latest tang sector fan as recognizable improvement and preserves closed frontal faces as technical-baseline evidence. Clown translucent inner triangles and source fidelity remain unresolved for AQ-12/AQ-40. No rig regeneration during the reef comparison. Three/Babylon/PlayCanvas all load the identical licensed pair, animate, turn, pause, and select blocker before fish at required viewport sizes. Babylon modular ray-picking import corrected. Gray PBR/direct-light fixture calibration is underway; actual licensed coral asset remains necessary for the full comparison.
---

author: @Luna
created: 2026-11-03 19:20
---
Root review checkpoint: the corrected offline front and oblique renders use the same durable CC BY 4.0 reef LOD loaded by Three.js, Babylon.js and PlayCanvas. Root accepts it as a technical engine-comparison asset only. Corrected reef browser review at 402×874 and 1440×900 is pending Mac unlock; the older fish/blocker browser evidence does not test this corrected reef. No engine is selected and production-fidelity criteria remain open: dark baked scan shading/open underside, source-level fish limitations, comparable reef lighting, full scene navigation/occlusion, SSR lifecycle and controlled performance.
---

author: @root
created: 2026-11-03T19:22:00Z
---
Root asset-checkpoint review: corrected reef front/oblique renders are accepted for controlled comparison only, with source baked shading/cut underside retained. Before committing the portable fixture: include rig-candidate.py because both fish recipes depend on it; add explicit fish reproduction commands/tool version to the manifest or linked recipe. Resolve GLB URLs with build-aware asset references so an isolated Vite production build emits the same three files; current plain relative strings only work under the dev server. Configure the isolated build to enter engine-study.html explicitly, since older index/prototype files are excluded from this checkpoint. Verify file hashes/bytes and exported build asset presence, without browser while the Mac remains locked. Keep source-vs-checkpoint-vs-export triangle counts and one-sided checkpoint error limitations explicit; no engine or photorealism completion claim.
---

author: @Luna
created: 2026-11-03 19:23
---
Portable fixture follow-up to root review #23: engine-study.ts now uses Vite-aware new URL(..., import.meta.url) references for the two fish and reef GLB files. vite.config.js explicitly enters engine-study.html, excluding older index/prototype pages. Blender 5.0.1 fish regeneration commands and rig-candidate.py dependency are documented in docs/rendering.md and asset-manifest.json. `npx vite build --config src/rendering/proof/vite.config.js --outDir /tmp/aq-engine-study-build --emptyOutDir` succeeded; output contains only engine-study.html and exactly three emitted GLBs. Each emitted GLB SHA-256 and bytes match its checked-in source derivative. No browser run. Reef source 3,513,714, checkpoint 99,999, exported GLB 99,985 triangles; reported one-way sampled BVH errors apply only to the checkpoint, not the exported topology.
---

author: @Luna
created: 2026-11-03 19:25
---
Final documentation consistency pass: docs/rendering.md is now a current standalone fixture guide with the exact /engine-study.html?engine=three|babylon|playcanvas dev entries, the explicit production build command, the three included technical assets, provenance/manifest/validator links, and clear separation of earlier fish-only browser evidence from pending corrected-reef browser review. Detailed comparison, old entrypoints, ignored prototypes and local experiments moved to docs/rendering-research-history.md under an explicit historical/non-bundle disclaimer; its older local-only notes are superseded for the three curated GLBs. No source assets or reference Gemini docs changed.
---
<!-- COMMENTS:END -->
