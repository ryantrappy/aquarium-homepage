# Independent export evidence — 2026-11-04

This records technical evidence for AQ51/AQ52/AQ53, not permission to promote the assets. Root inspected the exact left-rock front/oblique renders and rejected final art readiness: the stepped terrace silhouette and stretched, wavy material remain visible. AQ59 owns that modeling follow-up. AQ58 owns conservative collision geometry; both current inspection records have empty `collisionParts` after Root removed unsafe declarations. Runtime coral consumption remains absent after the scene reversion, so AQ53's authoring-plus-runtime exponent criterion stays open.

## Pinned inputs and measured bounds

[source-hashes.json](source-hashes.json) pins the original audit inputs. [independent-asset-report.json](independent-asset-report.json) records all ten GLB hashes, decoded primitive counts/bounds/masks and generator-hash comparisons. Every current GLB and generator still matches that snapshot. Root subsequently changed the packager, both rock inspection JSONs and the asset README; the old collision coverage results are historical evidence, not current metadata.

| Export | SHA-256 | Actual dimensions X/Y/Z, meters |
| --- | --- | --- |
| Left rock | `2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c` | `0.962807834 / 0.387000000 / 0.518109351` |
| Right rock | `68337f7733b782f374efa0ea051138344a17fe6139be14ab4efa95f34eb2d4d6` | `0.920938641 / 0.326999998 / 0.496554986` |

These supersede the supplied README/scratch's `0.88 × 0.50 × 0.43` and `0.88 × 0.50 × 0.42` dimensions and AQ51's earlier left bounds. Actual glTF left bounds are `[-0.476221830,-0.012000000,-0.258902609]` to `[0.486586004,0.375000000,0.259206742]`; right bounds are `[-0.453904271,-0.012000000,-0.245253965]` to `[0.467034370,0.314999998,0.251301020]`. Exported mesh roots have identity transforms, meter/+Y metadata and original-project provenance. The pinned left generator hash is `e725024a01c07e09267258a1c9a3e2f28b6fbd07f03eef8cadb84a68c8437eed`.

## Cave and contact evidence

[left-geometry.json](left-geometry.json) comes from importing the exact packaged GLB with Blender 5.0.1 and [review_geometry.py](review_geometry.py). After welding coincident positions at `1e-7 m`, its mesh has 12,288 vertices, 24,572 triangles, zero boundary/nonmanifold edges and Euler characteristic 2. This is not a self-intersection or genus-one certificate.

The whole front-to-back axis at glTF `x=0, y=0.08 m, z=-0.30…+0.30 m` has no ray intersection. At 121 points spaced 5 mm, nearest rock-surface distance is at least `0.066343457 m`; subtracting half the step gives a conservative continuous distance bound of `0.063843457 m` along that straight axis. This uses the 1-Lipschitz property of distance to a surface; it excludes external sand, colonies and fish-body/orientation constraints. The path starts and ends outside the measured rock envelope.

At 1 mm horizontal sampling, clear through-ray intervals around the center are:

| glTF height, meters | Clear X interval, meters |
| --- | --- |
| 0.002 | −0.103…+0.103 |
| 0.040 | −0.087…+0.088 |
| 0.080 | −0.072…+0.072 |
| 0.120 | −0.054…+0.054 |
| 0.160 | −0.029…+0.031 |
| 0.175 | −0.014…+0.015 |

These sampled intervals are not continuous width guarantees. [left-exact-front.png](left-exact-front.png) and [left-exact-oblique.png](left-exact-oblique.png) show the opening and grounded base against a review plane at glTF `y=-0.012 m`. They were rendered from the pinned packaged GLB with [render_exact.py](render_exact.py), not from a generator preview or a browser scene. No new viewport/WebGL verification is claimed.

The original three collision boxes left 1,679 exported left-rock vertices uncovered, including `[-0.116373345,0.083026156,0.244855598]`. That point lies on the sloped cave wall inside the previously claimed free corridor. Root removed those declarations rather than promoting them; the real arch remains useful geometry.

