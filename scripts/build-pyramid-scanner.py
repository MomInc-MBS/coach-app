# Pyramid food scanner GLB (run: blender -b -P scripts/build-pyramid-scanner.py -- food/pyramid-scanner.glb 0.2): decimate, split dials, add screen planes + lens node.
import bpy, bmesh, math, json, sys
from mathutils import Vector
from mathutils.geometry import intersect_line_plane
SRC=r"C:/Users/ianmy/Downloads/pyramid+nutrition+robot+3d+model.glb"
OUT=sys.argv[sys.argv.index('--')+1]
RATIO=float(sys.argv[sys.argv.index('--')+2])
KNOB_R=0.046
S=1.15/800  # ortho_scale / px, matches render.py
SCREENS={  # name box nudged right to cover the bezel
  # view-0 pixel boxes (x0,y0,x1,y1) of the baked screens
 'screen_name':(350,240,461,318),'screen_calories':(320,339,395,400),'screen_protein':(403,339,480,400),
 'screen_fat':(286,418,352,490),'screen_carbs':(366,418,435,490),'screen_vitamins':(446,418,514,490)}
LENS=(0,400,128)
# dial cap centres + axes (Blender coords), measured head-on in dial.py/prof.py
DIALS=[((0.2539,-0.1033,0.4261),(0.845,-0.34,0.414)),((-0.2497,-0.0937,0.4257),(-0.877,-0.289,0.385)),((0.1157,0.2132,0.4222),(0.133,0.895,0.426))]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc=bpy.context.scene
body=[o for o in sc.objects if o.type=='MESH'][0]; body.name='body'
bpy.context.view_layer.objects.active=body; body.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
m=body.modifiers.new('d','DECIMATE'); m.ratio=RATIO; bpy.ops.object.modifier_apply(modifier='d')
dg=bpy.context.evaluated_depsgraph_get()

def ray(view,px,py):
    r=math.radians(view); loc=Vector((2*math.sin(r),-2*math.cos(r),0.55))
    fwd=(Vector((0,0,0.49))-loc).normalized(); right=fwd.cross(Vector((0,0,1))).normalized(); up=right.cross(fwd)
    return loc+right*(px-400)*S+up*(400-py)*S, fwd
def hit(view,px,py):
    o,d=ray(view,px,py); h,p,n,*_=sc.ray_cast(dg,o,d)
    assert h,(view,px,py); return p,n
gl=lambda v:[round(v.x,5),round(v.z,5),round(-v.y,5)]  # Blender Z-up -> glTF Y-up

# screens: plane from interior hits, corners = corner rays hitting that plane, lifted 2mm
for name,(x0,y0,x1,y1) in SCREENS.items():
    x0,y0,x1,y1=x0-3,y0-3,x1+3,y1+3
    pts=[hit(0,x0+(x1-x0)*fx,y0+(y1-y0)*fy) for fx in (.25,.5,.75) for fy in (.25,.5,.75)]
    c=sum((p for p,_ in pts),Vector())/len(pts); n=sum((q for _,q in pts),Vector()).normalized()
    c=c+n*0.005
    corners=[intersect_line_plane(o,o+d,c,n) for o,d in (ray(0,x,y) for x,y in ((x0,y1),(x1,y1),(x1,y0),(x0,y0)))]
    # push any body geometry in front of the screen (raised apple, bezel lips) 1mm behind it
    e1=corners[1]-corners[0]; e2=corners[3]-corners[0]
    for v in body.data.vertices:
        d=v.co-corners[0]; u=d.dot(e1)/e1.length_squared; w=d.dot(e2)/e2.length_squared; h=(v.co-c).dot(n)
        if 0.03<u<0.97 and 0.03<w<0.97 and -0.001<h<0.03: v.co-=n*(h+0.001)
    me=bpy.data.meshes.new(name); me.from_pydata([v-c for v in corners],[],[(0,1,2,3)])
    uv=me.uv_layers.new(); [setattr(uv.data[i],'uv',t) for i,t in enumerate(((0,0),(1,0),(1,1),(0,1)))]
    mat=bpy.data.materials.get('screen') or bpy.data.materials.new('screen'); me.materials.append(mat)
    ob=bpy.data.objects.new(name,me); ob.location=c; sc.collection.objects.link(ob)
    ob['normal']=gl(n)

p,n=hit(*LENS); lens=bpy.data.objects.new('lens',None); lens.location=p; lens['normal']=gl(n); lens['radius']=0.03
sc.collection.objects.link(lens)

# dials: split faces inside a cylinder around each dial normal
found=[(Vector(c),Vector(n).normalized()) for c,n in DIALS]
bpy.context.view_layer.objects.active=body
for i,(c,n) in enumerate(found):
    bpy.ops.object.mode_set(mode='EDIT'); bm=bmesh.from_edit_mesh(body.data)
    for f in bm.faces: f.select=False
    def inside(v):
        d=v.co-c; a=d.dot(n); return -0.016<a<0.012 and (d-n*a).length<KNOB_R
    for f in bm.faces:
        if all(inside(v) for v in f.verts): f.select=True
    bmesh.update_edit_mesh(body.data); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    k=[o for o in bpy.context.selected_objects if o is not body][0]; k.name=f'knob_{i}'; k.select_set(False)
    k.data.transform(__import__('mathutils').Matrix.Translation(-c)); k.location=c
    k['axis']=gl(n); body.select_set(True)
print('KNOBS',len(found),[gl(c) for c,_ in found])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_extras=True,export_yup=True,use_selection=False)
