---
id: AQ-15
title: Add a real CPU-temperature heater indicator
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-15 05:48'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
modified_files:
  - src/server/cpu-temperature.ts
  - src/server/cpu-temperature.test.ts
  - src/routes/api/telemetry/cpu-temperature.ts
  - src/routes/api/telemetry/-cpu-temperature.test.ts
  - src/lib/thermometer-settings.ts
  - src/lib/thermometer-settings.test.ts
  - src/components/AquariumThermometer.tsx
  - src/components/ServiceManager.tsx
  - src/components/ServiceManager.test.tsx
  - src/components/AquariumScene.tsx
  - src/components/AquariumScene.test.tsx
  - src/routes/index.tsx
  - src/styles/aquarium.css
priority: '36'
type: feature
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a small heater thermometer as aquarium equipment that displays a real CPU temperature from a homelab server or temperature sensor selected in settings. Research an appropriate configurable integration source during implementation; do not assume a specific telemetry backend or make server changes. This is read-only aquarium telemetry, not service health monitoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The heater thermometer displays an actual CPU temperature and unit from the selected server or sensor.
- [x] #2 The user can select or configure the server or temperature sensor represented by the thermometer.
- [x] #3 The thermometer is visually embedded as aquarium equipment and does not become a conventional dashboard card or overlay.
- [x] #4 Unavailable and stale source data are identified clearly; no simulated or fabricated healthy-looking temperature is shown.
- [x] #5 Reading telemetry does not modify server or sensor configuration.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Luna completes the task with high reasoning effort.
- [ ] #2 Root agent reviews the completed result before the task is marked Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create client-safe telemetry/settings helper src/lib/thermometer-settings.ts and unit tests (placement: front/side/hidden, sensor validation, 7-segment LCD formatting, read-only GET polling).
2. Create AquariumThermometer.tsx modeled closely after the reference clear-acrylic 7-segment LCD thermometer photo (transparent green-tinted LCD window, 3-digit 7-segment + °C readout, dark gasket seam, brushed horizontal-ridged metal block, top-right acrylic latch step, accessible .sr-only status, honest STALE/UNAVAILABLE states).
3. Add thermometer and settings styling in src/styles/aquarium.css for 1440x900 and 402x874 (front upper-left glass and angled side-glass perspective), pointer-events: none.
4. Wire placement (Front glass / Side glass / Hidden) and CPU sensor selector into ServiceManager.tsx, AquariumScene.tsx (mounted hydration gate), and routes/index.tsx (device-local storage + 10s read-only GET polling).
5. Add component/integration tests, run vitest, typecheck, build, and verify visually at 1440x900 and 402x874.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only source inventory on trappserv.er (2026-11-03): /sys/class/hwmon exposes acpitz, nvme (temp1_label Composite), and coretemp (Package id 0 and Core 0–5). No exporter is needed for the current host. AQ15 adapter proposal: keep sensor selection as a stable sanitized ID (sysfs device identity plus chip name/label, not hwmonN alone), read temp*_input in millidegrees through a narrowly scoped read-only hwmon mount, return timestamp/unit/source status, and show unavailable/stale state instead of a fabricated value. The app API remains same-origin behind existing Caddy Authelia; no credentials or auth-provider SDK belong in client config. No exporter, package, or host config was changed.

2026-11-14 verification & handoff (branch aq15_thermometer_display_config): Built stick-on crystal acrylic 7-segment LCD thermometer (AquariumThermometer.tsx + styles/aquarium.css) matching the reference housing (green-tinted translucent LCD, 7-segment XX.X°C + ghost segments, top-right clasp step, dark gasket seam, brushed horizontal-ridged metal compartment, pointer-events: none). Added device-local glass placement config (Front glass / Side glass / Hidden radios) and CPU sensor selector in ServiceManager.tsx + SSR-safe mounted gate in AquariumScene.tsx + 10s read-only GET polling in routes/index.tsx and thermometer-settings.ts. Hardened Linux Docker hwmon discovery in src/server/cpu-temperature.ts and cpu-temperature.ts route for /run/host-sensors/coretemp.0, /sys/devices/platform/coretemp.0, and symlinked /sys/class/hwmon entries when REEF_CPU_HWMON_ROOT is unset or empty. Verified after final edit: 6 targeted Vitest suites (88/88 tests pass), sync-reef-override.test.ts (23/23 pass), npm run typecheck (exit 0), npm run build (exit 0), and browser subagent verification at 1440x900 and 402x874 (front/side/hidden placements, sensor switching 28.1°C/27.5°C, authentic stale/unavailable states, 0 console/hydration errors). Ready for Root review.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-03T18:31:00Z
---
Read-only sensor inventory on trappserv.er confirms `/sys/devices/platform/coretemp.0/hwmon/hwmon2/name` is `coretemp`; `temp1_label` is `Package id 0`, with readable, numeric `temp1_input`. The same device exposes `Core 0` through `Core 5`. Canonical subtree `/sys/devices/platform/coretemp.0` is narrower than mounting all of `/sys`; its `hwmonN` child is discovered dynamically. Proposed container bind mount target is `/run/host-sensors/coretemp.0:ro`; no Docker Compose or host mount change has been made. Plan awaits root review before mount changes.
---

