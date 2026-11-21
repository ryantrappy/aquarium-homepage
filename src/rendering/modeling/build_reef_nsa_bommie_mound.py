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

# Asymmetric reef bommie built from stratified carbonate plates & undercut side overhang (no stacked spheres)
parts = [
    # Broad flat-grounded base massif anchoring front-to-back (~0.52m wide)
    ("ico", (-0.01,  0.01, 0.06), (0.25, 0.16, 0.085), ( 0.05, -0.08,  0.16)),
    ("ico", (-0.12, -0.02, 0.07), (0.15, 0.13, 0.075), (-0.04,  0.14, -0.24)),
    # Back-left structural slope lifting into the asymmetric bommie ridge
    ("ico", (-0.09,  0.03, 0.15), (0.17, 0.14, 0.115), ( 0.08,  0.18, -0.22)),
    ("ico", ( 0.00,  0.02, 0.22), (0.16, 0.13, 0.095), (-0.04,  0.24,  0.30)),
    # Upper-left terraced coralline plateau shoulder -> socket_soft_mat_21
    ("ico", (-0.12, -0.01, 0.27), (0.135, 0.115, 0.062), ( 0.03, -0.06,  0.15)),
    # Asymmetric rear-right offset crag crown (keeps (-0.135, -0.025) open & clear)
    ("ico", ( 0.04,  0.05, 0.31), (0.125, 0.10, 0.082), (-0.08,  0.16, -0.20)),
    # Undercut front-right projecting apron shelf overhanging right base cove -> socket_brain_apron_21
    ("ico", ( 0.15, -0.04, 0.17), (0.145, 0.12, 0.062), (-0.06,  0.10, -0.24)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Bommie_Mound",
    parts,
    target_tris=9200,
    voxel_size=0.0072,
    macro_disp=0.019,
    pore_depth=0.0050,
    ground_flat_z=True,
    ground_cut=0.026,
    noise_seed=Vector((4.7, 9.2, 1.8)),
)

sockets = [
    ("socket_brain_apron_21", ( 0.155, -0.045, 0.85), (0.0, 0.0, -1.0), "mounded-lps",  0.025, 0.044),
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
