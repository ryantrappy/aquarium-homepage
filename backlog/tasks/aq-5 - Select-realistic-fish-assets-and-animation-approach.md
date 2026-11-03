---
id: AQ-5
title: Choose photorealistic fish assets and a rendering approach
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:33:00Z'
labels: []
dependencies: []
references:
  - https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
documentation:
  - docs/requirements.md
  - docs/design-principles.md
priority: high
type: spike
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photorealistic living fish are the main success criterion, so the asset and rendering approach must support believable swimming rather than only displaying recognizable still cutouts. Compare suitable assets and rendering strategies for the reef species, verify usage rights, and choose an approach that can deliver body deformation, turns, depth, and lighting integration while keeping fish clickable as service links.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A concise comparison covers candidate photorealistic asset and rendering approaches for the supported reef fish, including visual fidelity, performance, maintainability, and interaction tradeoffs.
- [ ] #2 Selected assets have documented sources, attribution needs, and licenses that allow use in this project.
- [ ] #3 The selected approach supports visible body, fin, and tail motion, species-aware turns, depth and lighting integration, and clickable service links; translating a still sprite alone is explicitly rejected as the finished approach.
- [ ] #4 A browser prototype or equivalent review artifact demonstrates the selected approach against the linked real-fish references for at least two reef species.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
