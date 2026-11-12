"""Build bare aragonite live-rock island foundations with verified coral mount sockets in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md, docs/asset-contract.md, AQ-14.3, AQ-51, AQ-52, AQ-58, and AQ-59:
- Generates two separate, watertight bare live-rock islands in canonical meters at identity [1, 1, 1] scale:
  1. `live-rock-island-left.glb`: Asymmetric multi-boulder reef bommie with a real pass-through
     cave arch running from front `+Z` to back `-Z` in glTF (`> 0.065 m` clearance at `(0, 0.08)`),
     deep inter-boulder fissures, craggy aragonite pitting, staggered boulder elevations, and 12 coral sockets.
  2. `live-rock-island-right.glb`: Asymmetric multi-boulder carbonate reef formation with deep clefts,
     varied boulder elevations, grounded base at `y = -0.012 m`, and 11 coral mounting sockets.
- Bakes 3D world-space `(x, y, z)` + 3D surface-normal `(nx, ny, nz)` + cavity curvature directly into
  the UV texture atlas so steep vertical rock faces have zero vertical UV stretching or wavy streaks.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_live_rock_islands.py -- /tmp/coral-models left
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_live_rock_islands.py -- /tmp/coral-models right
"""
import hashlib
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Euler, Vector


SOCKET_ARCHETYPES = {
    'sps_crest':       {'archetype': 'branching-sps',   'footprint': 0.035, 'clearance': 0.085},
    'plate_ledge':     {'archetype': 'plating-sps',     'footprint': 0.032, 'clearance': 0.080},
    'lps_mid':         {'archetype': 'tentaculate-lps', 'footprint': 0.030, 'clearance': 0.075},
    'brain_apron':     {'archetype': 'mounded-lps',     'footprint': 0.045, 'clearance': 0.075},
    'anemone_crevice': {'archetype': 'host-anemone',    'footprint': 0.038, 'clearance': 0.085},
    'soft_mat':        {'archetype': 'zoanthid-mat',    'footprint': 0.040, 'clearance': 0.070},
}

# Staggered, asymmetric boulder apex elevations eliminate flat horizontal sheet tiers (AQ-59)
LEFT_SOCKET_SPECS = [
    # Upper irregular boulder knuckles (varied heights 0.342 m .. 0.386 m)
    ('socket_sps_crest_01',       (-0.155,  0.145, 0.386)),
    ('socket_sps_crest_02',       ( 0.015,  0.165, 0.348)),
    ('socket_sps_crest_03',       ( 0.165,  0.140, 0.372)),
    # Mid-slope distinct boulder outcrops separated by deep clefts (0.192 m .. 0.274 m)
    ('socket_plate_ledge_01',     (-0.345,  0.095, 0.268)),
    ('socket_lps_mid_01',         (-0.245, -0.015, 0.216)),
    ('socket_lps_mid_03',         (-0.095, -0.020, 0.236)),
    ('socket_anemone_crevice_01', ( 0.035, -0.015, 0.236)),
    ('socket_lps_mid_02',         ( 0.245, -0.010, 0.256)),
    ('socket_plate_ledge_02',     ( 0.345,  0.095, 0.204)),
    # Lower apron boulders flanking the pass-through cave (0.088 m .. 0.132 m)
    ('socket_brain_apron_01',     (-0.315, -0.155, 0.118)),
    ('socket_soft_mat_01',        (-0.180, -0.168, 0.118)),
    ('socket_brain_apron_02',     ( 0.275, -0.155, 0.096)),
]

RIGHT_SOCKET_SPECS = [
    # Upper asymmetric carbonate spires (0.288 m .. 0.338 m), with socket_sps_crest_06 at the golden-section focal point
    ('socket_sps_crest_06',       (-0.150,  0.145, 0.336)),
    ('socket_sps_crest_04',       ( 0.010,  0.160, 0.294)),
    ('socket_sps_crest_05',       ( 0.155,  0.140, 0.318)),
    # Mid staggered boulder ledges & arch bridge (0.168 m .. 0.232 m)
    ('socket_plate_ledge_03',     (-0.325,  0.090, 0.226)),
    ('socket_lps_mid_04',         (-0.215, -0.015, 0.184)),
    ('socket_lps_mid_06',         ( 0.005, -0.020, 0.212)),
    ('socket_lps_mid_05',         ( 0.220, -0.010, 0.174)),
    ('socket_plate_ledge_04',     ( 0.325,  0.085, 0.206)),
    # Lower apron outcrops flanking the right-island arch/swim-through (0.082 m .. 0.118 m)
    ('socket_brain_apron_03',     (-0.265, -0.155, 0.114)),
    ('socket_soft_mat_02',        ( 0.005, -0.168, 0.084)),
    ('socket_brain_apron_04',     ( 0.265, -0.155, 0.102)),
]


def parse_args():
    argv = sys.argv
    out_dir = '/tmp/coral-models'
    island = 'left'
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if len(args) >= 1:
            out_dir = os.path.abspath(args[0])
        if len(args) >= 2:
            island = args[1]
    return out_dir, island


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / max(1e-6, edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def smax(a, b, k=0.025):
    h = max(k - abs(a - b), 0.0) / max(1e-6, k)
    return max(a, b) + h * h * k * 0.25


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c0, c1, t):
    return tuple(lerp(c0[i], c1[i], t) for i in range(len(c0)))


def socket_prefix(name):
    parts = name.split('_')
    return '_'.join(parts[1:-1])


def hash3i(ix, iy, iz, seed=0):
    n = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = (n ^ (n >> 16)) & 0xFFFFFFFF
    return n / 4294967295.0


def value_noise_3d(x, y, z, seed=0):
    ix = math.floor(x)
    iy = math.floor(y)
    iz = math.floor(z)
    fx = x - ix
    fy = y - iy
    fz = z - iz
    ux = fx * fx * (3.0 - 2.0 * fx)
    uy = fy * fy * (3.0 - 2.0 * fy)
    uz = fz * fz * (3.0 - 2.0 * fz)

    c000 = hash3i(ix, iy, iz, seed)
    c100 = hash3i(ix + 1, iy, iz, seed)
    c010 = hash3i(ix, iy + 1, iz, seed)
    c110 = hash3i(ix + 1, iy + 1, iz, seed)
    c001 = hash3i(ix, iy, iz + 1, seed)
    c101 = hash3i(ix + 1, iy, iz + 1, seed)
    c011 = hash3i(ix, iy + 1, iz + 1, seed)
    c111 = hash3i(ix + 1, iy + 1, iz + 1, seed)

    x00 = lerp(c000, c100, ux)
    x10 = lerp(c010, c110, ux)
    x01 = lerp(c001, c101, ux)
    x11 = lerp(c011, c111, ux)
    y0 = lerp(x00, x10, uy)
    y1 = lerp(x01, x11, uy)
    return lerp(y0, y1, uz)


def fbm_3d(x, y, z, octaves=4, seed=0):
    val = 0.0
    amp = 0.5
    norm = 0.0
    freq = 1.0
    for i in range(octaves):
        val += amp * value_noise_3d(x * freq, y * freq, z * freq, seed + i * 37)
        norm += amp
        amp *= 0.5
        freq *= 2.07
    return val / norm


def ridged_3d(x, y, z, octaves=3, seed=0):
    val = 0.0
    amp = 0.5
    norm = 0.0
    freq = 1.0
    weight = 1.0
    for i in range(octaves):
        n = 1.0 - 2.0 * abs(value_noise_3d(x * freq, y * freq, z * freq, seed + i * 53) - 0.5)
        n = n * n * weight
        weight = max(0.2, min(1.0, n * 1.4))
        val += amp * n
        norm += amp
        amp *= 0.5
        freq *= 2.15
    return val / norm


