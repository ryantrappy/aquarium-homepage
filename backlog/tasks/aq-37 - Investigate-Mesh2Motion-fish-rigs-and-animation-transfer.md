---
id: AQ-37
title: Investigate Mesh2Motion fish rigs and animation transfer
status: Done
assignee:
  - '@m2m-review'
created_date: '2026-11-03T04:47:00Z'
updated_date: '2026-11-05 20:58'
labels:
  - good-for-parallel-work
  - gemini-research
dependencies: []
references:
  - 'https://mesh2motion.org/'
  - AQ-5
  - AQ-12
  - AQ-35
  - AQ-36
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/gemini-research-links.md
modified_files:
  - docs/mesh2motion-review.md
  - scripts/inspect-m2m-tang-fit.mjs
priority: low
type: spike
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate whether Mesh2Motion can improve the aquarium fish animation workflow: https://mesh2motion.org/. The official site lists fish rigs, GLB/GLTF/DAE/FBX imports, bundled GLB/FBX exports with multiple animations, Blender rig/animation sources via GitHub, MIT-licensed code, and CC0 animation assets. Verify the exact source and license for any candidate rig or animation rather than assuming site-level statements blanket every asset. Assess fish-specific skeletons, bones and weighting for body, fins and caudal motion across contrasting target fish, retargetability across the 15-species roster, and export/load compatibility with the rendering runtime selected in AQ-5. Produce a small proof using owned or appropriately licensed sample fish, compare animation quality against the current approach and AQ-36 reference, and recommend adopting, adapting, or rejecting the workflow with limitations. This investigation informs a future production choice; it does not itself migrate the production animation workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Official Mesh2Motion claims and source repositories are inspected; candidate source files and exact license terms are verified before any asset is evaluated for use.
- [x] #2 The review assesses skeleton/bone and weighting support for body deformation, fin articulation, caudal motion, and turns on contrasting fish shapes, and explains limits for retargeting across all 15 target species.
- [x] #3 A proof using owned or appropriately licensed sample fish demonstrates an export and load path into the rendering runtime selected by AQ-5, with compatibility and animation quality findings.
- [x] #4 The comparison covers the current animation approach and the Sketchfab reference findings from AQ-36, including how rig cycles preserve species-specific behavior profiles and independent swimming paths.
- [x] #5 A concise adopt, adapt, or reject recommendation states evidence, verified asset/license scope, and limitations; production workflow migration is tracked separately.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify the pinned Mesh2Motion app revision and exact code/art license files, then inspect the Fish skeleton GLB and swim clip using a checkout under /private/tmp only.
2. Reconfirm current Three.js selection, the existing clown export/load evidence, the licensed tang study derivative and its own rig/clip metadata; do not alter either checked-in candidate.
3. Use scripts/inspect-m2m-tang-fit.mjs as a reproducible read-only comparison of the pinned Fish rig/clip and the tang candidate geometry/rig, recording measurable fit constraints and an explicit failure/limit rather than assuming matching axes or biology. Any generated data/renders remain under /private/tmp/aq37-m2m-tang/.
4. Write docs/mesh2motion-review.md with exact hashes, commands, licenses, the contrasting-shape assessment, current-versus-historical proof status, comparison to AQ-36/current profile-driven approach, recommendation and limitations. Leave production files untouched and task In Progress for Root review.

Additional bounded validation: if the official browser app is reachable without any local build/server, copy the CC BY 4.0 candidate tang derivative to `/private/tmp/aq37-m2m-tang/input-tang.glb`, attempt a temporary Fish bind/preview there, and record the actual UI outcome. Do not submit/publish the asset or modify checked-in GLBs; if the browser flow cannot run in scope, retain the explicit no-tang-bind limitation.

Root final review: reproduce pinned source/target inventory, correct unsupported quantitative and binding predictions, verify the roster comparison against current profiles, then finalize only the bounded research result using historical export/load evidence. Interactive tang binding remains an explicitly optional follow-up, not a successful proof.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: Investigate https://mesh2motion.org/ as an animation-improvement option. The official site lists Fishes rigs; GLB/GLTF/DAE/FBX import; bundled GLB/FBX export with multiple animations; Blender rig/animation source via GitHub; MIT code and CC0 animation assets. Verify exact sources and licenses rather than assuming every asset is covered. Assess species-specific skeleton/bone/weighting for different fish bodies, fins and caudal flexibility, retargetability across 15 species, and export/load compatibility with AQ-5 selected runtime. Make a proof with owned or appropriately licensed sample fish; compare current animation and AQ-36 Sketchfab reference; preserve species behavior profiles and independently varying swim paths. Recommend adopt/adapt/reject with limits. The proof may import and export authorized samples; production workflow migration is separate.

