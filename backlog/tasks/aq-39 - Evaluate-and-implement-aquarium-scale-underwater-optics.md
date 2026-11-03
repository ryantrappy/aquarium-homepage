---
id: AQ-39
title: Evaluate and implement aquarium-scale underwater optics
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03 12:33'
labels: []
dependencies:
  - AQ-5
  - AQ-34
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
priority: medium
type: enhancement
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Gemini reference suggests wavelength-dependent attenuation, fluorescence and glass effects, but its coefficients and code are unverified. A small front-on home aquarium needs calibrated, restrained optics that preserve the crisp reference composition.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Research and document which attenuation, fluorescence and glass effects are visually justified at aquarium scale, including sources and approximations.
- [ ] #2 Implement selected effects with tunable parameters in the chosen renderer without obscuring fish or adding an artificial blue veil.
- [ ] #3 Verify visual behavior and performance at 402x874 and 1440x900, including paused and reduced-motion modes.
<!-- AC:END -->
