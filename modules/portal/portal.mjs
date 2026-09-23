// Portal home board: the quilt cloth board replaces the app home menu. Tracing one of the eight
// stitched shapes cuts that shape out of the 3D board — the piece falls in, neon liquid glass glows
// through the hole behind it for a short interactive loading phase — then opens the shape's menu.
// AGPL-3.0-or-later.
import {createQuiltBoard} from './portal-board.mjs';
import {recognizeShape,SHAPES} from './portal-shapes.mjs';

// Portal sequence timings (ms): the cut piece falling in, the minimum live-glass loading phase, the
// dialog porthole reveal, the healed board fading back in, one touch ripple on the glass.
const PORTAL={cutMs:1100,loadMinMs:2000,revealMs:900,healMs:400,rippleMs:900};

// Board catalogue: add one line per wave-2 board here.
export const PRODUCTION_PORTALS=Object.freeze(['quilt']);
const BOARDS={quilt:{label:'Quilt',create:host=>createQuiltBoard(host)}};
const BOARD_KEY='myr5.portalBoard';
// Sandboxed frames and private-mode Safari throw on localStorage access; never let that kill mountPortal.
const store={get(){return 'quilt'},set(){}};
function initialBoardId(){
 const p=new URLSearchParams(location.search).get('board');if(p&&BOARDS[p])return p;
 const stored=store.get(BOARD_KEY);if(stored&&BOARDS[stored])return stored;
 return 'quilt';
}

// placeholder until Ian's Tripo models arrive — simple inline-SVG icons on a glowing disc (the X/cross "all menus" fall-in)
const ICONS={
 dumbbell:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="6" y="18" width="8" height="12" rx="2"/><rect x="34" y="18" width="8" height="12" rx="2"/><path d="M14 24h20"/></svg>',
 lotus:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M24 40c-10-4-14-12-14-18 6 2 11 6 14 12 3-6 8-10 14-12 0 6-4 14-14 18z"/><path d="M24 40c-5-8-5-16 0-24 5 8 5 16 0 24z"/></svg>',
 brush:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="12" r="6"/><path d="M30 8l10 10-14 14-10-4 4-10z"/><path d="M16 28l-6 12 12-6"/></svg>',
 bowl:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8 22a16 8 0 0 0 32 0z"/><path d="M8 22h32"/><path d="M20 8c0 3-2 3-2 6M28 8c0 3 2 3 2 6"/></svg>',
 trophy:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M16 8h16v10a8 8 0 0 1-16 0z"/><path d="M16 10H8v4a8 8 0 0 0 8 8M32 10h8v4a8 8 0 0 1-8 8"/><path d="M24 26v8M17 40h14M20 34h8v6h-8z"/></svg>',
 rocket:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4c7 6 9 15 6 26H18C15 19 17 10 24 4z"/><circle cx="24" cy="17" r="3.5"/><path d="M18 30l-6 6 7 1M30 30l6 6-7 1M21 38l3 6 3-6"/></svg>',
 joystick:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="24" cy="14" r="6"/><path d="M24 20v10"/><rect x="10" y="30" width="28" height="10" rx="3"/></svg>',
 star:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M24 6l5.2 11.4L41 19l-9 8.3 2.4 12.2L24 33.4 13.6 39.5 16 27.3 7 19l11.8-1.6z"/></svg>',
 bell:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c-6 0-9 5-9 12v6l-4 8h26l-4-8v-6c0-7-3-12-9-12z"/><path d="M19 38a5 5 0 0 0 10 0"/></svg>',
 gear:'<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="7"/><path d="M24 4v6M24 38v6M44 24h-6M10 24H4M37.6 10.4l-4.2 4.2M14.6 33.4l-4.2 4.2M37.6 37.6l-4.2-4.2M14.6 14.6l-4.2-4.2"/></svg>',
};

