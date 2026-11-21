"""Original Scarlet Skunk Cleaner Shrimp (Lysmata amboinensis) 3D asset (AQ-109).
Generates 512x512 procedural PBR maps (BaseColor, Normal, ORM), golden-amber caridean body
with scarlet dorsal saddle & crisp snow-white racing stripe, serrated rostrum, 6 arched
somites, 5-lobed spotted tail fan, 3 pairs of sweeping white antennae, and a 13-bone rig.
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

ASSET_ID = 'invertebrate-scarlet-skunk-cleaner-shrimp'
SPECIES_ID = 'scarlet-skunk-cleaner-shrimp'
CLIP_NAME = 'cleaner_shrimp_rock'


def build_cleaner_shrimp_textures(size=512):
    lin = (np.arange(size, dtype=np.float64) + 0.5) / size
    u, v = np.meshgrid(lin, lin)

    rgb = np.zeros((size, size, 3), dtype=np.float64)
    height = np.zeros((size, size), dtype=np.float64)
    rough = np.full((size, size), 0.30, dtype=np.float64)
    metal = np.zeros((size, size), dtype=np.float64)
    ao = np.full((size, size), 0.92, dtype=np.float64)

    # ------------------------------------------------------------------
    # 1. Body Carapace & Somites (u < 0.72, v >= 0.46)
    # v_body = 0.50 (ventral) .. 0.96 (dorsal spine center)
    # ------------------------------------------------------------------
    body_mask = (u < 0.72) & (v >= 0.46)
    ub = np.clip((u - 0.02) / 0.68, 0.0, 1.0)
    vb = np.clip((v - 0.46) / 0.50, 0.0, 1.0)  # 0=ventral bottom, 1=dorsal midline!
    bn1 = ic.np_fbm(ub * 18.0, vb * 14.0, octaves=4, seed=311)
    bn2 = ic.np_fbm(ub * 52.0, vb * 40.0, octaves=3, seed=317)

    # Golden-amber translucent chitin flank base
    amber_base = np.array([0.86, 0.62, 0.24])
    amber_pale = np.array([0.92, 0.78, 0.50])
    flank_col = amber_pale[None, None, :] * (1.0 - 0.55 * bn1[:, :, None]) + amber_base[None, None, :] * (0.55 * bn1[:, :, None])

    # Signature vivid scarlet dorsal saddle (vb > 0.62) & sharp snow-white dorsal stripe (vb > 0.87)
    scarlet_col = np.array([0.84, 0.08, 0.04])
    white_col = np.array([0.96, 0.97, 0.98])
    edge_jit = 0.018 * (bn1 - 0.5)
    scarlet_t = ic.np_smoothstep(0.60, 0.66, vb + edge_jit)
    white_t = ic.np_smoothstep(0.86, 0.895, vb + 0.3 * edge_jit)

    body_rgb = flank_col * (1.0 - scarlet_t[:, :, None]) + scarlet_col[None, None, :] * scarlet_t[:, :, None]
    body_rgb = body_rgb * (1.0 - white_t[:, :, None]) + white_col[None, None, :] * white_t[:, :, None]

    # Subtle abdominal somite groove darkening along ub > 0.44 (6 crisp somite bands)
    somite_t = (np.maximum(0.0, np.cos((ub - 0.44) * 12.0 * math.pi)) ** 10) * ic.np_smoothstep(0.38, 0.48, ub)
    body_rgb *= (1.0 - 0.28 * somite_t[:, :, None])
    body_h = 0.14 * bn2 - 0.36 * somite_t
    body_rough = 0.14 + 0.10 * bn2
    body_ao = 0.92 - 0.26 * somite_t

    # ------------------------------------------------------------------
    # 2. 5-Lobed Crimson Tail Fan with Crisp White Racing Stripe & Marginal Spots (u >= 0.72, v >= 0.46)
    # ------------------------------------------------------------------
    tail_mask = (u >= 0.72) & (v >= 0.46)
    ut = np.clip((u - 0.72) / 0.26, 0.0, 1.0)
    vt = np.clip((v - 0.46) / 0.50, 0.0, 1.0)
    # Vivid scarlet-crimson tail fan with central white telson racing stripe (ut ~ 0.50)
    # and 4 distinct snow-white oval eyespots on inner/outer uropods near distal tip (vt ~ 0.72)
    center_stripe = (1.0 - ic.np_smoothstep(0.04, 0.10, np.abs(ut - 0.50))) * (1.0 - ic.np_smoothstep(0.76, 0.96, vt))
    spot1 = 1.0 - ic.np_smoothstep(0.032, 0.062, np.hypot((ut - 0.11) * 1.15, vt - 0.72))
    spot2 = 1.0 - ic.np_smoothstep(0.032, 0.062, np.hypot((ut - 0.89) * 1.15, vt - 0.72))
    spot3 = 1.0 - ic.np_smoothstep(0.028, 0.055, np.hypot((ut - 0.25) * 1.15, vt - 0.78))
    spot4 = 1.0 - ic.np_smoothstep(0.028, 0.055, np.hypot((ut - 0.75) * 1.15, vt - 0.78))
    tail_white = np.clip(center_stripe + spot1 + spot2 + spot3 + spot4, 0.0, 1.0)
    tail_rgb = scarlet_col[None, None, :] * (1.0 - tail_white[:, :, None]) + white_col[None, None, :] * tail_white[:, :, None]
    rib_t = 0.12 * np.sin(ut * 18.0 * math.pi)
    tail_h = rib_t

    # ------------------------------------------------------------------
    # 3. Snow-White Antennae & Front Cleaning Chelipeds (u < 0.45, v < 0.46)
    # ------------------------------------------------------------------
    white_app_mask = (u < 0.45) & (v < 0.46)
    vw = np.clip(v / 0.46, 0.0, 1.0)
    wn = ic.np_fbm(u * 24.0, vw * 24.0, octaves=3, seed=331)
    # Very slight warm pearl-white ring variation for depth
    white_app_rgb = np.array([0.95, 0.96, 0.98])[None, None, :] * (0.94 + 0.06 * wn[:, :, None])

    # ------------------------------------------------------------------
    # 4. Golden-Cream Walking Legs & Pleopods (0.45 <= u < 0.78, v < 0.46)
    # ------------------------------------------------------------------
    leg_mask = (u >= 0.45) & (u < 0.78) & (v < 0.46)
    vl = np.clip(v / 0.46, 0.0, 1.0)
    ring_band = 0.5 + 0.5 * np.sin(vl * 22.0 * math.pi)
    leg_cream = np.array([0.92, 0.80, 0.52])[None, None, :]
    leg_coral = np.array([0.86, 0.44, 0.20])[None, None, :]
    leg_rgb = leg_cream * (1.0 - 0.40 * ring_band[:, :, None]) + leg_coral * (0.40 * ring_band[:, :, None])

    # ------------------------------------------------------------------
    # 5. Glossy Eyes (u >= 0.78, v < 0.24) & Rostrum Amber/Scarlet Crest (u >= 0.78, 0.24 <= v < 0.46)
    # ------------------------------------------------------------------
    eye_mask = (u >= 0.78) & (v < 0.24)
    eye_rgb = np.broadcast_to(np.array([0.015, 0.018, 0.032]), (size, size, 3))
    ros_mask = (u >= 0.78) & (v >= 0.24) & (v < 0.46)
    vr = np.clip((v - 0.24) / 0.22, 0.0, 1.0)
    ros_rgb = amber_base[None, None, :] * (1.0 - vr[:, :, None]) + scarlet_col[None, None, :] * vr[:, :, None]

    for mask, r_vals, h_vals, rg_vals, ao_vals in (
        (body_mask, body_rgb, body_h, body_rough, body_ao),
        (tail_mask, tail_rgb, tail_h, np.full_like(u, 0.16), np.full_like(u, 0.92)),
        (white_app_mask, white_app_rgb, 0.04 * wn, np.full_like(u, 0.18), np.full_like(u, 0.94)),
        (leg_mask, leg_rgb, 0.08 * ring_band, np.full_like(u, 0.22), np.full_like(u, 0.90)),
        (eye_mask, eye_rgb, np.zeros_like(u), np.full_like(u, 0.05), np.full_like(u, 0.96)),
        (ros_mask, ros_rgb, np.zeros_like(u), np.full_like(u, 0.16), np.full_like(u, 0.92)),
    ):
        rgb[mask] = r_vals[mask]
        height[mask] = h_vals[mask]
        rough[mask] = np.clip(rg_vals[mask], 0.04, 0.96)
        ao[mask] = np.clip(ao_vals[mask], 0.2, 1.0)

    norm = ic.derive_normal_from_height(height, strength=2.6)
    return ic.create_and_pack_pbr_textures(ASSET_ID, rgb, norm, rough, metal, ao, size=size)


def shrimp_body_profile(s):
    """Evaluate longitudinal carapace + 6-somite arched caridean curve in [0, 1]."""
    # Cephalothorax s in [0, 0.42]: -0.019 .. +0.002 m
    # Abdomen somites s in [0.42, 1.0]: +0.002 .. +0.0265 m curving smoothly upward at mid hump then down to tail
    y = ic.lerp(-0.0195, 0.0265, s)

    # Dorsal & ventral caridean arch
    if s < 0.42:
        t = s / 0.42
        z_center = 0.0138 + 0.0030 * math.sin(t * math.pi * 0.65)
        rx = 0.0012 + 0.0044 * (math.sin(t * math.pi * 0.58) ** 0.72)
        rz = 0.0011 + 0.0050 * (math.sin(t * math.pi * 0.60) ** 0.70)
    else:
        t = (s - 0.42) / 0.58
        # Classic caridean somite arch (humps slightly near somite 3 then bends cleanly down toward tail)
        z_center = 0.0166 + 0.0024 * math.sin(t * math.pi * 0.68) - 0.0110 * (t ** 1.45)
        rx = ic.lerp(0.0053, 0.0019, ic.smoothstep(0.0, 1.0, t ** 0.95))
        rz = ic.lerp(0.0057, 0.0017, ic.smoothstep(0.0, 1.0, t ** 0.95))
        # Crisp segmented somite step flares across 6 abdominal plates
        somite_phase = (t * 6.0) % 1.0
        plate_step = 1.0 + 0.08 * math.sin(somite_phase * math.pi)
        rx *= plate_step
        rz *= plate_step

    return y, z_center, rx, rz


def shrimp_weights(s):
    if s < 0.36:
        return {'root': 1.0}
    if s < 0.56:
        f = (s - 0.36) / 0.20
        return {'root': 1.0 - f, 'abdomen_1': f}
    if s < 0.80:
        f = (s - 0.56) / 0.24
        return {'abdomen_1': 1.0 - f, 'abdomen_2': f}
    f = (s - 0.80) / 0.20
    return {'abdomen_2': 1.0 - f, 'tail_fan': f}


def build_cleaner_shrimp_geometry_and_rig(mat):
    verts, faces, loop_uvs, vert_weights = [], [], [], []

    # =========================================================================
    # 1. STREAMLINED CEPHALOTHORAX + 6 OVERLAPPING ABDOMINAL SOMITES
    # =========================================================================
    n_s = 36
    n_ring = 22
    body_grid, body_uvs, body_wts = [], [], []

    for i_s in range(n_s + 1):
        s = i_s / n_s
        y, z_c, rx, rz = shrimp_body_profile(s)
        w_dict = shrimp_weights(s)
        # Slope angle for curved abdomen cross-sections so segments align naturally with spine curve
        ds = 0.02
        y2, z2, _, _ = shrimp_body_profile(min(1.0, s + ds))
        y1, z1, _, _ = shrimp_body_profile(max(0.0, s - ds))
        tan = Vector((0.0, y2 - y1, z2 - z1)).normalized()
        up_n = Vector((0.0, -tan.z, tan.y)).normalized()

        row_pts, row_uvs, row_wts = [], [], []
        for ir in range(n_ring):
            th = 2.0 * math.pi * ir / n_ring
            # Keep dorsal midline at th = 0 (+up_n), symmetric sides at +-pi/2, ventral at +-pi
            sin_t = math.sin(th)
            cos_t = math.cos(th)
            # Slightly keeled dorsal profile & deeper oval lateral cross-section
            local_x = rx * sin_t
            local_z = rz * cos_t * (1.06 if cos_t > 0 else 0.92)
            pos = Vector((local_x, y, z_c)) + up_n * local_z
            row_pts.append(pos)

            # Symmetric dorsal distance UV mapping: cos_t=+1 (dorsal ridge) -> v=0.96; cos_t=-1 (ventral) -> v=0.50
            dorsal_dist = abs(math.atan2(sin_t, cos_t)) / math.pi  # 0 at dorsal spine, 1 at ventral belly
            v_uv = 0.96 - 0.46 * dorsal_dist
            u_uv = 0.03 + 0.66 * s
            row_uvs.append((u_uv, v_uv))
            row_wts.append(w_dict)

        body_grid.append(row_pts)
        body_uvs.append(row_uvs)
        body_wts.append(row_wts)

    body_v_start = len(verts)
    ic.append_surface_grid(verts, faces, loop_uvs, vert_weights, body_grid, body_uvs, body_wts, closed_u=False, closed_v=True)

    # Cap snout front & tail base rear cleanly
    nose_idx = len(verts)
    y0, z0, _, _ = shrimp_body_profile(0.0)
    verts.append((0.0, y0 - 0.0012, z0 + 0.0005))
    vert_weights.append({'root': 1.0})
    for ir in range(n_ring):
        i0 = body_v_start + ir
        i1 = body_v_start + ((ir + 1) % n_ring)
        faces.append((nose_idx, i1, i0))
        loop_uvs.extend([(0.03, 0.78), body_uvs[0][ir], body_uvs[0][(ir + 1) % n_ring]])

    rear_idx = len(verts)
    y1, z1, _, _ = shrimp_body_profile(1.0)
    verts.append((0.0, y1 + 0.0012, z1 - 0.0004))
    vert_weights.append({'tail_fan': 1.0})
    rear_base = body_v_start + n_s * n_ring
    for ir in range(n_ring):
        i0 = rear_base + ir
        i1 = rear_base + ((ir + 1) % n_ring)
        faces.append((rear_idx, i0, i1))
        loop_uvs.extend([(0.68, 0.78), body_uvs[-1][ir], body_uvs[-1][(ir + 1) % n_ring]])

    # =========================================================================
    # 2. SERRATED UPWARD-ANGLED ROSTRUM + STALKED SAPPHIRE-BLACK EYES
    # =========================================================================
    ros_pts = [
        Vector((0.0, -0.0170, 0.0148)),
        Vector((0.0, -0.0225, 0.0160)),
        Vector((0.0, -0.0275, 0.0176)),
        Vector((0.0, -0.0315, 0.0190)),
    ]
    ic.append_limb_tube(
        verts, faces, loop_uvs, vert_weights,
        ros_pts, [0.0011, 0.00075, 0.00048, 0.00018], (0.80, 0.96), (0.25, 0.44),
        [{'root': 1.0}] * 4, ring_seg=6, aspect=1.55,
    )

    for sign in (-1.0, 1.0):
        st_pts = [
            Vector((sign * 0.0014, -0.0180, 0.0142)),
            Vector((sign * 0.0028, -0.0205, 0.0156)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            st_pts, [0.00070, 0.00065], (0.80, 0.94), (0.26, 0.34),
            [{'root': 1.0}, {'root': 1.0}], ring_seg=6,
        )
        ic.append_ellipsoid(
            verts, faces, loop_uvs, vert_weights,
            center=(sign * 0.0031, -0.0209, 0.0159),
            radii=(0.00115, 0.00115, 0.00105),
            u_range=(0.80, 0.96), v_range=(0.04, 0.22),
            w_dict={'root': 1.0}, seg_u=12, seg_v=8,
        )

    # =========================================================================
    # 3. 5-LOBED FANNED CRIMSON TAIL (TELSON + 4 UROPODS WITH WHITE SPOTS)
    # =========================================================================
    fan_root = Vector((0.0, 0.0258, 0.0076))
    lobe_specs = [
        # (yaw_deg, length, half_width, u_min, u_max)
        (0.0, 0.0095, 0.0018, 0.82, 0.88),     # central telson with white racing stripe
        (22.0, 0.0102, 0.0025, 0.89, 0.94),    # inner L uropod
        (-22.0, 0.0102, 0.0025, 0.76, 0.81),   # inner R uropod
        (46.0, 0.0106, 0.0028, 0.92, 0.98),    # outer L uropod (white oval dot)
        (-46.0, 0.0106, 0.0028, 0.72, 0.78),   # outer R uropod (white oval dot)
    ]
    for yaw_deg, l_len, hw, u0, u1 in lobe_specs:
        ang = math.radians(yaw_deg)
        fwd = Vector((math.sin(ang), math.cos(ang), -0.34)).normalized()
        side_v = Vector((math.cos(ang), -math.sin(ang), 0.0)).normalized()
        n_segs = 5
        lobe_pts = []
        lobe_rads = []
        for k in range(n_segs):
            tf = k / (n_segs - 1)
            lobe_pts.append(fan_root + fwd * (l_len * tf))
            w_fac = math.sin(max(0.08, tf) * math.pi * 0.86)
            lobe_rads.append(hw * (0.28 + 0.72 * w_fac))
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            lobe_pts, lobe_rads, (u0, u1), (0.48, 0.94),
            [{'tail_fan': 1.0}] * n_segs, ring_seg=8, aspect=0.22,
        )

    # =========================================================================
    # 4. 3 PAIRS OF SWEEPING SNOW-WHITE ANTENNAE & ANTENNULES + FRONT CHELIPEDS
    # =========================================================================
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        b_mid = f'antenna_{side_label}'
        b_tip = f'antenna_{side_label}_tip'
        # Pair 1: Primary sweeping snow-white pelagic antenna whips (~44 mm)
        a1_pts, a1_rads, a1_wts = [], [], []
        for ai in range(11):
            ua = ai / 10.0
            ax = sign * (0.0020 + 0.0210 * math.sin(ua * math.pi * 0.72) + 0.004 * (ua ** 2))
            ay = -0.0180 - 0.0320 * ua + 0.006 * math.sin(ua * math.pi)
            az = 0.0130 + 0.0145 * (ua ** 1.15) - 0.0035 * math.sin(ua * math.pi * 1.4)
            a1_pts.append(Vector((ax, ay, az)))
            a1_rads.append(ic.lerp(0.00050, 0.00018, ua))
            if ua < 0.16:
                a1_wts.append({'root': 0.7, b_mid: 0.3})
            elif ua < 0.55:
                f = (ua - 0.16) / 0.39
                a1_wts.append({b_mid: 1.0 - 0.4 * f, b_tip: 0.4 * f})
            else:
                f = (ua - 0.55) / 0.45
                a1_wts.append({b_mid: 0.6 * (1.0 - f), b_tip: 0.4 + 0.6 * f})

        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            a1_pts, a1_rads, (0.04, 0.42), (0.04, 0.42),
            a1_wts, ring_seg=6,
        )

        # Pair 2: Delicate arching snow-white dorsal antennule whips sweeping high/back
        a2_pts = []
        a2_wts = []
        for ai in range(8):
            ua = ai / 7.0
            ax = sign * (0.0012 + 0.0110 * ua)
            ay = -0.0185 - 0.0140 * math.sin(ua * math.pi * 0.55) + 0.0180 * (ua ** 2)
            az = 0.0142 + 0.0195 * (ua ** 0.90)
            a2_pts.append(Vector((ax, ay, az)))
            a2_wts.append({'root': 0.8, b_mid: 0.2} if ua < 0.2 else {b_mid: 0.7, b_tip: 0.3})
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            a2_pts, [ic.lerp(0.00032, 0.00013, i / 7.0) for i in range(8)], (0.04, 0.42), (0.04, 0.42),
            a2_wts, ring_seg=6,
        )

        # Pair 3: Short forward-down sensory antennules below rostrum
        a3_pts = [
            Vector((sign * 0.0010, -0.0185, 0.0128)),
            Vector((sign * 0.0022, -0.0265, 0.0116)),
            Vector((sign * 0.0040, -0.0345, 0.0124)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            a3_pts, [0.00030, 0.00022, 0.00012], (0.04, 0.42), (0.04, 0.42),
            [{'root': 1.0}, {b_mid: 0.5, 'root': 0.5}, {b_mid: 0.8, 'root': 0.2}], ring_seg=6,
        )

        # Slender Snow-White Front Cleaning Chelipeds (beckoning posture)
        b_claw = f'claw_{side_label}'
        cl_pts = [
            Vector((sign * 0.0024, -0.0148, 0.0102)),
            Vector((sign * 0.0052, -0.0205, 0.0068)),
            Vector((sign * 0.0038, -0.0278, 0.0086)),
            Vector((sign * 0.0026, -0.0322, 0.0104)),
        ]
        ic.append_limb_tube(
            verts, faces, loop_uvs, vert_weights,
            cl_pts, [0.00062, 0.00056, 0.00048, 0.00024], (0.04, 0.42), (0.04, 0.42),
            [{'root': 0.7, b_claw: 0.3}, {'root': 0.2, b_claw: 0.8}, {b_claw: 1.0}, {b_claw: 1.0}],
            ring_seg=7,
        )

    # =========================================================================
    # 5. 3 PAIRS OF GOLDEN-CREAM WALKING LEGS (Touching z = 0) + PLEOPODS
    # =========================================================================
    walk_legs = [
        (-0.0115, 0.0125, -0.0150, 0.0155, -0.0175),
        (-0.0070, 0.0145, -0.0075, 0.0175, -0.0080),
        (-0.0025, 0.0135, 0.0010, 0.0165, 0.0025),
    ]
    for side_label, sign in (('L', 1.0), ('R', -1.0)):
        b_leg = f'legs_{side_label}'
        for y_sh, x_kn, y_kn, x_ft, y_ft in walk_legs:
            pts = [
                Vector((sign * 0.0030, y_sh, 0.0106)),
                Vector((sign * (x_kn * 0.72), ic.lerp(y_sh, y_kn, 0.45), 0.0124)),
                Vector((sign * x_kn, y_kn, 0.0085)),
                Vector((sign * (x_ft * 0.94), ic.lerp(y_kn, y_ft, 0.7), 0.0036)),
                Vector((sign * x_ft, y_ft, 0.0002)),
            ]
            rads = [0.00062, 0.00068, 0.00055, 0.00042, 0.00018]
            ic.append_limb_tube(
                verts, faces, loop_uvs, vert_weights,
                pts, rads, (0.48, 0.74), (0.04, 0.42),
                [{'root': 0.65, b_leg: 0.35}, {'root': 0.2, b_leg: 0.8}, {b_leg: 1.0}, {b_leg: 1.0}, {b_leg: 1.0}],
                ring_seg=7,
            )

    # 5 Pairs of Ventral Feathery Swimmerets (Pleopods)
    for k, y_p in enumerate((0.0035, 0.0072, 0.0110, 0.0148, 0.0185)):
        z_top = 0.0112 - 0.0006 * k
        for sign in (-1.0, 1.0):
            p_pts = [
                Vector((sign * 0.0018, y_p, z_top)),
                Vector((sign * 0.0024, y_p + 0.0014, z_top - 0.0030)),
                Vector((sign * 0.0028, y_p + 0.0030, z_top - 0.0054)),
            ]
            w_p = {'pleopods': 0.75, 'abdomen_1' if k < 3 else 'abdomen_2': 0.25}
            ic.append_limb_tube(
                verts, faces, loop_uvs, vert_weights,
                p_pts, [0.00048, 0.00040, 0.00018], (0.48, 0.74), (0.04, 0.40),
                [w_p, w_p, w_p], ring_seg=6, aspect=0.45,
            )

    # =========================================================================
    # 6. 13-BONE CLEANER-STATION DANCE ARMATURE + 49-FRAME LOOPING CLIP
    # =========================================================================
    bone_specs = [
        ('root', None, (0.0, -0.006, 0.014), (0.0, -0.018, 0.0145)),
        ('abdomen_1', 'root', (0.0, 0.002, 0.016), (0.0, 0.012, 0.0155)),
        ('abdomen_2', 'abdomen_1', (0.0, 0.012, 0.0155), (0.0, 0.022, 0.0105)),
        ('tail_fan', 'abdomen_2', (0.0, 0.022, 0.0105), (0.0, 0.032, 0.0065)),
        ('antenna_L', 'root', (0.0020, -0.0180, 0.0130), (0.0160, -0.0320, 0.0185)),
        ('antenna_L_tip', 'antenna_L', (0.0160, -0.0320, 0.0185), (0.0245, -0.0480, 0.0260)),
        ('antenna_R', 'root', (-0.0020, -0.0180, 0.0130), (-0.0160, -0.0320, 0.0185)),
        ('antenna_R_tip', 'antenna_R', (-0.0160, -0.0320, 0.0185), (-0.0245, -0.0480, 0.0260)),
        ('claw_L', 'root', (0.0024, -0.0148, 0.0102), (0.0028, -0.0315, 0.0100)),
        ('claw_R', 'root', (-0.0024, -0.0148, 0.0102), (-0.0028, -0.0315, 0.0100)),
        ('pleopods', 'abdomen_1', (0.0, 0.009, 0.0110), (0.0, 0.013, 0.0060)),
        ('legs_L', 'root', (0.0030, -0.007, 0.0106), (0.0160, -0.008, 0.002)),
        ('legs_R', 'root', (-0.0030, -0.007, 0.0106), (-0.0160, -0.008, 0.002)),
    ]

    def animate_frame(phase):
        return {
            # Signature cleaner shrimp rhythmic side-to-side sway dance
            'root': (math.radians(2.2 * math.sin(phase * 2.0)), math.radians(4.8 * math.sin(phase)), math.radians(3.5 * math.cos(phase))),
            'abdomen_1': (math.radians(3.5 * math.sin(phase - 0.5)), 0.0, math.radians(2.5 * math.cos(phase - 0.4))),
            'abdomen_2': (math.radians(4.8 * math.sin(phase - 1.0)), 0.0, math.radians(3.0 * math.cos(phase - 0.9))),
            'tail_fan': (math.radians(6.5 * math.sin(phase - 1.5)), 0.0, 0.0),
            # Graceful dual-segment sweeping white antennae
            'antenna_L': (math.radians(10.0 * math.sin(phase)), math.radians(5.0 * math.cos(phase)), math.radians(16.0 * math.sin(phase + 0.4))),
            'antenna_L_tip': (math.radians(14.0 * math.sin(phase - 0.6)), 0.0, math.radians(18.0 * math.sin(phase - 0.5))),
            'antenna_R': (math.radians(10.0 * math.sin(phase + 1.4)), math.radians(-5.0 * math.cos(phase + 1.4)), math.radians(-16.0 * math.sin(phase + 1.8))),
            'antenna_R_tip': (math.radians(14.0 * math.sin(phase + 0.8)), 0.0, math.radians(-18.0 * math.sin(phase + 0.9))),
            # Beckoning cleaning claws
            'claw_L': (math.radians(10.0 * math.sin(phase * 2.0)), 0.0, math.radians(6.0 * math.cos(phase))),
            'claw_R': (math.radians(10.0 * math.sin(phase * 2.0 + 1.2)), 0.0, math.radians(-6.0 * math.cos(phase + 1.2))),
            # Rapid 2x-harmonic swimmeret flutter
            'pleopods': (math.radians(18.0 * math.sin(phase * 2.0)), 0.0, 0.0),
            # Subtle counter-rocking legs staying gently lifted on swing without punching z<0
            'legs_L': (0.0, math.radians(-3.5 * max(0.0, math.sin(phase))), math.radians(4.0 * math.sin(phase))),
            'legs_R': (0.0, math.radians(3.5 * max(0.0, math.sin(phase + math.pi))), math.radians(-4.0 * math.sin(phase))),
        }

    return ic.assemble_rigged_invertebrate(
        'Scarlet_Skunk_Cleaner_Shrimp',
        verts, faces, loop_uvs, vert_weights,
        bone_specs, mat, CLIP_NAME, animate_frame,
    )


def main():
    ic.clear_scene_and_setup(samples=24)
    albedo, norm, orm = build_cleaner_shrimp_textures(size=512)
    mat = ic.build_invertebrate_pbr_material('Cleaner_Shrimp_Mat', albedo, norm, orm, normal_strength=0.68, spec=0.62)
    arm_obj, mesh_obj, tris = build_cleaner_shrimp_geometry_and_rig(mat)
    report = ic.save_export_and_render_thumbnail(
        ASSET_ID, SPECIES_ID, arm_obj, mesh_obj,
        elev_deg=22.0, yaw_deg=44.0, margin=1.18,
    )
    report['triangles'] = tris
    print('CLEANER_SHRIMP_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
