"""Original AQ-94 Modular NSA Reef Piece #3: Cave Vault Buttress (`reef-nsa-cave-buttress`).

Twin-pier calcium-carbonate grotto arch buttress forming a true pass-through negative-space
cave vault underneath, crowned by a jagged coralline shoulder with 1 BVH-verified coral
socket using the shared 2048x2048 PBR limestone trim sheet. Safe for Blender MCP and CLI.
"""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-cave-buttress"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Asymmetric craggy grotto cliff with layered brow overhang & open negative-space swim cave
parts = [
    # Broad stepped left cliff buttress climbing diagonally into the upper grotto brow
    ("slab", (-0.25,  0.02, 0.065), (0.185, 0.150, 0.105), ( 0.05,  0.18,  0.22)),
    ("slab", (-0.21,  0.01, 0.155), (0.175, 0.140, 0.125), ( 0.04,  0.34,  0.12)),
    ("crag", (-0.14,  0.02, 0.265), (0.170, 0.135, 0.120), (-0.05,  0.52, -0.16)),
    ("slab", (-0.24, -0.02, 0.210), (0.135, 0.115, 0.065), ( 0.03, -0.14,  0.26)),
    # Stratified asymmetrical grotto brow & jagged left-offset crag crown (-0.05, +0.02, 0.36..0.44)
    ("slab", (-0.04,  0.02, 0.355), (0.165, 0.130, 0.095), ( 0.06,  0.28,  0.18)),
    ("crag", (-0.07,  0.03, 0.430), (0.120, 0.095, 0.082), (-0.08, -0.22,  0.30)),
    # Sweeping right buttress span descending in terraced slabs to grounded right foot
    ("slab", ( 0.09,  0.00, 0.305), (0.155, 0.125, 0.092), ( 0.04, -0.38, -0.14)),
    ("crag", ( 0.18, -0.01, 0.185), (0.155, 0.130, 0.130), (-0.05, -0.42,  0.16)),
    ("slab", ( 0.24, -0.02, 0.070), (0.175, 0.140, 0.105), ( 0.04, -0.18, -0.24)),
    # Open projected outer right shelf plateau well clear of upper crag wall -> socket_lps_mid_22
    ("slab", ( 0.22, -0.055, 0.245), (0.135, 0.115, 0.055), ( 0.02, -0.06,  0.14)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Cave_Buttress",
    parts,
    target_tris=9800,
    voxel_size=0.0075,
    macro_disp=0.021,
    pore_depth=0.0055,
    ground_flat_z=True,
    ground_cut=0.032,
    noise_seed=Vector((8.3, 3.1, 2.7)),
)

sockets = [
    ("socket_lps_mid_22", (0.245, -0.065, 0.90), (0.0, 0.0, -1.0), "tentaculate-lps", 0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.4)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular cave-vault buttress with twin grounded piers framing an open "
    "negative-space swim tunnel, 1 BVH-verified coral socket, and shared 2048x2048 PBR trim sheet.",
)
