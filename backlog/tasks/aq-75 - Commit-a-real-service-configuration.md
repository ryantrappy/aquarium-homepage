---
id: AQ-75
title: Commit a real service configuration
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-08 00:30'
updated_date: '2026-11-12 14:06'
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
- [x] #1 The final service roster is confirmed with the user (names, URLs, fishId for each service)
- [x] #2 A real configuration is committed or otherwise durably stored so a fresh checkout uses the approved mappings
- [x] #3 Adding, removing, or reordering a service still reconciles fish without resetting swimming state (AQ-64 behaviour preserved)
- [x] #4 No placeholder or example service is presented as a real service
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a regression using createSharedConfigStore with a missing temporary path and no explicit seed; assert the exact AQ-8 approved five-service mappings and isExample:false values. 2. Persist that default through the store and confirm the file and subsequent read match. 3. Run focused service/config/reconciliation tests and record objective AC evidence for Root review; Root retains Done authority.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AQ75 fresh-checkout regression added in src/server/shared-config.test.ts. It creates a missing temporary config path and calls createSharedConfigStore(filePath) without a seed, asserts the exact AQ8-approved five name/URL/fishId mappings and isExample:false, writes the default using its revision, then verifies on-disk JSON and subsequent read. Verification: npm test -- --run --maxWorkers=2 src/server/shared-config.test.ts src/lib/services.test.ts src/lib/services-state.test.ts src/rendering/scene/aquarium-lifecycle.test.ts — 4 files, 40 tests passed; git diff --check for the scoped test passed. AC1 evidence: AQ8 Done record documents explicit user confirmation and docs/service-mapping-review.md records the exact roster. AC2 evidence: committed src/lib/services.ts defaults + src/server/shared-config.ts no-file seed, now exercised without an explicit seed and persistence verified. AC3 evidence: actual-controller aquarium-lifecycle test preserves existing fish root, motion state, route/random state, clip player, and pose through edits/reorder; AQ64 Done evidence also verifies add/remove and viewport behavior. AC4 evidence: default-roster regression asserts only approved services and isExample:false. Root review/Done remains pending.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-12 14:06
---
Root review2026-11-12 accepted. Approved AQ8 mappings are already committed in the tracked default roster; the new omitted-seed missing-file regression proves a fresh checkout actually receives those five real services and can persist/reread them. Existing eight-entry local saved configuration is preserved. AQ64 reconciliation evidence and current focused controller tests cover retained fish state. No live endpoint or health probing was needed.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verified already-implemented real service defaults and closed the fresh-checkout evidence gap with an omitted-seed store regression. Approved five name/URL/species mappings, non-example flags, persistence and reconciliation pass40 focused tests. Existing runtime edits preserved.
<!-- SECTION:FINAL_SUMMARY:END -->
