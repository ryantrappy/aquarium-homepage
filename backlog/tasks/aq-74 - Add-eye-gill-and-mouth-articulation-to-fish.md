---
id: AQ-74
title: Add eye, gill, and mouth articulation to fish
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels:
  - modeling
dependencies:
  - AQ-12
  - AQ-70
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '3'
type: feature
ordinal: 74
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No acceptance criterion in the backlog names eyes, gills, or mouth. AQ-5 records that separate mouth/eye/gill articulation is absent. Add it to the promoted fish models: verify convex cornea eyes and operculum relief, add eye shine and pupil, and add subtle gill-cover and mouth movement tied to the swim cycle. Eyes are the first thing a viewer checks; flat or painted eyes break realism instantly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Promoted fish have convex cornea eyes with shine and pupil, verified in renders
- [ ] #2 Operculum (gill cover) relief is present and gill movement is subtly tied to the swim cycle
- [ ] #3 Mouth movement is present and does not look like a separate animated sprite
- [ ] #4 Eye, gill, and mouth work is verified at 1440x900 and 402x874 without breaking click targets
<!-- AC:END -->
