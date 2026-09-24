// W2-2N geometry and projection, no browser: #135's off-axis camera keeps the window pinned while the scene behind
// swings; #131's matched outlines (the cut <-> the whole window); #124's line lens and X diamond; #132's name path.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {eye,offAxis} from '../modules/portal/peer.mjs';
import {windowOutlines,lensPts,portalWindow,namePath,PORTAL} from '../modules/portal/portal.mjs';

test('#135 offAxis: the eye slides, the window plane stays pinned, the scene behind shifts with the eye',()=>{
 const camera=new THREE.PerspectiveCamera(40,.6,.1,50);camera.position.set(0,0,2);camera.updateMatrixWorld();
 const ndc=v=>{camera.updateMatrixWorld();return v.clone().project(camera);};
 const edge=new THREE.Vector3(.3,.2,0),far=new THREE.Vector3(0,0,-3);
 offAxis(camera,2);const edge0=ndc(edge),far0=ndc(far);
 eye.x=1;eye.y=0;
 for(let i=0;i<3;i++)offAxis(camera,2); // every frame, the camera posed once: no drift
 assert.ok(Math.abs(camera.position.x-Math.tan(12*Math.PI/180)*2)<1e-9,'the eye moved right by the tilt clamp, once');
 const edge1=ndc(edge),far1=ndc(far);
 assert.ok(edge1.distanceTo(edge0)<1e-6,'a point on the window plane stays put');
 assert.ok(far1.x>far0.x+.01,'a point behind the window slides the way the eye went');
 const inv=new THREE.Matrix4().copy(camera.projectionMatrix).invert();
 assert.ok(inv.equals(camera.projectionMatrixInverse),'raycasts use the same frustum');
 eye.x=0;offAxis(camera,2);
 assert.ok(Math.abs(camera.position.x)<1e-9&&ndc(far).distanceTo(far0)<1e-6,'back to centre, back to the plain view');
});

test('#131 the cut and the whole window as matched outlines',()=>{
 const face={left:20,top:90,width:335,height:626},tri=[[187,100],[350,500],[25,500],[187,100]];
 const {shape,rect}=windowOutlines(tri,face);
 assert.equal(shape.length,rect.length,'same points, so the clip-path can morph');
 const onSeg=([x,y],[a,b])=>{const [ax,ay]=a,[bx,by]=b,t=((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2),px=ax+t*(bx-ax),py=ay+t*(by-ay);return t>-1e-6&&t<1+1e-6&&Math.hypot(px-x,py-y)<1e-6;};
 for(const p of shape)assert.ok([0,1,2].some(i=>onSeg(p,[tri[i],tri[i+1]])),`${p} lies on the triangle`);
 for(const [x,y] of rect)assert.ok(Math.min(Math.abs(x-20),Math.abs(x-355),Math.abs(y-90),Math.abs(y-716))<1e-6,`${x},${y} lies on the window's edge`);
 for(const c of tri.slice(0,3))assert.ok(shape.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1])<1e-6),'the corners are kept');
});

test('#124 a line opens a lens from its slit, the X a diamond, on PORTAL.short of the timings',()=>{
 assert.ok(PORTAL.short>=.55&&PORTAL.short<=.6,'about 55-60% of the closed shapes\' timings');
 const lens=lensPts([0,0],[100,0],20);
 assert.deepEqual(lens[0],[0,0]);assert.ok(lens.some(([x,y])=>Math.abs(x-100)<1e-9&&Math.abs(y)<1e-9),'pointed at both ends');
 assert.ok(Math.abs(Math.max(...lens.map(p=>Math.abs(p[1])))-20)<1e-9,'widest in the middle');
 const rect={left:0,top:0,width:300,height:500};
 const line=portalWindow('line-lr',rect);assert.ok(line.axis&&line.pts.length>40,'a lens round the line, with its axis for the slit');
 const x=portalWindow('x',rect).pts;
 assert.deepEqual(x.slice(0,4),[[150,160],[240,250],[150,340],[60,250]],'the X: a diamond where its arms cross');
 assert.equal(portalWindow('up',rect).pts.length,4,'a closed shape: its stitched outline (closed)');
});

test('#132 the name rides outside the cut: under the triangle\'s base, above the inverted one\'s top, the rail for a window',()=>{
 const pattern={left:0,top:0,width:300,height:500},face={left:-10,top:-10,width:320,height:520},y=d=>+d.split(' ').at(-1);
 assert.ok(y(namePath('up',pattern,face))>.71*500,'below the base');
 assert.ok(y(namePath('down',pattern,face))<.29*500,'above the top edge');
 assert.ok(y(namePath(null,null,face))>face.top+face.height,'on the bottom rail');
});
