// Small, gesture-unlocked sound layer shared by the pod, grimoire, and rooms.
// Samples are optional: every cue has a local Web Audio fallback for offline play.
import {seamlessLoopBuffer} from './loop-seam.mjs';
export const SOUND_PREF_KEY='myr5.physicalSound.v1';
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const RATE={'main-control':38,mechanical:38,switch:90,dial:45,lever:80,crt:65,ice:250,jelly:220,water:280,'water-slosh':900,'pond-slosh':1100,grass:300,'grass-tinkle':1200,cogs:180,wood:250,'wood-scrape':300,quilt:220,drag:160,transit:800,dialup:1800,'electric':110,bloop:160,'signal':250,'whiteboard':450};
const GROUP={'main-control':'mechanical',water:'water','water-slosh':'water','pond-slosh':'water',wood:'wood','wood-scrape':'wood',grass:'grass','grass-tinkle':'tinkle'};
const SAMPLE={'main-control':'mechanical',mechanical:'mechanical-click',switch:'metal-switch',dial:'mechanical',lever:'switch',ice:'ice-crack',jelly:'jelly-squish',water:'water-splash','water-slosh':'water-slosh','pond-slosh':'water-slosh',grass:'grass-rustle','grass-tinkle':'grass-tinkle',cogs:'cogs-ratchet',wood:'wood-tap','wood-scrape':'wood-scrape',quilt:'cloth-rustle',transit:'portal-transit',dialup:'dialup',crt:'crt-tap','pod-hum':'pod-hum',breeze:'breeze',waterfall:'waterfall',electric:'electric',bloop:'bloop',signal:'signal',whiteboard:'whiteboard'};
const safeStorage=()=>{try{return globalThis.localStorage;}catch{return null;}};

export function readSoundPrefs(storage=safeStorage()){
 try{const saved=JSON.parse(storage?.getItem(SOUND_PREF_KEY)||'{}');return {muted:saved.muted===true,volume:clamp(Number.isFinite(saved.volume)?saved.volume:.42)};}catch{return {muted:false,volume:.42};}
}

