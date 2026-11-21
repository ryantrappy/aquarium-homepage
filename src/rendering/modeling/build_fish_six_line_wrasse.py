"""AQ-91 Blender Fish Override: Six-Line Wrasse (`six-line-wrasse`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "six-line-wrasse",
    "eye": {
        "u": 0.865,
        "v": 0.498,
        "ru": 0.028,
        "rv": 0.056,
        "dome_m": 0.0120,
        "rim_m": 0.0028,
        "iris_rgb": [0.84, 0.46, 0.14],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.742,
        "v_top": 0.40,
        "v_bot": 0.68,
        "curve_quad": 0.40,
        "plate_width": 0.054,
        "plate_m": 0.0078,
        "slit_m": 0.0060,
    },
    "mouth": {
        "u_start": 0.895,
        "u_end": 0.954,
        "v_tip": 0.555,
        "slope_dv_du": -0.55,
        "cleft_m": 0.0040,
        "lip_m": 0.0038,
    },
    "body": {
        "cheek_puff_m": 0.0028,
        "scale_freq_u": 78.0,
        "scale_freq_v": 50.0,
        "scale_strength": 0.38,
        "lateral_line_v": 0.39,
        "flank_metallic": 0.11,
        "fin_ray_strength": 0.33,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
