---
id: AQ-17
title: Represent network traffic with an aquarium pump flow indicator
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-03T19:16:00Z'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
priority: medium
type: feature
ordinal: 17000
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
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only source inventory on trappserv.er (2026-11-03): /proc/net/dev exposes enp4s0 plus many Docker bridges/veth interfaces. A one-second read-only sample showed enp4s0 RX and TX counters both increasing. AQ17 adapter proposal: mount only the host counter source read-only (or use an equally narrow host-side read-only source), let the user select an interface, and compute separate ingress/egress rates from successive byte counters with timestamps; keep enp4s0 distinct from bridge/veth counters rather than summing them. Mark first sample, counter reset, stale sample, or missing interface as unavailable. Avoid host networking on the app container unless a later review proves it necessary, because the app must keep its service port loopback-only. Existing Authelia remains server-side; do not transfer its tokens or add a client auth SDK. No exporter or network config was changed.

Backend sampler slice implemented for review: `src/server/network-traffic.ts`, focused coverage in `src/server/network-traffic.test.ts`, contract in `docs/network-traffic-source.md`. It accepts only the configured trusted source registry and reads fixed `rx_bytes`/`tx_bytes` files under its configured stats root. Source selection is by stable ID; exact BigInt uint64 deltas are converted to B/s after subtraction. Per-source serialized sampling protects baselines. First sample, invalid/reset counters or elapsed time, stale intervals, and source read failures return unavailable/stale without fabricated traffic. Validation: `npx vitest run src/server/network-traffic.test.ts` (8/8 passed); `npm run typecheck` passed. No API route, Compose/mount, deployment, UI/settings, AC checks, or task completion in this slice.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-03T19:11:00Z

---

Read-only inventory/source proposal on trappserv.er (2026-11-03 19:10 UTC): host counters are available at `/sys/class/net/<interface>/statistics/{rx_bytes,tx_bytes}` and `/proc/net/dev`. `/sys/class/net` has the host NIC `enp4s0`, loopback, Docker bridges, and many veth interfaces; bridge/veth counters are active and must not be summed as host traffic. Two samples about one second apart showed enp4s0 increasing by about 33 kB RX and 34.5 kB TX, confirming live counters, not a long-term rate baseline. Interface names and counters are read-only; no network configuration was changed.

Proposed next integration (not implemented): expose only the host network statistics source read-only if a later reviewed deploy includes it, then enumerate interfaces and let the user select one. Compute RX/TX rates separately from byte-counter deltas and elapsed sample time. First sample, missing interface, counter decrease/reset, stale timestamp, or malformed counters should show unavailable/stale instead of a zero/healthy-looking flow. Keep physical host interface and container bridge/veth counters distinct; do not use host networking or install an exporter. No mount or server config was changed.

---
<!-- COMMENTS:END -->
