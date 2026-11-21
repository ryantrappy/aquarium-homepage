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

# Sweeping asymmetric diagonal NSA cave arch with flared wedge footings & clear terraced shoulder (no pinch seams)
parts = [
    # Broad tapered left wedge massif climbing diagonally into the upper arch apex
    ("ico", (-0.25,  0.02, 0.06), (0.17, 0.14, 0.115), ( 0.06,  0.22,  0.24)),
    ("ico", (-0.20,  0.02, 0.15), (0.155, 0.135, 0.145), ( 0.04,  0.42,  0.14)),
    ("ico", (-0.12,  0.01, 0.26), (0.155, 0.125, 0.125), (-0.06,  0.64, -0.18)),
    # High asymmetrical eroded arch crown peaking off-center left (-0.04, +0.02, 0.37..0.46)
    ("ico", (-0.04,  0.02, 0.36), (0.15, 0.12, 0.10), ( 0.08,  0.34,  0.22)),
    ("ico", (-0.06,  0.03, 0.44), (0.105, 0.085, 0.085), (-0.10, -0.24,  0.35)),
    # Curving right buttress span descending continuously to a grounded wedge foot
    ("ico", ( 0.10,  0.00, 0.30), (0.145, 0.12, 0.095), ( 0.04, -0.42, -0.16)),
    ("ico", ( 0.19, -0.02, 0.18), (0.145, 0.125, 0.145), (-0.06, -0.46,  0.18)),
    ("ico", ( 0.24, -0.02, 0.06), (0.16, 0.135, 0.115), ( 0.05, -0.20, -0.28)),
    # Open projected outer right shelf plateau well clear of the upper peak wall -> socket_lps_mid_22
    ("ico", ( 0.20, -0.04, 0.25), (0.125, 0.11, 0.055), ( 0.03, -0.08,  0.18)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Cave_Buttress",
    parts,
    target_tris=9600,
    voxel_size=0.0075,
    macro_disp=0.020,
    pore_depth=0.0050,
    ground_flat_z=True,
    ground_cut=0.032,
    noise_seed=Vector((8.3, 3.1, 2.7)),
)

sockets = [
    ("socket_lps_mid_22", (0.215, -0.045, 0.90), (0.0, 0.0, -1.0), "tentaculate-lps", 0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.4)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular cave-vault buttress with twin grounded piers framing an open "
    "negative-space swim tunnel, 1 BVH-verified coral socket, and shared 2048x2048 PBR trim sheet.",
)
