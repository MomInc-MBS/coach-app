// Achievements / battle-pass board: Ian's constellation of bosses. Bosses with every level beaten
// glow and twinkle; tapping one zooms in and lists its levels and rewards; bosses that are too
// advanced, and rows outside the user's paths, are locked and not clickable. AGPL-3.0-or-later.
// The two swap points (selected paths, beaten levels) read the battle-pass API (rank 6b, D30).
import {selectedTracks,loadProgress} from './battle-pass.mjs';
import {bossRewards} from './battle-pass-rewards.mjs';
export {selectedTracks,loadProgress};
const IMAGE='/pod/worlds/achievements.jpg';
// D25 track ids. Row → track is a default (top to bottom in dial order) — change freely; Ian hasn't assigned rows.
export const TRACK_NAMES={chest:'Chest',quads:'Quads',glutes:'Glutes','arms-shoulders':'Arms & Shoulders',yoga:'Yoga','martial-arts':'Martial Arts',cardio:'Cardio',meditation:'Meditation'};
// Boxes are [x,y,w,h] in % of the art, measured from the neon figures (column projection per colour band).
// Names are placeholders — Ian said the titles don't matter; change them here. track:null = shared by everyone.
export const TIERS=[
 {id:'strider',name:'Strider',track:'chest',color:'#b48cff',boxes:[[10.96,9.7,10.78,8.8],[28.4,8.05,7.89,10.45],[37.51,9.2,11.92,9.3],[51.62,8.05,11.48,10.45],[63.37,8.05,12.8,10.45],[78.18,7.9,15.43,10.6]]},
 {id:'ringer',name:'Ringer',track:'quads',color:'#ff8a2a',boxes:[[20.16,18.05,7.89,8.1],[31.11,17.95,10.69,8.4],[44.26,17.95,9.55,8.25],[57.06,17.95,9.03,8.3],[69.76,17.95,11.13,8.5]]},
 {id:'manyarm',name:'Manyarm',track:'glutes',color:'#7dff5a',boxes:[[22.17,26.65,8.33,8.6],[34.18,26.45,9.73,8.8],[46.54,27.25,10.08,8],[57.49,27.4,7.54,7.85],[65.64,27.2,12.62,8.05]]},
 {id:'wedge',name:'Wedge',track:'arms-shoulders',color:'#39a8ff',boxes:[[23.4,34.7,10.52,7.8],[35.06,34.7,8.15,7.45],[43.21,34.7,11.48,7.75],[55.04,34.7,9.82,7.75],[65.21,34.7,11.22,7.75]]},
 {id:'warden',name:'Warden',track:null,color:'#39a8ff',boxes:[[45.57,41.95,8.24,5.7]]},
 {id:'blob',name:'Blob',track:'yoga',color:'#c65cff',boxes:[[26.29,47.25,10.87,6.95],[38.56,47.1,9.55,7.2],[49.87,47.1,7.8,6.95],[60.74,47.3,9.55,7.45]]},
 {id:'cap',name:'Cap',track:'martial-arts',color:'#ff4fa0',boxes:[[33.04,54.6,7.62,7.4],[40.93,54.55,11.13,7.45],[53.46,54.65,10.78,7.35]]},
 {id:'stalk',name:'Stalk',track:'cardio',color:'#ff4a3d',boxes:[[30.5,61.45,7.01,7.5],[38.21,61.45,8.15,7.25],[49.52,61.45,9.29,7.5],[58.55,61.45,8.59,7.5]]},
 {id:'tanka',name:'Tanka',track:'meditation',color:'#ffd23a',boxes:[[29.27,68.65,9.38,7.85],[39.09,68.65,9.64,7.8],[48.47,68.45,10.6,8],[59.95,68.5,8.33,8]]},
 {id:'lume',name:'Lume',track:null,color:'#ffc94a',boxes:[[39.35,75.95,15.34,8.8]]},
];
// Reward ladder per boss — plan/DECISIONS.md D22 (+ D16 textures, D17 specials). Text only, no tuning numbers.
export const LEVELS=[['Weapon 1','Texture 1'],['Colour palette','Boss texture'],['Weapon 2','Special','Texture 2'],['Pet'],['Aura','Boss skin','Texture 3']];
export const MAX_LEVEL=LEVELS.length;
export const BOSSES=TIERS.flatMap((tier,t)=>tier.boxes.map((box,i)=>({id:`${tier.id}-${i+1}`,name:tier.boxes.length>1?`${tier.name} ${i+1}`:tier.name,tier:t,track:tier.track,color:tier.color,box})));
export const levelRewardsForBoss=bossId=>bossRewards(bossId);

