# AQ-76 reachable quality recovery

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-76, AQ-70.3
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/photorealism-budgets.md, docs/rendering.md
Downstream: src/rendering/scene/runtime-quality.ts, src/rendering/assets/budgets.ts
-->

> [!NOTE]
> **Agent Context & Authority** — Default Luna/high implementation with Root review of a bounded recovery-policy correction. AQ-76 remains In Progress; this does not certify native restoration, geometry LOD, texture delivery or whole-scene runtime budgets.

The previous13ms recovery EMA was unreachable on a healthy60Hz browser whose measured intervals are about16.67ms. Recovery now requires3consecutive eligible windows with EMA <17.5ms and p95 ≤22ms, retaining a1.5ms gap below the19ms slow EMA. The2slow-window rule,22ms p95 overload threshold,120sample/2second windows,30sample minimum,5second cooldown and hidden/paused/reduced-motion exclusions remain unchanged.

Vsync-capped RAF intervals cannot establish spare GPU capacity. Restoration is a bounded probe, and the unchanged overload rules can lower the tier again. The actual frame target remains16.7ms and p95limit22ms;17.5ms is a recovery observation threshold, not a budget-pass threshold. Asset caps, compressed-texture rules and scene caps are unchanged.

The dedicated tests prove Low→Balanced→High on steady60Hz input, no recovery in an18ms deadband, no recovery for p95-spiky input with a settled low EMA, excluded-window streak reset, and overload/cooldown after recovery. [The before log](fail-before-tests.log) retains the two failing recovery regressions, and [the first after log](pass-tests.log) records28passing runtime-quality tests.

Root's [combined full run](combined-before-budget-policy.log) then found a stale duplicate13ms declaration in the machine-readable budget and its `target > recovery` invariant:901tests passed and one failed. That invariant contradicted reachable60Hz recovery; it is replaced by explicit reachability and recovery-versus-overload hysteresis checks while preserving the exact controller/budget equality check and actual16.7/22ms targets. The complete failure remains recorded rather than being erased. Final combined validation and source pins accompany the reviewed handoff.

Root accepted this verified handoff after [42focused policy/budget checks](budget-pass.log), all [902tests/75files](combined-full-final.log) with one worker, [typecheck16scripts](typecheck-final.log) and [productionbuild](build-final.log). [Validation/source pins](validation.json) identify the combined13file snapshot including the separate AQ-89 candidate; these are not an exact earlier-commit or native performance claim. All earlier failures and scope limits remain. AQ-76 stays open.

Archived log/text copies normalize trailing whitespace only; numeric outcomes and failures are unchanged. Original command captures remain under `/tmp/aq76-recovery-review/` and `/tmp/aq89-and-aq76-*.log`.
