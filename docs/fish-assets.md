# Reef fish thumbnail assets

<!-- AGENT_DOC_METADATA
Category: Evidence / Asset Provenance
Status: Active
Authority: Evidentiary Record
Backlog: AQ-40, AQ-33, AQ-66, AQ-106
Owner: @root
Updated: 2026-11-15
Upstream: docs/reef-fish-roster.md
Downstream: docs/fish-art-provenance.json, public/fish/*
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: 2D Asset Provenance & Thumbnail Catalog
> - **Status**: Active / Evidentiary
> - **Authority**: Evidentiary Record
> - **Backlog Reference**: `AQ-40`, `AQ-33`, `AQ-106`
> - **Summary**: Provenance documentation and visual trait checks for the 16 standard service thumbnails plus the AQ-106 picker-only moray image.

Fish cutouts power the service fish picker and service list previews; most can also provide a temporary in-scene fallback, but the AQ-106 moray image is picker-only and is never a moving fish substitute. Static recognition art is not final production animation. The roster's anatomy and color notes guide documented project-original images; linked references are for species verification and were not copied as image sources.

Per-file hashes and provenance status are recorded in [`fish-art-provenance.json`](fish-art-provenance.json). It distinguishes the documented project-original WebPs, the four inherited WebPs removed after Root approved their replacements, the four project-original PNG sources preserved byte-for-byte under `docs/asset-evidence/aq66/originals/`, and the separately recorded AQ-106 user-supplied thumbnail whose creator/source/license is not recorded. The four approved PNG derivatives are alpha-preserving WebPs; none is a claim of final photorealistic or animated fish.

## Provenance and conversion

- The six new assets (`tailspot-blenny`, `six-line-wrasse`, `mccoskers-flasher-wrasse`, `lyretail-anthias`, `flame-angelfish`, and `copperband-butterflyfish`) were generated as original cutouts with the built-in OpenAI ImageGen tool on 2026-11-03, using the visual baselines recorded in [reef-fish-roster.md](reef-fish-roster.md). They were reviewed against those distinguishing traits before use.
- Four assets inherited from interrupted AQ-33 (`blue-green-chromis`, `firefish`, `yellow-watchman-goby`, and `mandarin-dragonet`) lacked recorded source/license/generation provenance. Root approved new original preview art for these species on 2026-11-04. Their old WebPs were removed from current distribution; their hashes and unresolved history remain in the provenance manifest.
- The first five assets were generated specifically for this project with OpenAI's built-in ImageGen on 2026-11-02, as recorded in [design.md](design.md). The initial royal-gramma and blue-tang outputs were swapped during export; their contents were checked and the filenames corrected before compression. These assets were retained and visually checked against the roster.
- The 16 standard fish thumbnails are WebP files under 75 KB each. The four generated source PNGs remain unchanged in the AQ-66 archive; their active derivatives were encoded with `cwebp` at 600 pixels wide, quality 90, and alpha quality 100. The manifest records measured alpha-visible width fractions for those standard catalog images. The AQ-106 moray thumbnail is separately hash-pinned as an existing picker-only asset and has no alpha-width sprite measurement. No linked species-reference photo is included in the assets.
- The six images generated for this continuation used separate prompts targeting the precise common/scientific name and adult appearance in the roster; the female lyretail anthias and male McCosker's flasher wrasse match the roster's sex-specific baselines.
- The AQ-106 moray thumbnail was already present in the repository and is used only in the service picker. Its file hash and dimensions are recorded, but no creator, generation prompt, or external-source/license evidence is available; Root provenance review remains required. The partial model and its exact-hash PNG exception are recorded separately in `src/rendering/assets/fish/manifest.json`.

## Catalog mapping and visual checks

| Stable ID | Common name and visual cue | Image | Reference used to check traits |
| --- | --- | --- | --- |
| `ocellaris-clownfish` | Ocellaris clownfish: orange body, three white bars | `public/fish/ocellaris-clownfish.webp` | [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish) |
| `yellow-tang` | Yellow tang: saturated yellow, compressed oval body | `public/fish/yellow-tang.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/yellow-tang/) |
| `royal-gramma` | Royal gramma: purple front, yellow rear | `public/fish/royal-gramma.webp` | [Aquarium La Rochelle](https://www.aquarium-larochelle.com/en/species-encyclopedia/royal-gramma/) |
| `blue-tang` | Blue tang: royal blue, black markings, yellow caudal fin | `public/fish/blue-tang.webp` | [Australian Museum](https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/) |
| `banggai-cardinalfish` | Banggai cardinalfish: silver, black bars, white spots, elongated fin rays | `public/fish/banggai-cardinalfish.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/banggai-cardinalfish/) |
| `blue-green-chromis` | Blue-green chromis: blue-green body, forked tail | `public/fish/blue-green-chromis.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/blue-green-chromis/) |
| `firefish` | Firefish: pale front, red rear, extended first dorsal fin | `public/fish/firefish.webp` | [FAO field guide](https://www.fao.org/fishery/docs/CDrom/bobp/cd1/Bobp/Publns/MAG/021.pdf) |
| `yellow-watchman-goby` | Yellow watchman goby: yellow body and pale blue-white spots | `public/fish/yellow-watchman-goby.webp` | [Australian Museum](https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/) |
| `mandarin-dragonet` | Mandarin dragonet: orange body with curved blue-green bands | `public/fish/mandarin-dragonet.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/mandarin-goby/) |
| `tailspot-blenny` | Tailspot blenny: beige-brown body with dark tail-base spot | `public/fish/tailspot-blenny.webp` | [Bali Wildlife](https://baliwildlife.com/encyclopedia/marine-life/ray-finned-fishes/blennies/tailspot-blenny-ecsenius-stigmatura/) |
| `six-line-wrasse` | Six-line wrasse: blue-mauve body with six yellow-orange stripes and green tail | `public/fish/six-line-wrasse.webp` | [Reef Life Survey](https://reeflife.org/species/pseudocheilinus-hexataenia/) |
| `mccoskers-flasher-wrasse` | Male McCosker's flasher wrasse: orange, blue lines, extended dorsal rays | `public/fish/mccoskers-flasher-wrasse.webp` | [Maldives fish guide](https://www.mrc.gov.mv/assets/Uploads/fishes-of-the-maldives.pdf) |
| `lyretail-anthias` | Female lyretail anthias: bright orange, purple stripe below eye | `public/fish/lyretail-anthias.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/lyretail-anthias/) |
| `flame-angelfish` | Flame angelfish: orange-red body, black bars, blue-violet fin edges | `public/fish/flame-angelfish.webp` | [USGS](https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2591) |
| `copperband-butterflyfish` | Copperband butterflyfish: silver-white body, copper bands, elongated snout, eyespot | `public/fish/copperband-butterflyfish.webp` | [Dallas World Aquarium](https://dwazoo.com/animal/copperband-butterflyfish/) |
| `desjardins-sailfin-tang` | Desjardins' sailfin tang: grey body with orange-edged bars, yellow tail | `public/fish/desjardins-sailfin-tang.webp` | [FishBase](https://www.fishbase.se/summary/Zebrasoma-desjardinii) |
| `snowflake-moray-eel` | Existing user-supplied snowflake moray recognition thumbnail; source not independently verified | `public/fish/snowflake-moray-eel.webp` | No image source or license recorded; AQ-106 picker-only use |
| `banded-trochus-snail` | Banded trochus snail: cream-and-burgundy conical shell over speckled fleshy foot ($0 original Blender studio render) | `public/fish/banded-trochus-snail.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Trochus-histrio) |
| `scarlet-reef-hermit-crab` | Scarlet reef hermit crab: scarlet legs/claws, yellow eyestalks, coralline Cerith shell ($0 original Blender studio render) | `public/fish/scarlet-reef-hermit-crab.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Paguristes-cadenati) |
| `emerald-mithrax-crab` | Emerald mithrax crab: glossy emerald carapace, spoon-tipped pincers, olive setose legs ($0 original Blender studio render) | `public/fish/emerald-mithrax-crab.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Mithraculus-sculptus) |
| `scarlet-skunk-cleaner-shrimp` | Scarlet skunk cleaner shrimp: white dorsal skunk stripe on crimson saddle, white antennae ($0 original Blender studio render) | `public/fish/scarlet-skunk-cleaner-shrimp.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Lysmata-amboinensis) |
