---
id: AQ-10
title: Deploy the aquarium homepage to trappserv.er
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T20:27:00Z'
labels: []
dependencies:
  - AQ-9
documentation:
  - docs/requirements.md
priority: medium
type: task
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The homelab launcher should ultimately be available from the Ubuntu homelab server at trappserv.er. Deployment details can be chosen after runtime and shared configuration needs are known.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The application is deployed and reachable at the agreed URL on trappserv.er.
- [x] #2 Deployment and update steps are documented and repeatable.
- [x] #3 The deployed app can reach the configured shared storage service.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent has reviewed the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the reviewed source archive at live SHA 6e5c30a and verify shared config persistence without changing service mappings.
2. Restore and confirm the original three-example envelope and revision 0778042fed0e2065e9657b7209832a6b4820e7b4610b1e0e95d5dcd3e0e382b3.
3. Apply the root-reviewed LAN-only Caddy handler with a timestamped backup; preserve all other routes and Authelia configuration.
4. Verify the app and shared config on LAN without Authelia, deny public IPv4 requests, and record the direct public IPv6 test limitation.
5. Document the live deployment and repeatable source-archive update/rollback steps; keep In Progress pending root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Live deployment: reviewed source SHA 6e5c30a, Node 24 container, loopback host port 127.0.0.1:3004, shared data at /home/trappserver/.local/share/reef-control. Caddyfile is /home/trappserver/Documents/caddy_v2/Caddyfile. Aquarium route allows only remote peers in 192.168.1.0/24 to proxy to 127.0.0.1:3004; host-only fallback returns 403. It does not import Authelia. Caddy backup before route update: /home/trappserver/Documents/caddy_v2/Caddyfile.aquarium-20261103T195601Z.bak. Caddy v2.11.4 validation and reload succeeded; existing formatting warning only.

UniFi local DNS entry aquarium.ryantr.app is a CNAME to trappserv.er (TTL 300); the gateway resolves it to A 192.168.1.236 and returns no public AAAA for the local name. Public Cloudflare DNS was not changed in the final LAN DNS fix. Root independently verified unauthenticated LAN homepage and same-origin /api/config return 200; config revision is the exact original three-example baseline 0778042fed0e2065e9657b7209832a6b4820e7b4610b1e0e95d5dcd3e0e382b3. Forced public IPv4 requests through Cloudflare return 403 for / and /api/config with no JSON. Direct public IPv6 HTTP testing remains unavailable from this Mac because it has no IPv6 connection.

Authenticated Settings save/reload was verified earlier on SHA 6e5c30a; original IDs, names, URLs, fish IDs, and isExample flags were restored immediately. API save persistence across Compose restart was previously verified. docs/deployment.md records current route, storage, DNS behavior, backup, and repeatable source-archive update/rollback. Waiting root review; AQ-10 remains In Progress.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-03 12:46

---

Read-only deployment inventory: trappserv.er is Ubuntu 24.04.5 with Node 18.19.1, Docker 27.3.1, and Compose 2.29.7; Docker and the Caddy container are active. Host port 3004 is free. Caddy has wildcard *.ryantr.app and an Authelia snippet; candidate https://reef.ryantr.app has no exact matcher or public A record yet. It would need a DNS record and exact host route importing Authelia and proxying to 127.0.0.1:3004. Node 24 isolated Docker image is feasible without changing host Node. No DNS, Caddy, containers, or server files were changed. AQ-10 remains To Do pending AQ-9 root review, route-name confirmation, and deployment approval.

---

author: @Luna
created: 2026-11-03 12:49

---

Candidate alignment: the deployment doc now uses aquarium.ryantr.app, matching the root's read-only probe. It still needs DNS and an exact Caddy route; nothing was changed. Earlier reef.ryantr.app was also unassigned, so treat the URL choice as pending root review.

---

author: @root
created: 2026-11-03T12:51:00Z

---

