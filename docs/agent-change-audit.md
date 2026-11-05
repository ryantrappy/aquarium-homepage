# Parallel-agent change audit — 2026-11-04

<!-- AGENT_DOC_METADATA
Category: Evidence / Audit
Status: Complete
Authority: Evidentiary Audit Record
Backlog: AQ-57
Owner: @root
Updated: 2026-11-05
Upstream: AGENTS.md, AGENT_TASKS.md
Downstream: None
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Multi-Agent Governance & Change Audit
> - **Status**: Complete / Historical Audit
> - **Authority**: Evidentiary Record
> - **Backlog Reference**: `AQ-57`
> - **Summary**: Formal Root audit reconciling concurrent agent modifications against reviewed commit `5031ca1`, cataloging quarantined code, reverted collision claims, and retained candidates.

Root audit: AQ-57. Comparison baseline: `5031ca1` on `main`.

The active scene, motion adapter/tests, habitat derivation/data and habitat build script already matched the reviewed baseline when this audit began. The experimental modular promotion, rock wallpaper/glow and procedural fin overlays had been reverted by the other workflow. Root confirmed that equality and kept the baseline; the rejected experiment was not restored. This is a working technical baseline, not a completed photorealistic aquarium.

## Dispositions

| Area | Disposition | Evidence / reason |
| --- | --- | --- |
| `src/rendering/scene/` and `scripts/build-reef-habitat.mjs` | Keep reviewed baseline | No diff against `5031ca1`; active model URLs remain the two candidate fish rigs and photographic reef scan. |
| Experimental source copies under `docs/archive-modular-experiment/` | Quarantine outside repository | Untracked rejected code with broken relative imports and misleading completion claims should not be a reusable implementation baseline. Complete copies remain in the pre-audit archive. |
| `public/live-rock-texture.png`, `public/live-rock-diffuse.png` | Quarantine outside served public files | Unused by the baseline; complete derivative provenance is not recorded. No public copy remains to ship accidentally. |
| Profile deep-freezing and regression | Keep | Enforces the existing immutable-profile contract. Full tests/typecheck pass; no behavior or rendering changes. |
| Eight coral generator raw-mask repairs and rebuilt GLBs | Keep as unpromoted candidates | Removes double flexibility exponent and lossy intermediate authoring; actual exported arrays match records, rigid masks are zero, counts/ranges pass. Runtime adapter acceptance remains open in AQ-53. |
| Two rock generators/exports and socket inspection integration | Keep as unpromoted candidates | Independent inspector verifies 12 left / 11 right mounts; a real cave exists. Visual readiness and collision validity remain separately rejected/pending. |
| Hard-coded `collisionParts` in packager/rock inspection records | Revert declaration | Three boxes missed 1,679 left-rock vertices. Removed unchecked box generation and cleared declarations in both records; geometry bytes and socket measurements are unchanged. AQ-58 owns replacement. |
| Six supplied fish exports, manifest and packager | Preserve as candidates | Exact hashes, joint hierarchies and rotation tracks are inventoried. Do not replace active fish automatically or treat authoring renders as visual acceptance. |
| Asset/rig validation tools | Keep after Root review | AQ-42.1 verifies 32 files; AQ-52.1 independently reproduces socket results; AQ-49.1 inventories eight rigs / 174 channels reproducibly. |
| Backlog/asset README completion claims | Correct | Reopened AQ-14.4/AQ-14.6/AQ-49 criteria and withdrew statements implying reverted features are active or supplied art is Root approved. Historical notes remain identifiable as superseded. |
| Service configuration | Keep user-approved roster | Following AQ56, user selected Komodo, WatchMyBirds, Paperless, Home Assistant and Ombi. AQ8 updated defaults and local saved configuration, removed unconfirmed Jellyfin/Immich examples and verified native destinations. No auth, proxy, DNS, host or deployment changes. |

The pre-audit snapshot includes 75 files / 38,559,950 bytes, with per-file hashes in `/tmp/aquarium-agent-audit-20261104/inventory.json` and a private archive at `/tmp/aquarium-agent-audit-20261104/pre-audit-worktree.tar.gz`. Quarantined files are under that directory's `quarantine/`. These temporary recovery copies are not required build inputs.

## Concrete findings still blocking promotion

- The exact left rock has a useful real opening, but repeated flat terraces and wavy gray/purple texture read as manufactured sheets. Root withheld art approval and opened modeling task AQ-59. Exact renders and independent measurements are in [asset-evidence/aq57](asset-evidence/aq57/).
- Left collision boxes under-covered the sloped cave wall, including point `[-0.1163733453, 0.0830261558, 0.2448555976]`. Empty collision metadata means unavailable, never an obstacle-free habitat. AQ-58 must establish conservative solid coverage and measured fish clearance.
- Supplied prose dimensions differ from actual exported POSITION bounds. The independent report records left dimensions approximately `[0.962808, 0.387000, 0.518109]` m and right `[0.920939, 0.327000, 0.496555]` m in glTF XYZ.
- All eight fish rigs animate their numbered spine and pectoral rotation channels. Future overlays must compose with exact clip poses and verified axes. Literal names such as `spine_mid` and `tail_base` are absent; a name-based anatomical guess is insufficient.

## Verification and limits

Root verified 23 test files / 142 tests, TypeScript typecheck, scoped whitespace checks and an isolated production build at `/tmp/aquarium-aq57-review-20261104`. The build reports the existing large-chunk warning. The existing local production listener was not overwritten.

Native Chrome review used exactly 1440×900 and 402×874 CSS pixels, with measured viewport scale 1. The baseline renders, compact controls and native `_blank` links remain present; phone Services and Settings dialogs open/close, pause preserves target styles across those interactions, motion resumes, and no captured console errors/warnings occurred. Screenshots are under `/tmp/aquarium-review-evidence/aq57-baseline-{laptop,phone}.jpg`. This verifies the restored baseline, not realistic turning, accepted modular art, a new reduced-motion audit or final project completion.

## Delegation packets

All five are labeled `easy`, with explicit allowed files and verification requirements in Backlog:

| Task | Bounded deliverable |
| --- | --- |
| AQ-49.1 | Read-only exact joint/track inventory; Root reviewed and Done. |
| AQ-52.1 | Socket report freshness checker and failure fixtures; Root reviewed and Done. |
| AQ-42.1 | Manifest hash/identity checker and failure fixtures; Root reviewed and Done. |
| AQ-17.1 | Done after Root review: read-only network route over the reviewed sampler, including explicit unsupported-method rejection and production HTTP verification. |
| AQ-8.1 | Done after Root review: source-backed service mapping review sheet; later AQ8 implements the user's approved choices. |

Root's follow-up audit corrected both packagers/manifests from `ready-for-project-integration` to `candidate-awaiting-root-review`, and removed modeling README imperatives implying production approval. Those asset paths are now reserved to the other coral agent and held out of Root's commits. Offline collision bands remain comparison evidence only; AQ58 is iterating toward truly 3D collision, not treating full-depth boxes as final acceptance. AQ35's typed profile contract is now separately Root-reviewed with actual adapter motion traces; lifelike animation remains open.

Root retains final acceptance. Visual model work stays with the user-managed Gemini workflow; Codex workers own bounded integration, validation and tests. The remaining Backlog tasks are still required for project completion.
