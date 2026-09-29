// Shared by every pushManager subscribe caller (launch.mjs, armie-letters-client.mjs).
// R7-VAPID-ROTATE: release 7 moves reminders to a Cloudflare Worker with a NEW VAPID
// keypair; the old one can't be read back. A subscription made under the old key
// looks "existing" to the browser, so callers used to just reuse it -- and every push
// to that phone then failed silently. Compare the subscribed key's bytes to the
// server's current public key and resubscribe when they differ.
export const fromBase64 = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')), c => c.charCodeAt(0));

function sameKey(existingKey, key) {
 if (!existingKey) return false;
 const x = new Uint8Array(existingKey);
 return x.length === key.length && x.every((v, i) => v === key[i]);
}

// True when this device's subscription was made under a different VAPID key (before the Cloudflare
// move), so pushes to it fail. An unknown key (browser doesn't expose it) is not treated as stale.
export const staleSubscription = (subscription, publicKeyBase64) => {
 const existingKey = subscription?.options?.applicationServerKey;
 return !!existingKey && !!publicKeyBase64 && !sameKey(existingKey, fromBase64(publicKeyBase64));
};

// Returns {subscription, fresh}. fresh is true when a new browser subscription was
// just created (no prior subscription, or the prior one was for a stale key and got
// unsubscribed) -- callers use it to decide whether to roll back on a failed server
// registration, same as the old `!existing` check.
export async function subscribePush(registration, publicKeyBase64) {
 const key = fromBase64(publicKeyBase64);
 const existing = await registration.pushManager.getSubscription();
 if (existing) {
  if (sameKey(existing.options?.applicationServerKey, key)) return {subscription: existing, fresh: false};
  await existing.unsubscribe();
 }
 const subscription = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key});
 return {subscription, fresh: true};
}
