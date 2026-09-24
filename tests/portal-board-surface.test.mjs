import test from 'node:test';
import assert from 'node:assert/strict';
import {quiltSurfaceLayout,quiltSourceToSurface,clientToBoardLocal} from '../modules/portal/portal-board.mjs';

test('quilt image retains source aspect with unused height reserved for metal',()=>{
 const {face,pattern}=quiltSurfaceLayout(375,812);
 assert.equal(face.width,375);assert.equal(face.top+face.height,812);
 assert.ok(Math.abs(face.width/face.height-1024/1666)<1e-12);
 assert.ok(face.top>190);assert.ok(pattern.left>face.left);
 assert.ok(Math.abs(pattern.width/pattern.height-980/1553)<1e-12);
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
  assert.ok(Math.abs(right-pattern.left-pattern.width)<1e-9&&Math.abs(bottom-pattern.top-pattern.height)<1e-9);
 }
});
