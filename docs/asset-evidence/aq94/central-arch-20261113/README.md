# Central limestone arch — Root review, 2026-11-13

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-94, AQ-59, AQ-58
Owner: @root
Updated: 2026-11-13
Upstream: AGENTS.md, docs/requirements.md, docs/modular-coral-and-live-rock-spec.md
Downstream: src/rendering/scene/reef-arch.ts, src/rendering/assets/corals/custom-rocks/manifest.json
-->

> [!NOTE]
> Root accepts this additive central-height iteration. Full modular-library,
> final reef art and animated fish-body clearance requirements remain open.

Exact source `6e57f2d`. Native Chrome PNGs at1440×900 and402×874 CSS pixels,
DPR1, fixed seed2026/time1.25/full-scene/labels off. Both snapshots ready with
zero pending/failed assets and eleven inhabitants. Final review-tab console:
zero warnings/errors. Eight phone service targets exceed44px and remain inside
the viewport. Viewport override reset and final review tab closed; the earlier
stale owned1298077987 tab remains inaccessible through its old debugger handle.

The new bridge fills the previously bare center between supplied foundations,
with a visible opening below the arch. It sits behind existing coral formations;
phone retains the previously enlarged single-island reef. This preserves upper
swimming space. Existing Gemini/user foundations and coral geometry are unchanged.
The new rock is still a first visual module, not full reference-matching rock art;
its material/colonization can be refined with the rest of the reef.

## Saved source and actual use

Separate Blender5.2.3 background processes authored, saved, exported and then
read-only audited the arch; the user's live Blender document was not loaded or
changed. `native-audit.json` records one9282-vertex mesh and three packed images.
The original generator and optional unpacked texture copies are committed with
`splat-fish/blend/reef-center-arch.blend` and raw `overrides/reef-center-arch.glb`.

`node scripts/sync-blender-override.mjs --reef reef-center-arch --learn-guide`
installs the packaged GLB/inspection/socket report and separate custom-rocks
manifest. That manifest pins native, generator, raw export and package hashes.
Reef mode branches before fish documentation, guide learning and rebuilding;
fish-mode discovery excludes the reserved reef- namespace, and direct fish-guide
extraction rejects reef IDs. Temporary-fixture tests verify idempotent packaging,
checked-in derivative freshness and unchanged fish workflow files. The asset is
original custom geometry/textures, $0 with no imported imagery.

`CENTER_ARCH_URL` is actually loaded in the aquarium and the laptop assembly uses
`createCenterArch`. Its authored maps and geometry remain intact rather than
running the older foundation sculpt/map-replacing shader. Cloned materials own
only their material instances; rebuild/disposal preserves borrowed maps and
geometry until the loaded asset owner is disposed. The arch participates in hit
occlusion, shaft depth, shared caustics/environment, real shadows, actual-buffer
startup fallback and a separate exact-mesh navigation collider. No extra bubbles
or invented coral sockets/anchors are added.

The package has18560triangles and1422812bytes. Current runtime left+right+arch
exports total2963992bytes (<5000000). This is a delivery-size check, not runtime
performance acceptance. Custom1024px carbonate and512px normal/roughness surface
fields are not a baked high-poly/2048atlas or5–8piece reusable library.

## Verification limits

Exact isolated6e57f2d:782tests/68files, typecheck including15script syntax checks,
and production build pass. Focused actual-asset tests preserve geometry/maps,
check material ownership, and build the actual packaged mesh collider. A swept
0.04scene-unit capsule passes through the central opening and sampled cap/leg
surfaces block it. That technical navigation radius is not a calibrated animated
fish envelope. Controller tests register desktop fallback/collider and omit the
arch on narrow resize. No final animated cave-passage or FPS-budget acceptance.
