Acceptance: (1) pod plays main-theme-one; hey-man-idk only on XP Flight dialog via myr5:music-scene; workout/select silent. (2) achievement banner top, queues, 5s then 0.6s fade, aria-live polite, tap dismiss, above modal dialogs. List concrete bugs only, with line quotes.
diff --git a/audio/page-music.mjs b/audio/page-music.mjs
index 67cb40f..1c62033 100644
--- a/audio/page-music.mjs
+++ b/audio/page-music.mjs
@@ -4,14 +4,17 @@
 // Loops come from audio/music (scripts/music-loops.py): exactly 8 bars, loopStart 0 / loopEnd = duration, no encoder padding left.
 import {physicalSound} from './physical-sound.mjs';
 
-export const ROUTE_TRACK={pod:'hey-man-idk',workout:'hey-man-idk',select:'hey-man-idk',battlepass:'guarded-gate',achievements:'guarded-gate',vault:'guarded-gate',
+export const ROUTE_TRACK={pod:'main-theme-one',workout:null,select:null,battlepass:'hey-man-idk',achievements:'guarded-gate',vault:'guarded-gate',
  customize:'daemon-time',customizeCoach:'daemon-time','war-room':'daemon-time',food:'sick-with-science',portal:'main-theme-one',settings:'main-theme-one',scoreboard:'laboratory-violence',meditate:null};
 export const TRACK_LEVEL={'main-theme-one':.35};
 export const TRACK_FADE={'main-theme-one':5};
 export const FADE_IN=3,DUCK_LEVEL=.3,DUCK_DOWN=.12,DUCK_UP=1.2;
+// The pod and its menus share the grimoire song; hey-man-idk is only the XP Flight (battle pass) screen; workout/select stay silent (camera / pickers).
+// Pod + menus share the grimoire song; hey-man-idk is XP Flight (battle pass) only; workout/select are silent.
 // Track for a scene. undefined = keep whatever plays (history, install...), null = silence (workout camera, meditation).
-export function trackForRoute(id,{portalUp=false,quiet=false,pathname=''}={}){
+export function trackForRoute(id,{portalUp=false,quiet=false,pathname='',scene=null}={}){
  if(quiet)return null;
+ if(scene==='battlepass')return 'hey-man-idk'; // XP Flight dialog opens over any page
  if(/^\/(?:creature|war-room)\//.test(pathname))return 'daemon-time';
  if(!id)return portalUp?ROUTE_TRACK.portal:ROUTE_TRACK.pod;
  return ROUTE_TRACK[id];
@@ -28,7 +31,7 @@ const MIX_KINDS=['ice','crackle','water'];
 const BED_BOARD_GAIN=.5;
 
 export function createPageMusic({sound=physicalSound,documentRef=globalThis.document,windowRef=globalThis.window,fetchRef=(...a)=>globalThis.fetch(...a),pathname=globalThis.location?.pathname||''}={}){
- let ctx=null,out=null,duck=null,armed=false,want=undefined,epoch=0,cur=null,cut=null,manifest=null,manifestP=null,noise=null,warned=false;
+ let scene=null,ctx=null,out=null,duck=null,armed=false,want=undefined,epoch=0,cur=null,cut=null,manifest=null,manifestP=null,noise=null,warned=false;
  const buffers=new Map(),log=[];
  const warn=e=>{if(!warned){warned=true;console.warn('page music:',e?.message||e);}};
  const note=(what,param,v0,v1,t0,t1)=>{log.push({what,v0,v1,t0,t1});if(log.length>60)log.shift();};
@@ -144,7 +147,7 @@ export function createPageMusic({sound=physicalSound,documentRef=globalThis.docu
  const quiet=()=>{const d=documentRef?.body?.dataset||{};return d.tracking==='true'||d.cameraWorkout==='true';};
  function sync(){
   const id=windowRef?.myr5Routes?.current?.()||'',portalUp=documentRef?.getElementById?.('portalHome')?.hidden===false;
-  const t=trackForRoute(id,{portalUp,quiet:quiet(),pathname});
+  const t=trackForRoute(id,{portalUp,quiet:quiet(),pathname,scene});
   if(t!==undefined)setTrack(t);
  }
  const unlock=()=>{if(armed)return;armed=true;documentRef.removeEventListener('pointerdown',unlock,true);documentRef.removeEventListener('keydown',unlock,true);ensure();sync();if(want!==undefined)setTrack(want);};
@@ -155,6 +158,7 @@ export function createPageMusic({sound=physicalSound,documentRef=globalThis.docu
   windowRef.addEventListener('myr5:sound-settings',()=>{level();if(!muted()&&ctx?.state==='suspended'&&!documentRef.hidden)void ctx.resume();});
   windowRef.addEventListener('myr5:response',e=>{if(!duck)return;const p=duckPlan(e.detail?.state==='speaking');ramp(duck.gain,'duck',p.to,ctx.currentTime,p.seconds);});
   windowRef.addEventListener('myr5:route',sync);
+  windowRef.addEventListener('myr5:music-scene',e=>{scene=e.detail?.scene||null;sync();});
   windowRef.addEventListener('myr5:music-cut',()=>cutNow());
   windowRef.addEventListener('myr5:music-resume',()=>resumeNow());
   new MutationObserver(sync).observe(documentRef.body||documentRef.documentElement,{attributes:true,attributeFilter:['data-tracking','data-camera-workout']});
diff --git a/battle-pass-page.mjs b/battle-pass-page.mjs
index 4834fa5..03cc2dd 100644
--- a/battle-pass-page.mjs
+++ b/battle-pass-page.mjs
@@ -165,12 +165,12 @@ export function mountBattlePass(){
  document.addEventListener('pointercancel',e=>{if(e.pointerId===activePointer)stopPointer();});
  window.addEventListener('blur',stopPointer);
   dialog.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.target.closest('button,input,textarea,select')){e.preventDefault();scene.fire();}});
- dialog.addEventListener('close',()=>{stopPointer();scene.stop();});
+ dialog.addEventListener('close',()=>{stopPointer();scene.stop();window.dispatchEvent(new CustomEvent('myr5:music-scene',{detail:{scene:null}}));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPointer();scene.stop();}else if(dialog.open)scene.start();});
  window.addEventListener('resize',()=>{if(dialog.open)scene.resize();});
  const open=()=>{
   syncBattlePass();render();
-  if(!dialog.open){scene.resetScore?.();dialog.showModal();}
+  if(!dialog.open){scene.resetScore?.();dialog.showModal();window.dispatchEvent(new CustomEvent('myr5:music-scene',{detail:{scene:'battlepass'}}));}
   buildMap();
   const targetChapter=previewFocus();
   const target=targetChapter===chapterForLevel(rank.level)?route.querySelector('[aria-current="step"]'):route.querySelector(`[data-chapter="${targetChapter}"] [data-level="${targetChapter*10+8}"]`);
diff --git a/modules/routes.mjs b/modules/routes.mjs
index be9e454..cef95fd 100644
--- a/modules/routes.mjs
+++ b/modules/routes.mjs
@@ -241,7 +241,7 @@ function portalButton(event){
 
 export function mountRoutes(){
  if(window.myr5Routes)return window.myr5Routes;
- import('./vault/vault-store.mjs').catch(()=>{}); // loads the store so it hears myr5:vault-bump from raw-served files (portal, pond)
+ import('./vault/vault-banner.mjs').catch(()=>{}).then(()=>import('./vault/vault-store.mjs')).catch(()=>{}); // banner first so it hears the drained-pending earns; loads the store so it hears myr5:vault-bump from raw-served files (portal, pond)
  let seen='';
  addEventListener('popstate',event=>{seen=location.href;sync(event);});
  addEventListener('hashchange',()=>{const href=location.href,handled=href===seen;seen='';if(!handled)sync({type:'hashchange',state:history.state});});
diff --git a/modules/vault/vault-banner.mjs b/modules/vault/vault-banner.mjs
new file mode 100644
index 0000000..7eb13e4
--- /dev/null
+++ b/modules/vault/vault-banner.mjs
@@ -0,0 +1,26 @@
+// "ACHIEVEMENT UNLOCKED" banner: listens for myr5:vault-earned {ids}, shows one goal at a time at the top for 5 s, fades 0.6 s.
+import {GOALS} from './vault-goals.mjs';
+export const SHOW_MS=5000,FADE_MS=600;
+/** Queue + timing, DOM-free so tests can drive it: show(goal) / hide() are callbacks. */
+export function createBanner({show,hide,done=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
+ const q=[];let busy=false,t=0;
+ const next=()=>{const g=q.shift();if(!g){busy=false;return;}busy=true;show(g);t=setTimer(()=>{hide();t=setTimer(()=>{done();next();},FADE_MS);},SHOW_MS);};
+ return {push(ids){for(const id of ids||[]){const g=GOALS.find(x=>x.id===id);if(g)q.push(g);}if(!busy)next();},
+  dismiss(){if(!busy)return;clearTimer(t);hide();t=setTimer(()=>{done();next();},FADE_MS);}};
+}
+const CSS=`.vault-banner{position:fixed;inset:auto;margin:0;overflow:visible;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2147483000;width:min(92vw,420px);box-sizing:border-box;padding:10px 14px;transform:translate(-50%,-14px);opacity:0;transition:opacity .6s ease,transform .6s ease;pointer-events:none;text-align:center;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#ff9a3c;text-shadow:0 0 6px rgba(255,140,40,.7);background:linear-gradient(160deg,rgba(76,29,120,.88),rgba(36,12,64,.92));border:2px solid #e6b94c;border-radius:12px;box-shadow:0 0 18px rgba(176,96,255,.55),inset 0 0 14px rgba(230,185,76,.18);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
+.vault-banner.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
+.vault-banner small{display:block;letter-spacing:.2em;font-size:10px;color:#e6b94c}
+.vault-banner b{display:block;font-size:17px;letter-spacing:.06em;margin:2px 0;text-transform:uppercase}
+.vault-banner span{display:block;opacity:.85}`;
+export function mountBanner(doc=document,win=window){
+ if(win.myr5VaultBanner)return win.myr5VaultBanner;
+ const st=doc.createElement('style');st.textContent=CSS;doc.head.append(st);
+ const el=doc.createElement('div');el.className='vault-banner';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('popover','manual');
+ const lab=doc.createElement('small'),ti=doc.createElement('b'),de=doc.createElement('span');lab.textContent='ACHIEVEMENT UNLOCKED';el.append(lab,ti,de);doc.body.append(el);
+ const b=createBanner({show:g=>{ti.textContent=g.title;de.textContent=g.clue;try{el.showPopover();}catch{el.style.display='block';}void el.offsetWidth;el.classList.add('on');},hide:()=>el.classList.remove('on'),done:()=>{try{el.hidePopover();}catch{el.style.display='';}}});
+ el.addEventListener('click',()=>b.dismiss());
+ win.addEventListener('myr5:vault-earned',e=>b.push(e.detail?.ids));
+ return win.myr5VaultBanner=b;
+}
+if(typeof document!=='undefined'&&typeof window!=='undefined')mountBanner();
diff --git a/release-info.mjs b/release-info.mjs
index a1d93b3..df4ff53 100644
--- a/release-info.mjs
+++ b/release-info.mjs
@@ -1,4 +1,4 @@
 import {BUILD_ID} from './release-build.mjs';
-export const RELEASE=Object.freeze({id:'2026-10-06-release-27-'+BUILD_ID,title:'Release 27: Customizer keeps your coach',date:'2026-10-06',url:'https://myr5.mominc.online/repair-coach',notes:[
- "The customizer opens on the body you earned and saved instead of MYR5, and picks you make while your account re-checks are kept."
+export const RELEASE=Object.freeze({id:'2026-10-06-release-30-'+BUILD_ID,title:'Release 30: Secret vault, music, endless Tub Flight',date:'2026-10-06',url:'https://myr5.mominc.online/repair-coach',notes:[
+ "Secret vault, music, endless Tub Flight. Something is hidden in the grimoire."
 ]});
// "ACHIEVEMENT UNLOCKED" banner: listens for myr5:vault-earned {ids}, shows one goal at a time at the top for 5 s, fades 0.6 s.
import {GOALS} from './vault-goals.mjs';
export const SHOW_MS=5000,FADE_MS=600;
/** Queue + timing, DOM-free so tests can drive it: show(goal) / hide() are callbacks. */
export function createBanner({show,hide,done=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 const q=[];let busy=false,t=0;
 const next=()=>{const g=q.shift();if(!g){busy=false;return;}busy=true;show(g);t=setTimer(()=>{hide();t=setTimer(()=>{done();next();},FADE_MS);},SHOW_MS);};
 return {push(ids){for(const id of ids||[]){const g=GOALS.find(x=>x.id===id);if(g)q.push(g);}if(!busy)next();},
  dismiss(){if(!busy)return;clearTimer(t);hide();t=setTimer(()=>{done();next();},FADE_MS);}};
}
const CSS=`.vault-banner{position:fixed;inset:auto;margin:0;overflow:visible;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2147483000;width:min(92vw,420px);box-sizing:border-box;padding:10px 14px;transform:translate(-50%,-14px);opacity:0;transition:opacity .6s ease,transform .6s ease;pointer-events:none;text-align:center;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#ff9a3c;text-shadow:0 0 6px rgba(255,140,40,.7);background:linear-gradient(160deg,rgba(76,29,120,.88),rgba(36,12,64,.92));border:2px solid #e6b94c;border-radius:12px;box-shadow:0 0 18px rgba(176,96,255,.55),inset 0 0 14px rgba(230,185,76,.18);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.vault-banner.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.vault-banner small{display:block;letter-spacing:.2em;font-size:10px;color:#e6b94c}
.vault-banner b{display:block;font-size:17px;letter-spacing:.06em;margin:2px 0;text-transform:uppercase}
.vault-banner span{display:block;opacity:.85}`;
export function mountBanner(doc=document,win=window){
 if(win.myr5VaultBanner)return win.myr5VaultBanner;
 const st=doc.createElement('style');st.textContent=CSS;doc.head.append(st);
 const el=doc.createElement('div');el.className='vault-banner';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('popover','manual');
 const lab=doc.createElement('small'),ti=doc.createElement('b'),de=doc.createElement('span');lab.textContent='ACHIEVEMENT UNLOCKED';el.append(lab,ti,de);doc.body.append(el);
 const b=createBanner({show:g=>{ti.textContent=g.title;de.textContent=g.clue;try{el.showPopover();}catch{el.style.display='block';}void el.offsetWidth;el.classList.add('on');},hide:()=>el.classList.remove('on'),done:()=>{try{el.hidePopover();}catch{el.style.display='';}}});
 el.addEventListener('click',()=>b.dismiss());
 win.addEventListener('myr5:vault-earned',e=>b.push(e.detail?.ids));
 return win.myr5VaultBanner=b;
}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountBanner();
