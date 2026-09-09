// Load only spoken phrases that are needed; keep a small decoded cache on phone.
export class RobotAudio {
 constructor(onMode=()=>{}){this.onMode=onMode;this.context=null;this.cache=new Map();this.cacheBytes=0;this.current=null;this.generation=0;}
 unlock(){
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
  try{this.context??=new Context();if(this.context.state==='suspended')this.context.resume().catch(()=>{});return true;}catch{return false;}
 }
 stop(){this.generation++;const current=this.current;this.current=null;if(current){current.abort?.abort();try{current.source?.stop();}catch{}current.finish?.();if(current.source)this.onMode('Robot voice · gentle pace');}}
 async play(text){
  if(!this.unlock())return false;
  const run=++this.generation,abort=new AbortController();this.current={abort};
  let timeout;
  try{
   let buffer=this.cache.get(text);
   if(!buffer){
    timeout=setTimeout(()=>abort.abort(),5000);
    if(globalThis.localStorage?.getItem('myr5-voice-style')==='phone')throw new Error('Phone voice selected');
    this.manifest??=fetch('/voice/manifest.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Voice pack unavailable');return r.json();}).catch(e=>{this.manifest=null;throw e;});
    const manifest=await this.manifest,clip=manifest.phrases[text.trim()];
    if(!clip)throw new Error('Use phone voice for this phrase');
    const response=await fetch(clip,{signal:abort.signal});
    if(!response.ok)throw new Error('Speech unavailable');
    const data=await response.arrayBuffer();clearTimeout(timeout);
    if(run!==this.generation)return true;
    buffer=await this.context.decodeAudioData(data);
    if(run!==this.generation)return true;
    const bytes=buffer.length*buffer.numberOfChannels*4;
    while(this.cache.size&&this.cacheBytes+bytes>12*1024*1024){const key=this.cache.keys().next().value,old=this.cache.get(key);this.cacheBytes-=old.length*old.numberOfChannels*4;this.cache.delete(key);}
    this.cache.set(text,buffer);this.cacheBytes+=bytes;
   }
   if(run!==this.generation)return true;
   if(this.context.state!=='running'){this.onMode('Tap Test voice to enable sound');this.current=null;return false;}
   const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);
   this.onMode('Robot voice · playing slowly');
   await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;source.disconnect();if(run===this.generation){this.current=null;this.onMode('Robot voice · ready');}resolve();};this.current={source,finish};source.onended=finish;source.start();});
   return true;
  }catch{if(run===this.generation){this.current=null;this.onMode('Phone voice fallback · slow');return false;}return true;}
  finally{clearTimeout(timeout);}
 }
}
