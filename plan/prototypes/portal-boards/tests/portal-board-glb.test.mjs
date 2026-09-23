import test from 'node:test';
import assert from 'node:assert/strict';
import {orientMatrix,faceUV} from '../portal-board-glb.mjs';

// Applies a row-major 3x3 (array of 3 rows) to a vector.
const apply=(R,v)=>R.map(row=>row[0]*v[0]+row[1]*v[1]+row[2]*v[2]);
const AXIS={x:[1,0,0],y:[0,1,0],z:[0,0,1]};

test('orientMatrix sends the thinnest bbox axis to Z and the longer remaining axis to Y',()=>{
 for(const size of [{x:.1,y:.98,z:.58},{x:.58,y:.98,z:.32},{x:.9,y:.05,z:.4},{x:.2,y:.3,z:.05}]){
  const axes=['x','y','z'],thin=axes.reduce((a,b)=>size[a]<=size[b]?a:b);
  const others=axes.filter(a=>a!==thin),long=size[others[0]]>=size[others[1]]?others[0]:others[1];
  const R=orientMatrix(size);
  const z=apply(R,AXIS[thin]),y=apply(R,AXIS[long]);
  assert.ok(Math.abs(z[0])<1e-9&&Math.abs(z[1])<1e-9&&Math.abs(z[2]-1)<1e-9,`thin axis ${thin} -> Z for ${JSON.stringify(size)}`);
  assert.ok(Math.abs(y[0])<1e-9&&Math.abs(y[1]-1)<1e-9&&Math.abs(y[2])<1e-9,`long axis ${long} -> Y for ${JSON.stringify(size)}`);
 }
});

test('orientMatrix is a proper rotation (right-handed, no mirroring)',()=>{
 const R=orientMatrix({x:.1,y:.98,z:.58});
 const det=R[0][0]*(R[1][1]*R[2][2]-R[1][2]*R[2][1])-R[0][1]*(R[1][0]*R[2][2]-R[1][2]*R[2][0])+R[0][2]*(R[1][0]*R[2][1]-R[1][1]*R[2][0]);
 assert.ok(Math.abs(det-1)<1e-9,`det ${det} should be 1`);
});

test('faceUV maps the rect corners to (0,0)/(1,1) with v down',()=>{
 const rect={left:100,top:50,width:200,height:400};
 assert.deepEqual(faceUV(rect,100,50),[0,0]);
 assert.deepEqual(faceUV(rect,300,450),[1,1]);
 assert.deepEqual(faceUV(rect,200,250),[.5,.5]);
});