## Socket and raw-mask evidence

Fresh independent `inspectRockSockets` runs report left **12 supported / 0 rejected**, right **11 / 0**. Both packaged and docs reports match recomputation via `node scripts/check-socket-reports.mjs`. This proves the inspector's documented finite support lattice and clearance cylinders, not whole-colony attachment, mutual colony clearance or semantic fish habitat. Both actual rock materials bind an `occlusionTexture`; neither rock has coral `COLOR_0` masks.

All eight coral GLBs independently decode to finite `[0,1]` normalized-U16 `COLOR_0` arrays matching POSITION counts and packaged inspection arrays exactly. All five rigid primitives have R exactly zero; generator provenance hashes match. Every torch/hammer/anemone crown vertex (16,160 / 15,232 / 10,452) matches its source raw height identified from exported UV rows, including source cap UV exceptions, within half U16 quantization (maximum errors `7.629511e-6`, `7.629511e-6`, `6.866560e-6`). This verifies the per-vertex assignment, not merely a set of possible R levels.

Pinned bases were selected by the generator's proximal-cap **UV/index construction**, without selecting vertices by R or minimum world height. Blender's glTF export maps source UV V to `1−V`. The three crown caps therefore have one V=1 corner and two V=0.98 corners; source h=0 side rows also have V=1. Anemone column uses the same cap signature; zoanthid bottom caps use `[0.99,0.99,1]`; brain bottom triangles have UV pairs `[(0.02,0.98),(0.04,0.98),(0.02,0.96)]`.

| Primitive | Identified proximal-cap triangles | Selected cap vertices | Nonzero R |
| --- | ---: | ---: | ---: |
| Torch crown | 1,280 | 1,600 | 0 |
| Hammer crown | 1,360 | 1,632 | 0 |
| Anemone crown | 780 | 936 | 0 |
| Anemone column | 40 | 44 | 0 |
| Zoanthid mat + 19 polyp roots | 948 | 1,028 | 0 |
| Brain basal cap | 112 | 336 | 0 |

These are exported vertices, including UV splits, not unique physical points. Crown h=0 side/cap-center selections also contain only R=0. A curled distal torch tip is lower than some roots, so minimum-Y is specifically not a valid crown pinning test. No raw mask has been approved as display color/opacity; the future adapter must disable standard vertex RGB/alpha multiplication, apply the flexibility exponent once and handle displaced normals/bounds/depth/shadows.

## Reproduction

Run from the repository root. All commands write audit output outside source assets:

```sh
node scripts/check-reef-asset-manifests.mjs
node scripts/check-socket-reports.mjs
npx vitest run src/rendering/assets/socket-inspector.test.ts src/rendering/assets/contract.test.ts
/Applications/Blender.app/Contents/MacOS/Blender --factory-startup --threads 4 -b --python docs/asset-evidence/aq57/review_geometry.py -- "$PWD/src/rendering/assets/corals/live-rock-island-left.glb" /tmp/aq57-left-geometry.json
/Applications/Blender.app/Contents/MacOS/Blender --factory-startup --threads 4 -b --python docs/asset-evidence/aq57/render_exact.py -- "$PWD/src/rendering/assets/corals/live-rock-island-left.glb" /tmp/aq57-left-exact
```

`verify_assets.py` preserves the original `/tmp/aq-asset-review-20261104` snapshot path. To inspect current files without modifying them, copy current assets/modeling into a new temporary snapshot and substitute that script root:

```sh
python3 - <<'PY'
from pathlib import Path
import shutil, tempfile
root = Path(tempfile.mkdtemp(prefix='aq57-recheck-'))
for name in ['assets/corals', 'modeling']:
    shutil.copytree(Path('src/rendering') / name, root / 'src/rendering' / name)
code = Path('docs/asset-evidence/aq57/verify_assets.py').read_text()
code = code.replace("root=Path('/tmp/aq-asset-review-20261104')", f'root=Path({str(root)!r})')
exec(compile(code, 'aq57-independent-recheck', 'exec'))
print('Report:', root / 'independent-asset-report.json')
PY
```

