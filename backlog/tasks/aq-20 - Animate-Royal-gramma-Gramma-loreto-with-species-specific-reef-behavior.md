---
id: AQ-20
title: Animate Royal gramma (Gramma loreto) with species-specific reef behavior
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-04T02:31:00Z'
labels: []
dependencies:
  - AQ-12
references:
  - https://www.saltcorner.com/AquariumLibrary/browsespecies.php?CritterID=195
  - https://www.youtube.com/watch?v=ILqLqAAEGLc&t=60s
  - https://www.youtube.com/watch?v=FJOreYB0Knk&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `royal-gramma`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult purple forebody and yellow rear half. Its scene placement is near a cave, ledge, or rocky overhang. Animate its distinctive routine as: hover just outside a crevice, reorient head-up or head-down against the rock plane and occasionally swim inverted, make a compact inspection loop, then return to the same refuge. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the adult Royal gramma baseline (Gramma loreto) and its diagnostic traits above, reviewed against the linked species references.
- [ ] #2 Its characteristic motion is visibly distinct and follows this task's behavior brief: hover just outside a crevice, reorient head-up or head-down against the rock plane and occasionally swim inverted, make a compact inspection loop, then return to the same refuge.
- [ ] #3 Swimming shows coordinated body deformation, fin and tail propulsion, and biologically plausible turns rather than rigid image translation; compare motion with available real-species reference clips during review.
- [ ] #4 The fish uses its reef placement and shelter/foraging pattern described above, remains within the aquarium, and retains its correct service assignment, readable label, and usable click target.
- [ ] #5 Global pause, hidden-page stopping, and reduced-motion behavior remain supported for this fish without breaking its service link.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `royal-gramma`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'royal-gramma': new URL('../assets/fish/fish-royal-gramma.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['royal-gramma']` = `2.75 in (0.44 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['royal-gramma']` = `0.082187` (so `fishModelScale('royal-gramma')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('royal-gramma')`).
   - **Code-Driven 3D Generator**: `src/rendering/modeling/build_royal_gramma.py` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['royal-gramma']`)**:
   - Verify compatible habitat anchors `anchors: ['rockCrevice', 'foragingPatch']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['royal-gramma']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['royal-gramma']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('royal-gramma') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Close cave/overhang station-keeping near rockCrevice anchors (left-island cave arch and ledges), low-speed hovering (idle: 0.68, swim: 1.06), brief planktivorous darts, and rapid retreat into crevices on threat cues.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`royal-gramma`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['royal-gramma']`)**:
  - **Habitat Mode & Zone**: `sheltered-reef`, `lower-reef (depthRange: [0.48, 0.88])`
  - **Locomotion Tuning**: `fin-hover (speed: [0.018, 0.058] tankWidths/s, turn: [38, 92] deg/s)`
  - **State Machine**: `idle (1.8–5.2s, 0.22×, rockCrevice), swim (2.4–5.5s, 0.82×, rockCrevice), forage (1.2–3.8s, 0.42×, foragingPatch), retreat (0.45–1.1s, 1.5×, destination: rockCrevice)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.68, swim: 1.06, forage: 1.08, display: 1.26, burst: 1.52, retreat: 1.68 }, pulse: 0.07 @ 0.95 Hz, trigger: display-opportunity every 8.5s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 2.75 in (0.44 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `crevice-refuge-hold / substrate-grazing-forage`
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
