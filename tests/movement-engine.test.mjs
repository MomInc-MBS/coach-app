import test from 'node:test';
import assert from 'node:assert/strict';
import { MovementSession, features } from '../movement-engine.mjs';
const clone=p=>p.map(v=>({...v}));
function standing(){
 const p=Array.from({length:33},()=>({x:.5,y:.2,visibility:1,presence:1}));
 for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]]){
   Object.assign(p[s],{x,y:.23});Object.assign(p[e],{x,y:.34});Object.assign(p[w],{x,y:.43});Object.assign(p[h],{x,y:.43});Object.assign(p[k],{x,y:.65});Object.assign(p[a],{x,y:.89});
 }return p;
}
function squat(){const p=standing();for(const [s,h,k,a] of [[11,23,25,27],[12,24,26,28]]){p[s].x-=.08;p[s].y=.41;p[h].x-=.07;p[h].y=.60;p[k].x+=.10;p[k].y=.69;}return p;}
function frontalSquat(){const p=standing();for(const i of [11,12,13,14,15,16,23,24])p[i].y+=.15;for(const i of [25,26])p[i].y+=.075;return p;}
function pushup(down=false){const p=standing();for(const [s,e,w,h,k,a,d] of [[11,13,15,23,25,27,0],[12,14,16,24,26,28,.025]]){
 Object.assign(p[s],{x:(down?.15:.25),y:(down?.60:.45)+d});Object.assign(p[e],{x:down?.27:.25,y:(down?.65:.59)+d});Object.assign(p[w],{x:.25,y:.78+d});Object.assign(p[h],{x:.53,y:(down?.56:.5)+d});Object.assign(p[k],{x:.67,y:.52+d});Object.assign(p[a],{x:.8,y:.54+d});}return p;}
