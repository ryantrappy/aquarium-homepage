---
id: AQ-10
title: Deploy the aquarium homepage to trappserv.er
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T18:48:00Z'
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
- [ ] #1 The application is deployed and reachable at the agreed URL on trappserv.er.
- [ ] #2 Deployment and update steps are documented and repeatable.
- [ ] #3 The deployed app can reach the configured shared storage service.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Deploy only a source archive made from the reviewed commit to /home/trappserver/apps/aquarium-homepage and keep shared JSON data under /home/trappserver/.local/share/reef-control.
2. Build/run the Node 24 Compose service on loopback 127.0.0.1:3004 and verify /api/config plus revision-checked persistence across restart.
3. Add the selected hostname using the existing Caddy/Authelia policy and Cloudflare DDNS-managed DNS pattern, with timestamped backups and no auth-policy weakening.
4. Document live routes, source-archive update steps, and code rollback while preserving shared data.
5. Verify public unauthenticated access is gated and leave authenticated browser-write verification pending root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Read-only host route audit (2026-11-03): Caddy is containerized as Compose project caddy-v2. Caddyfile path: /home/trappserver/Documents/caddy_v2/Caddyfile; Compose config: /etc/komodo/stacks/caddy-v2/compose.yaml. Caddy has wildcard site contexts for *.ryantr.app and *.ryantrapp.com, but uses explicit service handlers and returns 404 for unmatched hostnames. aquarium.ryantr.app has no A/AAAA answer through the LAN resolver or 1.1.1.1; wildcard DNS query also has no answer. A forced host/SNI request to Caddy returned 404; ha.ryantr.app returned 302 to auth.ryantr.app. Thus aquarium.ryantr.app is not ready under the condition of an existing wildcard DNS route; no hostname, DNS, or Caddy change made. Existing Authelia snippet is forward_auth to 127.0.0.1:9091 /api/authz/forward-auth; HA, Immich, Paperless, Tautulli, and Uptime handlers import it. Future host handler would need to import the same snippet and proxy to 127.0.0.1:3004 before the wildcard fallback, after root selects a URL.
Deployment paths /opt/aquarium-homepage, /srv/aquarium-homepage, /var/lib/reef-control are absent. Docker 27.3.1, Compose 2.29.7, Buildx 0.17.1 available on Ubuntu 24.04.5 x86_64; root volume has 38 GB free (92% used). No remote build/deploy performed in this read-only preparation.
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
<!-- COMMENTS:END -->
