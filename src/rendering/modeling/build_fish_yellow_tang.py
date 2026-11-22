"""AQ-91 / AQ-70.9 Standalone Blender Builder: Yellow Tang (`yellow-tang`)."""
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
    "id": "yellow-tang",
    "shape": {
        "max_half_w": 0.140,
        "fin_fade_px": 26.0,
        "grid_nz": 90,
        "grid_ny": 54,
        "caudal_scalpel": {
            "u": 0.2285,
            "v": 0.5093,
            "ru": 0.024,
            "rv": 0.013,
            "height_m": 0.009,
        },
    },
    "pectoral": {
        "z_gltf": 0.425,
        "y_gltf": -0.085,
        "length": 0.21,
        "spread_y": 0.145,
        "out_x": 0.034,
        "u0": 0.565,
        "u1": 0.715,
        "v0": 0.43,
        "v1": 0.67,
    },
    "animation": {
        "clip_name": "yellow_tang_labriform_swim",
        "spine_amp_deg": [0.0, 0.5, 1.4, 3.6, 6.8, 10.6],
        "pect_sweep_deg": 26.0,
        "pect_feather_deg": 13.0,
    },
    "eye": {
        "u": 0.806,
        "v": 0.445,
        "ru": 0.036,
        "rv": 0.054,
        "dome_m": 0.0155,
        "rim_m": 0.0036,
        "iris_rgb": [0.88, 0.72, 0.10],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.722,
        "v_top": 0.36,
        "v_bot": 0.68,
        "curve_quad": 0.50,
        "plate_width": 0.055,
        "plate_m": 0.0085,
        "slit_m": 0.0065,
    },
    "mouth": {
        "u_start": 0.916,
        "u_end": 0.958,
        "v_tip": 0.628,
        "slope_dv_du": 0.10,
        "cleft_m": 0.0042,
        "lip_m": 0.0042,
    },
    "body": {
        "cheek_puff_m": 0.0030,
        "scale_freq_u": 106.0,
        "scale_freq_v": 78.0,
        "scale_strength": 0.10,
        "lateral_line_v": 0.34,
        "flank_metallic": 0.04,
        "fin_ray_strength": 0.40,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    rgba = load_webp_topdown_rgba("public/fish/yellow-tang.webp")
    build_fish_from_rgba_and_export(SPEC, rgba)
