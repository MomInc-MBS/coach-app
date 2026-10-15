# Renders a GLB to an 8-frame rotation sheet of 64px cells (512x64, nearest-neighbour look, transparent).
# Run: blender -b -P tools/render_slice_sprites.py -- <input.glb> <id> [outdir=arcade/slice/sprites]
# Placeholder: reward-assets/canister.glb -> canister. Ian's Tripo models: D:/Tripo Pilot/results/fruit-ninja/<id>.glb -> <id>.
import bpy, sys, os, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, ident = args[0], args[1]
out = os.path.abspath(args[2] if len(args) > 2 else 'arcade/slice/sprites')
CELL, FRAMES = 64, 8
os.makedirs(out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pivot = bpy.data.objects.new('pivot', None)
bpy.context.scene.collection.objects.link(pivot)
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
mid, span = (lo + hi) / 2, (hi - lo)
pivot.location = mid
bpy.context.view_layer.update()
for o in bpy.context.scene.objects:
    if o is not pivot and o.parent is None:
        m = o.matrix_world.copy()
        o.parent = pivot
        o.matrix_parent_inverse = pivot.matrix_world.inverted()
        o.matrix_world = m

s = bpy.context.scene
s.render.engine = 'BLENDER_WORKBENCH'
s.render.film_transparent = True
s.render.resolution_x = s.render.resolution_y = CELL
s.render.resolution_percentage = 100
s.render.filter_size = 0
s.display.render_aa = 'OFF'
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGBA'
s.view_settings.view_transform = 'Standard'
d = s.display.shading
d.light = 'STUDIO'
d.color_type = 'TEXTURE'
d.show_cavity = False
d.show_shadows = False

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
bpy.context.scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'
cam.data.ortho_scale = max(span.x, span.y, span.z) * 1.35
dist = max(span) * 4
tilt = math.radians(70)  # slightly above the equator so the spin reads in 3D
cam.location = mid + Vector((0, -math.sin(tilt) * dist, math.cos(tilt) * dist))
direction = mid - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
s.camera = cam

sheet = [0.0] * (CELL * FRAMES * CELL * 4)
for i in range(FRAMES):
    pivot.rotation_euler = (0, 0, i * 2 * math.pi / FRAMES)
    s.render.filepath = os.path.join(out, f'_{ident}_{i}.png')
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(s.render.filepath)
    px = list(img.pixels)
    for y in range(CELL):
        row = px[y * CELL * 4:(y + 1) * CELL * 4]
        start = (y * CELL * FRAMES + i * CELL) * 4
        sheet[start:start + CELL * 4] = row
    bpy.data.images.remove(img)
    os.remove(s.render.filepath)

result = bpy.data.images.new(ident, CELL * FRAMES, CELL, alpha=True)
result.pixels = sheet
result.filepath_raw = os.path.join(out, f'{ident}.png')
result.file_format = 'PNG'
result.save()
print('wrote', result.filepath_raw)
