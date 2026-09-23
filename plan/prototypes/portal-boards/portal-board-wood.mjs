// Burning-wood board effect for portal-board-glb.mjs: press/drag drops dwell-scaled embers that age
// on the clock (deep orange -> dark ember -> char) on `paint`, glow on `glow` while hot, then fade out
// so the board returns to just its guides; procedural smoke sprites puff while burning. AGPL-3.0-or-later.

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

let S=null; // per-instance state; a single portal board is ever active at once

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
function stamp(u,v,heat){S.embers.push({x:u*S.paint.canvas.width,y:v*S.paint.canvas.height,heat,t0:performance.now(),k:-1,a:-1});}

// One redraw pass. Paint: restore the pristine guides inside the union of every ember whose colour or
// opacity changed, then redraw the live embers overlapping it (clipped, oldest first). Glow: clear and
// re-draw the hot embers in their own colour (source-over, so overlaps never sum to yellow); wiped once
// when the last one cools. Returns whether anything is still changing.
// ponytail: redraw cost grows with embers under the dirty rect; cap S.embers if long scribbles stutter.
function tick(now){
 const R=S.r,last=SPRITES-1,live=[];let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const e of S.embers){
  const age=now-e.t0,a=Math.round(e.heat*emberFade(age)*100)/100,k=S.reduced?last:Math.round(Math.min(1,age/COOL_MS)*last);
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
  for(const e of hot){gc.globalAlpha=Math.min(1,GLOW_GAIN*e.heat*(1-(now-e.t0)/COOL_MS));gc.drawImage(sprite(e.k),e.x-R,e.y-R);}
  gc.restore();S.glow.texture.needsUpdate=true;S.glowOn=hot.length>0;
 }
 const busy=changed||hot.length>0;
 // Char sits still until FADE_MS: sleep and let a timer wake the board for the fade-out.
 clearTimeout(S.timer);
 if(!busy&&live.length)S.timer=setTimeout(()=>S?.wake?.(),Math.max(0,live[0].t0+FADE_MS-now));
 return busy;
}

function spawnSmoke(u,v){
 const dead=S.smoke.find(s=>!s.alive);if(!dead)return;
 const [x,y]=S.toWorld(u,v);
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

function init({THREE,scene,paint,glow,toWorld,faceZ,wake}){
 const pristine=document.createElement('canvas');pristine.width=paint.canvas.width;pristine.height=paint.canvas.height;
 pristine.getContext('2d').drawImage(paint.canvas,0,0); // the guides, as drawn before init
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tex=reduced?null:softCircleTexture(THREE);
 const smoke=reduced?[]:Array.from({length:SMOKE_COUNT},()=>{
  const mat=new THREE.SpriteMaterial({map:tex,color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:false}); // raised carving must never hide smoke
  const sprite=new THREE.Sprite(mat);sprite.visible=false;scene.add(sprite);
  return {sprite,alive:false,t0:0,x0:0,y0:0,dir:1};
 });
 S={paint,glow,toWorld,faceZ,wake,reduced,smoke,smokeTex:tex,pristine,r:paint.canvas.width*STAMP_FRAC,sprites:[],
  pointers:new Map(),embers:[],glowOn:false,busy:false,lastTick:-Infinity,lastSmoke:0,timer:0};
}
function press(id,u,v){S.pointers.set(id,{u,v,t:performance.now()});stamp(u,v,dwellAlpha(EMBER_PERIOD_MS));} // one hold-tick's worth
// Walk from the last ember toward the finger in STAMP_STEP paint-px hops so fast drags stay continuous;
// the remainder carries to the next move, and each hop's heat scales with the ms it took.
function move(id,u,v){
 const p=S.pointers.get(id);const now=performance.now();
 if(!p){S.pointers.set(id,{u,v,t:now});return;}
 const W=S.paint.canvas.width,H=S.paint.canvas.height,d=Math.hypot((u-p.u)*W,(v-p.v)*H),n=Math.floor(d/STAMP_STEP);
 if(!n)return;
 const a=dwellAlpha((now-p.t)*STAMP_STEP/d),su=(u-p.u)*STAMP_STEP/d,sv=(v-p.v)*STAMP_STEP/d;
 for(let i=0;i<n;i++){p.u+=su;p.v+=sv;stamp(p.u,p.v,a);}
 p.t=now;
}
function release(id){S.pointers.delete(id);}
function step(dt,now){
 if(S.pointers.size){ // held still: keep stacking fresh embers under each finger, and puff smoke
  for(const p of S.pointers.values())if(now-p.t>=EMBER_PERIOD_MS){stamp(p.u,p.v,dwellAlpha(now-p.t));p.t=now;}
  if(!S.reduced&&now-S.lastSmoke>=SMOKE_PERIOD_MS){S.lastSmoke=now;for(const p of S.pointers.values())spawnSmoke(p.u,p.v);}
 }
 const smokeAlive=S.reduced?false:stepSmoke(now);
 if(now-S.lastTick>=TICK_MS){S.lastTick=now;S.busy=tick(now);}
 return smokeAlive||S.busy||S.pointers.size>0;
}
function dispose(){
 if(S){clearTimeout(S.timer);for(const s of S.smoke)s.sprite.parent?.remove(s.sprite);for(const s of S.smoke)s.sprite.material.dispose();S.smokeTex?.dispose();}
 S=null;
}

export const wood={
 id:'wood',asset:'./pod/worlds/boards/wood.glb',flip:false,background:'#140c06',
 guide:{color:'#ffe0b0',alpha:.1,width:4},
 pattern:{left:.07,top:.03,right:.93,bottom:.78}, // measured in-browser against the carved oval's extremes
 init,press,move,release,step,dispose,
};
