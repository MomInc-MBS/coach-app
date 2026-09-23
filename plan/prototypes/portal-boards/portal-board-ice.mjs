// Cracking-ice effect for portal-board-glb.mjs. Fracture geometry comes from the vendored MIT
// cracked-glass core (cracked-glass-core.mjs) unchanged; this file only drives it: one big radial crack
// where the finger lands, then a dense trail of small short-lived cracks hugging the drag (grow, hold,
// shrink away), drawn on the glow layer only so the paint layer keeps the guides. AGPL-3.0-or-later.
import {generateFracture,computeFrame} from './cracked-glass-core.mjs';

// Crack kinds: field side as a fraction of the paint width, lifecycle (ms), fracture options.
// Everything is gone within 1.3 s of its birth, well inside Ian's 7 s return-to-normal rule.
export const BIG={frac:.45,grow:300,hold:600,shrink:400,opts:{rays:{count:7},rings:{count:3}}};
export const SMALL={frac:.11,grow:220,hold:350,shrink:600,opts:{rays:{count:3,doubling:false},rings:{count:1}}};
const MAX_LIVE=40,DRAG_STEP=7; // DRAG_STEP: screen px of finger travel between small cracks
// ponytail: POOL fractures per kind reused with a random spin, LEVELS cached frames each, since
// computeFrame is ~2 ms per call; raise POOL if repeats ever show.
const POOL=6,LEVELS=16,FRAME_OPTS={quality:'normal',timeline:{crackStart:0,crackEnd:1,shatterStart:Infinity}};
const CORE='#dff7ff',HALO='rgba(110,215,255,.8)',HALO_BLUR=6;

// --- Pure lifecycle helpers (age in ms since spawn, L = BIG or SMALL) ------------------------
// Growth 0..1: grow, hold at 1, shrink back to 0; reduced motion is fully grown until the hold ends.
export function crackT(age,reduced=false,L=SMALL){
 if(age<0||crackAlpha(age,reduced,L)===0)return 0;
 if(reduced)return 1;
 if(age<L.grow)return age/L.grow;
 if(age<L.grow+L.hold)return 1;
 return 1-(age-L.grow-L.hold)/L.shrink;
}
// Opacity: 1 until the shrink starts, then fades with it; 0 means dead.
export function crackAlpha(age,reduced=false,L=SMALL){
 if(age<0)return 0;
 const held=L.grow+L.hold;
 if(age<held)return 1;
 if(reduced)return 0;
 return Math.max(0,1-(age-held)/L.shrink);
}

let S=null; // per-instance state; a single portal board is ever active at once

function frame(L,i,k){ // cached Path2D of kind L's pool pattern i at growth level k (lazily computed)
 const pool=S.pools.get(L),f=S.field(L);
 const p=pool[i]??={data:generateFracture({mode:'radial',width:f,height:f,seed:i+1,impact:{x:f/2,y:f/2},impactHole:0,...L.opts}),paths:[]};
 return p.paths[k]??=new Path2D(computeFrame(k/LEVELS,p.data,FRAME_OPTS).cracks.corePath);
}
function spawn(L,x,y){
 if(S.live.length>=MAX_LIVE){const i=S.live.findIndex(c=>c.L===SMALL);S.live.splice(i<0?0:i,1);} // never pop the big one early
 S.live.push({L,x,y,i:S.next++%POOL,rot:Math.random()*Math.PI*2,t0:performance.now()});
 S.dirty=true;
}
function redraw(now){
 const gc=S.glow.ctx;
 gc.clearRect(0,0,S.glow.canvas.width,S.glow.canvas.height);
 gc.save();gc.fillStyle=CORE;gc.shadowColor=HALO;gc.shadowBlur=HALO_BLUR*S.scale;
 for(const c of S.live){
  const age=now-c.t0,k=Math.round(crackT(age,S.reduced,c.L)*LEVELS),f=S.field(c.L)/2;
  if(!k)continue;
  gc.setTransform(1,0,0,1,0,0);gc.translate(c.x,c.y);gc.rotate(c.rot);gc.translate(-f,-f);
  gc.globalAlpha=crackAlpha(age,S.reduced,c.L);gc.fill(frame(c.L,c.i,k));
 }
 gc.restore();
 S.glow.texture.needsUpdate=true;
}

function init({paint,glow,toWorld}){
 const w=paint.canvas.width;
 S={glow,toWorld,live:[],pools:new Map([[BIG,[]],[SMALL,[]]]),next:Math.floor(Math.random()*POOL),drag:new Map(),dirty:false,
  field:L=>Math.round(w*L.frac),scale:w/1024,sx:w,sy:paint.canvas.height,
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
}
function press(id,u,v){S.drag.set(id,{u,v});spawn(BIG,u*S.sx,v*S.sy);}
// Walk from the last crack toward the finger in DRAG_STEP (screen px) hops so fast drags stay continuous.
function move(id,u,v){
 const p=S.drag.get(id);
 if(!p){S.drag.set(id,{u,v});return;}
 const [ax,ay]=S.toWorld(p.u,p.v),[bx,by]=S.toWorld(u,v),d=Math.hypot(bx-ax,by-ay),n=Math.floor(d/DRAG_STEP),su=(u-p.u)*DRAG_STEP/d,sv=(v-p.v)*DRAG_STEP/d;
 for(let i=0;i<n;i++){p.u+=su;p.v+=sv;spawn(SMALL,p.u*S.sx,p.v*S.sy);}
}
function release(id){S.drag.delete(id);}
function step(dt,now){
 if(!S.live.length)return false;
 const n=S.live.length;
 S.live=S.live.filter(c=>crackAlpha(now-c.t0,S.reduced,c.L)>0);
 // Reduced motion: frames only change when a crack is born or dies; otherwise every frame animates.
 if(!S.reduced||S.dirty||S.live.length!==n)redraw(now);
 S.dirty=false;
 return S.live.length>0;
}
function dispose(){S=null;}

export const ice={id:'ice',asset:'./pod/worlds/boards/ice.glb',flip:false,background:'#0b1a26',guide:{color:'#eaf7ff',alpha:.22,width:5},init,press,move,release,step,dispose};
