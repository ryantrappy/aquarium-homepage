# AQ-94 modular clownfish host review

<!-- AGENT_DOC_METADATA
Category: Test Evidence
Status: Reviewed
Authority: Scoped verification
Backlog: AQ-94, AQ-58
Owner: @root
Updated: 2026-11-21
Upstream: ../../../modular-coral-and-live-rock-spec.md
Downstream: AQ-94 production aquascape review
-->

> [!NOTE]
> **Agent context.** This evidence covers the shared-atlas reef preview and its lower-left anemone host.

[Laptop capture](laptop.png) from the local working checkout at `/?lookdev=1&reef=nsa&seed=2026&time=1.25&labels=off`. The renderer reported ready at 1440×900 CSS pixels and DPR 1, with 15 inhabitants, zero failed assets and zero browser warnings or errors. The rose bubble-tip anemone sits on the lower-left buttress. The clownfish in the overview is staged by lookdev.

The exact shared kit and all 13 mounted colonies are loaded by `reef-nsa.test.ts`. The mounted crown produced one ocellaris host. The 0.04 m resident probe cleared the front approach and simulated movements for 40 seconds. A generic probe was blocked at the crown. The central canyon cleared the 0.04 m probe and the moray's head corridor and shelter checks passed.

With the source-pinned skeletal swim clip, a front-facing capsule with 0.16 m half-axis and about 0.206 m radius swept clear from 0.45 m to 0.24 m in front of the crown. The separate placement probe found contact when the same envelope was centered at the crown. Turning, shader flex and close-in whole-body clearance remain open.

The isolated review checkout passed 1,057 tests across 82 files, typecheck, the production build, the deterministic kit check and the reef manifest check.
