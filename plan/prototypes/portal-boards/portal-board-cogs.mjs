// cogs board effect for portal-board-glb.mjs — the steampunk door's own mechanism spins in place:
// the big ship's-wheel valve, the small 8-spoke gear under it and the knurled knob under that are
// one meshed gear train (wheel drives the small gear, the small gear drives the knob — opposite
// spin, equal rim speed at each mesh). At init each gear's triangles (all three vertices inside its
// disc and above the slab) are split out of the door mesh into their own mesh on a pivot and
// rotated as objects; boundary triangles stay with the door, so nothing ever stretches. The train's
// ratio/friction math is plain JS below so it can be unit-tested without three.js.
//
// Extra cogs (COGS) sit ON the door face and join the same train, so dragging any of them turns
// everything. Each shows a procedural brass placeholder (gearGeometry) until its model loads.
// Cog asset spec — `asset` is 'file.glb#node' (a kit) or 'file.glb' (its first mesh):
//  - kit: ONE GLB under /pod/worlds/boards/cogs/ (cog-kit.glb, <= 1 MB) holding named meshes
//    (glTF node names, e.g. g05, m03), each <= 2000 triangles; loaded once per file however many
//    slots use it; the named mesh's geometry/material are shared, not copied
//  - each mesh centred on its axle, axle = its thinnest bbox dimension (glTF +Z; turned to +Z here)
//  - scaled so its face-plane bbox radius = the slot's r * face width
//  - tooth count isn't read from the model: the slot's `teeth` sets the starting half-tooth offset
//  - a missing file or node keeps the placeholder and console.warns
// AGPL-3.0-or-later.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {orientMatrix,pointInPolygon} from './portal-board-glb.mjs';

// Centres measured on cogs.glb's own geometry (centroid of each part's raised hub vertices, in
// face coords: u right, v down, 0..1 across the face) and checked on the rendered door; r = radius
// as a fraction of face WIDTH. The old v .69/.82 for the small gear/knob sat half a part too low.
// `drives` names the index this gear meshes with (null = the train's root, the one
// torque/friction accumulates on).
// teeth on the door's own parts only phases the cogs meshed onto them (they are spoked, not toothed).
// Radii sit on the round part that actually spins, inside its housing: the stationary hex-bracket
// fitting around each wheel is not circularly symmetric, so it must stay with the door.
export const GEARS=[
 {u:.50,v:.44,r:.19,teeth:8,drives:null}, // big spoked wheel/valve, centre of the door
 {u:.50,v:.635,r:.1,teeth:8,drives:0},    // small 8-spoke gear, meshed under the wheel
 {u:.50,v:.757,r:.06,teeth:6,drives:1},   // knurled knob, meshed under the small gear
];
const TAU=Math.PI*2,FRICTION=1.6,REST=.02,TAP_IMPULSE=4,DRAG_GAIN=1,MOVE_EPS=.006,RAISED_FRAC=.8;
// Cog tooth pitch (arc length per tooth on the pitch circle, in face widths): teeth = TAU*r/PITCH,
// so radii are multiples of 1/200 and every meshing pair shares the pitch exactly.
export const PITCH=TAU/200,ADDENDUM=.35*PITCH;
export const teethFor=(r,pitch=PITCH)=>Math.round(TAU*r/pitch);
// cogs.glb's face height/width (measured from the GLB's bounds) — the layout self-check's only use.
export const ASPECT=.9793206/.586624;
// Extra cogs, indices 3.. in the combined train [...GEARS,...COGS]; `drives` = the train index it
// meshes with (always an earlier one), sitting r_parent+r_self away on the face. Models are Ian's
// kit, picked by shape (g03 pipe, g05 lanterns, m03 spike, m17 plate aren't cogs); m10 is a spare ship's-wheel valve.
const KIT='./pod/worlds/boards/cogs/cog-kit.glb#';
export const COGS=[
 {id:'wheel-left',u:.23,v:.44,r:.08,teeth:16,asset:KIT+'g04',drives:0},   // 3: left of the wheel, on the left rail
 {id:'wheel-right',u:.77,v:.44,r:.08,teeth:16,asset:KIT+'g02',drives:0},  // 4: right of the wheel, on the right rail
 {id:'rail-left-1',u:.23,v:.518,r:.05,teeth:10,asset:KIT+'m14',drives:3}, // 5-7: chain down the left rail
 {id:'rail-left-2',u:.23,v:.59,r:.07,teeth:14,asset:KIT+'m12',drives:5},
 {id:'rail-left-3',u:.23,v:.659,r:.045,teeth:9,asset:KIT+'m09',drives:6},
 {id:'idler-right',u:.77,v:.365,r:.045,teeth:9,asset:KIT+'m04',drives:4}, // 8: small idler up the right rail
 {id:'big-right',u:.77,v:.272,r:.11,teeth:22,asset:KIT+'m06',drives:8},   // 9: the big spoked one, top right
];
// ponytail: hard speed cap, not a torque/inertia model — keeps a wild flick from strobing the
// spokes; raise if a real finger drag ever feels clipped (touchmove deltas are small per event).
const MAX_OMEGA=12;
// Portal cut: gears whose centre is inside the traced shape sink/tilt/shrink away with the board's
// falling piece (same ease-in, drop and tilt as its fallPieces), and come back on heal.
const FALL_MS=1100,FALL_TILT=35*Math.PI/180;

