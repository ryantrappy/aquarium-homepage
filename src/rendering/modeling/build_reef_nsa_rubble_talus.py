"""Original AQ-94 Modular NSA Reef Piece #5: Substrate Rubble & Talus Apron (`reef-nsa-rubble-talus`).

Low-profile single watertight manifold cluster of semi-buried porous live-rock cobbles, broken
carbonate plates, and dead coral-branch rubble fused over a flat-grounded sand talus skirt using
the shared 2048x2048 PBR limestone trim sheet. Safe for Blender MCP and background CLI Blender.
"""
import sys
from pathlib import Path

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from mathutils import Vector
import reef_nsa_trim_sheet as nsa

ID = "reef-nsa-rubble-talus"

nsa.clear_scene()
mat = nsa.build_shared_trim_material()

# Single continuous low talus apron + overlapping broken reef cobbles & dead coral nubs (zero floating islands)
parts = [
    # Continuous low basal sand-contact talus skirt connecting every cobble cleanly
    ("ico", ( 0.00,  0.00, 0.024), (0.195, 0.135, 0.026), ( 0.02, -0.03,  0.14)),
    ("ico", (-0.09,  0.02, 0.026), (0.105, 0.090, 0.026), (-0.03,  0.04, -0.25)),
    ("ico", ( 0.10, -0.02, 0.025), (0.100, 0.085, 0.025), ( 0.04, -0.02,  0.32)),
    # Angular broken carbonate rock cobbles half-embedded in the talus skirt
    ("ico", (-0.11,  0.03, 0.052), (0.072, 0.058, 0.042), ( 0.18, -0.26,  0.42)),
    ("ico", (-0.02, -0.04, 0.048), (0.068, 0.052, 0.038), (-0.22,  0.15, -0.35)),
    ("ico", ( 0.08,  0.03, 0.056), (0.076, 0.060, 0.045), ( 0.14,  0.28,  0.65)),
    ("ico", ( 0.14, -0.04, 0.044), (0.055, 0.048, 0.032), (-0.16, -0.22,  0.18)),
    # Elongated fallen dead coral-branch rubble stubs & splintered shell/plate shards
    ("ico", (-0.04,  0.05, 0.058), (0.082, 0.028, 0.026), ( 0.12,  0.35,  0.72)),
    ("ico", ( 0.03,  0.00, 0.062), (0.078, 0.030, 0.028), (-0.15, -0.28, -0.58)),
    ("ico", (-0.15, -0.03, 0.042), (0.052, 0.034, 0.025), ( 0.24,  0.18,  0.90)),
    ("ico", ( 0.01, -0.08, 0.042), (0.060, 0.032, 0.024), (-0.08,  0.20,  0.25)),
]

rock = nsa.fuse_and_carve_porous_rock(
    "Reef_NSA_Rubble_Talus",
    parts,
    target_tris=6500,
    voxel_size=0.0055,
    macro_disp=0.010,
    pore_depth=0.0034,
    ground_flat_z=True,
    ground_cut=0.014,
    noise_seed=Vector((6.9, 1.4, 5.5)),
)

nsa.attach_verified_sockets(rock, ID, [])
nsa.assign_trim_sheet_uvs(rock, mat, uv_scale=3.0)

nsa.finalize_and_export_nsa_rock(
    rock,
    ID,
    "Original AQ-94 NSA modular substrate rubble and dead-coral talus apron fused over a flat-grounded "
    "skirt using the shared 2048x2048 PBR limestone trim sheet (zero floating islands).",
)
