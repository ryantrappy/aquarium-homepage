---
id: AQ-14
title: Redesign the homepage as an immersive realistic fish tank
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:25:00Z'
updated_date: '2026-11-03T04:39:00Z'
labels: []
dependencies: []
references:
  - docs/design.md
documentation:
  - docs/requirements.md
  - docs/design-principles.md
priority: high
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user clarified that the aquarium itself is the product: a sharp, front-on reef display with clean water, crisp live rock, coral, and sand. Remove the page header and marketing title, and show the service list only in a modal opened from a compact Services button. Keep Pause and Settings small and unobtrusive. The current translating fish cutouts remain temporary scaffolding; AQ-12 owns photorealistic lifelike fish motion. AQ-14 stays open until that fish goal and the root review are complete. The environment and control-layout iteration is tracked in child AQ-14.1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The aquarium fills almost the entire main view as a sharp, front-on view through reef-tank glass, with clean water, true perspective, deep focus, live rock, coral, and sand; no dark marketing scrim, blur, or open-ocean vignette obscures the habitat.
- [ ] #2 There is no page header, marketing title, fixed service dock, app-card list, or permanent On the reef list on the main view; the searchable service list appears only in a named native modal opened by deliberately selecting a compact Services button.
- [ ] #3 Only compact aquarium-themed Pause, Services, and Settings controls persist visibly; Escape closes the named modal, focus returns to its opener, and service launch plus transition from Services to Settings work without nested focus traps.
- [ ] #4 The scene and controls remain useful at 402x874 CSS pixels for the iPhone Pro proxy and 1440x900 for a normal laptop, with the tank still dominant, fish links opening configured URLs in new tabs, and pause, keyboard, and reduced-motion behavior preserved.
- [ ] #5 The final task is not complete until the linked fish achieve the photorealistic lifelike movement described by AQ-12; translating still cutouts are only temporary scaffolding.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed result before the task is marked Done.
- [ ] #2 The implementation agent follows project policy: default Luna with high reasoning effort for routine work; root chooses a stronger model when task demands warrant it.
- [ ] #3 Root reviews the result and confirms all active feedback recorded on the task is addressed before it is marked Done.
- [ ] #4 The implementing agent checks only acceptance criteria verified with objective evidence; root performs the final review before Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Complete child AQ-14.1 for the sharp, straight-on reef habitat and modal service-list layout. Coordinate the app implementation with the generated front-tank background and editable OpenPencil v2 design.
2. Remove the header, marketing copy, footer, and permanent service list/dock; retain only compact Pause, Services, and Settings controls.
3. Keep fish links and baseline keyboard, pause, and reduced-motion behavior working. Treat current translating cutouts as scaffold only.
4. Integrate the lifelike fish work from AQ-12 before considering the overall aquarium redesign complete.
5. Verify layout only at 402x874 CSS pixels for the iPhone Pro proxy and 1440x900 for a normal laptop; use task comments and notes for root feedback and iterate until approved.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferred environment motion and lighting is tracked separately as AQ-14.2 (Medium, depending on AQ-5, AQ-12, and AQ-14.1). It covers subtle water ripples, physically coherent caustics, soft polyp/anemone response, stable rock/hard coral, performance, and reduced motion; it does not change AQ-14 or AQ-14.1 scope and is not in this implementation turn.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T04:31:00Z

---

Root asset review: the new reef-tank-front.webp reads as a straight-on glass tank with crisp coral/live rock, a clean sand bed, visible water surface and no room/cabinet or baked-in fish. It is a suitable environment for this iteration. Integration review must preserve this clarity: no dark marketing scrim, blur, oversized text, permanent header or dock. On the reef must open only from a small Services button in a named native modal; verify Escape, focus return, search, service launch and transition to settings. Record broader body/fin/tail lifelike animation as still pending AQ-12.

---
<!-- COMMENTS:END -->
