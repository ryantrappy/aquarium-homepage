# Open-Source Fish Asset, Motion & Reef Tank Reference Guide ($0 Budget)

<!-- AGENT_DOC_METADATA
Category: Research / Asset Survey
Status: Complete
Authority: Informational Research Guide
Backlog: AQ-5, AQ-40
Owner: @root
Updated: 2026-11-05
Upstream: docs/requirements.md, docs/design-principles.md
Downstream: docs/asset-contract.md, src/rendering/proof/ASSET_NOTICES.md
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Research Spike & Open-Source Asset Survey
> - **Status**: Complete / Informational
> - **Authority**: Informational Reference
> - **Backlog Reference**: `AQ-5`, `AQ-40`
> - **Summary**: Comprehensive survey of open-source CC0 and CC-BY 4.0 3D fish models, video references, and aquarium references adhering to the zero-dollar asset budget.

_Initial compilation: 2026-03-31. Verification annotations: 2026-11-03._  
_Scope: asset leads, candidate fish video links, reef-tank visual references, and bounded technical notes for `AQ-5`, `AQ-14`, `AQ-18`–`AQ-32`, `AQ-34`, `AQ-35`, `AQ-37`, `AQ-38`, `AQ-39`, `AQ-40`, `AQ-41`, `AQ-42`, and `AQ-43`._

## 1. Budget & Licensing Policy (`AQ-40`)

- **Confirmed Budget**: **$0 (Free / Open-Source or Custom-Made Only)**.
- **Allowed visual assets**: $0 `CC0`, `CC BY 4.0` with attribution, or work made specifically for this project. Keep attribution in [`src/rendering/proof/ASSET_NOTICES.md`](../src/rendering/proof/ASSET_NOTICES.md) for reused `CC BY 4.0` assets.
- **Excluded visual assets**: paid assets and `NC` or `ND` assets unless the user explicitly changes the policy. A free download or collection-level label does not prove that an individual model has the needed rights; check each exact asset's current license before downloading or deriving it.
- **Delivery policy**: Work local-first. Root may commit and push reviewed milestones; the user handles deployment after reviewing the local result. This research document does not authorize deployment.

## 2. Evaluation of Existing Checked-In Leads (`AQ-5`, `AQ-37`, `AQ-38`, `AQ-40`)

The two lead assets have checked-in rigged derivatives with authored clips. Source creator, license, source hash, and original geometry were verified in the earlier Blender import and are recorded in [rendering research history](rendering-research-history.md), [asset notices](../src/rendering/proof/ASSET_NOTICES.md), and [`asset-manifest.json`](../src/rendering/proof/asset-manifest.json). Current derivative counts and textures below come from the manifest. Source GLBs are outside the repository and must be reacquired with a matching hash before regeneration. The derivatives add provisional six-segment rigs and authored motion; those clips are not source animation or measured biological motion. Species-level rig suitability remains a hypothesis:

