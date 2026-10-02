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
let selectedTint=null,weldTrace=null;
const validTint=hex=>typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex);

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
 sparkSpeedMinPx:300,sparkSpeedMaxPx:1100, // screen px/s, radial spray (slow ones dribble, fast ones fly)
 sparkGravityPx:1500,                       // screen px/s^2, downward: sparks arc over and fall
 sparkLifeMin:.35,sparkLifeMax:.9,          // s — the wider range reads as "some fly further"
 sparkWidthPx:2.4,                          // screen px, streak stroke width (thin incandescent wire)
 sparkStreakS:.02,                          // s of velocity drawn behind each spark: its motion-blur streak
 sparkBounce:.35,                           // fraction of sparks that hit a "floor" below the torch and skitter
 sparkFloorMinPx:30,sparkFloorMaxPx:110,    // screen px below the torch where a bouncing spark lands
 sparkBounceKeep:.38,                       // vertical speed kept on the bounce (horizontal keeps .8)
 sparkPressCount:24,sparkReleaseCount:6,sparkIdleCount:4,sparkIdleMs:45, // press flare spray; trickle while held
 sparkPerFrac:.004,sparkMoveMax:12,         // sparks per face-width-fraction of travel per move event
 sparkMax:200,                              // ponytail: hard cap on live sparks
 torchCorePx:9,            // screen px, white-hot core radius at the contact point while a finger is down
 torchBloomPx:40,          // screen px, blue-white -> warm bloom around the core
 torchFlareMs:220,         // the press flare: core+bloom swell this long after touch-down
 torchFlareScale:2.2,      // how much bigger the bloom is at the instant of the press
 tintHaloMix:.22,          // the selected tint only tints the outer halo of the hot trail, this much
 weldStep:.016,            // face-width fraction: trail-point spacing
 weldHotMs:1000,            // hot-glow portion of the trail
 weldHotHold:.35,           // fraction of weldHotMs held near-full brightness before it starts cooling
 weldBeadMs:4000,           // bead hold (weldBeadHold) + fade after the trail cools
 weldBeadHold:.625,         // 2.5s hold / 4s = .625, fading over the remaining 1.5s
 weldTrailWidthPx:6,        // screen px, hot-trail core stroke width
 weldTrailHaloPx:18,        // screen px, hot-trail bloom halo width
 weldBeadRadiusPx:5,        // screen px, bead half-width (~10px seam)
 weldRipplePx:3.8,          // screen px between "stack of dimes" ripples along the bead
 weldHaloRadiusPx:11,       // screen px, heat-tint band (straw next to the bead -> blue outside) half-width
 weldCap:260,               // ponytail: hard cap on stored trail points
};
// The tint picker recolours the kit parts (cogs, lamps, pipes...) as anodized metal (see metalFinish).
export const METAL={metalness:.92,roughness:.36,envIntensity:1.15};
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

// Linear 0..1 blend of the heat colour with the tint, as an rgba() string: the hot trail's outer halo only.
function haloRGBA(f,tint,mix,alpha){
 const {r,g,b}=heatColor(f);if(!tint)return `rgba(${r},${g},${b},${Math.max(0,alpha)})`;
 const n=parseInt(tint.slice(1),16),m=a=>Math.round(a);
 return `rgba(${m(r+((n>>16)-r)*mix)},${m(g+(((n>>8)&255)-g)*mix)},${m(b+((n&255)-b)*mix)},${Math.max(0,alpha)})`;
}

