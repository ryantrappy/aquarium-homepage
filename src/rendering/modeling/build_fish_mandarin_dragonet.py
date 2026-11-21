"""AQ-91 Blender Fish Override: Mandarin Dragonet (`mandarin-dragonet`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "mandarin-dragonet",
    "eye": {
        "u": 0.882,
        "v": 0.460,
        "ru": 0.036,
        "rv": 0.078,
        "dome_m": 0.0150,
        "rim_m": 0.0036,
        "iris_rgb": [0.82, 0.36, 0.12],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.768,
        "v_top": 0.42,
        "v_bot": 0.70,
        "curve_quad": 0.32,
        "plate_width": 0.054,
        "plate_m": 0.0084,
        "slit_m": 0.0064,
    },
    "mouth": {
        "u_start": 0.935,
        "u_end": 0.982,
        "v_tip": 0.580,
        "slope_dv_du": -0.15,
        "cleft_m": 0.0040,
        "lip_m": 0.0042,
    },
    "body": {
        "cheek_puff_m": 0.0034,
        "scale_freq_u": 80.0,
        "scale_freq_v": 52.0,
        "scale_strength": 0.12,
        "lateral_line_v": 0.46,
        "flank_metallic": 0.07,
        "fin_ray_strength": 0.38,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
