---
id: AQ-48
title: Implement Parametric Fish Rig Archetypes
status: In Progress
assignee:
  - '@Luna'
created_date: 2026-11-04 02:24
updated_date: '2026-11-04T02:40:00Z'
labels: []
dependencies:
  - AQ-12
  - AQ-38
  - AQ-40
priority: medium
type: task
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a reproducible Blender rig profile pipeline for species-aware fish archetypes, with measured and visually reviewed improvement on the existing licensed clownfish and yellow tang sources. Separate these rig implementation outcomes from AQ-37 research. Keep all rigged derivatives and rendered review evidence outside the repository until root review. The four profile families are Subcarangiform / schooler, Labriform / rigid-disc, Banner Hoverer, and Benthic Percher / Dragonet; only clownfish and yellow tang profiles can be validated against current source meshes. Banner Hoverer and Benthic Percher remain provisional until matching licensed meshes are available.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rig profiles cover four archetype families; clownfish and yellow tang are the only validated inputs, while banner-hoverer and benthic-percher profiles are explicitly provisional.
- [ ] #2 The improved clownfish has a smooth posterior flex ramp with a measured maximum band/body deformation lower than the current baseline, and the improved yellow tang keeps trunk and tall dorsal/anal sails rigid while limiting flex to peduncle/tail.
- [ ] #3 Source/output provenance, reproducible Blender commands, numeric baseline-vs-improved phase metrics, and neutral/oblique render evidence are recorded for root review; no production integration or checked-in candidate replacement is claimed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Hash-check the original source GLBs against the tracked manifest. 2. Extract profile data and rig logic without breaking the current clown/tang CLI aliases. 3. Constrain clownfish posterior flex to a smooth low-angle ramp that preserves the three bands. 4. Keep yellow-tang trunk/dorsal/anal region rigid, limit axial flex to the peduncle/tail, and retain pectoral-driven motion with clearly marked authored fin proxies. 5. Compare baseline and new deformation numerically at neutral and multiple cycle phases. 6. Render neutral front/oblique and phase evidence outside git; document limits and exact commands for root review.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04 02:35

---

## Rig profile and evidence pass (2026-11-03)

Implemented four parameter profiles in `src/rendering/proof/rig-candidate.py`; the `clown` and `tang` CLI aliases remain supported. Only `subcarangiform_schooler` on the clown source and `labriform_rigid_disc` on the tang source were exercised. `banner_hoverer` and `benthic_percher_dragonet` are explicitly provisional.

Sources match the tracked manifest: clownfish GLB SHA-256 `fe29d2a82a62bd5a92d2669332c7a157810d063972a5124f7ccada6d998af547` (5.7 MB); yellow tang GLB SHA-256 `25723490457b49858bc167208229570bff793bced8f2ec94c4f9d5084a2720` (1.0 MB). Blender 5.0.1 produced review-only outputs outside git: `/tmp/aq48-improved-clown.glb` (5.7 MB, SHA-256 `9fdf29c3f1b1047bd0f9b028719ca502c71954bc8be90e1f794e91705848b0db`) and `/tmp/aq48-improved-tang.glb` (1.3 MB, SHA-256 `9ae9d3ae7a4ccf938f67a6b18d5456d5877210d9e9099f93abefc0649e7ec112`). Reproduce rigging with `blender -b --python src/rendering/proof/rig-candidate.py -- SOURCE.glb OUTPUT.glb clown` or replace final alias with `tang`.

Baseline was exported from the preserved pre-change script `/tmp/aq48-rig-candidate-baseline.py`; improved outputs use the tracked script. Both were compared with `measure-rig-deformation.py` at frames 1, 7, 13, 19, 25, 31, 37, 43, and 49, measuring each output relative to its own frame-1 pose. Example at frame 25: clown posterior-body proxy RMS/max fell from 0.17360/0.43042 to 0.04883/0.12019, and anterior-band proxy from 0.00677/0.02578 to 0.00154/0.00731. Tang trunk proxy RMS/max fell from 0.02107/0.06897 to 0.00038/0.01914; dorsal/anal-sail proxy from 0.02356/0.07537 to 0.00293/0.02049; peduncle/tail proxy from 0.14869/0.25733 to 0.08486/0.16760. These are normalized-axis mesh proxies, not anatomy labels or biological measurements.

Improved neutral and phase renders are in `/tmp/aq48-improved-clown-{neutral-frame01-side,neutral-frame01-oblique,phase-frame13-side,phase-frame25-side,phase-frame37-side,pectoral-frame07-oblique,pectoral-frame31-oblique}.png` and the equivalent `tang` filenames. Clown phase renders show reduced broad body/band shear while preserving some axial movement. Tang deformation is concentrated toward the peduncle/tail as intended; however, its authored pectoral proxy reads mostly edge-on as a thin line in the current oblique evidence and needs visual/art review. Rendered forms/materials remain technical source-mesh studies; no biological fidelity or production suitability is claimed.

Blender import inspection confirms both outputs contain armatures and a 1–49 frame action. Imported meshes have boundary edges at UV/normal seams; this diagnostic alone cannot establish holes. No Khronos validator was available in this environment. Generated GLBs and PNGs remain in `/tmp`; no checked-in candidate or main scene was changed, no acceptance criteria were checked, and production integration remains pending.

---

author: @Luna
created: 2026-11-04 02:35

---

## Additional import-inspection caveat

`inspect-model.py` reports an unrigged `Icosphere` mesh in both exports, in addition to the armature-deformed fish mesh. It appears to be a source accessory/eye object, but that identity and whether it should follow body deformation need root visual review. The inspector also reports boundary edges on imported surfaces; because glTF splits vertices at UV/normal seams, this is not proof of holes.

---

author: root
created: 2026-11-04T02:40:00Z

---

Root initial review: phase-side and neutral/oblique renders inspected, but reduced vertex displacement is only a deformation proxy and not proof of convincing propulsion. Keep status In Progress. Need front/top or sufficiently oblique peak-cycle views that expose lateral tail travel and left/right pectoral opening; current mostly edge-on tang pectoral is not accepted as lifelike rowing. Identify the unrigged Icosphere by actual geometry/bounds/material/parent data, not a likely-eye guess, and verify accessory follows the intended root/head during travel/pose. Change profile labels from validated to exercised technical candidates until root accepts. Also current rig-candidate.py changes break the old manifest regeneration command for shipped baseline GLBs: preserve a reproducible baseline revision/command in manifest/docs or use explicit opt-in profile selection. No GLB promotion until root visual review of meaningful articulated phases and provenance consistency.

---
<!-- COMMENTS:END -->
