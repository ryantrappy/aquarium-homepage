# Chromis and lyretail fin lighting

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.8, AQ-70.10, AQ-107
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/fish-flex-material.ts
-->

The unified blue-green chromis and lyretail anthias meshes showed an abrupt change in brightness partway across the dorsal fin. Neutralizing the normal maps retained the band. Rendering only the base color removed the band while retaining the outlines. Selecting one side of the mesh also retained the band. The accepted material blends in diffuse light continuously across thin tissue near the upper and lower edges. The mesh, textures, rig, and opacity come from the current exports.

The comparisons use the legacy reef at 1440×900 CSS pixels, DPR 1, seed 2026, and time 1.25. The browser repeated the comparison at time 3.00 with both species ready, no failed assets, and no warnings or errors. At the chromis fin band, the absolute encoded-luma difference between pixels (696, 347) and (697, 347) fell from 60.41 to 14.86. At the lyretail band, the difference between (915, 432) and (916, 432) fell from 41.19 to 10.57. These are local samples from the matched 1.25 captures. A residual transition remains visible in the lyretail. The treatment approximates scattered light in the existing opaque material. Fin-ray masks, geometric refinement and the full roster material review remain open.

- [Chromis comparison](fin-chromis-comparison.png)
- [Lyretail comparison](fin-lyretail-comparison.png)
