---
id: AQ-21
title: >-
  Animate Regal blue tang (Paracanthurus hepatus) with species-specific reef
  behavior
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-08T04:47:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - https://aquarium.org/animals/blue-tang/
  - >-
    https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/
  - https://www.marinespecies.org/aphia.php?id=219676&p=taxdetails
  - https://www.youtube.com/watch?v=azxKu-FJhyQ&t=38s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: '22'
type: enhancement
ordinal: 22
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `blue-tang`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected visual baseline is the adult regal blue tang: vivid blue body, curved black palette marking, and yellow tail, checked against the Australian Museum reference. Place it in clear water near seaward reef structure, where loose aggregations may move above the reef and retreating juveniles or subadults can shelter among branching coral per the WoRMS ecological notes. Animate a sustained but agile pectoral-fin-driven cruise with quick turns and occasional retreat toward coral; avoid tail-dominant body sway. These animation details are design inferences from cited references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Regal blue tang (Paracanthurus hepatus) visual baseline (adult vivid blue body, curved black palette marking, and yellow tail), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: sustain an agile pectoral-fin-driven cruise with quick turns and occasional retreat toward nearby branching coral; avoid tail-dominant body sway.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `blue-tang` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
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
