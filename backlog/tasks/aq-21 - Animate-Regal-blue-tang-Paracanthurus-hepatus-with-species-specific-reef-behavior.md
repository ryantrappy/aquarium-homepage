---
id: AQ-21
title: >-
  Animate Regal blue tang (Paracanthurus hepatus) with species-specific reef
  behavior
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
  - https://aquarium.org/animals/blue-tang/
  - >-
    https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/
  - https://www.marinespecies.org/aphia.php?id=219676&p=taxdetails
  - https://www.youtube.com/watch?v=azxKu-FJhyQ&t=38s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `blue-tang`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected visual baseline is the adult regal blue tang: vivid blue body, curved black palette marking, and yellow tail, checked against the Australian Museum reference. Place it in clear water near seaward reef structure, where loose aggregations may move above the reef and retreating juveniles or subadults can shelter among branching coral per the WoRMS ecological notes. Animate a sustained but agile pectoral-fin-driven cruise with quick turns and occasional retreat toward coral; avoid tail-dominant body sway. These animation details are design inferences from cited references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Regal blue tang (Paracanthurus hepatus) visual baseline (adult vivid blue body, curved black palette marking, and yellow tail), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: sustain an agile pectoral-fin-driven cruise with quick turns and occasional retreat toward nearby branching coral; avoid tail-dominant body sway.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `blue-tang` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `blue-tang`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'blue-tang': new URL('../assets/fish/fish-blue-tang.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['blue-tang']` = `9 in (1.44 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['blue-tang']` = `0.152686` (so `fishModelScale('blue-tang')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('blue-tang')`).
   - **Code-Driven 3D Generator**: `src/rendering/modeling/build_blue_tang.py` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['blue-tang']`)**:
   - Verify compatible habitat anchors `anchors: ['schoolCenter', 'branchingCoralShelter', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['blue-tang']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['blue-tang']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('blue-tang') -> 'labriform_cruiser'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Broad, high-energy upper/mid-water reef-face cruising powered by yellow-tipped pectoral rowing (MAX_PECTORAL_GAIN = 1.15) with caudal bursts during sweeping turns and adult crevice/coral shelter routing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`blue-tang`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['blue-tang']`)**:
  - **Habitat Mode & Zone**: `open-reef-cruise`, `midwater (depthRange: [0.22, 0.62])`
  - **Locomotion Tuning**: `pectoral-cruise (speed: [0.055, 0.14] tankWidths/s, turn: [58, 118] deg/s, higherEffortGaits: [body-caudal-undulation])`
  - **State Machine**: `idle (1.2–3.6s, 0.20×, schoolCenter), swim (3.4–8.2s, 1.0×), retreat (0.3–0.85s, 2.1×, destination: branchingCoralRefuge, eligibility: juvenile-or-subadult)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.82, swim: 1.18, forage: 1.22, display: 1.30, burst: 1.65, retreat: 1.78 }, pulse: 0.09 @ 1.25 Hz, trigger: foraging-opportunity every 6.5s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 9.0 in (1.44 scene units), clearanceRadius: 0.77 scene units`
  - **Anchor Interaction Category**: `crevice-refuge-hold (labriform_cruiser pectoral gain: 1.15×)`
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
