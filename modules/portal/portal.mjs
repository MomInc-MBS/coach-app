import {portalWindow,lensPts,shapeOutlinePts} from './portal-apertures.mjs';
export {portalWindow,lensPts} from './portal-apertures.mjs';
// Portal home board: the quilt cloth board replaces the app home menu. Tracing one of the eight
// stitched shapes cuts that shape out of the 3D board — the piece falls in, neon liquid glass glows
// through the hole behind it for a short interactive loading phase — then opens the shape's menu.
// AGPL-3.0-or-later.
import {createQuiltBoard2D,createQuiltBoardGL,QUILT} from './portal-board.mjs';
import {createGlbBoard,frameOf,GLB} from './portal-board-glb.mjs';
import {ice} from './portal-board-ice.mjs';
import {grass} from './portal-board-grass.mjs';
import {cogs} from './portal-board-cogs.mjs';
import {jelly} from './portal-board-jelly.mjs';
import {wood} from './portal-board-wood.mjs';
import {pond} from './portal-board-pond.mjs';
import {readLook,saveLook,applyLookVars,stripSeq,LOOK_DEFAULTS} from './portal-look.mjs';
import {recognizeShape,nearestShape,SHAPES} from './portal-shapes.mjs';
import {pointInPolygon} from './portal-cut.mjs';
import {eye} from './peer.mjs';
import {paletteFor,paletteOptions} from './portal-tunnel-palettes.mjs';

// Portal sequence timings (ms): the cut piece falling in, the minimum live-glass loading phase, the
// dive into the wormhole (the destination appears from its core), the healed board fading back in, one touch ripple on
// the glass. tunnelFrom/To: wormhole speed (rings per second) at the cut, ramping up to tunnelTo by the dive, which adds
// up to tunnelDive more. short (#124): the lines' and the X's wormhole runs the same cut, glass and dive at this share of
// the closed shapes' cut/loading/dive timings.
export const PORTAL={cutMs:867,loadMinMs:2333,revealMs:733,healMs:267,rippleMs:600,tunnelFrom:.35,tunnelTo:1.5,tunnelDive:6,short:.58};
// Liquid-glass slab over the wormhole (CSS px): lens-map texel, bevel depth, max refraction at the rim,
// rim inset inside the cut (the cloth hole's edge is ragged by about half a grid cell). #125 (Ian: "stronger"): thicker
// bevel and deeper bend; fringe: the red/blue sample spread at the rim (blue bends furthest); magnify: centre lens.
const GLASS={mapPx:3,bevel:42,bend:36,rimInset:8,fringe:.3,magnify:.035};
// #104/#105 (W2-2E): the six neons already used for the "all menus" glass (portal.css .portal-glass.all),
// reused for the flowing finger-trail ribbon. IDLE (Ian 26 Sept: "just the slow one with 7 seconds of idle time"): 7s of
// no touch arms the cycle, 2.5s per shape in the order below with a gapMs of nothing between them, until the next touch.
// TRAIL_FADE_MS: how long a trail segment (live or just-released) stays lit before it's fully faded.
const TRAIL_NEONS=['#ff5f1f','#b026ff','#ff10f0','#1f51ff','#39ff14','#ffff33'];
const TRAIL_NEON_RGB=TRAIL_NEONS.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
const IDLE={armMs:7000,slowMs:2500,gapMs:600};
// Ian 2026-09-23: square, oval, triangle, inverted triangle, diamond, X, then the four lines; cross last.
const IDLE_ORDER=['rect','oval','up','down','vdiamond','x','line-lr','line-rl','line-down'];
const TRAIL_FADE_MS=800;
// #20 double-tap to open: a second tap within TAP_MS and TAP_MOVE_PX of the first counts as one double-tap;
// TAP_HIT_PX is how close (client px) it must land to a shape's stitched outline. #21 "almost": a failed
// trace whose closest candidate (nearestShape) still covers at least ALMOST_COVER of both trace and template
// gets the near-miss flash instead of silence; ALMOST_MS is how long that flash (with its label) stays up.
// #22 first-run hint: HINT_MS is one lap of the glowing fingertip around the square.
// ALMOST_COVER sits well above the ~0.55-0.60 a wrong-shape trace (a circle, an L, a stray diagonal) scores
// against its closest candidate, and below the ~0.65-0.78 a genuine partial trace of the right shape (most
// of a rect with the last side never closed) scores — calibrated against portal-shapes.test.mjs's near-miss
// fixtures so a scribble never earns an "Almost".
const TAP_MS=350,TAP_MOVE_PX=32,TAP_HIT_PX=14,ALMOST_COVER=.65,ALMOST_MS=1200,HINT_MS=2600,HINT_KEY='myr5.portalHintShown';
// Only the shapes that actually cut/glass/dive through portalSequence's default branch (SHAPES entries
// that are single closed-area strokes, i.e. not 'x'/'cross'/'line') are tap targets — matches #20's "same
// cut, glass and dive" as tracing.
const TAPPABLE_IDS=Object.keys(SHAPES).filter(id=>!['x','cross','line'].includes(id));

// Board catalogue: add one line per wave-2 board here. Each board is two layers: `flat`, a still picture on a 2D canvas
// (portal-board.mjs createQuiltBoard2D) that is always mounted and never needs WebGL, and `create`, the 3D board drawn over
// it once it has rendered. A grimoire's flat picture is its poster, laid out at its GLB face's width/height (FACE, measured)
// with its guides drawn in its shape frame. WAIT (ms): how long a poster, then a 3D board, may take before it counts as failed,
// and how long the first mount waits for 3D before the portal comes up flat (3D then takes over when it has drawn).
export const PRODUCTION_PORTALS=Object.freeze(['quilt','ice','grass','jelly','wood','pond']);
const FACE={ice:.5903,grass:.5625,cogs:.5715,jelly:.5892,wood:.5847,pond:.5625},WAIT={poster:6000,threeD:20000,mount:4000};
// trace (R7): the flat poster keeps the board's own touch effect in 2D (ice cracks, flowers, weld, jelly gash, embers).
const grimoire=(label,effect)=>({label,flat:async host=>{const flat=await createQuiltBoard2D(host,{src:`/pod/worlds/boards/${effect.id}-poster.webp`,ratio:FACE[effect.id],frame:frameOf(effect,GLB),background:effect.background,guide:effect.guide,waitMs:WAIT.poster,trace:effect.trace2d,tint:effect.keepColors?null:boardTint(effect.id),tintSelected:hasBoardTint(effect.id),tintTarget:effect.id==='grass'||effect.keepColors?'trace':effect.id==='cogs'?'cogs':'poster',...(effect.id==='cogs'?{backplateTint:cogsBackplateTint(),backplateTintSelected:hasCogsBackplateTint()}: {})});if(effect.id==='cogs')flat.setBackplateTint?.(cogsBackplateTint(),hasCogsBackplateTint());return flat;},create:host=>{if(effect.id==='cogs')effect.setBackplateTint?.(cogsBackplateTint(),hasCogsBackplateTint());return createGlbBoard(host,{effect});}});
const BOARDS={quilt:{label:'Quilt',flat:host=>createQuiltBoard2D(host),create:host=>createQuiltBoardGL(host)},ice:grimoire('Crystal',ice),grass:grimoire('Grass',grass),cogs:grimoire('Cogs',cogs),jelly:grimoire('Jelly',jelly),wood:grimoire('Wood',wood),pond:grimoire('Pond',pond)};
// Test-only stub board — never in PRODUCTION_PORTALS, so it's invisible to real users — letting tests drive
// a non-quilt boardId (via ?board=__stub__) without a second real board existing yet. Set before this module
// is imported (window.__portalTrailProbe above is the same pattern). Its create() only touches `host` at
// call time, never `document` at module-eval time, so importing this module without a DOM still works.
if(typeof window!=='undefined'&&window.__portalTestStubBoard===true)
 BOARDS.__stub__={label:'Stub',flat:host=>Promise.resolve({
  background:'#000',
  faceRect:()=>({left:0,top:0,width:host.clientWidth||1,height:host.clientHeight||1}),
  patternRect:()=>({left:0,top:0,width:host.clientWidth||1,height:host.clientHeight||1}),
  cut:()=>Promise.resolve(),heal(){},press(){},release(){},pause(){},resume(){},dispose(){},
 })};
const BOARD_KEY='myr5.portalBoard';
const portalSound=(kind,extra={})=>window.dispatchEvent(new CustomEvent('myr5:portal-sound',{detail:{kind,board:boardId,...extra}}));
const tintKey=id=>'myr5.grimoireColor.'+id;
const validHex=value=>/^#[0-9a-f]{6}$/i.test(value||'');
const boardTint=(id=boardId)=>validHex(store.get(tintKey(id)))?store.get(tintKey(id)):(id==='cogs'?'#c59a56':'#b026ff');
const hasBoardTint=(id=boardId)=>/^#[0-9a-f]{6}$/i.test(store.get(tintKey(id))||'');
const COGS_BACKPLATE_KEY='myr5.grimoireBackplateColor.cogs';
const cogsBackplateTint=()=>validHex(store.get(COGS_BACKPLATE_KEY))?store.get(COGS_BACKPLATE_KEY):'#263943';
const hasCogsBackplateTint=()=>validHex(store.get(COGS_BACKPLATE_KEY));
const boardTintLabel=()=>boardId==='grass'?'Flower colour':boardId==='cogs'?'Mechanism colour':boardId==='pond'?'Lily colour':'Grimoire colour';
const paletteKey=id=>'myr5.wormholePalette.'+id;
const materialLoads=new Map();
// Sandboxed frames and private-mode Safari throw on localStorage access; never let that kill mountPortal.
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
function initialBoardId(){
 const p=new URLSearchParams(location.search).get('board');if(p==='cogs')return 'pond';if(p&&BOARDS[p])return p;
 const stored=store.get(BOARD_KEY);if(stored==='cogs')return 'pond';if(stored&&BOARDS[stored])return stored;
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
// W2-2A: each destination opens through the app's router (modules/routes.mjs, window.myr5Routes): it sets the
// route's #hash, lights the bottom bar and hands back the dialog for the dive and fade-back. A page without the
// router (a bare portal page) keeps the direct opener.
const via=(route,direct)=>()=>window.myr5Routes?window.myr5Routes.go(route,{portal:true}):direct();
const LEADERBOARD={label:'Leaderboard',route:'scoreboard',color:'#ffff33',icon:ICONS.trophy,kind:'dialog',open:via('scoreboard',()=>{document.querySelector('.coach-dock [data-panel="account"]')?.click();return document.getElementById('accountPanel');})};
// Exported so tests can check the gesture -> destination table without a DOM.
export const MENUS={
 // Ian 2026-09-23: the square opens the workout start page (the pod scrolled to its viewing port, control board and
 // BEGIN; no auto-start); the oval is the coach's arrival in the ship view, its entrance played every time.
 rect:{label:'Workout',route:'workout',color:'#ff5f1f',icon:ICONS.dumbbell,kind:'dialog',open:via('workout',()=>openWorkoutHome())},
 oval:{label:'Choose Workout',route:'select',color:'#1f51ff',icon:ICONS.dumbbell,kind:'dialog',open:via('select',()=>window.myr5Menus?.ship?.({entrance:'always',hash:'#select'}))},
 up:{label:'Food',route:'food',color:'#39ff14',icon:ICONS.bowl,kind:'dialog',open:via('food',()=>{document.querySelector('.coach-dock [data-panel="meals"]')?.click();return document.getElementById('mealsPanel');})},
 down:{label:'Achievements',route:'achievements',color:'#ff4fa0',icon:ICONS.star,kind:'dialog',open:via('achievements',()=>window.myr5Menus?.achievements?.())},
 vdiamond:LEADERBOARD,
 hdiamond:LEADERBOARD,
 x:{label:'War Room',route:'war-room',color:'#ff10f0',icon:ICONS.joystick,kind:'nav',open:via('war-room',()=>location.assign('/war-room/index.html'))},
 'line-lr':{label:'Meditation',route:'meditate',color:'#b026ff',icon:ICONS.lotus,kind:'dialog',open:via('meditate',()=>{document.querySelector('.meditation-entry')?.click();return document.querySelector('.meditation-panel');})},
 'line-rl':{label:'Reminders',route:'reminders',color:'#ff10f0',icon:ICONS.bell,kind:'dialog',open:via('reminders',()=>{document.querySelector('.coach-dock [data-panel="reminders"]')?.click();return document.getElementById('remindersPanel');})},
 'line-down':{label:'Settings',route:'settings',color:'#39ff14',icon:ICONS.gear,kind:'dialog',open:via('settings',()=>{document.getElementById('openSettings')?.click();return document.getElementById('settings');})},
 // Line-up opens the Menu sheet; it is hidden from the sheet grid itself.
 // Full-screen ship view (Ian 2026-09-22: the coach capsule view, full screen, with the ship and pixel planet). Menu sheet only.
 // War Room/Arcade has no gesture: Menu sheet only, same lock as before.
};

// The locked intake theme disables transitions with !important; inline !important keeps the portal moving.
const motion=(el,value)=>value?el.style.setProperty('transition',prefersReducedMotion()?'none':value,'important'):el.style.removeProperty('transition');
const prefersReducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// #29: a short buzz on a recognised match (trace or tap), a double pulse on an "almost" near-miss. iOS
// ignores navigator.vibrate; never vibrate under reduced motion.
const buzz=pattern=>{if(!prefersReducedMotion())navigator.vibrate?.(pattern);};
const raf=()=>new Promise(r=>requestAnimationFrame(r));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Lets a just-opened dialog's layout settle before we measure it. Races two frames against a plain
// timeout so a backgrounded tab (rAF paused) can't stall the whole reveal indefinitely.
const settle=()=>Promise.race([raf().then(raf),new Promise(r=>setTimeout(r,50))]);
const toClientPts=(pts,rect)=>pts.map(([x,y])=>[rect.left+x*rect.width,rect.top+y*rect.height]);
const closeLoop=pts=>{const a=pts[0],b=pts.at(-1);return(a[0]===b[0]&&a[1]===b[1])?pts:[...pts,a];};
const rectBox=el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height};};
function centroidOf(closedPts){const n=closedPts.length-1;let sx=0,sy=0;for(let i=0;i<n;i++){sx+=closedPts[i][0];sy+=closedPts[i][1];}return[sx/n,sy/n];}
const shapeClipPts=(id,rect)=>closeLoop(toClientPts(shapeOutlinePts(id),rect));
// R21 L2: the opened window sits AURA.inset px inside the board face on every side, so the rim and its glow leave a strip of board
// round them instead of touching the metal rail. Scales per axis about the box centre; the rect (the whole face) is left alone.
function insetPts(pts,id){
 if(id==='rect'||!AURA.inset)return pts;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),
  kx=Math.max(.5,1-2*AURA.inset/(x1-x0||1)),ky=Math.max(.5,1-2*AURA.inset/(y1-y0||1)),cx=(x0+x1)/2,cy=(y0+y1)/2;
 return pts.map(([x,y])=>[cx+(x-cx)*kx,cy+(y-cy)*ky]);
}
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

let portalHome,boardHost,overlay,ctx,objectsLayer,statusEl,menuBtn,menuSheet,boardBtn,settingsBtn,overlayObserver,lifecycle,chrome,workoutHome,workoutSlots=[];
let wantedBoard=null,sequence=0,visibilityRun=0,boardLoad=0,menuChosen=false,focusBefore=null;
const backgroundInert=new Map(),flashes=new Set();
// board: what the portal cuts and measures: the 3D layer (gl3) once it has drawn, else the flat layer (base) under it.
let board=null,base=null,gl3=null,boardShown=false,boardId='quilt';
// Per board, this session (never one global flag): '3d' drawing, 'lost' (its context dropped once: one more try), 'flat' (3D
// failed: the flat board stays until the board is picked again or the app restarts). pending3D: 3D builds still out.
const art={},losses={},pending3D=new Set();let ready3D=Promise.resolve();
let pointers=new Map(),pendingStrokes=[],pendingTrailPts=[],finalizeTimer=0,outlineFlash=null,rafId=0;
// busy: a portal sequence is running (traces ignored, touches ripple the glass); phase: the live glass {glass,pts,color,t0,pulse}.
let busy=false,phase=null;
// #104: idleTimer arms after IDLE.armMs of eligibility (board shown, nothing busy, no touch, no dialog,
// tab visible); idleCycle is the running cycle ({t0}) or {static:true} under reduced
// motion. #105: fading holds just-released strokes still fading out, drawn alongside any live ones.
let idleTimer=0,idleCycle=null,fading=[];
// #22 first-run hint: {t0} while the glowing-fingertip demo plays, else null. idleEligible() also checks
// this (below) so the idle ambient flash never runs underneath it.
let hint=null,lastTap=null;

