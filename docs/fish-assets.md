# Reef fish thumbnail assets

These 600-pixel-wide WebP cutouts power the service fish picker and service list previews. They are recognition thumbnails, not the final production animation assets. The roster's anatomy and color notes guide each generated image; linked references are for species verification and were not copied as image sources.

## Provenance and conversion

- The six new assets (`tailspot-blenny`, `six-line-wrasse`, `mccoskers-flasher-wrasse`, `lyretail-anthias`, `flame-angelfish`, and `copperband-butterflyfish`) were generated as original cutouts with the built-in OpenAI ImageGen tool on 2026-11-03, using the visual baselines recorded in [reef-fish-roster.md](reef-fish-roster.md). They were reviewed against those distinguishing traits before use.
- The four additional roster assets (`blue-green-chromis`, `firefish`, `yellow-watchman-goby`, and `mandarin-dragonet`) were already present in the interrupted AQ-33 work and were visually reviewed against the same roster notes.
- The first five assets were generated specifically for this project with OpenAI's built-in ImageGen on 2026-11-02, as recorded in [design.md](design.md). The initial royal-gramma and blue-tang outputs were swapped during export; their contents were checked and the filenames corrected before compression. These assets were retained and visually checked against the roster.
- New and retained images are converted/resized to WebP, capped at 600 pixels wide, with alpha preserved where present. No linked species-reference photo is included in the assets.
- The six images generated for this continuation used separate prompts targeting the precise common/scientific name and adult appearance in the roster; the female lyretail anthias and male McCosker's flasher wrasse match the roster's sex-specific baselines.

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
