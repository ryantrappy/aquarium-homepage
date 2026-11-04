---
id: AQ-8
title: Finalize homelab service mappings with the user
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-04 19:54'
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
- [ ] #1 The service list and exact URLs are reviewed with the user before they are added as defaults.
- [ ] #2 Each agreed service has a display name and a fish or aquarium-object representation.
- [ ] #3 No unconfirmed service URL is presented as a working default.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only Caddy host inventory (2026-11-03), supplied for user review only; this does not approve these as defaults. Explicit routed service hostnames are ha.ryantr.app, immich.ryantr.app, paperless.ryantr.app, tautulli.ryantr.app, ombi.ryantr.app, basketball.ryantr.app, rankings.ryantr.app, ninja.ryantr.app, recipes.ryantr.app, birdnetgo.ryantr.app, watchmybirds.ryantr.app, go2rtc.ryantr.app, n8n.ryantr.app, watcharr.ryantr.app, radarr.ryantr.app, sab.ryantr.app, sonarr.ryantr.app, homebridge.ryantr.app, komodo.ryantr.app, scrutiny.ryantr.app, maintainerr.ryantr.app, unifi.ryantr.app, and uptime.ryantrapp.com. Caddy routes Home Assistant to 192.168.1.254:8123, Immich to 127.0.0.1:2283, Paperless to 127.0.0.1:8010, Tautulli to 127.0.0.1:8181, Uptime Kuma to 127.0.0.1:3001, and Ombi to 127.0.0.1:3579. The shared Authelia forward-auth import is present on HA, Immich, Paperless, Tautulli, and Uptime. The Caddyfile shows no Jellyfin subdomain route. This is route evidence, not a final service list, fish mapping, or authorization to change defaults; exact URLs and representations still need user review.
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
<!-- COMMENTS:END -->
