import test from 'node:test';
import assert from 'node:assert/strict';
import {MECHANICAL_FRAME,mechanicalPaths,releasePaths,sectionPanels,mechanicalLayout,pointOnPath,signedRailImpulse,area} from '../modules/portal/portal-mechanical-layout.mjs';
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
