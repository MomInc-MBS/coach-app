import test from 'node:test';
import assert from 'node:assert/strict';
import {quiltSurfaceLayout,quiltSourceToSurface,clientToBoardLocal} from '../modules/portal/portal-board.mjs';

test('quilt surface fills a 375 by 812 phone while keeping the stitched pattern proportional',()=>{
 const {face,pattern}=quiltSurfaceLayout(375,812);
 assert.deepEqual(face,{left:0,top:0,width:375,height:812});
 assert.equal(pattern.left,0);
 assert.equal(pattern.width,375);
 assert.ok(Math.abs(pattern.width/pattern.height-(980/1553))<1e-12);
 assert.ok(Math.abs(pattern.top-(812-pattern.height)/2)<1e-12);
 assert.ok(pattern.top>100&&pattern.top+pattern.height<710,'the pattern is centered instead of stretching to phone height');
});

test('press coordinates invert a scaled host client rect',()=>{
 const local=clientToBoardLocal(260,360,{left:100,top:200,width:187.5,height:406},375,812);
 assert.deepEqual(local,[320,320]);
 assert.deepEqual(clientToBoardLocal(260,360,{left:100,top:200,width:0,height:0},375,812),[0,0]);
});

test('source pattern anchors land on the current boundary after rotation',()=>{
 for(const [w,h] of [[375,812],[812,375]]){
  const {pattern}=quiltSurfaceLayout(w,h);
  const [left,top]=quiltSourceToSurface(22/1024,22/1666,w,h);
  const [right,bottom]=quiltSourceToSurface(1002/1024,1575/1666,w,h);
  assert.deepEqual([left,top],[pattern.left,pattern.top]);
  assert.deepEqual([right,bottom],[pattern.left+pattern.width,pattern.top+pattern.height]);
 }
});
