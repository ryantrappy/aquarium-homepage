"""AQ-91 Blender Fish Override: McCosker's Flasher Wrasse (`mccoskers-flasher-wrasse`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "mccoskers-flasher-wrasse",
    "eye": {
        "u": 0.885,
        "v": 0.525,
        "ru": 0.025,
        "rv": 0.052,
        "dome_m": 0.0115,
        "rim_m": 0.0026,
        "iris_rgb": [0.88, 0.45, 0.12],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.768,
        "v_top": 0.45,
        "v_bot": 0.72,
        "curve_quad": 0.36,
        "plate_width": 0.050,
        "plate_m": 0.0076,
        "slit_m": 0.0058,
    },
    "mouth": {
        "u_start": 0.915,
        "u_end": 0.961,
        "v_tip": 0.560,
        "slope_dv_du": -0.50,
        "cleft_m": 0.0038,
        "lip_m": 0.0036,
    },
    "body": {
        "cheek_puff_m": 0.0026,
        "scale_freq_u": 78.0,
        "scale_freq_v": 48.0,
        "scale_strength": 0.36,
        "lateral_line_v": 0.44,
        "flank_metallic": 0.10,
        "fin_ray_strength": 0.34,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
