---
id: AQ-45
title: Implement species-compatible interactions with reef habitat anchors
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T12:38:00Z'
updated_date: '2026-11-08T21:37:00Z'
labels: []
dependencies:
  - AQ-34
  - AQ-35
  - AQ-44
references:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6850181/
  - >-
    https://www.aquariumofpacific.org/onlinelearningcenter/species/clown_anemonefish
  - https://www.fao.org/fishery/docs/CDrom/bobp/cd1/Bobp/Publns/MAG/021.pdf
  - >-
    https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/
  - https://nrm-fishbaselinux01.nrm.se/Ecology/Ecsenius_stigmatura
  - AQ-18
  - AQ-19
  - AQ-24
  - AQ-25
  - AQ-26
  - AQ-27
  - AQ-32
documentation:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
priority: '11'
type: enhancement
ordinal: 11
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-34 provides typed 3D habitat locations and AQ-35 describes which locations each species may use; connect those systems through smooth, collision-aware behaviors. Host anemones, hard branching coral, rock, and sand burrows are different habitat types. Existing species tasks describe the visible fish behaviors; this shared task covers reusable approach, hold/enter, forage/perch, retreat, and return handling so those behaviors do not become separate hard-coded path systems for every species.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The runtime accepts only profile-compatible typed habitat anchors from AQ-34/AQ-35; incompatible combinations are rejected or safely omitted.
- [x] #2 Ocellaris clownfish can approach and remain near a compatible host-anemone anchor with a tunable soft home region and natural overlap of soft tentacles; no hard-coded universal leash distance or Acropora-as-host substitution is used.
- [x] #3 Firefish hover above and retreat into a sand-burrow entrance, while yellow watchman gobies hold lookout at and retreat backward into a burrow; their distinct profile behaviors are not collapsed into the same movement.
- [x] #4 Tailspot blenny rock-perching and supported roster foraging/grazing interactions use their own compatible rock, rubble, sand, or grazing anchors rather than forcing all small reef fish to perch or burrow.
- [ ] #5 Approach, interaction, retreat, and return trajectories are smooth and collision-aware: fish do not snap to targets or pass through solid reef, and a blocked target causes safe replanning or omission.
- [ ] #6 A review artifact demonstrates at least the host-anemone, sand-burrow, rock-perch, and foraging/grazing interaction categories with the source-supported species assignments.
- [ ] #7 Pausing, hidden-page suspension, reduced motion, and service-link selection remain compatible with the interactions; these behaviors do not delay URL opening.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Fixed the yellow-tang grazingSurface clearance failure reported in Root comment #1 in src/rendering/scene/habitat.ts: instantiateReefHabitat() and deriveReefHabitat() now compute anchorClearanceOffset(anchor.compatibleSpecies) = max(MIN_FISH_CLEARANCE, ...compatibleSpecies.map(fishClearanceRadius)) + 0.03 (0.60 scene units for yellow-tang radius 0.57 instead of hard-coded 0.53), restoring reachable grazing routes at both 402x874 mobile and 1440x900 desktop placements (verified in src/rendering/scene/habitat.test.ts).
- Implemented src/rendering/scene/habitat-anchor-interactions.ts and src/rendering/scene/habitat-anchor-interactions.test.ts covering profile-compatible anchor filtering (never substituting branchingCoralShelter/Acropora for hostAnemone), ocellaris-clownfish soft-home anemone station-keeping, firefish burrow hover/head-first bolt vs. yellow-watchman-goby benthic lookout/backward retreat, tailspot-blenny rock perching, and substrate grazing/foraging with collision-checked target resolution and pause/reduced-motion gating.

2026-11-08 audit: Profile-compatible anchor filtering and interaction pose offsets (src/rendering/scene/habitat-anchor-interactions.ts, habitat-anchor-interactions.test.ts) are implemented and tested (ACs #1-#4). Moved to In Progress; permeable coral collision zones and socket-derived anchor wiring in aquarium.ts/motion.ts continue in AQ-82.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-05 13:09
---
Root independent validation of scratch audit4.8 confirms current yellow-tang grazing failure: radius.57 legacy scene units exceeds fixed.53 substrate offset; all12phone/24laptop grazing targets failclearance (prior radius.5 yielded1/12 and3/24). Blue tang is not grazing-compatible and is not the correct example. Resolve semantic anchor clearance from actual geometry and explicit fish envelope under existingAC4/5 and AQ34AC3/6; no invented host/refuge from socketnames. Repro:/tmp/aq58-audit-claims.test.ts.
---
<!-- COMMENTS:END -->
