// The neon wormhole glass (modules/portal/portal.mjs): ring colour mix, the lens map the shader reads, and the
// timing knobs Ian asked for (23 Sept: mixed colours, liquid glass, longer). Import-only, no DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PORTAL,ringColours,lensMap,MENUS} from '../modules/portal/portal.mjs';

const NEONS=['#ff5f1f','#ffff33','#39ff14','#1f51ff','#b026ff','#ff10f0'];

test('every shape mixes all six neons with its own colour leading about 40% of the rings',()=>{
 for(const id of ['rect','oval','up','down','vdiamond']){
  const color=MENUS[id].color,seq=ringColours(color),share=seq.filter(c=>c===color).length/seq.length;
  assert(share>=.35&&share<=.45,`${id} share ${share}`);
  for(const neon of NEONS)assert(seq.includes(neon),`${id} is missing ${neon}`);
  assert(seq.length<=10,'the shader holds ten ring colours');
 }
});

test('the cross is an even rainbow',()=>{
 const seq=ringColours('#ffffff',true);
 assert.deepEqual([...seq].sort(),[...NEONS].sort());
});

test('lens map: signed rim distance in b, outward normal in rg',()=>{
 const px=2,bevel=20,sq=[[40,40],[160,40],[160,160],[40,160],[40,40]],{data,mw}=lensMap(sq,200,200,px,bevel);
 const at=(x,y)=>{const o=4*(Math.floor(y/px)*mw+Math.floor(x/px));return [...data.slice(o,o+3)];};
 assert.equal(at(100,100)[2],255,'deep inside');
 assert.equal(at(5,100)[2],0,'far outside');
 const rim=at(41,100);assert(Math.abs(rim[2]-128)<12,`on the rim ${rim[2]}`);
 assert(rim[0]<20&&Math.abs(rim[1]-128)<3,`left edge normal points left ${rim}`);
 const top=at(100,43);assert(top[1]<20&&Math.abs(top[0]-128)<3,`top edge normal points up ${top}`);
});

test('portal is longer and every timing stays a named knob',()=>{
 assert.equal(PORTAL.cutMs,1300);assert.equal(PORTAL.loadMinMs,3500);assert.equal(PORTAL.revealMs,1100);
 assert(PORTAL.tunnelTo>PORTAL.tunnelFrom,'the wormhole speeds up across the glass phase');
});
