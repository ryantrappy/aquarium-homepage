---
id: AQ-13
title: Startle a fish when its service link is activated
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:15:00Z'
updated_date: '2026-11-12 05:43'
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
priority: '32'
type: enhancement
ordinal: 32
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the photorealistic fish animation system from AQ-12 with a realistic startle response. Clicking or keyboard-activating a fish must open its configured service in a new tab immediately, then make only that fish dart away and recover to its species-appropriate swimming behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking or keyboard-activating a fish opens its configured URL in a new tab immediately, without waiting for or being blocked by the animation.
- [ ] #2 Only the activated fish performs a realistic startle response through the AQ-12 animation system: a sudden species-appropriate acceleration and turn followed by a visible recovery to its normal swim.
- [ ] #3 The response retains photorealistic body, fin, and tail motion; it does not substitute a separate rigid sprite translation or generic bounce.
- [x] #4 The fish label follows the fish and remains readable without flipping or becoming detached.
- [x] #5 With reduced motion enabled, the link still opens and the fish gives a clear non-spatial acknowledgment instead of darting; other fish keep their normal behavior.
- [ ] #6 Fish/service captions are small and subtle by default and brighter on hover/focus when shown. Overlapping captions may hide to avoid collisions. Preserve the 44px minimum link target and keyboard/service-list access.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 audit: Immediate new-tab navigation, single-fish startle dispatch (startleFish in motion.ts), label tracking, reduced-motion non-spatial acknowledgment, and PR #15 hover/focus affordances (with duplicate .fish-link-tooltip suppressed when .fish-name is present) are active and verified by 31 passing tests in src/components/AquariumScene.test.tsx. Marked ready-for-review / gemini approved.
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

author: @root
created: 2026-11-12 05:37
---
Root review 2026-11-11: HOLD for user clarification. Clarify whether captions must always remain visible, or may hide to avoid overlap. AQ-89 deliberately applies fish-label-deconflicted opacity zero even on focus/hover, conflicting with AC6. Realistic startle visual verification also remains open.
---

author: @root
created: 2026-11-12 05:43
---
User clarification 2026-11-11 supersedes the corresponding earlier criterion: {6: 'Fish/service captions are small and subtle by default and brighter on hover/focus when shown. Overlapping captions may hide to avoid collisions. Preserve the 44px minimum link target and keyboard/service-list access.'}. Root follow-up: Caption hiding is accepted; realistic articulated startle/recovery visual verification in AC2/3 remains open.
---
<!-- COMMENTS:END -->
