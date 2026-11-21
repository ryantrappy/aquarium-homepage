"""AQ-91 Blender Fish Override: Banggai Cardinalfish (`banggai-cardinalfish`)."""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import sculpt_and_export_fish_species

SPEC = {
    "id": "banggai-cardinalfish",
    "eye": {
        "u": 0.850,
        "v": 0.492,
        "ru": 0.046,
        "rv": 0.070,
        "dome_m": 0.0145,
        "rim_m": 0.0034,
        "iris_rgb": [0.46, 0.46, 0.48],
        "auto_snap_pupil": True,
    },
    "operculum": {
        "u_arc_mid": 0.760,
        "v_top": 0.37,
        "v_bot": 0.67,
        "curve_quad": 0.35,
        "plate_width": 0.056,
        "plate_m": 0.0086,
        "slit_m": 0.0068,
    },
    "mouth": {
        "u_start": 0.880,
        "u_end": 0.946,
        "v_tip": 0.522,
        "slope_dv_du": -1.20,
        "cleft_m": 0.0044,
        "lip_m": 0.0042,
    },
    "body": {
        "cheek_puff_m": 0.0032,
        "scale_freq_u": 64.0,
        "scale_freq_v": 46.0,
        "scale_strength": 0.36,
        "lateral_line_v": 0.38,
        "flank_metallic": 0.16,
        "fin_ray_strength": 0.34,
        "tex_size": 512,
    },
}

if __name__ == "__main__":
    sculpt_and_export_fish_species(SPEC)
