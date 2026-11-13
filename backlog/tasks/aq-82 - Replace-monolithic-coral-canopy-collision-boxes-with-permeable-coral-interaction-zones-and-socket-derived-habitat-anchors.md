---
id: AQ-82
title: >-
  Replace monolithic coral canopy collision boxes with permeable coral
  interaction zones and socket-derived habitat anchors
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-08T20:07:00Z'
updated_date: '2026-11-13 06:18'
labels:
  - behavior
  - navigation
  - rendering
dependencies:
  - AQ-45
  - AQ-58
references:
  - src/rendering/scene/reef-assembly.ts
  - src/rendering/scene/habitat.ts
  - src/rendering/scene/habitat-anchor-interactions.ts
  - src/rendering/scene/motion.ts
  - src/simulation/habitat-navigation.ts
documentation:
  - docs/fish-behavior-design.md
  - docs/habitat-navigation-core-contract.md
priority: '2'
type: enhancement
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently, fish-coral collision handling treats the entire coral canopy as an impenetrable solid box, making it appear as if fish are repelled by an invisible forcefield and cannot interact with corals at all:
1. In src/rendering/scene/reef-assembly.ts, LEFT_ISLAND_LOCAL_OBSTACLES_M and RIGHT_ISLAND_LOCAL_OBSTACLES_M define giant monolithic 'coral-canopy-crest' AABBs covering the upper coral mounts. Once scaled by island uniformScale (3.5 desktop / 2.5 mobile) and inflated by fishClearanceRadius (0.22-0.57 scene units), fish are blocked far outside the coral branches and soft tentacles.
2. instantiateModularReefHabitat() only emits 3 grazingSurface anchors hardcoded to compatibleSpecies: ['yellow-tang'], omitting socket-derived anchors for mounted host anemones (hostAnemone at socket_anemone_crevice_01), branching SPS colonies (branchingCoralShelter / branchingCoralRefuge at socket_sps_crest_*), Euphyllia/leather ledges, rock perches (rockPerch), foraging patches (foragingPatch), and sand burrows (sandBurrowEntrance).
3. resolveSafeAnchorInteractionTarget() in src/rendering/scene/habitat-anchor-interactions.ts checks isWaterSegmentSafe() against all solid obstacles unconditionally, ignoring offset.softTentacleOverlapAllowed and blocking fish from entering their own compatible coral/anemone interaction envelopes, and stepSwimmingFish() in src/rendering/scene/motion.ts does not apply evaluateAnchorInteractionOffset() during active anchor visits.

Separate rigid calcified collision cores (live rock and stony coral bases/stalks) from permeable soft-coral crowns and inter-branch shelter envelopes, emit typed socket-derived habitat anchors for mounted corals, and wire species-compatible coral interactions into runtime fish motion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Monolithic coral-canopy-crest obstacle boxes in src/rendering/scene/reef-assembly.ts are replaced with tight collision bounds limited to rigid rock and calcified coral bases/stalks so fish can swim naturally close to coral crowns without clipping through solid rock.
- [ ] #2 instantiateModularReefHabitat() derives typed HabitatAnchorLocation entries directly from mounted coral sockets and island features (including hostAnemone, branchingCoralShelter, branchingCoralRefuge, rockPerch, foragingPatch, grazingSurface, and sandBurrowEntrance) with species compatibility aligned to docs/fish-behavior-design.md.
- [ ] #3 resolveSafeAnchorInteractionTarget() and habitat navigation allow compatible species to enter permeable coral interaction zones (honoring softTentacleOverlapAllowed for ocellaris-clownfish in hostAnemone and reduced-clearance shelter entry for damselfish/cardinalfish/wrasses in branching SPS) while still preventing penetration into rigid rock or stony bases.
- [ ] #4 stepSwimmingFish() in src/rendering/scene/motion.ts integrates evaluateAnchorInteractionOffset() so fish visibly nestle in host anemones, shelter among coral branches, perch on rock ledges, and graze near coral bases during active behavior states.
- [ ] #5 Unit and integration tests verify that compatible species reach and interact with coral anchors at both 1440x900 and 402x874 viewports without NaN poses, solid-rock penetration, or degraded service-link picking.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root current-source alignment: existing typed coral interactions are implemented, but habitat generation still uses canonical socket coordinates even though runtime mounts now use different reef-full-model exports. Derive a copied island-local socket-position map from actual assembled rock nodes, pass it explicitly to habitat derivation, and use it for coral-base bounds and socket anchors. Preserve canonical defaults for historical/offline callers; an explicit runtime map must not fall back to stale coordinates for missing entries. Keep species compatibility, conservative clearance, placement and navigation contracts. Validate nested/transformed socket extraction, updated runtime nodes, missing/duplicate/nonfinite handling, actual GLB-backed differences and focused controller/reef tests. Full animated clearance/permeability art gates stay open.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root current-source audit: runtime habitat still uses SOCKET_ANCHOR_POSITIONS_M from canonical socket reports although rendered coral mounts use reef-full-model GLB nodes. AQ58fallback source split is now corrected in d862bf9 without changing anchor derivation. Planned actual-mounted socket-position alignment remains next; no implementation/AC acceptance underAQ82 yet. Do not treat completed fallback coverage as coral permeability or anatomical contact acceptance.
<!-- SECTION:NOTES:END -->