def voronoi_pores_3d(x, y, z, scale=28.0, seed=0):
    """3D cellular Voronoi F1 and F2-F1 for authentic aragonite pores and rock fissures."""
    px, py, pz = x * scale, y * scale, z * scale
    ix, iy, iz = math.floor(px), math.floor(py), math.floor(pz)
    d1 = 1e9
    d2 = 1e9
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cx = ix + dx + hash3i(ix + dx, iy + dy, iz + dz, seed)
                cy = iy + dy + hash3i(ix + dx, iy + dy, iz + dz, seed + 17)
                cz = iz + dz + hash3i(ix + dx, iy + dy, iz + dz, seed + 43)
                dist_sq = (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2
                if dist_sq < d1:
                    d2 = d1
                    d1 = dist_sq
                elif dist_sq < d2:
                    d2 = dist_sq
    f1 = math.sqrt(d1)
    f2 = math.sqrt(d2)
    return f1, f2 - f1


# 7-piece modular Negative Space Aquascape (NSA) rock library (AQ-94 AC #1 & #2, AQ-101 AC #1)
# Following the "Left Peak (Height + Focus) -> Center Arch (Depth + Flow) -> Right Island (Balance)"
# layout from more_realistic_reef_guide.png.
NSA_MODULAR_ROCK_LIBRARY = (
    {
        'id': 'nsa_piece_01_left_pinnacle_spire',
        'island': 'left',
        'role': 'Left Peak vertical spire (Height + Focus)',
        'center': (-0.145, 0.155, 0.495),
        'radii': (0.24, 0.20),
    },
    {
        'id': 'nsa_piece_02_montipora_cantilever_shelf',
        'island': 'left',
        'role': 'Stepped horizontal plateau ledge for plating Montipora & Euphyllia',
        'center': (-0.285, 0.055, 0.272),
        'radii': (0.20, 0.16),
    },
    {
        'id': 'nsa_piece_03_cave_arch_buttress',
        'island': 'left',
        'role': 'Overhung central cave brow & right-sloping arch buttress',
        'center': (0.045, 0.065, 0.368),
        'radii': (0.28, 0.20),
    },
    {
        'id': 'nsa_piece_04_apron_talus_boulder',
        'island': 'left',
        'role': 'Foreground terraced apron for Acanthastrea, Torch & Hammer LPS',
        'center': (0.215, -0.065, 0.225),
        'radii': (0.22, 0.18),
    },
    {
        'id': 'nsa_piece_05_center_arch_span',
        'island': 'right',
        'role': 'Center-right porous carbonate arch bridge (Depth + Flow)',
        'center': (-0.045, 0.045, 0.232),
        'radii': (0.26, 0.16),
    },
    {
        'id': 'nsa_piece_06_right_balance_bommie',
        'island': 'right',
        'role': 'Right Island secondary balance bommie (~35% lower than Left Peak)',
        'center': (0.185, 0.115, 0.322),
        'radii': (0.22, 0.18),
    },
    {
        'id': 'nsa_piece_07_rubble_skirt_nodules',
        'island': 'both',
        'role': 'Substrate-grounding carbonate rubble, shell ridges & dune talus skirt',
        'center': (0.0, -0.185, 0.068),
        'radii': (0.44, 0.10),
    },
)


def evaluate_raw_rock_surfaces(x, y, island_kind, socket_specs):
    """
    Evaluate raw (z_top, z_bot) in Blender meters (Z-up) from the 7-piece modular
    Negative Space Aquascape (NSA) library (AQ-94 & AQ-101, matching more_realistic_reef_guide.png):
    - Left Island ("Left Peak: Height + Focus" transitioning toward the Center Arch):
      1. High Left Peak spire at rear-left (peaking at ~0.50 m) for branching Acropora.
      2. Distinct cantilevered plateau shelves at z ~ 0.26 m..0.28 m for plating Montipora
         with recessed undercut overhangs casting deep contact shadows.
      3. Terraced lower-left and center-front shelves for Euphyllia Torch/Hammer and Acanthastrea.
      4. Pass-through cave at (0, 0.08) with z_bot = 0.152 m (AQ-58 capsule clearance).
      5. Modeled perimeter rubble nodules and shell talus grounding the rock into the sand bed.
    - Right Island ("Center Arch: Depth + Flow" + "Right Island: Balance"):
      1. Wide, open swim-through archway (arch center at x = -0.02, z_bot rising to 0.182 m)
         framing the dark water column and sandy swim lane.
      2. Porous coral-encrusted arch bridge (z_top ~ 0.225 m..0.245 m) topped with Zoanthids.
      3. Balanced secondary right bommie (peaking at ~0.32 m, ~36% lower than the Left Peak)
         with foreground apron shelves for Goniopora and Tridacna/folded mantle colonies.
    """
    seed = 11 if island_kind == 'left' else 73
    crag_macro = ridged_3d(x * 5.2, y * 5.6, 0.35, octaves=3, seed=seed) - 0.48
    crag_med = ridged_3d(x * 12.5, y * 13.0, 0.85, octaves=3, seed=seed + 19) - 0.50
    pore_f1, fissure_edge = voronoi_pores_3d(x, y, 0.25, scale=10.5, seed=seed + 41)
    fissure_carve = -0.048 * (1.0 - smoothstep(0.0, 0.18, fissure_edge))
    pit_carve = -0.016 * (1.0 - smoothstep(0.08, 0.34, pore_f1))

    # Piece 7: Perimeter substrate rubble nodules & dune talus skirt (AQ-94 AC #5)
    r_perim = math.hypot(x / 0.42, y / 0.24)
    rubble_wave = ridged_3d(x * 18.5, y * 19.5, 0.15, octaves=2, seed=seed + 61)
    rubble_nodules = 0.042 * smoothstep(0.62, 0.96, r_perim) * (1.0 - smoothstep(0.96, 1.12, r_perim)) * rubble_wave

    if island_kind == 'left':
        # Base slope rising toward the Left Peak and stepping down toward the central canyon
        base_slope = 0.11 * smoothstep(-0.24, 0.22, y) - 0.08 * smoothstep(-0.18, 0.38, x)
        z_top = 0.036 + base_slope + rubble_nodules + 0.030 * crag_macro + 0.014 * crag_med

        # Piece 1: Left Peak vertical spire (Height + Focus at x = -0.145, y = 0.155)
        dist_p1 = math.hypot((x + 0.145) / 0.24, (y - 0.155) / 0.20)
        z_p1 = (0.505 + 0.052 * crag_macro) * (1.0 - smoothstep(0.0, 1.0, dist_p1))
        z_top = smax(z_top, z_p1, k=0.028)

        # Piece 2: Stepped horizontal Montipora plateau shelf (flat-topped step at z ~ 0.272 m)
        dist_p2 = math.hypot((x + 0.285) / 0.20, (y - 0.055) / 0.16)
        shelf_plateau = 1.0 - smoothstep(0.0, 1.0, dist_p2)
        # Quantize top of shelf into a natural step-like terrace for plating Montipora
        z_p2 = (0.276 + 0.014 * crag_med) * smoothstep(0.0, 0.45, shelf_plateau)
        z_top = smax(z_top, z_p2, k=0.018)

        # Piece 3: Central cave arch buttress & solid reef brow
        dist_p3 = math.hypot((x - 0.025) / 0.29, (y - 0.075) / 0.20)
        z_p3 = (0.378 + 0.042 * crag_macro + 0.022 * crag_med + fissure_carve) * (1.0 - smoothstep(0.0, 1.0, dist_p3))
        z_top = smax(z_top, z_p3, k=0.030)

        # Piece 4: Terraced right-valley & foreground LPS apron boulders
        dist_p4 = math.hypot((x - 0.215) / 0.22, (y + 0.045) / 0.18)
        z_p4 = (0.248 + 0.032 * crag_med + pit_carve) * (1.0 - smoothstep(0.0, 1.0, dist_p4))
        z_top = smax(z_top, z_p4, k=0.022)

        # Local socket pads (tight footprint so they blend into the plateau shelves without cylindrical towers)
        for idx, (s_name, (sx, sy, sz)) in enumerate(socket_specs):
            meta = SOCKET_ARCHETYPES[socket_prefix(s_name)]
            r_pad = meta['footprint'] + 0.004
            d = math.hypot(x - sx, y - sy)
            if d < r_pad + 0.048:
                w = 1.0 - smoothstep(r_pad, r_pad + 0.048, d)
                z_top = smax(z_top, sz * w, k=0.012)

        max_crest = 0.515
        z_top = max(0.024, min(max_crest, z_top))

        # Pass-through cave tunnel at (0, 0.08) + cantilevered shelf underhangs for deep contact shadows
        arch_half_w = 0.095 + 0.007 * math.sin(y * 11.0 + 0.4)
        ax = abs(x)
        if ax < arch_half_w:
            u_arch = ax / arch_half_w
            arch_profile = math.cos(u_arch * math.pi * 0.5) ** 1.6
            z_bot = -0.012 + (0.152 * arch_profile)
            z_top = max(z_top, 0.33)
            z_top = min(max_crest, z_top)
            z_bot = min(z_bot, z_top - 0.040)
        else:
            # Subtle undercut recess beneath the outer Montipora plateau shelf to cast contact shadow
            shelf_underhang = math.exp(-((x + 0.28) / 0.11) ** 2 - ((y + 0.06) / 0.08) ** 2)
            z_bot = -0.012 + 0.038 * shelf_underhang

    else:
        # RIGHT ISLAND: Piece 5 (Center-Right Arch Span) + Piece 6 (Right Balance Bommie)
        z_top = 0.024 + rubble_nodules + 0.018 * crag_macro + 0.008 * crag_med

        # Left arch abutment column (at the golden-section transition from the central canyon)
        pillar_d = math.hypot((x + 0.165) / 0.16, (y - 0.125) / 0.16)
        z_pillar = (0.312 + 0.032 * crag_macro) * (1.0 - smoothstep(0.0, 1.0, pillar_d))
        z_top = smax(z_top, z_pillar, k=0.020)

        # Piece 5: Sweeping porous carbonate arch bridge across the center-left of the island
        bridge_d = math.hypot((x + 0.015) / 0.25, (y - 0.035) / 0.16)
        z_bridge = (0.232 + 0.026 * crag_med + fissure_carve * 0.5) * (1.0 - smoothstep(0.0, 1.0, bridge_d))
        z_top = smax(z_top, z_bridge, k=0.018)

        # Piece 6: Right Balance Bommie (rising on the right side to ~0.32 m, ~36% lower than Left Peak)
        right_peak_d = math.hypot((x - 0.175) / 0.22, (y - 0.115) / 0.18)
        z_right_peak = (0.322 + 0.034 * crag_macro) * (1.0 - smoothstep(0.0, 1.0, right_peak_d))
        z_top = smax(z_top, z_right_peak, k=0.020)

        # Low foreground apron for Goniopora and Tridacna clam/mantle
        apron_d = math.hypot((x - 0.245) / 0.20, (y + 0.065) / 0.16)
        z_apron = (0.168 + 0.020 * crag_med) * (1.0 - smoothstep(0.0, 1.0, apron_d))
        z_top = smax(z_top, z_apron, k=0.016)

        for idx, (s_name, (sx, sy, sz)) in enumerate(socket_specs):
            meta = SOCKET_ARCHETYPES[socket_prefix(s_name)]
            r_pad = meta['footprint'] + 0.004
            d = math.hypot(x - sx, y - sy)
            if d < r_pad + 0.042:
                w = 1.0 - smoothstep(r_pad, r_pad + 0.042, d)
                z_top = smax(z_top, sz * w, k=0.012)

        max_crest = 0.340
        z_top = max(0.024, min(max_crest, z_top))

        # Grand open Center-Right Arch / swim-through window (framing the dark water void & sand channel)
        arch_cx = -0.015
        arch_half_w = 0.124 + 0.009 * math.cos(y * 8.0)
        ax = abs(x - arch_cx)
        if ax < arch_half_w:
            u_arch = ax / arch_half_w
            arch_prof = math.cos(u_arch * math.pi * 0.5) ** 1.06
            z_bot = -0.012 + (0.184 * arch_prof)
            z_top = max(z_top, z_bot + 0.048)
            z_top = min(max_crest, z_top)
            z_bot = min(z_bot, z_top - 0.038)
        else:
            z_bot = -0.012

    return z_top, z_bot

def build_live_rock_textures_from_surface(size, x_grid, y_grid, z_top_grid, normals_top, island_kind):
    """
    Bake 3D world-space (x, y, z) + true 3D surface normal N + local slope/cavity AO directly into
    the UV texture atlas. Because every texel (u, v) samples the exact 3D coordinate of the mesh
    at that UV, steep vertical walls have ZERO UV stretching or wavy horizontal/vertical banding!
    """
    nx = len(x_grid)
    ny = len(x_grid[0])
    seed = 101 if island_kind == 'left' else 211

    def sample_mesh_at_uv(u, v):
        # UV for top surface is mapped in [0.04, 0.96] -> grid [0, nx-1] x [0, ny-1]
        gu = max(0.0, min(1.0, (u - 0.04) / 0.92)) * (nx - 1)
        gv = max(0.0, min(1.0, (v - 0.04) / 0.92)) * (ny - 1)
        i0 = min(nx - 2, max(0, int(gu)))
        j0 = min(ny - 2, max(0, int(gv)))
        fu = gu - i0
        fv = gv - j0

        def bilerp(grid):
            v00 = grid[i0][j0]
            v10 = grid[i0 + 1][j0]
            v01 = grid[i0][j0 + 1]
            v11 = grid[i0 + 1][j0 + 1]
            return lerp(lerp(v00, v10, fu), lerp(v01, v11, fu), fv)

        px = bilerp(x_grid)
        py = bilerp(y_grid)
        pz = bilerp(z_top_grid)

        n00 = normals_top[i0][j0]
        n10 = normals_top[i0 + 1][j0]
        n01 = normals_top[i0][j0 + 1]
        n11 = normals_top[i0 + 1][j0 + 1]
        nx_v = lerp(lerp(n00[0], n10[0], fu), lerp(n01[0], n11[0], fu), fv)
        ny_v = lerp(lerp(n00[1], n10[1], fu), lerp(n01[1], n11[1], fu), fv)
        nz_v = lerp(lerp(n00[2], n10[2], fu), lerp(n01[2], n11[2], fu), fv)
        n_len = math.hypot(nx_v, ny_v, nz_v) or 1.0
        return px, py, pz, nx_v / n_len, ny_v / n_len, nz_v / n_len

    # Pre-evaluate 3D rock fields on the 2D texture grid so base, normal, and ORM share one fast pass
    height_buf = [[0.0] * size for _ in range(size)]
    base_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)
    norm_pixels = [0.0] * (size * size * 4)

    # Authentic cured Marco/Fiji aragonite & crustose coralline algae palette
    c_pore_deep    = (0.145, 0.128, 0.105)  # Deep shadow inside aragonite vugs/pores
    c_carb_shaded  = (0.365, 0.335, 0.285)  # Shaded porous carbonate rock
    c_carb_sunlit  = (0.615, 0.575, 0.495)  # Sunlit bleached aragonite crest
    c_olive_film   = (0.310, 0.335, 0.215)  # Subtle benthic micro-algae patina on lower rock
    c_cor_deep     = (0.295, 0.095, 0.245)  # Deep burgundy-plum coralline crust (Lithothamnion)
    c_cor_magenta  = (0.515, 0.175, 0.405)  # Vibrant encrusting reef coralline (Porolithon)
    c_cor_lavender = (0.685, 0.345, 0.565)  # Pink-lavender coralline plate center
    c_cor_margin   = (0.865, 0.675, 0.795)  # Calcifying pale pink-white coralline plaque rim

    for y_i in range(size):
        v = y_i / max(1, size - 1)
        row_off = y_i * size * 4
        for x_i in range(size):
            u = x_i / max(1, size - 1)
            px, py, pz, n_x, n_y, n_z = sample_mesh_at_uv(u, v)

            # Evaluate 100% in isotropic 3D meter space (px, py, pz) -> zero UV stretching on cliffs!
            w1 = value_noise_3d(px * 6.5, py * 6.5, pz * 6.5, seed=seed) - 0.5
            w2 = value_noise_3d(px * 6.5 + 3.1, py * 6.5 - 2.7, pz * 6.5 + 1.9, seed=seed + 7) - 0.5
            wx = px + 0.022 * w1
            wy = py + 0.022 * w2
            wz = pz + 0.022 * (w1 - w2)

            macro_crag = ridged_3d(wx * 7.5, wy * 7.5, wz * 7.5, octaves=2, seed=seed + 13)
            med_grain = fbm_3d(wx * 22.0, wy * 22.0, wz * 22.0, octaves=2, seed=seed + 29)
            fine_grain = value_noise_3d(px * 78.0, py * 78.0, pz * 78.0, seed=seed + 53)

            # Fast 3D isotropic aragonite vugs, skeletal coral pits, and rock fissures in meter space
            vug_n1 = value_noise_3d(wx * 32.0, wy * 32.0, wz * 32.0, seed=seed + 71)
            vug_n2 = value_noise_3d(wx * 64.0 + 1.7, wy * 64.0 - 2.3, wz * 64.0 + 0.9, seed=seed + 83)
            pore_n = value_noise_3d(px * 115.0, py * 115.0, pz * 115.0, seed=seed + 97)

            vug_pit = smoothstep(0.22, 0.58, vug_n1 * 0.65 + vug_n2 * 0.35)
            micro_pit = smoothstep(0.20, 0.62, pore_n)
            fissure_line = smoothstep(0.03, 0.22, abs(vug_n1 - 0.5))
            cavity = vug_pit * (0.55 + 0.45 * micro_pit) * (0.62 + 0.38 * fissure_line)

            # Base carbonate rock color with vug cavities and sunlit ridges
            carb_col = lerp_color(c_pore_deep, c_carb_shaded, smoothstep(0.08, 0.52, cavity))
            carb_col = lerp_color(carb_col, c_carb_sunlit, smoothstep(0.42, 0.86, macro_crag * 0.6 + med_grain * 0.4) * cavity)
            # Subtle olive reef film on lower/flatter surfaces
            olive_mask = (1.0 - smoothstep(0.06, 0.24, pz)) * smoothstep(0.2, 0.8, med_grain) * 0.35
            carb_col = lerp_color(carb_col, c_olive_film, olive_mask)

            # Encrusting coralline algae plaques: driven by 3D upward normal N.z, elevation pz, and 3D cellular patches
            cor_cell = value_noise_3d(wx * 14.0, wy * 14.0, wz * 14.0, seed=seed + 131)
            upward_exposure = smoothstep(-0.05, 0.62, n_z) * smoothstep(0.02, 0.22, pz)
            cor_patch_field = 0.50 * med_grain + 0.50 * cor_cell + 0.28 * upward_exposure
            cor_mask = smoothstep(0.48, 0.66, cor_patch_field) * smoothstep(0.22, 0.55, cavity)

            cor_col = lerp_color(c_cor_deep, c_cor_magenta, smoothstep(0.30, 0.65, med_grain))
            cor_col = lerp_color(cor_col, c_cor_lavender, smoothstep(0.58, 0.84, macro_crag))
            # Thin calcified pink-white growth ring at the perimeter of coralline plaques
            plaque_rim = math.exp(-((cor_patch_field - 0.55) / 0.028) ** 2) * upward_exposure
            cor_col = lerp_color(cor_col, c_cor_margin, plaque_rim * 0.65)

            col = lerp_color(carb_col, cor_col, cor_mask * 0.86)
            micro_var = 0.88 + 0.24 * fine_grain
            ao = max(0.18, min(1.0, cavity * (0.72 + 0.28 * smoothstep(-0.2, 0.6, n_z))))

            base_pixels[row_off]     = max(0.0, min(1.0, col[0] * micro_var * (0.55 + 0.45 * ao)))
            base_pixels[row_off + 1] = max(0.0, min(1.0, col[1] * micro_var * (0.55 + 0.45 * ao)))
            base_pixels[row_off + 2] = max(0.0, min(1.0, col[2] * micro_var * (0.55 + 0.45 * ao)))
            base_pixels[row_off + 3] = 1.0

            roughness = lerp(0.94, 0.64, cor_mask * 0.85)
            orm_pixels[row_off]     = ao
            orm_pixels[row_off + 1] = roughness
            orm_pixels[row_off + 2] = 0.0
            orm_pixels[row_off + 3] = 1.0

            height_buf[y_i][x_i] = 0.42 * cavity + 0.35 * macro_crag + 0.15 * med_grain + 0.08 * fine_grain + 0.08 * cor_mask
            row_off += 4

    # Derive crisp tangent-space normal map from the 3D-sampled height field
    for y_i in range(size):
        y_prev = max(0, y_i - 1)
        y_next = min(size - 1, y_i + 1)
        row_off = y_i * size * 4
        for x_i in range(size):
            x_prev = (x_i - 1) % size
            x_next = (x_i + 1) % size
            dh_dx = (height_buf[y_i][x_next] - height_buf[y_i][x_prev]) * 6.5
            dh_dy = (height_buf[y_next][x_i] - height_buf[y_prev][x_i]) * 6.5
            nx_t = max(-1.0, min(1.0, -dh_dx))
            ny_t = max(-1.0, min(1.0, -dh_dy))
            nz_t = math.sqrt(max(0.0, 1.0 - nx_t * nx_t - ny_t * ny_t))
            norm_pixels[row_off]     = 0.5 + 0.5 * nx_t
            norm_pixels[row_off + 1] = 0.5 + 0.5 * ny_t
            norm_pixels[row_off + 2] = 0.5 + 0.5 * nz_t
            norm_pixels[row_off + 3] = 1.0
            row_off += 4

    def pack_buf(name, buf, non_color=False):
        img = bpy.data.images.new(name=name, width=size, height=size, alpha=True, float_buffer=False)
        if non_color:
            img.colorspace_settings.name = 'Non-Color'
        img.pixels.foreach_set(buf)
        img.pack()
        return img

    return (
        pack_buf(f'live_rock_{island_kind}_base', base_pixels, non_color=False),
        pack_buf(f'live_rock_{island_kind}_norm', norm_pixels, non_color=True),
        pack_buf(f'live_rock_{island_kind}_orm', orm_pixels, non_color=True),
    )


