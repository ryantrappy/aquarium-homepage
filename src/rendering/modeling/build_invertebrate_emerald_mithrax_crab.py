"""Original Emerald Mithrax Crab (Mithraculus sculptus) 3D asset (AQ-109).
Generates 512x512 procedural PBR maps (BaseColor, Normal, ORM), nodular emerald carapace
with anterolateral marginal teeth & bifid rostrum, heavy glossy chelipeds with cupped
spoon-tipped pincers, 8 setose walking legs grounded at z=0, and a 13-bone foraging rig.
"""

import importlib
import json
import math
import sys
from pathlib import Path

from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import invertebrate_common as ic  # noqa: E402

importlib.reload(ic)
import numpy as np  # noqa: E402

ASSET_ID = 'invertebrate-emerald-mithrax-crab'
SPECIES_ID = 'emerald-mithrax-crab'
CLIP_NAME = 'emerald_crab_forage'


def build_emerald_crab_textures(size=512):
    lin = (np.arange(size, dtype=np.float64) + 0.5) / size
    u, v = np.meshgrid(lin, lin)

    rgb = np.zeros((size, size, 3), dtype=np.float64)
    height = np.zeros((size, size), dtype=np.float64)
    rough = np.full((size, size), 0.35, dtype=np.float64)
    metal = np.zeros((size, size), dtype=np.float64)
    ao = np.full((size, size), 0.90, dtype=np.float64)

    # 1. Nodular Emerald-Jade Carapace (u < 0.55, v >= 0.46)
    car_mask = (u < 0.55) & (v >= 0.46)
    uc = np.clip((u - 0.02) / 0.52, 0.0, 1.0)
    vc = np.clip((v - 0.46) / 0.52, 0.0, 1.0)
    n1 = ic.np_fbm(uc * 16.0, vc * 16.0, octaves=4, seed=211)
    n2 = ic.np_fbm(uc * 48.0, vc * 48.0, octaves=3, seed=223)

    emerald = np.array([0.09, 0.42, 0.22])
    jade_hi = np.array([0.18, 0.58, 0.30])
    forest_dark = np.array([0.04, 0.19, 0.09])
    speck = ic.np_smoothstep(0.68, 0.80, n2)
    car_col = emerald[None, None, :] * (1.0 - 0.48 * n1[:, :, None]) + forest_dark[None, None, :] * (0.48 * n1[:, :, None])
    car_col = car_col * (1.0 - 0.32 * speck[:, :, None]) + jade_hi[None, None, :] * (0.32 * speck[:, :, None])
    car_h = 0.22 * n1 + 0.28 * speck + 0.10 * n2
    car_rough = 0.16 + 0.14 * n1 + 0.08 * (1.0 - speck)
    car_ao = 0.78 + 0.20 * n1

    # 2. Glossy Emerald Chelipeds & Spoon-Tipped Pincers (u >= 0.55, v >= 0.46)
    claw_mask = (u >= 0.55) & (v >= 0.46)
    ul = np.clip((u - 0.55) / 0.45, 0.0, 1.0)
    vl = np.clip((v - 0.46) / 0.52, 0.0, 1.0)
    ln1 = ic.np_fbm(ul * 20.0, vl * 24.0, octaves=4, seed=233)
    ln2 = ic.np_fbm(ul * 54.0, vl * 54.0, octaves=3, seed=241)
    bump = ic.np_smoothstep(0.60, 0.75, ln2)
    # Pale mint joint crease near vl ~ 0.15 and creamy-olive spoon rim near vl > 0.84
    spoon_mask = ic.np_smoothstep(0.80, 0.94, vl)
    joint_ring = np.exp(-((vl - 0.12) / 0.06) ** 2) * 0.55
    spoon_col = np.array([0.84, 0.86, 0.70])
    mint_col = np.array([0.52, 0.70, 0.50])
    cl_col = emerald[None, None, :] * (1.0 - 0.38 * ln1[:, :, None]) + forest_dark[None, None, :] * (0.38 * ln1[:, :, None])
    cl_col = cl_col * (1.0 - 0.35 * bump[:, :, None]) + jade_hi[None, None, :] * (0.35 * bump[:, :, None])
    cl_col = cl_col * (1.0 - joint_ring[:, :, None]) + mint_col[None, None, :] * joint_ring[:, :, None]
    cl_col = cl_col * (1.0 - 0.78 * spoon_mask[:, :, None]) + spoon_col[None, None, :] * (0.78 * spoon_mask[:, :, None])
    cl_h = 0.35 * bump + 0.12 * ln1
    cl_rough = 0.15 + 0.12 * ln1 + 0.14 * spoon_mask
    cl_ao = 0.80 + 0.18 * ln1

    # 3. Setose Olive-Emerald Jointed Walking Legs (u < 0.74, v < 0.46)
    leg_mask = (u < 0.74) & (v < 0.46)
    ug = np.clip(u / 0.74, 0.0, 1.0)
    vg = np.clip(v / 0.46, 0.0, 1.0)
    gn = ic.np_fbm(ug * 28.0, vg * 32.0, octaves=4, seed=251)
    # Fuzzy brown-olive setal fringes alternating with olive-green segments & dark horny tip (vg > 0.88)
    seta_tuft = ic.np_smoothstep(0.45, 0.74, np.sin(vg * 18.0 * math.pi + gn * 2.5)) * (1.0 - ic.np_smoothstep(0.84, 0.94, vg))
    tip_horn = ic.np_smoothstep(0.86, 0.96, vg)
    olive_chitin = np.array([0.14, 0.38, 0.17])
    seta_col = np.array([0.36, 0.34, 0.18])
    horn_col = np.array([0.16, 0.12, 0.06])
    lg_col = olive_chitin[None, None, :] * (1.0 - 0.65 * seta_tuft[:, :, None]) + seta_col[None, None, :] * (0.65 * seta_tuft[:, :, None])
    lg_col = lg_col * (1.0 - tip_horn[:, :, None]) + horn_col[None, None, :] * tip_horn[:, :, None]
    lg_h = 0.25 * seta_tuft + 0.15 * gn
    lg_rough = 0.24 + 0.48 * seta_tuft + 0.12 * gn
    lg_ao = 0.76 + 0.20 * gn

    # 4. Ventral Pale Pistachio Sternum (u >= 0.74, v < 0.24), Antennae (0.24..0.34), Eyes (v >= 0.34)
    stern_mask = (u >= 0.74) & (v < 0.24)
    stern_col = np.broadcast_to(np.array([0.46, 0.60, 0.44]), (size, size, 3))
    ant_mask = (u >= 0.74) & (v >= 0.24) & (v < 0.34)
    ant_col = np.broadcast_to(np.array([0.22, 0.36, 0.18]), (size, size, 3))
    eye_mask = (u >= 0.74) & (v >= 0.34) & (v < 0.46)
    eye_col = np.broadcast_to(np.array([0.04, 0.025, 0.015]), (size, size, 3))

    for mask, r_vals, h_vals, rg_vals, ao_vals in (
        (car_mask, car_col, car_h, car_rough, car_ao),
        (claw_mask, cl_col, cl_h, cl_rough, cl_ao),
        (leg_mask, lg_col, lg_h, lg_rough, lg_ao),
        (stern_mask, stern_col, np.zeros_like(u), np.full_like(u, 0.36), np.full_like(u, 0.78)),
        (ant_mask, ant_col, np.zeros_like(u), np.full_like(u, 0.28), np.full_like(u, 0.90)),
        (eye_mask, eye_col, np.zeros_like(u), np.full_like(u, 0.05), np.full_like(u, 0.96)),
    ):
        rgb[mask] = r_vals[mask]
        height[mask] = h_vals[mask]
        rough[mask] = np.clip(rg_vals[mask], 0.04, 0.96)
        ao[mask] = np.clip(ao_vals[mask], 0.2, 1.0)

    norm = ic.derive_normal_from_height(height, strength=3.0)
    return ic.create_and_pack_pbr_textures(ASSET_ID, rgb, norm, rough, metal, ao, size=size)