function tree(){const p=standing();Object.assign(p[25],{x:.25,y:.60});Object.assign(p[27],{x:.55,y:.65});return p;}
function warrior(){const p=standing();for(const [i,x,y] of [[11,.43,.3],[12,.55,.3],[23,.43,.5],[24,.55,.5],[25,.25,.63],[27,.25,.86],[26,.67,.7],[28,.8,.9],[13,.23,.3],[15,.08,.3],[14,.78,.3],[16,.95,.3]])Object.assign(p[i],{x,y});return p;}
function horse(){const p=standing();for(const [i,x,y] of [[11,.42,.3],[12,.58,.3],[23,.42,.5],[24,.58,.5],[25,.24,.66],[26,.76,.66],[27,.24,.88],[28,.76,.88]])Object.assign(p[i],{x,y});return p;}
function runner(mode,options){const session=new MovementSession(mode,options);let time=0;return {session,feed(p,seconds=.5,aspect=1){let result;for(let i=0;i<Math.round(seconds/.05);i++){time+=50;result=session.update(typeof p==='function'?p(time/1000):p,time,aspect);}return result;},gap(p,seconds=2){time+=seconds*1000;return session.update(p,time,1);}};}
function fiveSquats(transform=x=>x){const r=runner('squat');r.feed(transform(standing()),1.3);assert.ok(r.session.base,'calibrated');for(let i=0;i<5;i++){r.feed(transform(squat()),.6);r.feed(transform(standing()),.6);}return r;}
test('five complete squat cycles count five; stillness does not add repetitions',()=>{const r=fiveSquats();assert.equal(r.session.count,5);r.feed(standing(),2);assert.equal(r.session.count,5);});
test('frontal hip travel counts when the projected knee remains straight',()=>{const r=runner('squat');r.feed(standing(),1.3);for(let i=0;i<3;i++){r.feed(frontalSquat(),.6);r.feed(standing(),.6);}assert.equal(r.session.count,3);});
test('one occluded side and a smaller image do not block squats',()=>{const transform=p=>p.map((v,i)=>({...v,x:.5+(v.x-.5)*.5,y:.5+(v.y-.5)*.5,visibility:[12,14,16,24,26,28].includes(i)?.1:1}));assert.equal(fiveSquats(transform).session.count,5);});
test('portrait aspect is corrected before joint angles are calculated',()=>{const p=pushup(true);const adjusted=p.map(v=>({...v,x:v.x/.75}));assert.ok(Math.abs(features(p,1).sides.left.elbow-features(adjusted,.75).sides.left.elbow)<1e-9);});
test('lost tracking cancels an unfinished repetition',()=>{const r=runner('squat');r.feed(standing(),1.3);r.feed(squat(),.6);r.feed(null,.6);r.feed(standing(),.6);assert.equal(r.session.count,0);r.feed(squat(),.6);r.feed(standing(),.6);assert.equal(r.session.count,1);});
test('long frame gap cannot complete a squat',()=>{const r=runner('squat');r.feed(standing(),1.3);r.feed(squat(),.6);r.gap(standing());r.feed(standing(),.6);assert.equal(r.session.count,0);});
test('push-ups count complete arm cycles with one side visible',()=>{const hide=p=>p.map((v,i)=>({...v,visibility:[12,14,16,24].includes(i)?.1:1}));const r=runner('pushup');r.feed(hide(pushup()),1.3);assert.ok(r.session.base);for(let i=0;i<4;i++){r.feed(hide(pushup(true)),.6);r.feed(hide(pushup()),.6);}assert.equal(r.session.count,4);});
test('standing arm bends cannot count as push-ups',()=>{const r=runner('pushup');r.feed(standing(),2);assert.equal(r.session.base,null);assert.equal(r.session.count,0);});
for(const [mode,pose] of [['tree',tree],['warrior',warrior],['horse',horse]]){
 test(`${mode} holds accrue only when the shape is present`,()=>{const r=runner(mode);r.feed(standing(),1);assert.equal(r.session.totalHold,0);r.feed(pose(),3);assert.ok(r.session.hold>2,'hold detected');const held=r.session.totalHold;r.feed(null,1);assert.equal(r.session.hold,0);assert.equal(r.session.totalHold,held);assert.ok(r.session.bestHold>2);});
}
test('a video interruption is not credited as yoga hold time',()=>{const r=runner('tree');r.feed(tree(),2);const before=r.session.totalHold;r.gap(tree(),5);assert.equal(r.session.totalHold,before);assert.equal(r.session.hold,0);});
test('air boxing records relative hand pace and motion time without punch scores',()=>{const r=runner('boxing');r.feed(standing(),1);assert.equal(r.session.active,0);r.feed(t=>{const p=standing();p[15].x+=.08*Math.sin(t*8);p[16].x-=.08*Math.sin(t*8);return p;},3);assert.ok(r.session.active>1);assert.ok(r.session.bestSpeed>1);assert.equal(r.session.count,0);});
test('whole-body translation is not hand motion',()=>{const r=runner('boxing');r.feed(t=>standing().map(v=>({...v,x:v.x+.05*Math.sin(t*8)})),2);assert.ok(r.session.speed<1e-6);assert.equal(r.session.active,0);});
test('jogging counts alternating foot lifts and ignores stillness',()=>{const r=runner('jogging');r.feed(standing(),.5);for(let i=0;i<6;i++){const p=standing(),left=i%2===0;p[left?27:28].y-=.06;p[left?25:26].y-=.05;r.feed(p,.3);r.feed(standing(),.25);}assert.equal(r.session.count,6);r.feed(standing(),1);assert.equal(r.session.count,6);assert.ok(r.session.snapshot().cadence>0);});
test('jumping counts on landing and ignores knee bends with grounded feet',()=>{const r=runner('jumping');r.feed(standing(),1.3);r.feed(frontalSquat(),.5);r.feed(standing(),.5);assert.equal(r.session.count,0);for(let i=0;i<3;i++){r.feed(standing().map(v=>({...v,y:v.y-.07})),.35);r.feed(standing(),.45);}assert.equal(r.session.count,3);});
test('boxing timer completes and new movement clears prior statistics',()=>{const r=runner('boxing',{duration:1});r.feed(standing(),2);assert.equal(r.session.complete,true);assert.equal(r.session.elapsed,1);r.session.reset('tree');assert.equal(r.session.count,0);assert.equal(r.session.elapsed,0);assert.equal(r.session.complete,false);});

