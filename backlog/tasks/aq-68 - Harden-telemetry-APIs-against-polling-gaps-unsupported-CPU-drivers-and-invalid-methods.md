---
id: AQ-68
title: >-
  Harden telemetry APIs against polling gaps, unsupported CPU drivers, and
  invalid methods
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-05 18:33'
updated_date: '2026-11-05 21:20'
labels: []
dependencies: []
references:
  - src/server/network-traffic.ts
  - src/server/cpu-temperature.ts
  - src/routes/api/config.ts
  - src/server/network-traffic.test.ts
  - src/server/cpu-temperature.test.ts
  - src/routes/api/-config.test.ts
  - src/routes/api/telemetry/-cpu-temperature.test.ts
  - src/routes/api/telemetry/-network-traffic.test.ts
documentation:
  - docs/network-traffic-source.md
  - docs/deployment.md
priority: medium
type: bug
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In network-traffic.ts, staleAfterMs defaults to 15s; any client polling at intervals greater than 15s repeatedly resets the baseline and never receives a traffic rate. In cpu-temperature.ts, the sensor discovery logic hardcodes Intel coretemp and rejects AMD k10temp/zenpower drivers. In /api/config, missing ANY handlers lead to non-standard method responses, and origin validation passes when both Origin and Sec-Fetch-Site headers are absent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Network traffic rate calculation tolerates client polling intervals up to 60s without immediately invalidating baselines
- [x] #2 CPU temperature store supports AMD k10temp and zenpower sensor names alongside Intel coretemp
- [x] #3 /api/config registers an explicit ANY handler returning HTTP 405 Method Not Allowed with an Allow header for unsupported methods
- [x] #4 Configuration write origin validation enforces origin headers for mutating requests in production mode
- [x] #5 Automated unit and integration tests cover slow polling intervals, AMD CPU discovery, and HTTP 405 method rejection
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce each reported telemetry allegation against the current implementation and tests without touching UI, deployment, or network configuration. 2. Implement only verified server/module/route defects: polling baselines through 60s, AMD hwmon discovery, explicit unsupported-method responses, and production mutating-request origin checks. 3. Add focused unit/integration regression tests for each corrected behavior. 4. Run relevant tests and typecheck; record evidence and any allegation disproved for Root review.

5. Root review iteration: tolerate repeated 60.25-second polls with a bounded 90-second default window, test true rates across repeated gaps and explicit over-limit rebasing, and confirm HEAD behavior for the config route.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05: Started AQ-68 after fresh source/status inspection. Scope restricted to telemetry server modules/routes/tests; Root owns final review and completion, no stage/commit by this worker.

2026-11-05 verification: all four allegations were reproduced against the pre-edit source. Default traffic staleness is now 60,000 ms; store and API route tests return the expected fresh B/s rate after a 60-second poll gap. CPU discovery retains coretemp IDs and adds k10temp Tctl/Tdie and zenpower Tdie stable IDs; store and API tests verify actual readings/chip labels. /api/config registers ANY with HTTP 405, Allow: GET, HEAD, PUT, POST; route registration and response test pass. In production, missing Origin plus missing/non-same-origin Sec-Fetch-Site is rejected; same-origin evidence or matching configured Origin passes, while dev CLI behavior remains allowed. Verified with five focused suites (45 tests passed), npm run typecheck, and git diff --check. No UI, deployment, host network, or configuration files changed. Ready for Root review; do not mark Done, stage, or commit in this worker packet.

2026-11-05 Root review requested jitter above an ideal 60.000-second interval and a production HEAD check for /api/config. Updating the bounded default to 90 seconds and adding 60.25-second repeated-poll coverage; Root will perform the real production method check.

2026-11-05 Root review iteration: raised the documented default baseline/staleness window to 90 seconds to absorb 60-second polling plus 30 seconds of scheduler/wakeup jitter. Store and API route regressions now exercise 60.25-second sampling, with repeated fresh 100/200 B/s rates; an additional store regression verifies 90.001 seconds returns unavailable and rebases, then a 1-second follow-up reports a fresh rate. The config HEAD behavior is left for Root's real local production method check before any handler change. Focused verification after this iteration: 3 suites / 32 tests pass (network store, network API, config route), typecheck and diff-check pass.

2026-11-05 Root final review accepted the jitter iteration:90s default supports repeated60.25s polls, tests preserve90.001s rebase and fresh recovery with actual delta rates. Independent isolated5-suite46-test run, typecheck and production build pass. Real local production5195 HTTP check:HEAD200/0body/no-store;PATCH,DELETE,OPTIONS405 with Allow GET,HEAD,PUT,POST and no-store; headerlessPUT403 before any config mutation. Framework HEAD fallback is proven, so no redundant explicit HEAD handler. AMD discovery/API fixtures pass; no claim of actual AMD homelab hardware or deployment. Updated network contract and deployment source documentation for90s interval, AMD roots and production write headers. No host/mount/config changes.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-05 21:16
---
Root review: a60-second baseline limit only passes an ideal exact60s clock; real60s polling plus response/scheduling latency can still rebase forever. Use a documented bounded tolerance above60s (e.g.90s) or a separate max interval, and test repeated60.25s polls with real delta rates while stale/beyond-limit behavior remains explicit. Also verify production HTTP HEAD /api/config remains consistent with advertised Allow:GET,HEAD,PUT,POST after adding ANY; add explicit HEAD handling if ANY captures automatic fallback. Root will run real local production method checks without mutating config.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened network polling with a90s default window, added AMD chip-specific temperature discovery and stable IDs, and enforced explicit unsupported config methods plus production origin evidence. Root reviewed46tests/typecheck/build and actual production HEAD/405/headerless-write403 responses. Documented semantics; telemetry equipment/live-source parents remain open.
<!-- SECTION:FINAL_SUMMARY:END -->
