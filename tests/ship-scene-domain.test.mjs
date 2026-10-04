import test from 'node:test';
import assert from 'node:assert/strict';
import { dominantFamily,initialScene,resolveSceneSwap,sampleApproach,SHIP_ANCHOR_Y,SHIP_REST_Z,APPROACH_MS,coachBand,shipPoseAbove } from '../modules/ships/ship-scene-domain.mjs';

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
 // #145: it starts above and behind the camera (z 7), so offscreen, and lands nearer the camera than the coach (z 0).
 const start=sampleApproach(0),mid=sampleApproach(APPROACH_MS/2);
 assert.ok(start.z>7&&start.y>SHIP_ANCHOR_Y+2,'starts above and behind the viewer');
 assert.ok(mid.z<start.z&&mid.z>SHIP_REST_Z&&mid.y>SHIP_ANCHOR_Y&&!mid.done,'mid-flight it is still coming down and in');
 assert.deepEqual(sampleApproach(APPROACH_MS),{x:0,y:1.82,z:1.5,scale:1,roll:0,done:true});
 assert.equal(sampleApproach(APPROACH_MS-1).done,false,'the beam waits for done: only the full flight is done');
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
test('on a 375x812 phone the hover pose also keeps the wings inside the stage width',()=>{
 // Measured on a landscape stage, where the wings used half the width; the same hull on a portrait phone is wider in NDC.
 const measured={top:.7,bottom:.5,left:-.5,right:.5,aspect:1.6,origin:.6,unit:.47},stage={top:0,width:375,height:812};
 const pose=shipPoseAbove(coachBand(stage,{top:.36*812}),measured),half=.5*1.6/(375/812)*pose.scale;
 assert.ok(half<=.9+1e-9,`wings inside the stage (NDC half-width ${half})`);
 assert.ok(pose.scale<1);
 const wide=shipPoseAbove(coachBand({top:0,width:1600,height:1000},{top:360}),measured);
 assert.equal(wide.scale,1,'a wide stage keeps full size when the band allows it');
});

import { recipeShipTint,applyShipTint } from '../modules/ships/ship-scene-domain.mjs';
test('the saved ship wins over the personality ship, and falls back to it without one',()=>{
 assert.equal(initialScene({coach:'analytical',shipId:'mom',styles:{}}).ship,'mom');
 assert.equal(initialScene({coach:'analytical',styles:{}}).ship,'analytical');
 assert.equal(initialScene({coach:'analytical',shipId:'bogus',styles:{}}).ship,'supportive');
});
test('recipeShipTint reads only a valid hex; null means original materials',()=>{
 assert.equal(recipeShipTint({shipColor:'#12abEF'}),'#12abEF');
 assert.equal(recipeShipTint({shipColor:null}),null);assert.equal(recipeShipTint({shipColor:'red'}),null);
});
test('applyShipTint tints base colour, keeps glowing materials, and restores originals on null',()=>{
 const mk=h=>({v:h,getHex(){return this.v},set(x){this.v=typeof x==='string'?parseInt(x.slice(1),16):x}});
 const hull={color:mk(0x808080),userData:{}},lamp={color:mk(0xffffff),emissive:mk(0xffee88),emissiveIntensity:1,userData:{}};
 const root={traverse:f=>{f({material:hull});f({material:[lamp]})}};
 applyShipTint(root,'#ff0000');assert.equal(hull.color.v,0xff0000);assert.equal(lamp.color.v,0xffffff);
 applyShipTint(root,null);assert.equal(hull.color.v,0x808080);
});
