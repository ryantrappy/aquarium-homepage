---
id: AQ-89
title: Anchor service labels tight to their fish and keep labels from overlapping other fish
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-08'
updated_date: '2026-11-08'
labels:
  - accessibility
  - photorealism
  - rendering
dependencies:
  - AQ-13
  - AQ-70.14
  - AQ-34
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/fish-link-projection.ts
  - src/components/AquariumScene.tsx
  - src/styles/aquarium.css
  - AQ-13
  - AQ-70.14
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Service labels sit tucked directly under their fish with no floating gap, and never visually cover another fish. AQ-70.14 (Done: smaller / subtler captions, click priority across overlaps), AQ-13 AC #6 / AC #4, and AQ-34 AC #4 already cover caption styling, hover/focus brightening, and occlusion; this task adds only the missing tight anchoring and the rule that a label must not visually overlap another fish or its label. (Video-review finding, 2026-11-08: labels float with a visible gap under their fish and overlap other fish.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each label is anchored tight under (or immediately beside, at frame edges) its fish with no visible floating gap, at 1440x900 and 402x874
- [ ] #2 Labels never visually overlap another fish or its label; where fish cluster, labels de-conflict (offset, fade, or hide behind the nearer fish) while the native link and 44px target stay usable
- [ ] #3 Labels still follow moving fish, stay readable, brighten on hover / focus, and respect occlusion, per AQ-13 AC #4 and AQ-34 AC #4
- [ ] #4 Reduced-motion, pause, keyboard, touch, and Services-modal access are unchanged; existing AQ-70.14 / AQ-13 tests pass plus new overlap / anchoring tests
- [ ] #5 Root native visual review at 1440x900 and 402x874 accepts the anchoring before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Muse
created: 2026-11-10
---
2026-11-10 fix for the PR #37 post-merge visual-check label findings (mobile 402x874; report ~/workspace/visual-checks-2026-11-09-pr37/VISUAL-CHECK-REPORT.md). No acceptance criteria ticked and nothing marked Done — Root review still required (AC #5).
- Diagnosis: (i) WatchMyBirds + Paperless pills stacked with only the 2px clearance, reading as one overlapping blob, and the layout estimated caption width from the link-box width while the rendered pill is text-wide (~96px for "WatchMyBirds" on a 44px box), so side-by-side pills could overlap with the layout believing them clear. (ii) The Paperless pill vanished in one bubble frame: its caption needed a down-shift past the 84px detachment cap (cascade through the banggai body + caption), and the old fallback faded it — a few pixels of fish drift flips it visible/invisible frame to frame. (iii) Blue tang + yellow tang showed no pills in mobile zoom although the links exist in the DOM: two causes — the same fade (huge bodies in zoom need shifts past the cap) and the occlusion test, which required every raycast sample to resolve to the fish itself while schoolmate meshes (sailfin, no serviceId) and other fish count as occluders.
- Fix (`src/rendering/scene/fish-label-layout.ts`): clearance 2px → 8px; caption width estimated from the service name when known; captions are never faded — a caption that cannot shift down within its budget slides sideways past the obstacle while staying over its own fish's column, and if even that cannot keep it attached it stays visible at its anchored position. (`src/rendering/scene/fish-link-focus.ts`, `src/rendering/scene/aquarium.ts`): a label sample counts as exposed when the foremost hit is any fish — itself, another service fish, or an ambient schoolmate (tracked in `ambientMeshes` in `rebuildHitMeshes`); reef/sand foremost still hides the label, so a fish genuinely behind rock stays unlabelled. Click picking still uses `nearest()` separately and is unchanged. Trade-off, stated plainly: a fish entirely behind another fish now shows its label at its true projected position instead of losing it, and a caption that cannot clear may graze another fish's body while staying visible.
- Regression tests (all written to fail on the pre-fix code first): `fish-label-layout.test.ts` — stacked pills stay visible and non-overlapping in a 402x874 viewport, a pill stays visible and in the same place across a 4px frame-to-frame drift, side-by-side pills with names wider than their fish separate, a caption slides sideways instead of fading past the cap, text-based width estimation; `fish-link-focus.test.ts` — label exposure for self / other service fish / ambient fish / reef / no hit.
- Verification on main tip 517c363: `npm run typecheck` passes, `npm run build` passes, full suite 639/639 (60 files; baseline 629 + 10 new). PR opened off main (see PR body for the number/link). Visual check at 1440x900 and 402x874 still needed after merge — this fix is verified by unit tests only, not by a live render.
<!-- COMMENTS:END -->
