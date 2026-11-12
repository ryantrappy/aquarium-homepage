---
id: AQ-92
title: Widen the CI pull_request trigger to run on every PR
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-09'
updated_date: '2026-11-12 05:55'
labels:
  - ci
  - testing
dependencies:
  - AQ-90
references:
  - .github/workflows/ci.yml
  - README.md
documentation:
  - docs/rendering.md
priority: medium
type: task
ordinal: 98000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Widen the `pull_request` trigger in `.github/workflows/ci.yml` so CI runs on EVERY pull request, not only PRs to `main`. Ryan corrected the direction on 2026-11-08 ("It should always run with every pr actually"), superseding the earlier "PRs to main" wording, but the file as added still has the `main`-only filter.

The exact change is one edit in `.github/workflows/ci.yml`, under `on:` — remove the `branches` filter under `pull_request`:

```yaml
  pull_request:
    branches:
      - main
```

becomes:

```yaml
  pull_request:
```

Push triggers (`gemini_control` and `main`) and `workflow_dispatch` stay exactly as they are.

Muse cannot make this edit itself: GitHub rejects API writes to `.github/workflows/` without the `workflow` scope (the connector's push of the combined batch PR 403'd on the workflow file, while the same push without it succeeded), so Ryan applies this one line directly in the GitHub web UI or local git, as he did when adding the file. The combined batch PR (AQ-82, AQ-90, AQ-70.1, AQ-70.7, AQ-13 note fix, sailfin / yellow-tang restore) already carries the matching README "Continuous integration" wording update for AQ-90; only this workflow-file line is outstanding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The `pull_request` trigger in `.github/workflows/ci.yml` has no branch filter, so CI runs on every pull request
- [x] #2 The `push` triggers (`gemini_control` and `main`) and `workflow_dispatch` are unchanged
- [x] #3 The README "Continuous integration" wording matches the every-PR behavior
- [x] #4 Branch protection (requiring the CI check before merge) remains a separate repo-settings step for Ryan or an admin and is not part of this task
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the workflow already has an unfiltered pull_request trigger and preserve the push branch list and workflow_dispatch. 2. Confirm README wording describes every pull request and the existing separate branch-protection step. 3. Verify the exact trigger configuration and record evidence; make a scoped edit only if the current files do not meet AQ-92.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Review of the shared checkout found AQ-92's requested state already present, so no workflow or README diff was necessary. Verified with a focused Python assertion against .github/workflows/ci.yml and README.md: push remains scoped to gemini_control and main, pull_request has no branches filter, workflow_dispatch remains enabled, and README says every pull request runs CI while documenting branch protection as a separate admin setting. AQ-90 dependency is only practically satisfied for the workflow/check implementation: this workflow runs npm ci, typecheck, tests, and build, but AQ-90 remains To Do and its branch-protection/green-run acceptance evidence is still outstanding. Root review remains required before AQ-92 can be marked Done.
<!-- SECTION:NOTES:END -->
