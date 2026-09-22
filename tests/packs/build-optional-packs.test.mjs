import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildOptionalPacks, buildPack, resolveAssets, loadAssetManifest, deriveKeyId, PackSizeError,
} from '../../scripts/build-optional-packs.mjs';
import { PackLifecycle, fixtureAssetStore, memoryStore, sha256 } from '../../packs/pack-lifecycle.mjs';
import { fixtureEntitlementAccount } from '../../packs/isolated-pack-control.mjs';
import { verifyPackCatalog, PACK_ASSET_MAX_BYTES } from '../../packs/catalog-trust.mjs';

async function scratch() { return mkdtemp(join(tmpdir(), 'myr5-pack-build-')); }

function testKeyring() {
  const release = generateKeyPairSync('ed25519');
  return { privateKeyJwk: release.privateKey.export({ format: 'jwk' }), keyring: [{ keyId: 'test-release-1', role: 'release', protocols: [1], publicKey: release.publicKey.export({ format: 'jwk' }) }] };
}

async function fixtureProject({ assets, inboxFiles }) {
  const root = await scratch();
  const inboxDir = join(root, 'assets-inbox'), manifestPath = join(root, 'asset-manifest.json'), outDir = join(root, 'out');
  await mkdir(inboxDir, { recursive: true });
  for (const [name, content] of Object.entries(inboxFiles)) { await mkdir(join(inboxDir, name, '..'), { recursive: true }); await writeFile(join(inboxDir, name), content); }
  await writeFile(manifestPath, JSON.stringify({ assets }));
  return { root, inboxDir, manifestPath, outDir };
}

test('resolveAssets separates delivered files from ones still missing from assets-inbox', async () => {
  const { manifestPath, inboxDir } = await fixtureProject({
    assets: [
      { filename: 'textures/a.webp', pack: 'style-chest', license: 'original', owner: 'you' },
      { filename: 'textures/b.webp', pack: 'style-chest', license: 'original', owner: 'you', status: 'template' },
    ],
    inboxFiles: { 'textures/a.webp': Buffer.from('texture-a-bytes') },
  });
  const manifest = await loadAssetManifest(manifestPath);
  const { found, pending } = await resolveAssets(manifest, inboxDir);
  assert.equal(found.length, 1);
  assert.equal(found[0].filename, 'textures/a.webp');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].filename, 'textures/b.webp');
});

test('buildPack rejects an asset over the existing catalog per-asset cap instead of emitting an unverifiable pack', () => {
  const oversized = Buffer.alloc(PACK_ASSET_MAX_BYTES + 1, 1);
  assert.throws(
    () => buildPack({ packId: 'style-chest', assets: [{ filename: 'x.webp', bytes: oversized.byteLength, sha256: 'a'.repeat(64), license: 'original', owner: 'you', data: oversized }] }),
    PackSizeError,
  );
});

test('buildPack output round-trips through the real PackLifecycle download/verify path', async () => {
  const data = Buffer.from('a small original texture, standing in for a real webp');
  const asset = { filename: 'textures/chest-plate-steel-height.webp', bytes: data.byteLength, sha256: (await sha256(data)), license: 'original', owner: 'you', source: 'image model prompt', data };
  const built = buildPack({ packId: 'style-chest', version: '1.0.0', assets: [asset] });
  assert.equal(built.catalogEntry.packId, 'style-chest');
  assert.equal(built.catalogEntry.dependencies.length, 1);
  assert.equal(built.catalogEntry.dependencies[0].spdx, 'LicenseRef-MomInc-Original');

  // The pack's own manifest.json (embedded in built.files) is exactly what
  // pack-lifecycle.mjs expects from PackLifecycle.manifest(manifest, source).
  const manifestFile = built.files.find(f => f.path.endsWith('.json'));
  const packManifest = JSON.parse(new TextDecoder().decode(manifestFile.data));
  const bytesByPath = new Map(built.files.map(f => [f.path, f.data]));
  const source = { async get(a) { return bytesByPath.get(a.path); } };
  const account = fixtureEntitlementAccount(['style-chest']);
  const workout = { saveAndConfirmIdle: async () => ({ saved: true, idle: true }) };
  const lifecycle = new PackLifecycle({ account, storage: memoryStore(), assetStore: fixtureAssetStore(), workout });
  lifecycle.manifest(packManifest, source);
  assert.equal((await lifecycle.download('style-chest')).state, 'downloaded');
  assert.equal((await lifecycle.verify('style-chest')).state, 'verified');
});

test('with no key file, buildOptionalPacks writes an explicit unsigned dry run that fails verifyPackCatalog', async () => {
  const data = Buffer.from('shared ship model bytes (stand-in)');
  const { manifestPath, inboxDir, outDir } = await fixtureProject({
    assets: [
      { filename: 'ship/ship.glb', pack: 'shared-ship', license: 'original', owner: 'you' },
      { filename: 'textures/not-delivered-yet.webp', pack: 'style-yoga', license: 'original', owner: 'you', status: 'template' },
    ],
    inboxFiles: { 'ship/ship.glb': data },
  });
  const result = await buildOptionalPacks({ manifestPath, inboxDir, outDir, keyPath: null });
  assert.equal(result.signed, false);
  assert.deepEqual(result.pendingAssets, ['textures/not-delivered-yet.webp']);
  assert.equal(result.packs.length, 1);
  assert.equal(result.packs[0].packId, 'shared-ship');

  const catalog = JSON.parse(await readFile(join(outDir, 'packs', 'index.json'), 'utf8'));
  assert.equal(catalog.dryRun, true);
  assert.equal(catalog.signature, null);
  assert.equal(await verifyPackCatalog(catalog, []), false);
});

test('given a matching key file, buildOptionalPacks produces a catalog that verifyPackCatalog accepts', async () => {
  const { privateKeyJwk, keyring } = testKeyring();
  const data = Buffer.from('a wonders background image (stand-in)');
  const { manifestPath, inboxDir, outDir, root } = await fixtureProject({
    assets: [{ filename: 'wonders/great-wall.webp', pack: 'shared-wonders', license: 'CC0-1.0', owner: 'you', source: 'https://example.com/great-wall' }],
    inboxFiles: { 'wonders/great-wall.webp': data },
  });
  const keyPath = join(root, 'test-key.jwk.json');
  await writeFile(keyPath, JSON.stringify(privateKeyJwk));
  try {
    const result = await buildOptionalPacks({ manifestPath, inboxDir, outDir, keyPath, keyring, generation: 3 });
    assert.equal(result.signed, true);
    assert.equal(result.keyId, 'test-release-1');
    assert.equal(result.verified, true);
    const catalog = JSON.parse(await readFile(join(outDir, 'packs', 'index.json'), 'utf8'));
    assert.equal(catalog.generation, 3);
    assert.equal(await verifyPackCatalog(catalog, keyring), true);
    assert.equal(catalog.packs[0].dependencies[0].sourceUrl, 'https://example.com/great-wall');
  } finally {
    await rm(keyPath, { force: true }); // the test key never needs to outlive the test either
  }
});

test('deriveKeyId refuses a private key that does not match the given keyring', () => {
  const { privateKeyJwk } = testKeyring();
  assert.throws(() => deriveKeyId(privateKeyJwk, []), /does not match/);
});