// --- Pure train kinematics (unit-tested; no THREE/DOM) --------------------------------------
// Walks a gear's `drives` chain to the train's root and returns {root,ratio} such that, once
// settled, gears[i].omega === ratio*gears[root].omega (each mesh flips sign: ratio *= -r[parent]/r[self]).
function rootRatio(gears,i){
 let idx=i,ratio=1;
 while(gears[idx].drives!=null){const p=gears[idx].drives;ratio*=-gears[p].r/gears[idx].r;idx=p;}
 return {root:idx,ratio};
}
// Adds torque/impulse `omega` at gear i, converted to the equivalent change at the train's root —
// a rigidly meshed train shares one momentum, so nudging any gear nudges the whole train.
export function applyTorque(gears,i,omega){
 const {root,ratio}=rootRatio(gears,i);
 const r=gears[root];
 r.omega=Math.max(-MAX_OMEGA,Math.min(MAX_OMEGA,r.omega+omega/ratio));
}
// Friction on the root only, then every meshed gear's speed is re-derived from it and angles
// integrate. Returns true while the train is still moving fast enough to bother rendering.
export function stepTrain(gears,dt){
 for(const g of gears)if(g.drives==null)g.omega*=Math.exp(-dt*FRICTION);
 for(const g of gears){
  if(g.drives!=null){const p=gears[g.drives];g.omega=-p.omega*p.r/g.r;}
  g.angle+=g.omega*dt;
 }
 return gears.some(g=>Math.abs(g.omega)>REST);
}
// Starting angle for child c so its gap faces parent p's tooth on the line between centres. With a
// shared pitch the two tooth fractions at that contact point always sum to the same value while the
// train turns, so starting them at .5 keeps the teeth interleaved forever. aspect = face h/w.
export function meshPhase(p,c,aspect){
 const th=Math.atan2((p.v-c.v)*aspect,c.u-p.u),fp=(th-p.angle)*p.teeth/TAU;
 return th+Math.PI-(.5-fp)*TAU/c.teeth;
}
// A triangle belongs to a gear only if all three vertices are inside its disc (centre {x,y},
// radius, mesh-local units) and above the slab (z > zMin); anything straddling stays with the door.
export function triangleInGear(ax,ay,az,bx,by,bz,cx,cy,cz,centre,radius,zMin){
 const r2=radius*radius,inside=(x,y,z)=>z>zMin&&(x-centre.x)**2+(y-centre.y)**2<r2;
 return inside(ax,ay,az)&&inside(bx,by,bz)&&inside(cx,cy,cz);
}

// --- Effect glue -------------------------------------------------------------------------------
let S=null; // per-instance state; one portal board is ever active at once

