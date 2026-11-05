# Deployment and homelab discovery

<!-- AGENT_DOC_METADATA
Category: Archive / Historical Draft
Status: Superseded
Authority: Historical Reference (Superseded by docs/deployment.md)
Backlog: AQ-10
Owner: @root
Updated: 2026-11-05
Upstream: docs/deployment.md
Downstream: None
-->

> [!WARNING]
> **Superseded Document**  
> This document represents an earlier historical draft and preliminary discovery notes for Nitro container deployment.  
> The canonical and active operational runbook is located at: [`docs/deployment.md`](deployment.md).

## Current deployment shape

TanStack Start's current Node guidance uses Nitro. The project pins `nitro@3.0.261102-rc`, builds the Node server to `.output/server/index.mjs`, and starts it with `npm start`. The official guides describe Nitro as the Node deployment layer and show the same build output and start command ([TanStack hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting), [server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)). Nitro is still evolving, so keep its version locked and verify a build before updating it.

The app image uses Node 24 so it does not require changing the server's global Node installation. Build and run it in isolation from the repository root:

```sh
mkdir -p /home/trappserver/.local/share/reef-control
chmod 0750 /home/trappserver/.local/share/reef-control
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control docker compose -f deploy/compose.yaml build
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control docker compose -f deploy/compose.yaml up -d
```

The container exposes port `3000` only inside Docker and publishes it as `127.0.0.1:3004` on the host. Its root filesystem is read-only; persistent configuration is written to `/home/trappserver/.local/share/reef-control/reef-config.json` on the mounted data directory. `REEF_PUBLIC_ORIGIN` is set to the selected external HTTPS origin so the write-origin check works behind Caddy without trusting forwarded headers. The JSON file contains service names, URLs, fish choices, and example markers; do not put passwords or API tokens in service URLs.

The app reads and writes a versioned `reef` configuration envelope through `/api/config`. Writes and the explicit **Restore examples** action use an `If-Match` revision so a stale browser receives `409 Conflict` and must reload before it can save again. Cross-origin writes are rejected. The server writes a temporary file and renames it atomically. If loading reports malformed JSON or an invalid envelope, the deliberate **Restore examples** request can repair that invalid file; the server checks that the file is still invalid before replacing it. A readable valid config still requires its matching revision, and ordinary unreadable-storage errors are never overwritten.

Older browser-local service lists remain available only as an explicit migration input: export the old list as JSON, then use **Import list** in the app to validate and save it to the shared configuration. Imports accept the earlier service-array format and the current versioned reef envelope. Exporting from the app downloads the current shared list as JSON.

On `trappserv.er`, the observed base URL resolves to the server's LAN address. Docker, Caddy, and Authelia are already present, and the Caddy configuration contains wildcard site contexts for `*.ryantr.app` and `*.ryantrapp.com`. The user selected `aquarium.ryantr.app`. The app is deployed on loopback and an exact Caddy route imports the existing Authelia policy. The hostname has been added to the existing two-factor domain rule while the default-deny policy remains unchanged. Cloudflare DNS now has a proxied CNAME to the DDNS-managed apex. Keep the direct application port loopback-only; do not expose it directly to the LAN or a public interface.

A read-only route audit on 2026-11-03 located the active Caddyfile at `/home/trappserver/Documents/caddy_v2/Caddyfile` (Compose project `caddy-v2`, Compose file `/etc/komodo/stacks/caddy-v2/compose.yaml`). The Caddy wildcard site blocks route only explicit hostnames and return 404 for unknown names. The Authelia snippet uses `forward_auth` at `127.0.0.1:9091`; existing protected handlers import that same snippet. `aquarium.ryantr.app` has no A/AAAA record, and no wildcard DNS record was found, so it is not currently a usable deployment URL. The safe future Caddy change is one named host handler inside the appropriate wildcard block, importing `authelia` and proxying to `127.0.0.1:3004` before the catch-all 404. Do not apply it until the URL and DNS entry are selected and the exact patch is reviewed.

