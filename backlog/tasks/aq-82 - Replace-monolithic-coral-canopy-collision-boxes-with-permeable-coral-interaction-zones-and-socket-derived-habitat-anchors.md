---
id: AQ-82
title: >-
  Replace monolithic coral canopy collision boxes with permeable coral
  interaction zones and socket-derived habitat anchors
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-08T20:07:00Z'
updated_date: '2026-11-13 14:10'
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

Refined current-source approach: copy origins from AssembledCoralBinding.root.position after actual mount offsets, rather than independently reconstructing socket node transforms. Mounted roots are direct children of the reef and are the renderer truth, so nested socket transforms or future authored changes cannot make habitat disagree with the placement actually used. New optional mounted-origins input is explicit and fail-closed for missing/duplicate/nonfinite mounted entries, with no stale canonical fallback; historical callers that omit it retain canonical defaults. Preserve front stand-off/lifts/species profiles and use offsets exactly once. Validate mount-origin maps are copied, transformed parent does not double-apply, and actual runtime GLB socket differences flow through to anchors/rigid-base origins. Nested export anatomy itself is not newly certified by this alignment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root current-source audit: runtime habitat still uses SOCKET_ANCHOR_POSITIONS_M from canonical socket reports although rendered coral mounts use reef-full-model GLB nodes. AQ58fallback source split is now corrected in d862bf9 without changing anchor derivation. Planned actual-mounted socket-position alignment remains next; no implementation/AC acceptance underAQ82 yet. Do not treat completed fallback coverage as coral permeability or anatomical contact acceptance.

Luna bounded implementation/Root integration: snapshotMountedCoralOrigins copies/freezes actual mounted-root local positions including mount offsets; explicit habitat input rejects duplicate/nonfinite/missing mount origins and never falls back to canonical coordinates. Canonical omitted-input callers remain supported with unchanged tuple table. Calcified bases iterate actual supplied SPSmounts, including new crest names. Main aquarium supplies real binding origins and fails reef setup safely on invalid geometry, including resize; native service links remain available. Root review75focusedtests/4files and typecheck14scripts pass. Actual runtimeGLB-based fixture proves moved crest03anchors/bases follow renderer; both current scaled/yawed view layouts compared against Threeworld positions; offsets used once/copy isolation tested. This is a verified source-alignment handoff; full coral permeability/visible nesting, measured ledges, animated clearance and final art remain open. No model/asset/Blender changes. Final native integration evidence follows.

Root final exact-source6be5dcc handoff: all755tests/66files,75focusedtests/4files, typecheck14scripts and productionbuild pass. Native1440x900/402x874DPR1 ready snapshots/PNGs under docs/asset-evidence/aq82/current-origins-20261113/ retain11inhabitants and8phone native targets>=44px, allwithinviewport; recovered phone browser log has zero captured warnings/errors. Laptop capture preceded browser-session disconnect; recovered phone capture uses sameexact6be5dcc source. Input socket delta audit is explicitly not sampled runtime anchor poses. Main map alignment/offset/transform/failure behavior reviewed, but fullAC2includes measuredislandfeatures andAC3/4/5requirevisiblepermeability/nesting/animatedclearance, which remainopen. Existing front stand-off/lifts/clamps retained. No model/Blender edits or asset promotion by Root.
<!-- SECTION:NOTES:END -->