// Placeholder cog: pitch radius r, trapezoid teeth, bored, extruded `depth` centred on z=0.
export function gearGeometry(THREE,{r,teeth,depth}){
 const step=TAU/teeth,add=.35*TAU*r/teeth,shape=new THREE.Shape();
 for(let k=0;k<teeth;k++)for(const [rr,f] of [[r-add,-.3],[r+add,-.14],[r+add,.14],[r-add,.3]]){
  const a=(k+f)*step,x=rr*Math.cos(a),y=rr*Math.sin(a);k||f!==-.3?shape.lineTo(x,y):shape.moveTo(x,y);
 }
 // centre bore + four lightening holes (they also make the spin readable on a symmetric placeholder)
 for(const [x,y,hr] of [[0,0,.22],[.5,0,.13],[0,.5,.13],[-.5,0,.13],[0,-.5,.13]]){const h=new THREE.Path();h.absarc(x*r,y*r,hr*r,0,TAU,true);shape.holes.push(h);}
 const bevel=depth*.08,g=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:add*.15,bevelSegments:1,curveSegments:12});
 return g.translate(0,0,bevel-depth/2);
}
// One GLTFLoader promise per file, so every slot using the kit shares a single load.
const models=new Map();
const loadModel=url=>models.get(url)??models.set(url,new GLTFLoader().loadAsync(url)).get(url);
// Swap a cog's placeholder for its model (shared geometry/material; the fit lives on the mesh's
// matrix): thin axis -> +Z, centred on its bbox, face-plane bbox radius = r*fw, resting on zTop.
function loadCog(pivot,c,fw,zTop){
 const [url,name]=c.asset.split('#');
 loadModel(url).then(gltf=>{
  if(!S?.pivots.includes(pivot))return; // board went away mid-load
  gltf.scene.updateMatrixWorld(true);
  let src=null;(name?gltf.scene.getObjectByName(name):gltf.scene)?.traverse(o=>{if(o.isMesh&&!src)src=o;});
  if(!src)throw new Error('no mesh '+(name||''));
  const box=new THREE.Box3().setFromObject(src),R=orientMatrix(box.getSize(new THREE.Vector3()));
  const rot=new THREE.Matrix4().set(...R[0],0,...R[1],0,...R[2],0,0,0,0,1);
  box.applyMatrix4(rot);
  const size=box.getSize(new THREE.Vector3()),k=c.r*fw/(Math.max(size.x,size.y)/2),ctr=box.getCenter(new THREE.Vector3());
  const m=new THREE.Mesh(src.geometry,src.material);m.frustumCulled=false;m.matrixAutoUpdate=false;
  m.matrix.makeScale(k,k,k).multiply(new THREE.Matrix4().makeTranslation(-ctr.x,-ctr.y,-ctr.z)).multiply(rot).multiply(src.matrixWorld);
  const old=pivot.children[0];pivot.remove(old);old.geometry.dispose();pivot.add(m);S.mats.push(...[src.material].flat());
  pivot.position.z=zTop+size.z*k/2;S.wake?.();
 }).catch(e=>console.warn('portal-board-cogs: keeping placeholder for',c.asset,e));
}

function hitGear(u,v){
 let best=-1,bestT=1;
 for(let i=0;i<S.gears.length;i++){
  if(S.fall?.gears.has(i))continue; // gone with the cut piece
  const g=S.gears[i],dx=(u-g.u)*S.face.w,dy=(v-g.v)*S.face.h,t=Math.hypot(dx,dy)/(g.r*S.face.w);
  if(t<1&&t<bestT){bestT=t;best=i;}
 }
 return best;
}

