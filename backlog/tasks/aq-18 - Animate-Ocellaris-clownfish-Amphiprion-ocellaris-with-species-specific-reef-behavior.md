---
id: AQ-18
title: >-
  Animate Ocellaris clownfish (Amphiprion ocellaris) with species-specific reef
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
  - https://www.fishbase.se/summary/Amphiprion-ocellaris
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6850181/
  - >-
    https://www.aquariumofpacific.org/onlinelearningcenter/species/clown_anemonefish
  - AQ-45
  - https://www.youtube.com/watch?v=MUMX7u7v2uY&t=11s
  - https://www.youtube.com/watch?v=mw-2yWO6WLY&t=7s
  - https://www.youtube.com/watch?v=n_L9ev92miU&t=0s
  - https://www.youtube.com/watch?v=dQUe6zCkI0w&t=10s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: '16'
type: enhancement
ordinal: 16
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
- [x] #4 Roster ID `ocellaris-clownfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
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

Reviewed host evidence clarifies that this fish uses a compatible host anemone (not Acropora); represent a soft home region and natural tentacle overlap rather than a hard biological leash. Shared anchor implementation is tracked in AQ-45.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---

author: root
created: 2026-11-04T02:53:00Z

---

Root limited primary-footage check: https://www.youtube.com/watch?v=MUMX7u7v2uY loads as CLOWNFISH and Anemone by Ocean Pictures, duration1:59, creator describes a family filmed in Thailand. Browser playback actually works; visible still at0:11 shows orange three-bar anemonefish amongst anemone tentacles, and at~0:32 a wider anemone/fish view. This confirms a usable generic clownfish/anemone visual lead, not measured fin Hz/roll/C-start timing or independently established Amphiprion ocellaris identification. Do not restore the old numerical motion claims or mark species-reference AC3 based on this limited check.

---
<!-- COMMENTS:END -->
