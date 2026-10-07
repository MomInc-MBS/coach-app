Review this diff (vs base 72313d0) for the MYR5 crystal/ice board secret. Acceptance: 10 taps in a row (each press within 600 ms of the previous press, a tap = moved <12 px and held <=600 ms); any drag/longer gap resets. Each tap adds a crack that stays and accumulates until tap 10 (heals after chain breaks). claims() false for taps 1-2, true from tap 3 (asked by the host on release before effect.release). Tap 10: whole face breaks into 30-60 3D shards with the crystal material, burst toward camera with spin+gravity, flash + dust, fade, leaving an empty dark backplate; then event myr5:portal-secret. heal() (via effect.healSecret) restores the crystal. List concrete bugs only, with line quotes.

diff --git a/modules/portal/portal-board-glb.mjs b/modules/portal/portal-board-glb.mjs
index 508b4c5..b823afd 100644
--- a/modules/portal/portal-board-glb.mjs
+++ b/modules/portal/portal-board-glb.mjs
@@ -260,6 +260,7 @@ export async function createGlbBoard(host,{effect,knobs=GLB}={}){
   return cutting.fall.done;
  }
  function heal(){
+  effect.healSecret?.(); // ice secret (L3): restore the shattered crystal (cut() heals first too)
   if(effect.presectioned){effect.heal?.();if(!disposed&&renderer)renderer.render(scene,camera);return;}
   if(!cutting)return;
   cutting.fall.end();for(const mesh of meshObjs){mesh.material.userData.portalCutSideUniform.value=0;const piece=pieceMats.get(mesh.material);if(piece?.userData.portalCutSideUniform)piece.userData.portalCutSideUniform.value=0;}portalCutMask.value?.dispose();portalCutMask.value=null;cutting=null;effect.heal?.();
diff --git a/modules/portal/portal-board-ice.mjs b/modules/portal/portal-board-ice.mjs
index 847b2be..63c8884 100644
--- a/modules/portal/portal-board-ice.mjs
+++ b/modules/portal/portal-board-ice.mjs
@@ -20,7 +20,7 @@ export const TRAIL={grow:110,hold:700,retract:900,
  // R7 (Ian 26 Sept: "i cant see ... the ice cracks"): 5x the first tuning; a 1024 px face is ~330 CSS px on a phone.
  width:9,hair:5,taper:.75, // core width at the root / of the path hairline (paint px at 1024), tip taper
  max:70};          // ponytail: cap on live trail cracks; the oldest (already mostly retracted) is dropped first on a very fast drag
-const MAX_BIG=8;
+const MAX_BIG=14; // the 10-tap chain keeps one crack per tap
 // ponytail: POOL big fractures reused with a random spin, LEVELS cached frames each, since
 // computeFrame is ~2 ms per call; raise POOL if repeats ever show.
 const POOL=6,LEVELS=16,FRAME_OPTS={quality:'normal',timeline:{crackStart:0,crackEnd:1,shatterStart:Infinity}};
@@ -111,9 +111,36 @@ function ribbon(gc,p,h0,taper,len,pad=0){
  gc.closePath();
 }
 
+// Secret (Ian 6 Oct: "10 taps in a row ... crystal explodes and shatters"): pure reducer, testable without WebGL.
+// A tap = press..release within TAP_MS and under TAP_PX of finger travel; each press must come within TAP_MS of the previous press.
+// Events: {type:'press'} {type:'move',dist} {type:'release'}; now in ms. The 10th tap sets shattered.
+export const SECRET={taps:10,gap:600,drift:12,claimFrom:3};
+export const newSecret=()=>({taps:[],lastPress:-1e9,pressAt:0,down:false,moved:0,shattered:false});
+export function iceSecret(state,ev,now){
+ const S=state||newSecret();
+ if(S.shattered)return S;
+ if(ev.type==='press'){
+  if(now-S.lastPress>SECRET.gap)S.taps=[];
+  S.lastPress=S.pressAt=now;S.down=true;S.moved=0;
+ }else if(ev.type==='move'){
+  S.moved+=ev.dist??0;
+  if(S.moved>=SECRET.drift)S.taps=[]; // a drag; the release below sees moved and stays out of the chain
+ }else if(ev.type==='release'){
+  const tap=S.down&&S.moved<SECRET.drift&&now-S.pressAt<=SECRET.gap;
+  S.down=false;
+  if(!tap)S.taps=[];
+  else{S.taps.push(now);S.lastRelease=now;if(S.taps.length>=SECRET.taps)S.shattered=true;}
+ }
+ return S;
+}
+// Taps 1-2 stay eligible for the stitched-outline double-tap open; a press that would be the 3rd+ tap is claimed.
+export const iceClaims=S=>!!S&&(S.shattered||S.taps.length+(S.down&&S.moved<SECRET.drift?1:0)>=SECRET.claimFrom);
+
 // One instance per board layer: the 3D board's (ice itself) and the flat board's 2D trace (ice.trace2d, R7) each get their own.
 export function iceEffect(){
 let S=null; // per-instance state
+let tapState=null; // pure reducer state for secret tracking
+const unkeep=now=>{for(const c of S.live)if(c.keep){c.keep=false;c.t0=now-BIG.grow-BIG.hold;}S.dirty=true;}; // chain broke: the kept cracks heal on the usual shrink
 
 function frame(i,k){ // cached Path2D of big pool pattern i at growth level k (lazily computed)
  const f=S.field;
@@ -132,12 +159,62 @@ function spawnTrail(p,x,y,dx,dy,k){
  S.trail.push({t0:performance.now(),shape,hair,len:Math.max(hair.at(-1)[2],...shape.map(b=>b.at(-1)[2])),reach:Math.max(...shape.map(b=>b.at(-1)[2]))});
  p.x=x;p.y=y;S.dirty=true;
 }
+// Shatter (Ian: "explode and shatter"): the crystal face becomes ~48 real 3D prisms (jittered-grid triangles, same material so
+// they carry the ice texture and the cracks), bursting toward the camera with spin + gravity, plus a flash and sparkle dust.
+// The board meshes hide, leaving a dark backplate, until heal(). Units: local board units, fw = face width.
+const SHARD_MS=1700,NX=4,NY=6;
+function shatter(now){
+ redraw(now);const {THREE,mesh,face:{w:fw,h:fh}}=S,orig=mesh.isGroup?[...mesh.children]:[mesh];
+ const root=mesh.isGroup?mesh:mesh.parent,box=new THREE.Box3();
+ for(const o of orig)if(o.geometry){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox);}
+ const zf=box.max.z,t=fw*.03,pt=[];
+ for(let j=0;j<=NY;j++){pt[j]=[];for(let i=0;i<=NX;i++){const e=i%NX&&j%NY; // jitter interior vertices only so the outline stays square
+  pt[j][i]=[(i/NX-.5)*fw+(e?(Math.random()-.5)*.7*fw/NX:0),(.5-j/NY)*fh+(e?(Math.random()-.5)*.7*fh/NY:0)];}}
+ const mat=orig[0].material.clone();mat.onBeforeCompile=orig[0].material.onBeforeCompile;mat.customProgramCacheKey=orig[0].material.customProgramCacheKey;mat.transparent=true;
+ const shards=[],cx=S.hit?(S.hit[0]-.5)*fw:0,cy=S.hit?(.5-S.hit[1])*fh:0;
+ for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
+  const a=pt[j][i],b=pt[j][i+1],c=pt[j+1][i+1],d=pt[j+1][i],flip=(i+j)&1;
+  for(const T of flip?[[a,b,d],[b,c,d]]:[[a,b,c],[a,c,d]]){const tri=T.slice().reverse(); // the grid is clockwise, faces need CCW
+   const mx=(tri[0][0]+tri[1][0]+tri[2][0])/3,my=(tri[0][1]+tri[1][1]+tri[2][1])/3,pos=[],uv=[];
+   const V=(p,z)=>{pos.push(p[0]-mx,p[1]-my,z);uv.push(p[0]/fw+.5,p[1]/fh+.5);};
+   tri.forEach(p=>V(p,t/2));tri.forEach((p,k)=>V(tri[2-k],-t/2)); // front CCW, back reversed
+   for(let k=0;k<3;k++){const p=tri[k],q=tri[(k+1)%3];V(p,t/2);V(p,-t/2);V(q,-t/2);V(p,t/2);V(q,-t/2);V(q,t/2);}
+   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
+   const m=new THREE.Mesh(geo,mat);m.position.set(mx,my,zf-t/2);m.frustumCulled=false;root.add(m);
+   const dx=mx-cx,dy=my-cy,dl=Math.hypot(dx,dy)||1,k=fw*(.4+1.1*Math.random())/(1+dl/fw);
+   shards.push({m,vx:dx/dl*k,vy:dy/dl*k+fh*.3*Math.random(),vz:fw*(.15+.7*Math.random()),sx:(Math.random()-.5)*14,sy:(Math.random()-.5)*14,sz:(Math.random()-.5)*10});
+  }}
+ const back=new THREE.Mesh(new THREE.PlaneGeometry(fw*1.01,fh*1.01),new THREE.MeshBasicMaterial({color:0x04080c}));back.position.z=zf-t-fw*.002;root.add(back);
+ const flash=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(fw,fh)*4,Math.max(fw,fh)*4),new THREE.MeshBasicMaterial({color:0xcff8ff,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));flash.position.z=zf+fw*.6;flash.renderOrder=20;root.add(flash);
+ const N=160,dp=new Float32Array(N*3),dv=[],dg=new THREE.BufferGeometry();
+ for(let n=0;n<N;n++){dp[n*3]=cx+(Math.random()-.5)*fw*.3;dp[n*3+1]=cy+(Math.random()-.5)*fh*.2;dp[n*3+2]=zf;const th=Math.random()*6.283,sp=fw*(.4+2.2*Math.random());dv.push([Math.cos(th)*sp,Math.sin(th)*sp,fw*(.3+1.6*Math.random())]);}
+ dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
+ const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xd6fbff,size:4,sizeAttenuation:false,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));dust.frustumCulled=false;dust.renderOrder=19;root.add(dust);
+ for(const o of orig)o.visible=false;
+ S.shat={t0:now,orig,shards,mat,back,flash,dust,dp,dv,N,fh,done:false};
+}
+function unshatter(){
+ const z=S.shat;if(!z)return;
+ for(const s of z.shards){s.m.removeFromParent();s.m.geometry.dispose();}
+ for(const o of [z.back,z.flash,z.dust]){o.removeFromParent();o.geometry.dispose();o.material.dispose();}
+ z.mat.dispose();for(const o of z.orig)o.visible=true;S.shat=null;
+}
+function stepShatter(_,now){
+ const z=S.shat,dt=Math.min(.1,(now-(z.last??now))/1000),age=now-z.t0,fade=Math.max(0,1-Math.max(0,age-SHARD_MS*.55)/(SHARD_MS*.45)),G=z.fh*2.4;
+ for(const s of z.shards){const m=s.m;s.vy-=G*dt;m.position.x+=s.vx*dt;m.position.y+=s.vy*dt;m.position.z+=s.vz*dt;m.rotation.x+=s.sx*dt;m.rotation.y+=s.sy*dt;m.rotation.z+=s.sz*dt;}
+ z.last=now;z.mat.opacity=fade;
+ z.flash.material.opacity=Math.max(0,.75*(1-age/380));
+ for(let n=0;n<z.N;n++){const v=z.dv[n];v[1]-=G*.4*dt;for(let k=0;k<3;k++)z.dp[n*3+k]+=v[k]*dt;}
+ z.dust.geometry.attributes.position.needsUpdate=true;z.dust.material.opacity=fade;
+ if(age>=SHARD_MS&&!z.done){z.done=true;for(const s of z.shards)s.m.visible=false;window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'ice'}}));}
+ return !z.done;
+}
 function redraw(now){
  const gc=S.glow.ctx,f=S.field/2,h=.5*S.scale,pad=EDGE_PX*S.scale,core=S.tint||CORE,glintColor=S.tint?tintRgba(S.tint,.9):GLINT,glint=()=>{gc.shadowColor=glintColor;gc.shadowBlur=3*S.scale;},flat=()=>{gc.shadowBlur=0;};
  gc.clearRect(0,0,S.glow.canvas.width,S.glow.canvas.height);
  gc.save();gc.lineJoin='round';
  for(const c of S.live){ // dark rim, then the core
-  const age=now-c.t0,k=Math.round(crackT(age,S.reduced)*LEVELS);
+  const age=c.keep?Math.min(now-c.t0,BIG.grow+BIG.hold-1):now-c.t0,k=Math.round(crackT(age,S.reduced)*LEVELS);
   if(!k)continue;
   gc.setTransform(1,0,0,1,0,0);gc.translate(c.x,c.y);gc.rotate(c.rot);gc.translate(-f,-f);
   gc.globalAlpha=crackAlpha(age,S.reduced);const p=frame(c.i,k);
@@ -158,45 +235,62 @@ function redraw(now){
  S.glow.texture.needsUpdate=true;
 }
 
-function init({paint,glow,toWorld,wake}){
+function init({THREE,mesh,face,paint,glow,toWorld,wake}){
  const w=paint.canvas.width;
- S={glow,toWorld,live:[],trail:[],pool:[],next:Math.floor(Math.random()*POOL),drag:new Map(),dirty:false,
+ S={THREE,mesh,face,glow,toWorld,live:[],trail:[],pool:[],next:Math.floor(Math.random()*POOL),drag:new Map(),dirty:false,
   field:Math.round(w*BIG.frac),scale:w/1024,sx:w,sy:paint.canvas.height,
   reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,tint:selectedTint,wake};
+ tapState=newSecret();
 }
 function setTint(hex,selected=true){if(selected&&!validTint(hex))return;selectedTint=selected?hex:null;if(S){S.tint=selectedTint;S.dirty=true;S.wake?.();}}
 function press(id,u,v){
- const x=u*S.sx,y=v*S.sy;
+ if(S.shat){if(!S.shat.done)return;heal();} // fallback if the host never called healSecret(): the next touch brings the crystal back
+ const now=performance.now(),x=u*S.sx,y=v*S.sy;
+ tapState=iceSecret(tapState,{type:'press'},now);
+ if(!tapState.taps.length)unkeep(now); // gap too long: the old web heals
  S.drag.set(id,{u,v,x,y,left:rand(TRAIL.spacing)});
  if(S.live.length>=MAX_BIG)S.live.shift();
- S.live.push({x,y,i:S.next++%POOL,rot:Math.random()*Math.PI*2,t0:performance.now()});
+ const c={x,y,i:S.next++%POOL,rot:Math.random()*Math.PI*2,t0:now};S.live.push(c);S.cur=c;S.hit=[u,v];
  S.dirty=true;
 }
 // Walk the finger's path since the last move, dropping a trail crack every `spacing` screen px so fast drags stay continuous.
 function move(id,u,v){
- const p=S.drag.get(id);
- if(!p){S.drag.set(id,{u,v,x:u*S.sx,y:v*S.sy,left:rand(TRAIL.spacing)});return;}
- const [ax,ay]=S.toWorld(p.u,p.v),[bx,by]=S.toWorld(u,v),d=Math.hypot(bx-ax,by-ay);
+ const p=S.drag.get(id);if(!p||S.shat)return;
+ const [tx,ty]=[(u-p.u)*S.sx,(v-p.v)*S.sy],d=Math.hypot(tx,ty);
  if(!d)return;
- const tx=(u-p.u)*S.sx,ty=(v-p.v)*S.sy,td=Math.hypot(tx,ty);
+ tapState=iceSecret(tapState,{type:'move',dist:Math.hypot(...S.toWorld(u,v).map((q,i)=>q-S.toWorld(p.u,p.v)[i]))},performance.now()); // screen px
+ if(!tapState.taps.length)unkeep(performance.now());
+ const td=d,k=S.scale;
  let s=p.left;
  for(;s<=d;s+=rand(TRAIL.spacing))spawnTrail(p,(p.u+(u-p.u)*s/d)*S.sx,(p.v+(v-p.v)*s/d)*S.sy,tx/td,ty/td,td/d);
  p.left=s-d;p.u=u;p.v=v;
 }
-function release(id){S.drag.delete(id);}
+function release(id){
+ if(!S.drag.delete(id)||S.shat)return;
+ const now=performance.now();tapState=iceSecret(tapState,{type:'release'},now);
+ if(!tapState.taps.length)unkeep(now);else if(S.cur)S.cur.keep=true; // a tap in the chain: its crack stays
+ if(tapState.shattered){for(const c of S.live)c.keep=true;S.THREE?shatter(now):window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'ice'}}));S.wake?.();} // the flat 2D trace has no mesh: secret at once
+}
+// Asked by the glb wrapper just before release(): true for the 3rd tap on, and for the whole shatter.
+function claims(){return !!S&&iceClaims(tapState);}
 function step(dt,now){
+now=Math.max(now,performance.now()); // rAF's timestamp is the frame start, before a crack born in a slow frame (negative age = dead on arrival)
+ if(S.shat)return stepShatter(dt,now);
+ if(tapState.taps.length&&!S.drag.size&&now-tapState.lastRelease>SECRET.gap){tapState.taps=[];unkeep(now);} // chain timed out: the web heals
  const n=S.live.length+S.trail.length;
  if(!n)return false;
  const life=trailLife(S.reduced);
- S.live=S.live.filter(c=>crackAlpha(now-c.t0,S.reduced)>0);
+ S.live=S.live.filter(c=>c.keep||crackAlpha(now-c.t0,S.reduced)>0);
  S.trail=S.trail.filter(c=>now-c.t0<life);
  // Reduced motion: frames only change when a crack is born or dies; otherwise every frame animates.
  if(!S.reduced||S.dirty||S.live.length+S.trail.length!==n)redraw(now);
  S.dirty=false;
  return S.live.length+S.trail.length>0;
 }