function menuButtonsHtml(){return Object.entries(MENUS).filter(([,m])=>!m.hidden).map(([id,m])=>`<button type="button" data-menu="${id}"><i aria-hidden="true" style="--dot:${m.color}"></i>${m.label}</button>`).join('');}
function boardChipsHtml(){return Object.entries(BOARDS).filter(([id])=>PRODUCTION_PORTALS.includes(id)).map(([id,b])=>`<button type="button" data-board="${id}" aria-pressed="${id===boardId}">${b.label}</button>`).join('');}
const htmlSafe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paletteSelectHtml(id=boardId){
 if(id==='quilt')return '';
 const rows=paletteOptions(id),selected=paletteFor(id,store.get(paletteKey(id)))?.id;
 if(!rows.length)return '';
 return `<label class="portal-palette">Wormhole palette <select aria-label="Wormhole palette" data-palette>${rows.map(p=>`<option value="${htmlSafe(p.id)}"${p.id===selected?' selected':''}>${htmlSafe(p.label)}</option>`).join('')}</select></label>`;
}
function lookControlsHtml(){
 const look=readLook();
 return `<fieldset class="portal-look-controls"><legend>Portal appearance</legend><div>${[['portal','Metal'],['strip','Strip']].map(([key,label])=>`<label>${label}<input type="color" data-look="${key}" aria-label="${label}" value="${look[key]}"></label>`).join('')}</div><button type="button" data-look-reset>Reset portal appearance</button></fieldset>`;
}
function boardTintControlsHtml(){
 const mechanism=`<label class="portal-color">${boardTintLabel()} <input type="color" aria-label="${boardTintLabel()}" data-board-tint value="${boardTint()}"></label>`;
 return `${mechanism}${boardId==='cogs'?`<label class="portal-color">Back wall colour <input type="color" aria-label="Back wall colour" data-backplate-tint value="${cogsBackplateTint()}"></label>`:''}`;
}
function updateBoardChips(){
 const tint=menuSheet?.querySelector('[data-board-tint]'),label=tint?.closest('.portal-color');
 if(tint){tint.value=boardTint();tint.setAttribute('aria-label',boardTintLabel());if(label?.firstChild?.nodeType===Node.TEXT_NODE)label.firstChild.textContent=boardTintLabel()+' ';}
 const backplate=menuSheet?.querySelector('[data-backplate-tint]')?.closest('.portal-color');
 if(boardId==='cogs'&&!backplate)label?.insertAdjacentHTML('afterend',boardTintControlsHtml().slice(boardTintControlsHtml().indexOf('<label',1)));
 else if(boardId!=='cogs')backplate?.remove();
 const backplateInput=menuSheet?.querySelector('[data-backplate-tint]');if(backplateInput)backplateInput.value=cogsBackplateTint();
 menuSheet?.querySelectorAll('[data-board]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.board===boardId)));
 const row=menuSheet?.querySelector('[data-palette-row]');if(row)row.innerHTML=paletteSelectHtml();
}
export function setCogsBackplateTint(hex,selected=true){
 if(!validHex(hex))return false;
 if(selected)store.set(COGS_BACKPLATE_KEY,hex);else {try{localStorage.removeItem(COGS_BACKPLATE_KEY);}catch{}}
 if(base&&boardId==='cogs')base.setBackplateTint?.(hex,selected);
 if(gl3&&boardId==='cogs')gl3.setBackplateTint?.(hex,selected);
 return true;
}
// Swaps the mounted board. The flat layer goes up first: a poster that doesn't arrive keeps the board already showing (the
// last good one), else the Quilt, whose own art is drawn in code when it must be, so there is always a board. Then 3D is
// laid over it while the portal is on screen (threeD). Pointer listeners read the `board` variable at call time.
// Loads run one at a time: effects (jelly's module state) are singletons, so the old 3D board is disposed before the next
// one's build can start. A load superseded while queued does nothing.
let loadQueue=Promise.resolve();
function loadBoard(id){
 if(!BOARDS[id])id='quilt';
 wantedBoard=id;delete art[id];losses[id]=0; // a pick (or a cold start) gives its 3D another go
 const load=++boardLoad,run=loadQueue.then(()=>load===boardLoad?loadBoardNow(id,load):null);
 loadQueue=run.catch(()=>{});return run;
}
async function loadBoardNow(id,load){
 const label=BOARDS[id].label;
 status(`Loading ${label} board…`);
 let next,failureMessage='';
 try{next=await BOARDS[id].flat(boardHost);}
 catch(error){
  console.warn(`${label} board art is unavailable.`,error);
  if(load!==boardLoad)return null;
  if(base){status(`${label} board art is unavailable. ${BOARDS[boardId].label} stays; try again later or check Downloads.`);updateBoardChips();return base;}
  failureMessage=`${label} board art is unavailable. Quilt is ready; try again later or check Downloads.`;
  id='quilt';next=await BOARDS.quilt.flat(boardHost);
 }
 if(load!==boardLoad){next.dispose();return null;}
 clearTimeout(finalizeTimer);pendingStrokes=[];
 pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();
 const old=[gl3,base];gl3=null;base=board=next;lastTap=null;for(const b of old)b?.dispose();
 if(!boardShown)base.pause();
 portalHome.style.background=base.background||''; // the canvases are transparent; the board colour lives here, behind the glass
 portalHome.dataset.board=boardId=id;portalHome.dataset.art='flat';
 portalSound('board');
 store.set(BOARD_KEY,id); // the saved choice is the board on screen: a failed pick keeps the last good one, a failed start the Quilt
 status(failureMessage);updateBoardChips();
 threeD();
 return base;
}
// 3D over the flat board: while the portal is on screen (or about to be: mount), one build per board at a time. It takes over
// only once it has drawn on a live context and no cut is open; a throw, a timeout or a lost context leaves the flat board (fell).
function threeD(mounting=false){
 const id=boardId,make=BOARDS[id].create;
 if(!make||gl3||!(boardShown||mounting)||pending3D.has(id)||art[id]==='flat'||lifecycle.signal.aborted)return ready3D;
 pending3D.add(id);portalHome.dataset.building=''; // portal.css keeps a hidden portal laid out meanwhile: effects measure the host as they build
 const build=make(boardHost);build.catch(()=>{}).finally(()=>{pending3D.delete(id);if(!pending3D.size)delete portalHome.dataset.building;});
 return ready3D=(async()=>{
  let created;
  try{created=await Promise.race([build,sleep(WAIT.threeD).then(()=>{throw new Error(`3D took over ${WAIT.threeD} ms`);})]);}
  catch(error){build.then(late=>late.dispose(),()=>{});return fell(id,error);} // one that turns up late is released at once
  created.canvas.style.opacity='0'; // drawn but out of sight until it takes over (opacity, not visibility: its frame still reaches the screen)
  while((busy||phase)&&id===boardId&&!lifecycle.signal.aborted)await sleep(250); // ponytail: polls; a sequence ends within seconds
  if(id!==boardId||gl3||lifecycle.signal.aborted){created.dispose();return;}
  if(created.canvas.getContext('webgl2')?.isContextLost()!==false){created.dispose();return fell(id,new Error('WebGL context lost before its first frame'));}
  if(id!=='quilt')created.setTint?.(boardTint(id),hasBoardTint(id));
  if(id==='cogs')created.setBackplateTint?.(cogsBackplateTint(),hasCogsBackplateTint());
  gl3=board=created;created.canvas.style.opacity='';if(base.canvas)base.canvas.style.visibility='hidden';
  if(boardShown)created.resume();else created.pause(); // resume draws a fresh frame now it's in sight
  art[id]='3d';portalHome.dataset.art='3d';
 })();
}
function fell(id,error){
 console.warn(`${BOARDS[id].label} 3D is unavailable; its flat board stays.`,error);
 art[id]='flat';
 if(id===boardId&&id!=='quilt'&&!lifecycle.signal.aborted)status(`${BOARDS[id].label} is showing its flat art: its 3D didn't load.`); // the flat quilt is its own art
}
// Android drops live WebGL contexts under memory pressure: the flat board takes over at once and 3D gets one more try a
// moment later; a second loss this session leaves the board flat.
function lost3D(){
 const id=boardId,dead=gl3;gl3=null;board=base;
 if(base.canvas)base.canvas.style.visibility='';base.resume();portalHome.dataset.art='flat';dead.dispose();
 if((losses[id]=(losses[id]||0)+1)>1)return fell(id,new Error('WebGL context lost again'));
 art[id]='lost';setTimeout(()=>threeD(),1000);
}

// #111 metal frame (portal.css .portal-frame): the energy channel, bolts at the four corners and two down each long side,
// the nameplate. One copy sits on the board; #portalChrome holds another that stays around an open destination.
const FRAME_BOLTS=[[0,0],[1,0],[0,1],[1,1],[0,.33],[0,.67],[1,.33],[1,.67]];
const frameHtml=()=>`<div class="portal-frame" aria-hidden="true"><span class="portal-energy">${'<span><span></span></span>'.repeat(4)}</span>${FRAME_BOLTS.map(([x,y])=>`<i style="--x:${x};--y:${y}"></i>`).join('')}<b>MOM INC</b></div>`;
// Energy around the frame (Ian 23 Sept): the neons flow clockwise along a channel in the rail, one clipped channel per
// side, each a neon stripe (ENERGY.px per colour cycle) sliding by transform: compositor-only, no repaint per frame.
// Gentle at rest; the selected Strip sequence remains constant as the channel brightens and speeds up.
// Reduced motion: static. Both frame copies share timing and rate, so handing over to the chrome is seamless; the
// loops pause while neither copy is on screen.
const ENERGY={px:360,loopMs:9000,surge:4,dive:10};
const ENERGY_MOVES=[['X',1],['Y',1],['X',-1],['Y',-1]]; // top →, right ↓, bottom ←, left ↑
const energyAnims=[];
function energize(seq,rate=1,hot=false){
 const seg=seq&&ENERGY.px/seq.length,stops=seq?.map((c,i)=>`${c} ${i*seg}px ${(i+1)*seg}px`).join(',');
 for(const el of document.querySelectorAll('.portal-energy')){if(seq)el.style.setProperty('--energy',stops);el.classList.toggle('hot',hot);}
 energyAnims.forEach(a=>a.updatePlaybackRate(rate));
}
function syncEnergy(){const on=boardShown||!!framed;energyAnims.forEach(a=>on?a.play():a.pause());}
// War Room look (device-local, guests too): metal colours ride CSS variables, the strip colour feeds energize(). Reapplied on
// load, return to the portal and cross-tab/bfcache changes; a board pick made elsewhere loads once (an uncached one falls back).
const restSeq=()=>stripSeq(readLook().strip);
 function applyLook(){const look=readLook();applyLookVars(document.documentElement,look);document.documentElement.style.setProperty('--portal-strip-glow',`${look.strip}40`);menuSheet?.querySelectorAll('[data-look]').forEach(input=>{input.value=look[input.dataset.look];});if(aura?.el){const seq=stripSeq(look.strip);aura.el.style.setProperty('--aura',look.strip);aura.el.style.setProperty('--aura-edge',`color-mix(in srgb,${look.strip} 45%,#fff)`);aura.el.style.setProperty('--aura-seq',[...seq,seq[0]].join(','));}if(!phase)energize(restSeq());}
function syncLook(){applyLook();const saved=store.get(BOARD_KEY),stored=saved==='cogs'?'pond':saved;if(stored&&BOARDS[stored]&&stored!==wantedBoard&&!busy)loadBoard(stored).catch(()=>{});}
function buildDom(){
 portalHome=document.createElement('div');portalHome.id='portalHome';
 portalHome.hidden=true;portalHome.setAttribute('role','dialog');portalHome.setAttribute('aria-label','Quilt portal');portalHome.setAttribute('aria-modal','true');
 portalHome.innerHTML=`
  <div id="portalShadows" aria-hidden="true"><i></i><i></i><i></i></div>
  <div id="portalBoardHost">${frameHtml()}</div>
  <canvas id="portalOverlay" aria-hidden="true"></canvas>
  <div id="portalObjects" aria-hidden="true"></div>
  <p id="portalStatus" role="status"></p>
  <button id="portalSettingsButton" type="button" aria-label="Grimoire settings">GRIMOIRE</button>
  <button id="portalExitButton" type="button">Pod</button>`;
 document.body.append(portalHome);
 chrome=document.createElement('div');chrome.id='portalChrome';chrome.setAttribute('popover','manual');chrome.setAttribute('aria-hidden','true');chrome.innerHTML=frameHtml();document.body.append(chrome);
 if(!chrome.showPopover)chrome.remove(); // no Popover API (iOS Safari 16-): no UA hidden state, so it would sit over every screen; frameOn() skips framing
 applyLookVars();energize(restSeq());
 for(const el of document.querySelectorAll('.portal-energy')){
  el.style.setProperty('--energy-px',ENERGY.px+'px');
  if(!prefersReducedMotion())[...el.children].forEach((channel,i)=>{const [axis,dir]=ENERGY_MOVES[i],from=`translate${axis}(${-ENERGY.px*(dir>0)}px)`,to=`translate${axis}(${-ENERGY.px*(dir<0)}px)`;energyAnims.push(channel.firstElementChild.animate([{transform:from},{transform:to}],{duration:ENERGY.loopMs,iterations:Infinity}));});
 }
 syncEnergy();
 boardHost=portalHome.querySelector('#portalBoardHost');
 boardHost.addEventListener('webglcontextlost',e=>{if(gl3&&e.target===gl3.canvas)lost3D();},true); // capture: the event doesn't bubble
 const resizeFullscreenFace=()=>{const dialog=framed?.dialog;if(!dialog?.classList.contains('portal-fullscreen'))return;const face=fullscreenFace();setFace(dialog,face);setFace(chrome,face);if(aura)showAura(screenLook(framed.look,face),'open');};
 addEventListener('resize',resizeFullscreenFace,{signal:lifecycle.signal});window.visualViewport?.addEventListener('resize',resizeFullscreenFace,{signal:lifecycle.signal});
 overlay=portalHome.querySelector('#portalOverlay');ctx=overlay.getContext('2d');
 objectsLayer=portalHome.querySelector('#portalObjects');
 statusEl=portalHome.querySelector('#portalStatus');
 // W2-2A: the app's bottom bar (routes.mjs) is up on the quilt; its centre Portal button replaces the floating Menu
 // button, and the focus trap cycles the whole bar plus Pod (and Armie's inbox button, which stays live on the quilt).
 const barPortal=document.querySelector('.coach-dock [data-route="portal"]'),bar=barPortal?.closest('.coach-dock');
 menuBtn=barPortal||portalHome.querySelector('#portalExitButton');
 const exitBtn=portalHome.querySelector('#portalExitButton');
 settingsBtn=portalHome.querySelector('#portalSettingsButton');
 settingsBtn.onclick=()=>openMenu();
 if(bar)exitBtn.remove(); // the centre mechanical key returns to the pod when the dock is present
 else exitBtn.onclick=()=>setVisible(false);
 const armie=()=>[...document.querySelectorAll('.armie-inbox-launcher')].filter(el=>el.getClientRects().length);
 const trap=e=>{if(e.key==='Escape'){e.preventDefault();setVisible(false);}else if(e.key==='Tab'){const buttons=[...new Set([...(bar?bar.querySelectorAll('button'):[menuBtn]),settingsBtn,...armie(),...(exitBtn.isConnected?[exitBtn]:[])])],index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
 portalHome.addEventListener('keydown',trap);
 bar?.addEventListener('keydown',e=>{if(boardShown&&!bar.closest('dialog'))trap(e);},{signal:lifecycle.signal});
 document.addEventListener('keydown',e=>{if(boardShown&&e.target.classList?.contains('armie-inbox-launcher'))trap(e);},{signal:lifecycle.signal});
 boardBtn=document.getElementById('openBoard');
 // The fallback menu sheet lives outside portalHome too: a dialog nested in a hidden ancestor
 // would be hidden along with it while open (e.g. mid-fade during the "all" portal reveal).
 menuSheet=document.createElement('dialog');menuSheet.id='portalMenu';menuSheet.className='portal-menu';menuSheet.setAttribute('aria-labelledby','portalMenuTitle');
 // The board picker row only earns its place once a second board ships; one option is nothing to pick from.
 const boardRow=PRODUCTION_PORTALS.length<2?'':`<div class="portal-board-chips" role="group" aria-label="Board"><span class="portal-board-label">Board</span>${boardChipsHtml()}</div>`;
 menuSheet.innerHTML=`<header><h2 id="portalMenuTitle">GRIMOIRE SETTINGS</h2><button type="button" data-menu-close>Back to portal</button></header>${lookControlsHtml()}${boardTintControlsHtml()}${boardRow}<div data-palette-row>${paletteSelectHtml()}</div><details class="portal-full-menu"><summary>Full menu</summary><div class="portal-menu-grid">${menuButtonsHtml()}</div></details><p id="portalMenuStatus" role="status"></p>`;
 menuSheet.querySelector('[data-menu-close]').onclick=()=>menuSheet.close();
 menuSheet.querySelectorAll('[data-look]').forEach(input=>input.oninput=()=>{saveLook(input.dataset.look,input.value);applyLook();});
 menuSheet.querySelector('[data-look-reset]').onclick=()=>{for(const name of ['portal','strip'])saveLook(name,LOOK_DEFAULTS[name]);applyLook();};
 document.body.append(menuSheet);
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
 menuSheet.addEventListener('input',e=>{
  if(e.target.matches('[data-board-tint]')){
   const color=e.target.value;store.set(tintKey(boardId),color);
   if(base&&boardId!=='quilt')base.setTint?.(color);
   if(gl3&&boardId!=='quilt')gl3.setTint?.(color);
   e.target.setAttribute('value',color);
  }else if(e.target.matches('[data-backplate-tint]')){
   setCogsBackplateTint(e.target.value);e.target.setAttribute('value',e.target.value);
  }
 },{signal:lifecycle.signal});
 menuSheet.addEventListener('change',e=>{if(e.target.matches('[data-palette]')){const options=paletteOptions(boardId);if(options.some(p=>p.id===e.target.value))store.set(paletteKey(boardId),e.target.value);}}, {signal:lifecycle.signal});
 menuSheet.querySelectorAll('[data-board]').forEach(btn=>btn.onclick=async()=>{menuChosen=true;menuSheet.close();const selected=btn.dataset.board;await loadBoard(selected);if(!lifecycle.signal.aborted)setVisible(true);});
 workoutHome=document.createElement('dialog');workoutHome.id='portalWorkoutHome';workoutHome.className='portal-workout-home';document.body.append(workoutHome);
 workoutHome.addEventListener('close',()=>{if(!workoutHome.open)restoreWorkoutHome();});
}

function restoreWorkoutHome(){
 for(const {node,slot} of workoutSlots){if(slot.parentNode)slot.replaceWith(node);}
 workoutSlots=[];
}
function openWorkoutHome(){
 if(!workoutHome)return null;
 if(workoutHome.open)return workoutHome;
 if(workoutSlots.length){workoutHome.showModal();return workoutHome;}
 const home=document.getElementById('homeScreen');if(!home)return null;
 backgroundBlocked(false);
 const nodes=[document.getElementById('podShipBackdrop'),document.querySelector('body>.ship-header'),home].filter(node=>node&&!workoutHome.contains(node));
 workoutSlots=nodes.map(node=>{const slot=document.createComment('pod-workout-home-slot');node.parentNode?.insertBefore(slot,node);return{node,slot};});
 workoutHome.append(...nodes);workoutHome.showModal();
 return workoutHome;
}

function backgroundBlocked(block){
 // Dialogs that are open or hidden are never made inert: one opened as a modal while the quilt is up (the full-download
 // offer, setup gate, reward reveals) sits in the top layer and must stay tappable, or the app freezes. A closed dialog
 // that is still drawn (styled display:grid) stays inert so it can't catch taps meant for the quilt. The "Updated: …"
 // toast (app-updates.mjs) is a non-dialog element sitting over the portal's own controls; it's exempt too, or its
 // "Got it" tap falls through to whatever is underneath (portal.css raises it above the Menu button while up).
 const liveDialog=el=>el.tagName==='DIALOG'&&(el.open||getComputedStyle(el).display==='none');
 const exempt=el=>el===portalHome||el===menuSheet||liveDialog(el)||el.classList.contains('app-update-banner')||el.classList.contains('coach-dock')||el.classList.contains('armie-inbox-launcher');
 if(block){for(const el of document.body.children)if(!exempt(el)&&!backgroundInert.has(el)){backgroundInert.set(el,el.inert);el.inert=true;}}
 else{for(const [el,inert]of backgroundInert)el.inert=inert;backgroundInert.clear();}
}
function openMenu(){
 portalSound('menu');
 const {face}=restFace();setVisible(false);menuChosen=false;menuSheet.showModal();
 if(face&&frameOn(face,windowLook('line-up',MENUS['line-up'],face)))frameDialog(menuSheet);
 menuSheet.addEventListener('close',()=>{if(framed?.dialog===menuSheet)frameOff();if(!menuChosen&&!lifecycle.signal.aborted)setVisible(true);},{once:true});
}

// Every hide/show path heals the board (idempotent), so it always comes back whole.
function setVisible(v){
 visibilityRun++;
 // Routes can put the quilt back while its destination's reverse dive is still awaiting its
 // animation. Invalidate and remove that return phase now; otherwise its glass stays mounted
 // until the old animation resolves. A forward phase has no backT0, so showing the quilt does
 // not interrupt a newly-started portal sequence.
 if(v&&phase?.backT0){endPhase();portalHome.style.transformOrigin='';}
 if(!v){sequence++;busy=false;clearTimeout(finalizeTimer);pendingStrokes=[];pendingTrailPts=[];fading.length=0;pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();outlineFlash=null;objectsLayer.replaceChildren();cancelAnimationFrame(rafId);rafId=0;}
 board?.heal();
 portalHome.hidden=!v;
 if(boardBtn)boardBtn.hidden=v;
 if(v){if(!boardShown)focusBefore=document.activeElement;motion(portalHome,'');portalHome.style.opacity='';portalHome.style.clipPath='';board?.resume();backgroundBlocked(true);menuBtn.focus();maybeStartHint();}
 else{endPhase();board?.pause();backgroundBlocked(false);if(focusBefore?.isConnected)focusBefore.focus();}
 boardShown=v;frameOff();if(v)applyLook();syncEnergy();
 portalSound('scene',{visible:v});
 scheduleIdle();if(v)threeD();
}
function fadeOutBoard(){
 const run=++visibilityRun;
 backgroundBlocked(false);
 portalSound('scene',{visible:false});
 motion(portalHome,'opacity .3s ease');portalHome.style.opacity='0';
 return new Promise(r=>setTimeout(()=>{if(run===visibilityRun){portalHome.hidden=true;if(boardBtn)boardBtn.hidden=false;endPhase();board?.heal();board?.pause();boardShown=false;syncEnergy();scheduleIdle();}r();},prefersReducedMotion()?0:300));
}
function fadeInBoard(){
 visibilityRun++;
 endPhase();board?.heal();
 portalHome.hidden=false;portalHome.style.clipPath='';motion(portalHome,'none');portalHome.style.opacity='0';
 if(boardBtn)boardBtn.hidden=true;
 board?.resume();boardShown=true;frameOff();syncEnergy();backgroundBlocked(true);menuBtn.focus();scheduleIdle();threeD();
 portalSound('scene',{visible:true});
 const run=visibilityRun;
 settle().then(()=>{if(run!==visibilityRun)return;motion(portalHome,`opacity ${PORTAL.healMs}ms ease`);portalHome.style.opacity='1';});
}
// The border stays when a destination opens (Ian 23 Sept): #portalChrome shows a copy of the frame at the board's rest box
// in the top layer, with a matte outside it, and the destination dialog is fitted into its window (.portal-framed).
// look (#134): how the window reads: {id,color,label,pts: its outline (client px, closed),shaped,name: #132's rim path};
// shaped (#131): the destination is seen through the cut in the quilt, which stays on as the wall around it.
// ponytail: the box is measured once per destination, so a rotation while one is open keeps the old box until it closes.
let framed=null,ghostEl=null;
function restFace(){const hidden=portalHome.hidden;portalHome.hidden=false;const face=board?.faceRect(),pattern=board?.patternRect();portalHome.hidden=hidden;return {face,pattern};}
const setFace=(el,face)=>{for(const k of ['left','top','width','height'])face?el.style.setProperty('--face-'+k,face[k]+'px'):el.style.removeProperty('--face-'+k);};
const rectPts=f=>closeLoop([[f.left,f.top],[f.left+f.width,f.top],[f.left+f.width,f.top+f.height],[f.left,f.top+f.height]]);
const menuFor=route=>Object.entries(MENUS).find(([,m])=>m.route===route)||[null,null];
// A full-window look (the lines, the Menu sheet, a bottom-bar switch): the window's own rectangle, the name on the upper rail.
 const windowLook=(id,menu,face)=>({id,color:boardTint(),strip:readLook().strip,label:menu?.label||'',pts:rectPts(face),shaped:false,name:namePath(face)});
// R7 (Ian 26 Sept): no text in a peer-through view, so the cut's rim (and the window it steps in to) carries no name.
 const shapeLook=(id,menu,pts)=>({id,color:boardTint(),strip:readLook().strip,label:menu.label,pts,shaped:true,name:null});
// Fullscreen destinations keep the energy and feather it inward along the inset face.
 const screenLook=(look,face=fullscreenFace())=>({...look,pts:rectPts(face),shaped:false,fullscreen:true,name:null});
 // R20 (Ian 2 Oct): the housing ends above the dock, a separate console fixed below it (0 while the dock is hidden).
 // The console's height comes from --myr5-bar (the dock may be mid-move between dialogs, measuring 0, when a face is set);
 // 0 when the app hides the dock (tracking, rest) or there is none.
 let barProbe=null;
 const dockHeight=()=>{const b=document.body;if(!document.getElementById('coachDock')||b.dataset.tracking==='true'||b.dataset.screen==='rest')return 0;if(!barProbe?.isConnected){barProbe=document.createElement('div');barProbe.setAttribute('aria-hidden','true');barProbe.style.cssText='position:fixed;left:-9px;top:0;width:1px;height:var(--myr5-bar,88px);visibility:hidden;pointer-events:none';b.append(barProbe);}return barProbe.getBoundingClientRect().height;};
 function fullscreenFace(){const rail=15;return {left:rail,top:rail,width:Math.max(1,innerWidth-rail*2),height:Math.max(1,innerHeight-rail*2-dockHeight())};}
function frameOn(face,look){
 frameOff();
 if(!chrome.showPopover||!face)return false; // no popover API (Safari before 17): destinations open as they always have
 framed={face,look:look||windowLook(null,null,face),leaned:false,ctl:new AbortController()};setFace(chrome,face);chrome.showPopover();syncEnergy();
 if(framed.look.shaped)framed.outlines=windowOutlines(framed.look.pts,face);
 // Release 5 open item: switching routes from the bottom bar while a destination is framed used to open the next page
 // unframed with the reverse dive playing behind it. The frame now moves to the next route's dialog (routes.mjs's
 // observer, created first, has already adopted it, so it carries its data-route), and a page route puts it away (closed).
 framed.watch=new MutationObserver(records=>{for(const {target} of records)if(framed?.dialog&&target!==framed.dialog&&target instanceof HTMLDialogElement&&target.open&&target.dataset.route)handOver(target);});
 framed.watch.observe(document.body,{subtree:true,attributeFilter:['open']});
 return true;
}
 function frameDialog(dialog){
  if(!framed||!(dialog instanceof HTMLDialogElement)||framed.dialog===dialog)return;
  unframe(framed.dialog);framed.dialog=dialog;dialog.classList.add('portal-framed');
  const route=framed.directRoute||dialog.dataset.route;
  const full=framed.direct===true||dialog.matches('.meditation-panel')||dialog.id==='portalWorkoutHome',face=full?fullscreenFace():framed.face;setFace(dialog,face);setFace(chrome,face);
  dialog.classList.toggle('portal-fullscreen',full);chrome.classList.toggle('portal-housing-fullscreen',full);chrome.classList.remove('portal-garage');if(full)chrome.dataset.destination=framed.directRoute|| (dialog.matches('.meditation-panel')?'meditation':'workout');else delete chrome.dataset.destination;
 // Back above the dialog, which opened on top of it. Re-shown a frame later: a popover hidden and shown in one task can
 // keep its old top-layer slot (under the dialog's backdrop) on WebKit. The rim is drawn then too, sized to the shown
 // frame (a hidden popover measures 0x0): it bursts open as the destination lands (not under the dive's scale).
  chrome.hidePopover();requestAnimationFrame(()=>{if(framed?.dialog!==dialog)return;if(!chrome.matches(':popover-open'))chrome.showPopover();showAura(full?screenLook(framed.look,face):aura?.look||framed.look,'open');});
 peerOn(dialog); // R7 (Ian 26 Sept): the tilt stays on every menu, full screen too
 if(!full&&framed.look.shaped)shapeDialog(dialog);
}
// The room remains visible through its cut until a double-tap or a scene action steps inside (full screen). Keep the
// route/dialog identity, so Back and Close still return through their original portal. The housing remains around the inset face.
function expandScene(dialog){
 if(!dialog?.open||framed?.dialog!==dialog||framed.expanded)return false;
 layoutInCut(dialog,false);framed.expanded=true;framed.leaned=true;
 dialog.classList.remove('portal-shaped','portal-inset','portal-leaned');dialog.classList.add('portal-fullscreen');chrome.classList.add('portal-housing-fullscreen');
 dialog.style.removeProperty('clip-path');dialog.style.removeProperty('--inset-zoom');motion(dialog,'');
  const face=fullscreenFace();setFace(dialog,face);setFace(chrome,face);
  chrome.classList.remove('portal-garage');showAura(screenLook(framed.look,face),'lean');
 stowBoard();return true;
}
// A destination can showModal() before its open() settles (the ship view loads after): frame it as it opens, before
// its first paint (MutationObserver callbacks run ahead of rendering). Returns the disconnect.
function watchDialog(){
 if(!framed)return null;
 const watch=new MutationObserver(records=>{for(const {target} of records)if(target instanceof HTMLDialogElement&&target.open)frameDialog(target);});
 watch.observe(document.body,{subtree:true,attributeFilter:['open']});
 return ()=>watch.disconnect();
}
function unframe(dialog){
 if(!dialog)return;
 if(framed?.dialog===dialog){peerOff();if(framed.look.shaped)layoutInCut(dialog,false);framed.dialog=null;}
 dialog.classList.remove('portal-framed','portal-shaped','portal-leaned','portal-inset','portal-fullscreen');setFace(dialog,null);dialog.style.removeProperty('--inset-zoom');
 dialog.style.removeProperty('clip-path');motion(dialog,'');
 dialog.querySelector(':scope>.portal-peer-ui')?.remove();
}
function frameOff(){
 if(!framed)return;
 const f=framed;f.watch?.disconnect();f.ctl.abort();
 if(f.directClose&&f.dialog)f.dialog.removeEventListener('close',f.directClose);
 unframe(f.dialog);ghostEl?.remove();ghostEl=null;framed=null;hideAura();chrome.classList.remove('portal-garage','portal-housing-fullscreen');delete chrome.dataset.destination;chrome.hidePopover();syncEnergy();
}
function frameDirectDestination(dialog,id){
 if(!(dialog instanceof HTMLDialogElement)||!dialog.open)return false;
 if(framed?.direct&&framed.dialog===dialog&&framed.directRoute===id)return true;
 const [shape,menu]=menuFor(id),route=window.myr5Routes?.ROUTES?.[id];
 sequence++;
 setVisible(false);
 const face=fullscreenFace(),look=windowLook(shape,menu||{label:route?.label||id},face);
 if(!frameOn(face,look))return false;
 dialog.dataset.route=id;
 framed.direct=true;framed.directRoute=id;
 frameDialog(dialog);
 const owner=framed;
 owner.directClose=()=>{if(framed===owner&&owner.dialog===dialog)frameOff();};
 dialog.addEventListener('close',owner.directClose);
 return true;
}
// The bar switched routes: the next route's dialog takes the frame, full window, in its own colour and name.
function handOver(dialog){
 const route=dialog.dataset.route,[id,found]=menuFor(route),menu=found||{label:window.myr5Routes?.ROUTES?.[route]?.label};
 unframe(framed.dialog);
 if(framed.look.shaped)stowBoard(); // the quilt wall goes with the hole it framed
 Object.assign(framed,{look:windowLook(id,menu,framed.face),leaned:false,outlines:null,expanded:false});
 hideAura();frameDialog(dialog);
 const run=++sequence;
 dialog.addEventListener('close',()=>closed(dialog,{pts:backPts(id),color:menu?.color||'#b026ff'},()=>run===sequence&&!lifecycle.signal.aborted),{once:true});
}
function backPts(id){const {pattern}=restFace();if(!pattern)return pattern;const sid=id&&SHAPES[id]&&id!=='x'&&id!=='cross'?id:'rect';return boardId==='cogs'?shapeClipPts(sid,pattern):insetPts(shapeClipPts(sid,pattern),sid);}
function stowBoard(){visibilityRun++;portalHome.hidden=true;if(boardBtn)boardBtn.hidden=false;endPhase();board?.heal();board?.pause();boardShown=false;syncEnergy();portalSound('scene',{visible:false});}
// A destination from the portal closed: back out to the quilt (the reverse dive, or #131's fizzle for a hole), unless the
// frame already moved on (handOver) or the bar went to another route (it is the active route now).
function closed(dialog,back,current){
 if(!current()||(framed&&framed.dialog!==dialog))return; // never framed (no popover API, no board): still back out
 const now=window.myr5Routes?.current?.();
 if(now&&now!==dialog.dataset.route){frameOff();return;}
 (back.shaped&&!framed?.expanded?fizzleBack:diveBack)({dialog,...back},current);
}
// The closed destination's empty shell (a shallow copy keeps its own look), shrinking into the wormhole core.
function shrinkShell(dialog,[cx,cy],ms){
 if(!framed||dialog!==framed.dialog)return;
 const shell=dialog.cloneNode(false),f=framed.face;shell.removeAttribute('open');shell.inert=true;shell.classList.add('portal-ghost');
 shell.style.transformOrigin=`${cx-f.left}px ${cy-f.top}px`;document.body.append(shell);ghostEl=shell;
 shell.animate([{transform:'none',opacity:1},{transform:'scale(.05)',opacity:0}],{duration:ms,easing:'cubic-bezier(.7,0,.8,1)',fill:'forwards'}).finished.then(()=>shell.remove(),()=>{});
}
// Closing a destination flies back OUT of the wormhole (Ian 23 Sept): the destination shrinks into the tunnel core while
// the portal scales back down from the dive and the tunnel slows, then the cut heals and the chrome hands back to the
// board's own frame. Same revealMs as the dive in; reduced motion is the plain quick fade.
// A way back that loses the screen to a newer show (routes' home-after-close can land first) drops its own glass and dive
// on the way out, so none is left under the quilt, and always hands back busy (backRun: the latest way back owns it).
let backRun=0;
function stale(run,ph,current){
 if(run===visibilityRun&&current())return false;
 if(phase===ph){endPhase();portalHome.style.transformOrigin='';}
 return true;
}
async function diveBack({dialog,pts,color},current){
 if(prefersReducedMotion()||!board||!pts){fadeInBoard();return;}
 const run=++visibilityRun;backRun=run;
 auraOut();shrinkShell(dialog,centroidOf(pts),PORTAL.revealMs*.55);unframe(dialog);
 busy=true;
 try{
  portalHome.hidden=false;motion(portalHome,'none');portalHome.style.opacity='';portalHome.style.clipPath='';
  if(boardBtn)boardBtn.hidden=true;
  board.resume();boardShown=true;syncEnergy();backgroundBlocked(true);
  showGlass(pts,color);const ph=phase;
  for(const el of [phase.glass,phase.bezel])el?.style.setProperty('animation','none','important'); // already there
  phase.t0-=PORTAL.cutMs+PORTAL.loadMinMs; // the tunnel is already at full speed
  cutBoard(pts,color,0);
  await dive(pts,true);
  if(stale(run,ph,current))return;
  board.heal();
  await phase?.bezel?.animate([{opacity:1},{opacity:0}],{duration:PORTAL.healMs}).finished.catch(()=>{});
  if(stale(run,ph,current))return;
  endPhase();frameOff();menuBtn.focus();scheduleIdle();
 }finally{if(backRun===run)busy=false;}
}
// #131/#130 closing a destination seen through the hole: it fizzles shut. The destination's shell shrinks into the
// wormhole's core with a flash along the rim and sparks falling in, then the cut heals and the quilt is home again.
async function fizzleBack({dialog,pts,color},current){
 const run=++visibilityRun,ms=PORTAL.revealMs*.55;backRun=run;
 if(prefersReducedMotion()||!board||!pts){unframe(dialog);homeAgain();return;}
 busy=true;
 try{
  auraOut();shrinkShell(dialog,centroidOf(pts),ms);unframe(dialog);
  showGlass(pts,color);const ph=phase;phase.t0-=PORTAL.cutMs+PORTAL.loadMinMs;phase.backT0=performance.now();cutBoard(pts,color,0);board.resume();
  await sleep(ms);
  if(stale(run,ph,current))return;
  board.heal();
  await phase?.bezel?.animate([{opacity:1},{opacity:0}],{duration:PORTAL.healMs}).finished.catch(()=>{});
  if(stale(run,ph,current))return;
  homeAgain();
 }finally{if(backRun===run)busy=false;}
}
function homeAgain(){endPhase();board?.heal();board?.resume();frameOff();backgroundBlocked(true);menuBtn.focus();scheduleIdle();}

// ---- #131 seen through the hole -------------------------------------------------------------------------------------
// The oval, the diamonds and both triangles open INTO the cut: the quilt stays on screen as the wall around the hole and
// the destination (fitted to the window as usual, so nothing inside it changes) is clipped to the cut outline, plus the
// bottom bar and the portal's own buttons on the quilt beside the hole (children of the modal dialog, so they stay
// tappable). ✕ closes through the destination's own Close; ⤢ "steps in" (#131's gentle zoom): the hole morphs out to the
// whole window so all of the menu is in reach, and ⤡ steps back. Keyboard focus landing on something the wall hides
// steps in too.
const scalePts=(pts,k)=>{const [cx,cy]=centroidOf(pts);return pts.map(([x,y])=>[cx+(x-cx)*k,cy+(y-cy)*k]);};
// The farthest crossing of a ray from c at angle a with a closed polygon (the shapes are star-shaped about their centroid).
export function rayHit([cx,cy],a,poly){
 const dx=Math.cos(a),dy=Math.sin(a);let best=0;
 for(let i=0;i<poly.length-1;i++){
  const [ax,ay]=poly[i],[bx,by]=poly[i+1],ex=bx-ax,ey=by-ay,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;
  const t=((ax-cx)*ey-(ay-cy)*ex)/den,u=((ax-cx)*dy-(ay-cy)*dx)/den;
  if(t>0&&u>=-1e-9&&u<=1+1e-9)best=Math.max(best,t);
 }
 return [cx+dx*best,cy+dy*best];
}
// The hole and the whole window as matched outlines (the same rays from the shape's centroid, through every corner of
// both), so a clip-path can morph one into the other.
export function windowOutlines(shape,face,n=48){
 const c=centroidOf(shape),box=rectPts(face),ang=([x,y])=>Math.atan2(y-c[1],x-c[0]);
 const as=[...Array.from({length:n},(_,i)=>-Math.PI+2*Math.PI*i/n),...shape.slice(0,-1).map(ang),...box.slice(0,-1).map(ang)].sort((a,b)=>a-b).filter((a,i,s)=>!i||a-s[i-1]>1e-4);
 return {shape:closeLoop(as.map(a=>rayHit(c,a,shape))),rect:closeLoop(as.map(a=>rayHit(c,a,box)))};
}
function peerUi(dialog){
 const ui=dialog.querySelector(':scope>.portal-peer-ui')||dialog.appendChild(Object.assign(document.createElement('div'),{className:'portal-peer-ui'}));
 if(framed)ui.style.setProperty('--peer-ui',framed.look.color);return ui;
}
// A flat menu (conductor 24 Sept) is laid out in the largest rectangle inside the cut (insetRect), a little zoomed out and
// scrolling inside it, the rest of the cut showing the destination's still depth; a scene fills the cut and shows nothing
// but itself (R7, Ian 29 Sept: portal.css hides its titles and controls until full screen), and cfg.fit sizes a scene
// layer to the cut (the constellation).
function shapeDialog(dialog){
 const {look}=framed,ui=peerUi(dialog),cfg=peerCfg(dialog);
 framed.flat=!cfg.scene;framed.cfg=cfg;
 dialog.classList.add('portal-shaped');
 const r=framed.flat&&(framed.inset??=insetRect(framed.outlines.shape)),small=r&&(r.width-2*INSET.margin<INSET.minW||r.height-2*INSET.margin<INSET.minH);
 if(small){framed.leaned=true;dialog.classList.add('portal-leaned');showAura({...look,pts:rectPts(framed.face),shaped:false},'lean');}
 else layoutInCut(dialog,true);
 dialog.addEventListener('focusin',({target})=>{if(framed?.dialog===dialog&&!framed.leaned&&!ui.contains(target)&&target.matches?.(':focus-visible')&&!throughCut(target))lean(true);},{signal:framed.ctl.signal});
 clipTo(dialog,small?framed.outlines.rect:framed.outlines.shape,{from:scalePts(framed.outlines.shape,.04),ms:prefersReducedMotion()?0:650,ease:'cubic-bezier(.2,1.25,.4,1)'});
 // R7 (Ian 26 Sept): a double-tap on the open menu (not on one of its controls) steps in to the full screen.
 const at=e=>({x:e.clientX,y:e.clientY,t:(isFinite(e.timeStamp)&&e.timeStamp>0?e.timeStamp:performance.now()),id:e.pointerId}),near=(a,b)=>a&&b&&b.t-a.t>=0&&b.t-a.t<=TAP_MS&&Math.hypot(b.x-a.x,b.y-a.y)<=TAP_MOVE_PX,opts={capture:true,signal:framed.ctl.signal};
 let down=null,tap=null,multitouch=false;
 const activePointers=new Set();
 dialog.addEventListener('pointerdown',e=>{
   activePointers.add(e.pointerId);
   if(multitouch) return;
   if(activePointers.size>1){multitouch=true;down=null;tap=null;return;}
   down=at(e);
 },opts);
 dialog.addEventListener('pointerup',e=>{
   activePointers.delete(e.pointerId);
   if(multitouch){if(activePointers.size===0)multitouch=false;return;}
   if(!down||down.id!==e.pointerId){down=null;return;}
   const up=at(e),t=near(down,up)&&!e.target.closest?.('button,a,input,select,textarea,label,summary')?up:null;
   if(t&&near(tap,t)){tap=null;expandScene(dialog);}else tap=t;
   down=null;
 },opts);
 dialog.addEventListener('pointercancel',e=>{
   activePointers.delete(e.pointerId);
   down=null;
   tap=null;
   if(activePointers.size===0){multitouch=false;}
 },opts);
 // A tap on the scene that opens one of its cards (a boss's detail, a pyramid screen or dial) steps in to show it.
 if(cfg.cards){
  let shut=[];const open=()=>[...dialog.querySelectorAll(cfg.cards)].filter(el=>!el.hidden);
  dialog.addEventListener('click',()=>{shut=open();},opts);
  dialog.addEventListener('click',()=>{if(open().some(el=>!shut.includes(el)))expandScene(dialog);},{signal:framed.ctl.signal});
 }
}
function peerCfg(dialog){return PEER_DEPTH.find(([s])=>dialog.matches(s))?.[1]||PEER_2D;}
// Largest axis-aligned rectangle inside a convex outline (client px, closed), leaning a little toward width so a menu's
// text column stays readable (scored width^1.5 x height). For a convex shape the rectangle's sides are bounded by the
// chords at its top and bottom edges only, so every pair of sampled chords is a candidate.
export function insetRect(poly,n=48){
 const ys=poly.map(p=>p[1]),y0=Math.min(...ys),y1=Math.max(...ys);
 const chord=y=>{let l=Infinity,r=-Infinity;for(let i=0;i<poly.length-1;i++){const [ax,ay]=poly[i],[bx,by]=poly[i+1];if(ay===by||(ay-y)*(by-y)>0)continue;const x=ax+(bx-ax)*(y-ay)/(by-ay);l=Math.min(l,x);r=Math.max(r,x);}return [l,r];};
 const Y=Array.from({length:n+1},(_,i)=>y0+(y1-y0)*i/n),C=Y.map(chord);
 let best=null;
 for(let i=0;i<=n;i++)for(let j=i+1;j<=n;j++){
  const l=Math.max(C[i][0],C[j][0]),r=Math.min(C[i][1],C[j][1]),w=r-l,h=Y[j]-Y[i],score=w**1.5*h;
  if(w>0&&(!best||score>best.score))best={score,left:l,top:Y[i],width:w,height:h};
 }
 return best&&{left:best.left,top:best.top,width:best.width,height:best.height};
}
// px clear of the rim; the width a menu is laid out at and its floor zoom; below minW x minH the cut is too small to hold a
// menu and the portal opens stepped in (the squat diamond).
const INSET={margin:10,layoutPx:240,minZoom:.6,minW:150,minH:190};
// on: lay the destination out for the cut (flat: into its rectangle; scene: fit cfg.fit); off: the whole window (step in).
function layoutInCut(dialog,on){
 const f=framed;if(!f)return;
 if(f.flat){
  if(!on){dialog.classList.remove('portal-inset');dialog.style.removeProperty('--inset-zoom');setFace(dialog,f.face);return;}
  const r=f.inset??=insetRect(f.outlines.shape),m=INSET.margin,box={left:r.left+m,top:r.top+m,width:r.width-2*m,height:r.height-2*m};
  setFace(dialog,box);dialog.classList.add('portal-inset');
  dialog.style.setProperty('--inset-zoom',Math.max(INSET.minZoom,Math.min(1,(box.width-40)/INSET.layoutPx)).toFixed(3));
  return;
 }
 const fit=f.cfg?.fit,el=fit&&dialog.querySelector(fit.sel);if(!el)return;
 if(!on){for(const k of ['height','margin-top','align-self'])el.style.removeProperty(k);return;}
 // The layer's band [top,bottom] (fractions of its height) spans the cut's height, its top at the cut's top.
 const ys=f.look.pts.map(p=>p[1]),top=Math.min(...ys),H=(Math.max(...ys)-top)/(fit.band[1]-fit.band[0]);
 el.style.setProperty('height',d2(H)+'px','important');el.style.setProperty('align-self','start','important');el.style.setProperty('margin-top',d2(top-f.face.top-fit.band[0]*H)+'px','important');
}
function throughCut(el){const r=el.getBoundingClientRect();return pointInPolygon(r.left+r.width/2,r.top+r.height/2,framed.outlines.shape);}
// clip-path for a shaped dialog: the outline (client px -> the dialog's box) plus the bar's box (a separate subpath; nonzero
// fill unions them). R7: nothing of a scene shows in front of the wall any more, so nothing else pokes through.
function clipFor(dialog,pts){
 const r=dialog.getBoundingClientRect(),o=([x,y])=>`${d2(x-r.left)} ${d2(y-r.top)}`,box=el=>el?.getClientRects().length?el.getBoundingClientRect():null;
 const bar=box(document.getElementById('coachDock')),parts=bar?[`M${o([bar.left,bar.top])}L${o([bar.right,bar.top])}L${o([bar.right,bar.bottom])}L${o([bar.left,bar.bottom])}Z`]:[];
 return `path('M${pts.slice(0,-1).map(o).join('L')}Z${parts.join('')}')`;
}
function clipTo(dialog,pts,{from=null,ms=0,ease='ease'}={}){
 const go=()=>{if(framed?.dialog!==dialog)return;motion(dialog,ms?`clip-path ${ms}ms ${ease}`:'none');dialog.style.clipPath=clipFor(dialog,pts);};
 if(from){motion(dialog,'none');dialog.style.clipPath=clipFor(dialog,from);settle().then(go);}else go();
}
function lean(on){
 const f=framed;if(!f?.look.shaped||!f.dialog||f.leaned===on)return;
 f.leaned=on;const dialog=f.dialog;leanButton(dialog.querySelector('[data-peer-lean]'),on,f.look.label);
 dialog.classList.toggle('portal-leaned',on);
 layoutInCut(dialog,!on);
 clipTo(dialog,on?f.outlines.rect:f.outlines.shape,{ms:prefersReducedMotion()?0:520,ease:'cubic-bezier(.3,0,.2,1)'});
 showAura(on?{...f.look,pts:rectPts(f.face),shaped:false}:f.look,'lean');
}
function leanButton(step,on,label){if(!step)return;step.setAttribute('aria-pressed',String(on));step.setAttribute('aria-label',`${on?'Step back from':'Step in to'} ${label}`);step.textContent=on?'⤡':'⤢';}
// #132: a whole window's name rides its upper rail, drawn left to right so it reads upright (the bottom rail is occupied by
// the physical dock). R7: a cut carries none.
const d2=v=>(+v).toFixed(1);
const pathD=pts=>`M${pts.slice(0,-1).map(([x,y])=>d2(x)+' '+d2(y)).join('L')}Z`;
export function namePath(face,gap=7){const y=d2(face.top-gap);return `M${d2(face.left)} ${y}L${d2(face.left+face.width)} ${y}`;}

// ---- #134 the energy round the open destination ---------------------------------------------------------------------
// Ian 23 Sept: "a vignetted colourful energy around the edge of the menu, in the shape of the portal that leads to it, but
// not covering the menus". The six neons flow round the window's outline with the shape's colour leading, as #130's
// Portal-style rim: round fire tongues, a burst on open and a fizzle on close. It never covers the menu: the colour sits
// in a band on the window's edge, outward over the quilt (or the frame's rail) and inward only as a faint vignette that
// is gone within ~20 px (inside the menus' own padding); nothing in it takes a pointer, and the name (#132) rides outside
// the window. Built from masks drawn once; the flow is a conic gradient turning inside them by transform, so running it
// costs the compositor, not a repaint. Static under reduced motion.
const AURA={spinMs:16000,flickerMs:1300,sparks:18,sparkMs:800,specPx:40,maskScale:.5,
 // R21 L2: the inward feather fades over featherFrac of the face's short side (was ~36px) at featherAlpha peak (was .9 stacked), shadeK scales the dark depth strokes, fullFrac/fullAlpha are the same for full-screen faces, fullCurve the falloff exponent (2 = ease-out, most of it near the edge), railAlpha the faint glow left on their rail (was solid).
 edgeAlpha:.5,featherFrac:.3,featherAlpha:.3,fullFrac:.2,fullAlpha:.2,fullCurve:2,railAlpha:.15,shadeK:.4,outK:.5,ringAlpha:.5,inset:12}; // outK scales the outward glow bands past the first; ringAlpha is the rim's own peak opacity (was .9); inset pulls shaped windows in from the face edge (px)
let aura=null;
// White-on-clear mask of the rim band: an inward vignette (clipped inside the outline), an outward glow (outside it) with
// round fire tongues (a seeded dash rhythm on a wide round-capped stroke). A soft glow needs no detail, so it's drawn once
// on a canvas at AURA.maskScale and handed over as a PNG: an SVG mask re-rasterised at the screen's full density cost
// hundreds of ms on the first frame. The hot rim line is a crisp stroke in the aura's own svg instead.
function rimMask(pts,w,h,seed,shaped,fullscreen=false,face=null){
 const k=AURA.maskScale,c=document.createElement('canvas');c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);
 const g=c.getContext('2d',{willReadFrequently:true}),path=new Path2D(pathD(pts)),outside=new Path2D(`M0 0H${w}V${h}H0Z${pathD(pts)}`);
 let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647,dash=(a,b)=>Array.from({length:12},()=>[a*(.3+r()),b*(.6+r())]).flat();
 g.scale(k,k);g.strokeStyle='#fff';g.lineJoin='round';
 const band=(width,alpha,dashes=null,cap='butt')=>{g.lineWidth=width;g.globalAlpha=alpha;g.lineCap=cap;g.setLineDash(dashes||[]);g.stroke(path);};
 g.save();if(face)g.clip(new Path2D(`M${face.left} ${face.top}h${face.width}v${face.height}h${-face.width}Z`)); // never over the rail, bolts or corners
 g.clip(outside,'evenodd');
 if(fullscreen){
   const image=g.createImageData(c.width,c.height),smooth=t=>t*t*(3-2*t),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),bx=Math.min(...xs),by=Math.min(...ys),bx2=Math.max(...xs),by2=Math.max(...ys),rail=Math.max(1,Math.min(bx,by,w-bx2,h-by2));
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const X=x/k,Y=y/k,dx=Math.max(bx-X,0,X-bx2),dy=Math.max(by-Y,0,Y-by2),d=Math.hypot(dx,dy),alpha=(d==0||d>=rail)?0:Math.round(255*AURA.railAlpha*(1-smooth(d/rail))**.8),i=4*(y*c.width+x);
    image.data[i]=image.data[i+1]=image.data[i+2]=255;image.data[i+3]=alpha;
   }
   g.putImageData(image,0,0);
  }
  else if(shaped){for(const [a,b] of [[5,.9],[12,.5],[24,.26],[42,.11],[66,.04]])band(a,a===5?AURA.ringAlpha:b*AURA.outK);band(24,.3,dash(5,44),'round');g.lineDashOffset=r()*60;band(14,.5,dash(3,30),'round');}
 else{for(const [a,b] of [[5,.85],[11,.4],[18,.16]])band(a,a===5?AURA.ringAlpha:b*AURA.outK);band(11,.32,dash(3,26),'round');}
 g.restore();
 // Last: the full-screen glow is a putImageData, which overwrites every pixel it covers, so the inward feather goes on top of it.
 g.save();g.clip(path);
 {const px=pts.map(p=>p[0]),py=pts.map(p=>p[1]),short=Math.min(Math.max(...px)-Math.min(...px),Math.max(...py)-Math.min(...py)),
   D=short*(fullscreen?AURA.fullFrac:AURA.featherFrac),peak=fullscreen?AURA.fullAlpha:AURA.featherAlpha,n=10;
  for(let i=0;i<n;i++)band(2*D*(1-i/n)**(fullscreen?AURA.fullCurve:1),peak/n); // stacked strokes: opacity falls off linearly from the rim to D inside
  band(4,AURA.edgeAlpha);} // the thin bright neon edge that still reads as a portal
 g.restore();
 return `url("${c.toDataURL()}")`;
}
const setMask=(el,url)=>{el.style.webkitMaskImage=url;el.style.maskImage=url;};
function hideAura(){aura?.anims.forEach(a=>a.cancel());aura?.el.remove();aura=null;}
// Closing: the rim fizzles (burst) and goes out, so nothing but the frame rides the way back.
function auraOut(){
 burst('close');const a=aura;if(!a)return;aura=null;
 a.el.animate([{opacity:1},{opacity:0}],{duration:prefersReducedMotion()?0:420,easing:'ease-in',fill:'forwards'}).finished.then(()=>{a.anims.forEach(x=>x.cancel());a.el.remove();},()=>{});
}
function showAura(look,why='open'){
 hideAura();
 if(!look?.pts)return;
 const w=Math.max(1,chrome.clientWidth),h=Math.max(1,chrome.clientHeight),d=pathD(look.pts),[cx,cy]=centroidOf(look.pts),strip=readLook().strip,seq=stripSeq(strip),reduced=prefersReducedMotion();
 const xs=look.pts.map(p=>p[0]),ys=look.pts.map(p=>p[1]),bx=Math.min(...xs),by=Math.min(...ys),bw=Math.max(...xs)-bx,bh=Math.max(...ys)-by;
 const el=document.createElement('div');el.className='portal-aura';el.setAttribute('aria-hidden','true');el.classList.toggle('shaped',!!look.shaped);
 el.style.cssText=`--aura:${strip};--aura-edge:color-mix(in srgb,${strip} 45%,#fff);--aura-seq:${[...seq,seq[0]].join(',')};--cx:${d2(cx)}px;--cy:${d2(cy)}px`;
 const label=look.id==='down'?'':String(look.label||'').toUpperCase().replace(/[<&>]/g,''); // Achievements already titles the scene inside the cut.
 // One static svg (the aperture's depth inside the outline, the name outside it) and one masked layer holding the
 // flow: two neon wheels turning against each other (the second flickering, for the fire) and the specular blob.
 el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><path id="portalAuraP" d="${d}"/><clipPath id="portalAuraIn"><use href="#portalAuraP"/></clipPath>${look.name?`<path id="portalAuraName" d="${look.name}"/>`:''}</defs><g clip-path="url(#portalAuraIn)" fill="none" stroke-linejoin="round"><use href="#portalAuraP" stroke="#07040b" stroke-opacity="${d2(.2*AURA.shadeK)}" stroke-width="34"/><use href="#portalAuraP" stroke="#07040b" stroke-opacity="${d2(.28*AURA.shadeK)}" stroke-width="15"/><use href="#portalAuraP" stroke="#fff" stroke-opacity=".6" stroke-width="2.4"/></g><use href="#portalAuraP" fill="none" stroke="var(--aura-edge)" stroke-width="2.5" stroke-linejoin="round"/>`
  +(label&&look.name?`<text class="portal-aura-name"><textPath href="#portalAuraName" startOffset="50%" text-anchor="middle">${label}</textPath></text>`:'')+'</svg>'
  +'<i class="portal-aura-fire"><i></i><i class="b"></i><i class="portal-aura-spec"></i></i>';
 const fire=el.querySelector('.portal-aura-fire'),[wa,wb,blob]=fire.children;
 const fl=parseFloat(chrome.style.getPropertyValue('--face-left')),ft=parseFloat(chrome.style.getPropertyValue('--face-top')),fw=parseFloat(chrome.style.getPropertyValue('--face-width')),fh=parseFloat(chrome.style.getPropertyValue('--face-height')),
  face=[fl,ft,fw,fh].every(Number.isFinite)?{left:fl,top:ft,width:fw,height:fh}:null;
 setMask(fire,rimMask(look.pts,w,h,7,look.shaped,look.fullscreen,look.fullscreen?null:face)); // full-screen faces keep their deliberate rail glow (R19)
 const R=Math.max(bw,bh)*.45,far=Math.ceil(Math.max(...[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>Math.hypot(x-cx,y-cy))));
 blob.style.cssText=`left:${d2(bx+bw*.2-R/2)}px;top:${d2(by+bh*.14-R/2)}px;width:${d2(R)}px;height:${d2(R)}px`;
 for(const wheel of [wa,wb])wheel.style.cssText=`left:${d2(cx-far)}px;top:${d2(cy-far)}px;width:${2*far}px;height:${2*far}px`;
 chrome.append(el);
 aura={el,look,spec:blob,anims:[]};
 if(reduced)return;
 aura.anims.push(wa.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:AURA.spinMs,iterations:Infinity}),
  wb.animate([{transform:'rotate(360deg)'},{transform:'rotate(0deg)'}],{duration:AURA.spinMs*.62,iterations:Infinity}),
  wb.animate([{opacity:.15},{opacity:.7}],{duration:AURA.flickerMs,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}),
  el.animate([{opacity:0},{opacity:1}],{duration:why==='open'?420:260,easing:'ease-out'}));
 if(why==='open')burst('open');
}
// #130's open burst / close fizzle: a white flash along the rim and sparks flying off it (open) or falling into the
// core (close). Compositor-only (transform and opacity), gone in under a second.
function burst(kind){
 if(!aura||prefersReducedMotion())return;
 const {el,look}=aura,pts=look.pts,[cx,cy]=centroidOf(pts),close=kind==='close';
 const flash=document.createElement('i');flash.className='portal-aura-flash';setMask(flash,el.querySelector('.portal-aura-fire').style.maskImage);el.append(flash);
 flash.animate([{opacity:close?.6:.95},{opacity:0}],{duration:close?420:620,easing:'ease-out',fill:'forwards'}).finished.then(()=>flash.remove(),()=>flash.remove());
 for(let k=0;k<AURA.sparks;k++){
  const i=Math.floor(Math.random()*(pts.length-1)),f=Math.random(),x=pts[i][0]+(pts[i+1][0]-pts[i][0])*f,y=pts[i][1]+(pts[i+1][1]-pts[i][1])*f;
  const dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy)||1,go=(close?-1:1)*(16+Math.random()*48),b=document.createElement('b');
  b.style.left=d2(x)+'px';b.style.top=d2(y)+'px';b.style.background=k%3?'#fff':look.color;el.append(b);
  b.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${d2(dx/l*go)}px,${d2(dy/l*go)}px) scale(.2)`,opacity:0}],{duration:AURA.sparkMs*(.55+Math.random()*.6),easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}).finished.then(()=>b.remove(),()=>b.remove());
 }
}

