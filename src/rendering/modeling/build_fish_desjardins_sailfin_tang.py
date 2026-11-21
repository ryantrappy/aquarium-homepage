"""AQ-91 Standalone Blender Builder: Original $0 Desjardins' Sailfin Tang (`desjardins-sailfin-tang`).

Generates a 100% original procedural photorealistic Zebrasoma desjardinii RGBA texture and
sculpted, rigged, animated Blender asset (no Sketchfab or CC-BY-NC derivative).
"""
import math
import sys
from pathlib import Path

import numpy as np

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_from_reference_common import build_fish_from_rgba_and_export  # noqa: E402


def _smoothstep_np(edge0: np.ndarray | float, edge1: np.ndarray | float, x: np.ndarray) -> np.ndarray:
    invert = np.asarray(edge1) < np.asarray(edge0)
    lo = np.where(invert, edge1, edge0)
    hi = np.where(invert, edge0, edge1)
    t = np.clip((x - lo) / np.maximum(1e-6, hi - lo), 0.0, 1.0)
    s = t * t * (3.0 - 2.0 * t)
    return np.where(invert, 1.0 - s, s)


def _fbm_2d(u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Deterministic multi-octave value-free trig noise in `[-1, 1]` for organic pigmentation."""
    n = (
        0.50 * np.sin(u * 29.0 + np.cos(v * 23.0) * 1.6) * np.cos(v * 31.0 - np.sin(u * 19.0) * 1.4)
        + 0.28 * np.sin(u * 67.0 + v * 59.0 + 0.9) * np.cos(u * 53.0 - v * 61.0)
        + 0.14 * np.sin(u * 131.0 - v * 117.0 + 2.1)
        + 0.08 * np.cos(u * 241.0 + v * 223.0 + 0.4)
    )
    return np.clip(n, -1.0, 1.0)


def generate_desjardins_sailfin_tang_rgba(width: int = 600, height: int = 400) -> np.ndarray:
    """Synthesize a project-original photorealistic Zebrasoma desjardinii `(H, W, 4)` float32 image."""
    xs = (np.arange(width, dtype=np.float32) + 0.5) / width
    ys = (np.arange(height, dtype=np.float32) + 0.5) / height
    u, v = np.meshgrid(xs, ys)

    # Organic profile curve helpers matching Zebrasoma desjardinii silhouette:
    # u=0.04 tail tip, u=0.225 peduncle, u=0.52 sail apex, u=0.805 eye, u=0.96 snout tip
    t_body = np.clip((u - 0.22) / (0.96 - 0.22), 0.0, 1.0)
    # Tall overarching Zebrasoma desjardinii dorsal sail (broad rear sweep at u=0.25..0.55)
    ts_d = np.clip((u - 0.225) / (0.865 - 0.225), 0.0, 1.0)
    dorsal_sail_curve = np.sin(ts_d * math.pi * 0.90) ** 0.48
    dorsal_main = np.where(
        (u >= 0.215) & (u <= 0.965),
        0.505
        - 0.468 * dorsal_sail_curve
        + 0.145 * _smoothstep_np(0.83, 0.96, u)
        - 0.052 * np.exp(-(((u - 0.805) / 0.046) ** 2))  # brow ridge over eye
        + 0.015 * _smoothstep_np(0.86, 0.93, u) * _smoothstep_np(0.965, 0.93, u),  # concaved snout upper
        0.505,
    )
    # Symmetrical rounded ventral sailfin + pelvic keel + Zebrasoma throat notch
    ts_v = np.clip((u - 0.225) / (0.855 - 0.225), 0.0, 1.0)
    ventral_sail_curve = np.sin(ts_v * math.pi * 0.88) ** 0.50
    ventral_main = np.where(
        (u >= 0.215) & (u <= 0.965),
        0.505
        + 0.460 * ventral_sail_curve
        - 0.125 * _smoothstep_np(0.83, 0.96, u)
        + 0.068 * np.exp(-(((u - 0.705) / 0.032) ** 2)),  # distinct pelvic/throat notch
        0.505,
    )
    # Narrow caudal peduncle constriction right before tail base (u ~ 0.22..0.245)
    ped_neck = np.exp(-(((u - 0.232) / 0.024) ** 2))
    dorsal_main = dorsal_main * (1.0 - 0.82 * ped_neck) + 0.435 * (0.82 * ped_neck)
    ventral_main = ventral_main * (1.0 - 0.82 * ped_neck) + 0.575 * (0.82 * ped_neck)
    # Snout convergence right at u in [0.92, 0.965] -> rounded snout around v=0.618
    snout_t = _smoothstep_np(0.87, 0.962, u)
    v_snout = 0.618
    dorsal_env = dorsal_main * (1.0 - snout_t) + (v_snout - 0.042 * np.sqrt(np.maximum(0.0, 1.0 - ((u - 0.87) / 0.092) ** 2))) * snout_t
    ventral_env = ventral_main * (1.0 - snout_t) + (v_snout + 0.040 * np.sqrt(np.maximum(0.0, 1.0 - ((u - 0.87) / 0.092) ** 2))) * snout_t

    # Fan caudal fin for u in [0.045, 0.235] with gently rounded posterior margin
    tc = np.clip((0.235 - u) / (0.235 - 0.042), 0.0, 1.0)
    caudal_spread = 0.060 + 0.195 * (tc ** 0.72)
    # Curved outer rear edge of tail fin
    u_tail_edge = 0.046 + 0.024 * (((v - 0.505) / 0.25) ** 2)
    in_tail = (u >= u_tail_edge) & (u <= 0.235) & (np.abs(v - 0.505) <= caudal_spread)

    # Dorsal & ventral sail body masks vs inner trunk body ellipse
    in_main = (u >= 0.215) & (u <= 0.962) & (v >= dorsal_env) & (v <= ventral_env)
    fg = in_main | in_tail

    # Soft inner trunk core separating thick body from tall radiating dorsal/anal sails
    trunk_top = 0.505 - 0.235 * (np.sin(np.clip((u - 0.22) / 0.72, 0.0, 1.0) * math.pi * 0.92) ** 0.62)
    trunk_bot = 0.505 + 0.225 * (np.sin(np.clip((u - 0.22) / 0.72, 0.0, 1.0) * math.pi * 0.92) ** 0.66)
    in_dorsal_sail = (u < 0.79) & (v < trunk_top + 0.015 * np.sin(u * 20.0))
    in_anal_sail = (u < 0.67) & (v > trunk_bot - 0.010 * np.sin(u * 18.0))
    fin_sail_blend = np.maximum(
        _smoothstep_np(trunk_top + 0.025, trunk_top - 0.035, v) * (1.0 - _smoothstep_np(0.75, 0.81, u)),
        _smoothstep_np(trunk_bot - 0.025, trunk_bot + 0.035, v) * (1.0 - _smoothstep_np(0.64, 0.70, u)),
    )

    noise = _fbm_2d(u, v)
    finer = _fbm_2d(u * 2.7 + 0.3, v * 2.7 - 0.2)

    # Base Zebrasoma desjardinii dark charcoal slate vs warm golden-ochre bars & pearlescent spots
    u_warp = u + 0.010 * np.sin(v * 22.0 + u * 6.0) + 0.005 * noise
    bar_wave = np.cos((u_warp - 0.24) / 0.044 * math.pi * 2.0)
    dark_band = _smoothstep_np(-0.18, 0.22, bar_wave)

    # Amber thin edge highlight bordering major dark bars
    gold_line = np.exp(-(((bar_wave + 0.12) / 0.26) ** 2)) * (1.0 - _smoothstep_np(0.74, 0.80, u))
    col_dark_slate = np.array([0.13, 0.16, 0.21], dtype=np.float32)
    col_mid_slate = np.array([0.28, 0.31, 0.35], dtype=np.float32)
    col_ochre = np.array([0.78, 0.44, 0.12], dtype=np.float32)

    # Trunk bars transition to dotted belly & ornate dotted forehead/cheek mask
    body_rgb = (
        col_dark_slate[None, None, :] * (dark_band * 0.78 + 0.22)[:, :, None]
        + col_mid_slate[None, None, :] * ((1.0 - dark_band) * 0.85)[:, :, None]
    )
    belly_transition = _smoothstep_np(0.56, 0.72, v) * (1.0 - _smoothstep_np(0.66, 0.78, u))
    body_rgb = body_rgb * (1.0 - 0.45 * belly_transition[:, :, None]) + col_mid_slate[None, None, :] * (0.45 * belly_transition[:, :, None])
    body_rgb += col_ochre[None, None, :] * (0.58 * gold_line * (1.0 - 0.5 * belly_transition))[:, :, None]

    # Cheek & dark ocular bar through eye
    ocular_bar = np.exp(-(((u - 0.805 + (v - 0.435) * 0.35) / 0.030) ** 2)) * _smoothstep_np(0.30, 0.42, v)
    preopercle_bar = np.exp(-(((u - 0.740 + (v - 0.50) * 0.28) / 0.028) ** 2))
    head_mask = _smoothstep_np(0.73, 0.82, u)
    body_rgb = body_rgb * (1.0 - 0.48 * np.maximum(ocular_bar, preopercle_bar) * head_mask)[:, :, None] + (
        col_dark_slate[None, None, :] * (0.48 * np.maximum(ocular_bar, preopercle_bar) * head_mask)[:, :, None]
    )

    # Organic cream-gold pearl speckles over snout, cheeks, throat, belly, and sail bases
    cell_u = np.round(u * 88.0) / 88.0
    cell_v = np.round(v * 58.0) / 58.0
    jitter_u = 0.004 * np.sin(cell_u * 417.0 + cell_v * 233.0)
    jitter_v = 0.005 * np.cos(cell_u * 313.0 - cell_v * 521.0)
    d_spot = np.hypot((u - (cell_u + jitter_u)) * 1.5, v - (cell_v + jitter_v))
    spot = np.exp(-((d_spot / 0.0042) ** 2))
    spot_region = np.maximum(
        _smoothstep_np(0.74, 0.86, u) * _smoothstep_np(0.32, 0.48, v),
        _smoothstep_np(0.54, 0.72, v) * _smoothstep_np(0.24, 0.34, u) * (1.0 - _smoothstep_np(0.70, 0.82, u)),
    )
    spot_col = np.array([0.86, 0.82, 0.70], dtype=np.float32)
    body_rgb = body_rgb * (1.0 - 0.72 * spot * spot_region)[:, :, None] + spot_col[None, None, :] * (0.72 * spot * spot_region)[:, :, None]

    # Radiating amber & slate fin stripes on tall dorsal/anal sails with pearl dots
    sail_ang = np.arctan2(v - 0.505, u - 0.48)
    sail_rays = 0.5 + 0.5 * np.sin(sail_ang * 58.0 + 0.18 * noise)
    sail_col = (
        np.array([0.21, 0.25, 0.30], dtype=np.float32)[None, None, :] * (1.0 - sail_rays * 0.75)[:, :, None]
        + np.array([0.74, 0.45, 0.14], dtype=np.float32)[None, None, :] * (sail_rays * 0.75)[:, :, None]
    )
    # Pearlescent spots scattered across the sails and caudal fin
    sail_spot = np.exp(-((d_spot / 0.0048) ** 2)) * (0.55 + 0.45 * np.sin(cell_u * 191.0 + cell_v * 389.0) > 0.35)
    sail_col = sail_col * (1.0 - 0.65 * sail_spot)[:, :, None] + spot_col[None, None, :] * (0.65 * sail_spot)[:, :, None]

    # Dark margin edge of tall dorsal/anal sails & pectoral hint
    body_rgb = body_rgb * (1.0 - fin_sail_blend[:, :, None]) + sail_col * fin_sail_blend[:, :, None]

    # Golden-yellow fan tail with bright pale spots and dark peduncle bar
    c_tail = np.array([0.88, 0.68, 0.12], dtype=np.float32)[None, None, :] + 0.08 * finer[:, :, None]
    tail_spots = np.exp(-((d_spot / 0.0046) ** 2)) * 0.75
    c_tail = c_tail * (1.0 - 0.55 * tail_spots)[:, :, None] + np.array([0.96, 0.92, 0.74], dtype=np.float32)[None, None, :] * (0.55 * tail_spots)[:, :, None]
    tail_edge = _smoothstep_np(0.24, 0.19, u) * _smoothstep_np(0.04, 0.06, u)
    # Subtle dark outer margin on tail fin
    tail_rim = np.exp(-(((u - u_tail_edge) / 0.012) ** 2)) * 0.45
    c_tail = c_tail * (1.0 - tail_rim)[:, :, None] + col_dark_slate[None, None, :] * tail_rim[:, :, None]
    body_rgb = body_rgb * (1.0 - tail_edge[:, :, None]) + c_tail * tail_edge[:, :, None]

    # Elliptical translucent rayed pectoral pigment only (no rectangular box)
    pect_d = np.hypot((u - 0.645) / 0.072, (v - 0.565) / 0.095)
    in_pect_uv = _smoothstep_np(1.0, 0.78, pect_d)
    pect_rays = 0.5 + 0.5 * np.sin((v - 0.56) * 210.0 + u * 55.0)
    pect_col = np.array([0.28, 0.30, 0.32], dtype=np.float32)[None, None, :] * (1.0 - 0.35 * pect_rays)[:, :, None] + spot_col[None, None, :] * (0.45 * spot)[:, :, None]
    body_rgb = body_rgb * (1.0 - 0.62 * in_pect_uv[:, :, None]) + pect_col * (0.62 * in_pect_uv[:, :, None])

    # Caudal peduncle dark lancet sheath + bright ivory scalpel spine at (0.228, 0.505)
    d_sheath = np.hypot((u - 0.228) / 0.032, (v - 0.505) / 0.018)
    sheath_m = 1.0 - _smoothstep_np(0.72, 1.05, d_sheath)
    d_blade = np.hypot((u - 0.228) / 0.022, (v - 0.505) / 0.008)
    blade_m = 1.0 - _smoothstep_np(0.68, 1.0, d_blade)
    body_rgb = body_rgb * (1.0 - 0.85 * sheath_m)[:, :, None] + np.array([0.07, 0.08, 0.10], dtype=np.float32)[None, None, :] * (0.85 * sheath_m)[:, :, None]
    body_rgb = body_rgb * (1.0 - 0.92 * blade_m)[:, :, None] + np.array([0.92, 0.91, 0.85], dtype=np.float32)[None, None, :] * (0.92 * blade_m)[:, :, None]

    # Painted eye iris (radial biological spokes + limbal dark ring) & pupil at (u=0.805, v=0.435)
    r_eye = np.hypot((u - 0.805) / 0.032, (v - 0.435) / 0.048)
    ang_eye = np.arctan2(v - 0.435, u - 0.805)
    iris_spoke = 0.5 + 0.5 * np.sin(ang_eye * 26.0 + 1.8 * noise)
    iris_m = (1.0 - _smoothstep_np(0.78, 1.0, r_eye)) * _smoothstep_np(0.36, 0.52, r_eye)
    limbal = _smoothstep_np(0.68, 0.96, r_eye) * (1.0 - _smoothstep_np(0.92, 1.04, r_eye))
    iris_col = (
        np.array([0.48, 0.30, 0.09], dtype=np.float32)[None, None, :] * (0.45 + 0.55 * (1.0 - iris_spoke))[:, :, None]
        + np.array([0.78, 0.55, 0.20], dtype=np.float32)[None, None, :] * (0.55 * iris_spoke)[:, :, None]
    ) * (1.0 - 0.55 * limbal)[:, :, None]
    pupil_m = 1.0 - _smoothstep_np(0.36, 0.48, r_eye)
    body_rgb = body_rgb * (1.0 - iris_m)[:, :, None] + iris_col * iris_m[:, :, None]
    body_rgb = body_rgb * (1.0 - pupil_m)[:, :, None] + np.array([0.02, 0.02, 0.03], dtype=np.float32)[None, None, :] * pupil_m[:, :, None]

    # Natural subtle skin/scale micro-variation across body
    body_rgb = np.clip(body_rgb * (1.0 + 0.06 * noise[:, :, None] + 0.03 * finer[:, :, None]), 0.0, 1.0)

    alpha = np.where(fg, 1.0, 0.0).astype(np.float32)
    return np.dstack([body_rgb, alpha]).astype(np.float32)


SPEC = {
    "id": "desjardins-sailfin-tang",
    "shape": {
        "max_half_w": 0.132,
        "fin_fade_px": 28.0,
        "grid_nz": 88,
        "grid_ny": 56,
        "caudal_scalpel": {
            "u": 0.228,
            "v": 0.505,
            "ru": 0.024,
            "rv": 0.013,
            "height_m": 0.009,
        },
    },
    "pectoral": {
        "z_gltf": 0.420,
        "y_gltf": -0.085,
        "length": 0.21,
        "spread_y": 0.145,
        "out_x": 0.034,
        "u0": 0.585,
        "u1": 0.705,
        "v0": 0.48,
        "v1": 0.65,
    },
    "animation": {
        "clip_name": "zebrasoma_labriform_swim",
        "spine_amp_deg": [0.0, 0.4, 1.2, 3.2, 6.2, 9.8],
        "pect_sweep_deg": 25.0,
        "pect_feather_deg": 13.0,
    },
    "eye": {
        "u": 0.805,
        "v": 0.435,
        "ru": 0.034,
        "rv": 0.050,
        "dome_m": 0.0150,
        "rim_m": 0.0035,
        "iris_rgb": [0.68, 0.46, 0.16],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.724,
        "v_top": 0.35,
        "v_bot": 0.68,
        "curve_quad": 0.48,
        "plate_width": 0.055,
        "plate_m": 0.0085,
        "slit_m": 0.0065,
    },
    "mouth": {
        "u_start": 0.916,
        "u_end": 0.960,
        "v_tip": 0.618,
        "slope_dv_du": 0.12,
        "cleft_m": 0.0042,
        "lip_m": 0.0042,
    },
    "body": {
        "cheek_puff_m": 0.0030,
        "scale_freq_u": 102.0,
        "scale_freq_v": 76.0,
        "scale_strength": 0.14,
        "lateral_line_v": 0.34,
        "flank_metallic": 0.05,
        "fin_ray_strength": 0.42,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    rgba = generate_desjardins_sailfin_tang_rgba()
    build_fish_from_rgba_and_export(SPEC, rgba)
