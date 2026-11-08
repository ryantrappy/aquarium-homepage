---
id: AQ-80
title: Decide the glass front pane (go / no-go)
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08
updated_date: '2026-11-08T19:35:00Z'
labels: []
dependencies:
  - AQ-39
  - AQ-14.6
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 80
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision-only task resolving the AQ-39 conflict: AQ-39 §1.3 explicitly omits heavy front-pane reflections on the front pane (they degrade fish readability), while tracker item 13 (AQ-14.2 / AQ-43 scope) includes a glass pane; the PR #8 conflict note in AQ-39 says the conflict must be resolved explicitly. Either keep the omission and record the glass pane as deferred/rejected, or specify the intended reflection behaviour and update AQ-39 accordingly. Implementation (if go) is a separate follow-up task, not this one. This closes the remaining gap in tracker item 13 — bubbles/particulate themselves are covered by AQ-43 (PR #19 merged).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decision recorded (go or no-go) with reasoning
- [ ] #2 If no-go, the glass pane is recorded as deferred/rejected in AQ-39 and tracker item 13
- [ ] #3 If go, the intended reflection behaviour is specified and AQ-39 is updated
- [ ] #4 No implementation in this task
<!-- AC:END -->
