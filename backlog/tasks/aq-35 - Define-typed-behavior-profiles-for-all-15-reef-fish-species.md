---
id: AQ-35
title: Define typed behavior profiles for all 15 reef fish species
status: Done
assignee:
  - '@behavior-profiles'
created_date: '2026-11-03T04:47:00Z'
updated_date: '2026-11-05 04:30'
labels: []
dependencies: []
references:
  - docs/reef-fish-roster.md
  - docs/open-source-asset-and-motion-research.md
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/fish-behavior-design.md
  - docs/gemini-research-links.md
  - docs/open-source-asset-and-motion-research.md
priority: high
type: enhancement
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Individual fish need movement and habitat behaviors that reflect the sourced target roster instead of receiving one identical hard-coded path. Create stable-ID keyed species profiles consumed by a shared behavior engine. Profiles should express meaningful variation while only enabling interactions supported by each roster brief; omit unsupported behaviors instead of inventing them. This is behavior configuration for implementers, not a user-facing configuration editor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 15 stable IDs in docs/reef-fish-roster.md have a distinct species behavior profile, checked against each species brief and its source references.
- [x] #2 Each profile expresses species-appropriate locomotion, turning and speed ranges, depth or zone preference, compatible habitat interactions, and supported idle, swim, forage, and retreat state/transition parameters; unsupported states or interactions are omitted.
- [x] #3 A shared behavior engine consumes the profiles, and individual fish vary independently within their species profile rather than sharing an identical fixed movement path.
- [x] #4 Invalid or incomplete profile values are detected and handled safely with clear validation evidence; invalid values do not produce broken motion or interaction references.
- [x] #5 A demonstration shows contrasting species behaviors and verifies profile coverage for all 15 target species.
- [x] #6 No user-facing behavior-profile editing UI is introduced.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validate immutable stable-ID profiles for all15 species against roster/source briefs and retain unsupported-state omissions and corrected identity-independent distinctness validation. 2. Freeze shared nested profile data at runtime and verify validation/immutability regressions. 3. Exercise the real createSwimmingFish/stepSwimmingFish adapter for all15 IDs in an explicit safe-water fixture; record timed state/position/speed/depth contrasts without simulated arrival callbacks. 4. Verify independently sampled same-species instances vary while repeated identities reproduce their trace, with finite in-bounds actual movement for every ID. 5. Root combines actual adapter evidence with the observed main-scene profile consumption, reviews allcriteria and records that art, habitat acceptance and biomechanical-turn quality remain separate tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: EACH fish species should have behavior configurations as a SEPARATE task. Implement typed profiles for all 15 target stable IDs from the sourced roster, covering species-appropriate locomotion/turning/speed ranges, depth/zone, compatible habitat interactions, and supported idle/swim/forage/retreat state transitions. Unsupported behaviors are omitted. Individual fish vary within their species profile; do not use ad-hoc hard-coded identical fish movement. No configuration editing UI is requested. Demonstrate contrasting fish and check all target profiles against their sourced briefs.

Added src/lib/fish-behavior.ts with immutable stable-ID profiles for all 15 catalog species. Profiles use typed habitat modes/anchors, normalized top-to-bottom depth bands, inferred visual speed/turn/timing ranges, per-species state sets and compatible transitions, and source/evidence summaries distinguishing documented behavior from morphology or habitat staging inference. Invalid ranges, missing IDs, incompatible refuge/forage anchors, and transitions to unsupported states are rejected with path-specific errors. Added deterministic per-instance sampling for speed/turn/phase/home offsets; AQ-44 owns the elapsed-time state runtime. Source content was checked against docs/reef-fish-roster.md and docs/fish-behavior-design.md; sourceRefs remain in each profile.

Added explicit contrast test for pectoral-cruise yellow tang, hover-style Banggai cardinalfish, firefish burrow retreat, substrate-stop-start mandarin dragonet, and sinuous-cover-search six-line wrasse; coverage test verifies all 15 catalog IDs.

Prior verification correction: a previous combined focused suite result was 5 files passed, 32 tests passed, and TypeScript typecheck exited 0. An earlier note included shell-expanded command output but did not change code or task state.

Research pass: AQ-35 is In Progress with AC1, AC2, AC4, AC6 already checked; AC3 and AC5 remain unchecked. AQ-44 imports getSpeciesBehaviorProfile and consumes profile declarations; its CLI demonstration simulates navigation arrivals and does not establish rendered integration. Per Root assignment, AQ-44 runtime and scene work are gated; this pass assesses architecture read-only and does not attempt production integration.

