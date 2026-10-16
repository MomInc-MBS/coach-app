import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlice,render,TARGET_SIZE,TYPE_IDS} from '../arcade/slice/core.mjs';
import {createHandGlow,renderHandGlow} from '../arcade/slice/hand-glow.mjs';
import {XP_SCALE} from '../progression-rules.mjs';

function recordingContext(){
 const calls=[],drawAlphas=[],stack=[];let alpha=1;
 return {calls,drawAlphas,get globalAlpha(){return alpha;},set globalAlpha(value){alpha=value;},clearRect(){calls.push('clear');},save(){stack.push(alpha);},restore(){alpha=stack.pop()??1;},translate(){},rotate(){},beginPath(){},rect(){calls.push('rect');},clip(){calls.push('clip');},
  moveTo(){},lineTo(){},closePath(){},arc(){},fill(){calls.push('fill');},stroke(){calls.push('stroke');},fillRect(){calls.push('fillRect');},fillText(){calls.push('text');},drawImage(){calls.push('image');drawAlphas.push(alpha);},setLineDash(){}};
}

test('all shared target creation paths apply the 2.5x display and collision radius once',()=>{
 const e=createSlice({auto:false,seed:14}),launched=e.launch(),custom=e.spawn({type:TYPE_IDS[0],x:40,y:50,r:7}),defaulted=e.spawn({x:60,y:50}),bonus=e.dropBonus();
 assert.ok(launched.r>=11*TARGET_SIZE&&launched.r<17*TARGET_SIZE,'launched target scales its randomized base radius');
 assert.equal(custom.r,7*TARGET_SIZE);assert.equal(defaulted.r,12*TARGET_SIZE);assert.equal(bonus.r,9*TARGET_SIZE);
 assert.ok([launched,custom,defaulted,bonus].every(o=>o.r>0));
 // Hit-testing uses the same scaled radius that render() uses for visible width.
 const target=e.spawn({x:90,y:50,r:7});assert.equal(e.hitSegment({x:target.x+target.r-.1,y:50},{x:target.x+target.r-.1,y:50},{kind:'explode'}),1);
 assert.equal(target.alive,false);
});

test('camera slice hit, XP, combo and scoring remain active with visual effects rendered',()=>{
 const e=createSlice({auto:false,mode:'martial',seed:12});
 const target=e.spawn({x:60,y:80,vx:0,vy:0,r:12});
 assert.equal(e.hitSegment({x:40,y:80},{x:80,y:80},{kind:'slice'}),1);
 assert.equal(e.objects.includes(target),false);
 assert.equal(e.halves.length,2,'physics still records the slice result');
 assert.equal(e.hits,1);assert.equal(e.score,10);
 const bonus=e.spawn({x:90,y:80,vx:0,vy:0,r:10,bonus:true});
 assert.equal(e.hitSegment({x:90,y:80},{x:90,y:80},{kind:'explode'}),1);
 assert.equal(e.xp,3*XP_SCALE,'bonus XP remains unchanged when cut art is hidden');
 assert.equal(e.score,25);assert.equal(e.objects.includes(bonus),false);
 e.trail.push({x:10,y:10,life:.2},{x:20,y:20,life:.2});
 const camera=recordingContext();
 const oldDocument=globalThis.document;
 try{
  globalThis.document={createElement(){return {width:16,height:16,getContext(){return {fillRect(){}};}};}};
  e.step(.625);assert.ok(Math.abs(e.halves[0].life-.625)<1e-9,'half-life advances during the actual simulation step');
  render(camera,e,{pointerTrail:false});
 }
 finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
 assert.ok(camera.calls.includes('clip'),'camera mode retains the split pieces');
 assert.ok(camera.calls.includes('fillRect'),'camera mode retains debris and stains');
 assert.equal(camera.calls.includes('stroke'),false,'camera mode omits only the old white pointer slash');
 assert.ok(camera.drawAlphas.some(alpha=>Math.abs(alpha-.5)<.02),'split halves render with mid-life fade alpha');
 e.step(.625);assert.equal(e.halves.length,0,'expired halves are removed from the live list');
 e.addTrail(10,10);e.addTrail(20,20);e.trail.forEach(point=>point.life=.2);const standalone=recordingContext();render(standalone,e);assert.ok(standalone.calls.includes('stroke'),'standalone mode retains its pointer slash');
});

test('camera mode keeps targets and break-apart art, hides only the old white slash, then paints hand glow',()=>{
 const points=Array.from({length:23},()=>({x:.5,y:.5,visibility:.9}));
 points[15]={x:.4,y:.5,visibility:.9};points[16]={x:.6,y:.5,visibility:.9};
 const fx=createHandGlow();fx.pose(points,{now:0});
 for(let now=33;now<500;now+=33){points[15]={x:.2+now/600,y:.5,visibility:.9};fx.pose(points,{now});fx.step(.033,now);}
 const e=createSlice({auto:false,mode:'martial',seed:2});
 const sliced=e.spawn({x:40,y:80,vx:0,vy:0,r:12});e.hitSegment({x:30,y:80},{x:50,y:80});
 e.spawn({x:100,y:60,vx:0,vy:0,r:12});e.trail.push({x:10,y:10,life:.2},{x:20,y:20,life:.2});
 const ctx=recordingContext(),oldDocument=globalThis.document;
 try{globalThis.document={createElement(){return {width:16,height:16,getContext(){return {fillRect(){}};}};}};render(ctx,e,{pointerTrail:false});}
 finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
 assert.equal(e.halves.length,2);assert.ok(ctx.calls.includes('clip'),'split pieces remain visible');
 assert.ok(ctx.calls.includes('image'),'the unsliced target remains visible');
 assert.equal(ctx.calls.includes('stroke'),false,'only the old white pointer slash is hidden');
 renderHandGlow(ctx,fx.state,{w:180,h:320});
 assert.ok(fx.state.hands[0].count>1);
 assert.ok(ctx.calls.includes('fill'),'the glowing hand ribbon is drawn');
 assert.ok(ctx.calls.includes('fillRect'),'the hand aura remains visible');
 assert.ok(!e.objects.includes(sliced),'hit targets still disappear after being cut');
});
