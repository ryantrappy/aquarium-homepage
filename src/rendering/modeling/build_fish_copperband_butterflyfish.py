"""AQ-91 Blender Fish Override: Copperband Butterflyfish (`copperband-butterflyfish`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "copperband-butterflyfish",
    "eye": {
        "u": 0.752,
        "v": 0.490,
        "ru": 0.032,
        "rv": 0.048,
        "dome_m": 0.0125,
        "rim_m": 0.0028,
        "iris_rgb": [0.78, 0.44, 0.10],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.655,
        "v_top": 0.38,
        "v_bot": 0.68,
        "curve_quad": 0.38,
        "plate_width": 0.055,
        "plate_m": 0.0080,
        "slit_m": 0.0062,
    },
    "mouth": {
        "u_start": 0.945,
        "u_end": 0.988,
        "v_tip": 0.568,
        "slope_dv_du": 0.04,
        "cleft_m": 0.0036,
        "lip_m": 0.0034,
    },
    "body": {
        "cheek_puff_m": 0.0025,
        "scale_freq_u": 74.0,
        "scale_freq_v": 54.0,
        "scale_strength": 0.40,
        "lateral_line_v": 0.36,
        "flank_metallic": 0.14,
        "fin_ray_strength": 0.34,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
