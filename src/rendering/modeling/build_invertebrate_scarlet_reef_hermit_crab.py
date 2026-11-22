"""Original Scarlet Reef Hermit Crab (Paguristes cadenati) 3D asset (AQ-109).
Generates 512x512 procedural PBR maps (BaseColor, Normal, ORM), weathered coralline-encrusted
Cerith spiral shell housing a vivid scarlet crab with asymmetrical Diogenidae claws, 4 curved
walking legs grounded at z=0, bright yellow eyestalks, and a 12-bone scurry rig.
"""

import importlib
import json
import math
import sys
from pathlib import Path

from mathutils import Euler, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import invertebrate_common as ic  # noqa: E402

importlib.reload(ic)
import numpy as np  # noqa: E402

ASSET_ID = 'invertebrate-scarlet-reef-hermit-crab'
SPECIES_ID = 'scarlet-reef-hermit-crab'
CLIP_NAME = 'hermit_crab_scurry'


def build_hermit_crab_textures(size=512):
    lin = (np.arange(size, dtype=np.float64) + 0.5) / size
    u, v = np.meshgrid(lin, lin)

    rgb = np.zeros((size, size, 3), dtype=np.float64)
    height = np.zeros((size, size), dtype=np.float64)
    rough = np.full((size, size), 0.45, dtype=np.float64)
    metal = np.zeros((size, size), dtype=np.float64)
    ao = np.full((size, size), 0.90, dtype=np.float64)

    # 1. Weathered Coralline-Encrusted Cerith Shell (v >= 0.46)
    shell_mask = v >= 0.46
    v_sec = np.clip((v - 0.46) / 0.52, 0.0, 1.0)
    n1 = ic.np_fbm(u * 12.0, v_sec * 8.0, octaves=4, seed=11)
    n2 = ic.np_fbm(u * 38.0, v_sec * 24.0, octaves=3, seed=29)
    axial_ribs = 0.5 + 0.5 * np.sin(u * 48.0 * 2.0 * math.pi + n1 * 1.4)
    spiral_cords = 0.5 + 0.5 * np.sin(v_sec * 9.0 * math.pi)

    sand_shell = np.array([0.74, 0.67, 0.56])
    weathered_grey = np.array([0.32, 0.30, 0.28])
    s_col = sand_shell[None, None, :] * (1.0 - 0.65 * n1[:, :, None]) + weathered_grey[None, None, :] * (0.65 * n1[:, :, None])

    # Crisp dark-brown spiral/axial bands + mottled rose-lavender coralline encrustations + olive crevice grime
    rib_crevice = 1.0 - ic.np_smoothstep(0.15, 0.65, axial_ribs)
    crevice_col = np.array([0.24, 0.21, 0.17])
    s_col = s_col * (1.0 - 0.48 * rib_crevice[:, :, None]) + crevice_col[None, None, :] * (0.48 * rib_crevice[:, :, None])

    cor_n = ic.np_fbm(u * 9.0 + 4.2, v_sec * 6.0 - 2.1, octaves=4, seed=47)
    cor_mask = ic.np_smoothstep(0.50, 0.68, cor_n) * ic.np_smoothstep(0.06, 0.24, u)
    cor_col = np.array([0.62, 0.26, 0.42])
    s_col = s_col * (1.0 - 0.82 * cor_mask[:, :, None]) + cor_col[None, None, :] * (0.82 * cor_mask[:, :, None])

    # Deep dark interior cavity shadow on aperture lining (v_sec > 0.88 or last throat cap u > 0.96)
    throat_mask = np.maximum(ic.np_smoothstep(0.86, 0.96, v_sec), ic.np_smoothstep(0.955, 0.985, u))
    s_col = s_col * (1.0 - 0.92 * throat_mask[:, :, None]) + np.array([0.04, 0.03, 0.03])[None, None, :] * (0.92 * throat_mask[:, :, None])
    s_col *= (0.88 + 0.22 * (n2[:, :, None] - 0.5))

    s_h = 0.45 * axial_ribs + 0.22 * spiral_cords + 0.25 * n2
    s_rough = 0.52 + 0.24 * n2 + 0.16 * cor_mask
    s_ao = 0.68 + 0.26 * axial_ribs - 0.45 * throat_mask

    # 2. Scarlet Exoskeleton (Carapace, Chelipeds, Walking Legs) (u < 0.58, v < 0.46)
    crab_mask = (u < 0.58) & (v < 0.46)
    uc = np.clip(u / 0.58, 0.0, 1.0)
    vc = np.clip(v / 0.46, 0.0, 1.0)
    cn1 = ic.np_fbm(uc * 22.0, vc * 22.0, octaves=4, seed=61)
    cn2 = ic.np_fbm(uc * 56.0, vc * 56.0, octaves=3, seed=73)
    scarlet_base = np.array([0.82, 0.08, 0.04])
    scarlet_deep = np.array([0.46, 0.03, 0.02])
    tubercle_dot = ic.np_smoothstep(0.66, 0.78, cn2) * 0.55
    c_rgb = scarlet_base[None, None, :] * (1.0 - 0.45 * cn1[:, :, None]) + scarlet_deep[None, None, :] * (0.45 * cn1[:, :, None])
    # Warm coral-orange tubercle & pincer tip highlights near vc > 0.85
    tip_mask = ic.np_smoothstep(0.84, 0.96, vc)
    ivory_tip = np.array([0.90, 0.72, 0.48])
    c_rgb = c_rgb * (1.0 - 0.55 * tubercle_dot[:, :, None]) + np.array([0.95, 0.34, 0.14])[None, None, :] * (0.55 * tubercle_dot[:, :, None])
    c_rgb = c_rgb * (1.0 - 0.72 * tip_mask[:, :, None]) + ivory_tip[None, None, :] * (0.72 * tip_mask[:, :, None])
    c_h = 0.35 * tubercle_dot + 0.15 * cn1
    c_rough = 0.18 + 0.16 * cn1 + 0.10 * tubercle_dot
    c_ao = 0.80 + 0.18 * cn1

    # 3. Bright Lemon-Yellow Eyestalks (0.58 <= u < 0.80, v < 0.24)
    eyestalk_mask = (u >= 0.58) & (u < 0.80) & (v < 0.24)
    vy = np.clip(v / 0.24, 0.0, 1.0)
    yellow_col = np.array([0.96, 0.80, 0.06])[None, None, :]
    orange_root = np.array([0.90, 0.32, 0.05])[None, None, :]
    t_root = 1.0 - ic.np_smoothstep(0.08, 0.35, vy)
    es_rgb = yellow_col * (1.0 - t_root[:, :, None]) + orange_root * t_root[:, :, None]

    # 4. Scarlet-Orange Sensory Antennae (0.58 <= u < 0.80, 0.24 <= v < 0.46)
    ant_mask = (u >= 0.58) & (u < 0.80) & (v >= 0.24) & (v < 0.46)
    va = np.clip((v - 0.24) / 0.22, 0.0, 1.0)
    bands = 0.5 + 0.5 * np.sin(va * 26.0 * math.pi)
    ant_rgb = (np.array([0.90, 0.16, 0.05])[None, None, :] * (0.7 + 0.3 * bands[:, :, None]))

    # 5. Glossy Obsidian Eyes (u >= 0.80, v < 0.24) & Ivory Teeth (u >= 0.80, 0.24 <= v < 0.46)
    eye_mask = (u >= 0.80) & (v < 0.24)
    eye_rgb = np.broadcast_to(np.array([0.015, 0.015, 0.022]), (size, size, 3))
    tip_uv_mask = (u >= 0.80) & (v >= 0.24) & (v < 0.46)
    tip_uv_rgb = np.broadcast_to(np.array([0.88, 0.78, 0.58]), (size, size, 3))

    for mask, r_vals, h_vals, rg_vals, ao_vals in (
        (shell_mask, s_col, s_h, s_rough, s_ao),
        (crab_mask, c_rgb, c_h, c_rough, c_ao),
        (eyestalk_mask, es_rgb, np.zeros_like(u), np.full_like(u, 0.16), np.full_like(u, 0.92)),
        (ant_mask, ant_rgb, 0.05 * bands, np.full_like(u, 0.22), np.full_like(u, 0.92)),
        (eye_mask, eye_rgb, np.zeros_like(u), np.full_like(u, 0.05), np.full_like(u, 0.96)),
        (tip_uv_mask, tip_uv_rgb, np.zeros_like(u), np.full_like(u, 0.28), np.full_like(u, 0.90)),
    ):
        rgb[mask] = r_vals[mask]
        height[mask] = h_vals[mask]
        rough[mask] = np.clip(rg_vals[mask], 0.04, 0.96)
        ao[mask] = np.clip(ao_vals[mask], 0.2, 1.0)

    norm = ic.derive_normal_from_height(height, strength=3.0)
    return ic.create_and_pack_pbr_textures(ASSET_ID, rgb, norm, rough, metal, ao, size=size)


