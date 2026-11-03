---
id: AQ-17
title: Represent network traffic with an aquarium pump flow indicator
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
