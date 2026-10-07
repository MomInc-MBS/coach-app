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
const MAX_BIG=14; // the 10-tap chain keeps one crack per tap
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

// Secret (Ian 6 Oct: "10 taps in a row ... crystal explodes and shatters"): pure reducer, testable without WebGL.
// A tap = press..release within TAP_MS and under TAP_PX of finger travel; each press must come within TAP_MS of the previous press.
// Events: {type:'press'} {type:'move',dist} {type:'release'}; now in ms. The 10th tap sets shattered.
export const SECRET={taps:10,gap:600,drift:12,claimFrom:3};
export const newSecret=()=>({taps:[],lastPress:-1e9,pressAt:0,down:false,moved:0,shattered:false});
export function iceSecret(state,ev,now){
 const S=state||newSecret();
 if(S.shattered)return S;
 if(ev.type==='press'){
  if(now-S.lastPress>SECRET.gap)S.taps=[];
  S.lastPress=S.pressAt=now;S.down=true;S.moved=0;
 }else if(ev.type==='move'){
  S.moved+=ev.dist??0;
  if(S.moved>=SECRET.drift)S.taps=[]; // a drag; the release below sees moved and stays out of the chain
 }else if(ev.type==='release'){
  const tap=S.down&&S.moved<SECRET.drift&&now-S.pressAt<=SECRET.gap;
  S.down=false;
  if(!tap)S.taps=[];
  else{S.taps.push(now);S.lastRelease=now;if(S.taps.length>=SECRET.taps)S.shattered=true;}
 }
 return S;
}
// Taps 1-2 stay eligible for the stitched-outline double-tap open; a press that would be the 3rd+ tap is claimed.
export const iceClaims=S=>!!S&&(S.shattered||S.taps.length+(S.down&&S.moved<SECRET.drift?1:0)>=SECRET.claimFrom);

