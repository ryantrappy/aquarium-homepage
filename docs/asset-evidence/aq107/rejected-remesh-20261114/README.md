# AQ-107 rejected connected-domain remesh

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Historical
Authority: Evidentiary
Backlog: AQ-107
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/asset-contract.md
Downstream: scripts/refine-chromis-contour.mjs
-->

> **Agent Context & Authority** — Rejected candidate, retained as negative evidence. No acceptance criterion or final visual approval follows from its numerical contour metrics.

Root opened the disposable GLTFLoader comparison in the native in-app browser at 1440×900 CSS pixels and requested DPR 1. The [actual screenshot](comparison-profile.jpg) shows the immutable original, candidate and royal gramma peer, with their hashes and loader/clip statistics. The candidate has severe triangular shredded shading across its body and fins, visible at both normal and close sizes, while the base and peer remain smooth. Root rejected it and returned UV/material/normal continuity diagnosis to the implementing agent. The fixture omits runtime PMREM, flex, caustics, fog and habitat; its limitations are printed on the page. Its rightmost panel is partly clipped in this capture; it remains sufficient to reject the central candidate, not to establish final three-panel layout acceptance.

The rejected candidate had 15,568 triangles, closed body incidence, no measured inverted/zero-area faces, and sampled contour error about 0.03 pixels at a 350-pixel fish length. Those checks did not detect the visible failure. The [preserved script](refine-chromis-contour.mjs) and [pins](source-pins.json) identify the rejected implementation. This copy is historical only and must not replace the active pipeline. AQ-107 remains In Progress.

A second candidate (`d1dcd4287479169ac8e1dd7fa14cf7273d31d170e953625717a3d71e9bbaeaf6`) restored original normal bytes and source-facing winding. Its [native comparison](comparison-corrected-profile.jpg) still shows long triangular distortions, so Root rejected it too. The [first candidate in the actual aquarium](rejected-candidate-runtime.jpg) confirms the failure also occurs outside the isolated fixture. The next approved experiment uses only the original chromis recipe at higher grid resolution in disposable files, preserving original surface connectivity rather than globally remeshing it.
