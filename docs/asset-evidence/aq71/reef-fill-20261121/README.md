# Indirect light on the reef faces

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-71
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/environment-map.ts, src/rendering/scene/aquarium.ts
-->

The reef material intensity for the existing prefiltered environment map rises from 0.35 to 0.70. The stronger indirect contribution makes branch tips and vertical rock relief easier to see. The fixture, tone mapping and other environment map roles keep their existing settings. The assembled coral and rock still receive the existing caustic and shadow treatment. The scene continues to share a single prefiltered texture.

| Sample | Before | After |
| --- | ---: | ---: |
| Left branching crest and surrounding water | 36.09 | 42.87 |
| Left rock face | 34.62 | 46.30 |
| Right rock face | 29.78 | 39.52 |
| Arch edge and opening | 13.06 | 15.29 |

Values are mean luma over the listed screen rectangles on an encoded 0–255 RGB scale. The weights are 0.2126, 0.7152 and 0.0722 for red, green and blue. The sampled left cave opening, foreground sand, blue tang and open water had zero changed pixels. The official [pixel sample record](pixels.json) includes the rectangles and pixel change fractions. These observations describe the fixed view, without inferring radiometric accuracy, global brightness or frame-time parity.

- [Before overview](../../aq70-11/left-crest-20261121/laptop.png)
- [After overview](laptop.png)
- [Capture state](capture.json)

Both images are 1440×900 native captures at DPR 1, look-dev seed 2026 and time 1.25. The after view used base `bef8de0` with the reef intensity adjustment. It settled with zero pending or failed assets and no captured warnings or errors. The reef remains darker and more sparsely covered than the reference in several areas.

## Current reef lighting — 2026-11-27

The current default reef uses the same image-based light with its reef strength raised from 0.70 to 0.96. A brighter mid-water blue and rear environment strength of 0.90 lift the backdrop between the islands. The top and bottom gradient colors retain their previous values.

In matched laptop frames at 1440×900 CSS pixels and DPR 1, the left and right rock-face samples rise from 49.88 to 58.32 and 43.44 to 50.21 mean encoded luma. The upper water sample rises from 34.87 to 38.75 and the middle water sample from 30.93 to 38.92. The foreground sand sample is byte-identical. The measurements use seed 2026 and time 1.25. The scene rendered at the accepted settings at times 1.25 and 3.00 with 12 inhabitants, no failed assets and no browser warnings or errors. Wider photographic matching remains open.

- [Baseline overview](../../aq102/current-enclosure-20261127/reef.png)
- [Current lighting](laptop-20261127.png)
