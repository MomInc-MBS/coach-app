// Rank 2b: builds optional-art packs from plan/assets-inbox/ + asset-manifest.json
// (paths are given as arguments; this script never assumes the plan repo's
// location) into the /packs/<pack-id>/<version>/... + /packs/index.json layout,
// signed with the EXISTING pack-catalog mechanism (packs/catalog-trust.mjs,
// packs/catalog-config.mjs — the same Ed25519 catalog scheme
// scripts/provision-pack-catalog-keys.mjs provisions as a GitHub secret).
//
// Never reads/prints/copies the real signing key: a key file path only ever
// flows into crypto.createPrivateKey/sign, never into a log line, and this
// script never writes one to disk. With no key, it produces an unsigned dry
// run and says so plainly — the output cannot pass verifyPackCatalog().
import { createHash, createPrivateKey, createPublicKey, sign as edSign } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PACK_CATALOG_PROTOCOL, PACK_CATALOG_SCHEMA, PACK_ASSET_MAX_BYTES, PACK_TOTAL_MAX_BYTES,
  canonicalCatalogPayload, verifyPackCatalog,
} from '../packs/catalog-trust.mjs';
import { productionCatalogKeyring } from '../packs/catalog-config.mjs';
import { PACK_HOST_BASE_URL } from '../packs/pack-host-config.mjs';

const DEFAULT_VERSION = '1.0.0';
const DEFAULT_MIN_APP_VERSION = '1.0.0';
const SPDX_ORIGINAL = 'LicenseRef-MomInc-Original';

export class PackSizeError extends Error {}

export const sha256Hex = bytes => createHash('sha256').update(bytes).digest('hex');

function concatBytes(chunks) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

export async function loadAssetManifest(manifestPath) {
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(parsed.assets)) throw new Error(`${manifestPath} is missing an "assets" array`);
  return parsed;
}

/**
 * Splits manifest entries into ones whose file exists in assets-inbox
 * (`found`, with bytes/sha256 computed) and ones that don't yet (`pending`,
 * e.g. the "status": "template" placeholder that ships with an empty inbox).
 */
export async function resolveAssets(manifest, inboxDir) {
  const found = [], pending = [];
  for (const entry of manifest.assets) {
    const filePath = join(inboxDir, entry.filename);
    if (!existsSync(filePath)) { pending.push(entry); continue; }
    const data = await readFile(filePath);
    found.push({ ...entry, bytes: data.byteLength, sha256: sha256Hex(data), data });
  }
  return { found, pending };
}

function groupByPack(assets) {
  const packs = new Map();
  for (const asset of assets) {
    if (!asset.pack) throw new Error(`asset "${asset.filename}" has no "pack" id in asset-manifest.json`);
    if (!packs.has(asset.pack)) packs.set(asset.pack, []);
    packs.get(asset.pack).push(asset);
  }
  return packs;
}

const spdxFor = license => (!license || license === 'original') ? SPDX_ORIGINAL : license;

/**
 * Builds one pack: content-addressed asset files, a pack-lifecycle-shaped
 * manifest.json (the shape packs/pack-lifecycle.mjs downloads and verifies
 * against), and the catalog entry pack-license-surface.mjs / catalog-state.mjs
 * expect inside /packs/index.json. Throws PackSizeError if any asset or the
 * pack total is over the existing catalog's own caps (packs/catalog-trust.mjs
 * PACK_ASSET_MAX_BYTES / PACK_TOTAL_MAX_BYTES) rather than emit an
 * unverifiable catalog silently.
 */
export function buildPack({ packId, version = DEFAULT_VERSION, assets, minAppVersion = DEFAULT_MIN_APP_VERSION, fallbackId = 'builtin:none', baseUrl = PACK_HOST_BASE_URL }) {
  const oversized = assets.filter(a => a.bytes > PACK_ASSET_MAX_BYTES);
  if (oversized.length) throw new PackSizeError(`pack "${packId}": ${oversized.length} asset(s) exceed the ${PACK_ASSET_MAX_BYTES}-byte catalog cap: ${oversized.map(a => `${a.filename} (${a.bytes}B)`).join(', ')}`);

  const manifestAssets = assets.map(asset => ({ path: `packs/${packId}/${version}/assets/${asset.sha256}${extname(asset.filename)}`, bytes: asset.bytes, sha256: asset.sha256 }));
  const packManifest = { packId, version, minAppVersion, sha256: sha256Hex(concatBytes(assets.map(a => a.data))), assets: manifestAssets };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(packManifest));
  const manifestHash = sha256Hex(manifestBytes);
  const manifestPath = `/packs/${packId}/${version}/manifest.${manifestHash}.json`;

  const dependencies = assets.map((asset, i) => ({
    name: basename(asset.filename, extname(asset.filename)),
    version,
    path: `/${manifestAssets[i].path}`,
    bytes: asset.bytes,
    sha256: asset.sha256,
    spdx: spdxFor(asset.license),
    sourceUrl: /^https:\/\//.test(asset.source || '') ? asset.source : `${baseUrl}/${manifestAssets[i].path}`,
    attribution: asset.owner || 'MOM INC',
  }));
  const totalBytes = manifestBytes.byteLength + dependencies.reduce((sum, d) => sum + d.bytes, 0);
  if (totalBytes > PACK_TOTAL_MAX_BYTES) throw new PackSizeError(`pack "${packId}": total ${totalBytes}B exceeds the ${PACK_TOTAL_MAX_BYTES}-byte catalog cap`);

  return {
    catalogEntry: { packId, version, fallbackId, manifest: { path: manifestPath, bytes: manifestBytes.byteLength, sha256: manifestHash }, dependencies, totalBytes },
    files: [...assets.map((a, i) => ({ path: manifestAssets[i].path, data: a.data })), { path: `packs/${packId}/${version}/manifest.${manifestHash}.json`, data: manifestBytes }],
  };
}

