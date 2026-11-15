---
id: AQ-106
title: Add a Moray Eel
status: In Progress
assignee:
  - '@junie'
created_date: '2026-11-14 20:52'
updated_date: '2026-11-15 15:45'
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
  - src/rendering/scene/moray-residence.ts
  - src/rendering/scene/moray-residence.test.ts
  - src/rendering/scene/motion.ts
  - src/components/ServiceManager.tsx
  - src/lib/validation.ts
  - src/rendering/assets/budgets.test.ts
  - docs/reef-fish-roster.md
  - docs/fish-art-provenance.json
  - docs/asset-pipeline-proof.md
  - docs/requirements.md
  - docs/aq45-interaction-architecture.md
documentation:
  - docs/fish-scale-reference.md
  - docs/photorealism-budgets.md
  - docs/reef-fish-roster.md
  - docs/fish-behavior-design.md
  - docs/requirements.md
  - docs/design-principles.md
  - docs/aq45-interaction-architecture.md
  - docs/asset-pipeline-proof.md
  - docs/fish-assets.md
  - docs/fish-art-provenance.json
  - docs/README.md
modified_files:
  - agent_scratch.md
  - AGENT_TASKS.md
  - docs/README.md
  - docs/aq45-interaction-architecture.md
  - docs/asset-pipeline-proof.md
  - docs/design-principles.md
  - docs/fish-art-provenance.json
  - docs/fish-assets.md
  - docs/fish-behavior-design.md
  - docs/fish-scale-reference.md
  - docs/photorealism-budgets.md
  - docs/reef-fish-roster.md
  - docs/requirements.md
  - src/components/ServiceManager.test.tsx
  - src/components/ServiceManager.tsx
  - src/lib/fish-behavior-motion.integration.test.ts
  - src/lib/fish-behavior.test.ts
  - src/lib/fish-behavior.ts
  - src/lib/fish.test.ts
  - src/lib/fish.ts
  - src/lib/services.test.ts
  - src/lib/validation.ts
  - src/rendering/assets/budgets.test.ts
  - src/rendering/assets/budgets.ts
  - src/rendering/assets/fish/manifest.json
  - src/rendering/scene/aquarium-lifecycle.test.ts
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/camera-zoom.test.ts
  - src/rendering/scene/camera-zoom.ts
  - src/rendering/scene/fish-body-flex.test.ts
  - src/rendering/scene/fish-scale.test.ts
  - src/rendering/scene/fish-scale.ts
  - src/rendering/scene/fish-spawn.test.ts
  - src/rendering/scene/fish-spawn.ts
  - src/rendering/scene/moray-residence.test.ts
  - src/rendering/scene/moray-residence.ts
  - src/rendering/scene/motion.test.ts
  - src/rendering/scene/motion.ts
  - src/rendering/scene/reef-mesh-navigation.test.ts
  - src/rendering/scene/schooling-navigation.ts
  - src/rendering/scene/species-locomotion-extensions.test.ts
  - src/rendering/scene/species-locomotion-extensions.ts
  - src/styles/aquarium.css
