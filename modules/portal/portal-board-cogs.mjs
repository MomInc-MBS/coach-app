// cogs board effect for portal-board-glb.mjs — Ian's own painted door (door.glb): a flat slab whose
// neon portal lines are painted into the texture, so the shared guide overlay is off (guide:null) and
// `frame` tells the recogniser/cut where that painted art sits on the taller image (below it is a
// plain panel strip). Every other part of the door — gears, valves, lights, pipes, screws, plates —
// comes from one shared kit (parts-kit.glb) and is placed by door-layout.json (fetched once here):
// one Mesh per entry sharing the node's geometry/material (no clones, except a light's own emissive
// clone), positioned by u/v/r/rot and stacked by `layer`. Gears whose `drives` link them form a train
// (the same rootRatio/applyTorque/stepTrain math as before, minus the old procedural-tooth phasing —
// real kit models don't need it); valves idle-follow the train while it (or a finger) is active;
// lights sit dark and switch on when a finger draws near, holding then fading back off after; pipes
// wiggle as a damped spring when a finger passes near or taps them (screws/plates still sit still).
// Five more kit gears (HUBS), bigger than anything the packer placed, sit above every other part over
// the door art's own painted hub gears, hiding them and idle-spinning as their own one-gear trains.
// A finger leaves a welding trail instead of the shared ink line (ink:false): sparks and a cooling hot
// streak on the free `glow` canvas, a "stack of dimes" weld bead on the free `paint` canvas (this
// board's guide is null, so drawGuides never touches either) — gone well within Ian's 7 s rule.
// All the touch-reactive tuning lives in KNOBS below. step() reports whether anything's still moving
// so the board can go quiet at rest (except the hub gears' idle spin — see the ponytail comment on
// valveActive in step()). A portal cut takes every part whose centre is inside the traced shape down
// with the piece; heal brings them back. AGPL-3.0-or-later.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {orientMatrix,pointInPolygon,GLB} from './portal-board-glb.mjs';

export const LAYOUT='/pod/worlds/boards/cogs/door-layout.json';
const PARTS='/pod/worlds/boards/cogs/parts-kit.glb';
// Ian's door art (1024x1792) has a blank panel strip below ~80% height; the layout carries its own
// measured frame once it loads — this is only the bootstrap value (and the "or the same constant"
// fallback if the fetch ever fails).
export const DEFAULT_FRAME={x0:.0244,y0:.0268,x1:.9756,y1:.8008};
// The five big painted gears on the door art itself (measured from the 1024x1792 source, D:/MYR5
// Roster/boards/src/cogs-door.webp — pixel centre/radius over image size, same u/v/r units as
// door-layout.json): top, bottom, left, right, and the smaller centre hub. These belong to the painted
// art, not the packer's layout, so they live here rather than in door-layout.json. A real kit gear
// (HUB_NODE, HUB_SCALE bigger so the paint is fully hidden) sits over each — see the hub gears built
// in init().
const HUBS=[
 {u:.499,v:.031,r:.052}, // top
 {u:.499,v:.801,r:.052}, // bottom
 {u:.088,v:.419,r:.070}, // left
 {u:.911,v:.419,r:.070}, // right
 {u:.5,  v:.417,r:.043}, // centre
];
const HUB_SCALE=1.2,HUB_NODE='m19'; // m19 is also the largest-r gear door-layout.json itself places
const TAU=Math.PI*2,FRICTION=1.6,REST=.02,TAP_IMPULSE=4,DRAG_GAIN=1,MOVE_EPS=.006;
// ponytail: hard speed cap, not a torque/inertia model — keeps a wild flick from strobing the spokes.
const MAX_OMEGA=12;
// Valves idle at VALVE_IDLE rad/s in the (single, shared) train direction plus VALVE_RATIO of its
// omega, but (see valveActive in step()) only while the train or a finger is actually active.
// ponytail: every valve and every gear tree shares one idle direction/rate rather than each valve
// following its own nearest tree — give valves a `drives`-like link to their tree if two trains ever
// spin opposite and it reads wrong.
const VALVE_IDLE=.25,VALVE_RATIO=.15,LIGHT_COLOR='#b026ff';

