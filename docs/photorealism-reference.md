# Photoreal reef-tank reference set (AQ-70.1)

<!-- AGENT_DOC_METADATA
Category: Research
Status: Active
Authority: Informational
Backlog: AQ-70.1
Owner: @Luna
Updated: 2026-11-09
Upstream: docs/requirements.md, backlog/tasks/aq-70.1 - Research-a-photoreal-reef-tank-reference-set-and-define-a-measurable-realism-rubric.md
Downstream: docs/photorealism-rubric.md, docs/baked-lighting-spike.md
-->

Reference photographs for judging whether the rendered aquarium reads as a
real front-on home reef tank — not open ocean, not a blurry backdrop — under
typical 14,000–20,000 K LED fixtures with white + royal-blue/actinic
channels. Every entry below has a URL verified 2026-11-09 and a license
status read from its file page or the cited source. **Reference only:**
nothing here is bundled. Bundling follows the $0 rule (CC0 / CC-BY 4.0 /
custom only, see `docs/asset-contract.md`); a reference marked CC BY-SA is
usable for looking, not for shipping, and any file marked "verify on file
page" must have its license confirmed there before any use beyond looking.

## 1. How to use this set

- Judge a capture side by side with the closest reference, not from memory.
  The rubric (`docs/photorealism-rubric.md`) turns the observations below
  into pass/fail criteria and numbers; run
  `node scripts/measure-capture-histograms.mjs <capture.png>` for the
  measurable half.
- Two references were measured with the script on 2026-11-09 to calibrate
  the rubric's numeric targets (see the rubric §2): the Berlin reef tank
  (ref 18) and the clownfish photograph (ref 1). The remaining references
  are listed for visual comparison; running the script over them is the
  follow-up that fills in per-element target ranges.
- When a reference is a gallery or category page, pick one file from it,
  record that file's exact URL and license in the task or review where you
  rely on it, and do not cite the gallery as if it were the image.

## 2. Fish — the 16-species roster