priority: '17'
type: enhancement
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the supplied snowflake moray eel (*Echidna nebulosa*) as a selectable 17th roster species and service fish. It must remain permanently in the bottom-right coral cave; the supplied model is intentionally partial, with only its head and forebody represented. Preserve the existing user-modified GLB byte-for-byte and integrate it without Blender/model edits. The cave location, service role, and current asset are now decided by the user; no free-swimming or alternate-cave fallback is permitted.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The eel is anchored only at a measured mouth transform for the bottom-right cave. Its placement derives from actual reef geometry/layout transforms, not coral sockets; when that cave is absent or invalid, do not relocate the eel elsewhere, while configured service access remains available.
- [x] #2 The snow-moray profile passes validateSpeciesBehaviorProfiles and remains cave-bound in every state, transition, and runtime path. Reuse the supplied authored crevice animation where available; do not apply free-swimming, turning, or route-search overlays. Ventilation is not aggression.
- [x] #3 Model scale distinguishes the 24-inch biological reference from the supplied partial mesh. Measure its actual forebody extent and use that visible length for model scale, link bounds, labels, and clearance; do not reshape or rescale the supplied asset to fake a full eel.
- [x] #4 The service label and click target track the visible head, remain visible outside rock occlusion, and open the configured service; missing cave/model/loading/configuration must not remove native Services access.
- [x] #5 docs/fish-scale-reference.md records the direct FishBase page https://www.fishbase.se/summary/Echidna-nebulosa and the cited max/common lengths, with the modeled visible length documented separately.
- [x] #6 Load the supplied GLB with its actual texture format. Document and validate the supplied PNG texture exception to the KTX2 budget rule; do not claim it is KTX2 or alter the asset. A separate derivative is acceptable only if independently validated and provenance-preserving.
- [x] #7 The hero-fish manifest, budget validation, roster assertions, and docs/photorealism-budgets.md include the supplied moray and are re-derived from the actual asset and current scene totals; retain a clear, scoped exception for the supplied texture format.
- [x] #8 The moray is available in the service fish selector. Selecting it creates only the cave resident; multiple services must not create free-swimming duplicates.
- [ ] #9 Verify at 1440×900 only in accordance with the latest user direction. Root art review remains required before completion; do not run phone/device-matrix checks.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
- [ ] #3 Model promotion follows the AQ-79 per-species Root-review routing (no automatic swap; Root reviews the model before it goes live).
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Current user direction (2026-11-15)
- Preserve the existing snowflake-moray GLB, PNG maps, picker image, and live-rock/coral assets byte-for-byte; no Blender or model edits.
- Add `snowflake-moray-eel` to the service fish catalog as a single-assignment species. Reject duplicate services in validation and fail closed in renderer reconciliation if invalid duplicate input arrives.
- Place the supplied partial forebody only in the measured bottom-right cave of the right island. Never use left-cave or open-water spawn/search fallbacks. If model, right collider, or exposed-head clearance is unavailable, omit the eel visual while preserving native service links.
- Keep the 24-inch biological reference separate from the 9-inch rendered forebody. Use the authored `crevice_idle` clip only; skip generic swim, startle, turning, and body-flex overlays. Project service label/focus/picking from the animated head bone. The rear remains cave-embedded; collision validation covers only the exposed head-to-probe segment and does not claim whole-body clearance.
- Record the actual runtime asset, bounds, animation tracks, thumbnail, hashes, PNG texture format, and a single exact-hash budget exception. Do not convert textures or treat the exception as license approval; creator/source provenance remains a Root review item.
- Verify profile/catalog/schema, fixed motion, actual right-rock/zoanthid/sand/head-ray geometry, failure and duplicate-service fallbacks, scale, budget, and service-link behavior. Update the cataloged docs and current-scene handoff.
- Leave the task In Progress until Root reviews the local 1440×900 result, provenance, dependencies, and final acceptance. No 402×874 browser review or deployment.
<!-- SECTION:PLAN:END -->

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
- PR #46's surface-model question is resolved: PR #46 was closed unmerged 2026-11-14 and Ryan decided to drop the re-application — the proxy surface model from PR #47/`refinements` stands. It is orthogonal to the moray in any case (the moray lives at reef/sand, not the surface). `refinements` (PR #49, draft) is the current work branch.

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

2026-11-15 user override: right-side bottom cave only; moray must be selectable as a service. Supplied model currently exists at src/rendering/assets/fish/snowflake-moray-eel.glb and is already modified in the worktree; preserve the exact bytes (baseline SHA-256 810e641d69159d4b97db42cc48e7392e1861381777984721368ed5d18a450d5d). Current plan supersedes old left-cave, unresolved-service, KTX2-only, and phone-check assumptions. AQ-60, AQ-70.3, AQ-74, and AQ-82 remain blocking dependencies; do not remove them or claim full task readiness.

