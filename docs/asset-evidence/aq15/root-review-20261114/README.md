# AQ-15 Root source and hardware review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-15
Owner: @root
Updated: 2026-11-15
Upstream: AGENTS.md, docs/requirements.md, backlog/tasks/aq-15 - Add-a-real-CPU-temperature-heater-indicator.md
Downstream: src/server/cpu-temperature.ts, src/routes/api/telemetry/cpu-temperature.ts, Root AQ-15 review
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Evidence
> - **Status**: Active
> - **Authority**: Evidentiary
> - **Backlog Reference**: `AQ-15`
> - **Summary**: Read-only proof that the pinned current CPU temperature reader can discover and read authentic coretemp values through the running app container's sysfs. Root subsequently reviewed the current-source laptop UI with authentic readings, as recorded below.

## Finding

On `trappserv.er`, the host and the running `aquarium-homepage` container both expose `/sys/devices/platform/coretemp.0/hwmon/hwmon2` as `coretemp`, with `Package id 0` and a changing millidegree input. A transpiled copy of the pinned current `src/server/cpu-temperature.ts`, sent over SSH stdin to the app container's Node process, discovered all seven sensors and returned a fresh real package reading in `°C`.

The already-running API on `127.0.0.1:3004` returned an empty sensor list and an unavailable reading during the same review. Container inspection showed `REEF_CPU_HWMON_ROOT` empty and no `/run/host-sensors/coretemp.0` bind mount; the container could still read the host sensor through both `/sys/devices/platform/coretemp.0/...` and `/sys/class/hwmon/hwmon2/...`. The current reader's successful direct execution against those paths demonstrates that the source fallback works in the actual container-visible tree. The deployed API response is retained as a separate runtime observation and is not used to claim the current code failed.

No host files, server configuration, deployment, or service state were changed. The test did not call or write the user's Reef configuration. Root subsequently completed the laptop review described below. Backlog records final task acceptance.

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
- Current-source browser screenshots use a test-only local GET bridge, not the already-running deployed API.
- No new phone verification was performed.


## Root laptop acceptance — 2026-11-15

Root reviewed the source-pinned UI in an isolated local configuration at 1440×900 CSS pixels / DPR 1. A [test-only Vite middleware](live-reader-vite-plugin.mjs), with `enforce: pre`, intercepted only the CPU-temperature GET route and executed the exact pinned reader via read-only SSH/stdin in the existing container. Other methods were rejected. The ordinary client selector and ten-second polling consumed its authentic readings; no values were injected or fabricated. The [configuration](live-review-vite.config.mjs) records temporary private paths and is evidence, not a production configuration or shipped SSH feature. An initial middleware-order mistake allowed the ordinary local Mac API to return unavailable; that observation was corrected before live acceptance.

- [Front package reading](native/front-live-package.png): clear acrylic LCD, real 51.0°C package sample, readable °C unit, compact tank equipment styling.
- [Side Core 0 reading](native/side-live-core0.png): selected real Core 0 at 44.0°C. Reload retained Core 0 and side placement; the subsequent read was 43.0°C. Hardware values naturally change between reads.
- [Hidden setting](native/hidden.png): equipment absent. [Settings state](native/hidden-settings-state.json) confirms hidden placement and Core 0 selection. Root restored front/package defaults in this disposable review origin.
- [Final live state](native/final-live-state.json) records the actual display and a fresh independent package read. They need not have identical values because the display follows its polling schedule.

Root accepts the equipment appearance and working selection/persistence. The device is a screen-space glass attachment, not a modeled in-world object; the task does not require camera-tracked mesh mounting. Existing deterministic reader/client/component tests verify stale/unavailable labeling, missing/invalid values, stable IDs, GET-only transport and no fabricated fallback. [Root focused tests](root-tests.log): 80 tests across five suites pass. [Typecheck and 17 script checks](root-typecheck.log) and [production build](root-build.log) pass for private source pin `c5c10bc`; its AQ-15 code matches the recorded source pins. The broader suite had two separately tracked AQ-87 spawning failures, not thermometer failures. No phone check, host write, deployment or user configuration change was performed.

Committed log copies trim trailing whitespace and blank EOF lines only; raw logs remain under `/tmp` at their recorded review paths.
