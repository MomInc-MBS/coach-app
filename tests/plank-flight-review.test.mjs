import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,commandFlight,advanceFlight,FLIGHT_TUNING} from '../arcade/plank-flight/sim.mjs';

const input={height01:.5,steer:0,valid:true};
function empty(){const run=createFlight({seed:1,runId:'review'});commandFlight(run,'start');run.objects=[];run.nextPatternAt=10000;run.events=[];return run;}
const hazard=(id='bar',z=.03)=>({id,type:'zapper',active:true,z,x:0,y:.5,w:.2,h:.2});
const shield=(z=.03)=>({id:'shield',type:'powerup',kind:'aegis-pulse',active:true,z,x:0,y:.5,radius:.2});
const tick=run=>advanceFlight(run,1/60,input);

test('equal-time shield pickup precedes damage independently of object array order',()=>{
 for(const reverse of [false,true]){
  const run=empty();run.objects=reverse?[shield(),hazard()]:[hazard(),shield()];tick(run);
  assert.equal(run.phase,'flying');assert.equal(run.shield,0);
  assert.deepEqual(run.events.filter(e=>['powerup','hit','crash'].includes(e.type)).map(e=>e.type),['powerup','hit']);
 }
});

test('actual earlier collision is not overridden by a later protection pickup',()=>{
 const run=empty();run.objects=[shield(.53),hazard('early',.48)];tick(run);
 assert.equal(run.phase,'crashed');assert.equal(run.objects.find(o=>o.id==='shield').collected,undefined);
});

test('protection pickup before a later collision is processed first regardless of array order',()=>{
 const run=empty();run.objects=[hazard('late',.53),shield(.48)];tick(run);
 assert.equal(run.phase,'flying');assert.equal(run.events.filter(e=>e.type==='hit').length,1);
});

test('cash-dash ending during an overlapping collision cannot produce an expiry death',()=>{
 const run=empty();run.powerup={family:'cash-dash',until:.01,effect:{magnetRadius:.8}};
 run.objects=[hazard(),hazard('near-exit',5)];tick(run);
 assert.equal(run.phase,'flying');assert.equal(run.powerup,null);
 assert.equal(run.events.some(e=>e.type==='crash'),false);
 assert.ok(run.objects.every(o=>!o.active));assert.ok(run.graceUntil>run.time);
});

test('vehicle expiry preserves protection for an already-overlapping contact',()=>{
 const run=empty();run.vehicle='comet-hopper';run.vehicleUntil=.01;run.vehicleHealth=1;
 run.objects=[hazard()];tick(run);
 assert.equal(run.phase,'flying');assert.equal(run.vehicle,null);
 assert.equal(run.events.filter(e=>e.type==='hit').length,1);assert.equal(run.events.some(e=>e.type==='crash'),false);
});

test('protection expired before this tick still clears its exit horizon before collision',()=>{
 const run=empty();run.time=1;run.powerup={family:'cash-dash',until:.5,effect:{magnetRadius:.8}};
 run.objects=[hazard()];tick(run);assert.equal(run.phase,'flying');assert.equal(run.powerup,null);
});

test('overlapping gate panels consume only one protection layer per contact burst',()=>{
 const run=empty();run.shield=2;run.objects=[hazard('one'),hazard('two')];tick(run);
 assert.equal(run.phase,'flying');assert.equal(run.shield,1);assert.equal(run.events.filter(e=>e.type==='hit').length,1);
});

test('lucky signal produces tokens in ordinary play and remains blocked in events',()=>{
 const normal=createFlight({seed:2,loadout:['lucky-signal']}),plain=createFlight({seed:2}),event=createFlight({seed:2,loadout:['lucky-signal'],event:true});
 commandFlight(normal,'start');commandFlight(plain,'start');commandFlight(event,'start');
 assert.ok(normal.objects.some(o=>o.type==='token'),'paid gadget has an observable normal-run effect');
 assert.equal(plain.objects.some(o=>o.type==='token'),false);assert.equal(event.effects.eventTokenChance,0);
});

test('late-run speed and gate intervals keep the newly reserved dodge-return margin',()=>{
 const run=createFlight({seed:7});run.distance=3000;run.nextPatternAt=run.distance+FLIGHT_TUNING.firstGateDistance;commandFlight(run,'start');tick(run);
 assert.equal(run.speed,5.5);
 for(let i=1;i<run.safeRoute.length;i++)assert.ok(run.safeRoute[i].z-run.safeRoute[i-1].z>=34);
});

