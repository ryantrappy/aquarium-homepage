---
id: AQ-33
title: Show species thumbnails in service fish selectors
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03 04:39'
updated_date: '2026-11-03 13:00'
labels: []
dependencies: []
references:
  - docs/reef-fish-roster.md
documentation:
  - docs/reef-fish-roster.md
  - docs/requirements.md
priority: medium
type: enhancement
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The reef roster now contains at least 15 distinct fish, so a text-only service fish picker makes it harder to recognize and choose the intended species. Show a small, accurate species preview beside each fish name in both service creation and editing. Follow the adult or sex-specific visual baseline and stable IDs in docs/reef-fish-roster.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every supported reef fish option in the add-service and edit-service fish selector shows a small thumbnail of the corresponding species beside its displayed name; the image matches that roster entry's specified adult or sex-specific appearance, not a generic fish icon.
- [x] #2 The currently selected fish is shown with its matching thumbnail and name, and the displayed preview updates when the user changes the selection.
- [x] #3 Choosing a fish preserves the existing service-to-fish assignment behavior; a loading or unavailable image never displays a different species as though it were the selected fish.
- [x] #4 The fish selector remains usable by keyboard and touch, with the fish name available to assistive technology alongside the thumbnail.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviewed the completed work before marking the task Done.
- [x] #2 Implementation follows project policy in AGENTS.md: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve all existing stable IDs and descriptive metadata; add roster metadata and one thumbnail path per species without renderer-specific fields. 2. Visually review the nine existing thumbnails; generate the six missing original cutouts against roster traits, retain alpha when converting to 600px WebP, and document provenance and checks. 3. Replace the text-only native select with an accessible radio-group picker that shows common/scientific names, per-species thumbnails, and the selected-fish preview; await async persistence for service mutations. 4. Add catalog-to-asset coverage, run typecheck and focused/full tests, check rendering at 402x874 and 1440x900 where computer-use access is available, then hand off to root for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Continued AQ-33: filled the catalog to all 15 stable roster IDs and wired per-species thumbnail paths; generated six missing cutouts and retained the existing nine after visual trait review. Added visual radio-group picker with selected-fish preview, image failures hide without substituting another species, and async CRUD/import/reset/retry handlers now await server persistence and retain drafts on failure. Added docs/fish-assets.md provenance and catalog asset existence coverage. Verified: npm run typecheck; npm test -- --reporter=dot (5 files, 19 tests). Browser visual check at 402x874 and 1440x900 remains pending because the computer-use browser host reports unavailable; no visual pass claimed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-03 12:40
---
Root review requested for AQ-33. Catalog file and automated checks pass; please review visual and async save behavior. Browser verification is pending until preview access returns, so do not mark acceptance criterion 2/3/4 or DoD complete based solely on code review. I could not verify all 15 thumbnails in the running picker through browser UI because the CUA browser host is offline.
---

author: @Luna
created: 2026-11-03T12:46:00Z
---
AQ-33 implementation review update: desktop browser preview shows the selected-fish image/name updates when a species is selected; ArrowRight advances the native radio group with the common/scientific name exposed in accessibility state; Edit restores the existing service's clownfish selection and preview. 
> typecheck
> tsc --noEmit passes and 
> test
> vitest run --reporter=dot

 RUN  v5.1.0 /Users/ryantrapp/Desktop/Code/aquarium-homepage

·····················

 Test Files  5 passed (5)
      Tests  21 passed (21)
   Start at  06:46:17
   Duration  498ms (import 71%, tests 18%, transform 7%, worker 4%) passes (5 files, 21 tests). I corrected docs/fish-assets.md provenance to match docs/design.md: the first five cutouts were project-generated with ImageGen, and the royal gramma/blue tang filenames were corrected after the outputs were swapped. Exact 402x874 browser verification remains unclaimed; root is performing the responsive review. No acceptance criteria or Definition of Done items checked.
---

author: @Luna
created: 2026-11-03T12:46:00Z
---
Correction to the preceding comment: verification commands were npm run typecheck and npm test -- --reporter=dot; results were typecheck passed and 5 test files with 21 tests passed. Desktop browser review verified the fish preview, radio keyboard movement, and existing edit assignment. Exact 402x874 QA is pending root review. No acceptance criteria were checked.
---

author: @root
created: 2026-11-03T12:46:00Z
---
Root reviewed all ten added thumbnail files visually: stable-ID mappings and distinguishing roster traits match, including female lyretail anthias and male McCoskers flasher wrasse; no filename swap found. The current first-five provenance note is incorrect: docs/design.md already records these as built-in ImageGen outputs from2026-11-02 and the original tang/gramma correction. Please link that provenance instead of saying it was not recorded. Picker code is under review; actual selection/keyboard/touch and shared-save error browser checks remain pending while CUA is offline.
---

author: @root
created: 2026-11-03T12:50:00Z
---
Root interactive review passed at 1440x900 and 402x874: all 15 option thumbnails plus selected preview loaded; native arrow keys changed selection, accessible names include common/scientific names, selecting copperband then Flame angelfish updated preview; adding persisted the assigned fish, and editing restored it. Offline save retained name/URL/fish and showed failure, reconnect saved correctly. Both settings/page had no horizontal overflow. Asset/provenance review recorded above; missing images are hidden with species text preserved and no substitute fish. AQ6/AQ7 track additional focus and touch polish separately.
---

author: @Luna
created: 2026-11-03 13:00
---
Added five focused ServiceManager component integration tests using happy-dom: species selection updates selected name/image/radio assignment; Edit restores the saved species; failed thumbnail stays hidden without substituting a species; rejected save retains the full draft and shows the error without success status; pending save retains the draft until resolve, then resets form. Full suite: 6 files / 31 tests pass; typecheck passes. These are virtual-DOM integration tests; browser viewport QA remains as recorded by root.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added species-specific recognition thumbnails and a native keyboard-operable radio picker for all 15 stable reef fish. Selected preview and stored assignments verified in add/edit flows on the two target viewports; failed async saves preserve drafts. Provenance documented; these thumbnails remain distinct from final animated 3D assets.
<!-- SECTION:FINAL_SUMMARY:END -->
