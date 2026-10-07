// Burning-wood board effect for portal-board-glb.mjs: press/drag drops dwell-scaled embers that age
// on the clock (deep orange -> dark ember -> char) on `paint`, glow on `glow` while hot, then fade out
// so the board returns to just its guides; procedural smoke sprites puff while burning. AGPL-3.0-or-later.
// Secret (Achievement Vault): scrub one face quadrant (>=8 reversals in 3 s) -> heat builds -> fire; one tap -> steam,
// ash, crumble; then window event 'myr5:portal-secret' {board:'wood'}. The gesture is the pure reducer woodSecret().

const COOL_MS=2600; // ember age at which it reaches char
const FADE_MS=7000,FADE_OUT_MS=1200; // Ian: everything returns to normal after 7 s (2026-09-22)
const TICK_MS=80; // paint/glow redraw period while anything is changing
const STAMP_FRAC=.04,STAMP_STEP=12; // ember radius as a fraction of face width; paint-px between embers along a drag
const GLOW_GAIN=1.6;
// Per-ember alpha by ms spent per STAMP_STEP: embers overlap ~7x along a drag, so a normal stroke
// ends fully black and a held finger stacks a fresh ember every EMBER_PERIOD_MS.
const DWELL_CAP_MS=300,DWELL_MIN=.45,DWELL_MAX=1;
const EMBER_PERIOD_MS=90,SPRITES=32;
const SMOKE_COUNT=24,SMOKE_PERIOD_MS=90,SMOKE_LIFE_MS=2000,SMOKE_RISE=55/1000,SMOKE_DRIFT=14/1000;
const SMOKE_R0=34,SMOKE_R1=90,SMOKE_COLOR='216,220,223',SMOKE_OPACITY=.55,SMOKE_Z=14;

// --- Pure helpers (no THREE dependency) -----------------------------------------------------
// Ember colour by age in ms: deep orange -> red -> dark ember -> char at COOL_MS (then held).
const STOPS=[[0,255,106,0],[.35,255,45,0],[.65,122,20,0],[1,10,6,4]];
export function emberColor(age){
 const f=Math.min(1,Math.max(0,age/COOL_MS));
 let i=0;while(i<STOPS.length-2&&f>STOPS[i+1][0])i++;
 const lo=STOPS[i],hi=STOPS[i+1],t=(f-lo[0])/(hi[0]-lo[0]);
 return {r:Math.round(lo[1]+(hi[1]-lo[1])*t),g:Math.round(lo[2]+(hi[2]-lo[2])*t),b:Math.round(lo[3]+(hi[3]-lo[3])*t)};
}
// Scorch opacity multiplier by age: 1 until FADE_MS, then out to 0 over FADE_OUT_MS (0 = dropped).
export function emberFade(age){return Math.min(1,Math.max(0,1-(age-FADE_MS)/FADE_OUT_MS));}
// ms since the previous stamp on this stroke -> per-ember alpha, capped so dwell can't overshoot.
export function dwellAlpha(msSinceLast){
 const c=Math.min(DWELL_CAP_MS,Math.max(0,msSinceLast));
 return DWELL_MIN+(DWELL_MAX-DWELL_MIN)*(c/DWELL_CAP_MS);
}
export {COOL_MS,FADE_MS,FADE_OUT_MS};
const lerp=(a,b,t)=>a+(b-a)*t;

