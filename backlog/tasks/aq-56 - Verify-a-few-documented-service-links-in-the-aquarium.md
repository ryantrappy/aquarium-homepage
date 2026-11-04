---
id: AQ-56
title: Verify a few documented service links in the aquarium
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-04 19:51'
updated_date: '2026-11-04 19:54'
labels: []
dependencies: []
references:
  - AQ-8
  - 'https://docs.ryantr.app/overview#service-links'
documentation:
  - docs/requirements.md
priority: high
type: bug
ordinal: 11700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Newest scratch handoff requests reviewing the documented service-links section and replacing only a few nonworking trappserv.er:port examples for initial native aquarium testing. Leave other examples unchanged until individually verified. This is bounded shortcut navigation validation, not service-health monitoring or approval of the final service roster. The earlier attempt to create a task failed; AQ8 remains the separate final mappings decision. Initial Root web read could not access the docs URL, and current native CUA/browser host is unavailable; do not infer URLs from the historical Caddy inventory.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A few exact service URLs are traced to the current documented service-links source, with source/access evidence recorded.
- [ ] #2 Only selected initial-test mappings are changed with current configuration revision preserved; other examples remain unchanged.
- [ ] #3 Selected fish links open the documented native destination from the aquarium and observed outcomes are recorded honestly, including authentication gates or failures without invented reachability.
- [ ] #4 Root reviews the bounded result; final roster approval stays in AQ8 and no authentication, proxy, DNS, deployment or service-health monitoring changes are made.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read the current service-links source through connected Mintlify (trappserver deployment, overview.mdx). Select only a few documented initial-test destinations, not the whole roster.
2. Initial candidates are Home Assistant https://ha.ryantr.app and Paperless https://paperless.ryantr.app, both documented behind Authelia. Preserve existing unselected examples and current config revision; inactive Immich is not a verified working replacement.
3. Perform bounded read-only destination observations and prepare selected local changes without inventing reachability.
4. When native browser access is available, activate selected fish links from the aquarium and record exact observed destinations/auth gates; retain existing config fields and revision handling.
5. Root reviews bounded testing before completion; final roster remains AQ8. No auth/proxy/DNS/deployment or monitoring changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Source access recovered through the connected Mintlify read tool: deployment trappserver, overview.mdx, Service links section. Exact candidates Home Assistant https://ha.ryantr.app (Authelia, separate device) and Paperless https://paperless.ryantr.app (Authelia). Immich is documented inactive and Tandoor retired; do not promote these as verified working replacements. Public HTTP/web reads alone reached Mintlify login, but connected source read supplied the actual MDX. Native CUA/browser remains unavailable. No configuration edits made.

Bounded read-only HTTPS observations from the local environment: https://ha.ryantr.app returned HTTP401; https://paperless.ryantr.app returned HTTP403. No login attempted, no authentication/security bypass and no app interaction verified. These are access responses, not service-health results or aquarium native-navigation evidence. AC3 remains unchecked and config is unchanged.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04 19:52
---
Root processed the newest scratch entry and created this task as requested. Direct read-only HTTPS request to docs.ryantr.app/overview returned200 only after redirecting to app.mintlify.com with page title Login - Mintlify; the service-links content was not obtained. Web tool also could not access the source, and native CUA/browser host is unavailable after retry. No login/security bypass, config edits or guessed URLs. Exact documented URLs and native navigation observations remain pending source/browser access.
---
<!-- COMMENTS:END -->
