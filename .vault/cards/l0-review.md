# Review: Achievement Vault lane L0
Acceptance: (1) vault-goals table, pure total test(state)/progress; (2) vault-store bump daily-capped, addTime 20min/day, markSecret, read, evaluate-on-write -> grantUnlock reward-pack:<tier>:vault-<id> + myr5:vault-earned; (3) reward-packs vault branch: 2 items, legendary >=1 texture, existing odds untouched; (4) portal.mjs/portal-board-glb.mjs: claims(id) forwarded BEFORE effect.release; endPointer: outline double-tap opens first, then if board.claims(id) -> lastTap=null and skip tap/recognition branches; myr5:portal-secret listener -> markSecret, pause board, door poster, tap -> go('vault'), Escape/portal key dismisses+heals; myr5Portal.secret(id); ?vault=1 boot; (5) quilt boards claims stub; (6) vault route + stub door; (7) offline-assets excludes vault paths.
List concrete bugs only, with line quotes.

diff --git a/modules/portal/portal-board-glb.mjs b/modules/portal/portal-board-glb.mjs
index 508b4c5..0104b06 100644
--- a/modules/portal/portal-board-glb.mjs
+++ b/modules/portal/portal-board-glb.mjs
@@ -267,6 +267,7 @@ export async function createGlbBoard(host,{effect,knobs=GLB}={}){
   if(preservedAspect)computeFit();
   if(!disposed)renderer.render(scene,camera); // healed frame on the canvas now, even while paused
  }
+ const claimed=new Map();
  return {
   canvas,
   background:effect.background||'#17111e',
@@ -291,7 +292,9 @@ export async function createGlbBoard(host,{effect,knobs=GLB}={}){
    else{pointers.set(id,{u:cu,v:cv,t0:performance.now()});effect.press?.(id,cu,cv);}
    wake();
   },
-  release(id){const p=pointers.get(id);if(p){effect.release?.(id,p.u,p.v);pointers.delete(id);}wake();},
+  // claims(id): asked BEFORE effect.release forgets the pointer; a released id keeps its answer until portal reads it once.
+  claims(id){if(claimed.has(id)){const c=claimed.get(id);claimed.delete(id);return c;}return !!effect.claims?.(id);},
+  release(id){const p=pointers.get(id);if(p){claimed.set(id,!!effect.claims?.(id));effect.release?.(id,p.u,p.v);pointers.delete(id);}wake();},
   frameMs:()=>frameMs,
   ink:effect.ink, // false: the effect draws its own trace trail, portal.mjs skips its glowing ink line
   pause(){for(const [id,p] of pointers)effect.release?.(id,p.u,p.v);pointers.clear();cancelAnimationFrame(frame);frame=0;},
diff --git a/modules/portal/portal-board.mjs b/modules/portal/portal-board.mjs
index 42a1531..2ddd64a 100644
--- a/modules/portal/portal-board.mjs
+++ b/modules/portal/portal-board.mjs
@@ -205,6 +205,7 @@ tintCache.set(key,tmp);
    if(p){fx.move?.(id,u,v,p.u,p.v);p.u=u;p.v=v;}else{pointers.set(id,{u,v});fx.press?.(id,u,v);}
    wake();
   },
+  claims(){return false;},
   release(id){const p=pointers.get(id);if(p){pointers.delete(id);fx.release?.(id,p.u,p.v);wake();}},
   frameMs:()=>0,
   pause(){for(const [id,p] of pointers)fx.release?.(id,p.u,p.v);pointers.clear();cancelAnimationFrame(raf);raf=0;},
