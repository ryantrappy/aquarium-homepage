---
id: AQ-59
title: Refine supplied rock silhouette and materials before scene promotion
status: To Do
assignee:
  - '@gemini'
created_date: '2026-11-05 03:13'
updated_date: '2026-11-05 04:20'
labels:
  - modeling
dependencies: []
references:
  - AQ-14.3
  - design/reef-control-v2-preview.png
  - /tmp/aq-asset-review-20261104/left-exact-front.png
  - /tmp/aq-asset-review-20261104/left-exact-oblique.png
  - docs/asset-evidence/aq57/left-exact-front.png
  - docs/asset-evidence/aq57/left-exact-oblique.png
priority: high
type: bug
ordinal: 11950
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root inspected exact packaged left front/oblique snapshots (SHA 2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c). The real arch is useful, but repeated flat terrace layers and wavy stretched gray/purple material read as manufactured sheets rather than porous carbonate live rock. Keep these supplied assets as the starting point and preserve passing mounts/cave measurements; do not replace the runtime photogrammetry baseline until art review passes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hash-matched neutral front/oblique/sand-contact renders show irregular natural rock massing and porous carbonate/coralline detail without repeated flat sheet silhouettes, wavy texture stretching or wallpaper projection.
- [ ] #2 Updated geometry keeps a measured real cave, grounded base and independently passing available mounts; source/export hashes and actual dimensions remain consistent.
- [ ] #3 Root accepts exact-export renders against the sharp front-on reef-tank reference before AQ14.3 or runtime assembly is approved.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-05 04:20
---
Root sequencing2026-11-04: this High visual-modeling prerequisite is ordered before AQ14.3 acceptance, alongside the collision blocker. User-managed coral/model work retains ownership; Root/Codex will not edit coral assets/rendering while that agent is active.
---
<!-- COMMENTS:END -->
