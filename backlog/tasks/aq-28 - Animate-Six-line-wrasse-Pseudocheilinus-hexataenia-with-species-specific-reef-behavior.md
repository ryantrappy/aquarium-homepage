---
id: AQ-28
title: >-
  Animate Six-line wrasse (Pseudocheilinus hexataenia) with species-specific
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
  - https://reeflife.org/species/pseudocheilinus-hexataenia/
  - https://www.fishbase.se/summary/Pseudocheilinus-hexataenia
  - https://www.youtube.com/watch?v=zYXrXtxKRfo&t=25s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `six-line-wrasse`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is six yellow-orange stripes over a blue-mauve body, green tail, and small upper-tail eyespot. Its scene placement is shallow coral branches and reef crevices close to cover. Animate its distinctive routine as: fast sinuous search path weaving through rock gaps, frequent short stops to inspect crevices, and little open-water cruising. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Six-line wrasse (Pseudocheilinus hexataenia) visual baseline (six yellow-orange stripes over a blue-mauve body, green tail, and small upper-tail eyespot), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: follow a fast sinuous search path through rock gaps, stop often to inspect crevices, and stay close to cover instead of cruising through open water.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `six-line-wrasse` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `six-line-wrasse`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'six-line-wrasse': new URL('../assets/splat-fish/six-line-wrasse.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['six-line-wrasse']` = `3 in (0.48 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['six-line-wrasse']` = `2` (so `fishModelScale('six-line-wrasse')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('six-line-wrasse')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[4])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['six-line-wrasse']`)**:
   - Verify compatible habitat anchors `anchors: ['rockCrevice', 'branchingCoralShelter', 'foragingPatch']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['six-line-wrasse']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['six-line-wrasse']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('six-line-wrasse') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Continuous agile weaving through rock crevices, cave arches, and coral branches (swim playbackRate: 1.24, forage: 1.32, opportunityIntervalSeconds: 5.8) inspecting surfaces for micro-crustaceans.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`six-line-wrasse`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['six-line-wrasse']`)**:
  - **Habitat Mode & Zone**: `near-cover-search`, `reef-edge (depthRange: [0.35, 0.78])`
  - **Locomotion Tuning**: `sinuous-cover-search (speed: [0.032, 0.105] tankWidths/s, turn: [70, 145] deg/s)`
  - **State Machine**: `idle (0.8–2.8s, 0.18×, rockCrevice), swim (2.2–5.7s, 1.0×, branchingCoralShelter), forage (1.1–3.5s, 0.48×, foragingPatch)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.92, swim: 1.24, forage: 1.32, display: 1.35, burst: 1.60, retreat: 1.74 }, pulse: 0.10 @ 1.70 Hz, trigger: foraging-opportunity every 5.8s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 3.0 in (0.48 scene units), clearanceRadius: 0.50 scene units`
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