def carapace_relief(x_n, y_n):
    """Evaluate dorsal nodular Mithraculus carapace bosses and sulci relief (in meters)."""
    # Symmetrical rounded crab bosses across protogastric, mesogastric, cardiac & branchial regions
    bosses = [
        (0.00, 0.15, 0.26, 0.0012),    # mesogastric dome
        (0.00, -0.18, 0.22, 0.0011),   # cardiac boss
        (0.42, 0.16, 0.24, 0.00125),   # protogastric L
        (-0.42, 0.16, 0.24, 0.00125),  # protogastric R
        (0.55, -0.18, 0.26, 0.00115),  # metabranchial L
        (-0.55, -0.18, 0.26, 0.00115), # metabranchial R
        (0.24, 0.48, 0.18, 0.00075),   # hepatic L
        (-0.24, 0.48, 0.18, 0.00075),  # hepatic R
        (0.26, -0.52, 0.19, 0.00070),  # intestinal L
        (-0.26, -0.52, 0.19, 0.00070), # intestinal R
    ]
    dz = 0.0
    for bx, by, br, bh in bosses:
        d2 = ((x_n - bx) ** 2 + (y_n - by) ** 2) / (br * br)
        if d2 < 3.2:
            dz += bh * math.exp(-d2 * 1.45)
    # Cervical transverse groove & cardiac H-furrow
    groove = 0.0007 * math.exp(-((y_n + 0.02 - 0.16 * (x_n ** 2)) / 0.10) ** 2)
    return dz - groove