// --- Secret gesture (pure) ----------------------------------------------------------------------
// State: {phase:'idle'|'fire'|'ash', id:tracked pointer, q:quadrant, ax/ay:{ref,dir,ext,ts} per-axis turn trackers,
// claimId:pointer to claim, at:{x,y} fire origin}. Events: {t:'down'|'move'|'up', id, x, y (face px), w, h (face px size), edge}.
export const SECRET={leg:18,revs:8,claimRevs:4,windowMs:3000};
export const woodSecretInit=()=>({phase:'idle',id:null,q:-1,ax:null,ay:null,claimId:null,at:null,fireAt:0,ashAt:0});
const axis=(a,p,now)=>{ // a leg is >= SECRET.leg px; a reversal is a counter-move of that size off the extreme
 let {ref,dir,ext,ts}=a;
 if(!dir){if(Math.abs(p-ref)>=SECRET.leg){dir=Math.sign(p-ref);ext=p;}}
 else if(dir*(p-ext)>0)ext=p;
 else if(Math.abs(p-ext)>=SECRET.leg){ts=[...ts.filter(t=>now-t<SECRET.windowMs),now];ref=ext;dir=-dir;ext=p;}
 return {ref,dir,ext,ts};
};
const quad=e=>(e.x<e.w/2?0:1)+(e.y<e.h/2?0:2);
const fresh=(s,e)=>({...s,id:e.id,q:quad(e),ax:{ref:e.x,dir:0,ext:e.x,ts:[]},ay:{ref:e.y,dir:0,ext:e.y,ts:[]}});
// Reversals still inside the 3 s window (the larger of the x and y counts).
export const revNow=(s,now)=>s.ax?Math.max(...[s.ax,s.ay].map(a=>a.ts.filter(t=>now-t<SECRET.windowMs).length)):0;
export function woodSecret(s,e,now){
 s=s||woodSecretInit();
 if(s.phase==='ash')return s;
 if(s.phase==='fire')return e.t==='down'?{...s,phase:'ash',ashAt:now,claimId:e.id}:s; // any tap puts it out (claimed so portal ignores it)
 if(e.t==='down')return s.id!=null||e.edge?s:fresh({...s,claimId:null},e); // first finger only; edge touches (back-swipe zone) ignored
 if(e.id!==s.id)return s;
 if(e.t==='up')return {...s,id:null,ax:null,ay:null};
 if(quad(e)!==s.q)return fresh(s,e); // left the quadrant: start over from here
 const n={...s,ax:axis(s.ax,e.x,now),ay:axis(s.ay,e.y,now)},rev=revNow(n,now);
 if(rev>=SECRET.claimRevs)n.claimId=e.id;
 if(rev>=SECRET.revs){n.phase='fire';n.fireAt=now;n.at={x:e.x,y:e.y};}
 return n;
}
// Does portal.mjs need to leave this pointer alone? (scrubbing, or the board is burning/ashed)
export const woodClaims=(s,id)=>!!s&&(s.claimId===id||s.phase!=='idle');

// One instance per board layer: the 3D board's (wood itself) and the flat board's 2D trace (wood.trace2d, R7: embers,
// char and glow; no scene, so no smoke) each get their own.
export function woodEffect(){
let S=null; // per-instance state
const U={uAsh:{value:0},uCrumble:{value:0},uAshTex:{value:null}}; // ash/crumble shader uniforms (portal-board-glb merges effect.uniforms)

function softCircleTexture(THREE){
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,`rgba(${SMOKE_COLOR},.9)`);g.addColorStop(1,`rgba(${SMOKE_COLOR},0)`);
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const tex=new THREE.CanvasTexture(c);tex.needsUpdate=true;return tex;
}
// Soft ember disc at colour step k (0 = birth .. SPRITES-1 = char), cached: redraws are just drawImage.
function sprite(k){
 if(S.sprites[k])return S.sprites[k];
 const r=S.r,d=Math.ceil(2*r),c=document.createElement('canvas');c.width=c.height=d;
 const {r:cr,g:cg,b:cb}=emberColor(k/(SPRITES-1)*COOL_MS),ctx=c.getContext('2d'),g=ctx.createRadialGradient(r,r,0,r,r,r);
 g.addColorStop(0,`rgba(${cr},${cg},${cb},1)`);g.addColorStop(.5,`rgba(${cr},${cg},${cb},.85)`);g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
 ctx.fillStyle=g;ctx.fillRect(0,0,d,d);
 return S.sprites[k]=c;
}
function stamp(u,v,heat){if(S.heat)heat=Math.min(1,heat*(1+.6*S.heat));S.embers.push({x:u*S.paint.canvas.width,y:v*S.paint.canvas.height,heat,t0:performance.now(),k:-1,a:-1});}