// Shape -> menu. Ian's gesture map (2026-09-22): rect/oval are camera/nav-free ("home") destinations —
// hide the portal, then trigger the pod's own control; up/down/diamonds/lines/x open a dialog or navigate.
// Neon colours: Ian picked the six most popular neons (2026-09-22) — orange, purple, pink, green, yellow,
// electric blue — reused freely across destinations; #ff4fa0 is the dedicated Achievements pink.
// `hidden:true` keeps an id routable (gesture lookup, MENUS[id]) without adding a duplicate row to the
// Menu sheet grid — used for the second diamond (same destination as the first) and line-up (opens the
// sheet itself, so it can't also be a row in it).
const LEADERBOARD={label:'Leaderboard',color:'#ffff33',icon:ICONS.trophy,kind:'dialog',open(){document.querySelector('.coach-dock [data-panel="account"]')?.click();return document.getElementById('accountPanel');}};
// Exported so tests can check the gesture -> destination table without a DOM.
export const MENUS={
 rect:{label:'Workout',color:'#ff5f1f',icon:ICONS.dumbbell,kind:'home',open(){document.getElementById('start')?.click();}},
 oval:{label:'Choose Workout',color:'#1f51ff',icon:ICONS.dumbbell,kind:'home',open(){document.getElementById('controls')?.scrollIntoView({behavior:prefersReducedMotion()?'auto':'smooth',block:'center'});}},
 up:{label:'Food',color:'#39ff14',icon:ICONS.bowl,kind:'dialog',open(){document.querySelector('.coach-dock [data-panel="meals"]')?.click();return document.getElementById('mealsPanel');}},
 down:{label:'Achievements',color:'#ff4fa0',icon:ICONS.star,kind:'dialog',open:()=>window.myr5Menus?.achievements?.()},
 vdiamond:LEADERBOARD,
 hdiamond:{...LEADERBOARD,hidden:true},
 x:{label:'Character Editor',color:'#ff10f0',icon:ICONS.brush,kind:'nav',open:()=>location.assign('/creature/index.html')},
 'line-lr':{label:'Meditation',color:'#b026ff',icon:ICONS.lotus,kind:'dialog',open(){document.querySelector('.meditation-entry')?.click();return document.querySelector('.meditation-panel');}},
 'line-rl':{label:'Reminders',color:'#ff10f0',icon:ICONS.bell,kind:'dialog',open(){document.querySelector('.coach-dock [data-panel="reminders"]')?.click();return document.getElementById('remindersPanel');}},
 'line-down':{label:'Settings',color:'#39ff14',icon:ICONS.gear,kind:'dialog',open(){document.getElementById('openSettings')?.click();return document.getElementById('settings');}},
 // Share QR isn't built: trace it and get today's Menu sheet instead.
 'line-up':{label:'Share QR',color:'#ffffff',icon:ICONS.star,kind:'menu',hidden:true},
 // Full-screen ship view (Ian 2026-09-22: the coach capsule view, full screen, with the ship and pixel planet). Menu sheet only.
 ship:{label:'Ship',color:'#b026ff',icon:ICONS.rocket,kind:'dialog',open:()=>window.myr5Menus?.ship?.()},
 // War Room/Arcade has no gesture: Menu sheet only, same lock as before.
 warroom:{label:'Arcade / War Room',color:'#1f51ff',icon:ICONS.joystick,kind:'nav',locked:()=>window.myr5VerifiedOptionalAccess!==true,lockedMessage:'Finish Coach setup to unlock the War Room.',open:()=>location.assign('/war-room/index.html')},
};

// The locked intake theme disables transitions with !important; inline !important keeps the portal moving.
const motion=(el,value)=>value?el.style.setProperty('transition',prefersReducedMotion()?'none':value,'important'):el.style.removeProperty('transition');
const prefersReducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const raf=()=>new Promise(r=>requestAnimationFrame(r));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Lets a just-opened dialog's layout settle before we measure it. Races two frames against a plain
// timeout so a backgrounded tab (rAF paused) can't stall the whole reveal indefinitely.
const settle=()=>Promise.race([raf().then(raf),new Promise(r=>setTimeout(r,50))]);
const toClientPts=(pts,rect)=>pts.map(([x,y])=>[rect.left+x*rect.width,rect.top+y*rect.height]);
const closeLoop=pts=>{const a=pts[0],b=pts.at(-1);return(a[0]===b[0]&&a[1]===b[1])?pts:[...pts,a];};
const rectBox=el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height};};
function centroidOf(closedPts){const n=closedPts.length-1;let sx=0,sy=0;for(let i=0;i<n;i++){sx+=closedPts[i][0];sy+=closedPts[i][1];}return[sx/n,sy/n];}
function shapeOutlinePts(id){
 const pts=SHAPES[id][0].points;
 if(id!=='oval')return pts;
 // oval template is 200 points; ~48 is plenty for a smooth clip-path and keeps the string short.
 const step=Math.max(1,Math.floor(pts.length/48));
 return pts.filter((_,i)=>i%step===0);
}
const shapeClipPts=(id,rect)=>closeLoop(toClientPts(shapeOutlinePts(id),rect));
// The glass clip bleeds GLASS_BLEED px past the shape (clamped to the board face): triangles are cut by centroid, so the
// hole's edge is jagged and would otherwise show bare background in the notches beyond the exact outline.
const GLASS_BLEED=18;
function bleedPts(pts){
 const c=centroidOf(pts),f=board?.faceRect(),clamp=(v,lo,len)=>f?Math.min(Math.max(v,lo),lo+len):v;
 return pts.map(([x,y])=>{const k=1+GLASS_BLEED/(Math.hypot(x-c[0],y-c[1])||1);return [clamp(c[0]+(x-c[0])*k,f?.left,f?.width),clamp(c[1]+(y-c[1])*k,f?.top,f?.height)];});
}

