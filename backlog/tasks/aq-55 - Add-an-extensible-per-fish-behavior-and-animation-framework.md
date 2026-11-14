---
id: AQ-55
title: Add an extensible per-fish behavior and animation framework
status: Done
assignee:
  - '@fish_framework'
created_date: '2026-11-04 19:28'
updated_date: '2026-11-04 19:49'
labels: []
dependencies: []
references:
  - AQ-35
  - AQ-44
  - src/simulation/behavior-runtime.ts
  - src/rendering/scene/motion.ts
documentation:
  - docs/behavior-runtime-contract.md
priority: high
type: enhancement
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user requests a framework that allows adding or overriding behavior or animation for individual fish, without requiring any actual new behaviors yet. Existing stable-ID species profiles and per-instance FSM exist, but have no explicit extension/override mechanism. Add a small typed scaffold around those boundaries rather than a competing behavior-tree system. Defaults must preserve existing behavior and leave all shipped extension slots empty.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Typed extension definitions support adding named behavior and animation hooks, with independent per-fish state and lifecycle.
- [x] #2 Documented deterministic resolution supports shared defaults, species-specific overrides and individual-fish overrides, including explicit disable/replacement semantics.
- [x] #3 The empty default configuration preserves current simulation/animation behavior; extensions cannot bypass pause, hidden/reduced-motion timing, safe navigation or immediate native service links.
- [x] #4 Meaningful tests demonstrate adding and overriding hooks, precedence, per-fish isolation, lifecycle cleanup and unchanged empty configuration without shipping new behavior or animation content.
- [x] #5 Developer documentation explains registration and override usage and distinguishes scaffold capability from implemented species behaviors.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an independent typed extension registry/resolver with default → species → fish-instance precedence, explicit disable/replace semantics, readonly context, per-instance state factories, and disposal. 2. Add focused unit tests for resolution, state isolation/cleanup, empty registry, and pause/hidden/reduced-motion gating. 3. Document registration and scaffold limits. 4. After Root approves the proposed wiring seam, add only narrow optional integration into existing motion/animation call sites; preserve current FSM, safe routing, pause/clock gates, and native links. 5. Run targeted tests and typecheck, record objective evidence; Root owns AC checks and Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the optional fish extension registry/resolver, per-instance lifecycle, motion and mixer seams, focused tests, and developer documentation. Verified: npx vitest run src/simulation/fish-extensions.test.ts src/rendering/scene/motion.test.ts — 10 tests passed; npm run typecheck passed; scoped git diff --check passed. Default configuration contains no hooks and no behavior or animation content was added. Root review is pending; acceptance criteria remain unchecked.

Root numerical baseline check passed: compared the committed scaffold motion adapter from 8d4b15f against pre-framework e5f2f8d for all 15 catalog species over 180 mixed-delta frames each, including activation and stopped intervals. Every existing motion/runtime field matched exactly; default animation playback multiplier remained 1. Temporary comparison sources are Root-owned and will be removed after evidence capture. Working motion.ts now contains a separate concurrent turning implementation, so this result deliberately applies to the committed scaffold candidate, not that unreviewed turning work. Root has asked for runtime file ownership coordination; no concurrent edits were reverted.

Addressed Root lifecycle review: extension runtime now copies and freezes initial and per-step snapshots, binds to initial instance/species IDs, and attempts every cleanup after factory or dispose errors. Added regressions for mutable caller snapshots, identity mismatch, partial factory failure with throwing cleanup, and disposal idempotence. Follow-up checks: 8 focused extension tests passed; npm run typecheck passed; scoped diff check passed. Root scene-file cleanup patch was proposed but not applied because Root reserved aquarium.ts while concurrent work is active.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @fish_framework
created: 2026-11-04 19:30
---
Proposed API for Root review before implementation: independent fish-extensions module; named behavior/animation slots; deterministic default → species → instance resolution with add/replace/disable; readonly snapshots and per-instance state factories/disposal; only typed intents, with existing motion, safety, pause/visibility and native-link paths retaining authority. Proposed narrow wiring: behavior hook step inside the existing non-stopped motion step, dispatching only existing runtime events; animation outputs consumed beside mixer update under the same existing gate. Waiting for Root feedback before source changes.
---

author: root
created: 2026-11-04 19:31
---
Root accepts extending the existing FSM rather than adding a second behavior system. Approve the proposed pure registry/lifecycle API and narrow optional runtime seams: createSwimmingFish may accept an optional empty-by-default extension configuration; step hooks only inside bounded simulation substeps after stopped gate; behavior outputs go through existing scoped events and safe navigation; animation output may alter bounded mixer playback parameters only under existing !stopped gate. No hooks on native URL/click path and no actual behaviors shipped. Runtime owns isolated state and idempotent disposal, called from existing fish removal. Keep snapshots detached/read-only and use typed validated intents rather than mutable fish/scene references. Shared→species→instance precedence and add/replace/disable must be documented/tested. Publish pure module first; Root will review integration diff before acceptance. Do not edit models or biomechanical turning code.
---

author: root
created: 2026-11-04 19:39
---
Root review: registry and narrow seams match requested scaffold; no actual hooks shipped. Fix these lifecycle/isolation gaps before acceptance: (1) exported createFishExtensionRuntime should detach/freeze the initial and step snapshots itself, not rely on callers or frozen test fixtures; (2) bind each runtime to initial instanceId/speciesId and reject a mismatched step snapshot, otherwise private state can accidentally run against another fish; (3) cleanup must continue through all controllers if one dispose throws, and factories already created must be cleaned if a later factory throws; scene fish resource cleanup must continue even if extension teardown fails. Add meaningful regressions using an ordinary mutable caller snapshot, mismatched fish identity, partial factory failure and throwing cleanup. Keep errors explicit, no new behavior content or broad framework. Existing bounded step/intent/mixer integration otherwise looks focused. A concurrent user commit 8d4b15f included the in-progress source; do not reset it, apply focused follow-up fixes.
---

author: root
created: 2026-11-04 19:49
---
Root final review accepted. Identity/snapshot/lifecycle fixes are verified; scene cleanup now catches teardown failures while releasing all roots/mixers/skeletons. Root added locale-independent ordering and a meaningful non-ASCII ordering regression. Clock tests retain all numerical/timing assertions via data-only snapshots and independent fish construction because controllers contain functions. Isolated scaffold checkout passes 21 files/131 tests, typecheck and production build; combined working tree with separate turning changes passes 133 tests plus typecheck. Root exact pre-framework comparison covers all15 species x180 mixed-delta frames including activation/stopped intervals, with identical existing fields and rate1. HTTP production smoke returns200 with3 native blank-target links and Services/Pause/Settings. Native CUA retry failed (native pipe/browser host unavailable), so no new two-viewport browser/WebGL claim. These checks accept the scaffold with empty defaults only; no behavior/animation content or model promotion. User confirms other runtime agent finished; Root preserved all turning/model work and only merged narrow cleanup.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adds opt-in named behavior/animation controllers with defaults→species→instance add/replace/disable resolution, per-fish state/identity, detached snapshots and robust cleanup. All production extension slots remain empty. Root reviewed code; isolated131 tests/typecheck/build and combined133 tests/typecheck pass. Numerical baseline matches pre-framework motion for15 species. HTTP smoke preserves native links/controls; new native-browser review unavailable. No model or behavioral animation content added.
<!-- SECTION:FINAL_SUMMARY:END -->
