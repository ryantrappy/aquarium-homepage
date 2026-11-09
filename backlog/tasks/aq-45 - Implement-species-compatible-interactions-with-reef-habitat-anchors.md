---
id: AQ-45
title: Implement species-compatible interactions with reef habitat anchors
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T12:38:00Z'
updated_date: '2026-11-09T11:35:00Z'
labels: []
dependencies:
  - AQ-34
  - AQ-35
  - AQ-44
references:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6850181/
  - >-
    https://www.aquariumofpacific.org/onlinelearningcenter/species/clown_anemonefish
  - https://www.fao.org/fishery/docs/CDrom/bobp/cd1/Bobp/Publns/MAG/021.pdf
  - >-
    https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/
  - https://nrm-fishbaselinux01.nrm.se/Ecology/Ecsenius_stigmatura
  - AQ-18
  - AQ-19
  - AQ-24
  - AQ-25
  - AQ-26
  - AQ-27
  - AQ-32
documentation:
  - docs/fish-behavior-design.md
  - docs/reef-fish-roster.md
priority: '11'
type: enhancement
ordinal: 11
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-34 provides typed 3D habitat locations and AQ-35 describes which locations each species may use; connect those systems through smooth, collision-aware behaviors. Host anemones, hard branching coral, rock, and sand burrows are different habitat types. Existing species tasks describe the visible fish behaviors; this shared task covers reusable approach, hold/enter, forage/perch, retreat, and return handling so those behaviors do not become separate hard-coded path systems for every species.

## Species habitat + coral-interaction research (2026-11-09)

