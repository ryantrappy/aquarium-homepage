# Fish scale reference

<!-- AGENT_DOC_METADATA
Category: Specification / Physical Scaling
Status: Canonical / Active
Authority: Binding Scale Specification & Test Data
Backlog: AQ-60
Owner: @root
Updated: 2026-11-05
Upstream: docs/reef-fish-roster.md
Downstream: src/rendering/scene/fish-scale.ts, src/rendering/scene/fish-scale.test.ts
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Biological Scale Specification & Test Fixture
> - **Status**: Canonical / Active
> - **Authority**: Binding Specification (Parsed directly by `fish-scale.test.ts`)
> - **Backlog Reference**: `AQ-60`
> - **Summary**: Real-world adult dimensions and normalized render lengths (inches/meters) for all 15 roster fish species.

Real-world adult sizes for the roster in `docs/reef-fish-roster.md`, so rendered fish can be sized relative to each other. Lengths are approximate adult **total length (snout to tail tip)**. The maximum column is the FishBase species-summary maximum; the typical column is a common aquarium-kept adult size from husbandry sources and is never larger than the FishBase maximum. The render column is the single value used by `src/rendering/scene/fish-scale.ts`; a test parses this table and fails if the two drift, so update this table and that module together rather than hard-coding sizes elsewhere.

FishBase maxima verified 2026-11-04 (AQ-60) from the FishBase species summaries (fishbase.se). Corrections from the previous draft: Banggai cardinalfish 8 → 8.6 cm, mandarin dragonet 8 → 7 cm, tailspot blenny 10 → 6 cm, McCosker's flasher wrasse 11 → 8 cm, lyretail anthias 18 → 15 cm, flame angelfish 10 → 15 cm; typical sizes that exceeded the FishBase maximum were lowered.

| Stable ID | Typical adult (in / cm) | FishBase max (in / cm) | Render length (in) | Relative to clownfish (render) |
| --- | --- | --- | --- | --- |
| `ocellaris-clownfish` | 3 / 7.5 | 4.3 / 11 TL | 3 | 1.0× |
| `yellow-tang` | 6–7 / 15–18 | 7.9 / 20 TL | 6.5 | ~2.2× |
| `blue-tang` | 8–10 / 20–25 | 12.2 / 31 TL | 9 | 3.0× |
| `royal-gramma` | 2.5–3 / 6–8 | 3.1 / 8 TL | 2.75 | ~0.9× |
| `banggai-cardinalfish` | 2.5–3 / 6–8 | 3.4 / 8.6 TL | 2.75 | ~0.9× |
| `blue-green-chromis` | 3 / 7.5 | 3.9 / 10 TL | 3 | 1.0× |
| `firefish` | 2.5–3 / 6–8 | 3.5 / 9 TL | 2.75 | ~0.9× |
| `yellow-watchman-goby` | 3 / 7.5 | 3.9 / 10 SL | 3 | 1.0× |
| `mandarin-dragonet` | 2.5 / 6 | 2.8 / 7 TL | 2.5 | ~0.8× |
| `tailspot-blenny` | 2–2.5 / 5–6 | 2.4 / 6 TL | 2.25 | 0.75× |
| `six-line-wrasse` | 3 / 7.5 | 3.9 / 10 TL | 3 | 1.0× |
| `mccoskers-flasher-wrasse` | 2.5–3 / 6–8 | 3.1 / 8 TL | 2.75 | ~0.9× |
| `lyretail-anthias` | 4–5 / 10–13 | 5.9 / 15 TL | 4.5 | 1.5× |
| `flame-angelfish` | 3.5–4 / 9–10 | 5.9 / 15 TL | 3.75 | 1.25× |
| `copperband-butterflyfish` | 6–7 / 15–18 | 7.9 / 20 TL | 6.5 | ~2.2× |

TL = total length; SL = standard length (FishBase reports the yellow watchman goby maximum as SL, so its total length is somewhat longer).

## Usage notes

- Scale by **body length along the swim axis**; do not scale by bounding-box height, since tangs and butterflyfish are tall-bodied.
- Compare the real length ratios above with each GLB's measured nose-to-tail extent (see `src/rendering/assets/fish/*-inspection.json` for supplied assets; the runtime candidate GLBs are re-measured by `src/rendering/scene/fish-scale.test.ts`).
- Apply one global tank-units-per-inch constant (`TANK_UNITS_PER_INCH`) so every species stays proportional (e.g. a yellow tang should be about 2× the length of a clownfish).
- Depth/perspective scaling is separate: this table defines true relative size at equal distance from the camera.