// --- Metal finish for the kit parts --------------------------------------------------------------
// One shared tint/mix uniform pair for every kit material: the selected tint turns the parts' baked
// brass/copper albedo into luminance x tint (anodized metal), with real metalness/roughness and a small
// studio env map so the metal has something to reflect. No tint -> mix 0 and the original PBR values,
// i.e. the stock look.
const uMetalTint={value:new THREE.Color(1,1,1)},uMetalMix={value:0};
let envTex=null;
// A tiny equirect "studio": dark floor, grey horizon, bright sky and two softbox stripes for highlights.
function studioEnv(){
 if(envTex)return envTex;
 const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,'#f4f6fa');g.addColorStop(.42,'#8a9098');g.addColorStop(.55,'#3a3d44');g.addColorStop(1,'#0e0f12');
 x.fillStyle=g;x.fillRect(0,0,128,64);x.fillStyle='#ffffff';x.fillRect(18,8,10,22);x.fillRect(80,4,22,9);
 envTex=new THREE.CanvasTexture(c);envTex.mapping=THREE.EquirectangularReflectionMapping;envTex.colorSpace=THREE.SRGBColorSpace;
 return envTex;
}
function metalFinish(mat){
 if(mat.userData.cogsMetal)return;
 mat.userData.cogsMetal={metalness:mat.metalness,roughness:mat.roughness,metalnessMap:mat.metalnessMap,roughnessMap:mat.roughnessMap,envMap:mat.envMap,envMapIntensity:mat.envMapIntensity};
 mat.onBeforeCompile=shader=>{
  shader.uniforms.uMetalTint=uMetalTint;shader.uniforms.uMetalMix=uMetalMix;
  shader.fragmentShader='uniform vec3 uMetalTint;\nuniform float uMetalMix;\n'+shader.fragmentShader
   .replace('#include <map_fragment>','#include <map_fragment>\n{float ml=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,uMetalTint*clamp(.35+1.4*ml,0.,1.2),uMetalMix);}')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_EMISSIVEMAP\ntotalEmissiveRadiance=mix(totalEmissiveRadiance,emissive*(.4+dot(emissiveColor.rgb,vec3(.2126,.7152,.0722))),uMetalMix);\n#endif');
 };
 mat.customProgramCacheKey=()=>'cogs-metal';mat.needsUpdate=true;
}
function applyMetal(mats){
 const on=!!selectedTint;uMetalMix.value=on?1:0;if(on)uMetalTint.value.set(selectedTint);
 for(const mat of mats){
  const o=mat.userData.cogsMetal;if(!o)continue;
  if(mat.userData.cogsOn!==on){mat.userData.cogsOn=on;mat.needsUpdate=true;} // maps/env swap: recompile once
  Object.assign(mat,on?{metalness:METAL.metalness,roughness:METAL.roughness,metalnessMap:null,roughnessMap:null,envMap:studioEnv(),envMapIntensity:METAL.envIntensity}:o);
 }
}

// --- Effect glue -------------------------------------------------------------------------------
let S=null; // per-instance state; one portal board is ever active at once
function setCogsTint(hex,selected=true){
 if(selected&&!validTint(hex))return;
 selectedTint=selected?hex:null;
 if(S){for(const part of S.parts)if(part.kind==='light')part.mat.emissive.set(selectedTint||LIGHT_COLOR);applyMetal(S.mats);S.tint=selectedTint;S.wake?.();}
 if(weldTrace){weldTrace.tint=selectedTint;weldTrace.wake?.();}
}

// One GLTFLoader promise per file, so every slot using a kit shares a single load.
const models=new Map();
const loadModel=url=>{let pending=models.get(url);if(!pending){pending=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).catch(error=>{models.delete(url);throw error;});models.set(url,pending);}return pending;};
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
  part.z0=pivot.position.z;part.top=part.z0+depth/2; // rest z; pipes bob off this and back
  if(p.kind==='light'){
   // A previous board may have left the shared kit material in its metal state: start the clone from the stock values.
   const mat=src.material.clone(),stock=src.material.userData.cogsMetal;mat.userData={};if(stock)Object.assign(mat,stock);mat.emissive.set(selectedTint||LIGHT_COLOR);mat.emissiveMap=mat.map;mat.emissiveIntensity=KNOBS.lightOff;m.material=mat;
   mats.push(mat);Object.assign(part,{mat,phase:i*2.3,level:0,nearUntil:-Infinity});
  }else if(p.kind==='valve')part.dir=i%2?1:-1;
  pivot.rotation.z=rot;pivot.add(m);parent.add(pivot);parts.push(part);
  if(isGear){gearPivots[gi]=pivot;gi++;}
 });
 return {parts,gearPivots};
}