// One redraw pass. Paint: restore the pristine guides inside the union of every ember whose colour or
// opacity changed, then redraw the live embers overlapping it (clipped, oldest first). Glow: clear and
// re-draw the hot embers in their own colour (source-over, so overlaps never sum to yellow); wiped once
// when the last one cools. Returns whether anything is still changing.
// ponytail: redraw cost grows with embers under the dirty rect; cap S.embers if long scribbles stutter.
function tick(now){
 const R=S.r,last=SPRITES-1,live=[];let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const e of S.embers){
  const age=now-e.t0,a=Math.round(e.heat*emberFade(age)*100)/100,k=S.reduced?last:Math.round(Math.min(1,age*(1-.7*S.heat)/COOL_MS)*last); // heat keeps embers hot
  if(k!==e.k||a!==e.a){e.k=k;e.a=a;x0=Math.min(x0,e.x-R);y0=Math.min(y0,e.y-R);x1=Math.max(x1,e.x+R);y1=Math.max(y1,e.y+R);}
  if(a>0)live.push(e);
 }
 S.embers=live;
 const pc=S.paint.ctx,W=S.paint.canvas.width,H=S.paint.canvas.height;
 const x=Math.max(0,Math.floor(x0)),y=Math.max(0,Math.floor(y0)),w=Math.min(W,Math.ceil(x1))-x,h=Math.min(H,Math.ceil(y1))-y,changed=w>0&&h>0;
 if(changed){
  pc.save();pc.beginPath();pc.rect(x,y,w,h);pc.clip();pc.clearRect(x,y,w,h);pc.drawImage(S.pristine,x,y,w,h,x,y,w,h);
  for(const e of live)if(e.x+R>x&&e.x-R<x+w&&e.y+R>y&&e.y-R<y+h){pc.globalAlpha=e.a;pc.drawImage(sprite(e.k),e.x-R,e.y-R);}
  pc.restore();S.paint.texture.needsUpdate=true;
 }
 const hot=S.reduced?[]:live.filter(e=>now-e.t0<COOL_MS);
 if(hot.length||S.glowOn){
  const gc=S.glow.ctx;gc.clearRect(0,0,S.glow.canvas.width,S.glow.canvas.height);
  gc.save();
  for(const e of hot){gc.globalAlpha=Math.min(1,GLOW_GAIN*(1+S.heat)*e.heat*(1-(now-e.t0)*(1-.7*S.heat)/COOL_MS));gc.drawImage(sprite(e.k),e.x-R,e.y-R);}
  gc.restore();S.glow.texture.needsUpdate=true;S.glowOn=hot.length>0;
 }
 const busy=changed||hot.length>0;
 // Char sits still until FADE_MS: sleep and let a timer wake the board for the fade-out.
 clearTimeout(S.timer);
 if(!busy&&live.length)S.timer=setTimeout(()=>S?.wake?.(),Math.max(0,live[0].t0+FADE_MS-now));
 return busy;
}

function spawnSmoke(u,v,at){
 const dead=S.smoke.find(s=>!s.alive);if(!dead)return;
 const [x,y]=at||S.toWorld(u,v);
 dead.alive=true;dead.t0=performance.now();dead.x0=x;dead.y0=y;dead.dir=Math.random()<.5?-1:1;
 dead.sprite.visible=true;dead.sprite.position.set(x,y,S.faceZ+SMOKE_Z);dead.sprite.material.opacity=0;
}
function stepSmoke(now){
 let any=false;
 for(const s of S.smoke){
  if(!s.alive)continue;
  const age=now-s.t0,t=age/SMOKE_LIFE_MS;
  if(t>=1){s.alive=false;s.sprite.visible=false;continue;}
  any=true;
  const sc=lerp(SMOKE_R0,SMOKE_R1,t);
  s.sprite.position.set(s.x0+s.dir*SMOKE_DRIFT*age,s.y0+SMOKE_RISE*age,S.faceZ+SMOKE_Z);
  s.sprite.scale.set(sc,sc,1);
  s.sprite.material.opacity=SMOKE_OPACITY*(1-t);
 }
 return any;
}

