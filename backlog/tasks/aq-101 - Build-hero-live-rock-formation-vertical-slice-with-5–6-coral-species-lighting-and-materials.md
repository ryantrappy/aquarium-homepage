---
id: AQ-101
title: >-
  Build hero live-rock formation vertical slice with 5–6 coral species,
  lighting, and materials
status: In Progress
assignee:
  - '@gemini'
created_date: '2026-11-11 05:17'
updated_date: '2026-11-28 05:05'
labels:
  - modeling
  - blender
  - corals
  - lighting
  - photorealism
dependencies: []
references:
  - src/rendering/assets/corals/
  - src/rendering/scene/aquarium.ts
  - AQ-94
  - AQ-95
  - AQ-96
documentation:
  - docs/rendering.md
  - docs/asset-evidence/aq101/wide-face-colonies-20261121/README.md
priority: high
type: feature
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prioritize building ONE exceptionally convincing hero rock formation with 5–6 coral species first, including lighting, shaders, and materials, as a verified vertical slice before populating the entire aquarium. If that single formation looks photographic, the rest becomes an asset composition and performance problem rather than a realism problem.
1. Hero Rock Formation:
   - Build a single, highly detailed rock pillar / arch formation with plateau shelves, porous cavities, and substrate grounding.
2. Coral Ecosystem (5–6 species):
   - Populate with 5–6 biologically convincing coral archetypes: branching Acropora at the top, plating Montipora on a ledge, fleshy torch/hammer LPS mid-level, brain coral, and encrusting patches on rock faces.
3. Lighting & Shaders:
   - Apply 14,000K–20,000K directional lighting, upward-masked projected caustics, ACESFilmicToneMapping, and vertex-sway / Fresnel shaders.
4. Camera Angle Verification:
   - Frame the test using the original screenshot camera angle and aspect ratio at 1440x900 and 402x874, ensuring service fish swimming clearances are preserved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A single hero rock formation is fully authored and assembled with 5–6 biologically convincing coral species
- [x] #2 The vertical slice features top branching SPS, shelf plating Montipora, mid-level fleshy LPS, brain coral, and encrusting rock patches
- [x] #3 Lighting, upward-masked caustics, and ACESFilmicToneMapping are verified together on the hero formation
- [ ] #4 Look-dev captures at 1440x900 and 402x874 confirm photographic realism and depth before full aquarium rollout
- [ ] #5 Fish swimming lanes and label sightlines in front of and above the formation remain clear
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Fill exposed front faces with small groups of existing encrusting polyps. Locate attachments by probing actual transformed foundation triangles, confirm face support at the center and around each footprint, and keep the growth away from hero mounts, cave mouths and the central passage. Reuse the existing instanced batch and compare the laptop view before and after.

Bring measured encrusting colonies into the default modular wide reef. Reuse the existing instanced polyp batch and authored rock textures. Review exposed pinnacle and arch faces at laptop size and retain measured canyon and resident clearances.

Use the existing footprint-tested face placement on the current legacy islands in the wide default. Keep socket companion scatter and transfer the authored face patch bounds to both mesh and fallback navigation. Review actual mounted paths and the settled 1440×900 scene.

Fit a shallow encrusting zoanthid mat to the visible center-arch cap using the real exported surface sampler. Verify attachment, center passage clearance, and the laptop overview.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root2026-11-12 review withdraws unproven photographic-realism and full fish-clearance completion. Current exact-source native1440x900/402x874 views exist underAQ70.13/taller-20261112 andAQ87/distribution-20261112; these show useful authored coral archetypes and taller composition, but repeated simple colony forms, broad mound foundations and conspicuous shader patterns still fall short of the supplied photographic reef goal. No dedicated historical hero capture proving AC4 was found. Actual runtime foundation files also differ from canonical measured mount/cave evidence (AQ59runtime-source-audit-20261112). Keep verified archetype layering/lighting integration criteria, but AC1biological art, AC4photographic acceptance and AC5actual animated clearance remain open. No model rollback or edits.

Root review 2026-11-20. Added shallow zoanthid mats to exposed rock faces on both islands, reusing the existing instanced batch and asset. Each mat probes the actual foundation at its center and four neighboring points. The existing anchor offsets and central passage remain in place. Added two exact-foundation attachment tests. Attachment, assembly, cave, and anemone route suites pass 58 tests. The 1440×900 DPR 1 working-tree capture at docs/asset-evidence/aq101/face-colony-review/laptop.png shows 12 inhabitants and no failed assets or browser warnings or errors. The preview includes concurrent sand and glass edits. The mats are decorative instances. Full animated-body and label-clearance review, biological art, and photographic acceptance remain open.

Root modular face colony review 2026-11-21. Ten instanced zoanthid mats now populate the default wide reef, seated on actual supported left pinnacle, buttress, center arch and right ledge faces. The test checks the actual kit, validates the fallback obstacle list, and retains the canyon, burrow, clownfish and moray geometry checks. Each mat uses a displacement-padded instance bound in exact routing; the fallback includes it in its foundation box to retain the existing obstacle volume budget. The 1440x900 DPR 1 staged capture is ready with 15 inhabitants, no failed assets and zero browser warnings/errors. Evidence docs/asset-evidence/aq101/modular-face-colonies/. Saved assets are reused. Final photographic and animated-body/label acceptance remain open.

Root 2026-11-21 wide default review: the current two islands each carry five footprint-tested instances of the saved zoanthid mat. The same instance transforms and shader margin reach the exact mesh query and foundation fallback. Actual-export fixtures verify counts, fallback containment, coral blocking, baseline cave/approach paths and the moray head. The settled 1440×900 capture has 29 inhabitants, zero pending/failed assets and no browser warnings/errors. All 1,073 tests, typecheck and production build passed. Evidence in docs/asset-evidence/aq101/wide-face-colonies-20261121/. Photographic and whole-body lane acceptance remain open.

Root 2026-11-27: added one existing orange-green zoanthid mat on the supported front-right shoulder of the default center arch. Exact exports verify support, exact and fallback collision bounds, and the open center passage at the scene probe radius. The full laptop comparison resolved 12 inhabitants with no failures or browser warnings/errors. All 1,101 tests, typecheck, manifest verification and build passed. Full formation art and animated-body acceptance remain open.
<!-- SECTION:NOTES:END -->
