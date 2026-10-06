import assert from 'node:assert/strict';
import test from 'node:test';
import {mountLevelMapScene} from '../level-map-scene.mjs';

test('ship follows a press and fires repeatedly only while held',()=>{
 const old={Image:globalThis.Image,document:globalThis.document,devicePixelRatio:globalThis.devicePixelRatio,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const frames=[];let next=0,laserOrigins=0,shipX=0;
 const ctx={save(){},restore(){},translate(x){shipX=x+24;},fillRect(){},beginPath(){},moveTo(_x,y){if(this.strokeStyle==='#b9faff'&&Math.abs(y-160.32)<.1)laserOrigins++;},lineTo(){},stroke(){},arc(){},closePath(){},fill(){},setTransform(){},clearRect(){},drawImage(){}};
 try{
  globalThis.Image=class{complete=false;naturalWidth=0;set src(_){};};
  globalThis.document={hidden:false};globalThis.devicePixelRatio=1;
  globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  globalThis.cancelAnimationFrame=()=>{};
  const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:400,height:300})};
  const scene=mountLevelMapScene(canvas);
  scene.start();scene.aim(320,180);
  assert.equal(shipX,320);
  scene.startFiring();
  const base=performance.now();
  for(let index=1;index<=32;index++){const frame=frames.shift();assert.ok(frame);frame(base+index*16);}
  assert.ok(laserOrigins>=3,`expected repeated shots, saw ${laserOrigins}`);
  scene.stopFiring();const afterRelease=laserOrigins;
  for(let index=33;index<=64;index++){const frame=frames.shift();assert.ok(frame);frame(base+index*16);}
  assert.equal(laserOrigins,afterRelease);
  scene.stop();
 }finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
