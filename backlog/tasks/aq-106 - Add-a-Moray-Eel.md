---
id: AQ-106
title: Add a Moray Eel
status: To Do
assignee: []
created_date: '2026-11-14 20:52'
updated_date: '2026-11-14 22:25'
labels:
  - gemini-research
  - modeling
dependencies:
  - AQ-46
  - AQ-60
  - AQ-70.3
  - AQ-74
  - AQ-82
  - AQ-89
references:
  - src/rendering/scene/fish-scale.ts
  - src/rendering/scene/fish-scale.test.ts
  - src/lib/fish-behavior.ts
  - src/lib/fish.ts
  - src/rendering/scene/reef-assembly.ts
  - src/rendering/scene/reef-layout.ts
  - src/rendering/assets/contract.ts
  - src/rendering/assets/budgets.ts
  - src/rendering/scene/fish-label-layout.ts
  - src/rendering/scene/fish-link-projection.ts
  - src/rendering/scene/aquarium.ts
  - src/components/AquariumScene.tsx
documentation:
  - docs/fish-scale-reference.md
  - docs/photorealism-budgets.md
priority: '17'
type: enhancement
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a snowflake moray eel (*Echidna nebulosa*) as a 17th roster species. It lives in a rock crevice permanently: only the head and forebody protrude, and only that front portion is modeled and rendered. Daytime state is head-out residence with gentle sway and mouth ventilation; it never free-swims. Builds on AQ-46 (Done, Root-reviewed 2026-11-03), which researched moray and garden eel options and deferred the green moray until a suitable elongated body and reef crevice could be represented well. Species and cave-dwelling scope were decided by Ryan 2026-11-14 (recorded in Comments below); service mapping, asset, and crevice location are still open. Research behind this task is in Implementation Notes below.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Crevice anchor on the left island with measured coordinates: one `rockCrevice` anchor derived from measured mouth coordinates of the left island's pass-through cave (`src/rendering/scene/reef-assembly.ts` documents the cave exists but has no measured mouth coordinates). The center arch and right island are excluded: the arch only mounts at width >= 600 (`src/rendering/scene/aquarium.ts:920`) and the phone viewport mounts only the left island (`src/rendering/scene/reef-layout.ts` PHONE_REEF). The anchor must not be derived from coral sockets — `contract.ts` restricts `socket_*` nodes to role `coral-mount` and all 12 left / 11 right sockets are coral mounts.
- [ ] #2 Behavior profile fits the existing schema: the moray profile passes `validateSpeciesBehaviorProfiles` — `idle` (head-out sway/ventilation at `rockCrevice`) + `swim` (slow local head probe at `rockCrevice`), mirroring the ocellaris-clownfish host-associated pattern (`sheltered-reef` mode, `crevice-inspection` gait) with the standard idle/swim transitions. No new `habitatMode` and no schema relaxation unless the mirror proves unworkable, in which case the relaxation is an explicit, Root-approved decision. Roster/test counts updated 16 → 17 (`src/lib/fish.test.ts`, `src/lib/fish-behavior.test.ts`); runtime handling of a near-stationary `swim` state confirmed in `src/simulation/behavior-runtime.ts`.
- [ ] #3 Partial-body scale rule: `fish-scale.ts` gains an explicit modeled/visible-length field (or partial-body scale rule) alongside the 24 in adult reference length. `FISH_RENDER_LENGTH_INCHES` holds 24 (species length); the GLB's modeled forebody (~8–10 in) renders true-scale with no 2.5–3x stretch (`fishModelScale` scales by the full length today). `MODEL_SWIM_AXIS_LENGTH` equals the measured GLB extent, `fish-scale.test.ts` passes, and `projectFishLinkBounds` / `updateVisibility` use the visible length for the link hitbox.
- [ ] #4 Label, occlusion, and click handling for a crevice fish: the label anchors to the visible head and does not sit over rock (rock-aware placement in `resolveLabelDeconflicts` or equivalent — it currently checks only fish bodies and captions). `updateVisibility` sample points / root placement account for the protruding head so the label is not hidden by the rock cavity (`ray.far = distToFish - 0.05` against `reefMeshes`). Click handling confirmed: the `.fish-name` caption carries the click, or a crevice/head collider allowance is added if `serviceAt` raycast against surrounding rock proves insufficient.
- [ ] #5 FishBase verification: `docs/fish-scale-reference.md` gains the moray row with the direct FishBase link `https://www.fishbase.se/summary/Echidna-nebulosa` — max 100.0 cm TL, common 50.0 cm TL, directly retrieved 2026-11-14. No third-party source is substituted for the FishBase max column (per the doc's own rule; its fallback is FishBase's own indexed summary content).
- [ ] #6 KTX2 loader prerequisite: `KTX2Loader` + the Basis Universal transcoder are wired into `aquarium.ts` (under `public/basis/`) before any KTX2 moray GLB lands. The moray GLB ships KTX2 textures per the budgets rule (`budgets.ts`: non-grandfathered assets must be `image/ktx2`).
- [ ] #7 Manifest and budgets: the moray is owned by the hero-fish manifest (`src/rendering/assets/fish/manifest.json`) — recommended; the splat-fish rig contract (8 joints / 8 rotation channels / 3 PBR textures) does not apply to a Blender-modeled partial eel. `budgets.ts`, the `budgets.test.ts` roster-shape assertions (hero-fish 6 → 7), and `docs/photorealism-budgets.md` are re-derived; scene totals are re-measured at implementation (GPU headroom ~218/512 MiB after PR #52 raised the cap).
- [ ] #8 Service decision before modeling: service link vs ambiance vs display-only decided (AQ-75 / AQ-93). AQ-93 explicitly excludes hero species and requires Root design approval before implementation, so a display-only or ambiance moray needs an AQ-93 amendment or a service link — it is not available as-is.
- [ ] #9 Visual verification at 1440×900 and 402×874 plus Root art acceptance on the AQ-79 pattern. Mouth ventilation is never encoded as aggression.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
- [ ] #3 Model promotion follows the AQ-79 per-species Root-review routing (no automatic swap; Root reviews the model before it goes live).
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-14: PR #50 review addressed — the task was restructured from custom `SECTION:DECISIONS` / `SECTION:RESEARCH` blocks (ignored by the `backlog` CLI) into the standard parsed sections (Description, Acceptance Criteria, Definition of Done, Implementation Notes, Comments). All six review threads were verified against the `refinements` branch and the repo-fit corrections below replace the original §4 where they differ. No research content was deleted; FishBase maxima are now direct FishBase values (see §1).

