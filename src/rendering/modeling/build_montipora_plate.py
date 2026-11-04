"""Build a realistic multi-tiered Montipora capricornis (Scrolling Plate SPS) coral colony in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.3):
- Flared encrusting basal attachment foot that grips the live-rock ledge socket (`COLOR_0.a = 0.15` at rock contact).
- 4 overlapping kidney/whorl-shaped scrolling foliose tiers (`~4 mm` plate thickness with rounded beveled rims,
  undulating radial ruffles, and outward/upward cup curvature).
- Fine radial coenosteum ridges and minute tuberculate monticules/polyps in the normal and albedo maps.
- Saturated brick-red/orange (`#C83E2B`) interior plate tissue contrasting with a crisp pale-lavender/white
  calcifying perimeter growth edge (`#F4EEFF`, `COLOR_0.g = 1.0` along the outer `3-4 mm` rim).
- Standardized 4-channel `COLOR_0` vertex attribute (`R = 0.0` 100% rigid stony plate,
  `G = growthTipOrPolypMask`, `B = phaseSeed`, `A = contactAO`).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_montipora_plate.py -- /tmp/coral-models/coral-montipora-plate
"""
import hashlib
import json
import math
import os
import struct
import sys

import bpy
from mathutils import Vector


def parse_output_prefix():
    argv = sys.argv
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if args:
            return os.path.abspath(args[0])
    return '/tmp/coral-models/coral-montipora-plate'


def hash01(seed_int):
    h = ((seed_int * 747796405) + 2891336453) & 0xFFFFFFFF
    h = (((h >> ((h >> 28) + 4)) ^ h) * 277803737) & 0xFFFFFFFF
    h = (h >> 22) ^ h
    return (h & 0xFFFFFF) / float(0x1000000)


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / max(1e-6, edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c0, c1, t):
    return tuple(lerp(c0[i], c1[i], t) for i in range(len(c0)))