// Scales the shape polygon about its own centroid before cutting the hole; ponytail: a large fixed
// multiplier rather than measuring the exact box coverage needed — plenty for a phone/tablet screen,
// revisit with a measured scale if a very large display ever hosts this board.
const GROW=40;
function buildHoleClip(pts,box,scale){
 const c=centroidOf(pts),scaled=scale===1?pts:pts.map(([x,y])=>[c[0]+(x-c[0])*scale,c[1]+(y-c[1])*scale]);
 const outer=[[0,0],[box.width,0],[box.width,box.height],[0,box.height],[0,0]];
 return `polygon(evenodd, ${[...outer,...scaled,[0,0]].map(([x,y])=>`${x}px ${y}px`).join(',')})`;
}
function growHole(el,pts,box,current=()=>true){
 return new Promise(resolve=>{
  motion(el,'none');el.style.clipPath=buildHoleClip(pts,box,1);
  if(prefersReducedMotion()){el.style.clipPath=buildHoleClip(pts,box,GROW);resolve();return;}
  settle().then(()=>{
   if(!current()){resolve();return;}
   motion(el,'clip-path .6s cubic-bezier(.2,0,.4,1)');
   el.style.clipPath=buildHoleClip(pts,box,GROW);
   setTimeout(resolve,600);
  });
 });
}
// A dialog is the opposite of the "home" hole: it's the thing being revealed, so it's clipped down to
// only the shape (a porthole) and grown until the shape covers the whole dialog, then the clip is cleared.
function buildPortholeClip(pts,scale){
 const c=centroidOf(pts),scaled=scale===1?pts:pts.map(([x,y])=>[c[0]+(x-c[0])*scale,c[1]+(y-c[1])*scale]);
 return `polygon(${scaled.map(([x,y])=>`${x}px ${y}px`).join(',')})`;
}
function growPorthole(el,pts,current=()=>true){
 return new Promise(resolve=>{
  motion(el,'none');el.style.clipPath=buildPortholeClip(pts,1);
  if(prefersReducedMotion()){el.style.clipPath='';resolve();return;}
  settle().then(()=>{
   if(!current()){resolve();return;}
   motion(el,`clip-path ${PORTAL.revealMs}ms cubic-bezier(.2,0,.1,1)`);
   el.style.clipPath=buildPortholeClip(pts,GROW);
   setTimeout(()=>{if(current()){el.style.clipPath='';motion(el,'');}resolve();},PORTAL.revealMs);
  });
 });
}

let portalHome,boardHost,overlay,ctx,objectsLayer,statusEl,menuBtn,menuSheet,boardBtn,overlayObserver,lifecycle,caustic;
let sequence=0,visibilityRun=0,boardLoad=0,menuChosen=false,focusBefore=null;
const backgroundInert=new Map(),flashes=new Set();
let board=null,boardFailed=false,boardShown=false,boardId='quilt';
let pointers=new Map(),pendingStrokes=[],finalizeTimer=0,outlineFlash=null,rafId=0;
// busy: a portal sequence is running (traces ignored, touches ripple the glass); phase: the live glass {glass,pts,color,t0,pulse}.
let busy=false,phase=null;