def build_live_rock_surface_bake(size, verts, faces, loop_uvs, island_kind):
    """Bake 3D isotropic aragonite + upward-facing coralline fields from real triangle positions into the mesh's UV charts."""
    seed = 101 if island_kind == 'left' else 211
    base_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)
    height_buf = [[0.5] * size for _ in range(size)]
    coverage = bytearray(size * size)
    sampled_positions = {}
    overlap_conflicts = 0
    overlap_types = {}
    degenerate_uv_triangles = 0
    rasterized_triangles = 0
    vertex_normals = [[0.0, 0.0, 0.0] for _ in verts]
    for face in faces:
        p0, p1, p2 = (Vector(verts[index]) for index in face)
        weighted_normal = (p1 - p0).cross(p2 - p0)
        for index in face:
            for axis, value in enumerate(weighted_normal):
                vertex_normals[index][axis] += value
    for normal in vertex_normals:
        length = math.sqrt(sum(value * value for value in normal)) or 1.0
        normal[:] = [value / length for value in normal]

    def evaluate(px, py, pz, nx_v, ny_v, nz_v):
        w1 = value_noise_3d(px * 7.5, py * 7.5, pz * 7.5, seed=seed) - 0.5
        w2 = value_noise_3d(px * 7.5 + 3.1, py * 7.5 - 2.7, pz * 7.5 + 1.9, seed=seed + 7) - 0.5
        wx, wy, wz = px + 0.022 * w1, py + 0.022 * w2, pz + 0.022 * (w1 - w2)
        macro = ridged_3d(wx * 9.5, wy * 9.5, wz * 9.5, octaves=2, seed=seed + 13)
        medium = fbm_3d(wx * 26.0, wy * 26.0, wz * 26.0, octaves=2, seed=seed + 29)
        fine = value_noise_3d(px * 88.0, py * 88.0, pz * 88.0, seed=seed + 53)
        vug1 = value_noise_3d(wx * 38.0, wy * 38.0, wz * 38.0, seed=seed + 71)
        vug2 = value_noise_3d(wx * 72.0 + 1.7, wy * 72.0 - 2.3, wz * 72.0 + 0.9, seed=seed + 83)
        pore = value_noise_3d(px * 125.0, py * 125.0, pz * 125.0, seed=seed + 97)
        cavity = (
            smoothstep(0.24, 0.62, vug1 * 0.65 + vug2 * 0.35)
            * (0.60 + 0.40 * smoothstep(0.20, 0.62, pore))
            * (0.65 + 0.35 * smoothstep(0.03, 0.20, abs(vug1 - 0.5)))
        )
        # Warm porous cured Fiji/Marco aragonite carbonate palette (eliminating dark black/magenta blotches)
        carb = lerp_color((0.270, 0.240, 0.190), (0.520, 0.470, 0.390), smoothstep(0.22, 0.62, cavity))
        carb = lerp_color(carb, (0.740, 0.690, 0.590), smoothstep(0.42, 0.84, macro * 0.6 + medium * 0.4) * cavity)
        olive = (1.0 - smoothstep(0.04, 0.22, pz)) * smoothstep(0.25, 0.78, medium) * 0.30
        carb = lerp_color(carb, (0.390, 0.400, 0.280), olive)

        # Crustose coralline algae plaques restricted to upward-facing sunlit surfaces (nz_v > 0.18)
        cor_cell = value_noise_3d(wx * 15.5, wy * 15.5, wz * 15.5, seed=seed + 131)
        exposure = smoothstep(0.18, 0.68, nz_v) * smoothstep(0.03, 0.22, pz)
        patch = 0.50 * medium + 0.50 * cor_cell + 0.26 * exposure
        cor_mask = smoothstep(0.50, 0.68, patch) * exposure * smoothstep(0.32, 0.62, cavity)
        cor = lerp_color((0.350, 0.120, 0.280), (0.560, 0.210, 0.430), smoothstep(0.28, 0.66, medium))
        cor = lerp_color(cor, (0.720, 0.390, 0.590), smoothstep(0.58, 0.85, macro))
        rim = math.exp(-((patch - 0.56) / 0.028) ** 2) * exposure
        cor = lerp_color(cor, (0.870, 0.710, 0.810), rim * 0.60)

        # Direct encrusting coral patches (Ricordea teal-emerald & Montipora/Zoanthid orange-gold)
        # mapped onto sunlit mid-elevation rock shelves (AQ-95 AC #2 & AQ-101 AC #2)
        enc_cell = value_noise_3d(wx * 18.0 - 2.4, wy * 18.0 + 1.8, wz * 18.0, seed=seed + 157)
        polyp_bead = value_noise_3d(px * 96.0, py * 96.0, pz * 96.0, seed=seed + 179)
        shelf_zone = smoothstep(0.38, 0.78, nz_v) * smoothstep(0.05, 0.16, pz) * (1.0 - smoothstep(0.28, 0.42, pz))
        enc_teal_mask = smoothstep(0.64, 0.78, enc_cell) * shelf_zone * smoothstep(0.35, 0.65, cavity)
        enc_gold_mask = smoothstep(0.66, 0.80, 1.0 - enc_cell) * shelf_zone * smoothstep(0.35, 0.65, cavity)
        c_enc_teal = lerp_color((0.120, 0.460, 0.420), (0.240, 0.780, 0.640), smoothstep(0.35, 0.80, polyp_bead))
        c_enc_gold = lerp_color((0.540, 0.220, 0.110), (0.880, 0.440, 0.160), smoothstep(0.35, 0.80, polyp_bead))

        color = lerp_color(carb, cor, cor_mask * 0.86)
        color = lerp_color(color, c_enc_teal, enc_teal_mask * 0.78)
        color = lerp_color(color, c_enc_gold, enc_gold_mask * 0.75)
        enc_total = max(enc_teal_mask, enc_gold_mask)

        ao = max(0.28, min(1.0, cavity * (0.72 + 0.28 * smoothstep(-0.35, 0.65, nz_v))))
        micro = 0.90 + 0.20 * fine
        base = [max(0.0, min(1.0, channel * micro * (0.62 + 0.38 * ao))) for channel in color]
        roughness = lerp(0.90, 0.62, max(cor_mask * 0.85, enc_total * 0.90))
        h_val = 0.42 * cavity + 0.32 * macro + 0.16 * medium + 0.10 * fine + 0.08 * cor_mask + 0.12 * enc_total * polyp_bead
        return base, ao, roughness, h_val

    for triangle_index, face in enumerate(faces):
        tri_uv = loop_uvs[triangle_index * 3:triangle_index * 3 + 3]
        (u0, v0), (u1, v1), (u2, v2) = tri_uv
        denom = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2)
        if abs(denom) <= 1e-14:
            degenerate_uv_triangles += 1
            continue
        rasterized_triangles += 1
        tri_pos = [verts[index] for index in face]
        tri_norm = [vertex_normals[index] for index in face]
        min_x = max(0, int(math.floor(min(uv[0] for uv in tri_uv) * size - 0.5)))
        max_x = min(size - 1, int(math.ceil(max(uv[0] for uv in tri_uv) * size - 0.5)))
        min_y = max(0, int(math.floor(min(uv[1] for uv in tri_uv) * size - 0.5)))
        max_y = min(size - 1, int(math.ceil(max(uv[1] for uv in tri_uv) * size - 0.5)))
        for y_i in range(min_y, max_y + 1):
            v = (y_i + 0.5) / size
            for x_i in range(min_x, max_x + 1):
                u = (x_i + 0.5) / size
                w0 = ((v1 - v2) * (u - u2) + (u2 - u1) * (v - v2)) / denom
                w1 = ((v2 - v0) * (u - u2) + (u0 - u2) * (v - v2)) / denom
                w2 = 1.0 - w0 - w1
                if min(w0, w1, w2) < -1e-8:
                    continue
                pixel = y_i * size + x_i
                position = tuple(sum(weight * tri_pos[index][axis] for index, weight in enumerate((w0, w1, w2))) for axis in range(3))
                if coverage[pixel]:
                    if math.dist(sampled_positions[pixel], position) > 1e-6:
                        overlap_conflicts += 1
                        top_count = 2 * 95 * 63
                        bottom_count = 2 * 95 * 63
                        first_kind = 'top' if triangle_index < top_count else ('bottom' if triangle_index < top_count + bottom_count else 'skirt')
                        overlap_types[first_kind] = overlap_types.get(first_kind, 0) + 1
                    continue
                coverage[pixel] = 1
                sampled_positions[pixel] = position
                normal = [sum(weight * tri_norm[index][axis] for index, weight in enumerate((w0, w1, w2))) for axis in range(3)]
                length = math.sqrt(sum(value * value for value in normal)) or 1.0
                base, ao, roughness, h_val = evaluate(*position, *(value / length for value in normal))
                offset = pixel * 4
                base_pixels[offset:offset + 4] = [*base, 1.0]
                orm_pixels[offset:offset + 4] = [ao, roughness, 0.0, 1.0]
                height_buf[y_i][x_i] = h_val

    # Extend chart colors several texels for filtered samples at island edges.
    filled = bytearray(coverage)
    for _ in range(6):
        additions = []
        for y_i in range(size):
            for x_i in range(size):
                pixel = y_i * size + x_i
                if filled[pixel]:
                    continue
                source = next((ny * size + nx for nx, ny in ((x_i - 1, y_i), (x_i + 1, y_i), (x_i, y_i - 1), (x_i, y_i + 1)) if 0 <= nx < size and 0 <= ny < size and filled[ny * size + nx]), None)
                if source is not None:
                    additions.append((pixel, source))
        for pixel, source in additions:
            base_pixels[pixel * 4:pixel * 4 + 4] = base_pixels[source * 4:source * 4 + 4]
            orm_pixels[pixel * 4:pixel * 4 + 4] = orm_pixels[source * 4:source * 4 + 4]
            sy_i, sx_i = divmod(source, size)
            py_i, px_i = divmod(pixel, size)
            height_buf[py_i][px_i] = height_buf[sy_i][sx_i]
            filled[pixel] = 1

    norm_pixels = [0.0] * (size * size * 4)
    for y_i in range(size):
        y_prev = max(0, y_i - 1)
        y_next = min(size - 1, y_i + 1)
        row_off = y_i * size * 4
        for x_i in range(size):
            x_prev = max(0, x_i - 1)
            x_next = min(size - 1, x_i + 1)
            dh_dx = (height_buf[y_i][x_next] - height_buf[y_i][x_prev]) * 4.5
            dh_dy = (height_buf[y_next][x_i] - height_buf[y_prev][x_i]) * 4.5
            nx_t = max(-1.0, min(1.0, -dh_dx))
            ny_t = max(-1.0, min(1.0, -dh_dy))
            nz_t = math.sqrt(max(0.0, 1.0 - nx_t * nx_t - ny_t * ny_t))
            norm_pixels[row_off:row_off + 4] = [0.5 + 0.5 * nx_t, 0.5 + 0.5 * ny_t, 0.5 + 0.5 * nz_t, 1.0]
            row_off += 4

    def pack_buf(name, buf, non_color=False):
        image = bpy.data.images.new(name=name, width=size, height=size, alpha=True, float_buffer=False)
        if non_color:
            image.colorspace_settings.name = 'Non-Color'
        image.pixels.foreach_set(buf)
        image.pack()
        return image

    print('ROCK_UV_BAKE_REPORT=' + json.dumps({
        'atlasSize': [size, size],
        'triangleCount': len(faces),
        'rasterizedTriangles': rasterized_triangles,
        'degenerateUvTriangles': degenerate_uv_triangles,
        'overlapConflicts': overlap_conflicts,
        'overlapTypes': overlap_types,
        'coveredTexels': sum(coverage),
        'normalMap': '3d-surface-height-gradient-v1',
    }, sort_keys=True), flush=True)
    return (
        pack_buf(f'live_rock_{island_kind}_base', base_pixels),
        pack_buf(f'live_rock_{island_kind}_norm', norm_pixels, non_color=True),
        pack_buf(f'live_rock_{island_kind}_orm', orm_pixels, non_color=True),
    )


