---
id: AQ-15
title: Add a real CPU-temperature heater indicator
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-03T18:36:00Z'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
priority: medium
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a small heater thermometer as aquarium equipment that displays a real CPU temperature from a homelab server or temperature sensor selected in settings. Research an appropriate configurable integration source during implementation; do not assume a specific telemetry backend or make server changes. This is read-only aquarium telemetry, not service health monitoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The heater thermometer displays an actual CPU temperature and unit from the selected server or sensor.
- [ ] #2 The user can select or configure the server or temperature sensor represented by the thermometer.
- [ ] #3 The thermometer is visually embedded as aquarium equipment and does not become a conventional dashboard card or overlay.
- [ ] #4 Unavailable and stale source data are identified clearly; no simulated or fabricated healthy-looking temperature is shown.
- [ ] #5 Reading telemetry does not modify server or sensor configuration.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Luna completes the task with high reasoning effort.
- [ ] #2 Root agent reviews the completed result before the task is marked Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a read-only CPU sensor adapter that scans an explicitly mounted hwmon subtree, identifies sensors by chip and label (never by hwmonN), parses millidegrees, and converts to Celsius.
2. Expose typed GET endpoints for sensor discovery and a selected stable sensor ID; return fresh, stale last-known, or unavailable states with source label, units, observedAt, and age. Inject filesystem root and clock for deterministic tests.
3. Add tests for source discovery, package/core selection, millidegree conversion, invalid values, unavailable sensors, stale last-known samples, and clock behavior.
4. Keep UI/thermometer scene integration with AQ-34; no conventional dashboard UI or simulated temperature.
5. Proposed production bind mount for root review only: host `/sys/devices/platform/coretemp.0` to container `/run/host-sensors/coretemp.0`, read-only. Verify the device path and label at deployment. Do not edit deploy/compose.yaml or mutate the server mount until root approves this exact mount proposal.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only source inventory on trappserv.er (2026-11-03): /sys/class/hwmon exposes acpitz, nvme (temp1_label Composite), and coretemp (Package id 0 and Core 0–5). No exporter is needed for the current host. AQ15 adapter proposal: keep sensor selection as a stable sanitized ID (sysfs device identity plus chip name/label, not hwmonN alone), read temp*_input in millidegrees through a narrowly scoped read-only hwmon mount, return timestamp/unit/source status, and show unavailable/stale state instead of a fabricated value. The app API remains same-origin behind existing Caddy Authelia; no credentials or auth-provider SDK belong in client config. No exporter, package, or host config was changed.
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
<!-- COMMENTS:END -->
