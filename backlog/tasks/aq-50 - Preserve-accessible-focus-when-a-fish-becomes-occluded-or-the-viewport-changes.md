---
id: AQ-50
title: Preserve accessible focus when a fish becomes occluded or the viewport changes
status: Done
assignee:
  - '@render-integration'
  - '@focus_review'
created_date: '2026-11-04T14:25:00Z'
updated_date: '2026-11-04 18:52'
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
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root found this during AQ40 native Chrome QA: activate a fish body to open its link, close the new tab so focus returns to that fish, then change between the agreed laptop and phone viewports while paused. The renderer can attempt aria-hidden on the focused aquarium-fish-link during visibility/rebuild updates. Chrome blocks that change and warns that a focused descendant must not be hidden. Keep keyboard users on a visible, meaningful control when the fish cannot remain exposed. This is distinct from preview provenance and remains a runtime interaction fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A focused fish link is never made aria-hidden or visually unavailable while it retains focus during resize, rebuild, offscreen movement or reef occlusion.
- [x] #2 If the fish can no longer remain a visible target, focus moves deterministically to an available aquarium control; native link destinations/new-tab activation and fish pause/reduced-motion behavior remain usable.
- [x] #3 A meaningful regression check covers the focused-link visibility transition, and root verifies the native new-tab return plus resize flow at 1440x900 and 402x874 without the focused-aria-hidden warning.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace focus across updateVisibility, paused resize/rebuild and returned native-tab activation without altering link/startle behavior. 2. After root releases the source hold, add one focused-link visibility helper that transfers focus synchronously to the explicit Services control before applying aria-hidden or hiding the label when the target becomes unavailable; leave visible focused targets and unrelated focused controls alone. Use minimal React ref plumbing for the real control. 3. Route visibility/rebuild transitions through that policy, preserving alpha-aware picking, native URLs, motion, pause and reduced motion. 4. Add happy-dom regression tests with actual HTMLElement.focus, including ordering at aria-hidden mutation, visible focus retention, rebuild/unavailable target and no focus theft. Run focused tests and typecheck; root repeats the exact native new-tab-return plus paused resize flow at1440x900/402x874 before Done. No source edits until root milestone commit/release.

5. Independent review: inspect the six AQ-50 paths and related focus/alpha-picking/navigation/motion behavior; run full npm test and npm run typecheck; record objective evidence and any review findings. Leave AC checks, production build and native browser verification to Root.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the accepted policy in fish-link-focus.ts, called by updateVisibility. The existing route Services ref is passed through AquariumScene as a lazy current getter. Focused targets are checked every rendered frame before DOM movement and canvas draw; other targets retain the existing visibility cadence. If handoff cannot succeed, the prior DOM position/visible label remains and the helper returns exposed-control availability for keyboard/label activation, while item.visible and nearest() retain raw mesh/pointer semantics. No focus work occurs during dispose/unmount. No native URL, startle, motion, pause, reduced-motion, habitat or asset changes.

Independent review 2026-11-04: inspected all six AQ-50 paths plus alpha-picking, native link activation, route Services ref, pause/reduced-motion flow, and renderer visibility/rebuild/resize code. No concrete source defect found. Full verification: npm test — 19 files passed, 111 tests passed; npm run typecheck — passed (tsc --noEmit); git diff --check — passed. Native new-tab return and paused resize at 1440x900 and 402x874, production build, and AC checks remain Root-owned and pending.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04T14:45:00Z
---
Root accepts the proposed focused-visibility policy: keep visible focused fish focused; synchronously transfer focus to the explicit Services control before hiding an unavailable focused link; do not steal unrelated dialog/control focus or blur to body. If no usable fallback can receive focus, preserve the focused target rather than hide it. Check focused visibility before moving its DOM target and on every relevant frame, while retaining the normal cadence for other fish. Use a real DOM-focus regression that observes focus at the moment hidden attributes/styles change. Checkpoint da043d2 is committed/pushed; source hold is released. Implement now, then root reviews tests and native new-tab-return/viewport behavior. No habitat, asset, navigation or native URL refactor.
---

author: @render-integration
created: 2026-11-04 14:53
---
Ready for root review: 17 relevant tests passed (5 actual-DOM focus tests, 7 AquariumScene native-link/ref/retained-label tests, 5 alpha-picking tests); full tsc --noEmit and git diff --check pass. The hidden-transition regression captures anchor.setAttribute and asserts actual document.activeElement is Services INSIDE the aria-hidden=true mutation, not after return/MutationObserver. Coverage includes focused descendants, visible-focus retention, unrelated dialog focus, unusable fallback preservation, current real Services ref plumbing, native keyboard launch for retained label and existing immediate URL/body alpha behavior. Source changed only aquarium.ts, fish-link-focus helper/test, AquariumScene component/test, and one route prop. No build/server/commit/Done; actual native new-tab-return plus paused resize QA at1440x900/402x874 remains for root. Acceptance criteria left unchecked pending that integration review.
---

author: root
created: 2026-11-04T14:59:00Z
---
Handoff checkpoint for future agents: da043d2 is the pushed source baseline. The six AQ50 implementation/test paths remain in the local working tree only; this documentation checkpoint does not publish or accept that patch. Read AGENT_TASKS.md, current git status/diff and this task before resuming. Worker reports 17 focused tests and typecheck/diff checks; Root code review, full checks/build and actual native new-tab-return/paused-resize QA at both target sizes are still pending. All ACs remain unchecked. Do not release AQ14.3 foundation implementation until this gate is accepted; preserve current configuration and unrelated files.
---

author: @focus_review
created: 2026-11-04 18:48
---
Independent review: the focus helper moves focus synchronously before aria-hidden and preserves the focused link if Services cannot accept focus; tests cover the mutation ordering, descendants, unrelated focus, and unusable fallbacks. Pointer picking remains routed through nearestVisibleIntersection/readArtworkAlpha, while keyboard/label activation uses canActivate and keeps native anchor defaults. Route plumbing reads the current Services button ref. Full suite 19/19 files, 111/111 tests; typecheck and git diff --check pass. No concrete code defect found; native browser and build verification remain pending for Root.
---

author: root
created: 2026-11-04 18:52
---
Root review accepted. Independently reviewed the six-file patch, synchronous focus-before-hide ordering, per-frame focused visibility and paused resize/rebuild paths. Worker audit found no concrete defect; full suite passes 19 files/111 tests, typecheck and diff check pass. Root production build passed (existing large-chunk advisory only). Native Chrome AX/UI review used Responsive 1440x900 and 402x874: paused fish keyboard Enter opened its configured native blank-target tab; closing restored fish focus on laptop, resize to phone remained activatable, a later return handed focus to Services, and reverse resize left console at 0 messages with no focused-aria-hidden warning. Settings opened/escaped and Resume restored running state; no config was edited. Service destination network errors are unrelated and no reachability claim is made. Browser host and screenshots were unavailable; exact dimensions were verified through DevTools fields, no DOM viewport-scale reading was possible because the self-XSS paste guard was respected. Reduced-motion/clock preservation is covered by unchanged runtime paths and passing regressions, not newly toggled OS state.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Prevents focused fish links being hidden before a synchronous handoff to Services; retains exposed focus when fallback is unusable. Root reviewed code and native new-tab-return/paused resize in both agreed DevTools sizes without the focused-aria-hidden warning. 111 tests, typecheck, diff check and production build pass. No configuration, habitat assets or deployments changed.
<!-- SECTION:FINAL_SUMMARY:END -->
