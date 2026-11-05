---
id: AQ-8
title: Finalize homelab service mappings with the user
status: Done
assignee:
  - '@root'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-05 03:45'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: low
type: task
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The visual launcher needs an agreed mapping between actual homelab services, display names, URLs, and fish choices. Those details are not finalized in the current project brief.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The service list and exact URLs are reviewed with the user before they are added as defaults.
- [x] #2 Each agreed service has a display name and a fish or aquarium-object representation.
- [x] #3 No unconfirmed service URL is presented as a working default.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent has reviewed the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Apply user-confirmed starter roster: Komodo, WatchMyBirds, Paperless, Home Assistant, Ombi at exact documented URLs. Keep HA clownfish/Paperless royal gramma; select yellow tang for Komodo, Banggai cardinalfish for WatchMyBirds, blue tang for Ombi. 2. Delegate narrow default-list and test/doc changes; Root preserves current local API envelope/revision, replaces only service roster via If-Match, retaining known existing IDs and all other configuration. 3. Test new starter native destinations from aquarium honestly; no login/auth/host/deployment changes or health claims. 4. Verify defaults/tests/production build and final config, record user choice and Root review before Done.

2026-11-04 bounded starter-default packet @asset-validation: replace only EXAMPLE_SERVICES entries with the five user-confirmed documented HTTPS destinations and Root-selected stable fish IDs, with isExample false; update the existing starter test and service-mapping-review choices section to record approval and preserve historical navigation limits. Keep saved/shared config, revision/schema behavior and runtime untouched. Run targeted services/state/config tests and typecheck; Root owns actual configuration writes, browser tests, overall acceptance and Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only Caddy host inventory (2026-11-03), supplied for user review only; this does not approve these as defaults. Explicit routed service hostnames are ha.ryantr.app, immich.ryantr.app, paperless.ryantr.app, tautulli.ryantr.app, ombi.ryantr.app, basketball.ryantr.app, rankings.ryantr.app, ninja.ryantr.app, recipes.ryantr.app, birdnetgo.ryantr.app, watchmybirds.ryantr.app, go2rtc.ryantr.app, n8n.ryantr.app, watcharr.ryantr.app, radarr.ryantr.app, sab.ryantr.app, sonarr.ryantr.app, homebridge.ryantr.app, komodo.ryantr.app, scrutiny.ryantr.app, maintainerr.ryantr.app, unifi.ryantr.app, and uptime.ryantrapp.com. Caddy routes Home Assistant to 192.168.1.254:8123, Immich to 127.0.0.1:2283, Paperless to 127.0.0.1:8010, Tautulli to 127.0.0.1:8181, Uptime Kuma to 127.0.0.1:3001, and Ombi to 127.0.0.1:3579. The shared Authelia forward-auth import is present on HA, Immich, Paperless, Tautulli, and Uptime. The Caddyfile shows no Jellyfin subdomain route. This is route evidence, not a final service list, fish mapping, or authorization to change defaults; exact URLs and representations still need user review.

AQ8.1 review sheet is Root accepted. Current local tested candidates HA/clownfish and Paperless/royal-gramma can form a minimal starter; unconfirmed Jellyfin/Immich remain examples until user decides. Asking user for final roster/default choices while independent work continues; no further default/config change before response.

User explicitly selected on2026-11-04: komodo WatchMyBirds paperless home assistant ombi is the list to start with. This replaces deferred final roster choice. Root chose representative fish for3new entries while preserving existing HA/Paperless choices. URLs come from connected overview source; membership approval does not assert service health.

