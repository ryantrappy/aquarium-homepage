# Fish scale reference

<!-- AGENT_DOC_METADATA
Category: Specification / Physical Scaling
Status: Canonical / Active
Authority: Binding Scale Specification & Test Data
Backlog: AQ-60, AQ-106
Owner: @root
Updated: 2026-11-15
Upstream: docs/reef-fish-roster.md
Downstream: src/rendering/scene/fish-scale.ts, src/rendering/scene/fish-scale.test.ts
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Biological Scale Specification & Test Fixture
> - **Status**: Canonical / Active
> - **Authority**: Binding Specification (Parsed directly by `fish-scale.test.ts`)
> - **Backlog Reference**: `AQ-60`, `AQ-106`
> - **Summary**: Biological reference lengths and render targets for the 17 selectable service species, including the explicitly partial moray forebody.

This reference covers the 16 standard reef-fish entries plus the AQ-106 snowflake moray service-catalog addition. Lengths are approximate adult **total length (snout to tail tip)** unless marked SL. Each maximum is linked to its FishBase species summary. Typical-size estimates remain uncited and unverified; do not treat them as sourced husbandry data. The render column is a project-selected target used by `src/rendering/scene/fish-scale.ts`, not a biological measurement; a test parses this table and fails if those targets drift.

FishBase maxima rechecked 2026-11-05 (AQ-60). Summary-page content was directly accessible for 10 species; FishBase direct-page retrieval was unavailable for blue tang, royal gramma, blue-green chromis, flame angelfish, and copperband butterflyfish, so those five maximum values were checked against FishBase's own indexed summary content. No third-party source was substituted for those checks. Corrections from the previous draft: Banggai cardinalfish 8 → 8.6 cm, mandarin dragonet 8 → 7 cm, tailspot blenny 10 → 6 cm, McCosker's flasher wrasse 11 → 8 cm, lyretail anthias 18 → 15 cm, flame angelfish 10 → 15 cm; the typical-size estimates remain unverified.

