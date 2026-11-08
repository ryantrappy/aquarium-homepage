---
id: AQ-28
title: >-
  Animate Six-line wrasse (Pseudocheilinus hexataenia) with species-specific
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
  - https://reeflife.org/species/pseudocheilinus-hexataenia/
  - https://www.fishbase.se/summary/Pseudocheilinus-hexataenia
  - https://www.youtube.com/watch?v=zYXrXtxKRfo&t=25s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: '25'
type: enhancement
ordinal: 25
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `six-line-wrasse`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is six yellow-orange stripes over a blue-mauve body, green tail, and small upper-tail eyespot. Its scene placement is shallow coral branches and reef crevices close to cover. Animate its distinctive routine as: fast sinuous search path weaving through rock gaps, frequent short stops to inspect crevices, and little open-water cruising. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Six-line wrasse (Pseudocheilinus hexataenia) visual baseline (six yellow-orange stripes over a blue-mauve body, green tail, and small upper-tail eyespot), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: follow a fast sinuous search path through rock gaps, stop often to inspect crevices, and stay close to cover instead of cruising through open water.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `six-line-wrasse` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
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
