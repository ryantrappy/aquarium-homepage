# Reef mass filling about eighty percent of the height

<!-- AGENT_DOC_METADATA
Category: Evidence / Visual Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.13, AQ-70.11
Owner: @root
Updated: 2026-11-13
Upstream: AGENTS.md, docs/requirements.md, docs/modular-coral-and-live-rock-spec.md
Downstream: src/rendering/scene/reef-layout.ts, src/rendering/scene/reef-assembly.ts, src/rendering/scene/aquarium.ts
-->

Ryan clarified that the main reef mass should fill roughly80% of the vertical
view, rather than a low mass with isolated tall coral tips. Root raises the
foundations and attached sockets: laptop left2.0/right3.1 vertical factors,
portrait left2.8. Horizontal footprints stay the same. Upper SPS uniform scales
are rebalanced to1.10/1.30/1.20 left and1.45/1.40/1.40 right, preserving colony
proportions while the solid framework rises. The open central arch and sand
foreground remain. This fulfills the requested height refinement; full reference
fidelity, physical scale and broader task criteria remain open.

Static POSITION-buffer projections in the dirty review trial measure:

| View | Formation | Reef extent / viewport height | Solid rock extent |
|---|---|---:|---:|
|1440×900|Left|82.49%|71.11%|
|1440×900|Right|77.63%|66.51%|
|402×874|Single island|81.29%|73.81%|

These are vertical extents of projected vertices inside the viewport, excluding
fish. They are not80% pixel-area occupancy or a full silhouette/rubric metric.
The rock-only extents show that the main mass grew, not just the longest tip.
Trial measurements exclude instanced scatter and shader displacement; the small
flow displacement does not move the highest crest. `trial/*-coverage.json` has
raw values. The trial bridge commit identifies c52b969 BASE with dirty source and
a temporary measurement-only scene handle; it is not exact-commit evidence.
`trial/console.json` retains an initial rejected hierarchy error. The final
fresh-tab log contains no warnings/errors.

The actual exported sockets are children of the rock mesh. Assembly resolves
their root-space poses after the foundation rise and transforms normals with
the inverse transpose. Mounted colonies keep uniform proportions and offsets
apply once. Borrowed geometry is untouched; only per-instance rock transforms
change. Invalid scale/hierarchy fails before material or pose mutation. Existing
actual-geometry collision, fallback boxes and mounted-origin habitat anchors
follow those same transformed meshes. These tests do not certify all animated
fish body envelopes or whole-colony support.

On portrait, blue/yellow tangs prefer front water so the much taller rear reef
does not hide the service fish. Every existing wall, obstacle, mesh, body-spacing
and ecological height check still applies. Eight native links remain inside the
viewport and at least44px in both dimensions. Their visible overlap is not a
whole-scene fish-clearance certificate.

Final PNGs/sidecars capture exact source f95d68c at1440×900 and402×874 CSS pixels,
DPR1, full-scene/seed2026/time1.25/labels off. Both ready, no pending/failed/
unresolved assets, eleven inhabitants, zero captured console warnings/errors.
The final source also binds the new torch's actual soft/rigid material metadata,
so its crown flows while its skeleton stays rigid. Temporary metrics reset and
final tab closed; the older stale owned tab remains inaccessible.

Exact isolated verification:845tests/71files, typecheck including16script syntax
checks, and client/SSR/Nitro production build pass. The existing large JavaScript
chunk advisory remains.75focused layout/assembly/mesh-navigation/spawn checks
and4actual torch artifact/loader/assembly cases pass. No CI/FPS lane was reopened
and no deployment occurred. Source/model details are in the neighboring
[AQ-70.11 torch review](../../aq70-11/flowing-torch-20261113/README.md).

Next reference-art work should colonize the newly exposed middle rock faces and
improve remaining coral/reef detail, rather than reducing the requested height.
Full metric calibration, coral variants, support/nesting, animated clearance and
controlled cost requirements remain separate open work.
