import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const librarySource=readFileSync(new URL('../menu.mjs',import.meta.url),'utf8');

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
 const elements=Object.fromEntries(['detail','previewLabel','primary'].map(id=>[id,{setAttribute(){}}]));
 const spoken=[],state={phase:'idle',motion:{kind:'reps'}},context={generation:0,state,release(){},controls(){},resetMovement(){},status(){},$:id=>elements[id],manualStartGate:{run:callback=>callback()},pod:{beginSet:async()=>({progress:{}})},session:{mode:'squat'},MOVEMENTS:{squat:{name:'Squat'}},ManualActiveClock:class{start(){}},performance:{now:()=>1000},document:{hidden:false},Number,voice:{say:(text)=>spoken.push(text)},manualTick(){},manual:null};
 const begin=source.slice(source.indexOf('function startManual(){'),source.indexOf('async function activateManual()'));
 await vm.runInNewContext(begin+';startManual()',context);
 assert.equal(state.phase,'manual');assert.deepEqual(spoken,['Squat. Manual workout started.']);
 spoken.length=0;context.pod.beginSet=async()=>{throw Error('Workout unavailable');};
 await vm.runInNewContext('startManual()',context);
 assert.deepEqual(spoken,[],'a failed Begin does not announce a workout');
});

test('camera Begin announces the selected exercise before camera setup',async()=>{
 const spoken=[],state={phase:'idle'},elements={trainingView:{scrollIntoView(){}},detail:{}};
 const begin=source.slice(source.indexOf('  const run=++generation;release();state.phase=\'camera\''),source.indexOf('  let settleCameraStart;'));
 assert.ok(begin.includes('voice.say'));
 await vm.runInNewContext(`(async()=>{${begin}})()`,{generation:0,release(){},state,controls(){},resetMovement(){},$:id=>elements[id],status(){},voice:{say:text=>spoken.push(text)},MOVEMENTS:{squat:{name:'Squat'}},session:{mode:'squat'}});
 assert.equal(state.phase,'camera');assert.deepEqual(spoken,['Squat. Get into position.']);
});

test('choosing a library exercise previews it without reading its name',()=>{
 let click,previews=0,cancellations=0;const spoken=[];
 const start=librarySource.indexOf("button.addEventListener('click',()=>{cancelIntro();showModel(id);");
 const end=librarySource.indexOf(';card.append(button)',start);
 assert.ok(start>=0&&end>start);
 vm.runInNewContext(librarySource.slice(start,end),{button:{addEventListener:(_name,fn)=>click=fn},cancelIntro:()=>cancellations++,showModel:()=>previews++,speak:text=>spoken.push(text),id:'squat'});
 click();assert.equal(cancellations,1);assert.equal(previews,1);assert.deepEqual(spoken,[]);
});