// ---- #135 #126 looking round the scene behind the window ------------------------------------------------------------
// The eye follows the phone's tilt from a baseline caught when the destination opens (clamped to PEER.deg, smoothed, and
// drifting back to centre once the phone has been held still for stillMs), or, on flat menus with no tilt, a finger drag
// (springing back on release). It slides each destination's layers against the fixed frame (depths below) and drives the
// 3D scenes' off-axis cameras through peer.mjs. iOS asks once, from a chip on the first 3D destination (never a modal),
// and the answer is kept. Off under reduced motion and in camera-only mode (D24); paused while the page is hidden.
// dead (R7, Ian's Android): a new reading must move the eye by this share of full tilt (about half a degree) or it is
// sensor noise and ignored, so a phone held still lets the look-around stop instead of restyling every frame.
const PEER={deg:12,smoothMs:110,stillMs:1500,drift:.015,dragPx:160,dead:.04};
const TILT_KEY='myr5.tiltPermission';
// Any framed destination can mark its own layers data-peer-depth="far|mid|near": they slide PEER_LAYER px at full tilt
// (far with the eye, near against it), times the destination's strength; the dialog also carries --peer-x/--peer-y
// (-1..1) while a flat menu sits in a cut (.portal-inset, the only CSS that reads them: on anything else they would restyle
// the whole menu every frame). Per destination: move: px the whole dialog slides (flat menus, a third of the scenes' range);
// layers: [selector,px] for destinations that don't mark theirs (nested ones add up); scene: a 3D scene reading peer.mjs
// (no drag look-around: a drag there turns the scene; it fills its cut, see shapeDialog); chip: offer iOS's tilt
// permission (the scenes always do); cards/fit: shapeDialog.
const PEER_LAYER={far:14,mid:5,near:-4};
const PEER_DEPTH=[
 ['#accountPanel.classroom-panel',{scene:true}],
 ['#mealsPanel',{scene:true,cards:'.pyramid-zoom,#foodDial,#mealConfirmation',fit:{sel:'#pyramidScanner',band:[0,1]}}],
 ['#remindersPanel',{scene:true,layers:[['.reminders-computer-stage',8],['.reminders-computer-screen',3]]}],
 ['dialog.ship-view',{scene:true,layers:[['.ship-view-bg',16],['.ship-view-coach',5]]}],
 // The constellation's bosses (7.5-90% of the art's height) span the cut: its top row along the inverted triangle's top.
 ['.ach-board',{scene:true,layers:[['.ach-stage',10],['.ach-stars',-4]],cards:'.ach-detail',fit:{sel:'.ach-stage',band:[.075,.9]}}],
 ['.meditation-panel',{move:2,strength:.6,chip:true}], // #127: the still room peers in too, gentler
];
const PEER_2D={move:4};
const peer={dialog:null,cfg:null,els:[],depths:[],flatEls:[],x:0,y:0,tx:0,ty:0,base:null,prev:null,stillT:0,raf:0,last:0,drag:null,sensor:false,ctl:null,watch:null};
const clamp1=v=>Math.max(-1,Math.min(1,v));
function tiltAccess(){
 if(typeof DeviceOrientationEvent==='undefined')return 'none';
 if(typeof DeviceOrientationEvent.requestPermission!=='function')return 'free';
 try{return localStorage.getItem(TILT_KEY)||'ask';}catch{return 'ask';}
}
function peerOn(dialog){
 peerOff();
 if(prefersReducedMotion()||document.body.dataset.cameraWorkout==='true')return;
 const cfg=peerCfg(dialog),signal=(peer.ctl=new AbortController()).signal;
 Object.assign(peer,{dialog,cfg,x:0,y:0,tx:0,ty:0,base:null,drag:null,sensor:false});
 refreshPeerTargets(dialog,cfg);
 peer.watch=new MutationObserver(()=>{if(peer.dialog!==dialog)return;refreshPeerTargets(dialog,cfg);kickPeer();});
 peer.watch.observe(dialog,{subtree:true,childList:true,attributes:true,attributeFilter:['data-peer-depth']});
 const access=tiltAccess();
 if(access==='free'||access==='granted')addEventListener('deviceorientation',onOrient,{signal});
 else if(access==='ask'&&(cfg.scene||cfg.chip))tiltChip(dialog);
 if(!cfg.scene&&!dialog.classList.contains('portal-fullscreen')){ // a full-screen room keeps its own drag (meditation's)
  dialog.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!peer.sensor)peer.drag={x:e.clientX,y:e.clientY,id:e.pointerId};},{signal,passive:true});
  dialog.addEventListener('pointermove',e=>{const g=peer.drag;if(g?.id!==e.pointerId)return;peer.tx=clamp1((e.clientX-g.x)/PEER.dragPx);peer.ty=clamp1((e.clientY-g.y)/PEER.dragPx);kickPeer();},{signal,passive:true});
  for(const type of ['pointerup','pointercancel'])dialog.addEventListener(type,e=>{if(peer.drag?.id===e.pointerId){peer.drag=null;peer.tx=peer.ty=0;kickPeer();}},{signal,passive:true});
 }
 if(framed?.direct){
  dialog.addEventListener('pointermove',e=>{if(peer.sensor||document.hidden)return;const r=dialog.getBoundingClientRect();peer.tx=clamp1((e.clientX-r.left-r.width/2)/(r.width*.45));peer.ty=clamp1((e.clientY-r.top-r.height/2)/(r.height*.45));kickPeer();},{signal,passive:true});
  dialog.addEventListener('pointerleave',()=>{if(!peer.sensor){peer.tx=peer.ty=0;kickPeer();}},{signal,passive:true});
 }
 document.addEventListener('visibilitychange',()=>{peer.base=null;if(document.hidden){cancelAnimationFrame(peer.raf);peer.raf=0;peer.last=0;}else kickPeer();},{signal});
 addEventListener('orientationchange',()=>{peer.base=null;},{signal});
}
function peerOff(){
 peer.ctl?.abort();peer.ctl=null;peer.watch?.disconnect();peer.watch=null;cancelAnimationFrame(peer.raf);peer.raf=0;
 const {dialog}=peer;
 if(dialog){
  for(const k of ['left','top','--peer-x','--peer-y'])dialog.style.removeProperty(k);
  dialog.querySelector(':scope>.portal-peer-ui>.portal-tilt-chip')?.remove();
  for(const el of dialog.querySelectorAll('[data-peer-depth]'))el.style.translate='';
 }
 for(const [el] of peer.els)el.style.translate='';
 for(const el of peer.flatEls)el.style.translate='';
 Object.assign(peer,{dialog:null,cfg:null,els:[],depths:[],flatEls:[],x:0,y:0,tx:0,ty:0,last:0,drag:null,sensor:false});eye.x=eye.y=0;
 if(aura?.spec)aura.spec.style.translate='';
}
function refreshPeerTargets(dialog=peer.dialog,cfg=peer.cfg){
 if(!dialog||!cfg)return;
 peer.els=(cfg.layers||[]).flatMap(([s,px])=>[...dialog.querySelectorAll(s)].map(el=>[el,px]));
 peer.depths=[...dialog.querySelectorAll('[data-peer-depth]')];
 peer.flatEls=framed?.direct&&dialog.classList.contains('portal-fullscreen')&&!cfg.scene
  ?[...dialog.children].filter(el=>el.id!=='coachDock'&&!el.matches('.portal-peer-ui')):[];
}
const wrap180=a=>((a+180)%360+360)%360-180;
function onOrient(e){
 if(e.beta==null||e.gamma==null||!peer.dialog)return;
 const now=performance.now(),b=e.beta,g=e.gamma;peer.sensor=true;peer.drag=null;
 if(!peer.base){peer.base={b,g};peer.prev={b,g};peer.stillT=now;}
 if(Math.abs(b-peer.prev.b)+Math.abs(g-peer.prev.g)>.6)peer.stillT=now;
 peer.prev={b,g};
 if(now-peer.stillT>PEER.stillMs){peer.base.b+=wrap180(b-peer.base.b)*PEER.drift;peer.base.g+=wrap180(g-peer.base.g)*PEER.drift;}
 let dB=clamp1(wrap180(b-peer.base.b)/PEER.deg),dG=clamp1(wrap180(g-peer.base.g)/PEER.deg);
 if((screen.orientation?.angle||0)%180)[dB,dG]=[dG,-dB];
 if(Math.abs(dG-peer.tx)+Math.abs(dB-peer.ty)<PEER.dead)return;
 // As through a real window: turn the phone's face to the left (its right edge back) and the eye is now to the window's
 // right, so the pyramid shows its right side (Ian); tip the top edge back and the eye drops below it.
 peer.tx=dG;peer.ty=dB;kickPeer();
}
// Each run of steps (until the eye settles) looks its depth layers up once: a scene may add layers after it opens.
function kickPeer(){if(!peer.raf&&peer.dialog&&!document.hidden){if(!peer.last){peer.last=performance.now();refreshPeerTargets();}peer.raf=requestAnimationFrame(stepPeer);}}
function stepPeer(now){
 peer.raf=0;
 const k=1-Math.exp(-Math.max(0,now-peer.last)/PEER.smoothMs);peer.last=now; // low-pass by time, the same at any frame rate
 peer.x+=(peer.tx-peer.x)*k;peer.y+=(peer.ty-peer.y)*k;
 if(Math.abs(peer.tx-peer.x)+Math.abs(peer.ty-peer.y)<.002){peer.x=peer.tx;peer.y=peer.ty;peer.last=0;}else kickPeer();
 const {x,y,cfg,dialog}=peer;if(!dialog)return;
 eye.x=x;eye.y=y;
 const full=dialog.classList.contains('portal-fullscreen');
 if(cfg.move&&framed?.face&&!framed.look.shaped&&!full){dialog.style.setProperty('left',d2(framed.face.left+x*cfg.move)+'px','important');dialog.style.setProperty('top',d2(framed.face.top+y*cfg.move)+'px','important');}
 if(dialog.classList.contains('portal-inset')){dialog.style.setProperty('--peer-x',x.toFixed(3));dialog.style.setProperty('--peer-y',y.toFixed(3));}
 const slide=(el,px)=>{el.style.translate=`${d2(x*px)}px ${d2(y*px)}px`;};
 for(const [el,px] of peer.els)slide(el,px);
 for(const el of peer.depths)slide(el,(PEER_LAYER[el.dataset.peerDepth]||0)*(cfg.strength??1));
 for(const el of peer.flatEls)slide(el,cfg.move||PEER_2D.move);
 if(aura?.spec)aura.spec.style.translate=`${d2(-x*AURA.specPx)}px ${d2(-y*AURA.specPx)}px`;
}
// iOS 13+: DeviceOrientationEvent.requestPermission() needs a tap. A small chip in the window's corner, never a modal.
function tiltChip(dialog){
 const chip=document.createElement('button'),f=framed?.face;chip.type='button';chip.className='portal-tilt-chip';chip.innerHTML='Tilt to look around <b>Allow</b>';
 if(f){
  const dockEl=document.getElementById('coachDock'),dock=dockEl?.getClientRects().length?dockEl.getBoundingClientRect():null;
  chip.style.left=f.left+8+'px';
  chip.style.top=Math.max(f.top+8,Math.min(f.top+f.height-26,dock?.top==null?Infinity:dock.top-26))+'px'; // R19: a slim tab sitting on the dock's top edge, left side (meditation's counter chip is bottom-right)
 }
 chip.onclick=async()=>{
  let answer='denied';try{answer=await DeviceOrientationEvent.requestPermission();}catch{}
  try{localStorage.setItem(TILT_KEY,answer==='granted'?'granted':'denied');}catch{}
  chip.remove();
  if(answer==='granted'&&peer.dialog===dialog)addEventListener('deviceorientation',onOrient,{signal:peer.ctl.signal});
 };
 peerUi(dialog).append(chip); // hidden while a scene is peered at (portal.css): full screen offers it
}
function status(text){statusEl.textContent=text;}

