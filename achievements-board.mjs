import {COACHES,COACH_REQUIREMENTS,STARTER_COACH_IDS,PATH_INTRO_COACH_IDS,WEAPON_GROUPS,SHIP_REQUIREMENTS,CADENCE_MILESTONES,exerciseDifficulty} from './performance-catalog.mjs';
import {EXERCISES,FOCUS_GROUPS} from './exercise-library.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
import {DIFFICULTIES} from './progression-rules.mjs';
import {SHIP_CATALOG} from './modules/ships/ship-catalog.mjs';
export {selectedTracks} from './battle-pass.mjs';
export const loadProgress=readPerformanceProgress;
const IMAGE='/pod/worlds/achievements.jpg';
export const GROUP_NAMES=Object.fromEntries([...FOCUS_GROUPS.map(g=>[g.id,g.name]),['meditation','Meditation']]);
export const BOSSES=COACHES.map(c=>({...c,name:c.label,requirement:COACH_REQUIREMENTS.find(r=>r.id===c.id)||null}));
const difficultyName=d=>d[0].toUpperCase()+d.slice(1);
const groupName=g=>GROUP_NAMES[g]||g;
export function coachRequirements(id){
 const coach=BOSSES.find(c=>c.id===id);if(!coach)return null;
 const r=coach.requirement;if(!r){const starter=STARTER_COACH_IDS.includes(id);return {starter,unlock:starter?'Available from the start':'Requirement pending placement.',gold:'Select this coach and complete a 10-minute uninterrupted hold to earn its golden version.',exercises:[]};}
 if(r.groups.includes('meditation'))return {starter:false,unlock:`Complete meditation on ${CADENCE_MILESTONES.meditationDays[DIFFICULTIES.indexOf(r.difficulty)]} separate days.`,gold:'Once unlocked, select this coach and complete a 10-minute uninterrupted hold to earn its golden version.',exercises:[]};
 const exercises=Object.values(EXERCISES).filter(e=>r.groups.includes(e.group)&&exerciseDifficulty(e.id)===r.difficulty);
 const intro=Object.values(PATH_INTRO_COACH_IDS).includes(id)?`Choose ${r.groups.map(groupName).join(' / ')} as one of your two starting workout paths OR `:'';
 const kinds=[...new Set(exercises.map(e=>e.kind))],options=[];
 if(kinds.includes('hold'))options.push('hold for 5 uninterrupted minutes');
 if(kinds.includes('reps'))options.push('complete 15 reps in one working set');
 if(r.groups.includes('cardio'))options.push('complete 5 sprint rounds or 5 active minutes of gentle cardio');
 else if(kinds.some(k=>k==='pace'||k==='steps'))options.push('complete 5 active minutes');
 return {starter:false,difficulty:r.difficulty,groups:r.groups,unlock:`${intro}${difficultyName(r.difficulty)} · ${r.groups.map(groupName).join(' / ')}: ${options.join(' OR ')}.`,gold:kinds.includes('hold')?'Complete a 10-minute uninterrupted hold at this difficulty in one of these groups. Breaks and difficulty changes restart the uninterrupted attempt.':'Once unlocked, select this coach and complete a 10-minute uninterrupted hold to earn its golden version.',exercises:exercises.map(e=>e.name)};
}
export function bossStates(progress=readPerformanceProgress()){
 return BOSSES.map(b=>({...b,state:progress.coaches?.includes(b.id)?'done':'locked',golden:progress.goldenCoaches?.includes(b.id)===true,requirements:coachRequirements(b.id)}));
}
export function weaponRequirements(group){
 return {group,name:groupName(group),weapons:WEAPON_GROUPS[group]||[],blocks:DIFFICULTIES.map((difficulty,i)=>({difficulty,first:i*5+1,last:i*5+5})),hold:'1 uninterrupted minute: first tier in the difficulty block. 3 minutes: second tier. 5 minutes: coach clear; repeating it adds one tier. 10 minutes: finish the five-tier block and earn gold.',reps:'8 reps: first tier in the difficulty block. 12 reps: second tier. 15 reps: coach clear; repeating it adds one tier. One working set per muscle group per day.'};
}
export const shipRequirements=()=>SHIP_REQUIREMENTS.map(r=>({...r,name:SHIP_CATALOG.find(s=>s.id===r.id)?.name||r.id,unlock:`Expert ${groupName(r.group)}: ${r.kind==='hold'?'5 uninterrupted minutes':'15 reps in one working set'}.`}));
// Retained for decorative constellation consumers; roster ownership never uses zoom or defeats.
export function layerTransform(depth,{tx=0,ty=0,scale=1}={}){const f={far:.35,mid:.65,near:1.25}[depth]??1;return {tx:tx*f,ty:ty*f,scale:1+(scale-1)*f};}
// Original constellation art slots (boxes are [x,y,w,h] in % of the art). `track` is the catalog track whose coaches sit in the row; null rows take the pool.
export const ART_ROWS=[
 {id:'strider',track:'chest',color:'#b48cff',boxes:[[10.96,9.7,10.78,8.8],[28.4,8.05,7.89,10.45],[37.51,9.2,11.92,9.3],[51.62,8.05,11.48,10.45],[63.37,8.05,12.8,10.45],[78.18,7.9,15.43,10.6]]},
 {id:'ringer',track:'quads',color:'#ff8a2a',boxes:[[20.16,18.05,7.89,8.1],[31.11,17.95,10.69,8.4],[44.26,17.95,9.55,8.25],[57.06,17.95,9.03,8.3],[69.76,17.95,11.13,8.5]]},
 {id:'manyarm',track:'glutes',color:'#7dff5a',boxes:[[22.17,26.65,8.33,8.6],[34.18,26.45,9.73,8.8],[46.54,27.25,10.08,8],[57.49,27.4,7.54,7.85],[65.64,27.2,12.62,8.05]]},
 {id:'wedge',track:'arms',color:'#39a8ff',boxes:[[23.4,34.7,10.52,7.8],[35.06,34.7,8.15,7.45],[43.21,34.7,11.48,7.75],[55.04,34.7,9.82,7.75],[65.21,34.7,11.22,7.75]]},
 {id:'warden',track:null,color:'#39a8ff',boxes:[[45.57,41.95,8.24,5.7]]},
 {id:'blob',track:'yoga',color:'#c65cff',boxes:[[26.29,47.25,10.87,6.95],[38.56,47.1,9.55,7.2],[49.87,47.1,7.8,6.95],[60.74,47.3,9.55,7.45]]},
 {id:'cap',track:'martial-arts',color:'#ff4fa0',boxes:[[33.04,54.6,7.62,7.4],[40.93,54.55,11.13,7.45],[53.46,54.65,10.78,7.35]]},
 {id:'stalk',track:'cardio',color:'#ff4a3d',boxes:[[30.5,61.45,7.01,7.5],[38.21,61.45,8.15,7.25],[49.52,61.45,9.29,7.5],[58.55,61.45,8.59,7.5]]},
 {id:'tanka',track:'meditation',color:'#ffd23a',boxes:[[29.27,68.65,9.38,7.85],[39.09,68.65,9.64,7.8],[48.47,68.45,10.6,8],[59.95,68.5,8.33,8]]},
 {id:'lume',track:null,color:'#ffc94a',boxes:[[39.35,75.95,15.34,8.8]]},
];
export const ART_SLOTS=ART_ROWS.flatMap(row=>row.boxes.map((box,i)=>({id:`${row.id}-${i+1}`,row:row.id,color:row.color,box})));
// Coaches go to the slots of their catalog track (easy to expert); rows that run short and the shared rows draw from the pool
// (explicit starters first). Anything left over flows onto the next page, so every coach appears exactly once.
export function coachPages(coaches=BOSSES){
 const rank=id=>DIFFICULTIES.indexOf(COACH_REQUIREMENTS.find(r=>r.id===id)?.difficulty),queues=new Map(ART_ROWS.map(r=>[r.id,[]])),pool=[];
 for(const c of coaches){const track=COACH_REQUIREMENTS.find(r=>r.id===c.id)?.tracks?.[0],row=track&&ART_ROWS.find(r=>r.track===track);(row?queues.get(row.id):pool).push(c);}
 for(const q of queues.values())q.sort((a,b)=>rank(a.id)-rank(b.id));
 pool.sort((a,b)=>STARTER_COACH_IDS.includes(b.id)-STARTER_COACH_IDS.includes(a.id));
 const pages=[];
 while(pool.length||[...queues.values()].some(q=>q.length)){
  const page=ART_SLOTS.map(slot=>({slot,coach:queues.get(slot.row).shift()||pool.shift()||null}));
  // Keep preferred art rows, then use every spare target before adding a page.
  const overflow=[...pool.splice(0),...ART_ROWS.flatMap(row=>queues.get(row.id).splice(0))];
  for(const entry of page)if(!entry.coach)entry.coach=overflow.shift()||null;
  pool.push(...overflow);
  pages.push(page.filter(entry=>entry.coach));
 }
 return pages;
}
// All four ordered five-tier blocks are visible from each coach's zoom view.
export function weaponTierSteps(group,difficulty,owned=0){
 const index=DIFFICULTIES.indexOf(difficulty);if(index<0||!WEAPON_GROUPS[group])return [];
 const kinds=new Set(Object.values(EXERCISES).filter(e=>e.group===group).map(e=>e.kind));
 const pace=group==='boxing'||group==='cardio';
 const hasHold=kinds.has('hold'),hasReps=kinds.has('reps')||kinds.has('steps');
 const acts=[];
 if(hasHold)acts.push(['1 uninterrupted minute','3 uninterrupted minutes','5 uninterrupted minutes (coach clear)','Repeat a 5-minute hold','Repeat again, or hold 10 uninterrupted minutes']);
 if(hasReps)acts.push(['8 reps','12 reps','15 reps (coach clear)','Repeat 15 reps','Repeat 15 reps again']);
 if(pace)acts.push(group==='boxing'?['5 active minutes','Repeat 5 active minutes','Repeat 5 active minutes again','Repeat 5 active minutes again','Repeat 5 active minutes again']:['5 sprint rounds or 5 active minutes','Repeat a completed cardio set','Repeat a completed cardio set','Repeat a completed cardio set','Repeat a completed cardio set']);
 return Array.from({length:5},(_,i)=>({tier:index*5+i+1,text:acts.map(a=>a[i]).join(' · '),state:index*5+i+1<=owned?'done':index*5+i+1===owned+1?'next':'todo'}));
}
let dialog,stage,detail,artEl,bossesEl,layers,raf=0,t0=0,far,near,pages=[],page=0,selected=null;
const prefersReducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function line(label,text){const p=element('p');p.append(element('strong',`${label} `),document.createTextNode(text));return p;}
const rand=(a,b)=>a+Math.random()*(b-a);
const wrap=v=>v-Math.floor(v);
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
 stage=element('div',null,'ach-stage');
 artEl=element('img',null,'ach-art ach-parallax');artEl.src=IMAGE;artEl.alt='Coach constellation';artEl.draggable=false;
 const layer=(tag,depth)=>{const el=element(tag,null,'ach-stars ach-parallax');el.dataset.depth=el.dataset.peerDepth=depth;el.setAttribute('aria-hidden','true');return el;};
 layers={far:layer('canvas','far'),mid:layer('div','mid'),near:layer('canvas','near')};
 for(let i=0;i<40;i++){const dot=document.createElement('i');dot.style.cssText=`left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;--d:${(Math.random()*4).toFixed(2)}s`;layers.mid.append(dot);}
 bossesEl=element('div',null,'ach-bosses ach-parallax');
 stage.append(artEl,layers.far,layers.mid,bossesEl,layers.near);
 const head=element('header',null,'ach-head');head.append(element('h1','Achievements'),element('p',null,'ach-count'));
 detail=element('section',null,'ach-detail');detail.hidden=true;
 const starter=element('div',null,'ach-starter'),offer=element('button','Download the Starter pack');offer.type='button';starter.append(element('p','The constellation art comes with the Starter pack.'),offer);
 const close=element('button','✕','ach-close');close.type='button';close.setAttribute('aria-label','Close');
 const turn=(label,glyph,dir)=>{const b=element('button',glyph,`ach-page ach-page-${dir>0?'next':'prev'}`);b.type='button';b.setAttribute('aria-label',label);b.onclick=()=>{page=(page+dir+pages.length)%pages.length;paint();};return b;};
 dialog.append(stage,head,detail,starter,turn('Previous page of coaches','‹',-1),turn('Next page of coaches','›',1),close);
 document.body.append(dialog);
 // W2-2O: the constellation is Starter-pack art. Without it (offline, not downloaded) the coaches glow on the plain
 // starfield and the pack is offered (achievements-board.css .no-art).
 artEl.addEventListener('error',()=>dialog.classList.add('no-art'),{once:true});
 offer.onclick=()=>window.myr5Packs?.open('starter');
 far={canvas:layers.far,field:makeFar()};near={canvas:layers.near,field:makeNear()};t0=performance.now();
 close.onclick=()=>dialog.close();
 stage.addEventListener('click',e=>{if(dialog.classList.contains('zoomed')&&!e.target.closest('.ach-boss'))unzoom();});
 // Escape peels off the zoom first; a second Escape closes.
 dialog.addEventListener('cancel',e=>{if(dialog.classList.contains('zoomed')){e.preventDefault();unzoom();}});
 dialog.addEventListener('close',()=>{unzoom();stopLoop();});
 new ResizeObserver(()=>{if(dialog.open&&!document.hidden){fitLayers();draw(performance.now()-t0);}}).observe(stage);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLoop();});
 addEventListener('pagehide',stopLoop);
 for(const type of ['myr5:performance-progress','myr5:account-ready','myr5:account-cleared'])addEventListener(type,()=>{if(dialog.open&&!dialog.classList.contains('zoomed'))paint();});
}
function paint(){
 const state=loadProgress(),byId=new Map(bossStates(state).map(b=>[b.id,b]));
 pages=coachPages();page=Math.min(page,Math.max(0,pages.length-1));
 bossesEl.replaceChildren();
 dialog.querySelector('.ach-count').textContent=`${state.coaches.length} / ${BOSSES.length} coaches · ${state.goldenCoaches.length} golden${pages.length>1?` · page ${page+1} / ${pages.length}`:''}`;
 for(const btn of dialog.querySelectorAll('.ach-page'))btn.hidden=pages.length<2;
 for(const {slot,coach} of pages[page]||[]){
  const b=byId.get(coach.id),[x,y,w,h]=slot.box,btn=element('button',null,'ach-boss');btn.type='button';btn.dataset.state=b.state;btn.dataset.id=b.id;btn.dataset.golden=String(b.golden);
  btn.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%;--bx:${x};--by:${y};--bw:${w};--bh:${h};--glow:${slot.color};--d:${(x*7%3).toFixed(2)}s`;
  btn.setAttribute('aria-label',`${b.name}, ${b.golden?'unlocked, golden':b.state==='done'?'unlocked':'locked, tap to see requirements'}`);
  btn.append(element('span',b.name,'ach-name'));
  btn.onclick=()=>zoom(b,slot,btn);
  bossesEl.append(btn);
 }
}
function milestoneBlock(group,difficulty,weapons){
 const wrap=element('section',null,'ach-weapons'),rules=weaponRequirements(group);
 wrap.append(element('h3',`${groupName(group)} weapon progression`));
 for(const weapon of rules.weapons){
  const owned=weapons[weapon]??0,item=element('div',null,'ach-weapon');
  item.append(element('h4',`${weapon[0].toUpperCase()}${weapon.slice(1)} · tier ${owned} / 20`));
  for(const block of rules.blocks){
   const band=element('section',null,'ach-tier-block'),list=element('ol');band.dataset.current=String(block.difficulty===difficulty);
   band.append(element('h5',`${difficultyName(block.difficulty)} · tiers ${block.first}–${block.last}${block.difficulty===difficulty?' · this coach':''}`));
   for(const step of weaponTierSteps(group,block.difficulty,owned)){
    const li=element('li');li.dataset.step=step.state;
    li.append(element('b',`Tier ${step.tier}`),element('span',`${step.text} · ${step.state==='done'?'earned':'locked'}`));list.append(li);
   }
   band.append(list);item.append(band);
  }
  wrap.append(item);
 }
 return wrap;
}
function fillDetail(b,state){
 const r=b.requirements;detail.replaceChildren(element('h2',b.name),element('hr'),element('p',b.golden?'Unlocked · Golden':b.state==='done'?'Unlocked':'Locked','ach-status'),line('Unlock',r.unlock),line('Golden',r.gold));
 if(r.exercises.length){const ul=element('ul');for(const name of r.exercises)ul.append(element('li',name));detail.append(element('h3','Exercises'),ul);}
 if(r.difficulty)for(const group of r.groups)if(WEAPON_GROUPS[group])detail.append(milestoneBlock(group,r.difficulty,state.weapons));
 const back=element('button','Back','ach-back');back.type='button';back.onclick=unzoom;detail.append(back);
}
function zoom(b,slot,btn){
 stage.querySelector('.ach-boss.selected')?.classList.remove('selected');btn.classList.add('selected');selected=btn;
 const r=stage.getBoundingClientRect(),[x,y,w,h]=slot.box;
 const cx=r.width*(x+w/2)/100,cy=r.height*(y+h/2)/100,scale=Math.min(4,Math.max(2,r.height*.26/(r.height*h/100)));
 const tx=r.width/2-cx,ty=r.height*.3-cy;
 // Art + boss tap targets keep today's transform exactly, unscaled by depth, so nothing shifts under a finger.
 for(const el of [artEl,bossesEl]){el.style.transformOrigin=`${cx}px ${cy}px`;el.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;}
 for(const depth of ['far','mid','near']){
  const t=layerTransform(depth,{tx,ty,scale}),el=layers[depth];
  el.style.transformOrigin=`${cx}px ${cy}px`;el.style.transform=`translate(${t.tx}px,${t.ty}px) scale(${t.scale})`;
 }
 dialog.classList.add('zoomed');
 detail.style.setProperty('--glow',slot.color);
 fillDetail(b,loadProgress());
 detail.hidden=false;detail.scrollTop=0;detail.querySelector('.ach-back').focus({preventScroll:true});
}
function unzoom(){
 for(const el of [artEl,bossesEl,layers?.far,layers?.mid,layers?.near])if(el)el.style.transform='';
 const wasZoomed=dialog.classList.contains('zoomed');
 dialog.classList.remove('zoomed');detail.hidden=true;stage.querySelector('.ach-boss.selected')?.classList.remove('selected');
 if(wasZoomed&&dialog.open&&selected?.isConnected)selected.focus({preventScroll:true});
 selected=null;
}
// Only an explicit open starts the loop; close, a hidden tab and pagehide stop it.
export function openAchievements(){
 if(!dialog)build();
 paint();
 if(!dialog.open)dialog.showModal();
 fitLayers();draw(performance.now()-t0);startLoop();
 return dialog;
}
