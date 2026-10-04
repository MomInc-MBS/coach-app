// Every spoken cue uses the approved voice pack, including compound sentences.
import {BUILD_ID} from './release-build.mjs';
import {coachFetch,coachOnline} from './coach-net.mjs';
export const VOICE_MANIFEST='/voice/manifest.json?v='+BUILD_ID;
export const VOICE_CACHE='myr5-voice-approved-v2';
// Local playback treatments of approved clips; no OS voice or network speech service.
export const COACH_VOICE_VARIANTS=Object.freeze({
 robot:{label:'Robot',rate:.94,detune:-150,filter:'robot'},
 clear:{label:'Clear',rate:1.04,detune:0,filter:'clear'},
 warm:{label:'Warm',rate:.96,detune:-250,filter:'warm'},
 light:{label:'Light',rate:1.10,detune:250,filter:'light'}
});
export const DEFAULT_COACH_VOICE='robot';
export function voicePhrases(text,phrases){
 text=text.trim();if(phrases[text])return [text];
 const parts=(text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[]).map(s=>s.trim()).filter(Boolean);
 return parts.length&&parts.every(s=>phrases[s])?parts:[];
}
export class RobotAudio {
 constructor(onMode=()=>{}){this.onMode=onMode;this.context=null;this.cache=new Map();this.cacheBytes=0;this.current=null;this.generation=0;this.variant=DEFAULT_COACH_VOICE;}
 setVariant(id){if(!COACH_VOICE_VARIANTS[id])return false;this.variant=id;return true;}
 get mode(){return COACH_VOICE_VARIANTS[this.variant]?.label??COACH_VOICE_VARIANTS[DEFAULT_COACH_VOICE].label;}
 unlock(){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;try{this.context??=new Context();if(this.context.state==='suspended')this.context.resume().catch(()=>{});return true;}catch{return false;}}
 stop(){this.generation++;const current=this.current;this.current=null;if(current){current.abort?.abort();try{current.source?.stop();}catch{}current.finish?.();}this.onMode('Voice: '+this.mode);}
 async play(text){
  if(!this.unlock())return false;
  const run=++this.generation,abort=new AbortController();this.current={abort};
  try{
   const got=this.manifest?null:await coachFetch(VOICE_MANIFEST,{signal:abort.signal},{timeoutMs:5000,local:true});
   if(got){if(!got.ok)throw Error('Voice pack unavailable');this.manifest=got.data;}
   const manifest=await this.manifest,parts=voicePhrases(text,manifest.phrases);
   if(!parts.length)throw Error('No approved clip');
   for(const phrase of parts){
    if(run!==this.generation)return true;
    let buffer=this.cache.get(phrase);
    if(!buffer){
     const clip=await coachFetch(manifest.phrases[phrase],{signal:abort.signal},{timeoutMs:5000,parse:'arrayBuffer',local:true});
     if(!clip.ok)throw Error('Voice unavailable');const data=clip.data;if(run!==this.generation)return true;
     buffer=await this.context.decodeAudioData(data);if(run!==this.generation)return true;
     const bytes=buffer.length*buffer.numberOfChannels*4;
     while(this.cache.size&&this.cacheBytes+bytes>12*1024*1024){const key=this.cache.keys().next().value,old=this.cache.get(key);this.cacheBytes-=old.length*old.numberOfChannels*4;this.cache.delete(key);}
     this.cache.set(phrase,buffer);this.cacheBytes+=bytes;
    }
    if(this.context.state!=='running'){this.onMode('Tap Test voice to enable sound');this.current=null;return false;}
     const profile=COACH_VOICE_VARIANTS[this.variant]??COACH_VOICE_VARIANTS[DEFAULT_COACH_VOICE];
     const source=this.context.createBufferSource();source.buffer=buffer;if(source.playbackRate)source.playbackRate.value=profile.rate;if(source.detune)source.detune.value=profile.detune;
     const nodes=this.makeVoiceChain(profile);source.connect(nodes[0]??this.context.destination);if(nodes.length)nodes.at(-1).connect(this.context.destination);
     this.onMode('Voice: '+profile.label);
     await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;source.disconnect();nodes.forEach(node=>node.disconnect());if(run===this.generation)this.current={abort};resolve();};this.current={source,abort,finish};source.onended=finish;source.start();});
   }
   if(run===this.generation)this.current=null;return true;
  }catch{if(run===this.generation){this.current=null;this.onMode(coachOnline()?'Voice unavailable · captions on':'Offline · captions on, voice returns when you reconnect');return false;}return true;}
 }
 makeVoiceChain(profile){
  const ctx=this.context,chain=[];
  if(typeof ctx.createBiquadFilter!=='function')return chain;
  const filter=(type,frequency,gain=0,q=0.7)=>{const node=ctx.createBiquadFilter();node.type=type;node.frequency.value=frequency;node.Q.value=q;if(node.gain)node.gain.value=gain;chain.push(node);};
  if(profile.filter==='robot'){
   filter('bandpass',1450,0,0.75);
   if(ctx.createWaveShaper){const shaper=ctx.createWaveShaper();shaper.curve=Float32Array.from({length:257},(_,i)=>{const x=i/128-1;return Math.tanh(2.2*x);});shaper.oversample='2x';chain.push(shaper);}
  }else if(profile.filter==='warm'){
   filter('lowshelf',220,3.5);filter('highshelf',3600,-2.5);
  }else if(profile.filter==='light'){
   filter('highpass',115);filter('highshelf',2400,3);
  }else{
   filter('highpass',75);filter('peaking',2800,1.5,0.8);
  }
  return chain;
 }
}
