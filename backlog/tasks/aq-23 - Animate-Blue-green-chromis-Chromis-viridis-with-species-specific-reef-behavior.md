---
id: AQ-23
title: >-
  Animate Blue-green chromis (Chromis viridis) with species-specific reef
  behavior
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-03T12:39:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - https://aquarium.org/animals/blue-green-chromis/
  - AQ-41
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
priority: medium
type: enhancement
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `blue-green-chromis`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is translucent-looking blue-green body and deeply forked tail. Its scene placement is above branching Acropora in a lagoon or reef flat. Animate its distinctive routine as: coordinated school hovering with small independent offsets; on a shared disturbance cue contract and retreat into branches, then re-emerge gradually. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Blue-green chromis (Chromis viridis) visual baseline (translucent-looking blue-green body and deeply forked tail), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hover as a coordinated school with small individual offsets; on a shared disturbance cue contract and retreat into branching coral, then re-emerge gradually.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `blue-green-chromis` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

For this school-specific behavior, keep the disturbance cue scoped to the blue-green chromis group and its compatible branching-coral refuge. A single AQ-13 service activation affects only that selected fish, not the whole aquarium.

---
<!-- COMMENTS:END -->
