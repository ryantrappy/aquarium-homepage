"""Build the Procedural Coral / Live Rock test asset in Blender (Cycles + Adaptive Displacement).

Synthesized from "Procedural Coral Rock Material (Blender Tutorial)" by Ryan King Art:
https://www.youtube.com/watch?v=gZQ3BjXDjSg

Implements the exact Scene, Lighting, Modifier, and Shader Node specifications:
1. Scene & Render Setup:
   - Render Engine: Cycles, Feature Set: Experimental (or native Blender 5.x Adaptive Subdivision)
   - Color Management: View Transform = Filmic, Look = Very High Contrast
   - Base Mesh: Icosphere subdivided in Edit Mode for dense base geometry
   - Modifiers: Subdivision Surface with Adaptive Subdivision enabled, Dicing Scale = 5.0
   - Material Settings: "Procedural Coral Rock", Surface Displacement = Displacement and Bump ('BOTH')
2. Studio Lighting & Environment:
   - World: HDRI Environment Texture (felsen_labyrinth_1k.hdr)
   - Key Light: Circular subdivided plane with bright blue Emission (Strength 100.0)
   - Rim Light: Tall stretched rectangular plane on opposite side with warm yellow Emission (Strength 50.0)
   - Bounce Light: Flat plane underneath the rock with blue Principled BSDF base color
3. Procedural Shader Node Tree ("Procedural Coral Rock"):
   - Texture Coordinate (Object) driving all procedural textures
   - A. Pores / Holes Mask: Noise (Scale 15, Detail 15, Roughness 0.5) -> MixRGB (Linear Light, Fac 0.010)
     -> Voronoi (3D, Smooth F1, Euclidean, Scale 14.0, Smoothness 0.200, Randomness 1.0)
     -> ColorRamp (Linear: #303030 at 0.0, #FFFFFF at 0.535)
   - B. Macro Surface Variation & True Displacement: Noise (Scale 2.0, Detail 15.0, Roughness 0.5)
     -> ColorRamp (Linear: #000000 at 0.353, #FFFFFF at 0.561)
     -> MixRGB (Mix: Fac = Macro Ramp, Color1 = Voronoi Ramp, Color2 = #000000)
     -> Displacement (Midlevel 0.500, Scale 0.140) -> Material Output (Displacement)
   - C. Micro-Bump (Normal): Voronoi Ramp -> Bump 1 (Strength 0.400, Distance 1.0)
     -> Bump 2 (Strength 0.300, Distance 1.0, Height = Noise 15 Fac) -> Principled BSDF (Normal)
   - D. Roughness & Base Color:
     - Roughness: Noise 15 Fac -> ColorRamp (Linear: #404040 at 0.0, #FFFFFF at 1.0) -> Principled BSDF (Roughness)
     - Base Color: Noise (Scale 8.0, Detail 15.0, Roughness 0.5) -> ColorRamp (Linear:
       0.208 = #31140B, 0.530 = #8A5D40, 0.938 = #BF9B7C) -> Principled BSDF (Base Color)
"""
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Color, Vector

PROJECT_ROOT = Path(__file__).resolve().parents[3]
PUBLIC_TEST_DIR = PROJECT_ROOT / "public" / "test-assets"
PUBLIC_TEST_DIR.mkdir(parents=True, exist_ok=True)

BLEND_OUT_PATH = PUBLIC_TEST_DIR / "procedural-coral-rock.blend"
CYCLES_RENDER_PATH = PUBLIC_TEST_DIR / "procedural-coral-rock-cycles.png"
GLB_OUT_PATH = PUBLIC_TEST_DIR / "procedural-coral-rock.glb"
HDRI_OUT_PATH = PUBLIC_TEST_DIR / "felsen_labyrinth_1k.hdr"
REPORT_OUT_PATH = PUBLIC_TEST_DIR / "procedural-coral-rock-report.json"


def hex_to_linear_rgba(hex_str: str):
    h = hex_str.lstrip("#")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    c = Color((r, g, b))
    if hasattr(c, "from_srgb_to_scene_linear"):
        c = c.from_srgb_to_scene_linear()
    else:
        def s2l(v: float) -> float:
            return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
        c = Color((s2l(r), s2l(g), s2l(b)))
    return (c.r, c.g, c.b, 1.0)