function menuButtonsHtml(){return Object.entries(MENUS).filter(([,m])=>!m.hidden).map(([id,m])=>`<button type="button" data-menu="${id}"><i aria-hidden="true" style="--dot:${m.color}"></i>${m.label}</button>`).join('');}
function boardChipsHtml(){return '<span class="portal-board-label">Quilt portal</span>';}
function updateBoardChips(){menuSheet?.querySelectorAll('[data-board]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.board===boardId)));}
// Swaps the mounted board: pauses/disposes the old one, creates the new one, falls back to the
// quilt (then the no-board menu sheet) on failure. Pointer listeners read the `board` variable at
// call time, so nothing needs re-wiring here.
async function loadBoard(id){
 if(!BOARDS[id])id='quilt';
 const load=++boardLoad;
 status(`Loading ${BOARDS[id].label} board…`);
 clearTimeout(finalizeTimer);pendingStrokes=[];
 pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();
 board?.pause();board?.dispose();board=null;boardFailed=false;
 try{const created=await BOARDS[id].create(boardHost);if(load!==boardLoad){created.dispose();return null;}board=created;}
 catch(error){
  console.warn(`${BOARDS[id].label} board unavailable, falling back.`,error);
  if(id!=='quilt'){
   try{board=await BOARDS.quilt.create(boardHost);id='quilt';}
   catch(error2){boardFailed=true;console.warn('Quilt board unavailable, falling back to the menu sheet.',error2);}
  }else boardFailed=true;
 }
 if(load!==boardLoad)return null;
 if(!boardShown)board?.pause();
 portalHome.classList.toggle('no-board',boardFailed);
 portalHome.style.background=board?.background||''; // the canvases are transparent; the board colour lives here, behind the glass
 status('');boardId=id;store.set(BOARD_KEY,id);updateBoardChips();
 return board;
}

function buildDom(){
 portalHome=document.createElement('div');portalHome.id='portalHome';
 portalHome.hidden=true;portalHome.setAttribute('role','dialog');portalHome.setAttribute('aria-label','Quilt portal');portalHome.setAttribute('aria-modal','true');
 portalHome.innerHTML=`
  <div id="portalShadows" aria-hidden="true"><i></i><i></i><i></i></div>
  <div id="portalBoardHost"></div>
  <canvas id="portalOverlay" aria-hidden="true"></canvas>
  <div id="portalObjects" aria-hidden="true"></div>
  <p id="portalStatus" role="status"></p>
  <button id="portalMenuButton" type="button">Menu</button><button id="portalExitButton" type="button">Back to Coach</button>`;
 document.body.append(portalHome);
 boardHost=portalHome.querySelector('#portalBoardHost');
 overlay=portalHome.querySelector('#portalOverlay');ctx=overlay.getContext('2d');
 objectsLayer=portalHome.querySelector('#portalObjects');
 statusEl=portalHome.querySelector('#portalStatus');
 menuBtn=portalHome.querySelector('#portalMenuButton');
 portalHome.querySelector('#portalExitButton').onclick=()=>setVisible(false);
 portalHome.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setVisible(false);}else if(e.key==='Tab'){const buttons=[menuBtn,portalHome.querySelector('#portalExitButton')],index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
 boardBtn=document.getElementById('openBoard');
 // Animated caustic filter for the liquid-glass surface, kept outside portalHome so it's never
 // affected by portalHome being hidden.
 document.body.insertAdjacentHTML('beforeend','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="portalCaustic" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="noise"><animate attributeName="baseFrequency" values="0.010 0.016;0.018 0.010;0.010 0.016" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="22"/></filter></defs></svg>');
 caustic=document.getElementById('portalCaustic').closest('svg');if(prefersReducedMotion())caustic.querySelector('animate')?.remove();
 // The fallback menu sheet lives outside portalHome too: a dialog nested in a hidden ancestor
 // would be hidden along with it while open (e.g. mid-fade during the "all" portal reveal).
 menuSheet=document.createElement('dialog');menuSheet.id='portalMenu';menuSheet.className='portal-menu';menuSheet.setAttribute('aria-labelledby','portalMenuTitle');
 menuSheet.innerHTML=`<header><h2 id="portalMenuTitle">Menu</h2><button type="button" data-close>Close</button></header><div class="portal-menu-grid">${menuButtonsHtml()}</div><div class="portal-board-chips" role="group" aria-label="Board"><span class="portal-board-label">Board</span>${boardChipsHtml()}</div><p id="portalMenuStatus" role="status"></p>`;
 document.body.append(menuSheet);
 menuSheet.querySelector('[data-close]').onclick=()=>menuSheet.close();
 menuSheet.querySelectorAll('[data-menu]').forEach(btn=>btn.onclick=()=>{
  const menu=MENUS[btn.dataset.menu];
  if(menu.locked?.()){menuSheet.querySelector('#portalMenuStatus').textContent=menu.lockedMessage;return;}
  menuSheet.querySelector('#portalMenuStatus').textContent='';menuChosen=true;menuSheet.close();setVisible(false);menu.open?.();
 });
 menuSheet.querySelectorAll('[data-board]').forEach(btn=>btn.onclick=()=>{menuSheet.close();loadBoard(btn.dataset.board);});
}

function backgroundBlocked(block){
 if(block){for(const el of document.body.children)if(el!==portalHome&&el!==menuSheet&&!backgroundInert.has(el)){backgroundInert.set(el,el.inert);el.inert=true;}}
 else{for(const [el,inert]of backgroundInert)el.inert=inert;backgroundInert.clear();}
}
function openMenu(){
 setVisible(false);menuChosen=false;menuSheet.showModal();
 menuSheet.addEventListener('close',()=>{if(!menuChosen&&!lifecycle.signal.aborted)setVisible(true);},{once:true});
}

// Every hide/show path heals the board (idempotent), so it always comes back whole.
function setVisible(v){
 visibilityRun++;
 if(!v){sequence++;busy=false;clearTimeout(finalizeTimer);pendingStrokes=[];pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();outlineFlash=null;objectsLayer.replaceChildren();cancelAnimationFrame(rafId);rafId=0;}
 board?.heal();
 portalHome.hidden=!v;
 if(boardBtn)boardBtn.hidden=v;
 if(v){if(!boardShown)focusBefore=document.activeElement;motion(portalHome,'');portalHome.style.opacity='';portalHome.style.clipPath='';board?.resume();backgroundBlocked(true);menuBtn.focus();}
 else{endPhase();board?.pause();backgroundBlocked(false);if(focusBefore?.isConnected)focusBefore.focus();}
 boardShown=v;
}
function fadeOutBoard(){
 const run=++visibilityRun;
 backgroundBlocked(false);
 motion(portalHome,'opacity .3s ease');portalHome.style.opacity='0';
 return new Promise(r=>setTimeout(()=>{if(run===visibilityRun){portalHome.hidden=true;if(boardBtn)boardBtn.hidden=false;endPhase();board?.heal();board?.pause();boardShown=false;}r();},prefersReducedMotion()?0:300));
}
function fadeInBoard(){
 visibilityRun++;
 endPhase();board?.heal();
 portalHome.hidden=false;portalHome.style.clipPath='';motion(portalHome,'none');portalHome.style.opacity='0';
 if(boardBtn)boardBtn.hidden=true;
 board?.resume();boardShown=true;backgroundBlocked(true);menuBtn.focus();
 const run=visibilityRun;
 settle().then(()=>{if(run!==visibilityRun)return;motion(portalHome,`opacity ${PORTAL.healMs}ms ease`);portalHome.style.opacity='1';});
}
function status(text){statusEl.textContent=text;}

function resizeOverlay(){
 const dpr=Math.min(devicePixelRatio||1,2),r=overlay.getBoundingClientRect();
 overlay.width=Math.round(Math.max(1,r.width)*dpr);overlay.height=Math.round(Math.max(1,r.height)*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function strokeGlow(pts,color,alpha,width){
 if(pts.length<2)return;
 ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.shadowColor=color;ctx.shadowBlur=18;ctx.strokeStyle=color;ctx.lineWidth=width+4;
 ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,width-2);ctx.stroke();
 ctx.restore();
}
function touchDot(x,y,color){
 ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,20);g.addColorStop(0,color+'cc');g.addColorStop(1,color+'00');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,20,0,Math.PI*2);ctx.fill();ctx.restore();
}
function kickRender(){if(!rafId)rafId=requestAnimationFrame(drawFrame);}
function drawFrame(){
 rafId=0;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);ctx.restore();
 const now=performance.now();
 if(outlineFlash){
  const t=now-outlineFlash.start;
  if(t<350)outlineFlash.polys.forEach(p=>strokeGlow(p,outlineFlash.color,1-t/350,4));
  else outlineFlash=null;
 }
 if(phase?.pulse&&phase.pts)strokeGlow(phase.pts,phase.color,.4+.25*Math.sin((now-phase.t0)/280),3); // soft breathing outline while loading
 for(const p of pointers.values()){
  const trail=p.pts.filter(pt=>now-pt.t<250).map(pt=>[pt.x,pt.y]);
  strokeGlow(trail,'#d8f6ff',1,4);
  const last=p.pts.at(-1);if(last)touchDot(last.x,last.y,'#d8f6ff');
 }
 if(pointers.size||outlineFlash||phase?.pulse)kickRender();
}
function flashOutline(polys,color){if(prefersReducedMotion())return;outlineFlash={polys,color,start:performance.now()};kickRender();}

