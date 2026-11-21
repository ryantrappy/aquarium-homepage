"""Original AQ-94 Modular NSA Reef Piece #6: High Arch Span (`reef-nsa-high-arch-span`).

Asymmetrical sweeping negative-space reef arch rising from a broad tapered left
buttress into an eroded pinnacle horn and high crest shoulder, vaulting across an
open swim-through arch to a slim grounded right pier with 2 BVH-verified sockets.
"""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-high-arch-span"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Long tilted carbonate struts (eliminates round stacked waists and gives natural diagonal stratification)
parts = [
    # Tapered flaring left massif buttress climbing smoothly into the arch shoulder
    ("ico", (-0.23,  0.01, 0.12), (0.20, 0.145, 0.17), ( 0.06,  0.28,  0.16)),
    ("ico", (-0.18,  0.01, 0.32), (0.175, 0.13, 0.21), (-0.05,  0.42, -0.12)),
    # Tall asymmetric off-center pinnacle horn on the left-rear (-0.23, +0.03, 0.54)
    ("ico", (-0.23,  0.03, 0.54), (0.105, 0.085, 0.165), ( 0.07,  0.24, -0.22)),
    # Open crest terrace shoulder well clear of left horn (x=-0.02 -> >10 cm horizontal gap)
    ("ico", (-0.02, -0.02, 0.48), (0.155, 0.115, 0.085), ( 0.02,  0.18,  0.10)),
    # Sweeping thick arch lintel descending over tall swim tunnel toward right pier
    ("ico", ( 0.12,  0.01, 0.39), (0.155, 0.115, 0.115), (-0.04, -0.58,  0.18)),
    ("ico", ( 0.22,  0.01, 0.22), (0.135, 0.115, 0.17), ( 0.05, -0.32, -0.16)),
    ("ico", ( 0.24,  0.00, 0.08), (0.155, 0.13,  0.12), (-0.05,  0.14,  0.24)),
    # Forward-projected lower right cantilevered shelf well clear of arch overhead -> socket_plate_ledge_23
    ("ico", ( 0.16, -0.105, 0.22), (0.125, 0.105, 0.056), ( 0.02, -0.06,  0.10)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_High_Arch_Span",
    parts,
    target_tris=12000,
    voxel_size=0.0088,
    macro_disp=0.026,
    pore_depth=0.0055,
    ground_flat_z=True,
    ground_cut=0.030,
    noise_seed=Vector((14.2, 6.8, 3.5)),
)

sockets = [
    ("socket_sps_crest_22",   (-0.015, -0.025, 1.15), (0.0, 0.0, -1.0), "branching-sps", 0.024, 0.042),
    ("socket_plate_ledge_23", ( 0.155, -0.120, 0.90), (0.0, 0.0, -1.0), "plating-sps",   0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.4)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular asymmetrical high-arch span with open swim vault, two "
    "BVH-verified coral sockets (branching-sps + plating-sps), and shared 2048x2048 PBR trim sheet.",
)