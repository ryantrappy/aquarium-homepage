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
ordinal: 37000
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `firefish`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'firefish': new URL('../assets/splat-fish/firefish.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['firefish']` = `2.75 in (0.44 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['firefish']` = `2` (so `fishModelScale('firefish')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('firefish')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[1])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['firefish']`)**:
   - Verify compatible habitat anchors `anchors: ['sandBurrowEntrance', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['firefish']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['firefish']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('firefish') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Station-keeping hover +0.18 units above sandBurrowEntrance facing into the current with rhythmic first-dorsal pennant flicks (pulseAmplitude: 0.16, 1.45 Hz) and head-first bolt (reverseRetreat = false, pitchOffsetRad = -0.24) into the burrow entrance on startle/retreat.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`firefish`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['firefish']`)**:
  - **Habitat Mode & Zone**: `burrow-associated`, `lower-reef (depthRange: [0.48, 0.82])`
  - **Locomotion Tuning**: `sand-burrow-hover (speed: [0.018, 0.065] tankWidths/s, turn: [52, 120] deg/s, higherEffortGaits: [short-refuge-dart])`
  - **State Machine**: `idle (2.6–6.6s, 0.24×, sandBurrowEntrance), swim (1.8–4.8s, 0.72×, sandBurrowEntrance), retreat (0.25–0.72s, 2.5×, destination: sandBurrowEntrance)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.72, swim: 1.08, forage: 1.10, display: 1.28, burst: 1.68, retreat: 1.82 }, pulse: 0.16 @ 1.45 Hz, trigger: display-opportunity every 7.0s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 2.75 in (0.44 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `sand-burrow-hover-bolt (hoverHeight: +0.18, head-first bolt reverseRetreat: false)`
- **Verification Commands**:
  - `npx vitest run src/lib/fish-behavior.test.ts src/rendering/scene/species-locomotion-extensions.test.ts src/rendering/scene/habitat-anchor-interactions.test.ts src/rendering/scene/fish-scale.test.ts`
<!-- SECTION:NOTES:END -->



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
