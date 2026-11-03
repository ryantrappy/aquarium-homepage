# Deployment on trappserv.er

## Live deployment

The app is available at [https://aquarium.ryantr.app](https://aquarium.ryantr.app). It runs in the Node 24 Docker image built from reviewed commit `6e5c30a`; the host's Node 18 installation is unchanged.

- Source: `/home/trappserver/apps/aquarium-homepage` (a source archive; there is no `.git` directory).
- Compose project: `aquarium-homepage`, service `reef-control`.
- Shared config file: host `/home/trappserver/.local/share/reef-control/reef-config.json`, mounted in the container at `/var/lib/reef-control/reef-config.json`.
- Published port: `127.0.0.1:3004` on the host to port `3000` in the container. Do not expose the app port directly.
- Origin guard: `REEF_PUBLIC_ORIGIN=https://aquarium.ryantr.app`.
- Public DNS: the existing proxied Cloudflare CNAME `aquarium.ryantr.app` to `ryantr.app` (TTL Auto) is unchanged; the apex is managed by Cloudflare DDNS. On the LAN, UniFi has a CNAME override from `aquarium.ryantr.app` to `trappserv.er` (TTL 300). The LAN resolver returns `192.168.1.236` for the target and no public AAAA for the aquarium hostname.
- Access control: the aquarium Caddy route allows peers in `192.168.1.0/24` and returns 403 to all other peers. This route does not import Authelia; the Authelia configuration and all other routes remain unchanged.

The root verified a fresh unauthenticated LAN browser load of `/` and same-origin `/api/config`; both returned HTTP 200. Forced public IPv4 requests through both Cloudflare addresses returned 403 for `/` and `/api/config`, with no JSON body. Direct public IPv6 HTTP requests could not be tested from this Mac because it has no working IPv6 connection. The LAN resolver now returns no public AAAA for this hostname.

An API save using the configured HTTPS `Origin` succeeded against the loopback service and persisted across a Compose restart. Before the LAN-only route was applied, an authenticated Settings edit was saved and verified after reload; the original three-example configuration was immediately restored, including its example flags. No service URLs or fish selections were changed. The current LAN API response matches baseline revision `0778042fed0e2065e9657b7209832a6b4820e7b4610b1e0e95d5dcd3e0e382b3`. Example service URLs remain examples until mappings are reviewed.

## Service configuration

The app reads and writes the versioned reef envelope through `/api/config`. Saves and the explicit **Restore examples** action use a revision check; a stale client receives `409 Conflict`. Cross-origin writes are rejected. Writes use a temporary file and atomic rename. The data directory is separate from the application source, so code updates and rollbacks must preserve it.

Older browser-local service lists are imported explicitly: export the old list as JSON and choose **Import list** in the app. Imports accept the old service array and the current versioned envelope. App exports download the current shared list as JSON.

## Update from a reviewed source archive

Create an archive locally from the exact reviewed commit. `git archive` excludes uncommitted files, local `.data`, and `.env` files:

```sh
REVIEWED_SHA=<reviewed-commit>
git archive --format=tar.gz --output="/tmp/aquarium-homepage-${REVIEWED_SHA}.tar.gz" "$REVIEWED_SHA"
scp "/tmp/aquarium-homepage-${REVIEWED_SHA}.tar.gz" \
  "trappserv.er:/tmp/aquarium-homepage-${REVIEWED_SHA}.tar.gz"
```

On `trappserv.er`, keep the current source tree as the rollback copy, unpack the new archive into the application path, then build and start it. Use the current deployed SHA in the backup directory name; the initial deployed SHA is `6e5c30a`.

```sh
cd /home/trappserver/apps
CURRENT_SHA=6e5c30a
REVIEWED_SHA=<reviewed-commit>
mv aquarium-homepage "aquarium-homepage.previous-${CURRENT_SHA}"
mkdir -m 0755 aquarium-homepage
tar -xzf "/tmp/aquarium-homepage-${REVIEWED_SHA}.tar.gz" -C aquarium-homepage
rm "/tmp/aquarium-homepage-${REVIEWED_SHA}.tar.gz"
cd /home/trappserver/apps/aquarium-homepage
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control \
  docker compose --project-name aquarium-homepage -f deploy/compose.yaml build
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control \
  docker compose --project-name aquarium-homepage -f deploy/compose.yaml up -d
curl -fsS -o /dev/null -w 'config API: %{http_code}\n' \
  http://127.0.0.1:3004/api/config
```

The build runs in Node 24 inside Docker. Do not run `git pull` in the server source directory; it has no Git metadata. Keep the previous source directory until the update has been reviewed. Keep `/home/trappserver/.local/share/reef-control` in place for all application updates.

## Rollback

If the update fails, rebuild and restart from the preserved source directory. The configuration directory remains mounted and must not be deleted during an application rollback.

```sh
cd /home/trappserver/apps
FAILED_SHA=<failed-commit>
PREVIOUS_SHA=<sha-in-previous-directory-name>
mv aquarium-homepage "aquarium-homepage.failed-${FAILED_SHA}"
mv "aquarium-homepage.previous-${PREVIOUS_SHA}" aquarium-homepage
cd /home/trappserver/apps/aquarium-homepage
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control \
  docker compose --project-name aquarium-homepage -f deploy/compose.yaml build
REEF_DATA_DIR=/home/trappserver/.local/share/reef-control \
  docker compose --project-name aquarium-homepage -f deploy/compose.yaml up -d
```

If shared configuration itself needs recovery, make a timestamped, mode-`0600` backup of `reef-config.json` before restoring a known good copy. Do not roll back or remove shared data as part of a code rollback.

## Caddy access configuration

The existing Caddyfile is `/home/trappserver/Documents/caddy_v2/Caddyfile`. The exact `aquarium.ryantr.app` handler inside the `*.ryantr.app` site block first matches `host aquarium.ryantr.app` plus `remote_ip 192.168.1.0/24` and proxies to `127.0.0.1:3004`; its host-only fallback returns 403. The aquarium handler does not import Authelia. Caddy's active container is `caddy-v2-caddy-1`; its config path is `/etc/caddy/Caddyfile` inside the container. The Authelia configuration and all other Caddy handlers/snippets were left unchanged.

Backups recorded during deployment and route updates:

- Initial Caddy setup: `/home/trappserver/Documents/caddy_v2/Caddyfile.pre-aquarium-20261103T134331Z`
- Authelia setup: `/home/trappserver/Documents/authelia/config/configuration.yml.pre-aquarium-20261103T134649Z`
- Caddy before applying the LAN-only route: `/home/trappserver/Documents/caddy_v2/Caddyfile.aquarium-20261103T195601Z.bak`

The LAN-only Caddy candidate passed validation before application. The live Caddyfile validated and the handler reloaded successfully; Caddy reported its existing formatting warning and the file was not reformatted. The earlier Authelia setup changed only the existing `two_factor` domain list by adding this hostname; default deny and other domains were preserved. The later LAN-only route update did not change Authelia.

To restore the Caddyfile captured immediately before the LAN-only route change, then validate and reload Caddy:

```sh
cp -p /home/trappserver/Documents/caddy_v2/Caddyfile.aquarium-20261103T195601Z.bak \
  /home/trappserver/Documents/caddy_v2/Caddyfile
docker exec caddy-v2-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec caddy-v2-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

This rollback restores the earlier Authelia-protected aquarium handler. Do not restore the Authelia configuration backup as part of this Caddy rollback; the LAN-only route update did not change Authelia. Do not replace the surrounding Caddy wildcard site, shared snippets, or other routes.

## Host inventory captured before deployment

Read-only inventory on 2026-11-03 found Ubuntu 24.04.5, Docker 27.3.1, Compose 2.29.7, and host Node 18.19.1. The app uses an isolated Node 24 image. Caddy and Authelia were already running. The host's `coretemp`, NVMe, and ACPI sensors, filesystem capacity, and network byte counters were readable without installing an exporter; later telemetry work must use explicit read-only mounts and show unavailable or stale data honestly. This inventory did not change the host.

## Prepared CPU temperature source (not deployed)

The reviewed live deployment at commit `6e5c30a` does not include the CPU temperature API or host sensor mount. The current source Compose file prepares a narrow, read-only bind of `/sys/devices/platform/coretemp.0` to `/run/host-sensors/coretemp.0`, with `REEF_CPU_HWMON_ROOT=/run/host-sensors/coretemp.0`. The backend discovers `hwmon*` entries whose `name` is `coretemp`, then reads supported `temp*_label` / matching `temp*_input` pairs such as `Package id 0`; it exposes a stable `coretemp.0:package-id-0` default sensor ID. If the configured path, chip, label, or input is missing or unreadable, the reading is unavailable (or marked stale only when an earlier successful sample exists). It does not substitute a fabricated temperature. The aquarium scene heater indicator has not been implemented, and this source has not been mounted or deployed on `trappserv.er`.