function fallInAll([cx,cy]){
 const menus=Object.values(MENUS),n=menus.length,R=90;
 const els=menus.map((m,i)=>{
  const a=(i/n)*Math.PI*2,el=document.createElement('div');el.className='portal-object';
  el.style.left=(cx+Math.cos(a)*R)+'px';el.style.top=(cy+Math.sin(a)*R)+'px';
  el.style.setProperty('--glow',m.color);el.innerHTML=m.icon;objectsLayer.append(el);return el;
 });
 return new Promise(resolve=>{
  if(prefersReducedMotion()){els.forEach(el=>el.remove());resolve();return;}
  settle().then(()=>{els.forEach(el=>{el.style.left=cx+'px';el.style.top=cy+'px';el.classList.add('falling');});setTimeout(()=>{els.forEach(el=>el.remove());resolve();},600);});
 });
}
// Neon liquid glass between #portalHome's background and the board canvas, so it shows only through the
// cut. pts: client-px polygon to clip to (null = whole screen); all: rainbow (the X/cross menu). Layers: caustic neon base <b>,
// slow specular sheen (:after), blurred specular rim along the clip edge (svg), touch ripples.
function showGlass(pts,color,all=false){
 endPhase();
 const el=document.createElement('div');el.className='portal-glass';el.style.setProperty('--glass',color);
 el.innerHTML='<b></b>'+(pts?`<svg aria-hidden="true"><defs><linearGradient id="portalRimGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></linearGradient></defs><polygon points="${pts.map(p=>p.join(',')).join(' ')}"/></svg>`:'');
 if(pts)el.style.clipPath=`polygon(${bleedPts(pts).map(([x,y])=>`${x}px ${y}px`).join(',')})`;
 el.classList.toggle('all',all);
 if(!prefersReducedMotion())el.style.setProperty('animation','portal-glass-in .6s ease both','important'); // beats the locked theme's animation:none
 portalHome.append(el);
 phase={glass:el,pts,color,t0:performance.now(),pulse:false};
}
function endPhase(){phase?.glass.remove();phase=null;}
function ripple(x,y){
 if(!phase||prefersReducedMotion())return;
 const r=document.createElement('i');r.className='portal-ripple';r.style.left=x+'px';r.style.top=y+'px';
 r.style.setProperty('animation',`portal-ripple ${PORTAL.rippleMs}ms cubic-bezier(.2,.6,.3,1) forwards`,'important'); // beats the locked theme's animation:none
 phase.glass.append(r);setTimeout(()=>r.remove(),PORTAL.rippleMs);
}
// Cuts a client-px polygon out of the board (board.cut takes face coords, v down) and resolves once the piece has fallen in.
function cutBoard(pts,color){
 const f=board?.faceRect();if(!f)return Promise.resolve();
 return board.cut(pts.map(([x,y])=>[(x-f.left)/f.width,(y-f.top)/f.height]),color,prefersReducedMotion()?0:PORTAL.cutMs);
}
function revealDialogFromPoint(dialog,[cx,cy]){
 if(prefersReducedMotion())return;
 const dbox=dialog.getBoundingClientRect();
 dialog.style.transformOrigin=`${cx-dbox.left}px ${cy-dbox.top}px`;motion(dialog,'none');dialog.style.transform='scale(.05)';dialog.style.opacity='0';
 settle().then(()=>{if(!dialog.open)return;motion(dialog,'transform .5s cubic-bezier(.2,0,.3,1),opacity .4s ease');dialog.style.transform='';dialog.style.opacity='';});
}

