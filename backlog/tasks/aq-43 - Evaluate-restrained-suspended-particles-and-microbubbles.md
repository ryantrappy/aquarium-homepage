---
id: AQ-43
title: Evaluate restrained suspended particles and microbubbles
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 12:34
updated_date: '2026-11-08T18:45:00Z'
labels:
  - good-for-parallel-work
dependencies:
  - AQ-34
  - AQ-14.2
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/underwater-optics.ts
documentation:
  - docs/open-source-asset-and-motion-research.md
priority: '34'
type: enhancement
ordinal: 34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The planning reference suggests marine snow and microbubbles carried by water flow. A clear home aquarium may need little or none; evaluate realism without reducing the clear deep-focus composition.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Evaluate reference observations and select appropriate particle types, density, motion and visibility or document why the effect is omitted. **Amended 2026-11-08 (approved by Ryan):** two sparse emitter-anchored bubble streams (≤16 per stream, ≤32 total) and 48 depth-graded motes are selected; the original >30-particle and bubble-column omissions below are struck with reasons, not silently deleted.
- [ ] #2 Implement any selected effect with bounded resource use and working pause and reduced-motion behavior.
- [ ] #3 Review fish visibility and performance at 402x874 and 1440x900.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Evaluation of Particle Types, Density, Motion & Visibility (AC #1)
Per `docs/open-source-asset-and-motion-research.md` §6.4 and our front-on tank clarity rules (`docs/design-principles.md`):
1. **Amendment 2026-11-08 (approved by Ryan) — original omissions struck, with reasons**:
   - **~~Rising Air-Stone / Skimmer Bubble Columns: Omit continuous rising bubble streams.~~** Struck: the amended design is not a continuous air-stone column. Two sparse streams (≤16 bubbles each, ≤32 total) rise from emitters anchored at the live-rock island bases — the left stream at the host-anemone mount's island — where reef outgassing naturally occurs, not from an air stone. Bubbles are small, faint (`size: 0.035`, `opacity: 0.4`, normal blending, never additive), recycle below the surface, and at any moment most slots sit near the rock; they do not form a column, irritate coral, or compete with fish and service-link badges. If visual review finds the anemone stream competing with the clownfish, cut that stream to 8 bubbles or drop it.
   - **~~High-Density "Marine Snow" (>30 particles): Omit dense snowfields.~~** Struck in part: 48 motes are now allowed, but only as a depth-graded split that keeps the fish volume faintest — 16 foreground motes (`size: 0.02`, `opacity: 0.20`, z −1.5..+2.8) and 32 background motes (`size: 0.03`, `opacity: 0.34`, z −4.6..−1.5, behind the fish volume). The density sits where AQ-39's depth cueing already starts (behind the fish), so the crisp front-on deep-focus composition (`AQ-14.2` AC #4) is preserved; no 40–80+ clouding snowfield is permitted.
2. **Selected Restrained Effect (Artistic Tuning Parameters)**:
   - **Particle Type**: Ultra-sparse, fine suspended water-column motes (subtle organic/aragonite specks catching overhead reef light) that give a quiet parallax depth cue between the front glass and the rock islands without clouding the water, plus two sparse bubble streams as amended above.
   - **Bounded Count**: Hard-capped at `DEFAULT_AQUARIUM_OPTICS_CONFIG.maxSuspendedParticles = 48` total motes across the entire tank volume (`src/rendering/scene/underwater-optics.ts`), split 16 foreground / 32 background; bubbles hard-capped at `maxBubbles = 32` (16 per stream).
   - **Size & Opacity (Artistic Inference, Not Measured Biology)**: Small soft-edged points (foreground motes `size: 0.02`, `opacity: 0.20`; background motes `size: 0.03`, `opacity: 0.34`; color `#d8f0ff`, `depthWrite: false`, `transparent: true`) so individual motes never read as opaque white flakes over fish bodies. Bubbles: `size: 0.035`, color `#eaf7ff`, `opacity: 0.4`, normal blending.
   - **Drift Motion (`evaluateSuspendedParticlePosition`)**: Gentle deterministic circulation using `evaluateSuspendedParticlePosition(seedIndex, bounds, elapsedSec, { paused, reducedMotion, zBand })` in `src/rendering/scene/underwater-optics.ts`, with a `zBand` parameter selecting the foreground or background depth band:
     * Horizontal gyre sway (`±0.06 m` in X at `0.35 rad/s`, `±0.04 m` in Z at `0.29 rad/s`) plus slow vertical settling/upwelling wrap (`0.012 * spanY / s`) strictly clamped inside `bounds` (`8%..92%` interior margin so particles never clip through the sandbed at `y = -2.8`, top surface at `y = +2.8`, or rear wall at `z = -5.5`).
   - **Bubble Motion (`evaluateBubblePosition`)**: Deterministic rise from the emitter at `0.25–0.45 m/s` (larger bubbles rise faster, per-bubble size hash), sinusoidal wobble `±0.05 m` in X/Z, recycling to the emitter once `y > 2.5` (below the surface plane at `y = 2.66`), strictly clamped inside `bounds`. Freezes at the static emitter position on pause / `prefers-reduced-motion`.

