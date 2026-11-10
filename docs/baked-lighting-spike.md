# Baked path-traced lighting spike — hybrid real-time / baked reef pipeline (AQ-70.7)

<!-- AGENT_DOC_METADATA
Category: Research
Status: Active
Authority: Informational
Backlog: AQ-70.7
Owner: @Luna
Updated: 2026-11-09
Upstream: docs/photorealism-rubric.md, docs/photorealism-reference.md, docs/rendering.md, docs/photorealism-budgets.md
Downstream: backlog/tasks/aq-70.7 - Spike-baked-path-traced-lighting-or-a-pre-rendered-reef-plate-for-the-static-aquascape.md
-->

## 1. Question and input

Per user direction (2026-11-05): "can we do a mix?" — combine offline
path-traced lighting for the static reef with real-time rendering for the
dynamic elements. Input from AQ-70.1 AC#5 (`docs/photorealism-rubric.md`
§5): real-time-only can reach the rubric for the fish and the water, but
the static reef (rock + coral skeletons) will not reach it without baked
lighting — specifically soft multi-emitter shadows (W-4), micro-cavity
ambient occlusion (R-3, C-2), and color bleeding (C-1, R-1). This spike
evaluates whether the hybrid is feasible in Three.js, what it costs, and
how to build it without breaking zoom (AQ-62), picking, or collision
(AQ-58).

**Scope of "static".** The two live-rock island foundations and the
calcified stony-coral skeletons (Acropora staghorn/table, Montipora plate
bases, brain-coral skeletons). **Not static:** soft-coral fleshy crowns and
swaying tentacle meshes, the bubble-tip anemone, the caustic light network,
bubbles, and all fish. The static/dynamic split follows the mount boundary:
everything bolted to a rock socket that never moves is a bake candidate;
everything mounted on a socket that sways, pulses, or swims stays
real-time.

**Not recommended and not pursued here:** the pure pre-rendered reef plate
(a 2D image of the reef behind real-time fish). It would fail the rubric's
composition and zoom criteria (AQ-62 focal zoom into a flat plate reads as
a poster) and it throws away the socket/habitat system (AQ-82) that the
fish navigate against. The hybrid below keeps the reef fully 3D.

## 2. Feasibility, fidelity, performance

### Feasibility — yes, with standard tooling

| Piece | Status | Evidence |
|---|---|---|
| Cycles baking (diffuse GI + AO) | Proven, commodity | Blender Cycles "Bake" with a second UV map; Blender 4.2.0 verified headless in this environment (`blender --background --python-expr` works). The task text says "Blender 5" — that version does not exist yet; use 4.2 now and re-check when 5.x ships. |
| Second UV set through glTF | Supported end to end | glTF 2.0 allows TEXCOORD_0/TEXCOORD_1; the Blender exporter writes every UV map; three.js GLTFLoader creates `uv` and `uv1` attributes. No custom extension is needed for the UVs themselves. |
| Lightmap texture in three.js | Supported | `MeshStandardMaterial.lightMap` + `lightMapIntensity`; route the texture to the second UV set (`texture.channel = 1`, i.e. the `uv1` attribute, in three.js r152+ — pin the exact API against r187 in the pilot). |
| KTX2 delivery | Already the repo rule | AQ-70.3 budgets require KTX2 for textures (frozen 29-id grandfather list); a lightmap ships as KTX2 UASTC like any other map, so no new pipeline is needed. |
| Socket / contract preservation | Preserved | Baking changes textures, not geometry: socket positions, the AQ-42/AQ-52/AQ-53 contracts, the manifest hashes, and the AQ-58 collision bounds are untouched. A bake that moved a vertex would fail the socket-report freshness test — that is the guard. |

### Fidelity — what baking actually buys

- **Diffuse global illumination + color bleeding.** Cycles bounces the
  fixture light off sand (warm cream) into the rock overhangs and off coral
  tissue onto neighboring rock. Real-time has no equivalent at this scene's
  budget: the current renderer is three directional lights + hemisphere
  light, so bounce is absent and the rock reads flat.
- **Micro-cavity AO.** Crevices, socket rims, and the undersides of plate
  ledges get darkening that follows the actual geometry. Screen-space AO
  (GTAO/SSAO) approximates this from the depth buffer: it misses occluders
  behind the camera, flickers with the zoom, and costs a full-screen pass
  every frame. A bake costs nothing at runtime.
- **Soft multi-emitter shadows.** A reef LED fixture is a bar of many
  emitters, not one sun. Cycles with an area-light fixture model produces
  the diffuse-edged shadows the rubric (W-4) demands; a single real-time
  shadow map cannot, however large it is.
- **What baking does NOT buy.** Anything that moves (fish, soft coral,
  anemone, caustics, bubbles) is unaffected. Specular highlights are view-
  dependent and are not in a diffuse bake — the fish and the water keep
  their real-time specular from the PMREM environment (AQ-71), and the
  baked rock gets its specular from the same real-time fixture light (see
  §3). A bake also freezes the *fixture* — if the fixture balance changes
  (AQ-70.6), the bake must be re-run. That is the main ongoing cost.

