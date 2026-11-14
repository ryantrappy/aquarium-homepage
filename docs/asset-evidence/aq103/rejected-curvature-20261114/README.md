# AQ-103 rejected curvature highlights

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Historical
Authority: Evidentiary
Backlog: AQ-103
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/requirements.md, docs/more-realistic-reef-guide.png
Downstream: src/rendering/scene/water-surface.ts
-->

> [!NOTE]
> **Agent Context & Authority** — Rejected visual trial, not an accepted surface implementation. Root reviewed only 1440×900 at DPR 1 as requested by the user. AQ-103 remains open.

The private proof commit `cb88689` added cyan reflected radiance at positive canonical-curvature peaks (`smoothstep(.36,.84,max(focus,0))` plus `max(focus,0)^10`). Candidate source SHA256 was `8a934cb1b0f14a3d7fc20c1290c4dd9504ffdfd97ad918f79ce8c4433c38af15`.

The shader compiled and rendered, but the [native capture](laptop.png) shows repeated stretched oval spots. This fails the requested irregular, sharp reflected-water appearance and recreates the artificial dot pattern the task was intended to remove. Root rejected the trial, accepted no new criteria and restored the original checkout's surface source after preserving the candidate. No shader change was committed to the shared branch; no deployment or model/asset edit occurred.

The first numeric sampler also had incorrect view-vector math (omitted lateral distance/component and reversed the slope-Z contribution). Its reported extrema must not be used as verified shader evidence. A corrected three-dimensional sampler now retains the zero-window finding across 243,000 finite samples per mode, with NoV 0.207–0.471 on the flat plane and 0.208–0.471 with sampled wave height. These values supersede the original extrema; they are a continuous-field sample, not an analytic bound or exact raster interpolation. The [corrected script](sample_visible_surface_corrected.py), [raw results](sample-results-corrected.json) and [source pins](source-pins.json) are retained here. Root reran the script and independently matched its numeric sweep exactly. Run `python3 sample_visible_surface_corrected.py` to reproduce it. Distances are legacy scene units; the corrected output labels them explicitly. The analytic flat-plane frustum intersection remains independently valid; it does not certify displaced-wave visibility or rendered appearance.

Earlier scratch artifacts are retained in `/tmp/aq103-visible-surface-review/`. The owned preview tab was closed and its viewport override cleared. The owned port-5215 preview server still serves the private rejected trial until the next reviewed candidate replaces it; it is not the current original-checkout shader.
