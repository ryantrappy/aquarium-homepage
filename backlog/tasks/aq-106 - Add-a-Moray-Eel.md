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
Add a snowflake moray eel (*Echidna nebulosa*) as a 17th roster species. It lives in a rock crevice permanently: only the head and forebody protrude, and only that front portion is modeled and rendered. Daytime state is head-out residence with gentle sway and mouth ventilation; it never free-swims. Builds on AQ-46 (Done, Root-reviewed 2026-11-03), which researched moray and garden eel options and deferred the green moray until a suitable elongated body and reef crevice could be represented well. Species and cave-dwelling scope decided by Ryan 2026-11-14 (see decisions below); service mapping, asset, and crevice location are still open.
<!-- SECTION:DESCRIPTION:END -->

## Decisions recorded (2026-11-14)

<!-- SECTION:DECISIONS:BEGIN -->
- **Species: snowflake moray, *Echidna nebulosa*** (Ryan, 2026-11-14). Replaces AQ-46's green-moray candidate; see §1 for the scale reasoning.
- **Cave-dwelling assumption (Ryan, 2026-11-14): the eel lives and stays in the cave all the time.** Only the front portion (head + forebody) needs to be rendered/modeled, and motion stays limited in scope: head sway, mouth ventilation, slow head probe in/out. No free-swimming, no exploratory swim, no anguilliform traveling wave in open water. This removes the swimming-eel navigation and clearance problem entirely and shrinks the modeling, animation, and budget scope.
<!-- SECTION:DECISIONS:END -->

## Research (2026-11-14)

<!-- SECTION:RESEARCH:BEGIN -->
Research only — no code, no asset, no roster change. Researched against main @ `a498d06` (PR #47 reef canopy/arch and PR #48 merged; only open PR is #49 `refinements` → main, draft) and the `refinements` tip `3182e37` where this task lives. AQ-106 itself was created 2026-11-14 20:52 as a bare stub (frontmatter only). Updated 2026-11-14 ~15:33 CST with the snowflake decision, the cave-dwelling assumption, a verified asset search, and a budget fit measured from the live manifests on `refinements`.

### 1. Species decision — decided: snowflake moray

AQ-46's candidate was the green moray, *Gymnothorax funebris*: maximum 2.5 m (8 ft), common adult 1.5–1.8 m, western Atlantic (New Jersey to Brazil), nocturnal, hides by day in rocky crevices with its head protruding, continuous mouth opening/closing to pump water for respiration. Sources: Florida Museum species profile (https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/green-moray/).

The scale problem: AQ-60 true adult scale (`TANK_UNITS_PER_INCH = 0.16` in `src/rendering/scene/fish-scale.ts`). A green moray at common adult 60 in renders 9.6 world units long — roughly 60% of the tank width. The sailfin at 12 in (1.92 units) was already visually dominant. A green moray at true scale is unworkable; rendering a subadult would break AQ-60's true-scale rule and needs an explicit, Root-approved exception.

**Decision (Ryan, 2026-11-14): snowflake moray, *Echidna nebulosa*.** Maximum ~1 m, common adult 50–60 cm (24 in → 3.84 world units, 2× the sailfin, 4× the blue tang). Indo-Pacific — matches the roster's biogeography (the reef's fish and corals are Indo-Pacific; the green moray is Atlantic). Nocturnal crevice-dweller, hunts crustaceans by smell, probes holes, laterally compressed body (119–126 vertebrae) that presses into flattened crevices; most commonly kept moray, hardy, distinctive cream body with black star blotches and yellow flecks; blunt crushing teeth rather than fish-tearing teeth. Sources: FishBase maxima via https://thesea.org/moray-eel-species/ and https://www.redseafishes.com/en/fish/echidna-nebulosa/ ; dimensions https://www.dimensions.com/element/snowflake-moray-echidna-nebulosa (61–91 cm).

Other candidates noted, not chosen: zebra moray, *Gymnomuraena zebra* (~1.5 m, crab crusher, still large); goldentail moray, *Gymnothorax miliaris* (~60 cm, Atlantic). AQ-46's deferral of *G. funebris* still stands at true scale.

### 2. Biology that constrains the animation

