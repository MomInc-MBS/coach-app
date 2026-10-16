import test from 'node:test';
import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
globalThis.window=globalThis;
const {coach3dEnabled,COACH_3D_KEY}=await import('../coach3d-flag.mjs');
const {mountCoachOverlay}=await import('../coach-overlay.mjs');

test('3D workout coach is off unless localStorage myr5Coach3d is 1',()=>{
 assert.equal(COACH_3D_KEY,'myr5Coach3d');
 assert.equal(coach3dEnabled(),false);
 localStorage.setItem(COACH_3D_KEY,'0');assert.equal(coach3dEnabled(),false);
 localStorage.setItem(COACH_3D_KEY,'1');assert.equal(coach3dEnabled(),true);
 localStorage.removeItem(COACH_3D_KEY);
});
test('with the flag off the AR coach overlay mounts nothing (no DOM touched, no hooks)',()=>{
 assert.equal(mountCoachOverlay(),undefined);
 assert.equal(window.myr5CoachOverlay,undefined);
});
