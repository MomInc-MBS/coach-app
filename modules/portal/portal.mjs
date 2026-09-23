// Portal home board: the quilt cloth board replaces the app home menu. Tracing one of the eight
// stitched shapes cuts that shape out of the 3D board — the piece falls in, neon liquid glass glows
// through the hole behind it for a short interactive loading phase — then opens the shape's menu.
// AGPL-3.0-or-later.
import {createQuiltBoard,QUILT} from './portal-board.mjs';
import {recognizeShape,SHAPES} from './portal-shapes.mjs';

// Portal sequence timings (ms): the cut piece falling in, the minimum live-glass loading phase, the
// dive into the wormhole (the destination appears from its core), the healed board fading back in, one touch ripple on
// the glass. tunnelFrom/To: wormhole speed (rings per second) at the cut, ramping up to tunnelTo by the dive, which adds
// up to tunnelDive more.
export const PORTAL={cutMs:1300,loadMinMs:3500,revealMs:1100,healMs:400,rippleMs:900,tunnelFrom:.35,tunnelTo:1.5,tunnelDive:6};
// Liquid-glass slab over the wormhole (CSS px): lens-map texel, bevel depth, max refraction at the rim,
// rim inset inside the cut (the cloth hole's edge is ragged by about half a grid cell).
const GLASS={mapPx:3,bevel:30,bend:22,rimInset:8};
// #104/#105 (W2-2E): the six neons already used for the "all menus" glass (portal.css .portal-glass.all),
// reused for the flowing finger-trail ribbon. IDLE: 3s of no touch arms the cycle; fast pass 0.5s/shape once
// through the order below, then a gentler 2.5s/shape loop until the next touch. TRAIL_FADE_MS: how long a
// trail segment (live or just-released) stays lit before it's fully faded.
const TRAIL_NEONS=['#ff5f1f','#b026ff','#ff10f0','#1f51ff','#39ff14','#ffff33'];
const TRAIL_NEON_RGB=TRAIL_NEONS.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
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
function bleedPts(pts,d=GLASS_BLEED){
 const c=centroidOf(pts),f=board?.faceRect(),clamp=(v,lo,len)=>f?Math.min(Math.max(v,lo),lo+len):v;
 return pts.map(([x,y])=>{const k=1+d/(Math.hypot(x-c[0],y-c[1])||1);return [clamp(c[0]+(x-c[0])*k,f?.left,f?.width),clamp(c[1]+(y-c[1])*k,f?.top,f?.height)];});
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
// Home destinations (the app under the portal) open from the tunnel's core during the dive: a shape-shaped hole grows
// from the vanishing point to 1.15x the shape, which covers everything the dive leaves on screen.
function growHole(el,pts,box,current=()=>true,ms=PORTAL.revealMs){
 return new Promise(resolve=>{
  motion(el,'none');el.style.clipPath=buildHoleClip(pts,box,.02);
  if(prefersReducedMotion()){el.style.clipPath=buildHoleClip(pts,box,GROW);resolve();return;}
  settle().then(()=>{
   if(!current()){resolve();return;}
   motion(el,`clip-path ${ms}ms cubic-bezier(.4,0,.7,1)`);
   el.style.clipPath=buildHoleClip(pts,box,1.15);
   setTimeout(resolve,ms);
  });
 });
}

let portalHome,boardHost,overlay,ctx,objectsLayer,statusEl,menuBtn,menuSheet,boardBtn,overlayObserver,lifecycle;
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
function kickRender(){if(!rafId&&!probeFrozen)rafId=requestAnimationFrame(drawFrame);}

// #105 magical trail (W2-2E2). Colour flows through TRAIL_NEONS once every TRAIL_NEON_PX of stroke length (anchored
// to where the finger went, drifting slowly toward the tip); alpha follows each point's age, eased so it holds
// near full strength before it fades. Normal source-over throughout: additive washes out on the light quilt.
const TRAIL_NEON_PX=48,TRAIL_STOP_PX=12,TRAIL_MAX_STOPS=64,SHIMMER_MS=450;
const TAU=Math.PI*2,UNDERGLOW=[16,8,28],WHITE=[255,255,255];
function neonRGB(t){
 const n=TRAIL_NEON_RGB.length,i=((Math.floor(t)%n)+n)%n,j=(i+1)%n,f=t-Math.floor(t);
 const[r1,g1,b1]=TRAIL_NEON_RGB[i],[r2,g2,b2]=TRAIL_NEON_RGB[j];
 return[r1+(r2-r1)*f|0,g1+(g2-g1)*f|0,b1+(b2-b1)*f|0];
}
const trailColor=(d,now)=>neonRGB((d+now*.06)/TRAIL_NEON_PX);
const fadeAlpha=age=>{const k=Math.min(1,Math.max(0,age/TRAIL_FADE_MS));return 1-k*k*(3-2*k);};
// Fixed-size sparkle pool (typed arrays, ring-buffer cursor) so shedding dust never allocates. Each mote is a
// 2–5px neon disc with a white centre on a soft dark backing (so it reads on beige), twinkling on its own
// phase, drifting outward and slowing to a stop as it dies.
const SPARK_N=400,SPARK_LIFE=700;
const sparkX=new Float32Array(SPARK_N),sparkY=new Float32Array(SPARK_N),sparkVX=new Float32Array(SPARK_N),sparkVY=new Float32Array(SPARK_N),sparkSize=new Float32Array(SPARK_N),sparkHue=new Int8Array(SPARK_N),sparkBorn=new Float32Array(SPARK_N).fill(-1e9);
let sparkCursor=0;
function spawnSpark(x,y,born){
 const i=sparkCursor;sparkCursor=(sparkCursor+1)%SPARK_N;
 const a=Math.random()*TAU,s=30+Math.random()*110,off=4+Math.random()*6; // born just off the point, heading out
 sparkX[i]=x+Math.cos(a)*off;sparkY[i]=y+Math.sin(a)*off;sparkVX[i]=Math.cos(a)*s;sparkVY[i]=Math.sin(a)*s;
 sparkSize[i]=1.4+Math.random()*1.1;sparkHue[i]=(Math.random()*TRAIL_NEONS.length)|0;sparkBorn[i]=born;
}
// Per live frame (self-capping: a slow frame rate sheds less): three motes off the fingertip, four scattered
// along the last SHED_RECENT_MS of path.
const SHED_RECENT_MS=250;
function shedSparks(pts,now){
 const last=pts.length-1,tip=pts[last];for(let k=0;k<3;k++)spawnSpark(tip.x,tip.y,now);
 let first=last;while(first>0&&now-pts[first-1].t<SHED_RECENT_MS)first--;
 if(first===last)return;
 for(let k=0;k<4;k++){const i=first+1+((Math.random()*(last-first))|0),f=Math.random(),a=pts[i-1],b=pts[i];spawnSpark(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,now);}
}
function sparksAlive(now){for(let i=0;i<SPARK_N;i++)if(now-sparkBorn[i]<SPARK_LIFE)return true;return false;}
// Mote sprites, drawn once: a row of the six neons in one small canvas, so each mote is a single drawImage
// from one source (which the canvas batches) instead of three path fills. Cell = soft dark backing, neon
// disc at MOTE_NEON of the cell radius, white centre at MOTE_WHITE.
const MOTE_PX=20,MOTE_NEON=.68,MOTE_WHITE=.3;
let moteSprites=null;
function motes(){
 if(moteSprites)return moteSprites;
 const c=document.createElement('canvas'),g=c.getContext('2d'),R=MOTE_PX/2;c.width=MOTE_PX*TRAIL_NEONS.length;c.height=MOTE_PX;
 TRAIL_NEONS.forEach((color,i)=>{
  const x=i*MOTE_PX+R,disc=(r,style)=>{g.fillStyle=style;g.beginPath();g.arc(x,R,r,0,TAU);g.fill();};
  const back=g.createRadialGradient(x,R,0,x,R,R);back.addColorStop(0,'rgba(16,8,28,.5)');back.addColorStop(1,'rgba(16,8,28,0)');
  disc(R,back);disc(R*MOTE_NEON,color);disc(R*MOTE_WHITE,'#fff');
 });
 return moteSprites=c;
}
function drawSparks(now){
 const sprites=motes();
 ctx.save();
 for(let i=0;i<SPARK_N;i++){
  const age=now-sparkBorn[i];if(age<0||age>=SPARK_LIFE)continue;
  const life=age/SPARK_LIFE,drift=age/1000*(1-life/2),x=sparkX[i]+sparkVX[i]*drift,y=sparkY[i]+sparkVY[i]*drift+16*life*life;
  const tw=.5+.5*Math.sin(age*.04+i*2.4),h=sparkSize[i]*(.8+.2*tw)/MOTE_NEON;
  ctx.globalAlpha=(1-life*life)*(.55+.45*tw);
  ctx.drawImage(sprites,sparkHue[i]*MOTE_PX,0,MOTE_PX,MOTE_PX,x-h,y-h,2*h,2*h);
 }
 ctx.restore();
}
function starPath(p,x,y,len,waist,rot){
 for(let k=0;k<8;k++){const a=rot+k*Math.PI/4,rr=k%2?waist:len,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;k?p.lineTo(px,py):p.moveTo(px,py);}
 p.closePath();
}
// Fingertip bloom + slowly turning star flare: a dark halo (so it reads on beige), a white-hot → neon bloom,
// then a long and a short four-point star in one fill. A few fills per tip per frame, not per particle.
// size scales the whole flare (the release shimmer reuses it as a smaller, faster-turning glint).
// `rgb` is an [r,g,b] triple so rgba() stops can be built directly.
function drawFlare(x,y,[r,g,b],alpha,now,size=1){
 const neon=a=>`rgba(${r},${g},${b},${a})`;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(size,size);
 let grad=ctx.createRadialGradient(0,0,0,0,0,30);grad.addColorStop(0,'rgba(16,8,28,.3)');grad.addColorStop(1,'rgba(16,8,28,0)');
 ctx.fillStyle=grad;ctx.fillRect(-30,-30,60,60);
 grad=ctx.createRadialGradient(0,0,0,0,0,20);
 grad.addColorStop(0,'#fff');grad.addColorStop(.25,'rgba(255,255,255,.9)');grad.addColorStop(.5,neon(.75));grad.addColorStop(1,neon(0));
 ctx.fillStyle=grad;ctx.fillRect(-20,-20,40,40);
 const star=new Path2D(),rot=now/1200;starPath(star,0,0,28,3,rot);starPath(star,0,0,14,2.5,rot+Math.PI/4);
 grad=ctx.createRadialGradient(0,0,0,0,0,28);
 grad.addColorStop(0,'#fff');grad.addColorStop(.18,'#fff');grad.addColorStop(.45,neon(.95));grad.addColorStop(1,neon(0));
 ctx.fillStyle=grad;ctx.fill(star);
 ctx.restore();
}
const pathLength=pts=>{let d=0;for(let i=1;i<pts.length;i++)d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return d;};
const ribbonPath=pts=>{const p=new Path2D();pts.forEach((pt,i)=>i?p.lineTo(pt.x,pt.y):p.moveTo(pt.x,pt.y));return p;};
// Gradient stops every TRAIL_STOP_PX of arc length (interpolated inside long segments, capped at
// TRAIL_MAX_STOPS so cost doesn't grow with point count), each placed at its projection on the tail→head
// axis — the one line a canvas gradient follows — so colour and fade track the path for any stroke that
// doesn't fold back past 90°. d0: stroke length already faded off the tail (keeps colours anchored).
function ribbonSamples(pts,now,d0){
 const tail=pts[0],head=pts[pts.length-1],ax=head.x-tail.x,ay=head.y-tail.y,len2=ax*ax+ay*ay;
 if(len2<1)return null;
 const total=pathLength(pts),step=Math.max(TRAIL_STOP_PX,total/TRAIL_MAX_STOPS),stops=[];
 let d=0,next=0,off=0;
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i],seg=Math.hypot(b.x-a.x,b.y-a.y);
  while(next<=d+seg){
   const f=seg?(next-d)/seg:0,x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;
   off=Math.max(off,Math.min(1,((x-tail.x)*ax+(y-tail.y)*ay)/len2));
   stops.push({off,alpha:fadeAlpha(now-(a.t+(b.t-a.t)*f)),d:d0+next});next+=step;
  }
  d+=seg;
 }
 stops.push({off:1,alpha:fadeAlpha(now-head.t),d:d0+total});
 return{tail,head,stops};
}
function ribbonGradient({tail,head,stops},colorAt){
 const g=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);
 for(const s of stops){const[r,gg,b]=colorAt(s.d);g.addColorStop(s.off,`rgba(${r},${gg},${b},${s.alpha.toFixed(3)})`);}
 return g;
}
// Full-motion trail: six stroke() passes over one Path2D (no shadows, so cost doesn't scale with point
// count) — a soft dark underglow so the neon pops on the light quilt, a wide soft two-step neon glow, a
// vivid core, a white-hot centre — then the tip flare. `live` also sheds dust; a just-released trail (in
// `fading`) keeps rendering with no new tip dust until it ages out.
function renderRibbon(pts,now,live){
 let start=0,d0=0;
 while(start<pts.length-1&&now-pts[start].t>=TRAIL_FADE_MS){d0+=Math.hypot(pts[start+1].x-pts[start].x,pts[start+1].y-pts[start].y);start++;}
 if(now-pts[start].t>=TRAIL_FADE_MS)return;
 const visible=start?pts.slice(start):pts,tip=visible[visible.length-1];
 const samples=visible.length>1&&ribbonSamples(visible,now,d0);
 if(samples){
  const path=ribbonPath(visible),dark=ribbonGradient(samples,()=>UNDERGLOW),neon=ribbonGradient(samples,d=>trailColor(d,now)),hot=ribbonGradient(samples,()=>WHITE);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const pass=(style,alpha,width)=>{ctx.strokeStyle=style;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke(path);};
  pass(dark,.08,40);pass(dark,.12,32); // soft dark underglow
  pass(neon,.3,26);pass(neon,.42,17); // wide soft glow
  pass(neon,1,6.5); // vivid core
  pass(hot,1,1.5); // white-hot centre
  ctx.restore();
 }
 drawFlare(tip.x,tip.y,trailColor(d0+pathLength(visible),now),Math.max(.35,fadeAlpha(now-tip.t)),now);
 if(live)shedSparks(visible,now);
}
// #105 release shimmer: a star glint sweeps the part of the path still lit at release, tail→tip, over
// SHIMMER_MS, shaking dust loose as it goes (so the last motes are gone ~SHIMMER_MS+SPARK_LIFE after release).
function shimmerPoint({pts,releasedAt},now){
 const k=(now-releasedAt)/SHIMMER_MS;if(k<0||k>1)return null;
 let i=0,d=0;
 while(i<pts.length-1&&releasedAt-pts[i].t>=TRAIL_FADE_MS){d+=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);i++;}
 let left=k*pathLength(pts.slice(i));d+=left;
 for(;i<pts.length-1;i++){
  const a=pts[i],b=pts[i+1],seg=Math.hypot(b.x-a.x,b.y-a.y);
  if(seg>=left){const f=seg?left/seg:0;return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,d,k};}
  left-=seg;
 }
 return{x:pts[i].x,y:pts[i].y,d,k};
}
function shimmerDust(entry,now){const s=shimmerPoint(entry,now);if(s){spawnSpark(s.x,s.y,now);spawnSpark(s.x,s.y,now);}return s;}
function drawShimmer(entry,now){
 const s=shimmerDust(entry,now);if(s)drawFlare(s.x,s.y,trailColor(s.d,now),1-.4*s.k,now*2,.7);
}
function renderPlainTrail(pts,now){
 const trail=pts.filter(pt=>now-pt.t<TRAIL_FADE_MS).map(pt=>[pt.x,pt.y]);
 strokeGlow(trail,'#d8f6ff',1,4);
 const last=pts.at(-1);if(last&&now-last.t<TRAIL_FADE_MS)touchDot(last.x,last.y,'#d8f6ff');
}
// Test-only trail probe: exposed as myr5Portal.trailProbe only when a test sets window.__portalTrailProbe
// before mount (the app never does). It drives the trail renderer directly, skipping the cloth-board press
// that makes synthetic drags slower than the fade in headless runs, so frames show the trail at full strength.
const PROBE_ID=-1;
let probeFrozen=false;
const trailProbe={
 // Draws one frozen frame of `xy` ([[x,y],…]) swept over durationMs ending now (or releasedAgoMs ago), with
 // the dust those frames would have shed replayed at 60fps. Returns how many motes are alive. dust:false
 // draws the ribbon and tip alone, so a cross-section measures the strokes without motes drifting across it.
 draw(xy,{durationMs=350,releasedAgoMs=null,dust=true}={}){
  cancelAnimationFrame(rafId);rafId=0;probeFrozen=true;clearTimeout(idleTimer);idleCycle=null;
  const now=performance.now(),end=now-(releasedAgoMs??0),n=xy.length;
  const pts=xy.map(([x,y],i)=>({x,y,t:end-durationMs*(1-i/Math.max(1,n-1))}));
  sparkBorn.fill(-1e9);
  if(!dust){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);ctx.restore();renderRibbon(pts,now,false);return 0;}
  for(let ft=pts[0].t;ft<end;ft+=1000/60)shedSparks(pts.filter(p=>p.t<=ft),ft);
  pointers.delete(PROBE_ID);fading.length=0;
  if(releasedAgoMs==null)pointers.set(PROBE_ID,{pts,norm:[]});
  else{const entry={pts,releasedAt:end};fading.push(entry);for(let ft=end;ft<now;ft+=1000/60)shimmerDust(entry,ft);}
  drawFrame(0,now);
  let alive=0;for(let i=0;i<SPARK_N;i++)if(now-sparkBorn[i]<SPARK_LIFE)alive++;
  return alive;
 },
 // Live strokes (fps check): down/move/up like a finger, minus the cloth press and shape matching.
 down(x,y){probeFrozen=false;pointers.set(PROBE_ID,{pts:[{x,y,t:performance.now()}],norm:[]});scheduleIdle();kickRender();},
 move(x,y){pointers.get(PROBE_ID)?.pts.push({x,y,t:performance.now()});},
 up(){const p=pointers.get(PROBE_ID);pointers.delete(PROBE_ID);if(p?.pts.length>1)fading.push({pts:p.pts,releasedAt:performance.now()});scheduleIdle();kickRender();},
 resume(){probeFrozen=false;pointers.delete(PROBE_ID);fading.length=0;kickRender();},
};

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

