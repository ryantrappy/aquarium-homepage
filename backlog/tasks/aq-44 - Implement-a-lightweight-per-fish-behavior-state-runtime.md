---
id: AQ-44
title: Implement a lightweight per-fish behavior state runtime
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T12:38:00Z'
updated_date: '2026-11-03T18:51:00Z'
labels: []
dependencies:
  - AQ-12
  - AQ-34
  - AQ-35
references:
  - docs/fish-behavior-design.md
  - AQ-12
  - AQ-13
  - AQ-34
  - AQ-35
documentation:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
  - docs/behavior-runtime-contract.md
priority: high
type: enhancement
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The 15 species profiles describe possible behaviors, but the app also needs a small shared runtime to select and transition behaviors for each individual fish. Keep species profile data separate from per-fish state, timers, seeds, and anchor targets. Use a lightweight finite-state machine with profile-enabled states and explicit event hooks; a general-purpose behavior-tree framework is unnecessary for this fixed roster. This runtime should let AQ-13 request an individual startle response while preserving immediate service launch, and should hand movement targets to the typed 3D habitat navigation from AQ-34.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each fish instance owns its state, target anchor, timer, and deterministic variation separately from immutable stable-ID species profiles in AQ-35.
- [x] #2 The shared lightweight state machine supports only profile-enabled states and explicit transitions such as travel, hold, forage, display, flee, and recover; unsupported behaviors are omitted, and state animation remains separate from mesh deformation or locomotion rendering.
- [x] #3 State timers and transitions use elapsed simulation time, remain stable across frame-rate changes and long frames, suspend while paused or page-hidden, and resume without a time jump or synchronized fish reset.
- [ ] #4 Event hooks distinguish a single fish activation from explicit group/environment disturbance; AQ-13 can trigger only the activated fish, opens its service immediately, and does not cause screen-wide panic.
- [ ] #5 Navigation state requests compatible typed anchors through AQ-34 and handles missing or obstructed targets without snapping through solid geometry.
- [x] #6 The implementation stays a small finite-state runtime and does not add a heavyweight external behavior-tree framework.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Treat AQ-44 as a staged implementation because AQ-12, AQ-34, and AQ-35 are incomplete; coordinate with the storage owner and consume only the profile API they expose. 2. Implement an engine-independent per-instance elapsed-time FSM in src/simulation/behavior-runtime.ts, gated strictly by enabled profile states and transitions; keep state decisions separate from rendering/deformation. 3. Define typed individual activation and explicit group/environment event hooks plus a navigation adapter contract that emits compatible semantic anchor requests and accepts unavailable/obstructed responses without changing positions itself. 4. Add focused unit tests for independent deterministic instances, transition eligibility, fixed-step elapsed time, long-frame bounds, pause/hidden suspension, and typed event scoping. 5. Document the adapter contract and current dependency/integration limits; leave scene/renderer integration and dependent acceptance criteria pending root review and AQ-12/AQ-34 completion.

### Specific Code Changes & Locations

- **Per-Instance Deterministic FSM (`src/simulation/behavior-runtime.ts`)**:
  - `createFishBehaviorInstance()`, `advanceFishBehavior()`, `dispatchBehaviorEvent()`, `getNavigationRequest()`, and `reportNavigationOutcome()` manage per-fish state (`idle`, `swim`, `forage`, `display`, `burst`, `retreat`), life-stage gating, and `navigationGeneration` tokens.
- **Scene & Motion Loop Integration (`src/rendering/scene/motion.ts`, lines 72–245 & `src/rendering/scene/aquarium.ts`, lines 322–350)**:
  - `stepSwimmingFish()` advances `advanceFishBehavior(fish.behavior, dt)` in fixed `1/60s` substeps (`SIMULATION_STEP_SECONDS`), consumes `SPECIES_LOCOMOTION_EXTENSIONS` opportunity intents, routes anchor requests via `resolveHabitatRoute()`, and scopes `startleFish()` strictly to the clicked service fish.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Staged implementation only: AQ-12 and AQ-34 remain To Do and AQ-35 remains In Progress, so this task has no production scene or renderer integration.

The engine-independent runtime consumes immutable fish profiles and keeps per-instance deterministic state, timers, life stage, navigation generation, and semantic target. It supports only profile-declared transitions, scoped activation/opportunity/group/environment events, fixed-step simulation time, bounded catch-up, pause/hidden suspension, and safe target-specific navigation outcomes.

