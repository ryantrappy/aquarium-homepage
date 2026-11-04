---
id: AQ-54
title: Maintain a master agent handoff and restart guide
status: Done
assignee:
  - '@storage'
created_date: '2026-11-04T13:56:00Z'
updated_date: '2026-11-04 19:29'
labels: []
dependencies: []
documentation:
  - AGENTS.md
  - agent_scratch.md
  - docs/requirements.md
priority: high
type: docs
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user explicitly wants another agent to resume this project without reconstructing the conversation. Backlog tasks hold detailed criteria, but the current checkpoint, verified evidence, active ownership, transient runtime state and next dependency gate also need a discoverable master document. Preserve the product realism goal and existing local-first workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A repo-root AGENT_TASKS.md links the authoritative instructions, requirements, scratch notes, active Backlog tasks and technical evidence.
- [x] #2 The handoff distinguishes committed milestones, uncommitted work, verified results, unverified claims, blockers and next actions with precise ownership and task IDs.
- [x] #3 A restart checklist includes safe repository/status inspection, pinned Backlog commands, local server/build/config paths and the two agreed review viewports, without secrets or destructive cleanup instructions.
- [x] #4 AGENTS.md points future agents to the master and requires refreshing it at reviewed milestones or handoff; root checks its facts against the actual repository and active tasks.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Storage writes the master and AGENTS pointer from actual source/tasks. Root reviews status/evidence/constraints and records corrections. Update the checkpoint after the active AQ40 milestone; keep detailed acceptance and review history in Backlog rather than duplicating it.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created repo-root AGENT_TASKS.md as a compact restart guide and added its pointer immediately after the Backlog instruction block in AGENTS.md without changing project policies. It links requirements, scratch notes, active tasks and asset evidence; records the current AQ-40 checked ACs and open provenance audit, uncommitted fish-provenance/thumb changes, approved static previews, AQ-14.3 dependency gate, ownership, exact target viewports, safe local checks and last-observed ports/PIDs with an explicit transient warning. Preserved the example-config caveat and unrelated worktree-preservation rule. Root review requested before any status/AC transition.

Addressed Root review comment #1: corrected AQ-40 to all three ACs checked with status still In Progress pending Root main output build and Firefish runtime QA; marked intentional four legacy WebP and unused reef-background removals as in-scope and provenance-recorded. Corrected listener roles (PID 11418 node .output/server/index.mjs on 5173; PID 14378 proof Vite on 5189), added root-reported transient session hints and warning that running output may predate Git source. Added repo path, main branch, public origin and trappserv.er host; recorded bounded-frame-clock, species-identity, catalog-thumbnail aspect/alpha picking, raw coral mask handling, legacy coordinates and height-column cave limitations. Recast worker roles as last-assigned, with most source work held and reconfirmation required. Kept docs/deployment 2.md and old prototypes as unrelated material. Updated AGENTS pointer to require reading all policies before master. Checked AQ-49 AC #1-#3 only; Root review of AC #4 and finalization remain pending.

2026-11-04 identifier repair: Backlog doctor rekeyed this completed master-handoff task from AQ49 to AQ54 after a concurrent biomechanical-turning task reused AQ49. The historical Implementation Notes reference to AQ49 refers to this master-handoff task, now AQ54. AQ49 now identifies biomechanical turning. No acceptance status or implementation evidence changed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04T14:02:00Z

---

Root fact review of AGENT_TASKS draft: (1) AQ40 AC1 is now checked after the completed preview/background inventory, and the four old WebPs plus unused reef-background.webp are intentionally removed in-scope, not unrelated changes. Main native-aspect fix is complete but runtime build/QA still pending. (2) Listener PID11418 is node .output/server/index.mjs, NOT main Vite; proof PID14378 is Vite. Runtime hints must be verified and running output can predate Git source. (3) Add actual repo path, main/origin, trappserv.er hostname, and concise known traps: bounded frame clock, no species substitution, catalog thumbnail paths/natural aspect/alpha picking, raw coral masks separate from display tint, legacy coordinates and height columns not cave-ready. (4) Worker roles are last-assigned ownership, not guarantees they remain alive; most source workers are held. (5) Preserve unrelated deployment 2.md and old prototypes, but do not classify current provenance removals as unrelated. Root will send final AQ40/next-gate status after runtime verification so the committed handoff reflects the actual milestone. Full AGENTS must be read before the master, including policy text after the pointer.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created root AGENT_TASKS.md and linked it from the full AGENTS instructions. The master records the verified AQ40 checkpoint, current source/provenance and runtime limits, repository and restart commands, safe configuration/worktree handling, the two target viewports, and AQ50 then AQ14.3 as the next gates. Root corrected task states, process types, stale runtime IDs, ownership wording and current-versus-historical configuration rules; local links were checked. Backlog retains detailed criteria and review history. Refresh the master at reviewed milestones and handoff; it does not claim photorealism, final art approval or complete roster animation.
<!-- SECTION:FINAL_SUMMARY:END -->
