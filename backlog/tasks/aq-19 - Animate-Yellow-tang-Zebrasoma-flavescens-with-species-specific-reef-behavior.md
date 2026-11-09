---
id: AQ-19
title: Animate Yellow tang (Zebrasoma flavescens) with species-specific reef behavior
status: In Progress
assignee:
  - '@render-integration'
created_date: 2026-11-03 04:37
updated_date: '2026-11-08T21:37:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - https://aquarium.org/animals/yellow-tang/
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC12602642/
  - https://www.youtube.com/watch?v=CIMmr-PKn_M&t=30s
  - https://www.youtube.com/watch?v=c2vSKErCqTM&t=0s
  - https://www.youtube.com/watch?v=siSZkVow48Q&t=20s
  - https://www.youtube.com/watch?v=fIiOV0jpDlE&t=13s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: '17'
type: enhancement
ordinal: 17
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
- [x] #4 Roster ID `yellow-tang` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [x] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify real yellow tang identity and timestamped lateral/frontal footage before any anatomy or motion tuning; keep unverifiable guide candidates explicitly unreviewed. 2. Record observed fin root, membrane outline/rays, articulation and turns without inferring numeric gait parameters from unmeasured video. 3. After the shared rig script is released by root, author one bounded review-only pectoral prototype using the licensed yellow tang source, preserving rigid trunk/peduncle work. 4. Render matching lateral/frontal poses and a short articulated cycle outside git with provenance and numerical integrity checks, using four Blender threads; root compares against reference before promotion. No main GLB replacement or Done claim.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 audit: Species 3D rigged GLB model, behavior profile (src/lib/fish-behavior.ts), locomotion signature (src/rendering/scene/species-locomotion-extensions.ts), Lighthill flex gait (src/rendering/scene/fish-body-flex.ts), and service-link / pause / reduced-motion handling are active in the runtime and verified by automated tests (ACs #4 & #5). Moved from To Do to In Progress.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---

author: @render-integration
created: 2026-11-04 03:09

---

Reference gate currently blocked in this worker: CUA exposes Chrome only; IAB unavailable, and one separate Chrome-tab creation timed out. Web text fetch of the candidate YouTube was throttled. Requested root IAB timestamp-visible captures; no real-species footage has yet been verified by this worker. Oregon Coast Aquarium species page confirms pointed snout and large dorsal/anal fins but does not establish pectoral kinematics. Shared rig-candidate.py is held pending root release; no tuning performed.

---

author: @render-integration
created: 2026-11-04 06:18

---

Priority handoff: per latest user direction, stop this species prototype after reference handoff and prioritize AQ40 -> modular bare-rock/coral foundation. No footage was verified by this worker and no pectoral tuning was performed. Root owns IAB reference tab22; latest reported state was preroll, not reviewed yellow-tang motion. Candidate timestamps remain unverified. Keep rig script/main assets unchanged until released and resume species work only after its reference gate and higher-priority foundation work.

---

author: root
created: 2026-11-04T06:29:00Z

---

Queued behind the user-directed AQ40→bare foundation→coral modules→assembly sequence. Earlier source/reference review is preserved; candidate footage has not been verified and no new anatomy/rig tuning or GLB promotion occurred. Resume species work after the foundation gate; no completed work is discarded.

---
<!-- COMMENTS:END -->