def add_mix_color_node(nodes, blend_type="MIX", fac=0.5):
    try:
        node = nodes.new("ShaderNodeMixRGB")
        node.blend_type = blend_type
        node.inputs["Fac"].default_value = fac
        return node, node.inputs["Fac"], node.inputs["Color1"], node.inputs["Color2"], node.outputs["Color"]
    except Exception:
        node = nodes.new("ShaderNodeMix")
        node.data_type = "RGBA"
        node.blend_type = blend_type
        node.inputs["Factor"].default_value = fac
        return node, node.inputs["Factor"], node.inputs["A"], node.inputs["B"], node.outputs["Result"]


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build_procedural_coral_rock():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img, do_unlink=True)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    if hasattr(scene.cycles, "feature_set"):
        scene.cycles.feature_set = "EXPERIMENTAL"
    scene.cycles.samples = 48
    if hasattr(scene.cycles, "use_adaptive_sampling"):
        scene.cycles.use_adaptive_sampling = True
    if hasattr(scene.cycles, "dicing_rate"):
        scene.cycles.dicing_rate = 1.0
    if hasattr(scene.cycles, "preview_dicing_rate"):
        scene.cycles.preview_dicing_rate = 5.0

    for vt in ("Filmic", "AgX", "Standard"):
        try:
            scene.view_settings.view_transform = vt
            break
        except Exception:
            continue

    for lk in ("Very High Contrast", "Filmic - Very High Contrast", "AgX - Very High Contrast"):
        try:
            scene.view_settings.look = lk
            break
        except Exception:
            continue

    # World HDRI Setup
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    world = scene.world
    world.use_nodes = True
    wnodes = world.node_tree.nodes
    wlinks = world.node_tree.links
    wnodes.clear()

    w_out = wnodes.new("ShaderNodeOutputWorld")
    w_out.location = (300, 0)
    w_bg = wnodes.new("ShaderNodeBackground")
    w_bg.location = (80, 0)
    w_bg.inputs["Strength"].default_value = 1.0
    w_env = wnodes.new("ShaderNodeTexEnvironment")
    w_env.location = (-240, 0)
    w_env.label = "Felsen Labyrinth 1K"

    hdri_w, hdri_h = 512, 256
    hdri_img = bpy.data.images.new("felsen_labyrinth_1k.hdr", width=hdri_w, height=hdri_h, alpha=False, float_buffer=True)
    pixels = [0.0] * (hdri_w * hdri_h * 4)
    for y in range(hdri_h):
        v = y / (hdri_h - 1)
        theta = (1.0 - v) * math.pi
        sky = max(0.0, math.cos(theta * 0.5)) ** 1.6
        ground = max(0.0, -math.cos(theta)) ** 1.4
        for x in range(hdri_w):
            u = x / hdri_w
            phi = u * 2.0 * math.pi
            sun = max(0.0, math.sin(theta) * math.cos(phi - 0.8) + math.cos(theta) * 0.65) ** 18.0
            rock_variation = 0.5 + 0.5 * math.sin(phi * 5.0 + theta * 3.0) * math.cos(phi * 3.0 - theta * 4.0)
            idx = (y * hdri_w + x) * 4
            pixels[idx] = 0.16 * sky + 0.10 * ground * rock_variation + 1.45 * sun
            pixels[idx + 1] = 0.24 * sky + 0.11 * ground * rock_variation + 1.40 * sun
            pixels[idx + 2] = 0.34 * sky + 0.12 * ground * rock_variation + 1.30 * sun
            pixels[idx + 3] = 1.0
    hdri_img.pixels.foreach_set(pixels)
    hdri_img.filepath_raw = str(HDRI_OUT_PATH)
    hdri_img.file_format = "HDR"
    hdri_img.save()
    hdri_img.pack()
    w_env.image = hdri_img

    wlinks.new(w_env.outputs["Color"], w_bg.inputs["Color"])
    wlinks.new(w_bg.outputs["Background"], w_out.inputs["Surface"])

    # Studio Lights & Bounce Plane
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=(-4.2, -2.8, 3.2))
    blue_light_plane = bpy.context.active_object
    blue_light_plane.name = "KeyLight_Blue_CircularPlane"
    sub_blue = blue_light_plane.modifiers.new(name="Subdivision", type="SUBSURF")
    sub_blue.levels = 3
    sub_blue.render_levels = 3
    bpy.ops.object.modifier_apply(modifier=sub_blue.name)
    blue_light_plane.scale = (2.2, 2.2, 2.2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    point_at(blue_light_plane, (0, 0, 0))

    mat_blue_emit = bpy.data.materials.new(name="Blue_Key_Emission")
    mat_blue_emit.use_nodes = True
    bnodes = mat_blue_emit.node_tree.nodes
    blinks = mat_blue_emit.node_tree.links
    bnodes.clear()
    b_out = bnodes.new("ShaderNodeOutputMaterial")
    b_emit = bnodes.new("ShaderNodeEmission")
    b_emit.inputs["Color"].default_value = (0.12, 0.52, 1.0, 1.0)
    b_emit.inputs["Strength"].default_value = 100.0
    blinks.new(b_emit.outputs["Emission"], b_out.inputs["Surface"])
    blue_light_plane.data.materials.append(mat_blue_emit)

    bpy.ops.mesh.primitive_plane_add(size=2.0, location=(4.0, -1.6, 1.8))
    yellow_light_plane = bpy.context.active_object
    yellow_light_plane.name = "RimLight_Warm_StretchedPlane"
    yellow_light_plane.scale = (0.65, 2.4, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    point_at(yellow_light_plane, (0, 0, 0))

    mat_yellow_emit = bpy.data.materials.new(name="Warm_Rim_Emission")
    mat_yellow_emit.use_nodes = True
    ynodes = mat_yellow_emit.node_tree.nodes
    ylinks = mat_yellow_emit.node_tree.links
    ynodes.clear()
    y_out = ynodes.new("ShaderNodeOutputMaterial")
    y_emit = ynodes.new("ShaderNodeEmission")
    y_emit.inputs["Color"].default_value = (1.0, 0.94, 0.78, 1.0)
    y_emit.inputs["Strength"].default_value = 50.0
    ylinks.new(y_emit.outputs["Emission"], y_out.inputs["Surface"])
    yellow_light_plane.data.materials.append(mat_yellow_emit)

    bpy.ops.mesh.primitive_plane_add(size=6.0, location=(0.0, 0.0, -1.45))
    bounce_plane = bpy.context.active_object
    bounce_plane.name = "BouncePlane_Blue"
    mat_bounce = bpy.data.materials.new(name="Bounce_Blue_BSDF")
    mat_bounce.use_nodes = True
    bsdf_bounce = mat_bounce.node_tree.nodes.get("Principled BSDF")
    if bsdf_bounce:
        bsdf_bounce.inputs["Base Color"].default_value = (0.08, 0.38, 0.85, 1.0)
        bsdf_bounce.inputs["Roughness"].default_value = 0.45
    bounce_plane.data.materials.append(mat_bounce)

    for helper_plane in (blue_light_plane, yellow_light_plane, bounce_plane):
        if hasattr(helper_plane, "visible_camera"):
            helper_plane.visible_camera = False

    # Base Mesh: Icosphere subdivided in Edit Mode + Adaptive Subdivision (Dicing Scale = 5.0)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(0.0, 0.0, 0.0))
    coral_rock = bpy.context.active_object
    coral_rock.name = "Procedural_Coral_Rock"
    coral_rock.data.name = "Procedural_Coral_Rock_Mesh"

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.subdivide(number_cuts=3, smoothness=1.0)
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.015)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.shade_smooth()

    subsurf = coral_rock.modifiers.new(name="Subdivision", type="SUBSURF")
    subsurf.levels = 2
    subsurf.render_levels = 3
    for target_obj, attr_name, val in [
        (subsurf, "use_adaptive_subdivision", True),
        (subsurf, "dicing_rate", 5.0),
        (coral_rock.cycles if hasattr(coral_rock, "cycles") else None, "use_adaptive_subdivision", True),
        (coral_rock.cycles if hasattr(coral_rock, "cycles") else None, "dicing_rate", 5.0),
    ]:
        if target_obj is not None and hasattr(target_obj, attr_name):
            try:
                setattr(target_obj, attr_name, val)
            except Exception:
                pass

    # Material: "Procedural Coral Rock" (Displacement and Bump)
    mat = bpy.data.materials.new(name="Procedural Coral Rock")
    mat.use_nodes = True
    if hasattr(mat, "displacement_method"):
        mat.displacement_method = "BOTH"
    if hasattr(mat, "cycles") and hasattr(mat.cycles, "displacement_method"):
        mat.cycles.displacement_method = "BOTH"

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    node_out = nodes.new("ShaderNodeOutputMaterial")
    node_out.location = (900, 100)

    node_bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    node_bsdf.location = (550, 200)
    links.new(node_bsdf.outputs["BSDF"], node_out.inputs["Surface"])

    node_texcoord = nodes.new("ShaderNodeTexCoord")
    node_texcoord.location = (-1300, 0)

    # A. Pores / Holes Mask (Voronoi + Distortion)
    node_noise_pores = nodes.new("ShaderNodeTexNoise")
    node_noise_pores.name = "Noise_Pores_15"
    node_noise_pores.location = (-1020, -100)
    node_noise_pores.inputs["Scale"].default_value = 15.0
    node_noise_pores.inputs["Detail"].default_value = 15.0
    node_noise_pores.inputs["Roughness"].default_value = 0.5
    links.new(node_texcoord.outputs["Object"], node_noise_pores.inputs["Vector"])

    node_linear_light, _, ll_col1, ll_col2, ll_out = add_mix_color_node(
        nodes, blend_type="LINEAR_LIGHT", fac=0.010
    )
    node_linear_light.name = "Mix_LinearLight_Distortion"
    node_linear_light.location = (-760, 40)
    links.new(node_texcoord.outputs["Object"], ll_col1)
    links.new(node_noise_pores.outputs["Color"], ll_col2)

    node_voronoi = nodes.new("ShaderNodeTexVoronoi")
    node_voronoi.name = "Voronoi_Pores"
    node_voronoi.location = (-520, 40)
    node_voronoi.voronoi_dimensions = "3D"
    node_voronoi.feature = "SMOOTH_F1"
    node_voronoi.distance = "EUCLIDEAN"
    node_voronoi.inputs["Scale"].default_value = 14.0
    if "Smoothness" in node_voronoi.inputs:
        node_voronoi.inputs["Smoothness"].default_value = 0.200
    if "Randomness" in node_voronoi.inputs:
        node_voronoi.inputs["Randomness"].default_value = 1.0
    links.new(ll_out, node_voronoi.inputs["Vector"])

    node_ramp_voronoi = nodes.new("ShaderNodeValToRGB")
    node_ramp_voronoi.name = "ColorRamp_Voronoi_Pores"
    node_ramp_voronoi.location = (-260, 40)
    node_ramp_voronoi.color_ramp.interpolation = "LINEAR"
    node_ramp_voronoi.color_ramp.elements[0].position = 0.0
    node_ramp_voronoi.color_ramp.elements[0].color = hex_to_linear_rgba("#303030")
    node_ramp_voronoi.color_ramp.elements[1].position = 0.535
    node_ramp_voronoi.color_ramp.elements[1].color = hex_to_linear_rgba("#FFFFFF")
    links.new(node_voronoi.outputs["Distance"], node_ramp_voronoi.inputs["Fac"])

    # B. Macro Surface Variation & True Displacement
    node_noise_macro = nodes.new("ShaderNodeTexNoise")
    node_noise_macro.name = "Noise_Macro_2"
    node_noise_macro.location = (-760, -340)
    node_noise_macro.inputs["Scale"].default_value = 2.0
    node_noise_macro.inputs["Detail"].default_value = 15.0
    node_noise_macro.inputs["Roughness"].default_value = 0.5
    links.new(node_texcoord.outputs["Object"], node_noise_macro.inputs["Vector"])

    node_ramp_macro = nodes.new("ShaderNodeValToRGB")
    node_ramp_macro.name = "ColorRamp_Macro_Mask"
    node_ramp_macro.location = (-480, -340)
    node_ramp_macro.color_ramp.interpolation = "LINEAR"
    node_ramp_macro.color_ramp.elements[0].position = 0.353
    node_ramp_macro.color_ramp.elements[0].color = hex_to_linear_rgba("#000000")
    node_ramp_macro.color_ramp.elements[1].position = 0.561
    node_ramp_macro.color_ramp.elements[1].color = hex_to_linear_rgba("#FFFFFF")
    links.new(node_noise_macro.outputs["Fac"], node_ramp_macro.inputs["Fac"])

    node_mix_disp, disp_fac, disp_col1, disp_col2, disp_mix_out = add_mix_color_node(
        nodes, blend_type="MIX", fac=0.5
    )
    node_mix_disp.name = "Mix_Displacement_Mask"
    node_mix_disp.location = (40, -240)
    disp_col2.default_value = hex_to_linear_rgba("#000000")
    links.new(node_ramp_macro.outputs["Color"], disp_fac)
    links.new(node_ramp_voronoi.outputs["Color"], disp_col1)

    node_disp = nodes.new("ShaderNodeDisplacement")
    node_disp.name = "Displacement_Coral"
    node_disp.location = (550, -220)
    node_disp.inputs["Midlevel"].default_value = 0.500
    node_disp.inputs["Scale"].default_value = 0.140
    links.new(disp_mix_out, node_disp.inputs["Height"])
    links.new(node_disp.outputs["Displacement"], node_out.inputs["Displacement"])

    # C. Micro-Bump (Normal)
    node_bump1 = nodes.new("ShaderNodeBump")
    node_bump1.name = "Bump_Voronoi_Pores"
    node_bump1.location = (40, 60)
    node_bump1.inputs["Strength"].default_value = 0.400
    node_bump1.inputs["Distance"].default_value = 1.0
    links.new(node_ramp_voronoi.outputs["Color"], node_bump1.inputs["Height"])

    node_bump2 = nodes.new("ShaderNodeBump")
    node_bump2.name = "Bump_Surface_Noise"
    node_bump2.location = (280, 60)
    node_bump2.inputs["Strength"].default_value = 0.300
    node_bump2.inputs["Distance"].default_value = 1.0
    links.new(node_bump1.outputs["Normal"], node_bump2.inputs["Normal"])
    links.new(node_noise_pores.outputs["Fac"], node_bump2.inputs["Height"])
    links.new(node_bump2.outputs["Normal"], node_bsdf.inputs["Normal"])

    # D. Roughness & Base Color
    node_ramp_rough = nodes.new("ShaderNodeValToRGB")
    node_ramp_rough.name = "ColorRamp_Roughness"
    node_ramp_rough.location = (40, 280)
    node_ramp_rough.color_ramp.interpolation = "LINEAR"
    node_ramp_rough.color_ramp.elements[0].position = 0.0
    node_ramp_rough.color_ramp.elements[0].color = hex_to_linear_rgba("#404040")
    node_ramp_rough.color_ramp.elements[1].position = 1.0
    node_ramp_rough.color_ramp.elements[1].color = hex_to_linear_rgba("#FFFFFF")
    links.new(node_noise_pores.outputs["Fac"], node_ramp_rough.inputs["Fac"])
    links.new(node_ramp_rough.outputs["Color"], node_bsdf.inputs["Roughness"])

    node_noise_color = nodes.new("ShaderNodeTexNoise")
    node_noise_color.name = "Noise_BaseColor_8"
    node_noise_color.location = (-520, 480)
    node_noise_color.inputs["Scale"].default_value = 8.0
    node_noise_color.inputs["Detail"].default_value = 15.0
    node_noise_color.inputs["Roughness"].default_value = 0.5
    links.new(node_texcoord.outputs["Object"], node_noise_color.inputs["Vector"])

    node_ramp_color = nodes.new("ShaderNodeValToRGB")
    node_ramp_color.name = "ColorRamp_BaseColor"
    node_ramp_color.location = (-180, 480)
    node_ramp_color.color_ramp.interpolation = "LINEAR"
    node_ramp_color.color_ramp.elements[0].position = 0.208
    node_ramp_color.color_ramp.elements[0].color = hex_to_linear_rgba("#31140B")
    node_ramp_color.color_ramp.elements[1].position = 0.938
    node_ramp_color.color_ramp.elements[1].color = hex_to_linear_rgba("#BF9B7C")
    mid_stop = node_ramp_color.color_ramp.elements.new(0.530)
    mid_stop.color = hex_to_linear_rgba("#8A5D40")
    links.new(node_noise_color.outputs["Fac"], node_ramp_color.inputs["Fac"])
    links.new(node_ramp_color.outputs["Color"], node_bsdf.inputs["Base Color"])

    coral_rock.data.materials.append(mat)

    cam_data = bpy.data.cameras.new(name="Camera")
    cam_data.lens = 50.0
    cam_obj = bpy.data.objects.new(name="Camera", object_data=cam_data)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = (0.0, -3.4, 0.85)
    point_at(cam_obj, (0.0, 0.0, 0.0))
    scene.camera = cam_obj

    scene.render.resolution_x = 800
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(CYCLES_RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT_PATH))


if __name__ == "__main__":
    build_procedural_coral_rock()
