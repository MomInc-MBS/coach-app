import test from 'node:test';
import assert from 'node:assert/strict';
import {armiePushPayload} from '../server/armie-push.mjs';

test('armiePushPayload builds a namespaced, camera-gate-recognizable payload', () => {
 const payload = armiePushPayload('2026-10-05', 'forgive-1');
 assert.equal(payload.kind, 'myr5-armie-letter');
 assert.ok(payload.title.length);
 assert.ok(payload.body.length <= 200);
 assert.ok(payload.tag.includes('forgive-1'));
});

test('armiePushPayload returns null for an id with no copy, instead of throwing', () => {
 assert.equal(armiePushPayload('2026-10-05', 'not-a-real-letter'), null);
});
