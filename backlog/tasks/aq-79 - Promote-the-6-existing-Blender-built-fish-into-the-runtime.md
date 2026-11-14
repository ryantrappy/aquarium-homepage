---
id: AQ-79
title: Promote the 6 existing Blender-built fish into the runtime
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-14 15:07'
labels:
  - modeling
  - photorealism
  - rendering
dependencies:
  - AQ-70
  - AQ-12
  - AQ-40
  - AQ-58
  - AQ-60
references:
  - src/rendering/assets/fish/manifest.json
  - src/rendering/assets/splat-fish/manifest.json
  - src/rendering/assets/splat-fish/overrides/
  - src/rendering/scene/aquarium.ts
  - scripts/verify-fish-clip-player.mjs
  - AQ-58
  - AQ-60
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 79
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Perform per-species visual and contract comparison between the 6 candidate models in src/rendering/assets/fish/ and the photoreal texture-projected / Blender-override models in src/rendering/assets/splat-fish/ (including overrides/blue-tang.glb), promoting only the higher-realism, Root-approved asset for each species into the active runtime roster in src/rendering/scene/aquarium.ts without breaking service-link picking, adult scale (AQ-60), or clip-player pose safety (AQ-58).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each of the 6 Blender fish is reviewed per-species against its species baseline before promotion
- [ ] #2 Promoted fish are wired into the live roster with correct service assignment and click targets
- [ ] #3 The corresponding splat-fish GLBs are removed/replaced with no orphaned references
- [ ] #4 Visual acceptance passes at 1440x900 and 402x874
- [ ] #5 No automatic swap — promotion only on Root approval per species
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root2026-11-12 read-only candidate audit (Luna, reviewed against current URL/scale tables): the six assets/fish candidate GLBs are not the current runtime mappings. Current clown/yellow use download/proof assets and blue/gramma/Banggai/mandarin use splat-fish variants. Candidate manifest axis lengths are about0.075-0.153m while fish-scale.ts expects current models around2units; a URL-only swap would shrink candidates drastically. Promotion must update measured model extents and validate scale before visual acceptance. Candidate contract/manifest tests15pass, scale7pass and six clip-player checks pass; those are structural proofs, not anatomy/material/continuous-deformation acceptance. Procedural source scripts exist, but no six per-species native.blend files were found; manual Blender edits require saved native sources and sync. No assets promoted or removed and no model files touched.

Root2026-11-14 read-only subagent audit atcbf6567: six candidate GLB and generator hashes match manifests;15contract/manifest checks pass, proving packaging only. Current runtime URLs do not select these candidates. Candidate long-axis lengths .075-.153m differ from current ~2scene-unit model assumptions, so a direct URL swap would shrink fish roughly13-27times. No per-species visual/animation comparison or Root promotion approval exists; cleanup/picking/two-size acceptance remains open. Current blue-tang generated manifest also lacks explicit override source/hash lineage. No assets/Blender/runtime changes by audit. Preserve current models; require bounded comparison, measured scale and explicit per-species Root decisions before promotion. Listed art/scale/collision dependencies remain open; no AC accepted from metadata.
<!-- SECTION:NOTES:END -->