2026-11-15 implementation baseline: the supplied eel GLB still matches the recorded SHA-256 810e641d69159d4b97db42cc48e7392e1861381777984721368ed5d18a450d5d; it is 1,294,560 B, 6,712 triangles, a 2.0055999756-unit +Z forebody, one 7.5417 s crevice_idle clip, and three PNG maps (512², 1024², 256²; estimated decoded GPU texture memory 7,340,032 B). Direct triangle rays against the runtime reef-full-model-right.glb locate the lower-right recess at source-local x≈0.36,y≈0.08: first interior surface z≈0.026 versus adjacent rim x≈0.28,y≈0.08,z≈0.1922; use a fixed mouth plane near z=0.19 and validate it against the current geometry before spawning. The laptop placement transform maps that head point to about world (4.80,-1.46,-0.075); no Blender/model edits. AQ-60, AQ-70.3, AQ-74, and AQ-82 remain blocking dependencies; Root visual review stays pending.

Current user decisions override the earlier research draft’s open-decision list for this implementation: the snowflake moray is a selectable service species, must be resident only in the measured bottom-right cave of the right island, and must never fall back to open-water route search or generic swim/turning overlays. The 24-inch figure is a biological reference, not a render size; the supplied partial forebody is measured/rendered at 9 inches. Preserve the supplied GLB byte-for-byte and its PNG maps (explicit scoped budget exception); do not edit Blender models. Verify laptop-only at 1440×900 if tooling permits; Root visual review and AQ-60/AQ-70.3/AQ-74/AQ-82 dependency gates remain pending. Earlier left-cave, asset-sourcing, service-role, and 24-inch render recommendations are historical.

2026-11-15 Junie implementation checkpoint: the pre-existing snowflake-moray GLB remains unchanged (SHA-256 810e641d69159d4b97db42cc48e7392e1861381777984721368ed5d18a450d5d; 1,294,560 bytes; 6,712 triangles; crevice_idle; three PNG maps). The measured right-runtime cave/head-ray fixture and one-service schema/picker integration are being implemented. Dependencies and Root review remain open; this is not completion evidence.

2026-11-15 Junie implementation handoff: AC 1–8 verified; AC 9 remains pending 1440×900 browser/Root visual review. The supplied GLB remained byte-for-byte untouched in this session (SHA-256 810e641d69159d4b97db42cc48e7392e1861381777984721368ed5d18a450d5d, 1,294,560 B, 6,712 triangles); author/external-source license evidence remains unrecorded, so Root asset/provenance approval is pending. The fixed cave pose is derived from the runtime right-island transform and passes the exposed head-to-probe capsule, mounted-zoanthid, sand-margin, and default-camera ray tests; the embedded rear remains occluded by design. Only the exposed head/probe segment is clearance-checked; the complete partial forebody is not claimed to be collision-free outside the cave.

Verification: `npm run typecheck` passed; targeted AQ-106 tests passed (18 selected tests); `npm run build -- --outDir .tmp-aq106-build --emptyOutDir` passed, with the existing >500 kB aquarium chunk warning (Nitro also generated `.output`). Full `npx vitest run --maxWorkers=2`: 950/952 passed. The two failures are AQ-87 starter-depth assertions for the unchanged five default services at 402×874 and 1440×900 (measured Z spread 0.7898 vs required >1.5); no assertions were weakened.

Root review remains required before Done. No Blender edits, deployment, or visual browser review were performed. Existing unrelated changes to AQ-70.12, water-surface files, and the pre-modified moray GLB are not included in this task file list.

2026-11-15 Junie final verification (clarifies prior aggregate): `npm run typecheck` passes; all 17 script checks pass; production build succeeds with the existing >500 kB aquarium chunk warning. Focused AQ-106 suites pass 218 tests across 14 files, including actual right-rock/zoanthid/sand head-ray, lifecycle head focus, model/collider/duplicate-service fail-closed paths, model bounds/clip/hash, selector, and budget exception. Full Vitest passes 951/953; only the two AQ-87 starter depth-plane assertions fail at 402×874 and 1440×900 (spread 0.7898077 vs >1.5) using the unchanged default five services; no assertion was weakened. The supplied moray GLB/PNG maps remain byte-identical to the pre-existing working-tree asset (SHA-256 `810e641d69159d4b97db42cc48e7392e1861381777984721368ed5d18a450d5d`). AC 1–8 verified at source/test level; AC 9 and DoD 1/3 await Root visual/provenance/model review, open dependencies remain, and the task stays In Progress. No browser review, deployment, Blender edit, or commit; Root must verify AGENT_TASKS.md before commit.

