# AQ-104 final Root review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Complete
Authority: Evidentiary
Backlog: AQ-104
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/habitat-navigation-core-contract.md, AQ-104
Downstream: src/rendering/scene/motion.ts, src/rendering/scene/fish-spawn.ts, src/rendering/scene/aq104-distribution.test.ts, src/rendering/scene/aq104-fallback.test.ts
-->

> [!NOTE]
> **Agent Context & Authority** — Task-scoped Root acceptance at source `604c8aa2a894865aeb1d22345da91d54540ac2dd`. This accepts lateral distribution and safe routing behavior; broader reef art, physical calibration, animated body envelopes and runtime performance remain separate open work.

The preserved school-station and fore-reef refinements were validated in isolation before adoption. Root found one failure: a school whose preferred flank was blocked exhausted every retry on that flank. The correction allows other sectors after eight preferred attempts, retaining clearance and cumulative work caps. Both valid `schoolCenter` counterexamples fail on the uncorrected candidate and pass after the correction. See [before](fallback-before.log), [after](fallback-after.log), and [source pins](source-pins.json).

| Criterion | Objective evidence | Root result |
|---|---|---|
| 1: Sustained three-sector utilization | Assertion-bearing `aq104-distribution.test.ts`, [temporal rows](temporal.json) and [summary](summary.json). Eight species, eleven inhabitants, default behavior including schooling; 60 seconds at 60 Hz, one-second samples, ten-second settling. All three sectors occupied in 100% of settled samples in both modes. Left/center/right fish-time shares: AABB 41.00/26.38/32.62%; mesh 38.32/26.56/35.12%. No missing-outer run; all fish move; exact repeated-run equality. | Pass |
| 2: Width, depth-frustum and glass margins | `camera-zoom.test.ts`, `fish-spawn.test.ts` wider/depth/resize checks, and both-size AABB/mesh `motion.test.ts` movement checks. Bounds use the reef-plane width with a per-depth limit and unchanged visual clearance; maximum lateral water bounds remain inside the glass in both layouts. Native source-pinned captures below corroborate integration. | Pass |
| 3: Unavailable anchor and free-water recovery | `motion.test.ts` active-route preservation, urgent-retreat exception, local idle loiter and unavailable mesh-anchor fallback; `aq104-fallback.test.ts` blocked-school AABB/actual-mesh counterexamples. | Pass |
| 4: Repeatability, balance and bounded work | Exact replay in temporal regression; 300-seed route-sector sampling, same-side preference, generation-balanced AABB/mesh anchor tests, per-search lattice retry and cumulative collision-query caps. Existing planner and fish-spacing gates retained. | Pass |
| 5: Automated and native validation | [Full suite](full-suite.log): 865 tests/73 files with two workers; [typecheck](typecheck.log): TypeScript plus 16 script syntax checks; [build](build.log): production build. [Focused handoff](focused.log): 117 checks; final full suite contains the corrected, typed schoolCenter fixture. [Native sidecar](native-review.json): both exact DPR1 viewports ready, eleven inhabitants, zero failed assets and zero captured warning/error logs. Normal-mode bridge absent; 7/8 laptop and 8/8 phone service transforms move over twelve real animation frames; Pause holds all eight in both views. Resume, phone Settings and complete eight-entry Services modal exercised; dialogs fit the viewport. | Pass |

[1440×900 laptop](laptop.png) and [402×874 phone](phone.png) are true PNGs whose signatures, dimensions and SHA256 values are recorded in the summary. Captures are deterministic frozen staging, separate from the normal-motion/Pause observations. A full navigation reset cleared the temporary viewport once; that discarded wrong-size probe is excluded, and only verified exact-size observations are retained. Device metrics were restored and the owned review tab was closed.

The temporal fixture uses two controlled solid boxes and the real bounded mesh-query implementation, with an explicit 0.04 query probe in mesh mode. It does not certify the entire displayed reef or full articulated fish bodies. Accumulated paths are legacy world units, not physical meters. No claim of performance-budget acceptance follows from these samples. Occluded fish retain fallback modal access; no claim that every conservative proxy rectangle stays inside the view. Earlier f084 evidence remains historical and is not substituted for this source.

Source models, live Blender state, original service configuration and the user's two untracked AQ104 screenshots were preserved. Disposable configuration uses localhost service URLs, none opened. No deployment, merge, model edit or configuration save was performed. Existing default-concurrency packaging timeouts are recorded in the earlier evidence; no pre-existing deadlines or assertions were weakened.