function chassis(id){const run=empty();run.vehicle=id;run.vehicleUntil=100;run.vehicleHealth=2;return run;}
const feed=(run,controls=input,seconds=.5)=>{for(let n=0;n<Math.ceil(seconds*60);n++)advanceFlight(run,1/60,controls);};

test('Polarity Shell teaches normal controls before an optional comfortable cycle changes virtual pull',()=>{
 const run=chassis('polarity-shell');feed(run,input,2.1);
 assert.match(run.vehicleHint,/Rise still means up/);assert.equal(run.vehicleControl.polarity,1);
 feed(run,{...input,height01:.3},.4);feed(run,{...input,height01:.78},.4);
 assert.equal(run.vehicleControl.polarity,-1);
 assert.equal(run.events.filter(e=>e.action==='gravity-switched').length,1);
 feed(run,{...input,height01:.78},.4);assert.equal(run.events.filter(e=>e.action==='gravity-switched').length,1);
});

test('Foldwing previews a bounded destination and neutral commits a short fold',()=>{
 const run=chassis('foldwing');feed(run,input,2.1);feed(run,{...input,steer:.6},.9);
 assert.ok(run.foldPreview);assert.equal(run.foldPreview.clear,true);
 const target=run.foldPreview.x;assert.ok(Math.abs(target-run.x)<=.221);
 feed(run,input,.2);const event=run.events.find(e=>e.action==='fold');
 assert.ok(event);assert.equal(event.targetX,target);assert.equal(run.foldPreview,null);
});

test('Foldwing refuses a preview destination blocked within its advertised threat horizon',()=>{
 const run=chassis('foldwing');feed(run,input,2.1);
 run.objects.push({...hazard('blocked-destination',run.distance+22),w:1,h:.5});
 feed(run,{...input,steer:.6},.9);assert.ok(run.foldPreview);assert.equal(run.foldPreview.clear,false);
 feed(run,input,.2);assert.equal(run.events.some(e=>e.action==='fold'),false);assert.equal(run.phase,'flying');
});

test('Pipwing turns a comfortable rise into a bounded flap with a refractory interval',()=>{
 const run=chassis('pipwing');feed(run,input,2.1);feed(run,{...input,height01:.7},.1);
 assert.equal(run.events.filter(e=>e.action==='flap').length,1);
 for(let n=0;n<4;n++){feed(run,{...input,height01:.45},.05);feed(run,{...input,height01:.7},.05);}
 assert.equal(run.events.filter(e=>e.action==='flap').length,1);assert.ok(Math.abs(run.vy)<.78);
});

test('a pause clears pending vehicle gestures without replaying them on resume',()=>{
 const run=chassis('polarity-shell');feed(run,input,2.1);feed(run,{...input,height01:.3},.4);
 assert.equal(run.vehicleControl.armed,true);commandFlight(run,'pause');commandFlight(run,'resume');
 feed(run,{...input,height01:.78},.5);assert.equal(run.vehicleControl.polarity,1);
 assert.equal(run.events.some(e=>e.action==='gravity-switched'),false);
});

test('sweeping and orbiting gates move their collision panels without shrinking the reserved aperture',()=>{
 const run=createFlight({seed:12});commandFlight(run,'start');
 const panels=run.objects.filter(o=>o.basePanel&&o.gateStyle!=='fixed');
 const initial=new Map(panels.map(o=>[o.id,{x:o.x,y:o.y}]));feed(run,input,.5);
 assert.ok(panels.some(o=>o.gateStyle==='sweeping'&&(o.x!==initial.get(o.id).x||o.y!==initial.get(o.id).y)));
 assert.ok(panels.some(o=>o.gateStyle==='orbiting'&&(o.x!==initial.get(o.id).x||o.y!==initial.get(o.id).y)));
 for(const o of panels){const p=o.safePoint;
  assert.ok(o.x+o.w<=p.x-FLIGHT_TUNING.safeHalfWidth+1e-9||o.x-o.w>=p.x+FLIGHT_TUNING.safeHalfWidth-1e-9
   ||o.y+o.h<=p.y-FLIGHT_TUNING.safeHalfHeight+1e-9||o.y-o.h>=p.y+FLIGHT_TUNING.safeHalfHeight-1e-9,o.id);
 }
});