// now: the trail probe draws a frozen frame at a chosen time (rAF's own timestamp arrives first and is ignored).
function drawFrame(_,now=performance.now()){
 rafId=0;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);ctx.restore();
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
// Neon wormhole under a liquid-glass slab (Ian 2026-09-23: "a mix of colours with the apple glass effect",
// "a wormhole with endless depth"). One raw WebGL2 triangle fills a canvas the size of the glass box (the cut's
// bounds + bleed): polar tunnel around the centroid, the six neons streaming inward as twisted rings with the
// shape's colour leading, a glowing core and depth fog. The glass comes from a per-shape lens map: refraction
// that bends the tunnel near the rim, chromatic fringe, a bright specular rim on the lit (top-left) edge, a softer
// inner edge on the far side, frosting with boosted saturation and a light sweep.
const NEONS=['#ff5f1f','#ffff33','#39ff14','#1f51ff','#b026ff','#ff10f0']; // Ian's six, in hue order so neighbours mix clean
// Ring colours down the tunnel: the shape's colour on about 40% of the rings, the other neons between; the cross is an even rainbow.
export function ringColours(color,all=false){
 if(all)return NEONS;
 const seq=[];NEONS.filter(c=>c!==color).forEach((c,i)=>{if(i%3!==2)seq.push(color);seq.push(c);});return seq;
}
// Lens map, one RGBA texel per GLASS.mapPx: rg = outward normal of the nearest rim edge, b = signed distance to the
// rim (.5 on it, 1 at GLASS.bevel inside, 0 at GLASS.bevel outside). poly: closed, box-local CSS px.
export function lensMap(poly,w,h,px=GLASS.mapPx,bevel=GLASS.bevel){
 const mw=Math.max(1,Math.ceil(w/px)),mh=Math.max(1,Math.ceil(h/px)),data=new Uint8Array(mw*mh*4),P=Float64Array.from(poly.flat()),n=P.length-2;
 for(let j=0;j<mh;j++)for(let i=0;i<mw;i++){
  const x=(i+.5)*px,y=(j+.5)*px;let best=Infinity,nx=0,ny=0,inside=false;
  for(let k=0;k<n;k+=2){ // nearest point on each edge + even-odd crossing, in one pass (runs once per glass, at the cut)
   const ax=P[k],ay=P[k+1],bx=P[k+2],by=P[k+3],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1))),qx=ax+t*dx-x,qy=ay+t*dy-y,d=qx*qx+qy*qy;
   if(d<best){best=d;nx=qx;ny=qy;}
   if((ay>y)!==(by>y)&&x<dx*(y-ay)/dy+ax)inside=!inside;
  }
  const d=Math.sqrt(best)||1,s=inside?1:-1,o=4*(j*mw+i);
  data[o]=128+127*s*nx/d;data[o+1]=128+127*s*ny/d;data[o+2]=255*Math.min(1,Math.max(0,.5+s*d/(2*bevel)));data[o+3]=255;
 }
 return {data,mw,mh};
}
const TUNNEL_VS='#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}';
const TUNNEL_FS=`#version 300 es
precision highp float;
uniform vec2 uRes,uC;uniform float uR,uT,uSpin,uSweep,uLens,uBevel,uPr,uFringe,uN;uniform vec3 uSeq[10],uCore;uniform sampler2D uMap;out vec4 o;
vec3 seq(float i){return uSeq[int(mod(i,uN))];}
vec3 tunnel(vec2 p,float fz){
 float aa=1.-smoothstep(.25,.9,fz); // fade ring detail that gets finer than a pixel
 vec2 d=(p-uC)/uR;float r=max(length(d),1e-3),z=3.4/r,a=atan(d.y,d.x)+uSpin+.12*z;
 float v=z-uT+.35*sin(a*3.+z*.5)*aa,i=floor(v),f=v-i;         // wavy ring edges: the colours flow, not a target
 vec3 c=mix(seq(i),seq(i+1.),smoothstep(.65,1.,f));
 c*=mix(.85,.55+.45*(.5+.5*sin(a*7.+v*6.2832)),aa); // twisted streaks
 c+=max(pow(f,12.),1.-smoothstep(0.,1.5*fz,f))*aa*(c*.8+.35); // bright leading edge of each ring, antialiased across the wrap
 c=mix(c,uCore,smoothstep(7.,40.,z));            // depth fog: the far end glows
 c+=uCore*exp(-r*16.)*1.1;                        // bright core at the vanishing point
 return c*mix(1.,.78,smoothstep(1.,1.8,r));      // walls dim a little toward the opening (more turns neon yellow olive)
}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);vec4 m=texture(uMap,p/uRes);
 float fz=fwidth(3.4*uR/max(length(p-uC),1e-3)); // ring depth change per pixel
 vec2 n=m.rg*2.-1.;n/=max(length(n),1e-3);
 float sd=(m.b-.5)*2.*uBevel,e=clamp(sd/uBevel,0.,1.),bend=(1.-e)*(1.-e);vec2 off=n*uLens*bend; // refraction: the rim shows the tunnel from further out
 vec3 c=uFringe>0.&&bend>.02?vec3(tunnel(p+off*1.12,fz).r,tunnel(p+off,fz).g,tunnel(p+off*.88,fz).b):tunnel(p+off,fz);
 float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.3)*.92+.06; // frosted: lifted, saturation boosted
 vec2 L=normalize(vec2(-1.,-1.3));float lit=max(dot(n,L),0.),far=max(-dot(n,L),0.);
 c+=(1.-smoothstep(0.,3.*uPr,abs(sd)))*(1.2*pow(lit,1.2)+.45*pow(far,3.)); // thin bright rim on the lit edge, faint glint opposite
 float inner=(1.-smoothstep(0.,24.*uPr,sd))*step(0.,sd);
 c=mix(c,c*.5+.1,inner*far*.75)+inner*inner*lit*.3; // softer, darker inner edge on the far side, glow inside the lit edge
 c+=.08*(1.-smoothstep(0.,.75,length(p/uRes-vec2(.2,.08))))*step(0.,sd); // broad glare on the slab's lit corner
 if(sd<0.)c*=.55;                                 // beyond the rim, under the cloth's ragged edge
 float s=dot(p/length(uRes),normalize(vec2(1.,.45)))-uSweep;c+=exp(-s*s*160.)*.18*step(0.,sd); // light sweep
 o=vec4(c+(fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453)-.5)/255.,1);
}`;
// One WebGL2 context for the portal's life, created on the first glass and reused; null when unavailable (CSS glass then).
let tunnel=null;
function tunnelGL(){
 if(tunnel)return tunnel;
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
 if(!gl)return null;
 const prog=gl.createProgram();
 for(const [type,src] of [[gl.VERTEX_SHADER,TUNNEL_VS],[gl.FRAGMENT_SHADER,TUNNEL_FS]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);gl.attachShader(prog,s);}
 gl.linkProgram(prog);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){console.warn('Portal wormhole unavailable.',gl.getProgramInfoLog(prog));gl.getExtension('WEBGL_lose_context')?.loseContext();return null;}
 gl.useProgram(prog);
 const u={};for(const k of ['uRes','uC','uR','uT','uSpin','uSweep','uLens','uBevel','uPr','uFringe','uN','uSeq','uCore'])u[k]=gl.getUniformLocation(prog,k);
 gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 canvas.addEventListener('webglcontextlost',()=>{if(tunnel?.canvas===canvas)tunnel=null;canvas.parentNode?.classList.remove('gl');canvas.remove();});
 return tunnel={canvas,gl,u};
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const easeInOut=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// Runs the wormhole for one glass phase: speed ramps up across the cut + loading phase, the vanishing point drifts
// toward the finger (and with device tilt where that needs no permission prompt). Reduced motion draws one still frame.
// ph.stop() freezes it (at the reveal) and endPhase() always stops it.
function startTunnel(ph,poly,color,all){
 const t=tunnelGL();if(!t)return;
 const {gl,u,canvas}=t,{left,top,w,h}=ph.box,reduced=prefersReducedMotion(),seq=ringColours(color,all);
 const tex=lensMap(bleedPts(poly,-GLASS.rimInset).map(([x,y])=>[x-left,y-top]),w,h);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,tex.mw,tex.mh,0,gl.RGBA,gl.UNSIGNED_BYTE,tex.data);
 const flat=new Float32Array(30);seq.forEach((c,i)=>flat.set(rgb(c),3*i));gl.uniform3fv(u.uSeq,flat);gl.uniform1f(u.uN,seq.length);
 gl.uniform3fv(u.uCore,all?[1,1,1]:rgb(color).map(v=>v*.5+.5));
 const [cx,cy]=centroidOf(poly).map((v,i)=>v-(i?top:left)),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),R=.5*Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 // ponytail: hardwareConcurrency is a coarse low-end hint (and capped on some browsers); the measured-frame check below is the real guard.
 let pr=Math.min(devicePixelRatio||1,(navigator.hardwareConcurrency||8)<=4?1:1.5),lite=false,travel=.3,last=ph.t0,raf=0,tilt=null,tilt0=null;
 const par=[0,0],slow=[];
 const size=()=>{
  canvas.width=Math.max(1,Math.round(w*pr));canvas.height=Math.max(1,Math.round(h*pr));gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(u.uRes,canvas.width,canvas.height);gl.uniform1f(u.uPr,pr);gl.uniform1f(u.uR,Math.max(R,1)*pr);gl.uniform1f(u.uLens,GLASS.bend*pr);gl.uniform1f(u.uBevel,GLASS.bevel*pr);gl.uniform1f(u.uFringe,lite?0:1);
 };
 const draw=now=>{
  const age=now-ph.t0;
  gl.uniform1f(u.uT,travel);gl.uniform1f(u.uSpin,reduced?0:(age*.00018)%(2*Math.PI));gl.uniform1f(u.uSweep,reduced?.45:-.35+1.7*((age/3200)%1));
  gl.uniform2f(u.uC,(cx+par[0])*pr,(cy+par[1])*pr);gl.drawArrays(gl.TRIANGLES,0,3);
 };
 const onTilt=e=>{if(e.gamma==null)return;tilt0??=[e.gamma,e.beta];tilt=[-(e.gamma-tilt0[0])*R*.012,-(e.beta-tilt0[1])*R*.012];};
 const frame=now=>{
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  // Graceful degrade: if frames 10-40 run slow (median under ~45 fps), drop resolution and the fringe.
  if(!lite&&slow.length<40&&slow.push(dt)===40&&slow.slice(10).sort((a,b)=>a-b)[15]>.022){lite=true;pr=Math.min(pr,.75);size();ph.glass.dataset.lite='1';}
  const d=ph.diveT0?Math.min(1,(now-ph.diveT0)/PORTAL.revealMs):0; // the dive adds up to tunnelDive rings/s
  travel=(travel+dt*(PORTAL.tunnelFrom+(PORTAL.tunnelTo-PORTAL.tunnelFrom)*easeInOut((now-ph.t0)/(PORTAL.cutMs+PORTAL.loadMinMs))+PORTAL.tunnelDive*d*d))%seq.length;
  const finger=[...pointers.values()].at(-1)?.pts.at(-1);let tx=(tilt?.[0]||0)+(finger?(finger.x-left-cx)*.12:0),ty=(tilt?.[1]||0)+(finger?(finger.y-top-cy)*.12:0);
  const k=Math.min(1,.2*R/(Math.hypot(tx,ty)||1));par[0]+=(tx*k-par[0])*Math.min(1,dt*5);par[1]+=(ty*k-par[1])*Math.min(1,dt*5);
  draw(now);raf=requestAnimationFrame(frame);
 };
 size();ph.glass.append(canvas);ph.glass.classList.add('gl');draw(ph.t0);
 if(reduced)return;
 const tiltOk=typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission!=='function';
 if(tiltOk)addEventListener('deviceorientation',onTilt);
 raf=requestAnimationFrame(frame);
 ph.stop=()=>{cancelAnimationFrame(raf);if(tiltOk)removeEventListener('deviceorientation',onTilt);};
}
// The glass sits between #portalHome's background and the board canvas, so it shows only through the cut.
// pts: client-px polygon to clip to (null = whole screen); all: even rainbow (the cross). The box is the clip's
// bounds, so the wormhole only fills what can show. <b> is the CSS fallback when WebGL2 is unavailable.
// edge: the cut outline. A static glass bezel is drawn along it ABOVE the board: the cut drops whole mesh
// triangles, so the cloth's hole edge stair-steps up to ~12 px either side of the outline, and the bezel covers that.
function showGlass(pts,color,all=false,edge=pts){
 endPhase();
 const poly=pts||closeLoop([[0,0],[innerWidth,0],[innerWidth,innerHeight],[0,innerHeight]]),clip=pts?bleedPts(pts):poly;
 const xs=clip.map(p=>p[0]),ys=clip.map(p=>p[1]),left=Math.floor(Math.min(...xs)),top=Math.floor(Math.min(...ys)),w=Math.ceil(Math.max(...xs))-left,h=Math.ceil(Math.max(...ys))-top;
 const el=document.createElement('div');el.className='portal-glass';el.setAttribute('aria-hidden','true');el.innerHTML='<b></b>';el.classList.toggle('all',all);
 el.style.cssText=`left:${left}px;top:${top}px;width:${w}px;height:${h}px`;el.style.setProperty('--glass',color);
 if(pts)el.style.clipPath=`polygon(${clip.map(([x,y])=>`${x-left}px ${y-top}px`).join(',')})`;
 if(!prefersReducedMotion())el.style.setProperty('animation','portal-glass-in .6s ease both','important'); // beats the locked theme's animation:none
 portalHome.append(el);
 let bezel=null;
 if(edge){
  // Width: 1.55 grid cells (24 px on a phone). Measured at 375x812, the hole edge strays up to 11.2 px (0.72 cell) from the outline.
  const B=1.55*(board?.faceRect().width||375)/QUILT.segX,p=edge.map(q=>q.join(',')).join(' '),ring=(cls,w,more='')=>`<polygon class="${cls}" stroke-width="${w}" ${more} points="${p}"/>`;
  portalHome.insertAdjacentHTML('beforeend',`<svg class="portal-bezel" aria-hidden="true" style="--glass:${color}"><defs><linearGradient id="portalBezelLit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="lit"/><stop offset=".5" class="mid"/><stop offset="1" class="far"/></linearGradient><linearGradient id="portalBezelSpec" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient></defs>${ring('shade',B+10)+ring('shade',B+5)+ring('body',B)+ring('glow',B*.6)+ring('glow',B*.36)+ring('core',2.5)+ring('spec',2,`transform="translate(${-.3*B} ${-.3*B})"`)}</svg>`); // stacked strokes, no blur filters: those cost a ~100 ms first paint
  bezel=portalHome.lastElementChild;
  if(!prefersReducedMotion())bezel.style.setProperty('animation','portal-glass-in .3s ease both','important');
 }
 phase={glass:el,bezel,pts,color,t0:performance.now(),pulse:false,box:{left,top,w,h}};
 startTunnel(phase,poly,color,all);
}
function endPhase(){phase?.stop?.();phase?.dive?.cancel();phase?.glass.remove();phase?.bezel?.remove();phase=null;}
function ripple(x,y){
 if(!phase||prefersReducedMotion())return;
 const r=document.createElement('i');r.className='portal-ripple';r.style.left=(x-phase.box.left)+'px';r.style.top=(y-phase.box.top)+'px';
 r.style.setProperty('animation',`portal-ripple ${PORTAL.rippleMs}ms cubic-bezier(.2,.6,.3,1) forwards`,'important'); // beats the locked theme's animation:none
 phase.glass.append(r);setTimeout(()=>r.remove(),PORTAL.rippleMs);
}
// Cuts a client-px polygon out of the board (board.cut takes face coords, v down) and resolves once the piece has fallen in.
function cutBoard(pts,color){
 const f=board?.faceRect();if(!f)return Promise.resolve();
 return board.cut(pts.map(([x,y])=>[(x-f.left)/f.width,(y-f.top)/f.height]),color,prefersReducedMotion()?0:PORTAL.cutMs);
}
function revealDialogFromPoint(dialog,[cx,cy],ms=500){
 if(prefersReducedMotion())return;
 const dbox=dialog.getBoundingClientRect();
 dialog.style.transformOrigin=`${cx-dbox.left}px ${cy-dbox.top}px`;motion(dialog,'none');dialog.style.transform='scale(.05)';dialog.style.opacity='0';
 settle().then(()=>{if(!dialog.open)return;motion(dialog,`transform ${ms}ms cubic-bezier(.2,0,.3,1),opacity ${ms*.8}ms ease`);dialog.style.transform='';dialog.style.opacity='';});
}
// Dive into the wormhole (Ian 2026-09-23, #103 "zoom into each portal once opened"): the whole portal scales up about the
// vanishing point until the shape covers the screen, easing in over revealMs while the tunnel speeds up. A compositor-only
// Web Animation: the locked theme can't switch it off and it leaves `transition` free for the hole/fade. Reduced motion: a
// quick fade. endPhase() cancels it.
function dive(pts){
 if(!phase)return Promise.resolve();
 const c=centroidOf(pts);let rIn=Infinity;
 for(let k=0;k<pts.length-1;k++){const [ax,ay]=pts[k],[bx,by]=pts[k+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((c[0]-ax)*dx+(c[1]-ay)*dy)/(dx*dx+dy*dy||1)));rIn=Math.min(rIn,Math.hypot(ax+t*dx-c[0],ay+t*dy-c[1]));}
 const far=Math.max(...[[0,0],[innerWidth,0],[0,innerHeight],[innerWidth,innerHeight]].map(([x,y])=>Math.hypot(x-c[0],y-c[1]))),reduced=prefersReducedMotion();
 portalHome.style.transformOrigin=`${c[0]}px ${c[1]}px`;phase.diveT0=performance.now();
 phase.dive=portalHome.animate(reduced?[{opacity:1},{opacity:0}]:[{transform:'none'},{transform:`scale(${Math.max(1.5,1.05*far/Math.max(rIn,1))})`}],{duration:reduced?200:PORTAL.revealMs,easing:reduced?'ease':'cubic-bezier(.55,0,.9,.5)',fill:'forwards'});
 return phase.dive.finished.catch(()=>{});
}
// The destination dialog grows out of the tunnel's core; its backdrop fades in so the dive stays visible behind it.
function arriveFromCore(dialog,core,ms){
 if(prefersReducedMotion())return;
 dialog.style.setProperty('--portal-arrive',ms+'ms');dialog.classList.add('portal-arriving');
 revealDialogFromPoint(dialog,core,ms);
 setTimeout(()=>{dialog.classList.remove('portal-arriving');dialog.style.removeProperty('--portal-arrive');motion(dialog,'');dialog.style.transformOrigin='';},ms+100);
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
  const cut=shapeClipPts('rect',rect);
  showGlass(face&&closeLoop(toClientPts([[0,0],[1,0],[1,1],[0,1]],face)),'#ffffff',true,cut); // rainbow glass behind the whole board; the whole pattern falls in over it
  await Promise.all([cutBoard(cut,'#ffffff'),fallInAll(center)]);
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
 // Reveal: dive into the wormhole; the destination appears from its core over the last `arrive` ms of the dive.
 const dove=dive(pts),core=centroidOf(pts),arrive=PORTAL.revealMs*.55;
 if(prefersReducedMotion()||menu.kind==='nav')await dove;else await sleep(PORTAL.revealMs-arrive);
 if(!current())return;
 if(menu.kind==='home'){await growHole(portalHome,pts,rectBox(portalHome),current,arrive);if(current()){setVisible(false);menu.open?.();}return;}
 if(menu.kind==='nav'){menu.open();return;} // the glass stays up while the next page loads
 let dialog=null;
 backgroundBlocked(false);
 try{dialog=await menu.open?.();}catch(error){console.warn(`${menu.label} failed to open.`,error);}
 if(dialog instanceof HTMLDialogElement&&dialog.open&&current())arriveFromCore(dialog,core,arrive); // before its first paint: no full-size flash
 await settle();
 if(!current())return;
 const shown=dialog instanceof HTMLDialogElement?dialog.open:dialog?.getClientRects?.().length>0;
 // Panel missing in this build (or it refused to open): never leave the screen stuck on the glass.
 if(!shown){status(`${menu.label} isn't available here yet.`);await fadeOutBoard();fadeInBoard();return;}
 if(dialog instanceof HTMLDialogElement){
  await dove;
  if(!current())return;
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
 if(!boardFailed){wirePointerEvents();(window.requestIdleCallback||setTimeout)(()=>{if(!lifetime.signal.aborted)tunnelGL();});} // compile the wormhole while idle, not at the first cut
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
  dispose(){if(lifetime.signal.aborted)return;setVisible(false);clearTimeout(idleTimer);idleTimer=0;idleCycle=null;fading.length=0;boardLoad++;lifetime.abort();overlayObserver?.disconnect();board?.dispose();board=null;menuChosen=true;menuSheet.close();menuSheet.remove();portalHome.remove();tunnel?.gl.getExtension('WEBGL_lose_context')?.loseContext();tunnel=null;for(const cancel of flashes)cancel();window.myr5Portal=null;},
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
 if(window.__portalTrailProbe===true)window.myr5Portal.trailProbe=trailProbe;
 return window.myr5Portal;
}
