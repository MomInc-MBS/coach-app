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
  assert.ok(testButton.attributes['aria-describedby']);
  select.value='light';select.listeners.change();
  assert.equal(applied[1],'light');assert.equal(storage.get(COACH_VOICE_PREFERENCE),'light');
  cleanup();assert.equal(wrap.removed,true);assert.equal(hint.removed,true);
 }finally{globalThis.document=previousDocument;globalThis.localStorage=previousStorage;}
});

test('local voice treatments produce distinct WebAudio chains and reject unknown styles',()=>{
 const audio=new RobotAudio(),made=[];
 const context={
  createBiquadFilter(){const node={type:'',frequency:{value:0},Q:{value:0},gain:{value:0},disconnect(){},connect(){}};made.push(node);return node;},
  createWaveShaper(){const node={curve:null,oversample:'',disconnect(){},connect(){}};made.push(node);return node;}
 };
 audio.context=context;
 const robot=audio.makeVoiceChain(COACH_VOICE_VARIANTS.robot),robotTypes=robot.map(node=>node.type??'waveshaper');
 const clear=audio.makeVoiceChain(COACH_VOICE_VARIANTS.clear),clearTypes=clear.map(node=>node.type);
 const warm=audio.makeVoiceChain(COACH_VOICE_VARIANTS.warm),warmTypes=warm.map(node=>node.type);
 assert.notDeepEqual(robotTypes,clearTypes);assert.notDeepEqual(clearTypes,warmTypes);
 assert.ok(COACH_VOICE_VARIANTS.light.rate>COACH_VOICE_VARIANTS.clear.rate);
 assert.equal(audio.variant,DEFAULT_COACH_VOICE);assert.equal(audio.setVariant('warm'),true);assert.equal(audio.mode,'Warm');
 assert.equal(audio.setVariant('human-voice'),false);assert.equal(audio.variant,'warm');
});