// All touch-reactive tuning in one place. Pipes wiggle as a damped torsion spring, angle'' =
// -w0^2*angle - damping*angle' (w0 = 2*pi*wiggleFreqHz): underdamped, so a kick visibly oscillates a
// few times before decaying under wiggleRestAngle/wiggleRestOmega (~1s at the defaults below).
// Lights sit at lightOff until a finger comes within lightRadius (face-width fraction), ramp to
// lightOn over lightRampMs, hold while near and for lightHoldMs after, then fade back over
// lightFadeMs.
export const KNOBS={
 wiggleKick:5,          // rad/s added per (face-width/s) of sideways finger speed, per move event
 wiggleTapKick:.6,      // rad/s added by a plain tap on a pipe (no motion to read a speed from)
 wiggleMargin:.02,      // face-width fraction added to a pipe's r for "near enough to react"
 wiggleFreqHz:6,
 wiggleDamping:8,       // x'' + damping*x' + w0^2*x = 0
 wiggleMaxAngle:10*Math.PI/180, // clamp so repeated re-excites can't wind past this
 wiggleBob:.02,         // z bob at full amplitude, as a fraction of face width
 wiggleRestAngle:.004,  // rad — below this and wiggleRestOmega, a pipe counts as settled
 wiggleRestOmega:.05,   // rad/s
 lightRadius:.12,
 lightRampMs:120,
 lightHoldMs:800,
 lightFadeMs:1200,
 lightOff:0,
 lightOn:1.6,
 lightFlicker:.06,      // +/- fraction of lightOn while fully lit
 hubIdleAccel:.6,       // rad/s^2 "motor" on each hub gear, balanced by FRICTION into a steady idle
                         // spin (equilibrium omega ~= hubIdleAccel/FRICTION, ~.25-.4 rad/s here)
 // Welding trail: sizes are given in SCREEN px (so they read at a glance on a phone) and converted to
 // canvas px each draw via pxScale() — the live canvas-to-screen scale (measured off the rendered
 // <canvas> + the same fit math portal-board-glb.mjs's computeFit() uses) — rather than baked to a
 // fixed texture-px size. Sparks fly at "screen px/s" so a frame's streak (speed*dt) reads as roughly
 // sparkSpeedMinPx..MaxPx/60 wide at 60fps. Timeline: hot trail ~1s (weldHotMs, held near-full for
 // weldHotHold of that then cooling), then the bead holds (weldBeadHold of weldBeadMs) and fades —
 // total ~5s end to end, inside Ian's 7s rule. ponytail: the bead is painted on the door's own texture,
 // so tall kit parts (gears etc, proud of the door surface) occlude it same as they'd occlude any
 // door-texture art; a separate transparent overlay mesh above the door would fix that if it matters
 // later, but the open panelling has plenty of clear room for it today.
 sparkSpeedMinPx:500,sparkSpeedMaxPx:1200, // screen px/s, radial spray
 sparkGravityPx:750,                        // screen px/s^2, downward
 sparkLifeMin:.32,sparkLifeMax:.65,         // s — the wider range reads as "some fly further"
 sparkWidthPx:3.5,                          // screen px, streak stroke width
 sparkPressCount:9,sparkReleaseCount:5,sparkIdleCount:2,sparkIdleMs:90, // idle trickle while held
 sparkPerFrac:.006,sparkMoveMax:10,         // sparks per face-width-fraction of travel per move event
 sparkMax:140,                              // ponytail: hard cap on live sparks
 weldStep:.016,            // face-width fraction: trail-point spacing (overlapping dimes, not a mush)
 weldHotMs:1000,            // hot-glow portion of the trail
 weldHotHold:.35,           // fraction of weldHotMs held near-full brightness before it starts cooling
 weldBeadMs:4000,           // bead hold (weldBeadHold) + fade after the trail cools
 weldBeadHold:.625,         // 2.5s hold / 4s = .625, fading over the remaining 1.5s
 weldTrailWidthPx:6,        // screen px, hot-trail core stroke width
 weldTrailHaloPx:16,        // screen px, hot-trail bloom halo width
 weldBeadRadiusPx:6.5,      // screen px, bead "dime" radius (~13px seam width)
 weldHaloRadiusPx:10,       // screen px, heat-tint (straw->blue) halo just outside the bead
 weldCap:260,               // ponytail: hard cap on stored trail points
};
// z step between stacked layers, as a fraction of face width. `layer` is a unique index across every
// part (0..N, no repeats) rather than a small per-spot count, so this only needs to clear ordinary
// z-fighting, not carry any real depth — kept tiny (250 parts * this ~= 1% of face width) so a part
// with a high layer doesn't visibly float off the door. Parts rest on the door's own front face plus
// their own half-depth on top of that.
const LAYER_STEP=.00005;
// Portal cut: parts whose centre is inside the traced shape sink/tilt/shrink away with the board's
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
// Friction on the roots only (drives==null), then every meshed gear's speed is re-derived from its
// parent and angles integrate. Returns true while the train is still moving fast enough to render.
export function stepTrain(gears,dt){
 for(const g of gears)if(g.drives==null)g.omega*=Math.exp(-dt*FRICTION);
 for(const g of gears){
  if(g.drives!=null){const p=gears[g.drives];g.omega=-p.omega*p.r/g.r;}
  g.angle+=g.omega*dt;
 }
 return gears.some(g=>Math.abs(g.omega)>REST);
}
// Layout parts -> a physics gears array indexed 0..n over just the kind:'gear' entries, with each
// one's `drives` (a parts-array index) remapped to a gear-array index (absent/non-gear -> its own
// root). No tooth data in the layout (real kit models, not procedural teeth), so a gear's initial
// angle is just its `rot`; the train settles its own phase from there once it's nudged.
export function gearsFromLayout(parts){
 const idx=[];parts.forEach((p,i)=>{if(p.kind==='gear')idx.push(i);});
 const at=new Map(idx.map((partI,gi)=>[partI,gi]));
 return idx.map(partI=>{
  const p=parts[partI];
  return {u:p.u,v:p.v,r:p.r,drives:p.drives!=null?(at.get(p.drives)??null):null,angle:(p.rot||0)*Math.PI/180,omega:0};
 });
}
// Nearest gear (layout circle: centre u,v, radius r*face.w) to (u,v), skipping any index in `skip`
// (gone with a falling cut piece); -1 if none is under the point.
export function hitGear(gears,face,u,v,skip){
 let best=-1,bestT=1;
 for(let i=0;i<gears.length;i++){
  if(skip?.has(i))continue;
  const g=gears[i],dx=(u-g.u)*face.w,dy=(v-g.v)*face.h,t=Math.hypot(dx,dy)/(g.r*face.w);
  if(t<1&&t<bestT){bestT=t;best=i;}
 }
 return best;
}
// Nearest pipe (by centre) within r+margin of (u,v) — pipe equivalent of hitGear above, but with a
// margin since a pipe should react to a finger passing near it, not only dead-centre on it.
export function nearestPipe(pipes,face,u,v,margin){
 let best=-1,bestD=Infinity;
 for(let i=0;i<pipes.length;i++){
  const p=pipes[i],dx=(u-p.u)*face.w,dy=(v-p.v)*face.h,d=Math.hypot(dx,dy),lim=(p.r+margin)*face.w;
  if(d<lim&&d<bestD){bestD=d;best=i;}
 }
 return best;
}
// One step of a pipe's damped torsion spring (angle'' = -w0^2*angle - damping*angle'), clamped to
// +-maxAngle so several quick re-excites can't wind it up past that.
export function wiggleStep(angle,omega,dt,freqHz,damping,maxAngle){
 const w0=TAU*freqHz;
 omega+=(-w0*w0*angle-damping*omega)*dt;
 angle+=omega*dt;
 if(angle>maxAngle){angle=maxAngle;if(omega>0)omega=0;}
 else if(angle<-maxAngle){angle=-maxAngle;if(omega<0)omega=0;}
 return {angle,omega};
}
// Angular kick for a pipe from a finger's raw per-event displacement (vx,vy, face-plane x/y — no
// timestamp between move events to divide by, the same "impulse per event" approximation the gear
// drag in move() already uses): the component of that motion across the pipe's long axis (rot),
// signed so the pipe swings away from the swipe.
export function wiggleKick(vx,vy,rot,gain){
 return -gain*(-Math.sin(rot)*vx+Math.cos(rot)*vy);
}
// A valve's own dwell angle: idles at VALVE_IDLE in the train's shared direction, plus a small share
// of its raw speed, alternating direction per valve (dir = ±1).
export function valveAngle(angle,dt,dir,valveDir,rootOmega){
 return (angle+dir*(VALVE_IDLE*valveDir+VALVE_RATIO*rootOmega)*dt)%TAU;
}
// A light's on/off level (0..1), stepped one dt toward `target` (1 near, 0 not) — ramping up over
// rampMs, fading down over fadeMs. The "how long since it was last near" shape comes from the caller
// holding target at 1 for a while after the finger leaves (see nearUntil in step()).
export function lightLevel(level,target,dt,rampMs,fadeMs){
 const rate=1000/(target>level?rampMs:fadeMs);
 return target>level?Math.min(target,level+rate*dt):Math.max(target,level-rate*dt);
}
// Weld-heat colour ramp (0=freshest): white-hot -> yellow -> orange -> dull red, as {r,g,b} 0..255.
const HEAT_STOPS=[[1,1,.9],[1,.82,.24],[1,.47,.08],[.47,.14,.04]];
export function heatColor(f){
 f=Math.max(0,Math.min(1,f));
 const n=HEAT_STOPS.length-1,x=f*n,i=Math.min(n-1,Math.floor(x)),t=x-i,[r0,g0,b0]=HEAT_STOPS[i],[r1,g1,b1]=HEAT_STOPS[i+1];
 return {r:Math.round((r0+(r1-r0)*t)*255),g:Math.round((g0+(g1-g0)*t)*255),b:Math.round((b0+(b1-b0)*t)*255)};
}
// A weld bead's alpha at `age` ms since its trail point was laid: 0 until the trail cools (hotMs), 1
// through a hold window (holdFrac of beadMs), then fading to 0 by hotMs+beadMs.
export function weldBeadAlpha(age,hotMs,beadMs,holdFrac){
 if(age<hotMs||age>hotMs+beadMs)return 0;
 const bf=(age-hotMs)/beadMs;
 return bf<holdFrac?1:Math.max(0,1-(bf-holdFrac)/(1-holdFrac));
}

