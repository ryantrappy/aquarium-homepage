---
id: AQ-7
title: Adapt the aquarium launcher for mobile screens
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:39:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep the aquarium and settings usable at the current iPhone Pro proxy and a normal laptop size. Responsive verification is intentionally scoped to 402x874 CSS pixels and 1440x900; no tablet or broad device matrix is required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At the two agreed viewports, 402x874 for the iPhone Pro proxy and 1440x900 for a normal laptop, the aquarium and settings fit without horizontal page scrolling.
- [ ] #2 At 402x874, service names and launch targets remain legible and easy to select by touch.
- [ ] #3 At 402x874, settings controls fit the viewport and have comfortable, usable touch targets.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
