---
id: AQ-25
title: >-
  Animate Yellow watchman goby (Cryptocentrus cinctus) with species-specific
  reef behavior
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
    https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/
  - >-
    https://lifg.australian.museum/Group.html?groupId=BDBaE9qK&hierarchyId=CEJQQmVx
  - AQ-45
  - https://www.youtube.com/watch?v=Sbdm-LApMdg&t=0s
  - https://www.youtube.com/watch?v=vHaQdhewngI&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: '31'
type: enhancement
ordinal: 31
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `yellow-watchman-goby`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is yellow form with pale blue-white spots on the head. Its scene placement is low on the sandy reef floor at a shared burrow entrance. Animate its distinctive routine as: hold a low lookout perch with head and eye tracking, dart backward into the burrow, and make short returns to the entrance. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Yellow watchman goby (Cryptocentrus cinctus) visual baseline (yellow form with pale blue-white spots on the head), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hold a low lookout perch at the burrow entrance, track with head and eyes, dart backward into the burrow, and make short returns to its entrance.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [x] #4 Roster ID `yellow-watchman-goby` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
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

Use the reviewed behavior brief to keep this sand-burrow sentry distinct from firefish hovering above the entrance and tailspot blenny near rock. Shared anchor interaction work is AQ-45.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---
<!-- COMMENTS:END -->