export function deriveKeyId(privateKeyJwk, keyring) {
  const publicJwk = createPublicKey(createPrivateKey({ key: privateKeyJwk, format: 'jwk' })).export({ format: 'jwk' });
  const match = keyring.find(entry => entry.publicKey.x === publicJwk.x);
  if (!match) throw new Error('signing key does not match any entry in the production keyring (packs/catalog-keys.generated.mjs) — wrong key file?');
  return match.keyId;
}

export function signCatalog(unsignedCatalog, privateKeyJwk, keyId) {
  const candidate = { ...unsignedCatalog, keyId, alg: 'Ed25519', signature: '' };
  const signature = edSign(null, Buffer.from(canonicalCatalogPayload(candidate)), createPrivateKey({ key: privateKeyJwk, format: 'jwk' })).toString('base64');
  return { ...candidate, signature };
}

/**
 * Full build: reads the manifest + inbox, builds every declared pack,
 * writes /packs/<id>/<version>/... plus /packs/index.json under outDir, and
 * signs the catalog only if keyPath is given (env var or CLI argument) —
 * otherwise returns an explicit unsigned dry run. The private key file's
 * *contents* are read only to sign in-memory; they are never logged, never
 * copied into outDir, and never returned in the result.
 */
export async function buildOptionalPacks({ manifestPath, inboxDir, outDir, keyPath, generation = 1, writeManifest = false, keyring = productionCatalogKeyring() }) {
  const manifest = await loadAssetManifest(manifestPath);
  const { found, pending } = await resolveAssets(manifest, inboxDir);
  const grouped = groupByPack(found);

  const packs = [], errors = [];
  for (const [packId, assets] of grouped) {
    try { packs.push(buildPack({ packId, version: manifest.packVersions?.[packId] ?? DEFAULT_VERSION, assets })); }
    catch (error) { errors.push({ packId, message: error.message }); }
  }

  for (const pack of packs) for (const file of pack.files) {
    const target = join(outDir, file.path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, file.data);
  }

  let catalog = { schema: PACK_CATALOG_SCHEMA, protocol: PACK_CATALOG_PROTOCOL, generation, publishedAt: Date.now(), packs: packs.map(p => p.catalogEntry) };
  let signed = false, keyId = null, verified = null;
  if (keyPath) {
    const jwk = JSON.parse(await readFile(keyPath, 'utf8')); // never logged, never persisted
    keyId = deriveKeyId(jwk, keyring);
    catalog = signCatalog(catalog, jwk, keyId);
    signed = true;
    verified = await verifyPackCatalog(catalog, keyring);
  } else {
    catalog = { ...catalog, keyId: null, alg: 'Ed25519', signature: null, dryRun: true };
  }
  await mkdir(join(outDir, 'packs'), { recursive: true });
  await writeFile(join(outDir, 'packs', 'index.json'), JSON.stringify(catalog, null, 2) + '\n');

  if (writeManifest && found.length) {
    const byFilename = new Map(found.map(a => [a.filename, a]));
    manifest.assets = manifest.assets.map(entry => byFilename.has(entry.filename) ? { ...entry, bytes: byFilename.get(entry.filename).bytes, sha256: byFilename.get(entry.filename).sha256 } : entry);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  const sizes = packs.map(p => ({ packId: p.catalogEntry.packId, version: p.catalogEntry.version, assets: p.catalogEntry.dependencies.length, totalBytes: p.catalogEntry.totalBytes }));
  return { signed, keyId, verified, packs: sizes, pendingAssets: pending.map(p => p.filename), errors, outDir };
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [k, ...v] = arg.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
  const manifestPath = args.manifest || process.env.MYR5_PACK_ASSET_MANIFEST;
  const inboxDir = args.inbox || process.env.MYR5_PACK_ASSETS_INBOX;
  const outDir = args.out || process.env.MYR5_PACK_OUT_DIR;
  const keyPath = args.key || process.env.MYR5_PACK_CATALOG_SIGNING_KEY_FILE || null;
  if (!manifestPath || !inboxDir || !outDir) throw new Error('usage: node build-optional-packs.mjs --manifest=<asset-manifest.json> --inbox=<assets-inbox dir> --out=<output dir> [--key=<private jwk file>] [--generation=N] [--write-manifest]');
  const result = await buildOptionalPacks({ manifestPath, inboxDir, outDir, keyPath, generation: args.generation ? Number(args.generation) : 1, writeManifest: Boolean(args['write-manifest']) });
  console.log(JSON.stringify(result, null, 2));
  if (!result.signed) console.log('\nUNSIGNED DRY RUN — no key file was given, so /packs/index.json has signature:null and will NOT pass verifyPackCatalog(). Pass --key=<path-to-private-jwk> (never commit that file) to produce a real signed catalog.');
  if (result.pendingAssets.length) console.log(`\n${result.pendingAssets.length} manifest entr${result.pendingAssets.length === 1 ? 'y' : 'ies'} not yet in assets-inbox, skipped: ${result.pendingAssets.join(', ')}`);
  if (result.errors.length) { console.log(`\n${result.errors.length} pack(s) failed to build:`); for (const e of result.errors) console.log(`  - ${e.packId}: ${e.message}`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
