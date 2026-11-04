---
id: AQ-52
title: Replace assumed coral socket support with measured export evidence
status: To Do
assignee:
  - '@gemini'
created_date: '2026-11-04 19:04'
labels:
  - modeling
dependencies:
  - AQ-40
  - AQ-50
references:
  - AQ-14.3
  - src/rendering/modeling/package_modular_corals.mjs
documentation:
  - docs/asset-contract.md
priority: high
type: bug
ordinal: 11900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The supplied packager copies socket transforms as support points and calculates supportedRadiusM=footprint+0.012 and freeRadiusM=clearance+0.025, labeling these surface-probes-v1 without performing geometric measurements. This does not prove attachment, footprint or colony clearance. Generator sockets use nearby qualifying vertices plus fixed rotations. Reinspect current Gemini exports; these are audit-snapshot findings. Gemini owns visual changes; Codex may make necessary functional integration changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Available sockets have reproducible support, footprint and clearance measurements against exact exported geometry, with an external report pinned to its hash.
- [ ] #2 Socket positions meet contact tolerance and local up matches measured normal; unsupported sockets are unavailable rather than given passing measurements.
- [ ] #3 Metadata no longer labels synthetic allowances as performed probes, and verified records pass the asset contract without implying fish habitat from socket names.
<!-- AC:END -->
