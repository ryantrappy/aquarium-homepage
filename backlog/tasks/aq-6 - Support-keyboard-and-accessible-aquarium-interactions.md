---
id: AQ-6
title: Audit and polish keyboard and reduced-motion accessibility
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:33:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first-pass prototype already needs keyboard-operable service and settings controls and reduced-motion behavior. A later pass should systematically audit and polish accessibility across the aquarium scene and settings rather than treating the basic support as deferred.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A documented audit covers keyboard access, focus order and return behavior, accessible names, settings dialog semantics, and reduced-motion behavior.
- [ ] #2 Any audit findings that block identifying, configuring, or launching services are corrected.
- [ ] #3 Keyboard focus remains visible and predictable across scene interactions and settings open, edit, save, cancel, and close flows.
- [ ] #4 The aquarium remains understandable and operable when reduced motion is enabled, including on mobile layouts.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
