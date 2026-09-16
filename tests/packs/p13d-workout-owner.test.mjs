import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkoutSessionOwner} from '../../pod/workout-session-owner.mjs';
import {existingWorkoutIdleAdapter} from '../../packs/workout-idle-adapter.mjs';
import {PackLifecycle, fixtureAssetStore, memoryStore, sha256} from '../../packs/pack-lifecycle.mjs';

const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) }; };
async function ready(owner, runtimeFactory = async () => ({dispose(){}})) {
 const bytes = new TextEncoder().encode('P13D controller fixture'), hash = await sha256(bytes), lifecycle = new PackLifecycle({account:{getEntitlements:()=>['p13d']},storage:memoryStore(),assetStore:fixtureAssetStore(),workout:existingWorkoutIdleAdapter({owner}),runtimeFactory});
 lifecycle.manifest({packId:'p13d',version:'1.0.0',minAppVersion:'1.0.0',sha256:hash,assets:[{path:'p13d.bin',bytes:bytes.byteLength,sha256:hash}]},{'p13d.bin':bytes}); await lifecycle.download('p13d'); await lifecycle.verify('p13d'); await lifecycle.equipPending('p13d'); return lifecycle;
}

test('actual workout owner keeps an active tracked set pending and persists only local acknowledgement', async () => {
 const owner = new WorkoutSessionOwner({storage:memory()}); assert.equal(owner.start(),true); const lifecycle = await ready(owner);
 await assert.rejects(lifecycle.restart(),/acknowledgment/); assert.equal(lifecycle.status('p13d').state,'pending-equip'); assert.equal(owner.snapshot().phase,'active');
});
test('lease blocks a start throughout asynchronous activation, then releases for normal starts', async () => {
 const owner = new WorkoutSessionOwner({storage:memory()}); let resolveRuntime, runtimeReady; const readyForRuntime=new Promise(resolve=>{runtimeReady=resolve;}); const lifecycle = await ready(owner,() => {runtimeReady();return new Promise(resolve => { resolveRuntime = resolve; });});
 const activating = lifecycle.restart(); await readyForRuntime; assert.equal(owner.canStart(),false); assert.equal(owner.start(),false); resolveRuntime({dispose(){}}); await activating;
 assert.equal(owner.snapshot().phase,'idle'); assert.equal(owner.canStart(),true); assert.equal(owner.start(),true);
});
test('save rejection and activation rejection release the controller lease and retain pending activation across reload', async () => {
 const storage=memory(), owner = new WorkoutSessionOwner({storage}); owner.save=()=>false; const lifecycle=await ready(owner); await assert.rejects(lifecycle.restart(),/acknowledgment/); assert.equal(owner.canStart(),true); assert.equal(lifecycle.status('p13d').state,'pending-equip');
 owner.save=WorkoutSessionOwner.prototype.save.bind(owner); const failed=await ready(owner,async()=>{throw Error('runtime unavailable');}); await failed.restart(); assert.equal(failed.status('p13d').state,'pending-equip'); assert.equal(failed.status('p13d').pending,true); assert.equal(owner.canStart(),true);
 const reloaded=new WorkoutSessionOwner({storage}); assert.equal(reloaded.snapshot().phase,'idle'); assert.ok(reloaded.snapshot().revision>=owner.snapshot().revision);
});
