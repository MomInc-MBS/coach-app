import test from 'node:test';
import assert from 'node:assert/strict';
import {jelly,segmentCentre} from '../portal-board-jelly.mjs';

globalThis.matchMedia??=()=>({matches:false});
class V4{set(x,y,z,w){Object.assign(this,{x,y,z,w});return this;}}
const THREE={Vector4:V4,Vector2:class{constructor(x,y){Object.assign(this,{x,y});}},Box3:class{max={z:1};union(){return this;}},DirectionalLight:class{position={set(){}};}};
const glow={canvas:{width:100,height:170},ctx:{clearRect(){},fillRect(){},createRadialGradient:()=>({addColorStop(){}})},texture:{}};

test('vertexDisplace has no malformed float literals (e.g. "1.7.0")',()=>{
 assert.doesNotMatch(jelly.vertexDisplace+jelly.uniformDecls,/\d\.\d+\.\d/);
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
