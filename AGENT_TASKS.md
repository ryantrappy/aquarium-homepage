# Aquarium Homepage — Root Handoff

<!-- AGENT_DOC_METADATA
Category: Governance / Checkpoint
Status: Active
Authority: Binding Checkpoint; Backlog controls acceptance
Backlog: AQ-44, AQ-49, AQ-54, AQ-59, AQ-70.2, AQ-70.13, AQ-74, AQ-86
Owner: @root
Updated: 2026-11-12
Upstream: AGENTS.md, agent_scratch.md, docs/requirements.md
Downstream: Current implementation and review work
-->

Root verified this checkpoint against the current checkout. The goal remains active and incomplete: finish the backlog and make the living aquarium resemble the supplied reference. Passing functional tests does not accept final art.

## Current workspace and delivery

Work in `/Users/ryantrapp/Desktop/Code/aquarium-homepage`, branch `review`. Historical isolated-worktree/PR4 instructions are superseded. Preserve concurrent user changes and candidate assets; stage specific task files only. PR45 was externally merged into main (`34b7279`); prepare a fresh review PR for the next milestone. User handles deployment to `trappserv.er`; never deploy.

User explicitly excludes CI follow-up and FPS-display work because both are done. Do not reopen those lanes from stale task statuses. Root may mark verified tasks Done. Use Luna/high for bounded routine implementation; Root owns review, demanding integration and visual decisions. Only one agent may use Blender; Root currently reserves it.

## Reviewed progress in this goal run

- AQ84/AQ85 Done: heading-based school steering, bank recovery and physical spacing/pass-through regressions (`e4c29e3`, `514c549`).
- AQ75 Done: approved five-service defaults survive fresh missing-file configuration (`fdd1971`). Do not overwrite the ignored local eight-service saved configuration.
- AQ14.2 Done: ambient motion, reduced/pause holds and native exact-size evidence; surface-band/caustic refinement (`50d324c`, `6350beb`). Final art is separate.
- AQ70.2 Done: guarded DEV capture bridge, configuration/navigation/asset readiness and complete deterministic roster staging. Four presets at both target viewports yield eight byte-identical pairs (16 PNGs/sidecars), source `0e958a0`; evidence `docs/asset-evidence/aq70-2/`. Acceptance commit `0717dd5`. Production query is inert; native controls retained. See `docs/rendering.md` for capture usage.
- AQ44 Done (`4bdb54e`): current production integration supersedes old staged-only notes. Individual activation, explicit group disturbance and compatible generation-scoped safe navigation reviewed; 101 focused behavior/navigation/motion/component tests pass.

## Active implementation and review

- AQ70.13: shared `reef-layout.ts` transforms feed rendered assembly, runtime obstacle/anchor generation, sand contact ellipses and bubbles. Desktop left/right scales6.0/5.0, portrait4.6; native proof `docs/asset-evidence/aq70-13/layout-20261112/`, source `091caca`. Larger first trial was rejected for edge cropping. Supplied GLBs/Blender unchanged. Metric scale, central arch, depth/colony variation and final reference acceptance remain open. Main runtime rebuilds navigation from current placements; do not falsely claim static reef-habitat.json was regenerated.
- AQ86: corrected repeated alpha attenuation (`35581ed`): offscreen radiance NoBlending, premultiplied additive composite/fallback, tank-only ray segment and exception-safe render state. Shared surfaceY3.75 now matches visible surface, shaft and caustic projection.66 focused tests/typecheck pass. Native evidence `docs/asset-evidence/aq86/compositing-20261112/`; rear sand seam, final shaft/haze art, freeze and controlled budget gates remain open.
- AQ49: Luna `ready_audit` owns bounded reduced-motion controller fix. Root found stoppedFlags omitted the preference although AC4 requires frozen turns. Plan: hold complete inhabitant simulation/clip/overlay while reduced, preserve pose/active animation time and resume without catch-up; actual controller dynamic media tests required. Do not mark Done without Root numerical and native visual review.
- AQ74: apparent newer Blender-only export gap resolved read-only (`8bfde04`).68ffe2c only removed unused images; compared mesh topology/UVs/weights, rig rest transforms, actions, material links and retained image pixels are identical. Evidence `docs/asset-evidence/aq74/blend-freshness-review.json`. Native head/articulation/click review remains. No model edits/export/sync performed.
- AQ59: renderer material made neutral carbonate with restrained coralline; reused existing height samples for derivative normals (`5475d14`, `935357d`). Geometry unchanged; exact-export silhouette/cave/support/final art open. No measured speedup claimed.
- AQ76: accumulated LOD animation time, full-school lazy upgrades and visible-queue progress fixed; low-frame adaptive windows now evaluate by elapsed time. Existing evidence fails runtime budgets and has attribution limits. Recovery EMA threshold13ms may be unreachable on60Hz; unresolved, not acceptance. CI/FPS lanes remain excluded.
- AQ41: current CPU-only Node raw samples under `docs/asset-evidence/aq41/`; no browser/GPU budget or population-cap acceptance.
- AQ73/AQ70.12 checked criteria have stale/contradictory historical evidence; current sand integrated, but no controlled no-regression proof or final physical-grain/reference acceptance. Do not equate checked boxes with complete proof.

## Verification and local processes

Verify only1440×900 and402×874 CSS pixels, DPR1. Use CUA Chrome3 for browser interactions. Native true PNG: CDP Page.captureScreenshot format png, fromSurface true, captureBeyondViewport false, NO clip; verify IHDR. Main-world bridge needs CDP Runtime.evaluate (DOM-isolated evaluate cannot see it). Reset overrides/close owned tabs; immediately send completion_summary after each CUA phase. All completed-phase tabs were closed.

Owned local servers: dev5214 currently pins source35581ed in VITE_GIT_COMMIT; restart with the new source revision before claiming exact evidence after source changes. Production5212 still serves the earlier0e958a0 build. Verify PID/cwd/command before stopping; do not disturb user3000/5210. Builds overwrite .output, so restart owned production after rebuilding. Before-worktree5213 was stopped; preserve its files. No deployment/sign-in/service-config writes occurred.

Current focused verifications: capture49 tests; layout/sand/assembly/navigation/focus70; shaft/caustic/optics/controller66; behavior/navigation/motion/component101; typecheck including14script checks. Last full suite705 preceded the portrait capture and later layout/shaft changes; run the full suite/build for the next reviewed milestone rather than claiming these focused checks cover everything.

Live Blender holds a dirty `src/rendering/assets/corals/blend/reef-full-model.blend`; leave it untouched without preserving its work. Root only inspected it. Saved blue-tang comparisons used separate background processes sequentially. No Root model edits have been made. Every future Blender edit must obey save/packed texture/export/sync/Git rules in AGENTS.md.
