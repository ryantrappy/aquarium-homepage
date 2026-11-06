---
id: AQ-22
title: >-
  Animate Banggai cardinalfish (Pterapogon kauderni) with species-specific reef
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
  - https://aquarium.org/animals/banggai-cardinalfish/
  - https://www.youtube.com/watch?v=3qOfVLtuEWY&t=0s
  - https://www.youtube.com/watch?v=_Uxl7noP_3A&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `banggai-cardinalfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is non-brooding adult silver body with black bars, white spots, tasselled first dorsal fin, and long fin rays. Its scene placement is among vertical branching coral or seagrass in a shallow sheltered bay or harbor. Animate its distinctive routine as: composed hover, gentle fin paddling, and slight vertical adjustment; preserve readability of the distinctive long fin rays. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Banggai cardinalfish (Pterapogon kauderni) visual baseline (non-brooding adult silver body with black bars, white spots, tasselled first dorsal fin, and long fin rays), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hold a composed hover with gentle fin paddling and slight vertical adjustments while keeping the long fin rays readable.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `banggai-cardinalfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `banggai-cardinalfish`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'banggai-cardinalfish': new URL('../assets/fish/fish-banggai-cardinalfish.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['banggai-cardinalfish']` = `2.75 in (0.44 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['banggai-cardinalfish']` = `0.082699` (so `fishModelScale('banggai-cardinalfish')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('banggai-cardinalfish')`).
   - **Code-Driven 3D Generator**: `src/rendering/modeling/build_banggai_cardinalfish.py` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['banggai-cardinalfish']`)**:
   - Verify compatible habitat anchors `anchors: ['seagrassEdge', 'branchingCoralShelter', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['banggai-cardinalfish']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['banggai-cardinalfish']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('banggai-cardinalfish') -> 'banner_hoverer'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Calm, upright mid/lower-water hovering (idle: 0.52, swim: 0.88, pulseAmplitude: 0.04) with minimal axial body undulation so the tall streaming dorsal and anal banners remain poised, plus hover-group social spacing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`banggai-cardinalfish`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['banggai-cardinalfish']`)**:
  - **Habitat Mode & Zone**: `sheltered-reef`, `upper-reef (depthRange: [0.20, 0.58])`
  - **Locomotion Tuning**: `fin-hover (speed: [0.012, 0.04] tankWidths/s, turn: [22, 56] deg/s)`
  - **State Machine**: `idle (2.8–7.2s, 0.18×, branchingCoralShelter), swim (1.8–4.4s, 0.58×, seagrassEdge), forage (1.2–3.2s, 0.30×, foragingPatch)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.52, swim: 0.88, forage: 0.94, display: 0.98, burst: 1.35, retreat: 1.45 }, pulse: 0.04 @ 0.65 Hz, trigger: display-opportunity every 10.0s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 2.75 in (0.44 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `crevice-refuge-hold & social grouping: hover-group (neighborRadius: 1.6)`
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