### 2. Concrete Implementation Steps in `src/rendering/scene/aquarium.ts` (AC #2)
1. **Create Three Pre-Allocated `THREE.Points` Buffers in `createAquarium()`** (amended 2026-11-08):
   - Two mote systems: foreground (`foregroundSuspendedParticles = 16`, `THREE.PointsMaterial({ color: '#d8f0ff', size: 0.02, transparent: true, opacity: 0.20, depthWrite: false })`) and background (`backgroundSuspendedParticles = 32`, `size: 0.03`, `opacity: 0.34`), each with a fixed pre-allocated `Float32Array` position attribute, zero per-frame heap allocations.
   - One bubble system: `maxBubbles = 32` slots (`THREE.PointsMaterial({ color: '#eaf7ff', size: 0.035, transparent: true, opacity: 0.4, depthWrite: false })`), 16 slots per stream. Emitters are derived in `rebuildHabitat()` from the live-rock island placements (one per island; narrow viewports have only the left island, so only one stream — `setDrawRange` hides the unused slots). The left emitter is the anemone stream's fallback: `habitat.anchors` only ever carries `grazingSurface` locations, so no runtime world position for the host-anemone mount exists to resolve; the left-island base is where the anemone sits.
   - Set `raycast = () => {}` on all three `Points` objects so they are completely ignored by `THREE.Raycaster` during fish hover/click selection.
2. **Update Positions in `render()` & Respect Pause / Reduced Motion**:
   - Loop each mote system and call `evaluateSuspendedParticlePosition(i, bounds, elapsedSec, { paused, reducedMotion, zBand })` with the foreground (`z −1.5..+2.8`) or background (`z −4.6..−1.5`) band; loop bubble slots and call `evaluateBubblePosition(seed, emitter, bounds, elapsedSec, { paused, reducedMotion })`.
   - Write positions into the `BufferAttribute` arrays and set `positionAttr.needsUpdate = true` only when the tank is actually moving. When paused or under `prefers-reduced-motion`, the helpers deterministically return static positions.
3. **Cleanup in `dispose()`**:
   - Dispose all three particle/bubble `BufferGeometry`s and `PointsMaterial`s in `dispose()` to prevent WebGL memory leaks across viewport/context resets.

### 3. Visual & Performance Verification (AC #3)
- Verify at `1440x900` (desktop) and `402x874` (iPhone Pro proxy) that:
  - The 48 depth-graded motes and two sparse bubble streams provide a gentle sense of water volume without distracting from fish silhouettes or service badges; the streams read as sparse rising bubbles from the rock/anemone, not a column; narrow view shows only the left stream.
  - Pausing the tank or enabling `prefers-reduced-motion` immediately freezes all bubble/mote motion.
  - CPU update cost for 80 points is negligible (3 draw calls) and fish picking remains 100% responsive.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Added evaluateSuspendedParticlePosition in src/rendering/scene/underwater-optics.ts (tested in src/rendering/scene/underwater-optics.test.ts) providing bounded, low-density (<=24 particles) marine-snow drift that stays strictly within tank water bounds and freezes deterministically when paused or under prefers-reduced-motion.
- Populated full Implementation Plan in AQ-43 documenting why bubble columns and dense snowfields (>30 particles) are omitted, specifying the exact 24-mote THREE.Points buffer parameters, raycast exclusion (`particles.raycast = () => {}`), and pause/reduced-motion wiring in src/rendering/scene/aquarium.ts.

2026-11-08 (amendment approved by Ryan):
- AQ-43 amended: the bubble-column and >30-particle omissions in §1 are struck with reasons; two sparse emitter-anchored bubble streams (≤16 per stream, ≤32 total) and 48 depth-graded motes (16 faint foreground, 32 background) are now selected. Implemented `evaluateBubblePosition` in src/rendering/scene/underwater-optics.ts, the `zBand` parameter on `evaluateSuspendedParticlePosition`, two mote `THREE.Points` systems plus one bubble `THREE.Points` system in src/rendering/scene/aquarium.ts, and unit tests in src/rendering/scene/underwater-optics.test.ts.
- Anemone anchor note: no runtime world position for the host-anemone mount exists (`habitat.anchors` only carries `grazingSurface` locations), so the left bubble stream falls back to the left-island base, where the anemone mount lives. Per-point bubble size growth with height was not implemented (`THREE.PointsMaterial` has a single size; a custom shader was out of scope) — the size/speed hash correlation carries the size cue instead.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04T02:32:00Z

---

Research doc treats particle counts, pixel sizes, opacity, and gyre motion as artistic parameters; prior numeric marine-snow/copepod density claims were unmeasured. No natural particle-density claim is made.

---
<!-- COMMENTS:END -->
