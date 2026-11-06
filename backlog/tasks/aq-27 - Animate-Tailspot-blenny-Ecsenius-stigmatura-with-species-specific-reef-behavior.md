---
id: AQ-27
title: >-
  Animate Tailspot blenny (Ecsenius stigmatura) with species-specific reef
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
  - >-
    https://baliwildlife.com/encyclopedia/marine-life/ray-finned-fishes/blennies/tailspot-blenny-ecsenius-stigmatura/
  - AQ-45
  - https://www.youtube.com/watch?v=2hL5ojGRuQc&t=30s
  - https://www.youtube.com/watch?v=K0_8PBYciJ0&t=0s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `tailspot-blenny`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is small elongated beige-to-brown body with a distinctive dark spot at the tail base. Its scene placement is near hard coral, rock, and holes in a coral-rich lagoon or outer reef. Animate its distinctive routine as: perch near rock, make alert head turns and short darting repositioning, then settle again. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Tailspot blenny (Ecsenius stigmatura) visual baseline (small elongated beige-to-brown body with a distinctive dark spot at the tail base), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: perch near rock, make alert head turns, dart a short distance to reposition, and settle again.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `tailspot-blenny` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `tailspot-blenny`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'tailspot-blenny': new URL('../assets/splat-fish/tailspot-blenny.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['tailspot-blenny']` = `2.25 in (0.36 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['tailspot-blenny']` = `2` (so `fishModelScale('tailspot-blenny')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('tailspot-blenny')`).
   - **Code-Driven 3D Generator**: `scripts/build-splat-fish-glbs.mjs (SPECIES_SPECS[3])` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['tailspot-blenny']`)**:
   - Verify compatible habitat anchors `anchors: ['rockPerch', 'rockCrevice', 'grazingSurface']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['tailspot-blenny']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['tailspot-blenny']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('tailspot-blenny') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Perched head-up station-keeping on rockPerch ledges (idle playbackRate: 0.52, pitchOffsetRad: +0.12), short sinuate hops between rock perches, brief algae-scraping pecks at grazingSurface, and backing into rockCrevice holes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`tailspot-blenny`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['tailspot-blenny']`)**:
  - **Habitat Mode & Zone**: `near-cover-search`, `lower-reef (depthRange: [0.48, 0.86])`
  - **Locomotion Tuning**: `near-rock-darts (speed: [0.012, 0.055] tankWidths/s, turn: [48, 112] deg/s)`
  - **State Machine**: `idle (2.4–7.0s, 0.10×, rockPerch), swim (0.9–2.8s, 0.82×, rockPerch)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.52, swim: 1.16, forage: 1.24, display: 1.18, burst: 1.52, retreat: 1.68 }, pulse: 0.08 @ 1.30 Hz, trigger: foraging-opportunity every 6.5s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 2.25 in (0.36 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `rock-perch-station (perched head-up pitchOffsetRad: +0.12 rad, forage nip: -0.14 rad)`
- **Verification Commands**:
  - `npx vitest run src/lib/fish-behavior.test.ts src/rendering/scene/species-locomotion-extensions.test.ts src/rendering/scene/habitat-anchor-interactions.test.ts src/rendering/scene/fish-scale.test.ts`
<!-- SECTION:NOTES:END -->



## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

Use the reviewed behavior brief to treat rock-perching as a useful staging interpretation for this sheltered-reef blenny, not a sand-burrow behavior. Shared anchor interaction work is AQ-45.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---
<!-- COMMENTS:END -->