Research only — no code, no asset, no roster change. Researched against main @ `a498d06` (PR #47 reef canopy/arch and PR #48 merged; only open PR is #49 `refinements` → main, draft) and the `refinements` tip `3182e37` where this task lives. AQ-106 itself was created 2026-11-14 20:52 as a bare stub (frontmatter only). Updated 2026-11-14 ~15:33 CST with the snowflake decision, the cave-dwelling assumption, a verified asset search, and a budget fit measured from the live manifests on `refinements`.

### 1. Species decision — decided: snowflake moray

AQ-46's candidate was the green moray, *Gymnothorax funebris*: maximum 2.5 m (8 ft), common adult 1.5–1.8 m, western Atlantic (New Jersey to Brazil), nocturnal, hides by day in rocky crevices with its head protruding, continuous mouth opening/closing to pump water for respiration. Sources: Florida Museum species profile (https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/green-moray/).

The scale problem: AQ-60 true adult scale (`TANK_UNITS_PER_INCH = 0.16` in `src/rendering/scene/fish-scale.ts`). A green moray at common adult 60 in renders 9.6 world units long — roughly 60% of the tank width. The sailfin at 12 in (1.92 units) was already visually dominant. A green moray at true scale is unworkable; rendering a subadult would break AQ-60's true-scale rule and needs an explicit, Root-approved exception.

**Decision (Ryan, 2026-11-14): snowflake moray, *Echidna nebulosa*.** Maximum 100.0 cm TL, common length 50.0 cm TL — verified directly from the FishBase summary page (https://www.fishbase.se/summary/Echidna-nebulosa, retrieved 2026-11-14; Ref. 48635 for the maximum, Ref. 3258 for common length). The page also confirms vertebrae 119–126 and the behavior the design relies on: "Solitary, seen usually in the open or with only head exposed." Indo-Pacific — matches the roster's biogeography (the reef's fish and corals are Indo-Pacific; the green moray is Atlantic). Nocturnal crevice-dweller, hunts crustaceans by smell, probes holes, laterally compressed body that presses into flattened crevices; most commonly kept moray, hardy, distinctive cream body with black star blotches and yellow flecks; blunt crushing teeth rather than fish-tearing teeth. The render target of 24 in (61 cm) sits between the FishBase common length (50 cm / 19.7 in) and maximum (100 cm / 39.4 in), following the established pattern of rendering below the maximum (yellow tang 6.5 vs 7.9, blue tang 9 vs 12.2, sailfin 12 vs 15.7). At 24 in the eel is 3.84 world units — 2× the sailfin, 4× the blue tang. Note: third-party sources (thesea.org, redseafishes.com, dimensions.com) were used for background only and are NOT accepted for the FishBase max column — `docs/fish-scale-reference.md:24` forbids third-party substitution; its fallback is FishBase's own indexed summary content.

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

**KTX2 loader gap (PR #50 review, verified on `refinements`):** `budgets.ts:288-293` requires `image/ktx2` for every non-grandfathered manifest asset, but `aquarium.ts:504` instantiates a plain `new GLTFLoader()` with no `KTX2Loader`, no `KTX2Loader` appears anywhere in the repo, and there is no Basis Universal transcoder under `public/` (`public/basis/basis_transcoder.js` does not exist on `refinements`). The coral PoC wired a `KTX2Loader` on the unmerged `modeling/coral-bommie-poc` branch — that does not count as wired. Wiring the loader + transcoder into `aquarium.ts` is a prerequisite before any KTX2 moray GLB can load (AC #6).

### 4. Repo fit — what changes, what is missing (corrected per PR #50 review)

- Roster (`src/lib/fish.ts`): 16 species today; a moray would be #17. Addition points follow the sailfin pattern (PR #37): `fish.ts` entry + thumbnail, behavior profile, scale tables, turning archetype, locomotion extension, provenance. **Under the cave-dwelling assumption the eel needs no turning archetype, no locomotion extension, and no swim routing** — it is a fixed crevice resident, closer to AQ-105's mounted-anemone hosting than to a swimming fish.
- Crevice anchor — the gating work, corrected: the anchor MUST be measured mouth coordinates on the **left island**. The center arch only mounts at width >= 600 (`aquarium.ts:920`) and the phone viewport mounts only the left island (`reef-layout.ts` PHONE_REEF), so a crevice in the arch or right island means the moray (and any service link) does not exist on the 402×874 target viewport. `rockCrevice` cannot be derived from coral sockets: `contract.ts:39-48` restricts `socket_*` nodes to role `coral-mount` across 6 coral archetypes, and all 12 left / 11 right sockets in `reef-assembly.ts:798-825` are already coral mounts. The code already documents the gap: `reef-assembly.ts:794-796` says `rockCrevice` is deliberately NOT derived here because "the left island's pass-through cave has no measured mouth coordinates, and socket names alone never create habitat anchors (AQ-14.3 AC #3)." Measuring those cave-mouth coordinates is the gating work; the alternative is an explicit `contract.ts` extension for a crevice socket kind.
- Behavior (`src/lib/fish-behavior.ts`, verified): `profileSchema` requires both `states.idle` and `states.swim` (non-optional; `forage`/`retreat`/`display`/`burst` optional), `transitions.min(1)`, and strictly positive `speedTankWidthsPerSecond` / `turnDegreesPerSecond` ranges. `validateSpeciesBehaviorProfiles` (lines 499–584) also requires profile keys to match the catalog exactly, and `fish.test.ts:8` / `fish-behavior.test.ts:15` assert 16 species/profiles today. The schema does **not** force a new `habitatMode`: the ocellaris-clownfish pattern already fits — `host-associated` mode with `idle` (hold and bob at the anchor) + `swim` (short station-keeping loop at the same anchor) + `retreat`, using the shared idle/swim transitions. The moray mirrors it with `sheltered-reef` mode, `anchors: ['rockCrevice']`, `idle` = head-out sway/ventilation, `swim` = slow local head probe, gait `crevice-inspection` (already in the gait enum). A schema relaxation is the fallback only if the mirror proves unworkable, and it would be an explicit Root-approved decision. One stale string to fix at implementation: `fish-behavior.ts:510` still says "the 15 stable species IDs" although the roster is 16. Runtime handling of a near-stationary `swim` state in `src/simulation/behavior-runtime.ts` must be confirmed at implementation (AC #2).
- Scale (AQ-60, `src/rendering/scene/fish-scale.ts` + `docs/fish-scale-reference.md`, test-parsed) — corrected for the partial body: `fishModelScale(id)` (`fish-scale.ts:89-93`) scales the GLB uniformly by `fishRenderLength(id) / MODEL_SWIM_AXIS_LENGTH[id]`, and `fish-scale.test.ts:90-102` enforces `MODEL_SWIM_AXIS_LENGTH[id]` equals the GLB's measured swim-axis extent and the rendered length matches `FISH_RENDER_LENGTH_INCHES[id] * 0.16`. If `FISH_RENDER_LENGTH_INCHES` holds 24 (3.84 world units) while the GLB only models an 8–10 in forebody, the head would be stretched ~2.5–3x oversized, and `projectFishLinkBounds` (`fish-link-projection.ts:22-31`, link size from `bodyLength`) would project a 3.84-unit hitbox across neighboring corals/fish. So the implementation needs an explicit modeled/visible-length field (or partial-body scale rule) alongside the full 24 in adult reference length: record the full species length in the doc, model the front portion at that scale so the head is true-scale, and use the visible length for rendering, link bounds, and clearance. The old collision problem is gone: `fishClearanceRadius` (max(0.5, length/2 + 0.05) → 1.97 units for a 24-in eel) assumed a swimming fish; a fixed crevice resident has no swim envelope — collision is just "do not put the crevice where fish swim through," i.e. the eel is part of the rock. The scale doc row (AC #5) uses the direct FishBase values from §1.
- Labels and clicks — corrected: `resolveLabelDeconflicts` (`fish-label-layout.ts:88-93`) only checks overlaps against fish bodies and other captions, not rock meshes, so a label tucked under/beside a head emerging from a rock face will sit over rock unless rock-aware placement is added. `updateVisibility` (`aquarium.ts:748-767`) tests 5 fixed local sample points ([0,0], [0,±.31], [±.13,0]) against `reefMeshes` with `ray.far = distToFish - 0.05` — if the eel's root or samples lie inside the rock cavity, `occludedByRock` flips true, hiding the label (`data-occluded="true"`) and blocking `canActivate()`. Sample points / root placement must account for the protruding head. Pointer fallback (`AquariumScene.tsx:95-107`): clicks inside the 44×44 link area outside `.fish-name` fall through to `captionAtPoint` then `serviceAt`, which raycasts `hitMeshes` — surrounding rock geometry blocks misses, so whether `.fish-name` alone is enough or a crevice/head collider allowance is needed must be confirmed at implementation (AC #4).
- Budgets (AQ-70.3, `docs/photorealism-budgets.md` + `src/rendering/assets/budgets.ts` + `budgets.test.ts`): measured from the live manifests on `refinements` @ `3182e37`:
  - Hero fish (6): 8,058,860 B (7.69 MiB) of 12 MiB; ~97k tris of 150k. Headroom 4.31 MiB.
  - Background fish (13 splat): 11,506,440 B (10.97 MiB) of 32.5 MiB.
  - Coral (8): 13,221,416 B (12.61 MiB) of 20 MiB. Rock (2): 2,421,276 B (2.31 MiB) of 5 MiB.
  - Enforced-manifest total: 35,207,992 B (33.58 MiB).
  - Scene total (doc cap 40 MiB): the PR #47 review measured 38.69 MB at head `573715b` (including the unenforced custom-colonies/custom-rocks manifests and proof assets); re-measure on `refinements` at implementation time — the custom manifests are still not wired into `budgets.test.ts`.
  - GPU headroom: ~218 MiB of the 512 MiB cap (raised from 256 MiB by PR #52, 2026-11-14, on Ryan's hardware decision). The GPU cap is no longer the binding constraint; the scene GLB total is.
  - **Fit verdict for a head+forebody model: fits easily per-asset** (comparable Blender hero fish are ~1.3 MB / ~16k tris; a partial eel should land well under 1 MB and ~5–10k tris, inside the 2 MiB / 25k tris / 16 MiB GPU hero caps, with 1–2 KTX2 maps). The binding constraint is the scene total: at ~38.69/40 MiB a ~0.5–1 MB addition leaves only ~0.3–0.8 MiB headroom — it fits, but only just, and the totals must be re-measured before landing. **Also required: `budgets.test.ts:291-294` hardcodes hero-fish == 6** (and coral == 8, rock == 2, background-fish == 13) with the comment "A roster change must re-derive the budgets" — adding a 7th hero fish requires re-deriving `budgets.ts`, the test's roster-shape assertions, and the doc. Phase 0 blocking bytes (3.5 MiB cap) are unaffected: the moray is not a first-paint service fish; it loads with the reef or lazily.
  - **Manifest target (recommendation, not a decision): the hero-fish manifest** (`src/rendering/assets/fish/manifest.json`) is the natural home for a 17th roster species with a Blender-modeled asset. The splat-fish manifest is not a fit: `splat-fish-contract.test.ts:59-80` asserts 3 PBR textures, 8 joints, and 8 rotation channels per splat fish (plus the blend/ + overrides/ + `sync-blender-override.mjs` pipeline in AGENTS.md) — a partial eel with mouth articulation and no swim cycle does not meet that rig contract.
- Service decision (AQ-75, needs Ryan): 5 services map to 5 fish (`src/lib/services.ts`). The visible head is the click target; a snowflake head at true scale is ~2–3 in long, so the 44px minimum target likely needs the label pill to carry the click, as with other small fish. Decide before modeling: a new service link, an ambiance fish, or display-only like the sailfin was. **AQ-93 does not cover a display-only moray as-is:** its Description excludes hero species and any species carrying a service link from ambiance eligibility and requires Root design approval before implementation — a display-only/ambiance moray needs an AQ-93 amendment (or a service link). The sailfin itself stays an optional add for a new service, not an ambiance fish.
- Gates: AQ-45 interaction architecture — design doc merged (PR #35) but Root acceptance is still pending and Phase 0 must not start before it; the moray's crevice residence is an AQ-45-style anchor interaction, but with no swim states it is the smallest possible such interaction. AQ-79 per-species Root review governs model promotion. AQ-78 covers the 15-species hero end state, so a 17th species sits outside it; AQ-70.9/AQ-70.10 are the modeling-lane precedent.
- Labels and clicks: the label anchors to the visible head and must not float over rock (AQ-89 label anchoring) — see the corrected paragraph above.
- PR #46's surface-model question (physical Snell 2.66 vs proxy 4.4) is orthogonal to the moray — it lives at reef/sand, not the surface — but the branch it lands on matters: `refinements` (PR #49, draft) is the current work branch; main is `a498d06`.

### 5. Proposed implementation outline (theory only)

1. Species decided (snowflake moray). Cave-dwelling scope decided.
2. Decide service vs ambiance vs display-only (AQ-75 / AQ-93) — before modeling. Note AQ-93 needs amending for a display-only hero species.
3. Crevice first: measure the mouth coordinates of the left island's pass-through cave and derive one `rockCrevice` anchor from them (AQ-82 follow-up). The arch and right island are excluded by the phone viewport. The crevice is the feature; the eel is its occupant.
4. Asset: Blender-model head + forebody (~8–10 in visible, tapering to a hidden stub), snowflake pattern, mouth articulation (AQ-74 pattern), eyes; KTX2 textures; validate against the asset contract and budgets; re-derive `budgets.ts` / `budgets.test.ts` roster counts and re-measure scene totals.
5. KTX2 loader prerequisite: wire `KTX2Loader` + the Basis transcoder into `aquarium.ts` before the moray GLB lands.
6. Behavior: mirror the ocellaris-clownfish pattern — `sheltered-reef` mode, `rockCrevice` anchor, `idle` (head sway, ventilation gape) + `swim` (slow local head probe), `crevice-inspection` gait; no swim, no turning, no routing. Never encode gape as aggression.
7. Scale: add the modeled/visible-length field (or partial-body scale rule) to `fish-scale.ts`; scale-doc row with the direct FishBase values; thumbnail; tests (the scale test re-measures the GLB).
8. Labels/clicks: rock-aware label placement, crevice-aware occlusion sampling, click handling confirmed (AC #4).
9. Roster wiring: `fish.ts`, `fish-behavior.ts` profile, `fish-scale.ts` + scale-reference row (full length + visible length), thumbnail, services/ambiance decision, tests.
10. Visual verification at 1440×900 and 402×874 plus Root art acceptance on the AQ-79 pattern.

### 6. Open decisions

- ~~Species~~ — decided: snowflake moray (Ryan, 2026-11-14).
- ~~Swim vs cave~~ — decided: cave-dwelling, front portion only (Ryan, 2026-11-14).
- Render length: recommend 24 in (common adult; FishBase common 50.0 cm TL, max 100.0 cm TL); visible modeled length ~8–10 in — confirm.
- Service link vs ambiance vs display-only (AQ-75 / AQ-93 amendment if display-only).
- Crevice location: measured mouth coordinates of the left island's pass-through cave (arch/right island excluded by the phone viewport).
- Asset path: Blender modeling (recommended) — no usable licensed asset found.
- Manifest target: hero-fish manifest (recommended, not decided).

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Ryan
created: 2026-11-14 15:31
---
Species: snowflake moray, *Echidna nebulosa* (Ryan, 2026-11-14). Replaces AQ-46's green-moray candidate; see Implementation Notes §1 for the scale reasoning. FishBase maximum 100.0 cm TL, common length 50.0 cm TL, verified directly from https://www.fishbase.se/summary/Echidna-nebulosa on 2026-11-14.
---
author: Ryan
created: 2026-11-14 15:33
---
Cave-dwelling assumption (Ryan, 2026-11-14): the eel lives and stays in the cave all the time. Only the front portion (head + forebody) needs to be rendered/modeled, and motion stays limited in scope: head sway, mouth ventilation, slow head probe in/out. No free-swimming, no exploratory swim, no anguilliform traveling wave in open water. This removes the swimming-eel navigation and clearance problem entirely and shrinks the modeling, animation, and budget scope.
---
<!-- COMMENTS:END -->
