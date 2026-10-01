import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('stopping a phase before an optional material resolves prevents late GL attachment',async()=>{
 const source=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const start=source.indexOf('async function startTunnel('),end=source.indexOf('// The glass sits between',start);
 assert.ok(start>=0&&end>start,'production phase helper is extractable');
 let resolveMaterial,tunnelCalls=0;
 const pending=new Promise(resolve=>{resolveMaterial=resolve;}),glass={isConnected:true,dataset:{},style:{setProperty(){}},classList:{add(){}}};
 const ph={glass,box:{left:0,top:0,w:10,h:10},t0:0};
 const context={boardId:'ice',lifecycle:{signal:{aborted:false}},materialLoads:new Map([['ice',pending]]),store:{get:()=>null},paletteKey:id=>id,paletteFor:()=>({colors:['#abcdef'],core:'#abcdef'}),ringColours:()=>['#ff0000'],boardTint:()=> '#000000',prefersReducedMotion:()=>false,sleep:()=>new Promise(()=>{}),cancelAnimationFrame(){},removeEventListener(){},tunnelGL(){tunnelCalls++;return null;}};
 const run=vm.runInNewContext(`${source.slice(start,end)};startTunnel(ph,[], '#ff0000', false)`,{...context,ph});
 assert.equal(typeof ph.stop,'function','stop is installed synchronously before the first await');
 ph.stop();resolveMaterial('compiled optional material');await run;
 assert.equal(tunnelCalls,0,'an ended phase never compiles or attaches its late program');
});
