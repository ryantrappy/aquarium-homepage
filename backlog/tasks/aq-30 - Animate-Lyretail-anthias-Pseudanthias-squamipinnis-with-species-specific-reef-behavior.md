---
id: AQ-30
title: >-
  Animate Lyretail anthias (Pseudanthias squamipinnis) with species-specific
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
  - https://aquarium.org/animals/lyretail-anthias/
  - https://www.youtube.com/watch?v=ER43oQdsEfE&t=115s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `lyretail-anthias`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult female baseline, bright orange with purple stripe below the eye; a male variant needs its distinct color and elongated dorsal spine. Its scene placement is above a coral outcrop on a clear lagoon or outer reef slope. Animate its distinctive routine as: loose group making flowing short passes and turns, then returning to the same vertical zone around its home outcrop. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Lyretail anthias (Pseudanthias squamipinnis) visual baseline (adult female baseline, bright orange with a purple stripe below the eye), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: move as a loose group in flowing short passes and turns, then return to the same vertical zone around the home outcrop.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `lyretail-anthias` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `lyretail-anthias`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'lyretail-anthias': new URL('../assets/splat-fish/lyretail-anthias.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['lyretail-anthias']` = `4.5 in (0.72 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['lyretail-anthias']` = `2` (so `fishModelScale('lyretail-anthias')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('lyretail-anthias')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[6])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['lyretail-anthias']`)**:
   - Verify compatible habitat anchors `anchors: ['coralOutcrop', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['lyretail-anthias']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['lyretail-anthias']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('lyretail-anthias') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Active current-facing upper-reef aggregation hovering (SPECIES_SOCIAL_GROUPING_MODE["lyretail-anthias"] = "harem-aggregation", swim playbackRate: 1.28, 1.8 Hz pulse) above coralOutcrop ledges with quick plankton snaps and rapid retreat into rockCrevice.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`lyretail-anthias`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['lyretail-anthias']`)**:
  - **Habitat Mode & Zone**: `schooling-over-reef`, `midwater (depthRange: [0.26, 0.66])`
  - **Locomotion Tuning**: `loose-group-cruise (speed: [0.035, 0.10] tankWidths/s, turn: [48, 108] deg/s)`
  - **State Machine**: `idle (1.5–4.4s, 0.22×, coralOutcrop), swim (3.0–7.2s, 0.95×, schoolCenter), forage (1.6–4.5s, 0.70×, foragingPatch)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.96, swim: 1.28, forage: 1.30, display: 1.42, burst: 1.62, retreat: 1.76 }, pulse: 0.12 @ 1.80 Hz, trigger: display-opportunity every 6.8s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 4.5 in (or 2.5 in adult female baseline = 0.40 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `crevice-refuge-hold & social grouping: harem-aggregation (neighborRadius: 2.0, cohesion: 0.18, alignment: 0.16)`
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
