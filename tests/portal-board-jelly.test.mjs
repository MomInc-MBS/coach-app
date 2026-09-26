import test from 'node:test';
import assert from 'node:assert/strict';
import {jelly,segmentCentre,gashWidth,trailPush,trailExpire,trailPack,trailBounds,TRAIL} from '../modules/portal/portal-board-jelly.mjs';

globalThis.matchMedia??=()=>({matches:false});
class V4{set(x,y,z,w){Object.assign(this,{x,y,z,w});return this;}}
const THREE={Vector4:V4,Vector2:class{constructor(x,y){Object.assign(this,{x,y});}},Box3:class{max={z:1};union(){return this;}},DirectionalLight:class{position={set(){}};}};
const glow={canvas:{width:100,height:170},ctx:{clearRect(){},fillRect(){},createRadialGradient:()=>({addColorStop(){}})},texture:{}};

test('shader strings have no malformed float literals (e.g. "1.7.0")',()=>{
 assert.doesNotMatch(jelly.vertexDisplace+jelly.uniformDecls+jelly.fragment,/\d\.\d+\.\d/);
});

test('segmentCentre maps a point to its bone cell centre, incl. negative coords',()=>{
 assert.deepEqual(segmentCentre(.25,.05,.1),[.25,.05]);
 assert.deepEqual(segmentCentre(0,0,2),[1,1]);
 assert.deepEqual(segmentCentre(-.5,-3.9,2),[-1,-3]);
 const [a,b]=[segmentCentre(4.1,6.2,2),segmentCentre(5.9,7.99,2)];
 assert.deepEqual(a,b,'two points in one cell share a centre (rigid segment)');
 assert.notDeepEqual(segmentCentre(6.01,6.2,2),a,'next cell over differs');
 assert.deepEqual(segmentCentre(1.5,1.5,2,1,1),[2,2],'grid origin shifts the cells');
});

// jelly.glb face (model units) and its straight rods, measured from the mesh's height map.
test('bone grid keeps the straight rods mid-cell (no rod split lengthwise)',async()=>{
 const uniforms=Object.fromEntries(Object.entries(jelly.uniforms).map(([k,v])=>[k,{...v}]));
 await jelly.init({THREE,scene:{add(){}},mesh:{isMesh:true,geometry:{computeBoundingBox(){},boundingBox:{}}},material:{},uniforms,paint:{},glow,face:{w:.5777,h:.9806},toWorld:(u,v)=>[u,v]});
 const seg=uniforms.uSeg.value,{x:ox,y:oy}=uniforms.uGridO.value,c=(x,y)=>segmentCentre(x,y,seg,ox,oy);
 for(const x of [-.252,.003,.253])assert.equal(c(x-.004,0)[0],c(x+.004,0)[0],`vertical rod at x=${x}`);
 for(const y of [.2163,.0548,-.1076])assert.equal(c(0,y-.004)[1],c(0,y+.004)[1],`horizontal rod at y=${y}`);
 jelly.dispose();
});

test('press on a sleeping board stamps the live clock, not the stale uTime',async()=>{
 const uniforms={uTime:{value:0},...Object.fromEntries(Object.entries(jelly.uniforms).map(([k,v])=>[k,{...v}]))};
 await jelly.init({THREE,scene:{add(){}},mesh:{isMesh:true,geometry:{computeBoundingBox(){},boundingBox:{}}},material:{},uniforms,paint:{},glow,face:{w:1,h:1.7},toWorld:(u,v)=>[u*300,-v*510]});
 uniforms.uTime.value=1;jelly.step(1/60,performance.now()-5000); // last rendered frame: 5 s ago at uTime 1
 jelly.press(1,.5,.5);
 const r=uniforms.uRipple.value[0];
 assert.ok(Math.abs(r.z-6)<.1,`ripple born at ${r.z}, expected ~6`);
 assert.ok(r.w>.06&&r.w<.07);
 jelly.dispose();
});

test('gashWidth: full at the finger, tapers to zero by close, never negative',()=>{
 assert.equal(gashWidth(0),TRAIL.width);
 assert.equal(gashWidth(-1),TRAIL.width,'clock skew counts as fresh');
 assert.equal(gashWidth(TRAIL.close),0);
 assert.equal(gashWidth(TRAIL.life),0);
 let prev=Infinity;for(let a=0;a<=TRAIL.close;a+=TRAIL.close/10){const w=gashWidth(a);assert.ok(w<=prev&&w>=0,`monotone at ${a}`);prev=w;}
 assert.ok(TRAIL.life<7,'Ian: everything a touch leaves is gone within 7 s');
});

