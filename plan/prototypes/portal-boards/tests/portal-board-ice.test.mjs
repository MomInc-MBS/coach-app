import test from 'node:test';
import assert from 'node:assert/strict';
import {crackT,crackAlpha,BIG,SMALL,ice} from '../portal-board-ice.mjs';

test('small crack: grow 220 ms, hold 350 ms, shrink and fade over 600 ms, then dead',()=>{
 assert.equal(crackT(0),0);assert.equal(crackT(110),.5);assert.equal(crackAlpha(110),1); // grow
 assert.equal(crackT(220),1);assert.equal(crackT(569),1);assert.equal(crackAlpha(569),1); // hold
 assert.equal(crackT(870),.5);assert.equal(crackAlpha(870),.5); // shrink + fade together
 assert.equal(crackAlpha(1170),0);assert.equal(crackT(1170),0);assert.equal(crackAlpha(5000),0); // dead
});

test('big crack: grow 300 ms, hold 600 ms, shrink 400 ms, gone by 1.3 s',()=>{
 assert.equal(crackT(150,false,BIG),.5);assert.equal(crackT(899,false,BIG),1);
 assert.equal(crackT(1100,false,BIG),.5);assert.equal(crackAlpha(1100,false,BIG),.5);
 assert.equal(crackAlpha(1300,false,BIG),0);
});

test('reduced motion: fully grown, gone after the hold',()=>{
 assert.equal(crackT(0,true),1);assert.equal(crackT(569,true),1);assert.equal(crackAlpha(569,true),1);
 assert.equal(crackAlpha(570,true),0);assert.equal(crackT(570,true),0);
 assert.equal(crackT(0,true,BIG),1);assert.equal(crackAlpha(900,true,BIG),0);
});

test('ice: glow only, capped at 40 live cracks keeping the big one, wiped once when the last one dies',()=>{
 globalThis.Path2D=class{};globalThis.matchMedia=()=>({matches:false});
 const gc={fills:0,clears:0,save(){},restore(){},setTransform(){},translate(){},rotate(){},fill(){this.fills++;},clearRect(){this.clears++;}};
 const glow={canvas:{width:1024,height:1024},ctx:gc,texture:{}},paint={canvas:{width:1024,height:1024},ctx:{},texture:{}};
 ice.init({paint,glow,toWorld:(u,v)=>[u*1000,-v*1000]}); // a 1000 px wide face on screen
 ice.press(1,.2,.5);ice.move(1,.6,.5); // big + 400 screen px / 7 -> 57 small, capped to 40
 const t=performance.now();
 assert.equal(ice.step(1/60,t+100),true);
 assert.equal(gc.clears,1);assert.equal(gc.fills,40);assert.equal(paint.texture.needsUpdate,undefined);
 gc.fills=0;ice.step(1/60,t+1200); // smalls dead (1.17 s), big still shrinking
 assert.equal(gc.fills,1);
 assert.equal(ice.step(1/60,t+1400),false);assert.equal(gc.clears,3);
 glow.texture.needsUpdate=false;
 assert.equal(ice.step(1/60,t+1500),false);assert.equal(gc.clears,3);assert.equal(glow.texture.needsUpdate,false);
 assert.equal(SMALL.grow+SMALL.hold+SMALL.shrink<=1300&&BIG.grow+BIG.hold+BIG.shrink<=1300,true);
 ice.dispose();delete globalThis.Path2D;delete globalThis.matchMedia;
});
