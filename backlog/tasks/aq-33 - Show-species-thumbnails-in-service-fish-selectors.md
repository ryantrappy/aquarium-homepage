---
id: AQ-33
title: Show species thumbnails in service fish selectors
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03 04:39'
updated_date: '2026-11-03 04:40'
labels: []
dependencies: []
references:
  - docs/reef-fish-roster.md
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The reef roster now contains at least 15 distinct fish, so a text-only service fish picker makes it harder to recognize and choose the intended species. Show a small, accurate species preview beside each fish name in both service creation and editing. Follow the adult or sex-specific visual baseline and stable IDs in docs/reef-fish-roster.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every supported reef fish option in the add-service and edit-service fish selector shows a small thumbnail of the corresponding species beside its displayed name; the image matches that roster entry's specified adult or sex-specific appearance, not a generic fish icon.
- [ ] #2 The currently selected fish is shown with its matching thumbnail and name, and the displayed preview updates when the user changes the selection.
- [ ] #3 Choosing a fish preserves the existing service-to-fish assignment behavior; a loading or unavailable image never displays a different species as though it were the selected fish.
- [ ] #4 The fish selector remains usable by keyboard and touch, with the fish name available to assistive technology alongside the thumbnail.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviewed the completed work before marking the task Done.
- [ ] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
