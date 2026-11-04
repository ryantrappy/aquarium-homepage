---
id: AQ-35
title: Define typed behavior profiles for all 15 reef fish species
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:47:00Z'
updated_date: '2026-11-04T02:31:00Z'
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
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Individual fish need movement and habitat behaviors that reflect the sourced target roster instead of receiving one identical hard-coded path. Create stable-ID keyed species profiles consumed by a shared behavior engine. Profiles should express meaningful variation while only enabling interactions supported by each roster brief; omit unsupported behaviors instead of inventing them. This is behavior configuration for implementers, not a user-facing configuration editor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 15 stable IDs in docs/reef-fish-roster.md have a distinct species behavior profile, checked against each species brief and its source references.
- [x] #2 Each profile expresses species-appropriate locomotion, turning and speed ranges, depth or zone preference, compatible habitat interactions, and supported idle, swim, forage, and retreat state/transition parameters; unsupported states or interactions are omitted.
- [ ] #3 A shared behavior engine consumes the profiles, and individual fish vary independently within their species profile rather than sharing an identical fixed movement path.
- [x] #4 Invalid or incomplete profile values are detected and handled safely with clear validation evidence; invalid values do not produce broken motion or interaction references.
- [ ] #5 A demonstration shows contrasting species behaviors and verifies profile coverage for all 15 target species.
- [x] #6 No user-facing behavior-profile editing UI is introduced.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define an engine-independent, stable-ID keyed profile schema with typed locomotion, zone, anchors, enabled states, transition gates, and explicitly labeled visual tuning ranges. 2. Read each of the 15 roster briefs and encode only documented or clearly marked inferred behavior; omit incompatible anchors and unsupported states. 3. Validate complete ID coverage, numeric bounds, anchor/state compatibility, and distinct species profiles at module initialization or through an exported safe validator. 4. Add deterministic per-instance sampling helpers that vary tuning within profile bounds without implementing the AQ-44 state runtime. 5. Add tests for all-profile coverage, schema rejection, habitat compatibility, state availability, and contrasting independent samples; record evidence without running a build.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: EACH fish species should have behavior configurations as a SEPARATE task. Implement typed profiles for all 15 target stable IDs from the sourced roster, covering species-appropriate locomotion/turning/speed ranges, depth/zone, compatible habitat interactions, and supported idle/swim/forage/retreat state transitions. Unsupported behaviors are omitted. Individual fish vary within their species profile; do not use ad-hoc hard-coded identical fish movement. No configuration editing UI is requested. Demonstrate contrasting fish and check all target profiles against their sourced briefs.

Added src/lib/fish-behavior.ts with immutable stable-ID profiles for all 15 catalog species. Profiles use typed habitat modes/anchors, normalized top-to-bottom depth bands, inferred visual speed/turn/timing ranges, per-species state sets and compatible transitions, and source/evidence summaries distinguishing documented behavior from morphology or habitat staging inference. Invalid ranges, missing IDs, incompatible refuge/forage anchors, and transitions to unsupported states are rejected with path-specific errors. Added deterministic per-instance sampling for speed/turn/phase/home offsets; AQ-44 still owns the elapsed-time state runtime. Source content was checked against docs/reef-fish-roster.md and docs/fish-behavior-design.md; sourceRefs remain in each profile.

Added explicit contrast test for pectoral-cruise yellow tang, hover-style Banggai cardinalfish, firefish burrow retreat, substrate-stop-start mandarin dragonet, and sinuous-cover-search six-line wrasse; coverage test verifies all 15 catalog IDs.

Verification correction: the latest combined focused suite result is 5 files passed, 32 tests passed, and TypeScript typecheck exited 0. The earlier appended note included shell-expanded command output but did not change code or task state.
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
<!-- COMMENTS:END -->