// Geometry surgery, once: each gear's triangles move to their own index over the SAME attribute
// buffers, under a pivot at the gear centre (mesh-local units) in the fitted group; the door keeps
// the rest. Gears get a plain clone of the door material, taken before the board injects its
// paint/glow/dent (that happens after init returns): pure brass, and the guides stay on the door.
function init({mesh,material,face,wake}){
 const gearMat=material.clone();
 const geo=mesh.geometry,p=geo.attributes.position.array,fw=face.w,fh=face.h;
 geo.computeBoundingBox();const bb=geo.boundingBox,zMin=bb.min.z+(bb.max.z-bb.min.z)*RAISED_FRAC; // heuristic slab/raised split
 let rest=geo.index?Array.from(geo.index.array):[...Array(p.length/3).keys()];
 const pivots=GEARS.map(g=>{
  const c={x:(g.u-.5)*fw,y:(.5-g.v)*fh},tri=[],keep=[];
  for(let i=0;i<rest.length;i+=3){const a=rest[i]*3,b=rest[i+1]*3,d=rest[i+2]*3;(triangleInGear(p[a],p[a+1],p[a+2],p[b],p[b+1],p[b+2],p[d],p[d+1],p[d+2],c,g.r*fw,zMin)?tri:keep).push(rest[i],rest[i+1],rest[i+2]);}
  rest=keep;
  const gg=new THREE.BufferGeometry();for(const k in geo.attributes)gg.setAttribute(k,geo.attributes[k]);gg.setIndex(tri);
  const gm=new THREE.Mesh(gg,gearMat),pivot=new THREE.Group();
  gm.frustumCulled=false;gm.position.set(-c.x,-c.y,0);pivot.position.set(c.x,c.y,0);pivot.add(gm);mesh.parent.add(pivot);
  return pivot;
 });
 geo.setIndex(rest);
 // Extra cogs: placeholder brass on a pivot resting on the door surface under its disc; teeth phased
 // to interleave with the parent (parents come first in the list, so their angle is already set).
 const gears=[...GEARS,...COGS].map(g=>({...g,angle:0,omega:0})),aspect=fh/fw;
 const brass=[new THREE.MeshStandardMaterial({color:'#b8894a',metalness:.5,roughness:.35}),new THREE.MeshStandardMaterial({color:'#8a6436',metalness:.5,roughness:.4})];
 COGS.forEach((c,j)=>{
  const g=gears[GEARS.length+j],x=(c.u-.5)*fw,y=(.5-c.v)*fh,rad=(c.r+ADDENDUM)*fw,depth=.35*c.r*fw;
  let zTop=-Infinity;for(let i=0;i<p.length;i+=3)if(p[i+2]>zTop&&(p[i]-x)**2+(p[i+1]-y)**2<rad*rad)zTop=p[i+2];
  if(zTop===-Infinity)zTop=bb.max.z;
  g.angle=meshPhase(gears[c.drives],g,aspect);
  const m=new THREE.Mesh(gearGeometry(THREE,{r:c.r*fw,teeth:c.teeth,depth}),brass[j%2]),pivot=new THREE.Group();
  m.frustumCulled=false;pivot.position.set(x,y,zTop+depth/2);pivot.rotation.z=g.angle;pivot.add(m);mesh.parent.add(pivot);
  pivots.push(pivot);
  if(c.asset)loadCog(pivot,c,fw,zTop);
 });
 S={gears,face,pivots,mats:[gearMat,...brass],drag:new Map(),wake};
}
function press(id,u,v){S.drag.set(id,{gi:hitGear(u,v),moved:false});}
function move(id,u,v,pu,pv){
 const d=S.drag.get(id);if(!d)return;
 if(Math.hypot(u-pu,v-pv)>MOVE_EPS)d.moved=true;
 if(d.gi<0)return;
 const g=S.gears[d.gi],rx=(u-g.u)*S.face.w,ry=-(v-g.v)*S.face.h,dx=(u-pu)*S.face.w,dy=-(v-pv)*S.face.h,rw=g.r*S.face.w;
 applyTorque(S.gears,d.gi,(rx*dy-ry*dx)/(rw*rw)*DRAG_GAIN);
}
function release(id){
 const d=S.drag.get(id);if(!d)return;
 if(!d.moved&&d.gi>=0)applyTorque(S.gears,d.gi,TAP_IMPULSE);
 S.drag.delete(id);
}
function step(dt,now){
 const moving=stepTrain(S.gears,dt);
 S.gears.forEach((g,i)=>{S.pivots[i].rotation.z=g.angle%TAU;});
 const f=S.fall,t=f?Math.min(1,(now-f.t0)/Math.max(1,f.ms)):1,e=t*t;
 if(f)for(const [i,z0] of f.gears){const p=S.pivots[i];p.position.z=z0-f.dist*e;p.rotation.x=FALL_TILT*e;p.scale.setScalar(1-e);p.visible=t<1;}
 return moving||t<1;
}
// Scale to 0 rather than fade: no transparent material twins to compile, swap or restore.
function cut(poly){
 heal();
 const gears=new Map();S.gears.forEach((g,i)=>{if(pointInPolygon(g.u,g.v,poly))gears.set(i,S.pivots[i].position.z);});
 const ms=matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:FALL_MS;
 S.fall={gears,t0:performance.now(),ms,dist:Math.max(S.face.w,S.face.h)*.35};S.wake?.();
}
function heal(){
 if(!S?.fall)return;
 for(const [i,z0] of S.fall.gears){const p=S.pivots[i];p.position.z=z0;p.rotation.x=0;p.scale.setScalar(1);p.visible=true;}
 S.fall=null;
}
function dispose(){for(const p of S.pivots){p.removeFromParent();p.traverse(n=>n.geometry?.dispose());}for(const m of S.mats)m.dispose();S=null;}

export const cogs={
 id:'cogs',asset:'./pod/worlds/boards/cogs.glb',flip:true,background:'#14100c',
 guide:{color:'#e0b86a',alpha:.22,width:5},
 init,press,move,release,step,cut,heal,dispose,
};
