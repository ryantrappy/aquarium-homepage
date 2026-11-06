---
id: AQ-18
title: >-
  Animate Ocellaris clownfish (Amphiprion ocellaris) with species-specific reef
  behavior
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 04:37
updated_date: '2026-11-04T02:53:00Z'
labels:
  - reef-fish
  - animation
dependencies:
  - AQ-12
references:
  - https://www.fishbase.se/summary/Amphiprion-ocellaris
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6850181/
  - >-
    https://www.aquariumofpacific.org/onlinelearningcenter/species/clown_anemonefish
  - AQ-45
  - https://www.youtube.com/watch?v=MUMX7u7v2uY&t=11s
  - https://www.youtube.com/watch?v=mw-2yWO6WLY&t=7s
  - https://www.youtube.com/watch?v=n_L9ev92miU&t=0s
  - https://www.youtube.com/watch?v=dQUe6zCkI0w&t=10s
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - docs/fish-behavior-design.md
  - docs/open-source-asset-and-motion-research.md
priority: high
type: enhancement
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Roster ID: `ocellaris-clownfish`. Implement this fish as an independently reviewable species task following [docs/reef-fish-roster.md](docs/reef-fish-roster.md). The selected adult visual baseline is adult orange compact oval body with three clear white bars. Its scene placement is beside a host anemone in a shallow calm reef or lagoon. Animate its distinctive routine as: small bobbing station-keeping loops among the tentacles, brief peeks out, and short returns to the same host zone; avoid long open-water transits. These animation details are design inferences from the cited biological and habitat references, not measured speed or fin-beat claims. Use visual references to establish anatomy and behavior; production assets must follow the licensed asset direction in AQ-5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The rendered fish visibly matches the Ocellaris clownfish (Amphiprion ocellaris) visual baseline (adult orange compact oval body with three white bars), checked against the species references linked on this task.
- [ ] #2 Its species-specific behavior is visible: make small bobbing station-keeping loops among anemone tentacles, peek briefly out, and return to the same host zone instead of taking long open-water transits.
- [ ] #3 Real-species video review confirms visible body and fin articulation appropriate to this fish, plausible turns, and any natural hovering or pauses; rigid sprite sliding without articulated fish motion does not count.
- [ ] #4 Roster ID `ocellaris-clownfish` is available as a fish choice for new and existing services and maps to the correct fish, readable label, and service link; the fish occupies its described habitat position and stays within the aquarium.
- [ ] #5 Shared pause, stopping when the page is hidden, and reduced-motion behavior work for this fish without breaking its service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations for `ocellaris-clownfish`

1. **3D Runtime Asset & Adult Scale Registration**:
   - **Runtime GLB Binding (`src/rendering/scene/aquarium.ts`, `modelUrls` at lines 25–41)**:
     ```ts
     'ocellaris-clownfish': new URL('../proof/candidate-real-clown.glb', import.meta.url).href,
     ```
   - **Adult Size & Swim-Axis Calibration (`src/rendering/scene/fish-scale.ts`, lines 12–49)**:
     - `FISH_RENDER_LENGTH_INCHES['ocellaris-clownfish']` = `3 in (0.48 scene units)`
     - `MODEL_SWIM_AXIS_LENGTH['ocellaris-clownfish']` = `2 (or 0.107098 m on fish-ocellaris-clownfish.glb)` (so `fishModelScale('ocellaris-clownfish')` scales the bind-space `+Z` snout-to-tail extent strictly to `fishRenderLength('ocellaris-clownfish')`).
   - **Code-Driven 3D Generator**: `src/rendering/modeling/build_clownfish.py` (sculpted 3D ring-lofted body with `+Y` dorsal up and `+Z` snout forward, 3D convex cornea eyes, gill opercula, double-sided scalloped rayed fins, and 8-joint `spine_0..spine_5` + `pectoral_L/R` armature).
2. **Typed Species Behavior Profile (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['ocellaris-clownfish']`)**:
   - Verify compatible habitat anchors `anchors: ['hostAnemone']`, depth range preference `depthRange`, cruise speed in tank-widths/sec, turn rate in deg/sec, and state transitions (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`).
