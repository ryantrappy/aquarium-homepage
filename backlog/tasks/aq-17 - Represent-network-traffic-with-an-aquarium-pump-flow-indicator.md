---
id: AQ-17
title: Represent network traffic with an aquarium pump flow indicator
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-03T19:25:00Z'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
priority: low
type: feature
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a pump gear or flow element that visualizes actual network traffic rates from a user-selected interface or source. Research a configurable integration source during implementation; preserve read-only behavior and do not change server networking. This is read-only aquarium telemetry, not service health monitoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The pump indicator displays actual network ingress and egress rates with units for the selected interface or source.
- [ ] #2 The user can select or configure the interface or traffic source represented by the pump.
- [ ] #3 Ingress and egress are visually distinguished and their numeric rate values are readable.
- [ ] #4 The pump is visually embedded as aquarium equipment rather than presented as a conventional dashboard card or overlay.
- [ ] #5 Unavailable and stale source data are identified clearly; no simulated or fabricated healthy-looking traffic is shown.
- [ ] #6 Reading telemetry does not modify server or network configuration.
- [ ] #7 The pump gear animates and visible water flow responds to actual measured traffic, distinguishes ingress from egress, and both motion and flow honor the existing global pause control.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Luna completes the task with high reasoning effort.
- [ ] #2 Root agent reviews the completed result before the task is marked Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read the latest review and keep this slice limited to a trusted server-side source registry and bounded byte-counter sampler.
2. Implement explicit source selection by stable ID, reading only rx_bytes/tx_bytes under the configured trusted statistics root; use injected monotonic elapsed and wall clocks.
3. Preserve large integer counters exactly, compute nonnegative rates from counter deltas and elapsed time, and return honest unavailable/stale states for first samples, reset/invalid counters, unavailable reads, or invalid/stale elapsed time. Serialize/correlate concurrent samples so baselines cannot be corrupted.
4. Add focused tests for rates, large counters, status transitions, source selection/path bounds, stale reads, and concurrent sampling; write a short source contract with units and limits.
5. Leave API route, Compose/mount, remote deployment, UI/settings, and task Done criteria for root review/future work.

### Specific Code Changes & Locations

- **Coalesced `uint64` Byte-Counter Sampler (`src/server/network-traffic.ts` & `src/server/network-traffic.test.ts`)**:
  - Reads `/sys/class/net/<iface>/statistics/{rx_bytes,tx_bytes}` for configured trusted interfaces (e.g. `enp4s0`), coalesces concurrent reads within `minimumSampleIntervalMs = 250`, and computes exact `rxBytesPerSecond` (ingress) and `txBytesPerSecond` (egress) deltas.
- **GET API Route & Settings Interface Selector (`src/server/api.ts` & `src/components/SettingsModal.tsx`)**:
  - Expose `GET /api/telemetry/network-traffic?sourceId=<id>` with `Cache-Control: no-store` and allow selecting the monitored interface in `SettingsModal.tsx`.
- **In-Tank Return Pump / Wavemaker Impeller & Flow Plume (`src/rendering/scene/aquarium.ts`)**:
  - Render a side-mounted reef wavemaker/pump housing at `x = 3.65, y = 1.15, z = -2.2` whose intake/impeller rotation rate scales with `rxBytesPerSecond` (ingress) and whose output nozzle micro-stream velocity scales with `txBytesPerSecond` (egress), freezing impeller rotation and stream particles when `paused || reducedMotion` is active.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only source inventory on trappserv.er (2026-11-03): /proc/net/dev exposes enp4s0 plus many Docker bridges/veth interfaces. A one-second read-only sample showed enp4s0 RX and TX counters both increasing. AQ17 adapter proposal: mount only the host counter source read-only (or use an equally narrow host-side read-only source), let the user select an interface, and compute separate ingress/egress rates from successive byte counters with timestamps; keep enp4s0 distinct from bridge/veth counters rather than summing them. Mark first sample, counter reset, stale sample, or missing interface as unavailable. Avoid host networking on the app container unless a later review proves it necessary, because the app must keep its service port loopback-only. Existing Authelia remains server-side; do not transfer its tokens or add a client auth SDK. No exporter or network config was changed.

Backend sampler slice implemented for review: `src/server/network-traffic.ts`, focused coverage in `src/server/network-traffic.test.ts`, contract in `docs/network-traffic-source.md`. It accepts only the configured trusted source registry and reads fixed `rx_bytes`/`tx_bytes` files under its configured stats root. Source selection is by stable ID; exact BigInt uint64 deltas are converted to B/s after subtraction. Per-source serialized sampling protects baselines. First sample, invalid/reset counters or elapsed time, stale intervals, and source read failures return unavailable/stale without fabricated traffic. Validation: `npx vitest run src/server/network-traffic.test.ts` (8/8 passed); `npm run typecheck` passed. No API route, Compose/mount, deployment, UI/settings, AC checks, or task completion in this slice.