// --- Secret: heat -> fire -> steam/ash -> crumble ------------------------------------------------
const NF=44,NS=36,NK=300,NX=48,NY=64,ASH_MS=1100,HOLD_MS=500,CRUMBLE_MS=2800;
const faceW=()=>S.toWorld(1,0)[0]-S.toWorld(0,0)[0],faceH=()=>S.toWorld(0,0)[1]-S.toWorld(0,1)[1];
const wp=(x,y)=>{const [ox,oy]=S.toWorld(0,0);return [ox+x,oy-y];}; // face px -> world
function isEdge(u,v){ // first touch within 24 px of the screen edge = iOS back-swipe / home bar: never a scrub
 const c=document.querySelector?.('.portal-board-canvas');if(!c)return false;
 const r=c.getBoundingClientRect(),[x,y]=S.toWorld(u,v),sx=r.left+x,sy=r.top-y;
 return sx<24||sy<24||sx>innerWidth-24||sy>innerHeight-24;
}
function secretEv(t,id,u,v){
 if(!S.scene)return;
 const w=faceW(),h=faceH();S.rs=woodSecret(S.rs,{t,id,x:u*w,y:v*h,w,h,edge:t==='down'&&isEdge(u,v)},performance.now());
 if(t!=='up')S.finger=[u,v];
}
function flameTexture(){
 const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');
 const g=x.createRadialGradient(32,96,2,32,90,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
 x.filter='blur(2px)';x.fillStyle=g;x.beginPath();x.moveTo(32,2);x.bezierCurveTo(30,34,6,60,8,92);x.bezierCurveTo(10,120,54,120,56,92);x.bezierCurveTo(58,60,34,34,32,2);x.fill();
 return c;
}
function dotTexture(){
 const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d'),g=x.createRadialGradient(8,8,0,8,8,8);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,16,16);return c;
}
const LAYERS=[[0xff3a00,1,.55,.9],[0xff8a14,.62,.6,.8],[0xffe9a0,.32,.7,.9]]; // colour, size, base alpha, shape: outer/mid/core tongues
function ensureFx(){
 if(S.fx||!S.scene)return;
 const T=S.THREE,mk=(map,color)=>{const m=new T.SpriteMaterial({map,color,transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:T.AdditiveBlending}),sp=new T.Sprite(m);sp.visible=false;sp.renderOrder=20;S.scene.add(sp);return sp;};
 const ft=new T.CanvasTexture(flameTexture()),dt=new T.CanvasTexture(dotTexture());
 S.fx={ft,dt,flames:Array.from({length:NF},()=>({alive:false,sp:LAYERS.map(l=>{const sp=mk(ft,l[0]);sp.center.set(.5,.08);return sp;})})),
  sparks:Array.from({length:NS},()=>({alive:false,sp:mk(dt,0xffa030)})),light:new T.PointLight(0xff6a1a,0,520,0)};
 S.scene.add(S.fx.light);
}
function ashTexture(THREE){ // per-cell crumble threshold: chunky, bottom first
 const coarse=Array.from({length:12*16},Math.random),T=new Float32Array(NX*NY),px=new Uint8Array(NX*NY*4);
 for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const t=Math.min(1,.3*coarse[(j>>2)*12+(i>>2)]+.25*Math.random()+.45*(1-(j+.5)/NY));T[j*NX+i]=t;px.fill(Math.round(t*255),(j*NX+i)*4,(j*NX+i)*4+4);}
 S.T=T;S.order=[...T.keys()].sort((a,b)=>T[a]-T[b]);S.ptr=0;
 if(!THREE.DataTexture)return null;
 const tex=new THREE.DataTexture(px,NX,NY);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.needsUpdate=true;return tex;
}
function ensureFlakes(){
 if(S.flakes||!S.scene)return;
 const T=S.THREE,geo=new T.BoxGeometry(1,1,.3),mats=['#8f8a82','#6a655e','#4a4540'].map(c=>new T.MeshBasicMaterial({color:c}));
 S.flakes={geo,mats,list:Array.from({length:NK},(_,i)=>{const m=new T.Mesh(geo,mats[i%3]);m.visible=false;m.renderOrder=15;S.scene.add(m);return {m,alive:false};})};
}
function spawnFlame(cx,cy,R,sz,now){
 const f=S.fx.flames.find(f=>!f.alive);if(!f)return;
 const a=Math.random()*6.283,r=R*Math.sqrt(Math.random()),W=faceW(),H=faceH(),[ox,oy]=S.toWorld(0,0);
 f.alive=true;f.t0=now;f.life=650+Math.random()*550;f.ph=Math.random()*6.283;f.sz=sz*(.6+.6*Math.random());
 f.x=Math.min(ox+W*.97,Math.max(ox+W*.03,cx+Math.cos(a)*r));f.y=Math.min(oy-H*.04,Math.max(oy-H*.9,cy+Math.sin(a)*r*.8));
}
function spawnSpark(cx,cy,R,now){
 const k=S.fx.sparks.find(k=>!k.alive);if(!k)return;const a=Math.random()*6.283,r=R*Math.sqrt(Math.random());
 Object.assign(k,{alive:true,t0:now,life:800+Math.random()*800,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.8,vx:(Math.random()-.5)*90,vy:130+Math.random()*190,s:3+Math.random()*4});
}
// Flame field around (cx,cy) radius R at intensity I (0..1, how many tongues are alive); kill 0..1 fades everything out.
function stepFire(now,I,cx,cy,R,kill){
 const fx=S.fx,W=faceW(),sc=W/340;let alive=0;
 if(I>0){
  let n=fx.flames.filter(f=>f.alive).length;for(let i=0;n<I*NF&&i<4;i++,n++)spawnFlame(cx,cy,R,sc,now);
  if(Math.random()<I*.6)spawnSpark(cx,cy,R,now);
 }
 for(const f of fx.flames){
  if(!f.alive)continue;const t=(now-f.t0)/f.life;
  if(t>=1){f.alive=false;f.sp.forEach(s=>s.visible=false);continue;}
  alive++;const env=Math.min(1,t*5)*(1-t)**.7*(1-kill),fl=.8+.2*Math.sin(now*.018+f.ph),sway=Math.sin(now*.007+f.ph)*10*sc*t;
  f.sp.forEach((s,i)=>{const [,size,a,sh]=LAYERS[i];s.visible=true;s.position.set(f.x+sway*(1-i*.3),f.y+t*40*sc*(1+i*.4),S.faceZ+10);
   s.scale.set(110*sc*f.sz*size*fl*(1-.5*t),(60+100*(1-i*.25))*sc*f.sz*size*(.9+.2*fl)*(1-.2*t),1);s.material.opacity=env*a*(i==2?2.2:1.6)*sh;});
 }
 for(const k of fx.sparks){
  if(!k.alive)continue;const age=(now-k.t0)/1000,t=age*1000/k.life;
  if(t>=1){k.alive=false;k.sp.visible=false;continue;}alive++;
  k.sp.visible=true;k.sp.position.set(k.x+k.vx*age+Math.sin(age*9+k.x)*6,k.y+k.vy*age,S.faceZ+12);k.sp.scale.setScalar(k.s*sc*(1-.5*t));k.sp.material.opacity=(1-t)*(1-kill);
 }
 fx.light.position.set(cx,cy+R*.3,W*.35);fx.light.intensity=I*(1-kill)*(5+.9*Math.sin(now*.03)+.5*Math.sin(now*.071));
 return alive>0;
}
function stepFlakes(now){
 let any=false;
 for(const k of S.flakes.list){
  if(!k.alive)continue;const age=(now-k.t0)/1000,m=k.m;
  if(age>2.4){k.alive=false;m.visible=false;continue;}any=true;
  m.position.set(k.x+k.vx*age,k.y+k.vy*age-380*age*age,S.faceZ+4);
  m.rotation.set(k.rx*age,k.ry*age,k.rz*age);m.scale.set(k.sx,k.sy,k.sx).multiplyScalar(Math.min(1,(2.4-age)*2));
 }
 return any;
}
function spawnFlakes(c1,now){
 const W=faceW(),H=faceH(),cw=W/NX,ch=H/NY;
 while(S.ptr<S.order.length&&S.T[S.order[S.ptr]]<=c1){
  const idx=S.order[S.ptr++],k=S.flakes.list.find(k=>!k.alive);
  if(!k||S.ptr%5)continue; // every 5th crossed cell sheds a flake
  const i=idx%NX,j=(idx/NX)|0,[x,y]=wp((i+.5)*cw,(j+.5)*ch);
  Object.assign(k,{alive:true,t0:now-(S.hold?Math.random()*1500:0),x,y,vx:(Math.random()-.5)*70,vy:-(10+Math.random()*50),rx:(Math.random()-.5)*8,ry:(Math.random()-.5)*8,rz:(Math.random()-.5)*8,sx:cw*(1+Math.random()*1.4),sy:ch*(.9+Math.random()*1.2)});
  k.m.visible=true;
 }
}
function ashPaint(){ // scorch + glow gone, guides back
 S.embers=[];const pc=S.paint.ctx,gc=S.glow.ctx;
 pc.clearRect(0,0,S.paint.canvas.width,S.paint.canvas.height);pc.drawImage(S.pristine,0,0);S.paint.texture.needsUpdate=true;
 gc.clearRect(0,0,S.glow.canvas.width,S.glow.canvas.height);S.glow.texture.needsUpdate=true;S.glowOn=false;S.pointers.clear();
}
function secretStep(dt,now){
 if(!S.scene)return false;
 if(S.hold)now=S.hold; // debug.pose: time frozen
 const rs=S.rs,U=S.uni;let busy=false;
 S.heat+=((S.stage==='idle'?revNow(rs,now)/SECRET.revs:S.stage==='fire'?1:0)-S.heat)*Math.min(1,dt*5);
 if(S.heat<.005)S.heat=0;
 if(U.glowS)U.glowS.value=1.2+1.8*S.heat;
 if(S.stage==='idle'&&rs.phase==='fire'){S.stage='fire';S.t0=now;S.fc=wp(rs.at.x,rs.at.y);}
 if((S.stage==='idle'||S.stage==='fire')&&rs.phase==='ash'){ // tap: hiss, steam, embers out, board greys
  S.stage='ash';S.t0=now;ashPaint();
  const [cx,cy]=S.fc||wp(faceW()/2,faceH()/2),W=faceW();
  for(let i=0;i<S.smoke.length;i++)spawnSmoke(0,0,[cx+(Math.random()-.5)*W*.7,cy+(Math.random()-.5)*W*.5]);
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('myr5:portal-sound',{detail:{kind:'hiss',board:'wood'}}));
 }
 if(S.stage==='idle'){
  const I=Math.max(0,S.heat-.4)*.5; // small tongues at the finger while the heat builds
  if(I>0||S.fx?.flames.some(f=>f.alive)){ensureFx();const [fx,fy]=S.finger?S.toWorld(...S.finger):[0,0];busy=stepFire(now,I,fx,fy,faceW()*.07,0);}
 }else if(S.stage==='fire'){
  ensureFx();const ft=now-S.t0,W=faceW(),R=(.1+.45*Math.min(1,ft/3500))*W;const e=Math.min(1,ft/3500),[ox,oy]=S.toWorld(0,0); // the burn spreads and drifts to the board's middle
  busy=stepFire(now,Math.min(1,.4+ft/1800*.6),lerp(S.fc[0],ox+W/2,e),lerp(S.fc[1],oy-faceH()*.45,e),R,0);
  busy=true;
 }else{
  const t=now-S.t0;
  if(S.fx)busy=stepFire(now,0,0,0,1,Math.min(1,t/350));
  if(S.stage==='ash'){
   U.ash.value=Math.min(1,t/ASH_MS);busy=true;
   if(t>ASH_MS+HOLD_MS){S.stage='crumble';S.t0=now;ensureFlakes();S.c=0;}
  }
  if(S.stage==='crumble'){
   const p=Math.min(1,(now-S.t0)/CRUMBLE_MS),c=1.02*p**1.4;U.crumble.value=c;ensureFlakes();spawnFlakes(c,now);S.c=c;busy=true;
   if(p>=1){S.stage='gone';S.t0=now;window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'wood'}}));S.timer2=setTimeout(heal,9000);}
  }
  if(S.flakes)busy=stepFlakes(now)||busy;
 }
 return busy||S.heat>0;
}
// Back to a fresh board. portal's board.heal() only reaches us after a cut, so this also runs on the next press and 9 s after the end.
function heal(){
 if(!S)return;S.hold=0;clearTimeout(S.timer2);
 S.stage='idle';S.rs=woodSecretInit();S.heat=0;S.fc=null;S.finger=null;S.c=0;S.ptr=0;
 if(S.uni.ash){S.uni.ash.value=0;S.uni.crumble.value=0;if(S.uni.glowS)S.uni.glowS.value=1.2;}
 for(const f of S.fx?.flames||[]){f.alive=false;f.sp.forEach(s=>s.visible=false);}
 for(const k of S.fx?.sparks||[]){k.alive=false;k.sp.visible=false;}
 if(S.fx)S.fx.light.intensity=0;
 for(const k of S.flakes?.list||[]){k.alive=false;k.m.visible=false;}
 S.wake?.();
}

