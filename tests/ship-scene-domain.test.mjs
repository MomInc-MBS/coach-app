import test from 'node:test';
import assert from 'node:assert/strict';
import { dominantFamily,initialScene,resolveSceneSwap,sampleApproach,SHIP_ANCHOR_Y,coachBand,shipPoseAbove } from '../modules/ships/ship-scene-domain.mjs';

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
test('the hover pose fits the whole hull into the band above the coach card, for any card height',()=>{
 const measured={top:.9,bottom:.3,origin:.6,unit:.47};
 for(const cardTop of [.3,.36,.5]){
  const stage={top:0,height:812},band=coachBand(stage,{top:cardTop*812}),pose=shipPoseAbove(band,measured);
  const top=measured.origin+(pose.y-SHIP_ANCHOR_Y)*measured.unit+(measured.top-measured.origin)*pose.scale;
  assert.ok(top<=band.top+1e-9&&pose.belly>=band.bottom-1e-9,`hull inside the band for card top ${cardTop}`);
  assert.ok(pose.belly>1-2*cardTop,'belly clears the card top edge (the head)');
  assert.ok(pose.scale<=1);
 }
 assert.deepEqual(shipPoseAbove(coachBand({top:0,height:812},{top:40}),measured),{y:SHIP_ANCHOR_Y,scale:1,belly:.3},'a card filling the stage keeps the base pose');
});
