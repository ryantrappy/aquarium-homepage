---
id: AQ-69
title: >-
  Clean up dangling proof symlinks, duplicate files, and unused production
  dependencies
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-05 18:33'
updated_date: '2026-11-05 23:10'
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
- [x] #1 Broken symlinks in src/rendering/proof/ pointing to /tmp/ are removed
- [x] #2 Duplicate file docs/deployment 2.md is removed
- [x] #3 @babylonjs/* and playcanvas packages are moved from dependencies to devDependencies in package.json
- [x] #4 Unused legacy localStorage functions in src/lib/services.ts are either cleaned up or integrated cleanly as an offline cache fallback
- [x] #5 tsconfig.json includes scripts/ for typechecking or maintains dedicated script validation
- [x] #6 Build and test suites pass cleanly with reduced production package dependencies
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify each hygiene claim in the current tree and preserve all real tracked assets and shared work. 2. Remove only confirmed dangling symlinks under src/rendering/proof/ and move the non-duplicate historical deployment draft to docs/archive/deployment-2.md with valid metadata/catalog links. 3. Confirm renderer packages are benchmark-only and move them to devDependencies with a lockfile-consistent install. 4. Remove only demonstrably unused legacy localStorage helpers/tests, retaining active shared-config, import, and export/migration behavior. 5. Add dedicated syntax validation for scripts/ and scope extended timeout only to the slow socket-report CLI tests if default test execution confirms it is necessary. 6. Verify production dependency tree, scripts validation, typecheck, build, and full tests; record evidence for Root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05: Started AQ-69 after verifying task scope and current worktree. Root directed zero-deletion archival for deployment draft, proof-only dangling symlink cleanup, confirmation before services cleanup, and scoped slow-test timeouts only; Root review and completion remain required. No staging/commit by this worker.

2026-11-05: Verified AQ-69 #1-#5 only. No symlinks remain under src/rendering/proof/ (find -L ... -type l empty); tracked proof assets have no diff. The old deployment path is absent and the 113-line draft is retained at docs/archive/deployment-2.md; SHA-256 of the body from “Current deployment shape” through EOF matches the original exactly, and README/framework catalog links resolve.

2026-11-05: Babylon core/loaders and PlayCanvas are now devDependencies with lockfile flags; direct imports occur only in src/rendering/benchmark. npm ls --omit=dev --depth=0 excludes all three. Removed only the unused localStorage service API; active shared-config, legacy/import-envelope parsing, and export paths remain and services tests pass (6/6). `npm run typecheck` also syntax-checks all 11 scripts, including the newly added verify-fish-clip-player.mjs.

2026-11-05: `npm run build` passed. Full `npm test -- --testTimeout=30000` ran 43 files / 383 tests: 382 passed, one unrelated concurrent motion.test.ts vertical-route expectation failed (expected route length 2, got 1). Only socket-report-freshness cases received scoped 30s timeouts after default 5s timeout evidence; no global timeout/config was changed. AC #6 remains unchecked for Root review.

2026-11-05 Root review follow-up: added a 30s deadline only to the existing fish-clip-envelope CLI test that launches six Node subprocesses; its assertions are unchanged. The focused `npx vitest run src/rendering/assets/fish-clip-envelope.test.ts` passes 52/52 in 4.52s under the default global deadline.

2026-11-05 Objective archive/proof evidence: former broken proof symlinks now absent: `candidate-real-clown 2.glb`, `candidate-real-tang 2.glb`, `candidate-clown.glb`, `candidate-tang.glb`, and `candidate-m2m-clown.glb` (all under `src/rendering/proof/`). Archived body SHA-256 from `## Current deployment shape` through EOF matches original exactly: `83259eb5fdc9d6386d40c459509aedbb5cf188513026a222f7937d304dd66cd2`.

2026-11-05 Root final review plus independent @navigation_recovery review accepted the hygiene slice. Frozen reviewed snapshot excludes concurrent AQ64/model-promotion work and passes default npm test:43files/384tests, no CLI timeout override; npm run typecheck (10tracked scripts syntax-checked) and production build pass. Live workspace validator also checks the additional untracked user modeling script, for11total. Scoped deadlines changed only six expensive socket CLI cases and one six-subprocess envelope case; assertions unchanged. Reviewer independently verified prod package/lock classification,17service/manager tests,6socket tests, script-validator exit1 on isolated malformed syntax, preserved archive body hash83259eb5fdc9d6386d40c459509aedbb5cf188513026a222f7937d304dd66cd2 and working successor/catalog links. Current proof directory has no symlinks and tracked proof assets have no diff; former removed untracked targets are recorded by implementing worker, not independently reconstructed. No source/model asset deletion or deployment.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved benchmark engines to devDependencies, removed unused localStorage helpers, retained the historical deployment draft at an archive path, removed dangling local proof links and added dedicated script syntax validation. Root and independent review verified preserved history/active service paths, frozen default384-test suite, typecheck and production build. Extended only specific expensive fixture deadlines; no global test weakening or tracked visual asset removal.
<!-- SECTION:FINAL_SUMMARY:END -->
