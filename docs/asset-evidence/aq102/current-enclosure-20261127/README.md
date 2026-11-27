# Glass enclosure and native interaction

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-102
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/glass-enclosure.ts, src/rendering/scene/aquarium.ts
-->

The 1440×900 DPR 1 overview shows the rear corner seams and the bottom lip bounding the visible sand and water. The glass highlights are faint across the main view, with readable fish and controls. The pane shader tests cover the side and front grazing terms and the diagonal sheen.

The reflection comparison uses the same seed 2026, time 1.25, viewport, camera and four-service configuration. The control forces low quality for the glass enclosure alone, retaining every clear pane and all other renderer settings. Enabling the mirrors makes reflected rock and floor visible at the outer sides. The central strip from x=250 through x=1189 is pixel-identical. Individual coral shapes are difficult to distinguish in the side reflection at this camera.

A native pointer click at (1126, 785) on the exposed moray opened its inspect card and triggered a new tab for the configured example URL. The browser recorded a user gesture and target _blank. Consecutive settled screenshots were byte-identical while paused and, independently, while the operating system's reduced-motion preference was emulated with manual Pause released. The browser reported zero warnings or errors.

The reviewed source commit is 2d51406b1320e6c6b32cae103fdc8e3438fd1ca1. The enclosure source SHA-256 is 423847510141aece7b0e5e9be9b287a2c507537f059951ad086b7bcf2a79f7f2. The temporary control was removed before final verification. Current review covers the laptop view.

- [Current overview](reef.png)
- [Lower side reflection comparison](reflections.png)
- [Native click on the moray](head-click.png)
