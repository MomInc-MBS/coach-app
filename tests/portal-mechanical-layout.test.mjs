import test from 'node:test';
import assert from 'node:assert/strict';
import {MECHANICAL_FRAME,mechanicalPaths,releasePaths,sectionPanels,mechanicalLayout,mechanismLayout,pointOnPath,signedRailImpulse,area} from '../modules/portal/portal-mechanical-layout.mjs';
import {gearsFromLayout,applyTorque,stepTrain,KNOBS,cogs} from '../modules/portal/portal-board-cogs.mjs';
import {pointInPolygon} from '../modules/portal/portal-board-glb.mjs';

test('manufactured cells fill the wall and select the exact existing portal aperture',()=>{
 for(const face of [{w:1,h:1.75},{w:1,h:1}]){
  const paths=mechanicalPaths(),releases=releasePaths(face),panels=sectionPanels([...paths,...releases]);
  assert.ok(panels.length<200,'bounded manufacturing complexity');
  assert.ok(Math.abs(panels.reduce((sum,p)=>sum+area(p.points),0)-1)<1e-6,'no missing or overlapping wall');
  for(const panel of panels)assert.ok(pointInPolygon(...panel.center,panel.points),'membership sample lies inside its actual cell');
  for(const release of releases){
   const selected=panels.filter(p=>pointInPolygon(...p.center,release.points));
   assert.ok(selected.length>0,release.id);
   const selectedArea=selected.reduce((sum,p)=>sum+area(p.points),0);
   assert.ok(Math.abs(selectedArea-Math.abs(area(release.points)))<1e-6,`${release.id}: ${selectedArea} versus ${Math.abs(area(release.points))}`);
  }
 }
});

test('every shared shape has sparse stations, identical meshed pairs and one common drive',()=>{
 const face={w:1,h:1.75},layout=mechanicalLayout(face),gears=gearsFromLayout(layout.parts);
 assert.deepEqual([...new Set(layout.paths.map(p=>p.id))].sort(),['cross','down','hdiamond','oval','rect','up','vdiamond','x']);
 assert.ok(gears.length<=110&&gears.length>=60);
 assert.equal(gears.filter(g=>g.drives==null).length,1,'all shape trains interconnected');
 for(const train of layout.trains)for(let i=0;i<train.length;i+=2){
  const a=gears[train[i]],b=gears[train[i+1]],distance=Math.hypot((a.u-b.u)*face.w,(a.v-b.v)*face.h);
  assert.equal(a.r,b.r,'same kit gear and pitch scale within meshed pair');
  assert.ok(Math.abs(distance/(a.r+b.r)-.94)<1e-6,'tips interlock without solid-disc overlap');
 }
 applyTorque(gears,layout.trains.at(-1).at(-1),2);stepTrain(gears,1/60);
 assert.ok(gears.every(g=>Math.abs(g.omega)>0),'last gear drives all the shapes');
 for(const train of layout.trains)for(let i=0;i<train.length;i+=2)assert.ok(Math.abs(gears[train[i]].omega+gears[train[i+1]].omega)<1e-9);
});

test('signed rail drag is stable across stations, reverses and coasts under existing damping',()=>{
 const face={w:1,h:1.75},layout=mechanicalLayout(face),gears=gearsFromLayout(layout.parts),f=MECHANICAL_FRAME,train=layout.trains[0];
 let previous=0;
 for(let i=1;i<20;i++){
  const u=f.x0+(f.x1-f.x0)*i/20,hit=pointOnPath(layout.paths,face,u,f.y0);
  assert.equal(hit.pathIndex,0);
  applyTorque(gears,train[0],signedRailImpulse(hit,.01,0,face,.021,.8));
  assert.ok(gears[0].omega>=previous,'forward drag never brakes when nearest gear changes');previous=gears[0].omega;
 }
 const hit=pointOnPath(layout.paths,face,.3,f.y0),forward=signedRailImpulse(hit,.01,0,face,.021,.8),reverse=signedRailImpulse(hit,-.01,0,face,.021,.8);
 assert.equal(forward,-reverse);
 stepTrain(gears,1/60);const omega=gears[0].omega;stepTrain(gears,.5);
 assert.ok(gears[0].omega>0&&gears[0].omega<omega,'inertia continues after drag and damps');
 for(let i=0;i<1000;i++)stepTrain(gears,1/60);
 assert.ok(gears.every(g=>Math.abs(g.omega)<.02));
});

test('mechanical release uses assemblies and the weld cools in half the prior time',()=>{
 assert.equal(cogs.presectioned,true);assert.equal(typeof cogs.setBackplateTint,'function');
 assert.equal(KNOBS.weldHotMs,500);assert.equal(KNOBS.weldBeadMs,2000);
 assert.equal(KNOBS.weldTrailWidthPx,3);assert.equal(KNOBS.weldBeadRadiusPx,2.5);
});