// Layout size, not the on-screen box: the observer also fires as the portal is shown mid-dive (scaled), and a backing
// store sized from the scaled box drew every later trail and outline shrunk toward the corner.
function resizeOverlay(){
 const dpr=Math.min(devicePixelRatio||1,2),r={width:overlay.clientWidth,height:overlay.clientHeight};
 overlay.width=Math.round(Math.max(1,r.width)*dpr);overlay.height=Math.round(Math.max(1,r.height)*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function mapOverlayClientSpace(){
 const dpr=Math.min(devicePixelRatio||1,2),r=overlay.getBoundingClientRect(),w=overlay.clientWidth||1,h=overlay.clientHeight||1,sx=w/Math.max(1,r.width),sy=h/Math.max(1,r.height);
 ctx.setTransform(dpr*sx,0,0,dpr*sy,-r.left*dpr*sx,-r.top*dpr*sy);
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

// #104 idle ambient flash: which id is showing right now, and how strongly, given the time since the cycle began.
function idleFrame(now){
 const elapsed=now-idleCycle.t0,dur=IDLE.slowMs,slot=dur+IDLE.gapMs,t=elapsed%slot;
 if(t>=dur)return null; // #133: the gap between shapes
 return{id:IDLE_ORDER[Math.floor(elapsed/slot)%IDLE_ORDER.length],alpha:Math.max(.12,.5*Math.min(1,t/60,(dur-t)/60))};
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
function drawIdleShape({polys,color,label,labelPt,arrow},alpha,width,rect,drawRouteLabel=true){
 polys.forEach(p=>strokeGlow(p,color,alpha,width));
 if(arrow)drawArrow(arrow.from,arrow.to,color,alpha);
 if(drawRouteLabel)drawLabel(label,labelPt,color,alpha,rect);
}
function drawIdle(now){
 const rect=board?board.patternRect():fallbackRect(),face=board?board.faceRect():rect;
 if(idleCycle.static){IDLE_ORDER.forEach(id=>drawIdleShape(idleShapeInfo(id,rect),.35,3,face,false));return;}
 const f=idleFrame(now);
 if(f)drawIdleShape(idleShapeInfo(f.id,rect),f.alpha,3,face);
}

// #22 first-run hint: a glowing fingertip traces the stitched square once, labelled, the first time the
// quilt shows (never again once seen). localStorage is wrapped in try/catch — sandboxed frames and
// private-mode Safari throw, and a blocked flag must never crash the hint (or nag every visit: on error we
// act as if it's already been seen).
function hintSeen(){try{return localStorage.getItem(HINT_KEY)==='1';}catch{return true;}}
function markHintSeen(){try{localStorage.setItem(HINT_KEY,'1');}catch{}}
// Points on a closed polyline from its start up to `frac` of the way around (arc-length, not index).
function tracedPrefix(pts,frac){
 const segs=[];let total=0;
 for(let i=0;i<pts.length-1;i++){total+=segs[i]=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);}
 let left=frac*total,out=[pts[0]];
 for(let i=0;i<segs.length;i++){
  if(segs[i]>=left){const f=segs[i]?left/segs[i]:0;const[ax,ay]=pts[i],[bx,by]=pts[i+1];out.push([ax+(bx-ax)*f,ay+(by-ay)*f]);break;}
  left-=segs[i];out.push(pts[i+1]);
 }
 return out;
}
// Coordinates with idle flashing (COMMON): idleEligible() also checks `!hint` so the two never overlap;
// starting/stopping the hint just re-runs scheduleIdle() to pick that up, without touching idle's own state.
function maybeStartHint(){
 // Ian 2026-09-23: "the magical finger is only for the quilt" — same board-scoping as the trail above.
 if(hint||idleCycle||hintSeen()||boardId!=='quilt')return;
 hint={t0:performance.now()};
 scheduleIdle();kickRender();
}
function stopHint(){
 if(!hint)return;
 hint=null;
 scheduleIdle();
}
function drawHint(now){
 const rect=board?board.patternRect():fallbackRect(),face=board?board.faceRect():rect;
 const elapsed=now-hint.t0;
 if(elapsed>=HINT_MS){stopHint();return;} // one lap done: clear it through stopHint so idle re-arms too
 const pts=shapeClipPts('rect',rect),reduced=prefersReducedMotion();
 strokeGlow(pts,'#ffffff',.18,3);
 const prefix=reduced?pts:tracedPrefix(pts,elapsed/HINT_MS);
 strokeGlow(prefix,'#ffffff',.9,4);
 const tip=prefix[prefix.length-1];touchDot(tip[0],tip[1],'#ffffff');
 drawLabel('Trace to start your workout',pts[0],'#ffffff',.85,face);
}

// #20 tap as well as trace: nearest tappable shape outline to a client-px point, or null past TAP_HIT_PX.
// Point-to-segment distance over each candidate's own closed outline (shapeClipPts), not nearest vertex, so
// a 5-corner rect/diamond still hit-tests accurately along its straight edges.
function distToPolyline(pt,pts){
 let best=Infinity;
 for(let i=0;i<pts.length-1;i++){
  const[ax,ay]=pts[i],[bx,by]=pts[i+1],dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
  const t=len2?Math.max(0,Math.min(1,((pt[0]-ax)*dx+(pt[1]-ay)*dy)/len2)):0;
  best=Math.min(best,Math.hypot(pt[0]-(ax+dx*t),pt[1]-(ay+dy*t)));
 }
 return best;
}
function nearestTapShape(x,y){
 const rect=board?board.patternRect():fallbackRect();
 let bestId=null,bestDist=TAP_HIT_PX;
 for(const id of TAPPABLE_IDS){
  const d=distToPolyline([x,y],shapeClipPts(id,rect));
  if(d<=bestDist){bestDist=d;bestId=id;}
 }
 return bestId;
}

// now: the trail probe draws a frozen frame at a chosen time (rAF's own timestamp arrives first and is ignored).
function drawFrame(_,now=performance.now()){
 // #104 risk 4: eligibility (no open dialog, tab visible, etc.) is otherwise only rechecked when the
 // cycle arms/starts, so a dialog opened over a running cycle (setup gate, a reward reveal) would keep
 // flashing underneath it. Catch that on the very next drawn frame instead.
 if(idleCycle&&!idleEligible())scheduleIdle();
 rafId=0;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);ctx.restore();
 mapOverlayClientSpace();
 if(outlineFlash){
  const dur=outlineFlash.duration||350,t=now-outlineFlash.start;
  if(t<dur){
   const alpha=1-t/dur;
   outlineFlash.polys.forEach(p=>strokeGlow(p,outlineFlash.color,alpha,4));
   if(outlineFlash.label)drawLabel(outlineFlash.label,outlineFlash.labelPt,outlineFlash.color,Math.min(.6,alpha),board?board.faceRect():fallbackRect());
  }else outlineFlash=null;
 }
 if(idleCycle)drawIdle(now);
 // Any active pointer — a real touch (wirePointerEvents' own pointerdown already calls stopHint()
 // synchronously, before this ever runs) or the test-only trailProbe's simulated one — ends the hint for
 // good; probeFrozen means trailProbe wants a clean frame with nothing else drawn on it.
 if(hint){if(pointers.size)stopHint();else if(!probeFrozen)drawHint(now);}
 if(phase?.pulse&&phase.pts)strokeGlow(phase.pts,phase.color,.4+.25*Math.sin((now-phase.t0)/280),3); // soft breathing outline while loading
 for(let i=fading.length-1;i>=0;i--)if(now-fading[i].pts.at(-1).t>=TRAIL_FADE_MS)fading.splice(i,1);
 const reduced=prefersReducedMotion();
 // Ian 2026-09-23: "the magical finger is only for the quilt" — other boards (ice, grass, cogs, jelly,
 // wood) bring their own touch effects, so the trail only draws while the mounted board is the quilt.
 if(boardId==='quilt'){
  for(const p of pointers.values())reduced?renderPlainTrail(p.pts,now):renderRibbon(p.pts,now,true);
  for(const entry of fading){
   if(reduced){renderPlainTrail(entry.pts,now);continue;}
   renderRibbon(entry.pts,now,false);drawShimmer(entry,now); // #105: a shimmer ripples along the path as it fades
  }
  if(!reduced)drawSparks(now);
 }
 if(pointers.size||fading.length||outlineFlash||(idleCycle&&!idleCycle.static)||(phase?.pulse)||(!reduced&&sparksAlive(now))||hint)kickRender();
}
// opts (#21 "almost"): {label,labelPt,duration} — a plain match flash stays the original quick 350ms
// outline-only pulse; an "almost" flash carries a fading label and runs ~1.2s (ALMOST_MS below).
function flashOutline(polys,color,opts){if(prefersReducedMotion())return;outlineFlash={polys,color,start:performance.now(),...opts};kickRender();}

// #104: arms/disarms the idle cycle from every place eligibility can change (touch, sequence start/end,
// show/hide, tab visibility). Always safe to call — it's a no-op when nothing needs to change.
function idleEligible(){return boardShown&&!busy&&!hint&&pointers.size===0&&!document.hidden&&!document.querySelector('dialog[open]');}
function scheduleIdle(){
 clearTimeout(idleTimer);idleTimer=0;
 if(idleCycle){idleCycle=null;kickRender();} // clears the drawn hint on the next frame
 if(idleEligible())idleTimer=setTimeout(beginIdleCycle,IDLE.armMs);
}
function beginIdleCycle(){
 idleTimer=0;
 if(!idleEligible())return;
 idleCycle=prefersReducedMotion()?{static:true}:{t0:performance.now()};
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
const tunnelFragment=(material='')=>`#version 300 es
precision highp float;
uniform vec2 uRes,uC,uLP;uniform float uR,uT,uSpin,uSweep,uLens,uBevel,uPr,uFringe,uMag,uN;uniform vec3 uSeq[10],uCore,uTint;uniform float uBlur;uniform sampler2D uMap;uniform sampler2D uPeek;uniform float uPeekOn;out vec4 o;
vec3 seq(float i){return uSeq[int(mod(i,uN))];}
${material}
vec3 tunnel(vec2 p,float fz){
 float aa=1.-smoothstep(.25,.9,fz); // fade ring detail that gets finer than a pixel
 vec2 d=(p-uC)/uR;float r=max(length(d),1e-3),z=3.4/r,a=atan(d.y,d.x)+uSpin+.12*z;
 float v=z-uT+.35*sin(a*3.+z*.5)*aa,i=floor(v),f=v-i;         // wavy ring edges: the colours flow, not a target
 vec3 c=mix(seq(i),seq(i+1.),smoothstep(.65,1.,f));
 c*=mix(.85,.55+.45*(.5+.5*sin(a*7.+v*6.2832)),aa); // twisted streaks
 c+=max(pow(f,12.),1.-smoothstep(0.,1.5*fz,f))*aa*(c*.8+.35); // bright leading edge of each ring, antialiased across the wrap
${material ? ' c=material(a,v,z,r,aa,c);' : ''}
 c=mix(c,uCore,smoothstep(7.,40.,z));            // depth fog: the far end glows
 c+=uCore*exp(-r*16.)*1.1;                        // bright core at the vanishing point
 return c*mix(1.,.78,smoothstep(1.,1.8,r));      // walls dim a little toward the opening (more turns neon yellow olive)
}
void main(){
 vec2 p0=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);vec4 m=texture(uMap,p0/uRes);
 vec2 n=m.rg*2.-1.;n/=max(length(n),1e-3);
 float sd=(m.b-.5)*2.*uBevel,e=clamp(sd/uBevel,0.,1.),bend=(1.-e)*(1.-e);
 vec2 p=uC+(p0-uC)/(1.+uMag*e);                  // #125: the flat middle magnifies a little, like a lens
 float fz=fwidth(3.4*uR/max(length(p-uC),1e-3)); // ring depth change per pixel
 vec2 off=n*uLens*bend;                           // refraction: the thick bevel shows the tunnel from further out
 vec3 c=uFringe>0.&&bend>.02?vec3(tunnel(p+off*(1.-uFringe),fz).r,tunnel(p+off,fz).g,tunnel(p+off*(1.+uFringe),fz).b):tunnel(p+off,fz); // dispersion: blue bends furthest
 if(uBlur>0.)c=mix(c,tunnel(uC+(p+off-uC)*1.016,fz),uBlur); // short radial exposure
 if(uPeekOn>0.){vec2 q=(p+off)/uRes;c=mix(c,pow(texture(uPeek,vec2(q.x,1.-q.y)).rgb,vec3(.4545)),uPeekOn*(1.-smoothstep(.3,.75,length((p0-uC)/uRes)*2.))*step(0.,sd));} // PORTAL-PEEK: the destination in the centre, the wormhole at the rim
 float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.45)*.9+.07; // frosted: lifted, saturation boosted
 c=mix(c,vec3(l)*.55+.42,.2*bend);                // frost in the bevel band only: a milky thick edge against the clear middle
 vec2 L=normalize(uLP-p0);float lit=max(dot(n,L),0.),far=max(-dot(n,L),0.); // lit from the finger (or the top-left)
 c+=(1.-smoothstep(0.,4.*uPr,abs(sd)))*(1.9*pow(lit,1.4)+.5*pow(far,3.)); // bright specular rim facing the light, faint glint opposite
 c+=bend*(1.-e)*.3*(.5+.5*lit);                   // Fresnel: the whole bevel brightens toward the rim
 float inner=(1.-smoothstep(0.,28.*uPr,sd))*step(0.,sd);
 c=mix(c,c*.45+.08,inner*far*.8)+inner*inner*lit*.4; // darker inner edge on the far side, glow inside the lit edge
 c+=.1*(1.-smoothstep(0.,.75,length((p0-uLP)/uRes*.6)))*step(0.,sd); // broad glare toward the light
 if(sd<0.)c*=.55;                                 // beyond the rim, under the cloth's ragged edge
 float s=dot(p0/length(uRes),normalize(vec2(1.,.45)))-uSweep;c+=exp(-s*s*160.)*.2*step(0.,sd); // light sweep
 o=vec4(c+(fract(sin(dot(p0,vec2(12.9898,78.233)))*43758.5453)-.5)/255.,1);
}`;
// One WebGL2 context for the portal's life, created on the first glass and reused; null when unavailable (CSS glass then).
let tunnel=null;
function tunnelGL(material='',{activate=true}={}) {
 const uniforms=['uRes','uC','uLP','uR','uT','uSpin','uSweep','uLens','uBevel','uPr','uFringe','uMag','uN','uSeq','uCore','uTint','uBlur','uPeek','uPeekOn'];
 if(!tunnel){
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl)return null;
  const owner={canvas,gl,programs:new Map(),texture:gl.createTexture(),active:null};tunnel=owner;
  gl.bindTexture(gl.TEXTURE_2D,owner.texture);
  for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
  canvas.addEventListener('webglcontextlost',()=>{
   owner.programs.clear();if(tunnel===owner)tunnel=null;
   canvas.parentNode?.classList.remove('gl');canvas.remove();
  });
 }
 const owner=tunnel,{gl,canvas}=owner;
 let selected=owner.programs.get(material),compiled=false;
 if(!selected){
  const vs=gl.createShader(gl.VERTEX_SHADER),fs=gl.createShader(gl.FRAGMENT_SHADER),program=gl.createProgram();
  const compile=(shader,source)=>{gl.shaderSource(shader,source);gl.compileShader(shader);return gl.getShaderParameter(shader,gl.COMPILE_STATUS);};
  const valid=compile(vs,TUNNEL_VS)&&compile(fs,tunnelFragment(material));
  if(!valid){gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteProgram(program);return null;}
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return null;}
  const u={};for(const k of uniforms)u[k]=gl.getUniformLocation(program,k);
  selected={program,u};owner.programs.set(material,selected);compiled=true;
  // Warm each new linked program once so the first full-size frame doesn't pay lazy driver setup cost.
  // Restore the prior program: a deferred cache fill can run while another material owns a live phase.
  if(owner.programs.size===1)canvas.width=canvas.height=1;
  const previous=gl.getParameter(gl.CURRENT_PROGRAM),previousViewport=gl.getParameter(gl.VIEWPORT);
  gl.useProgram(program);gl.bindTexture(gl.TEXTURE_2D,owner.texture);gl.viewport(0,0,1,1);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));gl.useProgram(previous);gl.viewport(...previousViewport);
 }
 if(activate){gl.useProgram(selected.program);owner.active=selected;owner.u=selected.u;}
 return owner;
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const easeInOut=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// PORTAL-PEEK (R17, on by default; localStorage.myr5PortalPeek="0" is the kill switch): the destination rendered offscreen (portal-peek.mjs)
// and sampled in the wormhole's centre on texture unit 1. Loads after the wormhole starts; fades in once ready; any
// failure, a lost context or the lite fallback leaves the plain wormhole.
function startPeek(ph,{gl,active:{program,u}},w,h){
 let flag=null;try{flag=localStorage.getItem('myr5PortalPeek');}catch{}
 if(!ph.peek||flag==='0')return null;
 const s={peek:null,tex:null,on:0,n:0,dead:false};
 import('./portal-peek.mjs').then(m=>m.openPeek(ph.peek,w,h)).then(peek=>{
  if(!peek)return;if(s.dead||gl.isContextLost())return peek.dispose();
  s.peek=peek;s.tex=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,s.tex);
  for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,peek.width,peek.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.activeTexture(gl.TEXTURE0);
 }).catch(()=>{});
 s.frame=(dt,now)=>{
  if(!s.peek)return;if(s.peek.lost()){s.stop();gl.useProgram(program);gl.uniform1f(u.uPeekOn,0);return;}
  if(s.n++&1)return; // ponytail: half rate (each read stalls the GPU); go every frame if phones show judder
  s.peek.render(now);const px=s.peek.read();
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,s.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,s.peek.width,s.peek.height,gl.RGBA,gl.UNSIGNED_BYTE,px);gl.activeTexture(gl.TEXTURE0);
  s.on=Math.min(1,s.on+dt*5);gl.useProgram(program);gl.uniform1f(u.uPeekOn,s.on);
 };
 s.stop=()=>{s.dead=true;s.peek?.dispose();s.peek=null;if(s.tex)gl.deleteTexture(s.tex);s.tex=null;};
 return s;
}
// Runs the wormhole for one glass phase: speed ramps up across the cut + loading phase, the vanishing point drifts
// toward the finger (and with device tilt where that needs no permission prompt). Reduced motion uses static CSS glass.
// ph.stop() freezes it (at the reveal) and endPhase() always stops it.
async function startTunnel(ph,poly,color,all){
 const capturedBoardId=boardId,capturedSignal=lifecycle?.signal;
 let cancelled=false,raf=0,tiltOk=false,onTilt=null;
 // Install cancellation before any optional material import can yield. Standalone wormholes have their own phase object.
 ph.stop=()=>{cancelled=true;cancelAnimationFrame(raf);if(tiltOk&&onTilt)removeEventListener('deviceorientation',onTilt);};
 const palette=!all?paletteFor(capturedBoardId,store.get(paletteKey(capturedBoardId))):null;
 const seq=all||capturedBoardId==='quilt'?ringColours(color,all):palette?.colors||ringColours(color,all),core=palette?.core||color;
 ph.glass.dataset.tunnel=capturedBoardId;ph.glass.style.setProperty('--tint',boardTint(capturedBoardId));
 const [seq0,...seqN]=seq;ph.glass.style.setProperty('--seq0',seq0);ph.glass.style.setProperty('--seq',seqN.join(','));
 if(prefersReducedMotion())return; // CSS uses the selected sequence without creating WebGL under reduced motion.
 let material='';
 if(!all&&palette&&capturedBoardId!=='quilt'){
  let pending=materialLoads.get(capturedBoardId);
  if(!pending){pending=import(`./portal-tunnel-${capturedBoardId}.mjs`).then(m=>typeof m.material==='string'?m.material:'').catch(()=> '');materialLoads.set(capturedBoardId,pending);}
  material=await Promise.race([pending,sleep(900).then(()=> '')]);
 }
 if(cancelled||!ph.glass.isConnected||capturedSignal?.aborted)return;
 const t=tunnelGL(material);if(!t)return;
 const {gl,canvas}=t,{program,u}=t.active,{left,top,w,h}=ph.box,reduced=prefersReducedMotion();
 const bindPhaseProgram=()=>gl.useProgram(program);
 bindPhaseProgram();
 gl.bindTexture(gl.TEXTURE_2D,t.texture);
 const tex=lensMap((ph.fullscreen?poly:bleedPts(poly,-GLASS.rimInset)).map(([x,y])=>[x-left,y-top]),w,h);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,tex.mw,tex.mh,0,gl.RGBA,gl.UNSIGNED_BYTE,tex.data);
 const flat=new Float32Array(30);seq.forEach((c,i)=>flat.set(rgb(c),3*i));gl.uniform3fv(u.uSeq,flat);gl.uniform1f(u.uN,seq.length);
 gl.uniform3fv(u.uTint,rgb(boardTint(capturedBoardId)));
 gl.uniform3fv(u.uCore,all?[1,1,1]:rgb(core).map(v=>v*.5+.5));
 const [cx,cy]=centroidOf(poly).map((v,i)=>v-(i?top:left)),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),R=.5*Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 // ponytail: hardwareConcurrency is a coarse low-end hint (and capped on some browsers); the measured-frame check below is the real guard.
 let pr=Math.min(devicePixelRatio||1,(navigator.hardwareConcurrency||8)<=4?1:1.5),lite=false,travel=.3,last=ph.t0,tilt=null,tilt0=null;
 const par=[0,0],slow=[],rest=[-.35*w,-.55*h],light=[...rest]; // #125 the specular follows the finger, else sits up-left (and leans with tilt)
 const size=()=>{
  bindPhaseProgram();
  canvas.width=Math.max(1,Math.round(w*pr));canvas.height=Math.max(1,Math.round(h*pr));gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(u.uRes,canvas.width,canvas.height);gl.uniform1f(u.uPr,pr);gl.uniform1f(u.uR,Math.max(R,1)*pr);gl.uniform1f(u.uLens,GLASS.bend*pr);gl.uniform1f(u.uBevel,GLASS.bevel*pr);gl.uniform1f(u.uFringe,lite||reduced?0:GLASS.fringe);gl.uniform1f(u.uMag,GLASS.magnify);gl.uniform1f(u.uBlur,lite||reduced?0:.18);
  gl.uniform1i(u.uPeek,1);gl.uniform1f(u.uPeekOn,0); // PORTAL-PEEK
 };
 const draw=now=>{
  bindPhaseProgram();
  const age=now-ph.t0;
  gl.uniform1f(u.uT,travel);gl.uniform1f(u.uSpin,reduced?0:(age*.000225)%(2*Math.PI));gl.uniform1f(u.uSweep,reduced?.45:-.35+1.7*((age/3200)%1));
  gl.uniform2f(u.uC,(cx+par[0])*pr,(cy+par[1])*pr);gl.uniform2f(u.uLP,light[0]*pr,light[1]*pr);gl.drawArrays(gl.TRIANGLES,0,3);
 };
 onTilt=e=>{if(e.gamma==null)return;tilt0??=[e.gamma,e.beta];tilt=[-(e.gamma-tilt0[0])*R*.012,-(e.beta-tilt0[1])*R*.012];};
 const frame=now=>{
  if(cancelled||!ph.glass.isConnected||capturedSignal?.aborted||gl.isContextLost())return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  // Graceful degrade: if frames 10-40 run slow (median under ~45 fps), drop resolution and the fringe.
  if(!lite&&slow.length<40&&slow.push(dt)===40&&slow.slice(10).sort((a,b)=>a-b)[15]>.022){lite=true;pr=Math.min(pr,.75);pk?.stop();size();ph.glass.dataset.lite='1';} // PORTAL-PEEK: lite drops the peek
  const T=ph.T,d=ph.diveT0?Math.min(1,(now-ph.diveT0)/T.reveal):ph.backT0?Math.max(0,1-(now-ph.backT0)/T.reveal):0; // the dive adds up to tunnelDive rings/s (the dive back sheds it)
  travel=(travel+dt*1.25*(PORTAL.tunnelFrom+(PORTAL.tunnelTo-PORTAL.tunnelFrom)*easeInOut((now-ph.t0)/(T.cut+T.load))+PORTAL.tunnelDive*d*d))%seq.length;
  const finger=[...pointers.values()].at(-1)?.pts.at(-1);let tx=(tilt?.[0]||0)+(finger?(finger.x-left-cx)*.12:0),ty=(tilt?.[1]||0)+(finger?(finger.y-top-cy)*.12:0);
  const k=Math.min(1,.2*R/(Math.hypot(tx,ty)||1));par[0]+=(tx*k-par[0])*Math.min(1,dt*5);par[1]+=(ty*k-par[1])*Math.min(1,dt*5);
  const lx=finger?finger.x-left:rest[0]-(tilt?.[0]||0)*8,ly=finger?finger.y-top:rest[1]-(tilt?.[1]||0)*8;light[0]+=(lx-light[0])*Math.min(1,dt*9);light[1]+=(ly-light[1])*Math.min(1,dt*9);
  pk?.frame(dt,now);draw(now);raf=requestAnimationFrame(frame); // PORTAL-PEEK
 };
 size();ph.glass.append(canvas);ph.glass.classList.add('gl');draw(ph.t0);
 if(reduced)return;
 const pk=startPeek(ph,t,w,h),stop0=ph.stop;if(pk)ph.stop=()=>{stop0();pk.stop();}; // PORTAL-PEEK
 tiltOk=typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission!=='function';
 if(tiltOk)addEventListener('deviceorientation',onTilt);
 raf=requestAnimationFrame(frame);
}
// The glass sits between #portalHome's background and the board canvas, so it shows only through the cut.
// pts: client-px polygon to clip to (null = whole screen); all: even rainbow (the cross). The box is the clip's
// bounds, so the wormhole only fills what can show. <b> is the CSS fallback when WebGL2 is unavailable.
// edge: the cut outline. A static glass bezel is drawn along it ABOVE the board: the cut drops whole mesh
// triangles, so the cloth's hole edge stair-steps up to ~12 px either side of the outline, and the bezel covers that.
// T: this sequence's {cut,load,reveal} ms (#124's lines and X run PORTAL.short of them); axis: a line's [a,b], whose
// glowing bezel starts as a slit along it and opens into the lens over the cut, the wormhole pouring through the tear.
const FULL_T={cut:PORTAL.cutMs,load:PORTAL.loadMinMs,reveal:PORTAL.revealMs};
function showGlass(pts,color,all=false,edge=pts,{T=FULL_T,axis=null,monochrome=false,peek=null}={}){
 endPhase();
 const poly=pts||closeLoop([[0,0],[innerWidth,0],[innerWidth,innerHeight],[0,innerHeight]]),clip=pts?bleedPts(pts):poly;
 const xs=clip.map(p=>p[0]),ys=clip.map(p=>p[1]),left=Math.floor(Math.min(...xs)),top=Math.floor(Math.min(...ys)),w=Math.ceil(Math.max(...xs))-left,h=Math.ceil(Math.max(...ys))-top;
 const el=document.createElement('div');el.className='portal-glass';el.setAttribute('aria-hidden','true');el.innerHTML='<b></b>';el.classList.toggle('all',all);
 el.style.cssText=`left:${left}px;top:${top}px;width:${w}px;height:${h}px`;el.style.setProperty('--glass',color);
 const reduced=prefersReducedMotion(),slit=axis&&!reduced;
 if(pts)el.style.clipPath=`polygon(${clip.map(([x,y])=>`${x-left}px ${y-top}px`).join(',')})`;
 if(!reduced&&!slit)el.style.setProperty('animation','portal-glass-in .6s ease both','important'); // beats the locked theme's animation:none
 portalHome.append(el);
 el.dataset.tunnel=boardId;
 if(monochrome){el.style.filter='grayscale(1)';if(!reduced)el.animate([{filter:'grayscale(0)'},{filter:'grayscale(1)'}],{duration:T.cut+T.load+T.reveal,easing:'linear',fill:'forwards'});}
 let bezel=null;
 if(edge){
  // Width: 1.55 grid cells (24 px on a phone). Measured at 375x812, the hole edge strays up to 11.2 px (0.72 cell) from the outline.
  const B=1.55*(board?.faceRect().width||375)/QUILT.segX,p=edge.map(q=>q.join(',')).join(' '),ring=(cls,w,more='')=>`<polygon class="${cls}" stroke-width="${w}" ${more} points="${p}"/>`;
  portalHome.insertAdjacentHTML('beforeend',`<svg class="portal-bezel" aria-hidden="true" style="--glass:${color}"><defs><linearGradient id="portalBezelLit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="lit"/><stop offset=".5" class="mid"/><stop offset="1" class="far"/></linearGradient><linearGradient id="portalBezelSpec" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient></defs>${ring('shade',B+10)+ring('shade',B+5)+ring('body',B)+ring('glow',B*.6)+ring('glow',B*.36)+ring('core',2.5)+ring('spec',2,`transform="translate(${-.3*B} ${-.3*B})"`)}</svg>`); // stacked strokes, no blur filters: those cost a ~100 ms first paint
  bezel=portalHome.lastElementChild;
  if(!reduced&&!slit)bezel.style.setProperty('animation','portal-glass-in .3s ease both','important');
  if(slit){ // squashed flat onto the line, then out to the lens
   const [[ax,ay],[bx,by]]=axis,a=Math.atan2(by-ay,bx-ax)*180/Math.PI;bezel.style.transformOrigin=`${d2((ax+bx)/2)}px ${d2((ay+by)/2)}px`;
   bezel.animate([{transform:`rotate(${d2(a)}deg) scale(1,.04) rotate(${d2(-a)}deg)`},{transform:'none'}],{duration:T.cut,easing:'cubic-bezier(.5,0,.2,1)'});
  }
 }
 phase={glass:el,bezel,pts,color,T,t0:performance.now(),pulse:false,box:{left,top,w,h},peek}; // PORTAL-PEEK: peek = destination route
 startTunnel(phase,poly,color,all);
 energize(restSeq(),ENERGY.surge,true);
}
function endPhase(){phase?.stop?.();phase?.dive?.cancel();phase?.glass.remove();phase?.bezel?.remove();phase=null;energize(restSeq());}
// The wormhole on its own, for transitions elsewhere (a workout's rest <-> attack, leaving Meditation): 'in' opens it
// from the centre of the screen until it covers everything (then it stays up, still flowing, while the caller swaps
// what is under it); 'out' shrinks it back into its core and removes it. Resolves when that half is done. One wormhole
// canvas is shared with the quilt's glass, so don't play it while the quilt is mid-portal. Reduced motion: instant.
let wormhole=null;
export async function playWormhole({direction='in',minMs=900,color='#b026ff'}={}){
 portalSound('travel');
 const ms=prefersReducedMotion()?0:Math.max(0,minMs),R=Math.ceil(Math.hypot(innerWidth,innerHeight)/2);
 if(!wormhole){
  const el=document.createElement('div'),w=innerWidth,h=innerHeight;el.className='portal-glass portal-wormhole';el.setAttribute('aria-hidden','true');el.innerHTML='<b></b>';
  el.style.cssText=`position:fixed;inset:0;width:${w}px;height:${h}px;margin:0;padding:0;border:0;max-width:none;max-height:none;overflow:hidden;background:#000;pointer-events:none;z-index:10000;--glass:${color}`;
  if(direction==='out')el.style.clipPath=`circle(${R}px at 50% 50%)`;
  document.body.append(el);if(el.showPopover){el.setAttribute('popover','manual');el.showPopover();}
  const ph={glass:el,fullscreen:true,box:{left:0,top:0,w,h},T:{cut:Math.max(1,ms),load:0,reveal:Math.max(1,ms)},t0:performance.now()-(direction==='out'?ms:0),pulse:false};
  startTunnel(ph,closeLoop([[0,0],[w,0],[w,h],[0,h]]),color,false);
  wormhole={el,ph};
 }
 const {el,ph}=wormhole,out=direction==='out';
 ph[out?'backT0':'diveT0']=performance.now();
 await el.animate([{clipPath:'circle(0px at 50% 50%)'},{clipPath:`circle(${R}px at 50% 50%)`}],{duration:ms,easing:out?'cubic-bezier(.6,0,.9,.4)':'cubic-bezier(.2,.6,.3,1)',direction:out?'reverse':'normal',fill:'forwards'}).finished.catch(()=>{});
 if(out&&wormhole?.el===el){ph.stop?.();el.remove();wormhole=null;}
}
// A destination seen through the hole: stop the wormhole and leave its still depth (what a flat menu's rectangle sits in),
// the bezel staying over the cloth's ragged edge.
function quietPhase(){if(!phase)return;phase.stop?.();phase.stop=null;phase.pulse=false;phase.glass.classList.remove('gl');phase.glass.classList.add('still');phase.glass.querySelector('canvas')?.remove();energize(restSeq());}
function ripple(x,y){
 if(!phase||prefersReducedMotion())return;
 const r=document.createElement('i');r.className='portal-ripple';r.style.left=(x-phase.box.left)+'px';r.style.top=(y-phase.box.top)+'px';
 r.style.setProperty('animation',`portal-ripple ${PORTAL.rippleMs}ms cubic-bezier(.2,.6,.3,1) forwards`,'important'); // beats the locked theme's animation:none
 phase.glass.append(r);setTimeout(()=>r.remove(),PORTAL.rippleMs);
}
// Cuts a client-px polygon out of the board (board.cut takes face coords, v down) and resolves once the piece has fallen in.
function cutBoard(pts,color,ms=prefersReducedMotion()?0:PORTAL.cutMs){
 const f=board?.faceRect();if(!f)return Promise.resolve();
 return board.cut(pts.map(([x,y])=>[(x-f.left)/f.width,(y-f.top)/f.height]),color,ms);
}
// Resolves once it has landed (the transition's own end: a slow frame can hold its start back well past ms).
function revealDialogFromPoint(dialog,[cx,cy],ms=500){
 if(prefersReducedMotion())return Promise.resolve();
 const dbox=dialog.getBoundingClientRect();
 dialog.style.transformOrigin=`${cx-dbox.left}px ${cy-dbox.top}px`;motion(dialog,'none');dialog.style.transform='scale(.05)';dialog.style.opacity='0';
 return settle().then(()=>{
  if(!dialog.open)return;
  motion(dialog,`transform ${ms}ms cubic-bezier(.2,0,.3,1),opacity ${ms*.8}ms ease`);dialog.style.transform='';dialog.style.opacity='';
  getComputedStyle(dialog).transform; // starts the transition now, so it can be awaited
  const grow=dialog.getAnimations().find(a=>a.transitionProperty==='transform');
  return grow?grow.finished.catch(()=>{}):undefined;
 });
}
// Dive into the wormhole (Ian 2026-09-23, #103 "zoom into each portal once opened"): the whole portal scales up about the
// vanishing point until the shape covers the screen, easing in over revealMs while the tunnel speeds up. A compositor-only
// Web Animation: the locked theme can't switch it off and it leaves `transition` free for the hole/fade. Reduced motion: a
// quick fade. endPhase() cancels it. back: the same dive played in reverse, out of the wormhole (diveBack).
function dive(pts,back=false){
 if(!phase)return Promise.resolve();
 if(back)portalSound('travel');
 const c=centroidOf(pts);let rIn=Infinity;
 for(let k=0;k<pts.length-1;k++){const [ax,ay]=pts[k],[bx,by]=pts[k+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((c[0]-ax)*dx+(c[1]-ay)*dy)/(dx*dx+dy*dy||1)));rIn=Math.min(rIn,Math.hypot(ax+t*dx-c[0],ay+t*dy-c[1]));}
 const far=Math.max(...[[0,0],[innerWidth,0],[0,innerHeight],[innerWidth,innerHeight]].map(([x,y])=>Math.hypot(x-c[0],y-c[1]))),reduced=prefersReducedMotion();
 portalHome.style.transformOrigin=`${c[0]}px ${c[1]}px`;phase[back?'backT0':'diveT0']=performance.now();
 energize(null,ENERGY.dive,true);
 phase.dive=portalHome.animate(reduced?[{opacity:1},{opacity:0}]:[{transform:'none'},{transform:`scale(${Math.max(1.5,1.05*far/Math.max(rIn,1))})`}],{duration:reduced?200:phase.T.reveal,easing:reduced?'ease':'cubic-bezier(.55,0,.9,.5)',fill:back?'none':'forwards',direction:back?'reverse':'normal'});
 return phase.dive.finished.catch(()=>{});
}
// The destination dialog grows out of the tunnel's core; its backdrop fades in so the dive stays visible behind it.
// Release 5: the bottom bar (routes.mjs moves it into the open route's dialog) must not ride the arrival's scale. It waits
// on the page, still showing below the frame (portal.css ends the framed backdrop above it), and goes back in once the
// dialog has landed, unless the route moved on meanwhile (routes.mjs then already re-homed it).
function arriveFromCore(dialog,core,ms){
 if(prefersReducedMotion())return;
 const bar=dialog.querySelector(':scope>#coachDock');if(bar)document.body.append(bar);
 dialog.style.setProperty('--portal-arrive',ms+'ms');dialog.classList.add('portal-arriving');
 // The bar goes back in only once the scale has landed (a fixed bar inside a scaled dialog would ride the scale).
 revealDialogFromPoint(dialog,core,ms).then(()=>{dialog.classList.remove('portal-arriving');dialog.style.removeProperty('--portal-arrive');motion(dialog,'');dialog.style.transformOrigin='';if(bar?.parentNode===document.body&&dialog.open)dialog.append(bar);});
}