Follow-up verification: expanded sampler coverage to include absolute trusted-root/unique-ID validation, over-uint64 counters, and nonfinite elapsed-clock recovery. Final focused result: `npx vitest run src/server/network-traffic.test.ts` (10/10 passed); `npm run typecheck` passed.

Root review round 1 addressed: identical concurrent reads now share one in-flight same-source sample, and sequential calls within `minimumSampleIntervalMs` (default 250 ms, bounded to at most half `staleAfterMs`) receive cached results. Warm-up calls preserve the original baseline; cached fresh values carry truthful monotonic age. Source descriptors are copied on store creation and enumeration, while returned readings are cloned and expose no internal elapsed field. Added regressions for coalescing, fast warm-up/fresh cache behavior, source/config/descriptor/result mutation, and interval bound. Verification: `npx vitest run src/server/network-traffic.test.ts` (12/12 passed); `npm run typecheck` passed. No API, Compose, remote, or UI changes.

Root review round 2 addressed: cached stale-result branches now pass the absolute monotonic sample time to age calculation. Added regression coverage for a failed read at t=3500 cached and read again at t=3600 (age 2600 ms), and for a cached last-good value already beyond the stale window. Validation: focused network sampler tests 13/13 passed; `npm run typecheck` passed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-03T19:11:00Z

---

Read-only inventory/source proposal on trappserv.er (2026-11-03 19:10 UTC): host counters are available at `/sys/class/net/<interface>/statistics/{rx_bytes,tx_bytes}` and `/proc/net/dev`. `/sys/class/net` has the host NIC `enp4s0`, loopback, Docker bridges, and many veth interfaces; bridge/veth counters are active and must not be summed as host traffic. Two samples about one second apart showed enp4s0 increasing by about 33 kB RX and 34.5 kB TX, confirming live counters, not a long-term rate baseline. Interface names and counters are read-only; no network configuration was changed.

Proposed next integration (not implemented): expose only the host network statistics source read-only if a later reviewed deploy includes it, then enumerate interfaces and let the user select one. Compute RX/TX rates separately from byte-counter deltas and elapsed sample time. First sample, missing interface, counter decrease/reset, stale timestamp, or malformed counters should show unavailable/stale instead of a zero/healthy-looking flow. Keep physical host interface and container bridge/veth counters distinct; do not use host networking or install an exporter. No mount or server config was changed.

---

author: @root
created: 2026-11-03T19:18:00Z

---

Root backend review round 1: rate math, fixed counter paths, uint64 subtraction and stale/reset handling are sound. Before accepting this slice, coalesce concurrent same-source reads and add a minimum sample interval/cache (bounded relative to staleAfterMs). Back-to-back clients should receive the shared current result rather than reset a coherent baseline or manufacture near-zero intervals/noisy rates; repeated calls during initial warmup must preserve the first baseline until enough time elapses. Report truthful age for a cached successful reading. Copy trusted source descriptors at creation, and do not return the stored lastGood object with its internal elapsedAt field by reference; caller mutation must not change later readings. Add regressions for concurrent/coalesced and quick sequential reads, baseline preservation, and returned-object/config mutation. No API, mount, UI or Done claim.

---

author: @root
created: 2026-11-03T19:22:00Z

---

Root backend review round 2: coalescing, warmup caching and defensive copies are accepted. One age bug remains in readCache: it computes ageMs from sampledElapsedAt and elapsedAt, then passes that duration to staleFromLastGood, which expects an absolute monotonic timestamp and subtracts sampledElapsedAt again. Example last good at1000, failed read3500, cached read3600 should age2600, but returns1600. Pass elapsedAt into staleFromLastGood in both cached-stale branches, and add regression after a failed read plus a cached result whose prior good sample exceeds staleAfterMs. Keep meaningful timestamps nonzero in tests.

---

author: @root
created: 2026-11-03T19:25:00Z

---

Root accepts the backend sampler slice after two review rounds: fixed-file trusted source configuration, exact uint64 counter deltas, independent B/s rates, warmup/reset/stale semantics, coalesced and bounded sampling, defensive copies, and corrected cached stale age. Root reviewed both nonzero-timestamp regressions and the source contract. This is not a deployed endpoint or pump visualization; settings, scene equipment, pause/flow integration, live source mount and user-facing ACs remain pending. No Done status.

---
<!-- COMMENTS:END -->
