// Page music: one looping song per scene, started on the first gesture, obeying the SOUND toggle and saved mute.
// A track change fades the new song in (3 s; the grimoire theme 5 s up to 35%) while a stronger wormhole-transit bed
// (transit + boom + whoosh + the grimoire board sounds at 50%) fades out. Suspends when hidden; ducks under the coach voice.
// Loops come from audio/music (scripts/music-loops.py): exactly 8 bars, loopStart 0 / loopEnd = duration, no encoder padding left.
import {physicalSound} from './physical-sound.mjs';

export const ROUTE_TRACK={pod:'main-theme-one',workout:null,select:null,battlepass:'hey-man-idk',achievements:'guarded-gate',vault:'guarded-gate',
 customize:'daemon-time',customizeCoach:'daemon-time','war-room':'daemon-time',food:'sick-with-science',portal:null,settings:'main-theme-one',scoreboard:'laboratory-violence',meditate:null};
export const TRACK_LEVEL={'main-theme-one':.35};
export const TRACK_FADE={'main-theme-one':5};
export const FADE_IN=3,FADE_OUT=1.2,DUCK_LEVEL=.3,DUCK_DOWN=.12,DUCK_UP=1.2;
// The pod and its menus share the grimoire song; hey-man-idk is only the XP Flight (battle pass) screen; workout/select stay silent (camera / pickers).
// Pod + menus share the grimoire song; hey-man-idk is XP Flight (battle pass) only; workout/select are silent.
// Track for a scene. undefined = keep whatever plays (history, install...), null = silence (workout camera, meditation).
export function trackForRoute(id,{portalUp=false,quiet=false,pathname='',scene=null,hold=false}={}){
 if(quiet||hold)return null; // hold = a portal trace/tunnel is running: only the bed/sfx sound
 if(scene==='battlepass')return 'hey-man-idk'; // XP Flight dialog opens over any page
 if(/^\/(?:creature|war-room)\//.test(pathname))return 'daemon-time';
 if(!id)return portalUp?null:ROUTE_TRACK.pod; // the grimoire is silent
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
 let scene=null,hold=false,holdTimer=0,ctx=null,out=null,duck=null,armed=false,want=undefined,epoch=0,cur=null,cut=null,manifest=null,manifestP=null,noise=null,warned=false;
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
   if(prev){fadeOut(prev,FADE_OUT);}
   void startBed(bedKinds(prev?.name),dur);
  }catch(e){warn(e);}
 }
 function setTrack(name){
  want=name;
  if(!armed||name===undefined)return;
  if(name===null){epoch++;if(cur&&ctx){fadeOut(cur,1);cur=null;cut=null;}return;}
  if(!ensure())return;
  if((cur?.name===name&&!cut)||cut?.name===name){epoch++;return;} // already the song: drop any pending change
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
  const t=trackForRoute(id,{portalUp,quiet:quiet(),pathname,scene,hold});
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
  windowRef.addEventListener('myr5:music-scene',e=>{scene=e.detail?.scene||null;sync();});
  // portal.mjs holds the music for the whole trace + tunnel and releases it once the destination is shown (15 s safety).
  windowRef.addEventListener('myr5:music-hold',e=>{hold=!!e.detail?.hold;clearTimeout(holdTimer);if(hold)holdTimer=setTimeout(()=>{hold=false;sync();},15000);sync();});
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