// --- Effect glue -------------------------------------------------------------------------------
let S=null; // per-instance state; one portal board is ever active at once

// One GLTFLoader promise per file, so every slot using a kit shares a single load.
const models=new Map();
const loadModel=url=>models.get(url)??models.set(url,new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)).get(url);
function kitMesh(gltf,name){
 gltf.scene.updateMatrixWorld(true);
 let src=null;(name?gltf.scene.getObjectByName(name):gltf.scene)?.traverse(o=>{if(o.isMesh&&!src)src=o;});
 if(!src)throw new Error('no mesh '+(name||''));
 return src;
}
// A mesh sharing src's geometry/material, fitted by its matrix: thin axis -> +Z (if orient), centred
// on its bbox, face-plane bbox radius = radius. Returns it with its fitted depth.
function fitModel(src,radius,orient){
 const box=new THREE.Box3().setFromObject(src),rot=new THREE.Matrix4();
 if(orient){const R=orientMatrix(box.getSize(new THREE.Vector3()));rot.set(...R[0],0,...R[1],0,...R[2],0,0,0,0,1);box.applyMatrix4(rot);}
 const size=box.getSize(new THREE.Vector3()),k=radius/(Math.max(size.x,size.y)/2),c=box.getCenter(new THREE.Vector3());
 const m=new THREE.Mesh(src.geometry,src.material);m.frustumCulled=false;m.matrixAutoUpdate=false;
 m.matrix.makeScale(k,k,k).multiply(new THREE.Matrix4().makeTranslation(-c.x,-c.y,-c.z)).multiply(rot).multiply(src.matrixWorld);
 return {m,depth:size.z*k};
}
// Builds every layout entry as a Mesh (kit meshes lie flat, face at +Z — no thin-axis turn, same as
// the old props): positioned on the door's front face, z-stacked by layer, rotated by rot. Returns
// {parts,gearPivots}: parts for cut/heal (every kind); gearPivots indexed like gearsFromLayout's
// output (undefined slot = that node failed to load; still driven, just invisible) for the physics
// rotation each frame. ponytail: one Mesh per entry (draw calls ~= entry count, ~150-250 here); if
// the pane ever shows frame drops, switch the static kinds (pipe/screw/plate/valve/light) to one
// InstancedMesh per shared node — gears alone would still need their own objects to spin independently.
function buildParts(parent,gltf,list,front,fw,fh,mats){
 const parts=[],gearPivots=[];let gi=0;
 list.forEach((p,i)=>{
  const isGear=p.kind==='gear';
  let src;
  try{src=kitMesh(gltf,p.node);}
  catch(e){console.warn('portal-board-cogs: missing node',p.node,e);if(isGear)gi++;return;}
  const x=(p.u-.5)*fw,y=(.5-p.v)*fh,{m,depth}=fitModel(src,p.r*fw,false),pivot=new THREE.Group();
  const rot=(p.rot||0)*Math.PI/180,part={...p,pivot,rot,angle:0,omega:0};
  pivot.position.set(x,y,front+(p.layer||0)*LAYER_STEP*fw+depth/2);
  part.z0=pivot.position.z; // rest z; pipes bob off this and back
  if(p.kind==='light'){
   const mat=src.material.clone();mat.emissive.set(LIGHT_COLOR);mat.emissiveMap=mat.map;mat.emissiveIntensity=KNOBS.lightOff;m.material=mat;
   mats.push(mat);Object.assign(part,{mat,phase:i*2.3,level:0,nearUntil:-Infinity});
  }else if(p.kind==='valve')part.dir=i%2?1:-1;
  pivot.rotation.z=rot;pivot.add(m);parent.add(pivot);parts.push(part);
  if(isGear){gearPivots[gi]=pivot;gi++;}
 });
 return {parts,gearPivots};
}

