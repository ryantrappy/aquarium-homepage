# AQ-15 Root source and hardware review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-15
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/requirements.md, backlog/tasks/aq-15 - Add-a-real-CPU-temperature-heater-indicator.md
Downstream: src/server/cpu-temperature.ts, src/routes/api/telemetry/cpu-temperature.ts, Root AQ-15 review
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Evidence
> - **Status**: Active
> - **Authority**: Evidentiary
> - **Backlog Reference**: `AQ-15`
> - **Summary**: Read-only proof that the pinned current CPU temperature reader can discover and read authentic coretemp values through the running app container's sysfs. This record does not contain Root's visual review or complete the task.

## Finding

On `trappserv.er`, the host and the running `aquarium-homepage` container both expose `/sys/devices/platform/coretemp.0/hwmon/hwmon2` as `coretemp`, with `Package id 0` and a changing millidegree input. A transpiled copy of the pinned current `src/server/cpu-temperature.ts`, sent over SSH stdin to the app container's Node process, discovered all seven sensors and returned a fresh real package reading in `°C`.

The already-running API on `127.0.0.1:3004` returned an empty sensor list and an unavailable reading during the same review. Container inspection showed `REEF_CPU_HWMON_ROOT` empty and no `/run/host-sensors/coretemp.0` bind mount; the container could still read the host sensor through both `/sys/devices/platform/coretemp.0/...` and `/sys/class/hwmon/hwmon2/...`. The current reader's successful direct execution against those paths demonstrates that the source fallback works in the actual container-visible tree. The deployed API response is retained as a separate runtime observation and is not used to claim the current code failed.

No host files, server configuration, deployment, or service state were changed. The test did not call or write the user's Reef configuration. Root still needs to review the current-source laptop appearance at 1440×900 and complete DoD item 2 in Backlog before marking AQ-15 Done.

## Reproduction

From the repository root, run:

```sh
bash docs/asset-evidence/aq15/root-review-20261114/run-current-reader-readonly.sh
```

The script verifies the recorded SHA-256 of `src/server/cpu-temperature.ts`, transforms that local source in memory with the installed Jiti 2.7.0 transform API, and streams the result to `docker exec -i aquarium-homepage node --input-type=commonjs` through batch-mode SSH. It passes the three candidate roots explicitly and prints the reader's sensor list and fresh reading. It creates no files on `trappserv.er` and does not start or restart a server.

The raw command observations, API response, and direct-reader response are in [`raw-readonly-results.json`](raw-readonly-results.json). Exact repository and source hashes are in [`source-pins.json`](source-pins.json). The input/output protocol is kept in [`run-current-reader-readonly.sh`](run-current-reader-readonly.sh).

## Limits

- The direct reader result is authentic live coretemp data, observed through the app container's real sysfs tree.
- The API result is from the currently deployed container process and is separately labeled. It is not current-source API behavior.
- No browser screenshot is included here; Root owns current-source visual review.
- No new phone verification was performed.
