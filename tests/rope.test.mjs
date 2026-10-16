import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRope,stepRope,ROPE} from '../rope.mjs';

const run=(rope,g,opts,steps=400)=>{for(let i=0;i<steps;i++)stepRope(rope,1/60,g,opts);return rope.pts;};

test('a loose rope settles hanging toward the gravity vector',()=>{
 for(const [gx,gy] of [[0,1],[1,0],[-.7071,.7071]]){
  const rope=makeRope(100,100,90),p=run(rope,{gx,gy},{anchor:{x:100,y:100}}),e=p.at(-1),dx=e.x-100,dy=e.y-100;
  assert.ok(Math.abs(Math.hypot(dx,dy)-90)<9,'length kept');
  const cos=(dx*gx+dy*gy)/Math.hypot(dx,dy);assert.ok(cos>.98,`hangs along gravity ${gx},${gy}: ${cos}`);
 }
});

test('a plugged rope keeps both ends and sags toward gravity',()=>{
 const rope=makeRope(0,0,120),p=run(rope,{gx:0,gy:1},{anchor:{x:0,y:0},end:{x:100,y:0},length:120});
 assert.deepEqual([p[0].x,p[0].y,p.at(-1).x,p.at(-1).y],[0,0,100,0]);
 assert.ok(p[Math.floor(p.length/2)].y>20,'middle sags down');
 const len=p.slice(1).reduce((t,q,i)=>t+Math.hypot(q.x-p[i].x,q.y-p[i].y),0);assert.ok(Math.abs(len-120)<8,'length '+len);
 assert.equal(ROPE.segments,p.length);
});
