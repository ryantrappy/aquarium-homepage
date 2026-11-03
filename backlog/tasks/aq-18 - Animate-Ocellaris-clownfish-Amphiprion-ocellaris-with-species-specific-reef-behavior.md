---
id: AQ-18
title: >-
  Animate Ocellaris clownfish (Amphiprion ocellaris) with species-specific reef
  behavior
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03 04:37'
updated_date: '2026-11-03 04:41'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - 'https://www.fishbase.se/summary/Amphiprion-ocellaris'
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `ocellaris-clownfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult orange compact oval body with three clear white bars. Its scene placement is beside a host anemone in a shallow calm reef or lagoon. Animate its distinctive routine as: small bobbing station-keeping loops among the tentacles, brief peeks out, and short returns to the same host zone; avoid long open-water transits. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Ocellaris clownfish (Amphiprion ocellaris) visual baseline (adult orange compact oval body with three white bars), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: make small bobbing station-keeping loops among anemone tentacles, peek briefly out, and return to the same host zone instead of taking long open-water transits.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `ocellaris-clownfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