| Asset Lead | Local File | Author & License | Polycount / Texture | Multi-Angle & Animation Verdict |
|---|---|---|---|---|
| [Clownfish](https://sketchfab.com/3d-models/47ba2679d91a4f14b3fc0bf8e3805af5) | [`candidate-real-clown.glb`](../src/rendering/proof/candidate-real-clown.glb) | `zixisun02` (`CC BY 4.0`, as recorded in manifest) | **Original source:** 1,605 tris (earlier Blender import); **current derivative:** 1,685 tris, three 2048×2048 images. | Rigged derivative with authored provisional clip. The source was static; orange/white bands remain visible. Candidate technical baseline, not accepted production art. Rig motion is not verified biological motion. |
| [Oxidane - Yellow Tang](https://sketchfab.com/3d-models/5750f70ac6734728b0eb3ed81de9bb2d) | [`candidate-real-tang.glb`](../src/rendering/proof/candidate-real-tang.glb) | `JayNmeGaming` (`CC BY 4.0`, as recorded in manifest) | **Original source:** 1,184 tris (earlier Blender import); **current derivative:** 8,796 tris, one 1024×1024 image. | Rigged derivative with authored provisional clip and added pectoral membranes. The source was static and lacked discernible pectorals. Candidate technical baseline, not accepted production art; added fins and motion are not validated biological anatomy/behavior. |
| [Animated Clownfish](https://sketchfab.com/3d-models/f229446db27f4962b7fb83b2fb2fb2db) | [`clownfish-animated.glb`](../src/rendering/proof/clownfish-animated.glb) | Prior note claims `CC BY 4.0`; not reverified here | Counts, texture size, and clip details not reverified in this review | Unverified lead only. Confirm source page, current license, local file provenance, and animation before reuse. |

## 3. Additional 3D Model Leads (`AQ-40`, `AQ-42`, `AQ-34`)

These are discovery leads, not approved assets. License and file metadata below must be checked on the exact asset page at the time of use; do not infer an individual model's permission from a collection or creator page.

| Source / Asset | Link | License | Format & Specs | Best Use in Aquarium |
|---|---|---|---|---|
| **fFish.asia / floraZia collection** | [Sketchfab collection](https://sketchfab.com/ffishAsia-and-floraZia/collections/cc0-public-domain-68d21405825940b79ec393fe4e07f7bc) / [RIO Journal paper](https://riojournal.com/article/86985/) | Collection is labeled CC0; recheck individual model | `.gltf` / `.glb` specimens; collection count not rechecked | Candidate source for reference proportions and surface appearance, subject to exact model license and species verification. |
| **Smithsonian Institution 3D coral leads** | [`Acropora valenciennesi`](https://sketchfab.com/3d-models/acropora-valenciennesi-ad2212f48b0047809101354d096a8302), [`Diploria labyrinthiformis`](https://sketchfab.com/3d-models/cbbf64f211f84a7cb62887fec11f54fe), [`Stylaster brochi`](https://sketchfab.com/3d-models/stylaster-brochi-de7581ed8f664d35a1ee5bd94f518fe4) | Reported CC0; recheck each item | Geometry/format not reverified here | Museum specimen leads, not verified living-color art. Check exact item metadata and specimen condition before use. |
| **Clownfish by EmreAlkan** | [Sketchfab model](https://sketchfab.com/3d-models/clownfish-1d2fcf3a63334e7192e1a6fc3435caa7) | Not verified | File and UV claims not reverified | Candidate lead only; do not download/use until an exact `CC0`/`CC BY 4.0` license is confirmed. |
| **Stylized Rare Clown Fish by artistSC** | [Sketchfab model](https://sketchfab.com/3d-models/stylized-rare-clown-fish-game-ready-3d-model-9dc55d225d9d4fabb0ad4e5c856fc151) | Prior note claims `CC BY 4.0`; reverify | Triangle count and maps not reverified | Candidate lead only; inspect exact listing and verify license before use. |
| **Quaternius animated fish packs** | [Animated Fish Pack](https://quaternius.com/packs/animatedfish.html) / [Cute Fish Pack](https://quaternius.com/packs/cutefish.html) | Prior note claims CC0; reverify pack terms | Format and included clips not reverified | Candidate rig study only after checking pack license and inspecting its actual meshes/animation. |
| **Khronos glTF Barramundi Fish** | [Khronos GitHub Sample](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md) | `CC0 1.0` Public Domain | `.glb` with full PBR (`baseColor`, `normal`, `occlusionRoughnessMetallic`) | Official Khronos benchmark for wet fish scale specular/roughness response and iridescent sheen tuning under WebGPU/WebGL2. |
| **Poly Pizza Clownfish** | [Poly Pizza Asset](https://poly.pizza/m/769fHo3eEB) | Verify exact asset license before use | Lightweight `.glb` (count unverified here) | Unreviewed lead only; do not treat as an approved fallback or production asset. |

*License review note:* asset leads in this section are not preapproved selections. Record the exact source page, license, creator, and any attribution before deriving a model. Exclude `NC` and `ND` licenses under the current policy.

## 4. Candidate Species Video Links (`AQ-35` & `AQ-18`–`AQ-32`)

The links below are candidate visual references, not completed video reviews. During verification on 2026-11-03, YouTube pages did not expose video playback through the available read-only browser fetch; only limited title metadata was searchable. The species shown and the listed timestamp windows were therefore **not independently verified**. The motion notes from the earlier compilation are removed rather than treated as observed facts. Each window is a claimed seek point to inspect later. No AQ-18–AQ-32 video-review AC should be checked based on this table until a reviewer confirms the species and visible motion at the cited times.

| Backlog Task & target species | Candidate video link (not reviewed) | Claimed timestamp window (not verified) | Verification status |
|---|---|---|---|
| **AQ-18: Ocellaris Clownfish** (*Amphiprion ocellaris*) | [CLOWNFISH and Anemone (4K Underwater)](https://www.youtube.com/watch?v=MUMX7u7v2uY&t=11s) | `00:11–00:22` & `01:15–01:25` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-18: Ocellaris Clownfish** (*Amphiprion ocellaris*) | [Symbiotic Relationship Between Clownfish & Anemones](https://www.youtube.com/watch?v=mw-2yWO6WLY&t=7s) | `00:07–00:11` & `02:26–02:52` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-18: Ocellaris Clownfish** (*Amphiprion ocellaris*) | [Why do Clownfish swim up and down?](https://www.youtube.com/watch?v=n_L9ev92miU&t=0s) | `00:00–00:35` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-18: Ocellaris Clownfish** (*Amphiprion ocellaris*) | [Clownfish Feeding Anemone](https://www.youtube.com/watch?v=dQUe6zCkI0w&t=10s) | `00:10–00:17` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-19: Yellow Tang** (*Zebrasoma flavescens*) | [YELLOW TANG: Easy Care Guide](https://www.youtube.com/watch?v=CIMmr-PKn_M&t=30s) | `00:30–00:38`, `01:30–01:37`, `03:11–03:15` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-19: Yellow Tang** (*Zebrasoma flavescens*) | [Golden Grazer of the Reef](https://www.youtube.com/watch?v=c2vSKErCqTM&t=0s) | `00:00–00:07` & `00:11–00:17` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-19: Yellow Tang** (*Zebrasoma flavescens*) | [Rare Piebald Yellow Tang](https://www.youtube.com/watch?v=siSZkVow48Q&t=20s) | `00:20–00:25` & `00:42–00:54` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-19: Yellow Tang** (*Zebrasoma flavescens*) | [Snorkeling with Yellow Tang in Hawaii](https://www.youtube.com/watch?v=fIiOV0jpDlE&t=13s) | `00:13–00:25` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-20: Royal Gramma** (*Gramma loreto*) | [ROYAL GRAMMAS: How To Keep This Reef Safe Basslet](https://www.youtube.com/watch?v=ILqLqAAEGLc&t=60s) | `01:00–01:40` & `02:25–02:45` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-20: Royal Gramma** (*Gramma loreto*) | [Fairy Basslets (Royal Gramma) in Little Cayman](https://www.youtube.com/watch?v=FJOreYB0Knk&t=0s) | `00:00–00:35` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-21: Blue Tang** (*Paracanthurus hepatus*) | [How to Care for a Blue Tang (Regal Tang)](https://www.youtube.com/watch?v=azxKu-FJhyQ&t=38s) | `00:38–00:54`, `01:52–02:02`, `03:15–03:33` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-22: Banggai Cardinalfish** (*Pterapogon kauderni*) | [Banggai Cardinalfish at the Tennessee Aquarium](https://www.youtube.com/watch?v=3qOfVLtuEWY&t=0s) | `00:00–00:36` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-22: Banggai Cardinalfish** (*Pterapogon kauderni*) | [Banggai Cardinalfish Hovering Above the Reef](https://www.youtube.com/watch?v=_Uxl7noP_3A&t=0s) | `00:00–00:11` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-23: Blue-Green Chromis** (*Chromis viridis*) | [Green Chromis in Acropora Coral](https://www.youtube.com/watch?v=5PkiUZdKrSY&t=5s) | `00:05–00:45` & `00:46–01:18` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-23: Blue-Green Chromis** (*Chromis viridis*) | [Bluegreen Chromis (*Chromis viridis*) in 4K](https://www.youtube.com/watch?v=Ig9cTBsg2CI&t=0s) | `00:00–00:58` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-24: Firefish** (*Nemateleotris magnifica*) | [On Location: Fire Goby (*Nemateleotris magnifica*)](https://www.youtube.com/watch?v=HKvHrVIDGjY&t=11s) | `00:11–00:27` & `01:20–01:36` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-25: Yellow Watchman Goby** (*Cryptocentrus cinctus*) | [The Basics of Watchman Goby Care!](https://www.youtube.com/watch?v=Sbdm-LApMdg&t=0s) | `00:00–00:15`, `00:16–00:24`, `01:03–01:11` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-25: Yellow Watchman Goby** (*Cryptocentrus cinctus*) | [Yellow Watchman Goby Defending His Burrow](https://www.youtube.com/watch?v=vHaQdhewngI&t=0s) | `00:00–00:14` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-26: Mandarin Dragonet** (*Synchiropus splendidus*) | [Mandarinfish (*Synchiropus splendidus*) 4K HDR](https://www.youtube.com/watch?v=cmNfqfEgsWo&t=0s) | `00:00–00:12`, `00:24–00:57`, `01:07–01:30` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-27: Tailspot Blenny** (*Ecsenius stigmatura*) | [Species Spotlight: Tail Spot Blenny](https://www.youtube.com/watch?v=2hL5ojGRuQc&t=30s) | `00:30–01:25` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-27: Tailspot Blenny** (*Ecsenius stigmatura*) | [Tailspot Blenny Perching Short](https://www.youtube.com/watch?v=K0_8PBYciJ0&t=0s) | `00:00–00:11` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-28: Six-Line Wrasse** (*Pseudocheilinus hexataenia*) | [Six Line Wrasse: Ultimate Pest Control](https://www.youtube.com/watch?v=zYXrXtxKRfo&t=25s) | `00:25–01:25` & `03:35–04:15` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-29: McCosker's Flasher Wrasse** (*Paracheilinus mccoskeri*) | [McCosker's Flasher Wrasse Flashing](https://www.youtube.com/watch?v=b3lKey6ZfiA&t=0s) | `00:00–00:25` & `00:35–00:58` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-29: McCosker's Flasher Wrasse** (*Paracheilinus mccoskeri*) | [Species Deep Dive: McCosker's Flasher Wrasse](https://www.youtube.com/watch?v=TXiFcyosy5A&t=15s) | `00:15–01:10` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-30: Lyretail Anthias** (*Pseudanthias squamipinnis*) | [Species Spotlight: ANTHIAS](https://www.youtube.com/watch?v=ER43oQdsEfE&t=115s) | `01:55–02:15`, `05:50–06:10`, `13:45–14:05` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-31: Flame Angelfish** (*Centropyge loricula*) | [Reef Tank Species Spotlight: Flame Angel](https://www.youtube.com/watch?v=dtXJ9GocYq4&t=15s) | `00:15–01:05` & `01:30–02:15` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-31: Flame Angelfish** (*Centropyge loricula*) | [All About The Flame Angel](https://www.youtube.com/watch?v=TFjoIJrNIe4&t=40s) | `00:40–01:55` | Not reviewed: clip species and timestamped behavior are unverified. |
| **AQ-32: Copperband Butterflyfish** (*Chelmon rostratus*) | [Copperbanded Butterflyfish Care Guide](https://www.youtube.com/watch?v=W32sNeT1qbk&t=35s) | `00:35–01:05` & `03:15–03:50` | Not reviewed: clip species and timestamped behavior are unverified. |

## 5. Curated Reference Reef Tanks (`AQ-14` & Future 3D Reef Layout)

To keep the aquarium feeling like a real glass home reef tank (`AQ-14`) rather than an open ocean scene, these are three candidate visual references. Only the first has verified details in this review, and it is a hobbyist build report rather than a universal benchmark:

| Reference tank | Verified details and visual-use boundary |
|---|---|
| **1. [LobsterOfJustice's 180-Gallon In-Wall SPS Dream (R2R July 2025 ROTM)](https://www.reef2reef.com/ams/reef-of-the-month-july-2025-lobsterofjustice-180-gallon-in-wall-sps-dream.1123/)** | The author reports a `72 × 24 × 24 in` display with 3 Kessil A360WE fixtures and four 80 W T5 lamps. PAR was measured once before later supplemental lights: roughly 100–200 at the bottom, 200–300 mid-level, and 300–350 at the top. This is a hobbyist build feature and photo reference, not a universal lighting or aquascape standard. Layout proportions and fish-to-tank ratios are artistic measurements/inferences, not reported biological rules. |
| **2. [Brad Syphus's 300-Gallon SPS Dominated System (R2R Sept 2023 ROTM)](https://www.reef2reef.com/ams/reef-of-the-month-september-2023-brad-syphuss-300-gallon-sps-dominated-system.958/)** | The linked article was not accessible in this review; its dimensions, equipment, PAR, and layout claims remain unverified. Candidate hobbyist visual reference only until its article details and images are reviewed. Do not treat previous dimensions, lighting, or species placement statements as verified. |
| **3. [Polo Reef (Andrew Sandler's 17,000-Gallon Reef Display)](https://www.youtube.com/watch?v=5211-c1w7BM)** | Video playback and the stated capacity/layout were not independently verified in this review. Candidate visual reference only. Earlier claims about lighting, caustics, and species stratification are not established by this link review. |

These are visual starting points, not biological or husbandry requirements. Use only details explicitly reported by a source; label layout measurements and stylized proportions as artistic inference.

### Verification record (2026-11-03)

Pages opened and used for claims in this review: [LobsterOfJustice's Reef2Reef article](https://www.reef2reef.com/ams/reef-of-the-month-july-2025-lobsterofjustice-180-gallon-in-wall-sps-dream.1123/); [Pope and Fry's pure-water absorption paper](https://pubmed.ncbi.nlm.nih.gov/18264420/); [Alieva et al. on coral fluorescent proteins](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0002680); [Eyal et al. on coral fluorescence in a Red Sea habitat](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0128697); [Oregon State's seawater refractive-index reference](https://research.engr.oregonstate.edu/parrish/index-refraction-seawater-and-freshwater-function-wavelength-and-temperature); [Malul et al. on wave-driven coral tentacle motion](https://pmc.ncbi.nlm.nih.gov/articles/PMC7329047/); [the Chromis shoaling/metabolism study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5047653/), [the Chromis schooling study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9339911/), [Fishes of Australia's *Pseudanthias squamipinnis* profile](https://fishesofaustralia.net.au/home/species/4402), and [the Banggai cardinalfish behavioral ecology article](https://academic.oup.com/beheco/article-abstract/16/3/521/189890). Claims above are limited to what those sources report; several are laboratory/field findings under specific conditions, not tank-wide rules.

Not verified in this review: playback or timestamped content for any YouTube item in Section 4; the dimensions, equipment, or PAR for the Brad Syphus article; and the stated capacity or visual details in the Polo Reef video. The Sketchfab and other asset rows in Section 3 remain leads unless their exact asset page and license are explicitly identified as verified. Fish source metadata, original geometry counts, hashes, and derivative data in Section 2 rely on the earlier project provenance linked above, not on a fresh source-page or playback check in this pass.

## 6. Answers to Open Technical Spikes & Backlog Questions (`AQ-37`, `AQ-39`, `AQ-41`, `AQ-42`, `AQ-43`)

### 6.1 `AQ-37` / `AQ-48`: Mesh2Motion and Rig Archetype Questions

The linked Mesh2Motion material is a workflow lead, not evidence that one shark rig transfers well to every reef-fish body plan. Keep four rig directions as testable engineering hypotheses: `subcarangiform_schooler`, `labriform_rigid_disc`, `banner_hoverer`, and `benthic_percher_dragonet`. The current proof script has exercised the clownfish and yellow-tang profiles; the banner-hoverer and benthic-percher profiles remain provisional. This is tracked in AQ-48. Any proposed joints, deformation ranges, fin angles, or beat rates need review against the exact model and species-specific evidence; the 15 species should not be assigned rig classes solely from family names or silhouette.

### 6.2 `AQ-39`: Aquarium-Scale Optics

- **Pure-water absorption is a limited input.** [Pope and Fry (1997)](https://pubmed.ncbi.nlm.nih.gov/18264420/) measured the absorption spectrum of pure water across the visible band. Beer–Lambert calculations from those coefficients can illustrate absorption over a chosen path length, but they are not a measurement of seawater in a particular aquarium and omit glass, suspended matter, dissolved material, lighting geometry, and surface reflections. Do not use the earlier RGB coefficients or the claimed 35% top-to-bottom PAR drop as tank measurements; they were not verified for this scene.
- **Rendering implication (artistic inference):** use subtle, tunable depth color change only if it improves a clear front-on tank reference. The paper does not establish a universal no-fog rule or a single aquarium color curve.
- **Coral fluorescence varies by protein and species.** [Alieva et al. (2008)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0002680) catalogued diverse coral fluorescent proteins and spectra; cyan proteins commonly emit near 485–495 nm, while green and red classes vary. [Eyal et al. (2015)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0128697) reports spectral diversity and variation in coral fluorescence in a specific Red Sea habitat. These studies do not support universal RGB emission colors, a generic excitation band for every coral, or a time-of-day Kelvin animation. If fluorescence is represented, choose a species-specific measured spectrum or label the colors as artistic.
- **Refraction and reflection are interface-specific.** Seawater refractive index varies with wavelength, temperature, and salinity; a value near 1.34 is only an approximation ([Oregon State University reference and equation](https://research.engr.oregonstate.edu/parrish/index-refraction-seawater-and-freshwater-function-wavelength-and-temperature)). For parallel flat layers, Snell's law determines the final ray direction across the interfaces; a glass pane still contributes surface reflections. The approximately 48-degree critical angle applies to a water-to-air boundary and bounds the underwater Snell window. It does not mean every visible top surface or side pane looks mirror-like. Treat refractive values and Fresnel effects as a simple rendering model, not measured tank calibration.

### 6.3 `AQ-42` & `AQ-14.2`: Coral Skeletons and Soft-Tissue Motion

[Malul et al. (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7329047/) is a *Proceedings of the Royal Society B* paper, not a PNAS paper. It measured coral tentacle motion under wave-induced flows and found tentacle-tip velocity preceded water velocity by about one quarter of a period; one reported case had `0.28 Hz` oscillation and `−65°` phase difference. This is a result for the studied conditions, not a universal frequency or phase target for all corals. The earlier `0.25–0.9 Hz`, `−65° to −81°`, and fixed dual-sine shader parameters are not substantiated as general values here.

A reasonable visual split is to keep the large-scale shapes of calcified coral skeletons steady while allowing separately modeled fleshy polyps or tentacles to move. This is an artistic implementation choice: polyp tissue can move even when the skeleton remains fixed. Do not apply one sway profile to all soft corals, LPS, or anemones without species-specific references.

### 6.4 `AQ-43`: Suspended Particles and Bubbles

A persistent bubble column is a visual design choice, not a general reef-tank biological rule. A restrained particle layer may help suggest water depth, but particle count, pixel size, opacity, and drift field are artistic parameters. The earlier `40–80` count, size/alpha ranges, and horizontal-only “laminar gyre” motion were not measured and should not be presented as natural marine-snow or copepod densities. Tune a sparse effect locally against the tank reference; omit it if it competes with the fish or reef.

### 6.5 `AQ-41`: Social Groups and Spatial-Index Performance

- **Social behavior:** do not claim that only two species in the roster group together or that the other twelve are solitary. Primary or institutional sources describe *Chromis viridis* as gregarious and shoaling ([study on shoaling and metabolism](https://pmc.ncbi.nlm.nih.gov/articles/PMC5047653/); [study documenting schools around branching coral](https://pmc.ncbi.nlm.nih.gov/articles/PMC9339911/)), *Pseudanthias squamipinnis* as forming aggregations and male-led harems ([Fishes of Australia species profile](https://fishesofaustralia.net.au/home/species/4402)), and *Pterapogon kauderni* as a group-living fish with location-based homing ([field study](https://academic.oup.com/beheco/article-abstract/16/3/521/189890)). These are different social patterns and do not by themselves justify exact group counts or identical schooling behavior. Use the species task and verified footage for each implementation.
- **Performance:** the earlier `<0.05 ms/frame` estimate was not measured and is withdrawn. For the anticipated fish count, start with the simplest readable CPU update; benchmark on the target browser/device before adding a spatial grid or GPU compute. Determinism is an implementation property to test, not a consequence guaranteed by a grid.