The roster grew from 15 to 16 species on 2026-11-09 (Desjardins' sailfin tang added to the roster — auto-spawned as a visual-only display fish until Ryan had it removed the same day; retained as an optional add for a new service). No dedicated reference row exists for the sailfin yet — its documented sources are FishBase (https://www.fishbase.se/summary/Zebrasoma-desjardinii) and Wikipedia (https://en.wikipedia.org/wiki/Zebrasoma_desjardinii), recorded in `docs/reef-fish-roster.md`.

| # | Subject | URL | License | What it demonstrates |
|---|---|---|---|---|
| 1 | Ocellaris clownfish in magnificent sea anemone, Great Barrier Reef | https://commons.wikimedia.org/wiki/File:Common_clownfish.jpg | Public domain (Jan Derk, 2002) | Clownfish + host anemone: orange/white pattern edges, wet specular on skin, tentacle fringe the fish nestles in; also the anemone reference for AQ-82. Measured 2026-11-09: luminance mean 0.55, saturation mean 0.41, 21% of pixels > 0.6 saturation — a saturated *subject* inside a moderate frame. |
| 2 | Ocellaris clownfish guarding its host anemone | https://commons.wikimedia.org/wiki/File:Amphiprion_ocellaris_(Clown_anemonefish)_Nemo.jpg | CC BY-SA 3.0 (Nick Hobgood) — reference only, not bundlable | Clownfish posture at the anemone, fin shape, countershading (dark back, pale belly). |
| 3 | Ocellaris clownfish, Papua New Guinea | https://commons.wikimedia.org/wiki/File:Amphiprion_ocellaris_(Clown_anemonefish)_by_Nick_Hobgood.jpg | CC BY-SA 3.0 (Nick Hobgood) — reference only | Same subject, different light: how the orange reads under natural reef light vs actinic-heavy tank light. |
| 4 | Ocellaris clownfish and magnificent sea anemone, 2025 | https://commons.wikimedia.org/wiki/File:Amphiprion_ocellaris_and_Radianthus_magnifica.jpg | Verify on file page (The Cosmonaut, 2025) | Modern high-resolution anemonefish + tentacle detail; check the file page before citing a license. |
| 5 | Regal blue tang, aquarium | https://commons.wikimedia.org/wiki/File:Regal_Tang-_hyper_active_(15821623394).jpg | Verify on file page (Flickr transfer, shankar s., 2015) | Blue tang body shape: flat disc, pointed snout, royal-blue field with the black "palette" band and yellow tail; note the band's soft edge, not a hard vector outline. |
| 6 | Regal blue tang | https://commons.wikimedia.org/wiki/File:Paletten-Doktorfisch_(Paracanthurus_hepatus).jpg | CC BY-SA 3.0 (Olbertz, 2007) — reference only | Same species, side-on: scale micro-detail, dorsal/anal fin ray structure, eye with cornea highlight. |
| 7 | Yellow tang, aquarium | https://commons.wikimedia.org/wiki/File:Yellow_tang_01.jpg | CC BY (Ad Meskens, 2018; credit required; version: verify on file page — bundling requires 4.0) | Yellow tang: uniform yellow is *not* flat — scale texture, translucent fin membranes with visible rays, dark eye. The counter-example to the "flat yellow disc" in the baseline audit. |
| 8 | Yellow tang | https://commons.wikimedia.org/wiki/File:Zebrasoma_flavescens_001.jpg | CC BY (Amada44; version: verify on file page — bundling requires 4.0) | Yellow tang in the wild: how the yellow shifts with depth and light; dorsal sail fully extended. |
| 9 | Yellow tangs in captivity (43 files) | https://commons.wikimedia.org/wiki/Category:Zebrasoma_flavescens_in_captivity | Freely licensed per file; verify each | Tank context: yellow tangs against live rock and sand, showing real scale against the aquascape. |
| 10 | Featured fish gallery (curated) | https://commons.wikimedia.org/wiki/Commons:Featured_pictures/Animals/Fish | Freely licensed per file; verify each | Browse entry point for the remaining roster species (gramma, angelfish, wrasse, anthias, chromis): community-selected best fish photographs. |
| 11 | Animals in their habitats (curated) | https://commons.wikimedia.org/wiki/Commons:Featured_pictures/Animals/In_their_habitats | Freely licensed per file; verify each | Fish *in* habitat — clownfish in anemone, schooling fish over reef — the interaction reference for AQ-70.13/AQ-82 behavior work. |
| 12 | Regal blue tang, species page | https://en.wikipedia.org/wiki/Paracanthurus | Lead image freely licensed; verify on file page | Taxonomy + range + the lead photograph as a second blue-tang reference. |
| 13 | Per-species licensed photo credits (Atrium) | https://www.atrium.show/credits | Per photo, as credited on the page | A credits page that names the photographer and license for each fish photo it used, including royal gramma (CC BY 3.0, JoJan), yellow tang (CC BY 3.0, Amada44; public domain, Adrian Pingstone), blue tang (CC BY 3.0, Holger Krisp). Use the "source" link on the page to reach each photo's own page and re-verify. |

### Species coverage map

Direct file above: clownfish (1–4), blue tang (5–6, 12–13), yellow tang
(7–9, 13). Covered via the galleries / credits hub (10, 11, 13) or a named
Commons category to browse (pick one file, record its URL + license):
royal gramma (`Category:Gramma loreto`), flame angelfish
(`Category:Centropyge loricula`), banggai cardinalfish
(`Category:Pterapogon kauderni`), six-line wrasse
(`Category:Pseudocheilinus hexataenia`), mandarin dragonet
(`Category:Synchiropus splendidus`), lyretail anthias
(`Category:Pseudanthias squamipinnis`), copperband butterflyfish
(`Category:Chelmon rostratus`), firefish (`Category:Nemateleotris magnifica`),
yellow watchman goby (`Category:Cryptocentrus cinctus`), tailspot blenny
(`Category:Ecsenius stigmatura`), blue-green chromis
(`Category:Chromis viridis`). No URL is given for these categories here
because none was verified in this pass — the category name is the lookup,
and the chosen file's URL is what gets recorded.

## 3. Coral — the 8 archetypes in the scene

| # | Subject | URL | License | What it demonstrates |
|---|---|---|---|---|
| 14 | Staghorn coral, *Acropora cervicornis*, Bonaire | https://commons.wikimedia.org/wiki/File:Staghorn-coral-1.jpg | CC BY-SA 3.0 (Adona9, 2007) — reference only | Staghorn branching: thin round branches, pale axial tips, brown-to-tan tissue — the opposite of the baseline's "cotton swab" tips. |
| 15 | Bleached branching *Acropora*, Heron Island | https://commons.wikimedia.org/wiki/File:Bleachedcoral.jpg | Verify on file page (J. Roff, 2005) | Negative example: what bleached (white, no tissue color) staghorn looks like — useful to keep the healthy-tissue grade (AQ-88) honest. |
| 16 | *Porites lutea* massive coral | https://commons.wikimedia.org/wiki/File:Porites_lutea.jpg | CC BY-SA 3.0 (Philippe Bourjon) — reference only | Massive/encrusting growth form and polyp-scale surface texture — the brain-coral analogue for corallite detail. |
| 17 | Mixed reef with sand, Great Barrier Reef | https://commons.wikimedia.org/wiki/File:Great_Barrier_Reef_4.JPG | CC BY-SA 3.0 (Cookaa) — reference only | Coral color *range* in one frame: muted tans/browns/olives with localized bright polyps — the antidote to the baseline's uniformly saturated pastels. |
| — | Acropora (tabling/branching) and Euphyllia (torch/hammer) | https://www.atrium.show/credits (ref 13) | Per photo: *Acropora kenti* / *A. tenuis* CC BY 4.0 (MolaAcropora); *Euphyllia glabrescens* CC BY 2.0 (Ryan Boren); *Euphyllia* sp. public domain (David Burdick) | Colony shape, polyp extension, and tentacle-tip color for the two SPS/LPS archetypes the scene mounts on the crest and mid sockets. Follow the "source" links on the credits page. |

Montipora plate, brain/Diploria-type, bubble-tip anemone, and zoanthids have
no individually verified file in this pass: browse the Commons category for
the genus (e.g. `Category:Montipora`, `Category:Euphyllia`), pick one file,
and record its URL + license as for the fish in §2. The staghorn and massive
references above already establish the two properties that matter most for
every archetype: muted tissue color with localized bright tips/polyps, and
visible polyp/corallite texture at close range.

## 4. Live rock, sand, water, glass, lighting

| # | Subject | URL | License | What it demonstrates |
|---|---|---|---|---|
| 18 | Reef aquarium, Aquarium Berlin (front-on) | https://commons.wikimedia.org/wiki/File:Riffbecken.jpg | Public domain (Haplochromis, 2005) | **The composition reference.** Front-on stocked reef tank: rock massing, coral placement, sand foreground, fish scale against the aquascape. Measured 2026-11-09: luminance mean 0.34, p10 0.11 / p90 0.65; saturation mean 0.33, only 7.8% of pixels > 0.6 — the whole-frame saturation target the rubric is built on. |
| 19 | Wild Reef exhibit, Shedd Aquarium | https://commons.wikimedia.org/wiki/File:Wild_Reef_at_Shedd_Aquarium_5,_2009-11-15.jpg | Verify on file page (Sage Ross, 2009) | Large reef exhibit under display lighting: water clarity at scale, caustic-free even illumination, rock + coral + fish in one frame. |
| 20 | ReefHQ Aquarium, Townsville | https://commons.wikimedia.org/wiki/File:ReefHQ%2C_Townsville.jpg | Verify on file page (Rabs003, 2015) | Big-tank front view: depth layering, background water color, how little of the frame the brightest coral occupies. |
| 21 | Blue Reef Aquarium, Newquay | https://commons.wikimedia.org/wiki/File:Blue_Reef_Aquarium_Newquay_(5884).jpg | Verify on file page (Nilfanion, 2011) | Public-aquarium tank: glass reflections and frame edges visible — the glass reference the scene currently lacks. |
| 22 | Shedd Aquarium exhibits (98 files) | https://commons.wikimedia.org/wiki/Category:Exhibits_at_Shedd_Aquarium | Freely licensed per file; verify each | Caribbean Reef tank and Wild Reef series: the best browse set for tank composition, water color, and fish schooling over reef. |
| 23 | Reef tank, Georgia Aquarium | https://commons.wikimedia.org/wiki/Category:Fish_in_Georgia_Aquarium | Freely licensed per file; verify each | Pacific reef tank video + stills: fish movement over reef, water surface seen from below. |
| 24 | Poly Haven — HDRIs, PBR textures, models | https://polyhaven.com | CC0, all assets; no attribution required | The IBL source for AQ-71/AQ-70.4: real HDR environments for image-based lighting, plus CC0 PBR textures for rock/sand surfaces. |
| 25 | ambientCG — PBR materials, HDRIs, models | https://ambientcg.com | CC0 1.0, all assets; no attribution required | Largest CC0 material library: rock, sand, and concrete/stone PBR sets usable as texture references or (per the $0 rule) as bundled sources with provenance recorded. |
| 26 | ambientCG license page | https://docs.ambientcg.com/license/ | CC0 1.0 (license text) | The license statement to save beside any ambientCG download: "copy, modify, distribute and perform the assets, even for commercial purposes, all without asking permission." |
| 27 | Khronos BarramundiFish glTF sample | https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md | Verify in the README (Khronos sample assets) | A real-time fish model with textures in glTF: the modeling reference for what a shippable fish asset looks like (rig, maps, scale) — not a visual reference. |

## 5. What is deliberately NOT here

- **Sketchfab / CGTrader / Fab listings** (several appear in
  `docs/gemini-research-links.md`): license is per listing and often
  NC/ND/Editorial or paid. Rejected as references for this set until an
  individual listing is verified CC0/CC-BY 4.0 — the same rule as the
  shortlist in §6 below.
- **YouTube videos** (also in `docs/gemini-research-links.md`): useful for
  motion, not for still-frame color/lighting judgment, and the license of a
  video frame is not the license of a photograph. Motion references stay in
  the behavior tasks (AQ-12, AQ-49).
- **HDRMaps freebies**: royalty-free but the license forbids redistributing
  or bundling the image in a 3D scene — rejected for bundling; usable only
  as a lighting look-dev reference with the restriction noted.
- **FreePBR**: free for personal use only; commercial rights cost $16 —
  rejected (paid).

## 6. Asset-source shortlist (AQ-70.1 AC#4)

Per candidate: exact license, attribution, URL, and what it may supply.
Only CC0 / CC-BY 4.0 may be bundled; everything else is listed to record
the rejection.

| Candidate | License | Attribution | URL | Supplies | Verdict |
|---|---|---|---|---|---|
| Poly Haven | CC0 | None required | https://polyhaven.com | HDRIs for IBL (AQ-71), PBR rock/sand textures | **Accepted** — bundle with provenance |
| ambientCG | CC0 1.0 | None required | https://ambientcg.com | PBR materials (rock, sand, stone), HDRIs | **Accepted** — bundle with provenance |
| Wikimedia Commons, individual files marked Public domain or CC BY 4.0 | Public domain / CC BY 4.0 (version as stated on the file page) | As stated on the file page (e.g. "© Ad Meskens / Wikimedia Commons") | Per-file URL in §2–§4 | Photo-derived texture projection, color reference, fish/coral photo reference | **Accepted per file** — verify the file page every time; CC BY 3.0/2.0 are **reference only** (the $0 rule admits CC-BY 4.0, not earlier versions), CC BY-SA is **not** bundlable |
| Wikimedia Commons, files marked CC BY-SA | CC BY-SA (any version) | As stated | Per-file URL | Reference only | **Rejected for bundling** (share-alike encumbers the derivative) |
| Smithsonian Open Access 3D | CC0 (only items explicitly marked CC0) | As stated on the object page | No URL verified in this pass — check the object page before use | Scanned specimens / models | **Candidate, unverified** — per-item verification required; never assume the whole site is clean |
| NOAA / US-government imagery | Public domain (US federal work) | As stated (e.g. NOAA photo credit) | Per-image URL; verify the specific image | Reef / fish photographs | **Candidate, unverified** — verify the specific image is a federal work, not a credited third-party photo |
| Sketchfab (filtered) | Per listing: CC0 / CC-BY 4.0 only | Per listing | Per listing | Fish / coral models | **Accepted only per listing** — reject NC, ND, Editorial, and any paid listing on sight |
| CGTrader, Fab, FreePBR, HDRMaps | Per listing / paid / restrictive | — | — | — | **Rejected** — paid (FreePBR commercial, Fab/CGTrader paid listings), NC/ND/Editorial, or no-redistribution terms (HDRMaps) |
