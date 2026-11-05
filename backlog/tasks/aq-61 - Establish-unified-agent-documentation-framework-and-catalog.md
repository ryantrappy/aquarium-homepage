---
id: AQ-61
title: Establish unified agent documentation framework and catalog
status: Done
assignee:
  - '@documentation'
created_date: '2026-11-05 06:00'
updated_date: '2026-11-05 06:09'
labels: []
dependencies: []
priority: high
type: docs
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Existing documentation is flatly distributed across docs/ with mixed lifecycles (specs, research, audits, reference dumps), making it difficult for agents to locate authoritative knowledge and properly place new documentation. Create a single documentation source/entrypoint, establish a clear taxonomy and framework for agent knowledge, organize existing docs without deleting anything, and document the framework so future agents know where information is and how to properly add new information.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A central single-entrypoint documentation hub (docs/README.md) provides a structured index of all agent documentation with status, purpose, and authority
- [x] #2 A formal documentation framework specification defines categories, lifecycles, naming conventions, and required metadata for agent docs
- [x] #3 Existing documents in docs/ are organized into the framework structure or clearly indexed without deleting any existing files
- [x] #4 Guidelines for authoring, updating, and superseding agent documentation are established and documented
- [x] #5 Root agent entrypoints (AGENTS.md and AGENT_TASKS.md) reference the unified documentation hub
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory and categorize every existing document in docs/ and subdirectories by domain, lifecycle, authority, and consumers.
2. Establish a clear, scalable taxonomy for agent documentation: Core Governance, System Architecture & Contracts, Research & Spikes, Audits & Verification Evidence, Operations & Runbooks, and Archive / Historical Records.
3. Design and implement the documentation framework specification in docs/framework/DOCUMENTATION_FRAMEWORK.md and template in docs/framework/TEMPLATE.md, covering:
   - Authority levels (Canonical / Active Spec, Candidate / RFC, Research Spike, Audit / Evidence, Historical / Superseded)
   - Standardized document header metadata block
   - Naming conventions and file placement rules
   - Contribution lifecycle: How to add new docs, how to update docs, how to supersede / deprecate docs
   - Agent consumption rules: Where agents must look when performing tasks
4. Create the central, unified documentation catalog and index at docs/README.md (with quick topic lookup, lifecycle status matrix, subsystem guides, and maintenance checklist).
5. Add standardized metadata headers to existing active/canonical docs and audit/evidence docs without deleting any existing files or breaking test/code paths.
6. Link the unified documentation hub into AGENTS.md, AGENT_TASKS.md, and agent_scratch.md so all incoming agents immediately discover and use the single source of truth.
7. Verify all existing tests, links, and paths pass.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented unified documentation architecture:
- Created docs/README.md as the central catalog with Quick Topic Lookup and Tier-by-Tier Master Directory.
- Created docs/INDEX.md as a canonical pointer to docs/README.md.
- Created docs/framework/DOCUMENTATION_FRAMEWORK.md establishing 7 authority tiers, AGENT_DOC_METADATA machine-readable headers, agent context alerts, lookup protocols, and contribution/update workflows.
- Created docs/framework/TEMPLATE.md as a drop-in skeleton for new documents.
- Standardized metadata headers across active specifications, architectural designs, contracts, runbooks, and audits without deleting any existing files. Marked historical/superseded docs (design.md, deployment 2.md) with warning banners.
- Updated AGENTS.md, AGENT_TASKS.md, and agent_scratch.md to reference docs/README.md and docs/framework/DOCUMENTATION_FRAMEWORK.md.
- Verified test suite: all 35 test files and 270 tests pass without regression (including fish-scale.test.ts parsing fish-scale-reference.md). Typecheck passes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Established a centralized, well-organized single documentation hub (docs/README.md) and formal agent documentation framework (docs/framework/DOCUMENTATION_FRAMEWORK.md). Categorized and indexed all 35+ existing documents with zero file deletions, added standardized machine-readable headers, defined strict contribution/lifecycle workflows, and linked the hub from root agent entrypoints. Verified 35 test suites / 270 tests and TypeScript typecheck pass.
<!-- SECTION:FINAL_SUMMARY:END -->
