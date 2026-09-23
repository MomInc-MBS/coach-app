import test from 'node:test';
import assert from 'node:assert/strict';
import { dominantFamily,initialScene,resolveSceneSwap,sampleApproach } from '../modules/ships/ship-scene-domain.mjs';

test('dominantFamily uses body 3x, head 2x and other parts 1x',()=>{
 assert.equal(dominantFamily({styles:{body:4,head:2,eye:2,collar:2,arms:2,feet:0}}),2);
 assert.equal(dominantFamily({styles:{body:4,head:2,eye:4,collar:4,arms:0,feet:0}}),4);
});
test('dominantFamily breaks a weighted tie in favor of the body',()=>assert.equal(dominantFamily({styles:{body:7,head:3,eye:3,collar:0,arms:0,feet:0}}),7));
test('ship, background and coach remain independently swappable',()=>{
 const coach={id:'coach-a'},current={ship:'calm',background:'frost',coach};
 assert.deepEqual(resolveSceneSwap(current,{ship:'playful'}),{ship:'playful',background:'frost',coach});
 assert.deepEqual(resolveSceneSwap(current,{background:'ember'}),{ship:'calm',background:'ember',coach});
 assert.deepEqual(resolveSceneSwap(current,{coach:null}),{ship:'calm',background:'frost',coach:null});
});
test('initial scene derives its ship and biome from the design while keeping the whole recipe',()=>{
 const design={coach:'analytical',styles:{body:15,head:3,eye:3,collar:3,arms:0,feet:0}};
 assert.deepEqual(initialScene(design),{ship:'analytical',background:'lattice',coach:design});
});
test('approach animation begins offscreen and ends at the hover anchor',()=>{
 assert.ok(sampleApproach(0).x>3&&sampleApproach(0).scale<.2);
 assert.deepEqual(sampleApproach(1600),{x:0,y:1.82,z:0,scale:1,roll:0,done:true});
});
test('Original MYR5\'s fresh recipe (creature/source/creator/design.ts fresh()) maps to the supportive starter ship',()=>{
 const original={version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},coach:'supportive',body:'myr5'};
 assert.equal(initialScene(original).ship,'supportive');
});