async function init({mesh,face,wake,paint,glow}){
 const fw=face.w,fh=face.h;
 mesh.geometry.computeBoundingBox();
 const front=mesh.geometry.boundingBox.max.z; // door.glb is a flat slab; parts sit proud of this face
 const [layout,gltf]=await Promise.all([
  fetch(cogs.layoutAsset||LAYOUT).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json();}),
  loadModel(cogs.partsAsset||PARTS),
 ]);
 cogs.frame=layout?.frame||DEFAULT_FRAME;
 const list=layout?.parts||[];
 const gears=gearsFromLayout(list),mats=[];
 const {parts,gearPivots}=gltf?buildParts(mesh.parent,gltf,list,front,fw,fh,mats):{parts:[],gearPivots:[]};
 // Big hub gears over the door's own painted ones (HUBS): plain kit gears, each its own train root,
 // built the same way as the layout's own parts (just from a synthetic 5-entry list) and stacked above
 // every one of them so they fully cover the paint underneath.
 const hubList=HUBS.map((h,i)=>({node:HUB_NODE,kind:'gear',u:h.u,v:h.v,r:h.r*HUB_SCALE,rot:0,layer:list.length+i}));
 const hubGears=gearsFromLayout(hubList);
 hubGears.forEach((g,i)=>g.idleDir=i%2?1:-1); // alternate idle direction hub to hub
 const hubBuild=gltf?buildParts(mesh.parent,gltf,hubList,front,fw,fh,mats):{parts:[],gearPivots:[]};
 gears.push(...hubGears);gearPivots.push(...hubBuild.gearPivots);parts.push(...hubBuild.parts);
 mats.push(...new Set(parts.map(p=>p.pivot.children[0].material)));
 const reducedMotion=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 S={gears,gearPivots,parts,face,aspect:fh/fw,valveDir:1,mats,drag:new Map(),fall:null,wake,reducedMotion,
    paint,glow,texW:paint.canvas.width,texH:paint.canvas.height,
    sparks:[],weld:[],weldHeads:new Map(),weldActive:false};
}
// --- Welding trail: sparks + hot streak (glow canvas) + cooling weld bead (paint canvas) -----------
// A spark: {x,y,px,py (canvas px, px/py = last frame's pos, for a streak),vx,vy (px/s),born (ms),
// life (s)}. Speeds/gravity are "canvas-width fractions/s" scaled by texW once at spawn, so they don't
// depend on GLB.texSize.
function spawnSparks(u,v,count){
 if(count<=0)return;
 const scale=pxScale(),cx=u*S.texW,cy=v*S.texH;
 for(let i=0;i<count&&S.sparks.length<KNOBS.sparkMax;i++){
  const a=Math.random()*TAU,spd=(KNOBS.sparkSpeedMinPx+Math.random()*(KNOBS.sparkSpeedMaxPx-KNOBS.sparkSpeedMinPx))*scale;
  S.sparks.push({x:cx,y:cy,px:cx,py:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,born:performance.now(),
   life:KNOBS.sparkLifeMin+Math.random()*(KNOBS.sparkLifeMax-KNOBS.sparkLifeMin)});
 }
}
// A weld-trail point {u,v,t (ms),prev}: prev links to the same finger's previous point (per id, via
// weldHeads) so two simultaneous strokes never draw a segment joining them.
function weldPushPoint(id,u,v){
 const prev=S.weldHeads.get(id)||null;
 if(prev&&Math.hypot(u-prev.u,(v-prev.v)*S.aspect)<KNOBS.weldStep)return;
 const p={u,v,t:performance.now(),prev};S.weld.push(p);S.weldHeads.set(id,p);
 if(S.weld.length>KNOBS.weldCap)S.weld.splice(0,S.weld.length-KNOBS.weldCap); // ponytail: hard cap
}
function weldRelease(id,u,v){
 weldPushPoint(id,u,v);S.weldHeads.delete(id);spawnSparks(u,v,KNOBS.sparkReleaseCount);
}
function heatRGBA(f,alpha){const {r,g,b}=heatColor(f);return `rgba(${r},${g},${b},${Math.max(0,alpha)})`;}
// Canvas px per screen px right now: measured off the live rendered <canvas> (its CSS box) with the
// same margin-fit math computeFit() uses in portal-board-glb.mjs (GLB.margin), so every weldXxxPx knob
// stays a true screen size regardless of GLB.texSize, host width or devicePixelRatio. Cheap (one
// clientWidth/Height read + a few multiplies); called a handful of times per frame while welding.
function pxScale(){
 const el=document.querySelector('canvas.portal-board-canvas'),cw=el?.clientWidth,ch=el?.clientHeight;
 if(!cw||!ch)return 2; // not laid out yet: a reasonable guess, corrected the moment it is
 const availW=cw*(1-2*GLB.margin),availH=ch*(1-2*GLB.margin),scaleFit=Math.min(availW/S.face.w,availH/S.face.h);
 return S.texW/(scaleFit*S.face.w);
}
// Hot trail: a wide blurred bloom halo pass, then a crisp bright core pass (same two-pass technique
// portal-board-glb.mjs's drawGuides uses for the shape hints) — held near-full brightness for
// weldHotHold of the hot window, then cooling white->yellow->orange->red the rest of the way.
function weldRenderGlow(now){
 const {ctx}=S.glow,w=S.texW,h=S.texH,scale=pxScale();
 const coreW=KNOBS.weldTrailWidthPx*scale,haloW=KNOBS.weldTrailHaloPx*scale,sparkW=KNOBS.sparkWidthPx*scale;
 const segs=[];
 for(const p of S.weld){
  if(!p.prev)continue;
  const age=now-p.t;if(age>=KNOBS.weldHotMs)continue;
  const f=age/KNOBS.weldHotMs,af=f<KNOBS.weldHotHold?1:1-(f-KNOBS.weldHotHold)/(1-KNOBS.weldHotHold);
  segs.push({x0:p.prev.u*w,y0:p.prev.v*h,x1:p.u*w,y1:p.v*h,f,af});
 }
 ctx.clearRect(0,0,w,h);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 ctx.filter=`blur(${(haloW*.35).toFixed(1)}px)`;ctx.lineWidth=haloW;
 for(const s of segs){ctx.strokeStyle=heatRGBA(s.f,s.af*.55);ctx.beginPath();ctx.moveTo(s.x0,s.y0);ctx.lineTo(s.x1,s.y1);ctx.stroke();}
 ctx.filter='none';ctx.lineWidth=coreW;
 for(const s of segs){ctx.strokeStyle=heatRGBA(s.f,s.af);ctx.beginPath();ctx.moveTo(s.x0,s.y0);ctx.lineTo(s.x1,s.y1);ctx.stroke();}
 ctx.lineWidth=sparkW;
 for(const s of S.sparks){
  const f=(now-s.born)/1000/s.life;
  ctx.strokeStyle=heatRGBA(Math.min(1,f),1-f);
  ctx.beginPath();ctx.moveTo(s.px,s.py);ctx.lineTo(s.x,s.y);ctx.stroke();
 }
 ctx.restore();S.glow.texture.needsUpdate=true;
}
// Grey/bronze "dimes" (alternating bright metal tones, near-opaque while held so they read at a
// glance against the dark door): each is a base fill + a darker rim crescent on the trailing
// (lower-right) edge + a crisp specular highlight streak on the leading (upper-left) edge + a small
// drop shadow, over a subtle straw->blue heat-tint halo just outside it.
const BEAD_COLORS=[{r:170,g:172,b:178},{r:196,g:130,b:62}]; // grey / bronze — bright enough to separate
// from the dark brown door even at 1x phone scale.
function weldRenderPaint(now){
 const {ctx}=S.paint,w=S.texW,h=S.texH,scale=pxScale();
 const R=KNOBS.weldBeadRadiusPx*scale,haloR=KNOBS.weldHaloRadiusPx*scale,off=1.6*scale; // ~1-2 screen px
 ctx.clearRect(0,0,w,h);
 ctx.save();
 // Heat-tint halo first, one pass under everything (not per-bead) so overlapping dimes don't stack
 // it into a wash: a subtle straw->blue-ish band traced along the whole visible seam.
 S.weld.forEach((p)=>{
  const alpha=weldBeadAlpha(now-p.t,KNOBS.weldHotMs,KNOBS.weldBeadMs,KNOBS.weldBeadHold);
  if(alpha<=0)return;
  const cx=p.u*w,cy=p.v*h;
  const grad=ctx.createRadialGradient(cx,cy,R*.9,cx,cy,haloR);
  grad.addColorStop(0,`rgba(196,162,92,${.18*alpha})`);grad.addColorStop(.6,`rgba(120,108,145,${.1*alpha})`);grad.addColorStop(1,'rgba(90,80,150,0)');
  ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,haloR,0,TAU);ctx.fill();
 });
 S.weld.forEach((p,i)=>{
  const alpha=weldBeadAlpha(now-p.t,KNOBS.weldHotMs,KNOBS.weldBeadMs,KNOBS.weldBeadHold);
  if(alpha<=0)return;
  const cx=p.u*w,cy=p.v*h,c=BEAD_COLORS[i%2];
  ctx.globalAlpha=alpha*.75;ctx.fillStyle='rgb(8,7,6)';ctx.beginPath();ctx.arc(cx+off,cy+off,R,0,TAU);ctx.fill(); // drop shadow
  ctx.globalAlpha=alpha*.92;ctx.fillStyle=`rgb(${c.r},${c.g},${c.b})`;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fill(); // near-opaque body
  ctx.globalAlpha=alpha*.85;ctx.strokeStyle=`rgb(${Math.round(c.r*.4)},${Math.round(c.g*.4)},${Math.round(c.b*.4)})`;
  ctx.lineWidth=R*.34;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,R*.84,Math.PI*.05,Math.PI*.75);ctx.stroke(); // dark rim, trailing edge
  ctx.globalAlpha=alpha*.9;ctx.strokeStyle='rgb(255,250,235)';
  ctx.lineWidth=R*.26;ctx.beginPath();ctx.arc(cx,cy,R*.6,Math.PI*1.05,Math.PI*1.55);ctx.stroke(); // specular streak, leading edge
 });
 ctx.restore();S.paint.texture.needsUpdate=true;
}
// Redraws (clears+repaints) both canvases every frame while anything welding is live, same as one
// frame past that to wipe the last remnants, then leaves them alone — see the sleep note on step().
function stepWeld(dt,now){
 const grav=KNOBS.sparkGravityPx*pxScale();
 for(const s of S.sparks){s.vy+=grav*dt;s.px=s.x;s.py=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;}
 S.sparks=S.sparks.filter(s=>(now-s.born)/1000<s.life);
 for(const d of S.drag.values())if(now-(d.lastSparkT||0)>KNOBS.sparkIdleMs){d.lastSparkT=now;spawnSparks(d.u,d.v,KNOBS.sparkIdleCount);}
 let k=0;while(k<S.weld.length&&now-S.weld[k].t>KNOBS.weldHotMs+KNOBS.weldBeadMs)k++;if(k)S.weld.splice(0,k);
 const active=S.sparks.length>0||S.weld.some(p=>now-p.t<KNOBS.weldHotMs+KNOBS.weldBeadMs);
 if(active||S.weldActive){weldRenderGlow(now);weldRenderPaint(now);}
 S.weldActive=active;
 return active;
}

