# Yellow tang cornea reflection

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.8
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md
Downstream: src/rendering/scene/fish-flex-material.ts, src/rendering/scene/fish-flex-material.test.ts
-->

The runtime yellow tang uses a painted pupil and iris in its donor body map. The shader now applies a smoothly bounded reflection over that region using the mapped UVs. A distinct shader cache key scopes it to the mapped body of the existing yellow tang export. The same PBR and flex path still handles the rest of the fish. The original texture, geometry and rig are preserved.

The matched laptop macros show a tighter eye highlight. In the rectangle from x=805–837 and y=414–449, 548 pixels changed and the largest RGB channel change was 64 levels. Outside that rectangle, only 13 pixels changed by one level. Capture readiness reported zero failed and pending assets. The browser captured no warnings or errors.

- [Before](before.png)
- [After](after.png)
- [Capture state](capture.json)

Both captures used 1440×900 CSS pixels at DPR 1, look-dev seed 2026 and time 1.25, on base `aeab8c1`. The after view applied the cornea shader patch, SHA-256 `0a7b6a675b4fcfa475482025a36e30d55c8cb55944ffa18202a168be697965c2` for `fish-flex-material.ts`. The runtime fish export is SHA-256 `44d28509f62de1eec2a9644fea1a6ce5c79d642997b3487aa0e21d6069f76f5b`. The fixed pose verifies the local material change. Full moving and multi-species art acceptance remains open.
