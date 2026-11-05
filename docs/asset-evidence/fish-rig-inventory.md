# Fish Rig Name and Track Inventory

<!-- AGENT_DOC_METADATA
Category: Evidence / Rig Inventory
Status: Canonical / Active
Authority: Evidentiary Record
Backlog: AQ-49.1
Owner: @root
Updated: 2026-11-05
Upstream: docs/reef-fish-roster.md
Downstream: docs/asset-evidence/fish-rig-inventory.json, scripts/inspect-fish-rigs.mjs
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: 3D Rig Bone & Channel Inventory
> - **Status**: Canonical / Active
> - **Authority**: Evidentiary Record
> - **Backlog Reference**: `AQ-49.1`
> - **Summary**: Exact bone names and rotation tracks for candidate fish models (8 GLBs, 174 rotation channels).

Run `node scripts/inspect-fish-rigs.mjs` from the repository root to regenerate [`fish-rig-inventory.json`](fish-rig-inventory.json). The script hashes the exact GLB bytes, parses their glTF 2.0 JSON chunks, and writes stable key-sorted JSON for the two candidate rigs referenced by `aquarium.ts` and the six fish paths in `src/rendering/assets/fish/manifest.json`.

The six supplied GLBs currently have the literal skin joint names `spine_0` through `spine_4`, `pectoral_L`, and `pectoral_R`; each has rotation channels in its listed swim clip. The two candidate GLBs have `spine_0` through `spine_5` and both pectoral names, also with rotation channels. All six supplied file hashes match their manifest entries.

The inventory also records literal candidate-name matches for `head`, `spine_mid`/`spine`, `tail_base`/`peduncle`, and `tail_tip`/`caudal`; these names are absent from all eight files. Numbered `spine_N` joints remain listed as numbered names only. The report does not infer coordinate axes, assign anatomy to numbered joints, or claim that any supplied model is integrated or visually compatible. No model data is changed by the command.
