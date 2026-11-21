"""AQ-91 Blender Fish Override: Flame Angelfish (`flame-angelfish`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "flame-angelfish",
    "eye": {
        "u": 0.865,
        "v": 0.435,
        "ru": 0.042,
        "rv": 0.064,
        "dome_m": 0.0135,
        "rim_m": 0.0032,
        "iris_rgb": [0.76, 0.24, 0.05],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.775,
        "v_top": 0.37,
        "v_bot": 0.67,
        "curve_quad": 0.45,
        "plate_width": 0.058,
        "plate_m": 0.0085,
        "slit_m": 0.0068,
    },
    "mouth": {
        "u_start": 0.918,
        "u_end": 0.974,
        "v_tip": 0.525,
        "slope_dv_du": -0.30,
        "cleft_m": 0.0046,
        "lip_m": 0.0044,
    },
    "body": {
        "cheek_puff_m": 0.0035,
        "scale_freq_u": 78.0,
        "scale_freq_v": 58.0,
        "scale_strength": 0.45,
        "lateral_line_v": 0.35,
        "flank_metallic": 0.05,
        "fin_ray_strength": 0.35,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