// The weld trail's own two layers in 3D, floating just above the tallest kit part so gears and pipes
// never hide the sparks or the bead: the bead layer (normal blend) and the glow layer (additive) on top.
// The door's own paint/glow inputs stay blank, so the trail isn't drawn twice.
function weldLayer(parent,w,h,fw,fh,z,additive){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace; // flipY default: canvas row 0 = plane top
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,...(additive?{blending:THREE.AdditiveBlending}:{})});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(fw,fh),material);mesh.position.z=z;mesh.renderOrder=additive?11:10;mesh.frustumCulled=false;parent.add(mesh);
 return {canvas,ctx:canvas.getContext('2d'),texture,mesh};
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
 for(const m of mats)metalFinish(m);applyMetal(mats);
 const top=parts.reduce((z,p)=>Math.max(z,p.top),front)+KNOBS.wiggleBob*fw+.01*fw,tw=paint.canvas.width,th=paint.canvas.height;
 const beadLayer=weldLayer(mesh.parent,tw,th,fw,fh,top,false),glowLayer=weldLayer(mesh.parent,tw,th,fw,fh,top+.002*fw,true);
 const reducedMotion=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 S={gears,gearPivots,parts,face,aspect:fh/fw,valveDir:1,mats,drag:new Map(),fall:null,wake,reducedMotion,
    paint:beadLayer,glow:glowLayer,layers:[beadLayer,glowLayer],texW:tw,texH:th,
    sparks:[],weld:[],weldHeads:new Map(),weldActive:false,tint:selectedTint};
}
// --- Welding trail: torch core + sparks + hot streak (glow layer) + cooling weld bead (paint layer) ---
// A spark: {x,y (canvas px),vx,vy (px/s),born (ms),life (s),floor (canvas y it bounces off once, or
// Infinity)}. Speeds/gravity are screen px scaled to canvas px at spawn (S.scale, refreshed per frame).
function spawnSparks(S,u,v,count){
 if(count<=0)return;
 const scale=S.scale||pxScale(S),cx=u*S.texW,cy=v*S.texH,now=performance.now(),K=KNOBS;
 for(let i=0;i<count&&S.sparks.length<K.sparkMax;i++){
  const a=Math.random()*TAU,spd=(K.sparkSpeedMinPx+Math.random()*(K.sparkSpeedMaxPx-K.sparkSpeedMinPx))*scale;
  const floor=Math.random()<K.sparkBounce?cy+(K.sparkFloorMinPx+Math.random()*(K.sparkFloorMaxPx-K.sparkFloorMinPx))*scale:Infinity;
  S.sparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,born:now,floor,
   life:K.sparkLifeMin+Math.random()*(K.sparkLifeMax-K.sparkLifeMin)});
 }
}
// One spark step: gravity, move, and a single damped bounce off its floor (the skitter). Pure, tested.
export function stepSpark(s,dt,grav,keep){
 s.vy+=grav*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
 if(s.y>s.floor&&s.vy>0){s.y=s.floor;s.vy*=-keep;s.vx*=.8;s.floor=Infinity;}
 return s;
}
// A weld-trail point {u,v,t (ms),prev,d}: prev links to the same finger's previous point (per id, via
// weldHeads) so two simultaneous strokes never draw a segment joining them; d is the running seam
// length (face widths) so the bead's ripples sit at fixed spacing however the points fall.
function weldPushPoint(S,id,u,v){
 const prev=S.weldHeads.get(id)||null,len=prev?Math.hypot(u-prev.u,(v-prev.v)*S.aspect):0;
 if(prev&&len<KNOBS.weldStep)return;
 const p={u,v,t:performance.now(),prev,d:prev?prev.d+len:0};S.weld.push(p);S.weldHeads.set(id,p);
 if(S.weld.length>KNOBS.weldCap)S.weld.splice(0,S.weld.length-KNOBS.weldCap); // ponytail: hard cap
}
function weldRelease(S,id,u,v){
 weldPushPoint(S,id,u,v);S.weldHeads.delete(id);spawnSparks(S,u,v,KNOBS.sparkReleaseCount);
}
function heatRGBA(f,alpha){const {r,g,b}=heatColor(f);return `rgba(${r},${g},${b},${Math.max(0,alpha)})`;}
// Canvas px per screen px right now: measured off the live rendered <canvas> (its CSS box) with the
// same margin-fit math computeFit() uses in portal-board-glb.mjs (GLB.margin), so every xxxPx knob
// stays a true screen size regardless of GLB.texSize, host width or devicePixelRatio. Read once per
// frame (stepWeld caches it on S.scale).
function pxScale(S){
 const el=document.querySelector('canvas.portal-board-canvas'),cw=el?.clientWidth,ch=el?.clientHeight;
 if(!cw||!ch)return 2; // not laid out yet: a reasonable guess, corrected the moment it is
 const availW=cw*(1-2*GLB.margin),availH=ch*(1-2*GLB.margin),scaleFit=Math.min(availW/S.face.w,availH/S.face.h);
 return S.texW/(scaleFit*S.face.w);
}
// The bead shows from the moment a point is laid (the hot glow sits on top of it while it cools), holds,
// then fades, all within weldHotMs+weldBeadMs.
export const beadAlpha=age=>{const K=KNOBS,total=K.weldHotMs+K.weldBeadMs;return weldBeadAlpha(age,0,total,(K.weldHotMs+K.weldBeadHold*K.weldBeadMs)/total);};
const HOT_BUCKETS=8,BEAD_BUCKETS=8;
// Hot trail, bucketed by age: each bucket is ONE path, so overlapping segment caps don't stack into a
// row of brighter dots (the old per-segment strokes did). Blurred halo pass, then a crisp core pass:
// white-hot, cooling yellow->orange->red. The selected tint only leans the outer halo a little.
function weldRenderGlow(S,now,scale){
 const {ctx}=S.glow,w=S.texW,h=S.texH,K=KNOBS;
 const coreW=K.weldTrailWidthPx*scale,haloW=K.weldTrailHaloPx*scale,sparkW=K.sparkWidthPx*scale;
 ctx.clearRect(0,0,w,h);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
 for(let pass=0;pass<2;pass++){
  ctx.filter=pass?'none':`blur(${(haloW*.35).toFixed(1)}px)`;ctx.lineWidth=pass?coreW:haloW;
  for(let b=0;b<HOT_BUCKETS;b++){
   let any=false;ctx.beginPath();
   for(const p of S.weld){
    const age=now-p.t;if(!p.prev||age>=K.weldHotMs||Math.min(HOT_BUCKETS-1,(age/K.weldHotMs*HOT_BUCKETS)|0)!==b)continue;
    ctx.moveTo(p.prev.u*w,p.prev.v*h);ctx.lineTo(p.u*w,p.v*h);any=true;
   }
   if(!any)continue;
   const f=(b+.5)/HOT_BUCKETS,af=f<K.weldHotHold?1:1-(f-K.weldHotHold)/(1-K.weldHotHold);
   ctx.strokeStyle=pass?heatRGBA(f,af):haloRGBA(f,S.tint,K.tintHaloMix,af*.55);ctx.stroke();
  }
 }
 ctx.filter='none';
 // Sparks: thin incandescent streaks (white -> yellow -> orange as they cool), each with a faint warm
 // sheath, drawn back along their velocity so a fast one reads as a streak and a slow one as a dot.
 for(const s of S.sparks){
  const f=Math.min(1,(now-s.born)/1000/s.life),x0=s.x-s.vx*K.sparkStreakS,y0=s.y-s.vy*K.sparkStreakS,a=1-f*f;
  ctx.lineWidth=sparkW*(2.2-f);ctx.strokeStyle=heatRGBA(.35+f*.5,a*.14);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(s.x,s.y);ctx.stroke();
  ctx.lineWidth=sparkW*(1-.55*f);ctx.strokeStyle=heatRGBA(f*.85,a);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(s.x,s.y);ctx.stroke();
 }
 // The torch itself at each finger: a white-hot core in a blue-white bloom that fades to a warm edge,
 // flickering, and swollen for a moment right after touch-down (the press flare).
 for(const d of S.drag.values()){
  const k=Math.max(0,1-(now-(d.t0||0))/K.torchFlareMs),fl=.88+Math.random()*.24,cx=d.u*w,cy=d.v*h;
  const R=K.torchBloomPx*scale*(1+(K.torchFlareScale-1)*k)*fl,core=K.torchCorePx*scale*(1+.6*k)*fl;
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(Math.min(.5,core/R),'rgba(225,238,255,.95)');
  g.addColorStop(Math.min(.6,core/R*2.2),'rgba(140,180,255,.45)');g.addColorStop(.75,'rgba(255,160,60,.16)');g.addColorStop(1,'rgba(255,110,30,0)');
  ctx.fillStyle=g;ctx.fillRect(cx-R,cy-R,2*R,2*R);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy,core*.55,0,TAU);ctx.fill();
 }
 ctx.restore();S.glow.texture.needsUpdate=true;
}
// The weld bead: one continuous seam, not a row of dots. Per alpha bucket the seam is one path stroked
// several times: a blue heat-tint band, a straw band inside it, a drop shadow, the steel bead body, a
// lighter crown and a thin specular ridge (upper-left lit, like the rest of the board). Then the
// "stack of dimes": overlapping ripple arcs every weldRipplePx along the seam, convex in the travel
// direction, each a dark crease with a bright lip behind it.
const BEAD_STROKES=[ // [width: multiple of the bead half-width R, or a heat band; offset in R; style]
 ['halo',0,'rgba(58,78,170,.26)'],['wide',0,'rgba(110,96,150,.22)'],['mid',0,'rgba(196,156,72,.36)'],[2,.3,'rgba(6,5,4,.8)'],
 [2,0,'rgb(118,120,126)'],[1.25,-.08,'rgb(162,164,170)'],[.36,-.36,'rgba(250,250,255,.8)'],
];
function weldRenderPaint(S,now,scale){
 const {ctx}=S.paint,w=S.texW,h=S.texH,K=KNOBS,R=K.weldBeadRadiusPx*scale,halo=K.weldHaloRadiusPx*scale;
 const sp=K.weldRipplePx*scale/w,rr=R*.82; // ripple spacing in face widths, ripple radius in canvas px
 ctx.clearRect(0,0,w,h);
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(let b=1;b<=BEAD_BUCKETS;b++){
  let any=false;ctx.beginPath();
  for(const p of S.weld){if(Math.ceil(beadAlpha(now-p.t)*BEAD_BUCKETS)!==b)continue;const q=p.prev||p;ctx.moveTo(q.u*w,q.v*h);ctx.lineTo(p.u*w,p.v*h);any=true;}
  if(!any)continue;
  ctx.globalAlpha=b/BEAD_BUCKETS;
  for(const [wd,off,style] of BEAD_STROKES){
   ctx.lineWidth=wd==='halo'?2*halo:wd==='wide'?R*.6+halo*1.4:wd==='mid'?R*1.2+halo*.8:wd*R;ctx.strokeStyle=style;
   if(off){ctx.translate(off*R,off*R);ctx.stroke();ctx.setTransform(1,0,0,1,0,0);}else ctx.stroke();
  }
  // ripples: dark crease, then the bright lip just behind it
  for(let pass=0;pass<2;pass++){
   ctx.beginPath();
   for(const p of S.weld){
    if(!p.prev||Math.ceil(beadAlpha(now-p.t)*BEAD_BUCKETS)!==b)continue;
    const q=p.prev,dx=(p.u-q.u)*w,dy=(p.v-q.v)*h,len=p.d-q.d;if(len<=0)continue;
    const th=Math.atan2(dy,dx),back=pass?rr*.55:rr*.35,ox=Math.cos(th)*back,oy=Math.sin(th)*back;
    for(let k=Math.ceil(q.d/sp);k*sp<=p.d;k++){
     const t=(k*sp-q.d)/len,cx=q.u*w+dx*t-ox,cy=q.v*h+dy*t-oy;
     ctx.moveTo(cx+Math.cos(th-1.15)*rr,cy+Math.sin(th-1.15)*rr);ctx.arc(cx,cy,rr,th-1.15,th+1.15);
    }
   }
   ctx.lineWidth=(pass?.7:.9)*scale;ctx.strokeStyle=pass?'rgba(232,234,242,.55)':'rgba(34,34,40,.75)';ctx.stroke();
  }
 }
 ctx.restore();S.paint.texture.needsUpdate=true;
}
// Redraws (clears+repaints) both canvases every frame while anything welding is live (or a finger is
// down: the torch core flickers), and one frame past that to wipe the last remnants, then leaves them
// alone — see the sleep note on step().
function stepWeld(S,dt,now){
 const K=KNOBS,scale=S.scale=pxScale(S),grav=K.sparkGravityPx*scale;
 let n=0;for(const s of S.sparks)if((now-s.born)/1000<s.life)S.sparks[n++]=stepSpark(s,dt,grav,K.sparkBounceKeep);
 S.sparks.length=n; // compacted in place: no per-frame array
 for(const d of S.drag.values())if(now-(d.lastSparkT||0)>K.sparkIdleMs){d.lastSparkT=now;spawnSparks(S,d.u,d.v,K.sparkIdleCount);}
 let k=0;while(k<S.weld.length&&now-S.weld[k].t>K.weldHotMs+K.weldBeadMs)k++;if(k)S.weld.splice(0,k);
 const active=S.sparks.length>0||S.weld.length>0||S.drag.size>0;
 if(active||S.weldActive){weldRenderGlow(S,now,scale);weldRenderPaint(S,now,scale);}
 S.weldActive=active;
 return active;
}

