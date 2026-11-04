---
id: AQ-53
title: Align supplied soft-coral flexibility masks with the runtime contract
status: To Do
assignee:
  - '@gemini'
created_date: '2026-11-04 19:05'
updated_date: '2026-11-04 19:23'
labels:
  - modeling
dependencies:
  - AQ-40
references:
  - AQ-42
  - src/rendering/modeling/build_euphyllia_torch.py
  - src/rendering/modeling/build_euphyllia_hammer.py
  - src/rendering/modeling/build_bubble_tip_anemone.py
documentation:
  - docs/asset-contract.md
priority: high
type: bug
ordinal: 12900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Read-only preflight found torch, hammer and anemone crowns authored with COLOR_0.R=h^1.8 while coral-raw-masks-v1 requires raw height and applies pow(R,1.8) once at runtime. Consuming these exports as declared would apply the exponent twice and distort flow response. Recheck latest Gemini exports before acting; preserve visual design and coordinate mask encoding with the Codex renderer adapter.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exported mask encoding and declared contract agree, with the flexibility exponent applied exactly once across authoring and runtime.
- [ ] #2 Rigid skeleton and pinned bases retain zero flexibility; masks remain finite, in range and matched to exported POSITION counts after quantization.
- [ ] #3 Updated hashes, provenance and reproducible mask inspection identify the encoding consumed by the renderer without using mask RGB or AO alpha as display color or opacity.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04 19:23
---
Additional functional review note for acceptance evidence: package_modular_corals.mjs decodeColor0Values currently forces rigid R to zero in the inspection array and clamps/rounds channels without altering or re-reading actual exported values. Current independently read rigid values were zero, so this is not evidence that current rigid assets are wrong. When verifying AC2, inspect actual GLB attributes rather than trusting sanitized report arrays; do not let the report hide invalid future exports.
---
<!-- COMMENTS:END -->
