// #150: the rest <-> set trip is one in -> swap -> out pair through window.myr5Portal.playWormhole, timed by the one knob.
import test from 'node:test';
import assert from 'node:assert/strict';
import {throughWormhole,TRANSITION_MIN_MS} from '../pod/set-transition.mjs';

function dom(dataset={}){
 const els=[],body={dataset,inert:false,append:el=>els.push(el)};
 globalThis.document={body,createElement:()=>({style:{},setAttribute(){},remove(){this.removed=true;},animate:()=>({finished:Promise.resolve()})})};
 return els;
}
const portal=log=>({playWormhole:async o=>{log.push(o);}});

test('each trip plays in, swaps under the cover, then out; both halves come from TRANSITION_MIN_MS',async()=>{
 const log=[],els=dom();globalThis.myr5Portal=portal(log);
 await throughWormhole('Next set',()=>log.push('swap'));
 assert.deepEqual(log,[{direction:'in',minMs:TRANSITION_MIN_MS/2},'swap',{direction:'out',minMs:TRANSITION_MIN_MS/2}]);
 assert.equal(els[0].textContent,'Next set');assert.equal(els[0].removed,true);assert.equal(document.body.inert,false);
});
test('a failed swap still closes the wormhole and rethrows',async()=>{
 const log=[];dom();globalThis.myr5Portal=portal(log);
 await assert.rejects(throughWormhole('x',()=>{throw Error('boom');}),/boom/);
 assert.deepEqual(log.map(o=>o.direction),['in','out']);assert.equal(document.body.inert,false);
});
test('never over the live camera (D24), and a missing portal falls back to the fade',async()=>{
 const log=[];dom({tracking:'true'});globalThis.myr5Portal=portal(log);
 let swapped=0;await throughWormhole('x',()=>swapped++);assert.equal(swapped,1);assert.deepEqual(log,[]);
 const els=dom();globalThis.myr5Portal=undefined;await throughWormhole('y',()=>swapped++);
 assert.equal(swapped,2);assert.equal(els.length,1);assert.equal(els[0].removed,true);
});