| Stable ID | Typical adult estimate (in / cm; unverified) | FishBase max (in / cm) | Render length target (in) | Relative to clownfish (render) |
| --- | --- | --- | --- | --- |
| `ocellaris-clownfish` | 3 / 7.5 | [4.3 / 11 TL](https://www.fishbase.se/summary/Amphiprion-ocellaris) | 3 | 1.0× |
| `yellow-tang` | 6–7 / 15–18 | [7.9 / 20 TL](https://www.fishbase.se/summary/Zebrasoma-flavescens) | 6.5 | ~2.2× |
| `blue-tang` | 8–10 / 20–25 | [12.2 / 31 TL](https://www.fishbase.se/summary/Paracanthurus-hepatus) | 9 | 3.0× |
| `royal-gramma` | 2.5–3 / 6–8 | [3.1 / 8 TL](https://www.fishbase.se/summary/Gramma-loreto) | 2.75 | ~0.9× |
| `banggai-cardinalfish` | 2.5–3 / 6–8 | [3.4 / 8.6 TL](https://www.fishbase.se/summary/Pterapogon-kauderni) | 2.75 | ~0.9× |
| `blue-green-chromis` | 3 / 7.5 | [3.9 / 10 TL](https://www.fishbase.se/summary/Chromis-viridis) | 3 | 1.0× |
| `firefish` | 2.5–3 / 6–8 | [3.5 / 9 TL](https://www.fishbase.se/summary/Nemateleotris-magnifica) | 2.75 | ~0.9× |
| `yellow-watchman-goby` | 3 / 7.5 | [3.9 / 10 SL](https://www.fishbase.se/summary/Cryptocentrus-cinctus) | 3 | 1.0× |
| `mandarin-dragonet` | 2.5 / 6 | [2.8 / 7 TL](https://www.fishbase.se/summary/Synchiropus-splendidus) | 2.5 | ~0.8× |
| `tailspot-blenny` | 2–2.5 / 5–6 | [2.4 / 6 TL](https://www.fishbase.se/summary/Ecsenius-stigmatura) | 2.25 | 0.75× |
| `six-line-wrasse` | 3 / 7.5 | [3.9 / 10 TL](https://www.fishbase.se/summary/Pseudocheilinus-hexataenia) | 3 | 1.0× |
| `mccoskers-flasher-wrasse` | 2.5–3 / 6–8 | [3.1 / 8 TL](https://www.fishbase.se/summary/Paracheilinus-mccoskeri) | 2.75 | ~0.9× |
| `lyretail-anthias` | Unverified; adult-female baseline (FishBase female max 2.8 / 7 TL) | [5.9 / 15 TL male/unsexed; 2.8 / 7 TL female](https://www.fishbase.se/summary/Pseudanthias-squamipinnis) | 2.5 | ~0.8× |
| `flame-angelfish` | 3.5–4 / 9–10 | [5.9 / 15 TL](https://www.fishbase.se/summary/Centropyge-loricula) | 3.75 | 1.25× |
| `copperband-butterflyfish` | 6–7 / 15–18 | [7.9 / 20 TL](https://www.fishbase.se/summary/Chelmon-rostratus) | 6.5 | ~2.2× |
| `desjardins-sailfin-tang` | 12–14 / 30–35 | [15.7 / 40 TL](https://www.fishbase.se/summary/Zebrasoma-desjardinii) | 12 | 4.0× |
| `snowflake-moray-eel` | 24 / 61 (AQ-106 project reference, not a typical-size claim) | [39.4 / 100 cm TL male/unsexed (Ref. 48635); common length 19.7 / 50 cm TL male/unsexed (Ref. 3258)](https://www.fishbase.se/summary/Echidna-nebulosa) | 9 | 3.0× |
| `banded-trochus-snail` | Unverified project staging target | [SeaLifeBase summary](https://www.sealifebase.se/summary/Trochus-histrio) | 1.75 | ~0.6× |
| `scarlet-reef-hermit-crab` | Unverified project staging target | [SeaLifeBase summary](https://www.sealifebase.se/summary/Paguristes-cadenati) | 2 | ~0.7× |
| `emerald-mithrax-crab` | Unverified project staging target | [SeaLifeBase summary](https://www.sealifebase.se/summary/Mithraculus-sculptus) | 2 | ~0.7× |
| `scarlet-skunk-cleaner-shrimp` | Unverified project staging target | [SeaLifeBase summary](https://www.sealifebase.se/summary/Lysmata-amboinensis) | 3.25 | ~1.1× |

TL = total length; SL = standard length (FishBase reports the yellow watchman goby maximum as SL, so its total length is somewhat longer). Lyretail rendering uses the project-selected 2.5 in target (6.35 cm), below the FishBase female maximum; this is a render choice, not a claim of typical adult size. The other numbers in the unverified typical-estimate column are retained as draft estimates pending row-specific husbandry sources. The sailfin row was added 2026-11-09 (Ryan's sailfin decision): its FishBase maximum (40.0 cm TL) and common length (32.0 cm TL) were verified that day, and its 12 in render target follows the established pattern of sitting below the maximum (yellow tang 6.5 vs 7.9, blue tang 9 vs 12.2) while staying inside the typical adult range — the largest fish in the tank, about 1.85× the yellow tang.

AQ-106 uses a 24 in total-length biological reference and a 9 in render target because the supplied GLB contains only a cut rear-to-head forebody and no tail. The 9 in target sizes the visible model; it does not claim the partial mesh depicts a complete 9 in adult. The supplied forebody remains unmodified; its measured GLB bounds, authored clip, and PNG exception are recorded in `src/rendering/assets/fish/manifest.json`.

## Usage notes

- Scale by **body length along the swim axis**; do not scale by bounding-box height, since tangs and butterflyfish are tall-bodied.
- Compare the real length ratios above with each GLB's measured nose-to-tail extent (see `src/rendering/assets/fish/*-inspection.json` for contract-validated candidates and the scoped runtime-supplied record in `src/rendering/assets/fish/manifest.json`; runtime GLBs are re-measured by `src/rendering/scene/fish-scale.test.ts`).
- Apply one global tank-units-per-inch constant (`TANK_UNITS_PER_INCH`) so every species stays proportional (e.g. a yellow tang should be about 2× the length of a clownfish).
- Depth/perspective scaling is separate: this table defines true relative size at equal distance from the camera.
