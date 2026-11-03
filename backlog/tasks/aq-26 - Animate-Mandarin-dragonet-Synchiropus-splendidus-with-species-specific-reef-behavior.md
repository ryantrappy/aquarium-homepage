---
id: AQ-26
title: >-
  Animate Mandarin dragonet (Synchiropus splendidus) with species-specific reef
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
  - 'https://aquarium.org/animals/mandarin-goby/'
  - >-
    https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-marine-fish/how-to-look-after-dragonets-mandarin-fish/
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `mandarin-dragonet`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult orange body with curved green and blue bands outlined in black and blue-edged fins; use a male with elongated first dorsal ray as the default baseline. Its scene placement is close to sand, rubble, and rock crevices on a shallow reef. Animate its distinctive routine as: short stop-start advances between foraging points with frequent pauses and pecks; treat the male fin-extended courtship dance as a separate occasional behavior. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Mandarin dragonet (Synchiropus splendidus) visual baseline (adult orange body with curved green and blue bands outlined in black and blue-edged fins; use the male elongated first dorsal ray baseline), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: move close to the substrate in short stop-start advances between foraging points, pausing to peck; treat the male fin-extended courtship dance as a separate occasional behavior.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `mandarin-dragonet` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