// One instance per board layer: the 3D board's (ice itself) and the flat board's 2D trace (ice.trace2d, R7) each get their own.
export function iceEffect(){
let S=null; // per-instance state
let tapState=null; // pure reducer state for secret tracking
const unkeep=now=>{for(const c of S.live)if(c.keep){c.keep=false;c.t0=now-BIG.grow-BIG.hold;}S.dirty=true;}; // chain broke: the kept cracks heal on the usual shrink

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
// Shatter (Ian: "explode and shatter"): the crystal face becomes ~48 real 3D prisms (jittered-grid triangles, same material so
// they carry the ice texture and the cracks), bursting toward the camera with spin + gravity, plus a flash and sparkle dust.
// The board meshes hide, leaving a dark backplate, until heal(). Units: local board units, fw = face width.
const SHARD_MS=1700,NX=4,NY=6;
function shatter(now){
 redraw(now);const {THREE,mesh,face:{w:fw,h:fh}}=S,orig=mesh.isGroup?[...mesh.children]:[mesh];
 const root=mesh.isGroup?mesh:mesh.parent,box=new THREE.Box3();
 for(const o of orig)if(o.geometry){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox);}
 const zf=box.max.z,t=fw*.03,pt=[];
 for(let j=0;j<=NY;j++){pt[j]=[];for(let i=0;i<=NX;i++){const e=i%NX&&j%NY; // jitter interior vertices only so the outline stays square
  pt[j][i]=[(i/NX-.5)*fw+(e?(Math.random()-.5)*.7*fw/NX:0),(.5-j/NY)*fh+(e?(Math.random()-.5)*.7*fh/NY:0)];}}
 const mat=orig[0].material.clone();mat.onBeforeCompile=orig[0].material.onBeforeCompile;mat.customProgramCacheKey=orig[0].material.customProgramCacheKey;mat.transparent=true;
 const shards=[],cx=S.hit?(S.hit[0]-.5)*fw:0,cy=S.hit?(.5-S.hit[1])*fh:0;
 for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
  const a=pt[j][i],b=pt[j][i+1],c=pt[j+1][i+1],d=pt[j+1][i],flip=(i+j)&1;
  for(const T of flip?[[a,b,d],[b,c,d]]:[[a,b,c],[a,c,d]]){const tri=T.slice().reverse(); // the grid is clockwise, faces need CCW
   const mx=(tri[0][0]+tri[1][0]+tri[2][0])/3,my=(tri[0][1]+tri[1][1]+tri[2][1])/3,pos=[],uv=[];
   const V=(p,z)=>{pos.push(p[0]-mx,p[1]-my,z);uv.push(p[0]/fw+.5,p[1]/fh+.5);};
   tri.forEach(p=>V(p,t/2));tri.forEach((p,k)=>V(tri[2-k],-t/2)); // front CCW, back reversed
   for(let k=0;k<3;k++){const p=tri[k],q=tri[(k+1)%3];V(p,t/2);V(p,-t/2);V(q,-t/2);V(p,t/2);V(q,-t/2);V(q,t/2);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
   const m=new THREE.Mesh(geo,mat);m.position.set(mx,my,zf-t/2);m.frustumCulled=false;root.add(m);
   const dx=mx-cx,dy=my-cy,dl=Math.hypot(dx,dy)||1,k=fw*(.4+1.1*Math.random())/(1+dl/fw);
   shards.push({m,vx:dx/dl*k,vy:dy/dl*k+fh*.3*Math.random(),vz:fw*(.15+.7*Math.random()),sx:(Math.random()-.5)*14,sy:(Math.random()-.5)*14,sz:(Math.random()-.5)*10});
  }}
 const back=new THREE.Mesh(new THREE.PlaneGeometry(fw*1.01,fh*1.01),new THREE.MeshBasicMaterial({color:0x04080c}));back.position.z=zf-t-fw*.002;root.add(back);
 const flash=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(fw,fh)*4,Math.max(fw,fh)*4),new THREE.MeshBasicMaterial({color:0xcff8ff,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));flash.position.z=zf+fw*.6;flash.renderOrder=20;root.add(flash);
 const N=160,dp=new Float32Array(N*3),dv=[],dg=new THREE.BufferGeometry();
 for(let n=0;n<N;n++){dp[n*3]=cx+(Math.random()-.5)*fw*.3;dp[n*3+1]=cy+(Math.random()-.5)*fh*.2;dp[n*3+2]=zf;const th=Math.random()*6.283,sp=fw*(.4+2.2*Math.random());dv.push([Math.cos(th)*sp,Math.sin(th)*sp,fw*(.3+1.6*Math.random())]);}
 dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
 const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xd6fbff,size:4,sizeAttenuation:false,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));dust.frustumCulled=false;dust.renderOrder=19;root.add(dust);
 for(const o of orig)o.visible=false;
 S.shat={t0:now,orig,shards,mat,back,flash,dust,dp,dv,N,fh,done:false};
}
function unshatter(){
 const z=S.shat;if(!z)return;
 for(const s of z.shards){s.m.removeFromParent();s.m.geometry.dispose();}
 for(const o of [z.back,z.flash,z.dust]){o.removeFromParent();o.geometry.dispose();o.material.dispose();}
 z.mat.dispose();for(const o of z.orig)o.visible=true;S.shat=null;
}
function stepShatter(_,now){
 const z=S.shat,dt=Math.min(.1,(now-(z.last??now))/1000),age=now-z.t0,fade=Math.max(0,1-Math.max(0,age-SHARD_MS*.55)/(SHARD_MS*.45)),G=z.fh*2.4;
 for(const s of z.shards){const m=s.m;s.vy-=G*dt;m.position.x+=s.vx*dt;m.position.y+=s.vy*dt;m.position.z+=s.vz*dt;m.rotation.x+=s.sx*dt;m.rotation.y+=s.sy*dt;m.rotation.z+=s.sz*dt;}
 z.last=now;z.mat.opacity=fade;
 z.flash.material.opacity=Math.max(0,.75*(1-age/380));
 for(let n=0;n<z.N;n++){const v=z.dv[n];v[1]-=G*.4*dt;for(let k=0;k<3;k++)z.dp[n*3+k]+=v[k]*dt;}
 z.dust.geometry.attributes.position.needsUpdate=true;z.dust.material.opacity=fade;
 if(age>=SHARD_MS&&!z.done){z.done=true;for(const s of z.shards)s.m.visible=false;window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'ice'}}));}
 return !z.done;
}
function redraw(now){
 const gc=S.glow.ctx,f=S.field/2,h=.5*S.scale,pad=EDGE_PX*S.scale,core=S.tint||CORE,glintColor=S.tint?tintRgba(S.tint,.9):GLINT,glint=()=>{gc.shadowColor=glintColor;gc.shadowBlur=3*S.scale;},flat=()=>{gc.shadowBlur=0;};
 gc.clearRect(0,0,S.glow.canvas.width,S.glow.canvas.height);
 gc.save();gc.lineJoin='round';
 for(const c of S.live){ // dark rim, then the core
  const age=c.keep?Math.min(now-c.t0,BIG.grow+BIG.hold-1):now-c.t0,k=Math.round(crackT(age,S.reduced)*LEVELS);
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

function init({THREE,mesh,face,paint,glow,toWorld,wake}){
 const w=paint.canvas.width;
 S={THREE,mesh,face,glow,toWorld,live:[],trail:[],pool:[],next:Math.floor(Math.random()*POOL),drag:new Map(),dirty:false,
  field:Math.round(w*BIG.frac),scale:w/1024,sx:w,sy:paint.canvas.height,
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,tint:selectedTint,wake};
 tapState=newSecret();
}
function setTint(hex,selected=true){if(selected&&!validTint(hex))return;selectedTint=selected?hex:null;if(S){S.tint=selectedTint;S.dirty=true;S.wake?.();}}
function press(id,u,v){
 if(S.shat){if(!S.shat.done)return;heal();} // fallback if the host never called healSecret(): the next touch brings the crystal back
 const now=performance.now(),x=u*S.sx,y=v*S.sy;
 tapState=iceSecret(tapState,{type:'press'},now);
 if(!tapState.taps.length)unkeep(now); // gap too long: the old web heals
 S.drag.set(id,{u,v,x,y,left:rand(TRAIL.spacing)});
 if(S.live.length>=MAX_BIG)S.live.shift();
 const c={x,y,i:S.next++%POOL,rot:Math.random()*Math.PI*2,t0:now};S.live.push(c);S.cur=c;S.hit=[u,v];
 S.dirty=true;
}
// Walk the finger's path since the last move, dropping a trail crack every `spacing` screen px so fast drags stay continuous.
function move(id,u,v){
 const p=S.drag.get(id);if(!p||S.shat)return;
 const [tx,ty]=[(u-p.u)*S.sx,(v-p.v)*S.sy],d=Math.hypot(tx,ty);
 if(!d)return;
 tapState=iceSecret(tapState,{type:'move',dist:Math.hypot(...S.toWorld(u,v).map((q,i)=>q-S.toWorld(p.u,p.v)[i]))},performance.now()); // screen px
 if(!tapState.taps.length)unkeep(performance.now());
 const td=d,k=S.scale;
 let s=p.left;
 for(;s<=d;s+=rand(TRAIL.spacing))spawnTrail(p,(p.u+(u-p.u)*s/d)*S.sx,(p.v+(v-p.v)*s/d)*S.sy,tx/td,ty/td,td/d);
 p.left=s-d;p.u=u;p.v=v;
}
function release(id){
 if(!S.drag.delete(id)||S.shat)return;
 const now=performance.now();tapState=iceSecret(tapState,{type:'release'},now);
 if(!tapState.taps.length)unkeep(now);else if(S.cur)S.cur.keep=true; // a tap in the chain: its crack stays
 if(tapState.shattered){for(const c of S.live)c.keep=true;S.THREE?shatter(now):window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'ice'}}));S.wake?.();} // the flat 2D trace has no mesh: secret at once
}
// Asked by the glb wrapper just before release(): true for the 3rd tap on, and for the whole shatter.
function claims(){return !!S&&iceClaims(tapState);}
function step(dt,now){
now=Math.max(now,performance.now()); // rAF's timestamp is the frame start, before a crack born in a slow frame (negative age = dead on arrival)
 if(S.shat)return stepShatter(dt,now);
 if(tapState.taps.length&&!S.drag.size&&now-tapState.lastRelease>SECRET.gap){tapState.taps=[];unkeep(now);} // chain timed out: the web heals
 const n=S.live.length+S.trail.length;
 if(!n)return false;
 const life=trailLife(S.reduced);
 S.live=S.live.filter(c=>c.keep||crackAlpha(now-c.t0,S.reduced)>0);
 S.trail=S.trail.filter(c=>now-c.t0<life);
 // Reduced motion: frames only change when a crack is born or dies; otherwise every frame animates.
 if(!S.reduced||S.dirty||S.live.length+S.trail.length!==n)redraw(now);
 S.dirty=false;
 return S.live.length+S.trail.length>0;
}
// Whole crystal back, chain reset. Called through the board's heal() (portal.mjs heals on every hide/show/escape).
function heal(){if(!S)return;unshatter();S.live=[];S.trail=[];S.cur=null;tapState=newSecret();S.dirty=true;redraw(performance.now());S.wake?.();}
function dispose(){if(S)unshatter();S=null;tapState=null;}
return {init,setTint,press,move,release,claims,step,healSecret:heal,dispose,tapState:()=>tapState};
}

// fragment (3D): the ice under the glow layer darkens by its alpha, so the dark rim (which emits nothing) shows as dark.
export const ice={id:'ice',asset:'/pod/worlds/boards/ice.glb',flip:false,background:'#0b1a26',guide:{color:'#eaf7ff',alpha:.22,width:5},pattern:{left:.035,top:.025,right:.965,bottom:.78},tintTarget:'trace',
 fragment:'diffuseColor.rgb*=1.0-0.85*glo.a;',...iceEffect(),trace2d:iceEffect};
