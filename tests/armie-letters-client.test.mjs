import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB, IDBKeyRange} from 'fake-indexeddb';

// Minimal DOM shim: the client only needs window events, document.body.dataset
// and localStorage -- not a full browser.
globalThis.indexedDB ??= indexedDB;
globalThis.IDBKeyRange ??= IDBKeyRange;
class FakeEventTarget {
 constructor() { this.listeners = {}; }
 addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
 dispatchEvent(event) { for (const fn of this.listeners[event.type] || []) fn(event); return true; }
}
class FakeCustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
globalThis.window ??= new FakeEventTarget();
globalThis.CustomEvent ??= FakeCustomEvent;
globalThis.document ??= {body: {dataset: {}}};
globalThis.localStorage ??= (() => { const m = new Map(); return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; })();

const {handleArmieProgress, holdArmiePush, flushHeldArmiePushes, canOfferArmiePush} = await import('../armie-letters-client.mjs');

test('handleArmieProgress writes newly fired letters to the inbox exactly once', async () => {
 const added1 = await handleArmieProgress([{date: '2026-10-05', id: 'forgive-1'}]);
 assert.equal(added1.length, 1);
 assert.equal(added1[0].letterId, 'forgive-1');
 const added2 = await handleArmieProgress([{date: '2026-10-05', id: 'forgive-1'}]); // reopen catch-up re-delivers the same one
 assert.equal(added2.length, 0);
});

test('the existing account-progress event feeds the inbox (no second progress channel)', async () => {
 let seen = null;
 window.addEventListener('myr5:armie-inbox-updated', event => { seen = event.detail; });
 window.dispatchEvent(new CustomEvent('myr5:account-progress', {detail: {combat: {pendingLetters: [{date: '2026-10-09', id: 'milestone-5'}]}}}));
 for (let i = 0; i < 50 && !seen; i++) await new Promise(r => setTimeout(r, 10));
 assert.ok(seen);
 assert.equal(seen.added[0].letterId, 'milestone-5');
});

test('an unrecognized letter id is skipped; an empty list is a no-op', async () => {
 assert.deepEqual(await handleArmieProgress([{date: '2026-10-20', id: 'not-a-real-letter'}]), []);
 assert.deepEqual(await handleArmieProgress([]), []);
 assert.deepEqual(await handleArmieProgress(undefined), []);
});

test('no push offer without browser push support (never prompts on its own)', () => {
 assert.equal(canOfferArmiePush(), false);
});

test('a push arriving mid-set or in camera-only mode is held until both end', async () => {
 const shown = [], show = async letter => void shown.push(letter.tag);
 document.body.dataset.tracking = 'true';
 await holdArmiePush({title: 'Armie v2.0.0', body: 'x', tag: 'myr5-armie-2026-10-09-milestone-5'}, show);
 assert.deepEqual(shown, []);
 document.body.dataset.tracking = 'false';
 document.body.dataset.cameraWorkout = 'true';
 assert.equal(await flushHeldArmiePushes(show), 0);
 delete document.body.dataset.cameraWorkout;
 assert.equal(await flushHeldArmiePushes(show), 1);
 assert.deepEqual(shown, ['myr5-armie-2026-10-09-milestone-5']);
 assert.equal(await flushHeldArmiePushes(show), 0, 'shown once, not again');
});
