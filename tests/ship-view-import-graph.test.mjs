// scripts/build.mjs serves modules/ships/ship-view.mjs unbundled in production (external list, no
// Vite, no esbuild defines). Walk its relative import graph (static + dynamic) and fail if anything
// in it is a .ts file (404s unbundled — Vite only compiles TS on the fly in dev) or references a
// build-time __MYR5_ define (undefined unbundled, since only scripts/build.mjs's app.mjs bundle
// injects those). modules/ships/ship-view-bridge.mjs is the one place that chain is allowed to live
// (app.mjs imports it statically, so it IS bundled into app-runtime.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';

const ENTRY = 'modules/ships/ship-view.mjs';
const IMPORT_RE = /\b(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;

async function walk(entry, root, seen = new Map()) {
 const abs = resolve(root, entry);
 if (seen.has(abs)) return seen;
 const source = await readFile(abs, 'utf8');
 seen.set(abs, source);
 for (const match of source.matchAll(IMPORT_RE)) {
  const spec = match[1];
  const resolved = resolve(dirname(abs), spec);
  await walk(resolved.slice(root.length + sep.length).replaceAll(sep, '/'), root, seen);
 }
 return seen;
}

test('ship-view.mjs\'s relative import graph is servable unbundled: no .ts files, no build-time __MYR5_ defines', async () => {
 const root = resolve('.');
 const files = await walk(ENTRY, root);
 assert.ok(files.size >= 2, 'expected ship-view.mjs to pull in at least ship-scene-domain.mjs');
 for (const [file, source] of files) {
  assert.notEqual(extname(file), '.ts', `${file} is a .ts file; Vite compiles it in dev but production serves ship-view.mjs's imports raw, so this 404s`);
  assert.doesNotMatch(source, /__MYR5_/, `${file} references a build-time define; it is only ever substituted when bundled (see scripts/build.mjs's external list) and is undefined when this file is served raw`);
 }
});

test('modules/ships/ship-view-bridge.mjs (the trust/ledger/battle-pass chain) is not reachable from ship-view.mjs', async () => {
 const root = resolve('.');
 const files = [...(await walk(ENTRY, root)).keys()];
 assert.ok(!files.some(f => f.endsWith('ship-view-bridge.mjs')), 'ship-view.mjs must receive getBridge/ownedShipIds as parameters, not import ship-view-bridge.mjs itself');
});
