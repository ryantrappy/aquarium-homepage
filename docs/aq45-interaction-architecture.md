# AQ-45 interaction architecture — design document

<!-- AGENT_DOC_METADATA
Category: Specification / Behavioral Architecture Design
Status: Draft for review / Active once accepted
Authority: Implementation plan for AQ-45 (binding once Root accepts)
Backlog: AQ-45, AQ-44, AQ-35, AQ-34, AQ-41, AQ-82, AQ-13
Owner: @behavior_profiles
Updated: 2026-11-09
Upstream: docs/fish-behavior-design.md, docs/behavior-runtime-contract.md,
  docs/reef-fish-roster.md, docs/aquascape-layout.svg, docs/habitat-navigation-core-contract.md
Downstream: src/simulation/behavior-runtime.ts, src/simulation/behavior-event-bus.ts (new),
  src/lib/fish-behavior.ts, src/rendering/scene/motion.ts,
  src/rendering/scene/habitat-anchor-interactions.ts
-->

> [!NOTE]
> **What this document is**
> The implementation plan for AQ-45 ("Implement species-compatible
> interactions with reef habitat anchors"). It answers one question Ryan
> asked explicitly: **how do we implement four phases of fish–coral
> interactions without the result becoming a spaghetti of random triggers
> nobody can keep track of?**
>
> The short answer: **one typed event bus, one finite-state machine, one
> fixed tick order — and everything else is data.** Every trigger that can
> change a fish's behavior is a named, catalogued event with exactly one
> kind of producer and a declared set of consumers. Nothing dispatches
> behavior from inside steering code, render code, or a species-name
> `if`-statement. This document names the architecture, the rules, and the
> trigger catalog; it does not implement them. No code is changed by this
> document.
>
> **Status:** draft for Root review. AQ-45 stays In Progress; nothing here
> marks any acceptance criterion Done.

## Contents

1. [The problem, stated precisely](#1-the-problem-stated-precisely)
2. [What exists today — the grounded inventory](#2-what-exists-today--the-grounded-inventory)
3. [The target architecture — code hierarchy](#3-the-target-architecture--code-hierarchy)
4. [The trigger model — one bus, one catalog](#4-the-trigger-model--one-bus-one-catalog)
5. [The animation pathway — from decision to pixels](#5-the-animation-pathway--from-decision-to-pixels)
6. [Software best practices, applied concretely](#6-software-best-practices-applied-concretely)
7. [Phasing and sequencing](#7-phasing-and-sequencing)
8. [Risks and open decisions](#8-risks-and-open-decisions)
9. [Appendix A — current-state trigger audit (the spaghetti inventory)](#appendix-a--current-state-trigger-audit-the-spaghetti-inventory)
10. [Appendix B — the trigger catalog](#appendix-b--the-trigger-catalog)
11. [Appendix C — tick order, per frame and per substep](#appendix-c--tick-order-per-frame-and-per-substep)
12. [Appendix D — file map per phase](#appendix-d--file-map-per-phase)

---

## 1. The problem, stated precisely

AQ-45 covers four phases of behavior, across 15 species, each with its
own habitat anchors, states, and refuge rules:

- **Phase 1** — hosting, perching, burrows (clownfish ↔ anemone,
  firefish/goby burrows, blenny perch, substrate grazing).
- **Phase 2** — schooling positions above coral heads (chromis/anthias
  centroids over Acropora thickets; the whole school dives on threat).
- **Phase 3** — grazing / probing patrols (tang and angelfish grazing
  paths, wrasse patrol loops, copperband probe pauses).
- **Phase 4** — display / territory (gramma belly-to-rock, flasher-wrasse
  display runs, clownfish anemone defence).

Each phase, done naively, adds its own triggers: a proximity check here,
a timer there, a click handler that also startles a school, a patrol
loop that fights the schooling steering. After four phases nobody can
answer "why did this fish do that?" — which trigger fired, who sent it,
what it was allowed to do, and what it changed. That is the failure mode
this design exists to prevent.

The design therefore treats **traceability as a first-class requirement**,
not a debugging afterthought:

- For any fish at any moment, it must be possible to answer, from data
  alone: *what state is it in, what event put it there, who produced that
  event, and what is it allowed to do next?*
- Adding a behavior must mean adding **data** (a profile entry, a
  catalogued event, an anchor) plus at most one small, pure function —
  never a new callback wired into an unrelated module.
- The system must be **deterministic**: the same seed, the same event
  sequence, and the same tick order produce the same behavior, so a bug
  can be replayed instead of chased.

## 2. What exists today — the grounded inventory

This section is a verified inventory of the code as it stands at tip
`75a33ae` (2026-11-09). It is the "before" picture the design is measured
against. File paths are exact; claims were checked against the sources.

### 2.1 What already works well (keep it)

| Piece | File | What it gives us |
|---|---|---|
| Species profiles | `src/lib/fish-behavior.ts` | 15 immutable, zod-validated, deep-frozen profiles keyed by stable species ID. States, transitions (with selection weights), anchors, gaits, depth ranges, evidence kind + sources. Durations capped at 30 s, speeds at 0.5 tank-widths/s, turns at 180°/s. |
| Behavior FSM | `src/simulation/behavior-runtime.ts` | Engine-independent, pure-function FSM. Fixed 1/30 s steps, 0.25 s catch-up cap, max 120 steps per call. Pause/hidden suspension with no time jump. Only profile-declared transitions are eligible; life-stage gating (juvenile/subadult-only retreat). Navigation requests carry a **generation token**; stale outcomes are rejected. |
| Typed events (runtime level) | `src/simulation/behavior-runtime.ts` (`BehaviorRuntimeEvent`) | Four event types already exist: `fish-activation` (one `instanceId`), `behavior-opportunity` (one `instanceId`), `group-disturbance` and `environment-disturbance` (optional `instanceIds`). Dispatch is scoped by type. |
| Navigation adapter | `src/simulation/behavior-runtime.ts` + `src/simulation/habitat-navigation.ts` | `getNavigationRequest` / `requestNavigation` / `reportNavigationOutcome` (`arrived` / `blocked` / `unavailable`). The adapter must never teleport or route through solid geometry; blocked targets are cleared and the fish holds while `replanNavigation` retries only the state's declared target. The runtime never substitutes a different anchor. |
| Anchor interaction poses | `src/rendering/scene/habitat-anchor-interactions.ts` | Six categories (`host-anemone-symbiosis`, `sand-burrow-hover-bolt`, `sand-burrow-lookout-back-in`, `rock-perch-station`, `substrate-grazing-forage`, `crevice-refuge-hold`). `evaluateAnchorInteractionOffset` is a **pure function** of (species, location, state, elapsed seconds) — deterministic, no hidden state. `resolveSafeAnchorInteractionTarget` collision-checks the offset, falls back to the bare anchor position, then gives up (`undefined`) instead of forcing a bad target. |
| Schooling steering | `src/rendering/scene/schooling-navigation.ts` + `motion.ts` (`stepSwimmingSchool`) | Boids steering split into separate components (AQ-84): cohesion/alignment steer **heading only**; only personal-space separation translates the body, as a small bounded nudge that is dropped (never forced) when the segment is unsafe. Steering is computed from a **pre-move peer snapshot** taken once per substep, so results are order-independent and deterministic. Startled peers are ignored for cohesion/alignment. Separation uses physical body radii (AQ-85), not the legacy ≥1.12 m clearance bubbles. |
| Lighthill gait | `src/rendering/scene/fish-body-flex.ts` + `fish-flex-material.ts` | Pure gait math (`y(x,t) = A(x)·sin(kx − ωt + φ)`, zero-mean wave) with per-species parameter tables (`SPECIES_LOCOMOTION_SIGNATURES` in `species-locomotion-extensions.ts`). Operculum/mouth ventilation (AQ-74) is synchronized to the swim frequency. The shader patch is driven by uniforms; the wave adds no mean bend, so it cannot double-count the turning-rig bend (capped at 1.275 rad summed spine bend). |
| Two-level fixed time | `src/rendering/scene/clock.ts` | Outer frame clock: 1/60 s steps, max 6 steps per frame, max 0.1 s per frame. Inner FSM: 1/30 s steps. Paused/hidden time is discarded, never caught up. |
| Extension scaffold | `src/simulation/fish-extensions.ts` (AQ-55) | An optional, typed extension layer with a layered registry (`defaults` → `species` → `instanceId`), explicit `add` / `replace` / `disable` operations, frozen snapshots, and hard capability limits (see §6.5). Currently **empty in the live scene** — the sanctioned seam for future behavior/animation content, unused so far. |
| Demo trace | `scripts/behavior-runtime-demo.mjs` (`npm run behavior:demo`) | Deterministic developer-only trace of states/events/anchors/speeds for five contrasting species. The existing precedent for "behavior you can read". |
| Design canon | `docs/fish-behavior-design.md`, `docs/behavior-runtime-contract.md` | Binding constraints: no universal tether distances, no Acropora-as-anemone substitution, per-species enabled states only, FLEE only from an explicit event, click is a UI input not a predator cue, service launch is immediate and non-blocking. |

### 2.2 What is missing or ad-hoc today (the gaps this design closes)

These are the concrete findings that motivate the design. Each one is a
specific, locatable fact — see Appendix A for the full audit with
file/line references.

1. **The pose offsets are computed but never applied.** `evaluateAnchorInteractionOffset` and `resolveSafeAnchorInteractionTarget` have **no production caller**: `aquarium.ts` never calls them, and `motion.ts` never calls them. AQ-45 ACs #1–#4 are "implemented and tested" at the function level, but in the live scene no fish visibly nestles, perches, or hovers at an anchor. AQ-82 AC #4 names exactly this gap ("stepSwimmingFish() integrates evaluateAnchorInteractionOffset()").
2. **The live scene has exactly one behavior trigger wired up.** `aquarium.ts` `activate(id)` → `startleFish` (AQ-13 service click). `disturbSchool` exists but is **never called** — there is no live group-disturbance trigger of any kind. AQ-44 AC #4 (event hooks distinguish single activation from group/environment disturbance) is still open, and the runtime contract itself records "AQ-13 integration is pending".
3. **A species-specific trigger is inlined in the steering integrator.** `integrateSwimmingFish` in `motion.ts` contains a hard-coded check: *if this fish is a yellow tang, in `swim`, for more than 2 s, near any anchor, and its route generation is stale → dispatch `foraging-opportunity`*. This is the exact anti-pattern the design forbids: a species name, a magic distance (0.9), a magic time (2 s), and a dispatch, all inside the function that also turns the fish. Every new behavior added this way makes the integrator longer and the trigger graph unknowable.
4. **Opportunity data exists with no driver.** `SPECIES_LOCOMOTION_SIGNATURES` carries `opportunityTrigger` and `opportunityIntervalSeconds` per species, but nothing in the live scene reads them, and the extension registry is empty. So the *only* way a fish ever enters `forage` or `display` today is the inline tang check (above) — every other species' forage/display states are unreachable in the live scene, even though their profiles declare them. (Root already flagged this class of problem in AQ-44 review round 1: "forage/display states are unreachable".)
5. **The scene emits only three anchor types.** `instantiateModularReefHabitat()` emits 3 `grazingSurface` anchors hard-coded to yellow-tang (AQ-82 description). There are no socket-derived anchors for the anemone, branching-SPS refuges, rock perches, foraging patches, or sand burrows — so most of AQ-45's anchor types have no live location to target. AQ-82 AC #2 owns this.
6. **The coral canopy is one solid box.** Monolithic `coral-canopy-crest` AABBs block fish far outside the branches (AQ-82 description). Until AQ-82 AC #1/#3 replace them with tight rigid cores plus permeable interaction zones, fish cannot physically enter the envelopes the pose offsets describe — and `resolveSafeAnchorInteractionTarget` will keep falling back or giving up.
7. **No behavior trace exists in the live scene.** The demo CLI traces the standalone runtime, but the live scene has no event journal: when a fish does something odd on screen, there is no record of which event caused it.

### 2.3 The design's stance toward the existing code

- **Reuse, don't replace.** The FSM, profiles, navigation adapter, schooling steering, gait system, and extension scaffold are the foundation. The design adds *one* new component (the event bus, §4) and *one* new stage (the pose stage, §5.4), and retires *one* anti-pattern (the inline tang check). Everything else is wiring and data.
- **No parallel systems.** No second FSM, no second schooling implementation, no second anchor system, no behavior-tree package (AQ-44 AC #6 already forbids the last one, and the roster is fixed at 15 species).
- **AQ-82 is a prerequisite, not a parallel track.** Phases 1–4 all need socket-derived anchors (AQ-82 AC #2) and permeable zones (AQ-82 AC #1/#3); Phase 1 additionally needs the pose stage (AQ-82 AC #4). The phasing in §7 sequences AQ-45 work behind the AQ-82 pieces it depends on, and says so explicitly per phase.

---

## 3. The target architecture — code hierarchy

### 3.1 The layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ L6  PRESENTATION — aquarium.ts (tick / render / DOM / rAF)     │
│     Owns: frame clock, LOD, labels, camera, service links.     │
│     Decides NOTHING about behavior. Reads pose, writes pixels. │
├─────────────────────────────────────────────────────────────────┤
│ L5  POSE — pose composition (new: applyAnchorInteractionPose)   │
│     Owns: turning-rig overlay, clip advance, flex uniforms,    │
│     anchor pose offsets. Pure functions of (state, speed,      │
│     maneuver, time). No decisions, no events, no state writes. │
├─────────────────────────────────────────────────────────────────┤
│ L4  STEERING — motion.ts (integrate / stepSwimmingSchool)       │
│     Owns: route following, turn/pitch/bank kinematics,          │
│     schooling heading influence, separation nudge, safety.      │
│     Reads FSM state + navigation requests. Writes position/yaw. │
├─────────────────────────────────────────────────────────────────┤
│ L3  NAVIGATION — habitat-navigation / mesh-navigation (adapters)│
│     Owns: anchor resolution, route finding, obstacle queries.   │
│     Answers arrived / blocked / unavailable with generation.    │
│     Never teleports; never routes through solid geometry.       │
├─────────────────────────────────────────────────────────────────┤
│ L2  TRIGGERS — behavior-event-bus.ts (NEW, §4)                 │
│     Owns: the single dispatch point, the trigger catalog,       │
│     scoping, ordering, the event journal. The ONLY caller of    │
│     dispatchBehaviorEvent outside tests.                        │
├─────────────────────────────────────────────────────────────────┤
│ L1  DECISION — behavior-runtime.ts (FSM, pure functions)        │
│     Owns: per-fish state, timers, transitions, generations.    │
│     No Three.js, no DOM, no I/O. Deterministic given seed +     │
│     event sequence.                                             │
├─────────────────────────────────────────────────────────────────┤
│ L0  DATA — fish-behavior.ts, species-locomotion-extensions.ts,  │
│     tuning tables (gait, patrol itineraries, hotspot staging)   │
│     Immutable, zod-validated, deep-frozen. The only place       │
│     species knowledge lives.                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 What each layer owns — and what it may not touch

| Layer | May read | May write | May NOT |
|---|---|---|---|
| L0 Data | nothing (literals) | nothing at runtime | contain logic, randomness, or time |
| L1 Decision (FSM) | L0 profiles; the event it is given | a new immutable `FishBehaviorInstance` | touch Three.js, DOM, routes, positions, or meshes; dispatch events; call `Math.random` |
| L2 Triggers (bus) | L0 (catalog); L1 instances (to scope/deliver) | the event queue and journal; the next FSM instance via `dispatchBehaviorEvent` | steer, navigate, or pose a fish; invent an event type not in the catalog; dispatch synchronously from inside a handler (§4.5) |
| L3 Navigation | L0 (anchor types); scene geometry via injected queries | a route (`Vec3[]`); an outcome (`arrived` / `blocked` / `unavailable`) | change FSM state (it *reports* outcomes; only L1 transitions); substitute a different anchor; teleport |
| L4 Steering | L1 state + motion intent; L3 routes; L2 schooling influence | position, yaw, pitch, bank, speed, route, turn kinematics | dispatch events (except through the bus — see §4.3); decide *what* the fish is doing (that is L1); read species names to branch behavior (see §3.4) |
| L5 Pose | L1 state; L4 kinematics; L0 gait tables; anchor offsets | clip player advance, flex uniforms, turning-rig overlay, final root transform | change state, position, or route; dispatch events |
| L6 Presentation | L5 pose; service config; camera | canvas, labels, DOM, service links | any behavior decision; any fish state write except through `activate()` → bus (§4.3) |

### 3.3 Dependency direction

Dependencies point **downward only**: L6 → L5 → L4 → L3 → L2 → L1 → L0.
Concretely, with the current module layout:

- `src/lib/fish-behavior.ts` (L0) imports nothing from the scene or
  simulation. It is the leaf every other layer depends on.
- `src/simulation/behavior-runtime.ts` (L1) imports only L0.
- `src/simulation/behavior-event-bus.ts` (L2, new) imports L0 + L1 only.
- `src/simulation/habitat-navigation.ts` / `mesh-navigation.ts` (L3)
  import L0 types only, plus injected geometry queries.
- `src/rendering/scene/motion.ts` (L4) imports L0–L3. It does **not**
  import `aquarium.ts`, the DOM, or Three.js scene objects.
- Pose code (L5: `fish-flex-material.ts`, `fish-turning.ts`,
  `habitat-anchor-interactions.ts`, the new pose stage) imports L0/L1
  types and pure math. The flex material is the one place Three.js
  appears, and only as a shader patch driven by uniforms.
- `src/rendering/scene/aquarium.ts` (L6) imports everything below it
  and owns the frame loop. Nothing below it imports `aquarium.ts`.

**No circular dependencies.** In particular: the FSM never imports
motion, motion never imports the scene, and the scene never reaches into
the FSM except through the bus and the read-only `FishBehaviorInstance`
snapshots. A layer that needs something from a layer above it is a design
error — the need is met by passing data down (a parameter, a request
object, an event), never by importing up.

### 3.4 The species-name rule

**No `speciesId === '…'` branch outside L0 data and L1 profile lookups.**

Today there are two such branches in production code, and both are named
in Appendix A as the pattern to retire:

- `motion.ts` `startleFish`: yellow-tang → `high-effort-cue`, everything
  else → `threat-cue`.
- `motion.ts` `integrateSwimmingFish`: the inline yellow-tang
  foraging-opportunity check.

The replacement is always the same: **the difference lives in the
profile, the code reads the profile.** `startleFish` becomes "dispatch
the activation cue the profile declares for this species"
(`profile.activationCue: 'threat-cue' | 'high-effort-cue'` — a one-field
addition to `SpeciesBehaviorProfile`, defaulting to `threat-cue`). The
tang check becomes the Opportunity Scheduler (§4.4), which reads
`opportunityTrigger` / `opportunityIntervalSeconds` from
`SPECIES_LOCOMOTION_SIGNATURES` and the anchor list from the profile.
If a behavior cannot be expressed as profile data plus a catalogued
event, it is not ready to implement — that is the tripwire, and it is
deliberate.

### 3.5 Where the fish's state lives (single source of truth)

- **Decision state** lives in exactly one place: the immutable
  `FishBehaviorInstance` inside `SwimmingFish.behavior`. It is the only
  record of what state a fish is in, how long it has been there, what
  anchor it targets, and which navigation generation is current.
- **Kinematic state** (position, yaw, pitch, bank, speed, route,
  waypoint, turn kinematics) lives in `SwimmingFish` and is written only
  by L4.
- **Pose state** (clip time, flex time, flex uniforms, turning-rig
  overlay) is *derived* each frame from decision + kinematic state. It is
  never stored as behavior, and never read back as an input to a decision.
  If the renderer is destroyed and rebuilt, the fish resume from decision
  + kinematic state alone.
- **No second copy.** The label layer, the LOD layer, and the service-link
  layer read `SwimmingFish` (or a frozen snapshot of it). They never keep
  their own behavior state. The extension runtime receives frozen
  snapshots (`extensionSnapshot`), never the mutable fish — this existing
  rule is kept and extended to the bus journal.

---

## 4. The trigger model — one bus, one catalog

This is the section Ryan's concern is really about. Everything else in
the document exists to make this section enforceable.

### 4.1 Principles

1. **A trigger is data, not a callback.** A trigger is a value of the
   `BehaviorRuntimeEvent` union (extended only through the catalog
   process in §4.6). It has a type, a scope, and a payload. It is never a
   function reference, a boolean flag on a fish object, or a
   `setTimeout`/`setInterval`.
2. **One dispatch point.** All behavior-changing events flow through a
   single new module, `src/simulation/behavior-event-bus.ts`. It is the
   only production caller of `dispatchBehaviorEvent` (tests excepted).
   Nothing else in the codebase dispatches a behavior event — not the
   integrator, not the scene, not an extension, not a click handler.
3. **Producers and consumers are declared, not discovered.** Every event
   type has exactly one kind of producer (the module allowed to create
   it) and a declared set of consumers (the FSM transitions it may cause,
   gated by profile). If you cannot name the producer, the event does not
   exist.
4. **Events are processed at a fixed point in the tick.** The bus drains
   its queue once per simulation substep, *before* `advanceFishBehavior`
   runs for that substep (see Appendix C). An event never interrupts a
   substep mid-flight, and two events in the same substep are applied in
   queue order. The order is part of the determinism contract.
5. **No trigger chains.** An event handler (a producer) may not dispatch
   another event synchronously. If handling event A requires event B, B
   is enqueued for the *next* substep, and the chain is bounded (see
   §4.5). This is the rule that kills feedback loops.
6. **Scope is enforced by type, not by convention.** Single-fish events
   carry exactly one `instanceId`; group events carry an explicit
   `instanceIds` list and are never broadcast to "all fish" by omission.
   The bus rejects a group event with no list (the existing runtime
   treats an omitted list as "applies to every fish" — the bus must not
   pass that form through; see §4.7).
7. **Every event is journaled.** The bus keeps a bounded ring buffer of
   dispatched events (tick, producer, event, instance(s), resulting
   transition or "no eligible transition"). The journal is the answer to
   "why did this fish do that?" (§4.8).

### 4.2 The bus — what it is

A new, engine-independent module `src/simulation/behavior-event-bus.ts`:

```ts
// Sketch — exact API to be fixed at implementation time, in review.
type BehaviorEventProducer =
  | 'ui-activation'        // AQ-13 service click
  | 'opportunity-scheduler'// §4.4 — profile-driven forage/display chances
  | 'group-disturbance-source' // a named, reviewed disturbance source
  | 'environment-source'   // water/current/ambience, when one exists
  | 'navigation-outcome'   // arrived / blocked / unavailable (§4.3)
  | 'timer'                // window-complete events from the FSM itself

type BusEnvelope = {
  event: BehaviorRuntimeEvent
  producer: BehaviorEventProducer
  tick: number              // simulation substep index
  cause?: string            // free-text reason, for the journal only
}

createBehaviorEventBus(): BehaviorEventBus
bus.enqueue(envelope): void            // producers call this; never dispatch directly
bus.drain(instances): void             // called once per substep, before FSM advance
bus.journal(): readonly JournalEntry[] // last N entries, bounded (e.g. 256)
```

Rules for the bus itself:

- `enqueue` validates: the event type is in the catalog (§4.6), the
  scope matches the type (single-fish events have exactly one
  `instanceId`; group events have a non-empty explicit list), and the
  producer is the declared producer for that type. Invalid envelopes are
  rejected (throw in tests, warn-and-drop in production) — never
  silently delivered.
- `drain` applies events in queue order, one pass, then clears the queue.
  Events enqueued *during* a drain wait for the next substep (this is
  what makes rule 5 mechanical rather than aspirational).
- The queue is bounded (e.g. 64 events per substep). Overflow drops the
  lowest-priority events and records the drop in the journal — it never
  grows without bound and never blocks the frame.
- The bus is **paused/hidden-aware**: while the scene is paused or the
  page is hidden, `enqueue` still accepts UI events (a click during pause
  must not be lost — but see below) and `drain` does not run, so no
  behavior advances. On resume, queued events drain in order, with the
  same per-substep bound. The exception: `activate()` during pause is
  already a no-op in `aquarium.ts` today (`if (!item || paused ||
  document.hidden) return`) — that guard stays, so the paused-queue case
  is for future producers, not for clicks.
- The bus has no Three.js, DOM, or scene imports. It is unit-testable
  with the same harness as `behavior-runtime.test.ts`.

### 4.3 Producers — who may create each event

| Event type | Producer (only) | Created when | Scope |
|---|---|---|---|
| `fish-activation` (`threat-cue` / `high-effort-cue`) | `ui-activation` — `aquarium.ts` `activate(id)` only | A service link is activated (AQ-13). The service still opens immediately; the event is a non-blocking side effect. | Exactly one `instanceId` — the activated fish. Never its schoolmates, never the school. |
| `behavior-opportunity` (`foraging-opportunity` / `display-opportunity`) | `opportunity-scheduler` (§4.4) only | The scheduler's per-species interval elapses *and* the profile's conditions hold (anchor of the right type is near; the state is eligible). | Exactly one `instanceId`. |
| `group-disturbance` (`threat-cue` / `high-effort-cue`) | `group-disturbance-source` — a named, reviewed source only (see §4.7) | A disturbance source fires for a named group. | Explicit, non-empty `instanceIds` — exactly the conspecific grouping-species members. Never omitted, never "all fish". |
| `environment-disturbance` | `environment-source` — a named, reviewed source only | A scene-wide environmental change (none exists today; reserved). | Explicit `instanceIds`, or a documented whole-scene list. Never an implicit broadcast. |
| Navigation outcomes (`arrived` / `blocked` / `unavailable`) | `navigation-outcome` — L3 adapters only | A route completes or fails. | The single fish that owns the request, matched by generation + anchor (§2.1). |
| Window-complete triggers (`idle-window-complete`, `swim-segment-complete`, `foraging-window-complete`, `display-window-complete`, `effort-window-complete`) | `timer` — the FSM itself | A state's sampled duration elapses inside `advanceFishBehavior`. | The fish itself. These are internal; they never pass through the bus queue, but they *are* recorded in the journal so a timer-driven transition is traceable. |
| `refuge-reached` | `navigation-outcome` — arrival at the declared retreat destination only | The fish arrives at its retreat anchor. Arrival at any other anchor cannot produce it (already enforced by `reportNavigationOutcome`). | The single fish. |

**What is deliberately not a producer:** the steering integrator
(`motion.ts`), the pose stage, the render loop, the label layer, the
schooling steering function, and extensions. None of these may create
events. They may *read* FSM state and *request* work through the bus
(`enqueue`), but the request goes through validation and ordering like
any other. In particular:

- The inline yellow-tang check in `integrateSwimmingFish` is **deleted**
  in Phase 0 and replaced by the Opportunity Scheduler (§4.4).
- `startleFish` is refactored in Phase 0 to *enqueue* a
  `fish-activation` through the bus instead of dispatching directly,
  and to read the cue from the profile (`profile.activationCue`)
  instead of a species-name branch (§3.4). Its anchor-compatibility
  guard stays — it is a safety rule, not a trigger.
- `disturbSchool` is refactored in Phase 0 to *enqueue* a
  `group-disturbance` through the bus instead of dispatching directly.
  It keeps its existing scoping (conspecific grouping species only).
  It still has no live caller until a disturbance source is approved
  (§4.7).

### 4.4 The Opportunity Scheduler — the one sanctioned "ambient" producer

Most future "the fish should sometimes do X" requirements are
*opportunities*, not reactions. They belong in one place:

- A pure function `evaluateOpportunities(fish, habitat, elapsedSeconds,
  seed)` that, for one fish, returns zero or one `behavior-opportunity`
  envelope — or nothing.
- It reads only data: the species' `opportunityTrigger` and
  `opportunityIntervalSeconds` from `SPECIES_LOCOMOTION_SIGNATURES`,
  the profile's enabled states and anchors, and the *nearest compatible
  anchor* (the same proximity query the tang check does today, but
  parameterized by the profile instead of hard-coded to 0.9 and to one
  species).
- It is **seeded and interval-based**, not frame-based: an opportunity is
  due when the fish's seeded interval has elapsed since its last
  opportunity, not when a frame happens to run. Two fish of the same
  species never synchronize, because their seeds differ.
- It runs at a fixed point: once per simulation substep, after the bus
  drains and before FSM advance — or, if that proves too frequent, once
  per *frame* (not per substep) with the same seeded intervals. The
  choice is an implementation detail; the invariant is that it runs at a
  declared point in the tick order (Appendix C), never from inside
  steering.
- It is the **only** ambient producer. Any future "sometimes" behavior
  (a wrasse pausing to inspect a crevice, a mandarin pecking a patch)
  is an entry in this scheduler, driven by profile data — not a new
  `if` in the integrator.

### 4.5 No chains, no loops — the feedback rules

1. **One hop per substep.** An event applied in substep *n* may cause
   at most one enqueue, and that enqueue is processed in substep *n+1*
   at the earliest. There is no synchronous re-dispatch path in the bus
   API.
2. **Bounded depth.** If a chain of enqueues would exceed a small bound
   (e.g. 4 hops from one root cause), the bus drops further enqueues
   from that chain and journals the drop. A behavior that needs a longer
   chain is a design error, not a tuning problem.
3. **Cooldowns on disturbance sources.** A group/environment disturbance
   source may fire at most once per cooldown window (tuning data, e.g.
   5 s). This bounds the worst case: one disturbance cannot re-trigger
   itself through the fish it startled.
4. **No self-triggering.** A fish's own state transition never directly
   enqueues an event for itself. (State *durations* already produce the
   next transition internally via window-complete triggers — that is the
   FSM, not an event chain.)
5. **Generation tokens break stale loops.** Navigation outcomes already
   carry generations; the bus applies the same discipline to any future
   event that references a request (an outcome for an old generation is
   dropped, not delivered).
6. **Startle exclusion.** A startled fish is excluded from
   cohesion/alignment (already implemented) **and** from being the
   target of a new opportunity in the same substep. A panicking fish
   cannot be opportunistically sent foraging.

### 4.6 The catalog — and the rule for adding a trigger

Appendix B is the catalog: every event type, its producer, payload,
scope, consumers, and the AQ-45 phase that uses it. The catalog lives in
two places that must agree: this document (the human-readable source of
truth) and the `BehaviorRuntimeEvent` union plus the bus's validation
table (the machine-readable source of truth). A change to one without
the other is an incomplete change, and review should reject it.

**To add a new trigger, all six steps are required:**

1. **Name it** in the catalog (Appendix B) with producer, payload,
   scope, consumers, and the phase that needs it. If an existing event
   type can carry the need, use it — a new type needs a written reason
   why the existing types cannot.
2. **Type it** — extend the `BehaviorRuntimeEvent` union (and the zod
   schema if one is introduced for events) with the new variant.
3. **Declare its producer** — exactly one module may create it, and the
   bus validation table must list that producer.
4. **Gate it by profile** — the FSM transition it causes must be
   declared in the affected species' profiles (or explicitly ineligible:
   the transition table is the gate, and a missing entry means "this
   fish ignores this event").
5. **Test it** — a unit test that the event, delivered to an eligible
   fish, causes the transition; delivered to an ineligible fish, causes
   nothing; delivered with the wrong scope, is rejected.
6. **Journal it** — the event appears in the journal with its producer
   and cause, and `behavior:demo` can show it.

**To remove a trigger**, reverse the process: remove the producer, the
catalog entry, and the type — and prove with a test that nothing
dispatches it anymore. Dead event types are not left in the union.

### 4.7 AQ-44 AC #4 — how the bus completes it

AQ-44 AC #4 is open today: "Event hooks distinguish a single fish
activation from explicit group/environment disturbance; AQ-13 can trigger
only the activated fish, opens its service immediately, and does not cause
screen-wide panic."

The bus completes it by making the distinction **structural**:

- Single activation and group disturbance are different *types* with
  different *producers* and different *scope rules*. A caller cannot
  accidentally send one as the other, because the bus validates the
  envelope against the type.
- The runtime's current loophole — an omitted `instanceIds` on a group
  event means "applies to every fish" — is closed at the bus: the bus
  requires a non-empty explicit list for group/environment events and
  rejects the omitted form. (The runtime function keeps its current
  signature for test compatibility; the bus never passes the omitted
  form.)
- `disturbSchool` keeps its existing scoping and gains a bus path, but
  **still has no live caller** after Phase 0. A live disturbance source
  is a separate, reviewed decision (§8): the candidates are a deliberate
  user gesture (not a service click), a scripted ambience event, or
  nothing at all. Until one is approved, group disturbance exists only
  in tests and the demo — which is the safe default, and is stated here
  so nobody wires it to a click "temporarily".
- The AQ-13 guarantee is preserved and made explicit: `activate()`
  opens the service through the existing native anchor immediately, and
  the `fish-activation` event is enqueued as a non-blocking side effect
  that can only ever name that one fish.

### 4.8 Debugging and traceability — "why did this fish do that?"

- **The journal.** The bus keeps the last N (256) dispatched events:
  tick, producer, event type + trigger, instance(s), the transition it
  caused (or "no eligible transition"), and the cause string. It is a
  plain array of frozen records — no DOM, no console spam by default.
- **The query.** A developer helper, `traceFishBehavior(instanceId)`,
  prints one fish's recent journal entries plus its current FSM
  snapshot (state, elapsed, duration, target anchor, generation). This
  is the first thing a reviewer runs when a fish behaves oddly on
  screen. It extends the existing `behavior:demo` pattern rather than
  inventing a new tool.
- **The demo.** `npm run behavior:demo` is extended (Phase 0) to route
  its scripted events through the bus, so the demo exercises the same
  dispatch path as the live scene — including a group-disturbance
  example for the chromis school dive, which today has no live caller.
- **Logging policy.** The journal is in-memory and off by default in
  production; a debug flag (not a user-facing setting) can dump it.
  Nothing in the journal contains PII, service URLs, or DOM references.

---

## 5. The animation pathway — from decision to pixels

The pathway is a one-way pipeline. Each stage consumes the previous
stage's output and adds exactly one kind of information. No stage reaches
back up the pipeline.

```
perception ──► decision ──► state ──► steering ──► gait/flex ──► pose
 (anchors,      (FSM, L1)   (Motion   (route,     (clip +      (root
  peers,                     Intent)   turn,        Lighthill    transform
  events)                              speed)      wave, rig)   + uniforms)
```

### 5.1 Stage by stage

**Perception (L2/L3, read-only).** What the fish "knows": its compatible
anchors (from the profile + the scene's staged anchor list), its peers
(the pre-move snapshot in `stepSwimmingSchool`), navigation outcomes,
and bus events. Perception never mutates anything. The anchor list is
scene data (AQ-82 AC #2 derives it from sockets); the profile decides
which anchors are *compatible*. A fish never perceives an anchor its
profile does not list.

**Decision (L1, FSM).** Given the current state, elapsed time, and the
events the bus delivered this substep, the FSM selects the next state
from the profile's transition table — or stays. Decisions are pure
functions of (profile, instance, event). The FSM knows nothing about
positions, meshes, or cameras.

**State → motion intent (L1 → L4 boundary).** `getMotionIntent` maps the
six FSM states to six intents (`idle`→`hold`, `swim`→`travel`,
`forage`→`forage`, `display`→`display`, `retreat`→`flee`,
`burst`→`burst`). The intent is the *only* thing steering learns about
the decision. Steering never reads the raw state to branch on species or
behavior — it reads the intent, the target anchor, and the profile's
speed/turn ranges. (There is no `recover` state in the current mapping;
if one is ever added, it maps to `hold` with a distinct cue, and the
mapping table — not a call site — is where that decision lives.)

**Steering (L4).** `integrateSwimmingFish` turns intent + route into
yaw/pitch/bank/speed/position, within the species turn budget, with the
schooling heading influence folded in (AQ-84) and the safety checks
(`movementSafety`) applied to every proposed step. Steering is the only
stage that writes position. It never decides *why* the fish moves.

**Gait / flex (L5, data-driven).** Two parallel, independent channels:

1. **Clip playback** (`FishClipPlayer`): the authored swim/idle/forage
   clips, advanced at `basePlaybackByState[state] × speed gain ×
   animationPlaybackRate`, LOD-gated (AQ-76). Clips are *assets*, not
   code: a new behavior animation is a new clip (or a new
   `basePlaybackByState` entry), not a new branch in the tick.
2. **Lighthill flex** (`evaluateLighthillFlexParams` → uniforms):
   frequency, amplitude, wave number, and gait blend are computed from
   (`speedNorm`, `state`, `maneuverStage`, `startleSeconds`) against the
   per-species gait table. The blend for labriform fish (pectoral cruise
   ↔ body-caudal) is a smoothstep over normalized speed — a continuous
   function of data, not a mode switch in code.

Both channels share one clock (the simulation dt of the current substep)
and freeze together on pause/hidden/focus. Reduced motion neutralizes
the flex amplitude inside `updateFishFlex` — the *decision* to reduce
motion lives in L6 (the media query), the *effect* lives in L5; neither
layer re-implements the other.

**Pose (L5, composition — the new stage, §5.4).** The final root
transform and shader uniforms are composed from, in order: route
position → anchor pose offset → turning-rig overlay → clip → flex wave.
The order is fixed and documented, because each stage's output is the
next stage's input, and reordering them changes the picture.

### 5.2 Animations are data, not code

The rule: **a new behavior animation is a data change; a new code path
is a design-review event.**

| Animation content | Where it lives (data) | Code that reads it |
|---|---|---|
| Which states a species can enter, and what triggers them | `SpeciesBehaviorProfile.states` + `.transitions` (`fish-behavior.ts`) | `behavior-runtime.ts` |
| How fast / how sharply it moves in each state | `locomotion.speedTankWidthsPerSecond`, `turnDegreesPerSecond`, `states[].speedMultiplier` | `motion.ts` |
| Its gait (frequency, amplitude, envelope, wavelength, blend points) | `SPECIES_LOCOMOTION_SIGNATURES[].gait` (`FishFlexGaitParams`) | `fish-body-flex.ts`, `fish-flex-material.ts` |
| Its clip playback rate per state | `basePlaybackByState` | `aquarium.ts` render loop |
| Its pose at an anchor (hover height, pitch, yaw lock, reverse retreat, soft-home radius) | `AnchorInteractionPoseOffset`, computed by `evaluateAnchorInteractionOffset` from (species, anchor, state, time) | the new pose stage (§5.4) |
| Its patrol route (Phase 3) | A `PatrolItinerary` — an ordered list of compatible anchor IDs + dwell times, stored as data (profile-adjacent tuning, §7.3) | the navigation layer, advanced only on `arrived` outcomes |
| Its display (Phase 4) | `display` state config + pose offset (gramma belly-to-rock) + clip/fin overlay *if the asset supports it* | pose stage; fin-flare is asset-gated (§8) |

Nothing in this table is a branch on a species name in steering or
render code. If implementing a behavior requires a new branch, the
behavior is missing a data field — add the field (with a zod schema
bound and a test) instead of the branch.

### 5.3 Blending and interruption — animation best practices

- **State-driven, not timeline-driven.** There is no master timeline and
  no scripted sequence. Every visible motion is a function of the
  current FSM state + continuous inputs (speed, maneuver stage, time).
  This is what makes behavior interruptible: a `threat-cue` can arrive
  in any substep and the fish is in `retreat` by the next one, with no
  animation to cancel.
- **Blend, don't snap.** All continuous quantities blend toward their
  targets with per-substep exponential smoothing at rates already in
  the code (speed `dt × 3.2`, bank `dt × 4`, pitch `dt × 4` or
  rate-limited). The gait blend is a smoothstep over speed. The flex
  amplitude grows from a 35% residual at rest. A state change changes
  the *targets*; the blending is what makes it look continuous.
  Nothing in the pipeline sets a pose discontinuously except waypoint
  acknowledgement, which is already tolerance-gated and safety-checked.
- **Interruptible by construction.** Because pose is derived per frame
  from state, there is nothing to interrupt: a state change next substep
  simply yields a different pose. There are no animation locks, no
  "must finish this clip" states, and no `isAnimating` flags. (The one
  exception is `targetWait` after arrival — a *navigation* pause, not an
  animation lock — and it is bounded: 1.2 s on arrival, 0.7 s on
  failure, 0.2 s on blocked.)
- **Deterministic.** Wave phase is seeded per instance
  (`flexPhaseForInstance`); state durations are sampled from the profile
  range by seeded hash; peer snapshots are pre-move and order-independent.
  Given the same seed and event sequence, the same frames produce the
  same poses. The demo CLI is the proof harness for this property.
- **Zero-mean separation of channels.** The Lighthill wave is zero-mean;
  the turning rig carries the mean bend; the clip carries the authored
  motion; the anchor offset carries the staging. Four channels, four
  jobs, no double-counting. A new animation channel must state which job
  it does and prove it does not duplicate an existing one.
- **Perchers and hovers are first-class gaits.** `benthic_percher`
  returns `amplitudeScale: 0` at rest (no tail wave while perched);
  `banner_hoverer` / `fin-hover` hold with minimal body motion. The gait
  table — not a special case in the tick — is where "this fish barely
  moves" is expressed.

### 5.4 The pose stage — the missing piece (AQ-82 AC #4)

Today the anchor pose offsets are computed nowhere in production (§2.2,
item 1). The design adds exactly one stage, in the render loop, after
steering and before the root transform is written:

```
for each swimmer (in the same per-substep loop that advances clips):
  1. advance FSM + steering            (existing: stepSwimmingSchool)
  2. advance clip + flex uniforms      (existing)
  3. NEW — applyAnchorInteractionPose: if the fish's motion intent is
     hold / forage AND its target anchor is set AND the anchor is
     profile-compatible:
       a. offset = evaluateAnchorInteractionOffset(species, location, state, simTime)
       b. target = resolveSafeAnchorInteractionTarget(position, location, offset, bounds, obstacles, clearance)
          — honoring softTentacleOverlapAllowed and the permeable zones (AQ-82 AC #3)
       c. blend the root position toward target (same smoothing as speed/bank)
          and apply offset.pitchOffsetRad / yawLockToEntrance / reverseRetreat
       d. if target is undefined (blocked): hold current pose, do NOT force it
  4. write root position / rotation    (existing)
```

Rules for the pose stage:

- It runs only when the fish is actually *at* an anchor interaction
  (intent `hold` or `forage` with a set target anchor). A travelling
  fish is never pose-offset — the route owns its position.
- It never writes behavior state and never dispatches events. If the
  offset cannot be resolved safely, it does nothing. Silence is the
  correct failure mode for a pose.
- It is LOD-aware: at LOD2 (sprite) the offset is skipped — a sprite
  cannot nestle. At LOD1 the offset applies at half rate, matching the
  clip cadence.
- It respects pause / hidden / focus / reduced-motion exactly as the
  clip and flex stages do (frozen time → frozen pose; reduced motion →
  offsets scale to zero, like flex amplitude).
- It is where Phase 4's gramma belly-to-rock pose lives: a
  `pitchOffsetRad` + yaw-lock entry in the pose offset for
  (`royal-gramma`, `rockCrevice`, `idle`), not a new rig and not a
  branch in the turning code.

---

## 6. Software best practices, applied concretely

Each practice below is stated as a checkable rule, with the file or
mechanism that enforces it.

### 6.1 Single source of truth

- Decision state: `FishBehaviorInstance`, written only by L1.
- Kinematic state: `SwimmingFish`, written only by L4.
- Pose: derived per frame, never stored as behavior (§3.5).
- Species knowledge: L0 profiles, the only place a species' facts live.
- Anchor locations: the scene's staged anchor list (AQ-82 AC #2),
  derived from sockets — one list, read by L3 and L4, never duplicated
  per fish.
- **Check:** `grep` for a second copy of any of these is a review
  failure. In particular, no module may keep its own "what state is
  this fish in" variable.

### 6.2 Explicit state machines, legal transitions only

- The transition table *is* the state machine. A transition not in the
  table cannot happen, at runtime, by construction (`transitionFor`
  returns `undefined` and the instance is unchanged).
- Adding a behavior means adding a row to a profile's `transitions`
  (with a `selectionWeight`) and the states it connects — never a new
  `if` in the integrator.
- **Check:** every new state or transition ships with a test that an
  ineligible fish ignores the event that would cause it.

### 6.3 Deterministic tick ordering

The order is fixed and documented (Appendix C). The invariants:

- One peer snapshot per substep, taken before any fish moves.
- Bus drains before FSM advance; FSM advances before steering; steering
  before pose; pose before the root transform write.
- The Opportunity Scheduler runs at its declared point, never inside
  steering.
- Frame-rate independence comes from the two-level fixed stepping
  (§2.1): outer 1/60 s, inner 1/30 s, both bounded. No behavior code
  reads wall-clock time or frame count.
- **Check:** the demo CLI reproduces a scripted event sequence
  identically across runs (same seed → same trace).

### 6.4 Separation of decision, steering, and animation

Enforced by the layer table in §3.2. The practical test: **each layer
is unit-testable without the layers above it.** L1 is tested without a
renderer today (`behavior-runtime.test.ts`); L4 is tested without the
scene (`motion` tests use a synthetic habitat); L5's gait math is tested
without Three.js (`fish-body-flex` is renderer-free by design). Any new
behavior code must be testable at its own layer, with the layers above
it stubbed. If a behavior can only be tested by rendering the scene, it
is in the wrong layer.

### 6.5 The extension scaffold is the only sanctioned seam

AQ-55's `fish-extensions.ts` already defines the *only* approved way to
add behavior/animation content that does not belong in the core layers:

- Extensions are registered by name, resolved in layer order
  (`defaults` → `species` → `instanceId`), with explicit `add` /
  `replace` / `disable` operations. Invalid operations throw.
- Behavior extensions receive frozen snapshots and a bounded delta, and
  may request only fish-scoped FSM cues (threat, high effort, forage
  opportunity, display opportunity). They cannot request group events,
  select anchors, create routes, teleport, alter service links, or write
  pose.
- Animation extensions may return only a `playbackRate` in [0.25, 2].
- The live scene currently registers **nothing** (`EMPTY_FISH_EXTENSIONS`).
  That is correct for now: Phases 1–4 are core behaviors, not
  extensions, and belong in the FSM/profiles/bus. Extensions are
  reserved for genuinely optional, per-instance flourishes (e.g. a
  one-off display flourish for a single fish) — and any extension that
  needs a new trigger must still go through the catalog (§4.6).
- **Check:** an extension that reaches for group events, anchors, or
  pose writes is rejected in review. The scaffold's limits are the
  enforcement mechanism.

### 6.6 Config-driven tuning, no magic numbers

All numbers that tune behavior live in data, with a name, a bound, and
a comment saying whether the value is sourced biology or visual tuning:

- Profile ranges (durations, speeds, turns) — zod-bounded at load.
- Gait parameters — `FishFlexGaitParams`, bounded (e.g. tail offset ≤
  0.1 BL).
- Scheduler intervals — `opportunityIntervalSeconds` per species.
- Bus bounds — queue depth, chain depth, disturbance cooldown.
- Pose numbers — `softHomeRadius` (default 0.22, clamped [0.08, 0.45]),
  hover heights, pitch offsets.

The existing magic numbers that must be moved into data as part of
Phase 0 (they are the current tuning debt, named here so they are not
forgotten): the tang proximity radius `0.9` and `2 s` dwell in
`integrateSwimmingFish` (retired with the inline check); `startleSeconds
= 0.95`; `targetWait` values `1.2` / `0.7` / `0.2`; the `0.7` m
minimum-distance check in route planning; the `12` route attempts.
Each gets a named constant or a profile/tuning entry, with a comment.
New magic numbers in behavior code are a review failure.

### 6.7 Testability

| Layer | How it is tested | Exists today? |
|---|---|---|
| L0 profiles | zod schema validation at load; every profile parses or the app fails fast | Yes |
| L1 FSM | deterministic instances, transition eligibility, fixed-step time, pause/hidden, event scoping, stale-generation rejection | Yes (`behavior-runtime.test.ts`) |
| L2 bus | envelope validation, scope rejection, ordering, queue bound, chain bound, journal contents | New (Phase 0) |
| L3 navigation | route/no-route, blocked/unavailable, no-through-solid-geometry, generation matching | Yes (habitat/mesh navigation tests) |
| L4 steering | route following, turn budgets, schooling snapshot determinism, separation safety | Yes (motion/schooling tests) |
| L5 pose | offset values per (species, anchor, state); safe-target fallback; reduced-motion zeroing | Partially (interaction tests exist; pose *application* needs new tests) |
| End-to-end | `behavior:demo` trace through the bus; visual check at 1440×900 and 402×874 for each phase (AC #6/#9 review artifact) | Demo exists; per-phase visual checks are phase exit criteria (§7) |

**Seeded randomness everywhere.** `Math.random` does not appear in
behavior code: seeds come from `seedForId` (FNV hash of the instance
ID) and `hashUnit` (integer hash). The LCG in `SwimmingFish.random`
(`random()`) is the only runtime randomness source in steering, and it
is seeded per fish. A behavior that needs randomness takes a seed.

### 6.8 Failure modes are explicit, not silent — except pose

- Navigation failure: `blocked` / `unavailable` are *reported* to the
  FSM, which clears the target and holds. The fish never teleports,
  never snaps, never routes through rock.
- Bus validation failure: rejected envelopes are journaled (and throw
  in tests). A rejected event is a bug in the producer, and the journal
  is how it is found.
- Pose failure: the pose stage does nothing (§5.4). This is the one
  sanctioned silent failure, because a pose is cosmetic and a forced
  pose is worse than no pose.
- Extension failure: setup failure disposes already-created controllers;
  teardown is idempotent (existing contract, kept).

---

## 7. Phasing and sequencing

The four AQ-45 phases are kept, in order. Phase 0 is added as a
prerequisite: it builds the machinery the other phases stand on, and it
is deliberately small — if Phase 0 cannot be done cleanly, the later
phases must not start.

### Phase 0 — Foundations (prerequisite for everything)

**Goal:** the bus, the scheduler, and the pose stage exist; the two
ad-hoc triggers are retired; the system is traceable.

| # | Work | Files | Completes |
|---|---|---|---|
| 0.1 | New `src/simulation/behavior-event-bus.ts`: envelope validation, scoped dispatch, queue bound, chain bound, journal (256 entries), `traceFishBehavior` helper. | New file + tests | §4.2, §4.8 |
| 0.2 | `startleFish` → enqueue `fish-activation` via the bus; cue from `profile.activationCue` (new profile field, default `threat-cue`); keep the anchor-compatibility guard. `disturbSchool` → enqueue `group-disturbance` via the bus; keep scoping. | `motion.ts` + `fish-behavior.ts` (schema + profiles) | §4.3, §3.4 |
| 0.3 | Delete the inline yellow-tang check from `integrateSwimmingFish`. Add the Opportunity Scheduler (§4.4) reading `opportunityTrigger` / `opportunityIntervalSeconds` + profile anchors. | `motion.ts` (delete), new `src/simulation/opportunity-scheduler.ts` + tests | §4.4, §3.4 |
| 0.4 | Pose stage (§5.4): `applyAnchorInteractionPose` in the render loop, after clip/flex, before the root transform write. LOD-aware, pause/reduced-motion aware. | `aquarium.ts`, tests | §5.4, AQ-82 AC #4 |
| 0.5 | Bus validation closes the omitted-`instanceIds` loophole (§4.7). Extend `behavior:demo` to route scripted events through the bus, including a group-disturbance example. | `behavior-event-bus.ts`, `scripts/behavior-runtime-demo.mjs` | AQ-44 AC #4 (runtime side) |
| 0.6 | Move the named magic numbers (§6.6) into data/constants. | `motion.ts`, tuning tables | §6.6 |

**Depends on:** nothing new. **Enables:** Phases 1–4.
**Exit criteria:** full suite green; the demo trace shows bus-routed
events; a test proves the tang check is gone and forage is reachable
via the scheduler; a test proves a group event with an omitted list is
rejected; the journal answers "why did this fish do that?" for a
scripted scenario.

**AQ-82 ordering note:** Phase 0's pose stage (0.4) only produces
visible results once anchors exist (AQ-82 AC #2) and permeable zones
exist (AQ-82 AC #1/#3). The stage itself can land first (it no-ops
safely when no anchor is set), but its *verification* belongs with
Phase 1. If AQ-82 slips, Phase 0 still lands — it just has nothing to
pose at yet.

### Phase 1 — Hosting, perching, burrows

**Goal:** the interactions whose runtime already exists (AQ-45 ACs
#1–#4) become visible in the scene, staged at the illustrated hotspots.

| # | Work | Files |
|---|---|---|
| 1.1 | Socket-derived anchors (AQ-82 AC #2): `instantiateModularReefHabitat()` emits typed anchors from mounted sockets — `hostAnemone` at `socket_anemone_crevice_01`, `rockPerch`, `foragingPatch`, `sandBurrowEntrance` in the valley sand, `grazingSurface` beyond the current 3. Species compatibility per `docs/fish-behavior-design.md`. | `reef-assembly.ts`, `habitat.ts` |
| 1.2 | Permeable zones (AQ-82 AC #1/#3): tight rigid cores + permeable crowns; `resolveSafeAnchorInteractionTarget` honors `softTentacleOverlapAllowed` and reduced-clearance shelter entry. | `reef-assembly.ts`, `habitat-anchor-interactions.ts`, `habitat-navigation.ts` |
| 1.3 | Stage the anemone: mount `coral-anemone-bta.glb` low on the left island (hotspot 1 in `docs/aquascape-layout.svg`); clownfish soft-home station-keeping at its anchor; Root/user visual acceptance of the staging. | Scene assembly + review artifact |
| 1.4 | Stage the burrows (valley sand) and the blenny ledge; verify firefish hover-bolt vs. goby lookout-back-in read as *different* behaviors on screen. | Scene assembly + review artifact |
| 1.5 | Review artifact for AC #6/#9 (host-anemone, sand-burrow, rock-perch, foraging/grazing categories, with the researched species assignments). | Visual check at both viewports |

**Depends on:** Phase 0; AQ-82 AC #1–#3; the BTA asset (exists).
**Art gate:** anemone staging acceptance (Root/user).
**Exit criteria:** AC #5 (smooth, collision-aware trajectories) and AC
#6 (review artifact) demonstrable; the clownfish visibly lives at its
anemone and the burrow behaviors are distinguishable.

### Phase 2 — Schooling positions above coral heads

**Goal:** chromis/anthias school centroids anchor above the branching
Acropora thickets; the school dives into the thicket on disturbance.

| # | Work | Files |
|---|---|---|
| 2.1 | `schoolCenter` anchors staged above the left-crest and right-crest thickets (hotspots in the layout SVG). The school's navigation request targets `schoolCenter`; the centroid is the anchor, individual fish keep per-fish offsets. | `reef-assembly.ts`, profiles |
| 2.2 | Dive behavior: `group-disturbance` → eligible species transition to `retreat` with destination `branchingCoralRefuge` (chromis profile already declares this at ×1.7; anthias has no retreat state, so a disturbance leaves it on its cycle — no retreat is invented). Retreat target = branch interior, using AQ-82 permeable zones. | Profiles (already declared), bus (existing `group-disturbance`), tests |
| 2.3 | Disturbance source decision (§8): approve a live source, or keep group disturbance test/demo-only. **No live source is wired until this decision is made.** | Decision record in this doc + AQ-44 AC #4 |

**Depends on:** Phase 0; AQ-82 AC #1–#3 (permeable thicket interiors);
Phase 1's anchor staging.
**Art gate:** dense branching Acropora thickets the school can visibly
dive into (AQ-70.11/AQ-59 modeling lane). Without them, the dive has
no visible destination and Phase 2 cannot be verified — it waits.
**Exit criteria:** the school holds above the thicket; a disturbance
sends the chromis into the branches and they recover; anthias behavior
is unchanged by the disturbance (verified, not assumed).

### Phase 3 — Grazing / probing patrols

**Goal:** tang/angelfish grazing paths, wrasse patrol loops, copperband
probe pauses — as navigation, not as new events.

| # | Work | Files |
|---|---|---|
| 3.1 | `PatrolItinerary` data: an ordered list of compatible anchor IDs + dwell times per species, stored as tuning data (profile-adjacent, zod-validated). Yellow tang and flame angelfish graze along rock-face anchors; six-line wrasse loops crevice anchors with peck pauses; copperband probes crevice anchors with snout-down pauses. | New tuning table + schema |
| 3.2 | Itinerary advancement: owned by the navigation layer, advanced **only** on `arrived` outcomes for the current waypoint. A `blocked`/`unavailable` outcome skips to the next waypoint (or holds — declared per itinerary), never substitutes a different anchor type. No new event types. | `motion.ts` (`plan` / `replanNavigation` area), tests |
| 3.3 | Rest-in-crevice state for the tang at idle-equivalent (the existing `idle` state at a `rockCrevice` anchor — a data change, not a new state). | Profiles |

**Depends on:** Phase 0; Phase 1 anchors (grazing/crevice/foraging
anchors must exist to patrol between).
**Exit criteria:** patrols read as purposeful routes, not wandering;
a blocked waypoint degrades gracefully (skip/hold, no snap, no stall).

### Phase 4 — Display / territory

**Goal:** gramma belly-to-rock, flasher display runs, clownfish anemone
defence — all through existing states and the pose stage.

| # | Work | Files |
|---|---|---|
| 4.1 | Gramma pose: (`royal-gramma`, `rockCrevice`, `idle`) pose offset — belly-to-rock pitch + yaw lock — in the pose stage (§5.4). No new rig. | `habitat-anchor-interactions.ts` (offset data), pose stage |
| 4.2 | Flasher display runs: `display` state in open water above the right island, driven by the Opportunity Scheduler (`display-opportunity`); fin-flare overlay only if the asset supports it (§8). | Scheduler data, profiles |
| 4.3 | Clownfish defence: a `display` variant at the anemone anchor — a short dart *within* the soft-home radius toward an approaching fish, then return. **Bounded dart, no dynamic target** (§8): the dart is a pose/steering excursion inside the anchor envelope, not a navigation request to a moving fish. | Pose stage + scheduler data |

**Depends on:** Phase 0; AQ-44 AC #4 (the bus — completed in Phase 0);
Phase 1 (the anemone must be staged for defence to mean anything).
**Exit criteria:** display behaviors are occasional and interruptible
(they never block a `threat-cue`); the gramma reads as belly-to-rock
under its ledge.

### Deliberately deferred (not in any phase)

- **The pistol shrimp itself** (AQ-45 out of scope): the goby's lookout
  reads alone. A shrimp asset + burrow-digging animation is a separate
  modeling task if ever wanted.
- **Spawning, mating, anthias sex change.**
- **Cleaner–client interactions** (gramma's facultative cleaning is
  noted for a future task; it needs a roster decision — there is no
  obligate cleaner in the 15).
- **Inter-species aggression beyond the AQ-13 startle.**
- **Anemone stinging of non-host fish** (no predation model).
- **A live group-disturbance source** until §8's decision is made.
- **New FSM states.** If a phase seems to need one, that is a design
  review trigger, not an implementation detail.

---

## 8. Risks and open decisions

| # | Risk / decision | Why it matters | Needs | Default if undecided |
|---|---|---|---|---|
| 1 | **Art gate: dense branching Acropora thickets** (AQ-70.11/AQ-59). Phase 2's dive has no visible destination without them. | The chromis/anthias dive is the most visible Phase 2 behavior; without thickets it cannot be verified. | Root art acceptance + modeling lane (the coral-bommie PoC is the start; thickets are a separate asset). | Phase 2 waits. Phase 1 and 3 proceed. |
| 2 | **Art gate: burrow-mouth visuals.** Burrows are currently anchor points in sand, not visible mouths. | Firefish/goby behaviors read as "hovering over sand" without a visible entrance. | Modeling lane or a staging decision (a darkened sand patch + rock lip as a stand-in, Root-approved). | Burrows stage as anchors only; the behaviors still read (hover height + bolt direction carry them). |
| 3 | **Anemone staging acceptance.** The BTA asset exists; where it sits and how the clownfish reads against it is a visual judgment. | Phase 1's headline interaction. | Ryan/Root visual review at both viewports (AQ-45 AC #6/#9 artifact). | The anemone stays unstaged; the clownfish keeps its current anchor (no host substitution — Acropora is never the host). |
| 4 | **Disturbance source (live group-disturbance trigger).** Today there is none, by design. | Phase 2's dive needs *something* to trigger it in the live scene, or it is demo-only. | Ryan decision: a deliberate user gesture (not a service click), a scripted ambience event, or nothing. | Nothing: group disturbance stays test/demo-only. This is safe and explicit. |
| 5 | **Clownfish defence targeting.** A dart *at* a moving fish needs a dynamic navigation target, which the adapter does not support. | The bounded-dart design (§7, Phase 4) avoids this, but it is a weaker visual than a real chase. | Ryan/Root: accept the bounded dart, or approve a dynamic-target extension to the navigation adapter (a design change, not a tweak). | Bounded dart inside the soft-home radius. |
| 6 | **Gait table values are tuning starting points, not measured kinematics** (stated in `species-locomotion-extensions.ts`; Root to confirm). | Wrong frequencies/amplitudes read as wrong species. | Root review of the gait table per species as phases land. | Current values stand; they are labeled tuning, not biology. |
| 7 | **Fin-flare overlay needs asset support.** No dorsal/anal fin bones are bound anywhere; the flex shader has only a mask fallback. | Flasher display without fin flare is just a fast swim. | Asset review: whether the flasher rig can support a flare, or whether display is conveyed by speed + color + path alone. | Display conveyed by path/speed; no fin-flare claim. |
| 8 | **Dual navigation modes (AABB legacy vs. mesh metric).** The bus and FSM must be mode-agnostic, but the pose stage and safety checks differ per mode. | A behavior verified in one mode could break in the other. | Each phase's tests run in both modes (the existing pattern: tests at both viewports, both modes where applicable). | Phases verify in the mode the scene actually runs; the other mode is a regression check, not a blocker. |
| 9 | **Performance: per-substep peer snapshot + journal.** The snapshot is already per-substep; the journal adds a bounded append per event. | Negligible at 15–25 fish, but the bound must be enforced, not assumed. | A perf note in Phase 0's tests (journal append is O(1), queue bound enforced). | Bounds enforced; no unbounded structures in the hot path. |
| 10 | **AQ-82 slippage.** Phases 1–2 depend on AQ-82 AC #1–#3. | If AQ-82 slips, AQ-45's visible work slips with it. | Track AQ-82 as a Phase 1/2 dependency in the tracker; Phase 0 still lands independently. | Phase 0 lands; Phases 1–2 wait. |

---

## Appendix A — current-state trigger audit (the spaghetti inventory)

Every production path that can change a fish's behavior today, as of tip
`75a33ae`. This is the complete list the design must shrink to one bus.

| # | Trigger path | Where | Species-specific? | Problem (or: fine as-is) |
|---|---|---|---|---|
| A1 | Timer: state duration elapses → window-complete transition | `behavior-runtime.ts` `advanceFishBehavior` | No — profile-driven | **Fine.** The model for all triggers: internal, seeded, traceable. |
| A2 | Service click → `activate(id)` → `startleFish` → `fish-activation` | `aquarium.ts:1482` → `motion.ts` `startleFish` | Yes — yellow-tang gets `high-effort-cue`, others `threat-cue` | **Retire the branch** (Phase 0.2): cue from `profile.activationCue`. The dispatch path itself is correct and stays. |
| A3 | Inline proximity check → `foraging-opportunity` | `motion.ts` `integrateSwimmingFish` (yellow-tang, `swim`, >2 s, anchor <0.9, stale generation) | Yes — hard-coded species, distance, and time | **Delete** (Phase 0.3). The anti-pattern. Replaced by the Opportunity Scheduler. |
| A4 | `disturbSchool` → `group-disturbance` (scoped) | `motion.ts` `disturbSchool` | No — scoping is by grouping mode, which is data | **Fine, but uncalled.** Gains a bus path in Phase 0.2; still no live caller until §8 decision 4. |
| A5 | Extension behavior intents → `dispatchBehaviorEvent` | `motion.ts` `stepFishExtensions` → `fish-extensions.ts` | No — extensions request only fish-scoped FSM cues | **Fine, but unused.** Registry is empty in the live scene. The bus subsumes the dispatch; extensions keep requesting, the bus delivers. |
| A6 | Navigation outcomes → `reportNavigationOutcome` → `refuge-reached` (retreat arrival only) | `motion.ts` `completeRouteWaypoint` / `reportMeshNavigationFailure` | No — generation + anchor matched | **Fine.** The model for outcome-driven transitions. |
| A7 | Opportunity data with no driver | `species-locomotion-extensions.ts` (`opportunityTrigger`, `opportunityIntervalSeconds`) | No — data | **Gap.** No code reads it. The scheduler (Phase 0.3) is the driver. |
| A8 | Pose offsets computed, never applied | `habitat-anchor-interactions.ts` (no production caller) | No | **Gap.** The pose stage (Phase 0.4) is the caller. |
| A9 | `behavior-opportunity` (display) — no producer | — | — | **Gap.** The scheduler (Phase 0.3) is the producer. |

**Count after Phase 0:** A1 (fine), A2 (via bus), A4 (via bus), A5 (via
bus), A6 (fine) — five paths, all through or alongside the bus, all
traceable in the journal. A3 deleted, A7/A8/A9 closed by the scheduler
and the pose stage.

---

## Appendix B — the trigger catalog

The human-readable source of truth. The machine-readable twin is the
`BehaviorRuntimeEvent` union + the bus validation table (§4.6); the two
must agree.

| Event / trigger | Type | Producer | Payload | Scope | FSM effect (profile-gated) | AQ-45 phase |
|---|---|---|---|---|---|---|
| `idle-window-complete` | timer (internal) | FSM | — | self | `idle` → `swim` (or profile's declared next) | all |
| `swim-segment-complete` | timer (internal) | FSM | — | self | `swim` → `idle` (or declared next) | all |
| `foraging-window-complete` | timer (internal) | FSM | — | self | `forage` → `swim` | 1, 3 |
| `display-window-complete` | timer (internal) | FSM | — | self | `display` → `swim`/`idle` | 4 |
| `effort-window-complete` | timer (internal) | FSM | — | self | `burst` → `swim` (cruise) | 1–4 (burst) |
| `foraging-opportunity` | `behavior-opportunity` | Opportunity Scheduler | `instanceId` | one fish | `swim` → `forage` (if declared) | 1, 3 |
| `display-opportunity` | `behavior-opportunity` | Opportunity Scheduler | `instanceId` | one fish | `swim`/`idle` → `display` (if declared) | 4 |
| `threat-cue` (single) | `fish-activation` | UI activation (AQ-13) | `instanceId` | one fish | → `retreat` (if declared) | 1, 2 |
| `high-effort-cue` (single) | `fish-activation` | UI activation (AQ-13) | `instanceId` | one fish | → `burst` (if declared) | 1–4 (burst) |
| `threat-cue` (group) | `group-disturbance` | Approved disturbance source (§8.4) or tests/demo | explicit `instanceIds` | named group only | → `retreat` for each eligible member | 2 |
| `high-effort-cue` (group) | `group-disturbance` | Approved disturbance source or tests/demo | explicit `instanceIds` | named group only | → `burst` for each eligible member | 2 |
| `threat-cue` (environment) | `environment-disturbance` | Approved environment source or tests/demo | explicit `instanceIds` | named list only | → `retreat` for each eligible member | reserved |
| `refuge-reached` | navigation outcome | L3 adapter (arrival) | generation + anchor | one fish | `retreat` → `idle` (only if the arrival anchor is the declared retreat destination) | 1, 2 |
| `arrived` (non-refuge) | navigation outcome | L3 adapter | generation + anchor | one fish | No state change; the itinerary (Phase 3) may advance to the next waypoint | 3 |
| `blocked` / `unavailable` | navigation outcome | L3 adapter | generation + anchor | one fish | Target cleared; fish holds; `replanNavigation` retries only the declared target | 1–4 |

**Explicitly not events:** waypoint arrival for patrols is a navigation
outcome, not a new event type (§7, Phase 3). The gramma's belly-to-rock
pose is a pose offset, not an event (§5.4). The clownfish defence dart
is a bounded excursion inside an anchor envelope, not a navigation
request (§7, Phase 4). If a future behavior seems to need a new row in
this table, apply the six-step rule in §4.6.

---

## Appendix C — tick order, per frame and per substep

**Per frame** (`tick` in `aquarium.ts`, via `consumeFrameSteps`):

1. Consume frame steps (outer clock: 1/60 s, max 6, max 0.1 s/frame).
2. Record frame interval (quality controller, FPS sampler — read-only).
3. `render(steps)`.

**Per frame, inside `render(steps)`** (existing order, kept):

1. Particles, bubbles, reef controllers update (optics — untouched by
   this design).
2. For each simulation substep (1/60 s of simulation time):
   a. `stepSwimmingSchool(all swimmers, habitat, dt, stoppedFlags)` —
      see per-substep order below.
   b. Per fish: clip advance (LOD-gated) → flex uniforms update →
      turning-rig overlay (LOD0) → **NEW: anchor pose stage (§5.4)**.
   c. `animationStepIndex++`.
3. Write root positions/rotations from motion pose (+ pose offsets).
4. Labels, LOD evaluation, render.

**Per substep, inside `stepSwimmingSchool`** (the order that makes
behavior deterministic):

1. **Bus drain.** The bus applies queued events, in queue order, via
   `dispatchBehaviorEvent`. Events enqueued during this drain wait for
   the next substep.
2. **Opportunity Scheduler.** One evaluation per fish (seeded intervals);
   any due opportunity is enqueued for the *next* substep — never
   applied in the same substep it was detected.
3. **Peer snapshot.** One pre-move snapshot of all peers (positions,
   yaws, speeds, startle flags).
4. **Per fish, in list order:** `integrateSwimmingFish` (FSM advance →
   school turn → plan → route follow → turn kinematics) → separation
   nudge (safety-checked) → `stepFishExtensions` (extension intents go
   through the bus; see §4.3).
5. **Journal flush.** The substep's applied events are already in the
   journal as they were applied; no separate flush step is needed.

**Invariants:** the FSM advances exactly once per substep per fish; no
event is applied twice; no event is applied in the substep it was
created; the peer snapshot never sees a half-moved school.

---

## Appendix D — file map per phase

| File | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|---|
| `src/simulation/behavior-event-bus.ts` (new) | ● create | — | — | — | — |
| `src/simulation/opportunity-scheduler.ts` (new) | ● create | — | — | ● extend (patrol-adjacent opportunities) | ● extend (display) |
| `src/simulation/behavior-runtime.ts` | ○ (no change; bus calls it) | — | — | — | — |
| `src/lib/fish-behavior.ts` | ● `activationCue` field + schema | ● anchor/staging data as needed | ● `schoolCenter` targeting | ● itinerary-adjacent fields | ● display configs |
| `src/rendering/scene/species-locomotion-extensions.ts` | ○ (scheduler reads existing fields) | — | — | — | — |
| `src/rendering/scene/motion.ts` | ● retire tang check; bus-ify startle/disturb; magic numbers → data | — | — | ● itinerary advancement | — |
| `src/rendering/scene/aquarium.ts` | ● pose stage call; bus wiring | ● anchor staging (via assembly) | — | — | — |
| `src/rendering/scene/habitat-anchor-interactions.ts` | ○ (exists) | ● permeable-zone honoring (AQ-82) | — | — | ● gramma pose offset |
| `src/rendering/scene/reef-assembly.ts` + `habitat.ts` | — | ● socket-derived anchors (AQ-82 AC #2) | ● `schoolCenter` anchors | ● patrol waypoints exist as anchors | — |
| `src/simulation/habitat-navigation.ts` / `mesh-navigation.ts` | ○ | ● permeable zones (AQ-82 AC #1/#3) | — | — | — |
| `scripts/behavior-runtime-demo.mjs` | ● bus-routed trace | — | ● group-dive demo | — | — |
| `docs/aq45-interaction-architecture.md` (this doc) | ● create | ○ (decision updates) | ○ | ○ | ○ |
| `backlog/tasks/aq-45 - …md` | ● reference this doc | ● AC updates as phases land | ● | ● | ● |
| `backlog/tasks/aq-44 - …md` | ● AC #4 closes (runtime side) | — | — | — | — |
| `backlog/tasks/aq-82 - …md` | ● AC #4 (pose stage) | ● AC #1–#3 | ● | — | — |

● = changed in this phase · ○ = read / referenced, not changed

**Review gates:** Phase 0 is reviewed as one PR (bus + scheduler + pose
stage + retired triggers + tests + demo). Each later phase is its own PR
against this design; a phase PR that needs a design change amends this
document in the same PR, with the change called out in the PR body.
No phase PR may add a trigger without the §4.6 six-step checklist
completed in the PR description.

---

## Document history

- 2026-11-09 — Draft created from a read of the code at tip `75a33ae`
  (behavior-runtime, fish-behavior profiles, motion, schooling,
  habitat-anchor-interactions, flex, clock, extensions, aquarium tick,
  AQ-44/AQ-45/AQ-82 task files, fish-behavior-design and
  behavior-runtime-contract). Awaiting Root review.