export class PhysicalSound{
 constructor({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,storage=safeStorage(),documentRef=globalThis.document,windowRef=globalThis.window,now=()=>performance.now()}={}){
  this.AudioContextClass=AudioContextClass;this.storage=storage;this.document=documentRef;this.window=windowRef;
  this.now=now;
  this.prefs=readSoundPrefs(storage);this.context=null;this.voices=new Set();this.tails=new Set();this.last=new Map();this.scene='pod';this.board='quilt';this.ducked=false;this.ambience=null;this.epoch=0;
  this.samples=new Map();this.sampleStatus=new Map();this.sampleRetry=new Map();this.manifest=null;this.manifestPending=null;this.manifestRetryAt=0;this.noise=null;this.started=false;
 }
 mount(){
  if(this.started||!this.document)return this;this.started=true;this.abort=new AbortController();const signal=this.abort.signal;
  const unlock=()=>this.unlock();
  this.document.addEventListener('pointerdown',unlock,{capture:true,signal});this.document.addEventListener('keydown',unlock,{capture:true,signal});
  this.document.addEventListener('visibilitychange',()=>{if(this.document.hidden)this.stopAll();else this.syncAmbience();},{signal});
  this.window?.addEventListener('pagehide',()=>this.stopAll(),{signal});
  this.window?.addEventListener('pageshow',()=>this.syncAmbience(),{signal});
  this.window?.addEventListener('myr5:response',event=>{this.ducked=event.detail?.state==='speaking';this.syncLevel();},{signal});
  this.window?.addEventListener('storage',event=>{if(event.key===SOUND_PREF_KEY){this.prefs=readSoundPrefs(this.storage);if(this.muted||!this.volume)this.stopAll();this.syncLevel();this.syncAmbience();this.emit();}},{signal});
  if(globalThis.MutationObserver&&this.document?.documentElement){this.observer=new MutationObserver(()=>this.syncAmbience());this.observer.observe(this.document.documentElement,{subtree:true,attributes:true,attributeFilter:['open','hidden','data-screen','data-tracking','data-camera-workout','data-ship-view']});signal.addEventListener('abort',()=>this.observer.disconnect(),{once:true});}
  return this;
 }
 get muted(){return this.prefs.muted;}
 get volume(){return this.prefs.volume;}
 setVolume(volume){this.prefs.volume=clamp(Number(volume)||0);this.save();}
 setMuted(muted){this.prefs.muted=!!muted;this.save();}
 save(){try{this.storage?.setItem(SOUND_PREF_KEY,JSON.stringify(this.prefs));}catch{}if(this.muted||!this.volume)this.stopAll();this.syncLevel();this.syncAmbience();this.emit();}
 emit(){this.window?.dispatchEvent(new CustomEvent('myr5:sound-settings',{detail:{...this.prefs}}));}
 unlock(){
  if(!this.AudioContextClass)return false;
  if(!this.context){
   try{const c=this.context=new this.AudioContextClass();this.master=c.createGain();this.duck=c.createGain();this.duck.connect(this.master);this.master.connect(c.destination);this.syncLevel();}
   catch{this.context=null;return false;}
  }
  if(!this.manifestPending&&Date.now()>=this.manifestRetryAt)void this.loadManifest();
  if(this.context.state==='suspended')void this.context.resume().then(()=>this.syncAmbience()).catch(()=>{});
  else this.syncAmbience();
  return true;
 }
 syncLevel(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.025);this.duck.gain.setTargetAtTime(this.ducked?.23:1,t,.08);}
 setScene(scene,board=this.board){if(scene!==this.scene||board!==this.board)this.epoch++;this.scene=scene;this.board=board;this.syncAmbience();}
 setBoard(board){if(board!==this.board)this.epoch++;this.board=board;this.syncAmbience();}
 noiseBuffer(){
  if(this.noise)return this.noise;const c=this.context,b=this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=b.getChannelData(0);
  let seed=0x51f15e;for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/2147483648)-1;}
  return b;
 }
 sourceNoise(){const s=this.context.createBufferSource();s.buffer=this.noiseBuffer();return s;}
 voice(kind,seconds,build){
  const c=this.context;if(!c||c.state!=='running'||this.document?.hidden||this.muted||!this.volume)return;
  const group=GROUP[kind]||kind,limit=['mechanical','dial','lever','switch'].includes(group)?4:group==='tinkle'||group==='transit'||group==='dialup'?1:2;
  while([...this.voices].filter(v=>v.group===group).length>=limit)[...this.voices].find(v=>v.group===group).stop(.06);
  while(this.voices.size>=12)this.voices.values().next().value.stop();
  const output=c.createGain(),nodes=[];output.connect(this.duck);let stopped=false;
  const voice={group,stop:(fade=0)=>{if(stopped)return;stopped=true;this.voices.delete(voice);let timer;
   const clean=()=>{clearTimeout(timer);this.tails.delete(clean);for(const n of nodes)try{n.stop?.();}catch{}for(const n of nodes)try{n.disconnect();}catch{}output.disconnect();};
   if(fade){const now=c.currentTime;output.gain.setValueAtTime(output.gain.value,now);output.gain.linearRampToValueAtTime(0,now+fade);this.tails.add(clean);timer=setTimeout(clean,Math.ceil(fade*1000)+5);}else clean();}};
  this.voices.add(voice);const t=c.currentTime;
  try{build({c,t,output,nodes});}catch{voice.stop();return;}
  setTimeout(()=>voice.stop(),Math.ceil((seconds+.06)*1000));return voice;
 }
 tone({c,t,output,nodes},freq,duration,level,type='sine',endFreq=freq,at=0){
  const osc=c.createOscillator(),gain=c.createGain(),start=t+at;osc.type=type;osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain).connect(output);osc.start(start);osc.stop(start+duration+.02);nodes.push(osc,gain);
 }
 noiseBurst({c,t,output,nodes},duration,level,low,high,at=0){
  const src=this.sourceNoise(),filter=c.createBiquadFilter(),gain=c.createGain(),start=t+at;filter.type='bandpass';filter.frequency.setValueAtTime(low,start);filter.frequency.exponentialRampToValueAtTime(Math.max(30,high),start+duration);filter.Q.value=.7;
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  src.connect(filter).connect(gain).connect(output);src.start(start);src.stop(start+duration+.02);nodes.push(src,filter,gain);
 }
 synth(kind){
  const v=(duration,fn)=>this.voice(kind,duration,fn),pitch=()=>.94+Math.random()*.12;
  switch(kind){
   case 'main-control':return v(.15,x=>{this.tone(x,220*pitch(),.11,.17,'triangle',85);this.noiseBurst(x,.065,.08,800,240);});
   case 'mechanical':return v(.12,x=>{this.tone(x,960*pitch(),.07,.17,'triangle',460);this.noiseBurst(x,.065,.08,1800,650);});
   case 'switch':return v(.18,x=>{this.noiseBurst(x,.08,.16,250,2200);this.tone(x,350,.13,.13,'triangle',180,.035);});
   case 'dial':return v(.12,x=>{this.tone(x,420*pitch(),.085,.095,'square',300);this.noiseBurst(x,.045,.04,1700,850);});
   case 'lever':return v(.25,x=>{this.noiseBurst(x,.16,.14,450,1100);this.tone(x,150,.18,.12,'sawtooth',90,.03);});
   case 'electric':return v(.22,x=>{this.noiseBurst(x,.18,.025,2200,1400);this.tone(x,110,.18,.008,'sine',100);});
   case 'bloop':return v(.2,x=>this.tone(x,260,.16,.045,'sine',95));
   case 'signal':return v(.32,x=>{this.tone(x,660,.07,.018,'sine',660);this.tone(x,880,.07,.012,'sine',880,.17);});
   case 'whiteboard':return v(.85,x=>{this.noiseBurst(x,.26,.035,1300,900);for(let i=0;i<4;i++){this.tone(x,1900+i*210,.09,.055,'sine',3300-i*190,.10+i*.16);this.noiseBurst(x,.07,.018,3200,1700,.11+i*.16);}});
   case 'crt':return v(.16,x=>{this.tone(x,90,.13,.12,'sine',54);this.noiseBurst(x,.08,.045,2000,400);});
   case 'ice':return v(.5,x=>{this.noiseBurst(x,.17,.16,5500,1700);this.tone(x,980*pitch(),.32,.08,'sine',460,.025);this.noiseBurst(x,.08,.045,4500,1000,.16);});
   case 'jelly':return v(.46,x=>{this.noiseBurst(x,.28,.16,350,130);this.tone(x,180*pitch(),.32,.16,'sine',65);this.tone(x,95,.16,.075,'sine',45,.1);});
   case 'water':return v(.65,x=>{this.noiseBurst(x,.44,.23,1900,250);this.tone(x,410,.23,.08,'sine',110,.04);this.noiseBurst(x,.22,.09,900,160,.2);});
   case 'water-slosh':return v(.8,x=>{this.noiseBurst(x,.5,.13,320,105);this.noiseBurst(x,.4,.11,500,190,.2);this.tone(x,120,.55,.065,'sine',75,.08);});
   case 'pond-slosh':return v(.34,x=>{this.noiseBurst(x,.27,.038,320,105);this.tone(x,120,.27,.018,'sine',75,.04);});
   case 'grass':return v(.32,x=>{this.noiseBurst(x,.24,.065,2000,520);this.tone(x,1400*pitch(),.18,.025,'sine',1100,.06);});
   case 'grass-tinkle':return v(.55,x=>{this.tone(x,1650*pitch(),.4,.028,'sine',1350);this.tone(x,2180*pitch(),.27,.018,'sine',1770,.07);});
   case 'cogs':return v(.32,x=>{for(let i=0;i<3;i++){this.tone(x,350-i*65,.085,.12,'square',160-i*20,i*.085);this.noiseBurst(x,.055,.07,1500,480,i*.085);}});
   case 'wood':return v(.45,x=>{this.noiseBurst(x,.32,.14,600,130);this.tone(x,145,.36,.14,'triangle',75);});
   case 'wood-scrape':return v(.45,x=>{this.noiseBurst(x,.36,.13,900,180);this.tone(x,155,.3,.06,'triangle',95);});
   case 'quilt':return v(.34,x=>{this.noiseBurst(x,.25,.10,1450,320);this.tone(x,260,.15,.055,'sine',185,.05);});
   case 'drag':return v(.19,x=>{this.noiseBurst(x,.16,.045,1200,330);});
   case 'transit':return v(1.5,x=>{this.noiseBurst(x,1.3,.18,180,5000);this.tone(x,66,1.25,.16,'sawtooth',840);this.tone(x,110,1.1,.11,'sine',1800,.12);});
   case 'dialup':return v(2.6,x=>{for(let i=0;i<9;i++){this.tone(x,[350,440,610,250,820,530,1190,460,960][i],.2,.018,'sine',230+i*83,i*.25);this.noiseBurst(x,.14,.014,1400,4600,i*.25);}});
  }
 }
 play(kind){
  if(!RATE[kind]||this.muted||!this.volume||this.document?.hidden)return;
  const now=this.now(),previous=this.last.get(kind)??-Infinity;if(now-previous<RATE[kind])return;this.last.set(kind,now);
  const context=this.context,epoch=this.epoch;if(!context)return;
  const start=()=>{if(this.context!==context||this.epoch!==epoch||this.now()-now>250||context.state!=='running'||this.document?.hidden||this.muted)return;
   const variants=kind==='whiteboard'?null:this.samples.get(kind);if(variants?.length)this.playSample(kind,variants[Math.floor(Math.random()*variants.length)]);else this.synth(kind);
  };
  if(context.state==='running')start();else void context.resume().then(()=>{this.syncAmbience();start();}).catch(()=>{});
  if(this.manifest&&SAMPLE[kind]&&this.sampleStatus.get(kind)!=='loading'&&this.sampleStatus.get(kind)!=='ready'&&Date.now()>=(this.sampleRetry.get(kind)||0))void this.loadSample(kind);
 }
 playSample(kind,buffer){
  const duration=Math.min(buffer.duration,kind==='pond-slosh'?.38:3)/(kind==='main-control'?.76:1);
  this.voice(kind,duration,({c,t,output,nodes})=>{
   const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=(kind==='main-control'?.76:1)*(.97+Math.random()*.06);
   const level=kind==='pond-slosh'?.16:kind==='dialup'?.13:kind==='signal'?.09:kind==='electric'?.12:kind==='bloop'?.16:kind==='whiteboard'?.4:kind==='grass-tinkle'?.04:kind==='grass'?.4:kind==='transit'?.72:.68;
   gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(level,t+.008);gain.gain.setValueAtTime(level,t+Math.max(.009,duration-.05));gain.gain.linearRampToValueAtTime(.0001,t+duration);
   source.connect(gain).connect(output);source.start(t);source.stop(t+duration+.01);nodes.push(source,gain);
  });
 }
 async loadManifest(){
  this.manifestPending=(async()=>{try{const response=await fetch('/audio/sfx/manifest.json');if(response.ok){const candidate=await response.json();if(candidate?.version===1&&candidate.cues&&typeof candidate.cues==='object'&&Object.values(candidate.cues).some(paths=>Array.isArray(paths)&&paths.some(path=>typeof path==='string'&&/^\/audio\/sfx\/[a-z0-9-]+\.mp3$/i.test(path))))this.manifest=candidate;}}catch{}
   if(this.manifest&&this.context){for(const kind of Object.keys(SAMPLE))void this.loadSample(kind);}
   else{this.manifestRetryAt=Date.now()+15_000;this.manifestPending=null;}
   return this.manifest;})();
  return this.manifestPending;
 }
 async loadSample(kind){
  this.sampleStatus.set(kind,'loading');
  try{const sources=this.manifest?.cues?.[kind]||this.manifest?.cues?.[SAMPLE[kind]];const paths=(Array.isArray(sources)?sources:[sources]).filter(path=>typeof path==='string'&&/^\/audio\/sfx\/[a-z0-9-]+\.mp3$/i.test(path)).slice(0,2);
   const decoded=await Promise.all(paths.map(async path=>{const url=path.startsWith('/')?path:`/audio/sfx/${path}`;const response=await fetch(url);if(!response.ok)throw Error('Unavailable');const data=await response.arrayBuffer();if(data.byteLength>2_000_000)throw Error('Too large');let buffer=await this.context.decodeAudioData(data);if(buffer.duration>(['pod-hum','breeze','waterfall'].includes(kind)?30:5))throw Error('Too long');if(kind==='waterfall')buffer=seamlessLoopBuffer(this.context,buffer);return buffer;}));
   if(!decoded.length)throw Error('Unavailable');this.samples.set(kind,decoded);this.sampleStatus.set(kind,'ready');if(['pod-hum','breeze','waterfall'].includes(kind))this.syncAmbience(true);
  }catch{this.sampleStatus.set(kind,'unavailable');this.sampleRetry.set(kind,Date.now()+15_000);}
 }
 stopAll(){this.epoch++;for(const voice of [...this.voices])voice.stop();for(const clean of [...this.tails])clean();this.stopAmbience(true);}
 stopAmbience(immediate=false){
  const active=this.ambience;if(!active)return;this.ambience=null;
  const {gain,sources,nodes}=active,t=this.context.currentTime,delay=immediate?0:.12;
  gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(0,t+delay);
  setTimeout(()=>{for(const node of sources)try{node.stop();}catch{}for(const node of nodes)try{node.disconnect();}catch{}},Math.ceil(delay*1000)+15);
 }
 syncAmbience(force=false){
  if(!this.context||this.context.state!=='running')return;
  const body=this.document?.body,meditation=this.document?.querySelector?.('.meditation-panel[open] [data-meditation-scene]:not([hidden])'),blocked=(!meditation&&this.document?.querySelector?.('.meditation-panel[open]'))||this.document?.querySelector?.('dialog[open]:not(#portalWorkoutHome):not(#portalMenu):not(#settings):not(.meditation-panel)')||body?.dataset?.tracking==='true'||body?.dataset?.cameraWorkout==='true'||(!meditation&&body?.dataset?.shipView==='true')||body?.dataset?.screen==='rest';
  const scene=this.document?.hidden||this.muted||!this.volume||blocked?'off':meditation?'meditation':this.scene;
  const key=scene==='portal'?`portal:${this.board}`:scene;
  if(!force&&key===this.ambienceKey&&this.ambience)return;
  this.stopAmbience();this.ambienceKey=key;if(scene==='off')return;
  const c=this.context,t=c.currentTime,gain=c.createGain(),sources=[],nodes=[gain];gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,t+.18);gain.connect(this.duck);
  const bed=c.createGain();bed.gain.value=.12;bed.connect(gain);nodes.push(bed);
  if(scene==='meditation'){const buffer=this.samples.get('waterfall')?.[0],rush=buffer?c.createBufferSource():this.sourceNoise(),filter=c.createBiquadFilter(),waterGain=c.createGain();if(buffer)rush.buffer=buffer;rush.loop=true;filter.type='lowpass';filter.frequency.value=3600;waterGain.gain.value=buffer?.28:.09;rush.connect(filter).connect(waterGain).connect(gain);rush.start();sources.push(rush);nodes.push(rush,filter,waterGain);this.ambience={gain,sources,nodes};return;}
  const grass=scene==='portal'&&this.board==='grass',water=scene==='portal'&&['water','pond'].includes(this.board),breeze=this.samples.get('breeze')?.[0];
  if(!grass&&!water){const humBuffer=this.samples.get('pod-hum')?.[0];
   if(humBuffer){const hum=c.createBufferSource();hum.buffer=humBuffer;hum.loop=true;hum.connect(bed);hum.start();sources.push(hum);nodes.push(hum);}
   else{const hum=c.createOscillator();hum.type='sine';hum.frequency.value=scene==='portal'?61:54;hum.connect(bed);hum.start();sources.push(hum);nodes.push(hum);}}
  if(grass&&breeze){const wind=c.createBufferSource(),windGain=c.createGain();wind.buffer=breeze;wind.loop=true;windGain.gain.value=.18;wind.connect(windGain).connect(gain);wind.start();sources.push(wind);nodes.push(wind,windGain);}
  else{const airflow=this.sourceNoise(),filter=c.createBiquadFilter(),airGain=c.createGain();airflow.loop=true;filter.type='lowpass';filter.frequency.value=grass?350:water?580:190;airGain.gain.value=grass?.09:water?.12:.018;airflow.connect(filter).connect(airGain).connect(gain);airflow.start();sources.push(airflow);nodes.push(airflow,filter,airGain);}
  this.ambience={gain,sources,nodes};
 }
 dispose(){this.abort?.abort();this.stopAll();void this.context?.close();this.context=null;this.started=false;}
}

export const physicalSound=new PhysicalSound();
