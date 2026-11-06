---
id: AQ-29
title: >-
  Animate McCosker's flasher wrasse (Paracheilinus mccoskeri) with
  species-specific reef behavior
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
  - https://www.mrc.gov.mv/assets/Uploads/fishes-of-the-maldives.pdf
  - https://www.youtube.com/watch?v=b3lKey6ZfiA&t=0s
  - https://www.youtube.com/watch?v=TXiFcyosy5A&t=15s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `mccoskers-flasher-wrasse`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult male orange ground color, blue line pattern, and extended dorsal rays; female is plainer. Its scene placement is midwater over reef-slope rubble and coral just above the substrate. Animate its distinctive routine as: lively patrol above rubble, occasional sharp courtship ascent with fins flared, then return to the display area; keep the display occasional. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the McCosker's flasher wrasse (Paracheilinus mccoskeri) visual baseline (adult male orange ground color, blue line pattern, and extended dorsal rays), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: patrol midwater above rubble, make an occasional sharp courtship ascent with fins flared, then return to the same display area.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `mccoskers-flasher-wrasse` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `mccoskers-flasher-wrasse`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'mccoskers-flasher-wrasse': new URL('../assets/splat-fish/mccoskers-flasher-wrasse.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['mccoskers-flasher-wrasse']` = `2.75 in (0.44 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['mccoskers-flasher-wrasse']` = `2` (so `fishModelScale('mccoskers-flasher-wrasse')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('mccoskers-flasher-wrasse')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[5])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['mccoskers-flasher-wrasse']`)**:
   - Verify compatible habitat anchors `anchors: ['reefSlopeRubble', 'rockCrevice']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['mccoskers-flasher-wrasse']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['mccoskers-flasher-wrasse']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('mccoskers-flasher-wrasse') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Open-water planktivore darting above reefSlopeRubble punctuated by periodic high-cadence nuptial "flashing" display bursts (display playbackRate: 1.55, pulseAmplitude: 0.14, trigger: "display-opportunity" every 6.2s).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`mccoskers-flasher-wrasse`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['mccoskers-flasher-wrasse']`)**:
  - **Habitat Mode & Zone**: `midwater-display`, `midwater (depthRange: [0.36, 0.74])`
  - **Locomotion Tuning**: `reef-slope-patrol (speed: [0.038, 0.11] tankWidths/s, turn: [56, 122] deg/s)`
  - **State Machine**: `idle (1.4–4.2s, 0.18×, reefSlopeRubble), swim (2.8–6.4s, 1.0×, reefSlopeRubble), display (0.8–2.2s, 1.3×, reefSlopeRubble)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.94, swim: 1.22, forage: 1.25, display: 1.55, burst: 1.66, retreat: 1.78 }, pulse: 0.14 @ 1.90 Hz, trigger: display-opportunity every 6.2s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 2.75 in (0.44 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `substrate-grazing-forage / midwater nuptial fin-flashing display`
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