function press(id,u,v){
 const skip=S.fall&&new Set(S.gears.map((_,gi)=>gi).filter(gi=>S.fall.pivots.has(S.gearPivots[gi])));
 S.drag.set(id,{gi:hitGear(S.gears,S.face,u,v,skip),moved:false,u,v,t0:performance.now()});
 weldPushPoint(S,id,u,v);spawnSparks(S,u,v,KNOBS.sparkPressCount);
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
 weldPushPoint(S,id,u,v);
 spawnSparks(S,u,v,Math.min(KNOBS.sparkMoveMax,Math.round(Math.hypot(u-pu,v-pv)/KNOBS.sparkPerFrac)));
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
 weldRelease(S,id,d.u,d.v);
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
 const weldActive=stepWeld(S,dt,now);
 // Sleeps (returns false) once no gear is moving, no pipe is wobbling, no light is lit, no weld spark/
 // trail is live and no cut animation is running — the board (portal-board-glb.mjs) stops driving rAF
 // at that point. In practice that's "never" while reducedMotion is off: the hub gears' idle motor
 // above keeps `moving` true forever.
 return moving||wobbling||lit||weldActive||t<1;
}
// Scale to 0 rather than fade: no transparent material twins to compile, swap or restore.
function cut(poly){
 heal();S.weld.length=0;S.weldHeads.clear(); // the weld layer floats above the parts: don't leave a bead hanging over the hole
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
 for(const l of S.layers){l.mesh.removeFromParent();l.mesh.geometry.dispose();l.mesh.material.dispose();l.texture.dispose();}
 for(const part of S.parts){part.pivot.removeFromParent();part.pivot.traverse(n=>n.geometry?.dispose());}
 for(const m of new Set(S.mats))m.dispose();
 S=null;
}

