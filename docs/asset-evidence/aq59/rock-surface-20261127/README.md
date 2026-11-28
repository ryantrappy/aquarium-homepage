# Reef rock surface comparison

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-59
Owner: @root
Updated: 2026-11-27
Upstream: AQ-59, docs/photorealism-reference.md
Downstream: src/rendering/scene/coral-material.ts, src/rendering/scene/coral-material.test.ts
-->

> [!NOTE]
> This review covers the runtime finish on the two current live-rock foundations.

The original foundation shader used a strong screen-space bump for fine grain and large pores together. Reducing only the bump strength removed most of the visible square pattern in an intermediate capture. The final shader keeps fine grain in the color layer, puts the lighting relief at broader scales, limits steep perturbations at grazing angles, and rotates the noise lattice across octaves. Broader weathering and coralline patches vary the exposed stone faces.

The before and after captures use the default layout at 1440×900 DPR 1, look-dev seed 2026, time 1.25 seconds and labels off. Both show the same placed colonies, foundation silhouettes and cave mouths. The final scene reports zero failed assets and no browser warnings or errors. In the detail comparison, the original is on the left and the revised finish is on the right. [Detail comparison](comparison.jpg) · [Revised full reef](overview.jpg).

In the raw captures, mean adjacent-pixel encoded luma difference fell from 10.45 to 6.56 in the sampled left wall at (212, 594)–(420, 730), and from 11.76 to 6.73 in the sampled right wall at (1090, 515)–(1208, 661). The open-water sample at (699, 168)–(803, 362) and lit sand sample at (712, 839)–(933, 875) are pixel-identical.

The existing GLBs and Blender assets supply the geometry. Exact-export art, physical dimensions, geological silhouette and broader cave review remain under AQ-59.
