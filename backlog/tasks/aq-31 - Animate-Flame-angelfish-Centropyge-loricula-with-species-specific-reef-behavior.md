---
id: AQ-31
title: >-
  Animate Flame angelfish (Centropyge loricula) with species-specific reef
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
  - https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2591
  - https://www.youtube.com/watch?v=dtXJ9GocYq4&t=15s
  - https://www.youtube.com/watch?v=TFjoIJrNIe4&t=40s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `flame-angelfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is brilliant orange-red body with black bars and blue-violet edging on rear dorsal and anal fins. Its scene placement is sheltered coral area with nearby rock or coral structure. Animate its distinctive routine as: compact loops around shelter with brief grazing pecks and retreats into cover; keep it moving more continuously than burrow-perching gobies while keeping the orbit tied to refuge. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Flame angelfish (Centropyge loricula) visual baseline (orange-red body with black bars and blue-violet edging on the rear dorsal and anal fins), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: make compact loops around shelter, pause for grazing pecks, and retreat into cover; keep the orbit tied to the refuge.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `flame-angelfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `flame-angelfish`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'flame-angelfish': new URL('../assets/splat-fish/flame-angelfish.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['flame-angelfish']` = `3.75 in (0.60 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['flame-angelfish']` = `2` (so `fishModelScale('flame-angelfish')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('flame-angelfish')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[7])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['flame-angelfish']`)**:
   - Verify compatible habitat anchors `anchors: ['rockCrevice', 'grazingSurface', 'coralOutcrop']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['flame-angelfish']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['flame-angelfish']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('flame-angelfish') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Agile contour-hugging patrols closely weaving in and out of live-rock arches and overhangs, pausing frequently with nose-down pitch (-0.22 rad) to nip microalgae and sponge film from grazingSurface anchors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`flame-angelfish`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['flame-angelfish']`)**:
  - **Habitat Mode & Zone**: `sheltered-reef`, `reef-edge (depthRange: [0.40, 0.82])`
  - **Locomotion Tuning**: `compact-reef-orbit (speed: [0.024, 0.075] tankWidths/s, turn: [42, 96] deg/s)`
  - **State Machine**: `idle (1.2–3.6s, 0.18×, rockCrevice), swim (2.6–6.1s, 0.95×, rockCrevice), forage (1.4–4.1s, 0.42×, grazingSurface)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.84, swim: 1.14, forage: 1.22, display: 1.26, burst: 1.54, retreat: 1.70 }, pulse: 0.08 @ 1.20 Hz, trigger: foraging-opportunity every 6.4s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 3.75 in (0.60 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `substrate-grazing-forage (nose-down grazing pecks -0.22 rad) & crevice-refuge-hold`
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