2026-11-15 local smoke: `npm run dev -- --host 127.0.0.1 --port 4175 --strictPort` started successfully. `GET /` returned HTTP 200 (6,346 B); the supplied moray GLB returned HTTP 200 (`model/gltf-binary`, 1,294,560 B), and picker WebP returned HTTP 200 (`image/webp`, 11,530 B). Existing preview on port 4173 was left untouched. This is not the required 1440×900 browser/Root visual review.

2026-11-15 final re-verification: `npm test -- --maxWorkers=1` passes all 954 tests across 79 files (exit 0); the earlier parallel AQ-87 starter-depth failures did not reproduce. The dedicated AQ-106 suites still pass 218/218 across 14 files. `npm run typecheck` passes with 17 script checks; final `npm run build` succeeds with the existing >500 kB aquarium chunk warning. Local Vite smoke on `127.0.0.1:4175` returned HTTP 200 for `/`, the moray GLB (1,294,560 B), and picker WebP (11,530 B); existing preview 4173 was untouched. No 1440×900 browser review, Root visual/provenance/model review, deployment, Blender edit, or commit; AC 9 and DoD 1/3 remain open.

2026-11-15 worktree ownership check: `src/rendering/scene/fish-spawn.ts` and `fish-spawn.test.ts` have mixed staged/un-staged changes. The staged AQ-87 depth-candidate work and untracked `docs/asset-evidence/aq76/current-inventory-20261115/` / `docs/asset-evidence/aq87/front-cutoff-20261115/` are concurrent and were not edited by AQ-106; AQ-106 adds only crevice-resident rejection and the missing local `obstacles` test binding in those shared files. Preserve the staged/untracked work and do not blanket-stage. `AGENT_TASKS.md` now marks the handoff Root-unverified; do not commit until Root verifies facts and visual/provenance gates.

2026-11-15 final status refresh: `git diff --check` is clean. Current untracked concurrent evidence is `docs/asset-evidence/aq76/current-inventory-20261115/` and `docs/asset-evidence/aq103/root-review-20261115/`; the earlier AQ-87 directory is no longer listed. Preserve both current directories and mixed staged/unstaged AQ-87 spawn files; none are AQ-106-owned.

2026-11-15 handoff correction: final `git diff --cached --name-status` is empty; `fish-spawn.ts` and `fish-spawn.test.ts` are unstaged AQ-106 changes, not mixed staged work. Current concurrent modified paths are AQ-70.12/water-surface; untracked evidence is AQ-76 and AQ-103 only. Preserve those paths and do not stage them for AQ-106.

2026-11-15 request scope clarification: user limited this execution to tasks already In Progress at request start; do not start To Do tasks or create new tasks. The fixed 18-task set and override are recorded in AGENT_TASKS.md, docs/showcase-v1-finalization.md, and agent_scratch.md. AQ-106 remains In Progress: AC 1–8 remain verified from prior evidence; AC 9 and Root review are pending. No new visual acceptance is claimed.

2026-11-15 follow-up: checked the repository for Playwright/Puppeteer and found no usable browser runner or browser interface in this session. Per AC 9 and the existing plan, the 1440×900 visual verification and Root art/provenance/model review remain pending; no browser acceptance is claimed.
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

author: @junie
created: 2026-11-15 06:11
---
2026-11-15 implementation direction: the current user request and approved implementation plan supersede the older left-cave and unresolved-service assumptions. The supplied partial GLB is user-owned and remains byte-for-byte unchanged; no Blender/model edits are planned. This work proceeds on the explicitly requested integration scope while preserving open dependency gates and Root review.
---

created: 2026-11-15 14:16
---
Junie verified AC 1–8 and the AQ-106-specific lifecycle, asset, scale, budget, and cave geometry checks. Please review the fixed exposed-head/cave placement and provenance before checking AC 9 or marking Done; the two AQ-87 starter-depth failures are documented in implementation notes.
---
<!-- COMMENTS:END -->
