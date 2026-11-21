"""Original AQ-94 Modular NSA Reef Piece #7: Encrusting Reef Ledge (`reef-nsa-encrusting-ledge`).

Low stratified calcium-carbonate table rock with fused bedrock core, cantilevered
encrusting shelf terraces, rear craggy slope, and 2 BVH-verified coral sockets
sharing the 2048x2048 PBR limestone trim sheet.
"""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-encrusting-ledge"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Single continuous reef outcrop core with projecting cantilevered shelf plates (no detached bun seams)
parts = [
    # Broad central grounded carbonate spine fusing lower base and mid-ledge height smoothly
    ("ico", ( 0.00,  0.03, 0.08), (0.27, 0.145, 0.10), ( 0.04, -0.06,  0.12)),
    ("ico", (-0.11,  0.02, 0.09), (0.19, 0.135, 0.095), (-0.05,  0.12, -0.20)),
    ("ico", ( 0.12,  0.02, 0.10), (0.19, 0.135, 0.10), ( 0.06, -0.10,  0.18)),
    # Front-left projecting flat table shelf -> socket_brain_apron_22
    ("ico", (-0.18, -0.045, 0.14), (0.165, 0.12, 0.055), ( 0.02,  0.04,  0.10)),
    # Stepped right plateau shelf well clear of rear ridge -> socket_soft_mat_22
    ("ico", ( 0.175, -0.025, 0.18), (0.155, 0.12, 0.060), (-0.02, -0.04, -0.12)),
    # Rear offset carbonate crag spine rising cleanly behind (y=+0.09) without encroaching on front pads
    ("ico", (-0.01,  0.095, 0.175), (0.17, 0.09, 0.085), ( 0.06,  0.14, -0.15)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Encrusting_Ledge",
    parts,
    target_tris=9200,
    voxel_size=0.0075,
    macro_disp=0.019,
    pore_depth=0.0052,
    ground_flat_z=True,
    ground_cut=0.028,
    noise_seed=Vector((19.7, 2.4, 9.1)),
)

sockets = [
    ("socket_brain_apron_22", (-0.185, -0.055, 0.80), (0.0, 0.0, -1.0), "mounded-lps",  0.024, 0.042),
    ("socket_soft_mat_22",    ( 0.180, -0.035, 0.80), (0.0, 0.0, -1.0), "zoanthid-mat", 0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.3)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular stratified encrusting reef ledge with undercut front overhang, "
    "two BVH-verified coral sockets (mounded-lps + zoanthid-mat), and shared 2048x2048 PBR trim sheet.",
)