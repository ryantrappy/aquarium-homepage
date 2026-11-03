---
id: AQ-3
title: Add service settings with local persistence
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:24:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: high
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users need to tailor the homelab launcher without editing source code. The initial setup should support named services, URLs, and a selected reef fish, using simple browser-local storage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A user can add a service with a display name, URL, and fish choice.
- [x] #2 A user can edit an existing service name, URL, and fish choice.
- [x] #3 Required fields and malformed URLs are rejected with a clear validation message.
- [x] #4 Added and edited services remain configured after a page reload in the same browser.
- [x] #5 The aquarium scene updates when a service is added or edited.
- [x] #6 Settings fields, validation messages, and save/cancel actions are operable by keyboard with visible focus.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation is delegated to Luna with high reasoning effort.
- [x] #2 Root agent has reviewed the completed work before the task is marked Done.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the service configuration schema and local-storage hook established in the foundation work.
2. Provide a settings drawer for service create, edit, and delete operations, fish selection, and import/export; offer a reset path if saved data is invalid.
3. Validate the service name and URL, show actionable errors, and update the aquarium immediately after a successful edit.
4. Keep all settings controls keyboard operable with visible focus; basic motion pause and reduced-motion behavior remain available in the prototype.
5. Verify local persistence and settings flows, then leave completion for root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root browser verification: added a temporary service with name, URL, and fish; edited its name, URL, and fish; confirmed reload retained the updated record; malformed javascript: URL showed a clear error and an empty required name triggered the browser required-field message. Keyboard verification showed visible focus on fields and the save/cancel actions; Enter submitted and canceled the edit, and Escape closed the dialog and restored focus to Settings. Activating a fish opened its configured URL in a new tab. Temporary services were removed, leaving the three sample entries. Root also verified npm run typecheck, npm run build, npm test (7/7), HTTP 200, and no browser console warnings/errors.

Additional root browser verification: JSON export produced the expected service data; malformed JSON import was rejected without changing the current list; valid JSON import succeeded.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added and edited service settings for name, URL, and fish selection with browser-local persistence. Verified validation, reload behavior, keyboard operation and visible focus, scene launch links, and cleanup of temporary records; root reviewed the implementation.
<!-- SECTION:FINAL_SUMMARY:END -->
