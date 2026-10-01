// Cracking-ice effect for portal-board-glb.mjs. Fracture geometry for the big crack comes from the vendored
// MIT cracked-glass core (cracked-glass-core.mjs) unchanged; this file only drives it: one big radial crack
// where the finger lands, then, as the finger drags, a hairline along its path with small V / Y / Z cracks
// shooting off sideways just behind it, each retracting tips-first back into its root. All drawn on the glow
// layer only so the paint layer keeps the guides: a cyan-white core over a thin dark rim (EDGE), which emits nothing
// but darkens the ice under it (ice.fragment), so the cracks read on the dark 3D ice and on the pale flat poster alike.
// AGPL-3.0-or-later.
import {generateFracture,computeFrame} from './cracked-glass-core.mjs';

// Big press crack: field side as a fraction of the paint width, lifecycle (ms), fracture options.
export const BIG={frac:.45,grow:300,hold:1000,shrink:400,opts:{rays:{count:7},rings:{count:3}}};
// Drag trail knobs. Timings in ms: shoot out (ease-out) / hold / retract (the growth run backwards).
// Ranges are [min,max] picked at random per crack. Screen px, so they look the same on any face size.
// Each crack is gone 1.71 s after its birth (R7: held ~2x longer so it reads), well inside Ian's 7 s rule.
export const TRAIL={grow:110,hold:700,retract:900,
 spacing:[9,20],   // screen px of finger travel between cracks
 size:[18,40],     // screen px, a crack's unit length (V prongs ~ size, Y and Z a bit shorter overall)
 sweep:[10,55],    // degrees a crack leans back from square-off the path (a wake behind the finger)
 jag:.13,          // sideways kink of each third of a segment, as a fraction of its length
 // R7 (Ian 26 Sept: "i cant see ... the ice cracks"): 5x the first tuning; a 1024 px face is ~330 CSS px on a phone.
 width:9,hair:5,taper:.75, // core width at the root / of the path hairline (paint px at 1024), tip taper
 max:70};          // ponytail: cap on live trail cracks; the oldest (already mostly retracted) is dropped first on a very fast drag
