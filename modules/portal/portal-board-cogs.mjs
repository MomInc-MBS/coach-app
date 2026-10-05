// Pre-sectioned mechanical metal grimoire. Existing kit gears, shared portal shapes.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {orientMatrix,pointInPolygon,GLB} from './portal-board-glb.mjs';
import {MECHANICAL_FRAME,mechanicalPaths,releasePaths,sectionPanels,mechanicalLayout,mechanismLayout,pointOnPath,signedRailImpulse} from './portal-mechanical-layout.mjs';

export const LAYOUT='/pod/worlds/boards/cogs/door-layout.json';
const PARTS='/pod/worlds/boards/cogs/parts-kit.glb';
// The same inset shape frame is shared by the metal assemblies and 2D fallback.
export const DEFAULT_FRAME=MECHANICAL_FRAME;
const HUB_NODE='m19';
const TAU=Math.PI*2,FRICTION=1.6,REST=.02,TAP_IMPULSE=4,MOVE_EPS=.006;
// ponytail: hard speed cap, not a torque/inertia model — keeps a wild flick from strobing the spokes.
const MAX_OMEGA=12;
// Valves idle at VALVE_IDLE rad/s in the (single, shared) train direction plus VALVE_RATIO of its
// omega, but (see valveActive in step()) only while the train or a finger is actually active.
// ponytail: every valve and every gear tree shares one idle direction/rate rather than each valve
// following its own nearest tree — give valves a `drives`-like link to their tree if two trains ever
// spin opposite and it reads wrong.
const VALVE_IDLE=.25,VALVE_RATIO=.15,LIGHT_COLOR='#c59a56';
const LAMP_CORE=new THREE.Color('#ffd9a0'),LAMP_OFF=new THREE.Color('#3d2f14'),lampOn=new THREE.Color(),lampTmp=new THREE.Color();
let selectedTint='#c59a56',selectedBackplateTint='#263943',weldTrace=null;
// Retained for existing callers; rebuilt metal uses its independent backplate tint.
export function doorTone(hex){
 const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
 let h=0;if(d){h=mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}
 const s=d?d/(1-Math.abs(2*l-1)):0,H=(h+.5)%1,S=s*.5,L=Math.min(l,.5)*.75,a=S*Math.min(L,1-L);
 const f=k=>{const t=(k+H*12)%12;return Math.round(255*(L-a*Math.max(-1,Math.min(t-3,9-t,1))));};
 return '#'+[f(0),f(8),f(4)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
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
 // sparkSpeedMinPx..MaxPx/60 wide at 60fps. Timeline: hot trail .5s (weldHotMs, held near-full for
 // weldHotHold of that then cooling), then the bead holds (weldBeadHold of weldBeadMs) and fades —
 // total 2.5s end to end. The seam sits on the plate face, with raised gears occluding it.
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
 torchCorePx:4.5,            // screen px, white-hot core radius at the contact point while a finger is down
 torchBloomPx:20,          // screen px, blue-white -> warm bloom around the core
 torchFlareMs:220,         // the press flare: core+bloom swell this long after touch-down
 torchFlareScale:2.2,      // how much bigger the bloom is at the instant of the press
 tintHaloMix:.22,          // the selected tint only tints the outer halo of the hot trail, this much
 weldStep:.016,            // face-width fraction: trail-point spacing
 weldHotMs:500,            // hot-glow portion of the trail
 weldHotHold:.35,           // fraction of weldHotMs held near-full brightness before it starts cooling
 weldBeadMs:2000,           // bead hold (weldBeadHold) + fade after the trail cools
 weldBeadHold:.625,         // 1.25s hold followed by .75s fade
 weldTrailWidthPx:3,        // screen px, hot-trail core stroke width
 weldTrailHaloPx:9,        // screen px, hot-trail bloom halo width
 weldBeadRadiusPx:2.5,      // screen px, bead half-width (~5px seam)
 weldRipplePx:3.8,          // screen px between "stack of dimes" ripples along the bead
 weldHaloRadiusPx:5.5,       // screen px, heat-tint band (straw next to the bead -> blue outside) half-width
 weldCap:260,               // ponytail: hard cap on stored trail points
};
// The tint picker recolours the kit parts (cogs, lamps, pipes...) as anodized metal (see metalFinish).
export const METAL={metalness:.92,roughness:.3,envIntensity:1.25};
// Portal release moves whole prebuilt plate assemblies with the existing timing and tilt.
const FALL_MS=1100,FALL_TILT=35*Math.PI/180;

// --- Pure train kinematics (unit-tested; no THREE/DOM) --------------------------------------
// Walks a gear's `drives` chain to the train's root and returns {root,ratio} such that, once
// settled, gears[i].omega === ratio*gears[root].omega (each mesh flips sign: ratio *= -r[parent]/r[self]).
function rootRatio(gears,i){
 let idx=i,ratio=1;
 while(gears[idx].drives!=null){const p=gears[idx].drives;ratio*=gears[idx].driveRatio??(-gears[p].r/gears[idx].r);idx=p;}
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
  if(g.drives!=null){const p=gears[g.drives];g.omega=p.omega*(g.driveRatio??(-p.r/g.r));}
  g.angle+=g.omega*dt;
 }
 return gears.some(g=>Math.abs(g.omega)>REST);
}
// Hub idle motor: every gear with an idleDir is pushed along it. Pure (tested): the board calls it each frame
// unless prefers-reduced-motion is on. Returns true when it is pushing, so the render loop stays awake.
export function idleSpin(gears,dt,accel,reduced){
 if(reduced)return false;let on=false;
 for(const g of gears)if(g.idleDir){g.omega+=g.idleDir*accel*dt;on=true;}
 return on;
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
  return {u:p.u,v:p.v,r:p.r,drives:p.drives!=null?(at.get(p.drives)??null):null,angle:(p.rot||0)*Math.PI/180,omega:0,driveRatio:p.driveRatio};
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
// Dressing keep-out (pure, tested): drops layout parts whose circle (r+.012) comes within `clear` face-widths of any shape
// path, or that overlap a keep-out circle {u,v,r} / cable segment {a,b,r}. Distances are in face-width units.
export function dressingKeep(parts,paths,face,circles=[],segments=[],clear=.012){
 return parts.filter(p=>{
  const R=p.r+.012,hit=pointOnPath(paths,face,p.u,p.v);
  if(hit&&hit.distance-R<clear)return false;
  for(const c of circles)if(Math.hypot((p.u-c.u)*face.w,(p.v-c.v)*face.h)<c.r+p.r)return false;
  for(const s of segments){
   const dx=(s.b[0]-s.a[0])*face.w,dy=(s.b[1]-s.a[1])*face.h,l2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p.u-s.a[0])*face.w*dx+(p.v-s.a[1])*face.h*dy)/l2));
   if(Math.hypot((p.u-s.a[0])*face.w-dx*t,(p.v-s.a[1])*face.h-dy*t)<s.r+p.r)return false;
  }
  return true;
 });
}
// Parts that fail dressingKeep where the old door put them are slid to the nearest free spot (spiral search, then shrunk
// to 70%/50%) so the panels fill up even though the shape lines own most of the old positions. Never overlaps an
// already-placed part. Returns the placed parts (moved ones carry the new u,v,r).
export function dressingPlace(parts,paths,face,circles=[],segments=[],clear=.012,reach=.16){
 const placed=[];
 for(const p of parts)for(const k of [1,.7,.5]){
  const q=dressingKeepAt(p,k,paths,face,circles.concat(placed.map(o=>({u:o.u,v:o.v,r:o.r}))),segments,clear,reach);
  if(q){placed.push(q);break;}
 }
 return placed;
}
function dressingKeepAt(p,k,paths,face,circles,segments,clear,reach){
 const r=p.r*k;
 for(let d=0;d<=reach;d+=.012)for(let n=d?Math.round(d/.012)*6:1,i=0;i<n;i++){
  const a=i/n*TAU,q={...p,r,u:p.u+Math.cos(a)*d,v:p.v+Math.sin(a)*d*face.w/face.h};
  const ry=r*face.w/face.h;if(q.u-r<.012||q.u+r>.988||q.v-ry<.008||q.v+ry>.992)continue; // keep whole part on the door
  if(dressingKeep([q],paths,face,circles,segments,clear).length)return q;
 }
 return null;
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
// Lock-progress helpers (pure, tested). p = fraction of a path's length traced; n = stations on that path.
export const boltOut=(p,station,n)=>Math.max(0,Math.min(1,p*n-station));
export const pistonExt=(stroke,angle)=>stroke*(.5+.5*Math.sin(angle));
export const lampLit=(p,station,n)=>p>0&&p>=station/n-1e-9;
// Fraction (0..1) of a polyline's length at the point (u,v) lying on segment `segment` (pointOnPath's hit).
export function pathProgress(points,face,segment,u,v){
 let before=0,total=0;
 for(let i=1;i<points.length;i++){const l=Math.hypot((points[i][0]-points[i-1][0])*face.w,(points[i][1]-points[i-1][1])*face.h);if(i-1<segment)before+=l;total+=l;}
 const a=points[segment];return Math.min(1,(before+Math.hypot((u-a[0])*face.w,(v-a[1])*face.h))/(total||1));
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
 const g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,'#f4f6fa');g.addColorStop(.42,'#8a9098');g.addColorStop(.55,'#32353b');g.addColorStop(1,'#08090b');
 x.fillStyle=g;x.fillRect(0,0,128,64);x.fillStyle='#ffffff';x.fillRect(18,8,10,22);x.fillRect(80,4,22,9);x.fillRect(46,10,16,14);x.fillRect(104,14,8,18);
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
export function setCogsTint(hex,selected=true){
 if(!validTint(hex))return;
 selectedTint=hex;
 if(S){for(const part of S.parts)if(part.kind==='light')part.mat.emissive.set(selectedTint||LIGHT_COLOR);applyMetal(S.mats);S.tint=selectedTint;S.wake?.();}
 if(weldTrace){weldTrace.tint=selectedTint;weldTrace.wake?.();}
}

// One GLTFLoader promise per file, so every slot using a kit shares a single load.
const models=new Map();
const loadModel=url=>{let pending=models.get(url);if(!pending){pending=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).catch(error=>{models.delete(url);throw error;});models.set(url,pending);}return pending;};
export function setCogsBackplateTint(hex,selected=true){
 if(selected&&!validTint(hex))return;selectedBackplateTint=selected?hex:'#263943';
 if(S){S.backplateMaterial?.color.set(selectedBackplateTint);S.wake?.();}
}
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
 const parts=[],gearPivots=[],batches=new Map();let gi=0;
 list.forEach((p,i)=>{
  const isGear=p.kind==='gear';
  let src;
  try{src=kitMesh(gltf,p.node);}
  catch(e){console.warn('portal-board-cogs: missing node',p.node,e);if(isGear)gi++;return;}
  const x=(p.u-.5)*fw,y=(.5-p.v)*fh,{m,depth}=fitModel(src,p.r*fw,true),pivot=new THREE.Group();
  const rot=(p.rot||0)*Math.PI/180;
  const part={...p,pivot,rot,angle:0,omega:0};
  pivot.position.set(x,y,front+(p.layer||0)*.006*fw+depth/2);
  part.z0=pivot.position.z;part.top=part.z0+depth/2; // rest z; pipes bob off this and back
  if(p.kind==='light'){
   // A previous board may have left the shared kit material in its metal state: start the clone from the stock values.
   const mat=src.material.clone(),stock=src.material.userData.cogsMetal;mat.userData={};if(stock)Object.assign(mat,stock);mat.emissive.set(selectedTint||LIGHT_COLOR);mat.emissiveMap=mat.map;mat.emissiveIntensity=KNOBS.lightOff;m.material=mat;
   mats.push(mat);Object.assign(part,{mat,phase:i*2.3,level:0,nearUntil:-Infinity});
  }else if(p.kind==='valve')part.dir=i%2?1:-1;
  pivot.rotation.z=rot;
  if(isGear){
   let batch=batches.get(p.node);if(!batch){const mat=src.material.clone();mat.userData={};mats.push(mat);const mesh=new THREE.InstancedMesh(src.geometry,mat,list.filter(q=>q.kind==='gear'&&q.node===p.node).length);mesh.frustumCulled=false;mesh.castShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);parent.add(mesh);batch={mesh,next:0};batches.set(p.node,batch);}
   part.instance={mesh:batch.mesh,index:batch.next++,matrix:m.matrix.clone()};part.mat=batch.mesh.material;
  }else{pivot.add(m);part.mat=m.material;}
  parent.add(pivot);parts.push(part);
  if(isGear){gearPivots[gi]=pivot;gi++;}
 });
 return {parts,gearPivots,batches:[...batches.values()].map(b=>b.mesh)};
}
// The old door's pipes/screws/plates/valves, one BatchedMesh per kit material (the kit has two) = 2 draw calls total.
// Parts keep their own pivot (so pipes wiggle / valves spin / panels fall) and write into the batch via the same
// `instance` path as the gears; `matrix` is the fitted model matrix.
function buildDressing(parent,gltf,list,front,fw,fh,mats){
 const items=[],groups=new Map();
 for(const p of list){
  let src;try{src=kitMesh(gltf,p.node);}catch(e){console.warn('portal-board-cogs: missing node',p.node,e);continue;}
  const {m,depth}=fitModel(src,p.r*fw,true),pivot=new THREE.Group(),rot=(p.rot||0)*Math.PI/180,z=front+(p.layer||0)*.006*fw+depth/2;
  pivot.position.set((p.u-.5)*fw,(.5-p.v)*fh,z);pivot.rotation.z=rot;
  const part={...p,pivot,rot,angle:0,omega:0,z0:z,top:z+depth/2,dir:p.kind==='valve'?(items.length%2?1:-1):undefined,instance:{mesh:null,index:-1,matrix:m.matrix.clone()}};
  let g=groups.get(src.material);if(!g){g={material:src.material,geos:new Map(),items:[]};groups.set(src.material,g);}
  g.geos.set(src.geometry,null);g.items.push({part,geometry:src.geometry});items.push(part);
 }
 const batches=[];
 for(const g of groups.values()){
  let v=0,ix=0;for(const geo of g.geos.keys()){v+=geo.attributes.position.count;ix+=geo.index?geo.index.count:0;}
  const mat=g.material.clone();mat.userData={};mats.push(mat);
  const mesh=new THREE.BatchedMesh(g.items.length,v,ix,mat);mesh.frustumCulled=false;mesh.perObjectFrustumCulled=false;parent.add(mesh);batches.push(mesh);
  for(const geo of g.geos.keys())g.geos.set(geo,mesh.addGeometry(geo));
  for(const it of g.items){it.part.instance.mesh=mesh;it.part.instance.index=mesh.addInstance(g.geos.get(it.geometry));it.part.mat=mat;}
 }
 return {parts:items,batches};
}
const instanceTransform=new THREE.Matrix4(),instanceZero=new THREE.Matrix4().makeScale(0,0,0);
function updateGearInstances(state){
 for(const panel of state.panels){panel.group.updateMatrix();state.panelBatch.setMatrixAt(panel.batchId,panel.group.matrix);state.panelBatch.setVisibleAt(panel.batchId,panel.group.visible);}
 for(const part of state.parts)if(part.instance){
  const {mesh,index,matrix}=part.instance;part.pivot.updateMatrix();
  if(!part.pivot.parent.visible)mesh.setMatrixAt(index,instanceZero);
  else{instanceTransform.multiplyMatrices(part.pivot.parent.matrix,part.pivot.matrix).multiply(matrix);mesh.setMatrixAt(index,instanceTransform);}
 }
 for(const batch of state.batches)if(batch.instanceMatrix)batch.instanceMatrix.needsUpdate=true; // BatchedMesh uploads its own matrices
}

