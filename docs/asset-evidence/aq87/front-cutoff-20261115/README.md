# AQ-87 front-water depth fallback — partial review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Partial / Root-reviewed implementation slice
Authority: Evidentiary; does not close AQ-87
Backlog: AQ-87
Owner: @root
Updated: 2026-11-15
Upstream: AGENTS.md, docs/requirements.md, docs/rendering.md
Downstream: src/rendering/scene/fish-spawn.ts, src/rendering/scene/fish-spawn.test.ts
-->

> [!NOTE]
> **Agent Context & Authority** — Root reviewed this spawn-search refinement and accepted one fresh default-service native view at 1440×900 CSS pixels, DPR 1. This evidence covers the starter roster and this fallback only. It does not establish the full species-depth, all-route, animated-body-clearance, or all-depth occlusion requirements in AQ-87.

## Change and reproducible planner audit

The constrained safe-spawn search adds the existing front-water cutoff as one additional Z candidate when a caller supplies a safe-height band and reef obstacles. The candidate remains subject to the same obstacle clearance, depth-specific frustum, optional mesh-query, fish-spacing, and height checks. The existing rear-water visibility ranking is unchanged. A focused counterexample blocks the preferred point with a reef box and confirms the new cutoff is rejected when the depth-specific frustum excludes it.

The temporary audit command is `node /tmp/aq87-front-depth-audit-20261115/audit.mjs`. It loads pinned before/after `fish-spawn.ts` helpers through Jiti and runs the unchanged default five-service planner at **1440×900 only**. The script is temporary and lives outside the repository; its inputs and source hashes are listed in [source-pins.json](source-pins.json). Full XYZ outputs are preserved in [planner-audit.json](planner-audit.json).

| Planner result | Before | After |
|---|---:|---:|
| Five-fish Z span | 0.7898077073 scene units | 2.2418077073 scene units |
| Banggai cardinalfish spawn Z | 0.7000000000 | -0.7520000000 |

The other four planner XYZ positions are unchanged. These are deterministic planner positions from the unit fixture, not runtime animated-body world positions or a physical scale claim.

## Accepted native evidence

Root reviewed a fresh public-default page with reduced motion emulated **before** app navigation, no look-dev seed prefix, then a settled reload. The [accepted 1440×900 capture](accepted-native-1440x900.jpg) shows all five configured fish and their captions. Root verified each rendered body and caption remained visible and each link had `aria-hidden=false`. The accompanying [state record](accepted-native-state.json) records 1440×900 CSS pixels at DPR 1, reduced motion, the five unhidden links, and their element rectangles within the viewport. The native screenshot is distinct from the planner audit; the captured runtime does not expose world-space fish positions in this no-seed default run.

No phone check was performed. The screenshot is not evidence for full-roster spawn bands, in-motion or all-depth collision clearance, or complete reef occlusion behavior. The telemetry display and equipment data are outside this review.

## Verification

- [Root source-pinned fish-spawn suite](focused-tests.log): 30 tests pass in private proof f03b551. The [combined checkout run](combined-focused-tests.log) separately passes 31 tests, including a concurrent AQ-106 test addition that is not part of this acceptance.
- [Root combined full suite](full-suite.log): 934 tests pass across 78 files in proof `f03b551`.
- The test coverage keeps the existing depth-spread assertion (`Z span > 1.5`) unchanged and checks that the added candidate still fails closed under a depth-specific frustum rejection.

The shared checkout had concurrent AQ-106 source edits. The source pins identify the Root-selected AQ-87 index snapshot; the unreviewed AQ-106 hunks are excluded from this claim.

## AQ-87 status boundary

The current native review supports this default-roster front-water placement and Root’s visual check of that capture. AQ-87 acceptance criterion #1 remains open for all species and route targets. Criterion #3 remains open for all-depth animated-body clearance, reef occlusion, and labels/hit targets. No acceptance criterion was newly checked and AQ-87 remains In Progress.

A separate [concurrent AQ-104 run](unaccepted-concurrent-aq104-timeout.log) timed out in its distribution case at the 30-second limit while other heavy tests were active (4/5 passed). It is retained as an unaccepted observation, not omitted or treated as a source pass. The earlier isolated candidate run passed 5/5, and Root’s single-worker full 934-test run passes these tests. This partial handoff does not establish a universal runtime-performance claim. Committed log copies trim trailing whitespace/EOF lines only; raw logs remain under `/tmp`.

The [preserved audit script](planner-audit-script.mjs) records the exact temporary command. Its absolute temporary input-tree paths must be reconstructed from the pinned sources before rerunning; it is not a standalone runtime tool. The checked-in planner output and source hashes remain the reviewed result.
