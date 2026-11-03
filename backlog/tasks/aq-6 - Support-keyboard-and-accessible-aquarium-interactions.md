---
id: AQ-6
title: Audit and polish keyboard and reduced-motion accessibility
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T13:38:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
  - docs/accessibility-audit.md
priority: medium
type: enhancement
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first-pass prototype already needs keyboard-operable service and settings controls and reduced-motion behavior. A later pass should systematically audit and polish accessibility across the aquarium scene and settings rather than treating the basic support as deferred.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A documented audit covers keyboard access, focus order and return behavior, accessible names, settings dialog semantics, and reduced-motion behavior.
- [x] #2 Any audit findings that block identifying, configuring, or launching services are corrected.
- [x] #3 Keyboard focus remains visible and predictable across scene interactions and settings open, edit, save, cancel, and close flows.
- [x] #4 The aquarium remains understandable and operable when reduced motion is enabled, including on mobile layouts.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent has reviewed the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit keyboard access, focus order and return behavior, accessible names, native dialog semantics, and reduced-motion behavior. 2. Fix findings that affect identifying, configuring, or launching services. 3. Verify scene and settings keyboard/focus flows and reduced-motion behavior at the agreed viewport scope. 4. Record only verified criteria and hand back for root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial code audit: main scene controls have explicit accessible names and settings dialogs use native dialog elements. ServiceManager focuses the service-name input on dialog open/edit and the parent restores the settings opener on dialog close. Findings to address: async save disables the focused submit button, so add/failure may leave focus on body; edit success tries to focus the name field before busy state enables it; error and success messages sit above the scrollable dialog content and are not focus targets. Root browser verification covers service add/edit/delete/offline recovery; implement predictable focus and clearly announced results, then re-audit. Root review required before Done.

Implemented predictable focus return after awaited save, delete, import, reset, and retry operations; failure focuses the visible assertive error while retaining drafts. Canceling delete confirmation returns focus to its Remove button, and Clear/Cancel edit return focus to service name. Outcome messages now sit with the form. Added service-context accessible labels to row actions and increased interactive targets to 44px. Added docs/accessibility-audit.md with findings and pending root review. Verified existing suite: 5 files and 26 tests passed. Typecheck currently reports a type error in a new services-state reset test at line 74; asked the storage owner to correct the SharedConfigSnapshot literal. Browser review of these changes remains with root.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:57:00Z

---

Root review round 1: failure path passes: offline save focuses the visible role=alert and retains draft. Success focus still fails: after online retry adds service, document.activeElement remains BODY even several calls later; name input is enabled but not focused. Screenshot confirms no focus ring. The requestAnimationFrame focus appears to run before the disabled field is re-enabled in React commit. Please make focus depend on the completed render (e.g. effect observing pending completion/target), then recheck success, cancel, delete/Keep. Avoid assuming setBusy has committed before synchronous/rAF focus.

---

created: 2026-11-03 12:58

---

Round-one focus fix: save success/failure focus now runs in useLayoutEffect after React commits the cleared busy state, so the name field is enabled before it receives focus. The failed-save error target is also present in that commit. Root browser retest pending; no build or tests run per active QA hold.

---

author: @Luna
created: 2026-11-03 13:00

---

Source-review follow-up: the services search wrapper in src/components/ServiceDock.tsx is a label that contains both the search input and the conditional Clear search button. When a query exists, the button's accessible name may be included in the input's computed label/name. Consider keeping the label for the input but placing Clear search as a sibling control, and give the input an explicit Search services name; verify the accessibility tree after that change. Touch-target scan found the previously narrow scene controls and close/manage controls now at 44px; fish choices are at least 51px, so no remaining target-size fix is apparent from CSS review. No source changes made for this follow-up.

---

author: @root
created: 2026-11-03T13:38:00Z

---

Root round 2 passed: successful save focuses enabled name input; offline error focuses visible alert and retains draft; Keep returns to row Remove, Cancel/delete return to name; Escape returns opener. Phone reduced motion stops all three animations while links/settings remain operable. See docs/accessibility-audit.md. Typecheck, all 39 tests and production build passed.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Audited and corrected keyboard focus, named actions, modal containment and reduced-motion controls. Root verified successful/failed asynchronous saves, edit/cancel/Keep/delete and opener focus return, with the post-commit save-focus correction retested.
<!-- SECTION:FINAL_SUMMARY:END -->
