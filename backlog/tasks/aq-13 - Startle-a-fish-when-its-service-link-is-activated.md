---
id: AQ-13
title: Startle a fish when its service link is activated
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:15:00Z'
updated_date: '2026-11-04T02:25:00Z'
labels: []
dependencies:
  - AQ-12
  - AQ-44
references:
  - AQ-44
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/fish-behavior-design.md
priority: medium
type: enhancement
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the photorealistic fish animation system from AQ-12 with a realistic startle response. Clicking or keyboard-activating a fish must open its configured service in a new tab immediately, then make only that fish dart away and recover to its species-appropriate swimming behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking or keyboard-activating a fish opens its configured URL in a new tab immediately, without waiting for or being blocked by the animation.
- [ ] #2 Only the activated fish performs a realistic startle response through the AQ-12 animation system: a sudden species-appropriate acceleration and turn followed by a visible recovery to its normal swim.
- [ ] #3 The response retains photorealistic body, fin, and tail motion; it does not substitute a separate rigid sprite translation or generic bounce.
- [ ] #4 The fish label follows the fish and remains readable without flipping or becoming detached.
- [ ] #5 With reduced motion enabled, the link still opens and the fish gives a clear non-spatial acknowledgment instead of darting; other fish keep their normal behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations

1. **Immediate Native Link Activation & Scoped Per-Fish Trigger (`src/components/AquariumScene.tsx`, `activate()` at lines 51–62)**:
   - Keep `onClick` synchronous without calling `event.preventDefault()` on valid hits so the browser opens `target="_blank"` immediately on the user gesture (AC #1).
   - Invoke `controller.current?.activate(selected.id)` and apply the `.is-acknowledged` CSS class for `1000ms` exclusively to the activated fish's `<a>` element (AC #2, #5):
     ```ts
     controller.current?.activate(selected.id)
     anchor.classList.add('is-acknowledged')
     ```
2. **Per-Fish Startle State & Evasive Route Selection (`src/rendering/scene/motion.ts`, `startleFish()` at lines 93–98 & `plan()` at lines 155–173)**:
   - In `startleFish(fish, habitat)`, dispatch `{ type: 'fish-activation', instanceId: fish.id, trigger: fish.speciesId === 'yellow-tang' ? 'high-effort-cue' : 'threat-cue' }`, set `fish.startleSeconds = 0.95`, clear `fish.route = []`, and reset `fish.targetWait = 0` so `plan()` immediately computes a collision-safe evasive vector (`evasiveYaw = fish.yaw ± (0.7 + random(fish) * 0.4)`, distance `1.4` units) without affecting any other fish in `fish[]` (AC #2).
3. **Biomechanical C-Bend & Propulsive Burst Integration (`src/rendering/scene/motion.ts` lines 224–245 & `src/rendering/scene/fish-turning.ts` lines 302–370)**:
   - While `fish.startleSeconds > 0`, boost angular turn rate by `3.0×` (`motion.ts` line 229), speed effort to `2.8×` with rapid acceleration smoothing `dt * 8` (`motion.ts` lines 238–241), and apply `STARTLE_SPINE_BEND_GAIN = 1.25` in `evaluateSpineTurnAngles()` (`fish-turning.ts` line 319) so the 3D `SkinnedMesh` executes a fast C-start flex and smooth recovery rather than a rigid slide (AC #3).
4. **Label Tracking & Reduced-Motion Guard (`src/rendering/scene/aquarium.ts` lines 281–294, 349)**:
   - In `aquarium.ts` `activate(id)` (line 349), guard on `if (!item || paused || document.hidden) return` so reduced-motion/paused states skip spatial darting while preserving the `.is-acknowledged` non-spatial highlight in `src/styles/aquarium.css` (AC #4, #5).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters

- **Active Runtime Implementation**:
  - **Immediate Link Opening**: `AquariumScene.tsx` `activate()` (lines 51–62) leaves the native `<a target="_blank" rel="noreferrer">` click unblocked on visible hits, adds `.is-acknowledged` for `1000ms`, and calls `controller.current?.activate(selected.id)` synchronously.
  - **Isolated Per-Fish Startle**: `aquarium.ts` `activate(id)` (line 349) looks up only the matching `Inhabitant`, sets `item.releasedFocus = true` (so keyboard-focused fish are not held stationary during their startle dart), and calls `startleFish(item.motion, habitat)` (`src/rendering/scene/motion.ts` lines 93–98).
  - **Kinematics & Spine Flex**: `startleFish()` sets `fish.startleSeconds = 0.95`, boosting turn rate `3.0×`, cruise effort `2.8×`, and spine bend gain `1.25×` (`STARTLE_SPINE_BEND_GAIN` in `src/rendering/scene/fish-turning.ts` line 31).
- **Verification**:
  - Covered by `npx vitest run src/components/AquariumScene.test.tsx src/rendering/scene/motion.test.ts src/rendering/scene/fish-turning.test.ts`.
<!-- SECTION:NOTES:END -->



## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

AQ-44 now tracks the per-fish state/event runtime this startle behavior can consume. Preserve the AQ-13 requirement that only the activated fish responds and its service opens immediately; group/environment events remain explicit and separate.

---

author: @Luna
created: 2026-11-03T20:30:00Z

---

Focused read-only activation/accessibility review (2026-11-03) found no concrete immediate-navigation or reduced-motion regression. Native anchors retain target=_blank; accepted clicks call activate synchronously without awaiting, and default is prevented only for a ready-scene pointer hit rejected by the visible-fish raycast. Keyboard/name activation uses the visible-link check without requiring pointer coordinates. When paused by user/system reduced-motion, activate() returns before startle and the synchronous acknowledged class provides non-spatial feedback while the anchor still navigates. Current animation loop respects pause/hidden state. No source changes made and no AQ-13 acceptance criteria checked.

---

author: root
created: 2026-11-04T02:25:00Z

---

Root main-browser integration check: native body pointer activation requests Home Assistant blank-target URL immediately (Page.windowOpen userGesture=true), keyboard Enter does the same, and only activated anchor receives acknowledgment. Activated focused fish continues moving afterwards, avoiding focus suppressing startle. Paused positions remain identical; reduced-motion preference stops motion; GPU loss switches to usable native-link fallback. Per-species realistic startle/body fidelity remains unaccepted; AQ48 now tracks improved custom rigs. Alpha-aware picking blocker remains on AQ34, so ACs stay open pending correction and final review.

---
<!-- COMMENTS:END -->
