"""Build a realistic encrusting Zoanthid Button Polyp Cluster (Zoanthus sp.) in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.6):
- Fleshy encrusting coenenchyme mat base (`COLOR_0.r = 0.0`, `COLOR_0.a = 0.15` at outer rock margin)
  that conforms to bare live-rock bridges between larger coral colonies.
- 22 closely packed button polyps (`8-12 mm` diameter oral discs on short stoloniferous stalks),
  each ringed by a 24-tentacle marginal fringe skirt (`COLOR_0.r` ramping to `0.65` at tentacle tips).
- Contrasting radial bullseye reef pigmentation ("Eagle Eye / Fire & Ice" morph): vivid fiery-orange
  24-tentacle fringe skirt, deep electric royal-blue/violet oral disc ring, and a glowing neon-green
  elevated slit mouth (`COLOR_0.g = 1.0` on oral center and tentacle tips).
- Standardized 4-channel `COLOR_0` vertex attribute (`R = flexibilityMask`, `G = growthTipOrPolypMask`,
  `B = phaseSeed`, `A = contactAO`).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_zoanthid_mat.py -- /tmp/coral-models/coral-zoanthid-mat
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
    return '/tmp/coral-models/coral-zoanthid-mat'


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


def frame_from_tangent(tangent):
    t = tangent.normalized()
    up = Vector((0.0, 0.0, 1.0)) if abs(t.z) < 0.92 else Vector((1.0, 0.0, 0.0))
    b1 = t.cross(up).normalized()
    b2 = t.cross(b1).normalized()
    return t, b1, b2


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


def build_zoanthid_textures(size=512):
    # UV layout for both coenenchyme mat & polyps:
    # u = circumferential angle around polyp [0..1] (24 radial tentacles around circumference)
    # v = radial/axial progression:
    #     0.00..0.32 -> coenenchyme mat & short column stalk (purple-slate fleshy tissue)
    #     0.32..0.52 -> marginal collar & outer tentacle skirt base
    #     0.52..0.72 -> fiery-orange 24-tentacle fringe skirt (#FF521B)
    #     0.72..0.90 -> electric royal-blue/indigo oral disc ring with radial mesentery grooves (#1B4DFF)
    #     0.90..1.00 -> glowing neon-green central slit mouth (#28FF3E)
    def base_pixel(u, v):
        tentacle_rib = 0.5 + 0.5 * math.cos(u * 24.0 * 2.0 * math.pi)
        mesentery_line = max(0.0, math.cos(u * 24.0 * 2.0 * math.pi)) ** 4.0

        c_mat    = (0.28, 0.16, 0.32)     # fleshy plum-slate coenenchyme mat
        c_stalk  = (0.36, 0.22, 0.42)     # stoloniferous polyp column
        c_skirt  = (1.00, 0.30, 0.08)     # fiery sunburst-orange fringe tentacles
        c_skirt2 = (1.00, 0.62, 0.12)     # golden-orange tentacle ridge highlight
        c_ring   = (0.10, 0.24, 0.88)     # deep electric-blue oral disc ring
        c_inner  = (0.48, 0.14, 0.82)     # violet-indigo inner peristome ring
        c_mouth  = (0.18, 0.98, 0.28)     # vivid neon-green elevated central mouth

        skirt_col = lerp_color(c_skirt, c_skirt2, tentacle_rib * 0.75)
        disc_col = lerp_color(c_ring, c_inner, smoothstep(0.78, 0.88, v))
        disc_col = lerp_color(disc_col, (0.32, 0.72, 1.00), mesentery_line * 0.42)

        col = lerp_color(c_mat, c_stalk, smoothstep(0.10, 0.30, v))
        col = lerp_color(col, skirt_col, smoothstep(0.36, 0.48, v))
        col = lerp_color(col, disc_col, smoothstep(0.68, 0.75, v))
        col = lerp_color(col, c_mouth, smoothstep(0.89, 0.95, v))

        ao = lerp(0.45, 1.0, smoothstep(0.0, 0.34, v))
        return (col[0] * ao, col[1] * ao, col[2] * ao, 1.0)

    def normal_pixel(u, v):
        # 24 radial ridges on the tentacle skirt and oral disc mesenteries
        radial_mask = smoothstep(0.34, 0.48, v) * (1.0 - smoothstep(0.90, 0.98, v))
        d_u = -math.sin(u * 24.0 * 2.0 * math.pi) * 0.48 * radial_mask
        d_v = -math.sin(v * 32.0 * math.pi) * 0.22
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        # Coenenchyme mat (v < 0.28) is matte/leathery (roughness 0.72), oral disc is wet/glossy (0.20)
        roughness = lerp(0.72, 0.20, smoothstep(0.28, 0.68, v))
        ao = lerp(0.28, 1.0, smoothstep(0.0, 0.38, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        skirt_mask = smoothstep(0.42, 0.52, v) * (1.0 - smoothstep(0.66, 0.74, v))
        blue_mask = smoothstep(0.72, 0.78, v) * (1.0 - smoothstep(0.86, 0.92, v))
        mouth_mask = smoothstep(0.89, 0.95, v)
        r = skirt_mask * 0.68 + blue_mask * 0.04 + mouth_mask * 0.10
        g = skirt_mask * 0.22 + blue_mask * 0.18 + mouth_mask * 0.85
        b = skirt_mask * 0.04 + blue_mask * 0.62 + mouth_mask * 0.18
        return (r, g, b, 1.0)

    return (
        make_packed_image('zoanthid_base', size, size, base_pixel, non_color=False),
        make_packed_image('zoanthid_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('zoanthid_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('zoanthid_emissive', size, size, emissive_pixel, non_color=False),
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
        bsdf.inputs['Emission Strength'].default_value = 0.45

    return mat


def build_zoanthid_cluster_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    def append_ring_tube(rings, close_bottom=False, close_top=False):
        n_seg = len(rings[0]) - 1
        n_rings = len(rings)
        base_idx = len(verts)
        for r in range(n_rings):
            for j in range(n_seg):
                verts.append(tuple(rings[r][j][0]))

        for r in range(n_rings - 1):
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                v00 = base_idx + r * n_seg + j
                v10 = base_idx + r * n_seg + j_next
                v11 = base_idx + (r + 1) * n_seg + j_next
                v01 = base_idx + (r + 1) * n_seg + j
                faces.append((v00, v10, v11, v01))
                loop_uvs.extend([
                    (rings[r][j][1], rings[r][j][2]),
                    (rings[r][j + 1][1], rings[r][j + 1][2]),
                    (rings[r + 1][j + 1][1], rings[r + 1][j + 1][2]),
                    (rings[r + 1][j][1], rings[r + 1][j][2]),
                ])
                loop_colors.extend([
                    rings[r][j][3],
                    rings[r][j + 1][3],
                    rings[r + 1][j + 1][3],
                    rings[r + 1][j][3],
                ])

        if close_bottom:
            c_pos = sum((rings[0][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = rings[0][0][3]
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                faces.append((c_idx, base_idx + j_next, base_idx + j))
                loop_uvs.extend([(0.5, 0.0), (j_next / n_seg, 0.01), (j / n_seg, 0.01)])
                loop_colors.extend([c_col, rings[0][j + 1][3], rings[0][j][3]])

        if close_top:
            top_r = n_rings - 1
            c_pos = sum((rings[top_r][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = rings[top_r][0][3]
            top_v = rings[top_r][0][2]
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                faces.append((c_idx, base_idx + top_r * n_seg + j, base_idx + top_r * n_seg + j_next))
                loop_uvs.extend([(0.5, top_v), (j / n_seg, top_v), (j_next / n_seg, top_v)])
                loop_colors.extend([c_col, rings[top_r][j][3], rings[top_r][j + 1][3]])

    # 1. Contoured encrusting coenenchyme mat cushion (hugs live rock bridges)
    n_mat_seg = 36
    mat_profiles = [
        (-0.003, 0.088, 0.00, 0.15),
        ( 0.001, 0.094, 0.04, 0.18),
        ( 0.007, 0.078, 0.10, 0.28),
        ( 0.013, 0.056, 0.15, 0.36),
        ( 0.017, 0.028, 0.18, 0.42),
    ]
    mat_rings = []
    for z, rad, v_uv, ao in mat_profiles:
        ring = []
        for j in range(n_mat_seg + 1):
            u = j / n_mat_seg
            theta = u * 2.0 * math.pi
            lobe = 1.0 + 0.16 * math.sin(theta * 3.0 + 0.4) + 0.10 * math.cos(theta * 5.0 - 0.9)
            r_loc = rad * lobe
            # Slightly elongated cushion mat
            pos = Vector((r_loc * 1.12 * math.cos(theta), r_loc * 0.92 * math.sin(theta), z))
            ring.append((pos, u, v_uv, (0.0, 0.0, 0.05, ao)))
        mat_rings.append(ring)
    append_ring_tube(mat_rings, close_bottom=True, close_top=True)

    # 2. 19 Zoanthid button polyps arranged in a non-overlapping phyllotactic cluster on the coenenchyme mat
    n_polyp_count = 19
    n_polyp_seg = 48  # 48 circumferential segments = 24 smooth rounded marginal tentacles!
    golden_angle = math.pi * (3.0 - math.sqrt(5.0))

    for p_idx in range(n_polyp_count):
        frac = (p_idx + 0.40) / n_polyp_count
        r_dist = 0.074 * math.sqrt(frac)
        theta_p = p_idx * golden_angle
        # Dome elevation on the mat
        px = r_dist * 1.10 * math.cos(theta_p)
        py = r_dist * 0.90 * math.sin(theta_p)
        pz = 0.015 * (1.0 - 0.72 * frac)
        p_origin = Vector((px, py, pz))

        # Outward tilt from dome normal
        tilt_vec = Vector((px * 3.4, py * 3.4, 1.0)).normalized()
        _, b1, b2 = frame_from_tangent(tilt_vec)

        phase_b = hash01(p_idx * 59 + 17)
        scale_p = lerp(1.00, 0.74, frac * 0.75 + 0.25 * hash01(p_idx * 97))
        disc_r = 0.0108 * scale_p  # ~10 mm oral disc so polyps nestle cleanly without clipping
        stalk_h = 0.022 * scale_p

        # Profile rings for each button polyp + rolled peristome collar + 24 rounded marginal tentacles:
        # (h_frac, radius_mult, v_uv, flex_r, poly_g, ao_a, is_skirt_fringe)
        polyp_profile = [
            (0.00, 0.62, 0.14, 0.00, 0.00, 0.24, 0.00),  # Stolon base on coenenchyme mat
            (0.45, 0.54, 0.24, 0.02, 0.00, 0.38, 0.00),  # Column waist
            (0.80, 0.80, 0.34, 0.06, 0.10, 0.56, 0.00),  # Sub-marginal calyx flare
            (0.95, 1.02, 0.44, 0.16, 0.45, 0.78, 0.25),  # Rolled marginal collar
            (1.04, 1.24, 0.54, 0.45, 0.85, 0.94, 0.75),  # Mid tentacle arch
            (1.07, 1.38, 0.60, 0.65, 0.96, 1.00, 1.00),  # Rounded distal tips of 24 marginal tentacles
            (0.98, 0.96, 0.70, 0.16, 0.55, 0.85, 0.20),  # Inner base of tentacle skirt
            (0.92, 0.68, 0.80, 0.05, 0.75, 0.82, 0.00),  # Cupped royal-blue oral disc ring
            (0.90, 0.32, 0.88, 0.03, 0.90, 0.80, 0.00),  # Inner peristome ring
            (0.95, 0.11, 0.95, 0.02, 1.00, 0.92, 0.00),  # Elevated neon-green slit mouth cone
        ]

        polyp_rings = []
        for h_f, r_mult, v_uv, flex_r, poly_g, ao_a, fringe_w in polyp_profile:
            ring_center = p_origin + tilt_vec * (stalk_h * h_f)
            ring = []
            for j in range(n_polyp_seg + 1):
                u = j / n_polyp_seg
                ang = u * 2.0 * math.pi
                # 24 smooth rounded marginal tentacles around the perimeter (using 48 segments)
                petal_24 = (0.5 + 0.5 * math.cos(ang * 24.0)) ** 0.75
                r_fringe = 1.0 + fringe_w * (0.26 * petal_24 + 0.04 * math.sin(ang * 5.0 + p_idx))
                z_fringe = fringe_w * 0.0024 * (petal_24 - 0.35)

                r_curr = disc_r * r_mult * r_fringe
                offset = (b1 * math.cos(ang) + b2 * math.sin(ang)) * r_curr + tilt_vec * z_fringe
                pos = ring_center + offset
                rgba = (flex_r * (0.65 + 0.35 * petal_24), poly_g, phase_b, ao_a)
                ring.append((pos, u, v_uv, rgba))
            polyp_rings.append(ring)

        append_ring_tube(polyp_rings, close_bottom=True, close_top=True)

    mesh = bpy.data.meshes.new('Zoanthid_Button_Cluster')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    color_attr = mesh.color_attributes.new(name='COLOR_0', type='FLOAT_COLOR', domain='CORNER')
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

    base_img, norm_img, orm_img, em_img = build_zoanthid_textures(size=512)
    mat = build_pbr_material('Zoanthid_Cluster_Mat', base_img, norm_img, orm_img, em_img)

    mesh = build_zoanthid_cluster_mesh(mat)
    obj = bpy.data.objects.new('Coral_Zoanthid_Mat', mesh)
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
        'asset': 'coral-zoanthid-mat',
        'archetype': 'E2 - Encrusting Zoanthid Button Polyp Cluster (Zoanthus sp.)',
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
