---
id: AQ-69
title: >-
  Clean up dangling proof symlinks, duplicate files, and unused production
  dependencies
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:33'
labels: []
dependencies: []
references:
  - package.json
  - src/rendering/proof/
  - docs/
  - src/lib/services.ts
documentation:
  - docs/code-review-findings.md
priority: low
type: chore
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The repository contains broken symlinks pointing to non-existent /tmp/ GLB files, duplicate files with spaces in their names (docs/deployment 2.md), and heavy 3D engine libraries (@babylonjs/core, @babylonjs/loaders, playcanvas) in package.json dependencies rather than devDependencies. In addition, dead localStorage functions in services.ts remain unused after the API config migration, and scripts/ is excluded from tsconfig.json.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Broken symlinks in src/rendering/proof/ pointing to /tmp/ are removed
- [ ] #2 Duplicate file docs/deployment 2.md is removed
- [ ] #3 @babylonjs/* and playcanvas packages are moved from dependencies to devDependencies in package.json
- [ ] #4 Unused legacy localStorage functions in src/lib/services.ts are either cleaned up or integrated cleanly as an offline cache fallback
- [ ] #5 tsconfig.json includes scripts/ for typechecking or maintains dedicated script validation
- [ ] #6 Build and test suites pass cleanly with reduced production package dependencies
<!-- AC:END -->
