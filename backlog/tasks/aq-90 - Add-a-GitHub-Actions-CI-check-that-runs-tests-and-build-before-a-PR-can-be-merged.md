---
id: AQ-90
title: Add a GitHub Actions CI check that runs tests and build before a PR can be merged
status: To Do
assignee:
  - @Luna
created_date: 2026-11-08
updated_date: 2026-11-08
labels:
  - ci
  - testing
dependencies: []
references:
  - package.json
  - .github/workflows/ci.yml
documentation:
  - docs/rendering.md
priority: 2
type: feature
ordinal: 90
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a GitHub Actions workflow (e.g. .github/workflows/ci.yml) that runs on pull_request targeting gemini_control (and push to gemini_control) doing npm ci, npm run typecheck, npm run build, and npm test (the full vitest suite), and then make that check a required status check / branch protection rule on gemini_control so a PR cannot be merged while it is failing. Branch protection itself is a repo-settings change Ryan (or a repo admin) must enable in GitHub settings — the workflow file alone does not enforce it; this task covers both the workflow and documenting/verifying the required-check setting. Known flaky test to handle: aquarium-lifecycle "adds only the new fish" occasionally times out at the 5s default under full-suite load (seen on the PR #22 / PR #23 trees, passes in isolation) — the workflow should either raise that test timeout or the task should record the flake, so CI is not red for timing noise. Relates to AQ-38 AC6 (performance evidence) and the repo existing npm scripts (typecheck / build / test) that are currently only run by hand before opening a PR.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Workflow file runs typecheck, build, and the full test suite on PRs to gemini_control
- [ ] #2 Workflow passes on the base (green run recorded)
- [ ] #3 Branch protection on gemini_control requires the CI check before merge (settings change documented, verified by an attempted merge with a failing check or by the settings record)
- [ ] #4 The flaky aquarium-lifecycle test is handled (timeout raised or flake documented) so CI is not red for timing noise
- [ ] #5 README or docs note the CI requirement briefly
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