function init({THREE,scene,uniforms,paint,glow,toWorld,faceZ,wake}){
 const pristine=document.createElement('canvas');pristine.width=paint.canvas.width;pristine.height=paint.canvas.height;
 pristine.getContext('2d').drawImage(paint.canvas,0,0); // the guides, as drawn before init
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tex=reduced||!scene?null:softCircleTexture(THREE);
 const smoke=reduced||!scene?[]:Array.from({length:SMOKE_COUNT},()=>{
  const mat=new THREE.SpriteMaterial({map:tex,color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:false}); // raised carving must never hide smoke
  const sprite=new THREE.Sprite(mat);sprite.visible=false;scene.add(sprite);
  return {sprite,alive:false,t0:0,x0:0,y0:0,dir:1};
 });
 S={THREE,scene,paint,glow,toWorld,faceZ,wake,reduced,smoke,smokeTex:tex,pristine,r:paint.canvas.width*STAMP_FRAC,sprites:[],
  pointers:new Map(),embers:[],glowOn:false,busy:false,lastTick:-Infinity,lastSmoke:0,timer:0,
  rs:woodSecretInit(),stage:'idle',heat:0,lastStamp:0,uni:{ash:U.uAsh,crumble:U.uCrumble,glowS:uniforms?.uGlowStrength}};
 if(scene){U.uAshTex.value=ashTexture(THREE);if(typeof window!=='undefined')window.myr5Wood=debug;} // 3D board only
}
function press(id,u,v){
 if(S.stage==='gone')heal();if(S.stage==='ash'||S.stage==='crumble')return;secretEv('down',id,u,v);
 S.pointers.set(id,{u,v,t:performance.now()});stamp(u,v,dwellAlpha(EMBER_PERIOD_MS));} // one hold-tick's worth