function fallbackRect(){const r=overlay.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height};}

async function runShape(id){
 if(busy||!boardShown)return;
 const run=++sequence;busy=true;try{await portalSequence(id,()=>run===sequence&&!lifecycle.signal.aborted);}finally{if(run===sequence)busy=false;}
}
// Lines (and x) are open strokes with no enclosed area: no hole to cut. Flash the trace in the
// destination colour, then open it directly — no glass phase, no forced loadMinMs wait, no porthole
// reveal (Ian 2026-09-22: transitions for these are his own later work).
const LINE_IDS=new Set(['line-lr','line-rl','line-down','line-up']);
const lineTemplatePts=id=>SHAPES.line[(id==='line-lr'||id==='line-rl')?1:0].points;
async function openDirect(menu,current){
 let dialog=null;
 backgroundBlocked(false);
 try{dialog=await menu.open?.();}catch(error){console.warn(`${menu.label} failed to open.`,error);}
 if(!current())return;
 const shown=dialog instanceof HTMLDialogElement?dialog.open:dialog?.getClientRects?.().length>0;
 if(!shown){status(`${menu.label} isn't available here yet.`);await fadeOutBoard();fadeInBoard();return;}
 if(dialog instanceof HTMLDialogElement)dialog.addEventListener('close',()=>{if(current())fadeInBoard();},{once:true});
 await fadeOutBoard();
}
async function portalSequence(id,current){
 const rect=board?board.patternRect():fallbackRect();
 if(id==='cross'){
  flashOutline(SHAPES.cross.map(p=>toClientPts(p.points,rect)),'#ffffff');
  const center=[rect.left+rect.width/2,rect.top+rect.height/2];
  const face=board?.faceRect();
  showGlass(face&&closeLoop(toClientPts([[0,0],[1,0],[1,1],[0,1]],face)),'#ffffff',true); // rainbow glass behind the whole board; the whole pattern falls in over it
  await Promise.all([cutBoard(shapeClipPts('rect',rect),'#ffffff'),fallInAll(center)]);
  if(!current())return;
  openMenu();
  await settle();
  revealDialogFromPoint(menuSheet,center);
  menuSheet.addEventListener('close',()=>{motion(menuSheet,'');menuSheet.style.transform='';menuSheet.style.opacity='';},{once:true});
  return;
 }
 const menu=MENUS[id];if(!menu)return;
 if(id==='x'){
  // No area to cut (see LINE_IDS above); reuses the plain nav open Customizer used, so the glass/board
  // stays up while the next page loads, same as any other kind:'nav' destination.
  flashOutline(SHAPES.x.map(p=>toClientPts(p.points,rect)),menu.color);
  if(menu.locked?.()){status(menu.lockedMessage);return;}
  status('');menu.open();return;
 }
 if(LINE_IDS.has(id)){
  flashOutline([toClientPts(lineTemplatePts(id),rect)],menu.color);
  if(menu.locked?.()){status(menu.lockedMessage);return;}
  status('');
  if(menu.kind==='menu'){openMenu();return;} // Share QR isn't built: today's Menu sheet (openMenu hides the portal itself)
  await openDirect(menu,current);
  return;
 }
 if(!SHAPES[id]){if(menu.locked?.()){status(menu.lockedMessage);return;}setVisible(false);menu.open?.();return;} // menu without a traced shape (opened by id)
 const pts=shapeClipPts(id,rect);
 flashOutline([pts],menu.color);
 if(menu.locked?.()){status(menu.lockedMessage);return;}
 status('');
 showGlass(pts,menu.color);
 await cutBoard(pts,menu.color);
 if(!current())return;
 // Loading phase: the glass stays live (touch ripples, breathing outline) for at least loadMinMs.
 if(phase)phase.pulse=!prefersReducedMotion();
 if(phase?.pulse)kickRender();
 await sleep(prefersReducedMotion()?0:PORTAL.loadMinMs);
 if(!current())return;
 if(menu.kind==='home'){await growHole(portalHome,pts,rectBox(portalHome),current);if(current()){setVisible(false);menu.open?.();}return;}
 if(menu.kind==='nav'){menu.open();return;} // the glass stays up while the next page loads
 let dialog=null;
 backgroundBlocked(false);
 try{dialog=await menu.open?.();}catch(error){console.warn(`${menu.label} failed to open.`,error);}
 await settle();
 if(!current())return;
 const shown=dialog instanceof HTMLDialogElement?dialog.open:dialog?.getClientRects?.().length>0;
 // Panel missing in this build (or it refused to open): never leave the screen stuck on the glass.
 if(!shown){status(`${menu.label} isn't available here yet.`);await fadeOutBoard();fadeInBoard();return;}
 if(dialog instanceof HTMLDialogElement){
  const dbox=dialog.getBoundingClientRect(),local=pts.map(([x,y])=>[x-dbox.left,y-dbox.top]);
  await growPorthole(dialog,local,current);
  if(!current()){dialog.style.clipPath='';motion(dialog,'');return;}
  if(!dialog.open){fadeInBoard();return;} // closed mid-reveal
  dialog.addEventListener('close',()=>{if(current())fadeInBoard();},{once:true});
 }
 fadeOutBoard();
}

