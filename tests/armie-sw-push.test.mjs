import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {MessageChannel} from 'node:worker_threads';

const source = await readFile('sw.js', 'utf8');
function worker(clients) {
 const handlers = {}, shown = [];
 const self = {location: {origin: 'https://test'}, addEventListener: (k, fn) => handlers[k] = fn, skipWaiting: async () => {}, clients: {matchAll: async () => clients, claim: async () => {}}, registration: {showNotification: async (title, options) => void shown.push({title, ...options})}};
 runInNewContext(source, {self, caches: {}, URL, Request, Response, Headers, crypto, MessageChannel, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 20)), clearTimeout, fetch: async () => new Response('')});
 return {shown, async push(data) { let pending; handlers.push({data: {json: () => data}, waitUntil: p => pending = p}); await pending; }};
}
const windowClient = blocked => { const got = []; return {got, postMessage(data, ports) { got.push(data); if (data.type === 'ARMIE_NOTIFY_CHECK') ports[0].postMessage({blocked}); }}; };
const letter = {title: 'Armie v2.0.0', body: 'Five days.', tag: 'myr5-armie-2026-10-09-milestone-5', url: '/pose.html', kind: 'myr5-armie-letter'};

test('an Armie letter push is shown when no window is mid-set', async () => {
 const w = worker([windowClient(false)]);
 await w.push(letter);
 assert.equal(w.shown.length, 1);
 assert.equal(w.shown[0].tag, letter.tag);
});

test('an Armie letter push mid-set is handed to that window to hold, not shown', async () => {
 const client = windowClient(true), w = worker([client]);
 await w.push(letter);
 assert.equal(w.shown.length, 0);
 assert.deepEqual(client.got.map(m => m.type), ['ARMIE_NOTIFY_CHECK', 'ARMIE_LETTER_HELD']);
 assert.equal(client.got[1].letter.tag, letter.tag);
});

test('non-letter pushes (reminders) are unchanged: shown without asking any window', async () => {
 const client = windowClient(true), w = worker([client]);
 await w.push({title: 'Reminder', body: 'Train', tag: 'myr5-reminder'});
 assert.equal(w.shown.length, 1);
 assert.deepEqual(client.got, []);
});
