# Starter ship GLB for Original MYR5: initialScene(fresh recipe) picks 'supportive' (coach 'supportive').
# run: blender -b -P scripts/build-starter-ship.py -- D:/coach-merge/creature/models/ships/supportive.glb pod/worlds/starter/supportive.glb 0.04 512
# Decimates the Tripo mesh, shrinks textures (colour TEX px, normal/metal-rough TEX/2) and exports WebP textures
# (EXT_texture_webp, which GLTFLoader reads natively). Node, mesh and material names are kept as imported.
# The other starter files are plain encodes/copies (PIL): pod/worlds/great-wall.webp = great-wall.png at WebP q90 m6;
# pod/worlds/starter/<wonder>.webp = plan/assets-inbox/backgrounds/clean/<wonder>.webp unchanged.
import bpy, bmesh, sys
SRC, OUT, RATIO, TEX = (lambda a: (a[0], a[1], float(a[2]), int(a[3])))(sys.argv[sys.argv.index('--') + 1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for ob in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    bpy.context.view_layer.objects.active = ob
    # weld the split seams first: open seam boundaries stop decimate collapsing below ~9k tris
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); bm.to_mesh(ob.data); bm.free()
    m = ob.modifiers.new('decimate', 'DECIMATE'); m.ratio = RATIO; m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=m.name)
    print('TRIS', ob.name, len(ob.data.polygons))
colour = {n.image.name for mat in bpy.data.materials if mat.node_tree for n in mat.node_tree.nodes
          if n.type == 'TEX_IMAGE' and n.image and any(l.to_socket.name == 'Base Color' for l in n.outputs[0].links)}
for img in bpy.data.images:
    size = TEX if img.name in colour else TEX // 2
    if img.size[0] > size: img.scale(size, size)
    print('IMAGE', img.name, tuple(img.size))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_image_format='WEBP', export_image_quality=80)