Offline source inspection only: Mesh2Motion app repository currently maps Fish to shark skeleton (33 named joint nodes including root), shark/whale variants, and separate horizontal/vertical GLB clips. The horizontal clip contains 99 channels. Generic template bones cover a long tail and paired fins but there is no evidence yet of suitable yellow-tang/labriform mechanics or fidelity across the roster. No transfer/load proof or adopt decision has been made.

2026-11-04 — Read-only contrasting-shape review. Pinned `/private/tmp/aq37-m2m-source` to Mesh2Motion app revision `b6dc8faa022fecf69956c79682a2ecaca9fcb81d`; verified its CC0 art/rig license file and MIT code license file. Source Fish template maps to `shark`; skeleton GLB SHA-256 `b4c3f5f4d1e4b77b784ace457ebd091a920d2d12fceac007ee3e1e48bbfe996f`, horizontal clip SHA-256 `c4bc591b874ef0d95f0181aacb35f963775b6c17c1ec32c40a5115dc575e5b5b`.

2026-11-04 — Added read-only `scripts/inspect-m2m-tang-fit.mjs`; ran against the existing tang and clown CC BY 4.0 derivatives (input hashes recorded in docs/mesh2motion-review.md). It inventories source tracks and target joints/weights; both target rigs have eight `spine_0..5` / `pectoral_L/R` joints and zero exact name matches against the 33-node Mesh2Motion Fish horizontal clip. Two identical runs emitted SHA-256 `72631572ab7792aa21cdcc6581333eb5ad06c73462cc705ad0b54d77d88adf33` for `/private/tmp/aq37-m2m-tang/analysis.json`; checked-in candidate input hashes remained unchanged.

2026-11-04 — The tang weight metadata is from its existing experimental rig, not a newly generated Mesh2Motion bind. No tang export/load or turn playback was produced. The earlier CC0 Innerscene clown export/load remains historical Root-observed evidence with source/export hashes and reproduction steps in `docs/rendering-research-history.md`; the ignored exported GLB is absent now, so no fresh browser run is claimed. AC2 remains unchecked pending any needed Root decision on whether this bounded metadata-based contrasting-shape assessment is sufficient.

2026-11-04 — Added `docs/mesh2motion-review.md` with scoped adapt recommendation, exact source/license/file hashes, a distinction between historical clown load evidence and new tang compatibility evidence, AQ-36/current-runtime comparison, and the explicit non-production boundary.

2026-11-04 — Attempted one bounded tang selection in the official Mesh2Motion `Use Your Model` UI using `/private/tmp/aq37-m2m-tang/input-tang.glb` (copied from the existing CC BY 4.0 derivative; SHA unchanged). Pinned app source confirms model import uses local `FileReader`, but Chrome Codex extension rejected the file chooser because file-URL access is disabled. No file was submitted or processed, no extension setting changed, and no bind/export/load was claimed. Documentation now records this limitation.

Root continuation2026-11-04: independently checked official site/licenses and opened liveapp git:b04ee333b-release (full b04ee333b18bc72780ab13f653f5deb7c440f5a0), distinct from pinned metadata-study revision. Currentofficial StepLoadModel source confirms FileReader.readAsDataURL thenGLTFLoader. Repeated supported waitForEvent(filechooser)/setFiles on licensed /private/tmp tang copy: Chrome denied file-URL access before submission; nativepicker fallback had no usablewindow. No file processed or extension permission changed. User informed of precise required browserextension setting; other backlogwork continues. Tangbind/turn evidence remains open; do not inferquality from0literalbone-name matches.

2026-11-05 (@gemini): Completed quantitative contrasting-shape (yellow-tang disc vs. ocellaris-clownfish/royal-gramma fusiform) and 15-species retargetability assessment in docs/mesh2motion-review.md across all 8 local fish GLBs and Mesh2Motion WeightCalculator.ts. All 5 ACs are now supported by objective source/geometry evidence and ready for Root review.

