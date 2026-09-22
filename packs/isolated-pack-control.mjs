/** P13C isolated opt-in pack control; app startup deliberately does not import this module. */
import { accountPackGrants, packAccountIdentity } from './pack-entitlements.mjs';
import { PackLifecycle } from './pack-lifecycle.mjs';
import { cacheStorageAssetStore } from './browser-asset-store.mjs';
import { existingWorkoutIdleAdapter } from './workout-idle-adapter.mjs';

export const fixtureEntitlementAccount = entitledPackIds => Object.freeze({
  // Test-only explicit entitlement fixture.  This does not grant, mint, or fetch entitlement.
  getEntitlements: () => [...entitledPackIds]
});

// Production adapter accepts only server serialized per-pack ownership records.
// Coach unlocks, local cache, and test fixtures deliberately grant nothing.
export function authenticatedPackAccount(account) {
 const ownerId=packAccountIdentity(account);
 return Object.freeze({
  getIdentity:()=>packAccountIdentity(account),
  getGeneration:()=>account?.dataEpoch,
  getEntitlements:()=>accountPackGrants(account,ownerId)
 });
}

export function createIsolatedPackControl({ account = authenticatedPackAccount(), workout, workoutOwner, storage = globalThis.localStorage, assetStore = cacheStorageAssetStore(), ...options } = {}) {
  // The caller supplies initPod().workoutOwner when a user explicitly opens pack controls.
  return new PackLifecycle({ account, storage, assetStore, workout: workout || existingWorkoutIdleAdapter({ owner: workoutOwner }), ...options });
}
