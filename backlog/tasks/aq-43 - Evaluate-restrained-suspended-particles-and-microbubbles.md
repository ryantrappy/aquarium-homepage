---
id: AQ-43
title: Evaluate restrained suspended particles and microbubbles
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03 12:34'
updated_date: '2026-11-05 07:32'
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
priority: low
type: enhancement
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The planning reference suggests marine snow and microbubbles carried by water flow. A clear home aquarium may need little or none; evaluate realism without reducing the clear deep-focus composition.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Evaluate reference observations and select appropriate particle types, density, motion and visibility or document why the effect is omitted.
- [ ] #2 Implement any selected effect with bounded resource use and working pause and reduced-motion behavior.
- [ ] #3 Review fish visibility and performance at 402x874 and 1440x900.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Evaluation of Particle Types, Density, Motion & Visibility (AC #1)
Per `docs/open-source-asset-and-motion-research.md` §6.4 and our front-on tank clarity rules (`docs/design-principles.md`):
1. **What to Omit (and Why)**:
   - **Rising Air-Stone / Skimmer Bubble Columns**: Omit continuous rising bubble streams. Well-tuned display reef tanks keep microbubble-producing protein skimmers in the sump; visible bubble streams in a display tank read as a cartoon fishbowl cliché, irritate coral tissue, and create bright specular dots that compete directly with fish and service-link badges.
   - **High-Density "Marine Snow" (>30 particles)**: Omit dense snowfields (`40–80+` particles from earlier unverified planning drafts), which make the water look cloudy or unmaintained and degrade the crisp front-on deep-focus composition (`AQ-14.2` AC #4).
2. **Selected Restrained Effect (Artistic Tuning Parameters)**:
   - **Particle Type**: Ultra-sparse, fine suspended water-column motes (subtle organic/aragonite specks catching overhead reef light) that give a quiet parallax depth cue between the front glass and the rock islands without clouding the water.
   - **Bounded Count**: Hard-capped at `DEFAULT_AQUARIUM_OPTICS_CONFIG.maxSuspendedParticles = 24` total motes across the entire tank volume (`src/rendering/scene/underwater-optics.ts`).
   - **Size & Opacity (Artistic Inference, Not Measured Biology)**: Small soft-edged points (`size: 0.022` world units / `~1.5–2.5 CSS px`, color `#e0f2fe`, `opacity: 0.28`, `depthWrite: false`, `transparent: true`) so individual motes never read as opaque white flakes over fish bodies.
   - **Drift Motion (`evaluateSuspendedParticlePosition`)**: Gentle deterministic circulation using `evaluateSuspendedParticlePosition(seedIndex, bounds, elapsedSec, { paused, reducedMotion })` in `src/rendering/scene/underwater-optics.ts`:
     * Horizontal gyre sway (`±0.06 m` in X at `0.35 rad/s`, `±0.04 m` in Z at `0.29 rad/s`) plus slow vertical settling/upwelling wrap (`0.012 * spanY / s`) strictly clamped inside `bounds` (`8%..92%` interior margin so particles never clip through the sandbed at `y = -2.8`, top surface at `y = +2.8`, or rear wall at `z = -5.5`).

### 2. Concrete Implementation Steps in `src/rendering/scene/aquarium.ts` (AC #2)
1. **Create a Single Pre-Allocated `THREE.Points` Buffer in `createAquarium()`**:
   - Allocate one `THREE.BufferGeometry` with a fixed `Float32Array(DEFAULT_AQUARIUM_OPTICS_CONFIG.maxSuspendedParticles * 3)` `position` attribute (`24` vertices total, zero per-frame heap allocations).
   - Use a single `THREE.PointsMaterial({ color: '#e0f2fe', size: 0.022, transparent: true, opacity: 0.28, depthWrite: false })`.
   - Set `particles.raycast = () => {}` so the `THREE.Points` object is completely ignored by `THREE.Raycaster` during fish hover/click selection in `aquarium.ts` (lines 207–215).
2. **Update Positions in `render()` & Respect Pause / Reduced Motion**:
   - In `render()` (around line 217 of `src/rendering/scene/aquarium.ts`), loop `i = 0 .. maxSuspendedParticles - 1` and call:
     ```ts
     const pos = evaluateSuspendedParticlePosition(i, bounds, elapsedSec, {
       paused: isPaused(),
       reducedMotion: reducedMotion.matches,
     })
     ```
   - Write `(pos.x, pos.y, pos.z)` into the `BufferAttribute` array and set `positionAttr.needsUpdate = true` only when `!isPaused() && !reducedMotion.matches`. When paused or under `prefers-reduced-motion`, `evaluateSuspendedParticlePosition` deterministically returns the static base coordinates `(baseX, baseY, baseZ)`.
3. **Cleanup in `dispose()`**:
   - Dispose the particle `BufferGeometry` and `PointsMaterial` inside the `createAquarium` cleanup callback (line 262 of `src/rendering/scene/aquarium.ts`) to prevent WebGL memory leaks across viewport/context resets.

### 3. Visual & Performance Verification (AC #3)
- Verify at `1440x900` (desktop) and `402x874` (iPhone Pro proxy) that:
  - The 24 subtle motes provide a gentle sense of water volume without distracting from fish silhouettes or service badges.
  - Pausing the tank or enabling `prefers-reduced-motion` immediately freezes all particle drift.
  - CPU update cost for 24 points is negligible (`<0.01 ms/frame`, 1 draw call) and fish picking remains 100% responsive.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Added evaluateSuspendedParticlePosition in src/rendering/scene/underwater-optics.ts (tested in src/rendering/scene/underwater-optics.test.ts) providing bounded, low-density (<=24 particles) marine-snow drift that stays strictly within tank water bounds and freezes deterministically when paused or under prefers-reduced-motion.
- Populated full Implementation Plan in AQ-43 documenting why bubble columns and dense snowfields (>30 particles) are omitted, specifying the exact 24-mote THREE.Points buffer parameters, raycast exclusion (`particles.raycast = () => {}`), and pause/reduced-motion wiring in src/rendering/scene/aquarium.ts.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04T02:32:00Z

---

Research doc treats particle counts, pixel sizes, opacity, and gyre motion as artistic parameters; prior numeric marine-snow/copepod density claims were unmeasured. No natural particle-density claim is made.

---
<!-- COMMENTS:END -->