test('mechanismLayout lays tubes, bolts, pistons, pulleys, lamps and dial exactly on the shape lines',()=>{
 const face={w:1,h:1.75},paths=mechanicalPaths(),gl=mechanicalLayout(face,paths),m=mechanismLayout(face,paths,gl);
 const closed=paths.map(p=>Math.hypot(p.points[0][0]-p.points.at(-1)[0],p.points[0][1]-p.points.at(-1)[1])<1e-7);
 const stations=gl.parts.filter(p=>p.pathIndex>=0&&p.rot===0);
 assert.ok(m.pistons.length>=6);assert.equal(m.pistons.length,paths.length);
 assert.deepEqual([m.pulleys.length,m.cables.length,m.weights.length,m.dial.length],[4,4,4,1]);
 assert.equal(m.lamps.length,stations.length);
 assert.equal(m.bolts.length,stations.filter(p=>closed[p.pathIndex]).length);
 for(const k of ['tubes','bolts','pistons','lamps'])for(const o of m[k])assert.ok(pointOnPath(paths,face,o.u,o.v).distance<1e-6,k);
 const tangent=(o,k)=>{const pts=paths[o.pathIndex].points,a=pts[o.segment??k],b=pts[(o.segment??k)+1];return Math.atan2((b[1]-a[1])*face.h,(b[0]-a[0])*face.w);};
 const parallel=(a,b)=>Math.abs(Math.sin(a-b))<1e-9;
 for(const t of m.tubes)assert.ok(parallel(t.rot,tangent(t)));
 for(const b of m.bolts){const hit=pointOnPath([paths[b.pathIndex]],face,b.u,b.v);assert.ok(parallel(b.rot,tangent(b,hit.segment)));}
 for(const p of m.pistons){const hit=pointOnPath([paths[p.pathIndex]],face,p.u,p.v);assert.ok(parallel(p.rot,tangent(p,hit.segment)));assert.ok(gl.parts[p.drives]);}
 paths.forEach((_,pi)=>{const ls=m.lamps.filter(l=>l.pathIndex===pi);for(let i=1;i<ls.length;i++)assert.ok(ls[i].station>ls[i-1].station);});
 const tubes=m.tubes;
 for(let i=0;i<tubes.length;i++)for(let j=i+1;j<tubes.length;j++){const a=tubes[i],b=tubes[j];if(a.pathIndex!==b.pathIndex||a.segment!==b.segment)continue;
  assert.ok(Math.hypot(a.u-b.u,(a.v-b.v)*face.h/face.w)>=(a.len+b.len)/2-1e-9,'tubes overlap');}
 assert.ok(m.tubes.every(t=>t.len>=.012));assert.ok(m.cables.every(c=>Math.hypot(c.to[0]-c.from[0],c.to[1]-c.from[1])>0));
});

test('review fixes: pistons spread, bolts withdraw inward, tubes split at crossings, cables in the margin',()=>{
 const face={w:1,h:1.75},paths=mechanicalPaths(),m=mechanismLayout(face),d=(a,b)=>Math.hypot(a[0]-b[0],(a[1]-b[1])*face.h/face.w);
 for(const [i,a] of m.pistons.entries()){
  for(const b of m.pistons.slice(i+1))assert.ok(d([a.u,a.v],[b.u,b.v])>=.08,'pistons apart');
  if(paths[a.pathIndex].id!=='oval')for(const p of paths[a.pathIndex].points)assert.ok(d([a.u,a.v],p)>=.06,'piston clear of vertices');
 }
 for(const b of m.bolts){
  assert.ok(b.side===1||b.side===-1);
  const c=[b.u+b.side*b.throw*Math.sin(b.rot),b.v-b.side*b.throw*Math.cos(b.rot)*face.w/face.h];
  assert.ok(pointInPolygon(...c,paths[b.pathIndex].points)||pointOnPath([paths[b.pathIndex]],face,...c).distance<1e-6,'withdrawn bolt inside its polygon (or sliding along the edge at a corner station)');
 }
 for(const t of m.tubes){
  assert.equal(t.r,.007);const a=[t.u-Math.cos(t.rot)*t.len/2,t.v-Math.sin(t.rot)*t.len/2*face.w/face.h],b=[t.u+Math.cos(t.rot)*t.len/2,t.v+Math.sin(t.rot)*t.len/2*face.w/face.h];
  paths.forEach((q,j)=>{if(j===t.pathIndex)return;for(let k=1;k<q.points.length;k++)for(const f of [.1,.5,.9]){
   const p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
   assert.ok(pointOnPath([{points:[q.points[k-1],q.points[k]]}],face,...p).distance>1e-4||t.len<.02,'tube interior crosses another path');}});
 }
 const F=MECHANICAL_FRAME,out=(u,v)=>u<F.x0||u>F.x1||v<F.y0||v>F.y1;
 for(const c of m.cables)assert.ok(out(...c.from)&&out(...c.to));
 for(const w of m.weights)assert.ok(out(w.u,w.v));
 assert.ok(m.lamps.every(l=>l.r===.018));
});
