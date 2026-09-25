// Statically imported by app.mjs ONLY (never by modules/ships/ship-view.mjs, which scripts/build.mjs
// serves unbundled in production — see external list). Being a static import of app.mjs means this
// module, and everything under it (material-config.mjs's build-time trust key define,
// post-download-sections.mjs -> battle-pass.mjs -> a .ts file), gets compiled into app-runtime.mjs
// instead of being fetched raw by the browser, where the define would be undefined and the .ts file
// would 404. tests/ship-view-import-graph.test.mjs enforces that ship-view.mjs never re-acquires
// this chain.
import {ownedShipIds,hasSeenShipReveal,acceptShipRevealComplete} from './ship-access.mjs';

export {ownedShipIds};
// Shared with the customizer's Ship tab preview (creature/source/editor-workbench.ts).
export {localVerifiedBridge} from './verified-ship-assets.mjs';

/** Called only with the view's verified local bridge. The real post-flash scene
 * event is the sole source of reveal completion; cancellation never marks seen. */
export async function mountFirstShipArrival({host,assetBridge,isCurrent = () => true}) {
 const ownerId = globalThis.myr5AuthenticatedAccount?.user?.id;
 const ship = assetBridge.ownedShipIds().find(id => !hasSeenShipReveal(id));
 if (!ownerId || !ship) return null;
 // Optional scene code must not become a core-only offline startup dependency.
 const {mountShipScene} = await import('./ship-intro.mjs');
 if (!isCurrent() || globalThis.myr5AuthenticatedAccount?.user?.id !== ownerId) throw new DOMException('Ship arrival cancelled', 'AbortError');
 let scene, disposed = false;
 const complete = event => {
  if (!disposed && scene && event.detail?.ownerId === ownerId && event.detail?.ship === ship) acceptShipRevealComplete(event);
 };
 window.addEventListener('myr5:ship-scene-ready', complete);
 try { scene = mountShipScene({host,assetBridge,ship}); }
 catch (error) { window.removeEventListener('myr5:ship-scene-ready', complete); throw error; }
 return {
  ready: scene.ready.finally(() => window.removeEventListener('myr5:ship-scene-ready', complete)),
  dispose() { if (disposed) return; disposed = true; window.removeEventListener('myr5:ship-scene-ready', complete); scene.dispose(); }
 };
}
