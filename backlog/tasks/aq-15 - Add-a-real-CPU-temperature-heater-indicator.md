---
id: AQ-15
title: Add a real CPU-temperature heater indicator
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
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
