import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribePush, fromBase64, staleSubscription} from '../push-subscribe.mjs';

// Two same-length base64url keys (84 chars, no padding, so every char is a full
// 6-bit unit) that decode to different bytes -- stands in for an old vs. rotated
// VAPID public key.
const KEY_A = 'B'.repeat(84);
const KEY_B = 'C' + 'B'.repeat(83);

function fakeRegistration(existingKeyBase64) {
 let unsubscribed = false, subscribed = null;
 const existing = existingKeyBase64 && {
  options: {applicationServerKey: fromBase64(existingKeyBase64).buffer},
  unsubscribe: async () => { unsubscribed = true; return true; },
 };
 return {
  pushManager: {
   getSubscription: async () => (unsubscribed ? null : existing || null),
   subscribe: async opts => { subscribed = {toJSON: () => ({endpoint: 'https://fcm.googleapis.com/new'}), options: opts}; return subscribed; },
  },
  wasUnsubscribed: () => unsubscribed,
  lastSubscribed: () => subscribed,
 };
}

test('no existing subscription: subscribes fresh', async () => {
 const reg = fakeRegistration(null);
 const {subscription, fresh} = await subscribePush(reg, KEY_A);
 assert.equal(fresh, true);
 assert.equal(reg.wasUnsubscribed(), false);
 assert.equal(subscription, reg.lastSubscribed());
});

test('existing subscription matches the current server key: reused, not resubscribed', async () => {
 const reg = fakeRegistration(KEY_A);
 const {subscription, fresh} = await subscribePush(reg, KEY_A);
 assert.equal(fresh, false);
 assert.equal(reg.wasUnsubscribed(), false);
 assert.equal(reg.lastSubscribed(), null, 'must not create a new browser subscription when the key matches');
 assert.notEqual(subscription, undefined);
});

// The bug this lane fixes: a phone subscribed under the OLD VAPID key must not keep
// that subscription after a key rotation -- it has to be dropped and replaced, or
// every push to that phone fails silently.
test('stale-key subscription is unsubscribed and replaced, not reused', async () => {
 const reg = fakeRegistration(KEY_A);
 const {subscription, fresh} = await subscribePush(reg, KEY_B);
 assert.equal(reg.wasUnsubscribed(), true, 'old-key subscription must be unsubscribed');
 assert.equal(fresh, true);
 assert.equal(subscription, reg.lastSubscribed(), 'must return the newly created subscription, not the stale one');
});

test('staleSubscription flags only a subscription made under another known key', () => {
 const sub = key => ({options: {applicationServerKey: fromBase64(key).buffer}});
 assert.equal(staleSubscription(sub(KEY_A), KEY_B), true);
 assert.equal(staleSubscription(sub(KEY_A), KEY_A), false);
 assert.equal(staleSubscription(null, KEY_A), false);
 assert.equal(staleSubscription({options: {applicationServerKey: null}}, KEY_A), false);
 assert.equal(staleSubscription(sub(KEY_A), null), false);
});
