import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCameraPower} from '../arcade/power/camera-power.mjs';

function withStubDom(run){
 const saved={document:globalThis.document,window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,ResizeObserver:globalThis.ResizeObserver};
 const listeners=new Map(),frames=new Map();let nextFrame=0;
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,style:{},setAttribute(){},getContext(){return {setTransform(){},clearRect(){},save(){},restore(){},drawImage(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};},remove(){this.removed=true;this.parent?.remove(this);}};}};
 globalThis.window={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}};
 globalThis.ResizeObserver=undefined;
 globalThis.requestAnimationFrame=fn=>{const id=++nextFrame;frames.set(id,fn);return id;};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const siblings=[{className:'coach-layer'}],host={prepend(node){node.parent=this;siblings.unshift(node);},remove(node){const index=siblings.indexOf(node);if(index>=0)siblings.splice(index,1);},getBoundingClientRect(){return {width:360,height:640};}};
 return Promise.resolve().then(()=>run({host,siblings,frames,listeners})).finally(()=>{
  for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
 });
}

const points=[{x:.5,y:.5,visibility:.99}];
function repDetail(now,reps,active=true){return {points,width:640,height:480,now,workout:{sessionId:'power-test',mode:'squat',kind:'reps',stage:'working',active,workingReps:reps},validHold:false};}

test('power wrapper emits bounded, increasing audio gains and stops its owned voice and canvas',async()=>withStubDom(({host,siblings,frames})=>{
 const levels=[],stops=[];let voices=0;
 const sound={voice(_kind,_duration,build){voices++;const voice={stop(){stops.push(true);}};build({c:{},t:0,output:{},nodes:[]});return voice;},tone(_args,_freq,_duration,level){levels.push(level);}};
 const wrapper=mountCameraPower({host,sound,seed:7});
 wrapper.pose(repDetail(1,0));
 for(let reps=1;reps<=30;reps++)wrapper.pose(repDetail(1+reps*15,reps));
 assert.equal(levels.length,30);assert.ok(levels.every((level,index)=>level>0&&level<=.045&&(index===0||level>levels[index-1])));
 const pulseCount=voices;wrapper.pose(repDetail(480,30));assert.equal(voices,pulseCount,'same progress does not pulse twice');
 wrapper.pose(repDetail(495,30,false));assert.ok(stops.length>=1,'inactive detail stops the owned sound voice');
 const owned=siblings.find(node=>node.className==='workout-power-canvas');assert.ok(owned);
 wrapper.stop();wrapper.stop();assert.equal(owned.removed,true);assert.deepEqual(siblings.map(node=>node.className),['coach-layer']);assert.equal(frames.size,0);
}));

test('invalid plank hold does not pulse; missing sound interface remains safe',async()=>withStubDom(({host})=>{
 let voices=0;
 const wrapper=mountCameraPower({host,sound:{voice(){voices++;}},seed:9});
 const hold=(now,activeSeconds,validHold)=>({points,width:640,height:480,now,validHold,workout:{sessionId:'floor-test',mode:'high-plank',kind:'hold',stage:'working',active:true,activeSeconds}});
 wrapper.pose(hold(1,0,false));wrapper.pose(hold(20,15,false));assert.equal(voices,0);
 wrapper.pose(hold(40,15,true));assert.equal(voices,0,'invalid hold progress is not replayed as a pulse when pose becomes valid');
 wrapper.stop();
 const noSound=mountCameraPower({host,sound:{},seed:10});
 noSound.pose(repDetail(1,0));noSound.pose(repDetail(20,1));noSound.stop();
}));