function fallbackRect(){const r=overlay.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height};}

async function runShape(id){
 if(busy||!boardShown||!MENUS[id])return;
 const run=++sequence;busy=true;scheduleIdle();
 try{await portalSequence(id,()=>run===sequence&&!lifecycle.signal.aborted);}
 finally{if(run===sequence){busy=false;scheduleIdle();}}
}
// Lines are open strokes with no enclosed area; portalWindow() gives them (and the X) a window to cut (#124).
const LINE_IDS=new Set(['line-lr','line-rl','line-down']);
const lineTemplatePts=id=>SHAPES.line[(id==='line-lr'||id==='line-rl')?1:0].points;
async function openDirect(menu,current){
 // No dive in, but the way back out is still the wormhole: the destination's own shape, or the full square.
 const id=Object.keys(MENUS).find(k=>MENUS[k]===menu),{face}=restFace(),pts=backPts(id);
 let dialog=null;
 backgroundBlocked(false);
 frameOn(face,face&&windowLook(id,menu,face));const unwatch=watchDialog();
 try{dialog=await menu.open?.();}catch(error){console.warn(`${menu.label} failed to open.`,error);}finally{unwatch?.();}
 if(!current())return;
 const shown=dialog instanceof HTMLDialogElement?dialog.open:dialog?.getClientRects?.().length>0;
 if(!shown){status(`${menu.label} isn't available here yet.`);await fadeOutBoard();fadeInBoard();return;}
 if(dialog instanceof HTMLDialogElement){
  frameDialog(dialog);
  dialog.addEventListener('close',()=>closed(dialog,{pts,color:menu.color},current),{once:true});
 }else frameOff();
 await fadeOutBoard();
}
// #131: the shapes that aren't full screen open INTO their cut, the quilt staying on as the wall; the rest dive until
// the destination fills the frame. #124: the four lines and the X get the wormhole too, shorter (PORTAL.short): a line
// has no area to cut, so a glowing slit along it opens into a lens-shaped window; the X opens the diamond between its arms.
const SHAPED=new Set(['rect','oval','up','down','vdiamond']);
// A lens along a -> b: two sine arcs bulging `half` px either side (pointed at the ends), n+1 points a side.
async function portalSequence(id,current){
 const rect=board?board.patternRect():fallbackRect(),face=board?.faceRect();
 if(id==='cross'){
  portalSound('travel');
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
 if(id==='hdiamond')id='vdiamond'; // Ian 26 Sept: the leaderboard is the tall diamond only; a flat trace still reaches it
 const menu=MENUS[id];if(!menu)return;
 const line=LINE_IDS.has(id),short=line||id==='x';
 if(!SHAPES[id]&&!line){if(menu.locked?.()){status(menu.lockedMessage);return;}setVisible(false);menu.open?.();return;} // menu without a traced shape (opened by id)
 const win=portalWindow(id,rect),pts=boardId==='cogs'?win.pts:insetPts(win.pts,id);
 flashOutline(id==='x'?SHAPES.x.map(p=>toClientPts(p.points,rect)):line?[toClientPts(lineTemplatePts(id),rect)]:[pts],menu.color);
 if(menu.locked?.()){status(menu.lockedMessage);return;}
 status('');
 portalSound('travel');
 const k=short?PORTAL.short:1,T={cut:PORTAL.cutMs*k,load:PORTAL.loadMinMs*k,reveal:PORTAL.revealMs*k},reduced=prefersReducedMotion();
 showGlass(pts,menu.color,false,pts,{T,axis:win.axis,monochrome:menu.route==='meditate',peek:menu.route}); // PORTAL-PEEK: route
 await cutBoard(pts,menu.color,reduced?0:T.cut);
 if(!current())return;
 // Loading phase: the glass stays live (touch ripples, breathing outline) for at least T.load.
 if(phase)phase.pulse=!reduced;
 if(phase?.pulse)kickRender();
 await sleep(reduced?0:T.load);
 if(!current())return;
 if(SHAPED.has(id)&&id!=='rect'&&menu.kind==='dialog'&&face){await openInHole(id,menu,pts,face,current);return;}
 // Reveal: dive into the wormhole; the destination appears from its core over the last `arrive` ms of the dive.
 const dove=dive(pts),core=centroidOf(pts),arrive=T.reveal*.55;
 if(menu.kind==='dialog')frameOn(face,face&&windowLook(id,menu,face)); // the frame stays put and the dive happens in its window
 if(reduced||menu.kind==='nav'||menu.kind==='menu')await dove;else await sleep(T.reveal-arrive);
 if(!current())return;
 if(menu.kind==='home'){await growHole(portalHome,pts,rectBox(portalHome),current,arrive);if(current()){setVisible(false);menu.open?.();}return;}
 if(menu.kind==='nav'){menu.open();return;} // X -> the Character editor: dive, then navigate (the glass stays up while it loads)
 if(menu.kind==='menu'){ // line-up: the Menu sheet grows out of the core (openMenu hides the portal itself)
  openMenu();await settle();revealDialogFromPoint(menuSheet,core);
  menuSheet.addEventListener('close',()=>{motion(menuSheet,'');menuSheet.style.transform='';menuSheet.style.opacity='';},{once:true});
  return;
 }
 let dialog=null;
 backgroundBlocked(false);
 const unwatch=watchDialog();
 try{dialog=await menu.open?.();}catch(error){console.warn(`${menu.label} failed to open.`,error);}finally{unwatch?.();}
 if(dialog instanceof HTMLDialogElement&&dialog.open&&current()){frameDialog(dialog);arriveFromCore(dialog,core,arrive);} // before its first paint: no full-size flash
 await settle();
 if(!current())return;
 const shown=dialog instanceof HTMLDialogElement?dialog.open:dialog?.getClientRects?.().length>0;
 // Panel missing in this build (or it refused to open): never leave the screen stuck on the glass.
 if(!shown){status(`${menu.label} isn't available here yet.`);await fadeOutBoard();fadeInBoard();return;}
 if(dialog instanceof HTMLDialogElement){
  await dove;
  if(!current())return;
  if(!dialog.open){fadeInBoard();return;} // closed mid-reveal
  dialog.addEventListener('close',()=>closed(dialog,{pts,color:menu.color},current),{once:true});
 }else frameOff();
 fadeOutBoard();
}
// #131 the destination opens in the hole (Portal's "open"): the frame's chrome and the rim come up with a burst, the
// dialog opens clipped to the cut, growing out of the core to the outline (shapeDialog), the wormhole under it stops and
// the quilt stays on as the wall. Closing fizzles it shut (fizzleBack).
async function openInHole(id,menu,pts,face,current){
 frameOn(face,shapeLook(id,menu,pts));
 let dialog=null;
 backgroundBlocked(false);
 const unwatch=watchDialog();
 try{dialog=await menu.open?.();}catch(error){console.warn(`${menu.label} failed to open.`,error);}finally{unwatch?.();}
 if(!current())return;
 if(dialog instanceof HTMLDialogElement&&dialog.open)frameDialog(dialog);
 await settle();
 if(!current())return;
 const shown=dialog instanceof HTMLDialogElement?dialog.open:dialog?.getClientRects?.().length>0;
 if(!shown){frameOff();status(`${menu.label} isn't available here yet.`);await fadeOutBoard();fadeInBoard();return;}
 if(!(dialog instanceof HTMLDialogElement)){frameOff();fadeOutBoard();return;}
 dialog.addEventListener('close',()=>closed(dialog,{pts,color:menu.color,shaped:true},current),{once:true});
 await sleep(prefersReducedMotion()?0:700); // the wormhole shows round the destination while the hole opens out
 if(current()&&framed?.dialog===dialog&&!framed.expanded){quietPhase();board?.pause();}
}

function toNorm(x,y){const r=board.patternRect();return[(x-r.left)/r.width,(y-r.top)/r.height];}
function endPointer(e,cancel){ if(cancel) lastTap=null;
 const p=pointers.get(e.pointerId);if(!p)return;
 pointers.delete(e.pointerId);board.release(e.pointerId);
 // #105: the just-released stroke keeps fading (light-painting), independent of whether it matches.
 if(p.pts.length>1)fading.push({pts:p.pts,releasedAt:performance.now()});
 scheduleIdle();kickRender();
 if(cancel||busy)return;
 markHintSeen(); // #22: any real released touch, trace or tap, ends the first-run hint window for good.
 const xs=p.norm.map(n=>n[0]),ys=p.norm.map(n=>n[1]);
 const size=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 if(size<.03){
  // #20: a second tap within TAP_MS and TAP_MOVE_PX of the first, near a shape's stitched outline (within
  // TAP_HIT_PX), opens it exactly as tracing does. A single tap, or a double-tap far from any outline,
  // just ripples the fabric (board.press on pointerdown already does that).
  const tap={x:e.clientX,y:e.clientY,t:(Number.isFinite(e.timeStamp)&&e.timeStamp>0?e.timeStamp:performance.now())};
  const isDouble=lastTap&&tap.t-lastTap.t>=0&&tap.t-lastTap.t<=TAP_MS&&Math.hypot(tap.x-lastTap.x,tap.y-lastTap.y)<=TAP_MOVE_PX;
  lastTap=isDouble?null:tap;
  if(isDouble){
   const id=nearestTapShape(tap.x,tap.y);
   if(MENUS[id]){buzz(12);runShape(id);}
  }
  return;
 }
 lastTap=null;
 pendingStrokes.push(p.norm);pendingTrailPts.push(p.pts);
 clearTimeout(finalizeTimer);
 finalizeTimer=setTimeout(()=>{
  const strokes=pendingStrokes,trailPts=pendingTrailPts;pendingStrokes=[];pendingTrailPts=[];
  const id=recognizeShape(strokes);
  if(MENUS[id]){
   // #105: on a match, the drawn trail itself flashes the destination colour before the cut starts.
   flashOutline(trailPts.map(pts=>pts.map(pt=>[pt.x,pt.y])),id==='cross'?'#ffffff':(MENUS[id]?.color||'#ffffff'));
   buzz(12); // #29
   runShape(id);
   return;
  }
  // #21 "almost": close but not a match — flash the nearest candidate's outline + faint label, don't open it.
  const near=nearestShape(strokes);
  if(near&&MENUS[near.id]&&near.score>=ALMOST_COVER){
   const rect=board?board.patternRect():fallbackRect(),info=idleShapeInfo(near.id,rect);
   flashOutline(info.polys,info.color,{label:`Almost: ${info.label}`,labelPt:info.labelPt,duration:ALMOST_MS});
   buzz([12,40,12]); // #29 double-pulse
  }
 },450);
}
function wirePointerEvents(){
 overlay.addEventListener('pointerdown',e=>{ if(pointers.size>0){lastTap=null;}
  stopHint(); // #22: any touch stops the first-run hint immediately, mid-animation or not.
  overlay.setPointerCapture(e.pointerId);clearTimeout(finalizeTimer);
  pointers.set(e.pointerId,{pts:[{x:e.clientX,y:e.clientY,t:performance.now()}],norm:[toNorm(e.clientX,e.clientY)],soundX:e.clientX,soundY:e.clientY,soundT:performance.now()});
  if(pointers.size===1&&!busy)portalSound('press');
  scheduleIdle();
  if(busy)ripple(e.clientX,e.clientY);else board.press(e.pointerId,e.clientX,e.clientY);
  kickRender();
 });
 overlay.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  p.pts.push({x:e.clientX,y:e.clientY,t:performance.now()});p.norm.push(toNorm(e.clientX,e.clientY));
  if(pointers.size===1&&!busy&&performance.now()-p.soundT>115&&Math.hypot(e.clientX-p.soundX,e.clientY-p.soundY)>12){p.soundX=e.clientX;p.soundY=e.clientY;p.soundT=performance.now();portalSound('drag');}
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
 addEventListener('myr5:food-photo-ready',()=>expandScene(document.getElementById('mealsPanel')),{signal:lifecycle.signal});
 document.addEventListener('myr5:classroom-board',e=>{if(e.target?.id==='accountPanel')expandScene(e.target);},{signal:lifecycle.signal});
 document.addEventListener('room-ready',e=>{const f=framed;if(e.target?.id==='accountPanel'&&f?.dialog===e.target&&!f.expanded&&f.look.shaped){layoutInCut(e.target,true);clipTo(e.target,f.outlines.shape);}},{signal:lifecycle.signal});
 document.addEventListener('click',e=>{if(workoutHome?.open&&e.target.closest?.('#start')){setVisible(false);restoreWorkoutHome();workoutHome.close();}},{capture:true,signal:lifecycle.signal});
 for(const type of ['storage','pageshow'])addEventListener(type,syncLook,{signal:lifecycle.signal});
 if(menuBtn!==portalHome.querySelector('#portalExitButton'))menuBtn.addEventListener('click',()=>{if(busy)return;setVisible(!boardShown);},{signal:lifecycle.signal});
 boardBtn?.addEventListener('click',()=>setVisible(true),{signal:lifecycle.signal});
 await loadBoard(initialBoardId());
 await Promise.race([threeD(true),sleep(WAIT.mount)]); // come up in 3D when it's quick; never wait on a stalled one
 wirePointerEvents();(window.requestIdleCallback||setTimeout)(()=>{if(!lifetime.signal.aborted)tunnelGL('',{activate:false});}); // compile/cache only; never switch a live phase's program
 resizeOverlay();overlayObserver=new ResizeObserver(resizeOverlay);overlayObserver.observe(portalHome);
 setVisible(visible&&initialVisible());
 // Back from a 'nav' portal via the bfcache: drop the stale glass and hole.
 let resumeAfterPageShow=false;
 addEventListener('pagehide',()=>{resumeAfterPageShow=boardShown;setVisible(false);},{signal:lifecycle.signal});
 addEventListener('pageshow',e=>{if(e.persisted&&resumeAfterPageShow)setVisible(true);},{signal:lifecycle.signal});
 // #104: pause/resume the idle cycle with the tab (a backgrounded tab must not keep animating).
 document.addEventListener('visibilitychange',scheduleIdle,{signal:lifecycle.signal});
 // Risk 4: a dialog over the quilt (setup gate, a reward reveal) that doesn't hide the portal still
 // blocks idleEligible() while open, but nothing then re-arms the idle timer once it closes. 'close'
 // doesn't bubble, but it still reaches a capturing listener on document for any dialog in the page.
 document.addEventListener('close',scheduleIdle,{capture:true,signal:lifecycle.signal});
 window.myr5Portal={
  get disposed(){return lifetime.signal.aborted;},
  dispose(){if(lifetime.signal.aborted)return;clearTimeout(idleTimer);idleTimer=0;idleCycle=null;setVisible(false);fading.length=0;boardLoad++;lifecycle.abort();overlayObserver?.disconnect();gl3?.dispose();base?.dispose();gl3=base=board=null;menuChosen=true;menuSheet.close();menuSheet.remove();restoreWorkoutHome();workoutHome?.close();workoutHome?.remove();portalHome.remove();chrome.remove();energyAnims.length=0;tunnel?.gl.getExtension('WEBGL_lose_context')?.loseContext();tunnel=null;for(const cancel of flashes)cancel();window.myr5Portal=null;},
  show:()=>setVisible(true),
  hide:()=>setVisible(false),
  open:id=>runShape(id),
  frameDirectDestination,
  trace(strokes){const id=recognizeShape(strokes);if(MENUS[id])runShape(id);return MENUS[id]?id:null;},
  board:id=>loadBoard(id).then(()=>ready3D), // resolves once 3D is drawing or has fallen back to the flat board
  openWorkoutHome,
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
  playWormhole, // #149: Meditation's early-stop smack exits through it (meditation.mjs throughWormhole)
 };
 if(window.__portalTrailProbe===true)window.myr5Portal.trailProbe=trailProbe;
 return window.myr5Portal;
}