Root DNS discovery: UniFi Network static-DNS read succeeded for site default and returned20 records; no aquarium.ryantr.app record exists in that response. Existing enabled app records mostly point to192.168.1.236, matching the observed Caddy host. Proposed deployment name is a LAN-only A record aquarium.ryantr.app ->192.168.1.236, with the app reached only through the existing Caddy/Authelia forward-auth route and container127.0.0.1:3004. No DNS or proxy writes have been made. Coverage and limitations: current-state static-DNS source available,20retrieved records, no filters/limit/pagination parameters exposed by this tool; client-derived DNS and public-provider records are not covered. Foundation separately checked LAN/public resolution and Caddy fallback404. Root will preview any DNS creation before confirm and read it back after execution; do not change gateway-wide networking or existing records.

---

author: @Luna
created: 2026-11-03T12:59:00Z

---

Concrete deployment draft for root review only; not applied. Candidate host: aquarium.ryantr.app, with root-owned local DNS A record to 192.168.1.236 after deployment readiness. Caddy container uses host networking, so loopback upstream 127.0.0.1:3004 reaches the app. Insert this single handler inside the *.ryantr.app site block before its catch-all 404, preserving all existing handlers:
	@aquarium host aquarium.ryantr.app
	handle @aquarium {
		import authelia
		reverse_proxy 127.0.0.1:3004
	}

After root reviews the change: back up /home/trappserver/Documents/caddy_v2/Caddyfile, apply only that handler, then run `docker exec caddy-v2-caddy-1 caddy validate --config /etc/caddy/Caddyfile` followed by `docker exec caddy-v2-caddy-1 caddy reload --config /etc/caddy/Caddyfile`. No auth-provider migration or token transfer; keep the existing Authelia snippet server-side.

After AQ-9 is reviewed/committed and the repo is staged on trappserv.er at /opt/aquarium-homepage, proposed build/run: `sudo install -d -o 1000 -g 1000 -m 0750 /var/lib/reef-control`; `REEF_DATA_DIR=/var/lib/reef-control docker compose --project-name aquarium-homepage -f /opt/aquarium-homepage/deploy/compose.yaml build`; same command with `up -d`; then `curl -fsS http://127.0.0.1:3004/api/config`. The only host port remains loopback 127.0.0.1:3004. Once root applies/reviews DNS and proxy changes, `curl -ksSI https://aquarium.ryantr.app/` should redirect unauthenticated access to the existing Authelia portal; authenticated API check should return shared config. No commands run remotely during this preparation.

---

author: @Luna
created: 2026-11-03 13:19

---

DNS discovery update: ryantr.app and ryantrapp.com delegate to Cloudflare nameservers; approved aquarium.ryantr.app currently has no public A, AAAA, or CNAME record. No Cloudflare DNS MCP/API tool is available here. The record target/proxy mode must be checked against the existing zone pattern and not guessed. Production Compose now explicitly sets REEF_PUBLIC_ORIGIN=https://aquarium.ryantr.app for the same-origin check; exact Caddy handler still must import Authelia and proxy to 127.0.0.1:3004. No DNS, Caddy, or server mutation made.

---

author: @Luna
created: 2026-11-03T13:50:00Z

---

First deployment from reviewed commit 6e5c30a is running at 127.0.0.1:3004 on trappserv.er in the Node 24 container. Source is under /home/trappserver/apps/aquarium-homepage; persistent config is /home/trappserver/.local/share/reef-control (UID/GID 1000, mode 0750). API GET returned 200; same-origin PUT persisted across Compose restart; revision-guarded Restore examples returned the clean three-example baseline. Caddy handler imports existing Authelia and proxies only to loopback; timestamped Caddyfile backup is recorded in docs/deployment.md. Authelia config was backed up, validated with v4.39.28, and only aquarium.ryantr.app was appended to the existing two_factor rule; default deny and other domains remain unchanged. Unauthenticated HTTPS / and /api/config both return 302 to auth.ryantr.app, with no config JSON exposed. DNS remains pending; read-only Cloudflare inventory and verified existing record pattern were sent to root for review before DNS mutation. AQ-10 remains incomplete; authenticated browser access and root review remain.

---

author: @Luna
created: 2026-11-03T13:55:00Z

---

