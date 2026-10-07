Review the following change for an audio feature. Acceptance: route->track mapping (pod hey-man-idk; battlepass/achievements/vault guarded-gate; customizer daemon-time; food sick-with-science; portal+settings main-theme-one at 35% with 5 s ramp; scoreboard classroom laboratory-violence that hard-cuts mid-bar when the flicker/crawl sequence starts and resumes at the exact loop position when it ends); 3 s fade in while a transit bed fades out; starts only after first gesture; obeys saved mute; suspends when hidden; ducks fast/recovers slow under coach voice; same track across routes does not restart; music stays out of the core offline set. List concrete bugs only, with line quotes.

diff --git a/app.mjs b/app.mjs
index 061329c..bfaa6cc 100644
--- a/app.mjs
+++ b/app.mjs
@@ -27,13 +27,14 @@ import {mountRoutes,hashRoute} from './modules/routes.mjs';
 import {mountMenuLifecycle} from './menu-lifecycle.mjs';
 import {mountPhoneOrientation} from './modules/phone-orientation.mjs';
 import {mountPhysicalSoundUI} from './audio/sound-ui.mjs';
+import {mountPageMusic} from './audio/page-music.mjs';
 import {mountPodChrome} from './modules/pod-chrome.mjs';
 import {ensurePortalMounted} from './modules/portal/portal-entry.mjs';
 // W2-2A: hash routes + the bottom bar (launch.mjs boots the deep link once the panels exist).
 mountRoutes();
 window.myr5MenuLifecycle=mountMenuLifecycle();
 mountBattlePass();
-mountPhysicalSoundUI();
+mountPhysicalSoundUI();mountPageMusic();
 const lazyGrimoire=document.createElement('button');
 lazyGrimoire.type='button';lazyGrimoire.id='podGrimoireLazyOpen';lazyGrimoire.textContent='GRIMOIRE';
 lazyGrimoire.setAttribute('aria-label','Open grimoire settings');
diff --git a/audio/standalone-sound.mjs b/audio/standalone-sound.mjs
index ca1995a..50ea774 100644
--- a/audio/standalone-sound.mjs
+++ b/audio/standalone-sound.mjs
@@ -1,6 +1,8 @@
 import {mountPhysicalSoundUI} from './sound-ui.mjs';
 import {physicalSound} from './physical-sound.mjs';
+import {mountPageMusic} from './page-music.mjs';
 mountPhysicalSoundUI();
