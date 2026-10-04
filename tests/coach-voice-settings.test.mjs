import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCoachVoiceSettings,COACH_VOICE_PREFERENCE} from '../coach-voice-settings.mjs';
import {COACH_VOICE_VARIANTS,DEFAULT_COACH_VOICE,RobotAudio} from '../robot-audio.mjs';

class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.listeners={};this.style={};this.value='';this.textContent='';}
 append(...items){this.children.push(...items);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 removeEventListener(name,fn){if(this.listeners[name]===fn)delete this.listeners[name];}
 remove(){this.removed=true;}
}

test('voice settings restore and persist an explicit local style choice',()=>{
 const previousDocument=globalThis.document,previousStorage=globalThis.localStorage;
 const summary=new Element();summary.textContent='Voice';const row=new Element();const group=new Element();
 group.querySelector=selector=>selector==='summary'?summary:selector==='.voice-row'?row:null;
 const settings=new Element();settings.querySelectorAll=()=>[group];
 const storage=new Map([[COACH_VOICE_PREFERENCE,'warm']]);globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 globalThis.document={createElement:tag=>new Element(tag)};
 const applied=[];const voice={setVariant:id=>{applied.push(id);return true;}};const testButton=new Element('button');
 try{
  const cleanup=mountCoachVoiceSettings({voice,settings,testButton});
  const [wrap,hint]=row.children,select=wrap.children[1];
  assert.equal(applied[0],'warm');assert.equal(select.value,'warm');
  assert.deepEqual(select.children.map(option=>option.value),Object.keys(COACH_VOICE_VARIANTS));
  assert.equal(hint.textContent,'Choose a style, then tap Test voice.');
  assert.match(wrap.style.cssText,/color:inherit/);
  assert.ok(testButton.attributes['aria-describedby']);
  select.value='light';select.listeners.change();
  assert.equal(applied[1],'light');assert.equal(storage.get(COACH_VOICE_PREFERENCE),'light');
  cleanup();assert.equal(wrap.removed,true);assert.equal(hint.removed,true);
 }finally{globalThis.document=previousDocument;globalThis.localStorage=previousStorage;}
});

test('each style reaches the output and cancellation disconnects its full graph',async()=>{
 const created=[];const destination={name:'destination'};
 const node=(name,props={})=>({name,connections:[],disconnected:false,connect(target){this.connections.push(target);},disconnect(){this.disconnected=true;},...props});
 const context={state:'running',destination,
  createBufferSource(){const source=node('source',{playbackRate:{value:1},detune:{value:0},start(){this.started=true;},stop(){this.stopped=true;}});created.push(source);return source;},
  createBiquadFilter(){const filter=node('filter',{type:'',frequency:{value:0},Q:{value:0},gain:{value:0}});created.push(filter);return filter;},
  createWaveShaper(){const shaper=node('waveshaper',{curve:null,oversample:''});created.push(shaper);return shaper;}
 };
 const audio=new RobotAudio();audio.context=context;audio.unlock=()=>true;audio.manifest={phrases:{'Coach ready.':'/unused'}};audio.cache.set('Coach ready.',{length:1,numberOfChannels:1});
 const reaches=(start,target,seen=new Set())=>start===target||(!seen.has(start)&&(seen.add(start),start.connections.some(next=>reaches(next,target,seen))));
 for(const id of Object.keys(COACH_VOICE_VARIANTS)){
  assert.equal(audio.setVariant(id),true);const before=created.length;const playing=audio.play('Coach ready.');
  await new Promise(resolve=>setImmediate(resolve));
  const run=created.slice(before),source=run[0];
  assert.equal(source.started,true,id+' source started');assert.equal(reaches(source,destination),true,id+' graph reaches destination');
  if(id==='robot'){assert.equal(run.length,1,'the default style keeps direct playback');assert.equal(COACH_VOICE_VARIANTS[id].rate,1);assert.equal(COACH_VOICE_VARIANTS[id].detune,0);}
  audio.stop();assert.equal(await playing,true,id+' cancellation resolves');
  assert.ok(run.every(item=>item.disconnected),id+' cancellation disconnects source and every effect');
 }
 assert.equal(audio.mode,'Light');assert.equal(audio.setVariant('human-voice'),false);assert.equal(audio.variant,'light');
});