function toNorm(x,y){const r=board.patternRect();return[(x-r.left)/r.width,(y-r.top)/r.height];}
function endPointer(e,cancel){
 const p=pointers.get(e.pointerId);if(!p)return;
 pointers.delete(e.pointerId);board.release(e.pointerId);
 if(cancel||busy)return;
 const xs=p.norm.map(n=>n[0]),ys=p.norm.map(n=>n[1]);
 const size=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 if(size<.03)return; // ignore taps
 pendingStrokes.push(p.norm);
 clearTimeout(finalizeTimer);
 finalizeTimer=setTimeout(()=>{const strokes=pendingStrokes;pendingStrokes=[];const id=recognizeShape(strokes);if(id)runShape(id);},450);
}
function wirePointerEvents(){
 overlay.addEventListener('pointerdown',e=>{
  overlay.setPointerCapture(e.pointerId);clearTimeout(finalizeTimer);
  pointers.set(e.pointerId,{pts:[{x:e.clientX,y:e.clientY,t:performance.now()}],norm:[toNorm(e.clientX,e.clientY)]});
  if(busy)ripple(e.clientX,e.clientY);else board.press(e.pointerId,e.clientX,e.clientY);
  kickRender();
 });
 overlay.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  p.pts.push({x:e.clientX,y:e.clientY,t:performance.now()});p.norm.push(toNorm(e.clientX,e.clientY));
  if(!busy)board.press(e.pointerId,e.clientX,e.clientY);
 });
 overlay.addEventListener('pointerup',e=>endPointer(e,false));
 overlay.addEventListener('pointercancel',e=>endPointer(e,true));
}

