# Showcase v1 finalization

<!-- AGENT_DOC_METADATA
Category: Governance / Release Scope
Status: Active
Authority: Binding User Scope; Backlog Controls Acceptance
Backlog: AQ-15, AQ-58, AQ-59, AQ-70.1, AQ-70.6, AQ-70.11, AQ-70.12, AQ-70.13, AQ-71, AQ-76, AQ-82, AQ-86, AQ-87, AQ-88, AQ-94, AQ-101, AQ-102, AQ-103, AQ-107, AQ-108
Owner: @root
Updated: 2026-11-14
Upstream: User showcase scope confirmation, AGENTS.md, docs/requirements.md
Downstream: AGENT_TASKS.md, scoped Backlog execution and Root finalization
-->

> **Agent Context & Authority** — The user explicitly selected all 19 tasks already marked In Progress plus AQ-108 for a fun showcase to share with friends. This supersedes the older goal of completing every open Backlog task for this version. Backlog acceptance criteria remain authoritative; this scope change does not complete or weaken any criterion.

## Fixed showcase scope

| Task | Work to finalize | Status at scope confirmation |
|---|---|---|
| AQ-15 | CPU-temperature thermometer | In Progress; Root final review pending |
| AQ-58 | Measured conservative collision geometry | In Progress |
| AQ-59 | Supplied rock silhouette/materials | In Progress |
| AQ-70.1 | Reference set and realism rubric | In Progress |
| AQ-70.6 | Reef fixture, caustics and fluorescence | In Progress |
| AQ-70.11 | Coral tissue, polyp detail and color variation | In Progress |
| AQ-70.12 | Aragonite sand bed | In Progress; checked criteria still need Root final review |
| AQ-70.13 | Dense, naturally scaled aquascape | In Progress |
| AQ-71 | PMREM environment lighting | In Progress |
| AQ-76 | LOD, lazy loading and adaptive quality | In Progress |
| AQ-82 | Permeable coral interaction zones and anchors | In Progress |
| AQ-86 | Depth haze and light shafts | In Progress |
| AQ-87 | Full-column and depth-plane fish distribution | In Progress |
| AQ-88 | Coral saturation and palette | In Progress |
| AQ-94 | Modular negative-space rock library and atlas | In Progress |
| AQ-101 | Hero live-rock formation slice | In Progress |
| AQ-102 | Aquarium glass and reflections | In Progress |
| AQ-103 | Bounded water interface optics | In Progress |
| AQ-107 | Chromis silhouette refinement | In Progress |
| AQ-108 | Public defaults and HTTPS-prefilled service form | To Do at user request; now being implemented |

All other incomplete tasks remain open for future versions. Do not start them merely because they were in the older all-Backlog goal. If an acceptance criterion in this table needs supporting work, record its exact connection rather than silently expanding the release scope. Genuine choices or unavailable capabilities remain precise open blockers.

## Completion and delivery

Root must inspect current implementation and criterion-specific objective evidence, resolve review feedback, and use the Backlog CLI for every lifecycle change. Checkbox counts, historical captures and test markers alone do not establish completion. Preserve the existing visual assets and concurrent work. A task is finalized only after its actual acceptance criteria are satisfied, its reviewed changes are committed, and the completion commit is pushed to the shared showcase PR with a running contents list.

Work on the existing `v1-finalization` branch. PR #49 was merged externally; no shared showcase PR was open at scope confirmation. Root will create the next rolling draft PR with the first concrete reviewed completion. Do not merge or deploy; the user handles deployment. Native visual checks use only 1440×900 CSS pixels; no further phone checks.

AQ-108 removes personal internal-network URLs from shipped defaults and uses familiar public demo websites. Existing saved/shared user configuration must remain untouched. The Add service URL field starts and resets with `https://` while preserving existing edit values and validation.

## Current reviewed checkpoint

AQ-108 is Done after Root review at source `393c6c9`, delivered through [rolling draft PR #53](https://github.com/ryantrappy/aquarium-homepage/pull/53). [Evidence](asset-evidence/aq108/root-review-20261114/README.md) records35focused tests, typecheck/build, Compose resolution and laptop fresh/add/edit/reload/reset flows. The remaining19 scoped tasks are still open; the scope-confirmation table above is historical, not a live completion ledger.

Root acceptance 2026-11-15: AQ-15 is Done after authentic hardware/current-source local UI review, 80 focused tests, typecheck and build. Evidence: [AQ-15 Root review](asset-evidence/aq15/root-review-20261114/README.md). AQ-108 and AQ-15 are complete; 18 of the fixed 20 tasks remain open. Existing deployed API behavior is documented separately; no deployment was performed.