### Performance and memory (estimate)

| Item | Estimate | Basis |
|---|---|---|
| Lightmap, one island, 1024² KTX2 UASTC | ~1–2 MiB download, ~1 MiB GPU (BC7 transcode) | 1024² at 8 bpp; two islands + skeletons ≈ 3–4 MiB GPU total |
| GPU budget headroom | Comfortable | AQ-70.3 caps total GPU at 256 MiB; the scene is near the cap on fish textures, but 3–4 MiB for lightmaps is ~1.5% of it. The budgets test (`budgets.ts`) must be extended to count lightmap textures, or the cap will silently stop covering them. |
| Runtime shader cost | ~0 (one extra texture fetch per fragment on baked materials) | Lightmap sampling is a single `texture2D` in the standard material; no new pass. |
| Bake cost (offline) | Minutes per island at 256 samples + denoise | Cycles GPU; preview at 16–64 samples, final at 256+. Denoise with OpenImageDenoise. |
| vs screen-space AO | Bake wins | SSAO/GTAO costs a full-screen pass every frame plus temporal instability under zoom; the bake is free after download. |

## 3. Three.js integration strategy

### Lightmap blending (no double-counting)

The rule is: **baked light replaces the real-time lights' diffuse
contribution on baked surfaces, it does not add to it.** Concretely:

1. Bake *diffuse direct + indirect* from the fixture model (the LED bar as
   area lights, 14,000–20,000 K, white + actinic channels per AQ-70.6)
   into the lightmap, and bake ambient occlusion into the same map's
   darkening (or a second map — one map is simpler; AO multiplied into the
   diffuse bake is the standard "combined" bake).
