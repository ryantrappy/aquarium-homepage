"""AQ-91 Blender Fish Override: Yellow Watchman Goby (`yellow-watchman-goby`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "yellow-watchman-goby",
    "eye": {
        "u": 0.872,
        "v": 0.245,
        "ru": 0.026,
        "rv": 0.076,
        "dome_m": 0.0140,
        "rim_m": 0.0032,
        "iris_rgb": [0.85, 0.78, 0.14],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.750,
        "v_top": 0.32,
        "v_bot": 0.68,
        "curve_quad": 0.30,
        "plate_width": 0.058,
        "plate_m": 0.0080,
        "slit_m": 0.0060,
    },
    "mouth": {
        "u_start": 0.875,
        "u_end": 0.947,
        "v_tip": 0.370,
        "slope_dv_du": 1.85,
        "cleft_m": 0.0046,
        "lip_m": 0.0044,
    },
    "body": {
        "cheek_puff_m": 0.0030,
        "scale_freq_u": 86.0,
        "scale_freq_v": 42.0,
        "scale_strength": 0.22,
        "lateral_line_v": 0.44,
        "flank_metallic": 0.04,
        "fin_ray_strength": 0.32,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
