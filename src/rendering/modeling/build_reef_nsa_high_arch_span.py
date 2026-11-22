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

# Stratified natural weathered sea-arch with interlocking cliff terraces (eliminates stacked round balls)
parts = [
    # Broad terraced left cliff buttress climbing diagonally into the arch shoulder
    ("slab", (-0.24,  0.01, 0.09), (0.225, 0.160, 0.130), ( 0.05,  0.22,  0.14)),
    ("crag", (-0.20, -0.01, 0.22), (0.205, 0.145, 0.165), (-0.04,  0.34, -0.18)),
    ("crag", (-0.18,  0.02, 0.36), (0.190, 0.135, 0.175), ( 0.06,  0.40,  0.12)),
    ("slab", (-0.25, -0.02, 0.28), (0.150, 0.120, 0.075), ( 0.03, -0.16,  0.24)),
    # Jagged off-center pinnacle horn fused seamlessly into the left cliff ridge (-0.21, +0.03, 0.49)
    ("crag", (-0.21,  0.03, 0.49), (0.135, 0.105, 0.155), ( 0.07,  0.26, -0.20)),
    # Open crest terrace shoulder well clear of left horn (x=-0.02) -> socket_sps_crest_22
    ("slab", (-0.02, -0.02, 0.475), (0.165, 0.120, 0.082), ( 0.02,  0.14,  0.10)),
    # Sweeping stratified arch lintel descending over tall swim tunnel toward right pier
    ("slab", ( 0.11,  0.02, 0.40), (0.165, 0.115, 0.105), (-0.04, -0.52,  0.16)),
    ("crag", ( 0.20,  0.02, 0.27), (0.155, 0.120, 0.150), ( 0.05, -0.38, -0.14)),
    ("slab", ( 0.24,  0.00, 0.14), (0.160, 0.125, 0.125), (-0.04, -0.22,  0.18)),
    ("slab", ( 0.25,  0.00, 0.07), (0.175, 0.135, 0.095), ( 0.04,  0.12,  0.22)),
    # Forward-projected lower right cantilevered shelf well clear of arch overhead -> socket_plate_ledge_23
    ("slab", ( 0.17, -0.115, 0.215), (0.135, 0.110, 0.054), ( 0.02, -0.05,  0.10)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_High_Arch_Span",
    parts,
    target_tris=12000,
    voxel_size=0.0088,
    macro_disp=0.025,
    pore_depth=0.0058,
    ground_flat_z=True,
    ground_cut=0.030,
    noise_seed=Vector((14.2, 6.8, 3.5)),
)

sockets = [
    ("socket_sps_crest_22",   (-0.015, -0.025, 1.15), (0.0, 0.0, -1.0), "branching-sps", 0.024, 0.042),
    ("socket_plate_ledge_23", ( 0.165, -0.130, 0.90), (0.0, 0.0, -1.0), "plating-sps",   0.024, 0.042),
]
nsa.attach_verified_sockets(rock, ID, sockets)
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=2.4)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular asymmetrical high-arch span with open swim vault, two "
    "BVH-verified coral sockets (branching-sps + plating-sps), and shared 2048x2048 PBR trim sheet.",
)
