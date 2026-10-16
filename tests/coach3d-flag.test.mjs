import test from 'node:test';
import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
globalThis.window=globalThis;
const {coach3dEnabled,COACH_3D_KEY,COACH_AURA_LEVEL,COACH_AURA_PLACE}=await import('../coach3d-flag.mjs');

test('3D workout coach is off unless localStorage myr5Coach3d is 1',()=>{
 assert.equal(COACH_3D_KEY,'myr5Coach3d');
 assert.equal(coach3dEnabled(),false);
 localStorage.setItem(COACH_3D_KEY,'0');assert.equal(coach3dEnabled(),false);
 localStorage.setItem(COACH_3D_KEY,'1');assert.equal(coach3dEnabled(),true);
 localStorage.removeItem(COACH_3D_KEY);
});
test('aura-entrance placement and level are tuning constants the overlay reads',()=>{
 assert.equal(COACH_AURA_LEVEL,3);
 assert.ok(COACH_AURA_PLACE.heightPct>0&&COACH_AURA_PLACE.heightPct<=.35,'small, not covering the camera view');
});
