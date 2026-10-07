// L3 Crystal ice secret: 10 taps → shatter
import test from 'node:test';
import assert from 'node:assert/strict';
import {iceSecret,ice} from '../modules/portal/portal-board-ice.mjs';

test('iceSecret: 10 taps at 500 ms spacing → shattered',()=>{
 let S={taps:[],lastRelease:0,shattered:false};
 for(let i=0;i<10;i++){
  S=iceSecret(S,{type:'press'},i*500);
  S=iceSecret(S,{type:'release'},i*500+100);
 }
 assert.equal(S.taps.length,10,'all 10 taps recorded');
 assert.equal(S.shattered,true,'shatter triggered on tap 10');
});

test('iceSecret: tap 1–2 do not claim; tap 3+ does',()=>{
 let S={taps:[],lastRelease:0,shattered:false};
 S=iceSecret(S,{type:'press'},0);
 S=iceSecret(S,{type:'release'},100);
 assert.equal(S.taps.length,1);

 S=iceSecret(S,{type:'press'},600);
 S=iceSecret(S,{type:'release'},700);
 assert.equal(S.taps.length,2);

 S=iceSecret(S,{type:'press'},1200);
 S=iceSecret(S,{type:'release'},1300);
 assert.equal(S.taps.length,3,'claims after tap 3');
});

test('iceSecret: >12 px move during press resets sequence',()=>{
 let S={taps:[],lastRelease:0,shattered:false};
 S=iceSecret(S,{type:'press'},0);
 S=iceSecret(S,{type:'move',dist:20},50); // 20 px move > 12 px threshold
 S=iceSecret(S,{type:'release'},100);
 assert.equal(S.taps.length,0,'drag resets sequence');
});

test('iceSecret: >600 ms gap resets sequence',()=>{
 let S={taps:[],lastRelease:0,shattered:false};
 S=iceSecret(S,{type:'press'},0);
 S=iceSecret(S,{type:'release'},100);
 assert.equal(S.taps.length,1);

 S=iceSecret(S,{type:'press'},800); // 700 ms gap > 600 ms
 S=iceSecret(S,{type:'release'},900);
 assert.equal(S.taps.length,1,'gap resets sequence, only tap 2 counts as tap 1');
});

test('iceSecret: keeps only last 10 taps',()=>{
 let S={taps:[],lastRelease:0,shattered:false};
 for(let i=0;i<12;i++){
  S=iceSecret(S,{type:'press'},i*500);
  S=iceSecret(S,{type:'release'},i*500+100);
 }
 assert.equal(S.taps.length,10,'capped at 10');
 assert.equal(S.shattered,true,'still shattered after 10th');
});

test('ice: claims() returns false for taps <3, true for ≥3',()=>{
 globalThis.Path2D=class{};globalThis.matchMedia=()=>({matches:false});
 const gc={fills:0,clears:0,outlines:0,save(){},restore(){},setTransform(){},translate(){},rotate(){},beginPath(){},moveTo(){this.outlines++;},lineTo(){},closePath(){},
  fill(){this.fills++;},stroke(){},clearRect(){this.clears++;}};
 const glow={canvas:{width:1024,height:1024},ctx:gc,texture:{}},paint={canvas:{width:1024,height:1024},ctx:{},texture:{}};
 ice.init({paint,glow,toWorld:(u,v)=>[u*1000,-v*1000]});

 assert.equal(ice.claims(1),false,'no claims before any taps');
 ice.press(1,.5,.5);ice.release(1);
 assert.equal(ice.claims(1),false,'claims false after tap 1');

 ice.press(1,.5,.5);ice.release(1);
 assert.equal(ice.claims(1),false,'claims false after tap 2');

 ice.press(1,.5,.5);ice.release(1);
 assert.equal(ice.claims(1),true,'claims true after tap 3');

 ice.dispose();delete globalThis.Path2D;delete globalThis.matchMedia;
});
