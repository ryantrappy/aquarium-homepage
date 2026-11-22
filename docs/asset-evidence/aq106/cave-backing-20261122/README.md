# Rock backing for the moray cave

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-106
Owner: @root
Updated: 2026-11-22
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/moray-residence.ts, src/rendering/scene/aquarium.ts, src/rendering/scene/reef-mesh-navigation.test.ts
-->

The wide legacy right cave has a dark rock backing formed from the saved talus mesh. It sits behind the cut end of the partial moray. The settled overview and fish-inspection view show the visible head in front of a recessed rock surface. The modular development cave already uses a separate shelter.

The exact-export test traces one previously open sightline through the legacy cave and hits the backing behind the forebody start. The head capsule still clears the assembled reef and the sand, and the default camera ray to the head remains unobstructed. The backing participates in exact navigation, fallback bounds, and occlusion. Controller tests retain the cave-resident and native-service behavior when the model or right collider is missing. The sightline result applies to the reviewed viewport and test rays.

- [Laptop overview](laptop.png)
- [Fish inspection](inspection.png)

Both captures use 1440×900 CSS pixels at DPR 1, look-dev seed 2026 and time 1.25. The local test config uses a single example moray service. The preview used base `4d56fbf` plus the backing change, and readiness reported no failed assets. Click-through verification was interrupted by the browser connection. The geometry and controller checks cover head visibility and service availability.

The already-saved talus GLB has SHA-256 `869bb47edf1f2514332bb8c2cb56dc025d4653e653570ef80a38beca7cc7598b`. The supplied eel GLB has SHA-256 `810e641d69159d4b97db42cc48e7392e1861381777984721368ed5d18a450d5d`. Both exports are preserved.