The old coverage result cannot be reproduced against the deliberately emptied current collision declarations; retain the historical report for AQ58. To independently reproduce the pinned-cap and raw-height checks without writing files:

```sh
python3 - <<'PY'
from pathlib import Path
import ast
ns = {}
exec(Path('docs/asset-evidence/aq57/verify_assets.py').read_text().split('reports=[]')[0], ns)
decode = ns['decode']
specs = [
    ('euphyllia-torch', 'euphyllia_polyp_crown', [.98,.98,1], 1280, 'build_euphyllia_torch.py', 'build_polyp_crown_mesh'),
    ('euphyllia-hammer', 'euphyllia_hammer_polyp_crown', [.98,.98,1], 1360, 'build_euphyllia_hammer.py', 'build_hammer_crown_mesh'),
    ('anemone-bta', 'anemone_tentacle_crown', [.98,.98,1], 780, 'build_bubble_tip_anemone.py', 'build_tentacle_crown_mesh'),
    ('anemone-bta', 'anemone_column_disc', [.98,.98,1], 40, None, None),
    ('zoanthid-mat', 'zoanthid_button_cluster', [.99,.99,1], 948, None, None),
    ('brain-diploria', 'diploria_brain_colony', None, 112, None, None),
]
near = lambda a, b: abs(a-b) < 1e-6
for asset, primid, signature, expected, source, function in specs:
    _, doc, read = decode(Path(f'src/rendering/assets/corals/coral-{asset}.glb'))
    node = next(n for n in doc['nodes'] if n.get('extras',{}).get('reefPrimitive',{}).get('id') == primid)
    prim = doc['meshes'][node['mesh']]['primitives'][0]
    uv, colors = [read(prim['attributes'][key]) for key in ['TEXCOORD_0','COLOR_0']]
    indices = [row[0] for row in read(prim['indices'])]
    selected = []
    for i in range(0, len(indices), 3):
        tri = indices[i:i+3]
        actual = sorted(uv[k][1] for k in tri) if signature else [x for pair in sorted(uv[k] for k in tri) for x in pair]
        target = signature or [x for pair in sorted([(.02,.98),(.04,.98),(.02,.96)]) for x in pair]
        if all(near(a,b) for a,b in zip(actual,target)): selected.append(tri)
    used = {k for tri in selected for k in tri}
    assert len(selected) == expected and used and all(colors[k][0] == 0 for k in used)
    if source:
        tree = ast.parse(Path('src/rendering/modeling', source).read_text())
        fn = next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name == function)
        stations = next(ast.literal_eval(n.value) for n in fn.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id == 'h_stations' for t in n.targets)) + [1]
        tip_v = {'euphyllia-torch':.04, 'euphyllia-hammer':.03, 'anemone-bta':.015}[asset]
        errors = []
        for u,c in zip(uv,colors):
            heights = [h for h in stations if near(u[1],1-h)]
            if not heights and near(u[1],.98): heights = [0]  # Proximal-cap rim
            if not heights and near(u[1],tip_v): heights = [stations[-2]]  # Distal-cap rim
            assert len(heights) == 1
            errors.append(abs(c[0]-heights[0]))
        assert max(errors) <= .5/65535 + 1e-7
        assert all(c[0] == 0 for u,c in zip(uv,colors) if near(u[1],1))
    print(primid, len(selected), 'cap triangles;', len(used), 'vertices; R=0')
PY
```

These scripts are bounded audit helpers, not general malformed-glTF validators. Rerun checks after any export change; numerical support, raw masks and a real opening do not establish final reef realism or runtime acceptance.
