"""AQ-91 Blender Fish Override: Royal Gramma (`royal-gramma`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "royal-gramma",
    "eye": {
        "u": 0.878,
        "v": 0.432,
        "ru": 0.036,
        "rv": 0.072,
        "dome_m": 0.0135,
        "rim_m": 0.0032,
        "iris_rgb": [0.46, 0.14, 0.58],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.745,
        "v_top": 0.36,
        "v_bot": 0.65,
        "curve_quad": 0.42,
        "plate_width": 0.056,
        "plate_m": 0.0082,
        "slit_m": 0.0064,
    },
    "mouth": {
        "u_start": 0.915,
        "u_end": 0.980,
        "v_tip": 0.495,
        "slope_dv_du": -0.70,
        "cleft_m": 0.0044,
        "lip_m": 0.0042,
    },
    "body": {
        "cheek_puff_m": 0.0032,
        "scale_freq_u": 72.0,
        "scale_freq_v": 48.0,
        "scale_strength": 0.40,
        "lateral_line_v": 0.33,
        "flank_metallic": 0.06,
        "fin_ray_strength": 0.34,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
