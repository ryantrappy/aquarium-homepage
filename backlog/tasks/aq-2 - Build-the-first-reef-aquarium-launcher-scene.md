---
id: AQ-2
title: Build the first reef aquarium launcher scene
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:24:00Z'
labels: []
dependencies: []
references:
  - design/reef-control.fig
  - design/reef-control-preview.png
  - design/homepage-browser-preview.jpg
  - design/build-openpencil.js
documentation:
  - docs/requirements.md
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The homepage should turn homelab services into a playful aquarium while remaining a practical launcher. The first pass needs a reef scene, independently moving inhabitants, and a clear way to open a configured service.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The main screen presents configured services as selectable reef fish or aquarium objects in a coherent aquarium scene.
- [x] #2 Selecting a configured service opens that service URL.
- [x] #3 Multiple inhabitants move with varied randomized paths or timing, and remain within the visible aquarium area.
- [x] #4 The visual treatment is quirky while keeping service names and launch targets understandable.
- [x] #5 Basic keyboard navigation can identify and launch services, and aquarium motion respects the reduced-motion preference.
- [x] #6 An editable OpenPencil design file and an openable preview of the visual direction are delivered.
- [x] #7 Activating a service opens its configured URL in a new tab immediately through the service link.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation is delegated to Luna with high reasoning effort.
- [x] #2 Root agent has reviewed the completed work before the task is marked Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build the cinematic reef scene using a generated reef photo plate, right-facing cutout assets for the five reef species, and bounded randomized drift through open water.
2. Keep service names readable with quiet typography and a reef-lab palette; provide a persistent searchable service dock so all configured services remain accessible.
3. Keep direct service links keyboard operable and open the configured URL in a new tab immediately; make baseline motion respect pause and reduced-motion controls.
4. Deliver the requested editable OpenPencil design file by importing the final HTML/CSS into an editable design document, plus a PNG preview that can be opened for review.
5. Check the result alongside the first-pass settings flow, then leave completion for root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root visual review approved the editable design/reef-control.fig and reef-control-preview.png; the source contains native editable layers and embedded fish/background assets rather than a screenshot-only design. Browser review verified the five species and correct fish assets, stable searchable service dock, links opening configured URLs in new tabs, clear empty-search result, and randomized motion. At 390x844 and 320x740, root measured fish start/end positions within aquarium bounds after the mobile motion fix. Root also verified build, typecheck, 7/7 tests, HTTP 200, and no browser console errors or warnings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the reef aquarium launcher with selectable fish, readable service labels, searchable dock, bounded randomized swimming, keyboard and reduced-motion support, and the reviewed editable OpenPencil source plus preview. Root verified links, fish assets, mobile bounds, tests, and build.
<!-- SECTION:FINAL_SUMMARY:END -->
