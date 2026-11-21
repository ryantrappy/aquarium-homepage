"""Original Banded Trochus Snail (Trochus histrio / Tectus fenestratus) 3D asset (AQ-109).
Generates 512x512 procedural PBR maps (BaseColor, Normal, ORM), 5.5-whorl beaded conical shell
with pearlescent aperture over a ruffled muscular foot, operculum, tentacles, and 9-bone glide rig.
Safe for both live Blender MCP execution and background CLI Blender.
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

ASSET_ID = 'invertebrate-banded-trochus-snail'
SPECIES_ID = 'banded-trochus-snail'
CLIP_NAME = 'trochus_snail_glide'


def build_trochus_textures(size=512):
    """Synthesize matching 512x512 Albedo, Normal (from height), Roughness, Metallic, and AO."""
    lin = (np.arange(size, dtype=np.float64) + 0.5) / size
    u, v = np.meshgrid(lin, lin)  # v=0 bottom, v=1 top

    rgb = np.zeros((size, size, 3), dtype=np.float64)
    height = np.zeros((size, size), dtype=np.float64)
    rough = np.full((size, size), 0.45, dtype=np.float64)
    metal = np.zeros((size, size), dtype=np.float64)
    ao = np.full((size, size), 0.90, dtype=np.float64)

    # ------------------------------------------------------------------
    # Region 1: Conical Spiral Shell (v >= 0.46)
    # ------------------------------------------------------------------
    shell_mask = v >= 0.46
    # Map v in [0.46, 0.98] -> v_sec in [0, 1] across whorl profile (0=base, 0.5=periphery keel, 1=suture)
    v_sec = np.clip((v - 0.46) / 0.52, 0.0, 1.0)
    # u in [0, 1] runs spirally around all 5.5 whorls (30 axial flame repetitions over spiral UV)
    n1 = ic.np_fbm(u * 14.0, v_sec * 6.0, octaves=4, seed=101)
    n2 = ic.np_fbm(u * 42.0, v_sec * 18.0, octaves=3, seed=202)

    # Bold burgundy-crimson chevron/flame stripes sweeping axially down whorls
    flame_phase = u * 28.0 + 0.45 * np.sin(v_sec * math.pi * 1.4) + 0.55 * (n1 - 0.5)
    stripe = np.sin(flame_phase * 2.0 * math.pi)
    band_factor = ic.np_smoothstep(-0.08, 0.22, stripe)
    sub_stripe = ic.np_smoothstep(0.55, 0.85, np.sin(flame_phase * 4.0 * math.pi + 1.2))

    # Creamy chalk-ivory shell vs rich crimson-burgundy / maroon bands + basal green-brown periostracum hint
    cream_col = np.array([0.84, 0.80, 0.72])
    crimson_col = np.array([0.46, 0.07, 0.09])
    maroon_col = np.array([0.26, 0.05, 0.06])
    shell_rgb = cream_col[None, None, :] * (1.0 - band_factor[:, :, None]) + crimson_col[None, None, :] * band_factor[:, :, None]
    shell_rgb = shell_rgb * (1.0 - 0.35 * sub_stripe[:, :, None]) + maroon_col[None, None, :] * (0.35 * sub_stripe[:, :, None])

    # Subtle pink/lavender crustose coralline algae encrustations on upper whorls & sutures
    coralline_noise = ic.np_fbm(u * 11.0 + 3.1, v_sec * 8.0 - 1.4, octaves=4, seed=303)
    coralline_mask = ic.np_smoothstep(0.60, 0.76, coralline_noise) * (0.35 + 0.65 * ic.np_smoothstep(0.55, 0.95, v_sec))
    coralline_col = np.array([0.64, 0.38, 0.46])
    shell_rgb = shell_rgb * (1.0 - 0.75 * coralline_mask[:, :, None]) + coralline_col[None, None, :] * (0.75 * coralline_mask[:, :, None])

    # Fine chalky encrustation near suture crevices (v_sec near 0.9) and pearlescent mother-of-pearl near inner base (v_sec < 0.14)
    pearl_mask = 1.0 - ic.np_smoothstep(0.06, 0.16, v_sec)
    pearl_col = np.array([0.88, 0.87, 0.85])
    shell_rgb = shell_rgb * (1.0 - 0.85 * pearl_mask[:, :, None]) + pearl_col[None, None, :] * (0.85 * pearl_mask[:, :, None])
    shell_rgb *= (0.90 + 0.18 * (n2[:, :, None] - 0.5))

    # Beaded spiral cords (5 rows across outer whorl face) + oblique growth striae
    cord_wave = np.maximum(0.0, np.sin(np.clip((v_sec - 0.18) / 0.74, 0.0, 1.0) * 5.0 * math.pi)) ** 1.4
    bead_wave = 0.55 + 0.45 * np.sin(u * 140.0 * 2.0 * math.pi + v_sec * 4.0)
    growth_striae = 0.22 * np.sin((u * 210.0 + v_sec * 1.8) * 2.0 * math.pi)
    shell_h = 0.52 * cord_wave * bead_wave + 0.14 * growth_striae + 0.20 * n2
    shell_rough = 0.28 + 0.18 * n2 + 0.32 * coralline_mask - 0.12 * pearl_mask
    shell_metal = 0.06 * pearl_mask
    shell_ao = 0.76 + 0.22 * cord_wave - 0.18 * ic.np_smoothstep(0.84, 0.98, v_sec)

    # ------------------------------------------------------------------
    # Region 2: Muscular Foot & Dorsal Mantle (u < 0.58, v < 0.46)
    # ------------------------------------------------------------------
    foot_mask = (u < 0.58) & (v < 0.46)
    uf = np.clip(u / 0.58, 0.0, 1.0)
    vf = np.clip(v / 0.46, 0.0, 1.0)
    fn1 = ic.np_fbm(uf * 18.0, vf * 16.0, octaves=4, seed=404)
    fn2 = ic.np_fbm(uf * 45.0, vf * 40.0, octaves=3, seed=505)
    # Sole (vf < 0.28) is pale creamy ivory; skirt/flank transitions up into fine speckled taupe/sand epidermis
    dorsal_t = ic.np_smoothstep(0.18, 0.65, vf)
    fn_fine = ic.np_fbm(uf * 68.0, vf * 58.0, octaves=3, seed=555)
    speckle = ic.np_smoothstep(0.46, 0.68, fn1 * 0.45 + fn2 * 0.35 + fn_fine * 0.20)
    sole_col = np.array([0.88, 0.82, 0.72])
    flank_cream = np.array([0.78, 0.71, 0.61])
    flank_dark = np.array([0.34, 0.28, 0.23])
    dorsal_col = flank_cream[None, None, :] * (1.0 - speckle[:, :, None]) + flank_dark[None, None, :] * speckle[:, :, None]
    foot_rgb = sole_col[None, None, :] * (1.0 - dorsal_t[:, :, None]) + dorsal_col * dorsal_t[:, :, None]
    foot_rgb *= (0.94 + 0.14 * (fn_fine[:, :, None] - 0.5))
    foot_h = 0.18 * fn1 + 0.12 * fn2
    foot_rough = 0.14 + 0.14 * fn2
    foot_ao = 0.78 + 0.20 * vf

    # ------------------------------------------------------------------
    # Region 3: Tentacles & Eye Stalks (u >= 0.58, 0.20 <= v < 0.46)
    # ------------------------------------------------------------------
    tent_mask = (u >= 0.58) & (v < 0.46) & (v >= 0.20)
    ut = np.clip((u - 0.58) / 0.42, 0.0, 1.0)
    vt = np.clip((v - 0.20) / 0.26, 0.0, 1.0)
    tn = ic.np_fbm(ut * 10.0, vt * 24.0, octaves=3, seed=606)
    annular = 0.5 + 0.5 * np.sin(vt * 22.0 * math.pi + tn * 2.5)
    tent_cream = np.array([0.82, 0.76, 0.65])
    tent_band = np.array([0.34, 0.28, 0.24])
    tent_rgb = tent_cream[None, None, :] * (1.0 - 0.62 * annular[:, :, None]) + tent_band[None, None, :] * (0.62 * annular[:, :, None])
    tent_h = 0.06 * annular + 0.08 * tn
    tent_rough = np.full_like(u, 0.18)
    tent_ao = np.full_like(u, 0.90)

    # ------------------------------------------------------------------
    # Region 4: Glossy Eyes (0.58 <= u < 0.79, v < 0.20)
    # ------------------------------------------------------------------
    eye_mask = (u >= 0.58) & (u < 0.79) & (v < 0.20)
    eye_rgb = np.broadcast_to(np.array([0.015, 0.018, 0.024]), (size, size, 3))
    eye_rough = np.full_like(u, 0.05)

    # ------------------------------------------------------------------
    # Region 5: Horny Multispiral Operculum (u >= 0.79, v < 0.20)
    # ------------------------------------------------------------------
    oper_mask = (u >= 0.79) & (v < 0.20)
    uo = (u - 0.895) / 0.105
    vo = (v - 0.10) / 0.10
    rad = np.hypot(uo, vo)
    ang = np.arctan2(vo, uo)
    spiral_rings = 0.5 + 0.5 * np.sin(rad * 28.0 + ang * 2.0)
    oper_rgb = np.array([0.42, 0.24, 0.11])[None, None, :] * (0.75 + 0.35 * spiral_rings[:, :, None])
    oper_h = 0.16 * spiral_rings
    oper_rough = 0.24 + 0.10 * spiral_rings

    for mask, r_vals, h_vals, rg_vals, mt_vals, ao_vals in (
        (shell_mask, shell_rgb, shell_h, shell_rough, shell_metal, shell_ao),
        (foot_mask, foot_rgb, foot_h, foot_rough, np.zeros_like(u), foot_ao),
        (tent_mask, tent_rgb, tent_h, tent_rough, np.zeros_like(u), tent_ao),
        (eye_mask, eye_rgb, np.zeros_like(u), eye_rough, np.zeros_like(u), np.ones_like(u) * 0.95),
        (oper_mask, oper_rgb, oper_h, oper_rough, np.zeros_like(u), np.ones_like(u) * 0.86),
    ):
        rgb[mask] = r_vals[mask]
        height[mask] = h_vals[mask]
        rough[mask] = np.clip(rg_vals[mask], 0.04, 0.96)
        metal[mask] = mt_vals[mask]
        ao[mask] = np.clip(ao_vals[mask], 0.2, 1.0)

    norm = ic.derive_normal_from_height(height, strength=3.0)
    return ic.create_and_pack_pbr_textures(ASSET_ID, rgb, norm, rough, metal, ao, size=size)


def build_trochus_geometry_and_rig(mat):
    verts, faces, loop_uvs, vert_weights = [], [], [], []

    # =========================================================================
    # 1. BROAD MUSCULAR FOOT + RUFFLED SKIRT + MANTLE NECK (grounded at z = 0)
    # =========================================================================
    n_rad = 14
    n_ang = 44
    foot_grid, foot_uvs, foot_wts = [], [], []
    # Foot stretches Y from -0.021 (anterior propodium under head) to +0.019 (rear)
    for ir in range(n_rad + 1):
        # s_prof in [0, 1]:
        #   0.00..0.34 -> flat sole center out to edge at z=0..0.0005
        #   0.34..0.58 -> ruffled skirt lip flare rising slightly around edge
        #   0.58..1.00 -> tapering muscular dorsal column rising up into shell aperture
        s = ir / n_rad
        row_pts, row_uvs, row_wts = [], [], []
        for ia in range(n_ang):
            th = 2.0 * math.pi * ia / n_ang
            ct, st = math.cos(th), math.sin(th)
            # Anterior (-Y) broader rounded propodium; posterior (+Y) gracefully tapered tail
            y_scale = 0.020 if st <= 0 else 0.018
            x_scale = 0.0125 * (1.0 - 0.16 * max(0.0, st))

            if s <= 0.34:
                t_sole = s / 0.34
                r_fac = 0.04 + 0.96 * t_sole
                ruffle = 0.0004 * (t_sole ** 2) * math.sin(9.0 * th + 0.5)
                z = 0.0003 * (1.0 - t_sole)
            elif s <= 0.58:
                t_edge = (s - 0.34) / 0.24
                r_fac = 1.0 + 0.12 * math.sin(t_edge * math.pi)
                ruffle = 0.0009 * math.sin(t_edge * math.pi) * math.sin(10.0 * th + 0.7)
                z = 0.0002 + 0.0032 * t_edge + 0.00055 * math.sin(t_edge * math.pi) * math.sin(10.0 * th + 0.7)
            else:
                t_col = (s - 0.58) / 0.42
                r_fac = ic.lerp(0.96, 0.56, ic.smoothstep(0.0, 1.0, t_col))
                ruffle = 0.0003 * (1.0 - t_col) * math.sin(9.0 * th)
                z = 0.0034 + 0.0082 * t_col
                # Dorsal mantle column shifts slightly forward/up toward aperture core
                ct_shift = -0.0012 * t_col
                st_shift = 0.0010 * t_col
                x = ct * x_scale * r_fac + ct_shift
                y = st * y_scale * r_fac + st_shift + ruffle
                row_pts.append(Vector((x, y, z)))
                # UV inside Foot region u in [0.03, 0.55], v in [0.03, 0.43]
                row_uvs.append((0.03 + 0.52 * (ia / n_ang), 0.03 + 0.40 * s))
                # Joint weights along Y & Z
                y_norm = (y + 0.021) / 0.040
                w_head = ic.smoothstep(0.32, 0.05, y_norm) * ic.smoothstep(0.002, 0.008, z)
                w_rear = ic.smoothstep(0.55, 0.88, y_norm)
                w_mid = max(0.0, 1.0 - w_head - w_rear) * ic.smoothstep(0.0, 0.006, z)
                w_root = max(0.05, 1.0 - w_head - w_rear - w_mid)
                row_wts.append({'root': w_root, 'foot_mid': w_mid, 'foot_rear': w_rear, 'head': w_head})
                continue

            x = ct * (x_scale * r_fac + ruffle * ct)
            y = st * (y_scale * r_fac + ruffle * st)
            row_pts.append(Vector((x, y, z)))
            row_uvs.append((0.03 + 0.52 * (ia / n_ang), 0.03 + 0.40 * s))
            y_norm = (y + 0.021) / 0.040
            w_rear = ic.smoothstep(0.58, 0.90, y_norm) * 0.72
            w_head = ic.smoothstep(0.28, 0.04, y_norm) * 0.45 * ic.smoothstep(0.0, 0.003, z)
            w_mid = 0.28 * ic.smoothstep(0.0005, 0.0035, z) * (1.0 - w_rear)
            w_root = max(0.20, 1.0 - w_rear - w_head - w_mid)
            row_wts.append({'root': w_root, 'foot_mid': w_mid, 'foot_rear': w_rear, 'head': w_head})

        foot_grid.append(row_pts)
        foot_uvs.append(row_uvs)
        foot_wts.append(row_wts)

    # Cap sole center bottom & top column inside shell so foot is 100% closed manifold
    ic.append_surface_grid(verts, faces, loop_uvs, vert_weights, foot_grid, foot_uvs, foot_wts, closed_u=False, closed_v=True)

    # Close sole center bottom and top dorsal neck cap inside shell so foot is 100% closed manifold
    c_bot = len(verts)
    verts.append((0.0, -0.001, 0.0))
    vert_weights.append({'root': 1.0})
    first_ring_base = 0
    for ia in range(n_ang):
        i0 = first_ring_base + ia
        i1 = first_ring_base + ((ia + 1) % n_ang)
        faces.append((c_bot, i1, i0))
        loop_uvs.extend([(0.29, 0.03), foot_uvs[0][ia], foot_uvs[0][(ia + 1) % n_ang]])

    c_top = len(verts)
    verts.append((-0.0012, 0.0010, 0.0116))
    vert_weights.append({'foot_mid': 0.7, 'root': 0.3})
    top_ring_base = n_rad * n_ang
    for ia in range(n_ang):
        i0 = top_ring_base + ia
        i1 = top_ring_base + ((ia + 1) % n_ang)
        faces.append((c_top, i0, i1))
        loop_uvs.extend([(0.29, 0.42), foot_uvs[-1][ia], foot_uvs[-1][(ia + 1) % n_ang]])

    # =========================================================================
    # 2. EPIPODIAL PAPILLAE (4 pairs along mid/rear foot edge) & OPERCULUM
    # =========================================================================
    for side in (-1.0, 1.0):
        for k, y_off in enumerate((-0.005, 0.001, 0.007, 0.012)):
            x0 = side * (0.0118 - 0.0018 * k)
            cir_pts = [
                Vector((x0 * 0.92, y_off, 0.0030)),
                Vector((x0 + side * 0.0018, y_off + 0.0004, 0.0036)),
                Vector((x0 + side * 0.0034, y_off + 0.0010, 0.0046)),
            ]
            cir_rad = [0.0009, 0.00065, 0.00025]
            w_ep = {'foot_rear': 0.7 if k >= 2 else 0.25, 'foot_mid': 0.3 if k >= 2 else 0.75}
            ic.append_limb_tube(
                verts, faces, loop_uvs, vert_weights,
                cir_pts, cir_rad, (0.62, 0.80), (0.22, 0.42),
                [w_ep, w_ep, w_ep], ring_seg=6,
            )

    # Circular chitinous spiral operculum tucked on rear dorsal foot
    ic.append_ellipsoid(
        verts, faces, loop_uvs, vert_weights,
        center=(0.0, 0.0132, 0.0044),
        radii=(0.0048, 0.0048, 0.0009),
        u_range=(0.80, 0.98),
        v_range=(0.02, 0.18),
        w_dict={'foot_rear': 0.85, 'foot_mid': 0.15},
        seg_u=16, seg_v=8,
        rot_euler=(math.radians(-18.0), 0.0, 0.0),
    )

    # =========================================================================
    # 3. HEAD SNOUT + LONG CEPHALIC TENTACLES + EYE STALKS + GLOSSY EYES
    # =========================================================================
    snout_pts = [
        Vector((0.0, -0.012, 0.0048)),
        Vector((0.0, -0.0175, 0.0038)),
        Vector((0.0, -0.0220, 0.0024)),
        Vector((0.0, -0.0242, 0.0016)),
    ]
    snout_rad = [0.0042, 0.0034, 0.0025, 0.0014]
    ic.append_limb_tube(
        verts, faces, loop_uvs, vert_weights,
        snout_pts, snout_rad, (0.10, 0.45), (0.18, 0.36),
        [{'head': 0.7, 'root': 0.3}, {'head': 0.9, 'root': 0.1}, {'head': 1.0}, {'head': 1.0}],
        ring_seg=12, aspect=0.72,
    )

    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        # Long gracefully curved tapered tactile tentacle extending forward-outward (-Y)
        b_mid = f'tentacle_{side_label}'
        b_tip = f'tentacle_{side_label}_tip'
        tent_pts = []
        tent_rad = []
        tent_wts = []
        n_t = 9
        for ti in range(n_t):
            u = ti / (n_t - 1)
            px = sign * (0.0024 + 0.0115 * (u ** 0.88) + 0.0016 * math.sin(u * math.pi))
            py = -0.0165 - 0.0145 * u
            pz = 0.0044 + 0.0028 * math.sin(u * math.pi * 0.9) - 0.0012 * (u ** 2)
            tent_pts.append(Vector((px, py, pz)))
            tent_rad.append(ic.lerp(0.00105, 0.00018, u ** 0.85))
            if u < 0.20:
                tent_wts.append({'head': 1.0 - u * 3.0, b_mid: u * 3.0})
            elif u < 0.55:
                f = (u - 0.20) / 0.35
                tent_wts.append({b_mid: 1.0 - 0.4 * f, b_tip: 0.4 * f})
            else:
                f = (u - 0.55) / 0.45
                tent_wts.append({b_mid: 0.6 * (1.0 - f), b_tip: 0.4 + 0.6 * f})

        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            tent_pts, tent_rad, (0.62, 0.94), (0.22, 0.44),
            tent_wts, ring_seg=8,
        )

        # Short stout eye stalk + glossy obsidian eye
        stalk_pts = [
            Vector((sign * 0.0032, -0.0162, 0.0046)),
            Vector((sign * 0.0046, -0.0185, 0.0062)),
            Vector((sign * 0.0054, -0.0200, 0.0074)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            stalk_pts, [0.00085, 0.00072, 0.00058], (0.62, 0.82), (0.22, 0.34),
            [{'head': 1.0}, {'head': 0.8, b_mid: 0.2}, {'head': 0.8, b_mid: 0.2}],
            ring_seg=8,
        )
        ic.append_ellipsoid(
            verts, faces, loop_uvs, vert_weights,
            center=(sign * 0.0055, -0.0203, 0.0076),
            radii=(0.00072, 0.00072, 0.00072),
            u_range=(0.60, 0.76), v_range=(0.03, 0.17),
            w_dict={'head': 0.8, b_mid: 0.2}, seg_u=10, seg_v=8,
        )

    # =========================================================================
    # 4. 5.5-WHORL LOGARITHMIC CONICAL SHELL WITH BEADED CORDS & APERTURE LIP
    # =========================================================================
    n_whorls = 5.4
    n_steps = 128
    n_sec = 22
    # Shell mounted upright/gently tilted backward over visceral column so aperture lip hugs anterior/right mantle
    shell_pivot = Vector((0.0004, 0.0020, 0.0082))
    shell_rot = Euler((math.radians(13.0), math.radians(-5.0), math.radians(-115.0)), 'XYZ').to_matrix()

    def whorl_point(t_turn, v_sec):
        """Evaluate self-similar logarithmic conical Trochus whorl with overlapping tight sutures."""
        theta = 2.0 * math.pi * t_turn
        frac = t_turn / n_whorls
        g = 0.14 * math.exp(math.log(1.0 / 0.14) * frac)
        r_center = 0.0102 * g
        # Tightly nestled spire drop + generous whorl height guarantee zero daylight suture gaps
        z_center = 0.0205 * (1.0 - (g - 0.14) / 0.86) + 0.0012

        tube_rx = 0.0070 * g
        tube_rz = 0.0058 * g

        ang = 2.0 * math.pi * v_sec
        ca = math.cos(ang)
        sa = math.sin(ang)
        cone_wall = 1.0 + 0.14 * math.exp(-((v_sec - 0.06) / 0.09) ** 2) - 0.12 * math.exp(-((v_sec - 0.25) / 0.12) ** 2)
        local_r = ca * cone_wall
        local_z = sa * (0.58 if sa < 0 else 1.24)

        # Subtle beaded spiral cords along outer conical slope (5 rows)
        outer_slope = ic.smoothstep(0.06, 0.14, v_sec) * (1.0 - ic.smoothstep(0.42, 0.50, v_sec))
        cords = 0.032 * outer_slope * math.sin(v_sec * 5.0 * 2.0 * math.pi)
        beads = 0.022 * outer_slope * (0.5 + 0.5 * math.sin(theta * 24.0))
        rad_delta = 1.0 + cords + beads

        # Last 0.20 turn tucks smoothly into an anatomical thickened aperture margin without protruding flap
        lip_flare = 1.0 + 0.04 * ic.smoothstep(n_whorls - 0.25, n_whorls, t_turn)

        r_total = (r_center + local_r * tube_rx * rad_delta) * lip_flare
        z_total = z_center + local_z * tube_rz * rad_delta

        local_p = Vector((r_total * math.cos(theta), r_total * math.sin(theta), z_total))
        return shell_pivot + (shell_rot @ local_p)

    shell_grid, shell_uvs, shell_wts = [], [], []
    shell_vert_start = len(verts)
    for it in range(n_steps + 1):
        t_turn = 0.06 + (n_whorls - 0.06) * (it / n_steps)
        row_pts, row_uvs, row_wts = [], [], []
        for isec in range(n_sec):
            v_s = isec / n_sec
            pt = whorl_point(t_turn, v_s)
            row_pts.append(pt)
            v_uv = 0.48 + 0.48 * ((v_s + 0.85) % 1.0)
            row_uvs.append((0.02 + 0.96 * (it / n_steps), v_uv))
            row_wts.append({'shell': 1.0})
        shell_grid.append(row_pts)
        shell_uvs.append(row_uvs)
        shell_wts.append(row_wts)

    ic.append_surface_grid(verts, faces, loop_uvs, vert_weights, shell_grid, shell_uvs, shell_wts, closed_u=False, closed_v=True)

    # Cap apex point sharply & close aperture smoothly inside foot mantle
    apex_pt = whorl_point(0.06, 0.25) + (shell_rot @ Vector((0.0, 0.0, 0.0008)))
    apex_idx = len(verts)
    verts.append((float(apex_pt.x), float(apex_pt.y), float(apex_pt.z)))
    vert_weights.append({'shell': 1.0})
    ring0_base = shell_vert_start
    for isec in range(n_sec):
        i0 = ring0_base + isec
        i1 = ring0_base + ((isec + 1) % n_sec)
        faces.append((apex_idx, i1, i0))
        loop_uvs.extend([(0.02, 0.94), shell_uvs[0][isec], shell_uvs[0][(isec + 1) % n_sec]])

    last_pts = shell_grid[-1]
    ap_center = sum(last_pts, Vector((0, 0, 0))) / len(last_pts)
    ap_inward = Vector((0.0, 0.002, -0.002))
    ap_idx = len(verts)
    ap_pos = ap_center + ap_inward
    verts.append((float(ap_pos.x), float(ap_pos.y), float(ap_pos.z)))
    vert_weights.append({'shell': 1.0})
    last_ring_base = shell_vert_start + n_steps * n_sec
    for isec in range(n_sec):
        i0 = last_ring_base + isec
        i1 = last_ring_base + ((isec + 1) % n_sec)
        faces.append((ap_idx, i0, i1))
        loop_uvs.extend([(0.95, 0.50), shell_uvs[-1][isec], shell_uvs[-1][(isec + 1) % n_sec]])

    # =========================================================================
    # 5. 9-BONE GLIDE & TENTACLE ARMATURE + 49-FRAME LOOPING ANIMATION
    # =========================================================================
    bone_specs = [
        ('root', None, (0.0, 0.0, 0.0035), (0.0, -0.007, 0.0040)),
        ('shell', 'root', (0.0, 0.001, 0.010), (0.001, 0.003, 0.025)),
        ('head', 'root', (0.0, -0.012, 0.0045), (0.0, -0.022, 0.0032)),
        ('tentacle_L', 'head', (0.0024, -0.0165, 0.0044), (0.0088, -0.0245, 0.0056)),
        ('tentacle_L_tip', 'tentacle_L', (0.0088, -0.0245, 0.0056), (0.0145, -0.0310, 0.0052)),
        ('tentacle_R', 'head', (-0.0024, -0.0165, 0.0044), (-0.0088, -0.0245, 0.0056)),
        ('tentacle_R_tip', 'tentacle_R', (-0.0088, -0.0245, 0.0056), (-0.0145, -0.0310, 0.0052)),
        ('foot_mid', 'root', (0.0, 0.002, 0.0035), (0.0, 0.010, 0.0035)),
        ('foot_rear', 'foot_mid', (0.0, 0.010, 0.0035), (0.0, 0.018, 0.0030)),
    ]

    def animate_frame(phase):
        return {
            'root': (math.radians(0.8 * math.sin(phase)), math.radians(1.2 * math.cos(phase)), math.radians(1.5 * math.sin(phase))),
            'shell': (math.radians(2.8 * math.sin(phase)), math.radians(2.2 * math.cos(phase)), math.radians(1.8 * math.sin(phase))),
            'head': (math.radians(3.5 * math.sin(phase + 0.4)), 0.0, math.radians(5.5 * math.cos(phase))),
            'tentacle_L': (math.radians(14.0 * math.sin(phase)), math.radians(4.0 * math.cos(phase)), math.radians(12.0 * math.sin(phase + 0.5))),
            'tentacle_L_tip': (math.radians(18.0 * math.sin(phase - 0.7)), 0.0, math.radians(15.0 * math.sin(phase - 0.4))),
            'tentacle_R': (math.radians(14.0 * math.sin(phase + 1.8)), math.radians(-4.0 * math.cos(phase + 1.8)), math.radians(-12.0 * math.sin(phase + 2.1))),
            'tentacle_R_tip': (math.radians(18.0 * math.sin(phase + 1.1)), 0.0, math.radians(-15.0 * math.sin(phase + 1.4))),
            'foot_mid': (0.0, 0.0, math.radians(2.4 * math.sin(phase + 0.9))),
            'foot_rear': (0.0, 0.0, math.radians(3.2 * math.sin(phase + 1.6))),
        }

    return ic.assemble_rigged_invertebrate(
        'Banded_Trochus_Snail',
        verts, faces, loop_uvs, vert_weights,
        bone_specs, mat, CLIP_NAME, animate_frame,
    )


def main():
    ic.clear_scene_and_setup(samples=24)
    albedo, norm, orm = build_trochus_textures(size=512)
    mat = ic.build_invertebrate_pbr_material('Trochus_Snail_Mat', albedo, norm, orm, normal_strength=0.72, spec=0.58)
    arm_obj, mesh_obj, tris = build_trochus_geometry_and_rig(mat)
    report = ic.save_export_and_render_thumbnail(
        ASSET_ID, SPECIES_ID, arm_obj, mesh_obj,
        elev_deg=22.0, yaw_deg=44.0, margin=1.10,
    )
    report['triangles'] = tris
    print('TROCHUS_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
