import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlice,render} from '../arcade/slice/core.mjs';
import {createHandGlow,renderHandGlow} from '../arcade/slice/hand-glow.mjs';
import {XP_SCALE} from '../progression-rules.mjs';

function recordingContext(){
 const calls=[];
 return {calls,clearRect(){calls.push('clear');},save(){},restore(){},translate(){},rotate(){},beginPath(){},rect(){calls.push('rect');},clip(){calls.push('clip');},
  moveTo(){},lineTo(){},stroke(){calls.push('stroke');},fillRect(){calls.push('fillRect');},fillText(){calls.push('text');},drawImage(){calls.push('image');},setLineDash(){}};
}

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
 try{globalThis.document={createElement(){return {width:16,height:16,getContext(){return {fillRect(){}};}};}};render(camera,e,{pointerTrail:false});}
 finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
 assert.ok(camera.calls.includes('clip'),'camera mode retains the split pieces');
 assert.ok(camera.calls.includes('fillRect'),'camera mode retains debris and stains');
 assert.equal(camera.calls.includes('stroke'),false,'camera mode omits only the old white pointer slash');
 const standalone=recordingContext();render(standalone,e);assert.ok(standalone.calls.includes('stroke'),'standalone mode retains its pointer slash');
});

test('camera mode keeps targets and break-apart art, hides only the old white slash, then paints hand glow',()=>{
 const points=Array.from({length:23},()=>({x:.5,y:.5,visibility:.9}));
 points[15]={x:.4,y:.5,visibility:.9};points[16]={x:.6,y:.5,visibility:.9};
 const fx=createHandGlow();fx.pose(points,{now:0,mapPoint:p=>({x:p.x*180,y:p.y*320})});
 for(let now=33;now<500;now+=33){points[15]={x:.4+now/10000,y:.5,visibility:.9};fx.pose(points,{now,mapPoint:p=>({x:p.x*180,y:p.y*320})});fx.step(.033,now);}
 const e=createSlice({auto:false,mode:'martial',seed:2});
 const sliced=e.spawn({x:40,y:80,vx:0,vy:0,r:12});e.hitSegment({x:30,y:80},{x:50,y:80});
 e.spawn({x:100,y:60,vx:0,vy:0,r:12});e.trail.push({x:10,y:10,life:.2},{x:20,y:20,life:.2});
 const ctx=recordingContext(),oldDocument=globalThis.document;
 try{globalThis.document={createElement(){return {width:16,height:16,getContext(){return {fillRect(){}};}};}};render(ctx,e,{pointerTrail:false});}
 finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
 assert.equal(e.halves.length,2);assert.ok(ctx.calls.includes('clip'),'split pieces remain visible');
 assert.ok(ctx.calls.includes('image'),'the unsliced target remains visible');
 assert.equal(ctx.calls.includes('stroke'),false,'only the old white pointer slash is hidden');
 renderHandGlow(ctx,fx.state);
 assert.ok(fx.state.hands.get('left').trail.length>1);
 assert.ok(ctx.calls.includes('stroke'),'the glowing hand trail is still drawn');
 assert.ok(ctx.calls.includes('fillRect'),'the hand aura remains visible');
 assert.ok(!e.objects.includes(sliced),'hit targets still disappear after being cut');
});
