import {COSMETIC_LEVEL_XP,cosmeticLevel,coachXpMultiplier} from './progression-rules.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
import {COACH_REQUIREMENTS,STARTER_COACH_IDS} from './performance-catalog.mjs';
import {syncBattlePass} from './battle-pass.mjs';
import {coachRequirements,coachPages} from './achievements-board.mjs';
import {CHAPTER_COUNT,chapterForLevel,chapterLevels,chapterWorld,chapterCoach} from './level-map-domain.mjs';
import {mountLevelMapScene} from './level-map-scene.mjs';

const node=(tag,value,className)=>{const el=document.createElement(tag);if(value!=null)el.textContent=value;if(className)el.className=className;return el;};
const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const format=x=>Math.floor(x).toLocaleString();
const validShips=new Set(['supportive','direct','analytical','playful','calm','mom']);
const artBoxes=new Map(coachPages().flat().map(({coach,slot})=>[coach.id,slot.box]));
function selectedShip(){
 try{
  const owner=globalThis.myr5AuthenticatedAccount?.user?.id;
  const custom=JSON.parse(localStorage.getItem(`myr5-ship-customization-v1/${owner}`)||'{}');
  const recipe=JSON.parse(localStorage.getItem('myr5-recipe-v1')||'{}');
  const choice=custom.ship||recipe.shipId||recipe.coach;
  return validShips.has(choice)?choice:'supportive';
 }catch{return 'supportive';}
}
function artFor(coach){
 const box=artBoxes.get(coach?.id);if(!box)return null;
 const [left,top,width,height]=box,frame=node('div',null,'pass-coach-art');
 frame.style.aspectRatio=`${1141*width}/${2000*height}`;
 const image=node('img');image.src='/pod/worlds/achievements.jpg';image.alt='';
 image.loading='lazy';image.decoding='async';
 image.style.width=`${10000/width}%`;image.style.height=`${10000/height}%`;
 image.style.left=`-${left/width*100}%`;image.style.top=`-${top/height*100}%`;
 frame.append(image);frame.setAttribute('aria-hidden','true');return frame;
}
export function mountBattlePass(){
 if(document.getElementById('battlePassPanel'))return;
 const entry=document.getElementById('battlePassOpen');
 const previewRack=node('div',null,'pass-crt-rack');
 const previewPrev=node('button','◀','pass-crt-switch'),previewNext=node('button','▶','pass-crt-switch');
 for(const [button,label] of [[previewPrev,'Previous ten-level area'],[previewNext,'Next ten-level area']]){
  button.type='button';button.setAttribute('aria-label',label);
 }
 if(entry){entry.before(previewRack);previewRack.append(previewPrev,entry,previewNext);}
 const dialog=node('dialog',null,'launch-panel battle-pass-page');dialog.id='battlePassPanel';dialog.setAttribute('aria-labelledby','battlePassTitle');
 const header=node('header',null,'pass-header'),heading=node('h2','COSMOS / XP FLIGHT');heading.id='battlePassTitle';
 const close=node('button','CLOSE','pass-close');close.type='button';close.onclick=()=>dialog.close();header.append(heading,close);
 const daily=node('section',null,'pass-daily'),summary=node('section',null,'pass-summary');
 const shell=node('section',null,'pass-map-shell');shell.setAttribute('aria-label','Continuous cosmetic reward flight map');
 const viewport=node('div',null,'pass-map-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','All 250 levels, from level 1 at the bottom to level 250 at the top. Scroll to inspect.');
 const route=node('div',null,'pass-route');viewport.append(route);
 const canvas=node('canvas',null,'pass-scene');canvas.setAttribute('aria-hidden','true');
 const fire=node('button','FIRE ◈','pass-fire');fire.type='button';fire.setAttribute('aria-label','Fire decorative laser at asteroids');
 shell.append(viewport,canvas,fire);
 dialog.append(header,daily,summary,shell);document.body.append(dialog);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const scene=mountLevelMapScene(canvas,{ship:selectedShip(),reducedMotion:reduced.matches});
 let previewChapter=0,rank=null,performance=null,hasPreviewSelection=false,renderedLevel=0;
 const previewFocus=()=>hasPreviewSelection?previewChapter:chapterForLevel(rank.level);
 function renderPreview(){
  if(!entry||!rank)return;
  const world=chapterWorld(previewChapter),levels=chapterLevels(previewChapter,COSMETIC_LEVEL_XP);
  const current=previewChapter===chapterForLevel(rank.level);
  const line1=`SYSTEM ${String(previewChapter+1).padStart(2,'0')} / 25 · ${world.name.toUpperCase()}`;
  const line2=current?(rank.max?'LEVEL 250 COMPLETE':`LV ${rank.level} · ${Math.ceil(rank.next-rank.xp).toLocaleString()} XP TO NEXT`):`LEVELS ${levels[0].level}–${levels.at(-1).level} · ${format(levels[0].xp)}–${format(levels.at(-1).xp)} XP`;
  const line3='10 COSMETIC PACKS · RARE + LEGENDARY';
  entry.classList.add('pass-crt-entry');
  const meter=node('span',null,'pass-entry-meter');meter.setAttribute('aria-hidden','true');meter.style.setProperty('--pass-fill',`${current?(rank.max?100:Math.max(0,Math.min(100,rank.into/rank.need*100))):0}%`);
  entry.replaceChildren(node('strong',line1),node('small',line2),node('small',line3),meter);
  entry.setAttribute('aria-label',`Open full 250-level XP flight map at ${world.name}, levels ${levels[0].level} through ${levels.at(-1).level}`);
  previewPrev.disabled=previewChapter===0;previewNext.disabled=previewChapter===CHAPTER_COUNT-1;
 }
 function renderDaily(p){
  const day=p.days?.[localDay()]||{};
  const workout=Number(day.workoutXp??day.baseXp??0)>0||!!day.workout,meditation=!!day.meditation,food=!!day.food;
  const quests=node('div',null,'pass-quests');
  for(const [label,complete] of [['Workout',workout],['Meditation ×2',meditation],['Food',food]]){
   const item=node('span',`${complete?'✓':'○'} ${label}`);item.dataset.complete=String(complete);quests.append(item);
  }
  const coaches=p.coaches.filter(id=>!STARTER_COACH_IDS.includes(id)).length;
  daily.replaceChildren(node('h3','TODAY / DAILY QUESTS'),quests,node('strong',workout&&meditation&&food?'✓ +500 XP EARNED':'ALL THREE +500 XP'),node('small',`Meditation doubles workout XP · coach multiplier ×${coachXpMultiplier(coaches)}`));
 }
 function renderSummary(){
  const progress=node('progress');progress.max=rank.max?1:rank.need;progress.value=rank.max?1:rank.into;progress.setAttribute('aria-label','Progress to next cosmetic level');
  summary.replaceChildren(node('strong',`LV ${rank.level} / 250`),node('span',`${format(rank.xp)} TOTAL XP`),progress,node('b',rank.max?'ALL LEVELS REACHED':`${Math.ceil(rank.next-rank.xp).toLocaleString()} XP → LV ${rank.level+1}`));
 }
 function buildArea(chapter){
  const world=chapterWorld(chapter),levels=chapterLevels(chapter,COSMETIC_LEVEL_XP),coach=chapterCoach(chapter,COACH_REQUIREMENTS);
  const area=node('section',null,'pass-area');area.dataset.chapter=String(chapter);area.dataset.future=String(chapter>chapterForLevel(rank.level));
  area.style.setProperty('--world-intensity',world.intensity);area.style.setProperty('--world-hue',`${205+chapter*12}deg`);
  area.setAttribute('aria-label',`System ${chapter+1}: ${world.name}, levels ${levels[0].level} through ${levels.at(-1).level}`);
  const sky=node('div',null,'pass-sky'),planet=node('div',null,'pass-planet');
  sky.setAttribute('data-peer-depth','far');planet.setAttribute('data-peer-depth','mid');sky.setAttribute('aria-hidden','true');planet.setAttribute('aria-hidden','true');
  area.append(sky,planet);
  const title=node('div',null,'pass-world-title');
  title.append(node('small',`SYSTEM ${String(chapter+1).padStart(2,'0')} / 25 · LEVELS ${levels[0].level}–${levels.at(-1).level}`),node('b',world.name),node('span',world.body));
  area.append(title);
  const constellation=node('aside',null,'pass-constellation');constellation.setAttribute('data-peer-depth','mid');
  if(coach){
   const art=artFor(coach);if(art)constellation.append(art);
   const caption=node('div',null,'pass-coach-caption');
   const requirement=coachRequirements(coach.id);
   caption.append(node('span','COACH CONSTELLATION'),node('strong',coach.name),node('small',performance?.coaches.includes(coach.id)?'PERFORMANCE UNLOCKED':'PERFORMANCE MILESTONE'),node('p',requirement?.unlock||'Earn through a workout milestone.'));
   constellation.append(caption);
  }
  area.append(constellation);
  const track=node('ol',null,'pass-levels');track.setAttribute('aria-label',`Cosmetic rewards in system ${chapter+1}, highest level first`);
  for(const item of [...levels].reverse()){
   const row=node('li',null,'pass-level');row.dataset.level=String(item.level);row.dataset.state=item.level<rank.level?'earned':item.level===rank.level?'current':'locked';
   if(item.level===rank.level)row.setAttribute('aria-current','step');
   const body=node('div',null,'pass-level-body');
   body.append(node('strong',item.level===1?'Starter cosmetics':`${item.tier} cosmetic pack`),node('span',item.level===1?'Your launch kit':`${format(item.xp)} XP threshold`));
   if(item.level===rank.level)body.append(node('small',rank.max?'Final level reached':`${Math.ceil(rank.next-rank.xp).toLocaleString()} XP to next unlock`));
   row.append(node('b',String(item.level),'pass-level-number'),body,node('i','✦'));track.append(row);
  }
  area.append(track);
  if(chapter===chapterForLevel(rank.level)){
   const fog=node('div',null,'pass-current-fog');fog.setAttribute('aria-hidden','true');area.append(fog);
   requestAnimationFrame(()=>{if(!area.isConnected)return;const current=track.querySelector('[aria-current="step"]');if(current)fog.style.height=`${track.offsetTop+current.offsetTop+current.offsetHeight/2}px`;});
  }
  return area;
 }
 function buildMap(){
  const fragment=document.createDocumentFragment();
  for(let chapter=CHAPTER_COUNT-1;chapter>=0;chapter--)fragment.append(buildArea(chapter));
  route.replaceChildren(fragment);renderedLevel=rank.level;
 }
 function centerOn(target){
  if(!target)return;
  requestAnimationFrame(()=>{
   if(!dialog.open)return;
   const v=viewport.getBoundingClientRect(),t=target.getBoundingClientRect();
   viewport.scrollTop+=t.top-v.top-(viewport.clientHeight-t.height)/2;
  });
 }
 function render({resetPreview=false}={}){
  const p=readPerformanceProgress();performance=p;rank=cosmeticLevel(p.totalXp);
  if(resetPreview||!hasPreviewSelection)previewChapter=chapterForLevel(rank.level);
  renderPreview();renderDaily(p);renderSummary();scene.setShip(selectedShip());
  if(dialog.open&&renderedLevel!==rank.level){
   const oldScroll=viewport.scrollTop;buildMap();viewport.scrollTop=oldScroll;
  }
 }
 previewPrev.onclick=()=>{hasPreviewSelection=true;previewChapter=Math.max(0,previewChapter-1);renderPreview();};
 previewNext.onclick=()=>{hasPreviewSelection=true;previewChapter=Math.min(CHAPTER_COUNT-1,previewChapter+1);renderPreview();};
 fire.onclick=()=>scene.fire();
 shell.addEventListener('pointermove',e=>scene.aim(e.clientX,e.clientY));
 dialog.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.target.closest('button,input,textarea,select')){e.preventDefault();scene.fire();}});
 dialog.addEventListener('close',()=>scene.stop());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)scene.stop();else if(dialog.open)scene.start();});
 window.addEventListener('resize',()=>{if(dialog.open)scene.resize();});
 const open=()=>{
  syncBattlePass();render();
  if(!dialog.open)dialog.showModal();
  buildMap();
  const targetChapter=previewFocus();
  const target=targetChapter===chapterForLevel(rank.level)?route.querySelector('[aria-current="step"]'):route.querySelector(`[data-chapter="${targetChapter}"] [data-level="${targetChapter*10+8}"]`);
  centerOn(target);scene.start();hasPreviewSelection=false;return dialog;
 };
 window.myr5Menus={...window.myr5Menus,battlePass:open};
 entry?.addEventListener('click',()=>window.myr5Routes?.go?window.myr5Routes.go('battlepass'):open());
 window.addEventListener('myr5:performance-progress',()=>{syncBattlePass();render();});
 window.addEventListener('myr5:account-ready',()=>render());
 window.addEventListener('storage',()=>render());
 render();
}
