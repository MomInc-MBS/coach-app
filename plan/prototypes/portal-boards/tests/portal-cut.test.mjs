import test from 'node:test';
import assert from 'node:assert/strict';
import {pointInPolygon,splitIndexByPolygon} from '../portal-board-glb.mjs';

const square=[[.25,.25],[.75,.25],[.75,.75],[.25,.75],[.25,.25]]; // closed, as portal.mjs sends it
const tri=[[.5,0],[1,.71],[0,.71]];                                 // the 'up' triangle, left open

test('pointInPolygon: inside/outside for a closed square and an open triangle',()=>{
 assert.equal(pointInPolygon(.5,.5,square),true);
 assert.equal(pointInPolygon(.1,.5,square),false);
 assert.equal(pointInPolygon(.5,.9,square),false);
 assert.equal(pointInPolygon(.5,.5,tri),true);
 assert.equal(pointInPolygon(.1,.1,tri),false); // beside the apex, outside the slanted edge
 assert.equal(pointInPolygon(.5,.8,tri),false); // below the base
});

test('pointInPolygon: concave polygon (even-odd) excludes the notch',()=>{
 const notch=[[0,0],[1,0],[1,1],[.5,.4],[0,1]]; // V-shaped bite out of the bottom
 assert.equal(pointInPolygon(.5,.2,notch),true);
 assert.equal(pointInPolygon(.5,.8,notch),false);
 assert.equal(pointInPolygon(.1,.8,notch),true);
});

test('splitIndexByPolygon: triangles go by centroid, every triangle lands in exactly one list',()=>{
 // 4x4 grid of unit cells over 0..4 in x and y (y up, like the board), two triangles per cell.
 const n=5,pos=[],index=[];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)pos.push(i,j,0);
 for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,c=a+n,d=c+1;index.push(a,b,c,b,d,c);}
 // The shader's planar uv: u right, v down from the top edge (y=4).
 const toUv=(x,y)=>[x/4,1-y/4];
 const {keep,cut}=splitIndexByPolygon(new Float32Array(pos),new Uint16Array(index),toUv,square);
 assert.equal(keep.length+cut.length,index.length);
 assert.equal(cut.length,8*3,'the 2x2 middle cells (8 triangles) are cut');
 for(let t=0;t<cut.length;t+=3){
  const cx=(pos[3*cut[t]]+pos[3*cut[t+1]]+pos[3*cut[t+2]])/3,cy=(pos[3*cut[t]+1]+pos[3*cut[t+1]+1]+pos[3*cut[t+2]+1])/3;
  assert.ok(cx>1&&cx<3&&cy>1&&cy<3,`cut centroid ${cx},${cy} is in the middle`);
 }
 // v is flipped: a polygon in the top quarter of the face (small v) cuts the high-y cells.
 const top=splitIndexByPolygon(pos,index,toUv,[[0,0],[1,0],[1,.25],[0,.25]]).cut;
 assert.equal(top.length,4*2*3);
 for(const k of top)assert.ok(pos[3*k+1]>=3);
});

test('splitIndexByPolygon: a polygon off the face cuts nothing',()=>{
 const pos=[0,0,0,1,0,0,0,1,0],index=[0,1,2];
 const r=splitIndexByPolygon(pos,index,(x,y)=>[x,1-y],[[2,2],[3,2],[3,3]]);
 assert.deepEqual(r,{keep:[0,1,2],cut:[]});
});
