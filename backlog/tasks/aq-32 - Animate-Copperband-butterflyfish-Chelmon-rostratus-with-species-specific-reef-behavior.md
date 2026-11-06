---
id: AQ-32
title: >-
  Animate Copperband butterflyfish (Chelmon rostratus) with species-specific
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
    https://zoo.ch/en/conservation/animal-and-plant-encyclopedia/copperband-butterflyfish
  - https://dwazoo.com/animal/copperband-butterflyfish/
  - https://www.youtube.com/watch?v=W32sNeT1qbk&t=35s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `copperband-butterflyfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is silver-white compressed disc with four copper-orange bands edged in black, elongated snout, and dorsal eyespot. Its scene placement is along rocky shore or sheltered inner reef with sandy or silty areas. Animate its distinctive routine as: deliberate smooth reef-edge patrol, pause to angle its snout into holes, then pivot measurably toward the next crevice; keep large pectoral fins and compressed profile readable. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Copperband butterflyfish (Chelmon rostratus) visual baseline (silver-white compressed disc with four copper-orange bands edged in black, elongated snout, and dorsal eyespot), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: patrol smoothly along reef structure, pause and angle the snout into crevices, then pivot toward the next hole while keeping the large pectoral fins and compressed profile readable.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `copperband-butterflyfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `copperband-butterflyfish`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'copperband-butterflyfish': new URL('../assets/splat-fish/copperband-butterflyfish.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['copperband-butterflyfish']` = `6.5 in (1.04 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['copperband-butterflyfish']` = `2` (so `fishModelScale('copperband-butterflyfish')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('copperband-butterflyfish')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[8])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['copperband-butterflyfish']`)**:
   - Verify compatible habitat anchors `anchors: ['rockCrevice', 'foragingPatch', 'coralOutcrop']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['copperband-butterflyfish']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['copperband-butterflyfish']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('copperband-butterflyfish') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Unhurried, poised laterally compressed disc gliding (idle: 0.66, swim: 0.94, 0.85 Hz pulse) with delicate maneuvering, frequent hover stops, and precise nose-down (-0.22 rad) forceps-snout probing into foragingPatch crevices.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`copperband-butterflyfish`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['copperband-butterflyfish']`)**:
  - **Habitat Mode & Zone**: `near-cover-search`, `reef-edge (depthRange: [0.40, 0.84])`
  - **Locomotion Tuning**: `crevice-inspection (speed: [0.022, 0.068] tankWidths/s, turn: [30, 74] deg/s)`
  - **State Machine**: `idle (1.3–4.2s, 0.16×, rockCrevice), swim (3.0–7.3s, 0.88×, rockCrevice), forage (1.5–4.2s, 0.32×, foragingPatch)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.66, swim: 0.94, forage: 1.06, display: 1.08, burst: 1.38, retreat: 1.52 }, pulse: 0.06 @ 0.85 Hz, trigger: foraging-opportunity every 7.2s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 6.5 in (1.04 scene units), clearanceRadius: 0.57 scene units`
  - **Anchor Interaction Category**: `substrate-grazing-forage (delicate forceps-snout crevice probing at -0.22 rad)`
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
<!-- COMMENTS:END -->
