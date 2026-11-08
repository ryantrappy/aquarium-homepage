---
id: AQ-75
title: Commit a real service configuration
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T20:08:00Z'
labels:
  - config
  - ui
dependencies:
  - AQ-8
  - AQ-56
  - AQ-64
references:
  - src/server/shared-config.ts
  - src/lib/services.ts
  - src/lib/services-state.ts
  - src/components/ServiceManager.tsx
  - AQ-8.1
  - AQ-56
  - AQ-64
documentation:
  - docs/requirements.md
priority: '4'
type: feature
ordinal: 75
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-8 finalized homelab service mappings, but .data/reef-config.json is gitignored so fresh checkouts fall back to EXAMPLE_SERVICES with example badges. Confirm the canonical default service roster (names, URLs, and species fishId mappings) with the user and commit the approved baseline configuration so fresh checkouts render the real homelab services out of the box while preserving local/shared runtime edits and AQ-64 non-destructive inhabitant reconciliation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The final service roster is confirmed with the user (names, URLs, fishId for each service)
- [ ] #2 A real configuration is committed or otherwise durably stored so a fresh checkout uses the approved mappings
- [ ] #3 Adding, removing, or reordering a service still reconciles fish without resetting swimming state (AQ-64 behaviour preserved)
- [ ] #4 No placeholder or example service is presented as a real service
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
