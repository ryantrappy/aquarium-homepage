# Lower right reef in the wide layout

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.13, AQ-106
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/reef-layout.ts, src/rendering/scene/reef-mesh-navigation.test.ts
-->

The default wide layout lowers the right foundation height factor from 3.1 to 2.9. More open water is visible over the right crest, while the left reef still occupies approximately 80% of the viewport height. The arch opening and sand foreground remain visible. The change uses the existing models and the shared placement transform.

The 2.68 trial lost a zoanthid mat because the site failed footprint support. The 2.8 trial retained all five mats and reduced the eel's head clearance above the sand below the established 0.13-world-unit minimum. At 2.9, the actual assembled right reef passes all five mat support, fallback, head-clearance, and camera-ray checks. A browser click on the visible head opened the inspect card and requested the configured example URL in a new tab.

The comparison uses 1440×900 CSS pixels, DPR 1, seed 2026, and time 1.25. The highest sampled branch pixels in the right crest region moved from about row 155 to row 172. The browser reported 12 inhabitants, zero failed assets, and zero captured warnings or errors. The placement improves the asymmetry while the reference comparison and full composition task remain open.

- [Before lowering the right foundation](../../aq70-11/companion-colonies-20261127/after.png)
- [Lower right reef](after.png)
