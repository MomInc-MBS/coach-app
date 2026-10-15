import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlice,render} from '../arcade/slice/core.mjs';
import {XP_SCALE} from '../progression-rules.mjs';

function recordingContext(){
 const calls=[];
 return {calls,clearRect(){},save(){},restore(){},translate(){},rotate(){},beginPath(){},rect(){calls.push('rect');},clip(){calls.push('clip');},
  moveTo(){},lineTo(){},stroke(){calls.push('stroke');},fillRect(){calls.push('fillRect');},fillText(){},drawImage(){},setLineDash(){}};
}

test('camera slice visuals hide cut fragments while preserving hit, XP, combo and trail state',()=>{
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
 const hidden=recordingContext();render(hidden,e,{sliceEffects:false});
 assert.equal(hidden.calls.includes('clip'),false,'split fragments are not painted');
 assert.equal(hidden.calls.includes('stroke'),false,'the old white pointer slash is not painted');
 assert.equal(hidden.calls.includes('fillRect'),false,'cut debris and stains are not painted');

 const visible=recordingContext();
 const oldDocument=globalThis.document;
 try{globalThis.document={createElement(){return {width:16,height:16,getContext(){return {fillRect(){}};}};}};render(visible,e);}
 finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
 assert.ok(visible.calls.includes('clip'),'other render callers retain the existing cut visuals by default');
 assert.ok(visible.calls.includes('stroke'),'other render callers retain their pointer trail by default');
});

test('camera hand energy remains a separate renderer after slice effects are disabled',async()=>{
 const {createHandGlow,renderHandGlow}=await import('../arcade/slice/hand-glow.mjs');
 const points=Array.from({length:23},()=>({x:.5,y:.5,visibility:.9}));
 points[15]={x:.4,y:.5,visibility:.9};points[16]={x:.6,y:.5,visibility:.9};
 const fx=createHandGlow();fx.pose(points,{now:0,mapPoint:p=>({x:p.x*180,y:p.y*320})});
 for(let now=33;now<500;now+=33){points[15]={x:.4+now/10000,y:.5,visibility:.9};fx.pose(points,{now,mapPoint:p=>({x:p.x*180,y:p.y*320})});fx.step(.033,now);}
 const ctx=recordingContext();renderHandGlow(ctx,fx.state);
 assert.ok(fx.state.hands.get('left').trail.length>1);
 assert.ok(ctx.calls.includes('stroke'),'the glowing hand trail is still drawn');
 assert.ok(ctx.calls.includes('fillRect'),'the hand aura remains visible');
});
