---
id: AQ-9
title: Store aquarium configuration for sharing across devices
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:33:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: medium
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Browser-local settings are sufficient for the first pass, but shared configuration will be needed to use the launcher from more than one device.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Service configuration can be read and updated through a shared storage mechanism.
- [ ] #2 The configuration format preserves service name, URL, representation choice, and aquarium mode.
- [ ] #3 The app handles unavailable shared storage with a clear user-facing error and does not silently discard edits.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
