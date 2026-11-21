---
id: AQ-78
title: Build scanned or sculpted fish for all 15 species with distinct rigs
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-08 00:30'
updated_date: '2026-11-21 18:48'
labels:
  - modeling
  - photorealism
dependencies:
  - AQ-5
  - AQ-40
  - AQ-70
  - AQ-70.9
  - AQ-70.10
references:
  - scripts/build-splat-fish-glbs.mjs
  - scripts/sync-blender-override.mjs
  - src/rendering/assets/splat-fish/manifest.json
  - src/rendering/assets/fish/manifest.json
  - docs/fish-art-provenance.json
  - AQ-48
  - AQ-49.1
  - AQ-70.9
  - AQ-70.10
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '5'
type: feature
ordinal: 78
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build reference-sculpted or scanned 3D fish models for all 15 roster species with species-correct cross-sections, razor-thin fin margins, independent 3D pectoral fins, closed watertight anatomy, and gait-matched locomotion rigs (labriform, subcarangiform, banner hoverer, benthic percher). All manual Blender sculpting must follow the mandatory persistence workflow: save packed .blend files to src/rendering/assets/splat-fish/blend/<species>.blend, export .glb overrides to src/rendering/assets/splat-fish/overrides/<species>.glb, run node scripts/sync-blender-override.mjs --learn-guide to propagate learned shape guides and validate reef-asset-v1 contracts, and commit all artifacts to Git.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 15 species have a scanned or reference-sculpted model with species-correct anatomy, UVs, and materials
- [x] #2 Each species has its own locomotion rig matched to its gait (labriform, subcarangiform, hovering, benthic, and others)
- [x] #3 Models pass the asset contract (reef-asset-v1) with license, source, creator, hash, and attribution recorded
- [ ] #4 Models are Root-reviewed for visual acceptance before runtime promotion; no automatic swap
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-21 Full 15-Species + Sailfin Tang Sculpted Blender Roster & reef-asset-v1 Contract Verification (AQ-78 AC #1, #2, #3): All 15 roster species plus license-clean desjardins-sailfin-tang have saved packed .blend workfiles in src/rendering/assets/splat-fish/blend/<species>.blend, exported override GLBs in src/rendering/assets/splat-fish/overrides/<species>.glb, species-matched 8-joint locomotion rigs (labriform, subcarangiform, banner hover, benthic percher), 512x512 24-bit RGB BaseColor/Normal/ORM maps, and contract-validated reef-asset-v1 inspection reports with <=3.64% silhouette deviation (docs/asset-evidence/aq70-10/silhouette-proportion-audit.json). Verified splat-fish-contract.test.ts, starter-fish-overrides.test.ts, verify-fish-clip-player.mjs --runtime, and check-reef-asset-manifests.mjs. AC #4 and DoD #1 remain open for Root visual review before runtime promotion.
<!-- SECTION:NOTES:END -->
