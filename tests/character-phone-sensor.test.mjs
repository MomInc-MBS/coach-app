import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhoneMotionSource,screenGravity} from '../character-phone-sensor.mjs';
function fixture(permission=false){const events=new EventTarget(),doc=new EventTarget();doc.hidden=false;let time=0,calls=[];const store=new Map();const view={document:doc,performance:{now:()=>time},screen:{orientation:{angle:0}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),DeviceMotionEvent:permission?{requestPermission:()=>{calls.push('motion');return Promise.resolve('granted');}}:{},DeviceOrientationEvent:permission?{requestPermission:()=>{calls.push('orientation');return Promise.resolve('granted');}}:{}};return {view,doc,calls,advance:n=>time+=n,send(type,values){const e=new Event(type);Object.assign(e,values);events.dispatchEvent(e);}};}
test('screen gravity follows screen rotation including upside down',()=>{assert.deepEqual(screenGravity(0,1),{gx:0,gy:1});assert.ok(Math.abs(screenGravity(0,1,90).gx-1)<1e-9);assert.ok(screenGravity(0,1,180).gy<-.99);});
test('gyroscope speed preserves a quick flip even after delayed sensor delivery',()=>{const f=fixture(),samples=[],off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));f.send('devicemotion',{accelerationIncludingGravity:{x:0,y:9.81,z:0}});f.advance(5000);f.send('devicemotion',{accelerationIncludingGravity:{x:-9.81,y:0,z:0},rotationRate:{alpha:900,beta:0,gamma:0}});assert.ok(samples[1].angularSpeed>15);off();});
test('motion detects full rotation and acceleration; orientation does not override fresh gravity',()=>{const f=fixture(),samples=[],off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));f.send('devicemotion',{accelerationIncludingGravity:{x:0,y:9.81,z:0},acceleration:{x:0,y:0,z:0}});f.advance(100);f.send('devicemotion',{accelerationIncludingGravity:{x:10.19,y:0,z:0},acceleration:{x:20,y:0,z:0}});assert.equal(samples[1].gx,1);assert.equal(samples[1].shake,20);assert.ok(samples[1].angularSpeed>10);f.send('deviceorientation',{beta:90,gamma:0});assert.equal(samples.length,2);off();f.send('devicemotion',{accelerationIncludingGravity:{x:0,y:-9,z:0}});assert.equal(samples.length,2);});
test('flat phone retains its gravity heading while still reporting shake and gyro',()=>{const f=fixture(),samples=[],off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));f.send('devicemotion',{accelerationIncludingGravity:{x:0,y:9.81,z:0},acceleration:{x:0,y:0,z:0}});f.advance(100);f.send('devicemotion',{accelerationIncludingGravity:{x:20,y:0,z:9.81},acceleration:{x:20,y:0,z:0},rotationRate:{alpha:0,beta:0,gamma:900}});assert.equal(samples.length,2);assert.equal(samples[1].gx,0);assert.equal(samples[1].gy,1);assert.equal(samples[1].shake,20);assert.ok(samples[1].angularSpeed>15);off();});
test('iOS requests both sensors synchronously in the existing Enable tilt tap',async()=>{const f=fixture(true),source=createPhoneMotionSource(f.view,f.doc),samples=[],off=source.subscribe(s=>samples.push(s));f.send('deviceorientation',{beta:90,gamma:0});assert.equal(samples.length,0);const result=source.request();assert.deepEqual(f.calls,['orientation','motion']);assert.equal(await result,true);f.send('deviceorientation',{beta:90,gamma:0});assert.equal(samples.length,1);f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));f.send('deviceorientation',{beta:0,gamma:90});assert.equal(samples.length,1);off();});

test('a nearly flat phone does not turn weak lateral gravity into a full sideways fall',()=>{
 const f=fixture(),samples=[],off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));
 f.send('devicemotion',{accelerationIncludingGravity:{x:0,y:9.81,z:0},acceleration:{x:0,y:0,z:0}});f.advance(100);
 f.send('devicemotion',{accelerationIncludingGravity:{x:-1,y:.05,z:9.76},acceleration:{x:0,y:0,z:0}});
 assert.equal(samples[1].gx,0);assert.equal(samples[1].gy,1);
 f.advance(100);f.send('devicemotion',{accelerationIncludingGravity:{x:-9.81,y:0,z:0},acceleration:{x:0,y:0,z:0}});assert.equal(samples[2].gx,1);off();
});

test('Pyramid Jump gets current weak steering both ways and returns to neutral without changing retained heading',()=>{
 const f=fixture(),samples=[],off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));
 const send=(gx,gy)=>f.send('devicemotion',{accelerationIncludingGravity:{x:-gx*9.81,y:gy*9.81,z:9.81},acceleration:{x:0,y:0,z:0}});
 send(.02,.03);assert.equal(samples[0].gx,0,'the stable character heading still ignores weak near-flat gravity');assert.ok(samples[0].steerX>.5);
 send(-.02,.03);assert.ok(samples[1].steerX<-.5,'the opposite small correction is immediate');
 send(0,0);assert.equal(samples[2].steerX,0,'returning to flat clears tilt rather than retaining a stale direction');
 send(.99*.12/9.81,0);assert.equal(samples[3].steerX,0,'below the former .12 m/s² gate is neutral');
 send(1.01*.12/9.81,0);assert.ok(samples[4].steerX>.99,'the former gate boundary remains responsive');
 off();
});

test('Pyramid steering direction matches device motion and orientation in portrait and landscape',()=>{
 const sampleMotion=angle=>{const f=fixture(),samples=[];f.view.screen.orientation.angle=angle;const off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));
  const gx=.04,gy=.03;f.send('devicemotion',{accelerationIncludingGravity:{x:-gx*9.81,y:gy*9.81,z:9.81},acceleration:{x:0,y:0,z:0}});off();return samples[0].steerX;};
 const sampleOrientation=angle=>{const f=fixture(),samples=[];f.view.screen.orientation.angle=angle;const off=createPhoneMotionSource(f.view,f.doc).subscribe(s=>samples.push(s));
  const gx=.04,gy=.03,beta=Math.asin(gy)*180/Math.PI,gamma=Math.asin(gx/Math.cos(Math.asin(gy)))*180/Math.PI;f.send('deviceorientation',{beta,gamma});off();return samples[0].steerX;};
 for(const angle of[0,90])assert.ok(Math.abs(sampleMotion(angle)-sampleOrientation(angle))<1e-9,`orientation and acceleration agree at ${angle}°`);
 assert.ok(sampleMotion(0)>0);assert.ok(Math.abs(sampleMotion(90)-.6)<1e-9,'landscape screen rotation projects gravity onto the rotated x axis');
});
