"""AQ-91 Blender Fish Override: Firefish (`firefish`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "firefish",
    "eye": {
        "u": 0.850,
        "v": 0.525,
        "ru": 0.024,
        "rv": 0.068,
        "dome_m": 0.0115,
        "rim_m": 0.0026,
        "iris_rgb": [0.68, 0.74, 0.30],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.760,
        "v_top": 0.43,
        "v_bot": 0.70,
        "curve_quad": 0.25,
        "plate_width": 0.044,
        "plate_m": 0.0070,
        "slit_m": 0.0054,
    },
    "mouth": {
        "u_start": 0.868,
        "u_end": 0.898,
        "v_tip": 0.560,
        "slope_dv_du": -0.95,
        "cleft_m": 0.0036,
        "lip_m": 0.0034,
    },
    "body": {
        "cheek_puff_m": 0.0025,
        "scale_freq_u": 84.0,
        "scale_freq_v": 42.0,
        "scale_strength": 0.30,
        "lateral_line_v": 0.52,
        "flank_metallic": 0.12,
        "fin_ray_strength": 0.32,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