// Regression: the old seven-frames-within-1.1-seconds gate never calibrated at
// five updates/s; its 350 ms interruption gate also reset every 2 Hz frame.
// 1.6/s: a phone slowed by the AR coach. The old fixed 1.1 s calibration window needed 2/s and never
// finished "Setting start" below it, so no rep ever counted (hotfix 2026-09-23).
for(const [mode,top,bottom] of [['squat',standing,squat],['pushup',pushup,()=>pushup(true)],['wide-squat',standing,squat],['knee-pushup',pushup,()=>pushup(true)]])for(const fps of [5,3,2,1.6]){
 test(`${mode} calibrates and counts continuous slow tracking at ${fps} updates/s`,()=>{
   const session=new MovementSession(mode);let t=0;const feed=(p,seconds)=>{for(let i=0;i<Math.ceil(seconds*fps);i++){t+=1000/fps;session.update(p.map(({presence,...point})=>point),t);}};
   feed(top(),2);assert.ok(session.base,'steady starting position calibrated');for(let i=0;i<3;i++){feed(bottom(),1.5);feed(top(),1.5);}assert.equal(session.count,3);
 });
}
test('a yoga hold at two updates/s accrues real tracked time',()=>{const session=new MovementSession('tree');for(let t=0;t<=4000;t+=500)session.update(tree(),t);assert.ok(session.hold>=3.5);const held=session.totalHold;session.update(tree(),6000);assert.equal(session.totalHold,held);assert.equal(session.hold,0);});
test('out-of-picture required hips explain a paused count',()=>{const p=standing();p[23].y=1.2;p[24].y=1.2;const result=new MovementSession('squat').update(p,100);assert.equal(result.tracking,false);assert.match(result.message,/hip outside picture/);});
test('unclear required hips cannot count an inferred skeleton',()=>{const p=standing();p[23].visibility=.2;p[24].visibility=.2;const result=new MovementSession('squat').update(p,100);assert.equal(result.tracking,false);assert.match(result.message,/hip unclear/);});
const cropFeet=p=>p.map((v,i)=>({...v,...(i>=27?{y:1.3,visibility:0}:{})}));
test('squats count with knees AND feet cropped out',()=>{const cropped=p=>cropFeet(p).map((v,i)=>({...v,...(i===25||i===26?{y:1.2,visibility:0}:{})}));assert.equal(fiveSquats(cropped).session.count,5);});
test('misleading optional ankle readings cannot veto returning hips',()=>{const r=runner('squat');r.feed(standing(),1.3);r.feed(frontalSquat(),.6);const top=standing();for(const i of [27,28]){top[i].x=.2;top[i].y=.5;}r.feed(top,.6);assert.equal(r.session.count,1);});
test('push-ups count without feet',()=>{const r=runner('pushup');r.feed(cropFeet(pushup()),1.3);for(let i=0;i<3;i++){r.feed(cropFeet(pushup(true)),.6);r.feed(cropFeet(pushup()),.6);}assert.equal(r.session.count,3);});
for(const [mode,pose] of [['tree',tree],['warrior',warrior],['horse',horse]])test(`${mode} hold runs without feet`,()=>{const r=runner(mode);r.feed(cropFeet(pose()),3);assert.ok(r.session.hold>2);assert.match(r.session.measurement,/estimated/);});
test('boxing runs and measures hand movement without feet',()=>{const r=runner('boxing');r.feed(t=>{const p=cropFeet(standing());p[15].x+=.08*Math.sin(t*8);return p;},3);assert.ok(r.session.active>1);});
test('jogging counts six alternating knee lifts without feet',()=>{const r=runner('jogging');r.feed(cropFeet(standing()),.5);for(let i=0;i<6;i++){const p=cropFeet(standing());p[i%2?26:25].y-=.05;r.feed(p,.3);r.feed(cropFeet(standing()),.25);}assert.equal(r.session.count,6);});
test('jump estimates count body rise without feet',()=>{const r=runner('jumping');r.feed(cropFeet(standing()),1.3);for(let i=0;i<3;i++){r.feed(cropFeet(standing().map(v=>({...v,y:v.y-.07}))),.35);r.feed(cropFeet(standing()),.45);}assert.equal(r.session.count,3);assert.match(r.session.measurement,/cannot be verified/);});
