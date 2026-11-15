# AQ-107 chromis contour diagnosis

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-107
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/asset-contract.md, docs/requirements.md
Downstream: scripts/refine-chromis-contour.mjs, src/rendering/assets/splat-fish/blue-green-chromis.glb
-->

> **Agent Context & Authority** — Verified baseline diagnosis only. AQ-107 remains open until the actual refined asset passes Root integration and laptop visual review. No Blender edits were performed.

The [user screenshot](user-chromis.png) shows stepped dorsal/tail edges. The configured runtime maps blue-green chromis to the rigged splat-fish GLB, with a temporary thumbnail fallback only while loading or after failure. The loaded GLB is opaque and uses linear/mipmapped texture filtering; MSAA is already enabled. Texture filtering cannot repair its geometric outline. The screenshot itself does not expose loader readiness, so exact correspondence to the loaded GLB remains a visual-review consideration.

The [audit](audit-contour.mjs) reads actual POSITION, UV and triangle buffers from the byte-identical preserved base GLB, reconstructs the owned WebP's alpha threshold and smoothed signed-distance field, and measures its outer contour. Root reran the audit independently; [raw output](baseline-contour.json) matches the implementing agent's metrics. [Source pins](source-pins.json) identify the exact inputs. The 350-pixel fish width is a comparison scale approximating the screenshot, not a viewport or physical measurement.

- 4,793 vertices and 9,436 triangles; 344 outer silhouette edges. Internal incidence-four chords are excluded from that outline.
- At 350 pixels nose-to-tail, median contour edge length is 3.33 pixels, p95 4.80, maximum 11.32.
- Exported vertices lie on the smooth source contour within 0.027 source pixels, but the connecting straight chords depart by up to 3.197 source pixels, about 1.865 display pixels at that scale. The p95 departure is 0.401 display pixels.

This establishes a geometric refinement opportunity and supports the user's visible stepping report; it is not a claim that every visible edge artifact has one cause. The approved correction subdivides boundary edges while preserving the existing art, interior mesh, rig and animation. It must measure the actual resulting GLB, preserve unrelated species, retain reproducible provenance, and pass normal/close laptop comparison before acceptance.

Reproduce from the repository root (Node plus existing `dwebp` utility):

```sh
node docs/asset-evidence/aq107/diagnosis-20261114/audit-contour.mjs src/rendering/assets/splat-fish/sources/blue-green-chromis-contour-base.glb public/fish/blue-green-chromis.webp 350
```
