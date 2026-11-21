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

# Anchored offset root pier (-0.16, 0.01, z=0..0.24) + sweeping cantilevered limestone shelves projecting toward (+X, -Y)
parts = [
    # Anchored root footing (left-rear)
    ("ico", (-0.16,  0.02, 0.07), (0.17, 0.14, 0.09), ( 0.08,  0.12,  0.22)),
    ("ico", (-0.10, -0.03, 0.08), (0.14, 0.11, 0.09), (-0.06, -0.10, -0.35)),
    ("ico", (-0.15,  0.02, 0.18), (0.14, 0.12, 0.11), ( 0.05,  0.26,  0.15)),
    # Upper-root shoulder plateau for socket_lps_mid_21 (-0.14, 0.02, z~0.26)
    ("ico", (-0.14,  0.02, 0.25), (0.13, 0.11, 0.055), ( 0.02,  0.04, -0.10)),
    # Horizontal cantilevered main bridge beam + ragged shelf plates reaching +0.24 (over open swim space below!)
    ("ico", (-0.02,  0.00, 0.21), (0.16, 0.13, 0.058), ( 0.04, -0.08,  0.18)),
    ("ico", ( 0.13, -0.02, 0.19), (0.17, 0.14, 0.052), (-0.05,  0.06, -0.22)),
    ("ico", ( 0.24, -0.04, 0.18), (0.11, 0.10, 0.042), ( 0.08,  0.04,  0.30)),
    ("ico", ( 0.08,  0.08, 0.21), (0.11, 0.09, 0.046), (-0.06, -0.12,  0.40)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Cantilever_Shelf",
    parts,
    target_tris=9400,
    voxel_size=0.0072,
    macro_disp=0.017,
    pore_depth=0.0048,
    ground_flat_z=True,
    noise_seed=Vector((5.4, 1.9, 3.2)),
)

# Check XY shifted bounding center carefully -> shoots vertical rays over inner root terrace & outer shelf deck
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
