---
id: AQ-80
title: Decide the glass front pane (go / no-go)
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-13 00:25'
labels:
  - optics
  - rendering
dependencies:
  - AQ-39
  - AQ-14.6
references:
  - src/rendering/scene/underwater-optics.ts
  - src/rendering/scene/aquarium.ts
  - AQ-39
  - AQ-43
  - AQ-70.1
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 80
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision-only task resolving the AQ-39 glass conflict. Root decided GO on 2026-11-12 for an optically clear physical enclosure implemented separately in AQ-102. Preserve AQ-39's prohibition on heavy front-pane reflections, screen-space distortion, and chromatic aberration; permit only an edge/grazing Fresnel highlight and faint diagonal sheen, with no blur, refraction, color veil, or scene-blocking glare. Side panes may show faint mirrored outer-reef/sand render content. Disable glass raycasts and use the existing pause/reduced-motion/page-hidden scene clock. AQ-80 makes no renderer changes. Repository search found no canonical standalone tracker item #13 document, so this task and AQ-39 record the decision without claiming a separate tracker was updated. Bubbles and particulate remain separate AQ-43 scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Decision recorded (go or no-go) with reasoning
- [x] #2 If no-go, the glass pane is recorded as deferred/rejected in AQ-39 and tracker item 13
- [x] #3 If go, the intended reflection behaviour is specified and AQ-39 is updated
- [x] #4 No implementation in this task
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-11-12 Root decision: GO. AQ-80 remains decision-only and adds no renderer implementation. Preserve AQ-39's prohibition on heavy front-pane reflections while allowing this restrained treatment under AQ-102: optically clear front pane with edge/grazing Fresnel highlight and a faint diagonal sheen only; no full-frame blur, refraction, color veil, or scene-blocking glare. Side-pane reflections are faint mirrored render content from outer reef/sand, not painted silhouettes. Disable raycasts on every glass mesh and use the existing pause/reduced-motion/page-hidden scene clock. AQ-102 owns implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12 Root decision recorded: GO for the restrained enclosure defined in the appended plan and AQ-102. A separate canonical tracker item #13 document could not be located in the repository; the conflict exists in this Backlog task and AQ-39 notes, so no unverified tracker file or item was invented. Root review remains pending.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root accepted GO2026-11-12 after reviewing Luna decision records in AQ80/AQ39/AQ102. The front pane stays optically clear with restrained grazing/edge Fresnel and faint diagonal sheen; heavy reflections, blur/refraction, color veil, distortion and scene-blocking glare remain prohibited. Faint side reflections use genuine mirrored scene content, all glass raycasts are disabled, and motion follows existing accessibility/pause clocks. AQ102 owns implementation. AC2 is conditional on no-go and not applicable to the chosen GO; no nonexistent standalone tracker13 was invented. This decision task changes no renderer code.
<!-- SECTION:FINAL_SUMMARY:END -->