-function dispose(){S=null;}
-return {init,setTint,press,move,release,step,dispose};
+// Whole crystal back, chain reset. Called through the board's heal() (portal.mjs heals on every hide/show/escape).
+function heal(){if(!S)return;unshatter();S.live=[];S.trail=[];S.cur=null;tapState=newSecret();S.dirty=true;redraw(performance.now());S.wake?.();}
+function dispose(){if(S)unshatter();S=null;tapState=null;}
+return {init,setTint,press,move,release,claims,step,healSecret:heal,dispose,tapState:()=>tapState};
 }
 
 // fragment (3D): the ice under the glow layer darkens by its alpha, so the dark rim (which emits nothing) shows as dark.
diff --git a/scripts/vault-l3-preview.cjs b/scripts/vault-l3-preview.cjs
new file mode 100644
index 0000000..408e30d
--- /dev/null
+++ b/scripts/vault-l3-preview.cjs
@@ -0,0 +1,26 @@
+// L3 Crystal ice secret preview: node scripts/vault-l3-preview.cjs
+const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
+const root=path.resolve(__dirname,'..');
+const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>L3 Ice secret</title><style>
+*{box-sizing:border-box}body{margin:0;background:#000}#board{width:375px;height:812px;position:relative;touch-action:none}
+</style></head><body><div id="board"></div><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><script type="module">
+import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';
+import {ice} from '/modules/portal/portal-board-ice.mjs';
+const host=document.querySelector('#board');
+// manual clock (software GL frames take ~300 ms, which would break a 600 ms tap chain): time only moves when skip(ms) says so; rAF timestamps follow it
+let vt=1000;performance.now=()=>vt;window.skip=ms=>{vt+=ms;};const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(vt));
+window.errors=[];window.secrets=0;window.addEventListener('error',e=>errors.push(e.message));
+window.addEventListener('myr5:portal-secret',()=>window.secrets++);
+try{
+ const board=window.board=await createGlbBoard(host,{effect:ice});
+ host.style.background=board.background; // the real portal host paints the board background; a black host is just the harness
+ host.onpointerdown=e=>{board.press(e.pointerId,e.clientX,e.clientY);window.downClaim=ice.claims(e.pointerId);};
+ host.onpointermove=e=>{if(e.buttons)board.press(e.pointerId,e.clientX,e.clientY);};
+ host.onpointerup=host.onpointercancel=e=>{window.lastClaim=ice.claims(e.pointerId);board.release(e.pointerId);};
+ window.tap=async(x,y,hold=60)=>{const o={pointerId:7,clientX:x,clientY:y,bubbles:true,buttons:1};host.dispatchEvent(new PointerEvent('pointerdown',o));skip(hold);await new Promise(r=>setTimeout(r,350));host.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));};
+ const pts=[[190,560],[110,430],[270,480],[150,650],[250,650],[120,540],[280,600],[190,450],[200,700],[190,580]];
+ window.chain=async n=>{window.claimLog=[];for(let i=0;i<n;i++){await tap(...pts[i]);claimLog.push(window.lastClaim);skip(100);await new Promise(r=>setTimeout(r,350));}}; // software GL: each frame blocks ~300 ms, so taps are naturally ~400 ms apart
+ window.ready=true;
+}catch(e){errors.push(e.stack);}
+</script></body></html>`;
+http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(Number(process.env.MYR5_L3_PORT)||8904,'127.0.0.1',function(){console.log('L3 Ice preview: http://127.0.0.1:'+this.address().port);});
diff --git a/tests/portal-board-ice-secret.test.mjs b/tests/portal-board-ice-secret.test.mjs
new file mode 100644
index 0000000..57080c2
--- /dev/null
+++ b/tests/portal-board-ice-secret.test.mjs
@@ -0,0 +1,53 @@
+// L3 Crystal/ice secret: 10 taps in a row -> shatter; heal() restores the crystal.
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import * as THREE from 'three';
+import {iceSecret,iceClaims,newSecret,iceEffect} from '../modules/portal/portal-board-ice.mjs';
+
+const tap=(S,t0,hold=100,dist=0)=>{S=iceSecret(S,{type:'press'},t0);if(dist)S=iceSecret(S,{type:'move',dist},t0+10);return iceSecret(S,{type:'release'},t0+hold);};
+const run=(n,gap=500)=>{let S=newSecret();for(let i=0;i<n;i++)S=tap(S,i*gap);return S;};
+
+test('10 taps at 500 ms spacing -> shattered; 9 are not',()=>{
+ assert.equal(run(10).shattered,true);
+ assert.equal(run(9).shattered,false);
+});
+test('a 700 ms gap or a 15 px drag resets the chain',()=>{
+ let S=run(5);S=tap(S,5*500+700-500);assert.equal(S.taps.length,1,'gap');
+ S=run(5);S=tap(S,3000,100,15);assert.equal(S.taps.length,0,'drag');
+ S=run(5);S=iceSecret(S,{type:'press'},2500);S=iceSecret(S,{type:'release'},3300);assert.equal(S.taps.length,0,'held 800 ms is not a tap');
+ S=run(9);S=tap(S,4500+700);assert.equal(S.shattered,false);
+});
+test('slow drag of small steps adds up to a drag',()=>{
+ let S=iceSecret(newSecret(),{type:'press'},0);for(let i=0;i<5;i++)S=iceSecret(S,{type:'move',dist:4},10*i);
+ S=iceSecret(S,{type:'release'},60);assert.equal(S.taps.length,0);
+});
+test('claims: false for taps 1-2, true from tap 3 (asked on the release, before the tap is counted)',()=>{
+ let S=newSecret();const c=[];
+ for(let i=0;i<4;i++){S=iceSecret(S,{type:'press'},i*400);S=iceSecret(S,{type:'move',dist:1},i*400+10);c.push(iceClaims(S));S=iceSecret(S,{type:'release'},i*400+90);}
+ assert.deepEqual(c,[false,false,true,true]);
+ assert.equal(iceClaims(run(10)),true,'claims while shattered');
+});
+
+test('effect: tap leaves a crack that persists; 10th tap shatters into 30-60 3D shards, dispatches the secret after, heal() restores',()=>{
+ globalThis.Path2D=class{};globalThis.matchMedia=()=>({matches:false});
+ const events=[];globalThis.window={dispatchEvent:e=>events.push(e.detail.board)};globalThis.CustomEvent=class{constructor(t,o){this.detail=o.detail;}};
+ const gc=new Proxy({},{get:(_,k)=>k==='canvas'?{width:1024,height:1024}:()=>{},set:()=>true});
+ const mat=new THREE.MeshStandardMaterial(),g=new THREE.PlaneGeometry(100,160),m=new THREE.Mesh(g,mat),grp=new THREE.Group();grp.add(m);
+ const e=iceEffect();
+ e.init({THREE,mesh:m,face:{w:100,h:160},paint:{canvas:{width:1024,height:1024}},glow:{canvas:{width:1024,height:1024},ctx:gc,texture:{}},toWorld:(u,v)=>[u*375,-v*600]});
+ let now=performance.now();const orig=performance.now;performance.now=()=>now;
+ try{
+  for(let i=0;i<9;i++){e.press(1,.5,.5);e.release(1);now+=300;e.step(.016,now);}
+  assert.equal(m.visible,true);assert.equal(events.length,0);
+  e.press(1,.5,.5);e.release(1);
+  assert.equal(m.visible,false,'crystal face hidden');
+  const shards=grp.children.filter(o=>o!==m&&o.geometry?.attributes.uv&&o.material.transparent&&o.geometry.type==='BufferGeometry');
+  assert.ok(shards.length>=30&&shards.length<=60,'shards '+shards.length);
+  for(let i=0;i<30;i++){now+=100;e.step(.016,now);}
+  assert.deepEqual(events,['ice'],'secret fires once, after the burst');
+  e.healSecret();
+  assert.equal(m.visible,true);assert.equal(grp.children.length,1,'shards, flash, dust, backplate removed');
+  assert.equal(e.claims(1),false);
+  e.press(1,.5,.5);e.release(1);assert.equal(e.tapState().taps.length,1,'chain restarted');
+ }finally{performance.now=orig;delete globalThis.window;delete globalThis.CustomEvent;delete globalThis.Path2D;delete globalThis.matchMedia;}
+});