Bounded starter-default implementation ready (2026-11-04): EXAMPLE_SERVICES retains its compatible export name but now contains exactly user-selected Komodo, WatchMyBirds, Paperless, Home Assistant and Ombi at the documented HTTPS URLs, with Root-selected yellow-tang/banggai-cardinalfish/royal-gramma/ocellaris-clownfish/blue-tang respectively and isExample:false. IDs are komodo,watchmybirds,paperless,home-assistant,ombi. Updated existing starter regression test and docs/service-mapping-review.md confirmed-choices section while retaining AQ56 historical limits and clarifying that source/user approval does not verify health/reachability. Saved/shared config, schema/revision behavior, other flags and runtime remain untouched; Root owns actual config writes/browser checks. services+state targeted tests pass15/15; npm run typecheck and scoped diff whitespace check pass. Additional shared-config/API targeted result will be recorded separately before handoff.

Final targeted verification for starter-default packet: src/lib/services.test.ts + services-state.test.ts pass15 tests; src/server/shared-config.test.ts + src/routes/api/-config.test.ts pass12 tests (27 total across4 files). Typecheck and scoped whitespace checks pass. Implementation stable; worker holds for Root. No overall AC/status/Done changes by worker.

Root final review 2026-11-04: user-approved roster is Komodo,WatchMyBirds,Paperless,HomeAssistant,Ombi, using exact current documentedHTTPS destinations. Root chose yellowtang/Banggaicardinalfish/royalgramma/clownfish/bluetang respectively. Updated defaults and local sharedconfig with current If-Match revision, preserved existingHA/PaperlessIDs/non-servicefields, removedJellyfin/Immich. Revision6f3e70b0f92ae8bb18254169b139c94342b9ffbb0b0edd247cfb2bc88ee5fc73. Nativefish checks: Komodo/login,WatchMyBirdsLiveStreampage,Ombi/login; earlierHAshellconnectionerror/PaperlessAutheliagate remain honest. No sign-ins/healthclaims/authchanges. Root reviewed workerdefaults/test/doc,176tests/typecheck/isolatedbuild; fresh production/api/config yields5approved non-exampledefaults. Proof /tmp/aquarium-review-evidence/aq8-approved-starter-list.jpg.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-03 12:46
---
Read-only mapping evidence for user review: the Caddy configuration has HTTPS host routes ha.ryantr.app -> 192.168.1.254:8123, immich.ryantr.app -> 127.0.0.1:2283, paperless.ryantr.app -> 127.0.0.1:8010, and uptime.ryantrapp.com -> 127.0.0.1:3001. The routes use the existing Caddy/Authelia configuration; this inventory did not test service health. The public device docs URL redirects to Mintlify sign-in, so it supplied no further mappings. Existing Jellyfin sample is not corroborated by an active container or exact Caddy route. These are candidates for review only; no app defaults were changed and fish representations remain for user selection.
---

author: @Luna
created: 2026-11-03 13:19
---
User preference recorded: keep the clearly labeled example shortcuts for now; do not replace them with the observed Caddy route candidates. Final service URL and fish/object mappings remain deferred for user review.
---

author: root
created: 2026-11-04 19:54
---
Newest scratch request is tracked separately as AQ56: test only a few documented service destinations before changing any others. Connected Mintlify overview.mdx provides Home Assistant and Paperless candidates; local HTTP observations are401/403 access responses, with native aquarium verification pending unavailable CUA. This does not approve the final roster or make inactive/retired documented services working defaults. Existing configuration remains unchanged.
---

author: @asset-validation
created: 2026-11-05 03:26
---
Worker read all current scratch entries; local-first policy current, service choice actioned into this packet, asset/runtime/background gates remain pending/current as recorded. Shared scratch/handoff remains Root-owned.
---

author: @asset-validation
created: 2026-11-05 03:27
---
Starter defaults packet implemented for Root review. No .data/config writes, build, scene/model/server/deployment changes.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Applied user-confirmed5-service starter roster to defaults/local configuration with preserved revision semantics. Root verified exactURLs/fish choices/native destinations and176tests/typecheck/productionbuild. Jellyfin/Immich placeholders removed; no deployment or service-health claim.
<!-- SECTION:FINAL_SUMMARY:END -->
