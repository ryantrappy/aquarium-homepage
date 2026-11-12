---
id: AQ-83
title: Add a Settings toggle to display a debug FPS and frame-time counter
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-08T20:07:00Z'
updated_date: '2026-11-12 05:55'
labels:
  - ui
  - performance
  - diagnostics
dependencies:
  - AQ-3
references:
  - src/components/ServiceManager.tsx
  - src/components/AquariumScene.tsx
  - src/rendering/scene/aquarium.ts
  - src/styles/aquarium.css
documentation:
  - docs/requirements.md
  - docs/rendering.md
priority: '3'
type: feature
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As photorealistic fish, coral shaders, caustics, and post-processing passes are evaluated across 1440x900 desktop and 402x874 mobile viewports, developers and users need an opt-in way to inspect live rendering performance without opening browser DevTools. Add a persisted debug setting inside the Settings modal (ServiceManager) to toggle a compact, aquarium-themed FPS and frame-time (ms) overlay on the main view.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Settings modal (ServiceManager) includes a clear, accessible toggle (defaulting to off) to enable or disable the debug FPS counter, persisted locally across page reloads.
- [ ] #2 When enabled, a compact, non-intrusive debug badge in the aquarium HUD displays smoothed FPS and frame time (ms) updated at a readable cadence (e.g., 2-4 Hz) without layout shift or per-frame React re-render overhead.
- [ ] #3 The FPS overlay uses pointer-events: none (or non-overlapping HUD placement) so it never intercepts fish link clicks, caption selection, context menus, or keyboard focus at 1440x900 or 402x874.
- [ ] #4 When the aquarium is paused or the document tab is hidden, the counter reflects the paused/suspended state cleanly and stops sampling timers.
- [ ] #5 Component and unit tests cover toggling the setting, persistence, pause/hidden handling, and non-interference with fish link activation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the existing Settings persistence and aquarium HUD lifecycle; keep the sampling module independent of aquarium.ts scene behavior. 2. Add a default-off persisted performance setting and accessible Settings toggle. 3. Add a small external-store/DOM FPS display module that samples frame intervals while active, reports paused/hidden states, and cleans up timers/listeners. 4. Add focused unit/component tests for measurement cadence, pause/visibility suspension, persistence, toggle accessibility, and link non-interference. 5. Run the focused suites and typecheck, then hand off for Root browser review.
<!-- SECTION:PLAN:END -->