+mountPageMusic(); // /creature/ and /war-room/ play the customizer song; framed pages leave music to the parent
 function mountDockSound(){
  if(!location.pathname.startsWith('/creature/'))return;
  const dock=document.getElementById('coachDock');if(!dock||dock.querySelector('.dock-sound'))return;
diff --git a/modules/rooms/classroom.mjs b/modules/rooms/classroom.mjs
index c70ecc5..3ca2852 100644
--- a/modules/rooms/classroom.mjs
+++ b/modules/rooms/classroom.mjs
@@ -9,7 +9,7 @@ export function mountClassroom(panel,{host=panel.querySelector('[data-room-host]
  panel.dataset.room='loading';delete panel.dataset.roomView;
  const stage=host.querySelector('.classroom-stage'),desksLayer=host.querySelector('.classroom-desks'),boardButton=host.querySelector('.classroom-board'),note=host.querySelector('.classroom-note');
  let disposed=false,renderer=null,scene=null,camera=null,resizeObserver=null,raf=0,slots=[],three=null;
- let crawler=null,hemisphere=null,sunlight=null,origin=performance.now(),stopAnimation=()=>{};
+ let scary=false,crawler=null,hemisphere=null,sunlight=null,origin=performance.now(),stopAnimation=()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function showBoard(){if(disposed||panel.dataset.roomView==='board')return;cancelAnimationFrame(raf);raf=0;panel.dispatchEvent(new CustomEvent('myr5:classroom-board',{bubbles:true}));panel.dataset.roomView='board';panel.scrollTop=0;(panel.querySelector('#accountContent:not([hidden]) h3, #signIn')||panel).focus?.({preventScroll:true});}
  function setDesks(nodes){if(disposed)return;desksLayer.replaceChildren();slots=[];for(const node of nodes.slice(0,2)){const slot=document.createElement('div');slot.className='classroom-desk';slot.append(node);desksLayer.append(slot);slots.push(slot);}place();}
@@ -37,12 +37,13 @@ export function mountClassroom(panel,{host=panel.querySelector('[data-room-host]
    function animate(now){raf=0;if(disposed||document.hidden||!panel.open||panel.dataset.roomView==='board')return;const elapsed=now-origin,phase=elapsed%15000,on=!reduced.matches&&elapsed>=15000&&phase<4200;
     const flicker=on?(phase<450?(.12+.11*Math.abs(Math.sin(phase*.065))):phase<3600?.13:Math.min(1,.13+(phase-3600)/600)):1;
     hemisphere.intensity=2.2*flicker;sunlight.intensity=2.4*flicker;stage.classList.toggle('classroom-dim',on);
+    if(on!==scary){scary=on;window.dispatchEvent(new CustomEvent(on?'myr5:music-cut':'myr5:music-resume'));}
     crawler.root.visible=on;if(on){crawler.root.position.set(-.8+phase/4200*1.6,.18,.48);crawler.pose(phase/1000);}
     renderer.render(scene,camera);if(!reduced.matches)raf=requestAnimationFrame(animate);
    }
-   const visible=()=>{cancelAnimationFrame(raf);raf=0;if(!disposed&&!document.hidden&&panel.open&&panel.dataset.roomView!=='board')raf=requestAnimationFrame(animate);};
+   const visible=()=>{cancelAnimationFrame(raf);raf=0;if(scary&&(document.hidden||!panel.open||panel.dataset.roomView==='board')){scary=false;window.dispatchEvent(new CustomEvent('myr5:music-resume'));}if(!disposed&&!document.hidden&&panel.open&&panel.dataset.roomView!=='board')raf=requestAnimationFrame(animate);};
    const roomView=new MutationObserver(visible);roomView.observe(panel,{attributes:true,attributeFilter:['data-room-view','open']});
-   stopAnimation=()=>{roomView.disconnect();document.removeEventListener('visibilitychange',visible);cancelAnimationFrame(raf);raf=0;};
+   stopAnimation=()=>{if(scary){scary=false;window.dispatchEvent(new CustomEvent('myr5:music-resume'));}roomView.disconnect();document.removeEventListener('visibilitychange',visible);cancelAnimationFrame(raf);raf=0;};
    document.addEventListener('visibilitychange',visible);panel.addEventListener('close',stopAnimation,{once:true});visible();
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();panel.dataset.room='ready';note.hidden=true;stage.querySelector('.classroom-fallback').hidden=true;
    panel.dispatchEvent(new CustomEvent('room-ready',{bubbles:true,detail:controller}));
diff --git a/modules/routes.mjs b/modules/routes.mjs
index e218505..a3283c9 100644
--- a/modules/routes.mjs
+++ b/modules/routes.mjs
@@ -67,6 +67,7 @@ const pending=new Map();
 
 function paint(){
  const current=active?active.id:quiltUp()?'portal':'';
+ window.dispatchEvent(new CustomEvent('myr5:route',{detail:{id:current}})); // page music follows the scene
  for(const button of dock()?.querySelectorAll('[data-route]')||[]){if(button.dataset.route===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  const centre=dock()?.querySelector('.dock-portal');
  if(centre){const onQuilt=quiltUp()&&!active;centre.querySelector('span').textContent=onQuilt?'POD':'PORTAL';centre.setAttribute('aria-label',onQuilt?'Open workout pod':'Return to portal grimoire');centre.title=centre.getAttribute('aria-label');}
diff --git a/post-download.mjs b/post-download.mjs
index 3dbbdb9..a7b3794 100644
--- a/post-download.mjs
+++ b/post-download.mjs
@@ -29,6 +29,7 @@ const GROUPS=[
  ['coach','Your coach','The regular coach models, the customizer and exercise demos.'],
  ['bodies','Extra coach bodies','More body shapes for the customizer, by workout section. A body you pick also downloads by itself.'],
  ['hand','Helping Hand','Your hand companion and all its looks.'],
+ ['music','Page music','Six looping songs for the pod, grimoire, achievements, customizer, food pyramid and classroom.'],
  ['voices','Voices','Your coach’s spoken lines.'],
  ['food','Food scanner','The food scanner model and the food list.'],
  ['meditation','Meditation & backgrounds','Meditation, rest and board backgrounds.'],
diff --git a/scripts/offline-assets.mjs b/scripts/offline-assets.mjs
index 76e599d..006ecf3 100644
--- a/scripts/offline-assets.mjs
+++ b/scripts/offline-assets.mjs
@@ -25,6 +25,8 @@ export const SCOREBOARD_ROOM=/^\/(?:pod\/rooms\/classroom-(?:wall|desks)\.glb|mo
 export const REMINDERS_ROOM=/^\/(?:pod\/rooms\/console\.(?:glb|webp)|modules\/rooms\/reminders-computer\.css)$/;
 // W4-4E (D47): the customizer cage and the Draco decoder only it needs. Never core; the customizer stays 2D without it.
 export const CAGE_ROOM=/^\/pod\/rooms\/cage\//;
+// Page music (audio/music: six AAC loops + manifest) is an optional "Music" group, never core; page-music.mjs fetches it lazily.
+export const MUSIC=/^\/audio\/music\//;
 // Each grimoire's art: its GLB board (cogs: its folder), its flat poster (portal.mjs's base layer) and its tunnel effect.
 const GRIMOIRE_ART={ice:'ice\\.glb',grass:'(?:grass|flower)\\.glb',cogs:'cogs/.+',jelly:'jelly\\.glb',wood:'wood\\.glb',pond:'(?!)'}; // pond is procedural: just its poster and tunnel
 const GRIMOIRE_GROUPS=Object.entries(GRIMOIRE_ART).map(([id,art])=>['grimoire-'+id,new RegExp(`^/(?:pod/worlds/boards/(?:${art}|${id}-poster\\.webp)|modules/portal/portal-tunnel-${id}\\.mjs)$`)]);
@@ -33,7 +35,7 @@ const GRIMOIRE_GROUPS=Object.entries(GRIMOIRE_ART).map(([id,art])=>['grimoire-'+
 const DEFERRED=/^\/(?:nutrition-data\.mjs$|pod\/fonts\/|food\/drgf-paper-character\.png$)/;
 const coreFolder=url=>!url.slice(1).includes('/')||/^\/(?:audio|icons|modules\/portal|modules\/ships|food|vendor\/three)\//.test(url)||url.startsWith('/pod/')&&!/\.(?:glb|gltf|bin)$/i.test(url);
 const reference=/(?:\.{1,2}\/|\/)?[\w@][\w\-./@]*\.(?:html|css|mjs|js|webmanifest|json|mp3|ogg|wav|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|woff2?|ttf|otf)\b/g;
-const runtime=/\.(?:html|css|mjs|js|webmanifest|json|mp3|ogg|wav|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|wasm|task|woff2?|ttf|otf)$/i;
+const runtime=/\.(?:html|css|mjs|js|webmanifest|json|mp3|m4a|ogg|wav|png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|wasm|task|woff2?|ttf|otf)$/i;
 const excluded=new Set(['sw.js','source.json','source.json.gz','package.json','package-lock.json','recover.html','recovery-page.mjs','about.html']);
 
 async function identify(root,path){
@@ -46,7 +48,7 @@ async function coreClosure(root,urls,template){
  try{for(const [ref] of (await readFile(template,'utf8')).matchAll(reference))queue.push(ref);}catch(error){if(error.code!=='ENOENT')throw error;}
  while(queue.length){
   const url=queue.shift();
- if(core.has(url)||!urls.has(url)||!coreFolder(url)||DEFERRED.test(url)||STARTER.test(url)||BOARDS.test(url)||TUNNELS.test(url)||SCOREBOARD_ROOM.test(url)||REMINDERS_ROOM.test(url)||CAGE_ROOM.test(url))continue;
+ if(core.has(url)||!urls.has(url)||!coreFolder(url)||DEFERRED.test(url)||STARTER.test(url)||BOARDS.test(url)||TUNNELS.test(url)||SCOREBOARD_ROOM.test(url)||REMINDERS_ROOM.test(url)||CAGE_ROOM.test(url)||MUSIC.test(url))continue;
   core.add(url);
   if(/\.(?:html|css|mjs|js|webmanifest|json)$/.test(url))for(const [ref] of (await readFile(join(root,url),'utf8')).matchAll(reference))
    queue.push(ref.startsWith('/')?ref:posix.join(posix.dirname(url),ref),'/'+ref.replace(/^\.\//,''));
@@ -72,6 +74,7 @@ const GROUPS=[
  ['room-scoreboard',SCOREBOARD_ROOM],
  ['room-reminders',REMINDERS_ROOM],
  ['room-cage',CAGE_ROOM],
+ ['music',MUSIC],
  ['starter',STARTER],
  ['voices',/^\/voice\//],
  ['hand',/^\/handborne\//],
diff --git a/tests/starter-assets.test.mjs b/tests/starter-assets.test.mjs
index cb458d1..ea38280 100644
--- a/tests/starter-assets.test.mjs
+++ b/tests/starter-assets.test.mjs
@@ -38,3 +38,11 @@ test('starter ship GLB uses only core glTF plus WebP textures, so the plain GLTF
  assert.deepEqual(json.extensionsRequired||[],['EXT_texture_webp']);
  assert.equal(json.meshes.length,1);assert.match(json.nodes[0].name,/^tripo_node_/);
 });
+test('page music: six AAC loops are an optional Music group, never core, and stay small',async()=>{
+ const {core,optional}=await offlineInventory('.');
+ assert.deepEqual(core.filter(a=>a.url.startsWith('/audio/music/')).map(a=>a.url),[],'no music in core');
+ const music=optional.filter(a=>a.group==='music');
+ assert.equal(music.filter(a=>a.url.endsWith('.m4a')).length,6);
+ assert.ok(music.some(a=>a.url==='/audio/music/manifest.json'));
+ assert.ok(music.reduce((s,a)=>s+a.bytes,0)<2*1048576,'music group under 2 MiB');
+});
--- NEW FILE audio/page-music.mjs ---
// Page music: one looping song per scene, started on the first gesture, obeying the SOUND toggle and saved mute.
// A track change fades the new song in (3 s; the grimoire theme 5 s up to 35%) while a stronger wormhole-transit bed
// (transit + boom + whoosh + the grimoire board sounds at 50%) fades out. Suspends when hidden; ducks under the coach voice.
// Loops come from audio/music (scripts/music-loops.py): exactly 8 bars, loopStart 0 / loopEnd = duration, no encoder padding left.
import {physicalSound} from './physical-sound.mjs';

export const ROUTE_TRACK={pod:'hey-man-idk',workout:'hey-man-idk',select:'hey-man-idk',battlepass:'guarded-gate',achievements:'guarded-gate',vault:'guarded-gate',
 customize:'daemon-time',customizeCoach:'daemon-time','war-room':'daemon-time',food:'sick-with-science',portal:'main-theme-one',settings:'main-theme-one',scoreboard:'laboratory-violence',meditate:null};
export const TRACK_LEVEL={'main-theme-one':.35};
export const TRACK_FADE={'main-theme-one':5};
export const FADE_IN=3,DUCK_LEVEL=.3,DUCK_DOWN=.12,DUCK_UP=1.2;
// Track for a scene. undefined = keep whatever plays (history, install...), null = silence (workout camera, meditation).
export function trackForRoute(id,{portalUp=false,quiet=false,pathname=''}={}){
 if(quiet)return null;
 if(/^\/(?:creature|war-room)\//.test(pathname))return 'daemon-time';
 if(!id)return portalUp?ROUTE_TRACK.portal:ROUTE_TRACK.pod;
 return ROUTE_TRACK[id];
}
// Fade-in schedule for a track starting at t0 (gain 0 -> level).
export const rampPlan=(track,t0)=>{const dur=TRACK_FADE[track]??FADE_IN;return {from:0,to:TRACK_LEVEL[track]??1,start:t0,end:t0+dur};};
// Loop position (s) of a looping source started at `startedAt` from `startOffset`, read at `now` (all AudioContext seconds).
export const loopPosition=({startOffset,startedAt,now,duration})=>(((startOffset+(now-startedAt))%duration)+duration)%duration;
// Asymmetric duck: music falls fast when the coach speaks and climbs back slowly.
export const duckPlan=speaking=>speaking?{to:DUCK_LEVEL,seconds:DUCK_DOWN}:{to:1,seconds:DUCK_UP};

const BOARD_KINDS={quilt:['quilt'],ice:['ice'],jelly:['jelly'],water:['water','water-slosh'],pond:['water','water-slosh'],grass:['grass','grass-tinkle'],cogs:['cogs'],wood:['wood','wood-scrape','crackle']};
const MIX_KINDS=['ice','crackle','water'];
const BED_BOARD_GAIN=.5;

export function createPageMusic({sound=physicalSound,documentRef=globalThis.document,windowRef=globalThis.window,fetchRef=(...a)=>globalThis.fetch(...a),pathname=globalThis.location?.pathname||''}={}){
 let ctx=null,out=null,duck=null,armed=false,want=undefined,epoch=0,cur=null,cut=null,manifest=null,manifestP=null,noise=null,warned=false;
 const buffers=new Map(),log=[];
 const warn=e=>{if(!warned){warned=true;console.warn('page music:',e?.message||e);}};
 const note=(what,param,v0,v1,t0,t1)=>{log.push({what,v0,v1,t0,t1});if(log.length>60)log.shift();};
 function ramp(param,what,to,t0,seconds){
  param.cancelScheduledValues(t0);param.setValueAtTime(param.value,t0);
  if(seconds>0)param.linearRampToValueAtTime(to,t0+seconds);else param.setValueAtTime(to,t0);
  note(what,param,param.value,to,t0,t0+seconds);
 }
 function ensure(){
  if(ctx)return true;
  sound.unlock?.();ctx=sound.context;if(!ctx)return false;
  duck=ctx.createGain();out=ctx.createGain();duck.connect(out);out.connect(ctx.destination);level();return true;
 }
 const muted=()=>!!sound.muted;
 function level(){if(!out)return;out.gain.setTargetAtTime(muted()?0:1,ctx.currentTime,.03);}
 async function loadManifest(){
  return manifestP??=(async()=>{const r=await fetchRef('/audio/music/manifest.json');if(!r.ok)throw Error('music manifest unavailable');manifest=await r.json();return manifest;})().catch(e=>{manifestP=null;throw e;});
 }
 async function decode(url){
  if(!buffers.has(url))buffers.set(url,(async()=>{const r=await fetchRef(url);if(!r.ok)throw Error('unavailable '+url);return ctx.decodeAudioData(await r.arrayBuffer());})().catch(e=>{buffers.delete(url);throw e;}));
  return buffers.get(url);
 }
 function noiseBuffer(){
  if(noise)return noise;noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const d=noise.getChannelData(0);let s=0x2f6e2b1;
  for(let i=0;i<d.length;i++){s=(1664525*s+1013904223)>>>0;d[i]=s/2147483648-1;}return noise;
 }
 function stopSoon(nodes,seconds){setTimeout(()=>{for(const n of nodes){try{n.stop?.();}catch{}try{n.disconnect();}catch{}}},Math.ceil(seconds*1000)+80);}
 // ---- transition bed -------------------------------------------------------------------------------------------
 async function startBed(kinds,fade){
  const t0=ctx.currentTime,bed=ctx.createGain(),comp=ctx.createDynamicsCompressor(),nodes=[bed,comp];
  comp.threshold.value=-12;comp.ratio.value=5;bed.connect(comp);comp.connect(out);
  bed.gain.setValueAtTime(1,t0);bed.gain.setValueAtTime(1,t0+.5);bed.gain.linearRampToValueAtTime(0,t0+fade);note('bed',bed.gain,1,0,t0+.5,t0+fade);
  const add=n=>{nodes.push(n);return n;};
  // low boom + whoosh make the existing transit sample feel stronger
  const boom=add(ctx.createOscillator()),bg=add(ctx.createGain());boom.type='sine';boom.frequency.setValueAtTime(78,t0);boom.frequency.exponentialRampToValueAtTime(30,t0+1.6);
  bg.gain.setValueAtTime(.0001,t0);bg.gain.exponentialRampToValueAtTime(.7,t0+.05);bg.gain.exponentialRampToValueAtTime(.0001,t0+2);boom.connect(bg).connect(bed);boom.start(t0);boom.stop(t0+2.1);
  const wh=add(ctx.createBufferSource()),wf=add(ctx.createBiquadFilter()),wg=add(ctx.createGain());wh.buffer=noiseBuffer();wf.type='bandpass';wf.Q.value=.8;
  wf.frequency.setValueAtTime(180,t0);wf.frequency.exponentialRampToValueAtTime(2600,t0+1);wf.frequency.exponentialRampToValueAtTime(260,t0+fade);
  wg.gain.setValueAtTime(.0001,t0);wg.gain.exponentialRampToValueAtTime(.35,t0+.5);wg.gain.exponentialRampToValueAtTime(.0001,t0+fade);wh.connect(wf).connect(wg).connect(bed);wh.start(t0);wh.stop(t0+fade+.1);
  stopSoon(nodes,fade+.2);
  try{
   const sfx=await sfxManifest();
   const play=async(path,gain,at,rate=1)=>{const b=await decode(path);if(ctx.currentTime>t0+fade)return;const s=add(ctx.createBufferSource()),g=add(ctx.createGain());s.buffer=b;s.playbackRate.value=rate;g.gain.value=gain;s.connect(g).connect(bed);s.start(Math.max(ctx.currentTime,t0+at));};
   const transit=sfx.cues?.transit?.[0];
   if(transit)await play(transit,1.5,0,.85);
   let at=.1;
   for(const kind of kinds){
    if(kind==='crackle'){crackle(bed,t0,Math.min(fade,2.6),add);continue;}
    const list=sfx.cues?.[kind];if(!list?.length)continue;
    for(let i=0;i<3;i++){await play(list[(i)%list.length],BED_BOARD_GAIN,at+i*.7,.94+Math.random()*.12);}
    at+=.35;
   }
  }catch(e){warn(e);}
 }
 function crackle(bed,t0,seconds,add){
  const g=add(ctx.createGain());g.gain.value=BED_BOARD_GAIN;g.connect(bed);
  for(let i=0;i<26;i++){
   const at=t0+Math.random()*seconds,s=add(ctx.createBufferSource()),f=add(ctx.createBiquadFilter()),e=add(ctx.createGain());
   s.buffer=noiseBuffer();f.type='highpass';f.frequency.value=900+Math.random()*2500;e.gain.setValueAtTime(.0001,at);e.gain.exponentialRampToValueAtTime(.2+Math.random()*.3,at+.003);e.gain.exponentialRampToValueAtTime(.0001,at+.03+Math.random()*.05);
   s.connect(f).connect(e).connect(g);s.start(at,Math.random()*2);s.stop(at+.1);
  }
 }
 let sfxP=null;
 const sfxManifest=()=>sfxP??=fetchRef('/audio/sfx/manifest.json').then(r=>r.json()).then(m=>({cues:m.cues})).catch(e=>{sfxP=null;throw e;});
 function bedKinds(prev){return prev==='main-theme-one'?BOARD_KINDS[sound.board]||BOARD_KINDS.quilt:MIX_KINDS;}
 // ---- tracks --------------------------------------------------------------------------------------------------
 function startSource(buffer,m,offset,gainValue,fadeSeconds){
  const g=ctx.createGain(),s=ctx.createBufferSource(),t=ctx.currentTime;
  s.buffer=buffer;s.loop=true;s.loopStart=m.loopStart||0;s.loopEnd=m.loopEnd||buffer.duration;s.connect(g).connect(duck);
  g.gain.setValueAtTime(fadeSeconds?0:gainValue,t);if(fadeSeconds){g.gain.linearRampToValueAtTime(gainValue,t+fadeSeconds);note('fade-in',g.gain,0,gainValue,t,t+fadeSeconds);}
  s.start(t,offset);return {source:s,gain:g,startedAt:t,startOffset:offset};
 }
 function fadeOut(entry,seconds){
  const t=ctx.currentTime,g=entry.gain.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+seconds);note('fade-out',g,g.value,0,t,t+seconds);
  stopSoon([entry.source,entry.gain],seconds);
 }
 async function play(name){
  const mine=++epoch,prev=cur;
  try{
   const m=(await loadManifest()).tracks[name];if(!m)throw Error('unknown track '+name);
   const buffer=await decode(m.url);
   if(mine!==epoch||!ctx)return;
   const plan=rampPlan(name,ctx.currentTime),dur=plan.end-plan.start;
   const entry=startSource(buffer,m,0,plan.to,dur);
   Object.assign(entry,{name,m,buffer,level:plan.to});cur=entry;cut=null;
   if(prev){fadeOut(prev,dur);}
   void startBed(bedKinds(prev?.name),dur);
  }catch(e){warn(e);}
 }
 function setTrack(name){
  want=name;
  if(!armed||name===undefined)return;
  if(name===null){epoch++;if(cur&&ctx){fadeOut(cur,1);cur=null;cut=null;}return;}
  if(!ensure())return;
  if(cur?.name===name&&!cut)return;
  if(cut&&cut.name===name)return;
  if(ctx.state==='suspended'&&!documentRef?.hidden&&!muted())void ctx.resume();
  void play(name);
 }
 // ---- classroom cut / resume ----------------------------------------------------------------------------------
 // Hard stop mid-bar (no fade) and later restart from the exact loop position it stopped at.
 function cutNow(){
  if(!cur||cut||!ctx)return false;
  const offset=loopPosition({startOffset:cur.startOffset,startedAt:cur.startedAt,now:ctx.currentTime,duration:cur.m.loopEnd-(cur.m.loopStart||0)});
  try{cur.source.stop();cur.source.disconnect();}catch{}
  cut={name:cur.name,offset,m:cur.m,buffer:cur.buffer,level:cur.level};cur=null;return cut.offset;
 }
 function resumeNow(){
  if(!cut||!ctx)return false;
  const {name,m,buffer,level:l,offset}=cut;cut=null;
  const entry=startSource(buffer,m,offset,l,0);Object.assign(entry,{name,m,buffer,level:l});cur=entry;return offset;
 }
 // ---- environment ---------------------------------------------------------------------------------------------
 const quiet=()=>{const d=documentRef?.body?.dataset||{};return d.tracking==='true'||d.cameraWorkout==='true';};
 function sync(){
  const id=windowRef?.myr5Routes?.current?.()||'',portalUp=documentRef?.getElementById?.('portalHome')?.hidden===false;
  const t=trackForRoute(id,{portalUp,quiet:quiet(),pathname});
  if(t!==undefined)setTrack(t);
 }
 const unlock=()=>{if(armed)return;armed=true;documentRef.removeEventListener('pointerdown',unlock,true);documentRef.removeEventListener('keydown',unlock,true);ensure();sync();if(want!==undefined)setTrack(want);};
 function mount(){
  if(!documentRef||windowRef.parent!==windowRef)return api; // a framed page leaves the music to its parent
  documentRef.addEventListener('pointerdown',unlock,true);documentRef.addEventListener('keydown',unlock,true);
  documentRef.addEventListener('visibilitychange',()=>{if(!ctx)return;if(documentRef.hidden)void ctx.suspend();else if(!muted())void ctx.resume();});
  windowRef.addEventListener('myr5:sound-settings',()=>{level();if(!muted()&&ctx?.state==='suspended'&&!documentRef.hidden)void ctx.resume();});
  windowRef.addEventListener('myr5:response',e=>{if(!duck)return;const p=duckPlan(e.detail?.state==='speaking');ramp(duck.gain,'duck',p.to,ctx.currentTime,p.seconds);});
  windowRef.addEventListener('myr5:route',sync);
  windowRef.addEventListener('myr5:music-cut',()=>cutNow());
  windowRef.addEventListener('myr5:music-resume',()=>resumeNow());
  new MutationObserver(sync).observe(documentRef.body||documentRef.documentElement,{attributes:true,attributeFilter:['data-tracking','data-camera-workout']});
  sync();return api;
 }
 const api={mount,setTrack,cut:cutNow,resume:resumeNow,sync,log,current:()=>cur?.name||null,state:()=>({armed,want,playing:cur?.name||null,cut:cut&&{...cut,buffer:undefined,m:undefined},ctx:ctx&&ctx.state,muted:muted()}),unlock};
 return api;
}
export const pageMusic=createPageMusic();
export function mountPageMusic(){const m=pageMusic.mount();if(globalThis.window)globalThis.window.myr5Music=m;return m;}