// Walk from the last ember toward the finger in STAMP_STEP paint-px hops so fast drags stay continuous;
// the remainder carries to the next move, and each hop's heat scales with the ms it took.
function move(id,u,v){
 if(S.stage==='ash'||S.stage==='crumble'||S.stage==='gone')return;secretEv('move',id,u,v);
 const p=S.pointers.get(id);const now=performance.now();
 if(!p){S.pointers.set(id,{u,v,t:now});return;}
 const W=S.paint.canvas.width,H=S.paint.canvas.height,d=Math.hypot((u-p.u)*W,(v-p.v)*H),n=Math.floor(d/STAMP_STEP);
 if(!n)return;
 const a=dwellAlpha((now-p.t)*STAMP_STEP/d),su=(u-p.u)*STAMP_STEP/d,sv=(v-p.v)*STAMP_STEP/d;
 for(let i=0;i<n;i++){p.u+=su;p.v+=sv;stamp(p.u,p.v,a);}
 p.t=now;
}
function claims(id){return woodClaims(S?.rs,id);}
function release(id){if(S?.scene)secretEv('up',id,0,0);S.pointers.delete(id);}
function step(dt,now){
 if(S.pointers.size){ // held still: keep stacking fresh embers under each finger, and puff smoke
  for(const p of S.pointers.values())if(now-p.t>=EMBER_PERIOD_MS){stamp(p.u,p.v,dwellAlpha(now-p.t));p.t=now;}
  if(!S.reduced&&now-S.lastSmoke>=SMOKE_PERIOD_MS*(1-.5*S.heat)){S.lastSmoke=now;for(const p of S.pointers.values())spawnSmoke(p.u,p.v);}
 }
 const smokeAlive=(S.reduced?false:stepSmoke(now))|secretStep(dt,now);
 if(now-S.lastTick>=TICK_MS){S.lastTick=now;S.busy=tick(now);}
 return smokeAlive||S.busy||S.pointers.size>0;
}
const debug={ // preview/test hooks: jump to a stage
 fire(){const w=faceW(),h=faceH();S.rs={...woodSecretInit(),phase:'fire',fireAt:performance.now(),at:{x:w*.3,y:h*.35}};S.wake?.();},
 ash(){if(S.rs.phase==='idle')debug.fire();S.rs={...S.rs,phase:'ash'};S.wake?.();},
 pose(stage,p){ // freeze mid-stage for screenshots: 'ash'|'crumble', p 0..1
  const d=stage==='ash'?ASH_MS:CRUMBLE_MS,now=performance.now();debug.ash();S.hold=now;S.stage=stage;S.t0=now-p*d;S.ptr=0;
  if(stage==='crumble'){ensureFlakes();S.flakes.list.forEach(k=>{k.alive=false;k.m.visible=false;});U.uAsh.value=1;}S.wake?.();},
 heal,state:()=>({stage:S.stage,rs:S.rs,heat:S.heat}),
};
function dispose(){
 if(S){clearTimeout(S.timer);clearTimeout(S.timer2);if(typeof window!=='undefined'&&window.myr5Wood===debug)delete window.myr5Wood;
  for(const f of S.fx?.flames||[])f.sp.forEach(s=>{s.parent?.remove(s);s.material.dispose();});for(const k of S.fx?.sparks||[]){k.sp.parent?.remove(k.sp);k.sp.material.dispose();}
  if(S.fx){S.fx.light.parent?.remove(S.fx.light);S.fx.ft.dispose();S.fx.dt.dispose();}
  for(const k of S.flakes?.list||[])k.m.parent?.remove(k.m);if(S.flakes){S.flakes.geo.dispose();S.flakes.mats.forEach(m=>m.dispose());}
  U.uAshTex.value?.dispose();U.uAshTex.value=null;for(const s of S.smoke)s.sprite.parent?.remove(s.sprite);for(const s of S.smoke)s.sprite.material.dispose();S.smokeTex?.dispose();}
 S=null;
}
return {init,press,move,release,step,dispose,claims,heal,uniforms:U,fragmentDecls:'uniform float uAsh;uniform float uCrumble;uniform sampler2D uAshTex;\n',
 fragment:`if(uCrumble>0.0){float ct=texture2D(uAshTex,vPlanar).r;if(ct<uCrumble)discard;diffuseColor.rgb*=mix(1.0,.35,smoothstep(.07,0.,ct-uCrumble));}
if(uAsh>0.0){float mt=texture2D(uAshTex,vPlanar*vec2(2.7,2.3)+.31).r;vec3 ac=vec3(.62,.6,.57)*clamp(.45+1.1*lum,.3,1.3)*(.55+.6*mt);diffuseColor.rgb=mix(diffuseColor.rgb,ac,uAsh);roughnessFactor=mix(roughnessFactor,1.,uAsh);}`};
}

export const wood={
 id:'wood',asset:'/pod/worlds/boards/wood.glb',flip:false,background:'#140c06',
 guide:{color:'#ffe0b0',alpha:.1,width:4},
 pattern:{left:.07,top:.03,right:.93,bottom:.78}, // measured in-browser against the carved oval's extremes
 ...woodEffect(),trace2d:woodEffect,
};
