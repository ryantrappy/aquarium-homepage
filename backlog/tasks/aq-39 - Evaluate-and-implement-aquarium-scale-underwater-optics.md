---
id: AQ-39
title: Evaluate and implement aquarium-scale underwater optics
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 12:33
updated_date: '2026-11-04T02:32:00Z'
labels: []
dependencies:
  - AQ-5
  - AQ-34
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - https://pubmed.ncbi.nlm.nih.gov/18264420/
  - https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0002680
  - https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0128697
  - >-
    https://research.engr.oregonstate.edu/parrish/index-refraction-seawater-and-freshwater-function-wavelength-and-temperature
documentation:
  - docs/open-source-asset-and-motion-research.md
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

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04T02:32:00Z

---

Research doc updated with source-bounded optics notes: Pope & Fry is pure-water absorption, coral FP spectra vary, and the ~48° critical angle applies at a water-air interface. Earlier tank RGB/PAR and fixed fluorescence claims are marked unverified or removed; no rendering values are claimed as measured.

---
<!-- COMMENTS:END -->