DNS review and provisioning complete under the approved existing Cloudflare DDNS credential: rechecked DDNS-managed apex ryantr.app and no aquarium record, then created only the proxied CNAME aquarium.ryantr.app -> ryantr.app with TTL Auto; Cloudflare API readback and public DoH resolution passed. Public HTTPS /api/config through Cloudflare returns 302 to auth.ryantr.app and HTML (no JSON) when unauthenticated. Authenticated browser/API write through Authelia remains unverified pending normal sign-in/root browser review. No task status or acceptance criteria changed.

---

author: @Luna
created: 2026-11-03T18:48:00Z

---

Status correction: AQ-10 is now In Progress after the first deployment. Documentation was rewritten around actual live state and the source-archive workflow; the server checkout has no Git metadata, so updates must not use git pull. Authenticated browser access remains explicitly unverified. No AQ-10 acceptance criteria were checked and the task remains open for root review.

---

author: @root
created: 2026-11-03T19:49:00Z

---

User reported that fish do not actually swim. Current 3D study only plays in-place body/fin cycles, and deployed6e5c30a is still the earlier scaffold. Keep lifelike travel/scene integration AQ12/AQ34 open; no completed-realism claim. User explicitly authorized removing Authelia for this internal-only aquarium route; public CF DNS presently exists, so LAN-only access enforcement is required alongside auth removal.

---

author: @Luna
created: 2026-11-03T19:52:00Z

---

Prepared and validated one minimal LAN-only Caddy handler diff for root review. Candidate is not applied. AQ-10 remains In Progress.

---

author: @Luna
created: 2026-11-03T19:57:00Z

---

Applied the root-approved LAN-only route. LAN page/API and public IPv4 denial checks passed; public IPv6 direct check is pending because this client cannot connect over IPv6. Baseline config hash remains unchanged. AQ-10 remains In Progress.

---

author: @root
created: 2026-11-03T20:08:00Z

---

Root applied the previewed UniFi entry6aea3aedbf6cbddbb44f5b10 and then narrowed it from local A to local CNAME aquarium.ryantr.app->trappserv.er after confirming the A-only override still forwarded upstream IPv6 queries after TTL expiry. Current gateway192.168.1.1 now returns CNAME trappserv.er for CNAME/AAAA queries (no publicAAAA) and A192.168.1.236. Root independently verified LANHTTPS200 and forced publicCFconfig403, then opened a fresh unauthenticated IAB at the normal URL: homepage and same-origin API200 without Authelia; API revision remains the exact three-example baseline0778042fed0e2065e9657b7209832a6b4820e7b4610b1e0e95d5dcd3e0e382b3. Screenshot /tmp/aq-lan-without-authelia.png. Coverage and limitations: current-state UniFi static DNS available, original20records plus oneappentry; no pagination/limit/filter parameters; gatewayA/AAAA/CNAME resolution checked for thishostname only. No gateway/globalDNS settings, otherapprecords or Authelia policies changed. DirectHTTPoverpublicIPv6 remains untested because thisclient has no IPv6 connectivity; same peer-address route guard applies and localAAAA now stays internal. Root sourcearchive/build and sharedstorage verification remain as documented.

---

author: @root
created: 2026-11-03T20:27:00Z

---

Root final review accepted deployment/update documentation, shared storage persistence and exact restored configuration, LAN CNAME resolution, fresh unauthenticated normal-URL browser access, and independently verified public IPv4 denial. The route-level Authelia removal is complete with LAN-only peer access; preexisting20DNSrecords compare unchanged and only one aquarium alias was added. Direct public IPv6 HTTP was unavailable on thisclient and is explicitly documented; no IPv6 exposure is inferred from a missing test, and the same Caddy peer guard applies. This closes deployment functionality only; the live source remains6e5c30a until a separately reviewed renderer milestone is deployed.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Deployed the reviewed app at aquarium.ryantr.app behind LAN-only Caddy access, verified shared config persistence and the restored baseline, and documented archive-based updates/rollback. Public IPv4 requests are denied; direct IPv6 HTTP testing is unavailable from this Mac. Root review remains pending.
<!-- SECTION:FINAL_SUMMARY:END -->