After the proxy route is configured, verify from the server that the API returns the shared settings:

```sh
curl -fsS http://127.0.0.1:3004/api/config
```

For an update, pull the reviewed revision and rebuild the image:

```sh
git pull --ff-only
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control docker compose -f deploy/compose.yaml build
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control docker compose -f deploy/compose.yaml up -d
```

The Caddy route itself is intentionally outside this repository deployment file: this host already serves other apps, so do not replace or rewrite its existing Caddy configuration as part of an application update.

## Read-only inventory captured for planning

The inventory was collected over SSH with batch mode and the normal SSH host-key check. It did not read environment variables, credentials, proxy secrets, container environment, or private keys, and it did not change the server.

- Host OS is Ubuntu 24.04. The global runtime is Node 18.19.1 with npm 9.2; the app uses a Node 24 container instead.
- Docker runs the existing apps. Caddy is the reverse proxy and Authelia is present for access control. Uptime Kuma, InfluxDB 2, and Scrutiny are already running. InfluxDB's local health endpoint returned `pass`; no credentials or metric series were inspected.
- Kernel hardware-monitoring sources include `acpitz`, `nvme`, and `coretemp` under `/sys/class/hwmon`. These expose sensor names and temperature readings to the SSH account. AQ-15 can read a selected host sensor without installing an exporter, but a container integration would need a narrowly scoped read-only host-sensor mount.
- `df` and `findmnt` expose the host filesystems and free/total capacity. AQ-16 should identify filesystems by their source device and exclude pseudo filesystems; when aggregating, count a source only once even if mounted at multiple paths. The app container sees its own mount namespace by default, so a future host filesystem integration needs an explicit read-only host view and a reviewed scope.
- `/proc/net/dev` exposes byte counters. The physical interface is `enp4s0`; Docker also creates bridge and veth interfaces. AQ-17 should default to a user-selected interface and avoid summing the physical and virtual interfaces together. Counters are read-only and can yield rates from consecutive samples; no network exporter is needed for this source.
- No telemetry exporters, sensors, disks, routes, or system services were installed or changed. Existing Uptime Kuma, InfluxDB, and Scrutiny may be useful sources later, but their metric coverage and credentials were not investigated.

The public device reference at `https://docs.ryantr.app/infrastructure/devices` resolves, but the page redirects to a Mintlify sign-in page; its contents were not available. Example shortcut URLs remain labeled examples until the service list is reviewed.

## Latest read-only deployment and route check

On 2026-11-03, `trappserv.er` reported Ubuntu 24.04.5, Node 18.19.1, Docker 27.3.1, and Docker Compose 2.29.7. Docker and the Caddy container were running; Caddy is container-managed, so its host systemd unit is inactive. Port `3004` was free and no container published it. This supports an isolated Node 24 image without changing the host Node installation.

The current Caddy configuration has wildcard site contexts for `*.ryantr.app` and `*.ryantrapp.com`, and imports the existing Authelia snippet. Existing exact route matchers include `ha.ryantr.app`, `immich.ryantr.app`, `paperless.ryantr.app`, and `uptime.ryantrapp.com`. The configured upstreams for those routes are `192.168.1.254:8123`, `127.0.0.1:2283`, `127.0.0.1:8010`, and `127.0.0.1:3001`, respectively. These are observed proxy destinations; this inventory did not test app health or approve them as launcher defaults. The public device reference did not supply additional mappings. No active container named Jellyfin or Caddy route for Jellyfin appeared in the read-only inventory.

`aquarium.ryantr.app` is the user-selected hostname: no exact route matcher or public A/AAAA record was present during this pre-deployment check, and an unmatched host returned 404. The zone's authoritative nameservers are Cloudflare. The later DNS-provider audit found an existing Cloudflare DDNS service whose configured records are proxied and share one origin target. After confirming the apex was DDNS-managed and no aquarium record existed, a proxied CNAME to `ryantr.app` was created with TTL Auto. Cloudflare API readback matched, and public DoH A queries resolved the flattened/proxied record. No other DNS records were changed. Caddy and Authelia changes are documented below.

