"""AQ-91 / AQ-70.9 Standalone Blender Builder: Ocellaris Clownfish (`ocellaris-clownfish`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_from_reference_common import (
    build_fish_from_rgba_and_export,
    load_webp_topdown_rgba,
)

SPEC = {
    "id": "ocellaris-clownfish",
    "shape": {
        "max_half_w": 0.175,
        "fin_fade_px": 22.0,
        "grid_nz": 92,
        "grid_ny": 54,
    },
    "pectoral": {
        "z_gltf": 0.435,
        "y_gltf": -0.062,
        "length": 0.215,
        "spread_y": 0.155,
        "out_x": 0.038,
        "u0": 0.592,
        "u1": 0.718,
        "v0": 0.485,
        "v1": 0.720,
    },
    "animation": {
        "clip_name": "clownfish_subcarangiform_swim",
        "spine_amp_deg": [0.0, 1.2, 2.8, 5.4, 8.6, 12.2],
        "pect_sweep_deg": 24.0,
        "pect_feather_deg": 12.0,
    },
    "eye": {
        "u": 0.872,
        "v": 0.427,
        "ru": 0.028,
        "rv": 0.056,
        "dome_m": 0.0145,
        "rim_m": 0.0034,
        "iris_rgb": [0.82, 0.38, 0.08],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.785,
        "v_top": 0.26,
        "v_bot": 0.72,
        "curve_quad": 0.40,
        "plate_width": 0.052,
        "plate_m": 0.0080,
        "slit_m": 0.0062,
    },
    "mouth": {
        "u_start": 0.935,
        "u_end": 0.981,
        "v_tip": 0.515,
        "slope_dv_du": 0.35,
        "cleft_m": 0.0046,
        "lip_m": 0.0048,
    },
    "body": {
        "cheek_puff_m": 0.0036,
        "scale_freq_u": 98.0,
        "scale_freq_v": 64.0,
        "scale_strength": 0.09,
        "lateral_line_v": 0.36,
        "flank_metallic": 0.03,
        "fin_ray_strength": 0.34,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    rgba = load_webp_topdown_rgba("public/fish/ocellaris-clownfish.webp")
    build_fish_from_rgba_and_export(SPEC, rgba)