def build_rock_material(name, base_img, norm_img, orm_img):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0.0

    tex_base = nodes.new('ShaderNodeTexImage')
    tex_base.image = base_img
    links.new(tex_base.outputs['Color'], bsdf.inputs['Base Color'])

    tex_orm = nodes.new('ShaderNodeTexImage')
    tex_orm.image = orm_img
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(tex_orm.outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])

    group_tree = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    group_tree.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketColor')
    group = nodes.new('ShaderNodeGroup')
    group.name = 'glTF Material Output'
    group.node_tree = group_tree
    links.new(tex_orm.outputs['Color'], group.inputs['Occlusion'])

    tex_norm = nodes.new('ShaderNodeTexImage')
    tex_norm.image = norm_img
    norm_node = nodes.new('ShaderNodeNormalMap')
    norm_node.inputs['Strength'].default_value = 0.92
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    return mat


def build_reef_foundation_mesh(name, island_kind='left'):
    """
    Build a watertight, 0-boundary-edge, 2-manifold carbonate reef island mesh with:
    - Staggered multi-boulder elevations and deep inter-boulder clefts (no flat terrace layers).
    - Real pass-through central archway on `left` (`> 0.065 m` clearance at `(0, 0.08)` for AQ-58).
    - 3D world-space baked textures eliminating vertical cliff UV stretching (AQ-59).
    - Exact horizontal planar mounting pads (`z == sz`) and clear cylinders (`z <= sz`) for all sockets (AQ-52).
    """
    nx = 96
    ny = 64
    socket_specs = LEFT_SOCKET_SPECS if island_kind == 'left' else RIGHT_SOCKET_SPECS

    x_half = 0.445 if island_kind == 'left' else 0.425
    y_half = 0.252 if island_kind == 'left' else 0.245

    x_grid = [[0.0] * ny for _ in range(nx)]
    y_grid = [[0.0] * ny for _ in range(nx)]
    z_top_grid = [[0.0] * ny for _ in range(nx)]
    z_bot_grid = [[0.0] * ny for _ in range(nx)]

    for i in range(nx):
        u = (i / (nx - 1)) * 2.0 - 1.0
        for j in range(ny):
            v = (j / (ny - 1)) * 2.0 - 1.0
            theta = math.atan2(v, u)
            r_box = max(abs(u), abs(v))
            edge_env = smoothstep(0.48, 1.0, r_box)
            corner_diag = (u * u) * (v * v)
            corner_pinch = 1.0 - 0.16 * smoothstep(0.38, 1.0, corner_diag)
            # Stronger asymmetric multi-boulder perimeter coves and promontories
            lobe_rad = 1.0 + edge_env * (
                0.075 * math.cos(theta * 3.0 + (0.5 if island_kind == 'left' else -0.7))
                + 0.052 * math.sin(theta * 5.0 + (1.3 if island_kind == 'left' else 0.9))
                + 0.034 * math.cos(theta * 7.0 - 0.6)
                + 0.018 * math.sin(theta * 11.0 + 0.4)
            )
            cave_mouth_recess = 0.0
            if island_kind == 'left' and abs(u) < 0.28:
                cave_mouth_recess = -0.032 * (1.0 - (u / 0.28) ** 2) * smoothstep(0.32, 1.0, abs(v)) * (1.0 if v > 0 else -1.0)

            px = u * x_half * corner_pinch * lobe_rad
            py = v * y_half * corner_pinch * lobe_rad + cave_mouth_recess
            x_grid[i][j] = px
            y_grid[i][j] = py
            zt, zb = evaluate_raw_rock_surfaces(px, py, island_kind, socket_specs)
            z_top_grid[i][j] = zt
            z_bot_grid[i][j] = zb

    # Keep pad_margin tight to the coral plug footprint so only the immediate socket pad is planar,
    # leaving surrounding boulders craggy and uneven instead of creating wide flat terrace rings!
    pad_margin = 0.012
    clear_margin = 0.012

    for s_name, (sx, sy, sz) in socket_specs:
        meta = SOCKET_ARCHETYPES[socket_prefix(s_name)]
        r_pad = meta['footprint'] + pad_margin
        r_blend = r_pad + 0.016
        for i in range(nx):
            for j in range(ny):
                d = math.hypot(x_grid[i][j] - sx, y_grid[i][j] - sy)
                if d <= r_blend:
                    w = 1.0 - smoothstep(r_pad, r_blend, d)
                    z_top_grid[i][j] = lerp(z_top_grid[i][j], sz, w)

    # Enforce clearance cylinder ceiling (z_top <= sz inside r_clear) without flattening vertices
    # that are already naturally lower than sz (preserving deep clefts and crevices around sockets!)
    for s_name, (sx, sy, sz) in socket_specs:
        meta = SOCKET_ARCHETYPES[socket_prefix(s_name)]
        r_clear = meta['clearance'] + clear_margin
        r_ramp = r_clear + 0.032
        for i in range(nx):
            for j in range(ny):
                d = math.hypot(x_grid[i][j] - sx, y_grid[i][j] - sy)
                if d <= r_clear and z_top_grid[i][j] > sz:
                    # Carve a natural craggy slope down below sz instead of a flat ceiling at sz
                    crag_dip = 0.014 * smoothstep(meta['footprint'] + pad_margin, r_clear, d) * (
                        0.5 + 0.5 * math.sin(x_grid[i][j] * 28.0 + y_grid[i][j] * 31.0)
                    )
                    z_top_grid[i][j] = sz - crag_dip
                elif r_clear < d <= r_ramp and z_top_grid[i][j] > sz:
                    t_ramp = smoothstep(r_clear, r_ramp, d)
                    z_top_grid[i][j] = lerp(sz - 0.008, z_top_grid[i][j], t_ramp)

    for s_name, (sx, sy, sz) in socket_specs:
        meta = SOCKET_ARCHETYPES[socket_prefix(s_name)]
        r_clear = meta['clearance'] + clear_margin
        for i in range(nx):
            for j in range(ny):
                d = math.hypot(x_grid[i][j] - sx, y_grid[i][j] - sy)
                if d <= r_clear and z_top_grid[i][j] > sz:
                    z_top_grid[i][j] = sz

    for s_name, (sx, sy, sz) in socket_specs:
        meta = SOCKET_ARCHETYPES[socket_prefix(s_name)]
        r_pad = meta['footprint'] + pad_margin
        for i in range(nx):
            for j in range(ny):
                d = math.hypot(x_grid[i][j] - sx, y_grid[i][j] - sy)
                if d <= r_pad:
                    z_top_grid[i][j] = sz
                    if z_bot_grid[i][j] > sz - 0.030:
                        z_bot_grid[i][j] = sz - 0.030

    for i in range(nx):
        for j in range(ny):
            if z_bot_grid[i][j] > z_top_grid[i][j] - 0.024:
                z_bot_grid[i][j] = z_top_grid[i][j] - 0.024

    verts = []
    faces = []
    loop_uvs = []

    def top_v_idx(i, j):
        return i * ny + j

    def bot_v_idx(i, j):
        return nx * ny + i * ny + j

    for i in range(nx):
        for j in range(ny):
            verts.append((x_grid[i][j], y_grid[i][j], z_top_grid[i][j]))

    for i in range(nx):
        for j in range(ny):
            verts.append((x_grid[i][j], y_grid[i][j], z_bot_grid[i][j]))

    # Cumulative 3D surface arc-length parameterization across columns i and rows j
    # expands steep interior boulder slopes in UV space while keeping a strictly monotonic non-overlapping grid.
    atlas_size = 512
    density = 210.0
    margin = 4.0
    gutter = 6.0

    def cumulative_3d_axes(idx_fn, target_w_px, target_h_px):
        du = [0.0]
        for i in range(nx - 1):
            dists = sorted(math.dist(verts[idx_fn(i, j)], verts[idx_fn(i + 1, j)]) for j in range(ny))
            du.append(du[-1] + dists[int(0.85 * (len(dists) - 1))])
        dv = [0.0]
        for j in range(ny - 1):
            dists = sorted(math.dist(verts[idx_fn(i, j)], verts[idx_fn(i, j + 1)]) for i in range(nx))
            dv.append(dv[-1] + dists[int(0.85 * (len(dists) - 1))])
        scale_u = target_w_px / max(1e-6, du[-1])
        scale_v = target_h_px / max(1e-6, dv[-1])
        return [d * scale_u for d in du], [d * scale_v for d in dv]

    top_u_step = sum(math.dist(verts[top_v_idx(i, j)], verts[top_v_idx(i + 1, j)]) for i in range(nx - 1) for j in range(ny)) / ((nx - 1) * ny)
    top_v_step = sum(math.dist(verts[top_v_idx(i, j)], verts[top_v_idx(i, j + 1)]) for i in range(nx) for j in range(ny - 1)) / (nx * (ny - 1))
    bottom_u_step = sum(math.dist(verts[bot_v_idx(i, j)], verts[bot_v_idx(i + 1, j)]) for i in range(nx - 1) for j in range(ny)) / ((nx - 1) * ny)
    bottom_v_step = sum(math.dist(verts[bot_v_idx(i, j)], verts[bot_v_idx(i, j + 1)]) for i in range(nx) for j in range(ny - 1)) / (nx * (ny - 1))
    top_chart_width = (nx - 1) * top_u_step * density
    top_chart_height = (ny - 1) * top_v_step * density
    bottom_chart_width = (nx - 1) * bottom_u_step * density
    bottom_chart_height = (ny - 1) * bottom_v_step * density
    top_origin = (margin, margin)
    bottom_origin = (margin, margin + top_chart_height + gutter)

    top_u_px, top_v_px = cumulative_3d_axes(top_v_idx, top_chart_width, top_chart_height)
    bot_u_px, bot_v_px = cumulative_3d_axes(bot_v_idx, bottom_chart_width, bottom_chart_height)

    def top_uv(i, j):
        return ((top_origin[0] + top_u_px[i]) / atlas_size,
                (top_origin[1] + top_v_px[j]) / atlas_size)

    def bottom_uv(i, j):
        return ((bottom_origin[0] + bot_u_px[i]) / atlas_size,
                (bottom_origin[1] + bot_v_px[j]) / atlas_size)

    for i in range(nx - 1):
        for j in range(ny - 1):
            v00 = top_v_idx(i, j)
            v10 = top_v_idx(i + 1, j)
            v11 = top_v_idx(i + 1, j + 1)
            v01 = top_v_idx(i, j + 1)

            faces.append((v00, v10, v11))
            loop_uvs.extend([top_uv(i, j), top_uv(i + 1, j), top_uv(i + 1, j + 1)])
            faces.append((v00, v11, v01))
            loop_uvs.extend([top_uv(i, j), top_uv(i + 1, j + 1), top_uv(i, j + 1)])

    for i in range(nx - 1):
        for j in range(ny - 1):
            b00 = bot_v_idx(i, j)
            b10 = bot_v_idx(i + 1, j)
            b11 = bot_v_idx(i + 1, j + 1)
            b01 = bot_v_idx(i, j + 1)

            faces.append((b00, b11, b10))
            loop_uvs.extend([bottom_uv(i, j), bottom_uv(i + 1, j + 1), bottom_uv(i + 1, j)])
            faces.append((b00, b01, b11))
            loop_uvs.extend([bottom_uv(i, j), bottom_uv(i, j + 1), bottom_uv(i + 1, j + 1)])

    perim = []
    for i in range(nx):
        perim.append((i, 0))
    for j in range(1, ny):
        perim.append((nx - 1, j))
    for i in range(nx - 2, -1, -1):
        perim.append((i, ny - 1))
    for j in range(ny - 2, 0, -1):
        perim.append((0, j))

    n_perim = len(perim)
    if n_perim % 2:
        raise RuntimeError(f'Expected even skirt perimeter, got {n_perim}')
    half_perim = n_perim // 2
    edge_lengths = []
    for k in range(n_perim):
        i0, j0 = perim[k]
        i1, j1 = perim[(k + 1) % n_perim]
        t0, t1 = verts[top_v_idx(i0, j0)], verts[top_v_idx(i1, j1)]
        b0, b1 = verts[bot_v_idx(i0, j0)], verts[bot_v_idx(i1, j1)]
        edge_lengths.append((math.dist(t0, t1) + math.dist(b0, b1)) * 0.5)
    cumulative = [0.0]
    for edge_length in edge_lengths:
        cumulative.append(cumulative[-1] + edge_length)
    max_side_height = max(verts[top_v_idx(i, j)][2] - verts[bot_v_idx(i, j)][2] for i, j in perim)
    side_chart_y = [margin + top_chart_height + bottom_chart_height + gutter * 2.0,
                    margin + top_chart_height + bottom_chart_height + gutter * 3.0 + max_side_height * density]

    if max(top_chart_width, bottom_chart_width) + margin * 2.0 > atlas_size:
        raise RuntimeError(f'Top and underside charts exceed atlas width: top={top_chart_width:.1f}px bottom={bottom_chart_width:.1f}px density={density}px/m')
    if max(cumulative[half_perim], cumulative[-1] - cumulative[half_perim]) * density + margin * 2.0 > atlas_size:
        raise RuntimeError(f'Skirt chart exceeds atlas width: half lengths {cumulative[half_perim]:.4f}m and {cumulative[-1] - cumulative[half_perim]:.4f}m at {density}px/m')
    if side_chart_y[1] + max_side_height * density + margin > atlas_size:
        raise RuntimeError('Surface charts exceed the texture atlas height')

    def skirt_uv(perimeter_index, half, z):
        start_index = 0 if half == 0 else half_perim
        if half == 1 and perimeter_index == 0:
            perimeter_index = n_perim
        local_distance = cumulative[perimeter_index] - cumulative[start_index]
        i, j = perim[perimeter_index % n_perim]
        z_bottom = verts[bot_v_idx(i, j)][2]
        return ((margin + local_distance * density) / atlas_size,
                (side_chart_y[half] + (z - z_bottom) * density) / atlas_size)

    for k in range(n_perim):
        i0, j0 = perim[k]
        i1, j1 = perim[(k + 1) % n_perim]
        t0 = top_v_idx(i0, j0)
        t1 = top_v_idx(i1, j1)
        b0 = bot_v_idx(i0, j0)
        b1 = bot_v_idx(i1, j1)
        half = 0 if k < half_perim else 1
        next_k = (k + 1) % n_perim
        top_next_uv = skirt_uv(next_k, half, verts[t1][2])
        top_current_uv = skirt_uv(k, half, verts[t0][2])
        bottom_current_uv = skirt_uv(k, half, verts[b0][2])
        bottom_next_uv = skirt_uv(next_k, half, verts[b1][2])
        faces.append((t1, t0, b0))
        loop_uvs.extend([top_next_uv, top_current_uv, bottom_current_uv])
        faces.append((t1, b0, b1))
        loop_uvs.extend([top_next_uv, bottom_current_uv, bottom_next_uv])

    if len(loop_uvs) != len(faces) * 3:
        raise RuntimeError('UV loop count does not match generated triangle count')
    base_img, norm_img, orm_img = build_live_rock_surface_bake(atlas_size, verts, faces, loop_uvs, island_kind)
    mat = build_rock_material(f'Live_Rock_{island_kind.capitalize()}_Mat', base_img, norm_img, orm_img)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    bm = bmesh.new()
    bm.from_mesh(mesh)
    b_edges = sum(1 for e in bm.edges if e.is_boundary)
    nm_edges = sum(1 for e in bm.edges if not e.is_manifold)
    bm.free()
    if b_edges != 0 or nm_edges != 0:
        raise RuntimeError(f'Non-watertight mesh {name}: boundary={b_edges}, nonmanifold={nm_edges}')

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)
    mesh.calc_tangents(uvmap='UVMap')

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj, verts, faces, socket_specs


