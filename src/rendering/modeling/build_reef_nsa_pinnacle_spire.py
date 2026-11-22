"""Original AQ-94 Modular NSA Reef Piece #1: Asymmetrical Pinnacle Spire (`reef-nsa-pinnacle-spire`).

Tall eroded calcium-carbonate reef spire with undercut waist, cantilevered mid-ledge terrace,
sweeping porous pinnacle crest, and 2 BVH-verified coral mount sockets using the shared
2048x2048 PBR limestone trim sheet. Safe for both Blender MCP and background CLI Blender.
"""
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

# Continuous wide-to-tapered diagonal terraced reef crag (no snowman waist or isolated pancake wing)
parts = [
    # Broad stratified basal limestone plinth & flaring diagonal buttress roots (z=0..0.22)
    ("slab", (-0.01,  0.00, 0.075), (0.265, 0.175, 0.095), ( 0.05, -0.10,  0.16)),
    ("slab", (-0.15, -0.02, 0.115), (0.185, 0.135, 0.095), ( 0.10,  0.22, -0.28)),
    ("slab", ( 0.14,  0.03, 0.120), (0.175, 0.145, 0.110), (-0.08,  0.18,  0.42)),
    # Interlocking stepped lower-left coralline shelf & under-bracket bridging into main cliff -> socket_plate_ledge_21
    ("slab", (-0.13, -0.01, 0.175), (0.175, 0.125, 0.075), ( 0.04, -0.14,  0.18)),
    ("slab", (-0.21, -0.02, 0.225), (0.155, 0.115, 0.055), (-0.03,  0.06, -0.12)),
    ("slab", (-0.25, -0.02, 0.245), (0.115, 0.095, 0.044), ( 0.02,  0.04,  0.08)),
    # Massive slanted triangular cliff spine & diagonal dorsal ribs rising toward right-rear
    ("crag", (-0.01,  0.01, 0.255), (0.205, 0.145, 0.165), ( 0.08,  0.36,  0.14)),
    ("crag", ( 0.06,  0.02, 0.375), (0.185, 0.135, 0.175), (-0.06,  0.42, -0.16)),
    ("crag", ( 0.08,  0.02, 0.485), (0.160, 0.120, 0.165), ( 0.05,  0.32,  0.22)),
    # Upper terraced plateau shoulder (-0.01, -0.03, 0.54) -> socket_sps_crest_21 + sweeping diagonal ridge crest
    ("slab", (-0.01, -0.03, 0.535), (0.135, 0.105, 0.064), ( 0.03,  0.05,  0.20)),
    ("crag", ( 0.10,  0.03, 0.585), (0.125, 0.095, 0.135), (-0.10,  0.34,  0.14)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Pinnacle_Spire",
    parts,
    target_tris=9600,
    voxel_size=0.0085,
    macro_disp=0.024,
    pore_depth=0.0058,
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
