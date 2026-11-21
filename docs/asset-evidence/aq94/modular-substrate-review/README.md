# AQ-94 modular substrate review

<!-- AGENT_DOC_METADATA
Category: Test Evidence
Status: Reviewed
Authority: Scoped verification
Backlog: AQ-94
Owner: @root
Updated: 2026-11-21
Upstream: ../../../modular-coral-and-live-rock-spec.md
Downstream: AQ-94 default-layout review
-->

> [!NOTE]
> **Agent context.** This review covers the sand and rock contact in the modular reef preview.

[Before](../modular-clownfish-review/laptop.png) and [after](laptop.png) at `/?lookdev=1&reef=nsa&seed=2026&time=1.25&labels=off`. The 1440×900 DPR 1 render reported 15 inhabitants and zero failed assets, browser warnings or errors. From rows 100 to 599, no pixel changed by more than 12 levels in any RGB channel. Between rows 700 and 884, 59,846 pixels exceeded that threshold.

Five contact ellipses were fitted to cross-sections of the saved modules below scene Y −2.55. Separate arch piers leave the central sand channel open. The scene uses the same footprint list for geometry, contact shading, shell fragments, small rubble and benthic ground height. Six placements reuse the saved talus mesh along the exposed edges.

The exact shared kit fixture confirms that rays hit both arch piers at their contacts, the talus pieces straddle the sand and stay below the swimming floor, and the moray head retains more than 0.13 scene units of sand clearance at both capsule endpoints. The existing canyon and clownfish checks also run. This verifies the modular development preview. Full default-layout grounding remains open.

The isolated review checkout passed all 1,057 tests across 82 files, typecheck, the production build, and the deterministic kit and asset manifest checks.
