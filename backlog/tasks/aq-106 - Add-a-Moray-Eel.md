---
id: AQ-106
title: Add a Moray Eel
status: To Do
assignee: []
created_date: '2026-11-14 20:52'
updated_date: '2026-11-14'
labels: []
dependencies: []
priority: '17'
type: enhancement
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a moray eel as a 17th roster species: a crevice-dwelling, nocturnal reef fish whose daytime state is head-and-forebody protruding from a rock crevice, with low-frequency exploratory swims. Builds on AQ-46 (Done, Root-reviewed 2026-11-03), which researched moray and garden eel options and deferred the green moray until a suitable elongated body and reef crevice could be represented well. No species, service mapping, asset, or implementation decision is made in this task yet — see the research section below.
<!-- SECTION:DESCRIPTION:END -->

## Research (2026-11-14)

<!-- SECTION:RESEARCH:BEGIN -->
Research only — no code, no asset, no roster change. Researched against main @ `a498d06` (PR #47 reef canopy/arch and PR #48 merged; only open PR is #49 `refinements` → main, draft) and the `refinements` tip `3182e37` where this task lives. AQ-106 itself was created 2026-11-14 20:52 as a bare stub (frontmatter only); this section is the research needed to start implementation in theory.

### 1. Species decision — the big open call

AQ-46's candidate was the green moray, *Gymnothorax funebris*: maximum 2.5 m (8 ft), common adult 1.5–1.8 m, western Atlantic (New Jersey to Brazil), nocturnal, hides by day in rocky crevices with its head protruding, continuous mouth opening/closing to pump water for respiration. Sources: Florida Museum species profile (https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/green-moray/).

The scale problem: AQ-60 true adult scale (`TANK_UNITS_PER_INCH = 0.16` in `src/rendering/scene/fish-scale.ts`). A green moray at common adult 60 in renders 9.6 world units long — roughly 60% of the tank width. The sailfin at 12 in (1.92 units) was already visually dominant in the tank. A green moray at true scale is unworkable; rendering a subadult would break AQ-60's true-scale rule and needs an explicit, Root-approved exception.

Recommended alternative: snowflake moray, *Echidna nebulosa*. Maximum ~1 m, common adult 50–60 cm (24 in → 3.84 world units, 2× the sailfin, 4× the blue tang). Indo-Pacific — matches the roster's biogeography (the reef's fish and corals are Indo-Pacific; the green moray is Atlantic). Nocturnal crevice-dweller, hunts crustaceans by smell, probes holes, laterally compressed body (119–126 vertebrae) that presses into flattened crevices; most commonly kept moray, hardy, distinctive cream body with black star blotches and yellow flecks; blunt crushing teeth rather than fish-tearing teeth. Sources: FishBase maxima via https://thesea.org/moray-eel-species/ and https://www.redseafishes.com/en/fish/echidna-nebulosa/ ; dimensions https://www.dimensions.com/element/snowflake-moray-echidna-nebulosa (61–91 cm).

Other candidates noted, not recommended: zebra moray, *Gymnomuraena zebra* (~1.5 m, crab crusher, still large); goldentail moray, *Gymnothorax miliaris* (~60 cm, Atlantic). Decision needed from Ryan/Root before any modeling: species first, everything else follows. AQ-46's deferral of *G. funebris* still stands at true scale.

### 2. Biology that constrains the animation

