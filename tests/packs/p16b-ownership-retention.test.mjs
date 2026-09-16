import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PackLifecycle,
  fixtureAssetStore,
  memoryStore,
  sha256,
} from '../../packs/pack-lifecycle.mjs';
import { authenticatedPackAccount } from '../../packs/isolated-pack-control.mjs';

const bytes = value => new TextEncoder().encode(value);

async function manifest(packId, version, value) {
  const data = bytes(value);
  const hash = await sha256(data);
  return {
    packId,
    version,
    minAppVersion: '1.0.0',
    sha256: hash,
    assets: [{ path: 'material.bin', bytes: data.byteLength, sha256: hash }],
  };
}

function lifecycle({ account, storage = memoryStore(), assets = fixtureAssetStore(), workout, runtimeFactory } = {}) {
  return new PackLifecycle({
    account,
    storage,
    assetStore: assets,
    workout: workout || { saveAndConfirmIdle: async () => ({ saved: true, idle: true }) },
    runtimeFactory: runtimeFactory || (async () => ({ dispose() {} })),
  });
}

test('R7: failed replacement preserves persisted active bytes/runtime and exposes candidate error across restart', async () => {
  const account = { getEntitlements: () => ['material'] };
  const storage = memoryStore();
  const assets = fixtureAssetStore();
  const app = lifecycle({ account, storage, assets });
  const good = await manifest('material', '1.0.0', 'last-good-material');
  app.manifest(good, { 'material.bin': bytes('last-good-material') });
  await app.download('material');
  await app.verify('material');
  await app.equipPending('material');
  await app.restart();
  assert.equal(app.status('material').state, 'active');
  const goodKey = `material@${good.version}@${good.sha256}/material.bin`;
  assert.deepEqual(await assets.get(goodKey), bytes('last-good-material'));

  const replacement = await manifest('material', '2.0.0', 'replacement-material');
  app.manifest(replacement, { get: async () => { throw new Error('corrupt replacement'); } });
  const result = await app.download('material');
  assert.equal(result.state, 'active');
  assert.match(result.candidate.error, /corrupt replacement/);
  assert.equal(result.candidate.state, 'failed', 'failed candidate must remain observable');
  assert.deepEqual(await assets.get(goodKey), bytes('last-good-material'));

  const restarted = lifecycle({ account, storage, assets });
  restarted.manifest(replacement, { get: async () => { throw new Error('corrupt replacement'); } });
  await restarted.restore();
  assert.equal(restarted.status('material').state, 'active');
  assert.equal(restarted.status('material').version, good.version);
  assert.equal(restarted.status('material').candidate.state, 'failed');
});

test('R8: durable ownedPacks ownership remains after device-byte eviction', async () => {
  const account = { ownedPacks: [{ packId: 'material', status: 'owned', grantedAt: 1 }] };
  const adapter = authenticatedPackAccount(account);
  const storage = memoryStore();
  const assets = fixtureAssetStore();
  const app = lifecycle({ account: adapter, storage, assets });
  const m = await manifest('material', '1.0.0', 'owned-material');
  app.manifest(m, { 'material.bin': bytes('owned-material') });
  await app.download('material');
  await app.verify('material');
  const key = `material@${m.version}@${m.sha256}/material.bin`;
  await app.evict('material');
  assert.equal(await assets.get(key), null, 'eviction must remove only device bytes');
  assert.deepEqual(adapter.getEntitlements(), [{ packId: 'material', status: 'owned', grantedAt: 1 }]);
  account.rank = 'unranked';
  account.season = 'ended';
  assert.deepEqual(adapter.getEntitlements(), [{ packId: 'material', status: 'owned', grantedAt: 1 }], 'account progression fields do not revoke immutable ownedPacks records');
});

test('R8: authenticated ownership adapter returns only server-owned record shape', () => {
  const account = { ownedPacks: [
    { packId: 'earned', status: 'owned', grantedAt: 1, ignored: 'not returned' },
    { packId: 'candidate', status: 'downloaded', grantedAt: 2 },
    { packId: 'forged', status: 'owned', grantedAt: 'client-time' },
  ] };
  assert.deepEqual(authenticatedPackAccount(account).getEntitlements(), [
    { packId: 'earned', status: 'owned', grantedAt: 1, ignored: 'not returned' },
  ]);
});

test('R5/R6: only verified persisted bytes may activate after save and restart', async () => {
  const account = { getEntitlements: () => ['material'] };
  const storage = memoryStore();
  const assets = fixtureAssetStore();
  let runtimeCalls = 0;
  const app = lifecycle({ account, storage, assets, runtimeFactory: async () => { runtimeCalls += 1; return { dispose() {} }; } });
  const m = await manifest('material', '1.0.0', 'verified-material');
  app.manifest(m, { 'material.bin': bytes('verified-material') });
  await app.download('material');
  await app.verify('material');
  await app.equipPending('material');
  const key = `material@${m.version}@${m.sha256}/material.bin`;
  await assets.put(key, bytes('corrupted-after-verify'));
  await app.restart();
  assert.equal(runtimeCalls, 0);
  assert.equal(app.status('material').state, 'failed');

  const restored = lifecycle({ account, storage, assets, runtimeFactory: async () => { runtimeCalls += 1; return { dispose() {} }; } });
  restored.manifest(m, { 'material.bin': bytes('verified-material') });
  await restored.restore();
  assert.equal(runtimeCalls, 0, 'corrupt persisted bytes must not activate during restore');
});

test('R7: hash failure of a replacement also leaves last-good active', async () => {
  const account = { getEntitlements: () => ['material'] };
  const storage = memoryStore(), assets = fixtureAssetStore(), app = lifecycle({ account, storage, assets });
  const good = await manifest('material', '1.0.0', 'good'), replacement = await manifest('material', '2.0.0', 'expected');
  app.manifest(good, { 'material.bin': bytes('good') });
  await app.download('material'); await app.verify('material'); await app.equipPending('material'); await app.restart();
  app.manifest(replacement, { 'material.bin': bytes('wrong-but-same-length') });
  await app.download('material');
  const result = await app.verify('material');
  assert.equal(result.state, 'active');
  assert.equal(result.candidate.state, 'failed');
  assert.match(result.candidate.error, /integrity check failed/);
});