@@ -345,6 +346,7 @@ export async function createQuiltBoardGL(host,{knobs=QUILT}={}){
   patternRect:()=>patternRectOf(host),
   quiltRect,
   press(id,clientX,clientY){if(reduced)return;const [x,y]=local(clientX,clientY),touch=pointers.get(id);if(touch){touch.x=x;touch.y=y;}else pointers.set(id,{x,y,px:x,py:y});wake();},
+  claims(){return false;}, // L4 fills this (quilt fold secret)
   release(id){pointers.delete(id);wake();},
   frameMs:()=>frameMs,
   pause(){paused=true;pointers.clear();cancelAnimationFrame(frame);frame=0;},
diff --git a/modules/portal/portal.css b/modules/portal/portal.css
index f851e48..5145b5d 100644
--- a/modules/portal/portal.css
+++ b/modules/portal/portal.css
@@ -322,3 +322,10 @@ dialog.portal-framed.portal-fullscreen #coachDock{left:0!important;right:0!impor
 #coachDock.ship-control-deck .dock-live{position:absolute}
 /* The hub uses the selected grimoire metal in every shared dock. */
 #coachDock.coach-dock.ship-control-deck :is(button,a).dock-portal{border-color:color-mix(in srgb,var(--portal-metal,#4d3d4f),#fff 40%);background:radial-gradient(circle at 50% 40%,var(--portal-metal,#4d3d4f) 0 46%,color-mix(in srgb,var(--portal-metal,#4d3d4f),#000 65%) 47% 58%,transparent 59%),repeating-conic-gradient(color-mix(in srgb,var(--portal-metal,#4d3d4f),#fff 40%) 0deg 8deg,color-mix(in srgb,var(--portal-metal,#4d3d4f),#000 30%) 8deg 15deg)}
+/* Vault door poster (portal.mjs showVaultDoor): placeholder CSS door until pod/worlds/vault/door-poster.webp paints over it. */
+#portalVaultDoor{position:absolute;inset:0;z-index:8;border:0;padding:0;display:grid;place-items:center;cursor:pointer;background:url('/pod/worlds/vault/door-poster.webp') center/contain no-repeat,rgba(23,16,32,.82);animation:vault-door-in .6s ease both}
+#portalVaultDoor .vault-slab{position:relative;width:min(78vw,380px);aspect-ratio:1;border:6px solid #ffd36e;border-radius:10px;background:linear-gradient(135deg,#9a4be0,#7a2fc4 45%,#3d1763);box-shadow:0 0 40px #7a2fc4aa,inset 0 0 30px #0008;display:grid;justify-items:center;align-content:start;padding-top:9%}
+#portalVaultDoor img{width:42%;opacity:.85;filter:drop-shadow(0 1px 0 #fff4)}
+#portalVaultDoor i{position:absolute;left:50%;top:62%;width:34%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;border:8px solid #ffd36e;background:radial-gradient(#3d1763 30%,#171020)}
+@keyframes vault-door-in{from{opacity:0}}
+@media (prefers-reduced-motion:reduce){#portalVaultDoor{animation:none}}
diff --git a/modules/portal/portal.mjs b/modules/portal/portal.mjs
index 7d89294..9a1d094 100644
--- a/modules/portal/portal.mjs
+++ b/modules/portal/portal.mjs
@@ -73,7 +73,7 @@ if(typeof window!=='undefined'&&window.__portalTestStubBoard===true)
   background:'#000',
   faceRect:()=>({left:0,top:0,width:host.clientWidth||1,height:host.clientHeight||1}),
   patternRect:()=>({left:0,top:0,width:host.clientWidth||1,height:host.clientHeight||1}),
-  cut:()=>Promise.resolve(),heal(){},press(){},release(){},pause(){},resume(){},dispose(){},
+  cut:()=>Promise.resolve(),heal(){},press(){},release(){},claims:id=>!!window.__portalTestClaims?.(id),pause(){},resume(){},dispose(){},
  })};
 const BOARD_KEY='myr5.portalBoard';
 const portalSound=(kind,extra={})=>window.dispatchEvent(new CustomEvent('myr5:portal-sound',{detail:{kind,board:boardId,...extra}}));