def build_emerald_crab_geometry_and_rig(mat):
    verts, faces, loop_uvs, vert_weights = [], [], [], []

    # =========================================================================
    # 1. WATERTIGHT DOMED NODULAR CARAPACE + MARGINAL TEETH + VENTRAL STERNUM
    # =========================================================================
    n_rad = 18
    n_ang = 56
    car_grid, car_uvs, car_wts = [], [], []
    half_w = 0.0145
    half_l = 0.0132
    z_mid = 0.0086

    for ir in range(n_rad + 1):
        # s in [0, 1]:
        #   0.00..0.52 -> dorsal carapace crown (center -> lateral rim)
        #   0.52..1.00 -> underside branchiostegite & folded ventral sternum closing at bottom center
        s = ir / n_rad
        row_pts, row_uvs, row_wts = [], [], []
        for ia in range(n_ang):
            th = 2.0 * math.pi * ia / n_ang
            ct, st = math.cos(th), math.sin(th)
            # Carapace front at -Y (st < 0): wider across posterior branchial, tapered anteriorly,
            # with 4 blunt Mithraculus anterolateral teeth per flank and a bifid rostrum at front (-Y)
            width_taper = 1.0 - 0.14 * max(0.0, -st) - 0.08 * max(0.0, st)
            # Anterolateral marginal teeth: 4 rounded lobes on front-side flanks (|ct|>0.35, -0.75 < st < 0.25)
            side_band = ic.smoothstep(0.32, 0.55, abs(ct)) * ic.smoothstep(-0.82, -0.58, st) * (1.0 - ic.smoothstep(0.18, 0.40, st))
            teeth = 0.075 * side_band * max(0.0, math.sin(abs(st + 0.80) * 14.0))
            # Bifid rostrum pair at extreme front (-Y, st < -0.90) + slight orbital notch beside eyes
            front_c = max(0.0, -st)
            rostrum = 0.09 * math.exp(-((abs(ct) - 0.14) / 0.08) ** 2) * (front_c ** 4)
            orbital = -0.05 * math.exp(-((abs(ct) - 0.34) / 0.07) ** 2) * (front_c ** 4)
            rim_mod = width_taper * (1.0 + teeth + rostrum + orbital)

            if s <= 0.52:
                r_n = s / 0.52
                x_n = ct * r_n
                y_n = -st * r_n
                x = ct * half_w * rim_mod * r_n
                y = st * half_l * rim_mod * r_n
                dome = 0.0058 * ((1.0 - r_n * r_n) ** 0.72)
                relief = carapace_relief(x_n, y_n) * (1.0 - r_n ** 3)
                z = z_mid + dome + relief
                u_tex = 0.28 + 0.24 * x / half_w
                v_tex = 0.72 + 0.24 * (-y) / half_l
            else:
                r_n = 1.0 - (s - 0.52) / 0.48
                x = ct * half_w * rim_mod * r_n
                y = st * half_l * rim_mod * r_n
                belly = 0.0038 * ((1.0 - r_n * r_n) ** 0.68)
                z = z_mid - belly
                u_tex = 0.86 + 0.10 * (ct * r_n)
                v_tex = 0.13 + 0.10 * (st * r_n)

            row_pts.append(Vector((x, y, z)))
            row_uvs.append((u_tex, v_tex))
            row_wts.append({'root': 1.0})
        car_grid.append(row_pts)
        car_uvs.append(row_uvs)
        car_wts.append(row_wts)

    car_v_start = len(verts)
    ic.append_surface_grid(verts, faces, loop_uvs, vert_weights, car_grid, car_uvs, car_wts, closed_u=False, closed_v=True)

    # Cap dorsal apex center & ventral sternum center so carapace is 100% closed manifold
    c_top = len(verts)
    verts.append((0.0, 0.0, z_mid + 0.0068))
    vert_weights.append({'root': 1.0})
    for ia in range(n_ang):
        i0 = car_v_start + ia
        i1 = car_v_start + ((ia + 1) % n_ang)
        faces.append((c_top, i0, i1))
        loop_uvs.extend([(0.28, 0.72), car_uvs[0][ia], car_uvs[0][(ia + 1) % n_ang]])

    c_bot = len(verts)
    verts.append((0.0, 0.0, z_mid - 0.0040))
    vert_weights.append({'root': 1.0})
    bot_ring = car_v_start + n_rad * n_ang
    for ia in range(n_ang):
        i0 = bot_ring + ia
        i1 = bot_ring + ((ia + 1) % n_ang)
        faces.append((c_bot, i1, i0))
        loop_uvs.extend([(0.86, 0.13), car_uvs[-1][ia], car_uvs[-1][(ia + 1) % n_ang]])

    # =========================================================================
    # 2. ORBITAL GLOSSY EYES + PAIR OF FINE ANTENNAE (anchored in rostrum)
    # =========================================================================
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        ic.append_ellipsoid(
            verts, faces, loop_uvs, vert_weights,
            center=(sign * 0.0038, -0.0102, z_mid + 0.0006),
            radii=(0.00105, 0.00105, 0.00105),
            u_range=(0.78, 0.94), v_range=(0.36, 0.44),
            w_dict={'root': 1.0}, seg_u=12, seg_v=8,
        )
        b_ant = f'antenna_{side_label}'
        ant_pts = [
            Vector((sign * 0.0018, -0.0102, z_mid - 0.0004)),
            Vector((sign * 0.0038, -0.0148, z_mid + 0.0004)),
            Vector((sign * 0.0058, -0.0185, z_mid + 0.0010)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            ant_pts, [0.00042, 0.00026, 0.00012], (0.78, 0.94), (0.25, 0.33),
            [{'root': 0.7, b_ant: 0.3}, {b_ant: 1.0}, {b_ant: 1.0}], ring_seg=6,
        )

    # =========================================================================
    # 3. HEAVY GLOSSY CHELIPEDS WITH SPOON-TIPPED ALGAE-SCRAPING PINCERS
    # =========================================================================
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        b_claw = f'claw_{side_label}'
        sh_pt = Vector((sign * 0.0092, -0.0068, z_mid - 0.0014))
        merus = Vector((sign * 0.0155, -0.0118, z_mid - 0.0010))
        carpus = Vector((sign * 0.0172, -0.0168, z_mid - 0.0016))
        palm = Vector((sign * 0.0116, -0.0205, z_mid - 0.0028))

        arm_pts = [sh_pt, merus, carpus, (carpus + palm) * 0.5, palm]
        arm_rads = [0.00185, 0.00245, 0.00270, 0.00295, 0.00265]
        arm_wts = [
            {'root': 0.65, b_claw: 0.35},
            {'root': 0.15, b_claw: 0.85},
            {b_claw: 1.0}, {b_claw: 1.0}, {b_claw: 1.0},
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            arm_pts, arm_rads, (0.58, 0.96), (0.48, 0.86),
            arm_wts, ring_seg=12, aspect=0.78, ridge_amp=0.07, ridge_freq=6,
        )

        # Dorsal nodular arm tubercles on merus & carpus (authentic Mithraculus armor)
        for t_pt, t_r in (
            (merus + Vector((0, 0, 0.0022)), 0.00095),
            (carpus + Vector((sign * 0.0008, -0.0004, 0.0024)), 0.00105),
            (palm + Vector((0, 0, 0.0021)), 0.00085),
        ):
            ic.append_ellipsoid(
                verts, faces, loop_uvs, vert_weights,
                center=t_pt, radii=(t_r, t_r, t_r * 0.8),
                u_range=(0.60, 0.90), v_range=(0.52, 0.78),
                w_dict={b_claw: 1.0}, seg_u=8, seg_v=6,
            )

        # Curved spoon-tipped scraping pincers anchored inside palm (zero seam gap)
        for z_off, y_off, f_aspect in ((0.0010, -0.0038, 0.68), (-0.0010, -0.0035, 0.65)):
            f_pts = [
                palm + Vector((sign * 0.0014, 0.0012, z_off * 0.40)),
                palm + Vector((-sign * 0.0032, -0.0024, z_off * 0.92)),
                Vector((sign * 0.0044, -0.0235 + y_off * 0.25, z_mid - 0.0034 + z_off * 0.25)),
            ]
            f_rads = [0.00155, 0.00112, 0.00064]  # wide blunt spoon tip instead of sharp needle
            ic.append_limb_tube(
                verts, faces, loop_uvs, vert_weights,
                f_pts, f_rads, (0.58, 0.96), (0.82, 0.97),
                [{b_claw: 1.0}, {b_claw: 1.0}, {b_claw: 1.0}], ring_seg=9, aspect=f_aspect,
            )

    # =========================================================================
    # 4. 8 STOUT SETOSE WALKING LEGS (L1..L4, R1..R4 grounded flush at z = 0)
    # =========================================================================
    leg_defs = [
        # (idx, y_coxa, x_knee, y_knee, x_foot, y_foot, scale_r)
        (1, -0.0042, 0.0205, -0.0110, 0.0265, -0.0165, 1.04),
        (2, -0.0006, 0.0235, -0.0022, 0.0282, -0.0035, 1.00),
        (3, 0.0030, 0.0220, 0.0068, 0.0262, 0.0102, 0.92),
        (4, 0.0062, 0.0178, 0.0138, 0.0215, 0.0195, 0.82),
    ]
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        for l_idx, y_cx, x_kn, y_kn, x_ft, y_ft, sr in leg_defs:
            b_leg = f'leg_{side_label}{l_idx}'
            coxa = Vector((sign * 0.0098, y_cx, z_mid - 0.0018))
            merus = Vector((sign * (0.0165 - 0.0012 * l_idx), ic.lerp(y_cx, y_kn, 0.45), z_mid + 0.0018))
            carpus = Vector((sign * x_kn, y_kn, z_mid - 0.0004))
            propodus = Vector((sign * (x_ft * 0.93), ic.lerp(y_kn, y_ft, 0.80), 0.0034))
            dactyl = Vector((sign * x_ft, y_ft, 0.0002))

            pts = [coxa, merus, carpus, propodus, dactyl]
            rads = [0.00145 * sr, 0.00162 * sr, 0.00138 * sr, 0.00105 * sr, 0.00038 * sr]
            wts = [{'root': 0.6, b_leg: 0.4}, {'root': 0.15, b_leg: 0.85}, {b_leg: 1.0}, {b_leg: 1.0}, {b_leg: 1.0}]
            ic.append_limb_tube(
                verts, faces, loop_uvs, vert_weights,
                pts, rads, (0.04, 0.70), (0.04, 0.44),
                wts, ring_seg=9, aspect=0.84, ridge_amp=0.06, ridge_freq=5,
            )

    # =========================================================================
    # 5. 13-BONE FORAGING ARMATURE + 49-FRAME LOOPING ANIMATION
    # =========================================================================
    bone_specs = [
        ('root', None, (0.0, 0.002, z_mid), (0.0, -0.010, z_mid)),
        ('claw_L', 'root', (0.0092, -0.0068, z_mid - 0.0014), (0.0116, -0.0205, z_mid - 0.0028)),
        ('claw_R', 'root', (-0.0092, -0.0068, z_mid - 0.0014), (-0.0116, -0.0205, z_mid - 0.0028)),
        ('antenna_L', 'root', (0.0020, -0.0124, z_mid), (0.0058, -0.0192, z_mid + 0.0012)),
        ('antenna_R', 'root', (-0.0020, -0.0124, z_mid), (-0.0058, -0.0192, z_mid + 0.0012)),
    ]
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        for l_idx, y_cx, _, _, x_ft, y_ft, _ in leg_defs:
            bone_specs.append((
                f'leg_{side_label}{l_idx}',
                'root',
                (sign * 0.0098, y_cx, z_mid - 0.0018),
                (sign * x_ft, y_ft, 0.0012),
            ))

    def animate_frame(phase):
        rots = {
            'root': (math.radians(1.5 * math.sin(phase * 2.0)), math.radians(2.8 * math.sin(phase)), math.radians(1.5 * math.cos(phase))),
            # Alternating left/right spoon-claw algae picking & bringing food toward mouthparts
            'claw_L': (math.radians(11.0 * math.sin(phase)), math.radians(-5.0 * math.sin(phase)), math.radians(12.0 * (0.5 - 0.5 * math.cos(phase)))),
            'claw_R': (math.radians(11.0 * math.sin(phase + math.pi)), math.radians(5.0 * math.sin(phase + math.pi)), math.radians(-12.0 * (0.5 - 0.5 * math.cos(phase + math.pi)))),
            'antenna_L': (math.radians(8.0 * math.sin(phase * 2.0)), 0.0, math.radians(10.0 * math.sin(phase + 0.5))),
            'antenna_R': (math.radians(8.0 * math.sin(phase * 2.0 + 1.6)), 0.0, math.radians(-10.0 * math.sin(phase + 2.1))),
        }
        # Coordinated tetrapod/metachronal crab walking wave (only lifts upward from ground)
        for side_label, sign in (('L', 1.0), ('R', -1.0)):
            for l_idx in (1, 2, 3, 4):
                alt = (l_idx + (0 if sign > 0 else 1)) % 2
                p_leg = phase + (0.0 if alt == 0 else math.pi) + l_idx * 0.35
                lift = max(0.0, math.sin(p_leg))
                rots[f'leg_{side_label}{l_idx}'] = (
                    math.radians(3.5 * math.sin(p_leg)),
                    math.radians(-sign * 6.5 * lift),
                    math.radians(sign * 8.0 * math.sin(p_leg)),
                )
        return rots

    return ic.assemble_rigged_invertebrate(
        'Emerald_Mithrax_Crab',
        verts, faces, loop_uvs, vert_weights,
        bone_specs, mat, CLIP_NAME, animate_frame,
    )


def main():
    ic.clear_scene_and_setup(samples=24)
    albedo, norm, orm = build_emerald_crab_textures(size=512)
    mat = ic.build_invertebrate_pbr_material('Emerald_Mithrax_Crab_Mat', albedo, norm, orm, normal_strength=0.78, spec=0.60)
    arm_obj, mesh_obj, tris = build_emerald_crab_geometry_and_rig(mat)
    report = ic.save_export_and_render_thumbnail(
        ASSET_ID, SPECIES_ID, arm_obj, mesh_obj,
        elev_deg=26.0, yaw_deg=42.0, margin=1.14,
    )
    report['triangles'] = tris
    print('EMERALD_CRAB_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
