# Xenia tissue colors in the default reef

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-88, AQ-70.11
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/reef-assembly.ts
-->

The four Xenia companion colonies use tissue palettes ranging from muted mauve and rose to warm peach. The strongest change is on the right, where two previously pale blue-lavender colonies are now distinguishable from each other. Lighter polyp tips and darker stalks retain the details in the baked maps. The change uses the original GLB, mount transforms, and fluorescence mask.

The comparison uses 1440×900 CSS pixels, DPR 1, seed 2026 and time 1.25. In the right crown rectangle x=887–1133 and y=309–432, 15,507 pixels change by more than one RGB level. The difference between average blue and red channels falls from 31.06 to 16.32 in that rectangle. Sampled open water and foreground sand are pixel-identical. The preview resolved 12 inhabitants with no failed assets or browser warnings or errors. Broader coral art remains under AQ-70.11.

- [Baseline overview](../../aq71/reef-fill-20261121/laptop-20261127.png)
- [Current overview](laptop.png)
- [Right Xenia comparison](polyp-comparison.png)
