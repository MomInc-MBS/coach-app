// Portal home board: the quilt cloth board replaces the app home menu. Tracing one of the eight
// stitched shapes cuts that shape out of the 3D board — the piece falls in, neon liquid glass glows
// through the hole behind it for a short interactive loading phase — then opens the shape's menu.
// AGPL-3.0-or-later.
import {createQuiltBoard} from './portal-board.mjs';
import {recognizeShape,SHAPES} from './portal-shapes.mjs';

// Portal sequence timings (ms): the cut piece falling in, the minimum live-glass loading phase, the
// dialog porthole reveal, the healed board fading back in, one touch ripple on the glass.
const PORTAL={cutMs:1100,loadMinMs:2000,revealMs:900,healMs:400,rippleMs:900};
// #104/#105 (W2-2E): the six neons already used for the "all menus" glass (portal.css .portal-glass.all),
// reused for the flowing finger-trail ribbon. IDLE: 3s of no touch arms the cycle; fast pass 0.5s/shape once
// through the order below, then a gentler 2.5s/shape loop until the next touch. TRAIL_FADE_MS: how long a
// trail segment (live or just-released) stays lit before it's fully faded.
const NEONS=['#ff5f1f','#b026ff','#ff10f0','#1f51ff','#39ff14','#ffff33'];
const NEON_RGB=NEONS.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
const IDLE={armMs:3000,fastMs:500,slowMs:2500};
// Ian 2026-09-23: square, oval, triangle, inverted triangle, diamond, X, then the four lines; cross last.
const IDLE_ORDER=['rect','oval','up','down','vdiamond','x','line-lr','line-rl','line-down','line-up','cross'];
const TRAIL_FADE_MS=800;

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
 // Line-up opens the Menu sheet; it is hidden from the sheet grid itself.
 'line-up':{label:'Menu',color:'#ffffff',icon:ICONS.star,kind:'menu',hidden:true},
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
let pointers=new Map(),pendingStrokes=[],pendingTrailPts=[],finalizeTimer=0,outlineFlash=null,rafId=0;
// busy: a portal sequence is running (traces ignored, touches ripple the glass); phase: the live glass {glass,pts,color,t0,pulse}.
let busy=false,phase=null;
// #104: idleTimer arms after IDLE.armMs of eligibility (board shown, nothing busy, no touch, no dialog,
// tab visible); idleCycle is the running cycle ({phase:'fast'|'slow',t0}) or {static:true} under reduced
// motion. #105: fading holds just-released strokes still fading out, drawn alongside any live ones.
let idleTimer=0,idleCycle=null,fading=[];

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
  <button id="portalMenuButton" type="button">Menu</button><button id="portalExitButton" type="button">Pod</button>`;
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
 // The board picker row only earns its place once a second board ships; one option is nothing to pick from.
 const boardRow=PRODUCTION_PORTALS.length<2?'':`<div class="portal-board-chips" role="group" aria-label="Board"><span class="portal-board-label">Board</span>${boardChipsHtml()}</div>`;
 menuSheet.innerHTML=`<header><h2 id="portalMenuTitle">Menu</h2><button type="button" data-close>Close</button></header><div class="portal-menu-grid">${menuButtonsHtml()}</div>${boardRow}<p id="portalMenuStatus" role="status"></p>`;
 document.body.append(menuSheet);
 menuSheet.querySelector('[data-close]').onclick=()=>menuSheet.close();
 menuSheet.querySelectorAll('[data-menu]').forEach(btn=>btn.onclick=()=>{
  const menu=MENUS[btn.dataset.menu];
  if(menu.locked?.()){menuSheet.querySelector('#portalMenuStatus').textContent=menu.lockedMessage;return;}
  menuSheet.querySelector('#portalMenuStatus').textContent='';menuChosen=true;menuSheet.close();
  // A traced-shape dialog open fades back to the quilt when its dialog closes (openDirect). Route the
  // same destinations opened from the Menu sheet through the same flow, or closing leaves the pod
  // showing instead of the quilt. kind:'home' and kind:'nav' keep their plain setVisible+open.
  if(menu.kind==='dialog'){const run=++sequence;openDirect(menu,()=>run===sequence&&!lifecycle.signal.aborted);return;}
  setVisible(false);menu.open?.();
 });
 menuSheet.querySelectorAll('[data-board]').forEach(btn=>btn.onclick=()=>{menuSheet.close();loadBoard(btn.dataset.board);});
}

function backgroundBlocked(block){
 // Dialogs that are open or hidden are never made inert: one opened as a modal while the quilt is up (the full-download
 // offer, setup gate, reward reveals) sits in the top layer and must stay tappable, or the app freezes. A closed dialog
 // that is still drawn (styled display:grid) stays inert so it can't catch taps meant for the quilt. The "Updated: …"
 // toast (app-updates.mjs) is a non-dialog element sitting over the portal's own controls; it's exempt too, or its
 // "Got it" tap falls through to whatever is underneath (portal.css raises it above the Menu button while up).
 const liveDialog=el=>el.tagName==='DIALOG'&&(el.open||getComputedStyle(el).display==='none');
 const exempt=el=>el===portalHome||el===menuSheet||liveDialog(el)||el.classList.contains('app-update-banner');
 if(block){for(const el of document.body.children)if(!exempt(el)&&!backgroundInert.has(el)){backgroundInert.set(el,el.inert);el.inert=true;}}
 else{for(const [el,inert]of backgroundInert)el.inert=inert;backgroundInert.clear();}
}
function openMenu(){
 setVisible(false);menuChosen=false;menuSheet.showModal();
 menuSheet.addEventListener('close',()=>{if(!menuChosen&&!lifecycle.signal.aborted)setVisible(true);},{once:true});
}

// Every hide/show path heals the board (idempotent), so it always comes back whole.
function setVisible(v){
 visibilityRun++;
 if(!v){sequence++;busy=false;clearTimeout(finalizeTimer);pendingStrokes=[];pendingTrailPts=[];fading.length=0;pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();outlineFlash=null;objectsLayer.replaceChildren();cancelAnimationFrame(rafId);rafId=0;}
 board?.heal();
 portalHome.hidden=!v;
 if(boardBtn)boardBtn.hidden=v;
 if(v){if(!boardShown)focusBefore=document.activeElement;motion(portalHome,'');portalHome.style.opacity='';portalHome.style.clipPath='';board?.resume();backgroundBlocked(true);menuBtn.focus();}
 else{endPhase();board?.pause();backgroundBlocked(false);if(focusBefore?.isConnected)focusBefore.focus();}
 boardShown=v;
 scheduleIdle();
}
function fadeOutBoard(){
 const run=++visibilityRun;
 backgroundBlocked(false);
 motion(portalHome,'opacity .3s ease');portalHome.style.opacity='0';
 return new Promise(r=>setTimeout(()=>{if(run===visibilityRun){portalHome.hidden=true;if(boardBtn)boardBtn.hidden=false;endPhase();board?.heal();board?.pause();boardShown=false;scheduleIdle();}r();},prefersReducedMotion()?0:300));
}
function fadeInBoard(){
 visibilityRun++;
 endPhase();board?.heal();
 portalHome.hidden=false;portalHome.style.clipPath='';motion(portalHome,'none');portalHome.style.opacity='0';
 if(boardBtn)boardBtn.hidden=true;
 board?.resume();boardShown=true;backgroundBlocked(true);menuBtn.focus();scheduleIdle();
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

// #105 magical trail: the ribbon's colour cycles through NEONS once every ~48px travelled.
function neonRGB(t){
 const n=NEON_RGB.length,i=((Math.floor(t)%n)+n)%n,j=(i+1)%n,f=t-Math.floor(t);
 const[r1,g1,b1]=NEON_RGB[i],[r2,g2,b2]=NEON_RGB[j];
 return[r1+(r2-r1)*f|0,g1+(g2-g1)*f|0,b1+(b2-b1)*f|0];
}
// Fixed-size sparkle pool (typed arrays, ring buffer index) so shedding stardust never allocates per
// frame; raised to 240 slots / 3-per-frame emission (conductor review 2026-09-23) for visibly thicker
// stardust — still self-capping (a slow frame rate spawns fewer, since spawn is once per rendered frame).
const SPARK_N=240,SPARK_LIFE=550;
const sparkX=new Float32Array(SPARK_N),sparkY=new Float32Array(SPARK_N),sparkVX=new Float32Array(SPARK_N),sparkVY=new Float32Array(SPARK_N),sparkSize=new Float32Array(SPARK_N),sparkHue=new Int8Array(SPARK_N),sparkBorn=new Float32Array(SPARK_N).fill(-1e9);
let sparkCursor=0;
function spawnSpark(x,y){
 const i=sparkCursor;sparkCursor=(sparkCursor+1)%SPARK_N;
 const a=Math.random()*Math.PI*2,s=16+Math.random()*30;
 sparkX[i]=x;sparkY[i]=y;sparkVX[i]=Math.cos(a)*s;sparkVY[i]=Math.sin(a)*s*.5+18; // outward, biased slightly down
 sparkSize[i]=2+Math.random()*3;sparkHue[i]=(Math.random()*NEONS.length)|0;sparkBorn[i]=performance.now();
}
function sparksAlive(now){for(let i=0;i<SPARK_N;i++)if(now-sparkBorn[i]<SPARK_LIFE)return true;return false;}
// Source-over, not additive (conductor review 2026-09-23): 'lighter' over the light quilt washed the
// neon pale. A saturated disc with a small white centre reads as a solid spark instead.
function drawSparks(now){
 for(let i=0;i<SPARK_N;i++){
  const age=now-sparkBorn[i];if(age<0||age>=SPARK_LIFE)continue;
  const t=age/1000,life=age/SPARK_LIFE,x=sparkX[i]+sparkVX[i]*t,y=sparkY[i]+sparkVY[i]*t+30*life*life;
  const alpha=(1-life)*(.55+.45*Math.sin(age*.03+i)),color=NEONS[sparkHue[i]],size=sparkSize[i]*(1-life*.4);
  ctx.save();ctx.globalAlpha=Math.max(0,alpha);
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,size*.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
}
// A bloom + short star-flare at the fingertip (one gradient fill + a couple of strokes — cheap, one per
// active tip per frame, not per particle). `rgb` is an [r,g,b] triple, not a CSS string: building rgba()
// stops directly avoids the hex-only "+'cc'" alpha-suffix trick, which broke for the rgb(...) tip colour.
function drawFlare(x,y,[r,g,b],alpha){
 const solid=`rgb(${r},${g},${b})`;
 ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='lighter';
 const grad=ctx.createRadialGradient(x,y,0,x,y,26);
 grad.addColorStop(0,'#ffffffee');grad.addColorStop(.4,`rgba(${r},${g},${b},.8)`);grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
 ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,26,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.shadowColor=solid;ctx.shadowBlur=10;
 ctx.beginPath();ctx.moveTo(x-15,y);ctx.lineTo(x+15,y);ctx.moveTo(x,y-15);ctx.lineTo(x,y+15);ctx.stroke();
 ctx.fillStyle='#ffffff';ctx.shadowBlur=0;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
const pathLength=pts=>{let d=0;for(let i=1;i<pts.length;i++)d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return d;};
const ribbonPath=pts=>{const p=new Path2D();pts.forEach((pt,i)=>i?p.lineTo(pt.x,pt.y):p.moveTo(pt.x,pt.y));return p;};
// One gradient along the trail's own line (tail->tip): colour (via `colorAt`, default the flowing NEONS)
// flows by distance travelled, alpha follows each sampled point's own age — capped to a handful of stops,
// so building and stroking it costs the same regardless of how many raw points the stroke has. Reused
// with a flat colour for the dark backing and the white hot centre so every layer fades in step.
const RIBBON_STOPS=10;
function ribbonGradient(pts,now,colorAt=d=>neonRGB(d/48)){
 const head=pts[pts.length-1],tail=pts[0];
 if(head.x===tail.x&&head.y===tail.y)return null;
 const g=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);
 const n=pts.length,count=Math.min(n,RIBBON_STOPS);
 let dist=0,last=pts[0];
 for(let k=0;k<count;k++){
  const i=Math.round(k*(n-1)/(count-1)),p=pts[i];
  dist+=Math.hypot(p.x-last.x,p.y-last.y);last=p;
  const alpha=Math.max(0,1-(now-p.t)/TRAIL_FADE_MS),[r,gg,b]=colorAt(dist);
  g.addColorStop(k/(count-1),`rgba(${r},${gg},${b},${alpha.toFixed(3)})`);
 }
 return g;
}
// Full-motion trail (conductor review 2026-09-23: normal source-over, not additive — 'lighter' over the
// light quilt background washed the neon pale). Four stroke() calls total for the whole path (not one
// shadowed stroke per segment, so cost doesn't scale with point count): a soft dark backing so the neon
// pops against the light quilt, a wide soft glow, a bright saturated core, then a thin white hot centre.
// `live` also sheds sparkles from a bright bloom/flare tip; a just-released trail (in `fading`) keeps
// rendering with no new sparks until it ages out.
function renderRibbon(pts,now,live){
 const visible=pts.filter(p=>now-p.t<TRAIL_FADE_MS);
 if(!visible.length)return;
 if(visible.length<2){drawFlare(visible[0].x,visible[0].y,[255,255,255],1);return;}
 const path=ribbonPath(visible);
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='source-over';
 const shadowGrad=ribbonGradient(visible,now,()=>[20,10,30]);
 if(shadowGrad){ctx.strokeStyle=shadowGrad;ctx.globalAlpha=.25;ctx.shadowColor='rgba(20,10,30,.25)';ctx.shadowBlur=10;ctx.lineWidth=24;ctx.stroke(path);ctx.shadowBlur=0;}
 const neonGrad=ribbonGradient(visible,now);
 if(neonGrad){
  ctx.strokeStyle=neonGrad;
  ctx.globalAlpha=.42;ctx.lineWidth=20;ctx.stroke(path); // wide soft glow
  ctx.globalAlpha=1;ctx.lineWidth=5.5;ctx.stroke(path); // bright saturated core
 }
 const whiteGrad=ribbonGradient(visible,now,()=>[255,255,255]);
 if(whiteGrad){ctx.strokeStyle=whiteGrad;ctx.globalAlpha=.9;ctx.lineWidth=1.3;ctx.stroke(path);} // hot centre
 ctx.restore();
 const tip=visible[visible.length-1],tipAlpha=Math.max(.35,1-(now-tip.t)/TRAIL_FADE_MS);
 drawFlare(tip.x,tip.y,neonRGB(pathLength(visible)/48),tipAlpha);
 if(live)for(let k=0;k<3;k++)spawnSpark(tip.x,tip.y);
}
// #105: a short bright shimmer that sweeps the frozen path from tail to tip over the fade window, once,
// right after release — a ripple riding the trail out as it dies.
function drawShimmer(entry,now){
 const t=(now-entry.releasedAt)/TRAIL_FADE_MS;if(t<0||t>1)return;
 const pts=entry.pts,total=pathLength(pts);if(!total)return;
 const target=t*total;let d=0,x=pts[0].x,y=pts[0].y;
 for(let i=1;i<pts.length;i++){
  const seg=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  if(d+seg>=target){const f=seg?(target-d)/seg:0;x=pts[i-1].x+(pts[i].x-pts[i-1].x)*f;y=pts[i-1].y+(pts[i].y-pts[i-1].y)*f;break;}
  d+=seg;x=pts[i].x;y=pts[i].y;
 }
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-t)*.85+.1;
 const g=ctx.createRadialGradient(x,y,0,x,y,16);g.addColorStop(0,'#ffffffee');g.addColorStop(1,'#ffffff00');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function renderPlainTrail(pts,now){
 const trail=pts.filter(pt=>now-pt.t<TRAIL_FADE_MS).map(pt=>[pt.x,pt.y]);
 strokeGlow(trail,'#d8f6ff',1,4);
 const last=pts.at(-1);if(last&&now-last.t<TRAIL_FADE_MS)touchDot(last.x,last.y,'#d8f6ff');
}

// #104 idle ambient flash: which id is showing right now, and how strongly, given the cycle's phase/elapsed.
function idleFrame(now){
 let elapsed=now-idleCycle.t0;
 if(idleCycle.phase==='fast'&&elapsed>=IDLE_ORDER.length*IDLE.fastMs){idleCycle.phase='slow';idleCycle.t0=now;elapsed=0;}
 const dur=idleCycle.phase==='fast'?IDLE.fastMs:IDLE.slowMs,idx=Math.floor(elapsed/dur)%IDLE_ORDER.length,t=elapsed%dur;
 const envelope=Math.min(1,t/60,(dur-t)/60),peak=idleCycle.phase==='fast'?.9:.5;
 return{id:IDLE_ORDER[idx],alpha:Math.max(.12,peak*envelope),width:idleCycle.phase==='fast'?4:3};
}
// Outline + label (+ arrow for a line) for one idle-flash entry; `rect` is the stitched-pattern rect.
function idleShapeInfo(id,rect){
 if(id==='cross'){
  const polys=SHAPES.cross.map(p=>toClientPts(p.points,rect));
  return{polys,color:'#ffffff',label:MENUS['line-up'].label,labelPt:[rect.left+rect.width/2,rect.top+rect.height/2],arrow:null};
 }
 const menu=MENUS[id];
 if(id==='x'){
  const polys=SHAPES.x.map(p=>toClientPts(p.points,rect));
  return{polys,color:menu.color,label:menu.label,labelPt:polys[0][0],arrow:null};
 }
 if(LINE_IDS.has(id)){
  const[a,b]=toClientPts(lineTemplatePts(id),rect),reversed=id==='line-rl'||id==='line-up',start=reversed?b:a,end=reversed?a:b;
  return{polys:[[a,b]],color:menu.color,label:menu.label,labelPt:start,arrow:{from:start,to:end}};
 }
 const pts=shapeClipPts(id,rect);
 return{polys:[pts],color:menu.color,label:menu.label,labelPt:pts[0],arrow:null};
}
function drawArrow(from,to,color,alpha){
 const mx=(from[0]+to[0])/2,my=(from[1]+to[1])/2,ang=Math.atan2(to[1]-from[1],to[0]-from[0]),len=10;
 ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=6;
 ctx.translate(mx,my);ctx.rotate(ang);
 ctx.beginPath();ctx.moveTo(-len,0);ctx.lineTo(len,0);ctx.moveTo(len-6,-5);ctx.lineTo(len,0);ctx.lineTo(len-6,5);ctx.stroke();
 ctx.restore();
}
// A bold, pill-backed label near the shape's start point, clear of the stroke and clamped inside the
// board face with a 12px margin (conductor review 2026-09-23: the old plain small text ran off-board in
// a corner). Flips to whichever side keeps it fully on-board rather than clipping.
function drawLabel(text,[x,y],color,alpha,rect){
 ctx.save();ctx.font='700 15px system-ui,sans-serif';ctx.textBaseline='middle';
 const padX=9,padY=6,h=15+padY*2,w=ctx.measureText(text).width+padX*2,margin=12;
 const face=rect||fallbackRect();
 let lx=x+12,ly=y-14;
 if(lx+w>face.left+face.width-margin)lx=x-12-w;
 lx=Math.min(Math.max(lx,face.left+margin),face.left+face.width-margin-w);
 ly=Math.min(Math.max(ly,face.top+margin+h/2),face.top+face.height-margin-h/2);
 ctx.globalAlpha=alpha;
 ctx.fillStyle='rgba(8,5,14,.75)';
 ctx.beginPath();ctx.roundRect(lx,ly-h/2,w,h,h/2);ctx.fill();
 ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=6;
 ctx.fillText(text,lx+padX,ly+1);
 ctx.restore();
}
function drawIdleShape({polys,color,label,labelPt,arrow},alpha,width,rect){
 polys.forEach(p=>strokeGlow(p,color,alpha,width));
 if(arrow)drawArrow(arrow.from,arrow.to,color,alpha);
 drawLabel(label,labelPt,color,alpha,rect);
}
function drawIdle(now){
 const rect=board?board.patternRect():fallbackRect(),face=board?board.faceRect():rect;
 if(idleCycle.static){IDLE_ORDER.forEach(id=>drawIdleShape(idleShapeInfo(id,rect),.35,3,face));return;}
 const{id,alpha,width}=idleFrame(now);
 drawIdleShape(idleShapeInfo(id,rect),alpha,width,face);
}

function drawFrame(){
 rafId=0;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);ctx.restore();
 const now=performance.now();
 if(outlineFlash){
  const t=now-outlineFlash.start;
  if(t<350)outlineFlash.polys.forEach(p=>strokeGlow(p,outlineFlash.color,1-t/350,4));
  else outlineFlash=null;
 }
 if(idleCycle)drawIdle(now);
 if(phase?.pulse&&phase.pts)strokeGlow(phase.pts,phase.color,.4+.25*Math.sin((now-phase.t0)/280),3); // soft breathing outline while loading
 for(let i=fading.length-1;i>=0;i--)if(now-fading[i].pts.at(-1).t>=TRAIL_FADE_MS)fading.splice(i,1);
 const reduced=prefersReducedMotion();
 for(const p of pointers.values())reduced?renderPlainTrail(p.pts,now):renderRibbon(p.pts,now,true);
 for(const entry of fading){
  if(reduced){renderPlainTrail(entry.pts,now);continue;}
  renderRibbon(entry.pts,now,false);drawShimmer(entry,now); // #105: a shimmer ripples along the path as it fades
 }
 if(!reduced)drawSparks(now);
 if(pointers.size||fading.length||outlineFlash||(idleCycle&&!idleCycle.static)||(phase?.pulse)||(!reduced&&sparksAlive(now)))kickRender();
}
function flashOutline(polys,color){if(prefersReducedMotion())return;outlineFlash={polys,color,start:performance.now()};kickRender();}

// #104: arms/disarms the idle cycle from every place eligibility can change (touch, sequence start/end,
// show/hide, tab visibility). Always safe to call — it's a no-op when nothing needs to change.
function idleEligible(){return boardShown&&!busy&&pointers.size===0&&!document.hidden&&!document.querySelector('dialog[open]');}
function scheduleIdle(){
 clearTimeout(idleTimer);idleTimer=0;
 if(idleCycle){idleCycle=null;kickRender();} // clears the drawn hint on the next frame
 if(idleEligible())idleTimer=setTimeout(beginIdleCycle,IDLE.armMs);
}
function beginIdleCycle(){
 idleTimer=0;
 if(!idleEligible())return;
 idleCycle=prefersReducedMotion()?{static:true}:{phase:'fast',t0:performance.now()};
 kickRender();
}

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
 const run=++sequence;busy=true;scheduleIdle();
 try{await portalSequence(id,()=>run===sequence&&!lifecycle.signal.aborted);}
 finally{if(run===sequence){busy=false;scheduleIdle();}}
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
 // #105: the just-released stroke keeps fading (light-painting), independent of whether it matches.
 if(p.pts.length>1)fading.push({pts:p.pts,releasedAt:performance.now()});
 scheduleIdle();kickRender();
 if(cancel||busy)return;
 const xs=p.norm.map(n=>n[0]),ys=p.norm.map(n=>n[1]);
 const size=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 if(size<.03)return; // ignore taps
 pendingStrokes.push(p.norm);pendingTrailPts.push(p.pts);
 clearTimeout(finalizeTimer);
 finalizeTimer=setTimeout(()=>{
  const strokes=pendingStrokes,trailPts=pendingTrailPts;pendingStrokes=[];pendingTrailPts=[];
  const id=recognizeShape(strokes);
  if(id){
   // #105: on a match, the drawn trail itself flashes the destination colour before the cut starts.
   flashOutline(trailPts.map(pts=>pts.map(pt=>[pt.x,pt.y])),id==='cross'?'#ffffff':(MENUS[id]?.color||'#ffffff'));
   runShape(id);
  }
 },450);
}
function wirePointerEvents(){
 overlay.addEventListener('pointerdown',e=>{
  overlay.setPointerCapture(e.pointerId);clearTimeout(finalizeTimer);
  pointers.set(e.pointerId,{pts:[{x:e.clientX,y:e.clientY,t:performance.now()}],norm:[toNorm(e.clientX,e.clientY)]});
  scheduleIdle();
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
 // #104: pause/resume the idle cycle with the tab (a backgrounded tab must not keep animating).
 document.addEventListener('visibilitychange',scheduleIdle,{signal:lifecycle.signal});
 window.myr5Portal={
  get disposed(){return lifetime.signal.aborted;},
  dispose(){if(lifetime.signal.aborted)return;setVisible(false);clearTimeout(idleTimer);idleTimer=0;idleCycle=null;fading.length=0;boardLoad++;lifetime.abort();overlayObserver?.disconnect();board?.dispose();board=null;menuChosen=true;menuSheet.close();menuSheet.remove();portalHome.remove();caustic?.remove();for(const cancel of flashes)cancel();window.myr5Portal=null;},
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