- Daytime state is residence in a reef crevice with head (and a short forebody section) at the opening; foraging is nocturnal and low-frequency. A moray that swims laps all day would read wrong.
- Mouth opening/closing is ventilation (pumping water over the gills), never aggression or threat display. AQ-46 AC #2; do not encode gape as a threat cue.
- Swimming is anguilliform: a traveling lateral body wave. That wave is an animation inference from general anguilliform locomotion research (https://pmc.ncbi.nlm.nih.gov/articles/PMC2981590/), not a measured gait for either candidate species — AQ-46's Root review explicitly retained that evidence gap.
- Snowflake morays hunt by smell with poor eyesight, head low, probing holes; they do not chase. A foraging swim should read as slow probing, not pursuit.

### 3. Assets and licensing — no verified production asset exists

This confirms AQ-46's finding: no verified, licensed, rigged, full-body moray asset was found. Candidates needing license verification before any use:

- "Animated Moray Eel" by kagadoz, Sketchfab (https://sketchfab.com/3d-models/animated-moray-eel-50666dbde27f40268a1a30782c776ccf): 5.4k tris, animated swimming moray, color/normal/cavity/specular/roughness maps included. No CC license shown in search data — license unverified, treat as not usable until proven CC-BY-4.0 or CC0.
- "Moray Eel" by Gomizard, Sketchfab (https://sketchfab.com/3d-models/moray-eel-32268b634b2845a7ae224cffe5580bd3): 15.4k tris, Blender-rigged with 2 albedo textures, described as poseable/animatable. License unverified.
- UW Ichthyology *E. nebulosa* CT scan, Sketchfab (https://sketchfab.com/3d-models/uw-006520-echidna-nebulosa-43303d51e8b14574b1a0bdd4a794454e): 2.8M tris — a specimen scan, not an animatable body.
- Florida Museum green moray neurocranium (skull only, 500k tris) — not a body.
- "Moray eel minecraft" by jimzx (CC-BY) is a block model — not usable. A CC-BY "snowflake" model by Noahthebest.223 (3k tris, Nov 2026, 0 downloads, no description) is unverified and likely not an eel at all.

Realistic path: the Blender modeling lane (Blender 4.2.0 verified headless, as with the coral PoC), or license verification plus re-rig of kagadoz/Gomizard. The $0 asset policy (CC0 / CC-BY-4.0 / custom only) applies; the standing CC-BY-NC-4.0 flag on the existing clownfish/blue-tang/sailfin copies is a caution, not a precedent. Any new model must be rigged for anguilliform flex — the existing Lighthill flex (PR #14) displaces lateral X along long axis Z, and a moray needs a larger-amplitude traveling wave, likely a flex extension or a dedicated gait (see §4).

### 4. Repo fit — what changes, what is missing

- Roster (`src/lib/fish.ts`): 16 species today; a moray would be #17. Addition points follow the sailfin pattern (PR #37): `fish.ts` entry + thumbnail, behavior profile, scale tables, turning archetype, locomotion extension, provenance.
- Behavior (`src/lib/fish-behavior.ts`): the `HabitatAnchor` type already includes `rockCrevice`, and royal gramma et al. use it — but AQ-82 deliberately did NOT derive `rockCrevice` anchor positions from measured rock sockets. A moray needs either a socket-derived crevice anchor (AQ-82 follow-up) or a dedicated crevice in new rockwork; PR #47's limestone arch has a genuine through-opening and 4 coral mounts, but those mounts are coral mounts, not crevices. No `habitatMode` fits a crevice-dweller (closest: `sheltered-reef`, `burrow-associated`); no gait in the union is anguilliform (closest: `sinuous-cover-search`, `body-caudal-undulation`). A new mode and/or gait is needed, plus a crevice-residence state — the current `idle`/`swim`/`forage` states do not model "head out of a hole all day."
- Scale (AQ-60, `src/rendering/scene/fish-scale.ts` + `docs/fish-scale-reference.md`, test-parsed): a new row is needed — FishBase max plus a project-selected render-length target — plus entries in `FISH_RENDER_LENGTH_INCHES`, `MODEL_SWIM_AXIS_LENGTH` (measured from the GLB; the scale test re-reads the file and fails on drift), and `SPRITE_ARTWORK_LENGTH_FRACTION`. Collision is a real design constraint: `fishClearanceRadius` is `max(0.5, length/2 + 0.05)`, so a 24-in moray gets a 1.97-unit clearance radius; the legacy envelope assumes compact fish, and a swimming eel needs a length-aware treatment (or crevice-bound routing with short excursions). `fishBodyRadiusM` clamps to [0.04, 0.08] — fine for the moray's thin body in separation, but its length dominates navigation.
- Budgets (AQ-70.3, `docs/photorealism-budgets.md` + `src/rendering/assets/budgets.ts`): hero-fish class caps are 2 MiB file / 25,000 tris / 1024 px textures / 16 MiB GPU per asset; totals are 24 MiB fish / 40 MiB scene / 256 MiB GPU. Latest measured totals (PR #47 review, head `573715b`, now in main): scene 38.69 MB of 40 MiB, ~218 MB GPU of 256 MiB — headroom is thin and the `refinements` branch adds more, so a moray GLB must fit the per-asset caps and the totals need re-measuring at implementation time. Note the PR #47 review's budgets gap: new `custom-colonies`/`custom-rocks` manifests are not wired into `budgets.test.ts`.
- Service decision (AQ-75, needs Ryan): 5 services map to 5 fish (`src/lib/services.ts`). A 17th species needs a call before modeling, since it determines whether the moray is pickable and labelled: a new service link, an ambiance fish (AQ-93 — design-only, no code until Root accepts the design), or display-only like the sailfin was.
- Gates: AQ-45 interaction architecture — design doc merged (PR #35) but Root acceptance is still pending and Phase 0 must not start before it; the moray's crevice residence and exploratory swim are AQ-45-style anchor interactions. AQ-79 per-species Root review governs model promotion. AQ-78 covers the 15-species hero end state, so a 17th species sits outside it; AQ-70.9/AQ-70.10 are the modeling-lane precedent.
- Labels and clicks: a mostly-hidden crevice fish shows only its head most of the day — label anchoring (AQ-89) and click targets (tracker #17, scattered ACs) need thought so the label does not float over rock.
- PR #46's surface-model question (physical Snell 2.66 vs proxy 4.4) is orthogonal to the moray — it lives at reef/sand, not the surface — but the branch it lands on matters: `refinements` (PR #49, draft) is the current work branch; main is `a498d06`.

### 5. Proposed implementation outline (theory only)

1. Ryan/Root pick the species (recommendation: snowflake moray, *Echidna nebulosa*).
2. Decide service vs ambiance vs display-only (AQ-75 / AQ-93) — before modeling.
3. Asset: Blender-model a rigged moray (or verify kagadoz/Gomizard license and re-rig); KTX2 textures; validate against the asset contract and budgets.
4. Crevice: derive a `rockCrevice` anchor from measured sockets (AQ-82 follow-up) or place in the PR #47 arch; verify with socket-style checks.
5. Behavior: new or extended gait (anguilliform traveling wave) + crevice-residence state + low-frequency nocturnal exploratory swim; mouth ventilation articulation on the AQ-74 pattern; never encode gape as aggression.
6. Roster wiring: `fish.ts`, `fish-behavior.ts` profile, `fish-scale.ts` + scale-reference row, thumbnail, services/ambiance decision, tests (the scale test re-measures the GLB).
7. Visual verification at 1440×900 and 402×874 plus Root art acceptance on the AQ-79 pattern.

### 6. Open decisions

- Species: snowflake (recommended) vs green moray vs other.
- Render length: true adult scale per AQ-60, or an explicit subadult exception (green moray only).
- Service link vs ambiance vs display-only.
- Crevice location: socket-derived anchor vs arch opening vs new rockwork.
- Asset path: Blender-modeled vs licensed-model verification.

<!-- SECTION:RESEARCH:END -->