- Daytime state is residence in a reef crevice with head (and a short forebody section) at the opening; foraging is nocturnal and low-frequency. A moray that swims laps all day would read wrong. Under the cave-dwelling assumption this is the *only* state: the eel never leaves the crevice.
- Mouth opening/closing is ventilation (pumping water over the gills), never aggression or threat display. AQ-46 AC #2; do not encode gape as a threat cue.
- Swimming is anguilliform: a traveling lateral body wave. That wave is an animation inference from general anguilliform locomotion research (https://pmc.ncbi.nlm.nih.gov/articles/PMC2981590/), not a measured gait for either candidate species — AQ-46's Root review explicitly retained that evidence gap. **Under the cave-dwelling assumption no swimming gait is needed at all** — motion is head sway, ventilation gape, and a slow head probe, all local to the crevice mouth.
- Snowflake morays hunt by smell with poor eyesight, head low, probing holes; they do not chase. A foraging probe should read as slow and deliberate, not pursuit.

### 3. Assets and licensing — no usable licensed asset; modeling lane, now much smaller

Verified 2026-11-14 via the Sketchfab API (license, downloadable flag, face count) plus thumbnail inspection. No verified, licensed, rigged, full-body snowflake moray asset exists. Full results:

- "Animated Moray Eel" by kagadoz (https://sketchfab.com/3d-models/animated-moray-eel-50666dbde27f40268a1a30782c776ccf): 5,378 faces, 1 animation, textures included. **Not downloadable; no license object returned.** Not usable.
- "Moray Eel" by Gomizard (https://sketchfab.com/3d-models/moray-eel-32268b634b2845a7ae224cffe5580bd3): 15,394 faces, Blender-rigged. License is **Sketchfab Standard, not downloadable.** Not usable under the $0 CC0/CC-BY-4.0 policy.
- UW Ichthyology *E. nebulosa* CT scan (https://sketchfab.com/3d-models/uw-006520-echidna-nebulosa-43303d51e8b14574b1a0bdd4a794454e): 2,818,084 faces. A specimen scan, not an animatable body; not downloadable, no license. Not usable.
- "Snowflake Eel Head And Pharyngeal Jaws" (Sketchfab search "snowflake moray" / "echidna nebulosa"): a head/jaws model only, not downloadable, no license. Not usable — but it confirms a head-only model is a recognized form.
- "Moray eel- Fishy" by vaporclaws (https://sketchfab.com/3d-models/moray-eel-fishy-1300d47937d44bb79d0781cc21ea653d): **CC-BY-4.0, downloadable**, 4,426 faces. Thumbnail inspected: a cartoonish yellow eel head with large googly eyes and dark speckles — stylized, wrong pattern (not snowflake cream/black stars), a student assignment ("For Compulsory Assignment 4"). Not photoreal; not usable as the asset, though it demonstrates a head-only model.
- "Moray Eel Lion fish" by eirav (https://sketchfab.com/3d-models/moray-eel-lion-fish-0856fe3799df49dd8936a1172c088103): **CC-BY-4.0, downloadable**, 34,948 faces (over the 25k hero tri cap). Thumbnail inspected: a fantasy lionfish-moray hybrid with a huge spiky dorsal fin — not a moray eel at all. Not usable.
- A CC-BY-4.0 "snowflake" model by Noahthebest.223 (2,992 faces, downloadable) was thumbnail-inspected: it is a geometric snowflake (the weather kind), not an eel. Not usable.
- "Yellow Moray Eel" by MotionCow and "Moray Eel (Low Poly)" are paid/Standard-license store models. Not usable.

**Conclusion: the realistic path is the Blender modeling lane** (Blender 4.2.0 verified headless, as with the coral PoC). Under the cave-dwelling assumption the model is only the head + forebody (~8–10 in visible, tapering to a hidden stub inside the rock) with the snowflake pattern (cream + black star blotches + yellow flecks) on the visible portion, mouth articulation on the AQ-74 pattern, and eyes. That is a materially smaller modeling job than a full rigged eel — no full-body rig, no swim-cycle animation.

### 4. Repo fit — what changes, what is missing

- Roster (`src/lib/fish.ts`): 16 species today; a moray would be #17. Addition points follow the sailfin pattern (PR #37): `fish.ts` entry + thumbnail, behavior profile, scale tables, turning archetype, locomotion extension, provenance. **Under the cave-dwelling assumption the eel needs no turning archetype, no locomotion extension, and no swim routing** — it is a fixed crevice resident, closer to AQ-105's mounted-anemone hosting than to a swimming fish.
- Behavior (`src/lib/fish-behavior.ts`): the `HabitatAnchor` type already includes `rockCrevice`, and royal gramma et al. use it — but AQ-82 deliberately did NOT derive `rockCrevice` anchor positions from measured rock sockets. **The crevice anchor is now the gating work**: one good crevice with the head visible, derived from measured sockets (AQ-82 follow-up) or purpose-built in the arch/rockwork; PR #47's limestone arch has a genuine through-opening and 4 coral mounts, but those mounts are coral mounts, not crevices. No `habitatMode` fits a permanent crevice-dweller (closest: `sheltered-reef`, `burrow-associated`); a new mode (e.g. `crevice-dwelling`) with essentially one residence state is the clean fit — the current `idle`/`swim`/`forage` states do not model "head out of a hole all day," and no swim/forage/retreat transitions are needed.
- Scale (AQ-60, `src/rendering/scene/fish-scale.ts` + `docs/fish-scale-reference.md`, test-parsed): a new row is needed — FishBase max (100 cm / ~39 in) plus a project-selected render-length target (recommend 24 in, common adult). **The visible-length question is new**: the species' total length is 24 in but only ~8–10 in is modeled/visible. Record the full species length in the doc and model the front portion at that scale (so the head is true-scale); record the visible length alongside it. `fish-scale.test.ts` parses the render-length column, so the implementation must decide what `FISH_RENDER_LENGTH_INCHES` holds for this species (full length, with the model covering only the front) and document it. The old collision problem is gone: `fishClearanceRadius` (max(0.5, length/2 + 0.05) → 1.97 units for a 24-in eel) assumed a swimming fish; a fixed crevice resident has no swim envelope — collision is just "do not put the crevice where fish swim through," i.e. the eel is part of the rock.
- Budgets (AQ-70.3, `docs/photorealism-budgets.md` + `src/rendering/assets/budgets.ts` + `budgets.test.ts`): measured from the live manifests on `refinements` @ `3182e37`:
  - Hero fish (6): 8,058,860 B (7.69 MiB) of 12 MiB; ~97k tris of 150k. Headroom 4.31 MiB.
  - Background fish (13 splat): 11,506,440 B (10.97 MiB) of 32.5 MiB.
  - Coral (8): 13,221,416 B (12.61 MiB) of 20 MiB. Rock (2): 2,421,276 B (2.31 MiB) of 5 MiB.
  - Enforced-manifest total: 35,207,992 B (33.58 MiB).
  - Scene total (doc cap 40 MiB): the PR #47 review measured 38.69 MB at head `573715b` (including the unenforced custom-colonies/custom-rocks manifests and proof assets); re-measure on `refinements` at implementation time — the custom manifests are still not wired into `budgets.test.ts`.
  - **Fit verdict for a head+forebody model: fits easily per-asset** (comparable Blender hero fish are ~1.3 MB / ~16k tris; a partial eel should land well under 1 MB and ~5–10k tris, inside the 2 MiB / 25k tris / 16 MiB GPU hero caps, with 1–2 KTX2 maps). The binding constraint is the scene total: at ~38.69/40 MiB a ~0.5–1 MB addition leaves only ~0.3–0.8 MiB headroom — it fits, but only just, and the totals must be re-measured before landing. **Also required: `budgets.test.ts` hardcodes hero-fish count == 6** (and coral == 8, rock == 2) with the comment "A roster change must re-derive the budgets" — adding a 7th hero fish (or a new crevice-creature class) requires re-deriving `budgets.ts`, the test's roster-shape assertions, and the doc. Phase 0 blocking bytes (3.5 MiB cap) are unaffected: the moray is not a first-paint service fish; it loads with the reef or lazily.
- Service decision (AQ-75, needs Ryan): 5 services map to 5 fish (`src/lib/services.ts`). The visible head is the click target; a snowflake head at true scale is ~2–3 in long, so the 44px minimum target likely needs the label pill to carry the click, as with other small fish. Decide before modeling: a new service link, an ambiance fish (AQ-93 — design-only, no code until Root accepts the design), or display-only like the sailfin was.
- Gates: AQ-45 interaction architecture — design doc merged (PR #35) but Root acceptance is still pending and Phase 0 must not start before it; the moray's crevice residence is an AQ-45-style anchor interaction, but with no swim states it is the smallest possible such interaction. AQ-79 per-species Root review governs model promotion. AQ-78 covers the 15-species hero end state, so a 17th species sits outside it; AQ-70.9/AQ-70.10 are the modeling-lane precedent.
- Labels and clicks: the label anchors to the visible head and must not float over rock (AQ-89 label anchoring).
- PR #46's surface-model question (physical Snell 2.66 vs proxy 4.4) is orthogonal to the moray — it lives at reef/sand, not the surface — but the branch it lands on matters: `refinements` (PR #49, draft) is the current work branch; main is `a498d06`.

### 5. Proposed implementation outline (theory only)

1. Species decided (snowflake moray). Cave-dwelling scope decided.
2. Decide service vs ambiance vs display-only (AQ-75 / AQ-93) — before modeling.
3. Crevice first: derive one `rockCrevice` anchor from measured sockets (AQ-82 follow-up) or place in the PR #47 arch; verify with socket-style checks. The crevice is the feature; the eel is its occupant.
4. Asset: Blender-model head + forebody (~8–10 in visible, tapering to a hidden stub), snowflake pattern, mouth articulation (AQ-74 pattern), eyes; KTX2 textures; validate against the asset contract and budgets; re-derive `budgets.ts` / `budgets.test.ts` roster counts and re-measure scene totals.
5. Behavior: new `crevice-dwelling` mode with a single residence state — head sway, ventilation gape, slow head probe; no swim, no gait, no turning, no routing. Never encode gape as aggression.
6. Roster wiring: `fish.ts`, `fish-behavior.ts` profile, `fish-scale.ts` + scale-reference row (full length + visible length), thumbnail, services/ambiance decision, tests (the scale test re-measures the GLB).
7. Visual verification at 1440×900 and 402×874 plus Root art acceptance on the AQ-79 pattern.

### 6. Open decisions

- ~~Species~~ — decided: snowflake moray (Ryan, 2026-11-14).
- ~~Swim vs cave~~ — decided: cave-dwelling, front portion only (Ryan, 2026-11-14).
- Render length: recommend 24 in (common adult); visible modeled length ~8–10 in — confirm.
- Service link vs ambiance vs display-only.
- Crevice location: socket-derived anchor vs arch opening vs new rockwork.
- Asset path: Blender modeling (recommended) — no usable licensed asset found.

<!-- SECTION:RESEARCH:END -->
