import test from 'node:test';
import assert from 'node:assert/strict';
import {popScale,springActive,plantStep,fadeLife,flowerHSL,bladeHSL,clusterOffsets,rootsInside,FLOWER_HSL} from '../portal-board-grass.mjs';

// Deterministic PRNG so the colour/offset tests are repeatable.
const seq=(...xs)=>{let i=0;return ()=>xs[i++%xs.length];};
const lcg=(s=1)=>()=>(s=(s*1664525+1013904223)>>>0)/2**32;

test('popScale eases 0->1 over the duration and clamps outside it',()=>{
 assert.equal(popScale(0,300),0);
 assert.equal(popScale(300,300),1);
 assert.equal(popScale(600,300),1); // past the end, clamped
 assert.equal(popScale(-50,300),0); // before the start, clamped
 assert.ok(Math.abs(popScale(150,300)-.75)<1e-9); // ease-out: 1-(1-.5)^2
});

test('fadeLife holds 1 for the live time, eases in to 0, then stays 0',()=>{
 assert.equal(fadeLife(0,7000,700),1);
 assert.equal(fadeLife(7000,7000,700),1);
 assert.ok(Math.abs(fadeLife(7350,7000,700)-.75)<1e-9); // ease-in: 1-.5^2
 assert.equal(fadeLife(7700,7000,700),0);
 assert.equal(fadeLife(9000,7000,700),0);
 assert.equal(fadeLife(6999),1); // default: 7 s live
 assert.equal(fadeLife(7700),0); // default: gone by 7.7 s
});

test('springActive is true only within [0,maxS)',()=>{
 assert.equal(springActive(-.1),false);
 assert.equal(springActive(0),true);
 assert.equal(springActive(1.19),true);
 assert.equal(springActive(1.2),false);
});

test('plantStep fires once the drag has covered the step distance',()=>{
 assert.equal(plantStep(0,0,10,0,48),false);
 assert.equal(plantStep(0,0,48,0,48),true);
 assert.equal(plantStep(0,0,30,40,48),true); // 3-4-5 triangle scaled: hypot=50
 assert.equal(plantStep(0,0,35,0),false); // default step 36 px
 assert.equal(plantStep(0,0,36,0),true);
});

test('flowerHSL picks one of the 8 flower colours with small s/l jitter, all in range',()=>{
 assert.equal(FLOWER_HSL.length,8);
 assert.deepEqual(flowerHSL(seq(0,.5,.5,.5)),FLOWER_HSL[0]); // mid jitter = exact palette entry
 assert.deepEqual(flowerHSL(seq(.999,.5,.5,.5)),FLOWER_HSL[7]);
 const rand=lcg(7),hues=new Set();
 for(let i=0;i<400;i++){
  const [h,s,l]=flowerHSL(rand),base=FLOWER_HSL.find(p=>Math.abs(p[0]-h)<1e-9&&Math.abs(p[2]-l)<=.06+1e-9);
  assert.ok(base,'hue and lightness come from one palette entry');hues.add(base[0]);
  assert.ok(s>=0&&s<=1&&l>=0&&l<=1);
 }
 assert.ok(hues.size>=7); // variety across 400 draws (white and red share hue 0)
});

test('bladeHSL stays green, with occasional yellow-green',()=>{
 const rand=lcg(3);let yellow=0;
 for(let i=0;i<2000;i++){const [h,s,l]=bladeHSL(rand);assert.ok(h>=.18&&h<=.44&&s>=0&&s<=1&&l>=0&&l<=1);if(h<.25)yellow++;}
 assert.ok(yellow>40&&yellow<400,`yellow-green share ${yellow}/2000`);
});

test('clusterOffsets returns n points inside the radius',()=>{
 const pts=clusterOffsets(3,.04,lcg(11));
 assert.equal(pts.length,3);
 for(const [x,y] of pts)assert.ok(Math.hypot(x,y)<=.04+1e-12);
 assert.deepEqual(clusterOffsets(1,.04,seq(0,1)),[[.04,0]]); // angle 0, full radius
});

test('rootsInside returns the indices of roots inside the polygon (v down, open or closed ring)',()=>{
 const roots=new Float32Array([.5,.5, .1,.1, .9,.5, .45,.7]); // at v=.7 the triangle spans u .41-.59
 const tri=[[.2,.2],[.8,.2],[.5,.9]]; // triangle pointing down the face
 assert.deepEqual(rootsInside(roots,tri),[0,3]);
 assert.deepEqual(rootsInside(roots,[...tri,tri[0]]),[0,3]); // repeated closing point
 assert.deepEqual(rootsInside(roots,[[0,0],[1,0],[1,1],[0,1]]),[0,1,2,3]);
 assert.deepEqual(rootsInside(new Float32Array(0),tri),[]);
});
