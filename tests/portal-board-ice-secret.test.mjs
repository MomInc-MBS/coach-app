// L3 Crystal/ice secret: 10 taps in a row -> shatter; heal() restores the crystal.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {iceSecret,iceClaims,newSecret,iceEffect} from '../modules/portal/portal-board-ice.mjs';

const tap=(S,t0,hold=100,dist=0)=>{S=iceSecret(S,{type:'press'},t0);if(dist)S=iceSecret(S,{type:'move',dist},t0+10);return iceSecret(S,{type:'release'},t0+hold);};
const run=(n,gap=500)=>{let S=newSecret();for(let i=0;i<n;i++)S=tap(S,i*gap);return S;};

test('10 taps at 500 ms spacing -> shattered; 9 are not',()=>{
 assert.equal(run(10).shattered,true);
 assert.equal(run(9).shattered,false);
});
test('a 700 ms gap or a 15 px drag resets the chain',()=>{
 let S=run(5);S=tap(S,5*500+700-500);assert.equal(S.taps.length,1,'gap');
 S=run(5);S=tap(S,3000,100,15);assert.equal(S.taps.length,0,'drag');
 S=run(5);S=iceSecret(S,{type:'press'},2500);S=iceSecret(S,{type:'release'},3300);assert.equal(S.taps.length,0,'held 800 ms is not a tap');
 S=run(9);S=tap(S,4500+700);assert.equal(S.shattered,false);
});
test('slow drag of small steps adds up to a drag',()=>{
 let S=iceSecret(newSecret(),{type:'press'},0);for(let i=0;i<5;i++)S=iceSecret(S,{type:'move',dist:4},10*i);
 S=iceSecret(S,{type:'release'},60);assert.equal(S.taps.length,0);
});
test('claims: false for taps 1-2, true from tap 3 (asked on the release, before the tap is counted)',()=>{
 let S=newSecret();const c=[];
 for(let i=0;i<4;i++){S=iceSecret(S,{type:'press'},i*400);S=iceSecret(S,{type:'move',dist:1},i*400+10);c.push(iceClaims(S));S=iceSecret(S,{type:'release'},i*400+90);}
 assert.deepEqual(c,[false,false,true,true]);
 assert.equal(iceClaims(run(10)),true,'claims while shattered');
});

test('effect: tap leaves a crack that persists; 10th tap shatters into 30-60 3D shards, dispatches the secret after, heal() restores',()=>{
 globalThis.Path2D=class{};globalThis.matchMedia=()=>({matches:false});
 const events=[];globalThis.window={dispatchEvent:e=>events.push(e.detail.board)};globalThis.CustomEvent=class{constructor(t,o){this.detail=o.detail;}};
 const gc=new Proxy({},{get:(_,k)=>k==='canvas'?{width:1024,height:1024}:()=>{},set:()=>true});
 const mat=new THREE.MeshStandardMaterial(),g=new THREE.PlaneGeometry(100,160),m=new THREE.Mesh(g,mat),grp=new THREE.Group();grp.add(m);
 const e=iceEffect();
 e.init({THREE,mesh:m,face:{w:100,h:160},paint:{canvas:{width:1024,height:1024}},glow:{canvas:{width:1024,height:1024},ctx:gc,texture:{}},toWorld:(u,v)=>[u*375,-v*600]});
 let now=performance.now();const orig=performance.now;performance.now=()=>now;
 try{
  for(let i=0;i<9;i++){e.press(1,.5,.5);e.release(1);now+=300;e.step(.016,now);}
  assert.equal(m.visible,true);assert.equal(events.length,0);
  e.press(1,.5,.5);e.release(1);
  assert.equal(m.visible,false,'crystal face hidden');
  const shards=grp.children.filter(o=>o!==m&&o.geometry?.attributes.uv&&o.material.transparent&&o.geometry.type==='BufferGeometry');
  assert.ok(shards.length>=30&&shards.length<=60,'shards '+shards.length);
  for(let i=0;i<30;i++){now+=100;e.step(.016,now);}
  assert.deepEqual(events,['ice'],'secret fires once, after the burst');
  e.healSecret();
  assert.equal(m.visible,true);assert.equal(grp.children.length,1,'shards, flash, dust, backplate removed');
  assert.equal(e.claims(1),false);
  e.press(1,.5,.5);e.release(1);assert.equal(e.tapState().taps.length,1,'chain restarted');
 }finally{performance.now=orig;delete globalThis.window;delete globalThis.CustomEvent;delete globalThis.Path2D;delete globalThis.matchMedia;}
});
