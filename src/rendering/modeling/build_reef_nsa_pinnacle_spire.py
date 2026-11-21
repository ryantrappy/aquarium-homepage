"""Original AQ-94 Modular NSA Reef Piece #1: Asymmetrical Pinnacle Spire (`reef-nsa-pinnacle-spire`).

Tall eroded calcium-carbonate reef spire with undercut waist, cantilevered mid-ledge terrace,
sweeping porous pinnacle crest, and 2 BVH-verified coral mount sockets using the shared
2048x2048 PBR limestone trim sheet. Safe for both Blender MCP and background CLI Blender.
"""
import math
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-pinnacle-spire"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Asymmetric eroded geological NSA pinnacle cliff: broad craggy base -> jutting left terrace -> sweeping triangular main ridge
parts = [
    # Anchored broad limestone base plinth (z=0..0.18)
    ("ico", (-0.02,  0.00, 0.08), (0.25, 0.17, 0.10), ( 0.06, -0.10,  0.18)),
    ("ico", (-0.14, -0.02, 0.11), (0.17, 0.13, 0.09), ( 0.12,  0.20, -0.32)),
    ("ico", ( 0.14,  0.03, 0.11), (0.16, 0.14, 0.11), (-0.10,  0.14,  0.48)),
    # Wide flat cantilevered shelf plate projecting out on left-front (-0.21, -0.02, 0.24)
    ("ico", (-0.17, -0.02, 0.21), (0.17, 0.12, 0.065), ( 0.05, -0.12,  0.20)),
    ("ico", (-0.23, -0.02, 0.25), (0.12, 0.10, 0.045), (-0.04,  0.08, -0.10)),
    # Massive slanted triangular cliff spine rising asymmetrically to right-rear (+0.08, +0.02, 0.42..0.68)
    ("ico", ( 0.05,  0.01, 0.28), (0.18, 0.13, 0.18), ( 0.10,  0.48,  0.15)),
    ("ico", ( 0.08,  0.02, 0.45), (0.15, 0.11, 0.18), (-0.08,  0.38, -0.18)),
    # Craggy twin upper ledges: upper plateau shoulder at (-0.01, -0.03, 0.56) + swept ridge crest to (+0.11, +0.03, 0.66)
    ("ico", (-0.01, -0.03, 0.54), (0.12, 0.095, 0.065), ( 0.04,  0.06,  0.25)),
    ("ico", ( 0.11,  0.03, 0.63), (0.095, 0.075, 0.12), (-0.14,  0.32,  0.12)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Pinnacle_Spire",
    parts,
    target_tris=9400,
    voxel_size=0.0085,
    macro_disp=0.024,
    pore_depth=0.0055,
    ground_flat_z=True,
    noise_seed=Vector((2.1, 4.7, 1.3)),
)

sockets = [
    ("socket_sps_crest_21",   (-0.010, -0.035, 1.20), (0.0, 0.0, -1.0), "branching-sps", 0.024, 0.042),
    ("socket_plate_ledge_21", (-0.248, -0.020, 0.45), (0.0, 0.0, -1.0), "plating-sps",   0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.4)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular pinnacle spire with cantilevered mid-ledge terrace, porous carbonate "
    "carving, two BVH-verified coral sockets, and shared 2048x2048 four-quadrant PBR limestone trim sheet.",
)
