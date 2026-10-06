import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MOVEMENTS} from '../movement-engine.mjs';
import {voicePhrases} from '../robot-audio.mjs';

const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const librarySource=readFileSync(new URL('../menu.mjs',import.meta.url),'utf8');
const phrases=JSON.parse(readFileSync(new URL('../voice/manifest.json',import.meta.url),'utf8')).phrases;

test('Begin uses approved clips and the new wall sit name remains caption-only',()=>{
 for(const [id,movement] of Object.entries(MOVEMENTS))for(const line of [movement.name+' selected.','Get into position.','Begin.']){
  assert.deepEqual(voicePhrases(line,phrases),id==='wall-sit'&&line===movement.name+' selected.'?[]:[line],`${id}: ${line}`);
 }
});

test('changing exercise and difficulty updates the workout without speaking',()=>{
 const elements=Object.fromEntries(['goal','movement','duration'].map(id=>[id,{value:id==='movement'?'squat':'3',listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);}}]));
 let resets=0,selected=0,libraryOpens=0;const spoken=[];
 const context={$:id=>elements[id],resetMovement:()=>resets++,state:{phase:'idle'},window:{dispatchEvent:()=>selected++},Event:class Event{},voice:{say:text=>spoken.push(text)},MOVEMENTS:{squat:{name:'Squat'}},library:{introduce:()=>libraryOpens++}};
 const handlers=source.slice(source.indexOf("$('goal').addEventListener('change'"),source.indexOf('function soundSwitch()'));
 vm.runInNewContext(handlers,context);
 elements.goal.listeners.get('change')();elements.movement.listeners.get('change')({detail:{automatic:false}});elements.duration.listeners.get('change')();
 assert.equal(resets,3);assert.equal(selected,1);assert.equal(libraryOpens,0);assert.deepEqual(spoken,[]);
 context.state.phase='tracking';elements.movement.listeners.get('change')({detail:{automatic:true}});
 assert.equal(libraryOpens,1,'active exercise change still opens its preview');assert.deepEqual(spoken,[]);
});

test('manual Begin announces the selected workout only after a successful start',async()=>{
 const begin=source.slice(source.indexOf('function startManual(){'),source.indexOf('async function activateManual()'));
 for(const [mode,movement] of Object.entries(MOVEMENTS)){
  const elements=Object.fromEntries(['detail','previewLabel','primary'].map(id=>[id,{setAttribute(){}}]));
  const spoken=[],state={phase:'idle',motion:{kind:movement.kind}},context={generation:0,state,release(){},controls(){},resetMovement(){},status(){},$:id=>elements[id],manualStartGate:{run:callback=>callback()},pod:{beginSet:async()=>({progress:{}})},session:{mode},MOVEMENTS,ManualActiveClock:class{start(){}},performance:{now:()=>1000},document:{hidden:false},Number,voice:{say:(text,options)=>spoken.push([text,options?.key])},manualTick(){},manual:null};
  await vm.runInNewContext(begin+';startManual()',context);
  assert.equal(state.phase,'manual');assert.deepEqual(spoken,[[movement.name+' selected.','movement'],['Begin.','setup']],mode);
  if(mode==='squat'){spoken.length=0;context.pod.beginSet=async()=>{throw Error('Workout unavailable');};await vm.runInNewContext('startManual()',context);assert.deepEqual(spoken,[],'a failed Begin does not announce a workout');}
 }
});

test('camera Begin announces the selected exercise before camera setup',async()=>{
 const begin=source.slice(source.indexOf('  const run=++generation;release();state.phase=\'camera\''),source.indexOf('  let settleCameraStart;'));
 assert.ok(begin.includes('voice.say'));
 for(const [mode,movement] of Object.entries(MOVEMENTS)){
  const spoken=[],state={phase:'idle'},elements={trainingView:{scrollIntoView(){}},detail:{}};
  await vm.runInNewContext(`(async()=>{${begin}})()`,{generation:0,release(){},state,controls(){},resetMovement(){},freezeSettings(){},$:id=>elements[id],status(){},voice:{say:(text,options)=>spoken.push([text,options?.key])},MOVEMENTS,session:{mode}});
  assert.equal(state.phase,'camera');assert.deepEqual(spoken,[[movement.name+' selected.','movement'],['Get into position.','setup']],mode);
 }
});

test('choosing a library exercise previews it without reading its name',()=>{
 let click,previews=0,cancellations=0;const spoken=[];
 const start=librarySource.indexOf("button.addEventListener('click',()=>{cancelIntro();showModel(id);");
 const end=librarySource.indexOf('});',start)+2;
 assert.ok(start>=0&&end>start);
 vm.runInNewContext(librarySource.slice(start,end),{button:{addEventListener:(_name,fn)=>click=fn},cancelIntro:()=>cancellations++,showModel:()=>previews++,speak:text=>spoken.push(text),id:'squat'});
 click();assert.equal(cancellations,1);assert.equal(previews,1);assert.deepEqual(spoken,[]);
});
