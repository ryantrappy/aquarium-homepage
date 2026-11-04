---
id: AQ-24
title: Animate Firefish (Nemateleotris magnifica) with species-specific reef behavior
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-04T02:31:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - https://www.fao.org/fishery/docs/CDrom/bobp/cd1/Bobp/Publns/MAG/021.pdf
  - AQ-45
  - https://www.youtube.com/watch?v=HKvHrVIDGjY&t=11s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `firefish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is pale front shading to red rear, extremely elongated first dorsal fin, and rounded tail. Its scene placement is suspended over a sandy reef-slope burrow. Animate its distinctive routine as: signature hover with visible dorsal-fin flick and small corrections, fast direct retreat into the burrow, then cautious reappearance. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Firefish (Nemateleotris magnifica) visual baseline (pale front shading to red rear, elongated first dorsal fin, and rounded tail), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hover over a burrow with visible dorsal-fin flicks and small corrections, dart directly into the burrow when startled, then reappear cautiously.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `firefish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
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

Use the reviewed behavior brief to distinguish firefish hovering above a sand-burrow entrance from the goby's entrance lookout; shared anchor interaction work is AQ-45.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---
<!-- COMMENTS:END -->
