# Blender side of tools/pixel_coaches.py. Run: blender -b -P this.py -- jobs.json outdir
# Renders each coach GLB orthographic at 8x target size: shade.png (studio light, white clay)
# and mask.png (R=body, G=head), plus meta.json {uv of eye_anchor, flip}.
import bpy, sys, json, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

SS = 8
jobs = json.load(open(sys.argv[sys.argv.index('--') + 1]))
out = sys.argv[sys.argv.index('--') + 2]
# kind -> frame w,h, fit-box w,h, baseline y (px from top)
FRAME = {'body': (64, 96, 60, 88, 92), 'pet': (32, 24, 30, 20, 22)}


def region(o):
    p = o.parent.name if o.parent else ''
    return 'head' if o.name.startswith('head') or p == 'head' else 'body'


def setup(shade):
    s = bpy.context.scene
    s.render.engine = 'BLENDER_WORKBENCH'
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    d = s.display.shading
    d.show_cavity = False
    d.show_shadows = False
    d.show_object_outline = False
    d.show_specular_highlight = False
    if shade:
        d.light = 'STUDIO'
        d.color_type = 'SINGLE'
        d.single_color = (0.8, 0.8, 0.8)
        s.display.render_aa = '8'
    else:
        d.light = 'FLAT'
        d.color_type = 'OBJECT'
        s.display.render_aa = 'OFF'


for job in jobs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=job['glb'])
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in meshes:
        o.color = (0, 1, 0, 1) if region(o) == 'head' else (1, 0, 0, 1)
    s = bpy.context.scene
    bpy.context.view_layer.update()
    fw, fh, bw, bh, base = FRAME[job['kind']]
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    s.collection.objects.link(cam)
    s.camera = cam
    cam.data.type = 'ORTHO'
    s.render.resolution_x = fw * SS
    s.render.resolution_y = fh * SS

    def corners(objs):
        return [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]

    pts = corners(meshes)
    flip = False
    cam.rotation_euler = (1.5708, 0, 0)
    if job['kind'] == 'pet':
        # Side-on: look across the longer horizontal axis, pick the side that puts the head screen-right.
        ex = max(p.x for p in pts) - min(p.x for p in pts)
        ey = max(p.y for p in pts) - min(p.y for p in pts)
        spins = (-1.5708, 1.5708) if ey >= ex else (0, 3.14159)
        hs = [o for o in meshes if region(o) == 'head']
        bs = [o for o in meshes if region(o) == 'body']
        cam.rotation_euler = (1.5708, 0, spins[0])
        if hs and bs:
            bpy.context.view_layer.update()
            rt = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
            hc, bc = corners(hs), corners(bs)
            if sum(p.dot(rt) for p in hc) / len(hc) < sum(p.dot(rt) for p in bc) / len(bc):
                flip = True
                cam.rotation_euler = (1.5708, 0, spins[1])
    bpy.context.view_layer.update()
    R = cam.matrix_world.to_3x3()
    right, up, fwd = R @ Vector((1, 0, 0)), R @ Vector((0, 1, 0)), R @ Vector((0, 0, -1))
    xs = [p.dot(right) for p in pts]
    ys = [p.dot(up) for p in pts]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    px = min(bw / w, bh / h)  # target pixels per world unit
    cx = (max(xs) + min(xs)) / 2
    cy = min(ys) + (base - fh / 2) / px  # frame centre sits (base - fh/2) px above the model bottom
    cam.data.ortho_scale = max(fw, fh) / px
    cam.location = right * cx + up * cy - fwd * 50
    bpy.context.view_layer.update()
    anchor = bpy.data.objects.get('eye_anchor')
    uv = None
    if anchor:
        v = world_to_camera_view(s, cam, anchor.matrix_world.translation)
        uv = [v.x, 1 - v.y]
    d = os.path.join(out, job['slug'])
    os.makedirs(d, exist_ok=True)
    for shade, name in ((True, 'shade.png'), (False, 'mask.png')):
        setup(shade)
        s.render.filepath = os.path.join(d, name)
        bpy.ops.render.render(write_still=True)
    json.dump({'uv': uv, 'flip': flip}, open(os.path.join(d, 'meta.json'), 'w'))
    print('RENDERED', job['slug'])
