#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$repo_root"

expected_source_sha256="059702b3abc1a818f1680fdfe460bc4826ee10ba502ff67ab67dfb1853fc90f1"
actual_source_sha256="$(shasum -a 256 src/server/cpu-temperature.ts | cut -d ' ' -f 1)"
if [[ "$actual_source_sha256" != "$expected_source_sha256" ]]; then
  printf 'Source hash mismatch: expected %s, got %s\n' "$expected_source_sha256" "$actual_source_sha256" >&2
  exit 1
fi

node --input-type=module -e 'import { readFileSync } from "node:fs"; import { createJiti } from "jiti"; const j = createJiti(import.meta.url); const out = j.transform({ source: readFileSync("src/server/cpu-temperature.ts", "utf8"), filename: "cpu-temperature.ts", ts: true, async: false }); process.stdout.write(out + "\nconst store = createCpuTemperatureStore({ rootPath: [\"/run/host-sensors/coretemp.0\", \"/sys/devices/platform/coretemp.0\", \"/sys/class/hwmon\"] });\nstore.getSensors().then(async sensors => console.log(JSON.stringify({ sensors, reading: await store.read() }, null, 2)));\n")' \
  | ssh -oBatchMode=yes -oConnectTimeout=5 trappserv.er 'docker exec -i aquarium-homepage node --input-type=commonjs'