Round-one fixes add optional-state opportunity events, adult-default retreat eligibility, state-compatible refuge behavior, burst motion intent, varied-frame tests using the default fixed step, and finite/bounded simulation options. Round-two fixes require a matching request generation and anchor on navigation results; the regression covers stale same-anchor arrivals after replan and a later retreat.

Added a deterministic developer CLI trace over clownfish, watchman goby, mandarin dragonet, blue-green chromis, and yellow tang. It reports timed states/events, anchors, cues, and sampled/tuned speeds. Navigation arrivals in the trace are simulated; this demonstrates profile/runtime behavior only, not rendered motion.

Verified: focused runtime tests 10/10, npm run typecheck, and successful npm run behavior:demo output. Root review remains pending; all acceptance criteria remain unchecked until dependencies and production integration are reviewed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-03 13:41

---

Clarification to the preceding note: the focused runtime suite has six tests total; the resume-gap checks extend the existing pause/page-hidden test rather than adding a separate seventh test.

---

author: @root
created: 2026-11-03T13:45:00Z

---

Root core review round 1: (1) forage/display states are unreachable: public events only expose threat/high-effort, and clock only alternates idle/swim. Expose scoped opportunity events or validated selection gates so supported optional states can actually run. (2) Blue tang juvenile-only retreat eligibility is ignored; default adult instances must not enter it. (3) Blocked retreat currently falls back to any species anchor, e.g. royal gramma foragingPatch or blue tang schoolCenter, then can call refuge-reached; only state-compatible refuge targets are valid, otherwise hold/replan without false arrival. (4) burst maps to recover even though it is high-effort acceleration: correct intent/recovery semantics. (5) frame-rate test overrides fixedStep to each frame delta, so it does not test the real default integrator. Use identical default fixed step, varied frame deltas/seeds, elapsed time and optional-state progression. Validate finite simulation options to prevent NaN/Infinity accumulator/loop hazards. Keep production integration ACs pending.

---

author: @Luna
created: 2026-11-03 13:49

---

Addressed round-one findings: added instance-scoped forage/display opportunity events; defaulted life stage to adult and gates juvenile/subadult-only retreat; blocked/unavailable routes now clear the requested target and hold, with explicit same-state-target replan and stale-anchor result rejection; mapped burst to high-effort burst intent; frame-rate comparison now uses default 1/30 fixed steps across mixed deltas and four seeds; validated finite options and capped work at 120 fixed steps per call. Added review regressions. Verified runtime suite 9/9 and npm run typecheck. No scene/renderer integration added; production acceptance criteria remain pending.

---

author: @root
created: 2026-11-03T13:54:00Z

---

Root round 2: the opportunity hooks, adult/juvenile gating, finite bounds and state-specific refuge handling address the first review. One asynchronous navigation identity issue remains: checking only anchor type does not reject an old arrival when a new state or replan requests the same anchor type. Include a request token/generation in NavigationRequest and validate it on outcome reports, with a regression where old rockCrevice arrival cannot finish a new retreat/replan. Keep the contract small; no scene implementation required for this fix. After that, add a deterministic simulation demonstration/driver consuming several contrasting profiles over time so AQ35 can be assessed beyond metadata strings; dev-only diagnostic output, not product UI.

---

author: @Luna
created: 2026-11-03 18:30

---

Addressed round-two review: NavigationRequest now carries the per-instance generation, incremented on state transitions and replans; outcome reports require matching generation and anchor. Regression covers an old arrival after a same-anchor replan and after a second retreat, then confirms the current request succeeds. Added 
> behavior:demo
> node scripts/behavior-runtime-demo.mjs

