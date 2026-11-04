---
id: AQ-50
title: Preserve accessible focus when a fish becomes occluded or the viewport changes
status: In Progress
assignee:
  - '@render-integration'
created_date: '2026-11-04T14:25:00Z'
updated_date: '2026-11-04 14:29'
labels: []
dependencies:
  - AQ-40
references:
  - AQ-6
  - AQ-34
documentation:
  - src/rendering/scene/aquarium.ts
priority: high
type: bug
ordinal: 11500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root found this during AQ40 native Chrome QA: activate a fish body to open its link, close the new tab so focus returns to that fish, then change between the agreed laptop and phone viewports while paused. The renderer can attempt aria-hidden on the focused aquarium-fish-link during visibility/rebuild updates. Chrome blocks that change and warns that a focused descendant must not be hidden. Keep keyboard users on a visible, meaningful control when the fish cannot remain exposed. This is distinct from preview provenance and remains a runtime interaction fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A focused fish link is never made aria-hidden or visually unavailable while it retains focus during resize, rebuild, offscreen movement or reef occlusion.
- [ ] #2 If the fish can no longer remain a visible target, focus moves deterministically to an available aquarium control; native link destinations/new-tab activation and fish pause/reduced-motion behavior remain usable.
- [ ] #3 A meaningful regression check covers the focused-link visibility transition, and root verifies the native new-tab return plus resize flow at 1440x900 and 402x874 without the focused-aria-hidden warning.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace focus across updateVisibility, paused resize/rebuild and returned native-tab activation without altering link/startle behavior. 2. After root releases the source hold, add one focused-link visibility helper that transfers focus synchronously to the explicit Services control before applying aria-hidden or hiding the label when the target becomes unavailable; leave visible focused targets and unrelated focused controls alone. Use minimal React ref plumbing for the real control. 3. Route visibility/rebuild transitions through that policy, preserving alpha-aware picking, native URLs, motion, pause and reduced motion. 4. Add happy-dom regression tests with actual HTMLElement.focus, including ordering at aria-hidden mutation, visible focus retention, rebuild/unavailable target and no focus theft. Run focused tests and typecheck; root repeats the exact native new-tab-return plus paused resize flow at1440x900/402x874 before Done. No source edits until root milestone commit/release.
<!-- SECTION:PLAN:END -->
