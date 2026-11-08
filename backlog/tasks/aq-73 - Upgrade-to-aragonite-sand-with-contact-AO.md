---
id: AQ-73
title: Upgrade to aragonite sand with contact AO and grain detail
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels: []
dependencies:
  - AQ-59
  - AQ-14.3
documentation:
  - docs/rendering.md
priority: '3'
type: feature
ordinal: 73
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Current sand is a 256x256 procedural DataTexture on a sine-rippled plane. Upgrade to aragonite sand with grain-scale normal variation, sparkle, roughness variation, and soft contact shadows where rock meets substrate. The external AQ-70.12 sand module/maps exist but are unreviewed and excluded from Root commits; this task covers Root review and integration of that work (or a rewrite if review rejects it), not a silent swap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sand shows grain-scale normal / roughness variation and sparkle at close range, not a flat procedural texture
- [ ] #2 Contact AO is present where live rock meets the substrate, with grounded bases
- [ ] #3 The external AQ-70.12 sand work is Root-reviewed and either integrated or explicitly rejected with reasons
- [ ] #4 Sand is verified at 1440x900 and 402x874 with no performance regression
<!-- AC:END -->
