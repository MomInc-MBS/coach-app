// Every spoken cue uses the approved voice pack, including compound sentences.
export const VOICE_MANIFEST='/voice/manifest.json?v=approved-v2';
export const VOICE_CACHE='myr5-voice-approved-v2';
export function voicePhrases(text,phrases){
 text=text.trim();if(phrases[text])return [text];
 const parts=(text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[]).map(s=>s.trim()).filter(Boolean);
 return parts.length&&parts.every(s=>phrases[s])?parts:[];
}
export class RobotAudio {
 constructor(onMode=()=>{}){this.onMode=onMode;this.context=null;this.cache=new Map();this.cacheBytes=0;this.current=null;this.generation=0;}
 unlock(){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;try{this.context??=new Context();if(this.context.state==='suspended')this.context.resume().catch(()=>{});return true;}catch{return false;}}
 stop(){this.generation++;const current=this.current;this.current=null;if(current){current.abort?.abort();try{current.source?.stop();}catch{}current.finish?.();}this.onMode('Deep robot voice');}
 async play(text){
  if(!this.unlock())return false;
  const run=++this.generation,abort=new AbortController();this.current={abort};let timeout;
  try{
   timeout=setTimeout(()=>abort.abort(),5000);
   this.manifest??=fetch(VOICE_MANIFEST,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Voice pack unavailable');return r.json();}).catch(e=>{this.manifest=null;throw e;});
   const manifest=await this.manifest,parts=voicePhrases(text,manifest.phrases);clearTimeout(timeout);
   if(!parts.length)throw Error('No approved clip');
   for(const phrase of parts){
    if(run!==this.generation)return true;
    let buffer=this.cache.get(phrase);
    if(!buffer){
     timeout=setTimeout(()=>abort.abort(),5000);
     const response=await fetch(manifest.phrases[phrase],{signal:abort.signal});if(!response.ok)throw Error('Voice unavailable');
     const data=await response.arrayBuffer();clearTimeout(timeout);if(run!==this.generation)return true;
     buffer=await this.context.decodeAudioData(data);if(run!==this.generation)return true;
     const bytes=buffer.length*buffer.numberOfChannels*4;
     while(this.cache.size&&this.cacheBytes+bytes>12*1024*1024){const key=this.cache.keys().next().value,old=this.cache.get(key);this.cacheBytes-=old.length*old.numberOfChannels*4;this.cache.delete(key);}
     this.cache.set(phrase,buffer);this.cacheBytes+=bytes;
    }
    if(this.context.state!=='running'){this.onMode('Tap Test voice to enable sound');this.current=null;return false;}
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);
    this.onMode('Deep robot voice');
    await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;source.disconnect();if(run===this.generation)this.current={abort};resolve();};this.current={source,abort,finish};source.onended=finish;source.start();});
   }
   if(run===this.generation)this.current=null;return true;
  }catch{if(run===this.generation){this.current=null;this.onMode('Voice unavailable · captions on');return false;}return true;}
  finally{clearTimeout(timeout);}
 }
}
