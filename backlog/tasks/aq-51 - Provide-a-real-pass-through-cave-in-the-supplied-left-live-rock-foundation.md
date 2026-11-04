---
id: AQ-51
title: Provide a real pass-through cave in the supplied left live-rock foundation
status: To Do
assignee:
  - '@gemini'
created_date: '2026-11-04 19:04'
labels:
  - modeling
dependencies:
  - AQ-40
  - AQ-50
references:
  - AQ-14.3
  - src/rendering/modeling/build_live_rock_islands.py
documentation:
  - docs/asset-contract.md
priority: high
type: bug
ordinal: 11800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Exact packaged-GLB review found the supplied left foundation (SHA-256 bc055e316fd131cfd8d777e5eaed297507a37d76a6dd72d800485b2661d8a449) is a stepped solid with a shallow recess rather than the pass-through arch required by AQ14.3. Generator forms closed concentric rings. Views: /tmp/aq143-audit/live-rock-left-{front,oblique,top,closeup}.png. Reinspect the latest Gemini export because this is an audit snapshot. Gemini owns visual modeling; retain the supplied foundation as the baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exported geometry contains a real open cave or pass-through arch with measured entry, exit and internal clearance.
- [ ] #2 Hash-matched front, oblique and sand-contact views establish the opening and grounded base with canonical units and root transforms.
- [ ] #3 Updated source/export hashes, dimensions, topology and provenance are recorded and Root reviews before integration.
<!-- AC:END -->