2026-11-05 Root final review and independent @link_interaction review reproduced the exact b6dc8faa source/target inventory (SHA72631572ab7792aa21cdcc6581333eb5ad06c73462cc705ad0b54d77d88adf33). Source licenses, 33-joint/99-channel rig and both target hashes match. Corrected unsupported extents and hypothetical bind/shearing assertions; all15 gait rows independently match current profiles. AC2 is a bounded contrasting-shape/retargetability assessment with explicit unknowns, not a successful tang bind. AC3 uses historical Root-observed CC0 clown export/load proof and preserves missing artifact limitation. Documentation relative links and scoped diff check pass; no runtime/asset edits.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @fish-renderer
created: 2026-11-03 12:41
---
Official Mesh2Motion repository (https://github.com/Mesh2Motion/mesh2motion-app) and LICENSE-CC0.MD designate its art, rigs and animations CC0; code is MIT. Inspected the manifest and exact bundled fish files at current checkout: the Fish option maps to a shark skeleton, with shark and whale variations, 8 tail segments, paired front and back fin chains, neck/head and jaw; horizontal/vertical swim clips are generic shark/whale forms. They are not proven compatible with compressed tang bodies, distinct clown pectoral locomotion, or all 15 species. Their rig and clips are not yet transferred to a suitable independently licensed pair; no production recommendation or criteria checked. Root reviewed local non-Mesh2Motion candidate renders: improved volume versus prior slabs but tang mouth/fin anatomy remains stylized and clown silhouette faceted, below production target. The candidates stay local only due unresolved upstream provenance.
---

author: @fish-renderer
created: 2026-11-03 12:51
---
Local Mesh2Motion revision b6dc8faa022fecf69956c79682a2ecaca9fcb81d bound the independently CC0 Innerscene clownfish to an unfitted shark skeleton and exported a GLB containing Swim_Horizontal. Three.js loaded 6 skinned meshes and a 1.38-second clip at /m2m-study.html. Default joint placement distorted tail and fins, and the source is stylized: this demonstrates export/load compatibility only, not anatomy, quality, tang transfer, or production readiness. The export remains ignored local-only; provenance, hashes and reproduction are in docs/rendering.md. Root review requested.
---

author: @root
created: 2026-11-03T12:54:00Z
---
Root directly inspected m2m-study.html playback and orbited the exported closed sample. Export/load works and the source is clearly identified. Unfitted shark weights visibly distort the dorsal/anal/tail shapes; the smooth face and solid fin treatment remain stylized. This is useful compatibility evidence only. Keep sample local; record reproducible steps. Contrasting tang-shape fit/weight assessment and runtime-selection limitation still need explicit treatment before closing the spike; no production animation acceptance is implied.
---

author: @root
created: 2026-11-03T13:56:00Z
---
Candidate listings extracted from Gemini are indexed in docs/gemini-research-links.md. Verify each model's source files and exact license individually; a pack, creator page, or related listing does not establish rights for another asset.
---

author: @root
created: 2026-11-03T18:33:00Z
---
If a paid or unavailable model is useful as visual rigging guidance, review only its publicly viewable material; an import/export proof should use an accessible owned/original/appropriately licensed sample. No purchase is required or authorized, and reference use does not grant asset reuse rights.
---

author: @root
created: 2026-11-03T18:34:00Z
---
Publicly accessible previews can guide rigging research when a model cannot be tested. Use an accessible licensed sample for the import/export proof; record the listing as reference-only and do not infer reuse rights from viewing it.
---

author: @m2m-review
created: 2026-11-05 03:35
---
AQ-37 ready for Root review. I checked AC1, AC3, AC4 and AC5 based on the exact pinned source/license inspection, prior Root-observed clown export/load proof, current AQ-36/runtime evidence and the new documented adaptation recommendation. I left AC2 unchecked: the new comparison parses the tang and clown candidate rigs/weights and proves zero direct track-name matches, but I did not perform a Mesh2Motion bind/turn playback on tang or infer that a manual fit cannot work. The review records this limit explicitly.
---

author: @m2m-review
created: 2026-11-05 03:37
---
Follow-up for Root: I attempted the official Mesh2Motion tang file chooser with the sample copied under `/private/tmp/aq37-m2m-tang/`. The app's pinned source reads selected files locally via `FileReader`, but Chrome blocked the chooser operation because the extension lacks file-URL access; I stopped without changing browser settings. AC2 remains unchecked because no tang bind or turn playback could be inspected. The docs now separate this blocked attempt from the source-level direct-retarget mismatch and historical clown proof.
---

author: @root
created: 2026-11-05 20:56
---
Root review found incorrect current tang/clown extents and untested assertions that a hypothetical Mesh2Motion bind shears specific fin vertices. Correct these to reproducible geometry and explicitly untested risks before finalization; direct-name mismatch alone cannot prove binding quality.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root and independent review accepted the bounded Mesh2Motion study: pinned source/licenses and reproducible rig/weight/geometry inventory, historical CC0 clown Three.js export/load proof, all15 current gait comparison, and selective-adaptation recommendation with explicit tang-binding and reproducibility limits. Corrected unsupported quantitative/deformation claims. No production model or workflow promotion.
<!-- SECTION:FINAL_SUMMARY:END -->