2026-11-04 profile review: added runtime deep-freezing for the stable profile map and nested data; regression checks map/profile/range/transition immutability. Focused vitest run passed 17 tests across 2 files; npm run typecheck passed; scoped git diff --check passed. Read-only adapter inspection confirms aquarium.ts calls motion.ts, which creates AQ-44 instances and consumes profile depth, sampled motion variation, state speed multipliers, and typed navigation requests. AC3 and AC5 remain pending as instructed because rendered integration/demo acceptance is gated by AQ12/AQ34 and Root review; no browser verification claimed.

2026-11-05 bounded adapter evidence: added src/lib/fish-behavior-motion.integration.test.ts only. It calls production createSwimmingFish/stepSwimmingFish at fixed 1/30-second steps for all 15 stable IDs in an explicitly labelled open safe-water fixture with no obstacles/anchors and no synthetic navigation-arrival callbacks. The first real free-water route target for every fish normalized into its profile depthRange; 12-second traces record state, position, actual adapter speed, sampled cruise speed and target depth. Contrast samples show Yellow Tang target depth 0.393 / sampled cruise 0.0656 and swim speed 0.656 at 12s; Banggai target 0.445 / sampled cruise 0.0374 and idle speed 0.0085 at 12s; Firefish target 0.618 / sampled cruise 0.0621 and idle speed 0.144 at 12s; Mandarin Dragonet target 0.894 / sampled cruise 0.0286 and swim speed 0.0285 at 12s; McCosker wrasse target 0.390 / sampled cruise 0.0557 and swim speed 0.557 at 12s. Two same-species IDs have different runtime seeds, tuning, route trajectories and final speeds; replaying one ID reproduces its complete trace. Extensions are disposed in test cleanup. Verification: profile + runtime + integration suites passed 19 tests across 3 files; scoped diff check passed. npm run typecheck was attempted but fails in concurrently edited, out-of-scope src/server/disk-capacity.ts (TS2322 at lines 128 and 200); no changes made there. No scene/model/render/browser/build claims. AC3/5 left for Root's acceptance decision.

2026-11-05 Root review correction: removed unused elapsedSteps/targetDepths; explicitly labels trace t=0 as immediately after the first planning/integration step and subsequent seconds from that sample. Added all-15 checks that sampled speeds/positions are finite, positions remain within fixture bounds, and positions advance from their shared start. No exact float trajectory snapshots. Re-ran profile/runtime/adapter suites: 19 tests across 3 files passed; scoped diff check passed. Typecheck remains blocked by the separate disk-capacity worker's TS2322 errors; no edits made outside the integration test.

Root final review2026-11-04: independently read the revised integration test and reran profile/runtime/adapter suites (19tests/3files), then ran the actual trace with silent=false. Trace covers all15 IDs, explicitclockorigin afterinitialplanningstep, actualfinite/in-bounds movement and profiledepth bands; five contrasting species show distincttimedstates/speeds/paths. Two yellowtanginstances vary, repeatedID reproducestrace; no fakearrival callbacks or exactfloat snapshot. Earlier main-scene native observation confirms aquarium creates/steps thisadapter for servicefish. Current Root typecheckpassed after disk-lane corrections at the reviewedcheckpoint. These prove typed-profile consumption/demo scope; they do not accept fishart, realisticturns, allhabitatinteractions or AQ12/AQ34 completion. Supersedes earlier notes that AC3/5 must await those separate art/scene tasks.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z
---
The behavior brief links sourced roster evidence to profile design. Keep profiles immutable and keyed by stable species ID, with only supported states/anchors; AQ-44 will own per-fish state, timers, and seeds.
---

author: @Luna
created: 2026-11-03 13:31
---
AQ-35 implementation slice is ready for root review: typed immutable profiles cover all 15 stable IDs, unsupported states are omitted, and profile validation checks numeric/anchor/state-transition compatibility. Deterministic sample helper consumes profiles to provide per-instance variation; no scene or editing UI was added, and the time-based runtime remains AQ-44. Targeted tests and typecheck pass; no build run per coordination.
---

author: @Luna
created: 2026-11-03 13:31
---
Latest focused verification: AQ-35 contrast/coverage/validation suite now passes 5/5; combined profile and shared-config route/store tests pass 32/32; 
> typecheck
> tsc --noEmit passes. No build or browser UI was run by design; profile timing/state runtime remains AQ-44.
---

