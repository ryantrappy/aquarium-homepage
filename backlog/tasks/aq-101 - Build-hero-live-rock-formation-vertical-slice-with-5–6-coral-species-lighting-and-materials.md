---
id: AQ-101
title: >-
  Build hero live-rock formation vertical slice with 5–6 coral species,
  lighting, and materials
status: In Progress
assignee:
  - '@gemini'
created_date: '2026-11-11 05:17'
updated_date: '2026-11-13 05:37'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root2026-11-12 review withdraws unproven photographic-realism and full fish-clearance completion. Current exact-source native1440x900/402x874 views exist underAQ70.13/taller-20261112 andAQ87/distribution-20261112; these show useful authored coral archetypes and taller composition, but repeated simple colony forms, broad mound foundations and conspicuous shader patterns still fall short of the supplied photographic reef goal. No dedicated historical hero capture proving AC4 was found. Actual runtime foundation files also differ from canonical measured mount/cave evidence (AQ59runtime-source-audit-20261112). Keep verified archetype layering/lighting integration criteria, but AC1biological art, AC4photographic acceptance and AC5actual animated clearance remain open. No model rollback or edits.
<!-- SECTION:NOTES:END -->
