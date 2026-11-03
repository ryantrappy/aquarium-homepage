---
id: AQ-45
title: Implement species-compatible interactions with reef habitat anchors
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T12:38:00Z'
updated_date: '2026-11-03T12:39:00Z'
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
priority: high
type: enhancement
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-34 provides typed 3D habitat locations and AQ-35 describes which locations each species may use; connect those systems through smooth, collision-aware behaviors. Host anemones, hard branching coral, rock, and sand burrows are different habitat types. Existing species tasks describe the visible fish behaviors; this shared task covers reusable approach, hold/enter, forage/perch, retreat, and return handling so those behaviors do not become separate hard-coded path systems for every species.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The runtime accepts only profile-compatible typed habitat anchors from AQ-34/AQ-35; incompatible combinations are rejected or safely omitted.
- [ ] #2 Ocellaris clownfish can approach and remain near a compatible host-anemone anchor with a tunable soft home region and natural overlap of soft tentacles; no hard-coded universal leash distance or Acropora-as-host substitution is used.
- [ ] #3 Firefish hover above and retreat into a sand-burrow entrance, while yellow watchman gobies hold lookout at and retreat backward into a burrow; their distinct profile behaviors are not collapsed into the same movement.
- [ ] #4 Tailspot blenny rock-perching and supported roster foraging/grazing interactions use their own compatible rock, rubble, sand, or grazing anchors rather than forcing all small reef fish to perch or burrow.
- [ ] #5 Approach, interaction, retreat, and return trajectories are smooth and collision-aware: fish do not snap to targets or pass through solid reef, and a blocked target causes safe replanning or omission.
- [ ] #6 A review artifact demonstrates at least the host-anemone, sand-burrow, rock-perch, and foraging/grazing interaction categories with the source-supported species assignments.
- [ ] #7 Pausing, hidden-page suspension, reduced motion, and service-link selection remain compatible with the interactions; these behaviors do not delay URL opening.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
