# Tailspot blenny perch review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-82
Owner: @root
Updated: 2026-11-27
Upstream: AQ-82, docs/habitat-navigation-core-contract.md
Downstream: src/rendering/scene/aquarium-lifecycle.test.ts, src/rendering/scene/reef-mesh-navigation.test.ts
-->

> [!NOTE]
> This review covers the measured arch perch in the wide default reef.

The blenny can carry the same ledge route through idle and swim, use its species profile's dart speed in transit, and settle from within 0.10 scene metres when the capsule path is clear. Exact-navigation activation now checks the full side clearance used by the route planner.

The assembled-reef regression starts from the ordinary configured-service spawn search in the 1440×900 layout. Every movement segment clears the exact rock and coral query at the runtime 0.04 m probe radius. During the last six seconds of a 40-second simulation the blenny stays in the head-up pose with stable yaw and a reported arrival. The lifecycle test verifies relocation at mesh activation while the existing fish and service link are retained.

The live 1440×900 DPR 1 preview used a local example service for the blenny. At 37.0 and 51.5 seconds after page navigation the projected fish center was unchanged at approximately (766, 451) on the arch. A pointer click on the rendered fish opened its inspect card and a new tab for the example service. [Perched reef view](perched.jpg) · [Inspect card](inspect.jpg).

Portrait perch availability, clearance for the fully animated body, and the broader coral interaction criteria remain open under AQ-82.
