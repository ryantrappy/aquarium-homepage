---
id: AQ-26
title: >-
  Animate Mandarin dragonet (Synchiropus splendidus) with species-specific reef
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
  - https://aquarium.org/animals/mandarin-goby/
  - >-
    https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-marine-fish/how-to-look-after-dragonets-mandarin-fish/
  - https://www.youtube.com/watch?v=cmNfqfEgsWo&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `mandarin-dragonet`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult orange body with curved green and blue bands outlined in black and blue-edged fins; use a male with elongated first dorsal ray as the default baseline. Its scene placement is close to sand, rubble, and rock crevices on a shallow reef. Animate its distinctive routine as: short stop-start advances between foraging points with frequent pauses and pecks; treat the male fin-extended courtship dance as a separate occasional behavior. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Mandarin dragonet (Synchiropus splendidus) visual baseline (adult orange body with curved green and blue bands outlined in black and blue-edged fins; use the male elongated first dorsal ray baseline), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: move close to the substrate in short stop-start advances between foraging points, pausing to peck; treat the male fin-extended courtship dance as a separate occasional behavior.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `mandarin-dragonet` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `mandarin-dragonet`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'mandarin-dragonet': new URL('../assets/fish/fish-mandarin-dragonet.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['mandarin-dragonet']` = `2.5 in (0.40 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['mandarin-dragonet']` = `0.075044` (so `fishModelScale('mandarin-dragonet')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('mandarin-dragonet')`).
   - **Code-Driven 3D Generator**: `src/rendering/modeling/build_mandarin_dragonet.py` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['mandarin-dragonet']`)**:
   - Verify compatible habitat anchors `anchors: ['foragingPatch', 'reefSlopeRubble', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['mandarin-dragonet']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['mandarin-dragonet']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('mandarin-dragonet') -> 'benthic_percher_dragonet'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: High-frequency pectoral-fin whirring hover (pulseFrequencyHz: 2.4, forage playbackRate: 1.48) with methodical stop-start benthic creeping across live rock and rubble, pausing with nose-down pitch (-0.22 rad) to peck microfauna.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`mandarin-dragonet`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['mandarin-dragonet']`)**:
  - **Habitat Mode & Zone**: `substrate-foraging`, `substrate (depthRange: [0.65, 0.96])`
  - **Locomotion Tuning**: `substrate-stop-start (speed: [0.008, 0.038] tankWidths/s, turn: [42, 96] deg/s)`
  - **State Machine**: `idle (1.8–5.2s, 0.08×, foragingPatch), swim (1.2–3.8s, 0.72×, foragingPatch), forage (1.5–4.6s, 0.28×, foragingPatch)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 1.18, swim: 1.32, forage: 1.48, display: 1.52, burst: 1.58, retreat: 1.65 }, pulse: 0.09 @ 2.40 Hz, trigger: foraging-opportunity every 5.5s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 2.5 in (0.40 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `substrate-grazing-forage (benthic_percher_dragonet rig archetype, nose-down pecks -0.22 rad)`
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
