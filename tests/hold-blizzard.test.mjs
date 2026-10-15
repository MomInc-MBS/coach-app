import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlizzard, renderBlizzard, MAX_ICE_EDGES, MAX_SNOW } from '../arcade/hold/blizzard.mjs';
import { createEcosystem } from '../arcade/hold/ecosystem.mjs';

function body({dx=0, missing=[]}={}) {
  const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.95}));
  const xy={11:[.42,.29],12:[.58,.29],13:[.35,.39],14:[.65,.39],15:[.3,.48],16:[.7,.48],23:[.45,.55],24:[.55,.55],25:[.43,.68],26:[.57,.68],27:[.42,.88],28:[.58,.88],29:[.4,.9],30:[.6,.9],31:[.39,.91],32:[.61,.91]};
  for(const [i,[x,y]] of Object.entries(xy))p[+i]={x:x+dx,y,visibility:.95};
  for(const i of missing)p[i].visibility=.1;
  return p;
}
function pose(e, ms, options={}) { return e.pose({points:body(options),now:ms,validHold:true,mode:'forearm-plank'}); }
function accrue(e,end=5100){for(let ms=0;ms<=end;ms+=100)pose(e,ms);}

test('spawnEntities false shares the five-second stillness gate without ecology output',()=>{
 const e=createEcosystem({spawnEntities:false});
 for(let ms=0;ms<=4900;ms+=100)e.pose({points:body(),now:ms,validHold:true});
 assert.equal(e.state.phase,'waiting');assert.ok(Math.abs(e.state.stillSeconds-4.9)<1e-9);assert.deepEqual(e.state.entities,[]);assert.deepEqual(e.state.debris,[]);
 e.pose({points:body(),now:5000,validHold:true});
 assert.equal(e.state.phase,'growing');assert.ok(Math.abs(e.state.stillSeconds-5)<1e-9);assert.deepEqual(e.state.entities,[]);
});

test('Blizzard grows a connected contact graph after the shared five-second hold and stays bounded',()=>{
 const e=createBlizzard({seed:7});accrue(e);
 assert.equal(e.state.phase,'growing');assert.ok(e.state.stillSeconds>=5);
 assert.ok(e.state.iceEdges.length>0&&e.state.iceEdges.length<=MAX_ICE_EDGES);
 assert.ok(e.state.snow.length<=MAX_SNOW);
 const first=e.state.iceEdges[0];assert.ok([29,30,13,14].includes(first.from));
 const directed=new Map(e.state.iceEdges.map(edge=>[edge.to,edge.from]));
 for(const edge of e.state.iceEdges){let at=edge.from,guard=0;while(![29,30,13,14,15,16].includes(at)&&directed.has(at)&&guard++<20)at=directed.get(at);assert.ok([29,30,13,14,15,16].includes(at));}
 assert.deepEqual(e.state.entities,undefined); // Blizzard's public state has no ecology entities.
});

test('missing joints remove adjoining ice immediately; movement freezes coordinates and fades',()=>{
 const e=createBlizzard({seed:8});accrue(e);
 pose(e,5200,{missing:[27]});
 assert.ok(e.state.iceEdges.every(edge=>edge.from!==27&&edge.to!==27));
 const frozen=e.state.iceEdges.map(edge=>[edge.x1,edge.y1,edge.x2,edge.y2]);
 pose(e,5300,{dx:.1});
 assert.equal(e.state.phase,'retreating');
 assert.deepEqual(e.state.iceEdges.map(edge=>[edge.x1,edge.y1,edge.x2,edge.y2]),frozen);
 for(let i=0;i<200;i++)e.step(.05);
 assert.equal(e.state.phase,'waiting');assert.equal(e.state.iceEdges.length,0);assert.ok(e.state.snow.every(f=>f.alpha===0));
});

test('lost pose fades, fresh hold must earn five observed seconds again, reset clears visuals',()=>{
 const e=createBlizzard({seed:9});accrue(e);
 e.pose({points:body(),now:5200,validHold:false});assert.equal(e.state.phase,'retreating');
 for(let i=0;i<200;i++)e.step(.05);assert.equal(e.state.phase,'waiting');
 pose(e,6000);for(let ms=6100;ms<=10900;ms+=100)pose(e,ms);
 assert.equal(e.state.phase,'waiting');pose(e,11000);assert.equal(e.state.phase,'growing');
 e.reset();assert.equal(e.state.phase,'waiting');assert.equal(e.state.stillSeconds,0);assert.equal(e.state.iceEdges.length,0);assert.ok(e.state.snow.every(f=>f.alpha===0));
});

test('renderer only reads model state and draws on supplied canvas context',()=>{
 const e=createBlizzard({seed:10});accrue(e);
 const before=structuredClone(e.state), calls=[];
 const ctx=new Proxy({}, {get:(o,key)=>key in o?o[key]: (...args)=>calls.push([key,...args]),set:(o,key,value)=>(o[key]=value,true)});
 renderBlizzard(ctx,e.state);
 assert.ok(calls.some(([name])=>name==='fillRect'));assert.deepEqual(e.state,before);
});


test('loss of all metadata support anchors clears ice immediately',()=>{
 const e=createBlizzard({seed:11});accrue(e);
 pose(e,5200,{missing:[13,14,27,28,29,30,31,32]});
 assert.equal(e.state.phase,'growing');assert.deepEqual(e.state.iceEdges,[]);
});

test('snow flakes retain visible local alpha for the translucent host overlay',()=>{
 const alphas=[],ctx=new Proxy({}, {get:(o,key)=>key in o?o[key]:(...args)=>{if(key==='fillRect')alphas.push(o.globalAlpha);},set:(o,key,value)=>(o[key]=value,true)});
 renderBlizzard(ctx,{snow:[{x:12,y:18,size:2,alpha:.6}],iceEdges:[],stillSeconds:5});
 assert.deepEqual(alphas,[.6]);
});

test('partially grown ice draws only the interpolated prefix of an edge',()=>{
 const calls=[],ctx=new Proxy({}, {get:(o,key)=>key in o?o[key]:(...args)=>calls.push([key,...args]),set:(o,key,value)=>(o[key]=value,true)});
 renderBlizzard(ctx,{snow:[],iceEdges:[{from:11,to:13,x1:0,y1:20,x2:100,y2:20,growth:.1,alpha:1}],stillSeconds:5.1});
 const rightmost=Math.max(...calls.filter(([name])=>name==='fillRect').map(([,x,,width])=>x+width));
 assert.ok(rightmost>=9&&rightmost<=13,`10% growth should end near x=10, saw x=${rightmost}`);
});

test('pose watchdog fades frozen geometry and stale time cannot resume growth',()=>{
 const e=createBlizzard({seed:12});accrue(e);
 const frozen=e.state.iceEdges.map(edge=>[edge.x1,edge.y1,edge.x2,edge.y2]);
 e.step(1.01);
 assert.equal(e.state.phase,'retreating');
 assert.deepEqual(e.state.iceEdges.map(edge=>[edge.x1,edge.y1,edge.x2,edge.y2]),frozen);
 assert.equal(e.state.stillSeconds,0);
});
