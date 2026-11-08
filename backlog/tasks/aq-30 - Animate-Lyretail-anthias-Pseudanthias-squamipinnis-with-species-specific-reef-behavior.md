---
id: AQ-30
title: >-
  Animate Lyretail anthias (Pseudanthias squamipinnis) with species-specific
  reef behavior
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
  - https://aquarium.org/animals/lyretail-anthias/
  - https://www.youtube.com/watch?v=ER43oQdsEfE&t=115s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: '20'
type: enhancement
ordinal: 20
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `lyretail-anthias`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult female baseline, bright orange with purple stripe below the eye; a male variant needs its distinct color and elongated dorsal spine. Its scene placement is above a coral outcrop on a clear lagoon or outer reef slope. Animate its distinctive routine as: loose group making flowing short passes and turns, then returning to the same vertical zone around its home outcrop. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Lyretail anthias (Pseudanthias squamipinnis) visual baseline (adult female baseline, bright orange with a purple stripe below the eye), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: move as a loose group in flowing short passes and turns, then return to the same vertical zone around the home outcrop.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `lyretail-anthias` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
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