author: @Luna
created: 2026-11-03 13:32
---
Confirmed latest combined focused test run: 5 files and 32 tests passed; typecheck passed. No build/browser run; root review pending.
---

author: @root
created: 2026-11-03T13:35:00Z
---
Root review: typed coverage and source/inference separation are useful and the focused tests pass. AC3/AC5 still require a consuming shared runtime and demonstration; numeric sampling and string-equality tests alone do not demonstrate different behavior over time. Keep those unchecked until AQ44 integration. Validation issue: distinctness signature includes speciesId, so otherwise identical profiles always pass; compare behavioral content without identity/evidence fields or remove this misleading check and retain explicit contrast evidence. Please add a focused regression if keeping distinctness validation.
---

author: @Luna
created: 2026-11-03T13:50:00Z
---
Distinctness review addressed: validator now compares behavior fields after excluding stable speciesId and evidence metadata. Added a regression that clones yellow tang behavior onto royal gramma while preserving royal gramma ID and evidence, and expects duplicate-behavior rejection. Verified targeted suite: 6 tests pass; npm run typecheck passes. Profile API and runtime ownership remain unchanged; no build run.
---

author: @root
created: 2026-11-03T13:56:00Z
---
Fish-motion video links and user-supplied timestamps are listed in docs/gemini-research-links.md as review waypoints only; confirm species and visible behavior before using them as evidence or profile inputs.
---

author: @root
created: 2026-11-03T18:49:00Z
---
Root reviewed the stable-ID profiles, corrected distinctness validator, focused rejection tests and deterministic runtime trace. Profile configuration/source inference contract is accepted as a foundation. Runtime now consumes profiles and emits different timed states, cues, anchors and speed values for five species, but no rendered navigation is demonstrated yet; leave movement/demo integration AC3 and AC5 pending the real 3D scene.
---

author: @Luna
created: 2026-11-04T02:31:00Z
---
Linked the candidate video-reference index for the full roster. Clip species and timestamps remain unverified; no video-review criterion is satisfied by these links alone.
---

author: @behavior-profiles
created: 2026-11-04 20:24
---
AQ35 profile lane ready for Root review: all existing verified profile/validation coverage remains intact, and the shared map plus nested arrays/records are now frozen at runtime. Focused verification: 17 tests in 2 files, typecheck, and scoped diff check passed. No renderer, scene, motion, model, or AQ44 runtime edits. AC3/AC5 remain open pending gated production-scene integration; source inspection confirms existing profile consumption but is not browser evidence.
---

author: @behavior-profiles
created: 2026-11-05 04:16
---
Root follow-up audit invalidates the earlier note that production integration is pending AQ12/AQ34: aquarium.ts already creates and steps the legacy motion adapter, and Root observed five service fish moving independently. Remaining work is bounded actual-adapter evidence for AQ35 AC3/5, without claims about accepted fish art or realistic turning. Current adapters consume profiles in depth target selection, per-instance sampled speed/turn, and enabled-state speed multipliers. Proposed only a new test in the existing profile test lane; awaiting Root approval before creating files.
---

author: @behavior-profiles
created: 2026-11-05 04:20
---
AQ35 trace lane is ready for Root review. The new integration test exercises the actual legacy create/step motion adapter for all 15 IDs, records timed states/positions/speeds/depth targets, and verifies depthRange consumption plus independent deterministic same-species instances without fake arrival callbacks. Five species produce clear contrasts; full trace is visible from the focused verbose test command. 19 focused tests pass across profiles/runtime/adapter integration. Typecheck remains blocked by unrelated concurrent disk-capacity errors; I did not touch that lane. AC3/5 remain unchecked for Root to decide from this trace and main-scene observation. No art, realism, turning, or browser claim.
---

author: @behavior-profiles
created: 2026-11-05 04:22
---
Addressed Root's minor findings in the new integration test only: clarified trace clock after first planning step, removed unused bookkeeping, and added finite/in-bounds/actual-motion checks for every ID. Focused 19 tests and scoped diff check pass. No typecheck rerun because disk-capacity lane remains the known blocker. AQ35 AC3/5 remain for Root's final decision.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed immutable, validated behavior profiles for all15 stable species and proved real shared-adapter consumption with timed15-species traces and independent repeatable individuals. Root reviewed19focusedtests/typecheck and existing main integration. Art, habitat and turning acceptance remain separate.
<!-- SECTION:FINAL_SUMMARY:END -->
