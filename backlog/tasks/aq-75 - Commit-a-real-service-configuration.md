---
id: AQ-75
title: Commit a real service configuration
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels: []
dependencies:
  - AQ-8
documentation:
  - docs/requirements.md
priority: '4'
type: feature
ordinal: 75
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-8 (Finalize homelab service mappings) is marked Done, yet no committed .data/reef-config.json was found in the repo (.data/ is gitignored) and AQ-56 notes final roster approval stays in AQ-8. Commit a real, user-approved service configuration so the fish-to-service mapping is stable and reproducible, instead of relying on the seeded EXAMPLE_SERVICES list at runtime.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The final service roster is confirmed with the user (names, URLs, fishId for each service)
- [ ] #2 A real configuration is committed or otherwise durably stored so a fresh checkout uses the approved mappings
- [ ] #3 Adding, removing, or reordering a service still reconciles fish without resetting swimming state (AQ-64 behaviour preserved)
- [ ] #4 No placeholder or example service is presented as a real service
<!-- AC:END -->
