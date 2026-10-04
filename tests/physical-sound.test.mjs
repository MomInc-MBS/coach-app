import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicalSound,readSoundPrefs,SOUND_PREF_KEY} from '../audio/physical-sound.mjs';

class Param{
 value=1;
 setTargetAtTime(value){this.value=value;}
 setValueAtTime(value){this.value=value;}
 linearRampToValueAtTime(value){this.value=value;}
 exponentialRampToValueAtTime(value){this.value=value;}
 cancelScheduledValues(){}
}
class Node{
 gain=new Param();frequency=new Param();playbackRate=new Param();Q=new Param();outputs=[];stopped=false;
 constructor(kind='node'){this.kind=kind;}
 connect(next){this.outputs.push(next);return next;}
 disconnect(){this.outputs=[];}
 start(){}
 stop(){this.stopped=true;}
}
class Context{
 state='running';currentTime=0;sampleRate=1000;destination=new Node('destination');nodes=[];
 async resume(){this.state='running';}
 node(kind){const node=new Node(kind);this.nodes.push(node);return node;}
 createGain(){return this.node('gain');}
 createOscillator(){return this.node('oscillator');}
 createBufferSource(){return this.node('buffer-source');}
 createBiquadFilter(){return this.node('filter');}
 createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)};}
 async decodeAudioData(){return {duration:.3};}
 close(){}
}
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('sound settings survive reload and malformed storage fails safely',()=>{
 const saved=storage(),sound=new PhysicalSound({AudioContextClass:null,storage:saved,documentRef:null,windowRef:null});
 sound.setVolume(.27);sound.setMuted(true);
 assert.deepEqual(readSoundPrefs(saved),{volume:.27,muted:true});
 saved.setItem(SOUND_PREF_KEY,'broken');assert.deepEqual(readSoundPrefs(saved),{volume:.42,muted:false});
 assert.equal(sound.unlock(),false);
});

test('rapid gestures have bounded voices and hiding or muting stops playback',()=>{
 const documentRef={hidden:false},sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef,windowRef:null});
 sound.context=new Context();sound.master=sound.context.createGain();sound.duck=sound.context.createGain();
 for(let i=0;i<30;i++){sound.last.delete('mechanical');sound.play('mechanical');}
 assert.equal(sound.voices.size,4,'one mechanical control never fills the global voice budget');
 sound.stopAll();assert.equal(sound.voices.size,0);
 documentRef.hidden=true;sound.last.delete('mechanical');sound.play('mechanical');assert.equal(sound.voices.size,0);
 documentRef.hidden=false;sound.setMuted(true);sound.last.delete('mechanical');sound.play('mechanical');assert.equal(sound.voices.size,0);
 sound.dispose();
});

test('the first cue plays when a gesture resumes a suspended audio context',async()=>{
 const sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef:{hidden:false},windowRef:null});
 sound.now=()=>100;
 sound.context=new Context();sound.context.state='suspended';sound.master=sound.context.createGain();sound.duck=sound.context.createGain();
 sound.play('mechanical');
 await Promise.resolve();
 assert.equal(sound.voices.size,1);
 sound.dispose();
});

test('sample playback reaches the output bus, throttles repeats, and mute stops active sources',()=>{
 const documentRef=new EventTarget();documentRef.hidden=false;
 const sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef,windowRef:null});
 sound.manifestPending=Promise.resolve(null);sound.setScene('off');sound.mount();sound.unlock();
 const sample={duration:.3};sound.samples.set('mechanical',[sample]);sound.play('mechanical');sound.play('mechanical');
 const source=sound.context.nodes.find(node=>node.kind==='buffer-source'&&node.buffer===sample);
 assert.ok(source,'a decoded sample source starts');
 assert.equal(sound.voices.size,1,'rapid duplicate click is throttled');
 assert.equal(source.outputs[0].outputs[0].outputs[0],sound.duck,'source passes through sample gain and voice gain to duck bus');
 assert.equal(sound.duck.outputs[0],sound.master);
 assert.equal(sound.master.outputs[0],sound.context.destination);
 sound.setMuted(true);assert.equal(sound.voices.size,0);assert.equal(source.stopped,true);
 sound.setMuted(false);sound.last.delete('mechanical');sound.play('mechanical');
 const active=sound.context.nodes.filter(node=>node.kind==='buffer-source'&&node.buffer===sample).at(-1);
 documentRef.hidden=true;documentRef.dispatchEvent(new Event('visibilitychange'));
 assert.equal(sound.voices.size,0);assert.equal(active.stopped,true);
 sound.dispose();
});

test('manifest paths stay local and failed samples retry only after backoff',async()=>{
 const originalFetch=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(20)};};
 const sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef:{hidden:false},windowRef:null});
 sound.context=new Context();sound.duck=sound.context.createGain();sound.master=sound.context.createGain();
 try{
  sound.manifest={cues:{mechanical:['https://outside.example/clip.mp3']}};
  await sound.loadSample('mechanical');assert.equal(requests,0);assert.equal(sound.sampleStatus.get('mechanical'),'unavailable');
  sound.manifest.cues.mechanical=['/audio/sfx/mechanical-click-1.mp3'];
  sound.play('mechanical');assert.equal(requests,0,'backoff blocks a fresh request');
  sound.sampleRetry.set('mechanical',0);sound.last.delete('mechanical');sound.play('mechanical');
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(requests,1);assert.equal(sound.sampleStatus.get('mechanical'),'ready');
 }finally{globalThis.fetch=originalFetch;sound.dispose();}
});