Proposed Caddy handler, for review only:

```caddy
@aquarium host aquarium.ryantr.app
handle @aquarium {
	import authelia
	reverse_proxy 127.0.0.1:3004
}
```

Place it inside the existing `*.ryantr.app` site block before its unmatched-host fallback. DNS must use the target and proxy mode already established for this zone; the public resolver's IP answers may be Cloudflare edge addresses and must not be copied as the origin.

The existing Docker runtime supports the isolated Node 24 deployment shape. This pre-deployment inventory did not pull an image or test a remote build. Subsequent actions are recorded below.

## First deployment and rollback

The latest read-only check found privileged paths `/opt/aquarium-homepage` and `/var/lib/reef-control` absent, host port `127.0.0.1:3004` free, and 38 GB free on the root filesystem (92% used). The SSH user is UID/GID 1000, matching the container's `node` user, but `sudo -n` is unavailable. The reviewed deployment therefore uses `/home/trappserver/apps/aquarium-homepage` for the app and `/home/trappserver/.local/share/reef-control` for persistent configuration. Keep them separate so replacing the application cannot replace the saved service list. The application build uses Node 24 in Docker; leave the host's Node 18 installation unchanged.

The first deployment used a source archive of reviewed commit `6e5c30a` only, extracted under `/home/trappserver/apps/aquarium-homepage`; no dirty local files or `.data`/`.env` files were transferred. The data directory `/home/trappserver/.local/share/reef-control` is owned by UID/GID 1000 with mode `0750`. The Node 24 image built successfully and Compose published only `127.0.0.1:3004`. The API returned HTTP 200. A same-origin HTTPS-origin PUT test was read back after a container restart, then the API's revision-guarded Restore examples action returned the persisted config to the original three examples. No preexisting user config was present in the new data directory.

For Caddy, save a timestamped copy of `/home/trappserver/Documents/caddy_v2/Caddyfile`, then add only this handler inside the existing `*.ryantr.app` site block before its fallback:

```caddy
@aquarium host aquarium.ryantr.app
handle @aquarium {
	import authelia
	reverse_proxy 127.0.0.1:3004
}
```

The handler has been added and validated with `docker exec caddy-v2-caddy-1 caddy validate --config /etc/caddy/Caddyfile`, then reloaded. Validation succeeded with a formatting warning at line 85; no whole-file formatter was run. The timestamped Caddyfile backup is `/home/trappserver/Documents/caddy_v2/Caddyfile.pre-aquarium-20261103T134331Z`. The first local HTTPS request returned 403 under Authelia's default-deny policy. A timestamped Authelia config backup is `/home/trappserver/Documents/authelia/config/configuration.yml.pre-aquarium-20261103T134649Z`. Only `aquarium.ryantr.app` was appended to the existing `two_factor` rule; the existing default-deny policy and all other domains were preserved. `authelia validate-config --config /config/configuration.yml` succeeded under Authelia v4.39.28, then only the Authelia container was restarted. Requests to both `/` and `/api/config` now return 302 to `auth.ryantr.app`; the unauthenticated API response is HTML and contains no config JSON. The same redirect was verified through the public Cloudflare edge after the CNAME resolved. No authenticated browser write through Authelia has been tested yet. Do not modify the Authelia snippet, wildcard blocks, fallback, or other routes.

Rollback the app by stopping its Compose service and restoring the previous reviewed source archive (or removing the first-install checkout and service if this was the initial deployment), then rebuilding and starting that revision. Restore the timestamped Caddyfile backup and reload Caddy if the route causes a proxy or access issue. Keep `/home/trappserver/.local/share/reef-control` across an application rollback; before any deliberate data recovery, make a mode-`0600` timestamped copy of `reef-config.json`, and restore that copy only if config data itself must be rolled back. Never delete the data directory as part of app rollback.

The app container, Caddy route, two-factor Authelia policy, and proxied Cloudflare CNAME are active. AQ-10 is not complete until authenticated browser access is checked and root reviews the deployed result.