def attach_socket_empties(rock_obj, verts, faces, socket_specs):
    created_sockets = []
    for socket_name, (sx, sy, sz) in socket_specs:
        best_centroid = None
        best_dist = 1e9
        for f in faces:
            if len(f) != 3:
                continue
            v0 = verts[f[0]]
            v1 = verts[f[1]]
            v2 = verts[f[2]]
            if (
                abs(v0[2] - sz) < 1e-6
                and abs(v1[2] - sz) < 1e-6
                and abs(v2[2] - sz) < 1e-6
            ):
                cx = (v0[0] + v1[0] + v2[0]) / 3.0
                cy = (v0[1] + v1[1] + v2[1]) / 3.0
                d = math.hypot(cx - sx, cy - sy)
                if d < best_dist:
                    best_dist = d
                    best_centroid = (cx, cy, sz)

        if best_centroid is None:
            raise RuntimeError(f'No flat pad triangle found for {socket_name} at ({sx}, {sy}, {sz})')

        loc = Vector(best_centroid)
        rot = Euler((0.0, 0.0, 0.0), 'XYZ')

        empty = bpy.data.objects.new(socket_name, None)
        empty.empty_display_type = 'ARROWS'
        empty.empty_display_size = 0.04
        empty.location = loc
        empty.rotation_euler = rot
        empty.parent = rock_obj
        bpy.context.collection.objects.link(empty)
        created_sockets.append({
            'name': socket_name,
            'locationBlenderZUp': [round(v, 6) for v in loc],
            'normalBlenderZUp': [0.0, 0.0, 1.0],
            'padCentroidSearchDistM': round(best_dist, 6),
        })

    return created_sockets