// progress = {bossId: levels beaten}; tracks = the user's available track ids (null = every track).
// Ian (22 Sept): the rows available to each user are their selected paths plus Meditation. Within an
// available row bosses unlock left to right; the shared bosses (no track) open once every available
// row is fully beaten, in order.
export function bossStates(progress={},tracks=null){
 const levelsOf=b=>Math.min(MAX_LEVEL,Math.max(0,Number(progress[b.id])||0));
 const allowed=tier=>tier.track===null||!tracks||tracks.has(tier.track);
 const row=(t,open)=>BOSSES.filter(b=>b.tier===t).map(b=>{const levels=levelsOf(b),done=levels>=MAX_LEVEL,s={...b,levels,state:done?'done':open?'open':'locked'};open=open&&done;return s;});
 const out=TIERS.map((tier,t)=>tier.track===null?null:row(t,allowed(tier)));
 let open=out.every((r,t)=>!r||!allowed(TIERS[t])||r.every(b=>b.state==='done'));
 TIERS.forEach((tier,t)=>{if(tier.track!==null)return;out[t]=row(t,open);open=open&&out[t].every(b=>b.state==='done');});
 return out.flat();
}
let dialog,stage,detail,artEl,bossesEl,layers,raf=0,t0=0,far,near;
// Zoom parallax factor per depth: how much of the stage's translate/scale each layer gets (D45 #142).
const DEPTH={far:.35,mid:.65,near:1.25};
const prefersReducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand=(a,b)=>a+Math.random()*(b-a);
const wrap=v=>v-Math.floor(v);
const dots=n=>Array.from({length:n},()=>`<i style="left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;--d:${(Math.random()*4).toFixed(2)}s"></i>`).join('');
const asteroid=(r0,r1)=>({r:rand(r0,r1),rot:rand(0,7),vr:rand(-.3,.3),verts:Array.from({length:8},()=>rand(.55,1))});
// Far layer (unit 0..1 space, positions wrap): a dust field plus a few slow drifting stars and dark asteroids.
function makeFar(){
 return {
  dust:Array.from({length:60},()=>({x:Math.random(),y:Math.random(),r:rand(.5,1.2),a:rand(.3,.85)})),
  stars:Array.from({length:Math.round(rand(4,6))},()=>({x:Math.random(),y:Math.random(),vx:rand(.01,.025)*(Math.random()<.5?-1:1),vy:rand(.005,.015)*(Math.random()<.5?-1:1),r:rand(1.1,1.8)})),
  rocks:Array.from({length:Math.round(rand(2,3))},()=>({x:Math.random(),y:Math.random(),vx:rand(.004,.012)*(Math.random()<.5?-1:1),vy:rand(.002,.007)*(Math.random()<.5?-1:1),...asteroid(9,16)})),
 };
}
// Near layer: 3-5 debris chunks, each a straight crossing of the art that loops every 6-14s.
function makeNear(){
 return Array.from({length:Math.round(rand(3,5))},()=>{
  const alongX=Math.random()<.5,fwd=Math.random()<.5,a=fwd?-.2:1.2,b=fwd?1.2:-.2;
  return {x0:alongX?a:rand(-.1,1.1),y0:alongX?rand(-.1,1.1):a,x1:alongX?b:rand(-.1,1.1),y1:alongX?rand(-.1,1.1):b,dur:rand(6,14),phase:Math.random(),...asteroid(16,30)};
 });
}
function poly(ctx,cx,cy,r,rot,verts){
 ctx.beginPath();
 verts.forEach((v,i)=>{const a=rot+i/verts.length*Math.PI*2,x=cx+Math.cos(a)*r*v,y=cy+Math.sin(a)*r*v;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
 ctx.closePath();
}
// Irregular dark polygon with a lit rim (a directional gradient stroke) — cheap stand-in for a lit asteroid.
function rock(ctx,cx,cy,r,rot,verts,alpha){
 ctx.globalAlpha=alpha;poly(ctx,cx,cy,r,rot,verts);ctx.fillStyle='#0c0818';ctx.fill();
 const g=ctx.createLinearGradient(cx-r,cy-r,cx+r*.2,cy+r*.2);
 g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');
 ctx.strokeStyle=g;ctx.lineWidth=1.2;ctx.stroke();ctx.globalAlpha=1;
}
function drawFar(elapsed){
 const {ctx,w,h,field}=far,t=elapsed/1000;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';
 for(const d of field.dust){ctx.globalAlpha=d.a;ctx.beginPath();ctx.arc(d.x*w,d.y*h,d.r,0,7);ctx.fill();}
 ctx.globalAlpha=1;ctx.shadowColor='#fff';
 for(const s of field.stars){ctx.shadowBlur=6;ctx.beginPath();ctx.arc(wrap(s.x+s.vx*t)*w,wrap(s.y+s.vy*t)*h,s.r,0,7);ctx.fill();}
 ctx.shadowBlur=0;
 for(const a of field.rocks)rock(ctx,wrap(a.x+a.vx*t)*w,wrap(a.y+a.vy*t)*h,a.r,a.rot+a.vr*t,a.verts,.8);
}
function drawNear(elapsed){
 const {ctx,w,h,field}=near,t=elapsed/1000;
 ctx.clearRect(0,0,w,h);
 for(const p of field){const u=wrap(t/p.dur+p.phase);rock(ctx,(p.x0+(p.x1-p.x0)*u)*w,(p.y0+(p.y1-p.y0)*u)*h,p.r,p.rot+t*p.vr,p.verts,.85);}
}
function draw(elapsed){drawFar(elapsed);drawNear(elapsed);}
// devicePixelRatio capped at 2; canvases are sized in real CSS px via setTransform so draw math stays unit-space.
function fitLayers(){
 const r=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 for(const layer of [far,near]){
  const c=layer.canvas;c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));
  layer.ctx=c.getContext('2d');layer.ctx.setTransform(dpr,0,0,dpr,0,0);layer.w=r.width;layer.h=r.height;
 }
}
// One rAF loop for both canvases; stopped on dialog close and while the tab is hidden.
function startLoop(){
 if(raf||prefersReducedMotion()||!dialog?.open||document.hidden)return;
 const tick=now=>{raf=requestAnimationFrame(tick);draw(now-t0);};
 raf=requestAnimationFrame(tick);
}
function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;}
function build(){
 dialog=document.createElement('dialog');dialog.className='ach-board';dialog.setAttribute('aria-label','Achievements');
 dialog.innerHTML=`<div class="ach-stage"><img class="ach-art ach-parallax" src="${IMAGE}" alt="Boss constellation" draggable="false">`+
  `<canvas class="ach-stars ach-parallax" data-depth="far" data-peer-depth="far" aria-hidden="true"></canvas>`+
  `<div class="ach-stars ach-parallax" data-depth="mid" data-peer-depth="mid" aria-hidden="true">${dots(40)}</div>`+
  `<div class="ach-bosses ach-parallax"></div>`+
  `<canvas class="ach-stars ach-parallax" data-depth="near" data-peer-depth="near" aria-hidden="true"></canvas>`+
  `</div><header class="ach-head"><h1>Achievements</h1><p class="ach-count"></p></header><section class="ach-detail" hidden></section><div class="ach-starter"><p>The constellation art comes with the Starter pack.</p><button type="button">Download the Starter pack</button></div><button type="button" class="ach-close" aria-label="Close">✕</button>`;
 document.body.append(dialog);
 // W2-2O: the constellation is Starter-pack art. Without it (offline, not downloaded) the bosses glow on the plain
 // starfield and the pack is offered (achievements-board.css .no-art).
 dialog.querySelector('.ach-art').addEventListener('error',()=>dialog.classList.add('no-art'),{once:true});
 dialog.querySelector('.ach-starter button').onclick=()=>window.myr5Packs?.open('starter');
 stage=dialog.querySelector('.ach-stage');detail=dialog.querySelector('.ach-detail');
 artEl=dialog.querySelector('.ach-art');bossesEl=dialog.querySelector('.ach-bosses');
 layers={far:dialog.querySelector('[data-depth=far]'),mid:dialog.querySelector('[data-depth=mid]'),near:dialog.querySelector('[data-depth=near]')};
 far={canvas:layers.far,field:makeFar()};near={canvas:layers.near,field:makeNear()};t0=performance.now();
 dialog.querySelector('.ach-close').onclick=()=>dialog.close();
 stage.addEventListener('click',e=>{if(dialog.classList.contains('zoomed')&&!e.target.closest('.ach-boss'))unzoom();});
 dialog.addEventListener('close',()=>{unzoom();stopLoop();});
 new ResizeObserver(()=>{fitLayers();draw(performance.now()-t0);}).observe(stage);
 document.addEventListener('visibilitychange',()=>document.hidden?stopLoop():startLoop());
}
function paint(){
 const host=stage.querySelector('.ach-bosses'),states=bossStates(loadProgress(),selectedTracks());host.replaceChildren();
 dialog.querySelector('.ach-count').textContent=`${states.filter(b=>b.state==='done').length} / ${states.length} bosses beaten`;
 for(const b of states){
  const [x,y,w,h]=b.box,btn=document.createElement('button');btn.type='button';btn.className='ach-boss';btn.dataset.state=b.state;btn.dataset.id=b.id;
  btn.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%;--bx:${x};--by:${y};--bw:${w};--bh:${h};--glow:${b.color};--d:${(x*7%3).toFixed(2)}s`;
  btn.setAttribute('aria-label',`${b.name}, ${b.state==='locked'?'locked':`${b.levels} of ${MAX_LEVEL} levels beaten`}`);
  btn.disabled=b.state==='locked';
  btn.onclick=()=>zoom(b,btn);
  host.append(btn);
 }
}
// Pure helper: how far each depth layer moves for a given stage translate/scale (far moves least, near most).
export function layerTransform(depth,{tx=0,ty=0,scale=1}={}){
 const f=DEPTH[depth]??1;
 return {tx:tx*f,ty:ty*f,scale:1+(scale-1)*f};
}
function zoom(b,btn){
 stage.querySelector('.ach-boss.selected')?.classList.remove('selected');btn.classList.add('selected');
 const r=stage.getBoundingClientRect(),[x,y,w,h]=b.box;
 const cx=r.width*(x+w/2)/100,cy=r.height*(y+h/2)/100,scale=Math.min(4,Math.max(2,r.height*.26/(r.height*h/100)));
 const tx=r.width/2-cx,ty=r.height*.3-cy;
 // Art + boss tap targets keep today's transform exactly, unscaled by depth, so nothing shifts under a finger.
 for(const el of [artEl,bossesEl]){el.style.transformOrigin=`${cx}px ${cy}px`;el.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;}
 for(const depth of ['far','mid','near']){
  const t=layerTransform(depth,{tx,ty,scale}),el=layers[depth];
  el.style.transformOrigin=`${cx}px ${cy}px`;el.style.transform=`translate(${t.tx}px,${t.ty}px) scale(${t.scale})`;
 }
 dialog.classList.add('zoomed');
 detail.style.setProperty('--glow',b.color);
 const path=b.track?TRACK_NAMES[b.track]:'Shared';
 detail.innerHTML=`<h2>${b.name}</h2><hr><p class="ach-status">${path} · ${b.state==='done'?'every level beaten':`${b.levels} of ${MAX_LEVEL} levels beaten · beat level ${b.levels+1} next`}</p><ol>${LEVELS.map((rewards,i)=>`<li data-step="${i<b.levels?'done':i===b.levels?'next':'todo'}"><b>Level ${i+1}</b><span>${rewards.join(' · ')}</span></li>`).join('')}</ol><button type="button" class="ach-back">Back</button>`;
 detail.hidden=false;detail.querySelector('.ach-back').onclick=unzoom;
 const rewards=levelRewardsForBoss(b.id);
 detail.querySelectorAll('ol li span').forEach((span,i)=>{const items=rewards[i]||[];span.textContent=items.length?items.map(item=>`${item.name}${item.line?` — ${item.line}`:''}`).join(' · '):'No reward';});
}
function unzoom(){
 for(const el of [artEl,bossesEl,layers?.far,layers?.mid,layers?.near])if(el)el.style.transform='';
 dialog.classList.remove('zoomed');detail.hidden=true;stage.querySelector('.ach-boss.selected')?.classList.remove('selected');
}
export function openAchievements(){
 if(!dialog)build();
 paint();
 if(!dialog.open)dialog.showModal();
 fitLayers();draw(performance.now()-t0);startLoop();
 return dialog;
}