Engine-independent behavior trace; speeds are profile tuning values, not rendered motion.
┌─────────┬─────────┬──────────────────┬────────────────────────┬───────────────────────────┬───────────┬────────────────────────┬────────┬─────────────────────────────────────────────────────────────────┐
│ (index) │ t       │ fish             │ species                │ event                     │ state     │ anchor                 │ speed  │ cue                                                             │
├─────────┼─────────┼──────────────────┼────────────────────────┼───────────────────────────┼───────────┼────────────────────────┼────────┼─────────────────────────────────────────────────────────────────┤
│ 0       │ '0.0s'  │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'initial'                 │ 'idle'    │ 'hostAnemone'          │ 0.0045 │ 'Hold and bob within the host tentacles.'                       │
│ 1       │ '4.0s'  │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'profile-timer'           │ 'swim'    │ 'hostAnemone'          │ 0.0152 │ 'Make a short station-keeping loop around the same host.'       │
│ 2       │ '4.0s'  │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'fish-activation'         │ 'retreat' │ 'hostAnemone'          │ 0.0322 │ 'Return into the host when a threat cue occurs.'                │
│ 3       │ '4.7s'  │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'demo-navigation-arrival' │ 'idle'    │ 'hostAnemone'          │ 0.0045 │ 'Hold and bob within the host tentacles.'                       │
│ 4       │ '8.2s'  │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'profile-timer'           │ 'swim'    │ 'hostAnemone'          │ 0.0152 │ 'Make a short station-keeping loop around the same host.'       │
│ 5       │ '12.1s' │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'profile-timer'           │ 'idle'    │ 'hostAnemone'          │ 0.0045 │ 'Hold and bob within the host tentacles.'                       │
│ 6       │ '17.4s' │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'profile-timer'           │ 'swim'    │ 'hostAnemone'          │ 0.0152 │ 'Make a short station-keeping loop around the same host.'       │
│ 7       │ '19.5s' │ 'demo-clownfish' │ 'ocellaris-clownfish'  │ 'profile-timer'           │ 'idle'    │ 'hostAnemone'          │ 0.0045 │ 'Hold and bob within the host tentacles.'                       │
│ 8       │ '0.0s'  │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'initial'                 │ 'idle'    │ 'sandBurrowEntrance'   │ 0.0015 │ 'Keep lookout at the burrow mouth with eye and head tracking.'  │
│ 9       │ '0.1s'  │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'environment-disturbance' │ 'retreat' │ 'sandBurrowEntrance'   │ 0.0284 │ 'Back quickly into the shared burrow on a threat cue.'          │
│ 10      │ '0.7s'  │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'demo-navigation-arrival' │ 'idle'    │ 'sandBurrowEntrance'   │ 0.0015 │ 'Keep lookout at the burrow mouth with eye and head tracking.'  │
│ 11      │ '5.4s'  │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'profile-timer'           │ 'swim'    │ 'sandBurrowEntrance'   │ 0.0071 │ 'Make a low, short move and return to the same entrance.'       │
│ 12      │ '7.3s'  │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'profile-timer'           │ 'idle'    │ 'sandBurrowEntrance'   │ 0.0015 │ 'Keep lookout at the burrow mouth with eye and head tracking.'  │
│ 13      │ '14.4s' │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'profile-timer'           │ 'swim'    │ 'sandBurrowEntrance'   │ 0.0071 │ 'Make a low, short move and return to the same entrance.'       │
│ 14      │ '15.9s' │ 'demo-watchman'  │ 'yellow-watchman-goby' │ 'profile-timer'           │ 'idle'    │ 'sandBurrowEntrance'   │ 0.0015 │ 'Keep lookout at the burrow mouth with eye and head tracking.'  │
│ 15      │ '0.0s'  │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'initial'                 │ 'idle'    │ 'foragingPatch'        │ 0.0014 │ 'Pause close to rubble between short foraging moves.'           │
│ 16      │ '4.9s'  │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'profile-timer'           │ 'swim'    │ 'foragingPatch'        │ 0.0123 │ 'Use stop-start advances along sand, rubble, and rock.'         │
│ 17      │ '4.9s'  │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'behavior-opportunity'    │ 'forage'  │ 'foragingPatch'        │ 0.0048 │ 'Inspect a small prey-search patch with brief pecks.'           │
│ 18      │ '7.1s'  │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'profile-timer'           │ 'swim'    │ 'foragingPatch'        │ 0.0123 │ 'Use stop-start advances along sand, rubble, and rock.'         │
│ 19      │ '9.7s'  │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'profile-timer'           │ 'idle'    │ 'foragingPatch'        │ 0.0014 │ 'Pause close to rubble between short foraging moves.'           │
│ 20      │ '14.8s' │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'profile-timer'           │ 'swim'    │ 'foragingPatch'        │ 0.0123 │ 'Use stop-start advances along sand, rubble, and rock.'         │
│ 21      │ '17.4s' │ 'demo-mandarin'  │ 'mandarin-dragonet'    │ 'profile-timer'           │ 'idle'    │ 'foragingPatch'        │ 0.0014 │ 'Pause close to rubble between short foraging moves.'           │
│ 22      │ '0.0s'  │ 'demo-chromis'   │ 'blue-green-chromis'   │ 'initial'                 │ 'idle'    │ 'schoolCenter'         │ 0.0201 │ 'Hover as a loose coordinated school above branching coral.'    │
│ 23      │ '4.3s'  │ 'demo-chromis'   │ 'blue-green-chromis'   │ 'profile-timer'           │ 'swim'    │ 'schoolCenter'         │ 0.0645 │ 'Make short coordinated passes with small independent offsets.' │
│ 24      │ '4.3s'  │ 'demo-chromis'   │ 'blue-green-chromis'   │ 'group-disturbance'       │ 'retreat' │ 'branchingCoralRefuge' │ 0.1219 │ 'Contract and retreat into branches on a shared threat cue.'    │
│ 25      │ '4.9s'  │ 'demo-chromis'   │ 'blue-green-chromis'   │ 'demo-navigation-arrival' │ 'idle'    │ 'schoolCenter'         │ 0.0201 │ 'Hover as a loose coordinated school above branching coral.'    │
│ 26      │ '9.6s'  │ 'demo-chromis'   │ 'blue-green-chromis'   │ 'profile-timer'           │ 'swim'    │ 'schoolCenter'         │ 0.0645 │ 'Make short coordinated passes with small independent offsets.' │
│ 27      │ '16.1s' │ 'demo-chromis'   │ 'blue-green-chromis'   │ 'profile-timer'           │ 'idle'    │ 'schoolCenter'         │ 0.0201 │ 'Hover as a loose coordinated school above branching coral.'    │
│ 28      │ '0.0s'  │ 'demo-tang'      │ 'yellow-tang'          │ 'initial'                 │ 'idle'    │ '—'                    │ 0.0155 │ 'Pause in a steady hover near reef structure.'                  │
│ 29      │ '1.8s'  │ 'demo-tang'      │ 'yellow-tang'          │ 'profile-timer'           │ 'swim'    │ '—'                    │ 0.1035 │ 'Cruise steadily with pectoral-driven fin beats.'               │
│ 30      │ '1.8s'  │ 'demo-tang'      │ 'yellow-tang'          │ 'behavior-opportunity'    │ 'forage'  │ 'grazingSurface'       │ 0.0362 │ 'Make brief algae-grazing pecks at a rock surface.'             │
│ 31      │ '4.7s'  │ 'demo-tang'      │ 'yellow-tang'          │ 'profile-timer'           │ 'swim'    │ '—'                    │ 0.1035 │ 'Cruise steadily with pectoral-driven fin beats.'               │
│ 32      │ '10.9s' │ 'demo-tang'      │ 'yellow-tang'          │ 'profile-timer'           │ 'idle'    │ '—'                    │ 0.0155 │ 'Pause in a steady hover near reef structure.'                  │
│ 33      │ '14.1s' │ 'demo-tang'      │ 'yellow-tang'          │ 'profile-timer'           │ 'swim'    │ '—'                    │ 0.1035 │ 'Cruise steadily with pectoral-driven fin beats.'               │
└─────────┴─────────┴──────────────────┴────────────────────────┴───────────────────────────┴───────────┴────────────────────────┴────────┴─────────────────────────────────────────────────────────────────┘, a deterministic CLI trace for clownfish, watchman goby, mandarin, blue-green chromis, and yellow tang with timed states/events, anchors, and sampled/tuned speeds; it calls the runtime only and documents simulated arrival/no rendered motion. Verified targeted runtime tests 10/10, typecheck, and successful CLI output. Production integration remains pending.

---

author: @Luna
created: 2026-11-03 18:31

---

Round-two summary correction: the prior CLI comment contains expanded demo table output because the shell interpreted inline backticks. The code changes and verification are as described: request generations reject stale same-anchor results; five-species deterministic CLI trace added; runtime tests 10/10, typecheck passes, and demo command exits successfully. AQ-44 remains In Progress.

---

author: @root
created: 2026-11-03T18:51:00Z

---

Root core review round 2 accepted request generations and scoped opportunity hooks, adult eligibility gates, safe state-specific anchor failure handling, finite bounded elapsed simulation and default-step frame-rate tests. Root ran the deterministic five-species trace and full suite (56 tests passed at review). The trace labels navigation arrivals simulated and makes no rendered-motion claim. Real scene navigation and activation/URL integration AC4/AC5 remain pending; no Done status.

---
<!-- COMMENTS:END -->
