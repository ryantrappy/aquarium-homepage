# Encrusting corals on the default wide reef

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-101
Owner: @root
Updated: 2026-11-21
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/reef-assembly.ts, src/rendering/scene/aquarium.ts, src/rendering/scene/reef-mesh-navigation.test.ts
-->

The default wide scene now places five green and orange zoanthid mats on each of the two live-rock islands. The positions are island-specific and follow the raised, rendered surfaces. The assembler probes the center and four nearby footprint points, rejecting sites with an unsuitable face normal, gaps, abrupt slopes, nearby sockets or neighboring mats. The original socket companion scatter remains visible.

The 1440×900 comparison shows clearer small colonies across the broad faces, several immediately below the larger fleshy corals. The reef retains the previous height and open center. The largest remaining differences from the reference are the sparse upper branching silhouette, the exposed rock area between patches and the much lower light on the front faces.

- [Before overview](../../aq70-11/torch-seating-20261121/after-laptop.png)
- [After overview](laptop.png)
- [Capture state](capture.json)

The after capture used base `cf4d584` plus the face-colony working-tree changes. It settled with zero failed or pending assets and no captured warnings or errors. The 29 inhabitants are the local look-dev roster. The native view confirms placement and current composition. It does not measure continuous animated-body contact or service label sightlines.

Both collision paths derive bounds from the same instance matrices and include the measured coral shader displacement margin. The fallback bounds union these instances with each foundation. The mesh query gets individual instance bounds. The live-rock fixtures check both five-instance counts, fallback containment, exact-query blocking at a face colony, and the existing cave probe, blue tang turn, clownfish approach and moray head checks at their documented clearance sizes. Larger combined animated envelopes still overlap coral on the previously reviewed paths.

| Export | SHA-256 |
| --- | --- |
| Left foundation | `8d04c4fce1e6e1bf3c2e021968c205b4c9e4af9041a23d9304a7e291fcf6414f` |
| Right foundation | `009a847175661ea2fdcf273d994a30cc12834ff6720b4d7bd4aea2391179bd3b` |
| Zoanthid mat | `a60d91258fcf9a64d43a628dbe0f4027a91a1fce73104153d7f3ea424cc2463d` |
