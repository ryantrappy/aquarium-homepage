---
id: AQ-108
title: >-
  Change defaults to use google.com or other common items. Autofill https:// for
  add new service textbox
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-15 04:42'
updated_date: '2026-11-15 05:31'
labels: []
dependencies: []
priority: '1'
type: enhancement
ordinal: 145000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
I want to make ths a project I can show off a bit so try to remove any references to my own internal network as defaults
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fresh installs, empty-state fallbacks and explicit reset use public, recognizable example services such as Google; no personal internal-network service URLs remain in shipped default configuration.
- [x] #2 The Add service URL field starts with https:// and returns to that prefix after successful addition; editing existing services preserves their configured URLs and URL validation.
- [x] #3 Existing saved/shared user configuration is preserved; default changes do not migrate, overwrite or disclose personal settings.
- [x] #4 Root reviews focused tests, typecheck/build and laptop-only settings/default-flow evidence; reviewed completion is committed and pushed to the shared showcase PR without deployment.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Audit runtime/browser/server/reset defaults and add-service draft lifecycle, replace only shipped example values, preserve existing configuration and historical provenance, update relevant focused tests and public setup examples, then Root verifies local fresh configuration and settings behavior at1440x900. No phone checks and no deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root reviewed exact ten-file source snapshot and privateproof f5746f3 over7c08b43. Durable evidence docs/asset-evidence/aq108/root-review-20261114/README.md:35focused tests/4files, typecheck17scripts/build and Compose default+explicitoverride resolution pass. Laptop1440x900DPR1 verifies five public examples, actualHTTPS draftprefix, preserved editURL, successfuladd+prefixreset, persistedreload and explicitHTTP200reset to samefive examples; final capturedappwarning/errorlogempty. Original user configuration and deployment untouched. AC1-3 accepted; AC4 remains pending sharedPR delivery/completion commit. Root will commit/push this reviewed source milestone, then complete finalization.

Root final acceptance: all4criteria verified. Source393c6c9 and scopef69723b are pushed on v1-finalization to https://github.com/ryantrappy/aquarium-homepage/pull/53 with running contents. Root native review and exact source checks are complete; this completion/status checkpoint is committed immediately. The other19showcase tasks remain open; no phone checks or deployment.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fresh installs and explicit reset now use five public example websites; add-service starts and resets with https:// while saved/edit URLs remain unchanged. Root verified35focused tests, typecheck17scripts, build, Compose default/override resolution and laptop1440x900DPR1 flows. Reviewed source393c6c9 is pushed to shared draftPR53; no deployment. Evidence: docs/asset-evidence/aq108/root-review-20261114/README.md.
<!-- SECTION:FINAL_SUMMARY:END -->