function initialVisible(){
 return !(new URLSearchParams(location.search).has('panel')||location.hash==='#pod'||document.body.dataset.screen==='rest');
}

export async function mountPortal({visible=false}={}){
 if(window.myr5Portal&&!window.myr5Portal.disposed)return window.myr5Portal;
 const lifetime=new AbortController();lifecycle=lifetime;
 buildDom();
 menuBtn.addEventListener('click',()=>{if(busy)return;openMenu();});
 boardBtn?.addEventListener('click',()=>setVisible(true),{signal:lifecycle.signal});
 await loadBoard(initialBoardId());
 if(!boardFailed)wirePointerEvents();
 resizeOverlay();overlayObserver=new ResizeObserver(resizeOverlay);overlayObserver.observe(portalHome);
 setVisible(visible&&initialVisible());
 // Back from a 'nav' portal via the bfcache: drop the stale glass and hole.
 let resumeAfterPageShow=false;
 addEventListener('pagehide',()=>{resumeAfterPageShow=boardShown;setVisible(false);},{signal:lifecycle.signal});
 addEventListener('pageshow',e=>{if(e.persisted&&resumeAfterPageShow)setVisible(true);},{signal:lifecycle.signal});
 window.myr5Portal={
  get disposed(){return lifetime.signal.aborted;},
  dispose(){if(lifetime.signal.aborted)return;setVisible(false);boardLoad++;lifetime.abort();overlayObserver?.disconnect();board?.dispose();board=null;menuChosen=true;menuSheet.close();menuSheet.remove();portalHome.remove();caustic?.remove();for(const cancel of flashes)cancel();window.myr5Portal=null;},
  show:()=>setVisible(true),
  hide:()=>setVisible(false),
  open:id=>runShape(id),
  trace(strokes){const id=recognizeShape(strokes);if(id)runShape(id);return id;},
  board:id=>loadBoard(id),
  flashTransition:async({duration=520}={})=>{
   duration=Number.isFinite(duration)?Math.max(0,Math.min(duration,10000)):520;
   if(prefersReducedMotion())duration=0;
   const flash=document.createElement('div');flash.className='portal-transition-flash';flash.setAttribute('aria-hidden','true');document.body.append(flash);
   flash.style.setProperty('animation',`portal-transition-flash ${duration}ms ease-in-out both`,'important');
   if(flash.showPopover){flash.setAttribute('popover','manual');flash.showPopover();}
   window.dispatchEvent(new CustomEvent('myr5:portal-transition',{detail:{phase:'flash',duration}}));
   if(!duration){flash.remove();window.dispatchEvent(new CustomEvent('myr5:portal-transition',{detail:{phase:'complete'}}));return;}
   await new Promise((resolve,reject)=>{let timer;const finish=()=>{clearTimeout(timer);flashes.delete(cancel);resolve();},cancel=()=>{clearTimeout(timer);flash.remove();flashes.delete(cancel);reject(new DOMException('Portal closed.','AbortError'));};flashes.add(cancel);flash.addEventListener('animationend',finish,{once:true});timer=setTimeout(finish,duration+100);});
   if(lifetime.signal.aborted){flash.remove();throw new DOMException('Portal closed.','AbortError');}
   flash.remove();window.dispatchEvent(new CustomEvent('myr5:portal-transition',{detail:{phase:'complete'}}));
  },
  current:()=>board,
 };
 return window.myr5Portal;
}
