---
id: AQ-37
title: Investigate Mesh2Motion fish rigs and animation transfer
status: In Progress
assignee:
  - '@fish-renderer'
created_date: '2026-11-03T04:47:00Z'
updated_date: '2026-11-03T18:34:00Z'
labels: []
dependencies: []
references:
  - https://mesh2motion.org/
  - AQ-5
  - AQ-12
  - AQ-35
  - AQ-36
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/gemini-research-links.md
priority: medium
type: spike
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate whether Mesh2Motion can improve the aquarium fish animation workflow: https://mesh2motion.org/. The official site lists fish rigs, GLB/GLTF/DAE/FBX imports, bundled GLB/FBX exports with multiple animations, Blender rig/animation sources via GitHub, MIT-licensed code, and CC0 animation assets. Verify the exact source and license for any candidate rig or animation rather than assuming site-level statements blanket every asset. Assess fish-specific skeletons, bones and weighting for body, fins and caudal motion across contrasting target fish, retargetability across the 15-species roster, and export/load compatibility with the rendering runtime selected in AQ-5. Produce a small proof using owned or appropriately licensed sample fish, compare animation quality against the current approach and AQ-36 reference, and recommend adopting, adapting, or rejecting the workflow with limitations. This investigation informs a future production choice; it does not itself migrate the production animation workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Official Mesh2Motion claims and source repositories are inspected; candidate source files and exact license terms are verified before any asset is evaluated for use.
- [ ] #2 The review assesses skeleton/bone and weighting support for body deformation, fin articulation, caudal motion, and turns on contrasting fish shapes, and explains limits for retargeting across all 15 target species.
- [ ] #3 A proof using owned or appropriately licensed sample fish demonstrates an export and load path into the rendering runtime selected by AQ-5, with compatibility and animation quality findings.
- [ ] #4 The comparison covers the current animation approach and the Sketchfab reference findings from AQ-36, including how rig cycles preserve species-specific behavior profiles and independent swimming paths.
- [ ] #5 A concise adopt, adapt, or reject recommendation states evidence, verified asset/license scope, and limitations; production workflow migration is tracked separately.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect official source and exact asset licenses, fish skeleton hierarchy and animation files.
2. Test import, skinning, animation and export on owned or explicitly licensed closed meshes of two contrasting reef shapes, then load the output in Three.js.
3. Compare motion, limitations and retargetability against the rejected proof and the directly observed reference; document a justified recommendation and seek root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: Investigate https://mesh2motion.org/ as an animation-improvement option. The official site lists Fishes rigs; GLB/GLTF/DAE/FBX import; bundled GLB/FBX export with multiple animations; Blender rig/animation source via GitHub; MIT code and CC0 animation assets. Verify exact sources and licenses rather than assuming every asset is covered. Assess species-specific skeleton/bone/weighting for different fish bodies, fins and caudal flexibility, retargetability across 15 species, and export/load compatibility with AQ-5 selected runtime. Make a proof with owned or appropriately licensed sample fish; compare current animation and AQ-36 Sketchfab reference; preserve species behavior profiles and independently varying swim paths. Recommend adopt/adapt/reject with limits. The proof may import and export authorized samples; production workflow migration is separate.

Offline source inspection only: Mesh2Motion app repository currently maps Fish to shark skeleton (33 named joint nodes including root), shark/whale variants, and separate horizontal/vertical GLB clips. The horizontal clip contains 99 channels. Generic template bones cover a long tail and paired fins but there is no evidence yet of suitable yellow-tang/labriform mechanics or fidelity across the roster. No transfer/load proof or adopt decision has been made.
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
<!-- COMMENTS:END -->