3. **Species Locomotion Cadence & Opportunity Extension (`src/rendering/scene/species-locomotion-extensions.ts`, `SPECIES_LOCOMOTION_SIGNATURES['ocellaris-clownfish']`)**:
   - Modulate `AnimationMixer` playback rate per state via `SPECIES_LOCOMOTION_SIGNATURES['ocellaris-clownfish']` and emit periodic `behavior-opportunity` intents into `stepSwimmingFish()` (`src/rendering/scene/motion.ts` lines 192–200).
4. **Biomechanical Turning Rig & Habitat Anchor Interaction (`src/rendering/scene/fish-turning.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
   - Bind `getRigArchetypeForSpecies('ocellaris-clownfish') -> 'subcarangiform_schooler'` in `bindFishTurningRig()` (`src/rendering/scene/fish-turning.ts` line 125) and apply additive post-mixer C/S-wave spine bending and pectoral braking via `applyFishTurningRigOverlay()` (`src/rendering/scene/aquarium.ts` line 330).
   - **Species Behavioral Signature**: Bobbing station-keeping figure-eight loops within softHomeRadius (0.22 units) of hostAnemone (coral-anemone-bta on socket_anemone_crevice_01), brief display peeks outward, and immediate retreat back into the anemone tentacle crown.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters (`ocellaris-clownfish`)

- **Profile Parameters (`src/lib/fish-behavior.ts`, `SPECIES_BEHAVIOR_PROFILES['ocellaris-clownfish']`)**:
  - **Habitat Mode & Zone**: `host-associated`, `upper-reef (depthRange: [0.18, 0.48])`
  - **Locomotion Tuning**: `fin-hover (speed: [0.012, 0.045] tankWidths/s, turn: [28, 72] deg/s)`
  - **State Machine**: `idle (2.2–6.5s, 0.25×, hostAnemone), swim (1.8–4.2s, 0.85×, hostAnemone), retreat (0.35–0.9s, 1.8×, destination: hostAnemone)`
- **Animation Cadence & Triggers (`src/rendering/scene/species-locomotion-extensions.ts`)**:
  - `basePlaybackByState: { idle: 0.92, swim: 1.18, forage: 1.12, display: 1.32, burst: 1.55, retreat: 1.65 }, pulse: 0.14 @ 1.6 Hz, trigger: display-opportunity every 7.5s`
- **Physical Scale & Anchor Interaction (`src/rendering/scene/fish-scale.ts` & `src/rendering/scene/habitat-anchor-interactions.ts`)**:
  - **Scale & Clearance**: `renderLength: 3.0 in (0.48 scene units), clearanceRadius: 0.50 scene units`
  - **Anchor Interaction Category**: `host-anemone-symbiosis (softHomeRadius: 0.22, softTentacleOverlapAllowed: true)`
- **Verification Commands**:
  - `npx vitest run src/lib/fish-behavior.test.ts src/rendering/scene/species-locomotion-extensions.test.ts src/rendering/scene/habitat-anchor-interactions.test.ts src/rendering/scene/fish-scale.test.ts`
<!-- SECTION:NOTES:END -->



## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

Reviewed host evidence clarifies that this fish uses a compatible host anemone (not Acropora); represent a soft home region and natural tentacle overlap rather than a hard biological leash. Shared anchor implementation is tracked in AQ-45.

---

author: @Luna
created: 2026-11-04T02:31:00Z

---

Added candidate video references and the research index. The video clip species and timestamps are still unverified; do not count these references as satisfying the video-review acceptance criterion.

---

author: root
created: 2026-11-04T02:53:00Z

---

Root limited primary-footage check: https://www.youtube.com/watch?v=MUMX7u7v2uY loads as CLOWNFISH and Anemone by Ocean Pictures, duration1:59, creator describes a family filmed in Thailand. Browser playback actually works; visible still at0:11 shows orange three-bar anemonefish amongst anemone tentacles, and at~0:32 a wider anemone/fish view. This confirms a usable generic clownfish/anemone visual lead, not measured fin Hz/roll/C-start timing or independently established Amphiprion ocellaris identification. Do not restore the old numerical motion claims or mark species-reference AC3 based on this limited check.

---
<!-- COMMENTS:END -->
