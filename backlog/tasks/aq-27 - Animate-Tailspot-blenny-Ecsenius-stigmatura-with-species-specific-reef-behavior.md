---
id: AQ-27
title: >-
  Animate Tailspot blenny (Ecsenius stigmatura) with species-specific reef
  behavior
status: In Progress
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-08T21:37:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - >-
    https://baliwildlife.com/encyclopedia/marine-life/ray-finned-fishes/blennies/tailspot-blenny-ecsenius-stigmatura/
  - AQ-45
  - https://www.youtube.com/watch?v=2hL5ojGRuQc&t=30s
  - https://www.youtube.com/watch?v=K0_8PBYciJ0&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: '30'
type: enhancement
ordinal: 30
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `tailspot-blenny`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is small elongated beige-to-brown body with a distinctive dark spot at the tail base. Its scene placement is near hard coral, rock, and holes in a coral-rich lagoon or outer reef. Animate its distinctive routine as: perch near rock, make alert head turns and short darting repositioning, then settle again. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Tailspot blenny (Ecsenius stigmatura) visual baseline (small elongated beige-to-brown body with a distinctive dark spot at the tail base), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: perch near rock, make alert head turns, dart a short distance to reposition, and settle again.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [x] #4 Roster ID `tailspot-blenny` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [x] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 audit: Species 3D rigged GLB model, behavior profile (src/lib/fish-behavior.ts), locomotion signature (src/rendering/scene/species-locomotion-extensions.ts), Lighthill flex gait (src/rendering/scene/fish-body-flex.ts), and service-link / pause / reduced-motion handling are active in the runtime and verified by automated tests (ACs #4 & #5). Moved from To Do to In Progress.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

Use the reviewed behavior brief to treat rock-perching as a useful staging interpretation for this sheltered-reef blenny, not a sand-burrow behavior. Shared anchor interaction work is AQ-45.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---
<!-- COMMENTS:END -->
