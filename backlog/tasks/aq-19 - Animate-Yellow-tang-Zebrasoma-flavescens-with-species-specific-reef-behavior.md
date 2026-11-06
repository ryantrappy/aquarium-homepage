---
id: AQ-19
title: Animate Yellow tang (Zebrasoma flavescens) with species-specific reef behavior
status: To Do
assignee:
  - '@render-integration'
created_date: 2026-11-03 04:37
updated_date: '2026-11-04T06:29:00Z'
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
priority: high
type: enhancement
ordinal: 23000
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify real yellow tang identity and timestamped lateral/frontal footage before any anatomy or motion tuning; keep unverifiable guide candidates explicitly unreviewed. 2. Record observed fin root, membrane outline/rays, articulation and turns without inferring numeric gait parameters from unmeasured video. 3. After the shared rig script is released by root, author one bounded review-only pectoral prototype using the licensed yellow tang source, preserving rigid trunk/peduncle work. 4. Render matching lateral/frontal poses and a short articulated cycle outside git with provenance and numerical integrity checks, using four Blender threads; root compares against reference before promotion. No main GLB replacement or Done claim.

### Specific Code Changes & Locations for `yellow-tang`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'yellow-tang': new URL('../proof/candidate-real-tang.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['yellow-tang']` = `6.5 in (1.04 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['yellow-tang']` = `1.985423 (or 0.144611 m on fish-yellow-tang.glb)` (so `fishModelScale('yellow-tang')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('yellow-tang')`).
   - **Code-Driven 3D Generator**: `src/rendering/modeling/build_yellow_tang.py` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['yellow-tang']`)**:
   - Verify compatible habitat anchors `anchors: ['grazingSurface', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['yellow-tang']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['yellow-tang']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('yellow-tang') -> 'labriform_rigid_disc'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Pectoral-driven labriform reef-front cruising with spine_0..spine_2 locked rigid (0 rad in evaluateSpineTurnAngles so tall dorsal/anal sails never shear), caudal flexion restricted to spine_3+, sweeping turns, and nose-down (-0.22 rad) benthic algae grazing pauses at grazingSurface anchors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`yellow-tang`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['yellow-tang']`)**:
  - **Habitat Mode & Zone**: `open-reef-cruise`, `reef-edge (depthRange: [0.22, 0.70])`
  - **Locomotion Tuning**: `pectoral-cruise (speed: [0.045, 0.12] tankWidths/s, turn: [34, 82] deg/s, higherEffortGaits: [body-caudal-undulation, burst-and-coast])`
  - **State Machine**: `idle (1.2–3.8s, 0.15×), swim (3.5–8.5s, 1.0×), forage (1.4–4.5s, 0.35×, grazingSurface), burst (0.4–1.1s, 2.4×)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.78, swim: 1.12, forage: 1.24, display: 1.28, burst: 1.60, retreat: 1.72 }, pulse: 0.08 @ 1.1 Hz, trigger: foraging-opportunity every 6.0s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 6.5 in (1.04 scene units), clearanceRadius: 0.57 scene units`
  - **Anchor Interaction Category**: `substrate-grazing-forage (pitchOffsetRad: -0.22 rad nose-down grazing sweep)`
- **Verification Commands**:
  - `npx vitest run src/lib/fish-behavior.test.ts src/rendering/scene/species-locomotion-extensions.test.ts src/rendering/scene/habitat-anchor-interactions.test.ts src/rendering/scene/fish-scale.test.ts`
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
