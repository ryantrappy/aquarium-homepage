---
id: AQ-16
title: Show remaining disk space in an aquarium top-off reservoir
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-03T04:26:00Z'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
priority: medium
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an aquarium top-off reservoir whose level represents actual remaining disk capacity. Settings must allow the user to select one disk or aggregate all unique disks. Research a configurable integration source during implementation and keep the integration read-only; do not change server or disk configuration. This is read-only aquarium telemetry, not service health monitoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A selected single-disk scope shows actual free and total capacity and the corresponding remaining percentage.
- [ ] #2 An all-disks scope aggregates free and total capacity across unique disks and computes the percentage as summed free capacity divided by summed total capacity.
- [ ] #3 Duplicate mounts are not counted more than once in the aggregate, and the selected disk or aggregate scope is obvious to the user.
- [ ] #4 The reservoir is visually embedded as aquarium equipment rather than presented as a conventional dashboard card or overlay.
- [ ] #5 Unavailable and stale source data are identified clearly; no simulated or fabricated healthy-looking disk level is shown.
- [ ] #6 Reading telemetry does not modify server, disk, or mount configuration.
- [ ] #7 The reservoir water level physically corresponds to the remaining-space percentage: it is fuller when more free space remains and lowers as the disk fills.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Luna completes the task with high reasoning effort.
- [ ] #2 Root agent reviews the completed result before the task is marked Done.
<!-- DOD:END -->
