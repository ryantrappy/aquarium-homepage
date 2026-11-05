---
id: AQ-68
title: >-
  Harden telemetry APIs against polling gaps, unsupported CPU drivers, and
  invalid methods
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:33'
labels: []
dependencies: []
references:
  - src/server/network-traffic.ts
  - src/server/cpu-temperature.ts
  - src/routes/api/config.ts
documentation:
  - docs/code-review-findings.md
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
- [ ] #1 Network traffic rate calculation tolerates client polling intervals up to 60s without immediately invalidating baselines
- [ ] #2 CPU temperature store supports AMD k10temp and zenpower sensor names alongside Intel coretemp
- [ ] #3 /api/config registers an explicit ANY handler returning HTTP 405 Method Not Allowed with an Allow header for unsupported methods
- [ ] #4 Configuration write origin validation enforces origin headers for mutating requests in production mode
- [ ] #5 Automated unit and integration tests cover slow polling intervals, AMD CPU discovery, and HTTP 405 method rejection
<!-- AC:END -->
