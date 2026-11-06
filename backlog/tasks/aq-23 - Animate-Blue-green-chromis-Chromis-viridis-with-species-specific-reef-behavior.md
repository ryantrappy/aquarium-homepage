---
id: AQ-23
title: >-
  Animate Blue-green chromis (Chromis viridis) with species-specific reef
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
  - https://aquarium.org/animals/blue-green-chromis/
  - AQ-41
  - https://www.youtube.com/watch?v=5PkiUZdKrSY&t=5s
  - https://www.youtube.com/watch?v=Ig9cTBsg2CI&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `blue-green-chromis`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is translucent-looking blue-green body and deeply forked tail. Its scene placement is above branching Acropora in a lagoon or reef flat. Animate its distinctive routine as: coordinated school hovering with small independent offsets; on a shared disturbance cue contract and retreat into branches, then re-emerge gradually. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Blue-green chromis (Chromis viridis) visual baseline (translucent-looking blue-green body and deeply forked tail), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: hover as a coordinated school with small individual offsets; on a shared disturbance cue contract and retreat into branching coral, then re-emerge gradually.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `blue-green-chromis` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `blue-green-chromis`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'blue-green-chromis': new URL('../assets/splat-fish/blue-green-chromis.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['blue-green-chromis']` = `3 in (0.48 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['blue-green-chromis']` = `2` (so `fishModelScale('blue-green-chromis')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('blue-green-chromis')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[0])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['blue-green-chromis']`)**:
   - Verify compatible habitat anchors `anchors: ['schoolCenter', 'branchingCoralRefuge']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['blue-green-chromis']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['blue-green-chromis']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('blue-green-chromis') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Active upper-water shoaling above branching Acropora heads (SPECIES_SOCIAL_GROUPING_MODE["blue-green-chromis"] = "shoal") with brisk subcarangiform tail cadence (1.85 Hz pulse) and synchronized retreat into branchingCoralRefuge on explicit group-disturbance events.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`blue-green-chromis`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['blue-green-chromis']`)**:
  - **Habitat Mode & Zone**: `schooling-over-reef`, `upper-reef (depthRange: [0.18, 0.55])`
  - **Locomotion Tuning**: `school-hover (speed: [0.028, 0.09] tankWidths/s, turn: [45, 105] deg/s)`
  - **State Machine**: `idle (2.4–6.4s, 0.28×, schoolCenter), swim (3.1–7.8s, 0.90×, schoolCenter), retreat (0.45–1.25s, 1.7×, destination: branchingCoralRefuge)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.95, swim: 1.26, forage: 1.28, display: 1.34, burst: 1.62, retreat: 1.75 }, pulse: 0.11 @ 1.85 Hz, trigger: foraging-opportunity every 6.5s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 3.0 in (0.48 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `crevice-refuge-hold & social grouping: shoal (neighborRadius: 2.2, cohesion: 0.24, alignment: 0.22)`
- **Verification Commands**:
  - `npx vitest run src/lib/fish-behavior.test.ts src/rendering/scene/species-locomotion-extensions.test.ts src/rendering/scene/habitat-anchor-interactions.test.ts src/rendering/scene/fish-scale.test.ts`
<!-- SECTION:NOTES:END -->



## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

For this school-specific behavior, keep the disturbance cue scoped to the blue-green chromis group and its compatible branching-coral refuge. A single AQ-13 service activation affects only that selected fish, not the whole aquarium.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---
<!-- COMMENTS:END -->
