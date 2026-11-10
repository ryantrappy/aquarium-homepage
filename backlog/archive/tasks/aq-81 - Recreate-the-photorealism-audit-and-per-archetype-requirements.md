---
id: AQ-81
title: Recreate the photorealism audit and per-archetype requirements
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T20:08:00Z'
labels:
  - modeling
dependencies:
  - AQ-42
  - AQ-59
documentation:
  - docs/rendering.md
  - docs/requirements.md
priority: '3'
type: feature
ordinal: 70
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-42 cites a photorealism audit (AQ-70) from 2026-11-05 that calls the current procedural coral colonies cartoon (uniform pastel saturation, repeated instances, cotton-swab Acropora tips, emissive neon brain coral), with detailed photoreal requirements per archetype in AQ-70.11 and fluorescence via masks in AQ-70.6, but no aq-70 task file exists on gemini_control. Recreate that audit as a tracked task: record the audit findings, define photoreal requirements per coral/rock archetype, and define fluorescence-via-masks requirements, so AQ-42, AQ-59 and the sand work have a concrete acceptance target instead of a comment reference.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The 2026-11-05 photorealism audit findings are recorded in the task, with the cartoon-colony evidence cited
- [ ] #2 Photoreal requirements are defined per archetype (Acropora, Montipora, Euphyllia, Diploria, anemone, zoanthid, live rock) with measurable visual targets
- [ ] #3 Fluorescence-via-masks requirements are defined (AQ-70.6 scope), including excitation range and mask encoding
- [ ] #4 The audit is reviewed by Root before it gates AQ-42 or AQ-59 acceptance
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @gemini
created: 2026-11-08T20:08:00Z

---

Archived during backlog audit: this task was created under the assumption that AQ-70 was missing on gemini_control, causing a duplicate ID collision with the canonical AQ-70 ('Achieve hyper-realistic reef-tank visuals') epic. All 4 acceptance criteria are already covered by AQ-70, AQ-70.1, AQ-70.6, and AQ-70.11.

---
<!-- COMMENTS:END -->
