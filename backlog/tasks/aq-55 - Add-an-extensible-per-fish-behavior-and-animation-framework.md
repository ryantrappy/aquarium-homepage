---
id: AQ-55
title: Add an extensible per-fish behavior and animation framework
status: In Progress
assignee:
  - '@fish_framework'
created_date: '2026-11-04 19:28'
updated_date: '2026-11-04 19:31'
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
ordinal: 11600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user requests a framework that allows adding or overriding behavior or animation for individual fish, without requiring any actual new behaviors yet. Existing stable-ID species profiles and per-instance FSM exist, but have no explicit extension/override mechanism. Add a small typed scaffold around those boundaries rather than a competing behavior-tree system. Defaults must preserve existing behavior and leave all shipped extension slots empty.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Typed extension definitions support adding named behavior and animation hooks, with independent per-fish state and lifecycle.
- [ ] #2 Documented deterministic resolution supports shared defaults, species-specific overrides and individual-fish overrides, including explicit disable/replacement semantics.
- [ ] #3 The empty default configuration preserves current simulation/animation behavior; extensions cannot bypass pause, hidden/reduced-motion timing, safe navigation or immediate native service links.
- [ ] #4 Meaningful tests demonstrate adding and overriding hooks, precedence, per-fish isolation, lifecycle cleanup and unchanged empty configuration without shipping new behavior or animation content.
- [ ] #5 Developer documentation explains registration and override usage and distinguishes scaffold capability from implemented species behaviors.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an independent typed extension registry/resolver with default → species → fish-instance precedence, explicit disable/replace semantics, readonly context, per-instance state factories, and disposal. 2. Add focused unit tests for resolution, state isolation/cleanup, empty registry, and pause/hidden/reduced-motion gating. 3. Document registration and scaffold limits. 4. After Root approves the proposed wiring seam, add only narrow optional integration into existing motion/animation call sites; preserve current FSM, safe routing, pause/clock gates, and native links. 5. Run targeted tests and typecheck, record objective evidence; Root owns AC checks and Done.
<!-- SECTION:PLAN:END -->

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
<!-- COMMENTS:END -->