2. On baked materials, keep the real-time fixture lights but drop their
   diffuse intensity to near zero *for those materials* (per-material light
   intensity is not a three.js feature — instead, put baked and dynamic
   materials under different lights via light layers, or simpler: keep one
   low-intensity real-time directional light for specular + fish shadows
   only, with `lightMapIntensity` tuned so baked diffuse + real-time
   specular sums to the fixture's look). The pilot's job is to find the
   balance numbers; the rubric's §2 luminance targets are the acceptance
   check (a double-lit bake blows p90; a missing specular looks matte).
3. Never add a second ambient/hemisphere term on baked materials — the bake
   already contains the ambient. The hemisphere light stays for dynamic
   materials only.

### Caustics over baked surfaces

Caustics (AQ-70.4 cellular caustics) are an *additive* animated light
layer, not a multiplier: they add light on top of the baked map. In the
shader, the caustic term is added after the lightmap lookup, with its
intensity driven by the fixture's actinic channel. Multiplying would
double-darken the baked AO wherever a caustic cell is dark. The caustic
projection already exists as a shader overlay; the integration task is to
confirm it adds (not multiplies) on baked materials and to re-tune its
contrast, since a baked base is darker in the crevices than the old
real-time base was.

### Dynamic fish shadows on baked rock

Fish are real-time meshes; their shadows must land on baked rock. The
mechanism is the ordinary shadow map, scoped down:

- One real-time directional light (the key LED) casts shadows. Only fish
  meshes have `castShadow = true`. Baked rock has `receiveShadow = true`
  and `castShadow = false` (its shadow is already in the bake — letting it
  cast again would double-darken).
- Keep the shadow map small (the fish are the only casters; 1024² is
  plenty) and the shadow radius soft, matching the multi-emitter look.
- The fish shadow darkens the *outgoing* light, so it composes correctly
  over a lightmapped surface: shadowed texel = baked diffuse × (1 −
  shadow) + real-time specular × (1 − shadow). No double-counting, because
  the bake never contained a fish.

### Soft-coral mounting seams

The visible failure is a bright real-time coral crown sitting on dark
baked rock with a hard edge. Three mitigations, in order:

1. **Match ambient levels.** The coral's real-time material is lit by the
   same fixture model as the bake (same color temperature, same actinic
   ratio), so the crown and the rock agree on white balance. Verify by
   measuring a capture region across a mount with the histogram script —
   the two sides of the seam must not differ by more than the rubric's
   per-region saturation bands allow.
2. **Transition mask.** A short skirt at each mount (vertex-color or
   texture alpha ramp over ~2 cm) blends the coral base color into the
   baked rock color. The skirt is part of the coral asset, not the rock,
   so it survives re-bakes.
3. **Contact shadow.** The mounted coral casts a real-time shadow onto the
   baked rock at its base (it is a caster, like a fish, but static). This
   grounds the mount more than any color match does.

### Zoom, picking, collision — no impact

- **Zoom (AQ-62):** lightmaps are resolution-independent at the
  magnifications involved (1024² over a ~2 m island ≈ 2 mm/texel); focal
  zoom does not reveal the bake. Picking is raycast/alpha-based on
  geometry, not on lighting — unaffected.
- **Collision (AQ-58):** baking does not move vertices; the AABB and mesh
  collision bounds are unchanged. A bake that altered geometry would fail
  the socket-report freshness test before it ever shipped.

## 4. Authoring workflow (Blender Cycles + glTF)

1. **Prepare.** Duplicate the island/skeleton asset into a bake scene.
   Add a second UV map named `Lightmap`; unwrap with lightmap-pack
   (margin ≥ 4 px at 1024², no overlapping islands) — the *first* UV map
   stays exactly as the runtime asset has it (base color / masks).
2. **Fixture.** Model the LED bar as area lights (white + royal-blue /
   actinic, per AQ-70.6) at the fixture height, plus a dim warm bounce
   from the sand. This fixture model is shared with the real-time scene
   so the bake and the dynamic lighting agree.
3. **Bake.** Cycles, GPU, "Combined" (diffuse direct + indirect + AO),
   16–64 samples for preview, 256+ for final, OpenImageDenoise, 1024²
   per island (512² for small skeletons). Bake to the `Lightmap` UV.
   Keep the bake margin/gutter wide enough that no dark seam bleeds
   across a UV island edge.
4. **Export.** Blender glTF exporter, with both UV maps (TEXCOORD_0 =
   runtime maps, TEXCOORD_1 = lightmap). The lightmap texture itself
   ships separately as KTX2 UASTC (convert with the repo's existing KTX2
   tooling; record it in the manifest and in `budgets.ts` like any other
   texture — see §2).
5. **Runtime.** GLTFLoader gives `uv` + `uv1`; assign the KTX2 lightmap
   to `material.lightMap` with `texture.channel = 1` and tune
   `lightMapIntensity` against the rubric §2 targets. Register the
   lightmap texture in the asset manifest with provenance (baked from
   which .blend, which Cycles version, which sample count) so a re-bake is
   reproducible.
6. **Verify.** Pilot first (see §6): one island, one lightmap, measured
   against the rubric before any second asset is baked.

## 5. Recommendation

**Proceed — as a pilot, not a wholesale conversion.** Bake one island
(the left, cave island: it has the most occlusion and the most to gain),
integrate it per §3, and score it against the rubric (especially W-4
soft shadows, R-3 porosity/AO, and the §2 numeric targets). If the pilot
passes, bake the right island and the stony-coral skeletons; if the pilot
fails on seams or double-lighting, stop and keep the real-time renderer —
the fallback is screen-space AO plus the existing AQ-70.6 fixture work,
which is worse but shippable. Do **not** bake the fish, the soft corals,
the anemone, the caustics, or the sand bed (the sand is procedural and
re-lit every frame; baking it would freeze its detritus variation). Do
**not** build the pre-rendered reef plate. Re-bake whenever the fixture
model (AQ-70.6) or the rock/coral geometry (AQ-58/AQ-59) changes, and
record the bake provenance in the manifest each time.

## 6. Follow-up breakdown

| # | Follow-up | Owner / task | Done when |
|---|---|---|---|
| 1 | **Pilot bake — left island.** Bake the left rock island per §4 (1024², Cycles, fixture model from AQ-70.6), export with both UV sets, ship the lightmap as KTX2, record provenance in the manifest. | New task (modeling lane, Blender 4.2 headless) | Lightmap file exists, manifest + budgets updated, socket-report freshness test still passes. |
| 2 | **Runtime integration.** Wire `lightMap`/`uv1` in the reef assembly, balance baked diffuse vs real-time specular per §3, confirm caustics add (not multiply) on baked materials. | New task (rendering lane) | Left island renders baked; rubric §2 numbers in range; no double-lighting (p90 ≤ 0.85). |
| 3 | **Fish shadows on baked rock.** Scope the key-light shadow map to fish casters only; verify a fish shadow reads on the baked rock at both viewports. | Part of #2, or its own task if it slips | Fish shadow visible on baked rock, no double-darkening of baked AO. |
| 4 | **Mount seams.** Transition skirts + contact shadows at the pilot island's mounts; measure across a seam with the histogram script. | New task (modeling + rendering) | No visible hard edge at any mount at 1440×900 focal zoom. |
| 5 | **Roll out + verify.** Bake the right island and the stony skeletons; full-rubric scoring of a fresh capture at both viewports; extend `budgets.ts` to count lightmap textures. | New tasks per asset | Whole-scene rubric pass (or a scored list of remaining fails with owners). |
| 6 | **Re-bake policy.** Document when a re-bake is required (fixture change, geometry change) in the asset contract; add a manifest field for bake provenance. | Docs update with #1 | Policy recorded; a stale bake is detectable from the manifest. |

Root review is required before any baked asset ships (art acceptance), and
before the pilot's numbers are accepted as the new baseline. No task above
is marked Done here — this spike only recommends and breaks down the work.