Researched for all 15 roster species in `src/lib/fish.ts` (service fish: yellow tang/Komodo, banggai cardinalfish/WatchMyBirds, royal gramma/Paperless, ocellaris clownfish/Home Assistant, blue tang/Ombi). Sources: Wikipedia (Ocellaris clownfish; Pterapogon; Paracanthurus), FishBase (Gramma loreto; Chromis viridis; Pseudanthias squamipinnis), Animal Diversity Web (Zebrasoma flavescens), Aquarium of the Pacific (yellow tang), Tidal Arc (blue tang), Quality Marine / Oregon Coast Aquarium (chromis), Saltwater Aquarium Blog (lyretail anthias; mandarin dragonet), Tropical Fish Hobbyist Magazine (firefish), WetWebMedia / Encyclopedia.com (watchman-goby pistol-shrimp symbiosis), Hydro Habitats (tailspot blenny), LiveAquaria (six-line wrasse; copperband butterflyfish), Saltcorner / Aquatics Unlimited (McCosker's flasher wrasse), Saltwaterfish.com (flame angelfish), FinHurst / RiuTTA Reef (clownfish–anemone hosting). Layout hotspots for each interaction are drawn in `docs/aquascape-layout.svg` (AQ-70.13).

### Where each species hangs out, and what it does with coral

| Species | Reef zone / water column | Social | Coral / habitat interaction |
|---|---|---|---|
| Ocellaris clownfish (Amphiprion ocellaris) | Sheltered lagoon / outer reef slope, ≤15 m, among host anemones | Pair / small group of 3–5 per anemone | **Obligate symbiosis**: lives only in Heteractis magnifica, Stichodactyla gigantea, S. mertensii in the wild (bubble-tip Entacmaea quadricolor is the accepted captive surrogate); mucus coat defeats nematocysts; fish defends the anemone from butterflyfish and feeds it; eggs laid on a flat surface at the anemone base. |
| Yellow tang (Zebrasoma flavescens) | Shallow reef, sub-surge zone, 2–46 m; lower water column near rock | Solitary / small groups; juveniles territorial | **Grazer**: combs filamentous and macro algae off rock and coral surfaces all day, preventing algae from overgrowing coral; juveniles shelter in branching (finger) coral; adults rest alone in reef crevices at night. |
| Blue tang (Paracanthurus hepatus) | Clear outer reef slopes, channels, terraces, 2–40 m; 1–2 m above the substrate | Pairs / loose groups of 8–14; juveniles school | **Open-water cruiser with a coral refuge**: hovers over isolated Pocillopora eydouxi / Acropora heads and dives into the branches when startled; grazes algae and picks zooplankton among the heads; returns to coral heads and crevices at night. |
| Royal gramma (Gramma loreto) | Reef slopes and walls, 1–60 m, under ledges and in caves | Solitary / loose colonies; territorial around its cave | **Cave/ledge obligate**: claims a shaded cave or overhang, swims belly-to-the-nearest-surface (often upside-down under the ceiling), darts out to snatch drifting food and retreats; facultative cleaner (picks ectoparasites off other fish). |
| Banggai cardinalfish (Pterapogon kauderni) | Shallow sheltered lagoon / reef edge, 1.5–2.5 m | Stable groups ~9; sedentary, strong homing | **Cover-bound hoverer**: adults and juveniles shelter among long-spined Diadema urchins and branching corals (young associate with anemones); hovers motionless near the structure, retreats into spines/branches when threatened; plankton picked from the current. |
| Blue-green chromis (Chromis viridis) | Lagoons / reef flats, 1–20 m, above branching Acropora thickets | Large aggregations (hundreds) | **School above the thicket**: hovers facing the current picking zooplankton; the whole school dives into the Acropora interstices when a predator passes; juveniles stay tied to individual coral heads. |
| Lyretail anthias (Pseudanthias squamipinnis) | Coral outcrops / patch reefs / outer slopes to 35 m | Harems: 1 male + 5–10 females; huge shoals | **Open-water shoaler with a coral bunker**: spends the day 0.6–3 m out in the water column feeding on zooplankton, retreats at speed into branching Acropora/Pocillopora when threatened; males territorial over the harem's outcrop. |
| Firefish (Nemateleotris magnifica) | Reef slopes over sand / rubble, 6–70 m | Solitary / mated pair | **Burrow hoverer**: hangs motionless just above its burrow facing the current, snapping zooplankton; darts head-first into the burrow at the first sign of danger; flicks its long first dorsal spine when threatened. |
| Yellow watchman goby (Cryptocentrus cinctus) | Sandy reef floor at a burrow entrance | Pair with a pistol shrimp | **Mutualism**: shares a burrow dug by a nearly-blind Alpheus pistol shrimp; the goby stands lookout at the mouth and signals danger with tail flicks the shrimp feels through its antennae; retreats backward into the burrow. |
| Mandarin dragonet (Synchiropus splendidus) | Shallow sheltered reef / lagoon rubble, 1–18 m, on the substrate | Solitary / small foraging groups | **Substrate copepod hunter**: hops and hovers on its pelvic fins across sand, rubble and low rock, pecking copepods/amphipods from every crevice; perches on low rock; relies on camouflage and toxic mucus, not speed. |
| Tailspot blenny (Ecsenius stigmatura) | Coastal lagoons / sheltered reefs, rock holes and crevices | Solitary / small groups | **Percher-grazer**: has no functional swim bladder, so it rests directly on rock or coral; perches at a favourite hole, makes short trips to rasp film algae off hard surfaces, darts back into the hole when startled. |
| Six-line wrasse (Pseudocheilinus hexataenia) | Shallow coral branches and crevices | Solitary, territorial | **Crevice patrol hunter**: weaves stop-and-go patrol loops through rockwork and coral branches, darting into crevices to pick small crustaceans, worms and flatworms; sleeps wedged in a tight rock nook. |
| McCosker's flasher wrasse (Paracheilinus mccoskeri) | Outer reef slopes over rubble, 5–40 m, open water just above the reef | Shoaling groups | **Open-water display fish**: feeds on zooplankton above the reef; males flash (flare fins, intensify colour) in display runs; unlike most wrasses it wedges into a rock crevice at night instead of burying in sand. |
| Flame angelfish (Centropyge loricula) | Sheltered coral areas with nearby reef structure | Solitary / pairs | **Rock-face grazer**: roams the reef face picking algae, sponges and detritus off rock and coral; reef-safe with caution — may nip fleshy LPS polyp tissue and clam mantles. |
| Copperband butterflyfish (Chelmon rostratus) | Rocky shores, sheltered reefs, sandy inner-reef areas | Solitary / pairs | **Crevice prober**: uses its long narrow snout to pick Aiptasia, bristleworms and small invertebrates out of holes and crevices; hovers and pecks along the rockwork. |

### Interaction plan — how the scene handles these

Mechanisms (no new systems; build on what exists): AQ-35 profiles (per-species depth bands, compatible anchors, state sets), AQ-44 finite-state runtime (travel / hold / forage / display / flee / recover with elapsed-time timers), AQ-34 typed habitat anchors + navigation, `habitat-anchor-interactions.ts` (approach, hold/enter, retreat, return), AQ-41/AQ-44/AQ-45 schooling (`stepSwimmingSchool` cohesion/alignment + separation), AQ-82 permeable coral zones and socket-derived anchors.

- **Phase 1 — hosting, perching, burrows (mostly built; stage it).** AQ-45 ACs #1–#4 already implement the runtime: clownfish soft-home station-keeping at a host-anemone anchor (never substituting Acropora as host), firefish burrow hover + head-first bolt vs. goby benthic lookout + backward retreat, blenny rock perching, substrate grazing/foraging. Remaining: stage the anchors at the illustrated hotspots (anemone low on the left island, blenny ledge, burrows in the valley sand — see `docs/aquascape-layout.svg`) and wire socket-derived anchors in AQ-82. Asset gate: the bubble-tip anemone asset (`coral-anemone-bta.glb`) already exists in the asset set; what is missing is its staging + visual acceptance, not the anchor.
- **Phase 2 — schooling positions above coral heads.** Chromis and anthias school centroids anchor above the branching Acropora thickets (left crest / right crest) instead of free water; the school's flee state dives the group into the thicket (retreat target = branch interior, using AQ-82 permeable zones). Builds on PR #17 schooling; needs AQ-44 AC #4 event hooks so a group disturbance (not a single-fish activation) triggers the dive.
- **Phase 3 — grazing / probing patrols.** Yellow tang and flame angelfish follow grazing paths along rock faces between grazing anchors (AQ-45 AC #4 anchors exist; add patrol waypoints and a rest-in-crevice state at night-equivalent idle); six-line wrasse runs stop-and-go patrol loops through crevice anchors with peck pauses; copperband hovers and probes crevice anchors with snout-down pauses. All use AQ-44 forage state + AQ-34 navigation; no new path system.
- **Phase 4 — display / territory.** Royal gramma belly-to-rock orientation under its ledge (pose offset on the hold state, not a new rig); flasher-wrasse display runs in open water above the right island (AQ-44 display state + fin-flare overlay when the asset supports it); clownfish anemone defence (chase-off dart at an approaching fish, then return) — needs AQ-44 AC #4 group/single-activation distinction.

**Out of scope / explicitly not modeled:** the pistol shrimp itself (the goby's lookout reads alone; a shrimp asset + burrow-digging animation is a separate modeling task if ever wanted); spawning, mating and anthias sex change; cleaner-client interactions (the gramma's facultative cleaning is noted for a future task, not this one); inter-species aggression beyond the AQ-13 startle; anemone stinging of non-host fish (no predation model). **Needs art first:** dense branching Acropora thickets the chromis/anthias can visibly dive into (AQ-70.11/AQ-59 modeling lane); burrow-mouth visuals at the sand/rock base.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The runtime accepts only profile-compatible typed habitat anchors from AQ-34/AQ-35; incompatible combinations are rejected or safely omitted.
- [x] #2 Ocellaris clownfish can approach and remain near a compatible host-anemone anchor with a tunable soft home region and natural overlap of soft tentacles; no hard-coded universal leash distance or Acropora-as-host substitution is used.
- [x] #3 Firefish hover above and retreat into a sand-burrow entrance, while yellow watchman gobies hold lookout at and retreat backward into a burrow; their distinct profile behaviors are not collapsed into the same movement.
- [x] #4 Tailspot blenny rock-perching and supported roster foraging/grazing interactions use their own compatible rock, rubble, sand, or grazing anchors rather than forcing all small reef fish to perch or burrow.
- [ ] #5 Approach, interaction, retreat, and return trajectories are smooth and collision-aware: fish do not snap to targets or pass through solid reef, and a blocked target causes safe replanning or omission.
- [ ] #6 A review artifact demonstrates at least the host-anemone, sand-burrow, rock-perch, and foraging/grazing interaction categories with the source-supported species assignments.
- [ ] #7 Pausing, hidden-page suspension, reduced motion, and service-link selection remain compatible with the interactions; these behaviors do not delay URL opening.
- [ ] #8 Species habitat + coral-interaction research is recorded in the task with sources, covering all 15 roster species and the 5 service fish (2026-11-09); the interaction plan sequences hosting/perching/burrows → schooling positions above coral heads → grazing/probing patrols → display/territory, naming the mechanism for each (AQ-44 states + AQ-34 anchors + habitat-anchor-interactions.ts) and the asset gates (branching Acropora thickets, burrow-mouth visuals, anemone staging).
- [ ] #9 The review artifact (AC #6) demonstrates the interaction categories against the researched species assignments, including the clownfish–anemone hosting pair at its illustrated hotspot and the chromis/anthias schools positioned above branching coral.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Fixed the yellow-tang grazingSurface clearance failure reported in Root comment #1 in src/rendering/scene/habitat.ts: instantiateReefHabitat() and deriveReefHabitat() now compute anchorClearanceOffset(anchor.compatibleSpecies) = max(MIN_FISH_CLEARANCE, ...compatibleSpecies.map(fishClearanceRadius)) + 0.03 (0.60 scene units for yellow-tang radius 0.57 instead of hard-coded 0.53), restoring reachable grazing routes at both 402x874 mobile and 1440x900 desktop placements (verified in src/rendering/scene/habitat.test.ts).
- Implemented src/rendering/scene/habitat-anchor-interactions.ts and src/rendering/scene/habitat-anchor-interactions.test.ts covering profile-compatible anchor filtering (never substituting branchingCoralShelter/Acropora for hostAnemone), ocellaris-clownfish soft-home anemone station-keeping, firefish burrow hover/head-first bolt vs. yellow-watchman-goby benthic lookout/backward retreat, tailspot-blenny rock perching, and substrate grazing/foraging with collision-checked target resolution and pause/reduced-motion gating.

2026-11-08 audit: Profile-compatible anchor filtering and interaction pose offsets (src/rendering/scene/habitat-anchor-interactions.ts, habitat-anchor-interactions.test.ts) are implemented and tested (ACs #1-#4). Moved to In Progress; permeable coral collision zones and socket-derived anchor wiring in aquarium.ts/motion.ts continue in AQ-82.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-05 13:09
---
Root independent validation of scratch audit4.8 confirms current yellow-tang grazing failure: radius.57 legacy scene units exceeds fixed.53 substrate offset; all12phone/24laptop grazing targets failclearance (prior radius.5 yielded1/12 and3/24). Blue tang is not grazing-compatible and is not the correct example. Resolve semantic anchor clearance from actual geometry and explicit fish envelope under existingAC4/5 and AQ34AC3/6; no invented host/refuge from socketnames. Repro:/tmp/aq58-audit-claims.test.ts.
---
<!-- COMMENTS:END -->
