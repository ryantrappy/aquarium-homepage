---
id: AQ-13
title: Startle a fish when its service link is activated
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:15:00Z'
updated_date: '2026-11-03T12:39:00Z'
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
ordinal: 13000
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

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

AQ-44 now tracks the per-fish state/event runtime this startle behavior can consume. Preserve the AQ-13 requirement that only the activated fish responds and its service opens immediately; group/environment events remain explicit and separate.

---
<!-- COMMENTS:END -->
