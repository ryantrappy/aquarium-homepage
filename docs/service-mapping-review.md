# Service mapping review

<!-- AGENT_DOC_METADATA
Category: Evidence / Verification
Status: Canonical / Complete
Authority: Evidentiary Record
Backlog: AQ-8, AQ-8.1, AQ-56
Owner: @root
Updated: 2026-11-05
Upstream: AGENT_TASKS.md, docs/requirements.md
Downstream: src/lib/fish.ts, default and local configuration presets
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Homelab Service Verification Evidence
> - **Status**: Canonical / Complete
> - **Authority**: Evidentiary Record
> - **Backlog Reference**: `AQ-8`, `AQ-8.1`, `AQ-56`
> - **Summary**: Confirmed starter homelab roster (Komodo, WatchMyBirds, Paperless, Home Assistant, Ombi), mapped species, URLs, and native browser verification observations.

**Starter roster confirmed on 2026-11-04 (America/Chicago): Komodo, WatchMyBirds, Paperless, Home Assistant and Ombi.** The final choices below supersede the earlier undecided roster. Source documentation and user confirmation establish the destinations; they do not establish application reachability or health. The AQ56 observations below remain bounded historical results.

## Source and scope

- Connected Mintlify deployment: `trappserver`, page `overview.mdx`, section **Service links**.
- Source version token returned by Mintlify: `wjjB1I1z8BGC_55H`; read on **2026-11-04 (America/Chicago)**. The page-history endpoint separately lists a saved version dated `2026-11-02T19:40:16.209Z` (`6ae8e720cc0a55d9e82a8e31`); it does not identify that row as the current read token.
- Source: [docs.ryantr.app/overview#service-links](https://docs.ryantr.app/overview#service-links). The connected source read, rather than the public URL response, supplied the page content.
- The source defines **LAN** as connecting from the home network and **Authelia** as the shared sign-in portal; an application may also require its own login.
- The four-entry settings snapshot below records the state before the final starter choice. Updating this sheet and the starter defaults does not overwrite saved settings; Root separately owns the current local configuration and browser checks.

## Before the final choice: local examples and initial navigation results

| Service | Current local shortcut and fish | Documented candidate and access note | AQ56 native link observation | User decision |
| --- | --- | --- | --- | --- |
| Home Assistant | `https://ha.ryantr.app/` · `ocellaris-clownfish` | `https://ha.ryantr.app` · Authelia; runs on a separate device | Opened the Home Assistant launch screen, then showed “Unable to connect to Home Assistant.” No login attempted. | Keep this URL and clownfish, or provide another destination/fish. The observed launch screen does not establish application access. |
| Jellyfin | `http://trappserv.er:8096/` · `blue-tang` | No Jellyfin destination is listed in this overview. The older AQ8 Caddy inventory also did not corroborate a Jellyfin subdomain route. | Not tested in AQ56. | Confirm the intended Jellyfin URL or keep this explicitly as an example until supplied. |
| Immich | `http://trappserv.er:2283/` · `yellow-tang` | `https://immich.ryantr.app` · Authelia; the overview marks the deployment **inactive**. | Not tested in AQ56. | Keep the current entry only as an example, remove it for now, or decide later whether to use the documented hostname after the deployment is active. |
| Paperless | `https://paperless.ryantr.app/` · `royal-gramma` | `https://paperless.ryantr.app` · Authelia | Opened the Authelia sign-in page. No sign-in attempted; the Paperless application was not verified. | Keep this URL and fish, or choose another destination/fish. |

The initial navigation results are destination observations, not service-health checks. AQ56 also records earlier unauthenticated direct HTTP responses of 401 for Home Assistant and 403 for Paperless; those responses do not establish application health. Only Home Assistant and Paperless were selected for AQ56; all other destinations below are untested.

## Documented inventory outside the AQ56 observations

These exact entries come from the same source. Komodo, WatchMyBirds and Ombi were subsequently selected for the starter roster below. Access notes repeat only what the source documents; this inventory adds no navigation or reachability claim.

| Candidate | Exact documented URL | Documented access or caution |
| --- | --- | --- |
| Komodo | `https://komodo.ryantr.app` | LAN; remote tunnel uses Cloudflare Access and Authelia. |
| Uptime Kuma | `https://uptime.ryantrapp.com` | Authelia. This is only a possible shortcut; no aquarium monitoring is proposed. |
| UniFi | `https://unifi.ryantr.app` | LAN; certificate replacement is pending. |
| n8n | `https://n8n.ryantr.app` | LAN only. |
| BirdNET-Go | `https://birdnetgo.ryantr.app` | LAN only; runs on M1 Lab. |
| WatchMyBirds | `https://watchmybirds.ryantr.app` | LAN only; runs on M1 Lab. |
| go2rtc | `https://go2rtc.ryantr.app` | LAN only; media sessions are untested. |
| Homebridge | `https://homebridge.ryantr.app` | LAN. |
| Second Read | `https://basketball.ryantr.app` | Public playbook with offline support. |
| Fantasy rankings | `https://rankings.ryantr.app` | App sign-in. |
| Ombi | `https://ombi.ryantr.app` | App sign-in. |
| Radarr | `https://radarr.ryantr.app` | LAN. |
| Sonarr | `https://sonarr.ryantr.app` | LAN. |
| SABnzbd | `https://sab.ryantr.app` | LAN. |
| Tautulli | `https://tautulli.ryantr.app` | Authelia. |
| Maintainerr | `https://maintainerr.ryantr.app` | LAN. |
| Watcharr | `https://watcharr.ryantr.app` | LAN. |
| Scrutiny | `https://scrutiny.ryantr.app` | LAN. |
| Invoice Ninja route | `https://ninja.ryantr.app` | Authelia; route exists, application is not confirmed in the inventory. |

The overview also lists local interfaces for Plex and several LAN-only tools; see its **Local interfaces** section for their exact addresses. They have not been tested or copied into this sheet. The overview says TeslaMate containers are currently stopped. It marks Tandoor (`https://recipes.ryantr.app`) as **retired**. These warnings are retained here so neither destination is mistaken for an active choice.

## Confirmed starter choices

The user selected these five services and approved using their documented destinations as the starter defaults. Root assigned the fish representations:

| Service | Exact starter URL | Fish ID |
| --- | --- | --- |
| Komodo | `https://komodo.ryantr.app` | `yellow-tang` |
| WatchMyBirds | `https://watchmybirds.ryantr.app` | `banggai-cardinalfish` |
| Paperless | `https://paperless.ryantr.app` | `royal-gramma` |
| Home Assistant | `https://ha.ryantr.app` | `ocellaris-clownfish` |
| Ombi | `https://ombi.ryantr.app` | `blue-tang` |

These entries replace the old Home Assistant/Jellyfin/Immich placeholder defaults and are not labeled examples. The existing `EXAMPLE_SERVICES` export name is retained for compatibility. Previously saved lists remain unchanged unless explicitly edited or reset. Jellyfin and inactive Immich are outside the confirmed starter roster.

Root applied the approved roster to the local shared configuration using its current `If-Match` revision, preserving the existing Home Assistant/Paperless IDs and all non-service fields. The resulting revision is `6f3e70b0f92ae8bb18254169b139c94342b9ffbb0b0edd247cfb2bc88ee5fc73`. Jellyfin and Immich were removed from this local list as requested.

Additional native fish-link observations on 2026-11-04: Komodo opened its `/login` page; WatchMyBirds opened the page titled **Live Stream - WatchMyBirds** at its documented root; Ombi opened its `/login` page. No sign-in was attempted, no external application data was changed, and no health monitoring was added. Home Assistant/Paperless observations remain as recorded above. Roster confirmation and these navigation observations do not establish ongoing service health.
