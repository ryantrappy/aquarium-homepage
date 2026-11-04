---
id: AQ-22
title: >-
  Animate Banggai cardinalfish (Pterapogon kauderni) with species-specific reef
  behavior
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-04T02:31:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - https://aquarium.org/animals/banggai-cardinalfish/
  - https://www.youtube.com/watch?v=3qOfVLtuEWY&t=0s
  - https://www.youtube.com/watch?v=_Uxl7noP_3A&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `banggai-cardinalfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is non-brooding adult silver body with black bars, white spots, tasselled first dorsal fin, and long fin rays. Its scene placement is among vertical branching coral or seagrass in a shallow sheltered bay or harbor. Animate its distinctive routine as: composed hover, gentle fin paddling, and slight vertical adjustment; preserve readability of the distinctive long fin rays. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Banggai cardinalfish (Pterapogon kauderni) visual baseline (non-brooding adult silver body with black bars, white spots, tasselled first dorsal fin, and long fin rays), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hold a composed hover with gentle fin paddling and slight vertical adjustments while keeping the long fin rays readable.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `banggai-cardinalfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---
<!-- COMMENTS:END -->
