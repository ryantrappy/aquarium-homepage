---
id: AQ-56
title: Verify a few documented service links in the aquarium
status: Done
assignee:
  - '@root'
created_date: '2026-11-04 19:51'
updated_date: '2026-11-05 03:17'
labels: []
dependencies: []
references:
  - AQ-8
  - 'https://docs.ryantr.app/overview#service-links'
documentation:
  - docs/requirements.md
priority: high
type: bug
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Newest scratch handoff requests reviewing the documented service-links section and replacing only a few nonworking trappserv.er:port examples for initial native aquarium testing. Leave other examples unchanged until individually verified. This is bounded shortcut navigation validation, not service-health monitoring or approval of the final service roster. The earlier attempt to create a task failed; AQ8 remains the separate final mappings decision. Initial Root web read could not access the docs URL, and current native CUA/browser host is unavailable; do not infer URLs from the historical Caddy inventory.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A few exact service URLs are traced to the current documented service-links source, with source/access evidence recorded.
- [x] #2 Only selected initial-test mappings are changed with current configuration revision preserved; other examples remain unchanged.
- [x] #3 Selected fish links open the documented native destination from the aquarium and observed outcomes are recorded honestly, including authentication gates or failures without invented reachability.
- [x] #4 Root reviews the bounded result; final roster approval stays in AQ8 and no authentication, proxy, DNS, deployment or service-health monitoring changes are made.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read the current service-links source through connected Mintlify (trappserver deployment, overview.mdx). Select only a few documented initial-test destinations, not the whole roster.
2. Initial candidates are Home Assistant https://ha.ryantr.app and Paperless https://paperless.ryantr.app, both documented behind Authelia. Preserve existing unselected examples and current config revision; inactive Immich is not a verified working replacement.
3. Perform bounded read-only destination observations and prepare selected local changes without inventing reachability.
4. When native browser access is available, activate selected fish links from the aquarium and record exact observed destinations/auth gates; retain existing config fields and revision handling.
5. Root reviews bounded testing before completion; final roster remains AQ8. No auth/proxy/DNS/deployment or monitoring changes.

Native browser recovered 2026-11-04. Re-read current Mintlify overview source (version wjjB1I1z8BGC_55H). Capture current local API envelope/revision before settings edits. Change only Home Assistant URL to https://ha.ryantr.app and add Paperless https://paperless.ryantr.app as a bounded fourth test fish, leaving Jellyfin/Immich examples unchanged. Use native settings save/revision handling, then activate both fish links and record observed destinations/auth gates. Preserve newer configuration; no server/auth/deployment changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Source access recovered through the connected Mintlify read tool: deployment trappserver, overview.mdx, Service links section. Exact candidates Home Assistant https://ha.ryantr.app (Authelia, separate device) and Paperless https://paperless.ryantr.app (Authelia). Immich is documented inactive and Tandoor retired; do not promote these as verified working replacements. Public HTTP/web reads alone reached Mintlify login, but connected source read supplied the actual MDX. Native CUA/browser remains unavailable. No configuration edits made.

Bounded read-only HTTPS observations from the local environment: https://ha.ryantr.app returned HTTP401; https://paperless.ryantr.app returned HTTP403. No login attempted, no authentication/security bypass and no app interaction verified. These are access responses, not service-health results or aquarium native-navigation evidence. AC3 remains unchecked and config is unchanged.

Root native verification 2026-11-04: current connected Mintlify overview version wjjB1I1z8BGC_55H supplied exact Home Assistant/Paperless URLs. Saved local settings through UI revision handling: Home Assistant changed to https://ha.ryantr.app; added one Royal gramma Paperless fish at https://paperless.ryantr.app. Current revision 0d6da35177171e8b326f44a4cab2faf88aa4f04575340dde42095e24fe7cb545. Python API comparison against /tmp/aquarium-aq56-before.json confirms Jellyfin/Immich records byte-equivalent and unchanged. Native fish activation opened both in separate tabs: HA rendered its own launch screen then Unable to connect to Home Assistant; Paperless redirected to the Authelia sign-in page with its exact rd destination. No login, auth bypass or health claim. Saved proof /tmp/aquarium-review-evidence/aq56-service-mappings.jpg; closed destination tabs, resumed motion. Final service roster remains AQ8.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04 19:52
---
Root processed the newest scratch entry and created this task as requested. Direct read-only HTTPS request to docs.ryantr.app/overview returned200 only after redirecting to app.mintlify.com with page title Login - Mintlify; the service-links content was not obtained. Web tool also could not access the source, and native CUA/browser host is unavailable after retry. No login/security bypass, config edits or guessed URLs. Exact documented URLs and native navigation observations remain pending source/browser access.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated only the bounded local Home Assistant/Paperless mappings from current documentation; native fish links opened HA (connection error) and Paperless (Authelia sign-in). Root verified unchanged Jellyfin/Immich examples and current revision. No auth, server or deployment changes; final roster remains AQ8.
<!-- SECTION:FINAL_SUMMARY:END -->