// R7: the weld trail alone in 2D, for the flat board (no gears, pipes or lights without WebGL): its own state.
export function cogsWeld(){
 let S=null;
 return {
  init({paint,glow,face,wake}){S={face,aspect:face.h/face.w,paint,glow,texW:paint.canvas.width,texH:paint.canvas.height,drag:new Map(),sparks:[],weld:[],weldHeads:new Map(),weldActive:false,wake,tint:selectedTint};weldTrace=S;},
  setTint(hex,selected=true){setCogsTint(hex,selected);},
  press(id,u,v){S.drag.set(id,{u,v,t0:performance.now()});weldPushPoint(S,id,u,v);spawnSparks(S,u,v,KNOBS.sparkPressCount);},
  move(id,u,v,pu,pv){const d=S.drag.get(id);if(d){d.u=u;d.v=v;}weldPushPoint(S,id,u,v);spawnSparks(S,u,v,Math.min(KNOBS.sparkMoveMax,Math.round(Math.hypot(u-pu,v-pv)/KNOBS.sparkPerFrac)));},
  release(id,u,v){S.drag.delete(id);weldRelease(S,id,u,v);},
  step:(dt,now)=>stepWeld(S,dt,now),
  dispose(){if(S===weldTrace)weldTrace=null;S=null;},
 };
}

cogsWeld.metal=true; // the flat poster tints as anodized metal, not a flat wash (portal-board.mjs paintStill)

export const cogs={
 id:'cogs',asset:'/pod/worlds/boards/cogs/door.glb',flip:false,background:'#161310',
 guide:null,frame:DEFAULT_FRAME,ink:false, // the weld trail replaces the shared ink line
 init,press,move,release,step,cut,heal,dispose,setTint:setCogsTint,tintTarget:'trace',trace2d:cogsWeld,
};
