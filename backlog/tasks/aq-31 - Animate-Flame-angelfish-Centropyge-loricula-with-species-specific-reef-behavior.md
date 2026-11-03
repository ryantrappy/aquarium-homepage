---
id: AQ-31
title: >-
  Animate Flame angelfish (Centropyge loricula) with species-specific reef
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
  - 'https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2591'
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `flame-angelfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is brilliant orange-red body with black bars and blue-violet edging on rear dorsal and anal fins. Its scene placement is sheltered coral area with nearby rock or coral structure. Animate its distinctive routine as: compact loops around shelter with brief grazing pecks and retreats into cover; keep it moving more continuously than burrow-perching gobies while keeping the orbit tied to refuge. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Flame angelfish (Centropyge loricula) visual baseline (orange-red body with black bars and blue-violet edging on the rear dorsal and anal fins), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: make compact loops around shelter, pause for grazing pecks, and retreat into cover; keep the orbit tied to the refuge.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `flame-angelfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
