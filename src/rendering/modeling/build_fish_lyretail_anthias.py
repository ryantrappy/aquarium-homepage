"""AQ-91 Blender Fish Override: Lyretail Anthias (`lyretail-anthias`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "lyretail-anthias",
    "eye": {
        "u": 0.885,
        "v": 0.470,
        "ru": 0.032,
        "rv": 0.064,
        "dome_m": 0.0130,
        "rim_m": 0.0030,
        "iris_rgb": [0.85, 0.52, 0.12],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.768,
        "v_top": 0.39,
        "v_bot": 0.68,
        "curve_quad": 0.35,
        "plate_width": 0.054,
        "plate_m": 0.0080,
        "slit_m": 0.0062,
    },
    "mouth": {
        "u_start": 0.910,
        "u_end": 0.970,
        "v_tip": 0.528,
        "slope_dv_du": -0.80,
        "cleft_m": 0.0042,
        "lip_m": 0.0040,
    },
    "body": {
        "cheek_puff_m": 0.0030,
        "scale_freq_u": 74.0,
        "scale_freq_v": 50.0,
        "scale_strength": 0.40,
        "lateral_line_v": 0.37,
        "flank_metallic": 0.09,
        "fin_ray_strength": 0.34,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
