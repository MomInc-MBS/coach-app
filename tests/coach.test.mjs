import test from 'node:test';
import assert from 'node:assert/strict';
import {CueEvents,INTRO,CoachVoice} from '../coach.mjs';
import {MOVEMENTS} from '../movement-engine.mjs';
import {demoPose,DEMO_BONES} from '../demo-poses.mjs';
const snapshot=(extra={})=>({mode:'squat',kind:'reps',tracking:true,calibrated:true,elapsed:0,count:0,remaining:null,complete:false,...extra});
test('ready is spoken once; new rep counts emit once',()=>{const c=new CueEvents();assert.equal(c.update(snapshot(),0)[0].text,'Ready. Begin.');assert.equal(c.update(snapshot(),500).length,0);assert.equal(c.update(snapshot({count:1}),1000)[0].text,'1');assert.equal(c.update(snapshot({count:1}),1200).length,0);});
test('timer milestones survive skipped frames, without repeating',()=>{const c=new CueEvents();c.update(snapshot({remaining:31}),0);assert.equal(c.update(snapshot({remaining:29.2}),1000).at(-1).text,'30 seconds left.');assert.equal(c.update(snapshot({remaining:29}),1200).length,0);c.update(snapshot({remaining:6}),2000);assert.equal(c.update(snapshot({remaining:3.5}),3000).at(-1).text,'4');});
test('brief loss is quiet; longer loss and recovery each speak once',()=>{const c=new CueEvents();c.update(snapshot(),0);const lost=snapshot({tracking:false,message:'Show your hips.'});assert.equal(c.update(lost,500).length,0);assert.equal(c.update(lost,2600)[0].text,'Show your hips.');assert.equal(c.update(lost,3000).length,0);assert.equal(c.update(snapshot(),3500)[0].text,'I can see you again.');});
test('completion is spoken once and reset allows a new ready cue',()=>{const c=new CueEvents();c.update(snapshot(),0);assert.equal(c.update(snapshot({complete:true}),1000)[0].key,'complete');assert.equal(c.update(snapshot({complete:true}),1500).length,0);c.reset();assert.equal(c.update(snapshot(),0)[0].key,'ready');});
test('all eight movements have spoken introductions and all six procedural figures are finite',()=>{assert.deepEqual(Object.keys(INTRO),Object.keys(MOVEMENTS));for(const mode of ['tree','warrior','horse','boxing','jogging','jumping'])for(const t of [0,.3,1,2]){const p=demoPose(mode,t);for(const [a,b] of DEMO_BONES){assert.ok(p[a].every(Number.isFinite));assert.ok(p[b].every(Number.isFinite));}}});
test('speech replaces stale pending counts and cancelling resolves every cue',async()=>{
 const utterances=[];globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};globalThis.speechSynthesis={getVoices:()=>[],speak:u=>utterances.push(u),cancel:()=>{}};
 const voice=new CoachVoice(()=>{});const promises=[voice.say('30 seconds left.',{key:'time'}),voice.say('1',{key:'count'}),voice.say('2',{key:'count'})];
 assert.equal(utterances.length,1);utterances[0].onend();assert.equal(utterances[1].text,'2');voice.cancel();await Promise.all(promises);assert.equal(voice.current,null);assert.equal(voice.queue.length,0);
 delete globalThis.SpeechSynthesisUtterance;delete globalThis.speechSynthesis;
});
test('hold ready waits for an actual pose match and setup reminders recur slowly',()=>{const c=new CueEvents(),m=snapshot({mode:'tree',kind:'hold',progress:0,message:'Show your knees.'});assert.equal(c.update(m,0).length,0);assert.equal(c.update(m,6000)[0].text,'Show your knees.');assert.equal(c.update(m,6200).length,0);assert.equal(c.update({...m,progress:1},6500)[0].key,'ready');});

test('timed holds announce remaining time without also announcing elapsed hold time',()=>{
 const c=new CueEvents(),m=snapshot({mode:'tree',kind:'hold',progress:1,hold:29,totalHold:29,remaining:31});
 c.update(m,0);const events=c.update({...m,hold:30,totalHold:30,remaining:30},1000);
 assert.deepEqual(events.map(e=>e.text),['30 seconds left.']);
});

test('encouragement yields to counts and does not queue behind tracking guidance',async()=>{
 const utterances=[];globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};globalThis.speechSynthesis={getVoices:()=>[],speak:u=>utterances.push(u),cancel:()=>{}};
 const voice=new CoachVoice(()=>{});
 try{
  const praise=voice.say('Steady work.',{key:'encouragement'}),count=voice.say('6',{key:'count'});
  assert.equal(voice.current.text,'6');await praise;voice.cancel();await count;
  const guidance=voice.say('Show your hips.',{key:'tracking'});await voice.say('Steady work.',{key:'encouragement'});
  assert.equal(voice.current.text,'Show your hips.');assert.equal(voice.queue.length,0);voice.cancel();await guidance;
  const first=voice.say('5',{key:'count'}),halfway=voice.say('Halfway.',{key:'encouragement'});
  utterances.at(-1).onend();assert.equal(voice.current.text,'Halfway.');voice.cancel();await Promise.all([first,halfway]);
 }finally{voice.cancel();delete globalThis.SpeechSynthesisUtterance;delete globalThis.speechSynthesis;}
});