def build_hermit_crab_geometry_and_rig(mat):
    verts, faces, loop_uvs, vert_weights = [], [], [], []

    # =========================================================================
    # 1. EXPOSED SCARLET CEPHALOTHORAX SHIELD TUCKED INTO SHELL APERTURE
    # =========================================================================
    ceph_pts = [
        Vector((0.0, 0.0085, 0.0110)),   # anchored deeply inside shell mouth
        Vector((0.0, 0.0010, 0.0102)),
        Vector((0.0, -0.0065, 0.0094)),
        Vector((0.0, -0.0125, 0.0088)),  # rostrum front behind eyestalks
    ]
    ceph_rad = [0.0064, 0.0066, 0.0056, 0.0036]
    ic.append_limb_tube(
        verts, faces, loop_uvs, vert_weights,
        ceph_pts, ceph_rad, (0.04, 0.50), (0.04, 0.34),
        [{'shell': 0.55, 'root': 0.45}, {'root': 0.85, 'shell': 0.15}, {'root': 1.0}, {'root': 1.0}],
        ring_seg=14, aspect=0.72,
    )

    # =========================================================================
    # 2. ADOPTED 6-WHORL RIBBED CERITH SHELL (Tilted naturally back-right)
    # =========================================================================
    n_whorls = 6.2
    n_steps = 136
    n_sec = 20
    shell_pivot = Vector((0.0008, 0.0042, 0.0115))
    # Cerith shell spire angles back-up-right (+Y, +Z, +X) with aperture opening down-front (-Y)
    shell_rot = Euler((math.radians(-68.0), math.radians(-16.0), math.radians(-28.0)), 'XYZ').to_matrix()

    def cerith_whorl(t_turn, v_sec):
        theta = 2.0 * math.pi * t_turn
        frac = t_turn / n_whorls
        # Tightly coiled self-similar Cerith spire with overlapping ribs and zero gaps
        g = 0.09 * math.exp(math.log(1.0 / 0.09) * frac)
        r_center = 0.0044 * g
        z_center = 0.0205 * (1.0 - (g - 0.09) / 0.91)

        tube_rx = 0.0064 * g
        tube_rz = 0.0062 * g

        ang = 2.0 * math.pi * v_sec
        ribs = 0.14 * (0.5 + 0.5 * math.sin(theta * 10.0)) * ic.smoothstep(0.18, 0.85, frac)
        beads = 0.05 * math.sin(v_sec * 3.0 * math.pi)
        lip = 1.0 + 0.12 * ic.smoothstep(n_whorls - 0.25, n_whorls, t_turn)

        r_tot = (r_center + math.cos(ang) * tube_rx * (1.0 + ribs + beads)) * lip
        z_tot = z_center + math.sin(ang) * tube_rz * (1.0 + 0.4 * ribs)
        local_p = Vector((r_tot * math.cos(theta), r_tot * math.sin(theta), z_tot))
        return shell_pivot + (shell_rot @ local_p)

    shell_grid, shell_uvs, shell_wts = [], [], []
    shell_v_start = len(verts)
    for it in range(n_steps + 1):
        t_turn = 0.08 + (n_whorls - 0.08) * (it / n_steps)
        row_pts, row_uvs, row_wts = [], [], []
        for isec in range(n_sec):
            vs = isec / n_sec
            row_pts.append(cerith_whorl(t_turn, vs))
            row_uvs.append((0.02 + 0.93 * (it / n_steps), 0.48 + 0.48 * vs))
            row_wts.append({'shell': 0.92, 'root': 0.08})
        shell_grid.append(row_pts)
        shell_uvs.append(row_uvs)
        shell_wts.append(row_wts)

    ic.append_surface_grid(verts, faces, loop_uvs, vert_weights, shell_grid, shell_uvs, shell_wts, closed_u=False, closed_v=True)

    # Cap apex tip & dark recessed aperture inner throat
    apex_pt = cerith_whorl(0.08, 0.25) + (shell_rot @ Vector((0.0, 0.0, 0.0012)))
    apex_idx = len(verts)
    verts.append((float(apex_pt.x), float(apex_pt.y), float(apex_pt.z)))
    vert_weights.append({'shell': 0.92, 'root': 0.08})
    for isec in range(n_sec):
        i0 = shell_v_start + isec
        i1 = shell_v_start + ((isec + 1) % n_sec)
        faces.append((apex_idx, i1, i0))
        loop_uvs.extend([(0.02, 0.92), shell_uvs[0][isec], shell_uvs[0][(isec + 1) % n_sec]])

    ap_pts = shell_grid[-1]
    ap_center = sum(ap_pts, Vector((0, 0, 0))) / len(ap_pts) + (shell_rot @ Vector((0.0, 0.0, 0.004)))
    ap_idx = len(verts)
    verts.append((float(ap_center.x), float(ap_center.y), float(ap_center.z)))
    vert_weights.append({'shell': 0.92, 'root': 0.08})
    last_ring = shell_v_start + n_steps * n_sec
    for isec in range(n_sec):
        i0 = last_ring + isec
        i1 = last_ring + ((isec + 1) % n_sec)
        faces.append((ap_idx, i0, i1))
        loop_uvs.extend([(0.97, 0.94), (0.97, 0.94), (0.97, 0.94)])

    # =========================================================================
    # 3. ASYMMETRICAL SCARLET CHELIPEDS (Left claw noticeably larger: Diogenidae)
    # =========================================================================
    for side_label, sign, scale_c in (('L', 1.0, 1.18), ('R', -1.0, 0.88)):
        b_claw = f'claw_{side_label}'
        sh_pt = Vector((sign * 0.0046, -0.0095, 0.0078))
        elbow = Vector((sign * 0.0108, -0.0148, 0.0056))
        wrist = Vector((sign * 0.0082, -0.0196, 0.0036))
        palm = Vector((sign * 0.0052, -0.0228, 0.0028))

        arm_pts = [sh_pt, (sh_pt + elbow) * 0.52, elbow, (elbow + wrist) * 0.5, wrist, palm]
        arm_rads = [0.0017 * scale_c, 0.0020 * scale_c, 0.0023 * scale_c, 0.0025 * scale_c, 0.0029 * scale_c, 0.0024 * scale_c]
        arm_wts = [
            {'root': 0.65, b_claw: 0.35},
            {'root': 0.25, b_claw: 0.75},
            {b_claw: 1.0}, {b_claw: 1.0}, {b_claw: 1.0}, {b_claw: 1.0},
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            arm_pts, arm_rads, (0.04, 0.52), (0.04, 0.36),
            arm_wts, ring_seg=10, aspect=0.78, ridge_amp=0.06, ridge_freq=5,
        )

        # Articulated upper & lower pincer dactyls (ivory-tipped inward curve)
        for z_off, pinch_y, tip_scale in ((0.0009, -0.0272, 1.0), (-0.0008, -0.0268, 0.86)):
            p_pts = [
                palm + Vector((0.0, 0.0, z_off * 0.6)),
                palm + Vector((-sign * 0.0016 * scale_c, -0.0024 * scale_c, z_off)),
                Vector((sign * 0.0024, pinch_y - 0.0014 * scale_c, 0.0024 + z_off * 0.3)),
            ]
            p_rads = [0.0014 * tip_scale * scale_c, 0.00095 * scale_c, 0.00032 * scale_c]
            ic.append_limb_tube(
                verts, faces, loop_uvs, vert_weights,
                p_pts, p_rads, (0.06, 0.50), (0.28, 0.44),
                [{b_claw: 1.0}, {b_claw: 1.0}, {b_claw: 1.0}], ring_seg=8,
            )

    # =========================================================================
    # 4. 4 LONG CURVED SEGMENTED WALKING LEGS (Touching ground flush at z = 0)
    # =========================================================================
    leg_configs = [
        # (bone_name, sign, y_shoulder, knee_out, knee_y, foot_x, foot_y)
        ('leg_L1', 1.0, -0.0075, 0.0155, -0.0135, 0.0190, -0.0170),
        ('leg_L2', 1.0, -0.0040, 0.0172, -0.0042, 0.0205, -0.0045),
        ('leg_R1', -1.0, -0.0075, -0.0155, -0.0135, -0.0190, -0.0170),
        ('leg_R2', -1.0, -0.0040, -0.0172, -0.0042, -0.0205, -0.0045),
    ]
    for b_leg, sign, y_sh, x_kn, y_kn, x_ft, y_ft in leg_configs:
        coxa = Vector((sign * 0.0048, y_sh, 0.0076))
        merus = Vector((sign * 0.0110, y_sh - 0.0022, 0.0118))
        carpus = Vector((x_kn, y_kn, 0.0098))
        propodus = Vector((x_ft * 0.94, y_ft, 0.0042))
        dactyl = Vector((x_ft, y_ft - 0.0012, 0.0002))

        pts = [coxa, merus, carpus, propodus, dactyl]
        rads = [0.00145, 0.00155, 0.00130, 0.00095, 0.00032]
        wts = [{'root': 0.55, b_leg: 0.45}, {'root': 0.15, b_leg: 0.85}, {b_leg: 1.0}, {b_leg: 1.0}, {b_leg: 1.0}]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            pts, rads, (0.04, 0.52), (0.06, 0.42),
            wts, ring_seg=9, aspect=0.86, ridge_amp=0.05, ridge_freq=4,
        )

    # =========================================================================
    # 5. BRIGHT YELLOW EYESTALKS + GLOSSY BLACK EYES + LONG ANTENNAE
    # =========================================================================
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        b_eye = f'eye_{side_label}'
        b_ant = f'antenna_{side_label}'

        # Unmistakable bright yellow-amber eyestalk
        est_pts = [
            Vector((sign * 0.0014, -0.0124, 0.0102)),
            Vector((sign * 0.0022, -0.0156, 0.0124)),
            Vector((sign * 0.0027, -0.0182, 0.0140)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            est_pts, [0.00072, 0.00058, 0.00062], (0.60, 0.78), (0.02, 0.22),
            [{'root': 0.65, b_eye: 0.35}, {b_eye: 1.0}, {b_eye: 1.0}],
            ring_seg=8,
        )
        # Glossy obsidian compound cornea orb
        ic.append_ellipsoid(
            verts, faces, loop_uvs, vert_weights,
            center=(sign * 0.0028, -0.0188, 0.0144),
            radii=(0.00092, 0.00092, 0.00092),
            u_range=(0.82, 0.96), v_range=(0.04, 0.20),
            w_dict={b_eye: 1.0}, seg_u=12, seg_v=8,
        )

        # Long sweeping scarlet-orange sensory antenna
        ant_pts = []
        ant_rads = []
        ant_wts = []
        for ai in range(9):
            ua = ai / 8.0
            ax = sign * (0.0028 + 0.0135 * (ua ** 0.92))
            ay = -0.0120 - 0.0180 * math.sin(ua * math.pi * 0.55)
            az = 0.0094 + 0.0075 * math.sin(ua * math.pi * 0.85) - 0.0018 * (ua ** 2)
            ant_pts.append(Vector((ax, ay, az)))
            ant_rads.append(ic.lerp(0.00046, 0.00014, ua))
            ant_wts.append({'root': 0.7, b_ant: 0.3} if ua < 0.15 else {b_ant: 1.0})

        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            ant_pts, ant_rads, (0.60, 0.78), (0.26, 0.44),
            ant_wts, ring_seg=6,
        )

        # Short delicate antennule beside eyestalk
        nu_pts = [
            Vector((sign * 0.0008, -0.0132, 0.0094)),
            Vector((sign * 0.0015, -0.0168, 0.0102)),
            Vector((sign * 0.0022, -0.0195, 0.0092)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            nu_pts, [0.00032, 0.00024, 0.00014], (0.60, 0.78), (0.26, 0.44),
            [{'root': 1.0}, {b_eye: 0.4, 'root': 0.6}, {b_eye: 0.6, 'root': 0.4}], ring_seg=6,
        )

    # =========================================================================
    # 6. 12-BONE SCURRY ARMATURE + 49-FRAME LOOPING ANIMATION
    # =========================================================================
    bone_specs = [
        ('root', None, (0.0, 0.002, 0.0095), (0.0, -0.010, 0.0092)),
        ('shell', 'root', (0.0, 0.004, 0.0115), (0.004, 0.018, 0.022)),
        ('claw_L', 'root', (0.0046, -0.0095, 0.0078), (0.0068, -0.0220, 0.0034)),
        ('claw_R', 'root', (-0.0046, -0.0095, 0.0078), (-0.0068, -0.0220, 0.0034)),
        ('leg_L1', 'root', (0.0048, -0.0075, 0.0076), (0.0175, -0.0155, 0.0012)),
        ('leg_L2', 'root', (0.0048, -0.0040, 0.0076), (0.0190, -0.0042, 0.0012)),
        ('leg_R1', 'root', (-0.0048, -0.0075, 0.0076), (-0.0175, -0.0155, 0.0012)),
        ('leg_R2', 'root', (-0.0048, -0.0040, 0.0076), (-0.0190, -0.0042, 0.0012)),
        ('eye_L', 'root', (0.0014, -0.0124, 0.0102), (0.0028, -0.0186, 0.0144)),
        ('eye_R', 'root', (-0.0014, -0.0124, 0.0102), (-0.0028, -0.0186, 0.0144)),
        ('antenna_L', 'root', (0.0028, -0.0120, 0.0094), (0.0145, -0.0260, 0.0125)),
        ('antenna_R', 'root', (-0.0028, -0.0120, 0.0094), (-0.0145, -0.0260, 0.0125)),
    ]

    def animate_frame(phase):
        return {
            'root': (math.radians(1.6 * math.sin(phase * 2.0)), math.radians(2.2 * math.sin(phase)), math.radians(2.0 * math.cos(phase))),
            'shell': (math.radians(3.0 * math.sin(phase * 2.0 - 0.5)), math.radians(3.4 * math.cos(phase)), math.radians(2.0 * math.sin(phase))),
            'claw_L': (math.radians(8.5 * math.sin(phase)), 0.0, math.radians(-5.0 * math.cos(phase))),
            'claw_R': (math.radians(8.5 * math.sin(phase + math.pi)), 0.0, math.radians(5.0 * math.cos(phase + math.pi))),
            'leg_L1': (math.radians(4.5 * max(0.0, math.sin(phase))), math.radians(4.0 * max(0.0, math.sin(phase))), math.radians(10.0 * math.sin(phase + 0.5))),
            'leg_R2': (math.radians(4.5 * max(0.0, math.sin(phase))), math.radians(-4.0 * max(0.0, math.sin(phase))), math.radians(-10.0 * math.sin(phase + 0.5))),
            'leg_R1': (math.radians(4.5 * max(0.0, math.sin(phase + math.pi))), math.radians(-4.0 * max(0.0, math.sin(phase + math.pi))), math.radians(-10.0 * math.sin(phase + math.pi + 0.5))),
            'leg_L2': (math.radians(4.5 * max(0.0, math.sin(phase + math.pi))), math.radians(4.0 * max(0.0, math.sin(phase + math.pi))), math.radians(10.0 * math.sin(phase + math.pi + 0.5))),
            'eye_L': (math.radians(4.0 * math.sin(phase)), 0.0, math.radians(6.0 * math.cos(phase))),
            'eye_R': (math.radians(4.0 * math.sin(phase + 1.4)), 0.0, math.radians(-6.0 * math.cos(phase + 1.4))),
            'antenna_L': (math.radians(10.0 * math.sin(phase)), math.radians(4.0 * math.cos(phase)), math.radians(14.0 * math.sin(phase + 0.5))),
            'antenna_R': (math.radians(10.0 * math.sin(phase + 1.9)), math.radians(-4.0 * math.cos(phase + 1.9)), math.radians(-14.0 * math.sin(phase + 2.2))),
        }

    return ic.assemble_rigged_invertebrate(
        'Scarlet_Reef_Hermit_Crab',
        verts, faces, loop_uvs, vert_weights,
        bone_specs, mat, CLIP_NAME, animate_frame,
    )


def main():
    ic.clear_scene_and_setup(samples=24)
    albedo, norm, orm = build_hermit_crab_textures(size=512)
    mat = ic.build_invertebrate_pbr_material('Scarlet_Hermit_Crab_Mat', albedo, norm, orm, normal_strength=0.75, spec=0.56)
    arm_obj, mesh_obj, tris = build_hermit_crab_geometry_and_rig(mat)
    report = ic.save_export_and_render_thumbnail(
        ASSET_ID, SPECIES_ID, arm_obj, mesh_obj,
        elev_deg=24.0, yaw_deg=42.0, margin=1.14,
    )
    report['triangles'] = tris
    print('HERMIT_CRAB_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
