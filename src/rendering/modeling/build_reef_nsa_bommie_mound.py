"""Original AQ-94 Modular NSA Reef Piece #4: Secondary Reef Bommie Mound (`reef-nsa-bommie-mound`).

Asymmetrical carbonate bommie outcrop with an undercut side cove, terraced coralline shoulder,
front-right sloped apron terrace, and 2 BVH-verified coral sockets using the shared 2048x2048 PBR
limestone trim sheet. Safe for Blender MCP and background CLI Blender.
"""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-bommie-mound"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Wide multi-terraced fractured reef outcrop bommie with undercut flank pocket (no mushroom/snowman waist)
parts = [
    # Broad flat-grounded base massif anchoring front-to-back (~0.56m wide)
    ("slab", (-0.01,  0.01, 0.060), (0.265, 0.170, 0.085), ( 0.04, -0.08,  0.14)),
    ("slab", (-0.13, -0.02, 0.075), (0.175, 0.145, 0.080), (-0.04,  0.14, -0.22)),
    ("slab", ( 0.11,  0.02, 0.075), (0.165, 0.140, 0.080), ( 0.05, -0.12,  0.26)),
    # Interlocking mid-tier carbonate strata plates climbing toward rear-left & center
    ("slab", (-0.09,  0.03, 0.145), (0.195, 0.150, 0.105), ( 0.06,  0.16, -0.20)),
    ("crag", ( 0.01,  0.02, 0.215), (0.180, 0.140, 0.095), (-0.04,  0.20,  0.26)),
    # Upper-left terraced coralline plateau shoulder -> socket_soft_mat_21
    ("slab", (-0.12, -0.01, 0.268), (0.145, 0.120, 0.060), ( 0.02, -0.05,  0.14)),
    # Asymmetric rear-right offset crag crown (keeps (-0.135, -0.020) open & clear)
    ("crag", ( 0.05,  0.05, 0.305), (0.135, 0.105, 0.080), (-0.08,  0.15, -0.18)),
    # Undercut front-right projecting apron shelf overhanging right base cove -> socket_brain_apron_21
    ("slab", ( 0.175, -0.055, 0.168), (0.155, 0.125, 0.060), (-0.05,  0.08, -0.22)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Bommie_Mound",
    parts,
    target_tris=9400,
    voxel_size=0.0072,
    macro_disp=0.020,
    pore_depth=0.0055,
    ground_flat_z=True,
    ground_cut=0.026,
    noise_seed=Vector((4.7, 9.2, 1.8)),
)

sockets = [
    ("socket_brain_apron_21", ( 0.195, -0.065, 0.85), (0.0, 0.0, -1.0), "mounded-lps",  0.025, 0.044),
    ("socket_soft_mat_21",    (-0.135, -0.020, 0.85), (0.0, 0.0, -1.0), "zoanthid-mat", 0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.3)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular carbonate reef bommie mound with undercut flank shelf, two "
    "BVH-verified coral sockets (mounded-lps + zoanthid-mat), and shared 2048x2048 PBR trim sheet.",
)