@@ -466,7 +466,7 @@ function setVisible(v){
  // until the old animation resolves. A forward phase has no backT0, so showing the quilt does
  // not interrupt a newly-started portal sequence.
  if(v&&phase?.backT0){endPhase();portalHome.style.transformOrigin='';}
- if(!v){sequence++;busy=false;clearTimeout(finalizeTimer);pendingStrokes=[];pendingTrailPts=[];fading.length=0;pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();outlineFlash=null;objectsLayer.replaceChildren();cancelAnimationFrame(rafId);rafId=0;}
+ if(!v){hideVaultDoor(false);sequence++;busy=false;clearTimeout(finalizeTimer);pendingStrokes=[];pendingTrailPts=[];fading.length=0;pointers.forEach((_,pid)=>board?.release(pid));pointers.clear();outlineFlash=null;objectsLayer.replaceChildren();cancelAnimationFrame(rafId);rafId=0;}
  board?.heal();
  portalHome.hidden=!v;
  if(boardBtn)boardBtn.hidden=v;
@@ -1862,10 +1862,29 @@ async function openInHole(id,menu,pts,face,current){
  if(current()&&framed?.dialog===dialog&&!framed.expanded){quietPhase();board?.pause();}
 }
 
+// Vault door poster (L0): a board secret ends here. The board pauses, a metal door fades in over it; tap opens the
+// vault route, Escape or the portal key dismisses and heals. pod/worlds/vault/door-poster.webp (L7) paints over the CSS door.
+let vaultDoor=null;
+const vaultKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();hideVaultDoor();}};
+function hideVaultDoor(heal=true){
+ if(!vaultDoor)return;
+ vaultDoor.remove();vaultDoor=null;document.removeEventListener('keydown',vaultKey,true);
+ if(heal&&board){board.heal();if(boardShown)board.resume();}
+}
+function goVault(){const r=window.myr5Routes;return r?r.go('vault'):import('../routes.mjs').then(m=>m.mountRoutes().go('vault'));}
+function showVaultDoor(){
+ if(vaultDoor||!boardShown||!board)return;
+ pointers.clear();clearTimeout(finalizeTimer);pendingStrokes=[];pendingTrailPts=[];lastTap=null;board.pause();
+ vaultDoor=document.createElement('button');vaultDoor.type='button';vaultDoor.id='portalVaultDoor';vaultDoor.setAttribute('aria-label','Vault door. Tap to open the vault.');
+ vaultDoor.innerHTML='<span class="vault-slab"><img src="/pod/mom-inc-engrave.png" alt=""><i></i></span>';
+ vaultDoor.onclick=()=>{hideVaultDoor(false);setVisible(false);void goVault();};
+ portalHome.append(vaultDoor);document.addEventListener('keydown',vaultKey,true);vaultDoor.focus({preventScroll:true});
+}
 function toNorm(x,y){const r=board.patternRect();return[(x-r.left)/r.width,(y-r.top)/r.height];}
 function endPointer(e,cancel){ if(cancel) lastTap=null;
  const p=pointers.get(e.pointerId);if(!p)return;
  pointers.delete(e.pointerId);board.release(e.pointerId);
+ const claimed=!!board.claims?.(e.pointerId); // vault secrets: asked after release (the glb wrapper answered before its effect forgot the pointer)
  // #105: the just-released stroke keeps fading (light-painting), independent of whether it matches.
  if(p.pts.length>1)fading.push({pts:p.pts,releasedAt:performance.now()});
  scheduleIdle();kickRender();
@@ -1882,11 +1901,14 @@ function endPointer(e,cancel){ if(cancel) lastTap=null;
   lastTap=isDouble?null:tap;
   if(isDouble){
    const id=nearestTapShape(tap.x,tap.y);
-   if(MENUS[id]){buzz(12);runShape(id);}
+   if(MENUS[id]){buzz(12);runShape(id);return;} // an outline double-tap opens its shape before any secret may claim it
   }
+  if(claimed)lastTap=null;
   return;
  }
  lastTap=null;
+ if(claimed)return; // a claimed stroke is a secret gesture: no shape recognition, no "Almost"
+
  pendingStrokes.push(p.norm);pendingTrailPts.push(p.pts);
  clearTimeout(finalizeTimer);
  finalizeTimer=setTimeout(()=>{
@@ -1943,6 +1965,8 @@ export async function mountPortal({visible=false}={}){
  for(const type of ['storage','pageshow'])addEventListener(type,syncLook,{signal:lifecycle.signal});
  if(menuBtn!==portalHome.querySelector('#portalExitButton'))menuBtn.addEventListener('click',()=>{if(busy)return;setVisible(!boardShown);},{signal:lifecycle.signal});
  boardBtn?.addEventListener('click',()=>setVisible(true),{signal:lifecycle.signal});
+ addEventListener('myr5:portal-secret',e=>{const id=e.detail?.board||boardId;import('../vault/vault-store.mjs').then(m=>m.markSecret(id)).catch(()=>{});showVaultDoor();},{signal:lifecycle.signal});
+ menuBtn.addEventListener('click',e=>{if(vaultDoor){e.stopImmediatePropagation();hideVaultDoor();}},{capture:true,signal:lifecycle.signal});
  await loadBoard(initialBoardId());
  await Promise.race([threeD(true),sleep(WAIT.mount)]); // come up in 3D when it's quick; never wait on a stalled one
  wirePointerEvents();(window.requestIdleCallback||setTimeout)(()=>{if(!lifetime.signal.aborted)tunnelGL('',{activate:false});}); // compile/cache only; never switch a live phase's program
@@ -1961,6 +1985,7 @@ export async function mountPortal({visible=false}={}){
  window.myr5Portal={
   get disposed(){return lifetime.signal.aborted;},
   dispose(){if(lifetime.signal.aborted)return;clearTimeout(idleTimer);idleTimer=0;idleCycle=null;setVisible(false);fading.length=0;boardLoad++;lifecycle.abort();overlayObserver?.disconnect();gl3?.dispose();base?.dispose();gl3=base=board=null;menuChosen=true;menuSheet.close();menuSheet.remove();restoreWorkoutHome();workoutHome?.close();workoutHome?.remove();portalHome.remove();chrome.remove();energyAnims.length=0;tunnel?.gl.getExtension('WEBGL_lose_context')?.loseContext();tunnel=null;for(const cancel of flashes)cancel();window.myr5Portal=null;},
+  secret:id=>window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:id||boardId}})), // debug/test: same event the boards fire
   show:()=>setVisible(true),
   hide:()=>setVisible(false),
   open:id=>runShape(id),
@@ -1984,5 +2009,6 @@ export async function mountPortal({visible=false}={}){
   playWormhole, // #149: Meditation's early-stop smack exits through it (meditation.mjs throughWormhole)
  };
  if(window.__portalTrailProbe===true)window.myr5Portal.trailProbe=trailProbe;
+ if(new URLSearchParams(location.search).has('vault'))void goVault(); // ?vault=1 boot, like ?board=
  return window.myr5Portal;
 }
diff --git a/modules/routes.mjs b/modules/routes.mjs
index e218505..2afd172 100644
--- a/modules/routes.mjs
+++ b/modules/routes.mjs
@@ -57,6 +57,8 @@ export const ROUTES={
  pod:{label:'Training pod',page:true,focus:'#homeScreen',open:hideQuilt},
  history:{label:'History',dialog:'#historyPanel',open:()=>panel('history')},
  install:{label:'Install',dialog:'#installPanel',open:()=>panel('install')},
+ // Achievement Vault: reached only through a grimoire secret (portal.mjs door poster); vault-door.mjs builds #vaultPanel.
+ vault:{label:'Vault',dialog:'#vaultPanel',open:()=>import('./vault/vault-door.mjs').then(m=>m.openVault())},
 };
 // Old ?panel= deep links (reminder pushes, update emails, recovery) open the same routes.
 export const PANEL_ROUTES={spotify:'spotify',meals:'food',reminders:'reminders',account:'scoreboard',history:'history',install:'install'};
diff --git a/modules/vault/vault-door.mjs b/modules/vault/vault-door.mjs
new file mode 100644
index 0000000..581d934
--- /dev/null
+++ b/modules/vault/vault-door.mjs
@@ -0,0 +1,22 @@
+// STUB (lane L0; L7 replaces this file with the mechanical door). Contract: openVault() returns the open #vaultPanel dialog.
+// Shows the earned count and every clue; "Enter" lazy-imports ./vault-hall.mjs (L8) when it exists.
+import {GOALS} from './vault-goals.mjs';
+import * as vault from './vault-store.mjs';
+const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
+export async function openVault(){
+ let dialog=document.getElementById('vaultPanel');
+ if(!dialog){
+  dialog=document.createElement('dialog');dialog.id='vaultPanel';dialog.setAttribute('aria-label','Vault');
+  dialog.style.cssText='background:#171020;color:#ffd36e;border:2px solid #7a2fc4;max-width:min(92vw,420px);max-height:80vh;overflow:auto';
+  document.body.append(dialog);
+ }
+ const {earned}=vault.read(),got=GOALS.filter(g=>earned[g.id]);
+ const list=el('ol');for(const g of GOALS)list.append(el('li',earned[g.id]?g.title:g.clue));
+ const enter=el('button','Enter');enter.type='button';
+ const note=el('p','');note.setAttribute('role','status');
+ enter.onclick=()=>import('./vault-hall.mjs').then(m=>(m.enterHall||m.openHall||m.default)?.(),()=>{note.textContent='The hall is not built yet.';});
+ const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();
+ dialog.replaceChildren(el('h2',`Vault ${got.length} / ${GOALS.length}`),list,note,enter,close);
+ if(!dialog.open)dialog.showModal();
+ return dialog;
+}
diff --git a/modules/vault/vault-goals.mjs b/modules/vault/vault-goals.mjs
new file mode 100644
index 0000000..0b539d4
--- /dev/null
+++ b/modules/vault/vault-goals.mjs
@@ -0,0 +1,70 @@
+// Achievement Vault: the achievement table (hall order = array order, easy -> hard) and its tunable thresholds.
+// Pure. Every test(v) / progress(v) is total: an empty or missing state never throws.
+// v = vault-store's view of the world: {counters:{name:n}, time:{name:ms}, secrets:{board:ts}, snap:{...collection snapshot}}.
+//  snap (taken by vault-store from the real stores): coachesHave/coachesNeed, catsHave:{track:n earned coaches},
+//  texturedCoaches, coloursHave/coloursNeed, texturesHave/texturesNeed (distinct ids granted vs pool), bossSkins, vaultPacksOpened.
+// Clues are cryptic CRT text (L10 writes the real copy; placeholders are 'clue:<id>'); the title is revealed on earn.
+export const VAULT_GOALS=Object.freeze({
+ grimMinutes:Object.freeze([5,30,120]),timeCapMinutesPerDay:20, // addTime caps grimoire time per local day
+ share:Object.freeze([1,25]),armieRead:Object.freeze([5,100]),armieIgnored:Object.freeze([5,100]),
+ libraryOpen:10,djSessions:10,foodScans:10,arcadeScore:30,galaSlots:8,breathModes:2,shapes:9,
+});
+// How a counter counts (bump): 'day' = +n at most once per local day (default), 'max' = best value seen,
+// 'keyed' = distinct keys (one per Armie letter id, gala slot, breathing mode, portal shape).
+export const COUNTER_MODES=Object.freeze({'arcade-score':'max','armie-ignored':'keyed','gala-slot':'keyed','breath-mode':'keyed','shape-opened':'keyed'});
+export const SECRET_BOARDS=Object.freeze(['pond','wood','ice','quilt','grass','jelly']);
+export const COACH_CATEGORIES=Object.freeze({meditation:'Meditation',yoga:'Yoga',cardio:'Cardio',quads:'Quads',glutes:'Glutes',chest:'Chest',arms:'Arms','martial-arts':'Martial arts'});
+const num=x=>Number.isFinite(x)?x:0;
+const count=(v,c)=>num(v?.counters?.[c]);
+const goal=(id,tier,title,test,progress)=>Object.freeze({id,tier,title,clue:'clue:'+id,test:v=>{try{return !!test(v||{});}catch{return false;}},...(progress?{progress:v=>{try{const p=progress(v||{});return {have:Math.max(0,Math.min(p.need,num(p.have))),need:p.need};}catch{return {have:0,need:1};}}}:{})});
+const counter=(id,tier,title,name,need)=>goal(id,tier,title,v=>count(v,name)>=need,v=>({have:count(v,name),need}));
+const minutes=(id,tier,title,mins)=>goal(id,tier,title,v=>num(v.time?.['grim-time'])>=mins*60000,v=>({have:Math.floor(num(v.time?.['grim-time'])/60000),need:mins}));
+const secret=(id,title,board)=>goal(id,'rare',title,v=>!!v.secrets?.[board]);
+const ratio=(id,tier,title,have,need)=>goal(id,tier,title,v=>num(v.snap?.[need])>0&&num(v.snap?.[have])>=num(v.snap?.[need]),v=>({have:num(v.snap?.[have]),need:Math.max(1,num(v.snap?.[need]))}));
+const G=VAULT_GOALS;
+const all=v=>[['coachesHave','coachesNeed'],['texturedCoaches','coachesNeed'],['coloursHave','coloursNeed'],['texturesHave','texturesNeed']].every(([h,n])=>num(v.snap?.[n])>0&&num(v.snap?.[h])>=num(v.snap?.[n]));
+export const GOALS=Object.freeze([
+ counter('history-open','rare','Looked Back','history-open',1),
+ counter('scoreboard-link','rare','Linked Up','scoreboard-link',1),
+ counter('reminder-set','rare','Remembered','reminder-set',1),
+ counter('ar-first','rare','Out in the World','ar-session',1),
+ counter('dj-first','rare','First Request','dj-session',1),
+ counter('share-1','rare','Spread the Word','share',G.share[0]),
+ counter('gala-first-part','rare','New Look','gala-part',1),
+ counter('door-open','rare','Door Opener','door-open',1),
+ secret('still-pond','Still Waters','pond'),
+ secret('shatter','Shatterproof No More','ice'),
+ minutes('grim-time-1','rare','Grimoire Gazer',G.grimMinutes[0]),
+ secret('fire-starter','Fire Starter','wood'),
+ counter('armie-read-1','rare','Good Correspondent','armie-read',G.armieRead[0]),
+ counter('breath-all','rare','Every Breath','breath-mode',G.breathModes),
+ counter('library-10','rare','Movement Scholar','library-open',G.libraryOpen),
+ counter('food-scan-10','rare','Plate Detective','food-scan',G.foodScans),
+ counter('shapes-all','rare','Shape Collector','shape-opened',G.shapes),
+ secret('fold-twice','Folded Twice','quilt'),
+ counter('armie-ignored-1','rare','Left on Read','armie-ignored',G.armieIgnored[0]),
+ counter('gala-all-slots','rare','Try Everything','gala-slot',G.galaSlots),
+ secret('little-way-home','Little Way Home','grass'),
+ counter('arcade-30','rare','Tub Pilot','arcade-score',G.arcadeScore),
+ counter('dj-10','rare','Regular Request','dj-session',G.djSessions),
+ counter('reminder-kept','rare','Kept It Up','reminder-kept',1),
+ counter('pond-fish-seen','rare','Big Fish Believer','pond-fish',10),
+ secret('boiling-point','Boiling Point','jelly'),
+ goal('hall-end','rare','Down the Hall',v=>count(v,'hall-end')>=1),
+ goal('vault-pack-opened','rare','Pack Rat',v=>num(v.snap?.vaultPacksOpened)>=1),
+ minutes('grim-time-2','rare','Grimoire Regular',G.grimMinutes[1]),
+ ...Object.entries(COACH_CATEGORIES).map(([track,label])=>goal('coach-'+track,'rare','First '+label+' Coach',v=>num(v.snap?.catsHave?.[track])>=1)),
+ goal('boss-skin-first','rare','Pixel Perfect',v=>num(v.snap?.bossSkins)>=1),
+ counter('share-25','rare','Town Crier','share',G.share[1]),
+ counter('armie-read-100','rare','Pen Pal','armie-read',G.armieRead[1]),
+ counter('armie-ignored-100','rare','Professional Ghost','armie-ignored',G.armieIgnored[1]),
+ goal('all-six','legendary','Six Secrets',v=>SECRET_BOARDS.every(b=>!!v.secrets?.[b]),v=>({have:SECRET_BOARDS.filter(b=>v.secrets?.[b]).length,need:SECRET_BOARDS.length})),
+ minutes('grim-time-3','legendary','Grimoire Devotee',G.grimMinutes[2]),
+ ratio('all-coaches','legendary','Full Roster','coachesHave','coachesNeed'),
+ ratio('texture-every-coach','legendary','Dressed to Impress','texturedCoaches','coachesNeed'),
+ ratio('all-colours','legendary','Every Colour','coloursHave','coloursNeed'),
+ goal('everything','legendary','The Whole Collection',all),
+]);
+export const goalById=id=>GOALS.find(g=>g.id===id);
+/** Ids whose test passes in v and are not already earned (earned: {id:ts}). */
+export const newlyEarned=(v,earned={})=>GOALS.filter(g=>!earned[g.id]&&g.test(v)).map(g=>g.id);
diff --git a/modules/vault/vault-store.mjs b/modules/vault/vault-store.mjs
new file mode 100644
index 0000000..bad0584
--- /dev/null
+++ b/modules/vault/vault-store.mjs
@@ -0,0 +1,69 @@
+// Achievement Vault store (owner-scoped localStorage `myr5-vault-v1/<owner>`). Every write re-evaluates the goals,
+// grants a vault pack per newly earned goal (unlock-ledger, idempotent) and dispatches `myr5:vault-earned {ids}`. No timers.
+// Counters follow vault-goals COUNTER_MODES: once per local day by default (anti-farm), 'max', or distinct keys.
+import {GOALS,VAULT_GOALS,COUNTER_MODES,SECRET_BOARDS,COACH_CATEGORIES,newlyEarned} from './vault-goals.mjs';
+import {performanceOwner,localDay,unlockedCoachIds} from '../../performance-progress.mjs';
+import {COACHES,COACH_REQUIREMENTS,EXCLUDED_COACH_IDS} from '../../performance-catalog.mjs';
+import {colourRewardPool,textureRewardPool} from '../../battle-pass-rewards.mjs';
+import * as cosmetics from '../../creature/source/creator/unlock-store.ts';
+import * as ledger from '../../unlock-ledger.mjs';
+import {openedPack} from '../../reward-packs.mjs';
+export const VAULT_KEY='myr5-vault-v1';
+const key=()=>`${VAULT_KEY}/${encodeURIComponent(performanceOwner())}`;
+const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
+const empty=()=>({counters:{},days:{},keys:{},time:{},timeDay:{},secrets:{},earned:{}});
+export function read(){
+ try{const d=obj(JSON.parse(localStorage.getItem(key())||'null')),e=empty();for(const k of Object.keys(e))e[k]=obj(d[k]);return e;}catch{return empty();}
+}
+const write=d=>{try{localStorage.setItem(key(),JSON.stringify(d));return true;}catch{return false;}};
+const finite=n=>Number.isFinite(n)?n:0;
+/** Collection facts from the real stores, so goal tests stay pure. */
+export function snapshot(){
+ const out={coachesHave:0,coachesNeed:0,catsHave:{},texturedCoaches:0,coloursHave:0,coloursNeed:0,texturesHave:0,texturesNeed:0,bossSkins:0,vaultPacksOpened:0};
+ try{
+  const obtainable=COACHES.map(c=>c.id).filter(id=>!EXCLUDED_COACH_IDS.includes(id)),mine=new Set(unlockedCoachIds());
+  out.coachesNeed=obtainable.length;out.coachesHave=obtainable.filter(id=>mine.has(id)).length;
+  for(const track of Object.keys(COACH_CATEGORIES))out.catsHave[track]=COACH_REQUIREMENTS.filter(r=>r.tracks[0]===track&&mine.has(r.id)).length;
+  const textures=cosmetics.ownerGrantedIds('texture'),coachOf=s=>decodeURIComponent(/^coach:([^:]*):/.exec(s)?.[1]||''),idOf=s=>s.replace(/^coach:[^:]*:/,'');
+  out.texturedCoaches=new Set(textures.map(coachOf).filter(id=>obtainable.includes(id))).size;
+  const colourIds=new Set(colourRewardPool().map(c=>c.id)),textureIds=new Set(textureRewardPool().map(t=>t.id));
+  out.coloursNeed=colourIds.size;out.texturesNeed=textureIds.size;
+  out.coloursHave=new Set([...cosmetics.ownerGrantedIds('color'),...cosmetics.ownerGrantedIds('palette')].map(idOf).filter(id=>colourIds.has(id))).size;
+  out.texturesHave=new Set(textures.map(idOf).filter(id=>textureIds.has(id))).size;
+  out.bossSkins=ledger.grantedIds('boss-skin').length;
+  out.vaultPacksOpened=ledger.grantedIds('reward-pack').filter(id=>id.includes(':vault-')&&openedPack(id)).length;
+ }catch{/* a missing store leaves zeros: goals just stay locked */}
+ return out;
+}
+export const view=(d=read())=>({counters:d.counters,time:d.time,secrets:d.secrets,earned:d.earned,snap:snapshot()});
+const packId=g=>`reward-pack:${g.tier}:vault-${g.id}`;
+function grant(ids,d){
+ const now=Date.now(),done=[];
+ for(const id of ids){if(GOALS.some(g=>g.id===id)&&!d.earned[id]){d.earned[id]=now;done.push(id);}}
+ if(!done.length||!write(d))return [];
+ for(const id of done)ledger.grantUnlock('reward-pack',packId(GOALS.find(g=>g.id===id)));
+ try{window.dispatchEvent(new CustomEvent('myr5:vault-earned',{detail:{ids:done}}));}catch{/* no window in node */}
+ return done;
+}
+/** Newly earned ids after this call (also grants their packs and fires myr5:vault-earned). */
+export function evaluate(d=read()){return grant(newlyEarned(view(d),d.earned),d);}
+export function bump(counter,n=1,{key:k,day=localDay()}={}){
+ const d=read(),mode=COUNTER_MODES[counter]||'day',add=Math.max(0,finite(n));
+ if(mode==='max')d.counters[counter]=Math.max(finite(d.counters[counter]),add);
+ else if(mode==='keyed'){if(k==null)return evaluate(d);const keys=Array.isArray(d.keys[counter])?d.keys[counter]:[];if(!keys.includes(String(k)))keys.push(String(k));d.keys[counter]=keys;d.counters[counter]=keys.length;}
+ else{if(d.days[counter]===day)return evaluate(d);d.days[counter]=day;d.counters[counter]=finite(d.counters[counter])+add;}
+ write(d);return evaluate(d);
+}
+/** Visible-time counter in ms, capped per local day (VAULT_GOALS.timeCapMinutesPerDay). */
+export function addTime(counter,ms,{day=localDay()}={}){
+ const d=read(),cap=VAULT_GOALS.timeCapMinutesPerDay*60000,t=obj(d.timeDay[counter]),used=t.day===day?finite(t.ms):0,add=Math.max(0,Math.min(finite(ms),cap-used));
+ if(add>0){d.time[counter]=finite(d.time[counter])+add;d.timeDay[counter]={day,ms:used+add};write(d);}
+ return evaluate(d);
+}
+export function markSecret(board){
+ if(!SECRET_BOARDS.includes(board))return [];
+ const d=read();if(!d.secrets[board]){d.secrets[board]=Date.now();write(d);}
+ return evaluate(d);
+}
+export const state=()=>view();
+if(typeof window!=='undefined')window.myr5Vault={earn:id=>grant([id],read()),reset:()=>{try{localStorage.removeItem(key());}catch{/* private mode */}},state,bump,addTime,markSecret,evaluate};
diff --git a/reward-packs.mjs b/reward-packs.mjs
index 8b57d87..baa4742 100644
--- a/reward-packs.mjs
+++ b/reward-packs.mjs
@@ -7,14 +7,17 @@ import {unlockedCoachIds,performanceOwner,coachAccess} from './performance-progr
 import {PACK_SIZES,COSMETIC_PACK_ODDS} from './progression-rules.mjs';
 export const PACK_ODDS=COSMETIC_PACK_ODDS;
 export {PACK_SIZES};
+// Achievement Vault packs (id `reward-pack:<tier>:vault-<id>`): always 2 items, colour/texture only; legendary's first slot is a texture.
+export const VAULT_PACK=Object.freeze({size:2,odds:Object.freeze({rare:Object.freeze({color:70,'64-bit':0}),legendary:Object.freeze({color:40,'64-bit':0})})});
+export const isVaultPack=item=>String(item?.id).includes(':vault-');
 const KEY='myr5-opened-reward-packs-v2';
 const ownerKey=()=>`${KEY}/${encodeURIComponent(performanceOwner())}`;
 const safeRead=()=>{try{const data=JSON.parse(localStorage.getItem(ownerKey())||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}};
 const save=data=>{try{localStorage.setItem(ownerKey(),JSON.stringify(data));return true;}catch{return false;}};
 export const packItem=(tier,id)=>({kind:'reward-pack',id,name:`${tier[0].toUpperCase()+tier.slice(1)} Pack`,tier,line:`Open for ${PACK_SIZES[tier]} coach cosmetic${PACK_SIZES[tier]===1?'':'s'}.`});
 const unit=random=>{const value=random();if(!Number.isFinite(value))throw RangeError('Invalid random value.');return Math.min(1-Number.EPSILON,Math.max(0,value));};
-export function rollCategory(tier,random=Math.random){
- const odds=PACK_ODDS[tier];if(!odds)throw Error('Unknown pack tier');
+export function rollCategory(tier,random=Math.random,table=PACK_ODDS){
+ const odds=table[tier];if(!odds)throw Error('Unknown pack tier');
  const roll=unit(random)*100;
  return roll<odds.color?'color':roll<odds.color+odds['64-bit']?'64-bit':'texture';
 }
@@ -47,11 +50,12 @@ export function openRewardPack(item,{random=Math.random}={}){
  if(previous)return rewardsOf(previous).every(grantReward)?previous:null;
  const coaches=unlockedCoachIds().filter(coach=>coachAccess(coach));if(!coaches.length)return null;
  const rewards=[];const selected=new Set(),unowned=remainingCosmetics({coaches});
- for(let slot=0;slot<PACK_SIZES[item.tier];slot++){
-  const rolled=rollCategory(item.tier,random);
+ const vault=isVaultPack(item);
+ for(let slot=0;slot<(vault?VAULT_PACK.size:PACK_SIZES[item.tier]);slot++){
+  const rolled=vault&&item.tier==='legendary'&&slot===0?'texture':rollCategory(item.tier,random,vault?VAULT_PACK.odds:PACK_ODDS);
   // Preserve category odds until that category is exhausted; then award another
   // unowned category rather than a duplicate while the collection is incomplete.
-  const order=[rolled,...['color','64-bit','texture'].filter(category=>category!==rolled)];
+  const order=[rolled,...['color','64-bit','texture'].filter(category=>category!==rolled&&!(vault&&category==='64-bit'))];
   let category=rolled,choices=[];
   for(const candidate of order){const available=unowned.filter(reward=>reward.category===candidate&&!selected.has(identity(reward)+':'+reward.kind));if(available.length){category=candidate;choices=available;break;}}
   if(!choices.length)break; // Complete collection: do not manufacture duplicates.
diff --git a/scripts/offline-assets.mjs b/scripts/offline-assets.mjs
index 76e599d..480a160 100644
--- a/scripts/offline-assets.mjs
+++ b/scripts/offline-assets.mjs
@@ -20,6 +20,8 @@ const CORE_ENTRIES=['/pose.html','/index.html','/onboarding.html','/signin.html'
 // R9-OFFLINE: the pinned pose tracker (vendor/mediapipe, scripts/mediapipe.mjs) is Starter too, so camera workouts run offline.
 export const STARTER=/^\/(?:pod\/worlds\/|food\/pyramid-scanner\.glb$|vendor\/mediapipe\/)/;
 export const BOARDS=/^\/pod\/worlds\/boards\//;
+// Achievement Vault: lazy code and art, never core (the hall's roster GLBs are fetched on demand).
+export const VAULT=/^\/(?:modules\/vault\/|pod\/worlds\/vault\/)/;
 const TUNNELS=/^\/modules\/portal\/portal-tunnel-(?:ice|grass|cogs|jelly|wood|pond)\.mjs$/;
 export const SCOREBOARD_ROOM=/^\/(?:pod\/rooms\/classroom-(?:wall|desks)\.glb|modules\/rooms\/classroom\.(?:mjs|css))$/;
 export const REMINDERS_ROOM=/^\/(?:pod\/rooms\/console\.(?:glb|webp)|modules\/rooms\/reminders-computer\.css)$/;
@@ -46,7 +48,7 @@ async function coreClosure(root,urls,template){
  try{for(const [ref] of (await readFile(template,'utf8')).matchAll(reference))queue.push(ref);}catch(error){if(error.code!=='ENOENT')throw error;}
  while(queue.length){
   const url=queue.shift();
- if(core.has(url)||!urls.has(url)||!coreFolder(url)||DEFERRED.test(url)||STARTER.test(url)||BOARDS.test(url)||TUNNELS.test(url)||SCOREBOARD_ROOM.test(url)||REMINDERS_ROOM.test(url)||CAGE_ROOM.test(url))continue;
+ if(core.has(url)||!urls.has(url)||!coreFolder(url)||DEFERRED.test(url)||STARTER.test(url)||BOARDS.test(url)||VAULT.test(url)||TUNNELS.test(url)||SCOREBOARD_ROOM.test(url)||REMINDERS_ROOM.test(url)||CAGE_ROOM.test(url))continue;
   core.add(url);
   if(/\.(?:html|css|mjs|js|webmanifest|json)$/.test(url))for(const [ref] of (await readFile(join(root,url),'utf8')).matchAll(reference))
    queue.push(ref.startsWith('/')?ref:posix.join(posix.dirname(url),ref),'/'+ref.replace(/^\.\//,''));
@@ -98,6 +100,7 @@ export async function offlineInventory(root,template='sw.js'){
   for(const entry of await readdir(join(root,path),{withFileTypes:true})){
    if(entry.name.startsWith('.')||entry.name==='source')continue;
    const name=path+'/'+entry.name;
+   if(VAULT.test('/'+name+'/'))continue; // online-only lazy vault: in neither inventory
    if(entry.isDirectory())await walk(name);
    // ponytail: the no-SIMD tracker (Safari before 16.4) is served online only, never downloaded; add it to Starter if those phones matter.
    else if(entry.isFile()&&runtime.test(entry.name)&&!entry.name.includes('nosimd'))assets.push(await identify(root,name));
