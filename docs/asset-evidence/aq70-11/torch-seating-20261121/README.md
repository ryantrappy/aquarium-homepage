# Left torch coral seating

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.11
Owner: @root
Updated: 2026-11-21
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/reef-assembly.ts
-->

On the default wide reef, both left torch colonies showed much of their lower support structure in the foreground. The green flowing torch now sits 44 mm lower and 16 mm farther back relative to its previous island-local placement. The gold torch sits 33 mm lower and 12 mm farther back. The exact reef assembly uses these positions for rendering and collision. Existing scales, rotations and palettes are preserved.

In the paired macro, both lower stems now meet the rock while the tentacle crowns and upper skeleton cups stay visible. The larger green crown still reads against open water, and the smaller gold crown remains visible beside the center bridge. The left overstory and rock base span approximately 80% of the overview height by visual estimate. The current reef still has broad dark rock faces and a sparse branching silhouette at its highest point compared with the reference.

- [Before macro](before-macro.png)
- [After macro](after-macro.png)
- [After overview](after-laptop.png)
- [Capture state](capture-state.json)

The native 1440×900 DPR 1 captures use look-dev seed 2026, time 1.25 and labels off. Each settled capture reports no failed or pending assets. The after tab recorded no warnings or errors. The application revision in all captures is the base `42dee4a`. The after captures also include the working-tree update to `reef-assembly.ts`, SHA-256 `db6ba6974bb483281739583782d9af5f3b5371a063d5fe0d361ef1d260823be0`.

The current flowing and gold source exports have SHA-256 `26df54fed418b5b645d2b89840b429642bae7763dc9e2d40bd0002e541f62504` and `a5c70bd045c91effee48558c16bf5bb73f887b2bdf569bda225340db89696df5` respectively. The 66 focused assembly, bridge and mounted collision tests passed, including current cave and host fixtures. This review covers two placements. Full coral art acceptance and whole-body navigation remain open.
