---
id: AQ-19
title: Animate Yellow tang (Zebrasoma flavescens) with species-specific reef behavior
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
  - 'https://aquarium.org/animals/yellow-tang/'
  - 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12602642/'
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `yellow-tang`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is saturated yellow with a laterally compressed oval body, pointed snout, and tall dorsal and anal fins. Its scene placement is a shallow inshore reef, protected bay, or lagoon. Animate its characteristic broad reef-front cruise as pectoral-fin-driven, with the caudal fin used for bursts and turns; include sweeping turns and pauses to graze at rock surfaces. This locomotion detail follows the cited study and species references. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Yellow tang (Zebrasoma flavescens) visual baseline (adult saturated yellow laterally compressed oval body, pointed snout, and tall dorsal and anal fins), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: cruise broadly along the reef front powered mainly by pectoral-fin flapping; use the caudal fin for bursts and turns, make sweeping turns, and pause to graze at rock surfaces.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `yellow-tang` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
