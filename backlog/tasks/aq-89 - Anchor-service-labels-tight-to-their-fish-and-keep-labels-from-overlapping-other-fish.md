---
id: AQ-89
title: >-
  Anchor service labels tight to their fish and keep labels from overlapping
  other fish
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-08'
updated_date: '2026-11-14 15:45'
labels:
  - accessibility
  - photorealism
  - rendering
dependencies:
  - AQ-13
  - AQ-70.14
  - AQ-34
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/fish-link-projection.ts
  - src/components/AquariumScene.tsx
  - src/styles/aquarium.css
  - AQ-13
  - AQ-70.14
documentation:
  - docs/rendering.md
  - docs/asset-evidence/aq89/source-review-20261114/README.md
priority: '2'
type: feature
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Service labels sit tucked directly under their fish with no floating gap, and never visually cover another fish. AQ-70.14 (Done: smaller / subtler captions, click priority across overlaps), AQ-13 AC #6 / AC #4, and AQ-34 AC #4 already cover caption styling, hover/focus brightening, and occlusion; this task adds only the missing tight anchoring and the rule that a label must not visually overlap another fish or its label. (Video-review finding, 2026-11-08: labels float with a visible gap under their fish and overlap other fish.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each label is anchored tight under (or immediately beside, at frame edges) its fish with no visible floating gap, at 1440x900 and 402x874
- [ ] #2 Labels never visually overlap another fish or its label; where fish cluster, labels de-conflict (offset, fade, or hide behind the nearer fish) while the native link and 44px target stay usable
- [ ] #3 Labels still follow moving fish, stay readable, brighten on hover / focus, and respect occlusion, per AQ-13 AC #4 and AQ-34 AC #4
- [ ] #4 Reduced-motion, pause, keyboard, touch, and Services-modal access are unchanged; existing AQ-70.14 / AQ-13 tests pass plus new overlap / anchoring tests
- [ ] #5 Root native visual review at 1440x900 and 402x874 accepts the anchoring before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root2026-11-14: reproduce current solver overlap/bottom-edge failures; delegate pure label-layout correction and meaningful counterexamples to Luna, while Root integrates actual rendered fish bounds and measured caption size. Include ambient schoolmate bodies as obstacles, keep native44px link targets/ARIA names and Services access, and hide only captions when no attached safe placement exists (explicitly allowed by AC2). Retain occlusion/focus behavior and verify both target views, moving labels, Pause/reduced, keyboard/touch/service activation before Root acceptance. Existing runtime/style/behavior dependencies stay tracked; do not accept those broad art tasks from this bounded label fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Current cbf6567 read-only subagent audit:67focused tests pass but solver deliberately returns fadedfalse after unresolvable overlap; a direct near/far-body counterexample still overlaps. Lone bottom-edge caption can extend to903px in874px viewport. Ambient schoolmates omitted because placements iterate only service fish. Existing tests encode never-fade behavior contrary to AC2, so revise that expectation with explicit native-link preservation rather than claim completion from tests alone.

2026-11-14 bounded helper handoff by link_interaction. Root explicitly selected and retained this stronger inherited review model for the demanding collision-layout algorithm under the AGENTS allowance; this records the task DoD2 model-routing exception, without checking DoD or AC boxes. Edited only fish-label-layout.ts and fish-label-layout.test.ts. Solver accepts an optional third readonly {id,body}[] array for ambient/foreign bodies; supplied caption dimensions are honored and dx/dy are relative to that caption origin. Legacy two-argument calls and estimateCaptionRect remain supported, with optional measured width/height. At most32 attached candidates: tight supplied below-body anchor/horizontal escapes, immediate side candidates only at frame edges; no84px downward detachment. Stable near-first/id tie ordering; visible results are checked against every foreign body and earlier visible caption and must fit the viewport. No safe attached placement yields faded:true for caption-only suppression; native hitboxes/ARIA/URLs are outside this helper and unchanged by this lane. Invalid geometry/metrics fail closed, including finite offset-cancellation cases. Existing tests that required visible unresolved overlap were replaced with criterion-based tests.27 helper tests pass: both target viewport clusters/edges/ambient/multiple blockers, actual measurements/offset origin, deterministic ties and seeded mixed-size invariants. Same tests against preserved old helper fail24/pass3, confirming regression sensitivity. Source snapshots, before/after JSON reports and handoff.json under /tmp/aq89-helper-20261114. Before report SHA ea1ad406b8ebf396fd8b5e39b8c1edf22affab981890339a93e491cd82dbef36; after de27ee6f63ed49e6ca04e86a4f340d91f8424d70184f6339dbe3d9b0cb6e1fa4. Helper SHA 0aedeaeda8753eb30dbfc096e21a0ebcfd29699d6d5aa4736b5f5ac78c6f43c6; test SHA d52a1366aeefd2453d07b02c58aa1e3cadd1a88fd94646e2e5ac62d51693d9d1. Typecheck including16script checks and scoped diff-check pass. Root-owned measured-caption and schoolmate-caption lifecycle cases both pass after an explicit frozen render refreshes newly mocked dimensions; no Root test/source was edited by this agent. This verifies only the helper subset; actual posed/GPU-flex body projection, DOM measurement/CSS integration, full-suite/accessibility/native two-size art acceptance remain Root work. No Blender/models/UI, stage/commit/push or AC/status changes by implementing agent.

Root verified source handoff:27helpertests pass/oldhelperfails24; posed projection includes current skin/morph/turn and live flex, measured DOM captions and all service/ambient body obstacles, preserving separate44px links/ARIA. Matrix/shader/buffer optimizations retain every vertex and reduce same53878vertex11fish Nodefixture projection p50from26.5/27.6to7.2/9.3ms; not browser/mobile/GPU/wholeframe budgets. No exact source commit is claimed yet: combined13file snapshot pins match original/proof;902tests75files,170focused8files/typecheck16scripts/build pass after separately reviewed AQ76budgetmetadata correction. All5AC/2DoD remain unchecked pending exact native two-size review. No models/Blender/assets/originalconfig changed; only scoped reviewed source/evidence milestone follows.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-14 15:16
---
Root reviewed helper handoff0aedeaed/testd52a1366: bounded32candidate near-first solver validates every visible caption against all foreign service/ambient bodies and earlier captions, returns offsets from measured caption origin, recovers beside bodies at frame edges and hides only caption when no attached clear result exists. This directly resolves the old deliberately overlapping fallback; explicit AC2 permits hide. No threshold/body/nav/ARIA relaxation. Root integration projects current posed vertices plus live shader-flex counterpart, measures actual DOM caption size, preserves separate44px native anchors, and suppresses redundant tooltip bypass. Remaining review: current real-loader CPU cost, full isolated validation and exact two-size native visual/access/control evidence. AllAC/DoD remain unchecked until final Root audit.
---
<!-- COMMENTS:END -->