const MAX_BIG=8;
// ponytail: POOL big fractures reused with a random spin, LEVELS cached frames each, since
// computeFrame is ~2 ms per call; raise POOL if repeats ever show.
const POOL=6,LEVELS=16,FRAME_OPTS={quality:'normal',timeline:{crackStart:0,crackEnd:1,shatterStart:Infinity}};
// CORE: the crack line (a tight cyan GLINT round it); EDGE: the dark rim, EDGE_PX each side; BIG_EDGE: the big crack's
// stroke. Paint px at 1024.
const CORE='#d6fbff',GLINT='rgba(120,230,255,.9)',EDGE='rgba(2,20,32,.95)',EDGE_PX=3,BIG_EDGE=4;
let selectedTint=null;
const validTint=hex=>typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex);
function tintRgba(hex,alpha){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${alpha})`;}

// --- Pure lifecycle helpers (age in ms since spawn) ------------------------------------------
// Big crack growth 0..1: grow, hold at 1, shrink back to 0; reduced motion is fully grown until the hold ends.
export function crackT(age,reduced=false,L=BIG){
 if(age<0||crackAlpha(age,reduced,L)===0)return 0;
 if(reduced)return 1;
 if(age<L.grow)return age/L.grow;
 if(age<L.grow+L.hold)return 1;
 return 1-(age-L.grow-L.hold)/L.shrink;
}
// Big crack opacity: 1 until the shrink starts, then fades with it; 0 means dead.
export function crackAlpha(age,reduced=false,L=BIG){
 if(age<0)return 0;
 const held=L.grow+L.hold;
 if(age<held)return 1;
 if(reduced)return 0;
 return Math.max(0,1-(age-held)/L.shrink);
}
// Trail crack: fraction 0..1 of its length that is visible. No fade: it shoots out, holds, then the same
// curve runs backwards so it retracts tips-first into its root. Reduced motion: whole until the hold ends.
export const trailLife=(reduced=false,K=TRAIL)=>K.grow+K.hold+(reduced?0:K.retract);
const easeOut=x=>1-(1-x)*(1-x);
export function trailReach(age,reduced=false,K=TRAIL){
 if(age<0||age>=trailLife(reduced,K))return 0;
 if(reduced)return 1;
 if(age<K.grow)return easeOut(age/K.grow);
 if(age<K.grow+K.hold)return 1;
 return easeOut(1-(age-K.grow-K.hold)/K.retract);
}

// --- Pure shape helpers ------------------------------------------------------------------------
// A crack is a list of branches; a branch is points [x,y,d] from where it attaches outward, d = arc distance
// from the crack's root (a Y's fork branches start at the stem's length). Unit frame: root at 0,0, pointing +x.
function jag(pts,amt,rnd){ // split each segment in three, nudging the two inner points sideways by up to amt x its length
 const out=[pts[0]];
 for(let i=1;i<pts.length;i++){
  const [ax,ay]=pts[i-1],[bx,by]=pts[i],dx=bx-ax,dy=by-ay;
  for(const f of [1/3,2/3]){const o=(rnd()*2-1)*amt;out.push([ax+dx*f-dy*o,ay+dy*f+dx*o]);}
  out.push(pts[i]);
 }
 return out;
}
function withD(pts,d0){let d=d0;return pts.map((p,i)=>[p[0],p[1],d+=i?Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0]);}
export function crackShape(kind,rnd=Math.random,j=TRAIL.jag){
 const r=(a,b)=>a+(b-a)*rnd(),deg=Math.PI/180,ray=([x,y],a,l)=>[x+Math.cos(a)*l,y+Math.sin(a)*l],arm=(pts,d0)=>withD(jag(pts,j,rnd),d0);
 if(kind==='V'){const h=r(16,32)*deg;return [1,-1].map(s=>arm([[0,0],ray([0,0],s*h,r(.7,1))],0));}
 if(kind==='Y'){ // short stem, then a fork
  const t=r(-8,8)*deg,stem=arm([[0,0],ray([0,0],t,r(.3,.45))],0),end=stem.at(-1),h=r(18,34)*deg;
  return [stem,...[1,-1].map(s=>arm([end,ray(end,t+s*h,r(.45,.65))],end[2]))];
 }
 // Z: out, a sharp turn back across, out again
 const a=r(30,45)*deg,b=r(0,15)*deg,p1=ray([0,0],-a,r(.45,.55)),p2=ray(p1,Math.PI/2+b,r(.5,.6)),p3=ray(p2,-a,r(.45,.55));
 return [arm([[0,0],p1,p2,p3],0)];
}
// The part of a branch within arc distance r of the root, ending on an interpolated tip.
export function visible(b,r){
 const out=[];
 for(let i=0;i<b.length;i++){
  const p=b[i];
  if(p[2]<=r){out.push(p);continue;}
  const q=b[i-1];
  if(i&&r>q[2]){const f=(r-q[2])/(p[2]-q[2]);out.push([q[0]+(p[0]-q[0])*f,q[1]+(p[1]-q[1])*f,r]);}
  break;
 }
 return out;
}
// Add a filled tapered outline of visible points p to the current path, pointed at its last point. Every
// outline winds the same way, so one nonzero fill unions them all.
// pad: added to every half-width, tip included (the dark rim round a crack).
function ribbon(gc,p,h0,taper,len,pad=0){
 const n=p.length,o=[];
 for(let i=0;i<n;i++){
  const a=p[i?i-1:0],b=p[i<n-1?i+1:i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,h=pad+(i<n-1?h0*(1-taper*p[i][2]/len):0);
  o.push(-dy/l*h,dx/l*h);
 }
 gc.moveTo(p[0][0]+o[0],p[0][1]+o[1]);
 for(let i=1;i<n;i++)gc.lineTo(p[i][0]+o[2*i],p[i][1]+o[2*i+1]);
 for(let i=n-1;i>=0;i--)gc.lineTo(p[i][0]-o[2*i],p[i][1]-o[2*i+1]);
 gc.closePath();
}

// One instance per board layer: the 3D board's (ice itself) and the flat board's 2D trace (ice.trace2d, R7) each get their own.
export function iceEffect(){
let S=null; // per-instance state

function frame(i,k){ // cached Path2D of big pool pattern i at growth level k (lazily computed)
 const f=S.field;
 const p=S.pool[i]??={data:generateFracture({mode:'radial',width:f,height:f,seed:i+1,impact:{x:f/2,y:f/2},impactHole:0,...BIG.opts}),paths:[]};
 return p.paths[k]??=new Path2D(computeFrame(k/LEVELS,p.data,FRAME_OPTS).cracks.corePath);
}
const rand=([a,b])=>a+(b-a)*Math.random();
// One trail crack rooted at x,y (paint px) for a finger heading dx,dy (unit), k = paint px per screen px;
// its hairline runs back to the previous root p.x,p.y. Geometry is fixed here, once; frames only clip it.
function spawnTrail(p,x,y,dx,dy,k){
 const side=Math.random()<.5?1:-1,w=rand(TRAIL.sweep)*Math.PI/180,m=Math.random()<.5?1:-1,size=rand(TRAIL.size)*k;
 const ux=side*-dy*Math.cos(w)-dx*Math.sin(w),uy=side*dx*Math.cos(w)-dy*Math.sin(w); // sideways, leaning back
 const shape=crackShape('VYZ'[Math.floor(Math.random()*3)]).map(b=>b.map(([px,py,d])=>[x+size*(ux*px-uy*m*py),y+size*(uy*px+ux*m*py),d*size]));
 const hair=withD(jag([[x,y],[p.x,p.y]],TRAIL.jag,Math.random),0);
 if(S.trail.length>=TRAIL.max)S.trail.shift();
 S.trail.push({t0:performance.now(),shape,hair,len:Math.max(hair.at(-1)[2],...shape.map(b=>b.at(-1)[2])),reach:Math.max(...shape.map(b=>b.at(-1)[2]))});
 p.x=x;p.y=y;S.dirty=true;
}
function redraw(now){
 const gc=S.glow.ctx,f=S.field/2,h=.5*S.scale,pad=EDGE_PX*S.scale,core=S.tint||CORE,glintColor=S.tint?tintRgba(S.tint,.9):GLINT,glint=()=>{gc.shadowColor=glintColor;gc.shadowBlur=3*S.scale;},flat=()=>{gc.shadowBlur=0;};
 gc.clearRect(0,0,S.glow.canvas.width,S.glow.canvas.height);
 gc.save();gc.lineJoin='round';
 for(const c of S.live){ // dark rim, then the core
  const age=now-c.t0,k=Math.round(crackT(age,S.reduced)*LEVELS);
  if(!k)continue;
  gc.setTransform(1,0,0,1,0,0);gc.translate(c.x,c.y);gc.rotate(c.rot);gc.translate(-f,-f);
  gc.globalAlpha=crackAlpha(age,S.reduced);const p=frame(c.i,k);
  flat();gc.strokeStyle=EDGE;gc.lineWidth=(BIG_EDGE+2*EDGE_PX)*S.scale;gc.stroke(p);
  glint();gc.fillStyle=gc.strokeStyle=core;gc.fill(p);gc.lineWidth=BIG_EDGE*S.scale;gc.stroke(p);
 }
 if(S.trail.length){ // every live crack in one path per pass: the rims (padded), then the cores
  gc.setTransform(1,0,0,1,0,0);gc.globalAlpha=1;
  const cracks=pad=>{gc.beginPath();for(const c of S.trail){
   const r=trailReach(now-c.t0,S.reduced)*c.len;
   for(const b of c.shape){const v=visible(b,r);if(v.length>1)ribbon(gc,v,TRAIL.width*h,TRAIL.taper,c.reach,pad);}
   const v=visible(c.hair,r);if(v.length>1)ribbon(gc,v,TRAIL.hair*h,0,1,pad);
  }};
  flat();cracks(pad);gc.fillStyle=EDGE;gc.fill();
  glint();cracks(0);gc.fillStyle=core;gc.fill();
 }
 gc.restore();
 S.glow.texture.needsUpdate=true;
}

function init({paint,glow,toWorld,wake}){
 const w=paint.canvas.width;
 S={glow,toWorld,live:[],trail:[],pool:[],next:Math.floor(Math.random()*POOL),drag:new Map(),dirty:false,
  field:Math.round(w*BIG.frac),scale:w/1024,sx:w,sy:paint.canvas.height,
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,tint:selectedTint,wake};
}
function setTint(hex,selected=true){if(selected&&!validTint(hex))return;selectedTint=selected?hex:null;if(S){S.tint=selectedTint;S.dirty=true;S.wake?.();}}
function press(id,u,v){
 const x=u*S.sx,y=v*S.sy;
 S.drag.set(id,{u,v,x,y,left:rand(TRAIL.spacing)});
 if(S.live.length>=MAX_BIG)S.live.shift();
 S.live.push({x,y,i:S.next++%POOL,rot:Math.random()*Math.PI*2,t0:performance.now()});
 S.dirty=true;
}
// Walk the finger's path since the last move, dropping a trail crack every `spacing` screen px so fast drags stay continuous.
function move(id,u,v){
 const p=S.drag.get(id);
 if(!p){S.drag.set(id,{u,v,x:u*S.sx,y:v*S.sy,left:rand(TRAIL.spacing)});return;}
 const [ax,ay]=S.toWorld(p.u,p.v),[bx,by]=S.toWorld(u,v),d=Math.hypot(bx-ax,by-ay);
 if(!d)return;
 const tx=(u-p.u)*S.sx,ty=(v-p.v)*S.sy,td=Math.hypot(tx,ty);
 let s=p.left;
 for(;s<=d;s+=rand(TRAIL.spacing))spawnTrail(p,(p.u+(u-p.u)*s/d)*S.sx,(p.v+(v-p.v)*s/d)*S.sy,tx/td,ty/td,td/d);
 p.left=s-d;p.u=u;p.v=v;
}
function release(id){S.drag.delete(id);}
function step(dt,now){
 const n=S.live.length+S.trail.length;
 if(!n)return false;
 const life=trailLife(S.reduced);
 S.live=S.live.filter(c=>crackAlpha(now-c.t0,S.reduced)>0);
 S.trail=S.trail.filter(c=>now-c.t0<life);
 // Reduced motion: frames only change when a crack is born or dies; otherwise every frame animates.
 if(!S.reduced||S.dirty||S.live.length+S.trail.length!==n)redraw(now);
 S.dirty=false;
 return S.live.length+S.trail.length>0;
}
function dispose(){S=null;}
return {init,setTint,press,move,release,step,dispose};
}

// fragment (3D): the ice under the glow layer darkens by its alpha, so the dark rim (which emits nothing) shows as dark.
export const ice={id:'ice',asset:'/pod/worlds/boards/ice.glb',flip:false,background:'#0b1a26',guide:{color:'#eaf7ff',alpha:.22,width:5},pattern:{left:.035,top:.025,right:.965,bottom:.78},tintTarget:'trace',
 fragment:'diffuseColor.rgb*=1.0-0.85*glo.a;',...iceEffect(),trace2d:iceEffect};
