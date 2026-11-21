"""AQ-91 Blender Fish Override: Tailspot Blenny (`tailspot-blenny`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "tailspot-blenny",
    "eye": {
        "u": 0.908,
        "v": 0.345,
        "ru": 0.026,
        "rv": 0.076,
        "dome_m": 0.0145,
        "rim_m": 0.0034,
        "iris_rgb": [0.76, 0.58, 0.16],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.785,
        "v_top": 0.40,
        "v_bot": 0.68,
        "curve_quad": 0.28,
        "plate_width": 0.052,
        "plate_m": 0.0078,
        "slit_m": 0.0058,
    },
    "mouth": {
        "u_start": 0.935,
        "u_end": 0.978,
        "v_tip": 0.515,
        "slope_dv_du": 0.35,
        "cleft_m": 0.0040,
        "lip_m": 0.0040,
    },
    "body": {
        "cheek_puff_m": 0.0028,
        "scale_freq_u": 84.0,
        "scale_freq_v": 44.0,
        "scale_strength": 0.10,
        "lateral_line_v": 0.42,
        "flank_metallic": 0.06,
        "fin_ray_strength": 0.36,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