test('late audio unlock discards cues after scene change, mute, hide, dispose, or cue expiry',async()=>{
 for(const action of ['scene','mute','hide','dispose','expire']){
  const documentRef={hidden:false},sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef,windowRef:null});
  sound.context=new Context();sound.context.state='suspended';sound.master=sound.context.createGain();sound.duck=sound.context.createGain();
  let release;sound.context.resume=()=>new Promise(resolve=>{release=()=>{sound.context?.state==='suspended'&&(sound.context.state='running');resolve();};});
  sound.play('mechanical');
  if(action==='scene')sound.setScene('portal','ice');
  if(action==='mute')sound.setMuted(true);
  if(action==='hide'){documentRef.hidden=true;sound.stopAll();}
  if(action==='dispose')sound.dispose();
  if(action==='expire')await new Promise(resolve=>setTimeout(resolve,275));
  release();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(sound.voices.size,0,`late ${action} cue stays silent`);
  sound.dispose();
 }
});

test('repeated water drags stay within two voices even when gestures arrive every 170 ms',()=>{
 let time=0;const sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef:{hidden:false},windowRef:null,now:()=>time});
 sound.context=new Context();sound.duck=sound.context.createGain();sound.master=sound.context.createGain();sound.samples.set('water-slosh',[{duration:2.5}]);
 for(let i=0;i<18;i++){sound.play('water-slosh');assert.ok(sound.voices.size<=2);time+=170;}
 assert.ok(sound.context.nodes.filter(node=>node.kind==='buffer-source'&&node.buffer?.duration===2.5).length<=4,'cooldown bounds sample starts');
 sound.stopAll();assert.equal(sound.voices.size,0);assert.equal(sound.tails.size,0);sound.dispose();
});

test('ambient bed stops under dialogs and tracking; grass portal uses breeze without ship hum',()=>{
 const documentRef={hidden:false,body:{dataset:{}},querySelector:()=>null},sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef,windowRef:null});
 sound.context=new Context();sound.duck=sound.context.createGain();sound.master=sound.context.createGain();
 const breeze={duration:12},hum={duration:12};sound.samples.set('breeze',[breeze]);sound.samples.set('pod-hum',[hum]);
 sound.setScene('portal','grass');assert.ok(sound.ambience.sources.some(source=>source.buffer===breeze));assert.ok(!sound.ambience.sources.some(source=>source.buffer===hum));
 documentRef.querySelector=()=>({open:true});sound.syncAmbience();assert.equal(sound.ambience,null);
 documentRef.querySelector=()=>null;documentRef.body.dataset.tracking='true';sound.setScene('pod');assert.equal(sound.ambience,null);
 documentRef.body.dataset.tracking='false';sound.syncAmbience();assert.ok(sound.ambience.sources.some(source=>source.buffer===hum));sound.dispose();
});

test('pod, grimoire, and pod settings dialogs keep ambience while rooms suppress it',()=>{
 let openId=null;const documentRef={hidden:false,body:{dataset:{screen:'pod'}},querySelector:selector=>openId&&!selector.includes(`#${openId}`)?{id:openId}:null};
 const sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef,windowRef:null});
 sound.context=new Context();sound.duck=sound.context.createGain();sound.master=sound.context.createGain();
 for(const id of ['portalWorkoutHome','portalMenu','settings']){openId=id;sound.syncAmbience(true);assert.ok(sound.ambience,`${id} keeps the ship bed`);}
 openId='meditationPanel';sound.syncAmbience();assert.equal(sound.ambience,null);
 openId='portalWorkoutHome';documentRef.body.dataset.tracking='true';sound.syncAmbience();assert.equal(sound.ambience,null,'active workout silences the ship bed');sound.dispose();
});

test('malformed manifest is retried after backoff instead of cached forever',async()=>{
 const originalFetch=globalThis.fetch;let valid=false;
 globalThis.fetch=async url=>({ok:true,json:async()=>valid?{version:1,cues:{mechanical:['/audio/sfx/mechanical-click-1.mp3']}}:{version:1,cues:{}},arrayBuffer:async()=>new ArrayBuffer(20)});
 const sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef:{hidden:false},windowRef:null});sound.context=new Context();
 try{await sound.loadManifest();assert.equal(sound.manifest,null);assert.equal(sound.manifestPending,null);assert.ok(sound.manifestRetryAt>Date.now());
  valid=true;sound.manifestRetryAt=0;await sound.loadManifest();assert.equal(sound.manifest.cues.mechanical.length,1);
 }finally{globalThis.fetch=originalFetch;sound.dispose();}
});