function press(id,u,v){
 const skip=S.fall&&new Set(S.gears.map((_,gi)=>gi).filter(gi=>S.fall.pivots.has(S.gearPivots[gi])));
 S.drag.set(id,{gi:hitGear(S.gears,S.face,u,v,skip),moved:false,u,v});
 weldPushPoint(id,u,v);spawnSparks(u,v,KNOBS.sparkPressCount);
}
function move(id,u,v,pu,pv){
 const d=S.drag.get(id);if(!d)return;
 if(Math.hypot(u-pu,v-pv)>MOVE_EPS)d.moved=true;
 d.u=u;d.v=v;
 if(d.gi>=0){
  const g=S.gears[d.gi],rx=(u-g.u)*S.face.w,ry=-(v-g.v)*S.face.h,dx=(u-pu)*S.face.w,dy=-(v-pv)*S.face.h,rw=g.r*S.face.w;
  applyTorque(S.gears,d.gi,(rx*dy-ry*dx)/(rw*rw)*DRAG_GAIN);
 }
 // Pipes don't need a drag origin to react — any pipe the finger passes near this event gets a kick,
 // not only the one (if any) under the initial press.
 const vx=(u-pu)*S.face.w,vy=-(v-pv)*S.face.h;
 for(const part of S.parts){
  if(part.kind!=='pipe'||S.fall?.pivots.has(part.pivot))continue;
  const dxp=(u-part.u)*S.face.w,dyp=(v-part.v)*S.face.h,lim=(part.r+KNOBS.wiggleMargin)*S.face.w;
  if(Math.hypot(dxp,dyp)<lim)part.omega+=wiggleKick(vx,vy,part.rot,KNOBS.wiggleKick);
 }
 weldPushPoint(id,u,v);
 spawnSparks(u,v,Math.min(KNOBS.sparkMoveMax,Math.round(Math.hypot(u-pu,v-pv)/KNOBS.sparkPerFrac)));
}
function release(id){
 const d=S.drag.get(id);if(!d)return;
 if(!d.moved){
  if(d.gi>=0)applyTorque(S.gears,d.gi,TAP_IMPULSE);
  else{
   const pipes=S.parts.filter(p=>p.kind==='pipe'&&!S.fall?.pivots.has(p.pivot));
   const pi=nearestPipe(pipes,S.face,d.u,d.v,KNOBS.wiggleMargin);
   if(pi>=0)pipes[pi].omega+=KNOBS.wiggleTapKick;
  }
 }
 weldRelease(id,d.u,d.v);
 S.drag.delete(id);
}
function step(dt,now){
 const moving=stepTrain(S.gears,dt);
 S.gears.forEach((g,gi)=>{if(S.gearPivots[gi])S.gearPivots[gi].rotation.z=g.angle%TAU;});
 let rootOmega=0;
 for(const g of S.gears)if(g.drives==null&&Math.abs(g.omega)>Math.abs(rootOmega))rootOmega=g.omega;
 if(Math.abs(rootOmega)>REST)S.valveDir=Math.sign(rootOmega);
 // ponytail: valves used to idle forever on their own VALVE_IDLE baseline, which alone kept the board
 // rendering every frame at rest; now they only turn while the train or a finger is actually doing
 // something (they've never had a canonical rest angle, so freezing wherever they stop is fine). The
 // five big hub gears (HUBS) still idle-spin nonstop even at rest (their own small idleDir motor,
 // applied below) — unlike everything else here, that keeps the board rendering permanently while
 // shown, except under prefers-reduced-motion, where the motor is off and it can settle/sleep too.
 const valveActive=Math.abs(rootOmega)>REST||S.drag.size>0;
 let wobbling=false,lit=false;
 for(const part of S.parts){
  const falling=S.fall?.pivots.has(part.pivot);
  if(part.kind==='valve'){
   if(valveActive){part.angle=valveAngle(part.angle,dt,part.dir,S.valveDir,rootOmega);part.pivot.rotation.z=part.rot+part.angle;}
  }else if(part.kind==='pipe'&&!falling){
   const r=wiggleStep(part.angle,part.omega,dt,KNOBS.wiggleFreqHz,KNOBS.wiggleDamping,KNOBS.wiggleMaxAngle);
   part.angle=r.angle;part.omega=r.omega;
   if(Math.abs(part.angle)<KNOBS.wiggleRestAngle&&Math.abs(part.omega)<KNOBS.wiggleRestOmega){
    if(part.angle!==0||part.pivot.position.z!==part.z0){part.angle=0;part.omega=0;part.pivot.rotation.z=part.rot;part.pivot.position.z=part.z0;}
   }else{
    wobbling=true;
    part.pivot.rotation.z=part.rot+part.angle;
    part.pivot.position.z=part.z0+Math.abs(part.angle)/KNOBS.wiggleMaxAngle*KNOBS.wiggleBob*S.face.w;
   }
  }else if(part.kind==='light'&&!falling){
   let near=false;
   for(const d of S.drag.values()){const dx=(d.u-part.u)*S.face.w,dy=(d.v-part.v)*S.face.h;if(Math.hypot(dx,dy)<KNOBS.lightRadius*S.face.w){near=true;break;}}
   if(near)part.nearUntil=now+KNOBS.lightHoldMs;
   const target=now<part.nearUntil?1:0;
   part.level=lightLevel(part.level,target,dt,KNOBS.lightRampMs,KNOBS.lightFadeMs);
   const flicker=part.level>.95?Math.sin(now*.02+part.phase)*KNOBS.lightFlicker*KNOBS.lightOn:0;
   part.mat.emissiveIntensity=Math.max(0,KNOBS.lightOff+(KNOBS.lightOn-KNOBS.lightOff)*part.level+flicker);
   if(part.level>.001)lit=true;
  }
 }
 const f=S.fall,t=f?Math.min(1,(now-f.t0)/Math.max(1,f.ms)):1,e=t*t;
 if(f)for(const [p,z0] of f.pivots){p.position.z=z0-f.dist*e;p.rotation.x=FALL_TILT*e;p.scale.setScalar(1-e);p.visible=t<1;}
 if(!S.reducedMotion)for(const g of S.gears)if(g.idleDir)g.omega+=g.idleDir*KNOBS.hubIdleAccel*dt;
 const weldActive=stepWeld(dt,now);
 // Sleeps (returns false) once no gear is moving, no pipe is wobbling, no light is lit, no weld spark/
 // trail is live and no cut animation is running — the board (portal-board-glb.mjs) stops driving rAF
 // at that point. In practice that's "never" while reducedMotion is off: the hub gears' idle motor
 // above keeps `moving` true forever.
 return moving||wobbling||lit||weldActive||t<1;
}
// Scale to 0 rather than fade: no transparent material twins to compile, swap or restore.
function cut(poly){
 heal();
 const pivots=new Map();
 for(const part of S.parts)if(pointInPolygon(part.u,part.v,poly))pivots.set(part.pivot,part.pivot.position.z);
 const ms=matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:FALL_MS;
 S.fall={pivots,t0:performance.now(),ms,dist:Math.max(S.face.w,S.face.h)*.35};S.wake?.();
}
function heal(){
 if(!S?.fall)return;
 for(const [p,z0] of S.fall.pivots){p.position.z=z0;p.rotation.x=0;p.scale.setScalar(1);p.visible=true;}
 S.fall=null;
}
function dispose(){
 for(const part of S.parts){part.pivot.removeFromParent();part.pivot.traverse(n=>n.geometry?.dispose());}
 for(const m of new Set(S.mats))m.dispose();
 S=null;
}

export const cogs={
 id:'cogs',asset:'/pod/worlds/boards/cogs/door.glb',flip:false,background:'#161310',
 guide:null,frame:DEFAULT_FRAME,ink:false, // the weld trail replaces the shared ink line
 init,press,move,release,step,cut,heal,dispose,
};
