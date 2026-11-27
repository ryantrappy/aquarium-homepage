# Coral companions on the default reef

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.11, AQ-70.13, AQ-106
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/reef-assembly.ts, src/rendering/scene/reef-mesh-navigation.test.ts
-->

The two islands use 15 companion placements from four existing custom Blender exports. The pink Seriatopora and Pocillopora add branching clusters at the shoulders and side ledges. Sinularia adds fleshy growth at the ledge edges. Xenia fills around both crests and extends to the outside of the left apron. Moving one Xenia to the lower apron reduces overlap near the left torch.

The left crown-to-base silhouette spans about 80% of the 900-pixel frame in the matched views. The center arch remains open below the bridge. Some stretches of the front rock faces are still exposed. The four Blender sources, override GLBs, textures, and generators are preserved alongside the runtime GLBs and inspection reports.

The left apron Xenia base sits 0.153 world units behind the first front-facing rock hit in the assembled fixture. The actual-assets tests retain the fitted left-cave and host checks. An apron trial on the right crossed the moray's clearance envelope. The accepted placement uses the supplied right-crest site. The right-island fixture loads all coral templates and confirms that the eel's head capsule and camera sightline stay clear. In the browser, a pointer click on the exposed head opened the inspect card and requested the configured URL in a native new tab.

Both captures use 1440×900 CSS pixels, DPR 1, look-dev seed 2026 and time 1.25. The accepted overview had 12 inhabitants, zero failed assets and zero captured warnings or errors. The comparison uses the same four-service test configuration on both builds.

- [Before the companion colonies](before.png)
- [Default reef with the companion colonies](after.png)