// R7: a 160-point uTrail array (206 fragment uniform vectors, a 160-pass dynamically indexed loop) killed WebGL on
// Android. Ian 26 Sept: "lets make the trail shorter for the jelly".
test('TRAIL: a short gash that follows the finger, on a phone-sized fragment-only uniform array',()=>{
 assert.ok(TRAIL.cap<=32,'the GLSL uTrail array and its loop stay phone-sized');
 assert.ok(jelly.fragmentDecls.includes(`uniform vec4 uTrail[${TRAIL.cap}];`),'the array is TRAIL.cap long');
 assert.ok(jelly.fragment.includes(`i<${TRAIL.cap};`),'the loop is bounded by TRAIL.cap');
 assert.doesNotMatch(jelly.uniformDecls+jelly.vertexDecls,/uTrail/,'the trail never reaches the vertex shader');
 assert.ok(TRAIL.cap*TRAIL.step<=1,'only the recent part of a stroke is kept (under a board width)');
 assert.ok(TRAIL.close<=TRAIL.cap*TRAIL.step,'at a normal drag (a face width a second) the open slit fits in the points kept: its tail closes, never pops');
 assert.equal(TRAIL.life,+(TRAIL.close+1.5).toFixed(2),'life gives the seam/bulge room to finish after the slit closes');
 assert.ok(TRAIL.life<7,'Ian: everything a touch leaves is gone within 7 s');
});

test('trailBounds: axis-aligned box around the trail, padded by the widest the gash gets; null when empty',()=>{
 assert.equal(trailBounds([]),null);
 const pts=[{u:.2,v:.5},{u:.6,v:.3},{u:.4,v:.7}];
 const margin=TRAIL.width/2+.01;
 assert.deepEqual(trailBounds(pts),[.2-margin,.3-margin,.6+margin,.7+margin]);
 assert.deepEqual(trailBounds(pts,.05,.1),[.2-.05,.3-.1,.6+.05,.7+.1],'separate u/v margins (v scaled for a non-square face)');
});

test('trail: cap evicts the oldest, expire drops points older than life',()=>{
 const pts=[];for(let i=0;i<5;i++)trailPush(pts,{u:i,v:0,t:i,prev:pts.at(-1)??null},3);
 assert.deepEqual(pts.map(p=>p.u),[2,3,4]);
 trailExpire(pts,4.5,2); // ages 2.5, 1.5, .5
 assert.deepEqual(pts.map(p=>p.u),[3,4]);
 trailExpire(pts,99,2);assert.equal(pts.length,0);
});

test('trailPack: back-offsets join each stroke, across interleaving and eviction',()=>{
 const out=Array.from({length:8},()=>new V4()),a0={u:0,v:0,t:0,prev:null},b0={u:1,v:1,t:.1,prev:null},a1={u:0,v:.1,t:.2,prev:a0},b1={u:1,v:.9,t:.3,prev:b0},a2={u:0,v:.2,t:.4,prev:a1};
 assert.equal(trailPack([a0,b0,a1,b1,a2],out),5);
 assert.deepEqual(out.slice(0,5).map(o=>o.w),[0,0,2,2,2],'two fingers interleaved');
 assert.deepEqual([out[2].x,out[2].y,out[2].z],[0,.1,.2]);
 trailPack([a1,b1,a2],out); // a0,b0 evicted
 assert.deepEqual(out.slice(0,3).map(o=>o.w),[0,0,2],'predecessor gone: segment start');
});

test('drag lays a spaced trail that keeps the board awake, then heals to nothing',async()=>{
 const uniforms={uTime:{value:0},...Object.fromEntries(Object.entries(jelly.uniforms).map(([k,v])=>[k,{...v}]))};
 await jelly.init({THREE,scene:{add(){}},mesh:{isMesh:true,geometry:{computeBoundingBox(){},boundingBox:{}}},material:{},uniforms,paint:{},glow,face:{w:1,h:1},toWorld:(u,v)=>[u*300,-v*300]});
 const t0=performance.now();uniforms.uTime.value=1;jelly.step(1/60,t0);
 jelly.press(1,.5,.5);
 for(let i=1;i<=10;i++)jelly.move(1,.5+i*.006,.5,.5+(i-1)*.006,.5); // .06 face widths in .006 steps: a point every 5th move (step .025)
 jelly.release(1,.56,.5);
 assert.ok(jelly.step(1/60,t0),'awake while the trail lives');
 assert.equal(TRAIL.step,.025);assert.equal(uniforms.uTrailN.value,3,'press + one point per TRAIL.step, release adds none on the spot');
 assert.ok(uniforms.uTrail.value.slice(1,uniforms.uTrailN.value).every(p=>p.w===1),'one joined stroke');
 const margin=TRAIL.width/2+.01,b=uniforms.uTrailBounds.value;
 assert.ok(Math.abs(b.x-(.5-margin))<1e-9&&Math.abs(b.z-(.56+margin))<1e-9,'trail bbox spans the drag (square face: no aspect scaling)');
 uniforms.uTime.value=1+TRAIL.life+.5;
 assert.equal(jelly.step(1/60,t0+(TRAIL.life+.5)*1000),false,'healed and asleep');
 assert.equal(uniforms.uTrailN.value,0);
 assert.deepEqual([b.x,b.y,b.z,b.w],[0,0,0,0],'bbox collapses once the trail is gone');
 jelly.dispose();
});
