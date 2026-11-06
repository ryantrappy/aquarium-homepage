---
id: AQ-25
title: >-
  Animate Yellow watchman goby (Cryptocentrus cinctus) with species-specific
  reef behavior
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
priority: medium
type: enhancement
ordinal: 40000
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
- [ ] #4 Roster ID `yellow-watchman-goby` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `yellow-watchman-goby`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'yellow-watchman-goby': new URL('../assets/splat-fish/yellow-watchman-goby.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['yellow-watchman-goby']` = `3 in (0.48 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['yellow-watchman-goby']` = `2` (so `fishModelScale('yellow-watchman-goby')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('yellow-watchman-goby')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[2])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['yellow-watchman-goby']`)**:
   - Verify compatible habitat anchors `anchors: ['sandBurrowEntrance']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['yellow-watchman-goby']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['yellow-watchman-goby']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('yellow-watchman-goby') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Benthic sentinel lookout at sandBurrowEntrance (+0.03 elevation, idle playbackRate: 0.45, pitchOffsetRad: +0.09, yawLockToEntrance: true), short low substrate hops, and rapid backward retreat (reverseRetreat: true) into the burrow without turning around.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`yellow-watchman-goby`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['yellow-watchman-goby']`)**:
  - **Habitat Mode & Zone**: `burrow-associated`, `substrate (depthRange: [0.76, 0.98])`
  - **Locomotion Tuning**: `sand-burrow-hover (speed: [0.006, 0.028] tankWidths/s, turn: [18, 48] deg/s, higherEffortGaits: [short-refuge-dart])`
  - **State Machine**: `idle (3.0–8.0s, 0.12×, sandBurrowEntrance), swim (1.1–3.2s, 0.55×, sandBurrowEntrance), retreat (0.25–0.75s, 2.2×, destination: sandBurrowEntrance)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.45, swim: 1.22, forage: 1.05, display: 1.18, burst: 1.50, retreat: 1.65 }, pulse: 0.05 @ 0.80 Hz, trigger: display-opportunity every 9.0s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 3.0 in (0.48 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `sand-burrow-lookout-back-in (elevation: +0.03, yawLockToEntrance: true, backward retreat reverseRetreat: true)`
- **Verification Commands**:
  - `npx vitest run src/lib/fish-behavior.test.ts src/rendering/scene/species-locomotion-extensions.test.ts src/rendering/scene/habitat-anchor-interactions.test.ts src/rendering/scene/fish-scale.test.ts`
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
