---
id: AQ-7
title: Adapt the aquarium launcher for mobile screens
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T13:38:00Z'
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
- [x] #1 At the two agreed viewports, 402x874 for the iPhone Pro proxy and 1440x900 for a normal laptop, the aquarium and settings fit without horizontal page scrolling.
- [x] #2 At 402x874, service names and launch targets remain legible and easy to select by touch.
- [x] #3 At 402x874, settings controls fit the viewport and have comfortable, usable touch targets.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent has reviewed the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit scene and settings touch targets, text fit, and overflow at 402x874 and 1440x900 only. 2. Increase undersized action targets to at least 44 CSS pixels while keeping the aquarium controls compact and the service manager readable. 3. Verify no horizontal scrolling and usable touch target sizing at both agreed viewports. 4. Record verified evidence and hand back for root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root viewport review found service row Edit/Remove targets about 21 pixels high and main aquarium control targets 36 pixels. Fish option cards are 51 pixels high and readable at the narrow viewport. Plan: raise control and row action target heights to at least 44 pixels, retain the existing responsive dialog layout, and verify only at 402x874 and 1440x900. Root owns browser QA; do not claim responsive criteria before that review.

Increased aquarium controls, row actions, settings buttons, form buttons/inputs, search clear, and service-manager footer actions to 44px minimum. Fish option cards remain 51px high. Browser verification remains with root at 402x874 and 1440x900.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T13:38:00Z

---

Root verified only the two agreed viewports. Phone settings/page overflow false; action/input dimensions at least 44 pixels, radio rows at least 51 pixels; all sample service fish visible and bounded. Saved design/settings-phone-reviewed.png. Typecheck, 39 tests and production build passed.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verified aquarium and settings at 402x874 and 1440x900. Raised touch controls to at least 44 pixels, preserved readable fish choices and bounded launch targets without horizontal scrolling.
<!-- SECTION:FINAL_SUMMARY:END -->