def make_packed_image(name, width, height, pixel_fn, non_color=False):
    img = bpy.data.images.new(name=name, width=width, height=height, alpha=True, float_buffer=False)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    pixels = [0.0] * (width * height * 4)
    for y in range(height):
        v = y / max(1, height - 1)
        row_offset = y * width * 4
        for x in range(width):
            u = x / max(1, width - 1)
            r, g, b, a = pixel_fn(u, v)
            idx = row_offset + x * 4
            pixels[idx] = max(0.0, min(1.0, r))
            pixels[idx + 1] = max(0.0, min(1.0, g))
            pixels[idx + 2] = max(0.0, min(1.0, b))
            pixels[idx + 3] = max(0.0, min(1.0, a))
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def build_montipora_textures(size=512):
    # UV layout:
    # u = angular position around whorl/plate [0..1]
    # v = radial distance from central core (0.0) -> upper/lower plate face -> outer calcifying rim (0.92..1.0)
    def base_pixel(u, v):
        # Radial coenosteum ridges + concentric growth rings + minute fluorescent green/gold polyps
        radial_ridge = 0.5 + 0.5 * math.sin(u * 68.0 * 2.0 * math.pi + 2.2 * math.sin(v * 18.0))
        growth_band = 0.5 + 0.5 * math.cos(v * 42.0 * math.pi + 0.4 * math.sin(u * 14.0 * math.pi))
        polyp_dot = max(0.0, math.sin(u * 96.0 * math.pi) * math.cos(v * 74.0 * math.pi)) ** 6.0

        c_core = (0.38, 0.11, 0.08)       # shaded inner whorl crimson-brown
        c_plate = (0.784, 0.243, 0.169)   # Spec Section 4.3: saturated brick-red/orange (#C83E2B)
        c_ridge = (0.90, 0.34, 0.21)      # warm orange coenosteum ridge highlight
        c_polyp = (1.00, 0.68, 0.22)      # tiny golden-orange recessed corallite polyps
        c_rim   = (0.957, 0.933, 1.00)    # Spec Section 4.3: pale-lavender/white calcifying rim (#F4EEFF)

        plate_col = lerp_color(c_core, c_plate, smoothstep(0.05, 0.35, v))
        plate_col = lerp_color(plate_col, c_ridge, (0.35 * radial_ridge + 0.25 * growth_band) * smoothstep(0.12, 0.85, v))
        plate_col = lerp_color(plate_col, c_polyp, polyp_dot * 0.55 * (1.0 - smoothstep(0.84, 0.92, v)))

        # Crisp 3-4 mm calcifying outer margin at v > 0.88
        rim_t = smoothstep(0.87, 0.95, v)
        col = lerp_color(plate_col, c_rim, rim_t)
        ao = lerp(0.48, 1.0, smoothstep(0.0, 0.28, v))
        return (col[0] * ao, col[1] * ao, col[2] * ao, 1.0)

    def normal_pixel(u, v):
        # Radial coenosteum ribs + concentric growth terraces
        rim_fade = 1.0 - 0.65 * smoothstep(0.88, 0.98, v)
        d_u = -math.cos(u * 68.0 * 2.0 * math.pi + 2.2 * math.sin(v * 18.0)) * 0.45 * rim_fade
        d_v = -math.sin(v * 42.0 * math.pi) * 0.32 * rim_fade
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        roughness = lerp(0.52, 0.36, smoothstep(0.85, 0.96, v))
        ao = lerp(0.30, 1.0, smoothstep(0.0, 0.30, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        # RFP orange-red glow across the plate + bright pale-violet edge glow on the calcifying rim
        rim_t = smoothstep(0.87, 0.95, v)
        body_t = smoothstep(0.15, 0.85, v) * (1.0 - rim_t)
        r = body_t * 0.32 + rim_t * 0.42
        g = body_t * 0.07 + rim_t * 0.38
        b = body_t * 0.04 + rim_t * 0.55
        return (r, g, b, 1.0)

    return (
        make_packed_image('montipora_base', size, size, base_pixel, non_color=False),
        make_packed_image('montipora_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('montipora_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('montipora_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0.0

    tex_base = nodes.new('ShaderNodeTexImage')
    tex_base.image = base_img
    links.new(tex_base.outputs['Color'], bsdf.inputs['Base Color'])

    tex_orm = nodes.new('ShaderNodeTexImage')
    tex_orm.image = orm_img
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(tex_orm.outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])

    tex_norm = nodes.new('ShaderNodeTexImage')
    tex_norm.image = norm_img
    norm_node = nodes.new('ShaderNodeNormalMap')
    norm_node.inputs['Strength'].default_value = 0.85
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    tex_em = nodes.new('ShaderNodeTexImage')
    tex_em.image = emissive_img
    if 'Emission Color' in bsdf.inputs:
        links.new(tex_em.outputs['Color'], bsdf.inputs['Emission Color'])
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 0.30

    return mat


def build_montipora_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    def add_closed_grid(grid_rings, close_start=True, close_end=True):
        # grid_rings: list of rings along parameter s (e.g. angular or radial),
        # where each ring is a closed loop of (Vector, u, v, rgba) of length n_p + 1
        n_s = len(grid_rings)
        n_p = len(grid_rings[0]) - 1
        base_idx = len(verts)
        for s_i in range(n_s):
            for p_i in range(n_p):
                verts.append(tuple(grid_rings[s_i][p_i][0]))

        for s_i in range(n_s - 1):
            for p_i in range(n_p):
                p_next = (p_i + 1) % n_p
                v00 = base_idx + s_i * n_p + p_i
                v10 = base_idx + (s_i + 1) * n_p + p_i
                v11 = base_idx + (s_i + 1) * n_p + p_next
                v01 = base_idx + s_i * n_p + p_next
                faces.append((v00, v10, v11, v01))
                loop_uvs.extend([
                    (grid_rings[s_i][p_i][1], grid_rings[s_i][p_i][2]),
                    (grid_rings[s_i + 1][p_i][1], grid_rings[s_i + 1][p_i][2]),
                    (grid_rings[s_i + 1][p_i + 1][1], grid_rings[s_i + 1][p_i + 1][2]),
                    (grid_rings[s_i][p_i + 1][1], grid_rings[s_i][p_i + 1][2]),
                ])
                loop_colors.extend([
                    grid_rings[s_i][p_i][3],
                    grid_rings[s_i + 1][p_i][3],
                    grid_rings[s_i + 1][p_i + 1][3],
                    grid_rings[s_i][p_i + 1][3],
                ])

        if close_start:
            c_pos = sum((grid_rings[0][p_i][0] for p_i in range(n_p)), Vector((0.0, 0.0, 0.0))) / n_p
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = grid_rings[0][0][3]
            for p_i in range(n_p):
                p_next = (p_i + 1) % n_p
                faces.append((c_idx, base_idx + p_next, base_idx + p_i))
                loop_uvs.extend([(0.0, 0.5), (0.02, p_next / n_p), (0.02, p_i / n_p)])
                loop_colors.extend([c_col, grid_rings[0][p_next][3], grid_rings[0][p_i][3]])

        if close_end:
            last_s = n_s - 1
            c_pos = sum((grid_rings[last_s][p_i][0] for p_i in range(n_p)), Vector((0.0, 0.0, 0.0))) / n_p
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = grid_rings[last_s][0][3]
            for p_i in range(n_p):
                p_next = (p_i + 1) % n_p
                faces.append((c_idx, base_idx + last_s * n_p + p_i, base_idx + last_s * n_p + p_next))
                loop_uvs.extend([(1.0, 0.5), (0.98, p_i / n_p), (0.98, p_next / n_p)])
                loop_colors.extend([c_col, grid_rings[last_s][p_i][3], grid_rings[last_s][p_next][3]])

    # 1. Flared encrusting basal column gripping the live-rock ledge
    n_base_seg = 28
    base_profiles = [
        (-0.004, 0.064, 0.00, 0.15),
        (0.002,  0.070, 0.05, 0.18),
        (0.010,  0.048, 0.14, 0.30),
        (0.020,  0.026, 0.24, 0.42),
        (0.032,  0.016, 0.34, 0.48),
        (0.044,  0.010, 0.42, 0.52),
    ]
    base_rings = []
    for z, rad, v_coord, ao in base_profiles:
        ring = []
        for j in range(n_base_seg + 1):
            u = j / n_base_seg
            theta = u * 2.0 * math.pi
            lobe_f = 1.0 - smoothstep(0.0, 0.030, z)
            lobe = 1.0 + lobe_f * (0.18 * math.sin(theta * 4.0 + 0.5) + 0.10 * math.cos(theta * 7.0 - 0.8))
            r_loc = rad * lobe
            pos = Vector((r_loc * math.cos(theta) - 0.008 * (1.0 - lobe_f), r_loc * math.sin(theta), z))
            ring.append((pos, u, v_coord, (0.0, 0.0, 0.05, ao)))
        base_rings.append(ring)
    add_closed_grid(base_rings, close_start=True, close_end=True)

    # 2. Four overlapping scrolling foliose plate tiers (Spec Section 4.3: 3-5 tiers, 4 mm thickness, rounded rim)
    # Each tier is a kidney/fan-shaped scrolling whorl plate with closed upper surface, rounded outer rim, and underside.
    tier_specs = [
        # (z_base, r_inner, r_outer, ang_start, ang_span, cup_rise, wave_freq, wave_amp, offset_xy, seed)
        (0.012, 0.010, 0.130, -0.85 * math.pi, 1.62 * math.pi, 0.030, 7.0, 0.0085, (-0.006,  0.003), 11),
        (0.023, 0.009, 0.114, -0.20 * math.pi, 1.58 * math.pi, 0.034, 6.0, 0.0075, ( 0.005, -0.005), 23),
        (0.034, 0.008, 0.096,  0.40 * math.pi, 1.54 * math.pi, 0.036, 6.0, 0.0068, (-0.003,  0.004), 37),
        (0.045, 0.006, 0.074, -0.55 * math.pi, 1.70 * math.pi, 0.032, 5.0, 0.0055, ( 0.001,  0.002), 53),
    ]

    # Cross-section loop around a plate slice from inner root -> upper surface -> rounded 4mm outer rim -> lower surface
    # Each entry: (radial_frac, z_thickness_offset, v_uv, is_rim_weight)
    radial_profile = [
        (0.00,  0.0032, 0.12, 0.00),
        (0.22,  0.0028, 0.30, 0.00),
        (0.48,  0.0024, 0.52, 0.00),
        (0.74,  0.0022, 0.74, 0.00),
        (0.91,  0.0021, 0.86, 0.15),
        (0.97,  0.0018, 0.92, 0.85),  # Upper outer growing margin (3 mm border)
        (1.00,  0.0007, 0.96, 1.00),  # Beveled rounded upper-outer rim
        (1.00, -0.0007, 0.98, 1.00),  # Beveled rounded lower-outer rim (total thickness ~4 mm)
        (0.96, -0.0019, 0.91, 0.80),  # Lower outer growing margin
        (0.84, -0.0022, 0.78, 0.05),
        (0.55, -0.0026, 0.54, 0.00),
        (0.25, -0.0034, 0.30, 0.00),
    ]
    n_p = len(radial_profile)
    n_ang_steps = 44

    for t_idx, (z_base, r_in, r_out, a_start, a_span, cup_rise, w_freq, w_amp, off_xy, seed) in enumerate(tier_specs):
        phase_b = hash01(seed * 41)
        tier_rings = []
        for s_i in range(n_ang_steps):
            s = s_i / (n_ang_steps - 1)
            theta = a_start + s * a_span
            # Logarithmic-style spiral ascension along the whorl
            spiral_z = s * 0.018
            # Taper outer radius smoothly at both angular ends so the kidney lobe merges cleanly into the core
            end_envelope = math.sin(s * math.pi) ** 0.42
            local_r_out = lerp(r_in * 1.35, r_out, end_envelope)
            # Organic lobed outer perimeter (kidney/petal undulations)
            lobe_mod = 1.0 + 0.08 * math.sin(theta * w_freq + seed) + 0.05 * math.cos(theta * (w_freq + 3.0) - seed)
            local_r_out *= lobe_mod

            ring = []
            for p_i in range(n_p + 1):
                r_frac, z_thick, v_uv, rim_w = radial_profile[p_i % n_p]
                # Adjust v_uv at the angular tips where the edge wraps back toward the core
                tip_rim = smoothstep(0.88, 0.98, 1.0 - end_envelope)
                effective_rim_g = max(rim_w, tip_rim * 0.85)
                effective_v = max(v_uv, tip_rim * 0.93)

                r_curr = lerp(r_in * 0.65, local_r_out, r_frac)
                # Upward scrolling cup curvature + radial sine ruffle near outer half
                cup_z = cup_rise * (r_frac ** 1.55) * end_envelope
                ruffle_z = w_amp * (r_frac ** 1.4) * end_envelope * math.sin(theta * w_freq + r_frac * 2.5 + seed)

                x = off_xy[0] + r_curr * math.cos(theta)
                y = off_xy[1] + r_curr * math.sin(theta)
                z = z_base + spiral_z + cup_z + ruffle_z + z_thick

                # Underside and inner core have darker contact AO; exposed upper rim has AO = 1.0
                underside_dim = 0.72 if z_thick < 0.0 else 1.0
                ao_a = lerp(0.22, 1.0, smoothstep(0.0, 0.75, r_frac)) * underside_dim
                # Standardized COLOR_0 contract (Spec Section 4.1 & 4.3):
                # R = 0.0 (100% rigid plate)
                # G = growthTipOrPolypMask (1.0 along the outer 3 mm calcifying perimeter rim)
                # B = phaseSeed
                # A = contactAO
                rgba = (0.0, effective_rim_g, phase_b, max(0.15, min(1.0, ao_a)))
                ring.append((Vector((x, y, z)), s, effective_v, rgba))
            tier_rings.append(ring)

        add_closed_grid(tier_rings, close_start=True, close_end=True)

    mesh = bpy.data.meshes.new('Montipora_Plate_Colony')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    color_attr = mesh.color_attributes.new(name='COLOR_0', type='BYTE_COLOR', domain='CORNER')
    mesh.color_attributes.active_color = color_attr
    mesh.color_attributes.render_color_index = 0
    for li, rgba in enumerate(loop_colors):
        color_attr.data[li].color = rgba

    mesh.materials.append(mat)
    mesh.calc_tangents(uvmap='UVMap')
    return mesh


def inspect_glb_json(glb_path):
    with open(glb_path, 'rb') as fp:
        magic, version, _ = struct.unpack('<4sII', fp.read(12))
        if magic != b'glTF' or version != 2:
            raise ValueError('Invalid GLB header')
        chunk_len, _ = struct.unpack('<I4s', fp.read(8))
        return json.loads(fp.read(chunk_len))


def main():
    prefix = parse_output_prefix()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img, em_img = build_montipora_textures(size=512)
    mat = build_pbr_material('Montipora_Plate_Mat', base_img, norm_img, orm_img, em_img)

    mesh = build_montipora_mesh(mat)
    obj = bpy.data.objects.new('Coral_Montipora_Plate', mesh)
    bpy.context.collection.objects.link(obj)

    mesh.calc_loop_triangles()
    total_tris = len(mesh.loop_triangles)

    blend_path = prefix + '.blend'
    glb_path = prefix + '.glb'
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_tangents=True,
        export_texcoords=True,
        export_normals=True,
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_active_vertex_color_when_no_material=True,
        export_attributes=False,
        export_yup=True,
        export_image_format='AUTO',
        export_animations=False,
    )

    doc = inspect_glb_json(glb_path)
    primitives_summary = [
        {'mesh': m.get('name'), 'attributes': sorted(p.get('attributes', {}).keys())}
        for m in doc.get('meshes', [])
        for p in m.get('primitives', [])
    ]
    with open(glb_path, 'rb') as fp:
        sha256 = hashlib.sha256(fp.read()).hexdigest()

    report = {
        'asset': 'coral-montipora-plate',
        'archetype': 'B - Plating / Foliose SPS (Montipora capricornis Scrolling Plate Colony)',
        'license': 'CC0 / Custom project-authored procedural asset',
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'totalTriangles': total_tris,
        'primitives': primitives_summary,
    }
    print('CORAL_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
