---
id: AQ-20
title: Animate Royal gramma (Gramma loreto) with species-specific reef behavior
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
  - 'https://www.saltcorner.com/AquariumLibrary/browsespecies.php?CritterID=195'
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `royal-gramma`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult purple forebody and yellow rear half. Its scene placement is near a cave, ledge, or rocky overhang. Animate its distinctive routine as: hover just outside a crevice, reorient head-up or head-down against the rock plane and occasionally swim inverted, make a compact inspection loop, then return to the same refuge. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Royal gramma (Gramma loreto) visual baseline (adult purple forebody and yellow rear half), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hover outside a crevice, reorient head-up or head-down relative to the rock, occasionally swim belly-up under an overhang, make a compact inspection loop, and return to the same refuge.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `royal-gramma` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