author: @Luna
created: 2026-11-03T18:32:00Z
---
Source reference checked: Linux kernel coretemp documentation confirms tempX_input is millidegrees Celsius, package readings use temp1_*, and labels use  or ; errors such as -ENODATA should remain unavailable rather than becoming a default value: https://docs.kernel.org/next/hwmon/coretemp.html. Docker Compose supports read-only bind sources; use long syntax with create_host_path:false so a missing CPU-device source fails closed rather than creating a host directory: https://docs.docker.com/reference/compose-file/services/.
---

author: @Luna
created: 2026-11-03T18:32:00Z
---
Correction to the source note above: shell quoting dropped the literal sensor label examples from that comment. The verified kernel documentation says tempX_input is millidegrees Celsius, package readings use temp1_*, and labels identify Package id Y or Core N; invalid sensor reads such as -ENODATA must remain unavailable, not become a default. Source: https://docs.kernel.org/next/hwmon/coretemp.html. Docker Compose supports read-only bind mounts and create_host_path:false, which prevents a missing sensor path from being silently created: https://docs.docker.com/reference/compose-file/services/.
---

author: @Luna
created: 2026-11-03T18:35:00Z
---
Implemented the reviewed backend slice: `src/server/cpu-temperature.ts` scans the configured coretemp.0 mount and keys sensors by stable chip/label IDs; `GET /api/telemetry/cpu-temperature?sensorId=...` returns the discovered choices plus a typed fresh/stale/unavailable reading, unit, label, observedAt, and age with no-store. Added deterministic tests for sensor discovery, hwmon renumbering, Celsius conversion, stale sample age with injected clock, no fake fallback, invalid values, and path traversal rejection. `deploy/compose.yaml` now declares only the approved coretemp.0 bind mount as read-only with `create_host_path: false`; host deployment remains untouched pending reviewed commit. Targeted tests pass 5/5, TypeScript typecheck passes, Compose YAML source/mount assertions pass. Aquarium visual and settings integration remain pending AQ-34/root review.
---

author: @Luna
created: 2026-11-03T18:36:00Z
---
Verification update: added direct API-handler coverage for sensor selection, response schema, units, timestamp, and Cache-Control no-store. Current telemetry tests pass 6/6 across two files; npm run typecheck passes. Compose YAML still parses and confirms the approved bind is read-only with create_host_path:false. No remote deployment or host mount change.
---

author: @Codex
created: 2026-11-15 05:41
---
Root investigation (read-only, 2026-11-14): `ssh -oBatchMode=yes -oConnectTimeout=5 trappserv.er ...` read `/sys/devices/platform/coretemp.0/hwmon/hwmon2/{name,temp1_label,temp1_input}` as `coretemp`, `Package id 0`, and a changing real value (42,000 then 52,000 m°C across samples). `curl --silent --show-error --max-time 5 http://127.0.0.1:3004/api/telemetry/cpu-temperature` returned `{"sensors":[],"reading":{"status":"unavailable","sensorId":"coretemp.0:package-id-0",...}}`. Read-only `docker inspect` showed no `/run/host-sensors/coretemp.0` mount and `REEF_CPU_HWMON_ROOT` is empty; the container can still read the host sensor through `/sys/devices/platform/coretemp.0/...` and `/sys/class/hwmon/hwmon2/...`. I transpiled the current `src/server/cpu-temperature.ts` locally with the installed Jiti transform, piped it over SSH into `docker exec -i aquarium-homepage node --input-type=commonjs`, and ran it against the exact candidate roots. It discovered all 7 coretemp sensors and returned a fresh `Package id 0` reading with unit `°C` (44°C at 2026-11-15T05:40:36Z). This shows the current source reader works on the actual container-visible hwmon tree; the running API does not match that source behavior. No remote files/config were written and no deploy performed. Root DoD review remains open; resolve real-API/browser acceptance after the user-controlled deployment is refreshed or verify against a locally served current-source app. Root owns the visual review.
---

author: @Codex
created: 2026-11-15 05:48
---
Clarification for Root acceptance: AQ-15 targets locally working current-source behavior. The exact pinned current reader, run against the actual container-visible hardware sysfs, is direct evidence of a fresh authentic selected-sensor value; the separate deployed API mismatch is retained as operational handoff context, not a required deployment gate. Durable evidence and no-write reproduction are now cataloged at `docs/asset-evidence/aq15/root-review-20261114/`. Root visual review remains pending; no AC/DoD/status changes.
---
<!-- COMMENTS:END -->