def export_island_glb(rock_obj, glb_path):
    bpy.ops.object.select_all(action='DESELECT')
    rock_obj.select_set(True)
    for child in rock_obj.children:
        child.select_set(True)
    bpy.context.view_layer.objects.active = rock_obj

    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_tangents=True,
        export_texcoords=True,
        export_normals=True,
        export_vertex_color='NONE',
        export_attributes=False,
        export_extras=True,
        export_yup=True,
        export_image_format='AUTO',
        export_animations=False,
    )


def main():
    out_dir, which = parse_args()
    os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    if which in ('left', 'both'):
        left_obj, verts, faces, specs = build_reef_foundation_mesh('Live_Rock_Island_Left', island_kind='left')
        left_sockets = attach_socket_empties(left_obj, verts, faces, specs)
        left_glb = os.path.join(out_dir, 'live-rock-island-left.glb')
        export_island_glb(left_obj, left_glb)
        print('LIVE_ROCK_BUILD_REPORT=' + json.dumps({
            'island': 'left',
            'glbPath': left_glb,
            'glbBytes': os.path.getsize(left_glb),
            'glbSha256': hashlib.sha256(open(left_glb, 'rb').read()).hexdigest(),
            'triangles': len(faces),
            'sockets': left_sockets,
        }, sort_keys=True), flush=True)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.render.threads_mode = 'FIXED'
        bpy.context.scene.render.threads = 4

    if which in ('right', 'both'):
        right_obj, verts, faces, specs = build_reef_foundation_mesh('Live_Rock_Island_Right', island_kind='right')
        right_sockets = attach_socket_empties(right_obj, verts, faces, specs)
        right_glb = os.path.join(out_dir, 'live-rock-island-right.glb')
        export_island_glb(right_obj, right_glb)
        print('LIVE_ROCK_BUILD_REPORT=' + json.dumps({
            'island': 'right',
            'glbPath': right_glb,
            'glbBytes': os.path.getsize(right_glb),
            'glbSha256': hashlib.sha256(open(right_glb, 'rb').read()).hexdigest(),
            'triangles': len(faces),
            'sockets': right_sockets,
        }, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