// The weld trail's own two layers in 3D, floating just above the tallest kit part so gears and pipes
// never hide the sparks or the bead: the bead layer (normal blend) and the glow layer (additive) on top.
// The door's own paint/glow inputs stay blank, so the trail isn't drawn twice.
function weldLayer(parent,w,h,fw,fh,z,additive){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace; // flipY default: canvas row 0 = plane top
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false,...(additive?{blending:THREE.AdditiveBlending}:{})});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(fw,fh),material);mesh.position.z=z;mesh.renderOrder=additive?11:10;mesh.frustumCulled=false;parent.add(mesh);
 return {canvas,ctx:canvas.getContext('2d'),texture,mesh};
}

async function init({mesh,face,wake,paint,glow}){
 const fw=face.w,fh=face.h,parent=mesh.isMesh?mesh.parent:mesh;
 const originals=[];mesh.traverse(n=>{if(n.isMesh){originals.push(n);n.visible=false;}});
 const [layout,gltf]=await Promise.all([
  fetch(cogs.layoutAsset||LAYOUT).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json();}),
  loadModel(cogs.partsAsset||PARTS),
 ]);
 cogs.frame=DEFAULT_FRAME;
 const paths=mechanicalPaths(),panels=sectionPanels([...paths,...releasePaths(face)]),owned=new THREE.Group();parent.add(owned);
 const railCanvas=document.createElement('canvas');railCanvas.width=paint.canvas.width;railCanvas.height=paint.canvas.height;
 const ctx=railCanvas.getContext('2d');ctx.strokeStyle='#fff';ctx.lineWidth=railCanvas.width*.006;ctx.lineJoin='round';ctx.lineCap='round';
 for(const path of paths){ctx.beginPath();path.points.forEach(([u,v],i)=>i?ctx.lineTo(u*railCanvas.width,v*railCanvas.height):ctx.moveTo(u*railCanvas.width,v*railCanvas.height));ctx.stroke();}
 const railTexture=new THREE.CanvasTexture(railCanvas);railTexture.flipY=false;
 const backplateMaterial=new THREE.MeshStandardMaterial({color:selectedBackplateTint,metalness:.55,roughness:.42,envMap:studioEnv(),envMapIntensity:.8});
 backplateMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uRailTint=uMetalTint;shader.uniforms.uRails={value:railTexture};
  shader.fragmentShader='uniform vec3 uRailTint;uniform sampler2D uRails;varying vec2 vMetalUv;\n'+shader.fragmentShader;
  shader.vertexShader='varying vec2 vMetalUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMetalUv=vec2(position.x/'+fw+'+.5,.5-position.y/'+fh+');');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat rail=texture2D(uRails,vMetalUv).r;diffuseColor.rgb=mix(diffuseColor.rgb,uRailTint*.7,rail);');
  // Directional polishing and fine abrasion remain part of the steel material,
  // so they keep the selected back-wall hue and respond to its studio reflection.
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat brush=sin(vMetalUv.y*2350.0+sin(vMetalUv.x*80.0)*.65);roughnessFactor=clamp(roughnessFactor+brush*.055,.28,.62);')
   .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(0.,brush*.045,0.));');
 };
 backplateMaterial.customProgramCacheKey=()=>`mechanical-backplate-${fw}-${fh}`;
 const front=.025*fw,depth=.026*fw;
 for(const panel of panels){
  const shape=new THREE.Shape();panel.points.forEach(([u,v],i)=>{
   // Inset toward each vertex's interior bisector. Bevel width is less than the
   // inset, so the real joint remains open instead of bevels growing together.
   const prev=panel.points[(i+panel.points.length-1)%panel.points.length],next=panel.points[(i+1)%panel.points.length],ax=(u-prev[0])*fw,ay=(v-prev[1])*fh,bx=(next[0]-u)*fw,by=(next[1]-v)*fh,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by),nx=-ay/al-by/bl,ny=ax/al+bx/bl,nl=Math.hypot(nx,ny)||1,inset=Math.min(.0012*fw,al*.08,bl*.08),x=(u-.5)*fw+nx/nl*inset,y=(.5-v)*fh-ny/nl*inset;
   i?shape.lineTo(x,y):shape.moveTo(x,y);
  });shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.0012*fw,bevelSize:.00065*fw,bevelSegments:1,steps:1,curveSegments:1});
  // Each cell is an opaque, thick manufactured plate. A small normal inset makes
  // the pre-existing joints visible without eroding the small oval-edge facets.
  const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++)positions.setZ(i,positions.getZ(i)+front-depth);
  const group=new THREE.Group();owned.add(group);panel.group=group;panel.geometry=geometry;panel.gearIndices=[];
 }
 // BatchedMesh keeps every manufactured plate distinct while sharing its one
 // material and draw call. Release changes whole plate transforms only.
 const vertexCount=panels.reduce((n,p)=>n+p.geometry.attributes.position.count,0),panelBatch=new THREE.BatchedMesh(panels.length,vertexCount,0,backplateMaterial);panelBatch.frustumCulled=false;panelBatch.perObjectFrustumCulled=false;panelBatch.receiveShadow=true;owned.add(panelBatch);
 for(const panel of panels){const geometryId=panelBatch.addGeometry(panel.geometry);panel.batchId=panelBatch.addInstance(geometryId);}
 const nodes=[HUB_NODE]; // the kit's thin, face-on twenty-spoke cog: no bulky ornamental substitutes
 const built=mechanicalLayout(face,paths,nodes.length?nodes:[HUB_NODE]),list=built.parts;
 // Coaxial/belt couplers share the developed damped momentum across all rails;
 // individual meshes still counter-rotate at equal rim speeds along a rail.
 const first=built.trains[0]?.[0];for(const train of built.trains.slice(1)){const i=train[0];list[i].drives=first;list[i].driveRatio=list[first].r/list[i].r;}
 const gears=gearsFromLayout(list),mats=[],mech=mechanismLayout(face,paths,built),deg=a=>-a*180/Math.PI; // layout rot is face-uv (y down); the scene is y up
 mech.dial=[].concat(mech.dial)[0];
 list.push({node:HUB_NODE,kind:'dial',u:mech.dial.u,v:mech.dial.v,r:mech.dial.r,rot:0,layer:13});
 if(gears[0])gears[0].idleDir=1;
 const {parts,gearPivots,batches}=gltf?buildParts(owned,gltf,list,front,fw,fh,mats):{parts:[],gearPivots:[],batches:[]};
 // The previous door's kit dressing (pipes/screws/plates/valves) fills the panels between the shape lines; gears/lights are our own.
 const keepOut=[...list.map(g=>({u:g.u,v:g.v,r:g.r+.006})),...mech.lamps.map(l=>({u:l.u,v:l.v,r:l.r+.006})),...mech.weights.map(w=>({u:w.u,v:w.v,r:w.r+.006})),...mech.bolts.map(b=>({u:b.u,v:b.v,r:.055})),...mech.pistons.map(p=>({u:p.u,v:p.v,r:.05}))];
 const dress=dressingPlace((layout.parts||[]).filter(p=>['pipe','screw','plate','valve'].includes(p.kind)).map(p=>({...p,drives:undefined,layer:{plate:.3,screw:1.6,pipe:1.4,valve:1.4}[p.kind]})),[...paths,...releasePaths(face)],face,keepOut,mech.cables.map(c=>({a:c.from,b:c.to,r:c.r+.004})));
 const dressed=gltf&&dress.length?buildDressing(owned,gltf,dress,front,fw,fh,mats):{parts:[],batches:[]};
 batches.push(...dressed.batches);
 const panelAt=(u,v)=>panels.find(p=>pointInPolygon(u,v,p.points))||panels.reduce((a,b)=>Math.hypot((a.center[0]-u)*fw,(a.center[1]-v)*fh)<Math.hypot((b.center[0]-u)*fw,(b.center[1]-v)*fh)?a:b);
 for(const p of parts)if(p.kind!=='gear')panelAt(p.u,p.v).group.add(p.pivot); // the dial rides its panel
 for(const p of dressed.parts){panelAt(p.u,p.v).group.add(p.pivot);parts.push(p);}
 for(let gi=0;gi<gearPivots.length;gi++){
  const g=gears[gi],h=list[gi].hub,dx=g.u-.5,dy=g.v-.495,l=Math.hypot(dx,dy)||1,u=g.u+(h?(g.u<.5?-.015:.015):dx/l*.004),v=g.v+(h?(g.v<.5?-.01:.01):dy/l*.004),panel=panelAt(u,v); // non-hub gears nudge outward like the other seam parts
  if(gearPivots[gi])panel.group.add(gearPivots[gi]);panel.gearIndices.push(gi);
 }
 // The gold channels are real raised metal mounted on each pre-existing cell,
 // not a floating drawing. Each half-channel belongs to one side of its joint,
 // so the released plate carries its physical channel away with it.
 const railSegments=[];
 for(const panel of panels)for(let i=0;i<panel.points.length;i++){
  const a=panel.points[i],b=panel.points[(i+1)%panel.points.length],hit=pointOnPath(paths,face,(a[0]+b[0])/2,(a[1]+b[1])/2),dx=(b[0]-a[0])*fw,dy=-(b[1]-a[1])*fh,length=Math.hypot(dx,dy);
  if(!hit||hit.distance>1e-5*fw||length<.005*fw)continue;
  railSegments.push({panel,a,b,dx,dy,length});
 }
 const railGeometry=new THREE.BoxGeometry(1,1,1),railMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.92,roughness:.3,envMap:studioEnv(),envMapIntensity:1.25}),railBatch=new THREE.InstancedMesh(railGeometry,railMaterial,railSegments.length);railBatch.frustumCulled=false;railBatch.castShadow=true;railBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);owned.add(railBatch);batches.push(railBatch);mats.push(railMaterial);
 railSegments.forEach(({panel,a,b,dx,dy,length},index)=>{
  const pivot=new THREE.Group(),width=.0028*fw;
  // Clockwise face contour: right normal points inside the panel.
  pivot.position.set(((a[0]+b[0])/2-.5)*fw+dy/length*.0024*fw,(.5-(a[1]+b[1])/2)*fh-dx/length*.0024*fw,front+.0035*fw);pivot.rotation.z=Math.atan2(dy,dx);panel.group.add(pivot);
  parts.push({kind:'rail',pivot,mat:railMaterial,instance:{mesh:railBatch,index,matrix:new THREE.Matrix4().makeScale(Math.max(.001*fw,length-.0012*fw),width,.007*fw)}});
 });
 const shaftGeometry=new THREE.CylinderGeometry(1,1,1,10);shaftGeometry.rotateX(Math.PI/2);
 const shaftBatch=new THREE.InstancedMesh(shaftGeometry,railMaterial,gears.length);shaftBatch.frustumCulled=false;shaftBatch.castShadow=true;shaftBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);owned.add(shaftBatch);batches.push(shaftBatch);
 for(let gi=0;gi<gears.length;gi++){
  const gear=gears[gi],gearPart=parts.find(p=>p.kind==='gear'&&p.pivot===gearPivots[gi]);if(!gearPart)continue;
  const bottom=2*gearPart.z0-gearPart.top,height=Math.max(.004*fw,bottom-front),pivot=new THREE.Group();pivot.position.set((gear.u-.5)*fw,(.5-gear.v)*fh,front+height/2);gearPivots[gi].parent.add(pivot);
  parts.push({kind:'shaft',pivot,mat:railMaterial,instance:{mesh:shaftBatch,index:gi,matrix:new THREE.Matrix4().makeScale(gear.r*.2*fw,gear.r*.2*fw,height)}});
 }
 const bearingGeometry=new THREE.TorusGeometry(.009*fw,.0025*fw,5,20);
 built.trains.forEach((train,i)=>{
  const g=gears[train[0]],panel=panels.find(p=>p.gearIndices.includes(train[0])),mat=new THREE.MeshStandardMaterial({color:selectedTint,metalness:.72,roughness:.32,emissive:selectedTint,emissiveIntensity:0}),pivot=new THREE.Group();
  pivot.position.set((g.u-.5)*fw,(.5-g.v)*fh,(parts.find(p=>p.pathIndex===i)?.top||front+.02*fw)+.001*fw);pivot.add(new THREE.Mesh(bearingGeometry,mat));panel.group.add(pivot);mats.push(mat);
  parts.push({kind:'light',u:g.u,v:g.v,r:.02,pivot,mat,phase:i*2.3,level:0,nearUntil:-Infinity});
 });
 // Procedural mechanism pieces share the rail material: one InstancedMesh per kind; each part's pivot rides its panel, poseMech() moves the matrix.
 const mechGeos=[],mk=(geo,n)=>{const m=new THREE.InstancedMesh(geo,railMaterial,n);m.frustumCulled=false;m.castShadow=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.userData.n=0;owned.add(m);batches.push(m);mechGeos.push(geo);return m;};
 const bar=new THREE.CylinderGeometry(1,1,1,10).rotateZ(Math.PI/2),box=new THREE.BoxGeometry(1,1,1),ring=new THREE.TorusGeometry(1,.07,6,28);
 const boltMesh=mk(box,mech.bolts.length),tubeMesh=mk(bar,mech.tubes.length),bodyMesh=mk(bar,mech.pistons.length),rodMesh=mk(bar,mech.pistons.length),cableMesh=mk(bar,mech.cables.length),weightMesh=mk(box,mech.weights.length),notchMesh=mk(box,12),rimMesh=mk(ring,mech.pulleys.length);
 // Lamps: emissive core sphere + two additive halo batches (tight glow, wide "cast light" on the door). Cast no shadow.
 const lampMat=new THREE.MeshBasicMaterial({toneMapped:false}),lampMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),lampMat,mech.lamps.length);
 lampMesh.frustumCulled=false;lampMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);lampMesh.userData.n=0;owned.add(lampMesh);batches.push(lampMesh);mechGeos.push(lampMesh.geometry,lampMat);
 const haloTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.45)');g.addColorStop(.6,'rgba(255,255,255,.1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
 const haloGeo=new THREE.PlaneGeometry(2,2),mkHalo=(order)=>{const m=new THREE.InstancedMesh(haloGeo,new THREE.MeshBasicMaterial({map:haloTex,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}),mech.lamps.length);m.frustumCulled=false;m.renderOrder=order;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.userData.n=0;owned.add(m);batches.push(m);mechGeos.push(m.material,haloTex);return m;};
 const glowMesh=mkHalo(20),castMesh=mkHalo(19);mechGeos.push(haloGeo);
 // Seam parts are nudged .004 outward (bolts inward) before choosing a panel, so each rides one side of its joint and falls with it.
 const side=(u,v,k)=>{const dx=u-.5,dy=v-.495,l=Math.hypot(dx,dy)||1,n=k==='bolt'?-.004:['tube','body','rod','lamp'].includes(k)?.004:0;return [u+dx/l*n,v+dy/l*n];};
 const add=(mesh,kind,u,v,rot,z,extra,group)=>{const pivot=new THREE.Group(),part={kind,pivot,mat:railMaterial,u,v,rot,instance:{mesh,index:mesh.userData.n++,matrix:new THREE.Matrix4()},...extra};pivot.position.set((u-.5)*fw,(.5-v)*fh,z);pivot.rotation.z=rot;(group||panelAt(...side(u,v,kind)).group).add(pivot);parts.push(part);return part;};
 const zAt=layer=>front+layer*.006*fw,uvRot=a=>-a;
 for(const b of mech.bolts)add(boltMesh,'bolt',b.u,b.v,uvRot(b.rot),zAt(4),{pathIndex:b.pathIndex,station:b.station,throw:b.throw,side:b.side??1});
 for(const t of mech.tubes)add(tubeMesh,'tube',t.u,t.v,uvRot(t.rot),zAt(3),{}).instance.matrix.makeScale(t.len*fw,(t.r||.007)*fw,(t.r||.007)*fw);
 for(const p of mech.pistons){const hb=1.2*p.r*fw;add(bodyMesh,'body',p.u,p.v,uvRot(p.rot),zAt(4),{}).instance.matrix.makeScale(hb*2,.012*fw,.012*fw);add(rodMesh,'rod',p.u,p.v,uvRot(p.rot),zAt(4),{stroke:p.stroke,drives:p.drives,hb,Lr:hb*1.5,rr:.005*fw});}
 mech.lamps.forEach((l,i)=>{add(lampMesh,'lamp',l.u,l.v,0,zAt(12),{r0:l.r*fw,pathIndex:l.pathIndex,station:l.station,phase:i*2.3,level:0,nearUntil:-Infinity,flashUntil:-Infinity}).instance.matrix.makeScale(l.r*fw,l.r*fw,l.r*fw);lampMesh.setColorAt(i,LAMP_OFF);const pt=parts[parts.length-1];for(const [key,hm] of [['glow',glowMesh],['cast',castMesh]]){const h={kind:'halo',pivot:pt.pivot,mat:railMaterial,instance:{mesh:hm,index:hm.userData.n++,matrix:new THREE.Matrix4().makeScale(0,0,0)}};parts.push(h);pt[key]=h;hm.setColorAt(h.instance.index,LAMP_OFF);}});
 for(const c of mech.cables){const dx=(c.to[0]-c.from[0])*fw,dy=-(c.to[1]-c.from[1])*fh,len=Math.hypot(dx,dy),pt=add(cableMesh,'cable',(c.from[0]+c.to[0])/2,(c.from[1]+c.to[1])/2,Math.atan2(dy,dx),zAt(2),{});pt.instance.matrix.makeScale(len,c.r*fw,c.r*fw);}
 mech.weights.forEach((w,i)=>{const c=mech.cables[i]??mech.cables[0];if(!c)return;add(weightMesh,'weight',w.u,w.v,Math.atan2(-(c.to[1]-c.from[1])*fh,(c.to[0]-c.from[0])*fw),zAt(3),{travel:w.travel,drives:w.drives,size:w.r*2*fw});});
 for(const p of mech.pulleys){const gp=parts.find(q=>q.pivot===gearPivots[p.drives]);if(!gp)continue;const pt=add(rimMesh,'rim',p.u,p.v,0,gp.top+.001*fw,{},gearPivots[p.drives].parent);pt.instance.matrix.makeScale(p.r*fw*1.08,p.r*fw*1.08,.005*fw);}
 for(let k=0;k<12;k++){const a=k*Math.PI/6,d=parts.find(q=>q.kind==='dial'),pt=add(notchMesh,'notch',mech.dial.u,mech.dial.v,a,(d?.top??zAt(14))+.001*fw,{});pt.instance.matrix.makeScale(.012*fw,.006*fw,.006*fw).setPosition(mech.dial.r*fw*.9,0,0);}
 for(const m of batches)if(m.userData.n!=null)m.count=m.userData.n;
 const tally=(a)=>a.reduce((o,x)=>(o[x.pathIndex]=(o[x.pathIndex]||0)+1,o),{});
 mats.push(...new Set(parts.map(p=>p.mat)));
 for(const m of mats)metalFinish(m);applyMetal(mats);
 const tw=paint.canvas.width,th=paint.canvas.height;
 // Weld lies on the plate face; proud gears correctly occlude it. No elevated
 // full-board decal can hang over an opening left by a released assembly.
 const beadLayer=weldLayer(owned,tw,th,fw,fh,front+.0018*fw,false),glowLayer=weldLayer(owned,tw,th,fw,fh,front+.002*fw,true);
 const motion=matchMedia?.('(prefers-reduced-motion: reduce)'),reducedMotion=!!motion?.matches;
 S={dial:mech.dial,closed:paths.map(p=>Math.hypot(p.points[0][0]-p.points.at(-1)[0],p.points[0][1]-p.points.at(-1)[1])<1e-7),prog:paths.map(()=>0),cutToken:null,cutTimer:null,cutResolve:null,boltN:tally(mech.bolts),lampN:tally(mech.lamps),mechGeos,spin:null,motion,gears,gearPivots,parts,face,aspect:fh/fw,valveDir:1,mats,drag:new Map(),fall:null,wake,reducedMotion,paths,trains:built.trains,panels,owned,originals,backplateMaterial,railTexture,batches,bearingGeometry,railGeometry,shaftGeometry,panelBatch,
    paint:beadLayer,glow:glowLayer,layers:[beadLayer,glowLayer],texW:tw,texH:th,
    sparks:[],weld:[],weldHeads:new Map(),weldActive:false,tint:selectedTint};
 updateGearInstances(S);
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
 if(S.fall&&pointInPolygon(u,v,S.fall.poly)){S.weldHeads.delete(id);return;}
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
function clipMetalSurface(S,ctx){
 if(!S.fall)return;ctx.beginPath();ctx.rect(0,0,S.texW,S.texH);
 S.fall.poly.forEach(([u,v],i)=>i?ctx.lineTo(u*S.texW,v*S.texH):ctx.moveTo(u*S.texW,v*S.texH));ctx.closePath();ctx.clip('evenodd');
}
// Hot trail, bucketed by age: each bucket is ONE path, so overlapping segment caps don't stack into a
// row of brighter dots (the old per-segment strokes did). Blurred halo pass, then a crisp core pass:
// white-hot, cooling yellow->orange->red. The selected tint only leans the outer halo a little.
function weldRenderGlow(S,now,scale){
 const {ctx}=S.glow,w=S.texW,h=S.texH,K=KNOBS;
 const coreW=K.weldTrailWidthPx*scale,haloW=K.weldTrailHaloPx*scale,sparkW=K.sparkWidthPx*scale;
 ctx.clearRect(0,0,w,h);
 ctx.save();clipMetalSurface(S,ctx);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
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
  if(S.fall&&pointInPolygon(d.u,d.v,S.fall.poly))continue;
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
 ctx.save();clipMetalSurface(S,ctx);ctx.lineCap='round';ctx.lineJoin='round';
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

// Lock progress: arc length a finger actually covers along ONE path (it sticks to it while within .03 face-widths), so
// taps, reverse traces and crossing other shapes never jump the lock. `d` is the finger's {pi,f} memory.
export function trackFinger(paths,closed,face,prog,d,u,v){
 const w=face.w;let hit=null,pi=d.pi;
 if(pi!=null){hit=pointOnPath([paths[pi]],face,u,v);if(hit.distance>=.03*w)hit=null;}
 if(!hit){hit=pointOnPath(paths,face,u,v);if(!hit||hit.distance>=.03*w){d.pi=d.f=null;d.lu=u;d.lv=v;return;}pi=hit.pathIndex;}
 const pts=paths[pi].points,f=pathProgress(pts,face,hit.segment,hit.u,hit.v);
 let pf=pi===d.pi?d.f:null; // switching paths (e.g. leaving a shared corner): start from where the last sample sat on this one
 if(pf==null&&d.lu!=null){const h0=pointOnPath([paths[pi]],face,d.lu,d.lv);if(h0.distance<.03*w)pf=pathProgress(pts,face,h0.segment,h0.u,h0.v);}
 if(pf!=null&&d.lu!=null){
  let df=Math.abs(f-pf);if(closed[pi])df=Math.min(df,1-df);
  let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot((pts[i][0]-pts[i-1][0])*face.w,(pts[i][1]-pts[i-1][1])*face.h);
  // progress can't outrun the finger: a fast swipe on a long straight line still counts, a teleport doesn't
  if(df*L<=1.5*Math.hypot((u-d.lu)*face.w,(v-d.lv)*face.h)+.01*w){prog[pi]=Math.min(1,prog[pi]+df);if(prog[pi]>=.94)prog[pi]=1;}
 }
 d.pi=pi;d.f=f;d.lu=u;d.lv=v;
}
function progress(i,p){if(S&&i in S.prog){S.prog[i]=Math.max(0,Math.min(1,p));S.wake?.();}}
function press(id,u,v){
 if(!S||S.fall&&pointInPolygon(u,v,S.fall.poly))return;
 const skip=S.fall?.gearIndices;
 S.drag.set(id,{gi:hitGear(S.gears,S.face,u,v,skip),moved:false,u,v,t0:performance.now(),pi:null,f:null});
 weldPushPoint(S,id,u,v);spawnSparks(S,u,v,KNOBS.sparkPressCount);
}
function move(id,u,v,pu,pv){
 if(!S)return;
 const d=S.drag.get(id);if(!d)return;
 if(Math.hypot(u-pu,v-pv)>MOVE_EPS)d.moved=true;
 d.u=u;d.v=v;
 if(S.fall&&pointInPolygon(u,v,S.fall.poly)){S.weldHeads.delete(id);return;}
 trackFinger(S.paths,S.closed,S.face,S.prog,d,u,v);
 // Acquire the rail on every move: starting between gears still turns the
 // entire train. Projection onto its tangent preserves forward/reverse swipes.
 const rail=pointOnPath(S.paths,S.face,u,v);
 if(rail&&rail.distance<.075*S.face.w){
  const train=S.trains[rail.pathIndex],gi=train.reduce((a,b)=>Math.hypot(S.gears[a].u-u,(S.gears[a].v-v)*S.aspect)<Math.hypot(S.gears[b].u-u,(S.gears[b].v-v)*S.aspect)?a:b);
  if(!S.fall?.gearIndices.has(gi)){d.gi=gi;applyTorque(S.gears,train[0],signedRailImpulse(rail,u-pu,v-pv,S.face,S.gears[gi].r,.8));}
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
 if(!S)return;
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
// Moves the procedural mechanism pieces: bolts by trace progress, rods/weights/dial by their driving gear's angle.
function poseMech(S,now){
 const fw=S.face.w,G=S.gears,sp=S.spin?Math.min(1,(now-S.spin.t0)/S.spin.ms):0,dialA=G[S.dial.drives].angle+TAU*sp*sp*(3-2*sp);
 for(const p of S.parts){
  const m=p.instance?.matrix;
  if(p.kind==='bolt')m.makeScale(.014*fw,2*p.throw*fw,.008*fw).setPosition(0,p.side*boltOut(S.prog[p.pathIndex],p.station,S.boltN[p.pathIndex])*p.throw*1.1*fw,0);
  else if(p.kind==='rod')m.makeScale(p.Lr,p.rr,p.rr).setPosition(p.hb-p.Lr/2+pistonExt(p.stroke,G[p.drives].angle)*fw,0,0);
  else if(p.kind==='weight')m.makeScale(p.size,p.size,p.size).setPosition(p.travel*fw*(.5+.5*Math.sin(G[p.drives].angle)),0,0);
  else if(p.kind==='dial')p.pivot.rotation.z=dialA;
  else if(p.kind==='notch')p.pivot.rotation.z=p.rot+dialA;
 }
 if(sp>=1)S.spin=null;
}
function step(dt,now){
 if(!S)return false;
 // Live media query (not just at init) and the motor runs before the rest check, so a sleeping loop can never
 // be left with the hubs "at rest" while the motor is on.
 const idling=idleSpin(S.gears,dt,KNOBS.hubIdleAccel,S.motion?S.motion.matches:S.reducedMotion);
 const moving=stepTrain(S.gears,dt)||idling;
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
  const falling=S.fall?.pivots.has(part.pivot.parent);
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
  }else if((part.kind==='light'||part.kind==='lamp')&&!falling){
   let near=false;
   for(const d of S.drag.values()){const dx=(d.u-part.u)*S.face.w,dy=(d.v-part.v)*S.face.h;if(Math.hypot(dx,dy)<KNOBS.lightRadius*S.face.w){near=true;break;}}
   if(near)part.nearUntil=now+KNOBS.lightHoldMs;
   const target=now<part.nearUntil||now<part.flashUntil||(part.pathIndex!=null&&lampLit(S.prog[part.pathIndex],part.station,S.lampN[part.pathIndex]))?1:0;
   part.level=lightLevel(part.level,target,dt,KNOBS.lightRampMs,KNOBS.lightFadeMs);
   const reduced=S.motion?S.motion.matches:S.reducedMotion;
   if(part.kind==='lamp'){
    const {mesh,index}=part.instance,fl=!reduced&&part.level>.95?1+Math.sin(now*.02+part.phase)*KNOBS.lightFlicker:1,L=part.level,k=part.r0*(.4+.6*L);
   lampOn.set(selectedTint||LIGHT_COLOR).lerp(LAMP_CORE,.6); // warm white-amber core, 40% tint
   part.instance.matrix.makeScale(k,k,k);mesh.setColorAt(index,lampTmp.copy(LAMP_OFF).lerp(lampOn,L).multiplyScalar(fl));mesh.instanceColor.needsUpdate=true;
   // halos (additive: colour*level carries the fade); matrices are pivot-local, updateGearInstances composes them
   for(const [h,sc,gain,z] of [[part.glow,5*k,1,part.r0*.9],[part.cast,10*part.r0*L,.28,-.068*S.face.w]]){h.instance.matrix.makeScale(sc,sc,sc).setPosition(0,0,z);h.instance.mesh.setColorAt(h.instance.index,lampTmp.set(selectedTint||LIGHT_COLOR).multiplyScalar(gain*L*fl*fl));h.instance.mesh.instanceColor.needsUpdate=true;}
   }else{
    const flicker=!reduced&&part.level>.95?Math.sin(now*.02+part.phase)*KNOBS.lightFlicker*KNOBS.lightOn:0;
    part.mat.emissiveIntensity=Math.max(0,KNOBS.lightOff+(KNOBS.lightOn-KNOBS.lightOff)*part.level+flicker);
   }
   if(part.level!==target||(!reduced&&part.level>.001))lit=true; // under reduced motion a settled lit lamp lets the loop sleep
  }
 }
 const f=S.fall,t=f?Math.min(1,(now-f.t0)/Math.max(1,f.ms)):1,e=t*t;
 if(f)for(const [p,z0] of f.pivots){p.position.z=z0-f.dist*e;p.position.y=p.userData.restY-f.dist*.3*e;p.rotation.x=FALL_TILT*e;p.visible=t<1;}
 poseMech(S,now);
 updateGearInstances(S);
 const weldActive=stepWeld(S,dt,now);
 // Sleeps (returns false) once no gear is moving, no pipe is wobbling, no light is lit, no weld spark/
 // trail is live and no cut animation is running — the board (portal-board-glb.mjs) stops driving rAF
 // at that point. In practice that's "never" while reducedMotion is off: the hub gears' idle motor
 // above keeps `moving` true forever.
 return moving||wobbling||lit||weldActive||t<1||!!S.spin;
}
// Release existing opaque assemblies at their manufactured scale.
// Completion: the released outline's rings fill, lamps flash, the dial turns once (300 ms), then the panels fall.
// heal() inside that window cancels the release (cutToken) and resolves the promise early.
function cut(poly,color,ms=FALL_MS){
 if(!S)return Promise.resolve();
 const s=S,spin=s.motion?.matches?0:300,now=performance.now();heal();
 const ring=[...poly,poly[0]],done=s.paths.map((p,i)=>p.points.every(([u,v])=>pointOnPath([{points:ring}],s.face,u,v).distance<.01*s.face.w)?i:-1).filter(i=>i>=0);
 for(const i of done)s.prog[i]=1;
 for(const p of s.parts)if(p.kind==='light'||p.kind==='lamp')p.flashUntil=now+900;
 s.spin=spin?{t0:now,ms:spin}:null;const token=s.cutToken={};s.wake?.();
 return new Promise(res=>{s.cutResolve=res;s.cutTimer=setTimeout(()=>{
  s.cutResolve=null;if(S!==s||s.cutToken!==token)return res();s.cutToken=null;
  const p=s.prog.slice(),fell=fall(poly,color,ms);s.prog.splice(0,p.length,...p);
  const t=performance.now();for(const q of s.parts)if(q.kind==='light'||q.kind==='lamp')q.flashUntil=t+600;
  res(fell);},spin);});
}
function fall(poly,color,ms=FALL_MS){
 if(!S)return Promise.resolve();heal();S.weld.length=0;S.weldHeads.clear();S.sparks.length=0;S.drag.clear();
 // Erase both surface layers immediately, including the torch, before a plate
 // departs. Future points in the aperture are rejected by weldPushPoint.
 for(const l of S.layers){l.ctx.clearRect(0,0,S.texW,S.texH);l.texture.needsUpdate=true;}
 const pivots=new Map(),gearIndices=new Set();
 for(const panel of S.panels)if(pointInPolygon(...panel.center,poly)){
  panel.group.userData.restY=panel.group.position.y;pivots.set(panel.group,panel.group.position.z);panel.gearIndices.forEach(i=>gearIndices.add(i));
 }
 if(S.motion?.matches)ms=0;
 let resolve;const done=new Promise(r=>{resolve=r;}),fall={pivots,gearIndices,poly,t0:performance.now(),ms,dist:Math.max(S.face.w,S.face.h)*.35,resolve,timer:null};
 fall.connections=S.gears.map(g=>({drives:g.drives,driveRatio:g.driveRatio,idleDir:g.idleDir}));
 S.gears.forEach((g,i)=>{if(g.drives!=null&&gearIndices.has(i)!==gearIndices.has(g.drives)){g.drives=null;delete g.driveRatio;}if(gearIndices.has(i))g.idleDir=0;});
 S.fall=fall;fall.timer=setTimeout(()=>{for(const p of pivots.keys())p.visible=false;if(S?.fall===fall)updateGearInstances(S);fall.resolve?.();fall.resolve=null;S?.wake?.();},Math.max(0,ms));S.wake?.();return done;
}
function heal(){
 if(!S)return;
 S.drag.clear();S.weld.length=0;S.weldHeads.clear();S.sparks.length=0;S.weldActive=false;S.prog.fill(0);S.spin=null;
 if(S.cutToken){clearTimeout(S.cutTimer);S.cutToken=null;S.cutResolve?.();S.cutResolve=null;}
 for(const p of S.parts)if(p.kind==='light'||p.kind==='lamp')p.flashUntil=-Infinity;
 for(const l of S.layers){l.ctx.clearRect(0,0,S.texW,S.texH);l.texture.needsUpdate=true;}
 if(!S.fall){S.wake?.();return;}
 clearTimeout(S.fall.timer);S.fall.resolve?.();
 for(const [p,z0] of S.fall.pivots){p.position.z=z0;p.position.y=p.userData.restY;p.rotation.x=0;p.visible=true;}
 S.gears.forEach((g,i)=>{Object.assign(g,S.fall.connections[i]);g.omega=0;});
 S.fall=null;
 updateGearInstances(S);
 S.wake?.();
}
function dispose(){
 if(!S)return;heal();
 for(const l of S.layers){l.mesh.removeFromParent();l.mesh.geometry.dispose();l.mesh.material.dispose();l.texture.dispose();}
 for(const part of S.parts)part.pivot.removeFromParent();
 for(const panel of S.panels)panel.geometry.dispose();S.panelBatch.dispose();for(const b of S.batches||[])b.dispose?.();
 S.owned.removeFromParent();S.railTexture.dispose();S.backplateMaterial.dispose();S.bearingGeometry.dispose();S.railGeometry.dispose();S.shaftGeometry.dispose();for(const g of S.mechGeos)g.dispose();
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
 id:'cogs',shadows:true,asset:'/pod/worlds/boards/cogs/door.glb',flip:false,background:'#161310',
 guide:null,frame:DEFAULT_FRAME,ink:false, // the weld trail replaces the shared ink line
 presectioned:true,progress,init,press,move,release,step,cut,heal,dispose,setTint:setCogsTint,setBackplateTint:setCogsBackplateTint,doorTone,tintTarget:'trace',trace2d:cogsWeld,
};
