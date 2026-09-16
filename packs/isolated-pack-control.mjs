/** P13C isolated opt-in pack control; app startup deliberately does not import this module. */
import { PackLifecycle } from './pack-lifecycle.mjs';
import { cacheStorageAssetStore } from './browser-asset-store.mjs';
import { existingWorkoutIdleAdapter } from './workout-idle-adapter.mjs';

export const fixtureEntitlementAccount = entitledPackIds => Object.freeze({
  // Test-only explicit entitlement fixture.  This does not grant, mint, or fetch entitlement.
  getEntitlements: () => [...entitledPackIds]
});

// Production adapter accepts only server serialized per-pack ownership records.
// Coach unlocks, local cache, and test fixtures deliberately grant nothing.
export function authenticatedPackAccount(account = globalThis.coachAccount) {
 return Object.freeze({getEntitlements() {
  const owned = account?.ownedPacks || globalThis.coachEntitlements?.ownedPacks;
  return Array.isArray(owned) ? owned.filter(item => item && typeof item.packId === 'string' && item.status === 'owned' && Number.isSafeInteger(item.grantedAt)) : [];
 }});
}

export function createIsolatedPackControl({ account = authenticatedPackAccount(), workout, workoutOwner, storage = globalThis.localStorage, assetStore = cacheStorageAssetStore(), ...options } = {}) {
  // The caller supplies initPod().workoutOwner when a user explicitly opens pack controls.
  return new PackLifecycle({ account, storage, assetStore, workout: workout || existingWorkoutIdleAdapter({ owner: workoutOwner }), ...options });
}
