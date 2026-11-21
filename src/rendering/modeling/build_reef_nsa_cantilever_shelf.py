"""Original AQ-94 Modular NSA Reef Piece #2: Cantilevered Overhang Shelf (`reef-nsa-cantilever-shelf`).

Asymmetrical cantilevered carbonate plateau cantilevered off an anchored offset root pier,
forming a deep open negative-space swim overhang underneath with 2 BVH-verified coral sockets
using the shared 2048x2048 PBR limestone trim sheet. Safe for Blender MCP and CLI Blender.
"""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-cantilever-shelf"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Craggy anchored root column supporting jagged multi-tier cantilevered table-rock plates
parts = [
    # Anchored stratified root massif (left-rear)
    ("slab", (-0.16,  0.02, 0.065), (0.185, 0.150, 0.085), ( 0.06,  0.10,  0.20)),
    ("slab", (-0.10, -0.03, 0.080), (0.155, 0.125, 0.085), (-0.05, -0.12, -0.32)),
    ("crag", (-0.16,  0.02, 0.165), (0.165, 0.135, 0.105), ( 0.04,  0.22,  0.14)),
    ("slab", (-0.08,  0.01, 0.155), (0.155, 0.125, 0.075), (-0.03, -0.18,  0.24)),
    # Upper-root shoulder plateau for socket_lps_mid_21 (-0.145, 0.015, z~0.26)
    ("slab", (-0.14,  0.02, 0.248), (0.140, 0.118, 0.056), ( 0.02,  0.04, -0.10)),
    # Stepped multi-tier cantilevered limestone shelves projecting boldly toward (+X, -Y) over open water
    ("slab", (-0.01,  0.00, 0.210), (0.175, 0.140, 0.058), ( 0.03, -0.08,  0.16)),
    ("slab", ( 0.13, -0.02, 0.192), (0.180, 0.145, 0.052), (-0.04,  0.05, -0.20)),
    ("slab", ( 0.24, -0.04, 0.178), (0.125, 0.105, 0.042), ( 0.06,  0.04,  0.28)),
    ("slab", ( 0.08,  0.08, 0.208), (0.125, 0.098, 0.046), (-0.05, -0.10,  0.38)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Cantilever_Shelf",
    parts,
    target_tris=9600,
    voxel_size=0.0072,
    macro_disp=0.018,
    pore_depth=0.0052,
    ground_flat_z=True,
    noise_seed=Vector((5.4, 1.9, 3.2)),
)

sockets = [
    ("socket_lps_mid_21",    (-0.145,  0.015, 0.65), (0.0, 0.0, -1.0), "tentaculate-lps", 0.024, 0.042),
    ("socket_plate_ledge_22", ( 0.125, -0.025, 0.65), (0.0, 0.0, -1.0), "plating-sps",     0.025, 0.045),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.4)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular cantilevered plateau shelf with deep undercut swim overhang, "
    "two BVH-verified coral sockets, and shared 2048x2048 PBR limestone trim sheet.",
)
